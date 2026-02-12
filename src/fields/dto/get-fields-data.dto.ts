import { IsOptional, IsString } from 'class-validator';

export class GetFieldsDataDto {
  @IsOptional()
  @IsString()
  columns?: string; // Comma-separated column names

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  columnSearch?: Record<string, any>;
}
