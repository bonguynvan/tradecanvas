import { describe, it, expect } from 'vitest';
import { KeltnerChannelIndicator } from '../overlay/KeltnerChannel.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('KeltnerChannelIndicator', () => {
  const kc = new KeltnerChannelIndicator();
  const params = { emaPeriod: 20, atrPeriod: 10, multiplier: 1.5 };

  it('returns empty output when data length is below the longest period', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = kc.calculate(data, indicatorConfig('kc', params));
    expect(values.size).toBe(0);
  });

  it('first non-null index equals max(emaPeriod, atrPeriod) - 1', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 102 + i,
        l: 99 + i,
        c: 101 + i,
      })),
    );
    const { series } = kc.calculate(data, indicatorConfig('kc', params));
    expect(series!.findIndex((v) => v !== null)).toBe(
      Math.max(params.emaPeriod, params.atrPeriod) - 1,
    );
  });

  it('preserves upper > middle > lower', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + Math.sin(i),
        h: 101 + Math.sin(i),
        l: 99 + Math.sin(i),
        c: 100 + Math.sin(i + 0.5),
      })),
    );
    const { series } = kc.calculate(data, indicatorConfig('kc', params));
    const last = series![data.length - 1]!;
    expect(last.upper!).toBeGreaterThan(last.middle!);
    expect(last.middle!).toBeGreaterThan(last.lower!);
  });

  it('band width scales linearly with multiplier', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100,
        h: 105 + (i % 3),
        l: 95 - (i % 3),
        c: 100 + (i % 5) - 2,
      })),
    );
    const a = kc.calculate(data, indicatorConfig('kc', { ...params, multiplier: 1 }));
    const b = kc.calculate(data, indicatorConfig('kc', { ...params, multiplier: 2 }));
    const lastA = a.series![data.length - 1]!;
    const lastB = b.series![data.length - 1]!;
    const widthA = lastA.upper! - lastA.lower!;
    const widthB = lastB.upper! - lastB.lower!;
    expect(widthB).toBeCloseTo(widthA * 2, 6);
  });

  it('on a flat repeated bar the bands stay symmetric around the EMA', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, () => ({ o: 100, h: 102.5, l: 97.5, c: 100 })),
    );
    const { series } = kc.calculate(data, indicatorConfig('kc', params));
    const last = series![data.length - 1]!;
    expect(last.middle!).toBeCloseTo(100, 4);
    expect(last.upper! - last.middle!).toBeCloseTo(last.middle! - last.lower!, 6);
  });
});
