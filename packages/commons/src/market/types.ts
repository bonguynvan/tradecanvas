import type { Theme } from '../types/theme.js';

export type MarketType = 'crypto' | 'stock' | 'forex';

export type StockExchange = 'HOSE' | 'HNX' | 'UPCOM' | 'NYSE' | 'NASDAQ' | string;

export interface MarketConfig {
  type: MarketType;
  exchange?: StockExchange;
  currency?: string;
  pricePrecision?: number;
  volumeUnit?: number;           // e.g. 10 for VN (trade in lots of 10)
  priceStep?: number;            // min price increment

  // Price limit (ceiling/floor)
  priceLimits?: {
    enabled: boolean;
    ceilingPercent?: number;     // e.g. 7 for HOSE
    floorPercent?: number;       // e.g. 7 for HOSE
    referencePrice?: number;
  };

  // Trading sessions
  sessions?: TradingSession[];

  // Color scheme
  colorScheme?: MarketColorScheme;
}

export interface TradingSession {
  name: string;
  startTime: string;  // "09:00"
  endTime: string;    // "11:30"
  type: 'preOpen' | 'continuous' | 'preClose' | 'closed';
}

export interface MarketColorScheme {
  up: string;
  down: string;
  unchanged: string;
  ceiling: string;
  floor: string;
  reference: string;
}

export interface PriceLimitInfo {
  ceiling: number;
  floor: number;
  reference: number;
}
