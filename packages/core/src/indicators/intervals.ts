import type { IndicatorIntervals, IntervalUnit } from '@tradecanvas/commons';
import { parseTimeframe, tickBarCount } from '@tradecanvas/commons';

/** The units in order, shortest first. */
export const INTERVAL_UNITS: readonly IntervalUnit[] = ['ticks', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months'];

/** The highest count a range reaches in each unit: a range from 1 to it covers the unit. */
export const INTERVAL_LIMITS: Readonly<Record<IntervalUnit, number>> = {
  ticks: 1_000_000,
  seconds: 59,
  minutes: 59,
  hours: 24,
  days: 366,
  weeks: 52,
  months: 12,
};

const UNIT_OF = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days', w: 'weeks', M: 'months' } as const;

/** A timeframe's unit and count (`'4h'` → hours, 4), or null when it isn't one. */
function intervalOf(timeframe: string): { unit: IntervalUnit; count: number } | null {
  const ticks = tickBarCount(timeframe);
  if (ticks !== null) return { unit: 'ticks', count: ticks };
  const parsed = parseTimeframe(timeframe);
  return parsed ? { unit: UNIT_OF[parsed.unit], count: parsed.count } : null;
}

/** Whether an indicator with these rules shows on `timeframe`. One the rules can't read (or none yet) shows it. */
export function shownOnInterval(intervals: IndicatorIntervals | undefined, timeframe: string | null | undefined): boolean {
  if (!intervals || !timeframe) return true;
  const interval = intervalOf(timeframe);
  if (!interval) return true;
  const rule = intervals[interval.unit];
  if (rule === undefined) return true;
  if (rule === false) return false;
  return interval.count >= rule[0] && interval.count <= rule[1];
}

/**
 * The rules as kept: each range rounded, in order and within its unit's
 * limits; a unit's full range left out (it shows on all of them). Null when
 * nothing is left, or `value` is not a set of rules.
 */
export function cleanIntervals(value: unknown): IndicatorIntervals | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const given = value as Record<string, unknown>;
  const out: { -readonly [U in IntervalUnit]?: false | readonly [number, number] } = {};
  for (const unit of INTERVAL_UNITS) {
    const rule = given[unit];
    if (rule === false) {
      out[unit] = false;
      continue;
    }
    if (!Array.isArray(rule) || rule.length !== 2 || !rule.every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    const limit = INTERVAL_LIMITS[unit];
    const [from, to] = (rule as number[]).map((n) => Math.min(limit, Math.max(1, Math.round(n)))).sort((a, b) => a - b);
    if (from > 1 || to < limit) out[unit] = [from, to];
  }
  return Object.keys(out).length > 0 ? out : null;
}
