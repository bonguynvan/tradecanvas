import { describe, it, expect, vi, afterEach } from 'vitest';
import type { DataAdapter, DataAdapterConfig, DataAdapterListener, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { StreamManager } from '../StreamManager.js';
import { WebSocketAdapter, type WebSocketLike, type WsParseResult } from '../adapters/WebSocketAdapter.js';

interface PendingFetch {
  symbol: string;
  timeframe: TimeFrame;
  resolve: (bars: OHLCBar[]) => void;
  reject: (err: Error) => void;
}

/** Adapter whose history requests resolve only when the test says so. */
function controlledAdapter() {
  const pending: PendingFetch[] = [];
  const connects: DataAdapterConfig[] = [];
  const listeners = new Map<string, Set<DataAdapterListener>>();
  const adapter: DataAdapter = {
    name: 'controlled',
    connect: (cfg) => { connects.push(cfg); },
    // Like PollingAdapter: a deliberate disconnect still reports 'disconnected'.
    disconnect: () => {
      for (const l of listeners.get('connectionChange') ?? []) l({ type: 'connectionChange', data: 'disconnected' });
    },
    getConnectionState: () => 'disconnected',
    fetchHistory: (symbol, timeframe) =>
      new Promise<OHLCBar[]>((resolve, reject) => { pending.push({ symbol, timeframe, resolve, reject }); }),
    on: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener as DataAdapterListener);
    },
    off: (event, listener) => { listeners.get(event)?.delete(listener as DataAdapterListener); },
    dispose: () => {},
  };
  return { adapter, pending, connects, listeners };
}

const bars = (close: number): OHLCBar[] => [{ time: 1, open: close, high: close, low: close, close, volume: 1 }];

afterEach(() => {
  vi.useRealTimers();
});

describe('StreamManager — superseded history requests', () => {
  it('drops a switchTo() response that arrives after a newer switch', async () => {
    const { adapter, pending, connects } = controlledAdapter();
    const sm = new StreamManager();
    const snapshots: number[] = [];
    sm.on('snapshot', (b) => snapshots.push(b[0].close));

    const first = sm.connect({ adapter, symbol: 'AAA', timeframe: '1m' });
    pending[0].resolve(bars(1));
    await first;

    const slow = sm.switchTo('AAA', '1h');
    const fast = sm.switchTo('AAA', '4h');
    pending[2].resolve(bars(4)); // the newer request wins the race…
    await fast;
    pending[1].resolve(bars(60)); // …and the older one lands late
    await slow;

    expect(snapshots).toEqual([1, 4]);
    expect(connects.map((c) => c.timeframe)).toEqual(['1m', '4h']);
    sm.dispose();
  });

  it('ignores a response for a connection that was disconnected meanwhile', async () => {
    const { adapter, pending, connects } = controlledAdapter();
    const sm = new StreamManager();
    const snapshot = vi.fn();
    sm.on('snapshot', snapshot);

    const p = sm.connect({ adapter, symbol: 'AAA', timeframe: '1m' });
    sm.disconnect();
    pending[0].resolve(bars(1));
    await p;

    expect(snapshot).not.toHaveBeenCalled();
    expect(connects).toHaveLength(0);
  });

  it('does not report or retry a failure of a superseded request', async () => {
    vi.useFakeTimers();
    const { adapter, pending } = controlledAdapter();
    const sm = new StreamManager();
    const errors = vi.fn();
    sm.on('error', errors);

    const first = sm.connect({ adapter, symbol: 'AAA', timeframe: '1m', reconnect: { baseDelay: 10 } });
    const second = sm.switchTo('BBB', '1m');
    pending[0].reject(new Error('stale failure'));
    await first;
    pending[1].resolve(bars(2));
    await second;
    await vi.advanceTimersByTimeAsync(1000);

    expect(errors).not.toHaveBeenCalled();
    expect(pending).toHaveLength(2); // no retry fetch was scheduled
    sm.dispose();
  });

  it('still reports and retries a failure of the current request', async () => {
    vi.useFakeTimers();
    const { adapter, pending } = controlledAdapter();
    const sm = new StreamManager();
    const errors = vi.fn();
    sm.on('error', errors);

    const p = sm.connect({ adapter, symbol: 'AAA', timeframe: '1m', reconnect: { baseDelay: 10, maxDelay: 10 } });
    pending[0].reject(new Error('boom'));
    await p;
    expect(errors).toHaveBeenCalledWith({ message: 'boom', code: 'CONNECT_FAILED' });

    await vi.advanceTimersByTimeAsync(100);
    expect(pending.length).toBeGreaterThan(1);
    sm.dispose();
  });

  it('a switch slower than the reconnect delay is not superseded by a reconnect', async () => {
    vi.useFakeTimers();
    const { adapter, pending } = controlledAdapter();
    const sm = new StreamManager();
    const snapshots: number[] = [];
    sm.on('snapshot', (b) => snapshots.push(b[0].close));

    const first = sm.connect({ adapter, symbol: 'AAA', timeframe: '1m', reconnect: { baseDelay: 100, maxDelay: 100 } });
    pending[0].resolve(bars(1));
    await first;

    const sw = sm.switchTo('AAA', '1h');
    await vi.advanceTimersByTimeAsync(2000); // well past the reconnect delay
    expect(pending).toHaveLength(2); // no reconnect fetch raced the switch
    pending[1].resolve(bars(60));
    await sw;

    expect(snapshots).toEqual([1, 60]);
    sm.dispose();
  });
});

