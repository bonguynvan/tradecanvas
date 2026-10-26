import { describe, it, expect, vi } from 'vitest';
import type { RawTick } from '@tradecanvas/commons';
import { TickAggregator } from '../TickAggregator.js';

const MIN = 60_000;

function tick(time: number, price: number, volume = 1): RawTick {
  return { time, price, volume };
}

describe('TickAggregator.processTick', () => {
  it('opens a new bar on the first tick aligned to the timeframe boundary', () => {
    const agg = new TickAggregator('1m');
    agg.processTick(tick(60_000 + 30_000, 100, 5));

    const bar = agg.getCurrentBar()!;
    expect(bar.time).toBe(60_000);
    expect(bar.open).toBe(100);
    expect(bar.high).toBe(100);
    expect(bar.low).toBe(100);
    expect(bar.close).toBe(100);
    expect(bar.volume).toBe(5);
    expect(bar.tickCount).toBe(1);
    expect(bar.closed).toBe(false);
  });

  it('updates OHLC, volume, and tick count when ticks fall in the same bucket', () => {
    const agg = new TickAggregator('1m');
    agg.processTick(tick(60_000, 100, 1));
    agg.processTick(tick(60_000 + 10_000, 105, 2));
    agg.processTick(tick(60_000 + 20_000, 95, 3));
    agg.processTick(tick(60_000 + 30_000, 102, 4));

    const bar = agg.getCurrentBar()!;
    expect(bar.open).toBe(100);
    expect(bar.high).toBe(105);
    expect(bar.low).toBe(95);
    expect(bar.close).toBe(102);
    expect(bar.volume).toBe(10);
    expect(bar.tickCount).toBe(4);
  });

  it('emits "barClose" for the prior bar and starts a fresh one when the boundary is crossed', () => {
    const agg = new TickAggregator('1m');
    const onBar = vi.fn();
    const onBarClose = vi.fn();
    agg.on('bar', onBar);
    agg.on('barClose', onBarClose);

    agg.processTick(tick(60_000, 100, 1));
    agg.processTick(tick(60_000 + 30_000, 105, 2));
    agg.processTick(tick(120_000, 110, 1)); // crosses into next minute

    expect(onBarClose).toHaveBeenCalledTimes(1);
    const closed = onBarClose.mock.calls[0][0];
    expect(closed.time).toBe(60_000);
    expect(closed.closed).toBe(true);
    expect(closed.high).toBe(105);

    const current = agg.getCurrentBar()!;
    expect(current.time).toBe(120_000);
    expect(current.open).toBe(110);
    expect(current.tickCount).toBe(1);
    expect(onBar).toHaveBeenCalledTimes(3);
  });

  it('emits "bar" on every processed tick', () => {
    const agg = new TickAggregator('1m');
    const onBar = vi.fn();
    agg.on('bar', onBar);
    agg.processTick(tick(60_000, 100, 1));
    agg.processTick(tick(60_000 + 5000, 101, 1));
    agg.processTick(tick(60_000 + 10_000, 102, 1));
    expect(onBar).toHaveBeenCalledTimes(3);
  });
});

describe('TickAggregator.processBar', () => {
  it('emits "bar" for a forming bar without resetting current state to null', () => {
    const agg = new TickAggregator('1m');
    const onBar = vi.fn();
    agg.on('bar', onBar);

    agg.processBar(
      { time: 60_000, open: 100, high: 102, low: 99, close: 101, volume: 5 },
      false,
    );

    expect(onBar).toHaveBeenCalledTimes(1);
    expect(agg.getCurrentBar()?.closed).toBe(false);
    expect(agg.getCurrentBar()?.time).toBe(60_000);
  });

  it('emits "barClose" and clears current bar when closed=true matches the forming bar', () => {
    const agg = new TickAggregator('1m');
    const onBarClose = vi.fn();
    agg.on('barClose', onBarClose);

    agg.processBar(
      { time: 60_000, open: 100, high: 102, low: 99, close: 101, volume: 5 },
      false,
    );
    agg.processBar(
      { time: 60_000, open: 100, high: 103, low: 99, close: 103, volume: 8 },
      true,
    );

    expect(onBarClose).toHaveBeenCalledTimes(1);
    expect(onBarClose.mock.calls[0][0].close).toBe(103);
    expect(agg.getCurrentBar()).toBeNull();
  });

  it('emits "barClose" directly for a closed bar arriving with no prior forming bar', () => {
    const agg = new TickAggregator('1m');
    const onBarClose = vi.fn();
    agg.on('barClose', onBarClose);

    agg.processBar(
      { time: 60_000, open: 100, high: 105, low: 99, close: 104, volume: 12 },
      true,
    );

    expect(onBarClose).toHaveBeenCalledTimes(1);
    expect(onBarClose.mock.calls[0][0].tickCount).toBe(1);
    expect(agg.getCurrentBar()).toBeNull();
  });
});

