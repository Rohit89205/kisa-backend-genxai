import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
  HasOne,
  BeforeCreate,
  BeforeUpdate,
} from 'sequelize-typescript';

import { User } from '../../auth/models/user.model';
import { FieldHealth } from './field_health.model';
import { SatelliteScenes } from './satellite_scenes.model';
import { FieldActivities } from './field_activities.model';
import { FieldRisks } from './field_risks.model';
import { GrowthStages } from './growth_stages.model';
import { SoilFeature } from '../../soil/models/soil-feature.model';
import { VegetationIndices } from './vegetation_indices.model';
@Table({
  tableName: 'fields',
  timestamps: true,
  underscored: true,
})
export class Field extends Model<Field> {

  // ---------------- BASIC COLUMNS ----------------
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  crop_name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  sowing_date: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  harvest_date: Date;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  area_ha: number;

  @Column({
    type: DataType.GEOMETRY('POLYGON', 4326),
    allowNull: false,
  })
  geom: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  state: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  district: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  pincode: any;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  village: any;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lat: any;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lon: any;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_selected: boolean;

  // ---------------- USER ----------------
  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  user_id: string;

  @BelongsTo(() => User)
  user: User;

  // ---------------- RELATIONS ----------------
  @HasMany(() => FieldHealth)
  field_healths: FieldHealth[];

  @HasMany(() => SatelliteScenes)
  satellite_scenes: SatelliteScenes[];

  @HasMany(() => FieldActivities)
  field_activities: FieldActivities[];

  @HasMany(() => FieldRisks)
  field_risks: FieldRisks[];

  @HasMany(() => GrowthStages)
  growth_stages: GrowthStages[];

  // ✅ ONE soil feature per field
  @HasOne(() => SoilFeature, { foreignKey: 'field_id' })
  soil_feature: SoilFeature;

  @HasMany(() => VegetationIndices)
  vegetation_indices: VegetationIndices[];
  // ---------------- AREA CALC ----------------
  @BeforeCreate
  @BeforeUpdate
  static async calculateArea(instance: Field) {
    if (!instance.geom) return;

    const sequelize = instance.sequelize;

    const geoJson = {
      type: 'Feature',
      geometry: instance.geom,
      properties: {},
    };

    const [result]: any = await sequelize.query(
      `
      SELECT 
        ST_Area(
          ST_SetSRID(
            ST_GeomFromGeoJSON(:geojson),
            4326
          )::geography
        ) / 10000 AS area
      `,
      {
        replacements: { geojson: JSON.stringify(geoJson) },
        type: 'SELECT' as any,
      },
    );

    instance.area_ha = Number(result.area);
  }
}
