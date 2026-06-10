import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { computePeriodLevels } from '../periodLevels.js';

function bar(time: number, open: number, high: number, low: number, close: number): OHLCBar {
  return { time, open, high, low, close, volume: 1 };
}

const HOUR = 3_600_000;
const day1 = Date.UTC(2023, 0, 2, 0, 0, 0); // Mon
const day2 = Date.UTC(2023, 0, 3, 0, 0, 0); // Tue

describe('computePeriodLevels', () => {
  it('returns empty until two periods exist', () => {
    expect(computePeriodLevels([], 'day')).toEqual([]);
    expect(computePeriodLevels([bar(day1, 1, 2, 0, 1)], 'day')).toEqual([]);
  });

  it('reports prior-day high/close/low and the current day open', () => {
    const bars = [
      bar(day1, 10, 20, 5, 15),         // day1 open 10
      bar(day1 + HOUR, 15, 25, 12, 18), // day1 high 25, low 5, close 18
      bar(day2, 19, 30, 17, 28),        // day2 open 19
      bar(day2 + HOUR, 28, 35, 26, 33),
    ];
    const levels = computePeriodLevels(bars, 'day');
    const byId = Object.fromEntries(levels.map((l) => [l.id, l.price]));
    expect(byId['pDh']).toBe(25);   // prior-day high
    expect(byId['pDl']).toBe(5);    // prior-day low
    expect(byId['pDc']).toBe(18);   // prior-day close
    expect(byId['open']).toBe(19);  // current-day open
    expect(levels.find((l) => l.id === 'pDh')?.label).toBe('PDH');
  });

  it('labels weekly levels PWH/PWL/PWC', () => {
    const wk1 = Date.UTC(2023, 0, 2); // Mon (week start)
    const wk2 = Date.UTC(2023, 0, 9); // next Mon
    const bars = [
      bar(wk1, 100, 120, 90, 110),
      bar(wk2, 110, 130, 105, 125),
    ];
    const levels = computePeriodLevels(bars, 'week');
    const labels = levels.map((l) => l.label);
    expect(labels).toContain('PWH');
    expect(labels).toContain('PWL');
    expect(labels).toContain('PWC');
    expect(levels.find((l) => l.id === 'pWh')?.price).toBe(120);
  });
});