describe('TickAggregator buffering and lifecycle', () => {
  it('returns ticks in insertion order via getTickBuffer', () => {
    const agg = new TickAggregator('1m', 5);
    for (let i = 0; i < 4; i++) agg.processTick(tick(i * 1000, 100 + i));
    const buf = agg.getTickBuffer();
    expect(buf.map((t) => t.price)).toEqual([100, 101, 102, 103]);
  });

  it('drops the oldest tick when the ring buffer overflows (FIFO eviction)', () => {
    const agg = new TickAggregator('1m', 3);
    for (let i = 0; i < 5; i++) agg.processTick(tick(i * 1000, 100 + i));
    const buf = agg.getTickBuffer();
    expect(buf).toHaveLength(3);
    // After overflow, oldest two are evicted; remaining prices are 102, 103, 104.
    expect(buf.map((t) => t.price)).toEqual([102, 103, 104]);
  });

  it('reset() clears current bar and tick buffer', () => {
    const agg = new TickAggregator('1m', 5);
    agg.processTick(tick(60_000, 100, 1));
    agg.processTick(tick(60_000 + 1000, 101, 1));
    agg.reset();
    expect(agg.getCurrentBar()).toBeNull();
    expect(agg.getTickBuffer()).toEqual([]);
  });

  it('setTimeframe re-aligns subsequent bars and clears state', () => {
    const agg = new TickAggregator('1m');
    agg.processTick(tick(60_000 + 30_000, 100, 1));
    expect(agg.getCurrentBar()?.time).toBe(60_000);

    agg.setTimeframe('5m');
    agg.processTick(tick(60_000 + 30_000, 100, 1));
    // 1.5 min aligned to a 5-min boundary is t=0.
    expect(agg.getCurrentBar()?.time).toBe(0);
  });

  it('getCurrentBar returns a defensive copy, not a live reference', () => {
    const agg = new TickAggregator('1m');
    agg.processTick(tick(60_000, 100, 1));
    const snap = agg.getCurrentBar()!;
    snap.close = 999;
    expect(agg.getCurrentBar()?.close).toBe(100);
  });

  it('aligns bar buckets to the timeframe (5m)', () => {
    const agg = new TickAggregator('5m');
    agg.processTick(tick(7 * MIN + 30_000, 100, 1)); // 7m30s → 5-min bucket = 5m
    expect(agg.getCurrentBar()?.time).toBe(5 * MIN);

    agg.processTick(tick(11 * MIN, 110, 1)); // crosses into 10m bucket
    expect(agg.getCurrentBar()?.time).toBe(10 * MIN);
  });
});

describe('TickAggregator on the calendar', () => {
  // Friday 23 October 2026, 09:15 in Ho Chi Minh City (UTC+7).
  const friday = Date.UTC(2026, 9, 23, 2, 15);

  it('starts weeks on Monday and months on the 1st', () => {
    const week = new TickAggregator('1w');
    week.processTick(tick(friday, 100));
    expect(week.getCurrentBar()?.time).toBe(Date.UTC(2026, 9, 19));
    const month = new TickAggregator('1M');
    month.processTick(tick(friday, 100));
    expect(month.getCurrentBar()?.time).toBe(Date.UTC(2026, 9, 1));
  });

  it('starts days and 4h bars at the exchange’s midnight once it knows the zone', () => {
    const day = new TickAggregator('1d');
    day.setTimeZone('Asia/Ho_Chi_Minh');
    day.processTick(tick(friday, 100));
    expect(day.getCurrentBar()?.time).toBe(Date.UTC(2026, 9, 22, 17));
    const four = new TickAggregator('4h');
    four.setTimeZone('Asia/Ho_Chi_Minh');
    four.processTick(tick(friday, 100));
    expect(four.getCurrentBar()?.time).toBe(Date.UTC(2026, 9, 23, 1));
  });

  it('stamps days by their date there for a feed that stamps its daily bars at 00:00 UTC', () => {
    const day = new TickAggregator('1d');
    day.setTimeZone('America/New_York', true);
    // 20:30 on Friday 23 October in New York is already Saturday in UTC.
    day.processTick(tick(Date.UTC(2026, 9, 24, 0, 30), 100));
    expect(day.getCurrentBar()?.time).toBe(Date.UTC(2026, 9, 23));
  });

  it('keeps hours and minutes on the epoch floor', () => {
    const hour = new TickAggregator('1h');
    hour.setTimeZone('Asia/Kolkata', true);
    hour.processTick(tick(friday, 100));
    expect(hour.getCurrentBar()?.time).toBe(Date.UTC(2026, 9, 23, 2));
  });
});

