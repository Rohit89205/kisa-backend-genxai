import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Crop } from '../crop guide/models/crop.model';

@Table({
  tableName: 'state_districts',
  timestamps: false,
  underscored: true,
})
export class StateDistrict extends Model<StateDistrict> {
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

  @HasMany(() => Crop, {
    foreignKey: 'state_name',
    sourceKey: 'state_name',
  })
  crop: Crop[];

  /*@HasMany(() => Crop)
    crop : Crop[];*/

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  districts: any;
}
