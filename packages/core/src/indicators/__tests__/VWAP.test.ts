import { describe, it, expect } from 'vitest';
import { VWAPIndicator } from '../overlay/VWAP.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('VWAPIndicator', () => {
  const vwap = new VWAPIndicator();

  it('returns no values for an empty series', () => {
    const { values } = vwap.calculate([], indicatorConfig('vwap', {}));
    expect(values.size).toBe(0);
  });

  it('skips bars with zero cumulative volume', () => {
    const data = ohlcBars([{ o: 100, h: 102, l: 98, c: 100, v: 0 }]);
    const { values } = vwap.calculate(data, indicatorConfig('vwap', {}));
    expect(values.size).toBe(0);
  });

  it('matches the manual VWAP calculation across the full history', () => {
    const rows = [
      { o: 10, h: 11, l: 9, c: 10, v: 100 },
      { o: 10, h: 12, l: 10, c: 11, v: 200 },
      { o: 11, h: 13, l: 10, c: 12, v: 300 },
      { o: 12, h: 14, l: 11, c: 13, v: 400 },
    ];
    const data = ohlcBars(rows);
    const { series } = vwap.calculate(data, indicatorConfig('vwap', {}));

    let cumPV = 0;
    let cumV = 0;
    for (let i = 0; i < rows.length; i++) {
      const tp = (rows[i].h + rows[i].l + rows[i].c) / 3;
      cumPV += tp * rows[i].v;
      cumV += rows[i].v;
      expect(series![i]!.value!).toBeCloseTo(cumPV / cumV);
    }
  });

  it('converges to the typical price on a flat repeated bar with non-zero volume', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, () => ({ o: 100, h: 102, l: 98, c: 100, v: 50 })),
    );
    const { series } = vwap.calculate(data, indicatorConfig('vwap', {}));
    const expected = (102 + 98 + 100) / 3;
    expect(series![data.length - 1]!.value!).toBeCloseTo(expected);
  });
});
