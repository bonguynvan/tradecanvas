/** Symbols and timeframes whose history's last bar is kept; past this many the oldest is let go. */
const MAX_SERVED_SERIES = 64;

const seriesKey = (symbol: string, timeframe: string): string => `${symbol}|${timeframe}`;

/** The last bar of a history served: when it starts, in the history's own unit, and its close then (NaN when it had none). */
export interface ServedBar {
  time: number;
  close: number;
}

/**
 * The last bar of the history an adapter last served for each symbol and
 * timeframe: a connection to them starts from it, the bars and the prices
 * before it being the history's.
 */
export class ServedHistory {
  private readonly last = new Map<string, ServedBar>();

  /** The history the adapter served for `symbol` and `timeframe`, as its `fetchHistory` gave it. */
  serve(symbol: string, timeframe: string, bars: unknown): void {
    if (!Array.isArray(bars) || bars.length === 0) return;
    const bar = bars[bars.length - 1] as { time?: unknown; close?: unknown } | null;
    const time = Number(bar?.time);
    if (!Number.isFinite(time)) return;
    const key = seriesKey(symbol, timeframe);
    // Deleted first, so the series served last is the last in the map's order.
    this.last.delete(key);
    this.last.set(key, { time, close: Number(bar?.close ?? Number.NaN) });
    if (this.last.size > MAX_SERVED_SERIES) this.last.delete(this.last.keys().next().value as string);
  }

  /** The last bar served for `symbol` and `timeframe`, or undefined when none was. */
  lastBar(symbol: string, timeframe: string): ServedBar | undefined {
    return this.last.get(seriesKey(symbol, timeframe));
  }
}
