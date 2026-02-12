import { IsString, IsNotEmpty } from 'class-validator';

export class MarketPredictDto {
  @IsString()
  @IsNotEmpty()
  crop: string;
}
