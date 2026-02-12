import { Table, Column, Model, DataType, BelongsTo, ForeignKey, HasMany } from 'sequelize-typescript';
import { Field } from './field.model';
import { VegetationIndices } from './vegetation_indices.model';
import { GrowthStages } from './growth_stages.model';

@Table({
  tableName: 'satellite_scenes',
  timestamps: true,
  underscored: true,
})
export class SatelliteScenes extends Model<SatelliteScenes> {
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

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  satellite: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  scene_date: Date;

  @Column({
    type: DataType.REAL,
    allowNull: true,
  })
  cloud_coverage: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  tile_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  source: string;

  @BelongsTo(() => Field)
  field: Field;

  @HasMany(() => GrowthStages)
  growth_stages: GrowthStages[];
}