describe('StreamManager — timeframes the feed lacks', () => {
  it('builds them from one the feed has, for history and the live subscription', async () => {
    const { adapter, pending, connects } = controlledAdapter();
    const feed = { ...adapter, supportedTimeframes: ['1m', '5m'] as TimeFrame[] };
    const sm = new StreamManager();
    const snapshots: OHLCBar[][] = [];
    sm.on('snapshot', (b) => snapshots.push(b));

    const done = sm.connect({ adapter: feed, symbol: 'AAA', timeframe: '10m', historyLimit: 2 });
    expect(pending[0].timeframe).toBe('5m');
    const five = (i: number): OHLCBar => ({ time: i * 300_000, open: i, high: i, low: i, close: i, volume: 1 });
    pending[0].resolve([five(0), five(1), five(2), five(3)]);
    await done;

    expect(snapshots[0].map((b) => b.time)).toEqual([0, 600_000]);
    expect(snapshots[0][1]).toMatchObject({ open: 2, close: 3, volume: 2 });
    expect(connects.at(-1)?.timeframe).toBe('5m');
  });
});

describe('StreamManager — bars from ticks after the history', () => {
  const VN = 'Asia/Ho_Chi_Minh';
  const at = (time: number): OHLCBar => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 });

  interface TickCase {
    zone: string;
    history: OHLCBar[];
    /** When the trade happens. */
    time: number;
    timeframe?: TimeFrame;
    /** The zone comes once the history is in, as a symbol's details often do. */
    zoneAfterHistory?: boolean;
    /** The feed's timeframes, when it lacks `timeframe`: the history is built from them. */
    supported?: TimeFrame[];
    /** The zone the feed's `resolveSymbol` names for the symbol (none: it has no `resolveSymbol`). */
    feedZone?: string;
  }

  /** The bar a trade lands in, on a stream of bars built from ticks after `history`, in `zone`. */
  async function tickOnto({ zone, history, time, timeframe = '1d', zoneAfterHistory = false, supported, feedZone }: TickCase): Promise<number | undefined> {
    const { adapter: feed, pending, listeners } = controlledAdapter();
    const resolveSymbol = feedZone ? async (symbol: string) => ({ symbol, timeZone: feedZone }) : undefined;
    const adapter = supported ? { ...feed, supportedTimeframes: supported, resolveSymbol } : feed;
    const sm = new StreamManager();
    if (!zoneAfterHistory) sm.setTimeZone(zone);
    const updates: OHLCBar[] = [];
    sm.on('barUpdate', (b) => updates.push(b));
    const done = sm.connect({ adapter, symbol: 'X', timeframe, aggregateTicks: true });
    // A feed that names the zone is asked first.
    await vi.waitFor(() => expect(pending.length).toBe(1));
    pending[0].resolve(history);
    await done;
    if (zoneAfterHistory) sm.setTimeZone(zone);
    for (const l of listeners.get('tick') ?? []) l({ type: 'tick', data: { time, price: 2, volume: 1 }, timestamp: 0 });
    return updates.at(-1)?.time;
  }

  it('starts the day at the exchange’s midnight, as the bars before it do', async () => {
    // Friday 23 October 2026, 09:15 in Ho Chi Minh City.
    const day23 = await tickOnto({ zone: VN, history: [at(Date.UTC(2026, 9, 21, 17))], time: Date.UTC(2026, 9, 23, 2, 15) });
    expect(day23).toBe(Date.UTC(2026, 9, 22, 17));
  });

  it('stamps the day by its date when the history stamps days at 00:00 UTC', async () => {
    // 20:30 on Friday 23 October in New York, already Saturday in UTC.
    const day23 = await tickOnto({ zone: 'America/New_York', history: [at(Date.UTC(2026, 9, 22))], time: Date.UTC(2026, 9, 24, 0, 30) });
    expect(day23).toBe(Date.UTC(2026, 9, 23));
  });

  describe('4h bars', () => {
    // 11:30 on Friday 23 October in Ho Chi Minh City.
    const trade = Date.UTC(2026, 9, 23, 4, 30);
    /** A feed's own 4h bars, on the epoch: 00:00 and 04:00 UTC. */
    const feedBars = [at(Date.UTC(2026, 9, 23, 0)), at(Date.UTC(2026, 9, 23, 4))];
    /** 4h bars built from 04:00 and 08:00 in Ho Chi Minh City. */
    const zonedBars = [at(Date.UTC(2026, 9, 22, 21)), at(Date.UTC(2026, 9, 23, 1))];

    it('stay on the epoch when the feed’s own bars sit there', async () => {
      expect(await tickOnto({ zone: VN, history: feedBars, time: trade, timeframe: '4h' })).toBe(Date.UTC(2026, 9, 23, 4));
    });

    it('start at the exchange’s midnight when the history’s do', async () => {
      expect(await tickOnto({ zone: VN, history: zonedBars, time: trade, timeframe: '4h' })).toBe(Date.UTC(2026, 9, 23, 1));
    });

    it('follow the history when the zone comes after it', async () => {
      expect(await tickOnto({ zone: VN, history: feedBars, time: trade, timeframe: '4h', zoneAfterHistory: true }))
        .toBe(Date.UTC(2026, 9, 23, 4));
      expect(await tickOnto({ zone: VN, history: zonedBars, time: trade, timeframe: '4h', zoneAfterHistory: true }))
        .toBe(Date.UTC(2026, 9, 23, 1));
    });

    it('stay on the epoch when the history was built there from a feed’s hours', async () => {
      // A feed of 1h bars that names no zone, on a chart whose market is in Ho Chi Minh City.
      const hours = [0, 1, 2, 3, 4].map((h) => at(Date.UTC(2026, 9, 23, h)));
      expect(await tickOnto({ zone: VN, history: hours, time: trade, timeframe: '4h', supported: ['1h'] })).toBe(Date.UTC(2026, 9, 23, 4));
    });

    it('stay on the epoch with no history to follow', async () => {
      expect(await tickOnto({ zone: VN, history: [], time: trade, timeframe: '4h' })).toBe(Date.UTC(2026, 9, 23, 4));
    });
  });

  it('refuse a zone the browser does not know, and keep the one they had', async () => {
    const { adapter, pending, listeners } = controlledAdapter();
    const sm = new StreamManager();
    sm.setTimeZone(VN);
    expect(() => sm.setTimeZone('Not/AZone')).toThrow(RangeError);
    const errors: unknown[] = [];
    sm.on('error', (e) => errors.push(e));
    const updates: OHLCBar[] = [];
    sm.on('barUpdate', (b) => updates.push(b));
    const done = sm.connect({ adapter, symbol: 'X', timeframe: '4h', aggregateTicks: true });
    // 4h bars built from 04:00 and 08:00 in Ho Chi Minh City.
    pending[0].resolve([at(Date.UTC(2026, 9, 22, 21)), at(Date.UTC(2026, 9, 23, 1))]);
    await done;
    for (const l of listeners.get('tick') ?? []) l({ type: 'tick', data: { time: Date.UTC(2026, 9, 23, 4, 30), price: 2, volume: 1 }, timestamp: 0 });
    expect(errors).toEqual([]);
    expect(updates.at(-1)?.time).toBe(Date.UTC(2026, 9, 23, 1));
    sm.disconnect();
  });

  describe('on a timeframe built from the feed’s shorter one', () => {
    it('keep the UTC days it built from hours, west of UTC too', async () => {
      // A feed of 1h bars with no zone to name, on a chart whose market is in New York: its days start at 00:00 UTC.
      const hours = [20, 21, 22, 23, 24].map((h) => at(Date.UTC(2026, 9, 23, h)));
      // 20:30 on Friday 23 October in New York, already Saturday in UTC: Saturday's bar, the history's last.
      expect(await tickOnto({ zone: 'America/New_York', history: hours, time: Date.UTC(2026, 9, 24, 0, 30), supported: ['1h'] }))
        .toBe(Date.UTC(2026, 9, 24));
    });

    it('start the day where the feed’s zone starts the days it built, whatever zone the chart has', async () => {
      // A Ho Chi Minh City session of 1h bars, 09:00 to 14:00 there on Thursday 22 October.
      const hours = [2, 3, 4, 5, 6, 7].map((h) => at(Date.UTC(2026, 9, 22, h)));
      // 09:15 on Friday 23 October there; the chart has no zone for the symbol yet.
      expect(await tickOnto({ zone: 'UTC', history: hours, time: Date.UTC(2026, 9, 23, 2, 15), supported: ['1h'], feedZone: VN }))
        .toBe(Date.UTC(2026, 9, 22, 17));
    });
  });
});

