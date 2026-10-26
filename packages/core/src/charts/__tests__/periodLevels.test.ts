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

  it('counts the day from midnight in the exchange’s zone, as VWAP does', () => {
    // ASX sessions, 10:00–15:00 in Sydney: the first hour of each is 23:00 UTC the day before.
    const open1 = Date.UTC(2026, 9, 25, 23);
    const open2 = Date.UTC(2026, 9, 26, 23);
    const bars = [
      bar(open1, 10, 50, 9, 12), // day 1's high is its 10:00 bar
      bar(open1 + HOUR, 12, 20, 11, 18),
      bar(open2, 19, 30, 17, 28), // day 2 opens at 19
      bar(open2 + HOUR, 28, 35, 26, 33),
    ];
    const byId = (zone?: string) => Object.fromEntries(computePeriodLevels(bars, 'day', zone).map((l) => [l.id, l.price]));
    expect(byId('Australia/Sydney')).toMatchObject({ pDh: 50, pDl: 9, pDc: 18, open: 19 });
    // In UTC's days the 10:00 bars belong to the day before.
    expect(byId()).toMatchObject({ pDh: 30, open: 28 });
  });

  it('reads bar times given in seconds', () => {
    const bars = [bar(day1 / 1000, 10, 20, 5, 15), bar(day2 / 1000, 19, 30, 17, 28)];
    expect(computePeriodLevels(bars, 'day').find((l) => l.id === 'pDh')?.price).toBe(20);
  });
});
