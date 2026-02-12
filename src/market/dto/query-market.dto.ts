import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryMarketDto {
  @IsOptional()
  @IsString()
  commodity?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
