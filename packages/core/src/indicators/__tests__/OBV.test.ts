import { describe, it, expect } from 'vitest';
import { OBVIndicator } from '../panel/OBV.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('OBVIndicator', () => {
  const obv = new OBVIndicator();

  it('starts at 0 on the first bar', () => {
    const data = ohlcBars([{ o: 100, h: 100, l: 100, c: 100, v: 50 }]);
    const { series } = obv.calculate(data, indicatorConfig('obv', {}));
    expect(series![0]?.value).toBe(0);
  });

  it('adds volume on up-bars and subtracts on down-bars', () => {
    const data = ohlcBars([
      { o: 100, h: 100, l: 100, c: 100, v: 10 },
      { o: 100, h: 101, l: 100, c: 101, v: 20 }, // up → +20
      { o: 101, h: 101, l: 100, c: 100, v: 15 }, // down → -15
      { o: 100, h: 100, l: 100, c: 100, v: 30 }, // flat → unchanged
    ]);
    const { series } = obv.calculate(data, indicatorConfig('obv', {}));
    expect(series![0]?.value).toBe(0);
    expect(series![1]?.value).toBe(20);
    expect(series![2]?.value).toBe(5);
    expect(series![3]?.value).toBe(5);
  });

  it('is monotonically increasing on a sustained uptrend', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i,
        l: 100 + i,
        c: 100 + i + 1,
        v: 10,
      })),
    );
    const { series } = obv.calculate(data, indicatorConfig('obv', {}));
    for (let i = 2; i < series!.length; i++) {
      expect(series![i]!.value!).toBeGreaterThan(series![i - 1]!.value!);
    }
  });

  it('returns empty output for empty input', () => {
    const { values, series } = obv.calculate([], indicatorConfig('obv', {}));
    expect(values.size).toBe(0);
    expect(series).toEqual([]);
  });
});
