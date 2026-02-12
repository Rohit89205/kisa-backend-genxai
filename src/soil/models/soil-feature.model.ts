import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';

import { Field } from '../../fields/models/field.model';


@Table({
  tableName: 'soil_features',
  timestamps: false,
})
export class SoilFeature extends Model<SoilFeature> {

  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ForeignKey(() => Field)
  @Column(DataType.UUID)
  field_id: string;

  // 🔗 Sequelize association
  @BelongsTo(() => Field, { foreignKey: 'field_id' })
  field: Field;

  @Column(DataType.DOUBLE)
  ndvi_mean_90d: number;

  @Column(DataType.DOUBLE)
  ndvi_trend_30d: number;

  @Column(DataType.DOUBLE)
  ndvi_std_90d: number;

  @Column(DataType.DOUBLE)
  ndre_mean_90d: number;

  @Column(DataType.DOUBLE)
  bsi_mean_90d: number;

  @Column(DataType.DOUBLE)
  pH_0_30: number;

  @Column(DataType.DOUBLE)
  soc_0_30: number;

  @Column(DataType.DOUBLE)
  clay: number;

  @Column(DataType.DOUBLE)
  silt: number;

  @Column(DataType.DOUBLE)
  sand: number;

  @Column(DataType.INTEGER)
  valid_obs_count: number;

  @Column(DataType.DOUBLE)
  cloud_pct: number;

  @Column(DataType.DOUBLE)
  area_ha: number;

  @Column(DataType.DOUBLE)
  elevation: number;

  @Column(DataType.DOUBLE)
  rainfall_30d: number;
}
