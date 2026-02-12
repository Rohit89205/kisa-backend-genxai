import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CacheProvider } from './cache.provider';

@Injectable()
export class PriceDynamicsService {
  private readonly logger = new Logger(PriceDynamicsService.name);

  private readonly BASE_URL =
    'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

  constructor(
    private readonly httpService: HttpService,
    private readonly cache: CacheProvider,
) {}

  async getPriceDynamics(params: {
    state: string;
    district: string;
    commodity: string;
    days?: number;
  }) {
    
    const { state, district, commodity, days = 30 } = params;
    //CREATE CACHE KEY

    const cacheKey = `price_dynamics:${state}:${district}:${commodity}:${days}`;

  //  CHECK CACHE FIRST 
  const cached = await this.cache.get<any>(cacheKey);
  if (cached) {
    this.logger.log(` Price dynamics cache HIT → ${cacheKey}`);
    return cached;
  }
    try{
    const response = await firstValueFrom(
      this.httpService.get(this.BASE_URL, {
        params: {
          'api-key': process.env.DATA_GOV_PRICE_API_KEY,
          format: 'json',
          limit: 100,
          'filters[state]': state,
          'filters[district]': district,
          'filters[commodity]': commodity,
        },
      }),
    );

  
    const records = response.data?.records || [];

    // ---------------------------
    // GROUP BY ARRIVAL DATE
    // ---------------------------
    const grouped: Record<string, any[]> = {};

    for (const r of records) {
      const date =
        r.arrival_date ||
        r.Arrival_Date ||
        r['Arrival Date'];

      if (!date) continue;

      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(r);
    }

    // ---------------------------
    // AGGREGATE DAILY PRICES
    // ---------------------------
    const prices = Object.entries(grouped)
      .map(([date, items]) => {
        const min = Math.min(...items.map(i => Number(i.min_price)));
        const max = Math.max(...items.map(i => Number(i.max_price)));
        const modal =
          items.reduce((a, b) => a + Number(b.modal_price), 0) /
          items.length;

        return {
          date,
          min,
          max,
          modal: Math.round(modal),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    const result ={
      state,
      district,
      commodity,
      count: prices.length,
      prices,
    };

     //  SAVE TO CACHE (30 minutes)
  await this.cache.set(cacheKey, result, 60 * 30);

  return result;

  }    
  catch (err: any) {
  if (err?.response?.status === 429) {
    return {
      state,
      district,
      commodity,
      count: 0,
      prices: [],
      message: 'Rate limit exceeded. Please try again later.',
    };
  }

  throw err;
}
}
}
