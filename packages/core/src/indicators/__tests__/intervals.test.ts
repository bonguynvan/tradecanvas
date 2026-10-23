import { describe, it, expect } from 'vitest';
import { cleanIntervals, shownOnInterval, INTERVAL_LIMITS } from '../intervals.js';

describe('the intervals an indicator shows on', () => {
  it('show it everywhere without rules, and on a timeframe they cannot read', () => {
    expect(shownOnInterval(undefined, '5m')).toBe(true);
    expect(shownOnInterval({ hours: false }, null)).toBe(true);
    expect(shownOnInterval({ hours: false }, 'weird')).toBe(true);
  });

  it('hide it on a unit switched off, and keep it on the others', () => {
    expect(shownOnInterval({ minutes: false }, '15m')).toBe(false);
    expect(shownOnInterval({ minutes: false }, '1h')).toBe(true);
    expect(shownOnInterval({ ticks: false }, '100T')).toBe(false);
  });

  it('show it within a unit’s range, both ends included', () => {
    const rules = { hours: [2, 4] as const };
    expect(shownOnInterval(rules, '1h')).toBe(false);
    expect(shownOnInterval(rules, '2h')).toBe(true);
    expect(shownOnInterval(rules, '4h')).toBe(true);
    expect(shownOnInterval(rules, '6h')).toBe(false);
    expect(shownOnInterval({ months: [1, 3] }, '1M')).toBe(true);
    expect(shownOnInterval({ days: [1, 1], weeks: false }, '1w')).toBe(false);
  });

  it('read a range up to a unit’s limit as that and longer, for intervals typed past it', () => {
    expect(shownOnInterval({ minutes: [5, INTERVAL_LIMITS.minutes] }, '90m')).toBe(true);
    expect(shownOnInterval({ minutes: [5, INTERVAL_LIMITS.minutes] }, '3m')).toBe(false);
    expect(shownOnInterval({ minutes: [5, 30] }, '90m')).toBe(false);
  });

  it('keep only rules that say something: ranges in order and in bounds, full ranges dropped', () => {
    expect(cleanIntervals({ hours: [4, 2] })).toEqual({ hours: [2, 4] });
    expect(cleanIntervals({ minutes: [0, 500] })).toBeNull();
    expect(cleanIntervals({ minutes: [1, INTERVAL_LIMITS.minutes] })).toBeNull();
    expect(cleanIntervals({ days: [2.6, 10] })).toEqual({ days: [3, 10] });
    expect(cleanIntervals({ seconds: false, weeks: 'x', years: false, hours: [1] })).toEqual({ seconds: false });
  });

  it('read nothing from what is not a set of rules', () => {
    expect(cleanIntervals(null)).toBeNull();
    expect(cleanIntervals([1, 2])).toBeNull();
    expect(cleanIntervals('hours')).toBeNull();
    expect(cleanIntervals({ hours: [Number.NaN, 3] })).toBeNull();
  });
});
