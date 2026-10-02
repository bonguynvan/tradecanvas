import { describe, it, expect, vi } from 'vitest';
import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  OHLCBar,
  TimeFrame,
} from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';
import { ResamplingAdapter, withResampling } from '../ResamplingAdapter.js';

const MIN = 60_000;

const bar = (time: number, open: number, high: number, low: number, close: number, volume = 1): OHLCBar =>
  ({ time, open, high, low, close, volume });

/** The feed's history runs from minute 3 (off a 7-minute boundary) to minute 10000. */
const START = 3 * MIN;
const END = 10_000 * MIN;

/**
 * The last `limit` bars of `tf` before `before`: open = the bar's first
 * minute, close = its last minute, volume = its minutes.
 */
function barsBefore(tf: TimeFrame, before: number, limit: number): OHLCBar[] {
  const step = timeframeToMs(tf);
  const out: OHLCBar[] = [];
  for (let t = Math.ceil(before / step) * step - step; t >= START && out.length < limit; t -= step) {
    const m = t / MIN;
    const last = m + step / MIN - 1;
    out.push(bar(t, m, last + 0.5, m - 0.5, last, step / MIN));
  }
  return out.reverse();
}

/** A feed that only knows 1m and 5m. */
class FakeFeed implements DataAdapter {
  readonly name = 'fake';
  readonly supportedTimeframes: TimeFrame[] = ['1m', '5m'];
  connected: DataAdapterConfig | null = null;
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  fetchHistory = vi.fn(async (_s: string, tf: TimeFrame, limit = 500) => barsBefore(tf, END, limit));
  fetchHistoryBefore = vi.fn(async (_s: string, tf: TimeFrame, before: number, limit: number) =>
    barsBefore(tf, before, limit));
  connect(config: DataAdapterConfig) { this.connected = config; }
  disconnect() { this.connected = null; }
  getConnectionState() { return this.connected ? 'connected' as const : 'disconnected' as const; }
  on<T>(event: DataAdapterEventType, listener: DataAdapterListener<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as DataAdapterListener);
  }
  off<T>(event: DataAdapterEventType, listener: DataAdapterListener<T>) {
    this.listeners.get(event)?.delete(listener as DataAdapterListener);
  }
  dispose() { this.listeners.clear(); }
  emit(type: DataAdapterEventType, data: unknown) {
    for (const l of this.listeners.get(type) ?? []) l({ type, data, timestamp: 0 });
  }
}

function setup() {
  const feed = new FakeFeed();
  const adapter = new ResamplingAdapter(feed, feed.supportedTimeframes);
  const bars: { bar: OHLCBar; closed: boolean }[] = [];
  adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => bars.push(e.data));
  return { feed, adapter, bars };
}

describe('withResampling', () => {
  it('leaves an adapter that does not list its timeframes alone', () => {
    const plain = { ...new FakeFeed(), supportedTimeframes: undefined } as unknown as DataAdapter;
    expect(withResampling(plain)).toBe(plain);
  });

  it('wraps an adapter once', () => {
    const feed = new FakeFeed();
    const wrapped = withResampling(feed);
    expect(wrapped).toBeInstanceOf(ResamplingAdapter);
    expect(withResampling(feed)).toBe(wrapped);
    expect(withResampling(wrapped)).toBe(wrapped);
  });
});

