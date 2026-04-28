import { describe, it, expect } from 'vitest';
import { ParabolicSARIndicator } from '../overlay/ParabolicSAR.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('ParabolicSARIndicator', () => {
  const psar = new ParabolicSARIndicator();
  const params = { step: 0.02, max: 0.2 };

  it('returns empty output for fewer than 2 bars', () => {
    const data = ohlcBars([{ o: 100, h: 100, l: 100, c: 100 }]);
    const { values } = psar.calculate(data, indicatorConfig('psar', params));
    expect(values.size).toBe(0);
  });

  it('emits a value with trend on every bar (no warmup)', () => {
    const data = ohlcBars(
      Array.from({ length: 20 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
      })),
    );
    const { series } = psar.calculate(data, indicatorConfig('psar', params));
    for (const v of series!) {
      expect(v).not.toBeNull();
      expect(v?.value).toBeDefined();
      expect(v?.trend === 1 || v?.trend === -1).toBe(true);
    }
  });

  it('settles into uptrend (trend = 1) on a sustained rising series', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i + 0.5,
        l: 100 + i - 0.5,
        c: 100 + i,
      })),
    );
    const { series } = psar.calculate(data, indicatorConfig('psar', params));
    expect(series![data.length - 1]!.trend).toBe(1);
  });

  it('settles into downtrend (trend = -1) on a sustained falling series', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 200 - i,
        h: 200 - i + 0.5,
        l: 200 - i - 0.5,
        c: 200 - i,
      })),
    );
    const { series } = psar.calculate(data, indicatorConfig('psar', params));
    expect(series![data.length - 1]!.trend).toBe(-1);
  });

  it('SAR sits below price on an uptrend and above on a downtrend', () => {
    const up = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i + 0.5,
        l: 100 + i - 0.5,
        c: 100 + i,
      })),
    );
    const down = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 200 - i,
        h: 200 - i + 0.5,
        l: 200 - i - 0.5,
        c: 200 - i,
      })),
    );

    const upRes = psar.calculate(up, indicatorConfig('psar', params));
    const downRes = psar.calculate(down, indicatorConfig('psar', params));
    const upLast = upRes.series![up.length - 1]!;
    const downLast = downRes.series![down.length - 1]!;

    expect(upLast.value!).toBeLessThan(up[up.length - 1].close);
    expect(downLast.value!).toBeGreaterThan(down[down.length - 1].close);
  });
});
