import { describe, it, expect, vi, afterEach } from 'vitest';
import { tickBarCount, type DataAdapter, type Trade } from '@tradecanvas/commons';
import { TickBarBuilder, withTickBars } from '../TickBars.js';
import { servesTimeframe } from '../adapters/ResamplingAdapter.js';
import { StreamManager } from '../StreamManager.js';
import { MockAdapter } from '../adapters/MockAdapter.js';
import { BinanceAdapter } from '../adapters/BinanceAdapter.js';

const trade = (time: number, price: number, volume = 1): Trade => ({ time, price, volume });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('tickBarCount', () => {
  it('reads a tick timeframe, and nothing else', () => {
    expect(tickBarCount('100T')).toBe(100);
    expect(tickBarCount('1T')).toBe(1);
    for (const tf of ['0T', '100t', 'T', '1m', '1.5T', '2000000T']) expect(tickBarCount(tf), tf).toBeNull();
  });
});

describe('TickBarBuilder', () => {
  it('closes a bar every N trades, stamped with its first trade', () => {
    const builder = new TickBarBuilder(2);
    const out = builder.push([trade(1, 10, 2), trade(2, 12), trade(3, 9), trade(4, 11, 3), trade(5, 15)]);
    expect(out).toEqual([
      { bar: { time: 1, open: 10, high: 12, low: 10, close: 12, volume: 3 }, closed: true },
      { bar: { time: 3, open: 9, high: 11, low: 9, close: 11, volume: 4 }, closed: true },
      { bar: { time: 5, open: 15, high: 15, low: 15, close: 15, volume: 1 }, closed: false },
    ]);
    expect(builder.push([trade(6, 14)])).toEqual([{ bar: { time: 5, open: 15, high: 15, low: 14, close: 14, volume: 2 }, closed: true }]);
  });

  it('builds history bars, then carries on the bar left forming', () => {
    const builder = new TickBarBuilder(3);
    const bars = builder.build([trade(1, 10), trade(2, 11), trade(3, 12), trade(4, 13)]);
    expect(bars.map((b) => b.time)).toEqual([1, 4]);
    expect(builder.push([trade(5, 14), trade(6, 9)])).toEqual([{ bar: { time: 4, open: 13, high: 14, low: 9, close: 9, volume: 3 }, closed: true }]);
  });
});

/** An adapter with trades: history from a list, live trades sent by the test. */
function tradesAdapter() {
  let send: (t: Trade[]) => void = () => {};
  const stop = vi.fn();
  const inner = {
    name: 'trades',
    connect: vi.fn(),
    disconnect: vi.fn(),
    getConnectionState: () => 'connected',
    fetchHistory: vi.fn(async () => [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }]),
    on: vi.fn(),
    off: vi.fn(),
    fetchTrades: vi.fn(async () => [trade(10, 100), trade(11, 101), trade(12, 102)]),
    subscribeTrades: vi.fn((_symbol: string, onTrades: (t: Trade[]) => void) => {
      send = onTrades;
      return stop;
    }),
  } as unknown as DataAdapter;
  return { inner, send: (t: Trade[]) => send(t), stop };
}

describe('withTickBars', () => {
  it('serves tick timeframes from trades: history, then live bars', async () => {
    const { inner, send, stop } = tradesAdapter();
    const adapter = withTickBars(inner);
    const bars = await adapter.fetchHistory('X', '2T', 10);
    expect(bars.map((b) => [b.time, b.close])).toEqual([[10, 101], [12, 102]]);

    const events: { bar: { time: number; close: number }; closed: boolean }[] = [];
    adapter.on('bar', (e) => events.push(e.data as never));
    adapter.connect({ symbol: 'X', timeframe: '2T' });
    expect(inner.connect).not.toHaveBeenCalled();
    send([trade(11, 99), trade(13, 103), trade(14, 104)]); // the first one is older than history: dropped
    expect(events.map((e) => [e.bar.time, e.bar.close, e.closed])).toEqual([[12, 103, true], [14, 104, false]]);
    adapter.disconnect();
    expect(stop).toHaveBeenCalled();
  });

  it('hands time timeframes to the feed', async () => {
    const { inner } = tradesAdapter();
    const adapter = withTickBars(inner);
    await adapter.fetchHistory('X', '1m', 10);
    adapter.connect({ symbol: 'X', timeframe: '1m' });
    expect(inner.fetchHistory).toHaveBeenCalledWith('X', '1m', 10);
    expect(inner.connect).toHaveBeenCalledWith({ symbol: 'X', timeframe: '1m' });
  });

  it('serves ticks only for a feed with trades', () => {
    expect(servesTimeframe(tradesAdapter().inner, '100T')).toBe(true);
    expect(servesTimeframe({ name: 'bars' } as DataAdapter, '100T')).toBe(false);
    expect(servesTimeframe({ name: 'bars' } as DataAdapter, '1m')).toBe(true);
  });

  it('streams tick bars end to end from the mock adapter', async () => {
    const manager = new StreamManager();
    const snapshots: unknown[][] = [];
    manager.on('snapshot', (bars) => snapshots.push(bars as unknown[]));
    await manager.connect({ adapter: new MockAdapter({ basePrice: 50 }), symbol: 'AAA', timeframe: '5T' });
    expect(snapshots[0].length).toBeGreaterThan(10);
    manager.dispose();
  });
});

describe('Binance trades', () => {
  it('reads recent trades and the trade stream', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('aggTrades') ? [{ a: 1, p: '100.5', q: '0.2', T: 1000 }, { a: 2, p: 'x', q: '1', T: 1001 }] : []),
    })));
    const adapter = new BinanceAdapter({ restBase: 'https://rest', wsBase: 'wss://ws/ws' });
    expect(await adapter.fetchTrades('btcusdt', 500)).toEqual([{ time: 1000, price: 100.5, volume: 0.2 }]);

    const sockets: { url: string; onmessage: ((e: { data: string }) => void) | null; close: () => void }[] = [];
    vi.stubGlobal('WebSocket', class {
      onmessage: ((e: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      constructor(public url: string) { sockets.push(this as never); }
      close() {}
    });
    const got: Trade[] = [];
    const stop = adapter.subscribeTrades('BTCUSDT', (t) => got.push(...t));
    expect(sockets[0].url).toBe('wss://ws/ws/btcusdt@aggTrade');
    sockets[0].onmessage?.({ data: JSON.stringify({ e: 'aggTrade', p: '101', q: '0.5', T: 2000 }) });
    expect(got).toEqual([{ time: 2000, price: 101, volume: 0.5 }]);
    stop();
  });
});
