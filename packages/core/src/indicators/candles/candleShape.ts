import type { DataSeries } from '@tradecanvas/commons';

/** A body no more than this share of its range is a doji. */
export const DOJI_BODY = 0.1;
/** A shadow no more than this share of the range is (nearly) none. */
export const NO_SHADOW = 0.05;
/** Prices this share of the average range apart count as equal. */
export const EQUAL = 0.05;

export type Trend = 'up' | 'down' | null;

/**
 * The bars a pattern is read from, with the shapes the patterns test:
 * bodies, shadows and gaps, and the average body and range and the trend
 * before a bar. Those are worked out when first asked for and kept, so a
 * bar's tests cost O(period) once, however many patterns read them.
 */
export class Candles {
  private readonly bodies = new Map<number, number>();
  private readonly ranges = new Map<number, number>();
  private readonly trends = new Map<number, Trend>();

  constructor(readonly data: DataSeries, readonly period: number) {}

  open(i: number): number { return this.data[i].open; }
  high(i: number): number { return this.data[i].high; }
  low(i: number): number { return this.data[i].low; }
  close(i: number): number { return this.data[i].close; }

  body(i: number): number { return Math.abs(this.data[i].close - this.data[i].open); }
  range(i: number): number { return this.data[i].high - this.data[i].low; }
  bodyTop(i: number): number { return Math.max(this.data[i].open, this.data[i].close); }
  bodyBottom(i: number): number { return Math.min(this.data[i].open, this.data[i].close); }
  mid(i: number): number { return (this.data[i].open + this.data[i].close) / 2; }
  upper(i: number): number { return this.data[i].high - this.bodyTop(i); }
  lower(i: number): number { return this.bodyBottom(i) - this.data[i].low; }
  white(i: number): boolean { return this.data[i].close > this.data[i].open; }
  black(i: number): boolean { return this.data[i].close < this.data[i].open; }

  /** The average body of the `period` bars before bar `s` (all before it, near the start). */
  avgBody(s: number): number {
    let v = this.bodies.get(s);
    if (v === undefined) {
      v = this.averageBefore(s, (k) => this.body(k));
      this.bodies.set(s, v);
    }
    return v;
  }

  avgRange(s: number): number {
    let v = this.ranges.get(s);
    if (v === undefined) {
      v = this.averageBefore(s, (k) => this.range(k));
      this.ranges.set(s, v);
    }
    return v;
  }

  private averageBefore(s: number, of: (k: number) => number): number {
    const from = Math.max(0, s - this.period);
    if (s <= from) return of(s);
    let sum = 0;
    for (let k = from; k < s; k++) sum += of(k);
    return sum / (s - from);
  }

  /**
   * The body sizes are measured against before the pattern starting at `s`:
   * the average body, but no less than a quarter of the average range, so a
   * run of flat or halted bars doesn't make every later body "long". 0 when
   * nothing moved at all.
   */
  bodyScale(s: number): number { return Math.max(this.avgBody(s), this.avgRange(s) * 0.25); }
  /** A body longer than the usual before the pattern starting at `s`. */
  long(i: number, s = i): boolean {
    const scale = this.bodyScale(s);
    return scale > 0 && this.body(i) > scale;
  }
  /** A body under half the usual before the pattern starting at `s`. */
  short(i: number, s = i): boolean { return this.body(i) < this.bodyScale(s) * 0.5; }
  doji(i: number): boolean { return this.range(i) > 0 && this.body(i) <= this.range(i) * DOJI_BODY; }
  /** No shadow worth the name on either side. */
  marubozu(i: number, s = i): boolean {
    return this.long(i, s) && this.upper(i) <= this.range(i) * NO_SHADOW && this.lower(i) <= this.range(i) * NO_SHADOW;
  }

  /** Whether two prices are equal for the pattern starting at `s`. */
  same(a: number, b: number, s: number): boolean { return Math.abs(a - b) <= this.avgRange(s) * EQUAL; }

  /** Bar b's body all above bar a's. */
  bodyGapUp(a: number, b: number): boolean { return this.bodyBottom(b) > this.bodyTop(a); }
  bodyGapDown(a: number, b: number): boolean { return this.bodyTop(b) < this.bodyBottom(a); }
  /** Bar b's body inside bar a's. */
  bodyInside(a: number, b: number): boolean {
    return this.bodyTop(b) <= this.bodyTop(a) && this.bodyBottom(b) >= this.bodyBottom(a) && this.body(b) < this.body(a);
  }

  /**
   * The trend into bar `s`: up when the close before it is above both its
   * `period`-bar average and the close `period` − 1 bars earlier, down when
   * below both. One bounce in a fall doesn't make it an uptrend. None in the
   * first `period` bars.
   */
  trendBefore(s: number): Trend {
    let t = this.trends.get(s);
    if (t === undefined) {
      t = this.readTrend(s);
      this.trends.set(s, t);
    }
    return t;
  }

  private readTrend(s: number): Trend {
    const last = s - 1;
    if (last < this.period - 1) return null;
    let sum = 0;
    for (let k = last - this.period + 1; k <= last; k++) sum += this.close(k);
    const average = sum / this.period;
    const close = this.close(last);
    const before = this.close(last - this.period + 1);
    if (close > average && close > before) return 'up';
    if (close < average && close < before) return 'down';
    return null;
  }
}
