import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Field } from '../../fields/models/field.model';
import { UserSession } from './user_session.model';

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
})
export class User extends Model<User> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone_no: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_verified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_active: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  otp: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  otp_expires_at: Date | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  is_official: boolean | null;

  @HasMany(() => Field)
  fields: Field[];

  @HasMany(() => UserSession)
  user_sessions: UserSession[]
}