describe('StreamManager.wake — back from sleep', () => {
  /** A connected stream whose adapter can say it is connected and send ticks. */
  async function connected() {
    const made = controlledAdapter();
    const listeners = new Map<string, Set<DataAdapterListener>>();
    const on = made.adapter.on.bind(made.adapter);
    made.adapter.on = (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener as DataAdapterListener);
      on(event, listener);
    };
    const emit = (type: string, data: unknown) => { for (const l of listeners.get(type) ?? []) l({ type, data, timestamp: Date.now() } as never); };
    const sm = new StreamManager();
    const p = sm.connect({ adapter: made.adapter, symbol: 'AAA', timeframe: '1m' });
    made.pending[0].resolve(bars(1));
    await p;
    emit('connectionChange', 'connected');
    return { ...made, sm, emit };
  }

  it('reconnects at once, once, when the page comes back to a connection silent too long', async () => {
    vi.useFakeTimers();
    const { sm, pending } = await connected();
    expect(sm.getConnectionState()).toBe('connected');
    // A reconnect asks for the history again first.
    const before = pending.length;
    vi.setSystemTime(Date.now() + 45_000);
    sm.wake('visible');
    expect(pending.length).toBe(before + 1);
    // The adapter's own 'disconnected' doesn't queue a second one.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(pending.length).toBe(before + 1);
    sm.dispose();
  });

  it('leaves a connection that just spoke alone when the page comes back', async () => {
    vi.useFakeTimers();
    const { sm, pending, emit } = await connected();
    // A reconnect asks for the history again first.
    const before = pending.length;
    emit('tick', { price: 2, volume: 1, time: Date.now() });
    sm.wake('visible');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(pending.length).toBe(before);
    sm.dispose();
  });

  it('reconnects when the network comes back, however recent the last message', async () => {
    vi.useFakeTimers();
    const { sm, pending } = await connected();
    // A reconnect asks for the history again first.
    const before = pending.length;
    sm.wake('online');
    expect(pending.length).toBe(before + 1);
    sm.dispose();
  });

  it('skips the backoff of a retry waiting after a failed connect', async () => {
    vi.useFakeTimers();
    const { sm, pending } = await connected();
    sm.wake('online');
    pending[pending.length - 1].reject(new Error('offline'));
    await vi.advanceTimersByTimeAsync(0);
    expect(sm.getConnectionState()).not.toBe('connected');
    const before = pending.length;
    sm.wake('online');
    expect(pending.length).toBe(before + 1);
    sm.dispose();
  });

  it('leaves a connect under way alone (a symbol switch)', async () => {
    vi.useFakeTimers();
    const { sm, pending } = await connected();
    void sm.switchTo('BBB', '1m');
    const before = pending.length;
    sm.wake('online');
    expect(pending.length).toBe(before);
    expect(pending[pending.length - 1].symbol).toBe('BBB');
    sm.dispose();
  });

  it('tries again with a fresh round of retries after giving up', async () => {
    vi.useFakeTimers();
    const made = controlledAdapter();
    const sm = new StreamManager();
    void sm.connect({ adapter: made.adapter, symbol: 'AAA', timeframe: '1m', reconnect: { maxRetries: 0 } });
    made.pending[0].reject(new Error('offline'));
    await vi.advanceTimersByTimeAsync(0);
    expect(sm.getConnectionState()).toBe('error');
    sm.wake('online');
    expect(made.pending.length).toBe(2);
    sm.dispose();
  });

  it('does nothing once disconnected', () => {
    const { adapter, pending } = controlledAdapter();
    const sm = new StreamManager();
    void sm.connect({ adapter, symbol: 'AAA', timeframe: '1m' });
    sm.disconnect();
    sm.wake('online');
    expect(pending.length).toBe(1);
  });
});

