import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Field } from './field.model';

@Table({
  tableName: 'field_health',
  timestamps: true,
  underscored: true,
})
export class FieldHealth extends Model<FieldHealth> {
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
    type: DataType.STRING,
    allowNull: true,
  })
  last_scene_id: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
  })
  health_score: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  interpretation: string;

  @BelongsTo(() => Field)
  field: Field;
}