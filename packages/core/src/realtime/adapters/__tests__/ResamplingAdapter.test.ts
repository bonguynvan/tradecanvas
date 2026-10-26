import { describe, it, expect, vi } from 'vitest';
import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  OHLCBar,
  SymbolInfo,
  TimeFrame,
} from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';
import { ResamplingAdapter, withResampling, servesTimeframe, MAX_BASE_REQUESTS, SYMBOL_ZONE_WAIT_MS } from '../ResamplingAdapter.js';

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

  it('passes on what the feed learns about the symbol', () => {
    const { feed, adapter } = setup();
    const seen: unknown[] = [];
    adapter.on('symbolInfo', (e) => seen.push(e.data));
    feed.emit('symbolInfo', { symbol: 'X', pricePrecision: 0, minTick: 10 });
    expect(seen).toEqual([{ symbol: 'X', pricePrecision: 0, minTick: 10 }]);
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

describe('ResamplingAdapter live bars, robustly', () => {
  it('keeps every base bar of the bucket when the feed never flags one closed', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(7 * MIN, 10, 12, 9, 11, 5), closed: false });
    feed.emit('bar', { bar: bar(8 * MIN, 11, 11.5, 10.5, 11.2, 1), closed: false });
    expect(bars.at(-1)).toEqual({ bar: bar(7 * MIN, 10, 12, 9, 11.2, 6), closed: false });
  });

  it('counts a repeated frame once', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(7 * MIN, 10, 11, 9, 10, 2), closed: true });
    feed.emit('bar', { bar: bar(7 * MIN, 10, 11, 9, 10, 2), closed: true });
    expect(bars.at(-1)?.bar.volume).toBe(2);
  });

  it('ignores a late frame of a bucket that already closed', () => {
    const { feed, adapter, bars } = setup();
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(14 * MIN, 20, 21, 19, 20, 1), closed: false });
    const before = bars.length;
    feed.emit('bar', { bar: bar(13 * MIN, 1, 1, 1, 1, 1), closed: true });
    expect(bars).toHaveLength(before);
  });

  it('starts from the history it served, so the first live tick keeps the bucket whole', async () => {
    const { feed, adapter, bars } = setup();
    const history = await adapter.fetchHistory('X', '7m', 10);
    const last = history.at(-1)!; // minutes 9996–9999, still forming
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(9999 * MIN, 9999, 10_000, 9998, 9999.5, 2), closed: false });
    expect(bars.at(-1)?.bar).toMatchObject({ time: last.time, open: last.open, low: last.low, high: 10_000, close: 9999.5 });
    // Minute 9999 replaced, the three before it kept: 3 + 2.
    expect(bars.at(-1)?.bar.volume).toBe(5);
  });

  it('closes a month bucket on its last base month, 31-day months included', () => {
    const feed = new FakeFeed();
    (feed as { supportedTimeframes: TimeFrame[] }).supportedTimeframes = ['1d', '1M'];
    const adapter = new ResamplingAdapter(feed, feed.supportedTimeframes);
    const seen: { bar: OHLCBar; closed: boolean }[] = [];
    adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => seen.push(e.data));
    adapter.connect({ symbol: 'X', timeframe: '2M' });
    // 2-month buckets: July–August. August is the last month of it.
    feed.emit('bar', { bar: bar(Date.UTC(2026, 6, 1), 1, 2, 1, 2, 1), closed: true });
    feed.emit('bar', { bar: bar(Date.UTC(2026, 7, 1), 2, 3, 2, 3, 1), closed: true });
    expect(seen.at(-1)).toEqual({ bar: bar(Date.UTC(2026, 6, 1), 1, 3, 1, 3, 2), closed: true });
  });
});

