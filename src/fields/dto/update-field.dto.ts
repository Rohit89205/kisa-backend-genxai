import { IsString, IsOptional, IsDate } from 'class-validator';
export class UpdateFieldDto {
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
}