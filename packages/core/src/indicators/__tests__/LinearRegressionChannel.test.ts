import { describe, it, expect } from 'vitest';
import { LinearRegressionChannelIndicator } from '../overlay/LinearRegressionChannel.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('LinearRegressionChannelIndicator', () => {
  const lrc = new LinearRegressionChannelIndicator();

  it('returns empty output when data length < period', () => {
    const data = bars([1, 2, 3]);
    const { values } = lrc.calculate(
      data,
      indicatorConfig('lrc', { period: 10, stdDev: 2 }),
    );
    expect(values.size).toBe(0);
  });

  it('fits a perfect line: middle == close, residual band collapses to zero width', () => {
    const data = bars(Array.from({ length: 30 }, (_, i) => 100 + 2 * i));
    const { series } = lrc.calculate(
      data,
      indicatorConfig('lrc', { period: 20, stdDev: 2 }),
    );
    const last = series![data.length - 1]!;
    expect(last.middle!).toBeCloseTo(data[data.length - 1].close, 6);
    expect(last.upper!).toBeCloseTo(last.middle!, 6);
    expect(last.lower!).toBeCloseTo(last.middle!, 6);
    expect(last.slope!).toBeCloseTo(2, 6);
  });

  it('produces positive band width on noisy data and respects upper > middle > lower', () => {
    const data = bars(
      Array.from({ length: 60 }, (_, i) => 100 + i + (i % 3 === 0 ? 5 : -3)),
    );
    const { series } = lrc.calculate(
      data,
      indicatorConfig('lrc', { period: 30, stdDev: 2 }),
    );
    const last = series![data.length - 1]!;
    expect(last.upper!).toBeGreaterThan(last.middle!);
    expect(last.middle!).toBeGreaterThan(last.lower!);
  });

  it('slope is negative on a downtrend', () => {
    const data = bars(Array.from({ length: 40 }, (_, i) => 200 - i));
    const { series } = lrc.calculate(
      data,
      indicatorConfig('lrc', { period: 30, stdDev: 2 }),
    );
    const last = series![data.length - 1]!;
    expect(last.slope!).toBeLessThan(0);
  });
});
