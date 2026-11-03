import { describe, it, expect, vi } from 'vitest';
import type {
  BarsRequest,
  BarsSubscription,
  DataAdapter,
  DataAdapterListener,
  DataFeed,
  FeedSubscriber,
  OHLCBar,
} from '@tradecanvas/commons';
import { adapterFromFeed, feedFromAdapter, isDataFeed, streamAdapterOf } from '../feedAdapter.js';
import { ManualFeed } from '../ManualFeed.js';
import { StreamManager } from '../../StreamManager.js';

const bar = (time: number, close = time): OHLCBar => ({ time, open: close, high: close, low: close, close, volume: 1 });

/** A feed that records what it is asked and hands its subscribers to the test. */
function recordingFeed(extra: Partial<DataFeed> = {}) {
  const requests: BarsRequest[] = [];
  const subs: { request: BarsSubscription; subscriber: FeedSubscriber; unsubscribed: boolean }[] = [];
  const feed: DataFeed = {
    name: 'recording',
    getBars: async (request) => {
      requests.push(request);
      return request.before === undefined ? [bar(1), bar(2), bar(3)] : [];
    },
    subscribeBars: (request, subscriber) => {
      const sub = { request, subscriber, unsubscribed: false };
      subs.push(sub);
      return () => { sub.unsubscribed = true; };
    },
    ...extra,
  };
  return { feed, requests, subs };
}

function listen(adapter: DataAdapter) {
  const events: { type: string; data: unknown }[] = [];
  for (const type of ['bar', 'tick', 'connectionChange', 'symbolInfo', 'error'] as const) {
    adapter.on(type, ((e: { data: unknown }) => events.push({ type, data: e.data })) as DataAdapterListener);
  }
  return events;
}

