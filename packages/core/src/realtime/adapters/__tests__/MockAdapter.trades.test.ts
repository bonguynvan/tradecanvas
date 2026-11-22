import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { OHLCBar, Trade } from '@tradecanvas/commons';
import { MockAdapter } from '../MockAdapter.js';

const MIN = 60_000;
const NOW = Date.UTC(2025, 0, 6, 12, 0, 30);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const sum = (trades: readonly Trade[], side?: Trade['side']): number =>
  trades.reduce((total, t) => total + (side === undefined || t.side === side ? t.volume : 0), 0);

describe('MockAdapter: trades that tell the bars’ own story', () => {
  it('gives recent trades inside the bars it gave, adding up to their volume and their split', async () => {
    const adapter = new MockAdapter({ historySize: 60 });
    const bars = await adapter.fetchHistory('BTCUSDT', '1m');
    const trades = await adapter.fetchTrades('BTCUSDT', 1000);
    expect(trades.length).toBeGreaterThan(200);
    expect(trades.length).toBeLessThan(1000);
    // Oldest first, none after now.
    for (let i = 1; i < trades.length; i++) expect(trades[i].time).toBeGreaterThanOrEqual(trades[i - 1].time);
    expect(trades.at(-1)!.time).toBeLessThanOrEqual(NOW);
    const byBar = new Map<number, Trade[]>();
    for (const t of trades) {
      const time = Math.floor(t.time / MIN) * MIN;
      byBar.set(time, [...(byBar.get(time) ?? []), t]);
    }
    // Whole bars only: the newest ones.
    expect([...byBar.keys()]).toEqual(bars.slice(-byBar.size).map((bar) => bar.time));
    for (const bar of bars.slice(-byBar.size)) {
      const of = byBar.get(bar.time)!;
      for (const t of of) {
        expect(t.price).toBeGreaterThanOrEqual(bar.low - 1e-9);
        expect(t.price).toBeLessThanOrEqual(bar.high + 1e-9);
        expect(t.side === 'buy' || t.side === 'sell').toBe(true);
      }
      expect(sum(of)).toBeCloseTo(bar.volume, 6);
      expect(sum(of, 'buy')).toBeCloseTo(bar.buyVolume!, 6);
    }
  });

  it('draws no random number for them', async () => {
    const adapter = new MockAdapter({ historySize: 60 });
    await adapter.fetchHistory('BTCUSDT', '1m');
    const random = vi.spyOn(Math, 'random');
    await adapter.fetchTrades('BTCUSDT', 1000);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it('gives its own walk of trades to a symbol it gave no bars for, and when it is asked for trades alone', async () => {
    const adapter = new MockAdapter({ historySize: 60 });
    const alone = await adapter.fetchTrades('BTCUSDT', 500);
    expect(alone).toHaveLength(500);
    await adapter.fetchHistory('BTCUSDT', '1m');
    expect(await adapter.fetchTrades('ETHUSDT', 300)).toHaveLength(300);
    // Disconnected (as a tick chart leaves it): the bars it gave are of a series no longer shown.
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
    adapter.disconnect();
    expect(await adapter.fetchTrades('BTCUSDT', 500)).toHaveLength(500);
  });

  it('sends the live trades its bar’s ticks are made of: at its prices, adding up to what the bar gained', async () => {
    const adapter = new MockAdapter({ historySize: 30, tickInterval: 500 });
    const history = await adapter.fetchHistory('BTCUSDT', '1m');
    const formingBefore = history.at(-1)!;
    const forming: OHLCBar[] = [];
    adapter.on<{ bar: OHLCBar }>('bar', (event) => forming.push(event.data.bar));
    const live: Trade[] = [];
    const stop = adapter.subscribeTrades('BTCUSDT', (trades) => live.push(...trades));
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
    vi.advanceTimersByTime(5000);
    expect(forming.length).toBeGreaterThanOrEqual(9);
    expect(live.length).toBeGreaterThanOrEqual(forming.length);
    const bar = forming.at(-1)!;
    expect(bar.time).toBe(formingBefore.time);
    for (const t of live) {
      expect(t.price).toBeGreaterThanOrEqual(bar.low - 1e-9);
      expect(t.price).toBeLessThanOrEqual(bar.high + 1e-9);
    }
    expect(sum(live)).toBeCloseTo(bar.volume - formingBefore.volume, 6);
    expect(sum(live, 'buy')).toBeCloseTo(bar.buyVolume! - formingBefore.buyVolume!, 6);
    // No longer listening: no more trades.
    stop();
    const had = live.length;
    vi.advanceTimersByTime(3000);
    expect(live).toHaveLength(had);
    adapter.dispose();
  });

  it('sends a walk of its own while no bars tick, as a tick chart needs', () => {
    const adapter = new MockAdapter({ tickInterval: 500 });
    const live: Trade[] = [];
    const stop = adapter.subscribeTrades('BTCUSDT', (trades) => live.push(...trades));
    vi.advanceTimersByTime(2000);
    expect(live.length).toBe(12);
    stop();
  });
});
