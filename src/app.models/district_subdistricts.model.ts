import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
  tableName: 'district_subdistricts',
  timestamps: false,
  underscored: true,
})
export class DistrictSubdistricts extends Model<DistrictSubdistricts> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  district_name: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  sub_districts: any;
}
