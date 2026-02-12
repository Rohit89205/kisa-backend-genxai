import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { User } from './user.model';
@Table({
  tableName: 'user_sessions',
  timestamps: true,
  underscored: true,
})
export class UserSession extends Model<UserSession> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  refresh_token: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  access_token: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  state: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  district: string | null;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lat: number | null;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  lon: number | null;

  @BelongsTo(() => User)
  user: User;
}
