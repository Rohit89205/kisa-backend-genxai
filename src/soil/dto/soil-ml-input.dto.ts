import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class SoilMlInputDto {
  @IsOptional()
  @IsUUID()
  field_id?: string;

  @IsOptional() @IsNumber() ndvi_mean_90d?: number;
  @IsOptional() @IsNumber() ndvi_trend_30d?: number;
  @IsOptional() @IsNumber() ndvi_std_90d?: number;
  @IsOptional() @IsNumber() ndre_mean_90d?: number;
  @IsOptional() @IsNumber() bsi_mean_90d?: number;

  @IsOptional() @IsNumber() pH_0_30?: number;
  @IsOptional() @IsNumber() soc_0_30?: number;

  @IsOptional() @IsNumber() clay?: number;
  @IsOptional() @IsNumber() silt?: number;
  @IsOptional() @IsNumber() sand?: number;

  @IsOptional() @IsNumber() valid_obs_count?: number;
  @IsOptional() @IsNumber() cloud_pct?: number;

  @IsOptional() @IsNumber() area_ha?: number;
  @IsOptional() @IsNumber() elevation?: number;
  @IsOptional() @IsNumber() rainfall_30d?: number;
}
