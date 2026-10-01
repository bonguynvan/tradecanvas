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
  return { adapter, pending, connects };
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
