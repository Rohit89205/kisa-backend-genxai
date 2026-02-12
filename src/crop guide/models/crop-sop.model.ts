import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
  BelongsTo,
  DeletedAt,
  Default,
} from 'sequelize-typescript';
import { Crop } from './crop.model'; // Ensure the path to your Crop model file is correct

@Table({
  tableName: 'crop_sop',
  schema: 'public',
  timestamps: false, // Disable automatic createdAt/updatedAt columns
})
export class CropSop extends Model<CropSop> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  // ---------------- CROP ----------------
  @ForeignKey(() => Crop)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  crop_id: string;

  @BelongsTo(() => Crop)
  crop: Crop;

  // ---------------- BASIC COLUMNS ----------------
  /*@Column({
    type: DataType.STRING(150), // Matched to Crop.crop_name type in image
    allowNull: false,
  })
  crop_name: string;
  */

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  climate: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  soil: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  propagation: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  land_preparation: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  sowing_or_planting: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  spacing: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  irrigation: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fertilizer: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  weeding: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  interculture_support: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  pest_management: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  harvest: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  crop_cycle: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  created_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  updated_at: Date;

  /* ---- New Phase Columns (From SQL) ---- */

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase1_pre_sowing: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase2_sowing: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase3_establishment: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase4_vegetative: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  phase5_flowering: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase6_maturity: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase7_harvesting: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase8_postharvest: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  phase9_fieldclosure: string;

  /* ---- New Metadata Columns (From SQL) ---- */

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
  })
  season: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  production_system: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: true,
  })
  irrigation_type: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
  })
  sop_version: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  is_active: boolean;
}