describe('TickAggregator: bars and trades older than the newest', () => {
  const T0 = Date.UTC(2026, 0, 5);
  const at = (minute: number, close = 100, volume = 10) =>
    ({ time: T0 + minute * MIN, open: 100, high: Math.max(100, close) + 1, low: Math.min(100, close) - 1, close, volume });

  /** An aggregator with what it emits, by event. */
  function watched(timeframe: '1m' | '5m' = '1m') {
    const agg = new TickAggregator(timeframe);
    const seen = { bar: [] as unknown[], barClose: [] as unknown[], correction: [] as unknown[] };
    agg.on('bar', (b) => seen.bar.push({ ...b }));
    agg.on('barClose', (b) => seen.barClose.push({ ...b }));
    agg.on('correction', (b) => seen.correction.push({ ...b }));
    return { agg, seen };
  }

  it('processBar: a closed bar older than the newest is a correction and keeps the forming bar', () => {
    const { agg, seen } = watched();
    agg.processTick(tick(T0 + 2 * MIN + 1000, 101, 5));
    agg.processTick(tick(T0 + 2 * MIN + 2000, 104, 5));
    agg.processBar(at(1, 97, 6), true); // the venue's final for the bar before
    expect(seen.correction).toEqual([at(1, 97, 6)]);
    expect(seen.barClose).toEqual([]);
    agg.processTick(tick(T0 + 2 * MIN + 3000, 102, 1));
    expect(agg.getCurrentBar()).toMatchObject({ time: T0 + 2 * MIN, open: 101, high: 104, low: 101, close: 102, volume: 11 });
  });

  it('processBar: an older forming frame emits nothing and leaves the forming bar alone', () => {
    const { agg, seen } = watched();
    agg.processBar(at(2, 101), false);
    agg.processBar(at(1, 90), false);
    expect(seen.bar).toHaveLength(1);
    expect(seen.correction).toEqual([]);
    expect(agg.getCurrentBar()).toMatchObject({ time: T0 + 2 * MIN, close: 101 });
  });

  it("seed() makes the history's last bar the newest", () => {
    const { agg, seen } = watched();
    agg.seed(T0 + 5 * MIN);
    agg.processBar(at(4, 99), false);
    agg.processBar(at(4, 98), true);
    expect(seen.bar).toEqual([]);
    expect(seen.correction).toEqual([at(4, 98)]);
    agg.processBar(at(5, 101), false);
    expect(seen.bar).toHaveLength(1);
  });

  it('seed() reads a history in seconds by its size', () => {
    const { agg, seen } = watched();
    agg.seed((T0 + 5 * MIN) / 1000);
    agg.processBar(at(4, 98), true);
    expect(seen.correction).toHaveLength(1);
  });

  it('a late trade for an older bar is left out: the forming bar is neither closed nor restarted', () => {
    const { agg, seen } = watched();
    agg.processTick(tick(T0 + 2 * MIN + 1000, 101, 5));
    agg.processTick(tick(T0 + 2 * MIN + 2000, 104, 5));
    agg.processTick(tick(T0 + 2 * MIN - 1000, 99, 1)); // a trade of the bar before, delivered late
    agg.processTick(tick(T0 + 2 * MIN + 3000, 102, 1));
    expect(seen.barClose).toEqual([]);
    expect(agg.getCurrentBar()).toMatchObject({ time: T0 + 2 * MIN, open: 101, high: 104, low: 101, close: 102, volume: 11, tickCount: 3 });
  });

  it('a trade older than a closed bar from the feed is left out too', () => {
    const { agg, seen } = watched();
    agg.processBar(at(3, 101), true);
    agg.processTick(tick(T0 + 2 * MIN + 1000, 99, 1));
    expect(seen.bar).toEqual([]);
    expect(agg.getCurrentBar()).toBeNull();
  });

  it("resume(): the history's forming bar is the one trades go on building", () => {
    const { agg, seen } = watched();
    agg.resume({ time: T0 + 40 * MIN, open: 100, high: 110, low: 95, close: 105, volume: 50 });
    agg.processTick(tick(T0 + 40 * MIN + 30_000, 104, 1));
    expect(seen.bar.at(-1)).toMatchObject({ time: T0 + 40 * MIN, open: 100, high: 110, low: 95, close: 104, volume: 51, closed: false });
    // The next bar's first trade closes it with all it held.
    agg.processTick(tick(T0 + 41 * MIN + 1000, 103, 2));
    expect(seen.barClose).toEqual([expect.objectContaining({ time: T0 + 40 * MIN, open: 100, high: 110, low: 95, close: 104, volume: 51, closed: true })]);
  });

  it('resume() takes a history in seconds and one without volume', () => {
    const { agg } = watched();
    agg.resume({ time: (T0 + 40 * MIN) / 1000, open: 100, high: 110, low: 95, close: 105 } as never);
    agg.processTick(tick(T0 + 40 * MIN + 30_000, 104, 1));
    expect(agg.getCurrentBar()).toMatchObject({ time: T0 + 40 * MIN, open: 100, volume: 1 });
  });

  it('reset() and setTimeframe() forget the newest', () => {
    const { agg, seen } = watched();
    agg.seed(T0 + 5 * MIN);
    agg.reset();
    agg.processBar(at(4, 99), false);
    expect(seen.bar).toHaveLength(1);
    agg.seed(T0 + 5 * MIN);
    agg.setTimeframe('5m');
    agg.processBar(at(0, 99), false);
    expect(seen.bar).toHaveLength(2);
  });
});
