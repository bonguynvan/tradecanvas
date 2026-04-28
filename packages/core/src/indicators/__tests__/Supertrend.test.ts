import { describe, it, expect } from 'vitest';
import { SupertrendIndicator } from '../overlay/Supertrend.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('SupertrendIndicator', () => {
  const supertrend = new SupertrendIndicator();
  const params = { period: 10, multiplier: 3 };

  it('returns empty output when data length < period', () => {
    const data = ohlcBars(
      Array.from({ length: 5 }, () => ({ o: 100, h: 102, l: 98, c: 100 })),
    );
    const { values } = supertrend.calculate(data, indicatorConfig('st', params));
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
    const { series } = supertrend.calculate(data, indicatorConfig('st', params));
    expect(series!.findIndex((v) => v !== null)).toBe(params.period - 1);
  });

  it('reports trend = 1 (up) when price stays above the lower band', () => {
    // Strong, smooth uptrend → ATR small, hl2 + 3*ATR sits well above price → trend stays up.
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 100 + i,
        h: 100 + i + 0.5,
        l: 100 + i - 0.5,
        c: 100 + i,
      })),
    );
    const { series } = supertrend.calculate(data, indicatorConfig('st', params));
    const last = series![data.length - 1]!;
    expect(last.trend).toBe(1);
  });

  it('reports trend = -1 (down) on a sustained downtrend', () => {
    const data = ohlcBars(
      Array.from({ length: 40 }, (_, i) => ({
        o: 200 - i,
        h: 200 - i + 0.5,
        l: 200 - i - 0.5,
        c: 200 - i,
      })),
    );
    const { series } = supertrend.calculate(data, indicatorConfig('st', params));
    const last = series![data.length - 1]!;
    expect(last.trend).toBe(-1);
  });

  it('the supertrend value sits below price on an uptrend and above on a downtrend', () => {
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

    const upRes = supertrend.calculate(up, indicatorConfig('st', params));
    const downRes = supertrend.calculate(down, indicatorConfig('st', params));
    const upLast = upRes.series![up.length - 1]!;
    const downLast = downRes.series![down.length - 1]!;

    expect(upLast.value!).toBeLessThan(up[up.length - 1].close);
    expect(downLast.value!).toBeGreaterThan(down[down.length - 1].close);
  });
});
