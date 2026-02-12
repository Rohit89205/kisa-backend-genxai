import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Field } from './models/field.model';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { ResponseHelper } from '../common/helper/response.helper';
import { validate } from 'class-validator';
import { FieldHealth } from './models/field_health.model';
import { SatelliteScenes } from './models/satellite_scenes.model';
import { FieldActivities } from './models/field_activities.model';
import { FieldRisks } from './models/field_risks.model';
import { GrowthStages } from './models/growth_stages.model';
import { VegetationIndices } from './models/vegetation_indices.model';
import { SoilFeature } from '../soil/models/soil-feature.model';
import { User } from '../auth/models/user.model';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes, Op } from 'sequelize';
import ee from '../common/service/gee.service';
import { VegetationIndicesMay2025 } from './models/vegetation_indices_may_2025.model';
import { SoilFeaturesMay2025 } from './models/soil_features_may_2025.model';
import { getStateDistrict } from 'src/common/helper/getStateDistrict';
import {
  buildEvalscript,
  Layer,
  PROCESS_URL,
  SUPPORTED_LAYERS,
} from '../common/helper/heatmap.helper';
import {
  CATALOG_URL,
  getBBox,
  generateFallbackDates,
} from '../common/helper/catalog.helper';
import { SentinelService } from '../common/service/sentinel.service';
import {
  mean,
  std,
  linearTrend,
  readMean,
  estimateSoilTexture,
  estimateChemistry,
} from '../common/helper/soil.estimator';
@Injectable()
export class FieldsService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Field)
    private readonly fieldModel: typeof Field,
    @InjectModel(FieldHealth)
    private readonly fieldHealthModel: typeof FieldHealth,
    @InjectModel(SoilFeature)
    private readonly soilFeatureModel: typeof SoilFeature,
    @InjectModel(SatelliteScenes)
    private readonly satelliteScenesModel: typeof SatelliteScenes,
    @InjectModel(GrowthStages)
    private readonly growthStagesModel: typeof GrowthStages,
    @InjectModel(FieldActivities)
    private readonly fieldActivitiesModel: typeof FieldActivities,
    @InjectModel(FieldRisks)
    private readonly fieldRisksModel: typeof FieldRisks,
    @InjectModel(VegetationIndices)
    private readonly vegetationIndicesModel: typeof VegetationIndices,
    @InjectModel(VegetationIndicesMay2025)
    private readonly vegetationIndicesMay2025Model: typeof VegetationIndicesMay2025,
    @InjectModel(SoilFeaturesMay2025)
    private readonly soilFeaturesMay2025: typeof SoilFeaturesMay2025,

    @Inject('SEQUELIZE')
    private readonly sequelize: Sequelize,
    private readonly sentinelService: SentinelService,
  ) {}

  async createField(createFieldDto: CreateFieldDto, userId: string) {
    try {
      const dtoInstance = Object.assign(new CreateFieldDto(), createFieldDto);

      const errors = await validate(dtoInstance);
      if (errors.length > 0) {
        const messages = errors
          .map((err) => {
            const constraints = err.constraints
              ? Object.values(err.constraints).join(', ')
              : 'is invalid';
            return `${err.property} ${constraints}`;
          })
          .join(', ');
        return ResponseHelper.error({
          message: messages,
          statusCode: 400,
        });
      }

      // -----------------------
      // 🔹 Get Centroid Lat/Lon
      // -----------------------
      const centroidResult = await this.sequelize.query(
        `
        SELECT 
          ST_Y(ST_Centroid(
            ST_SetSRID(ST_GeomFromGeoJSON(:geom),4326)
          )) as lat,
          ST_X(ST_Centroid(
            ST_SetSRID(ST_GeomFromGeoJSON(:geom),4326)
          )) as lon
      `,
        {
          replacements: { geom: JSON.stringify(createFieldDto.geom) },
          type: QueryTypes.SELECT,
        },
      );

      const centroid = centroidResult[0] as { lat: number; lon: number };

      const { state, district, village, pincode } = await getStateDistrict(
        centroid.lat,
        centroid.lon,
      );
      // const [result] = await this.sequelize.query(
      //   `
      //     SELECT pincode
      //     FROM india_pincode
      //     WHERE ST_Contains(
      //       geom,
      //       ST_SetSRID(ST_Point(:lon,:lat),4326)
      //     )
      //   `,
      //   {
      //     replacements: { lon: centroid.lon, lat: centroid.lat },
      //     type: 'SELECT',
      //   },
      // );
      // const postcode = (result as any)?.pincode || null;

      await this.fieldModel.update(
        { is_selected: false },
        { where: { is_selected: true, user_id: userId } },
      );

      const field = await this.fieldModel.create({
        name: createFieldDto.name ?? 'Field',
        crop_name: createFieldDto.crop_name ?? null,
        notes: createFieldDto.notes ?? null,
        sowing_date: createFieldDto.sowing_date ?? null,
        harvest_date: createFieldDto.harvest_date ?? null,

        geom: this.sequelize.fn(
          'ST_SetSRID',
          this.sequelize.fn(
            'ST_GeomFromGeoJSON',
            JSON.stringify(createFieldDto.geom),
          ),
          4326,
        ),
        area_ha: this.sequelize.literal(
          `ST_Area(
          (ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(
            createFieldDto.geom,
          )}'), 4326))::geography
        ) / 10000`,
        ),
        state, // <-- save state
        district, // <-- save district
        village,
        pincode: pincode,
        lat: centroid.lat,
        lon: centroid.lon,
        user_id: userId,
      } as any);

      return ResponseHelper.success({
        message: 'Field created successfully',
        data: field,
      });
    } catch (error) {
      console.error('Create field error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async getAll(userId: string) {
    try {
      const rows = await this.fieldModel.findAll({
        attributes: [
          'id',
          'name',
          'crop_name',
          'notes',
          'sowing_date',
          'area_ha',
          'harvest_date',
          'state',
          'district',
          'village',
          'pincode',
          'lat',
          'lon',
          'is_selected',
          [
            this.sequelize.fn('ST_AsGeoJSON', this.sequelize.col('geom')),
            'geometry',
          ],
        ],
        include: [
          {
            model: this.fieldHealthModel,
            attributes: ['health_score'],
            required: false,
          },
          {
            model: this.soilFeatureModel,
            attributes: [
              'ndvi_mean_90d', // ✅ EXISTS
              'ndre_mean_90d',
              'bsi_mean_90d',
              'cloud_pct',
            ],
            required: false,
          },
        ],
        where: { user_id: userId },
        order: [
          ['is_selected', 'DESC'],
          ['created_at', 'DESC'],
        ],
        raw: true,
      });

      return ResponseHelper.success({
        message: 'Fields retrieved successfully',
        data: {
          type: 'FeatureCollection',
          features: rows.map((row: any) => ({
            type: 'Feature',
            geometry: JSON.parse(row.geometry),
            properties: {
              id: row.id,
              name: row.name,
              crop_name: row.crop_name,
              notes: row.notes,
              area_ha: row.area_ha,
              harvest_date: row.harvest_date,
              sowing_date: row.sowing_date,
              is_selected: row.is_selected,
              state: row.state,
              district: row.district,
              village: row.village,
              pincode: row.pincode,
              lat: row.lat,
              lon: row.lon,
              health_score: row['field_healths.health_score'] ?? null,

              // soil (long-term)
              ndvi_mean_90d: row['soil_feature.ndvi_mean_90d'] ?? null,
              ndre_mean_90d: row['soil_feature.ndre_mean_90d'] ?? null,
              bsi_mean_90d: row['soil_feature.bsi_mean_90d'] ?? null,
              cloud_pct: row['soil_feature.cloud_pct'] ?? null,
            },
          })),
        },
      });
    } catch (error) {
      console.error('Find all fields error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async getById(userId: string, fieldId: string) {
    try {
      const field = await this.fieldModel.findOne({
        attributes: [
          'id',
          'name',
          'crop_name',
          'notes',
          'sowing_date',
          'area_ha',
          'harvest_date',
          'is_selected',
          'state',
          'district',
          'village',
          'pincode',
          'lat',
          'lon',
        ],
        where: {
          user_id: userId,
          id: fieldId,
        },
        raw: true,
      });
      if (!field) {
        return ResponseHelper.error({
          message: 'Field not found',
          statusCode: 404,
        });
      }
      return ResponseHelper.success({
        message: 'Field retrieved successfully',
        data: field,
      });
    } catch (error) {
      console.error('Find field error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }
  async update(
    fieldId: string,
    updateFieldDto: UpdateFieldDto,
    userId: string,
  ) {
    try {
      const dtoInstance = Object.assign(new UpdateFieldDto(), updateFieldDto);
      const errors = await validate(dtoInstance);
      if (errors.length > 0) {
        const messages = errors
          .map((err) => {
            const constraints = err.constraints
              ? Object.values(err.constraints).join(', ')
              : 'is invalid';
            return `${err.property} ${constraints}`;
          })
          .join(', ');
        return ResponseHelper.error({
          message: messages,
          statusCode: 400,
        });
      }
      await this.fieldModel.update(
        { is_selected: false },
        { where: { is_selected: true, user_id: userId } },
      );
      const [affectedCount] = await this.fieldModel.update(
        { ...updateFieldDto, is_selected: true },
        {
          where: { id: fieldId, user_id: userId },
        },
      );

      if (affectedCount === 0) {
        return ResponseHelper.error({
          message: 'Field not found or no changes made',
          statusCode: 404,
        });
      }

      return ResponseHelper.success({
        message: 'Field updated successfully',
      });
    } catch (error) {
      console.error('Update field error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async selectField(fieldId: string, userId: string) {
    try {
      // First, unselect all fields for this user
      await this.fieldModel.update(
        { is_selected: false },
        { where: { user_id: userId, is_selected: true } },
      );

      // Then select the specified field
      const [affectedCount] = await this.fieldModel.update(
        { is_selected: true },
        { where: { id: fieldId, user_id: userId } },
      );

      if (affectedCount === 0) {
        return ResponseHelper.error({
          message: 'Field not found',
          statusCode: 404,
        });
      }

      return ResponseHelper.success({
        message: 'Field selected successfully',
      });
    } catch (error) {
      console.error('Select field error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async remove(fieldId: string, userId: string) {
    const transaction = await this.sequelize.transaction();

    try {
      const field = await this.fieldModel.findOne({
        where: { id: fieldId, user_id: userId },
        transaction,
        raw: true,
      });
      if (!field) {
        await transaction.rollback();
        return ResponseHelper.error({
          message: 'Field not found',
          statusCode: 404,
        });
      }
      if (field.is_selected) {
        await transaction.rollback();
        return ResponseHelper.error({
          message: 'Cannot delete selected field',
          statusCode: 400,
        });
      }
      // Delete field
      await this.fieldModel.destroy({
        where: { id: fieldId, user_id: userId },
        transaction,
      });

      // Delete dependent records
      await this.fieldHealthModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });

      await this.vegetationIndicesModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });

      await this.fieldRisksModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });

      await this.fieldActivitiesModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });

      await this.satelliteScenesModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });

      await this.growthStagesModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });
      await this.soilFeatureModel.destroy({
        where: { field_id: fieldId },
        transaction,
      });
      await transaction.commit();

      return ResponseHelper.success({
        message: 'Field deleted successfully',
        data: {
          deletedId: fieldId,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Delete field error:', error);

      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async getHeatmap(
    fieldId: string,
    userId: string,
    options: {
      layer: string;
      width: number;
      height: number;
      toDate: string;
      days: number;
    },
  ) {
    try {
      // Layer
      const layer: Layer = (options.layer as Layer) || 'ndvi';
      if (!SUPPORTED_LAYERS.includes(layer)) {
        return ResponseHelper.error({
          message: `Unsupported layer. Use one of ${SUPPORTED_LAYERS.join(', ')}`,
          statusCode: 400,
        });
      }

      const days = Number(options.days) || 90;

      const endDate = options.toDate
        ? new Date(options.toDate)
        : new Date('2024-10-01');

      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      const toDate = endDate.toISOString().split('T')[0] + 'T23:59:59Z';
      const fromDate = startDate.toISOString().split('T')[0] + 'T00:00:00Z';

      const width = clamp(Number(options.width) || 512, 64, 2048);
      const height = clamp(Number(options.height) || 512, 64, 2048);

      // Get geometry as GeoJSON
      const geom = await this.sequelize.query(
        `SELECT ST_AsGeoJSON(geom) as geometry FROM fields WHERE id = ? AND user_id = ?`,
        {
          replacements: [fieldId, userId],
          type: QueryTypes.SELECT,
        },
      );

      if (!geom || !geom[0]) {
        return ResponseHelper.error({
          message: 'Field geometry not found',
          statusCode: 404,
        });
      }

      const geometry = JSON.parse((geom[0] as any).geometry);

      // Get Sentinel token
      const token = await this.sentinelService.getSentinelToken();

      const evalscript = buildEvalscript(layer);

      const body = {
        input: {
          bounds: {
            geometry: geometry,
            properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
          },
          data: [
            {
              type: 'sentinel-2-l2a',
              dataFilter: {
                timeRange: {
                  from: fromDate,
                  to: toDate,
                },
                mosaickingOrder: 'leastCC',
                maxCloudCoverage: 20,
              },
              processing: {
                harmonizeValues: true,
              },
            },
          ],
        },
        output: {
          width: width,
          height: height,
          responses: [
            {
              identifier: 'default',
              format: {
                type: 'image/png',
              },
            },
          ],
        },
        evalscript,
      };

      const res = await fetch(PROCESS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'image/png',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        console.log('heatmap error', err);
        return ResponseHelper.error({
          message: 'Internal server error',
        });
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      const response_data = {
        buffer,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=3600',
          'Content-Disposition': 'inline; filename=heatmap.png',
        },
      };
      return ResponseHelper.success({
        message: 'Heatmap get successfully',
        data: response_data,
      });
    } catch (error) {
      console.error('Get heatmap error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async getAvailableScenes(userId: string, query: any) {
    const maxCloudCover = Number(query.maxCloud) || 50;
    console.log('query', query);
    const toDate = query.to || new Date().toISOString().split('T')[0];

    const fromDate =
      query.from ||
      (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
      })();

    const field = await this.fieldModel.findOne({
      where: { id: query.fieldId, user_id: userId },
      attributes: [
        [
          this.sequelize.fn('ST_AsGeoJSON', this.sequelize.col('geom')),
          'geojson',
        ],
      ],
      raw: true,
    });

    if (!field) {
      return ResponseHelper.error({
        message: 'Field not found',
        statusCode: 404,
      });
    }

    const geometry = JSON.parse((field as any).geojson);
    const token = await this.sentinelService.getSentinelToken();

    const catalogRequest = {
      bbox: getBBox(geometry),
      datetime: `${fromDate}T00:00:00Z/${toDate}T23:59:59Z`,
      collections: ['sentinel-2-l2a'],
      limit: 100,
      filter: `eo:cloud_cover < ${maxCloudCover}`,
    };

    try {
      const res = await fetch(CATALOG_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catalogRequest),
      });

      if (!res.ok) {
        const resText = await res.text();
        console.error('Catalog API response not ok:', resText);
        return ResponseHelper.error({
          message: 'Using estimated dates (Catalog API unavailable)',
          statusCode: 500,
          data: {
            source: 'fallback',
            scenes: generateFallbackDates(fromDate, toDate),
          },
        });
      }

      const data = await res.json();

      const scenes = data.features
        .map((f: any) => ({
          date: f.properties.datetime.split('T')[0],
          cloudCover: Math.round(f.properties['eo:cloud_cover']),
          id: f.id,
        }))
        .sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

      const uniqueScenes = scenes.filter(
        (scene: any, index: number, self: any[]) =>
          index === self.findIndex((s) => s.date === scene.date),
      );

      const lastDate =
        uniqueScenes.length > 0
          ? new Date(uniqueScenes[uniqueScenes.length - 1].date)
          : new Date();

      const nextImage = new Date(lastDate);
      nextImage.setDate(nextImage.getDate() + 5);

      const resultData = {
        scenes: uniqueScenes,
        source: 'sentinel-hub',
        nextImage: nextImage.toISOString().split('T')[0],
        totalFound: data.context.returned,
      };
      return ResponseHelper.success({
        message: 'Available scenes retrieved successfully',
        data: resultData,
      });
    } catch (error) {
      console.error('Catalog API error:', error);

      return ResponseHelper.error({
        message: 'Using estimated dates (Catalog API unavailable)',
        data: {
          scenes: generateFallbackDates(fromDate, toDate),
          source: 'fallback',
        },
      });
    }
  }

  async computeSoilFeatures(
    fieldId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
    try {
      const field: any = await this.fieldModel.findOne({
        where: { id: fieldId, user_id: userId },
        attributes: [
          [
            this.sequelize.fn('ST_AsGeoJSON', this.sequelize.col('geom')),
            'geom',
          ],
          'area_ha',
        ],
        raw: true,
      });

      if (!field) {
        return ResponseHelper.error({
          message: 'Field not found',
          statusCode: 404,
        });
      }

      const geometry = JSON.parse(field.geom);
      const area_ha = field.area_ha;

      const now = new Date();
      const fromDate =
        from ?? new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      const toDate = to ?? new Date().toISOString();

      const token = await this.sentinelService.getSentinelToken();

      const sentinelRes = await fetch(
        'https://services.sentinel-hub.com/api/v1/statistics',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              bounds: {
                geometry,
                properties: {
                  crs: 'http://www.opengis.net/def/crs/EPSG/0/4326',
                },
              },
              data: [
                {
                  type: 'sentinel-2-l2a',
                  dataFilter: {
                    timeRange: { from: fromDate, to: toDate },
                    mosaickingOrder: 'leastCC',
                  },
                },
              ],
            },
            aggregation: {
              timeRange: { from: fromDate, to: toDate },
              aggregationInterval: { of: 'P1W' },
              resolution: { x: 10, y: 10 },
              evalscript: `
                //VERSION=3
                function setup() {
                  return {
                    input:["B02","B03","B04","B05","B08","B11","dataMask"],
                    output: [
                      { id: "ndvi",  bands: 1 },
                      { id: "ndre",  bands: 1 },
                      { id: "ndmi",  bands: 1 },
                      { id: "gndvi", bands: 1 },
                      { id: "sipi",  bands: 1 },
                      { id: "bsi",   bands: 1 },
                      { id: "evi",   bands: 1 },
                      { id: "ndwi",   bands: 1 },
                      { id: "savi",   bands: 1 },
                      { id: "dataMask", bands: 1 }
                    ],
                  };
                }
                function evaluatePixel(s){
                  if(s.dataMask===0) return {  ndvi:[0], ndre:[0], ndmi:[0],
                                gndvi:[0], sipi:[0], bsi:[0], evi:[0], ndwi: [0], savi: [0],
                                dataMask:[0] };
                  return {
                    ndvi:[(s.B08-s.B04)/(s.B08+s.B04)],
                    ndre:[(s.B08-s.B05)/(s.B08+s.B05)],
                    ndmi:[(s.B08 - s.B11)/(s.B08 + s.B11)],
                    gndvi:[(s.B08 - s.B03)/(s.B08 + s.B03)],
                    sipi:[(s.B08 - s.B02)/(s.B08 - s.B04 + 0.0001)],
                    bsi:[(s.B11 + s.B04 - s.B08 - s.B02)/(s.B11 + s.B04 + s.B08 + s.B02)],
                    evi:[2.5 * (s.B08 - s.B04) / (s.B08 + 6.0 * s.B04 - 7.5 * s.B02 + 1.0)],
                    ndwi:[(s.B03 - s.B08) / (s.B03 + s.B08 + 0.0001)],
                    savi:[1.5 * (s.B08 - s.B04) / (s.B08 + s.B04 + 0.5)],
                    dataMask:[1]
                  };
                }
              `,
            },
          }),
        },
      );
      if (!sentinelRes.ok) {
        return ResponseHelper.error({
          message: 'Failed to fetch satellite data',
          statusCode: 502,
        });
      }

      const stats = await sentinelRes.json();

      const series: any[] = [];

      for (const b of stats.data ?? []) {
        const ndvi = readMean(b, 'ndvi');
        if (ndvi == null) continue;

        series.push({
          ndvi,
          ndre: readMean(b, 'ndre'),
          bsi: readMean(b, 'bsi'),
          cloud_pct: b.outputs?.dataMask?.stats?.mean
            ? (1 - b.outputs.dataMask.stats.mean) * 100
            : 0,
        });
      }

      const soilAgg = {
        ndvi_mean_90d: mean(series.map((s) => s.ndvi)),
        ndvi_std_90d: std(series.map((s) => s.ndvi)),
        ndvi_trend_30d: linearTrend(series.slice(-4).map((s) => s.ndvi)),
        ndre_mean_90d: mean(
          series.map((s) => s.ndre).filter((v) => v !== null),
        ),
        bsi_mean_90d: mean(series.map((s) => s.bsi).filter((v) => v !== null)),
        cloud_pct: mean(series.map((s) => s.cloud_pct)),
        valid_obs_count: series.length,
      };

      const texture = estimateSoilTexture(soilAgg);
      const chemistry = estimateChemistry(soilAgg);

      await this.soilFeatureModel.upsert({
        field_id: fieldId,
        ndvi_mean_90d: soilAgg.ndvi_mean_90d ?? 0,
        ndvi_trend_30d: soilAgg.ndvi_trend_30d ?? 0,
        ndvi_std_90d: soilAgg.ndvi_std_90d ?? 0,
        ndre_mean_90d: soilAgg.ndre_mean_90d ?? 0,
        bsi_mean_90d: soilAgg.bsi_mean_90d ?? 0,
        clay: texture.clay,
        silt: texture.silt,
        sand: texture.sand,
        pH_0_30: chemistry.ph_0_30,
        soc_0_30: chemistry.soc_0_30,
        cloud_pct: soilAgg.cloud_pct ?? 0,
        valid_obs_count: soilAgg.valid_obs_count,
        area_ha,
        elevation: texture.elevation,
      } as any);
      // ==============================
      // 🧠 HISTORICAL ML DATASET (MAY 2025)
      // ==============================
      await this.soilFeaturesMay2025.create({
        field_id: fieldId,

        ndvi_mean_90d: soilAgg.ndvi_mean_90d,
        ndvi_std_90d: soilAgg.ndvi_std_90d,
        ndvi_trend_30d: soilAgg.ndvi_trend_30d,
        ndre_mean_90d: soilAgg.ndre_mean_90d,
        bsi_mean_90d: soilAgg.bsi_mean_90d,

        cloud_pct: soilAgg.cloud_pct,
        valid_obs_count: soilAgg.valid_obs_count,

        area_ha,
        elevation: texture.elevation,
        rainfall_30d: 0, // or derived later

        start_date: new Date(fromDate),
        end_date: new Date(toDate),
      });

      const layerData = stats.data[stats.data.length - 1].outputs;
      const vegetationData = {
        field_id: fieldId,
        ndvi: layerData.ndvi.bands.B0.stats.mean,
        ndmi: layerData.ndmi.bands.B0.stats.mean,
        ndre: layerData.ndre.bands.B0.stats.mean,
        evi: layerData.evi.bands.B0.stats.mean,
        ndwi: layerData.ndwi.bands.B0.stats.mean,
        savi: layerData.savi.bands.B0.stats.mean,
        bsi: layerData.bsi.bands.B0.stats.mean,
        gndvi: layerData.gndvi.bands.B0.stats.mean,
        sipi: layerData.sipi.bands.B0.stats.mean,
        scene_date: stats.data[stats.data.length - 1].interval.from,
      };
      const norm = (x: number, min: number, max: number) =>
        Math.max(0, Math.min(1, (x - min) / (max - min)));
      const ndvi_n = norm(layerData.ndvi.bands.B0.stats.mean, 0.0, 0.9);
      const evi_n = norm(layerData.evi.bands.B0.stats.mean, 0.0, 0.8);
      const savi_n = norm(layerData.savi.bands.B0.stats.mean, 0.0, 0.8);
      const ndre_n = norm(layerData.ndre.bands.B0.stats.mean, 0.0, 0.6);
      const gndvi_n = norm(layerData.gndvi.bands.B0.stats.mean, 0.0, 0.7);
      const ndwi_n = norm(layerData.ndwi.bands.B0.stats.mean, -0.3, 0.5);
      const ndmi_n = norm(layerData.ndmi.bands.B0.stats.mean, -0.2, 0.6);
      const sipi_n = 1 - norm(layerData.sipi.bands.B0.stats.mean, 0.8, 1.8);

      const farm_score: number =
        10 *
        (0.4 * (0.4 * ndvi_n + 0.3 * evi_n + 0.3 * savi_n) +
          0.25 * (0.6 * ndre_n + 0.4 * gndvi_n) +
          0.25 * (0.5 * ndwi_n + 0.5 * ndmi_n) +
          0.1 * sipi_n);
      vegetationData['farm_score'] = farm_score;
      const vegetationMay2025 = {
        field_id: fieldId,
        ndvi: vegetationData.ndvi,
        ndmi: vegetationData.ndmi,
        ndre: vegetationData.ndre,
        evi: vegetationData.evi,
        ndwi: vegetationData.ndwi,
        savi: vegetationData.savi,
        bsi: vegetationData.bsi,
        gndvi: vegetationData.gndvi,
        sipi: vegetationData.sipi,
        start_date: new Date(from ?? fromDate),
        end_date: new Date(to ?? toDate),
      };
console.log(
  '🔥 INSERTING INTO vegetation_indices_may_2025',
  vegetationMay2025
);

await this.vegetationIndicesMay2025Model.create(
  vegetationMay2025 as any
);
      return ResponseHelper.success({
        message: 'Soil features computed successfully',
        data: {
          fieldId,
          soil: { ...texture, ...chemistry },
          cloud_pct: soilAgg.cloud_pct,
          stats: stats.data ?? [],
        },
      });
    } catch (error) {
      console.error('Compute soil features error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }
  async getLatestImage(fieldId: string) {
    // 1️⃣ Fetch field geometry
    const [field]: any = await this.sequelize.query(
      `
        SELECT ST_AsGeoJSON(geom) as geom
        FROM fields
        WHERE id = :fieldId
        LIMIT 1
        `,
      {
        replacements: { fieldId },
        type: QueryTypes.SELECT,
      },
    );

    if (!field) {
      throw new Error('Field not found');
    }

    const geojson = JSON.parse(field.geom);

    // 2️⃣ Convert to EE geometry
    const geometry = ee.Geometry(geojson);

    // 3️⃣ Dates (✅ CORRECT)
    const endDate = ee.Date(new Date());
    const startDate = endDate.advance(-30, 'day');

    // 4️⃣ Image collection
    // 3️⃣ Build collection
    const collection = ee
      .ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(ee.Date(Date.now()).advance(-30, 'day'), ee.Date(Date.now()))
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .sort('system:time_start', false);

    // 👇 CLIP TO FIELD
    const rawImage = ee.Image(collection.first());
    const image = rawImage.clip(geometry);

    // 5️⃣ Visualization
    const vis = {
      bands: ['B4', 'B3', 'B2'],
      min: 0,
      max: 3000,
    };

    // 6️⃣ Tile URL
    const map = await new Promise<any>((resolve, reject) => {
      image.getMap(vis, (m: any, err: any) => {
        if (err) reject(err);
        else resolve(m);
      });
    });

    // 7️⃣ Image date
    const date = await new Promise<string>((resolve, reject) => {
      image
        .date()
        .format('YYYY-MM-dd')
        .getInfo((d: any, err: any) => {
          if (err) reject(err);
          else resolve(d);
        });
    });

    return {
      tileUrl: map.urlFormat,
      date,
    };
  }

  async getFieldsData(
    columns?: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'id',
    sortOrder: string = 'ASC',
    columnSearch?: Record<string, any>,
  ) {
    try {
      const columnMapping: Record<string, string> = {
        farmer_name: 'user.name',
        crop_name: 'crop_name',
        farm_name: 'name',
        area_ha: 'area_ha',
        sowing_date: 'sowing_date',
      };

      const vegetationColumns = [
        'ndvi',
        'ndmi',
        'ndre',
        'evi',
        'ndwi',
        'savi',
        'bsi',
        'gndvi',
        'sipi',
        'scene_date',
      ];

      let selectedColumns: string[] = ['id'];
      let includeVegetation = false;

      if (columns) {
        const requestedColumns = columns.split(',').map((c) => c.trim());

        requestedColumns.forEach((col) => {
          if (vegetationColumns.includes(col)) {
            includeVegetation = true;
          } else if (columnMapping[col]) {
            selectedColumns.push(col);
          }
        });
      } else {
        selectedColumns = [
          'farmer_name',
          'crop_name',
          'farm_name',
          'area_ha',
          'sowing_date',
        ];
        includeVegetation = true;
      }

      const fieldAttributes: string[] = [];
      const userAttributes: string[] = [];
      const vegetationAttributes: string[] = [];

      selectedColumns.forEach((col) => {
        const mappedCol = columnMapping[col];
        if (mappedCol === 'user.name') {
          userAttributes.push('name');
        } else if (mappedCol && col !== 'id') {
          fieldAttributes.push(mappedCol);
        }
      });

      if (includeVegetation) {
        if (columns) {
          const requestedVegCols = columns
            .split(',')
            .map((c) => c.trim())
            .filter((c) => vegetationColumns.includes(c));
          vegetationAttributes.push(...requestedVegCols);
        } else {
          vegetationAttributes.push(...vegetationColumns);
        }
      }

      if (
        fieldAttributes.length === 0 &&
        userAttributes.length === 0 &&
        vegetationAttributes.length === 0
      ) {
        return ResponseHelper.error({
          message: 'No valid columns specified',
          statusCode: 400,
        });
      }

      const includeOptions: any[] = [];

      // Build where conditions for column search
      const whereConditions: any = {};

      if (columnSearch && Object.keys(columnSearch).length > 0) {
        Object.keys(columnSearch).forEach((key) => {
          const searchTerm = columnSearch[key];
          if (!searchTerm) return;

          const mappedCol = columnMapping[key];
          if (
            mappedCol &&
            mappedCol !== 'user.name' &&
            !vegetationColumns.includes(key)
          ) {
            whereConditions[mappedCol] = {
              [Op.iLike]: `%${searchTerm}%`,
            };
          }
        });
      }

      if (userAttributes.length) {
        const userWhere: any = {};
        if (columnSearch?.farmer_name) {
          userWhere.name = { [Op.iLike]: `%${columnSearch.farmer_name}%` };
        }

        includeOptions.push({
          model: this.userModel,
          attributes: userAttributes,
          required: true,
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
        });
      }

      if (vegetationAttributes.length) {
        const vegWhere: any = {};
        if (columnSearch) {
          vegetationColumns.forEach((col) => {
            if (columnSearch[col]) {
              const value = parseFloat(columnSearch[col]);
              if (!isNaN(value)) {
                vegWhere[col] = {
                  [Op.between]: [value - 0.01, value + 0.01], // Tolerance range
                };
              }
            }
          });
        }

        includeOptions.push({
          model: this.vegetationIndicesModel,
          attributes: vegetationAttributes,
          required: true,
          where: Object.keys(vegWhere).length > 0 ? vegWhere : undefined,
        });
      }

      const offset = (Number(page) - 1) * limit;

      // Build attributes array - always include id
      const attributes = ['id'];

      // Add user_id if we need user data
      if (userAttributes.length > 0) {
        attributes.push('user_id');
      }

      // Add field attributes (filter out undefined/null values)
      fieldAttributes.forEach((attr) => {
        if (attr && !attributes.includes(attr)) {
          attributes.push(attr);
        }
      });

      // Build order for sorting - use subQuery: false to avoid nested query issues
      let order: any[] = [];

      if (sortBy === 'farmer_name') {
        order = [
          [
            { model: this.userModel, as: 'user' },
            'name',
            sortOrder.toUpperCase(),
          ],
        ];
      } else if (sortBy === 'farm_name') {
        order = [['name', sortOrder.toUpperCase()]];
      } else if (vegetationColumns.includes(sortBy)) {
        order = [
          [
            { model: this.vegetationIndicesModel, as: 'vegetation_indices' },
            sortBy,
            sortOrder.toUpperCase(),
          ],
        ];
      } else if (
        ['id', 'crop_name', 'area_ha', 'sowing_date', 'created_at'].includes(
          sortBy,
        )
      ) {
        order = [[sortBy, sortOrder.toUpperCase()]];
      } else {
        order = [['id', 'ASC']];
      }

      const { count, rows: fields } = await this.fieldModel.findAndCountAll({
        attributes,
        include: includeOptions,
        where:
          Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
        limit,
        offset,
        order,
        distinct: true,
        subQuery: false,
      });
      const result = fields.map((item: any) => {
        const field = item.dataValues;
        const data: any = {};
        console.log('field', field.user);
        console.log('veg', field.vegetation_indices);

        selectedColumns.forEach((col) => {
          if (col === 'id') {
            data[col] = field.id;
          } else {
            const mappedCol = columnMapping[col];
            if (mappedCol === 'user.name') {
              data[col] = field.user?.dataValues.name || null;
            } else {
              data[col] = field[mappedCol] || null;
            }
          }
        });

        if (includeVegetation) {
          vegetationAttributes.forEach((key) => {
            data[key] = field.vegetation_indices[0]?.dataValues[key] ?? null;
          });
        }

        return data;
      });

      return ResponseHelper.success({
        message: 'Fields data retrieved successfully',
        data: {
          fields: result,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(count / Number(limit)),
            totalItems: count,
            itemsPerPage: Number(limit),
          },
        },
      });
    } catch (error) {
      console.error('Get fields data error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async getFarmScoreData(
    state: string,
    district: string,
    user_id: string,
    parameters: string = 'ndvi',
  ) {
    try {
      const where: any = {};
      if (!state && !district) {
        where.is_selected = true;
        where.user_id = user_id;
      }
      if (state) {
        where.state = {[Op.iLike]: `%${state}%`};
      }
      if (district) {
        where.district = {[Op.iLike]: `%${district}%`};
      }
      const fields = await this.fieldModel.findAll({
        include: {
          model: this.vegetationIndicesModel,
          required: true,
        },
        where,
        attributes: [
          'id',
          'name',
          'crop_name',
          'notes',
          'sowing_date',
          'area_ha',
          'harvest_date',
          'state',
          'district',
          'village',
          'pincode',
          'lat',
          'lon',
          'is_selected',
          [
            this.sequelize.fn('ST_AsGeoJSON', this.sequelize.col('geom')),
            'geometry',
          ],
        ],
        raw: true,
      });
      const deviation = {
        extreme: [] as any[],
        severe: [] as any[],
        moderate: [] as any[],
        mild: [] as any[],
        normal: [] as any[],
        total: fields.length
      }
      const result = fields.map((item: any) => {
        const field = { ...item, geometry: JSON.parse(item.geometry) };
        if (state || district) {
          const norm = (x: number, min: number, max: number) =>
            Math.max(0, Math.min(1, (x - min) / (max - min)));
          const vegetationNormalized = {
            ndvi_n: norm(field['vegetation_indices.ndvi'], 0.0, 0.9),
            evi_n: norm(field['vegetation_indices.evi'], 0.0, 0.8),
            savi_n: norm(field['vegetation_indices.savi'], 0.0, 0.8),
            ndre_n: norm(field['vegetation_indices.ndre'], 0.0, 0.6),
            gndvi_n: norm(field['vegetation_indices.gndvi'], 0.0, 0.7),
            ndwi_n: norm(field['vegetation_indices.ndwi'], -0.3, 0.5),
            ndmi_n: norm(field['vegetation_indices.ndmi'], -0.2, 0.6),
            sipi_n: 1 - norm(field['vegetation_indices.sipi'], 0.8, 1.8),
          };

          const farm_score: number = (vegetationNormalized[`${parameters}_n`] ?? 0) * 10;
          if (farm_score >= 0 && farm_score <= 2) {
            deviation.extreme.push(field);
          }
          if (farm_score > 2 && farm_score <= 4) {
            deviation.severe.push(field);
          }
          if (farm_score > 4 && farm_score <= 6) {
            deviation.moderate.push(field);
          }
          if (farm_score > 6 && farm_score <= 8) {
            deviation.mild.push(field);
          }
          if (farm_score > 8 && farm_score <= 10) {
            deviation.normal.push(field);
          }
        }
        return {
          farm_score: field['vegetation_indices.farm_score'] ?? 0,
        };
      });

      return ResponseHelper.success({
        message: 'Fields data retrieved successfully',
        data: state || district ? deviation : result[0],
      });
    } catch (error) {
      console.error('Get fields data error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }
//HISTORICAL BACKFILL (ML ONLY)
  async backfillMay2025(userId: string) {
  const fields = await this.fieldModel.findAll({
    where: { user_id: userId },
    attributes: ['id'],
    raw: true,
  });

  for (const f of fields) {
    await this.computeSoilFeatures(
      f.id,
      userId,
      '2025-04-15T00:00:00Z',
      '2025-05-31T23:59:59Z',
    );
  }
}

}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
