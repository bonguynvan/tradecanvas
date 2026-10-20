export type MarketType = 'crypto' | 'stock' | 'forex' | 'futures';

export type StockExchange = 'HOSE' | 'HNX' | 'UPCOM' | 'NYSE' | 'NASDAQ' | string;

/** From `from` up to the next band, prices move in steps of `step`. */
export interface PriceStepBand {
  from: number;
  step: number;
}

export interface MarketConfig {
  type: MarketType;
  exchange?: StockExchange;
  currency?: string;
  pricePrecision?: number;
  volumeUnit?: number;           // board lot, e.g. 100 shares in Vietnam
  priceStep?: number;            // min price increment
  /**
   * Steps that depend on the price, lowest band first (HOSE: 10, 50 or 100
   * dong). Prices below the first band use `priceStep`.
   */
  priceSteps?: readonly PriceStepBand[];
  /** The exchange's IANA time zone, which its session times are in. */
  timeZone?: string;
  /** Currency per point of a futures contract (VN30F: 100,000 dong). */
  contractMultiplier?: number;

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
  /** `preOpen` / `preClose`: the opening and closing auctions; `postClose`: trading after the close. */
  type: 'preOpen' | 'continuous' | 'preClose' | 'postClose' | 'closed';
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

/** One listed VN30 index futures contract. */
export interface VN30FContract {
  /** `VN30F` with the year and month of expiry: `VN30F2611`. */
  symbol: string;
  year: number;
  month: number;
  /** Its last trading day, `YYYY-MM-DD`. */
  lastTradingDay: string;
}
