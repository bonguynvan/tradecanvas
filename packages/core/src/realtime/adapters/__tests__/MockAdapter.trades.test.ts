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

describe('MockAdapter: what the review turned up', () => {
  it('tells a bar in two trades at the least, so both sides of it are there, however few are asked for', async () => {
    const adapter = new MockAdapter({ historySize: 20 });
    const bars = await adapter.fetchHistory('BTCUSDT', '1m');
    const last = bars.at(-1)!;
    for (const limit of [2, 3, 5]) {
      const trades = await adapter.fetchTrades('BTCUSDT', limit);
      expect(trades.length, String(limit)).toBeLessThanOrEqual(Math.max(2, limit));
      const of = trades.filter((t) => t.time >= last.time);
      expect(sum(of), String(limit)).toBeCloseTo(last.volume, 6);
      expect(sum(of, 'buy'), String(limit)).toBeCloseTo(last.buyVolume!, 6);
    }
  });

  it('keeps each symbol’s bars apart: another symbol’s history does not take the first one’s trades away', async () => {
    const adapter = new MockAdapter({ historySize: 30 });
    const bars = await adapter.fetchHistory('BTCUSDT', '1m');
    await adapter.fetchHistory('ETHUSDT', '1m');
    const trades = await adapter.fetchTrades('BTCUSDT', 1000);
    const last = bars.at(-1)!;
    const of = trades.filter((t) => t.time >= last.time);
    expect(sum(of)).toBeCloseTo(last.volume, 6);
    for (const t of of) {
      expect(t.price).toBeGreaterThanOrEqual(last.low - 1e-9);
      expect(t.price).toBeLessThanOrEqual(last.high + 1e-9);
    }
  });

  it('tells the trades of the timeframe it streams, though another of the symbol was asked for since', async () => {
    const adapter = new MockAdapter({ historySize: 30, tickInterval: 60_000 });
    const minutes = await adapter.fetchHistory('BTCUSDT', '1m');
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
    await adapter.fetchHistory('BTCUSDT', '1h');
    const trades = await adapter.fetchTrades('BTCUSDT', 1000);
    // A minute's bars: many of them in the last half hour, not one hour's bar.
    const spanned = new Set(trades.map((t) => Math.floor(t.time / MIN)));
    expect(spanned.size).toBeGreaterThan(10);
    expect(Math.min(...trades.map((t) => t.time))).toBeGreaterThanOrEqual(minutes.at(-25)!.time);
    adapter.dispose();
  });

  it('says nothing of who took a live bar’s trades when the bar it carries on did not say', async () => {
    const plain = (_symbol: string, _tf: unknown, limit: number): OHLCBar[] =>
      Array.from({ length: limit }, (_, i) => ({ time: Math.floor(NOW / MIN) * MIN - (limit - 1 - i) * MIN, open: 100, high: 101, low: 99, close: 100, volume: 500 }));
    const adapter = new MockAdapter({ historySize: 5, tickInterval: 500, historyGenerator: plain });
    await adapter.fetchHistory('BTCUSDT', '1m');
    const forming: OHLCBar[] = [];
    adapter.on<{ bar: OHLCBar }>('bar', (event) => forming.push(event.data.bar));
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
    vi.advanceTimersByTime(2000);
    expect(forming.length).toBeGreaterThan(2);
    // The bar had 500 traded with no word of who took it: a count from here on would be of part of it.
    expect(forming.at(-1)).not.toHaveProperty('buyVolume');
    // A bar that opens under the ticks is counted from its first.
    vi.advanceTimersByTime(60_000);
    expect(typeof forming.at(-1)!.buyVolume).toBe('number');
    expect(forming.at(-1)!.buyVolume!).toBeLessThanOrEqual(forming.at(-1)!.volume);
    adapter.dispose();
  });
});

describe('MockAdapter: trades asked for once it streams', () => {
  it('still tells its bars’ trades after the stream let go of it and took it up again, as one does between loading and starting', async () => {
    const adapter = new MockAdapter({ historySize: 60, tickInterval: 60_000 });
    const bars = await adapter.fetchHistory('BTCUSDT', '1m');
    // What a stream does once the history is in: out of whatever it was in, then into the new series.
    adapter.disconnect();
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
    const trades = await adapter.fetchTrades('BTCUSDT', 1000);
    const last = bars.at(-1)!;
    const of = trades.filter((t) => t.time >= last.time);
    expect(of.length).toBeGreaterThan(10);
    expect(sum(of)).toBeCloseTo(last.volume, 6);
    for (const t of of) {
      expect(t.price).toBeGreaterThanOrEqual(last.low - 1e-9);
      expect(t.price).toBeLessThanOrEqual(last.high + 1e-9);
    }
    adapter.dispose();
  });

  it('tells its bars’ trades in whole sizes, as its ticks are, adding up to each bar to the unit', async () => {
    const adapter = new MockAdapter({ historySize: 60 });
    const bars = await adapter.fetchHistory('BTCUSDT', '1m');
    const trades = await adapter.fetchTrades('BTCUSDT', 1000);
    expect(trades.every((t) => Number.isInteger(t.volume) && t.volume > 0)).toBe(true);
    const last = bars.at(-1)!;
    const of = trades.filter((t) => t.time >= last.time);
    expect(sum(of)).toBe(last.volume);
    expect(sum(of, 'buy')).toBe(last.buyVolume);
  });
});
