import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PriceDynamicsService } from './price-dynamics.service';
import { PriceDynamicsDto } from './dto/price-dynamics.dto';

@Controller('markets/price-dynamics')
export class PriceDynamicsController {
  constructor(private readonly priceDynamicsService: PriceDynamicsService) {}

  @Get()
  @UsePipes(
    new ValidationPipe({
      transform: true,       // converts days → number
      whitelist: true,       // strips extra query params
      forbidNonWhitelisted: true,
    }),
  )
  async getPriceDynamics(@Query() query: PriceDynamicsDto) {
    console.log('🔥 PriceDynamicsController HIT');console.log(query);
    return this.priceDynamicsService.getPriceDynamics({
      state: query.state,
      district: query.district,
      commodity: query.commodity,
      days: query.days ?? 30,
    });
  }
}
