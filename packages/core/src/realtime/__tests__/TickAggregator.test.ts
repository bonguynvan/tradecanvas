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
