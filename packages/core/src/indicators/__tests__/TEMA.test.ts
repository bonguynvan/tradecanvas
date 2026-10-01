import { describe, it, expect } from 'vitest';
import { TEMAIndicator } from '../overlay/TEMA.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('TEMAIndicator', () => {
  const tema = new TEMAIndicator();

  it('converges to a flat input once warmed up (3*EMA1 - 3*EMA2 + EMA3 cancels out)', () => {
    const data = bars(Array(30).fill(100));
    const { series } = tema.calculate(data, indicatorConfig('tema', { period: 3 }));
    expect(series![29]?.value).toBeCloseTo(100, 6);
  });

  it('needs roughly 3x the warm-up of a single EMA pass before emitting', () => {
    const data = bars(Array.from({ length: 10 }, (_, i) => i + 1));
    const { series } = tema.calculate(data, indicatorConfig('tema', { period: 3 }));
    // period 3 -> EMA1 warms up at index 2, EMA2 at 4, EMA3 at 6.
    expect(series![5]).toBeNull();
    expect(series![6]?.value).not.toBeNull();
  });

  it('returns no values when data never completes the triple warm-up', () => {
    const data = bars([1, 2, 3, 4]);
    const { values } = tema.calculate(data, indicatorConfig('tema', { period: 3 }));
    expect(values.size).toBe(0);
  });
});
