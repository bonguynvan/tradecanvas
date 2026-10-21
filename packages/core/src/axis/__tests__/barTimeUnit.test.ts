import { describe, it, expect } from 'vitest';
import { barTimeUnit, barsAreDaily, normalizeBarTime } from '@tradecanvas/commons';

const bars = (times: number[]) => times.map((time) => ({ time }));

describe('barTimeUnit', () => {
  it('reads a series in milliseconds as milliseconds, its bars before 2001 too', () => {
    const series = bars([Date.UTC(2000, 6, 28), Date.UTC(2026, 9, 21)]);
    expect(barTimeUnit(series)).toBe(1);
    // A millisecond time below 1e12 (before 2001-09-09) stays as it is.
    expect(normalizeBarTime(Date.UTC(2000, 6, 28), barTimeUnit(series))).toBe(Date.UTC(2000, 6, 28));
  });

  it('reads a series in seconds as seconds', () => {
    const series = bars([Date.UTC(2000, 6, 28) / 1000, Date.UTC(2026, 9, 21) / 1000]);
    expect(barTimeUnit(series)).toBe(1000);
    expect(normalizeBarTime(series[0].time, 1000)).toBe(Date.UTC(2000, 6, 28));
  });

  it('decides from the newest bar, so the whole series shares one unit', () => {
    // Bars from 1971 in ms (below any per-value cut-off) in a series that runs to today.
    const series = bars([Date.UTC(1971, 0, 4), Date.UTC(1990, 0, 2), Date.UTC(2026, 0, 2)]);
    expect(barTimeUnit(series)).toBe(1);
  });

  it('takes milliseconds when there is nothing to go by', () => {
    expect(barTimeUnit([])).toBe(1);
    expect(barTimeUnit([{ time: Number.NaN }])).toBe(1);
  });
});

describe('normalizeBarTime', () => {
  it('uses the series unit when it is given', () => {
    expect(normalizeBarTime(Date.UTC(1999, 0, 4), 1)).toBe(Date.UTC(1999, 0, 4));
    expect(normalizeBarTime(1_700_000_000, 1000)).toBe(1_700_000_000_000);
  });

  it('on its own, keeps a millisecond time from the 1970s and 80s as milliseconds', () => {
    expect(normalizeBarTime(Date.UTC(1999, 0, 4))).toBe(Date.UTC(1999, 0, 4));
    expect(normalizeBarTime(Date.UTC(1980, 0, 2))).toBe(Date.UTC(1980, 0, 2));
    expect(normalizeBarTime(1_700_000_000)).toBe(1_700_000_000_000);
  });
});

describe('barsAreDaily', () => {
  it('sees daily bars from 2000 in milliseconds as daily', () => {
    expect(barsAreDaily(bars([Date.UTC(2000, 6, 28), Date.UTC(2000, 6, 31), Date.UTC(2000, 7, 1)]))).toBe(true);
    expect(barsAreDaily(bars([Date.UTC(2000, 6, 28), Date.UTC(2000, 6, 28) + 3_600_000]))).toBe(false);
  });
});
