import { describe, it, expect } from 'vitest';
import { boundsOnGrid, isWithinBounds, nextOnGrid, onGrid, onGridBeyond, withinBounds } from '../priceGrid.js';

/** Prices to two decimals, as an axis writes them. */
const cents = (price: number): number => Number(price.toFixed(2));
const halves = (price: number): number => Math.round(price * 2) / 2;

describe('a price on a market’s grid', () => {
  it('is the price as it is with no grid told, or where the grid gives none', () => {
    expect(onGrid(null, 60.3)).toBe(60.3);
    expect(onGrid(() => Number.NaN, 60.3)).toBe(60.3);
    expect(onGrid(halves, Number.NaN)).toBeNaN();
    expect(onGrid(halves, 60.3)).toBe(60.5);
  });

  it('finds the step next to a price, on the grid or off it', () => {
    expect(nextOnGrid(halves, 60, 1)).toBe(60.5);
    expect(nextOnGrid(halves, 60, -1)).toBe(59.5);
    expect(nextOnGrid(halves, 60.3, 1)).toBe(60.5);
    expect(nextOnGrid(halves, 60.3, -1)).toBe(60);
    expect(nextOnGrid((price) => Math.round(price / 100) * 100, 69_449, -1)).toBe(69_400);
    // No grid, or a grid of one price: nowhere to go.
    expect(nextOnGrid(null, 60, 1)).toBe(60);
    expect(nextOnGrid(() => 7, 60, 1)).toBe(60);
  });

  it('keeps a price its own side of another, a step off at the least', () => {
    expect(onGridBeyond(halves, 60, 59.4, -1)).toBe(59.5);
    expect(onGridBeyond(halves, 60, 59.9, -1)).toBe(59.5);
    expect(onGridBeyond(halves, 60, 60.2, 1)).toBe(60.5);
    expect(onGridBeyond(halves, 60.3, 60.4, 1)).toBe(60.5);
    expect(onGridBeyond(null, 60, 60, 1)).toBe(60);
  });
});

describe('the prices an order may be at today', () => {
  it('hold a price between them, and nothing when they are none or no prices', () => {
    const day = { floor: 40, ceiling: 80 };
    expect([withinBounds(day, 92), withinBounds(day, 12), withinBounds(day, 60)]).toEqual([80, 40, 60]);
    expect([isWithinBounds(day, 80), isWithinBounds(day, 80.5), isWithinBounds(null, 999)]).toEqual([true, false, true]);
    for (const odd of [null, undefined, { floor: Number.NaN, ceiling: 80 }, { floor: 80, ceiling: 40 }]) expect(withinBounds(odd, 92)).toBe(92);
  });

  it('are put on the grid from inside: the highest step not over the ceiling, the lowest not under the floor', () => {
    // Seven per cent either side of 25.35, on a market that gave no price step: raw products.
    const raw = { floor: 25.35 * 0.93, ceiling: 25.35 * 1.07 };
    expect(raw.ceiling).not.toBe(cents(raw.ceiling));
    expect(boundsOnGrid(cents, raw)).toEqual({ floor: 23.58, ceiling: 27.12 });
    // A grid coarser than a bound's own digits.
    expect(boundsOnGrid(halves, { floor: 40.3, ceiling: 79.8 })).toEqual({ floor: 40.5, ceiling: 79.5 });
    // On the grid already, they are as they were.
    expect(boundsOnGrid(halves, { floor: 40, ceiling: 80 })).toEqual({ floor: 40, ceiling: 80 });
  });

  it('take a sum’s dust for the price it stands for', () => {
    // 1.4 and thirty per cent is 1.8199999999999998; 1.1 less ten is 0.9900000000000001.
    const dusty = { floor: 1.1 * 0.9, ceiling: 1.4 * 1.3 };
    expect(dusty).not.toEqual({ floor: 0.99, ceiling: 1.82 });
    expect(boundsOnGrid(cents, dusty)).toEqual({ floor: 0.99, ceiling: 1.82 });
  });

  it('are as they were with no grid, and none stay none', () => {
    const raw = { floor: 23.5755, ceiling: 27.1245 };
    expect(boundsOnGrid(null, raw)).toEqual(raw);
    expect(boundsOnGrid(cents, null)).toBeNull();
    // A grid with no step between them holds nothing: left to say so themselves.
    expect(boundsOnGrid((price) => Math.round(price / 100) * 100, { floor: 110, ceiling: 190 })).toEqual({ floor: 110, ceiling: 190 });
  });
});
