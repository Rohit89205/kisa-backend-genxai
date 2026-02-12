import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { SatelliteScenes } from './satellite_scenes.model';
import { Field } from './field.model';

@Table({
  tableName: 'vegetation_indices',
  timestamps: true,
  underscored: true,
})
export class VegetationIndices extends Model<VegetationIndices> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ForeignKey(() => Field)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  field_id: string;

  @BelongsTo(() => Field)
  field: Field;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  ndvi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  ndmi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  ndre: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  evi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  ndwi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  savi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  bsi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  gndvi: number;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  sipi: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  scene_date: Date;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  })
  farm_score: number;
}
