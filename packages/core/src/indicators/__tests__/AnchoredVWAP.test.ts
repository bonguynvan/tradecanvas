import { describe, it, expect } from 'vitest';
import { AnchoredVWAPIndicator } from '../overlay/AnchoredVWAP.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('AnchoredVWAPIndicator', () => {
  const avwap = new AnchoredVWAPIndicator();

  it('matches a manual VWAP calc from the anchor bar onward', () => {
    const rows = [
      { o: 10, h: 11, l: 9, c: 10, v: 100 },
      { o: 10, h: 12, l: 10, c: 11, v: 200 },
      { o: 11, h: 13, l: 10, c: 12, v: 300 },
      { o: 12, h: 14, l: 11, c: 13, v: 400 },
    ];
    const data = ohlcBars(rows);
    const anchorTime = data[1].time;
    const { series } = avwap.calculate(
      data,
      indicatorConfig('avwap', { anchorTime }),
    );

    expect(series![0]).toBeNull();

    const tp = (r: { h: number; l: number; c: number }) => (r.h + r.l + r.c) / 3;
    let cumPV = 0;
    let cumV = 0;
    for (let i = 1; i < rows.length; i++) {
      cumPV += tp(rows[i]) * rows[i].v;
      cumV += rows[i].v;
      expect(series![i]?.value).toBeCloseTo(cumPV / cumV);
    }
  });

  it('returns empty output when anchorTime is past the last bar', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 10, h: 11, l: 9, c: 10, v: 1 })),
    );
    const { values } = avwap.calculate(
      data,
      indicatorConfig('avwap', { anchorTime: data[4].time + 10_000_000 }),
    );
    expect(values.size).toBe(0);
  });

  it('falls back to full-history VWAP when anchorTime is 0', () => {
    const rows = [
      { o: 10, h: 11, l: 9, c: 10, v: 100 },
      { o: 10, h: 12, l: 10, c: 11, v: 200 },
    ];
    const data = ohlcBars(rows);
    const { series } = avwap.calculate(data, indicatorConfig('avwap', { anchorTime: 0 }));
    expect(series![0]).not.toBeNull();
    expect(series![1]).not.toBeNull();
  });
});
