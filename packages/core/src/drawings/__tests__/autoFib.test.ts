import { describe, it, expect } from 'vitest';
import type { DataSeries } from '@tradecanvas/commons';
import { findDominantSwing } from '../autoFib.js';

function bar(time: number, high: number, low: number): DataSeries[number] {
  return { time, open: low, high, low, close: high, volume: 1 };
}

describe('findDominantSwing', () => {
  it('returns null for an empty or single-bar range', () => {
    expect(findDominantSwing([], 0, 0)).toBeNull();
    expect(findDominantSwing([bar(1, 10, 5)], 0, 0)).toBeNull();
  });

  it('orders anchors low→high for an up-swing (low precedes high)', () => {
    const data = [
      bar(1, 10, 4),  // low here
      bar(2, 12, 8),
      bar(3, 20, 14), // high here
    ];
    const swing = findDominantSwing(data, 0, 2)!;
    expect(swing[0]).toEqual({ time: 1, price: 4 });   // earlier = low
    expect(swing[1]).toEqual({ time: 3, price: 20 });  // later = high
  });

  it('orders anchors high→low for a down-swing (high precedes low)', () => {
    const data = [
      bar(1, 25, 20), // high here
      bar(2, 18, 12),
      bar(3, 14, 6),  // low here
    ];
    const swing = findDominantSwing(data, 0, 2)!;
    expect(swing[0]).toEqual({ time: 1, price: 25 });
    expect(swing[1]).toEqual({ time: 3, price: 6 });
  });

  it('respects the [from, to] window', () => {
    const data = [
      bar(1, 999, 0), // extreme high+low, OUTSIDE the window
      bar(2, 20, 5),  // in-window low 5
      bar(3, 30, 15), // in-window high 30
    ];
    const swing = findDominantSwing(data, 1, 2)!;
    expect(swing.map((a) => a.price).sort((x, y) => x - y)).toEqual([5, 30]);
  });

  it('returns null when high and low share the same bar', () => {
    const data = [bar(1, 5, 5), bar(2, 5, 5)];
    expect(findDominantSwing(data, 0, 1)).toBeNull();
  });
});