describe('ResamplingAdapter limits', () => {
  it('stops paging the feed after a fixed number of requests', async () => {
    const { feed, adapter } = setup();
    await adapter.fetchHistory('X', '999m', 500);
    const calls = feed.fetchHistory.mock.calls.length + feed.fetchHistoryBefore.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(MAX_BASE_REQUESTS);
  });

  it('stops paging when the adapter disconnects', async () => {
    const { feed, adapter } = setup();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    feed.fetchHistoryBefore.mockImplementation(async (_s, tf, before, limit) => {
      await gate;
      return barsBefore(tf, before, limit);
    });
    const pending = adapter.fetchHistory('X', '7m', 400);
    await Promise.resolve();
    adapter.disconnect();
    release();
    await pending;
    expect(feed.fetchHistoryBefore).toHaveBeenCalledTimes(1);
  });

  it('refuses a timeframe the feed cannot build instead of serving another', async () => {
    const { adapter } = setup();
    await expect(adapter.fetchHistory('X', '30s', 10)).rejects.toThrow(/30s/);
    expect(() => adapter.connect({ symbol: 'X', timeframe: '30s' })).toThrow(/30s/);
  });
});

const VN = 'Asia/Ho_Chi_Minh';
const NY = 'America/New_York';
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Hourly bars of a Vietnamese session, 08:00 to 13:00 there, on 20–23 October 2026: open = the hour's UTC time. */
function vnHours(): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (let d = 20; d <= 23; d++) {
    for (let h = 8; h <= 13; h++) {
      const t = Date.UTC(2026, 9, d, h - 7);
      out.push(bar(t, t / HOUR, t / HOUR + 0.5, t / HOUR - 0.5, t / HOUR, 1));
    }
  }
  return out;
}

/** A feed of some timeframes, in a zone its resolveSymbol names (null: it has no resolveSymbol). */
function zonedFeed(supported: TimeFrame[], history: OHLCBar[], zone: string | null) {
  const feed = new FakeFeed();
  (feed as { supportedTimeframes: TimeFrame[] }).supportedTimeframes = supported;
  feed.fetchHistory.mockImplementation(async (_s, _tf, limit = 500) => history.slice(-limit));
  feed.fetchHistoryBefore.mockImplementation(async (_s, _tf, before, limit) => history.filter((b) => b.time < before).slice(-limit));
  const resolveSymbol = vi.fn(async (symbol: string): Promise<SymbolInfo | null> => ({ symbol, timeZone: zone ?? undefined }));
  if (zone !== null) (feed as unknown as { resolveSymbol: typeof resolveSymbol }).resolveSymbol = resolveSymbol;
  const adapter = new ResamplingAdapter(feed, supported);
  const bars: { bar: OHLCBar; closed: boolean }[] = [];
  adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => bars.push(e.data));
  return { feed, adapter, bars, resolveSymbol };
}

