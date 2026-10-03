import { describe, it, expect, vi, afterEach } from 'vitest';
import { readQuote, type Quote } from '@tradecanvas/commons';
import { BinanceAdapter } from '../BinanceAdapter.js';
import { ResamplingAdapter } from '../ResamplingAdapter.js';
import { MockAdapter } from '../MockAdapter.js';
import { parseMiniTicker, parseRestTicker } from '../binanceTypes.js';

class FakeSocket {
  static all: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  close() {
    this.closed = true;
  }
  send(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const mini = (s: string, c: string, o: string, E = 2000) => ({
  stream: `${s.toLowerCase()}@miniTicker`,
  data: { e: '24hrMiniTicker', E, s, c, o, h: '110', l: '90', v: '5', q: '500' },
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  FakeSocket.all = [];
});

describe('readQuote', () => {
  it('keeps the usable fields and works out the change', () => {
    expect(readQuote({ symbol: ' AAPL ', last: 110, prevClose: 100, volume: Number.NaN, bid: '1' })).toEqual({
      symbol: 'AAPL', last: 110, prevClose: 100, change: 10, changePercent: 10,
    });
    expect(readQuote({ symbol: 'X', last: 5, change: -1 })).toEqual({ symbol: 'X', last: 5, change: -1, changePercent: (-1 / 6) * 100 });
  });

  it('is null for what isn’t a quote', () => {
    for (const raw of [null, 'AAPL', { symbol: 'A' }, { symbol: '', last: 1 }, { symbol: 'A', last: Infinity }, { symbol: 'x'.repeat(65), last: 1 }]) {
      expect(readQuote(raw), JSON.stringify(raw)).toBeNull();
    }
  });
});

describe('Binance quotes', () => {
  it('reads mini-ticker frames and 24 h tickers', () => {
    expect(parseMiniTicker(mini('BTCUSDT', '110', '100'))).toEqual({
      symbol: 'BTCUSDT', last: 110, open: 100, high: 110, low: 90, volume: 5, change: 10, changePercent: 10, time: 2000,
    });
    expect(parseMiniTicker(mini('BTCUSDT', '110', '100').data)?.last).toBe(110);
    expect(parseMiniTicker({ data: { e: 'kline' } })).toBeNull();
    expect(parseRestTicker({
      symbol: 'ETHUSDT', lastPrice: '2000', priceChange: '-20', priceChangePercent: '-0.990', openPrice: '2020',
      highPrice: '2050', lowPrice: '1990', prevClosePrice: '2019', volume: '100', bidPrice: '1999.9', askPrice: '2000.1', closeTime: 5000,
    })).toEqual({
      symbol: 'ETHUSDT', last: 2000, change: -20, changePercent: -0.99, open: 2020, high: 2050, low: 1990,
      prevClose: 2019, volume: 100, bid: 1999.9, ask: 2000.1, time: 5000,
    });
    expect(parseRestTicker({ symbol: 'X', lastPrice: 'abc' })).toBeNull();
  });

  it('sends a snapshot, then the stream, and stops when asked', async () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => [{ symbol: 'BTCUSDT', lastPrice: '100', priceChange: '1', priceChangePercent: '1', closeTime: 1000 }],
    }));
    vi.stubGlobal('fetch', fetch);
    const got: Quote[] = [];
    const stop = new BinanceAdapter({ restBase: 'https://rest', wsBase: 'wss://ws/ws' })
      .subscribeQuotes(['btcusdt', 'ETHUSDT', 'bad symbol!', 'ETHUSDT'], (q) => got.push(...q));

    expect(String(fetch.mock.calls[0][0])).toBe(`https://rest/ticker/24hr?symbols=${encodeURIComponent('["BTCUSDT","ETHUSDT"]')}`);
    const socket = FakeSocket.all[0];
    expect(socket.url).toBe('wss://ws/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker');
    await vi.waitFor(() => expect(got.map((q) => q.last)).toEqual([100]));

    socket.send(mini('ETHUSDT', '2000', '1900'));
    expect(got.at(-1)).toMatchObject({ symbol: 'ETHUSDT', last: 2000 });

    stop();
    expect(socket.closed).toBe(true);
    socket.send(mini('ETHUSDT', '2100', '1900'));
    expect(got.at(-1)?.last).toBe(2000);
  });

  it('keeps a streamed quote over an older snapshot', async () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    let answer: (rows: unknown) => void = () => {};
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => {
      answer = (rows) => resolve({ ok: true, json: async () => rows });
    })));
    const got: Quote[] = [];
    const stop = new BinanceAdapter({ restBase: 'https://rest', wsBase: 'wss://ws/ws' }).subscribeQuotes(['BTCUSDT'], (q) => got.push(...q));
    FakeSocket.all[0].send(mini('BTCUSDT', '105', '100'));
    answer([{ symbol: 'BTCUSDT', lastPrice: '100', closeTime: 1000 }]);
    await new Promise((r) => setTimeout(r, 0));
    expect(got.map((q) => q.last)).toEqual([105]);
    stop();
  });

  it('reconnects a dropped stream while subscribed', () => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => [] })));
    const stop = new BinanceAdapter({ wsBase: 'wss://ws/ws' }).subscribeQuotes(['BTCUSDT'], () => {});
    FakeSocket.all[0].onclose?.();
    vi.advanceTimersByTime(1000);
    expect(FakeSocket.all).toHaveLength(2);
    stop();
    FakeSocket.all[1].onclose?.();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('subscribes to nothing for no usable symbols', () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    new BinanceAdapter().subscribeQuotes(['', 'a b'], () => {})();
    expect(FakeSocket.all).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('quotes through other adapters', () => {
  it('a resampling adapter passes them through', () => {
    const inner = new BinanceAdapter();
    const spy = vi.spyOn(inner, 'subscribeQuotes').mockReturnValue(() => {});
    const outer = new ResamplingAdapter(inner, ['1m']);
    outer.subscribeQuotes?.(['BTCUSDT'], () => {});
    expect(spy).toHaveBeenCalled();
  });

  it('the mock adapter makes up quotes, one walk per symbol', () => {
    vi.useFakeTimers();
    const got: Quote[] = [];
    const stop = new MockAdapter({ basePrice: 100, tickInterval: 1000 }).subscribeQuotes(['AAA', 'BBB'], (q) => got.push(...q));
    expect(got.map((q) => q.symbol)).toEqual(['AAA', 'BBB']);
    vi.advanceTimersByTime(1000);
    expect(got).toHaveLength(4);
    expect(got.every((q) => q.last > 0 && Number.isFinite(q.changePercent!))).toBe(true);
    stop();
    vi.advanceTimersByTime(5000);
    expect(got).toHaveLength(4);
  });
});
