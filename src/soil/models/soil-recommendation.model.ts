import {
  Table,
  Column,
  Model,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'soil_recommendations',
  timestamps: true,
})
export class SoilRecommendation extends Model<SoilRecommendation> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string; 

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  field_id!: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  prediction!: any;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  fertilizerRecommendation!: any;
}
