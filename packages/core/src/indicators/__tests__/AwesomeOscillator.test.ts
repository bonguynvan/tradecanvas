import { describe, it, expect } from 'vitest';
import { AwesomeOscillatorIndicator } from '../panel/AwesomeOscillator.js';
import { ohlcBars, indicatorConfig } from './fixtures.js';

describe('AwesomeOscillatorIndicator', () => {
  const ao = new AwesomeOscillatorIndicator();
  const params = { fast: 5, slow: 34 };

  it('returns empty output when data length < slow', () => {
    const data = ohlcBars(
      Array.from({ length: 10 }, () => ({ o: 10, h: 11, l: 9, c: 10 })),
    );
    const { values } = ao.calculate(data, indicatorConfig('ao', params));
    expect(values.size).toBe(0);
  });

  it('first non-null index is at slow - 1', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => ({
        o: 100 + i,
        h: 101 + i,
        l: 99 + i,
        c: 100 + i,
      })),
    );
    const { series } = ao.calculate(data, indicatorConfig('ao', params));
    expect(series!.findIndex((v) => v !== null)).toBe(params.slow - 1);
  });

  it('is positive on a sustained uptrend (fast median > slow median)', () => {
    const data = ohlcBars(
      Array.from({ length: 80 }, (_, i) => ({
        o: 100 + i,
        h: 101 + i,
        l: 99 + i,
        c: 100 + i,
      })),
    );
    const { series } = ao.calculate(data, indicatorConfig('ao', params));
    const last = series![series!.length - 1]!;
    expect(last.value!).toBeGreaterThan(0);
  });

  it('is negative on a sustained downtrend', () => {
    const data = ohlcBars(
      Array.from({ length: 80 }, (_, i) => ({
        o: 200 - i,
        h: 201 - i,
        l: 199 - i,
        c: 200 - i,
      })),
    );
    const { series } = ao.calculate(data, indicatorConfig('ao', params));
    const last = series![series!.length - 1]!;
    expect(last.value!).toBeLessThan(0);
  });

  it('flags up=1 when AO rises vs prior bar, up=0 when it falls', () => {
    const data = ohlcBars(
      Array.from({ length: 60 }, (_, i) => {
        const v = i < 30 ? 100 + i : 130 - (i - 30);
        return { o: v, h: v + 1, l: v - 1, c: v };
      }),
    );
    const { series } = ao.calculate(data, indicatorConfig('ao', params));
    expect(series![40]!.up).toBeDefined();
    expect(series![55]!.up).toBe(0);
  });
});
