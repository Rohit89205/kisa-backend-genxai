import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Field } from './field.model';

@Table({
  tableName: 'field_activities',
  timestamps: true,
  underscored: true,
})
export class FieldActivities extends Model<FieldActivities> {
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
  activity_type: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  activity_date: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes: string;

  @BelongsTo(() => Field)
  field: Field;
}