describe('StreamManager — bars older than the newest', () => {
  const HOUR = 3_600_000;
  const T0 = Date.UTC(2026, 0, 5);
  const at = (i: number, close = 100, volume = 10): OHLCBar =>
    ({ time: T0 + i * HOUR, open: 100, high: Math.max(100, close) + 1, low: Math.min(100, close) - 1, close, volume });
  const history = (n: number) => Array.from({ length: n }, (_, i) => at(i));

  /** A connected stream whose feed the test speaks for, with what it said, by event. */
  async function live(bars: OHLCBar[], aggregateTicks = false) {
    const { adapter, pending, listeners } = controlledAdapter();
    const sm = new StreamManager();
    const seen = {
      barUpdate: [] as OHLCBar[], barClose: [] as OHLCBar[], barCorrection: [] as OHLCBar[],
      priceChange: [] as { price: number; previousClose: number | null }[],
    };
    sm.on('barUpdate', (b) => seen.barUpdate.push({ ...b }));
    sm.on('barClose', (b) => seen.barClose.push({ ...b }));
    sm.on('barCorrection', (b) => seen.barCorrection.push({ ...b }));
    sm.on('priceChange', (p) => seen.priceChange.push({ ...p }));
    const done = sm.connect({ adapter, symbol: 'X', timeframe: '1h', aggregateTicks });
    pending[0].resolve(bars.map((b) => ({ ...b })));
    await done;
    const fire = (type: string, data: unknown) => { for (const l of listeners.get(type) ?? []) l({ type: type as never, data, timestamp: 0 }); };
    return {
      sm, seen, pending, fire,
      bar: (b: OHLCBar, closed: boolean) => fire('bar', { bar: { ...b }, closed }),
      trade: (time: number, price: number, volume = 1) => fire('tick', { time, price, volume }),
    };
  }

  it('sends a closed bar older than the newest as barCorrection, not barClose, and keeps the price and the previous close', async () => {
    const feed = await live(history(40));
    feed.bar(at(40, 101), false);
    const prices = feed.seen.priceChange.length;
    feed.bar(at(38, 97, 6), true);
    expect(feed.seen.barCorrection).toEqual([at(38, 97, 6)]);
    expect(feed.seen.barClose).toEqual([]);
    expect(feed.seen.priceChange).toHaveLength(prices);
    expect(feed.sm.getLastPrice()).toBe(101);
    feed.bar(at(40, 102), false);
    expect(feed.seen.priceChange.at(-1)).toEqual({ price: 102, previousClose: 100 });
    feed.sm.dispose();
  });

  it('drops a forming frame older than the newest without a priceChange or barUpdate', async () => {
    const feed = await live(history(40));
    const prices = feed.seen.priceChange.length;
    feed.bar(at(37, 90), false);
    expect(feed.seen.barUpdate).toEqual([]);
    expect(feed.seen.barCorrection).toEqual([]);
    expect(feed.seen.priceChange).toHaveLength(prices);
    feed.sm.dispose();
  });

  it('takes the newest time from the history on every connect and switchTo', async () => {
    const feed = await live(history(40));
    feed.bar(at(45, 101), false);
    // Another timeframe, whose history ends earlier: its bars before 45 are no correction of the last one's.
    const switching = feed.sm.switchTo('X', '4h');
    feed.pending[1].resolve(history(20));
    await switching;
    feed.bar(at(20, 103), false);
    expect(feed.seen.barUpdate.at(-1)).toMatchObject({ time: at(20).time, close: 103 });
    feed.bar(at(19, 99), true);
    expect(feed.seen.barCorrection.map((b) => b.time)).toEqual([at(19).time]);
    feed.sm.dispose();
  });

  it('correcting the newest closed bar moves previousClose; an older one does not', async () => {
    const feed = await live(history(40));
    feed.bar(at(40, 101), false);
    feed.bar(at(40, 102), true);
    feed.bar(at(41, 103), false);
    expect(feed.seen.priceChange.at(-1)).toEqual({ price: 103, previousClose: 102 });
    feed.bar(at(40, 98), true); // the venue's revised final of bar 40
    feed.bar(at(41, 104), false);
    expect(feed.seen.priceChange.at(-1)).toEqual({ price: 104, previousClose: 98 });
    feed.bar(at(39, 50), true);
    feed.bar(at(41, 105), false);
    expect(feed.seen.priceChange.at(-1)).toEqual({ price: 105, previousClose: 98 });
    feed.sm.dispose();
  });

  describe('aggregateTicks', () => {
    it('a closed bar for the bar before the forming one is sent as barCorrection; the forming bar keeps its trades', async () => {
      const feed = await live(history(40), true);
      const t40 = at(40).time;
      feed.trade(t40 + 1000, 101, 5);
      feed.trade(t40 + 2000, 104, 5);
      feed.bar(at(39, 97, 6), true); // the venue's final for bar 39
      feed.trade(t40 + 3000, 102, 1);
      expect(feed.seen.barCorrection).toEqual([at(39, 97, 6)]);
      // Bar 40's first trade closed the history's last bar, as it was; the correction closed nothing.
      expect(feed.seen.barClose).toEqual([expect.objectContaining(at(39))]);
      expect(feed.seen.barUpdate.at(-1)).toMatchObject({ time: t40, open: 101, high: 104, low: 101, close: 102, volume: 11 });
      feed.sm.dispose();
    });

    it("builds on the history's forming bar: the first trade keeps its open, high, low and volume", async () => {
      const bars = history(41);
      bars[40] = { time: at(40).time, open: 100, high: 110, low: 95, close: 105, volume: 50 }; // the REST candle, forming
      const feed = await live(bars, true);
      feed.trade(at(40).time + 1_800_000, 104, 1);
      expect(feed.seen.barUpdate.at(-1)).toMatchObject({ time: at(40).time, open: 100, high: 110, low: 95, close: 104, volume: 51 });
      feed.sm.dispose();
    });

    it('a late trade for the bar before leaves the forming bar alone', async () => {
      const feed = await live(history(40), true);
      const t40 = at(40).time;
      feed.trade(t40 + 1000, 101, 5);
      feed.trade(t40 + 2000, 104, 5);
      feed.trade(t40 - 1000, 99, 1); // a trade of bar 39, delivered late
      feed.trade(t40 + 3000, 102, 1);
      expect(feed.seen.barClose.map((b) => b.time)).toEqual([at(39).time]);
      expect(feed.seen.barUpdate.at(-1)).toMatchObject({ time: t40, open: 101, high: 104, volume: 11 });
      feed.sm.dispose();
    });

    /** The stream of `feed` reconnected (the page came back), its history then `bars`. */
    async function reconnect(feed: Awaited<ReturnType<typeof live>>, bars: OHLCBar[]) {
      feed.fire('connectionChange', 'connected');
      feed.sm.wake('online');
      feed.pending[1].resolve(bars.map((b) => ({ ...b })));
      await new Promise((r) => setTimeout(r, 0));
    }

    it('keeps the trades of the forming bar across a reconnect whose history still ends on the bar before', async () => {
      const feed = await live(history(40), true);
      const t40 = at(40).time;
      feed.trade(t40 + 1000, 101, 5);
      feed.trade(t40 + 2000, 110, 5);
      feed.trade(t40 + 3000, 95, 5);
      await reconnect(feed, history(40));
      feed.trade(t40 + 4000, 102, 1);
      expect(feed.seen.barUpdate.at(-1)).toMatchObject({ time: t40, open: 101, high: 110, low: 95, close: 102, volume: 16 });
      // A late trade of bar 39 after it is still left out.
      feed.trade(t40 - 1000, 99, 1);
      expect(feed.seen.barClose.map((b) => b.time)).toEqual([at(39).time]);
      feed.sm.dispose();
    });

    it("takes a reconnect's history that holds the forming bar: it has the trades missed while away", async () => {
      const feed = await live(history(40), true);
      const t40 = at(40).time;
      feed.trade(t40 + 1000, 101, 5);
      const bars = history(41);
      bars[40] = { time: t40, open: 101, high: 112, low: 94, close: 108, volume: 30 };
      await reconnect(feed, bars);
      feed.trade(t40 + 600_000, 107, 1);
      expect(feed.seen.barUpdate.at(-1)).toMatchObject({ time: t40, open: 101, high: 112, low: 94, close: 107, volume: 31 });
      feed.sm.dispose();
    });

    it("a bar feed's correction folds nothing into the forming bar (WebSocketAdapter)", async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(at(40).time + 1_800_000); // halfway through bar 40
      let socket: WebSocketLike | null = null;
      const adapter = new WebSocketAdapter({
        name: 'ws',
        wsUrl: () => 'wss://x',
        fetchHistory: async () => history(40),
        parseMessage: (raw) => raw as WsParseResult,
        socketFactory: () => {
          socket = { onopen: null, onmessage: null, onerror: null, onclose: null, send: () => {}, close: () => {} };
          return socket;
        },
      });
      const sm = new StreamManager();
      const updates: OHLCBar[] = [];
      sm.on('barUpdate', (b) => updates.push({ ...b }));
      await sm.connect({ adapter, symbol: 'X', timeframe: '1h', aggregateTicks: true });
      const send = (b: OHLCBar, closed: boolean) => socket!.onmessage?.({ data: { bar: b, closed } });
      send(at(40, 101, 3), false);
      const forming = updates.at(-1);
      send(at(39, 94, 10), true); // the venue's final of bar 39
      send(at(37, 90, 10), false); // a stale frame
      expect(updates.at(-1)).toEqual(forming);
      expect(sm.getLastPrice()).toBe(101);
      sm.dispose();
    });
  });
});
