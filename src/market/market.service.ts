import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DataGovProvider } from './data-gov.provider';
import { CacheProvider } from './cache.provider';
import { MarketItem } from './market.type';
import { MarketPredictDto } from './dto/market-predict.dto';
import { MarketPredictResponseDto } from './dto/market-predict-response.dto';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);
  private readonly CACHE_KEY = 'markets_all_india_v2';

  private localCache: {
    markets: MarketItem[];
    lastFetched: string | null;
  } = {
    markets: [],
    lastFetched: null,
  };

  constructor(
    private readonly dataGov: DataGovProvider,
    private readonly cache: CacheProvider,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    await this.loadCache();

    if (!this.localCache.markets.length) {
      await this.refreshAllIndiaSnapshot();
    }
  }

  @Cron('30 5 * * *', { timeZone: 'Asia/Kolkata' })
  async dailyRefreshJob() {
    await this.refreshAllIndiaSnapshot();
  }

  private async refreshAllIndiaSnapshot() {
    try {
      const PAGE_SIZE = 500;
      const MAX_PAGES = 40;

      let offset = 0;
      const allRecords: any[] = [];

      for (let page = 1; page <= MAX_PAGES; page++) {
        const records: any[] = await this.dataGov.fetch({
          limit: PAGE_SIZE,
          offset,
        });

        if (!records.length) break;

        allRecords.push(...records);
        offset += PAGE_SIZE;
        if (records.length < PAGE_SIZE) break;
      }

      const normalized = this.dataGov.normalize(allRecords) as MarketItem[];
      await this.saveCache(normalized);
    } catch (err) {
      this.logger.error('Market refresh failed', err as any);
    }
  }

  private async loadCache() {
    const cached = await this.cache.get<any>(this.CACHE_KEY);
    if (cached?.markets) {
      this.localCache = cached;
    }
  }

  private async saveCache(markets: MarketItem[]) {
    this.localCache = {
      markets,
      lastFetched: new Date().toISOString(),
    };

    await this.cache.set(this.CACHE_KEY, this.localCache, 60 * 60 * 24);
  }

  // ---------------- READ APIs ----------------

  async getMarkets(filter?: {
    state?: string;
    district?: string;
    commodity?: string;
    limit?: number;
  }): Promise<MarketItem[]> {
    let data = this.localCache.markets;

   if (filter?.state) {
  const s = filter.state.toLowerCase().trim();

  data = data.filter((m: any) => {
    const rawState =
      m.state ||
      m.raw?.State ||
      m.raw?.state ||
      m.raw?.['State Name'] ||
      '';

    return String(rawState)
      .toLowerCase()
      .trim() === s;
  });
}


    if (filter?.district) {
  const d = filter.district.toLowerCase();

  data = data.filter((m: any) => {
    const rawDistrict =
      m.district ||
      m.raw?.District ||
      m.raw?.district ||
      m.raw?.['District Name'] ||
      '';

    return String(rawDistrict)
      .toLowerCase()
      .replace(' district', '')
      .trim() === d;
  });
}


    if (filter?.commodity) {
      const c = filter.commodity.toLowerCase();
      data = data.filter(
        (m: any) => String(m.commodity || '').toLowerCase() === c,
      );
    }

    if (filter?.limit) {
      data = data.slice(0, filter.limit);
    }

    return data;
  }

  async getById(id: string): Promise<MarketItem | null> {
    return this.localCache.markets.find((m) => m.id === id) || null;
  }

  async getStateWiseAnalysis(
    state: string,
    filters?: { district?: string; commodity?: string },
  ) {
    const s = state.toLowerCase();

    let records = this.localCache.markets.filter((m: any) => {
      const rawState =
        m.state ||
        m.raw?.State ||
        m.raw?.state ||
        m.raw?.['State Name'] ||
        '';

      return String(rawState).toLowerCase().trim() === s;
    });


    if (filters?.district) {
      const d = filters.district.toLowerCase();
      records = records.filter((m: any) => {
        const raw =
          m.raw?.District || m.raw?.district || m.raw?.['District Name'] || '';
        return String(raw).toLowerCase() === d;
      });
    }

    if (filters?.commodity) {
      const c = filters.commodity.toLowerCase().trim();
      records = records.filter(
        (m: any) => String(m.commodity || '').toLowerCase().trim() === c,
      );
    }

    return {
      state,
      totalRecords: records.length,
      lastUpdated: this.localCache.lastFetched,
      records,
    };
  }

  // ---------------- ML PREDICTION ----------------
  async predictMarketPrice(
    dto: MarketPredictDto,
  ): Promise<MarketPredictResponseDto> {
    try {
      this.logger.log(`Sending to ML → ${JSON.stringify(dto)}`);
      const response = await firstValueFrom(
        this.httpService.post<MarketPredictResponseDto>(
          'http://127.0.0.1:8003/api/predict',
          { crop: dto.crop },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      return response.data;
    } catch (err: any) {
      this.logger.error('Market ML prediction error', err?.message);
      throw new InternalServerErrorException(
        'Market ML prediction service unavailable',
      );
    }
  }
  // ---------------- AUXILIARY STATES DATA COMMING FROM AGMARKNET API ----------------
  async getAllStates(): Promise<string[]> {
  const states = this.localCache.markets
    .map((m: any) =>
      String(
        m.state ||
        m.raw?.State ||
        m.raw?.['State Name'] ||
        ''
      )
        .toLowerCase()
        .trim()
    )
    .filter(Boolean);

  return Array.from(new Set(states)).sort();
}
//---------------- AUXILIARY DISTRICTS DATA COMMING FROM AGMARKNET API ----------------
async getDistrictsByState(state: string): Promise<string[]> {
  const s = state.toLowerCase().trim();

  const districts = this.localCache.markets
    .filter((m: any) => {
      const rawState =
        m.state ||
        m.raw?.state ||           // ✅ FIX
        m.raw?.State ||
        m.raw?.['State Name'] ||
        '';

      return String(rawState).toLowerCase().trim() === s;
    })
    .map((m: any) =>
      String(
        m.raw?.district ||        // ✅ FIX (MOST IMPORTANT)
        m.district ||
        ''
      )
        .toLowerCase()
        .trim()
    )
    .filter(Boolean);

  return Array.from(new Set(districts)).sort();
}


//---------------- AUXILIARY COMMODITIES DATA COMMING FROM AGMARKNET API ----------------
  async getAllCommodities() {
  const data = this.localCache.markets;

  const unique = Array.from(
    new Set(data.map((m: any) => m.commodity))
  );

  return unique.sort();
}

}
