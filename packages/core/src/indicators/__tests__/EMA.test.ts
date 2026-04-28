import { describe, it, expect } from 'vitest';
import { EMAIndicator } from '../overlay/EMA.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('EMAIndicator', () => {
  const ema = new EMAIndicator();

  it('seeds from SMA at the period boundary, then steps with the EMA recurrence', () => {
    const data = bars([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const { series } = ema.calculate(data, indicatorConfig('ema', { period: 3 }));

    expect(series![0]).toBeNull();
    expect(series![1]).toBeNull();
    expect(series![2]?.value).toBeCloseTo(2);
    expect(series![3]?.value).toBeCloseTo(3);
    expect(series![4]?.value).toBeCloseTo(4);
    expect(series![9]?.value).toBeCloseTo(9);
  });

  it('converges toward a flat input', () => {
    const data = bars(Array(50).fill(100));
    const { series } = ema.calculate(data, indicatorConfig('ema', { period: 14 }));
    expect(series![49]?.value).toBeCloseTo(100, 6);
  });

  it('returns no values when data is shorter than the period', () => {
    const data = bars([1, 2]);
    const { values } = ema.calculate(data, indicatorConfig('ema', { period: 5 }));
    expect(values.size).toBe(0);
  });
});
