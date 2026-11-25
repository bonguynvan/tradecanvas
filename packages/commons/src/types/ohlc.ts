export interface OHLCBar {
  /** Unix timestamp in milliseconds */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /**
   * Of `volume`, what the buyers took: traded at the ask, the buyer being
   * the one who crossed the spread. With it the bar has a delta, bought
   * less sold (`barDelta`). Left out where the feed does not say who took
   * its trades.
   */
  buyVolume?: number;
}

export interface TickData {
  time: number;
  price: number;
  volume?: number;
  /** Who took the trade: `'buy'` when the buyer crossed the spread. */
  side?: 'buy' | 'sell';
}

/** Seconds, minutes, hours, days, weeks, months (`m` is minutes, `M` months). */
export type TimeFrameUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M';

/** The timeframes most feeds offer, listed for editor completion. */
export type KnownTimeFrame =
  | '1s' | '5s' | '15s' | '30s'
  | '1m' | '3m' | '5m' | '15m' | '30m' | '45m'
  | '1h' | '2h' | '3h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '2d' | '3d'
  | '1w' | '2w'
  | '1M' | '3M' | '6M' | '12M';

/**
 * A bar interval: a whole count and a unit, e.g. `'5m'`, `'7m'`, `'90m'`,
 * `'2d'`. Any count works; `parseTimeframe` / `isTimeFrame` check a string at
 * runtime.
 */
/** A time timeframe, or a tick one (`'100T'`: bars of 100 trades, from a feed with trades). */
export type TimeFrame = KnownTimeFrame | (`${number}${TimeFrameUnit}` & {}) | (`${number}T` & {});

export type DataSeries = OHLCBar[];

/** What traded at one price row of a bar, by who took it. */
export interface FootprintLevel {
  /** The row's price: its lower edge. */
  price: number;
  /** What the buyers took, at the ask. */
  buy: number;
  /** What the sellers took, at the bid. */
  sell: number;
}

/** A bar's footprint: what traded at each price inside it. */
export interface FootprintBar {
  /** The bar's time, in milliseconds. */
  time: number;
  /** Its rows, lowest price first. */
  levels: FootprintLevel[];
}
