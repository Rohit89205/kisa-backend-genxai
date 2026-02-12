import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { MarketService } from './market.service';
import { QueryMarketDto } from './dto/query-market.dto';
import { MarketPredictDto } from './dto/market-predict.dto';
import { MarketPredictResponseDto } from './dto/market-predict-response.dto';

@Controller('markets')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(private readonly marketService: MarketService) {}

  /* ----------------------------------------
   * STATE-WISE MARKET ANALYSIS
   * GET /api/v1/markets/by-state/:state
   * --------------------------------------*/
  @Get('by-state/:state')
  async byState(
    @Param('state') state: string,
    @Query('district') district?: string,
    @Query('commodity') commodity?: string,
  ) {
    return this.marketService.getStateWiseAnalysis(state, {
      district,
      commodity,
    });
  }

  /* ----------------------------------------
   *  LIST MARKETS (ALL INDIA / FILTERED)
   * GET /api/v1/markets
   * --------------------------------------*/
  @Get()
  async list(@Query() query: QueryMarketDto) {
    const limit = query.limit ? Number(query.limit) : undefined;

    const items = await this.marketService.getMarkets({
      state: query.state,
      district: query.district,
      commodity: query.commodity,
      limit,
    });

    return {
      count: items.length,
      items,
      lastFetched: new Date().toISOString(),
    };
  }

  /* ----------------------------------------
   * MARKET PRICE PREDICTION (ML)
   * POST /api/v1/markets/predict
   * --------------------------------------*/
   
  @Post('predict')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async predictMarket(
    @Body() dto: MarketPredictDto,
  ): Promise<MarketPredictResponseDto> {
    this.logger.log(`Prediction request: ${JSON.stringify(dto)}`);
    return this.marketService.predictMarketPrice(dto);
  }

  /* ----------------------------------------
 * STATES (FROM AGMARKNET CACHE)
 * GET /api/v1/markets/states
 * --------------------------------------*/
  @Get('states')
  async listStates() {
    return this.marketService.getAllStates();
  }

  /* ----------------------------------------
 * DISTRICTS BY STATE (FROM AGMARKNET CACHE)
 * GET /api/v1/markets/districts?state=maharashtra
 * --------------------------------------*/
  @Get('districts')
  async listDistricts(@Query('state') state: string) {
    return this.marketService.getDistrictsByState(state);
  }
  /* ----------------------------------------
 * COMMODITIES (FROM AGMARKNET CACHE)
 * GET /api/v1/markets/commodities
 * --------------------------------------*/
  @Get('commodities')
  async listCommodities() {
    return this.marketService.getAllCommodities();
  }
 
  /* ----------------------------------------
   *  SINGLE MARKET
   * --------------------------------------*/
  @Get(':id')
  async byId(@Param('id') id: string) {
    const item = await this.marketService.getById(id);
    return item || { message: 'not found' };
  }
  @Get('price-dynamics-test')
test() {
  console.log('🔥 TEST ROUTE HIT');
  return { ok: true };
}

}
