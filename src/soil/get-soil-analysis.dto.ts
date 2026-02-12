import { IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSoilAnalysisDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  village?: string;

  // If NONE of the location fields are provided, then lat & lon are required
  @ValidateIf(o => !o.country && !o.state && !o.city && !o.village)
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ValidateIf(o => !o.country && !o.state && !o.city && !o.village)
  @IsNumber()
  @Type(() => Number)
  lon?: number;
}
