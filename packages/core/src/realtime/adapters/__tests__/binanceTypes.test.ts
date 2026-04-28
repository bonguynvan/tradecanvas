import { describe, it, expect } from 'vitest';
import { parseRestKline, parseWsKline } from '../binanceTypes.js';

describe('parseRestKline', () => {
  const validKline = [
    1700000000000, '101.5', '102.3', '100.1', '101.9', '12345.67',
    1700000059999, '1234567.89', 250, '500.0', '50000.0', '0',
  ];

  it('parses a well-formed kline tuple', () => {
    expect(parseRestKline(validKline)).toEqual({
      time: 1700000000000,
      open: 101.5,
      high: 102.3,
      low: 100.1,
      close: 101.9,
      volume: 12345.67,
    });
  });

  it('rejects non-array inputs', () => {
    expect(parseRestKline(null)).toBeNull();
    expect(parseRestKline(undefined)).toBeNull();
    expect(parseRestKline({})).toBeNull();
    expect(parseRestKline('hello')).toBeNull();
  });

  it('rejects arrays that are too short', () => {
    expect(parseRestKline([1700000000000, '101', '102', '100', '101'])).toBeNull();
  });

  it('rejects when openTime is not a finite number', () => {
    const bad = [...validKline];
    bad[0] = 'not-a-number';
    expect(parseRestKline(bad)).toBeNull();
    bad[0] = NaN;
    expect(parseRestKline(bad)).toBeNull();
    bad[0] = Infinity;
    expect(parseRestKline(bad)).toBeNull();
  });

  it('rejects when any price field fails to parse', () => {
    const bad = [...validKline];
    bad[2] = 'NaN';
    expect(parseRestKline(bad)).toBeNull();
    bad[2] = '102.3';
    bad[5] = 'abc';
    expect(parseRestKline(bad)).toBeNull();
  });

  it('accepts numeric (already-parsed) price fields', () => {
    const numeric = [1700000000000, 101.5, 102.3, 100.1, 101.9, 12345.67, 0];
    expect(parseRestKline(numeric)?.close).toBe(101.9);
  });
});

describe('parseWsKline', () => {
  const valid = {
    t: 1700000000000,
    T: 1700000059999,
    s: 'BTCUSDT',
    i: '1m',
    o: '101.5',
    c: '101.9',
    h: '102.3',
    l: '100.1',
    v: '12345.67',
    n: 250,
    x: true,
  };

  it('parses a well-formed payload and reports the closed flag', () => {
    const parsed = parseWsKline(valid);
    expect(parsed).not.toBeNull();
    expect(parsed!.closed).toBe(true);
    expect(parsed!.bar).toEqual({
      time: 1700000000000,
      open: 101.5,
      high: 102.3,
      low: 100.1,
      close: 101.9,
      volume: 12345.67,
    });
  });

  it('defaults closed to false when the flag is missing or non-boolean', () => {
    const noFlag = { ...valid, x: undefined };
    expect(parseWsKline(noFlag)?.closed).toBe(false);
    const wrongType = { ...valid, x: 'true' };
    expect(parseWsKline(wrongType)?.closed).toBe(false);
  });

  it('rejects when the payload is not an object', () => {
    expect(parseWsKline(null)).toBeNull();
    expect(parseWsKline('payload')).toBeNull();
    expect(parseWsKline([])).toBeNull();
  });

  it('rejects when a required field is malformed', () => {
    expect(parseWsKline({ ...valid, t: 'oops' })).toBeNull();
    expect(parseWsKline({ ...valid, c: 'not a price' })).toBeNull();
    expect(parseWsKline({ ...valid, v: null })).toBeNull();
  });
});
