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

  it('delegates fetchHistory to the supplied fetcher', async () => {
    const { adapter, history } = makeAdapter(() => null);
    await expect(adapter.fetchHistory('BTCUSDT', '1m', 10)).resolves.toEqual(history);
  });
});
