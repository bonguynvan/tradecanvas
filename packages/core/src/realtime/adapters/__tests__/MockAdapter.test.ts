import { describe, it, expect, vi, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { MockAdapter } from '../MockAdapter.js';

const FIVE_MINUTES = 5 * 60_000;

afterEach(() => {
  vi.useRealTimers();
});

describe('MockAdapter', () => {
  it('ends its history on the timeframe’s grid, so the first ticks build its newest bar', async () => {
    vi.useFakeTimers();
    // Two minutes and 42 seconds into a five-minute bar.
    vi.setSystemTime(new Date('2026-10-24T08:26:42Z'));
    const adapter = new MockAdapter({ tickInterval: 400, historySize: 10 });
    const history = await adapter.fetchHistory('BTCUSDT', '5m');
    const newest = history[history.length - 1];
    expect(newest.time % FIVE_MINUTES).toBe(0);
    expect(newest.time).toBe(Date.parse('2026-10-24T08:25:00Z'));
    expect(history[history.length - 2].time).toBe(newest.time - FIVE_MINUTES);

    const bars: OHLCBar[] = [];
    adapter.on('bar', (e) => bars.push((e.data as { bar: OHLCBar }).bar));
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '5m' });
    vi.advanceTimersByTime(400);
    adapter.disconnect();
    // The tick's bar is the newest bar, carried on from its close: not one before it.
    expect(bars).toHaveLength(1);
    expect(bars[0].time).toBe(newest.time);
    expect(bars[0].open).toBe(newest.open);
  });

  it('grows the forming bar tick by tick, and opens the next at the last close when its time comes', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T08:29:58Z'));
    const adapter = new MockAdapter({ tickInterval: 1000, historySize: 10 });
    await adapter.fetchHistory('BTCUSDT', '5m');
    const bars: OHLCBar[] = [];
    adapter.on('bar', (e) => bars.push((e.data as { bar: OHLCBar }).bar));
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '5m' });
    vi.advanceTimersByTime(3000); // 08:29:59, 08:30:00 and 08:30:01
    adapter.disconnect();
    const [first, second, third] = bars;
    expect(first.time).toBe(Date.parse('2026-10-24T08:25:00Z'));
    expect(second.time).toBe(Date.parse('2026-10-24T08:30:00Z'));
    expect(second.open).toBe(first.close);
    expect(third.time).toBe(second.time);
    expect(third.open).toBe(second.open);
    expect(third.high).toBeGreaterThanOrEqual(second.high);
    expect(third.low).toBeLessThanOrEqual(second.low);
    expect(third.volume).toBeGreaterThan(second.volume);
  });
});