describe('adapterFromFeed', () => {
  it('asks the feed for the first bars and for older ones, with a signal', async () => {
    const { feed, requests } = recordingFeed();
    const adapter = adapterFromFeed(feed);
    expect(await adapter.fetchHistory('AAA', '1m', 300)).toHaveLength(3);
    expect(await adapter.fetchHistoryBefore!('AAA', '1m', 1, 200)).toEqual([]);
    expect(requests.map(({ symbol, timeframe, countBack, before }) => ({ symbol, timeframe, countBack, before }))).toEqual([
      { symbol: 'AAA', timeframe: '1m', countBack: 300, before: undefined },
      { symbol: 'AAA', timeframe: '1m', countBack: 200, before: 1 },
    ]);
    expect(requests[0].signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts the stream's own requests when it disconnects, and leaves the others (a compare) alone", () => {
    const requests: BarsRequest[] = [];
    const adapter = adapterFromFeed({
      name: 'slow',
      getBars: (request) => { requests.push(request); return new Promise<OHLCBar[]>(() => {}); },
      subscribeBars: () => () => {},
    });
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    void adapter.fetchHistory('AAA', '1m');
    void adapter.fetchHistoryBefore!('AAA', '1m', 5, 10);
    void adapter.fetchHistory('BBB', '1m');
    void adapter.fetchHistory('AAA', '1s');
    adapter.disconnect();
    expect(requests.map((r) => r.signal.aborted)).toEqual([true, true, false, false]);
    // The next requests for that series run on a fresh signal.
    void adapter.fetchHistory('AAA', '1m');
    expect(requests.at(-1)!.signal.aborted).toBe(false);
  });

  it('cannot page back a feed that says it has only the newest bars', () => {
    const { feed } = recordingFeed({ pagesBack: false });
    expect(adapterFromFeed(feed).fetchHistoryBefore).toBeUndefined();
    expect(typeof adapterFromFeed(recordingFeed().feed).fetchHistoryBefore).toBe('function');
  });

  it('stops a subscription replaced while the feed was still subscribing it', () => {
    const stops: string[] = [];
    let adapter!: DataAdapter;
    let reentered = false;
    adapter = adapterFromFeed({
      name: 'flaky',
      getBars: async () => [],
      subscribeBars: ({ symbol }, subscriber) => {
        if (!reentered) {
          reentered = true;
          subscriber.connection('error');
          adapter.connect({ symbol: 'BBB', timeframe: '1m' }); // a retry from inside the first subscribe
        }
        return () => stops.push(symbol);
      },
    });
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    expect(stops).toEqual(['AAA']);
  });

  it('subscribes on connect and says it is connected when the feed says nothing', () => {
    const { feed, subs } = recordingFeed();
    const adapter = adapterFromFeed(feed);
    const events = listen(adapter);
    adapter.connect({ symbol: 'AAA', timeframe: '5m' });
    expect(subs.map((s) => s.request)).toEqual([{ symbol: 'AAA', timeframe: '5m' }]);
    expect(events).toEqual([{ type: 'connectionChange', data: 'connected' }]);
    expect(adapter.getConnectionState()).toBe('connected');
  });

  it("passes on the feed's own connection states instead", () => {
    const adapter = adapterFromFeed({
      name: 'socket',
      getBars: async () => [],
      subscribeBars: (_request, subscriber) => { subscriber.connection('connecting'); return () => {}; },
    });
    const events = listen(adapter);
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    expect(events).toEqual([{ type: 'connectionChange', data: 'connecting' }]);
    expect(adapter.getConnectionState()).toBe('connecting');
  });

  it("forwards bars, ticks, symbol info and errors as the stream reads an adapter's", () => {
    const { feed, subs } = recordingFeed();
    const adapter = adapterFromFeed(feed);
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    const events = listen(adapter);
    const { subscriber } = subs[0];
    subscriber.bar(bar(4), false);
    subscriber.tick({ time: 5, price: 10, volume: 1 });
    subscriber.symbolInfo({ symbol: 'AAA', name: 'A', pricePrecision: 2, minMove: 0.01 } as never);
    subscriber.error('boom');
    expect(events.map((e) => e.type)).toEqual(['bar', 'tick', 'symbolInfo', 'error']);
    expect(events[0].data).toEqual({ bar: bar(4), closed: false });
    expect(events[3].data).toEqual({ message: 'boom' });
  });

  it("drops what an old subscription sends after a connect replaced it", () => {
    const { feed, subs } = recordingFeed();
    const adapter = adapterFromFeed(feed);
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    adapter.connect({ symbol: 'BBB', timeframe: '1m' });
    expect(subs[0].unsubscribed).toBe(true);
    const events = listen(adapter);
    subs[0].subscriber.bar(bar(9), true); // a late message from AAA's socket
    subs[1].subscriber.bar(bar(10), true);
    expect(events.map((e) => (e.data as { bar: OHLCBar }).bar.time)).toEqual([10]);
  });

  it('unsubscribes on disconnect and on dispose', () => {
    const { feed, subs } = recordingFeed();
    const adapter = adapterFromFeed(feed);
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    adapter.disconnect();
    expect(subs[0].unsubscribed).toBe(true);
    expect(adapter.getConnectionState()).toBe('disconnected');
    adapter.connect({ symbol: 'AAA', timeframe: '1m' });
    adapter.dispose();
    expect(subs[1].unsubscribed).toBe(true);
  });

  it('has the optional methods the feed has, and only those', () => {
    const search = vi.fn(async () => []);
    const adapter = adapterFromFeed(recordingFeed({ searchSymbols: search, supportedTimeframes: ['1m', '1h'] }).feed);
    expect(adapter.supportedTimeframes).toEqual(['1m', '1h']);
    expect(typeof adapter.searchSymbols).toBe('function');
    expect(adapter.resolveSymbol).toBeUndefined();
    expect(adapter.subscribeQuotes).toBeUndefined();
    expect(adapter.fetchTrades).toBeUndefined();
    void adapter.searchSymbols!('BT');
    expect(search).toHaveBeenCalledWith('BT');
  });

  it('gives each caller its own adapter, so one feed serves many charts', () => {
    const { feed, subs } = recordingFeed();
    const a = adapterFromFeed(feed);
    const b = adapterFromFeed(feed);
    expect(a).not.toBe(b);
    a.connect({ symbol: 'AAA', timeframe: '1m' });
    b.connect({ symbol: 'BBB', timeframe: '1m' });
    expect(subs.map((s) => [s.request.symbol, s.unsubscribed])).toEqual([['AAA', false], ['BBB', false]]);
  });
});

/** An adapter made by hand, as an app writes one. */
function handAdapter(withBefore = true) {
  const listeners = new Map<string, Set<DataAdapterListener>>();
  const emit = (type: string, data: unknown) => {
    for (const l of listeners.get(type) ?? []) l({ type: type as never, data, timestamp: 0 });
  };
  const adapter: DataAdapter = {
    name: 'hand',
    connect: vi.fn(),
    disconnect: vi.fn(),
    getConnectionState: () => 'connected',
    fetchHistory: vi.fn(async () => [bar(1)]),
    ...(withBefore ? { fetchHistoryBefore: vi.fn(async () => [bar(0)]) } : {}),
    on: (type, l) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(l as DataAdapterListener);
    },
    off: (type, l) => { listeners.get(type)?.delete(l as DataAdapterListener); },
    dispose: vi.fn(),
  };
  return { adapter, emit, listeners };
}

