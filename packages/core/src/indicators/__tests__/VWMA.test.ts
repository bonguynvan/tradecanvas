import { describe, it, expect } from 'vitest';
import { VWMAIndicator } from '../overlay/VWMA.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('VWMAIndicator', () => {
  const vwma = new VWMAIndicator();

  it('weights the average toward the bar with more volume', () => {
    // period 2: bar0 close=10 vol=1, bar1 close=20 vol=9 -> heavily weighted toward 20.
    const data = ohlcBars([
      { o: 10, h: 10, l: 10, c: 10, v: 1 },
      { o: 20, h: 20, l: 20, c: 20, v: 9 },
    ]);
    const { series } = vwma.calculate(data, indicatorConfig('vwma', { period: 2 }));

    expect(series![0]).toBeNull();
    expect(series![1]?.value).toBeCloseTo((10 * 1 + 20 * 9) / 10);
  });

  it('matches a simple average when volume is uniform', () => {
    const data = ohlcBars([
      { o: 1, h: 1, l: 1, c: 1, v: 5 },
      { o: 2, h: 2, l: 2, c: 2, v: 5 },
      { o: 3, h: 3, l: 3, c: 3, v: 5 },
    ]);
    const { series } = vwma.calculate(data, indicatorConfig('vwma', { period: 3 }));
    expect(series![2]?.value).toBeCloseTo(2);
  });

  it('skips bars when the trailing window has zero total volume', () => {
    const data = ohlcBars([
      { o: 1, h: 1, l: 1, c: 1, v: 0 },
      { o: 2, h: 2, l: 2, c: 2, v: 0 },
    ]);
    const { values } = vwma.calculate(data, indicatorConfig('vwma', { period: 2 }));
    expect(values.size).toBe(0);
  });
});
