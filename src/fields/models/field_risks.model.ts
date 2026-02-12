import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Field } from './field.model';

@Table({
  tableName: 'field_risks',
  timestamps: true,
  underscored: true,
})
export class FieldRisks extends Model<FieldRisks> {
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
  risk_type: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  severity: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  detected_on: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  })
  resolved: boolean;

  @BelongsTo(() => Field)
  field: Field;
}