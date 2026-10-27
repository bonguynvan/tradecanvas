import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketAdapter } from '../WebSocketAdapter.js';
import type { WebSocketLike, WsParseResult } from '../WebSocketAdapter.js';
import type { DataAdapterConfig, OHLCBar } from '@tradecanvas/commons';

class MockSocket implements WebSocketLike {
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
  }

  // test helpers
  fireOpen(): void {
    this.onopen?.(undefined);
  }
  fireMessage(data: unknown): void {
    this.onmessage?.({ data });
  }
  fireClose(): void {
    this.onclose?.(undefined);
  }
}

const CONFIG: DataAdapterConfig = { symbol: 'BTCUSDT', timeframe: '1m' };

function makeAdapter(parse: (raw: unknown) => WsParseResult | null) {
  const socket = new MockSocket();
  const history: OHLCBar[] = [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }];
  const adapter = new WebSocketAdapter({
    name: 'test',
    wsUrl: (c) => `wss://example/${c.symbol}`,
    fetchHistory: vi.fn().mockResolvedValue(history),
    parseMessage: parse,
    subscribeMessage: (c) => ({ op: 'subscribe', sym: c.symbol }),
    socketFactory: () => socket,
  });
  return { adapter, socket, history };
}

describe('WebSocketAdapter', () => {
  let barEvents: { bar: OHLCBar; closed: boolean }[];
  let tickEvents: unknown[];
  let connEvents: unknown[];

  beforeEach(() => {
    barEvents = [];
    tickEvents = [];
    connEvents = [];
  });

  it('connects, reports connected, and sends the subscribe message on open', () => {
    const { adapter, socket } = makeAdapter(() => null);
    adapter.on('connectionChange', (e) => connEvents.push(e.data));

    adapter.connect(CONFIG);
    expect(adapter.getConnectionState()).toBe('connecting');

    socket.fireOpen();
    expect(adapter.getConnectionState()).toBe('connected');
    expect(connEvents).toContain('connected');
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({ op: 'subscribe', sym: 'BTCUSDT' });
  });

  it('emits a bar and a synthesized tick from a parsed message', () => {
    const bar: OHLCBar = { time: 100, open: 10, high: 12, low: 9, close: 11, volume: 5 };
    const { adapter, socket } = makeAdapter(() => ({ bar, closed: true }));
    adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => barEvents.push(e.data));
    adapter.on('tick', (e) => tickEvents.push(e.data));

    adapter.connect(CONFIG);
    socket.fireOpen();
    socket.fireMessage(JSON.stringify({ any: 'thing' }));

    expect(barEvents).toEqual([{ bar, closed: true }]);
    expect(tickEvents).toEqual([{ time: expect.any(Number), price: 11, volume: 5 }]);
  });

  it('prefers an explicit tick over the synthesized one', () => {
    const bar: OHLCBar = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };
    const tick = { time: 42, price: 99, volume: 7 };
    const { adapter, socket } = makeAdapter(() => ({ bar, tick }));
    adapter.on('tick', (e) => tickEvents.push(e.data));

    adapter.connect(CONFIG);
    socket.fireOpen();
    socket.fireMessage('{}');

    expect(tickEvents).toEqual([tick]);
  });

  describe('a frame of a bar older than the newest it sent', () => {
    const MINUTE = 60_000;
    const T = Date.UTC(2026, 0, 5);
    const frame = (slot: number, close: number, closed = false) => ({
      bar: { time: T + slot * MINUTE, open: close, high: close, low: close, close, volume: 3 },
      closed,
    });

    function feed() {
      const { adapter, socket } = makeAdapter((raw) => raw as WsParseResult);
      adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => barEvents.push(e.data));
      adapter.on('tick', (e) => tickEvents.push(e.data));
      adapter.connect(CONFIG);
      socket.fireOpen();
      return { adapter, socket, send: (f: ReturnType<typeof frame>) => socket.fireMessage(f) };
    }
    const prices = () => (tickEvents as { price: number }[]).map((t) => t.price);

    it('is sent as a bar but makes no tick: a late final or a stale frame is no live price', () => {
      const { send } = feed();
      send(frame(10, 101));
      send(frame(9, 94, true)); // the venue's final of the bar before
      send(frame(7, 90)); // a stale frame, late
      send(frame(10, 102));
      send(frame(10, 103, true));
      send(frame(11, 104));
      expect(barEvents).toHaveLength(6);
      expect(prices()).toEqual([101, 102, 103, 104]);
    });

    it('is counted again from a new connection', () => {
      const { adapter, send, socket } = feed();
      send(frame(10, 101));
      adapter.disconnect();
      adapter.connect(CONFIG);
      socket.fireOpen();
      send(frame(9, 99)); // another stream's newest, or the same after a gap
      expect(prices()).toEqual([101, 99]);
    });

    /** A feed whose history, for any symbol and timeframe, ends on bar `last`. */
    function servedFeed(last: number) {
      const socket = new MockSocket();
      const adapter = new WebSocketAdapter({
        name: 'test',
        wsUrl: () => 'wss://x',
        fetchHistory: async () => [frame(last - 1, 100).bar, frame(last, 101).bar],
        parseMessage: (raw) => raw as WsParseResult,
        socketFactory: () => socket,
      });
      adapter.on('tick', (e) => tickEvents.push(e.data));
      const connect = (config: DataAdapterConfig) => { adapter.connect(config); socket.fireOpen(); };
      return { adapter, connect, send: (f: ReturnType<typeof frame>) => socket.fireMessage(f) };
    }

    it('starts from the last bar of the history it served for the symbol and timeframe: a bar sent again on subscribing is no live price', async () => {
      const { adapter, connect, send } = servedFeed(10);
      expect(await adapter.fetchHistory(CONFIG.symbol, CONFIG.timeframe, 2)).toEqual([frame(9, 100).bar, frame(10, 101).bar]);
      connect(CONFIG);
      send(frame(9, 100, true)); // the last closed bar, sent again on subscribing
      send(frame(10, 102));
      expect(prices()).toEqual([102]);
    });

    it("takes the history's last bar, sent again closed, for no live price: a history of closed bars only", async () => {
      const { adapter, connect, send } = servedFeed(10);
      await adapter.fetchHistory(CONFIG.symbol, CONFIG.timeframe, 2);
      connect(CONFIG);
      send(frame(10, 101, true)); // the history's last, closed, sent again on subscribing
      send(frame(11, 96));
      expect(prices()).toEqual([96]);
    });

    it("takes the close of the history's last bar once a forming frame of it came on the connection", async () => {
      const { adapter, connect, send } = servedFeed(10);
      await adapter.fetchHistory(CONFIG.symbol, CONFIG.timeframe, 2);
      connect(CONFIG);
      send(frame(10, 102)); // the history's last bar was still forming
      send(frame(10, 103, true));
      expect(prices()).toEqual([102, 103]);
    });

    it("takes the history's last bar, closed at another close than the one served, as a live price: it was still forming", async () => {
      const { adapter, connect, send } = servedFeed(10);
      await adapter.fetchHistory(CONFIG.symbol, CONFIG.timeframe, 2);
      connect(CONFIG);
      send(frame(10, 104, true)); // its final, the first frame on the connection
      expect(prices()).toEqual([104]);
    });

    it("doesn't start from the history of another symbol or timeframe", async () => {
      const { adapter, connect, send } = servedFeed(10);
      await adapter.fetchHistory('ETHUSDT', CONFIG.timeframe, 2);
      await adapter.fetchHistory(CONFIG.symbol, '5m', 2);
      connect(CONFIG);
      send(frame(9, 99));
      expect(prices()).toEqual([99]);
    });
  });

  it('ignores messages the parser rejects', () => {
    const { adapter, socket } = makeAdapter(() => null);
    adapter.on('bar', (e) => barEvents.push(e.data as { bar: OHLCBar; closed: boolean }));

    adapter.connect(CONFIG);
    socket.fireOpen();
    socket.fireMessage('not json');
    socket.fireMessage(JSON.stringify({ junk: true }));

    expect(barEvents).toHaveLength(0);
  });

  it('reports disconnected on socket close', () => {
    const { adapter, socket } = makeAdapter(() => null);
    adapter.on('connectionChange', (e) => connEvents.push(e.data));

    adapter.connect(CONFIG);
    socket.fireOpen();
    socket.fireClose();

    expect(adapter.getConnectionState()).toBe('disconnected');
    expect(connEvents).toContain('disconnected');
  });

  it('disconnect closes the socket without triggering reconnect', () => {
    const { adapter, socket } = makeAdapter(() => null);
    adapter.connect(CONFIG);
    socket.fireOpen();

    adapter.disconnect();
    expect(socket.closed).toBe(true);
    expect(socket.onclose).toBeNull();
    expect(adapter.getConnectionState()).toBe('disconnected');
  });

  it('a socket closed while still connecting cannot leak events into the next connection', () => {
    const { adapter, socket } = makeAdapter(() => ({
      bar: { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    }));
    const errors: unknown[] = [];
    adapter.on('error', (e) => errors.push(e.data));
    adapter.on('connectionChange', (e) => connEvents.push(e.data));
    adapter.on('bar', (e) => barEvents.push(e.data as { bar: OHLCBar; closed: boolean }));

    adapter.connect(CONFIG);
    // Switch away before the handshake completes, as a fast symbol change does.
    adapter.disconnect();
    connEvents = [];

    expect(socket.onopen).toBeNull();
    expect(socket.onmessage).toBeNull();
    expect(socket.onerror).toBeNull();
    // What the browser does next to the abandoned socket must go nowhere.
    socket.onerror?.(undefined);
    socket.fireMessage('{}');
    socket.fireOpen();
    expect(errors).toHaveLength(0);
    expect(barEvents).toHaveLength(0);
    expect(connEvents).toHaveLength(0);
  });

  it('delegates fetchHistory to the supplied fetcher', async () => {
    const { adapter, history } = makeAdapter(() => null);
    await expect(adapter.fetchHistory('BTCUSDT', '1m', 10)).resolves.toEqual(history);
  });

  it('pages older history only when given a fetcher for it', async () => {
    const { adapter } = makeAdapter(() => null);
    expect(adapter.fetchHistoryBefore).toBeUndefined();

    const older: OHLCBar[] = [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
    const fetchHistoryBefore = vi.fn().mockResolvedValue(older);
    const paging = new WebSocketAdapter({
      name: 'paging',
      wsUrl: () => 'wss://example',
      fetchHistory: vi.fn().mockResolvedValue([]),
      fetchHistoryBefore,
      parseMessage: () => null,
      socketFactory: () => new MockSocket(),
    });
    await expect(paging.fetchHistoryBefore?.('BTCUSDT', '1m', 60_000, 100)).resolves.toEqual(older);
    expect(fetchHistoryBefore).toHaveBeenCalledWith('BTCUSDT', '1m', 60_000, 100);
  });
});
