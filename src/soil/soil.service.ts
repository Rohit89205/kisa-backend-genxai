import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/sequelize';
import { firstValueFrom } from 'rxjs';
import { SoilRecommendation } from './models/soil-recommendation.model';
import { SoilFeature } from './models/soil-feature.model';
import { VegetationIndices } from '../fields/models/vegetation_indices.model';
import { Field } from '../fields/models/field.model';
import { Sequelize } from 'sequelize-typescript';
import { GOVT_FERTILIZER_RULES } from './govt-fertilizer.rules';
type SoilForecastDay = {
  day: string;
  temperature: number;
  moisture: number;
  status: 'Dry' | 'Monitor' | 'Critical' | 'Optimal';
};
export interface GovtFertilizerResult {
  crop: string;
  soilStatus: {
    n: any;
    p: any;
    k: any;
    oc: any;
  };
  combination_1: any[];
  combination_2: any[];
  fym: string;
  source: string;
  message?: string;
}


@Injectable()
export class SoilService {
  private readonly logger = new Logger(SoilService.name);

  private readonly ML_SERVICE_URL =
    process.env.ML_SERVICE_URL || 'http://localhost:8000/predict';

 constructor(
  private readonly http: HttpService,

  @InjectModel(SoilFeature)
  private readonly soilFeatureModel: typeof SoilFeature,

  @InjectModel(SoilRecommendation)
  private readonly soilRecModel: typeof SoilRecommendation,

  @InjectModel(Field)
  private readonly fieldModel: typeof Field,

  @InjectModel(VegetationIndices)
  private readonly vegetation: typeof VegetationIndices,

  private readonly sequelize: Sequelize,
) {}
  // ================= NUMBER FORMATTER =================
private safeNumber(value: any, decimals = 2): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Number(num.toFixed(decimals));
}



  // =====================================================
  // DB → ML → FERTILIZER (FINAL & STABLE)
  // =====================================================
  async getSoilPredictionByFieldId(
  fieldId: string,
): Promise<{
  field_id: string;
  features_used: any;
  prediction: any;
  fertilizerRecommendation: GovtFertilizerResult;
  source: string;
}> {

    if (!fieldId) {
      throw new HttpException(
        'fieldId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const soilRow = await this.soilFeatureModel.findOne({
      where: { field_id: fieldId },
    });

    if (!soilRow) {
      throw new HttpException(
        'Soil features not found for this field',
        HttpStatus.NOT_FOUND,
      );
    }

    const field = await this.fieldModel.findOne({
      where: { id: fieldId },raw: true,
    });
    const crop = field?.crop_name?.toLowerCase() || '';
    console.log('Selected crop for fertilizer recommendation:', field);

    const raw = soilRow.get({ plain: true });

    const mlPayload = {
      ndvi_mean_90d: raw.ndvi_mean_90d ?? 0,
      ndvi_std_90d: raw.ndvi_std_90d ?? 0,
      ndvi_trend_30d: raw.ndvi_trend_30d ?? 0,
      ndre_mean_90d: raw.ndre_mean_90d ?? 0,
      bsi_mean_90d: raw.bsi_mean_90d ?? 0,

      pH_0_30: raw.pH_0_30 ?? 6.5,
      soc_0_30: raw.soc_0_30 ?? 0.5,

      clay: raw.clay ?? 30,
      silt: raw.silt ?? 30,
      sand: raw.sand ?? 40,

      valid_obs_count: raw.valid_obs_count ?? 1,
      cloud_pct: raw.cloud_pct ?? 0,

      area_ha: raw.area_ha ?? 1,
      elevation: raw.elevation ?? 500,
      rainfall_30d: raw.rainfall_30d ?? 50,
    };

    try {
      const mlResp = await firstValueFrom(
        this.http.post(this.ML_SERVICE_URL, mlPayload),
      );

      // 🔍 DEBUG: SEE EXACT ML RESPONSE STRUCTURE
      console.log(
        '🧪 FULL ML RESPONSE 👉',
        JSON.stringify(mlResp.data, null, 2),
      );

      

      const p = mlResp.data.predictions;


      // ✅ ML already returns final numeric + status values
          const normalizedPredictions = {
            N: p.N ?? null,
            P: p.P ?? null,
            K: p.K ?? null,

            // ⬇️ from soil lab / features (NOT ML)
            OC: raw.soc_0_30
              ? { value: raw.soc_0_30, status: raw.soc_0_30 < 0.5 ? 'low' : 'sufficient' }
              : null,

            pH: raw.pH_0_30
              ? { value: raw.pH_0_30, status: raw.pH_0_30 < 6.5 ? 'acidic' : 'normal' }
              : null,

            EC: p.EC ?? null,

            S: p.S ?? null,
            Fe: p.Fe ?? null,
            Zn: p.Zn ?? null,
            Cu: p.Cu ?? null,
            Mn: p.Mn ?? null,
          };

          console.log('✅ NORMALIZED PREDICTIONS', normalizedPredictions);

      const makeStat = (n: any) => ({
        value: n?.value ?? null,
        label: n?.status ?? n?.class ?? null,
      });

      const stats = {
        N: makeStat(normalizedPredictions.N),
        P: makeStat(normalizedPredictions.P),
        K: makeStat(normalizedPredictions.K),
        OC: makeStat(normalizedPredictions.OC),
        S: makeStat(normalizedPredictions.S),
        Fe: makeStat(normalizedPredictions.Fe),
        Zn: makeStat(normalizedPredictions.Zn),
        Mn: makeStat(normalizedPredictions.Mn),
        Cu: makeStat(normalizedPredictions.Cu),
        EC: makeStat(normalizedPredictions.EC),
        pH: makeStat(normalizedPredictions.pH),
      };
      console.log('✅ FINAL STATS SENT TO UI 👉', stats);

      // ===== SHC MICRO TABLE DATA =====
      
const microTable = [
  { key: 'S',  name: 'Sulphur (S)' },
  { key: 'Zn', name: 'Zinc (Zn)' },
  { key: 'Fe', name: 'Iron (Fe)' },
  { key: 'Mn', name: 'Manganese (Mn)' },
  { key: 'Cu', name: 'Copper (Cu)' },
].map(n => {
 const rawStatus = stats[n.key].label;

  // ✅ NORMALIZE ML STATUS → SHC FORMAT
 const normalizedStatus =
  rawStatus?.toLowerCase() === 'low'
    ? 'Deficient'
    : 'Sufficient';


  return {
    parameter: n.name,
    status: normalizedStatus,
    recommendation: this.getMicroSoilRecommendation(
      n.key,
      normalizedStatus,
    ),
  };
});


      const fertilizer = this.getGovtFertilizerRecommendation(
      crop,
      stats,
    );  
    
    // ✅ FETCH SOIL TEMPERATURE + MOISTURE + FORECAST
      const condition = await this.getSoilConditionByField(fieldId);


      return {
  field_id: fieldId,
  features_used: mlPayload,

  prediction: {
    // 🔹 ML outputs
    predictions: normalizedPredictions,
    stats,
    microTable,

    // 🔹 Soil condition data (USED BY FRONTEND)
    forecast7d: condition.forecast_7d,
    soilLayers: condition.temperature.layers,
    moistureLayers: condition.moisture.layers,

    tempInsight: condition.temperature.advisory,
    moistInsight: condition.moisture.advisory,

    tempActions: condition.temperature.actions,
    moistActions: condition.moisture.actions,
  },

  fertilizerRecommendation: fertilizer,
  source: 'Soil Health Card Scheme – Govt. of India',
};

    } catch (err) {
  console.error('❌ ML SERVICE HARD FAILURE ❌');
  console.error(err);

  throw new HttpException(
    err?.message || 'ML service failed',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

  }

// ================= GOVT. FERTILIZER RECOMMENDATION =================
  private getGovtFertilizerRecommendation(
  crop: string,
  stats: any,
): GovtFertilizerResult {
  const normalize = (v?: string) => {
  if (!v) return null;
  const x = v.toLowerCase();

  if (x === 'low' || x === 'deficient') return 'Low';
  if (x === 'medium' || x === 'sufficient') return 'Medium';
  if (x === 'high') return 'High';

  return null;
};

const status = {
  n: normalize(stats.N.label),
  p: normalize(stats.P.label),
  k: normalize(stats.K.label),
  oc: normalize(stats.OC?.label),
};



if (!status.oc) {
  return {
    crop,
    soilStatus: status,
    combination_1: [],
    combination_2: [],
    fym: '',
    message: 'Organic Carbon status unavailable from ML model',
    source: 'Soil Health Card Scheme (Govt. of India)',
  };
}


  // console.log('Determined soil status:', GOVT_FERTILIZER_RULES);
  // console.log( 'with status:', crop);

  const rule = GOVT_FERTILIZER_RULES.find(r =>
    r.crops.includes(crop) &&
    r.n === status.n &&
    r.p === status.p &&
    r.k === status.k &&
    r.oc === status.oc
  );

  if (!rule) {
  return {
    crop,
    soilStatus: status,
    combination_1: [],
    combination_2: [],
    fym: '',
    message: 'No government fertilizer recommendation available',
    source: 'Soil Health Card Scheme (Govt. of India)',
  };
}

  return {
    crop,
    soilStatus: status,
    combination_1: rule.combination_1,
    combination_2: rule.combination_2,
    fym: String(rule.fym),
    source: 'Soil Health Card Scheme (Govt. of India)',
  };
}

  // ================= MICRONUTRIENT STATUS =================

 
  // ================= MICRO RECOMMENDATION (SHC TABLE) =================
private getMicroSoilRecommendation(
  name: string,
  status: 'Deficient' | 'Sufficient',
): string {

  // Only recommend if deficient
  if (status !== 'Deficient') {
    return ''; // keep blank like govt card
  }

  const rules: Record<string, string> = {
    S:  'Gypsum @ 250 kg/ha',
    Zn: 'Zinc Sulphate @ 25 kg/ha',
    Fe: 'Ferrous Sulphate @ 50 kg/ha',
    Mn: 'Manganese Sulphate @ 25 kg/ha',
    Cu: 'Copper Sulphate @ 10 kg/ha',
  };

  return rules[name] || '';
}

  // =====================================================
//  FETCH SAVED SOIL RECOMMENDATION (FOR FRONTEND)
// =====================================================
async getSavedRecommendation(id: string) {
  if (!id) {
    throw new HttpException(
      'Recommendation id is required',
      HttpStatus.BAD_REQUEST,
    );
  }

  const record = await this.soilRecModel.findByPk(id);

  if (!record) {
    throw new HttpException(
      'Saved recommendation not found',
      HttpStatus.NOT_FOUND,
    );
  }

  return record;
}
// ================= SIMPLE NUMBER ROUNDING (FOR TEMP / MOISTURE) =================
private round(value: number, decimals = 2): number {
  if (typeof value !== 'number') return value;
  return Number(value.toFixed(decimals));
}

//Soil Temperature Analysis
private calculateSoilTemperature(airTemp: number) {
  return [
    { depth: '5–10 cm', value: this.round(airTemp - 2, 1) },
    { depth: '15–30 cm', value: this.round(airTemp - 5, 1) },
    { depth: '30–60 cm', value: this.round(airTemp - 8, 1) },
    { depth: '60–100 cm', value: this.round(airTemp - 12, 1) },
  ];
}

// Generate advisory based on soil temperature
private getTemperatureAdvisory(layers: any[]) {
  const top = layers[0].value;

  if (top >= 26 && top <= 30) {
    return {
      title: 'Co-Pilot Insight',
      message:
        'Soil warming trend detected. Planting window optimal in next 48 hrs.',
      severity: 'info',
    };
  }

  if (top < 15) {
    return {
      title: 'Cold Soil Alert',
      message:
        'Top soil layer is too cold. Delay sowing and avoid early irrigation.',
      severity: 'high',
    };
  }

  return {
    title: 'Monitor Temperature',
    message:
      'Soil temperature is fluctuating. Monitor for next 24 hours.',
    severity: 'medium',
  };
}
// Suggest actions based on soil temperature
private getTemperatureActions(topTemp: number) {

  // COLD SOIL ACTIONS (< 15°C)
  if (topTemp < 15) {
    return [
      {
        step: 1,
        title: 'Warming Irrigation',
        description:
          'Apply light irrigation during late morning to increase root-zone temperature.',
        cta: 'Schedule Irrigation',
      },
      {
        step: 2,
        title: 'Phosphorus Support',
        description:
          'Apply 20–25 kg DAP per hectare to improve early root development in cold soil.',
        cta: 'View Recommendation',
      },
    ];
  }

  //  OPTIMAL RANGE ACTIONS (15–25°C)
  if (topTemp >= 15 && topTemp <= 25) {
    return [
      {
        step: 1,
        title: 'Temperature Monitoring',
        description:
          'Soil temperature is optimal for root activity. Continue current field practices.',
        cta: 'View Trends',
      },
      {
        step: 2,
        title: 'Irrigation Timing Check',
        description:
          'Avoid late-evening irrigation to prevent unnecessary cooling of topsoil.',
        cta: 'Check Schedule',
      },
    ];
  }

  // HIGH TEMPERATURE ACTIONS (> 25°C)
  return [
    {
      step: 1,
      title: 'Mulching Recommended',
      description:
        'Apply organic mulch to reduce soil heat stress and conserve moisture.',
      cta: 'View Mulching Guide',
    },
    {
      step: 2,
      title: 'Irrigation Timing Adjustment',
      description:
        'Shift irrigation to early morning hours to minimize heat shock to roots.',
      cta: 'Update Schedule',
    },
  ];
}

// NDMI → initial surface moisture
private ndmiToMoisture(ndmi: number): number {
  const ndmiSafe = Math.max(-1, Math.min(1, ndmi ?? 0));
  return Math.min(45, Math.round(30 + ndmiSafe * 20));
}

// Daily moisture update (state-based)
private updateMoistureForDay(
  prevMoisture: number,
  rainfall: number,
  temperature: number,
): number {
  let moisture = prevMoisture;

  // 🌧 Rainfall gain
  if (rainfall >= 10) moisture += 5;
  else if (rainfall >= 5) moisture += 3;
  else if (rainfall >= 1) moisture += 1;

  // 🌡 Evaporation loss
  if (temperature >= 30) moisture -= 3;
  else if (temperature >= 25) moisture -= 2;
  else if (temperature >= 20) moisture -= 1;
  else moisture -= 0.5;

  // 🔒 Physical limits
  moisture = Math.max(15, Math.min(45, moisture));

  return Math.round(moisture * 10) / 10 ;
}

//Soil Moisture Analysis
private calculateSoilMoistureFromNDMI(ndmi: number) {
  // Safety clamp
  const ndmiSafe = Math.max(-1, Math.min(1, ndmi ?? 0));

  // Base moisture % from NDMI
  let baseMoisture = 30;

  if (ndmiSafe < 0.1) baseMoisture = 18;
  else if (ndmiSafe < 0.2) baseMoisture = 22;
  else if (ndmiSafe < 0.4) baseMoisture = 28;
  else if (ndmiSafe < 0.6) baseMoisture = 35;
  else baseMoisture = 42;

  return [
    {
      depth: '5–10 cm',
      value: Math.round(baseMoisture),
    },
    {
      depth: '15–30 cm',
      value: Math.round(baseMoisture + 4),
    },
    {
      depth: '30–60 cm',
      value: Math.round(baseMoisture + 8),
    },
    {
      depth: '60–100 cm',
      value: Math.round(baseMoisture + 12),
    },
  ];
}




// Generate advisory based on soil moisture
private getMoistureAdvisory(layers: any[]) {
  const top = layers[0].value;

  if (top < 20) {
    return {
      title: 'Advisory',
      message:
        'Rapid moisture decline detected in top 10cm layer.',
      severity: 'high',
    };
  }

  return {
    title: 'Moisture Status',
    message:
      'Soil moisture levels are stable across layers.',
    severity: 'low',
  };
}
// Suggest actions based on soil moisture
private getMoistureActions(topMoisture: number) {
  if (topMoisture < 20) {
    return [
      {
        step: 1,
        title: 'Drip Irrigation',
        description:
          'Run system A/B for 45 mins at 6 PM.',
        cta: 'Start Now',
      },
      {
        step: 2,
        title: 'Mulching',
        description:
          'Apply organic mulch to retain top-soil water.',
        cta: 'View Guide',
      },
    ];
  }

  return [];
}
async getSoilConditionByField(fieldId: string) {
  if (!fieldId) {
    throw new HttpException(
      'fieldId is required',
      HttpStatus.BAD_REQUEST,
    );
  }
  // TEMP: weather + rainfall (later from real sources)
  const { airTemp, rainfall30d,weatherDaily } =
    await this.resolvePolygonBasedInputs(fieldId);

  //  PARALLEL LOGIC
  const tempLayers =
    this.calculateSoilTemperature(airTemp);

  const ndmi_value:any = await this.vegetation.findOne({
    where: { field_id: fieldId },
    raw: true,
  });
   
  // Normalize NDMI once (VERY IMPORTANT)
const baselineNDMI = ndmi_value?.ndmi ?? 0.3;

// Current soil moisture (NDMI-driven)
const moistureLayers =
  this.calculateSoilMoistureFromNDMI(baselineNDMI);

// 7-day forecast (NDMI baseline + rainfall modifier)
const forecast7d =
  this.build7DaySoilForecast(weatherDaily, baselineNDMI);

  return {
    field_id: fieldId,
    temperature: {
      layers: tempLayers,
      advisory: this.getTemperatureAdvisory(tempLayers),
      actions: this.getTemperatureActions(
        tempLayers[0].value,
      ), 
    },
    moisture: {
      layers: moistureLayers,
      advisory: this.getMoistureAdvisory(moistureLayers),
      actions: this.getMoistureActions(
        moistureLayers[0].value,
      ),
    },
    forecast_7d: forecast7d,
  }; 
}
// Resolve polygon-based inputs: centroid weather + soil features
private async resolvePolygonBasedInputs(fieldId: string) {
  //  Get centroid of selected polygon
  const field = (await this.fieldModel.findOne({
  attributes: [
    [
      this.sequelize.fn(
        'ST_Y',
        this.sequelize.fn('ST_Centroid', this.sequelize.col('geom')),
      ),
      'lat',
    ],
    [
      this.sequelize.fn(
        'ST_X',
        this.sequelize.fn('ST_Centroid', this.sequelize.col('geom')),
      ),
      'lon',
    ],
  ],
  where: { id: fieldId },
  raw: true,
})) as { lat: number; lon: number } | null;


  if (!field?.lat || !field?.lon) {
    throw new HttpException(
      'Field geometry not available',
      HttpStatus.BAD_REQUEST,
    );
  }
  

  //  Fetch current weather using centroid
 const weatherResp = await firstValueFrom(
  this.http.get(
    `https://api.open-meteo.com/v1/forecast?latitude=${field.lat}&longitude=${field.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`,
  ),
);

const daily = weatherResp.data?.daily;

if (!daily) {
  throw new HttpException(
    'Unable to fetch weather data',
    HttpStatus.BAD_GATEWAY,
  );
}

//  correct air temperature
const airTemp =
  (daily.temperature_2m_max[0] +
   daily.temperature_2m_min[0]) / 2;
  

  //  Get rainfall from soil_features (already polygon-linked)
  const soilFeature = await this.soilFeatureModel.findOne({
    where: { field_id: fieldId },
  });

  if (!soilFeature) {
    throw new HttpException(
      'Soil feature data not found',
      HttpStatus.NOT_FOUND,
    );
  }

  return {
    airTemp,
    rainfall30d: soilFeature.rainfall_30d ?? 0,//kept for future use
     weatherDaily: weatherResp.data.daily,
  };
}
// Estimate daily soil temperature
private estimateSoilTempForDay(
  maxTemp: number,
  minTemp: number,
) {
  const avgAir = (maxTemp + minTemp) / 2;
  return +(avgAir - 2).toFixed(1);
}
 


// Status mapping (matches UI labels)
private getSoilStatusLabel(
  temp: number,
  moisture: number,
) {
  if (moisture < 33) return 'Dry';
  if (moisture < 35) return 'Monitor';
  if (moisture < 38) return 'Critical';
  return 'Optimal';
}
// Build 7-day soil forecast
private build7DaySoilForecast(
  weatherDaily: any,
  baselineNDMI: number,
) {
  const forecast: SoilForecastDay[] = [];

  // Day-0 moisture from satellite
  let currentMoisture = this.ndmiToMoisture(baselineNDMI);

  for (let i = 0; i < 7; i++) {
    const soilTemp = this.estimateSoilTempForDay(
      weatherDaily.temperature_2m_max[i],
      weatherDaily.temperature_2m_min[i],
    );

    currentMoisture = this.updateMoistureForDay(
      currentMoisture,
      weatherDaily.precipitation_sum[i],
      soilTemp,
    );

    forecast.push({
      day:
        i === 0
          ? 'Today'
          : new Date(weatherDaily.time[i]).toLocaleDateString(
              'en-US',
              { weekday: 'short' },
            ),
      temperature: soilTemp,
      moisture: currentMoisture,
      status: this.getSoilStatusLabel(
        soilTemp,
        currentMoisture,
      ),
    });
  }

  return forecast;
}
}
