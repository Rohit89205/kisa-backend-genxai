import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import axiosRetry from 'axios-retry';

@Injectable()
export class DataGovProvider {
  private readonly logger = new Logger(DataGovProvider.name);

  private readonly BASE =
    'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

  private readonly apiKey = process.env.DATA_GOV_API_KEY || '';

  constructor() {
    axiosRetry(axios, {
      retries: 3,
      retryDelay: (retry) => retry * 300,
      retryCondition: (error) =>
        axiosRetry.isNetworkError(error) ||
        axiosRetry.isRetryableError(error) ||
        error?.response?.status === 429,
    });
  }

  /**
   * -----------------------------------------
   * 1️ BASIC FETCH (FILTERED / SINGLE PAGE)
   * -----------------------------------------
   * Used for:
   * - Commodity-specific fetch
   * - State-specific fetch
   * - Emergency fallback
   */
  async fetch(options?: {
    state?: string;
    commodity?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('DATA_GOV_API_KEY missing in .env');
    }

    const params: any = {
      'api-key': this.apiKey,
      format: 'json',
      limit: Math.min(options?.limit ?? 500, 500),
      offset: options?.offset ?? 0,
    };

    if (options?.state) {
      params['filters[State]'] = options.state;
    }

    if (options?.commodity) {
      params['filters[Commodity]'] = options.commodity;
    }

    this.logger.log(
      `Fetching Agmarknet → limit=${params.limit}, offset=${params.offset}`,
    );

    const res = await axios.get(this.BASE, {
      params,
      timeout: 30000,
    });

    return res?.data?.records || [];
  }

  /**
   * -----------------------------------------
   * 2 FULL INDIA PAGINATED FETCH (IMPORTANT)
   * -----------------------------------------
   * This ensures:
   * Complete district coverage
   * Single trusted national dataset
   *
   * Called:
   * - Once daily (12:00 AM)
   * - Or on manual refresh
   */
  async fetchAllIndiaPaginated(): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('DATA_GOV_API_KEY missing in .env');
    }

    const limit = 500;
    let offset = 0;
    let allRecords: any[] = [];

    while (true) {
      this.logger.log(
        `Fetching All-India Agmarknet → offset=${offset}, limit=${limit}`,
      );

      const records = await this.fetch({ limit, offset });

      if (!records || records.length === 0) {
        break;
      }

      allRecords.push(...records);

      // Last page condition
      if (records.length < limit) {
        break;
      }

      offset += limit;
    }

    this.logger.log(
      `Full India fetch complete → Total records: ${allRecords.length}`,
    );

    return allRecords;
  }

  /**
   * -----------------------------------------
   * 3️ NORMALIZATION (UNCHANGED BUT SAFE)
   * -----------------------------------------
   */
  normalize(records: any[]) {
    if (!Array.isArray(records)) return [];

    const toNum = (v: any) => {
      if (v == null) return 0;
      const n = Number(String(v).replace(/[^0-9.]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    return records.map((r) => {
      const state = r.State || r.state || '';
      const market = r.Market || r.market || '';
      const commodity = r.Commodity || r.commodity || '';

      return {
        id: `${state}-${market}-${commodity}`
          .toLowerCase()
          .replace(/\s+/g, '-'),

        state,
        market,
        commodity,

        min: toNum(r.Min_Price ?? r.min_price),
        max: toNum(r.Max_Price ?? r.max_price),
        modal: toNum(r.Modal_Price ?? r.modal_price),

        arrival: r.Arrival_Date || r.arrival_date || null,

        trendHistory: [],
        lastUpdated: new Date().toISOString(),
        raw: r,
      };
    });
  }
}