function recordingSubscriber() {
  const calls: unknown[][] = [];
  const subscriber: FeedSubscriber = {
    bar: (b, closed) => calls.push(['bar', b.time, closed]),
    tick: (t) => calls.push(['tick', t.price]),
    connection: (s) => calls.push(['connection', s]),
    symbolInfo: (i) => calls.push(['symbolInfo', i.symbol]),
    error: (m) => calls.push(['error', m]),
  };
  return { subscriber, calls };
}

describe('feedFromAdapter', () => {
  const signal = new AbortController().signal;

  it('loads through fetchHistory and pages through fetchHistoryBefore', async () => {
    const { adapter } = handAdapter();
    const feed = feedFromAdapter(adapter);
    expect(await feed.getBars({ symbol: 'AAA', timeframe: '1m', countBack: 50, signal })).toEqual([bar(1)]);
    expect(adapter.fetchHistory).toHaveBeenCalledWith('AAA', '1m', 50);
    expect(await feed.getBars({ symbol: 'AAA', timeframe: '1m', countBack: 50, before: 1, signal })).toEqual([bar(0)]);
    expect(adapter.fetchHistoryBefore).toHaveBeenCalledWith('AAA', '1m', 1, 50);
  });

  it('has no older bars when the adapter cannot page, and says so', async () => {
    const feed = feedFromAdapter(handAdapter(false).adapter);
    expect(await feed.getBars({ symbol: 'AAA', timeframe: '1m', countBack: 50, before: 1, signal })).toEqual([]);
    expect(feed.pagesBack).toBe(false);
    expect(feedFromAdapter(handAdapter(true).adapter).pagesBack).toBe(true);
  });

  it('subscribes by connecting the adapter and stops by disconnecting it', () => {
    const { adapter, emit, listeners } = handAdapter();
    const { subscriber, calls } = recordingSubscriber();
    const stop = feedFromAdapter(adapter).subscribeBars({ symbol: 'AAA', timeframe: '1m' }, subscriber);
    expect(adapter.connect).toHaveBeenCalledWith({ symbol: 'AAA', timeframe: '1m' });
    emit('bar', { bar: bar(2), closed: true });
    emit('tick', { time: 2, price: 7, volume: 1 });
    emit('connectionChange', 'connected');
    emit('symbolInfo', { symbol: 'AAA' });
    emit('error', { message: 'x' });
    expect(calls).toEqual([['bar', 2, true], ['tick', 7], ['connection', 'connected'], ['symbolInfo', 'AAA'], ['error', 'x']]);
    stop();
    expect(adapter.disconnect).toHaveBeenCalled();
    expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
  });

  it('gives back the adapter itself when wrapped again', () => {
    const { adapter } = handAdapter();
    expect(adapterFromFeed(feedFromAdapter(adapter))).toBe(adapter);
  });
});

describe('isDataFeed and streamAdapterOf', () => {
  it('tells a feed from an adapter', () => {
    expect(isDataFeed(recordingFeed().feed)).toBe(true);
    expect(isDataFeed(handAdapter().adapter)).toBe(false);
  });

  it('takes the adapter, or one made from the feed, and refuses neither or both', () => {
    const { adapter } = handAdapter();
    const { feed } = recordingFeed();
    expect(streamAdapterOf({ adapter })).toBe(adapter);
    expect(streamAdapterOf({ feed }).name).toBe('recording');
    expect(() => streamAdapterOf({})).toThrow(/adapter or a feed/);
    expect(() => streamAdapterOf({ adapter, feed })).toThrow(/not both/);
  });
});

