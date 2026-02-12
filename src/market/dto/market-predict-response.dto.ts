export class MarketPredictResponseDto {
  crop: string;
  predicted_price: number;
  unit: string;
  prediction_date?: string;
  prediction_month?: number;
  prediction_year?: number;
}
