import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceDynamicsDto {
  @IsString()
  state: string;

  @IsString()
  district: string;

  @IsString()
  commodity: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}
