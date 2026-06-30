import { describe, it, expect } from 'vitest';
import {
  parseKrakenWsMessage,
  parseKrakenOhlc,
  parseKrakenOhlcRow,
  krakenInterval,
} from '../KrakenAdapter.js';

describe('KrakenAdapter parsing', () => {
  it('parses a v2 ohlc frame: interval_begin ISO → ms, numeric OHLC', () => {
    const begin = '2023-11-14T22:13:20.000000Z';
    const r = parseKrakenWsMessage({
      channel: 'ohlc',
      type: 'update',
      data: [
        {
          symbol: 'BTC/USD',
          open: 10,
          high: 12,
          low: 9,
          close: 11,
          vwap: 10.5,
          trades: 3,
          volume: 5,
          interval_begin: begin,
          interval: 1,
        },
      ],
    });
    expect(r).toEqual({
      bar: { time: Date.parse(begin), open: 10, high: 12, low: 9, close: 11, volume: 5 },
      closed: false,
    });
  });

  it('ignores non-ohlc channels and acks', () => {
    expect(parseKrakenWsMessage({ channel: 'heartbeat' })).toBeNull();
    expect(parseKrakenWsMessage({ method: 'subscribe', success: true })).toBeNull();
  });

  it('parses REST result keyed by canonical pair, skipping `last`', () => {
    const bars = parseKrakenOhlc({
      error: [],
      result: {
        XXBTZUSD: [
          [1700000060, '1', '2', '0', '1', '1.5', '9', 3],
          [1700000000, '1', '2', '0', '1', '1.5', '8', 2],
        ],
        last: 1700000060,
      },
    });
    expect(bars.map((b) => b.time)).toEqual([1700000000000, 1700000060000]);
  });

  it('parses a REST row [time, o, h, l, c, vwap, volume, count] (volume at idx 6)', () => {
    expect(parseKrakenOhlcRow([1700000000, '10', '12', '9', '11', '10.5', '5', 3])).toEqual({
      time: 1700000000000,
      open: 10,
      high: 12,
      low: 9,
      close: 11,
      volume: 5,
    });
  });

  it('maps timeframes to interval minutes', () => {
    expect(krakenInterval('1m')).toBe(1);
    expect(krakenInterval('4h')).toBe(240);
    expect(krakenInterval('1d')).toBe(1440);
  });
});
