import { describe, it, expect } from 'vitest';
import { ATRIndicator } from '../panel/ATR.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('ATRIndicator', () => {
  const atr = new ATRIndicator();

  it('returns empty output when data length < 2', () => {
    const data = ohlcBars([{ o: 10, h: 11, l: 9, c: 10 }]);
    const { values } = atr.calculate(data, indicatorConfig('atr', { period: 14 }));
    expect(values.size).toBe(0);
  });

  it('first non-null index equals period - 1', () => {
    const data = ohlcBars(
      Array.from({ length: 30 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
      })),
    );
    const { series } = atr.calculate(data, indicatorConfig('atr', { period: 14 }));
    expect(series!.findIndex((v) => v !== null)).toBe(13);
  });

  it('equals the high-low spread on a stable repeated bar', () => {
    // Each bar h-l = 5 with no gaps → TR is always 5 → ATR converges to 5.
    const data = ohlcBars(
      Array.from({ length: 30 }, () => ({ o: 100, h: 102.5, l: 97.5, c: 100 })),
    );
    const { series } = atr.calculate(data, indicatorConfig('atr', { period: 14 }));
    const last = series![data.length - 1]!;
    expect(last.value!).toBeCloseTo(5, 6);
  });

  it('captures gap risk via |high − prevClose| and |low − prevClose|', () => {
    // Two bars: first with H=101 L=99 C=100, second with O=110 H=110 L=109 C=110.
    // True range on bar 1 = max(110-109, |110-100|, |109-100|) = 10.
    const data = ohlcBars([
      { o: 100, h: 101, l: 99, c: 100 },
      { o: 110, h: 110, l: 109, c: 110 },
    ]);
    const { series } = atr.calculate(data, indicatorConfig('atr', { period: 2 }));
    const v = series![1]!;
    // ATR(2) = (TR0 + TR1) / 2 = (2 + 10) / 2 = 6
    expect(v.value!).toBeCloseTo(6);
  });

  it('is non-negative on every emitted bar', () => {
    const data = ohlcBars(
      Array.from({ length: 50 }, (_, i) => ({
        o: 100 + i + Math.random(),
        h: 101 + i + Math.random(),
        l: 99 + i - Math.random(),
        c: 100 + i,
      })),
    );
    const { series } = atr.calculate(data, indicatorConfig('atr', { period: 14 }));
    for (const v of series!) {
      if (v !== null) expect(v.value!).toBeGreaterThanOrEqual(0);
    }
  });
});
