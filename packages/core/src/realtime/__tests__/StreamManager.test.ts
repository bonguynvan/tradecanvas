import { describe, it, expect, vi, afterEach } from 'vitest';
import type { DataAdapter, DataAdapterConfig, DataAdapterListener, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { StreamManager } from '../StreamManager.js';

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

describe('StreamManager — daily bars from ticks', () => {
  const day = (time: number): OHLCBar => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 });

  /** The day a trade at `time` lands in, on a stream of daily bars in `zone` built from ticks after `history`. */
  async function tickOnto(zone: string, history: OHLCBar[], time: number): Promise<number | undefined> {
    const { adapter, pending, listeners } = controlledAdapter();
    const sm = new StreamManager();
    sm.setTimeZone(zone);
    const updates: OHLCBar[] = [];
    sm.on('barUpdate', (b) => updates.push(b));
    const done = sm.connect({ adapter, symbol: 'X', timeframe: '1d', aggregateTicks: true });
    pending[0].resolve(history);
    await done;
    for (const l of listeners.get('tick') ?? []) l({ type: 'tick', data: { time, price: 2, volume: 1 }, timestamp: 0 });
    return updates.at(-1)?.time;
  }

  it('starts the day at the exchange’s midnight, as the bars before it do', async () => {
    // Friday 23 October 2026, 09:15 in Ho Chi Minh City.
    const day23 = await tickOnto('Asia/Ho_Chi_Minh', [day(Date.UTC(2026, 9, 21, 17))], Date.UTC(2026, 9, 23, 2, 15));
    expect(day23).toBe(Date.UTC(2026, 9, 22, 17));
  });

  it('stamps the day by its date when the history stamps days at 00:00 UTC', async () => {
    // 20:30 on Friday 23 October in New York, already Saturday in UTC.
    const day23 = await tickOnto('America/New_York', [day(Date.UTC(2026, 9, 22))], Date.UTC(2026, 9, 24, 0, 30));
    expect(day23).toBe(Date.UTC(2026, 9, 23));
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
