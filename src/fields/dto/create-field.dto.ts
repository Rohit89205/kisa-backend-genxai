import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
class PolygonDto {
  @IsArray()
  coordinates: number[][][];

  @IsString()
  type: 'Polygon';
}
export class CreateFieldDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  crop_name?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  sowing_date?: any;

  @IsOptional()
  harvest_date?: any;

  @IsOptional()
  @IsNumber()
  area_ha?: number;

  @ValidateNested()
  @Type(() => PolygonDto)
  geom: PolygonDto;
}
