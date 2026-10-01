import { describe, it, expect } from 'vitest';
import { WMAIndicator } from '../overlay/WMA.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('WMAIndicator', () => {
  const wma = new WMAIndicator();

  it('weights the most recent bar highest', () => {
    // period 3, window [1, 2, 3], weights 1,2,3 -> (1*1+2*2+3*3)/6 = 14/6.
    const data = bars([1, 2, 3]);
    const { series } = wma.calculate(data, indicatorConfig('wma', { period: 3 }));
    expect(series![0]).toBeNull();
    expect(series![1]).toBeNull();
    expect(series![2]?.value).toBeCloseTo(14 / 6);
  });

  it('slides the window correctly on the next bar', () => {
    // window [2, 3, 4] -> (2*1+3*2+4*3)/6 = 20/6.
    const data = bars([1, 2, 3, 4]);
    const { series } = wma.calculate(data, indicatorConfig('wma', { period: 3 }));
    expect(series![3]?.value).toBeCloseTo(20 / 6);
  });

  it('matches a simple average when the input is flat', () => {
    const data = bars(Array(10).fill(50));
    const { series } = wma.calculate(data, indicatorConfig('wma', { period: 5 }));
    expect(series![9]?.value).toBeCloseTo(50);
  });

  it('returns no values when data is shorter than the period', () => {
    const data = bars([1, 2]);
    const { values } = wma.calculate(data, indicatorConfig('wma', { period: 5 }));
    expect(values.size).toBe(0);
  });
});
