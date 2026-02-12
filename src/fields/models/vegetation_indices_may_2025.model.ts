import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'vegetation_indices_may_2025',
  timestamps: true,
  underscored: true,
})
export class VegetationIndicesMay2025 extends Model<VegetationIndicesMay2025> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  field_id: string;

  @Column(DataType.DOUBLE)
  ndvi: number;

  @Column(DataType.DOUBLE)
  ndmi: number;

  @Column(DataType.DOUBLE)
  ndre: number;

  @Column(DataType.DOUBLE)
  evi: number;

  @Column(DataType.DOUBLE)
  ndwi: number;

  @Column(DataType.DOUBLE)
  savi: number;

  @Column(DataType.DOUBLE)
  bsi: number;

  @Column(DataType.DOUBLE)
  gndvi: number;

  @Column(DataType.DOUBLE)
  sipi: number;

  @Column(DataType.DATE)
  start_date: Date;

  @Column(DataType.DATE)
  end_date: Date;
}
