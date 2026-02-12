import { Controller, Post, Body } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketPredictDto } from './dto/market-predict.dto';

@Controller('markets/ml')
export class MarketMlController {
  constructor(private readonly marketService: MarketService) {}

  @Post('predict')
  async predict(@Body() dto: MarketPredictDto) {
    return this.marketService.predictMarketPrice(dto);
  }
}
