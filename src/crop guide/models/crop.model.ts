import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { CropSop } from './crop-sop.model';
import { StateDistrict } from '../../app.models/state-district.model';

@Table({
  tableName: 'crop',
  schema: 'public',
  timestamps: false, // no createdAt / updatedAt
})
export class Crop extends Model<Crop> {
 
  @Column({
    type: DataType.UUID,
    allowNull: false,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @HasMany(() => CropSop)
  crop_sop: CropSop[];

  @Column({
  type: DataType.STRING(150),
  unique: true,
  allowNull: false,
})
crop_name: string;


  // 1. Add @ForeignKey decorator
  @ForeignKey(() => StateDistrict)
  @Column({
    type: DataType.STRING(150),
    allowNull: false,
  })
  state_name: string;

  // 2. Add BelongsTo association to access the Crop object easily
  @BelongsTo(() => StateDistrict, {
    foreignKey: 'state_name',
    targetKey: 'state_name',
  })
  state_district: StateDistrict;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  image: string;
}
