import { describe, it, expect, vi, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { BinanceAdapter } from '../BinanceAdapter.js';

class FakeSocket {
  static all: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  close() {}
}

const MINUTE = 60_000;
const T = Date.UTC(2026, 0, 5);

/** A kline frame for the bar `slot` minutes after T, all its prices at `close`. */
function kline(slot: number, close: number, closed = false) {
  const c = String(close);
  return JSON.stringify({ e: 'kline', k: { t: T + slot * MINUTE, o: c, h: c, l: c, c, v: '3', x: closed } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeSocket.all = [];
});

function connected() {
  vi.stubGlobal('WebSocket', FakeSocket);
  const adapter = new BinanceAdapter({ wsBase: 'wss://ws/ws' });
  const bars: { bar: OHLCBar; closed: boolean }[] = [];
  const prices: number[] = [];
  adapter.on<{ bar: OHLCBar; closed: boolean }>('bar', (e) => bars.push(e.data));
  adapter.on<{ price: number }>('tick', (e) => prices.push(e.data.price));
  adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
  const send = (frame: string) => FakeSocket.all.at(-1)!.onmessage?.({ data: frame });
  return { adapter, bars, prices, send };
}

describe('BinanceAdapter klines', () => {
  it('makes a tick from a frame of the newest bar, or a newer one, only', () => {
    const { bars, prices, send } = connected();
    send(kline(10, 101));
    send(kline(9, 94, true)); // the final of the bar before, after the next one's first frame
    send(kline(7, 90)); // a stale frame
    send(kline(10, 102, true));
    send(kline(11, 103));
    expect(bars.map((b) => b.bar.close)).toEqual([101, 94, 90, 102, 103]);
    expect(prices).toEqual([101, 102, 103]);
  });

  it('counts the newest bar again from a new connection', () => {
    const { adapter, prices, send } = connected();
    send(kline(10, 101));
    adapter.disconnect();
    adapter.connect({ symbol: 'ETHUSDT', timeframe: '1m' });
    send(kline(9, 99));
    expect(prices).toEqual([101, 99]);
  });

  /** An adapter connected after serving a history of klines 9 and 10, both at 100. */
  async function served() {
    const rest = [9, 10].map((slot) => [T + slot * MINUTE, '100', '100', '100', '100', '3']);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => rest })));
    vi.stubGlobal('WebSocket', FakeSocket);
    const adapter = new BinanceAdapter({ restBase: 'https://rest', wsBase: 'wss://ws/ws' });
    const prices: number[] = [];
    adapter.on<{ price: number }>('tick', (e) => prices.push(e.data.price));
    await adapter.fetchHistory('BTCUSDT', '1m', 2);
    adapter.connect({ symbol: 'BTCUSDT', timeframe: '1m' });
    const send = (frame: string) => FakeSocket.all.at(-1)!.onmessage?.({ data: frame });
    return { prices, send };
  }

  it('starts from the last kline of the history it served for the symbol and interval', async () => {
    const { prices, send } = await served();
    send(kline(9, 99, true)); // the last closed kline, sent again on subscribing
    send(kline(10, 102));
    expect(prices).toEqual([102]);
  });

  it("makes a tick from the history's last kline closed only at another close than the one served", async () => {
    const { prices, send } = await served();
    send(kline(10, 100, true)); // as served: no newer price
    send(kline(10, 104, true)); // its final: it was still forming when served
    expect(prices).toEqual([104]);
  });
});