describe('ResamplingAdapter in the symbol’s time zone', () => {
  it('starts built days at the exchange’s midnight', async () => {
    const { adapter } = zonedFeed(['1h'], vnHours(), VN);
    const days = await adapter.fetchHistory('VN30F1M', '1d', 10);
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((d) => d.time % DAY === 17 * HOUR)).toBe(true);
    expect(days.at(-1)?.time).toBe(Date.UTC(2026, 9, 22, 17));
  });

  it('builds 4h bars of the morning and of the afternoon', async () => {
    const { adapter } = zonedFeed(['1h'], vnHours(), VN);
    const out = await adapter.fetchHistory('VN30F1M', '4h', 4);
    expect(out.map((b) => [b.time, b.volume])).toEqual([
      [Date.UTC(2026, 9, 22, 1), 4], [Date.UTC(2026, 9, 22, 5), 2],
      [Date.UTC(2026, 9, 23, 1), 4], [Date.UTC(2026, 9, 23, 5), 2],
    ]);
  });

  it('pages older bars in the same zone', async () => {
    const { adapter } = zonedFeed(['1h'], vnHours(), VN);
    await adapter.fetchHistory('VN30F1M', '4h', 2);
    const older = await adapter.fetchHistoryBefore!('VN30F1M', '4h', Date.UTC(2026, 9, 22, 1), 4);
    expect(older.map((b) => b.time)).toEqual([
      Date.UTC(2026, 9, 20, 1), Date.UTC(2026, 9, 20, 5), Date.UTC(2026, 9, 21, 1), Date.UTC(2026, 9, 21, 5),
    ]);
  });

  it('carries on live in the zone the history was built in', async () => {
    const { feed, adapter, bars } = zonedFeed(['1h'], vnHours(), VN);
    await adapter.fetchHistory('VN30F1M', '4h', 4);
    adapter.connect({ symbol: 'VN30F1M', timeframe: '4h' });
    expect(feed.connected?.timeframe).toBe('1h');
    const at14 = Date.UTC(2026, 9, 23, 7);
    feed.emit('bar', { bar: bar(at14, 1, 2, 0.5, 1.5, 1), closed: true });
    expect(bars.at(-1)).toMatchObject({ bar: { time: Date.UTC(2026, 9, 23, 5), volume: 3 }, closed: false });
    const nextMorning = Date.UTC(2026, 9, 24, 1);
    feed.emit('bar', { bar: bar(nextMorning, 1, 2, 0.5, 1.5, 1), closed: false });
    expect(bars.at(-2)).toMatchObject({ bar: { time: Date.UTC(2026, 9, 23, 5), volume: 3 }, closed: true });
    expect(bars.at(-1)).toMatchObject({ bar: { time: nextMorning, volume: 1 }, closed: false });
  });

  it('builds weeks from dated daily bars by their dates, live too', async () => {
    const dates = [19, 20, 21, 22, 23].map((d) => bar(Date.UTC(2026, 9, d), 1, 2, 0.5, 1.5, 1));
    const { feed, adapter, bars } = zonedFeed(['1d'], dates, NY);
    const weeks = await adapter.fetchHistory('SPY', '1w', 10);
    expect(weeks).toEqual([bar(Date.UTC(2026, 9, 19), 1, 2, 0.5, 1.5, 5)]);
    adapter.connect({ symbol: 'SPY', timeframe: '1w' });
    // Monday 26 October, 00:00 UTC: Sunday evening in New York, but the date of a Monday.
    feed.emit('bar', { bar: bar(Date.UTC(2026, 9, 26), 1, 2, 0.5, 1.5, 1), closed: false });
    expect(bars).toContainEqual({ bar: bar(Date.UTC(2026, 9, 19), 1, 2, 0.5, 1.5, 5), closed: true });
    expect(bars.at(-1)).toEqual({ bar: bar(Date.UTC(2026, 9, 26), 1, 2, 0.5, 1.5, 1), closed: false });
  });

  it('asks the feed once for the chart and itself together, and keeps only the zone', async () => {
    const { adapter, resolveSymbol } = zonedFeed(['1h'], vnHours(), VN);
    const [info] = await Promise.all([adapter.resolveSymbol!('VN30F1M'), adapter.fetchHistory('VN30F1M', '1d', 10)]);
    expect(info).toEqual({ symbol: 'VN30F1M', timeZone: VN });
    expect(resolveSymbol).toHaveBeenCalledTimes(1);
    // The zone stays for the symbol; what the feed knows is asked again.
    await adapter.fetchHistory('VN30F1M', '4h', 10);
    expect(resolveSymbol).toHaveBeenCalledTimes(1);
    await adapter.resolveSymbol!('VN30F1M');
    expect(resolveSymbol).toHaveBeenCalledTimes(2);
  });

  it('falls back to UTC days when no timeframe of the feed lines up with the zone', async () => {
    const fourHours = vnHours().filter((b) => b.time % (4 * HOUR) === 0);
    const { adapter } = zonedFeed(['4h'], fourHours, VN);
    expect(servesTimeframe(adapter, '1d')).toBe(true);
    const days = await adapter.fetchHistory('VN30F1M', '1d', 10);
    expect(days.length).toBeGreaterThan(0);
    expect(days.every((d) => d.time % DAY === 0)).toBe(true);
  });

  it('builds UTC buckets at once for a feed that names no zone', () => {
    // Coinbase's timeframes, and no resolveSymbol.
    const { feed, adapter } = zonedFeed(['1m', '5m', '15m', '1h', '6h', '1d'], vnHours(), null);
    void adapter.fetchHistory('BTC-USD', '4h', 10);
    expect(feed.fetchHistory).toHaveBeenCalledWith('BTC-USD', '1h', expect.any(Number));
  });

  it('builds UTC buckets when the feed does not know the symbol, or fails to say', async () => {
    const { adapter, resolveSymbol } = zonedFeed(['1h'], vnHours(), VN);
    resolveSymbol.mockResolvedValueOnce(null);
    expect((await adapter.fetchHistory('A', '4h', 4)).every((b) => b.time % (4 * HOUR) === 0)).toBe(true);
    resolveSymbol.mockRejectedValueOnce(new Error('down'));
    expect((await adapter.fetchHistory('B', '4h', 4)).every((b) => b.time % (4 * HOUR) === 0)).toBe(true);
  });

  it('waits a bounded time for a feed that never says', async () => {
    vi.useFakeTimers();
    try {
      const { adapter, resolveSymbol } = zonedFeed(['1h'], vnHours(), VN);
      resolveSymbol.mockReturnValue(new Promise(() => {}));
      const pending = adapter.fetchHistory('VN30F1M', '4h', 4);
      await vi.advanceTimersByTimeAsync(SYMBOL_ZONE_WAIT_MS);
      expect((await pending).every((b) => b.time % (4 * HOUR) === 0)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resumes a frame on the epoch floor from its history when the zone is learnt in between', async () => {
    const feed = new FakeFeed();
    (feed as unknown as { resolveSymbol: (s: string) => Promise<SymbolInfo> }).resolveSymbol = async (symbol) => ({ symbol, timeZone: VN });
    const adapter = new ResamplingAdapter(feed, feed.supportedTimeframes);
    const seen: { bar: OHLCBar; closed: boolean }[] = [];
    adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => seen.push(e.data));
    await adapter.fetchHistory('X', '7m', 10);
    await adapter.resolveSymbol!('X');
    adapter.connect({ symbol: 'X', timeframe: '7m' });
    feed.emit('bar', { bar: bar(9999 * MIN, 9999, 10_000, 9998, 9999.5, 2), closed: false });
    expect(seen.at(-1)?.bar.volume).toBe(5);
  });

  it('builds frames that keep the epoch floor without waiting for the zone', () => {
    const { feed, adapter, resolveSymbol } = zonedFeed(['1m'], vnHours(), VN);
    void adapter.fetchHistory('VN30F1M', '7m', 10);
    expect(feed.fetchHistory).toHaveBeenCalled();
    expect(resolveSymbol).not.toHaveBeenCalled();
  });
});

describe('servesTimeframe', () => {
  const feed = new FakeFeed();

  it('accepts what the feed has or can build at a sane ratio', () => {
    expect(servesTimeframe(feed, '5m')).toBe(true);
    expect(servesTimeframe(feed, '7m')).toBe(true);
    expect(servesTimeframe(feed, '90m')).toBe(true);
  });

  it('refuses what it cannot build, or only from too many base bars', () => {
    expect(servesTimeframe(feed, '30s')).toBe(false);
    expect(servesTimeframe(feed, '9999m')).toBe(false);
  });

  it('accepts anything from a feed that serves every timeframe', () => {
    const open = { ...feed, supportedTimeframes: undefined } as unknown as DataAdapter;
    expect(servesTimeframe(open, '9999m')).toBe(true);
  });
});

