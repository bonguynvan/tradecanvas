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
});
