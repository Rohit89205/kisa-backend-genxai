import {
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lon: number;
}

export class FertilizerRecommendationRequestDto {
  // EQUIRED for ML-driven fertilizer recommendation
  @IsUUID()
  fieldId: string;

  // Optional (future crop-based logic)
  @IsOptional()
  @IsString()
  crop?: string;

  //  Optional (future geo-based logic)
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}
