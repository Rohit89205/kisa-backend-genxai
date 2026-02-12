import { Table, Column, Model, DataType, AllowNull } from 'sequelize-typescript';

@Table({
  tableName: 'state_district_crops',
  timestamps: false,
  underscored: true,
})
export class StateDistrictCrops extends Model<StateDistrictCrops> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.STRING(100),
    unique: true,
    allowNull: false,
  })
  state_name: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  districts: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true
  })
  crops: any
}
