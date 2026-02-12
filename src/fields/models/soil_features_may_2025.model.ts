import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table({
  tableName: 'soil_features_may_2025',
  timestamps: false, // VERY IMPORTANT
  underscored: true,
})
export class SoilFeaturesMay2025 extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column(DataType.UUID)
  field_id: string;

  @Column(DataType.DOUBLE)
  ndvi_mean_90d: number;

  @Column(DataType.DOUBLE)
  ndvi_std_90d: number;

  @Column(DataType.DOUBLE)
  ndvi_trend_30d: number;

  @Column(DataType.DOUBLE)
  ndre_mean_90d: number;

  @Column(DataType.DOUBLE)
  bsi_mean_90d: number;

  @Column(DataType.DOUBLE)
  cloud_pct: number;

  @Column(DataType.INTEGER)
  valid_obs_count: number;

  @Column(DataType.DOUBLE)
  area_ha: number;

  @Column(DataType.DOUBLE)
  elevation: number;

  @Column(DataType.DOUBLE)
  rainfall_30d: number;

  @Column(DataType.DATE)
  start_date: Date;

  @Column(DataType.DATE)
  end_date: Date;
}
