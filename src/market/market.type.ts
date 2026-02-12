export interface MarketTick {
  ts: string;
  modal: number;
}

export interface MarketItem {
  id: string;
  state: string;
  market: string;
  commodity: string;
  arrival: string | null;
  min: number;
  max: number;
  modal: number;
  trendHistory: MarketTick[];
  lastUpdated: string;
  raw?: any;
}
