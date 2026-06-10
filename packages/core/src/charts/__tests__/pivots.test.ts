import { describe, it, expect } from 'vitest';
import type { DataSeries } from '@tradecanvas/commons';
import { findPivots, classifyPivots, type Pivot } from '../pivots.js';

function bar(high: number, low: number): DataSeries[number] {
  return { time: 0, open: low, high, low, close: high, volume: 1 };
}

describe('findPivots', () => {
  it('detects a pivot high with enough confirmed bars on each side', () => {
    // index:   0   1   2(H) 3   4
    const data = [bar(2, 1), bar(3, 2), bar(5, 4), bar(3, 2), bar(2, 1)];
    const pivots = findPivots(data, 2, 2);
    expect(pivots).toEqual([{ index: 2, price: 5, type: 'high' }]);
  });

  it('detects a pivot low', () => {
    const data = [bar(5, 4), bar(4, 3), bar(2, 1), bar(4, 3), bar(5, 4)];
    const pivots = findPivots(data, 2, 2);
    expect(pivots).toEqual([{ index: 2, price: 1, type: 'low' }]);
  });

  it('does not confirm pivots within `right` bars of the end', () => {
    // The high at index 3 has only 1 bar to its right; right=2 → unconfirmed.
    const data = [bar(2, 1), bar(3, 2), bar(2, 1), bar(9, 8), bar(3, 2)];
    const pivots = findPivots(data, 2, 2);
    expect(pivots.find((p) => p.index === 3)).toBeUndefined();
  });

  it('disqualifies ties (flat plateaus)', () => {
    const data = [bar(2, 1), bar(5, 4), bar(5, 4), bar(2, 1), bar(2, 1)];
    // index 1 and 2 share the high 5 → neither is a strict pivot high.
    const pivots = findPivots(data, 1, 1);
    expect(pivots.find((p) => p.type === 'high')).toBeUndefined();
  });

  it('finds multiple pivots across a wave', () => {
    const data = [
      bar(2, 1), bar(6, 5), bar(2, 1), // high @1
      bar(1, 0),                        // low @3
      bar(2, 1), bar(7, 6), bar(2, 1),  // high @5
    ];
    const pivots = findPivots(data, 1, 1);
    expect(pivots.map((p) => `${p.type}@${p.index}`)).toEqual(['high@1', 'low@3', 'high@5']);
  });
});

describe('classifyPivots', () => {
  const p = (index: number, price: number, type: 'high' | 'low'): Pivot => ({ index, price, type });

  it('labels HH/LH/HL/LL against the prior same-type pivot', () => {
    const pivots = [
      p(1, 10, 'high'), // first high → HH
      p(2, 4, 'low'),   // first low → LL
      p(3, 12, 'high'), // 12 > 10 → HH
      p(4, 6, 'low'),   // 6 > 4 → HL
      p(5, 11, 'high'), // 11 < 12 → LH
      p(6, 3, 'low'),   // 3 < 6 → LL
    ];
    expect(classifyPivots(pivots).map((x) => x.label)).toEqual(['HH', 'LL', 'HH', 'HL', 'LH', 'LL']);
  });

  it('returns empty for empty input', () => {
    expect(classifyPivots([])).toEqual([]);
  });
});
