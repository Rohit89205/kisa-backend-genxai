import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Field } from './field.model';
import { SatelliteScenes } from './satellite_scenes.model';

@Table({
  tableName: 'growth_stages',
  timestamps: true,
  underscored: true,
})
export class GrowthStages extends Model<GrowthStages> {
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

  @ForeignKey(() => SatelliteScenes)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  scene_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  stage: string;

  @Column({
    type: DataType.REAL,
    allowNull: true,
  })
  confidence: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  source: string;

  @BelongsTo(() => Field)
  field: Field;

  @BelongsTo(() => SatelliteScenes)
  satellite_scene: SatelliteScenes;
}