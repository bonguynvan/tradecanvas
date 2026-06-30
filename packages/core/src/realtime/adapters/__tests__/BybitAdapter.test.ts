import { describe, it, expect } from 'vitest';
import {
  parseBybitWsMessage,
  parseBybitRestKlines,
  parseBybitRestRow,
  bybitInterval,
} from '../BybitAdapter.js';

describe('BybitAdapter parsing', () => {
  it('parses a WS kline frame: confirm → closed, start → ms time, string OHLC', () => {
    const r = parseBybitWsMessage({
      topic: 'kline.1.BTCUSDT',
      type: 'snapshot',
      ts: 1,
      data: [
        {
          start: 1700000000000,
          end: 1700000059999,
          interval: '1',
          open: '10',
          high: '12',
          low: '9',
          close: '11',
          volume: '5',
          turnover: '50',
          confirm: true,
          timestamp: 1,
        },
      ],
    });
    expect(r).toEqual({
      bar: { time: 1700000000000, open: 10, high: 12, low: 9, close: 11, volume: 5 },
      closed: true,
    });
  });

  it('treats a missing confirm as a forming bar', () => {
    const r = parseBybitWsMessage({
      topic: 'kline.1.BTCUSDT',
      data: [{ start: 1, open: '1', high: '1', low: '1', close: '1', volume: '1' }],
    });
    expect(r?.closed).toBe(false);
  });

  it('ignores non-kline frames', () => {
    expect(parseBybitWsMessage({ success: true, op: 'subscribe' })).toBeNull();
    expect(parseBybitWsMessage({ topic: 'orderbook.1.BTCUSDT', data: [] })).toBeNull();
  });

  it('parses REST list (descending) into ascending bars', () => {
    const bars = parseBybitRestKlines({
      result: {
        list: [
          ['1700000120000', '1', '2', '0', '1', '9', '9'],
          ['1700000060000', '1', '2', '0', '1', '8', '8'],
        ],
      },
    });
    expect(bars.map((b) => b.time)).toEqual([1700000060000, 1700000120000]);
  });

  it('parses a REST row [start, o, h, l, c, vol, turnover]', () => {
    expect(parseBybitRestRow(['1700000000000', '10', '12', '9', '11', '5', '55'])).toEqual({
      time: 1700000000000,
      open: 10,
      high: 12,
      low: 9,
      close: 11,
      volume: 5,
    });
  });

  it('maps timeframes to Bybit interval tokens', () => {
    expect(bybitInterval('1m')).toBe('1');
    expect(bybitInterval('1h')).toBe('60');
    expect(bybitInterval('1d')).toBe('D');
  });
});
