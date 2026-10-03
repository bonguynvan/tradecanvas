/** A regular trading window, wall-clock times in the symbol's `timezone`. */
export interface SymbolSession {
  /** Opening time, `'09:30'`. */
  start: string;
  /** Closing time, `'16:00'`; earlier than `start` wraps past midnight. */
  end: string;
  /**
   * Weekdays it opens on, 0 Sunday … 6 Saturday (a session past midnight
   * belongs to the day it starts); every day when left out. The market
   * status reads them.
   */
  days?: number[];
}

/** What a feed knows about a symbol: names, price steps and trading hours. */
export interface SymbolInfo {
  /** The ticker the adapter uses, e.g. `'BTCUSDT'`. */
  symbol: string;
  /** A readable name: `'BTC / USDT'`, `'Apple Inc.'`. */
  description?: string;
  /** Where it trades: `'Binance'`, `'NASDAQ'`. */
  exchange?: string;
  /** `'crypto'`, `'stock'`, `'forex'`, `'futures'`, `'index'`… */
  type?: string;
  /** Decimals prices show with. */
  pricePrecision?: number;
  /** Smallest price step. */
  minTick?: number;
  /** IANA zone the exchange keeps its hours in, e.g. `'America/New_York'`. */
  timezone?: string;
  /** Regular trading hours in `timezone`; none means around the clock. */
  sessions?: SymbolSession[];
  /** Currency prices are quoted in. */
  currency?: string;
}

/** Options for `DataAdapter.searchSymbols`. */
export interface SymbolSearchOptions {
  /** Most results to return (default 50). */
  limit?: number;
  /** Aborted when a newer query supersedes this one. */
  signal?: AbortSignal;
}
