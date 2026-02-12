import { IsOptional, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class AreaWeatherDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsObject()
  polygon?: any; // GeoJSON Polygon (coordinates in [lon, lat] order)

  @IsOptional()
  timezone?: string; // optional string like "Asia/Kolkata"
}
