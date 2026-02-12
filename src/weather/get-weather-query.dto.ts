import { IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class GetWeatherQueryDto {
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

  // If NO country/state/city/village, then lat & lon are required
  @ValidateIf(o => !o.country && !o.state && !o.city && !o.village)
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ValidateIf(o => !o.country && !o.state && !o.city && !o.village)
  @IsNumber()
  @Type(() => Number)
  lon?: number;
}