describe('ManualFeed', () => {
  const signal = new AbortController().signal;
  const ask = (feed: DataFeed, countBack: number, before?: number) =>
    feed.getBars({ symbol: 'AAA', timeframe: '1m', countBack, before, signal });

  it('serves the newest bars it was given, and older ones before a time', async () => {
    const feed = new ManualFeed();
    feed.setBars('AAA', '1m', [bar(3), bar(1), bar(2), bar(4)]);
    expect((await ask(feed, 2)).map((b) => b.time)).toEqual([3, 4]);
    expect((await ask(feed, 5, 3)).map((b) => b.time)).toEqual([1, 2]);
    expect(await feed.getBars({ symbol: 'BBB', timeframe: '1m', countBack: 5, signal })).toEqual([]);
  });

  it('keeps its own copy of the bars', async () => {
    const feed = new ManualFeed();
    const mine = [bar(1)];
    feed.setBars('AAA', '1m', mine);
    mine[0] = bar(1, 99);
    expect((await ask(feed, 1))[0].close).toBe(1);
  });

  it("sends a pushed bar to that series' subscribers, and keeps it for the next load", async () => {
    const feed = new ManualFeed();
    feed.setBars('AAA', '1m', [bar(1), bar(2)]);
    const a = recordingSubscriber();
    const b = recordingSubscriber();
    feed.subscribeBars({ symbol: 'AAA', timeframe: '1m' }, a.subscriber);
    feed.subscribeBars({ symbol: 'AAA', timeframe: '5m' }, b.subscriber);
    feed.pushBar('AAA', '1m', bar(2, 5));
    feed.pushBar('AAA', '1m', bar(3), true);
    expect(a.calls).toEqual([['bar', 2, false], ['bar', 3, true]]);
    expect(b.calls).toEqual([]);
    expect((await ask(feed, 5)).map((x) => x.close)).toEqual([1, 5, 3]);
  });

  it('stops sending once unsubscribed', () => {
    const feed = new ManualFeed();
    const a = recordingSubscriber();
    const stop = feed.subscribeBars({ symbol: 'AAA', timeframe: '1m' }, a.subscriber);
    stop();
    feed.pushBar('AAA', '1m', bar(1));
    expect(a.calls).toEqual([]);
  });

  it('takes an older bar as the final correction of the bar at its time, and refuses one it has no bar for', async () => {
    const feed = new ManualFeed();
    feed.setBars('AAA', '1m', [bar(1), bar(3)]);
    const a = recordingSubscriber();
    feed.subscribeBars({ symbol: 'AAA', timeframe: '1m' }, a.subscriber);
    feed.pushBar('AAA', '1m', bar(1, 9));
    expect(a.calls).toEqual([['bar', 1, true]]);
    expect((await ask(feed, 5)).map((x) => x.close)).toEqual([9, 3]);
    expect(() => feed.pushBar('AAA', '1m', bar(2))).toThrow(RangeError);
  });
});

describe('StreamManager with a feed', () => {
  it('leaves a quiet feed connected: no heartbeat timeout, no reload when the page comes back', async () => {
    vi.useFakeTimers();
    try {
      const feed = new ManualFeed();
      feed.setBars('AAA', '1d', [bar(86_400_000)]);
      const getBars = vi.spyOn(feed, 'getBars');
      const sm = new StreamManager();
      const errors: string[] = [];
      sm.on('error', (e) => errors.push(e.message));
      await sm.connect({ feed, symbol: 'AAA', timeframe: '1d' });
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      sm.wake('visible');
      await vi.advanceTimersByTimeAsync(0);
      expect(errors).toEqual([]);
      expect(getBars).toHaveBeenCalledTimes(1);
      expect(sm.getConnectionState()).toBe('connected');
      sm.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads the snapshot and streams bars from the feed', async () => {
    const feed = new ManualFeed();
    feed.setBars('AAA', '1m', [bar(60), bar(120)]);
    const sm = new StreamManager();
    const snapshots: OHLCBar[][] = [];
    const updates: number[] = [];
    sm.on('snapshot', (b) => snapshots.push(b));
    sm.on('barUpdate', (b) => updates.push(b.close));
    await sm.connect({ feed, symbol: 'AAA', timeframe: '1m' });
    expect(snapshots[0].map((b) => b.time)).toEqual([60, 120]);
    expect(sm.getConnectionState()).toBe('connected');
    feed.pushBar('AAA', '1m', bar(180, 7));
    expect(updates).toContain(7);
    sm.dispose();
  });
});
