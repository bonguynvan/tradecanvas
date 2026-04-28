import { describe, it, expect } from 'vitest';
import { RSIIndicator } from '../panel/RSI.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('RSIIndicator', () => {
  const rsi = new RSIIndicator();

  it('returns empty output when data length <= period', () => {
    const data = bars([1, 2, 3]);
    const { values, series } = rsi.calculate(data, indicatorConfig('rsi', { period: 14 }));
    expect(values.size).toBe(0);
    expect(series!.every((v) => v === null)).toBe(true);
  });

  it('saturates at 100 for a strictly increasing series', () => {
    const data = bars(Array.from({ length: 30 }, (_, i) => i + 1));
    const { series } = rsi.calculate(data, indicatorConfig('rsi', { period: 14 }));
    expect(series![29]?.value).toBeCloseTo(100, 6);
  });

  it('saturates at 0 for a strictly decreasing series', () => {
    const data = bars(Array.from({ length: 30 }, (_, i) => 100 - i));
    const { series } = rsi.calculate(data, indicatorConfig('rsi', { period: 14 }));
    expect(series![29]?.value).toBeCloseTo(0, 6);
  });

  it('first non-null index equals the period', () => {
    const data = bars(Array.from({ length: 30 }, (_, i) => Math.sin(i) * 10 + 100));
    const { series } = rsi.calculate(data, indicatorConfig('rsi', { period: 14 }));
    const firstIdx = series!.findIndex((v) => v !== null);
    expect(firstIdx).toBe(14);
  });
});
