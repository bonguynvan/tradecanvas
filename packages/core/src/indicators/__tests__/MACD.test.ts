import { describe, it, expect } from 'vitest';
import { MACDIndicator } from '../panel/MACD.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('MACDIndicator', () => {
  const macd = new MACDIndicator();
  const params = { fast: 12, slow: 26, signal: 9 };

  it('returns empty output when data length < slow', () => {
    const data = bars(Array.from({ length: 10 }, (_, i) => 100 + i));
    const { values } = macd.calculate(data, indicatorConfig('macd', params));
    expect(values.size).toBe(0);
  });

  it('produces macd, signal and histogram fields once warmed up', () => {
    const data = bars(Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5));
    const { series } = macd.calculate(data, indicatorConfig('macd', params));

    const last = series![series!.length - 1];
    expect(last).not.toBeNull();
    expect(last!.macd).toBeDefined();
    expect(last!.signal).toBeDefined();
    expect(last!.histogram).toBeDefined();
    expect(last!.histogram).toBeCloseTo(last!.macd! - last!.signal!, 10);
  });

  it('macd is positive on a sustained uptrend (fast EMA > slow EMA)', () => {
    const data = bars(Array.from({ length: 80 }, (_, i) => 100 + i));
    const { series } = macd.calculate(data, indicatorConfig('macd', params));
    const last = series![series!.length - 1];
    expect(last!.macd!).toBeGreaterThan(0);
  });

  it('macd is negative on a sustained downtrend (fast EMA < slow EMA)', () => {
    const data = bars(Array.from({ length: 80 }, (_, i) => 200 - i));
    const { series } = macd.calculate(data, indicatorConfig('macd', params));
    const last = series![series!.length - 1];
    expect(last!.macd!).toBeLessThan(0);
  });

  it('first non-null index is at slow - 1', () => {
    const data = bars(Array.from({ length: 60 }, (_, i) => 100 + i));
    const { series } = macd.calculate(data, indicatorConfig('macd', params));
    const firstIdx = series!.findIndex((v) => v !== null);
    expect(firstIdx).toBe(params.slow - 1);
  });
});
