import { describe, it, expect } from 'vitest';
import { HullMAIndicator } from '../overlay/HullMA.js';
import { bars, indicatorConfig } from './fixtures.js';

describe('HullMAIndicator', () => {
  const hma = new HullMAIndicator();

  it('returns empty output when data length < period', () => {
    const data = bars([1, 2, 3]);
    const { values } = hma.calculate(data, indicatorConfig('hma', { period: 21 }));
    expect(values.size).toBe(0);
  });

  it('tracks a flat input toward the constant value', () => {
    const data = bars(Array(60).fill(100));
    const { series } = hma.calculate(data, indicatorConfig('hma', { period: 16 }));
    const last = series![series!.length - 1]!;
    expect(last.value!).toBeCloseTo(100, 6);
  });

  it('is monotonically increasing on a perfect linear ramp once warmed up', () => {
    const data = bars(Array.from({ length: 60 }, (_, i) => 100 + 2 * i));
    const { series } = hma.calculate(data, indicatorConfig('hma', { period: 16 }));
    const vals = series!
      .map((s) => s?.value)
      .filter((v): v is number => v !== undefined && v !== null);
    expect(vals.length).toBeGreaterThan(20);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });

  it('emits values for most bars once warmed up', () => {
    const data = bars(Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 4) * 5));
    const { series } = hma.calculate(data, indicatorConfig('hma', { period: 16 }));
    const nonNull = series!.filter((v) => v !== null).length;
    expect(nonNull).toBeGreaterThan(40);
  });

  it('uses default period when param is missing', () => {
    const data = bars(Array.from({ length: 50 }, (_, i) => 100 + i));
    const { values } = hma.calculate(data, indicatorConfig('hma', {}));
    expect(values.size).toBeGreaterThan(0);
  });
});
