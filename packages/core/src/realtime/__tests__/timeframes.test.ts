import { describe, it, expect } from 'vitest';
import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import {
  parseTimeframe,
  isTimeFrame,
  timeframeToMs,
  timeframeBucketStart,
  resampleBars,
  pickBaseTimeframe,
} from '@tradecanvas/commons';

const MIN = 60_000;

describe('parseTimeframe', () => {
  it('reads a count and a unit', () => {
    expect(parseTimeframe('7m')).toEqual({ count: 7, unit: 'm' });
    expect(parseTimeframe('90m')).toEqual({ count: 90, unit: 'm' });
    expect(parseTimeframe('3M')).toEqual({ count: 3, unit: 'M' });
    expect(parseTimeframe('15s')).toEqual({ count: 15, unit: 's' });
  });

  it.each(['', 'm', '0m', '-3m', '1.5m', '7x', ' 7m', '7m ', '1e3m', '07m'])('rejects %j', (value) => {
    expect(parseTimeframe(value)).toBeNull();
    expect(isTimeFrame(value)).toBe(false);
  });
});

describe('timeframeToMs', () => {
  it('handles any count of a unit', () => {
    expect(timeframeToMs('7m')).toBe(7 * MIN);
    expect(timeframeToMs('90m')).toBe(90 * MIN);
    expect(timeframeToMs('5d')).toBe(5 * 86_400_000);
  });

  it('keeps the values of the built-in timeframes', () => {
    expect(timeframeToMs('1M')).toBe(2_592_000_000);
    expect(timeframeToMs('12M')).toBe(31_536_000_000);
  });

  it('is NaN for something that is not a timeframe', () => {
    expect(timeframeToMs('7x' as TimeFrame)).toBeNaN();
  });
});

describe('timeframeBucketStart with custom timeframes', () => {
  it('floors to multiples of the timeframe since the epoch', () => {
    expect(timeframeBucketStart(20 * MIN + 5_000, '7m')).toBe(14 * MIN);
    expect(timeframeBucketStart(181 * MIN, '90m')).toBe(180 * MIN);
  });

  it('groups months into calendar spans', () => {
    // 2025-05-10 lands in the May–June pair of a 2-month frame.
    expect(timeframeBucketStart(Date.UTC(2025, 4, 10), '2M')).toBe(Date.UTC(2025, 4, 1));
  });
});

const bar = (time: number, open: number, high: number, low: number, close: number, volume = 1): OHLCBar =>
  ({ time, open, high, low, close, volume });

describe('resampleBars', () => {
  it('merges bars per bucket: first open, extremes, last close, summed volume', () => {
    const bars = [
      bar(0, 10, 11, 9, 10.5, 1),
      bar(MIN, 10.5, 12, 10, 11, 2),
      bar(2 * MIN, 11, 11.5, 8, 9, 3),
      bar(3 * MIN, 9, 10, 9, 9.5, 4),
    ];
    expect(resampleBars(bars, '3m')).toEqual([
      bar(0, 10, 12, 8, 9, 6),
      bar(3 * MIN, 9, 10, 9, 9.5, 4),
    ]);
  });

  it('returns an empty series for no bars', () => {
    expect(resampleBars([], '7m')).toEqual([]);
  });
});

describe('pickBaseTimeframe', () => {
  const binance: TimeFrame[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

  it.each([
    ['7m', '1m'],
    ['10m', '5m'],
    ['45m', '15m'],
    ['90m', '30m'],
    ['3h', '1h'],
    ['2d', '1d'],
    ['6d', '3d'],
    ['2w', '1w'],
    ['3M', '1M'],
    ['12M', '1M'],
  ] as [TimeFrame, TimeFrame][])('builds %s from %s', (target, base) => {
    expect(pickBaseTimeframe(target, binance)).toBe(base);
  });

  it('builds weeks and months from days when that is the closest', () => {
    expect(pickBaseTimeframe('1w', ['1m', '1h', '1d'])).toBe('1d');
    expect(pickBaseTimeframe('2M', ['1h', '1d'])).toBe('1d');
  });

  it('never builds a month from bars that can straddle a month boundary', () => {
    expect(pickBaseTimeframe('1M', ['3d'])).toBeNull();
    expect(pickBaseTimeframe('1w', ['3d'])).toBeNull();
  });

  it('is null when no supported timeframe divides the target', () => {
    expect(pickBaseTimeframe('7m', ['5m', '15m'])).toBeNull();
    expect(pickBaseTimeframe('30s', ['1m'])).toBeNull();
  });
});