describe('ResamplingAdapter history', () => {
  it('passes a timeframe the feed has straight through', async () => {
    const { feed, adapter } = setup();
    await adapter.fetchHistory('X', '5m', 10);
    expect(feed.fetchHistory).toHaveBeenCalledWith('X', '5m', 10);
  });

  it('builds a timeframe the feed lacks from the closest one it has', async () => {
    const { feed, adapter } = setup();
    const out = await adapter.fetchHistory('X', '10m', 20);
    expect(feed.fetchHistory.mock.calls[0][1]).toBe('5m');
    expect(out).toHaveLength(20);
    expect(out.every((b) => b.time % (10 * MIN) === 0)).toBe(true);
  });

  it('pages back through the feed when one request holds too few base bars', async () => {
    const { feed, adapter } = setup();
    const out = await adapter.fetchHistory('X', '7m', 200); // ~1400 one-minute bars
    expect(feed.fetchHistory).toHaveBeenCalledWith('X', '1m', 1000);
    expect(feed.fetchHistoryBefore).toHaveBeenCalled();
    expect(out).toHaveLength(200);
    // 7-minute buckets, newest last, the last one ending at minute 1000.
    // The newest bucket is still forming: minutes 9996–9999.
    expect(out[199]).toMatchObject({ time: 9996 * MIN, open: 9996, close: 9999, high: 9999.5, low: 9995.5, volume: 4 });
    expect(out[198]).toMatchObject({ time: 9989 * MIN, open: 9989, close: 9995, volume: 7 });
  });

  it('drops a bucket the history starts in the middle of', async () => {
    const { adapter } = setup();
    const out = await adapter.fetchHistory('X', '7m', 2000);
    // Minutes 3–6 are only part of the first 7-minute bucket.
    expect(out[0]).toMatchObject({ time: 7 * MIN, open: 7, close: 13, volume: 7 });
    expect(out).toHaveLength((9996 - 7) / 7 + 1);
  });

  it('stops paging when the feed returns nothing older', async () => {
    const { feed, adapter } = setup();
    feed.fetchHistoryBefore.mockImplementation(async () => feed.fetchHistory.mock.results[0].value);
    const out = await adapter.fetchHistory('X', '7m', 200);
    expect(feed.fetchHistoryBefore).toHaveBeenCalledTimes(1);
    expect(out.length).toBeLessThan(200);
  });

  it('pages older resampled bars before a bucket start', async () => {
    const { adapter } = setup();
    const out = await adapter.fetchHistoryBefore!('X', '7m', 700 * MIN, 10);
    expect(out).toHaveLength(10);
    expect(out[9]).toMatchObject({ time: 693 * MIN, open: 693, close: 699, volume: 7 });
    expect(out[0].time).toBe(630 * MIN);
  });
});

describe('ResamplingAdapter live bars', () => {
  it('subscribes to the base timeframe and merges its bars into the target bucket', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    expect(feed.connected?.timeframe).toBe('1m');

    feed.emit('bar', { bar: bar(7 * MIN, 10, 11, 9, 10.5, 2), closed: false });
    feed.emit('bar', { bar: bar(7 * MIN, 10, 12, 9, 11, 3), closed: true });
    feed.emit('bar', { bar: bar(8 * MIN, 11, 11.5, 8, 9, 1), closed: false });
    expect(bars.at(-1)).toEqual({ bar: bar(7 * MIN, 10, 12, 8, 9, 4), closed: false });
  });

  it('closes the bucket with its last base bar', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(7 * MIN, 10, 11, 9, 10, 1), closed: true });
    feed.emit('bar', { bar: bar(13 * MIN, 10, 13, 10, 12, 1), closed: true });
    expect(bars.at(-1)).toEqual({ bar: bar(7 * MIN, 10, 13, 9, 12, 2), closed: true });

    feed.emit('bar', { bar: bar(14 * MIN, 12, 12, 11, 11, 5), closed: false });
    expect(bars.at(-1)).toEqual({ bar: bar(14 * MIN, 12, 12, 11, 11, 5), closed: false });
  });

  it('closes a bucket whose last base bar never came as closed', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(12 * MIN, 10, 11, 9, 10, 1), closed: false });
    feed.emit('bar', { bar: bar(14 * MIN, 10, 10, 10, 10, 1), closed: false });
    expect(bars).toContainEqual({ bar: bar(7 * MIN, 10, 11, 9, 10, 1), closed: true });
    expect(bars.at(-1)?.bar.time).toBe(14 * MIN);
  });

  it('forwards bars untouched for a timeframe the feed has', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '5m' });
    expect(feed.connected?.timeframe).toBe('5m');
    const b = bar(5 * MIN, 1, 2, 0.5, 1.5);
    feed.emit('bar', { bar: b, closed: false });
    expect(bars).toEqual([{ bar: b, closed: false }]);
  });

  it('forwards ticks and connection changes', () => {
    const { feed, adapter } = setup();
    const seen: string[] = [];
    adapter.on('tick', () => seen.push('tick'));
    adapter.on('connectionChange', (e) => seen.push(String(e.data)));
    feed.emit('tick', { time: 0, price: 1, volume: 1 });
    feed.emit('connectionChange', 'connected');
    expect(seen).toEqual(['tick', 'connected']);
  });

  it('starts a fresh bucket after a reconnect', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(7 * MIN, 10, 11, 9, 10, 1), closed: false });
    adapter.disconnect();
    adapter.connect({ symbol: 'Y', timeframe: '7m' });
    feed.emit('bar', { bar: bar(8 * MIN, 50, 51, 49, 50, 1), closed: false });
    expect(bars.at(-1)).toEqual({ bar: bar(7 * MIN, 50, 51, 49, 50, 1), closed: false });
  });
});
