import { describe, it, expect } from 'vitest';
import { SMAIndicator } from '../overlay/SMA.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('SMAIndicator', () => {
  const sma = new SMAIndicator();

  it('emits null until the period is filled, then the simple average', () => {
    const data = bars([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const { series } = sma.calculate(data, indicatorConfig('sma', { period: 3 }));

    expect(series).toBeDefined();
    expect(series![0]).toBeNull();
    expect(series![1]).toBeNull();
    expect(series![2]?.value).toBeCloseTo(2);
    expect(series![3]?.value).toBeCloseTo(3);
    expect(series![9]?.value).toBeCloseTo(9);
  });

  it('keys values map by bar timestamp', () => {
    const data = bars([10, 20, 30, 40]);
    const { values } = sma.calculate(data, indicatorConfig('sma', { period: 2 }));

    expect(values.get(data[0].time)).toBeUndefined();
    expect(values.get(data[1].time)?.value).toBeCloseTo(15);
    expect(values.get(data[3].time)?.value).toBeCloseTo(35);
  });

  it('produces a value for every bar once warmed up', () => {
    const data = bars(Array.from({ length: 50 }, (_, i) => i + 1));
    const { series } = sma.calculate(data, indicatorConfig('sma', { period: 10 }));

    const nullCount = series!.filter((v) => v === null).length;
    expect(nullCount).toBe(9);
  });
});
