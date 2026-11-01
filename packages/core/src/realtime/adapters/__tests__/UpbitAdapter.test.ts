import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  UpbitAdapter,
  upbitCandlePath,
  upbitStreamType,
  parseUpbitWsMessage,
  parseUpbitRestCandles,
  decodeUpbitFrame,
  fetchUpbitCandles,
} from '../UpbitAdapter.js';
import type { WebSocketLike } from '../WebSocketAdapter.js';

const candle = (utc: string, o: number, h: number, l: number, c: number, v: number) => ({
  market: 'KRW-BTC',
  candle_date_time_utc: utc,
  candle_date_time_kst: utc,
  opening_price: o,
  high_price: h,
  low_price: l,
  trade_price: c,
  candle_acc_trade_volume: v,
  candle_acc_trade_price: v * c,
  timestamp: 1,
});

describe('UpbitAdapter parsing', () => {
  it('names the REST candles of each timeframe, and none it has not', () => {
    expect(upbitCandlePath('1m')).toBe('minutes/1');
    expect(upbitCandlePath('15m')).toBe('minutes/15');
    expect(upbitCandlePath('1h')).toBe('minutes/60');
    expect(upbitCandlePath('4h')).toBe('minutes/240');
    expect(upbitCandlePath('1d')).toBe('days');
    expect(upbitCandlePath('1w')).toBe('weeks');
    expect(upbitCandlePath('1M')).toBe('months');
    expect(upbitCandlePath('2h')).toBeNull();
  });

  it('streams candles up to four hours, and the day from the ticker', () => {
    expect(upbitStreamType('1m')).toBe('candle.1m');
    expect(upbitStreamType('1h')).toBe('candle.60m');
    expect(upbitStreamType('4h')).toBe('candle.240m');
    expect(upbitStreamType('1d')).toBe('ticker');
    expect(upbitStreamType('1w')).toBeNull();
  });

  it('reads REST candles, newest first, into ascending bars at their UTC start', () => {
    const bars = parseUpbitRestCandles([
      candle('2026-11-01T00:01:00', 2, 3, 1, 2.5, 4),
      candle('2026-11-01T00:00:00', 1, 2, 0.5, 2, 3),
    ]);
    expect(bars).toEqual([
      { time: Date.UTC(2026, 10, 1, 0, 0), open: 1, high: 2, low: 0.5, close: 2, volume: 3 },
      { time: Date.UTC(2026, 10, 1, 0, 1), open: 2, high: 3, low: 1, close: 2.5, volume: 4 },
    ]);
    expect(parseUpbitRestCandles({ error: { name: 'too_many' } })).toEqual([]);
  });

  it('reads a streamed candle as the forming bar', () => {
    const r = parseUpbitWsMessage({ type: 'candle.1m', code: 'KRW-BTC', ...candle('2026-11-01T00:02:00', 5, 6, 4, 5.5, 7) });
    expect(r).toEqual({ bar: { time: Date.UTC(2026, 10, 1, 0, 2), open: 5, high: 6, low: 4, close: 5.5, volume: 7 }, closed: false });
  });

  it('reads the ticker as the day’s bar, the day starting at 00:00 UTC', () => {
    const r = parseUpbitWsMessage({
      type: 'ticker', code: 'KRW-BTC', trade_date: '20261101',
      opening_price: 100, high_price: 120, low_price: 90, trade_price: 110, acc_trade_volume: 12.5,
    });
    expect(r?.bar).toEqual({ time: Date.UTC(2026, 10, 1), open: 100, high: 120, low: 90, close: 110, volume: 12.5 });
  });

  it('ignores the server’s status replies', () => {
    expect(parseUpbitWsMessage({ status: 'UP' })).toBeNull();
    expect(parseUpbitWsMessage({ type: 'orderbook', code: 'KRW-BTC' })).toBeNull();
  });

  it('decodes the binary frames Upbit sends', () => {
    const bytes = new TextEncoder().encode('{"type":"candle.1m"}');
    expect(decodeUpbitFrame(bytes.buffer)).toEqual({ type: 'candle.1m' });
    expect(decodeUpbitFrame('{"status":"UP"}')).toEqual({ status: 'UP' });
  });
});

describe('UpbitAdapter requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for at most 200 candles, before a time when scrolling back, from the base given', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([candle('2026-11-01T00:00:00', 1, 1, 1, 1, 1)])));
    vi.stubGlobal('fetch', fetchMock);
    await fetchUpbitCandles('https://proxy.example/upbit', 'KRW-BTC', '1h', 500, Date.UTC(2026, 10, 1, 9));
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://proxy.example/upbit/v1/candles/minutes/60');
    expect(url.searchParams.get('market')).toBe('KRW-BTC');
    expect(url.searchParams.get('count')).toBe('200');
    expect(url.searchParams.get('to')).toBe('2026-11-01T09:00:00Z');
  });

  it('subscribes with a ticket and the stream of the timeframe', () => {
    const sent: string[] = [];
    const socket: WebSocketLike & { binaryType?: string } = {
      onopen: null, onmessage: null, onerror: null, onclose: null,
      send: (d) => { sent.push(d); }, close: () => {},
    };
    const adapter = new UpbitAdapter({ socketFactory: () => socket });
    adapter.connect({ symbol: 'KRW-ETH', timeframe: '5m' });
    socket.onopen?.({});
    expect(JSON.parse(sent[0])).toEqual([{ ticket: 'tradecanvas' }, { type: 'candle.5m', codes: ['KRW-ETH'] }, { format: 'DEFAULT' }]);
    expect(adapter.supportedTimeframes).toContain('1d');
    expect(adapter.supportedTimeframes).not.toContain('1w');
    adapter.dispose();
  });
});
