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
  /** The board lot (100 shares on HOSE): the widget's order ticket asks for whole lots above one. */
  volumeUnit?: number;
  /** The smallest price move, and the step below the first of `priceSteps`. */
  priceStep?: number;
  /**
   * Steps that depend on the price, lowest band first (HOSE: 10, 50 or 100
   * dong). Prices below the first band use `priceStep`.
   */
  priceSteps?: readonly PriceStepBand[];
  /** The exchange's IANA time zone, which its session times are in. */
  timeZone?: string;
  /** Currency per point of a futures contract (VN30F: 100,000 dong). */
  contractMultiplier?: number;

  /** The day's ceiling and floor, a percentage either side of the reference price. */
  priceLimits?: {
    enabled: boolean;
    /** How far above the reference price the ceiling is, % (7 on HOSE). */
    ceilingPercent?: number;
    /** How far below the reference price the floor is, % (7 on HOSE). */
    floorPercent?: number;
    /** The price the limits are counted from, the last session's close; `chart.setPriceLimits(price)` sets it. */
    referencePrice?: number;
  };

  /** The day's sessions, their times in the exchange's `timeZone`. */
  sessions?: TradingSession[];

  /** The colours of rising, falling and unchanged prices, and of the ceiling, floor and reference price. */
  colorScheme?: MarketColorScheme;
}

export interface TradingSession {
  name: string;
  /** When it starts, `'HH:mm'` (`'09:00'`), in the zone `getCurrentSession` is given: the market's `timeZone`. */
  startTime: string;
  /** When it ends, `'HH:mm'` (`'11:30'`): the first minute no longer in it. */
  endTime: string;
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
