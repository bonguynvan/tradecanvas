import type { DataSeries, OHLCBar } from '@tradecanvas/commons';

/** Floats per bar on the GPU: open, high, low, close (from the base price), volume, up (1) or down (0). */
export const FLOATS_PER_BAR = 6;

/** The bars to write to the GPU buffer after a `sync`: `[from, to)`, or all of them. */
export interface SeriesChange {
  full: boolean;
  from: number;
  to: number;
}

const same = (a: OHLCBar, b: OHLCBar) =>
  a.time === b.time && a.open === b.open && a.high === b.high && a.low === b.low && a.close === b.close && a.volume === b.volume;

/**
 * The series as the GPU takes it, kept in step with the chart's bars at the
 * least cost. Prices are stored relative to a base price (float32 keeps 24
 * bits: 84,814.20 in absolute terms would lose its cents) and the direction
 * is stored as a flag, so a bar is never mistaken for up or down by float
 * rounding. The chart ticks and appends in the same array: a live tick
 * rewrites one bar and new bars are appended. A new array (new data, older
 * bars paged in) or a changed bar in a sample of the rest writes everything.
 */
export class SeriesUploads {
  private buffer = new Float32Array(0);
  private count = 0;
  private basePrice = 0;
  /**
   * Bars as they were written, to tell a tick from new history: the last
   * one, the one before it, and a sample spread over the rest.
   */
  private samples: { index: number; bar: OHLCBar }[] = [];
  private last: OHLCBar | null = null;
  /** The array last written: the chart ticks and appends in place, and replaces it for new history. */
  private source: DataSeries | null = null;

  get values(): Float32Array {
    return this.buffer;
  }

  get length(): number {
    return this.count;
  }

  get base(): number {
    return this.basePrice;
  }

  sync(data: DataSeries): SeriesChange {
    const n = data.length;
    if (n === 0) {
      this.reset();
      return { full: true, from: 0, to: 0 };
    }
    const prev = this.count;
    const continues = data === this.source && prev > 0 && n >= prev
      && this.samples.every(({ index, bar }) => same(data[index], bar));
    if (!continues) {
      this.basePrice = data[n - 1].close;
      this.ensure(n);
      this.write(data, 0, n);
      this.remember(data);
      return { full: true, from: 0, to: n };
    }
    // The last bar may have ticked; anything after it is new.
    const from = this.last !== null && same(data[prev - 1], this.last) ? prev : prev - 1;
    if (n > this.buffer.length / FLOATS_PER_BAR) {
      // Out of room: a bigger buffer, written whole.
      this.ensure(n);
      this.write(data, 0, n);
      this.remember(data);
      return { full: true, from: 0, to: n };
    }
    this.write(data, from, n);
    this.remember(data);
    return { full: false, from, to: n };
  }

  private reset(): void {
    this.count = 0;
    this.samples = [];
    this.last = null;
    this.source = null;
  }

  private ensure(n: number): void {
    if (n * FLOATS_PER_BAR <= this.buffer.length) return;
    // Room to grow: live bars append without a full rewrite for a while.
    this.buffer = new Float32Array(Math.max(n + 1024, Math.ceil(n * 1.25)) * FLOATS_PER_BAR);
  }

  private write(data: DataSeries, from: number, to: number): void {
    const v = this.buffer;
    const base = this.basePrice;
    for (let i = from; i < to; i++) {
      const b = data[i];
      const k = i * FLOATS_PER_BAR;
      v[k] = b.open - base;
      v[k + 1] = b.high - base;
      v[k + 2] = b.low - base;
      v[k + 3] = b.close - base;
      v[k + 4] = b.volume;
      v[k + 5] = b.close >= b.open ? 1 : 0;
    }
    this.count = to;
  }

  private remember(data: DataSeries): void {
    const n = data.length;
    // Every bar but the last (which may tick): the first, the one before the
    // last, and 14 between. A changed bar elsewhere is new history.
    const settled = n - 1;
    const picks = new Set<number>();
    if (settled > 0) {
      for (let k = 0; k < 16; k++) picks.add(Math.min(settled - 1, Math.round((k * (settled - 1)) / 15)));
    }
    this.samples = [...picks].map((index) => ({ index, bar: { ...data[index] } }));
    this.last = { ...data[n - 1] };
    this.source = data;
  }
}
