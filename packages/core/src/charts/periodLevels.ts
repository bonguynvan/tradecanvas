import type { OHLCBar } from '@tradecanvas/commons';
import { periodKeyer } from '../indicators/periods.js';

export type LevelPeriod = 'day' | 'week';

export interface PriceLevel {
  id: string;
  /** Short label, e.g. "PDH", "PWL", "Open". */
  label: string;
  price: number;
}

interface PeriodAgg {
  key: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function aggregate(bars: ReadonlyArray<OHLCBar>, period: LevelPeriod, exchangeTimeZone?: string | null): PeriodAgg[] {
  const keyOf = periodKeyer(bars, period === 'day' ? 'session' : 'week', exchangeTimeZone);
  const out: PeriodAgg[] = [];
  for (const bar of bars) {
    const key = keyOf(bar.time);
    const last = out[out.length - 1];
    if (last && last.key === key) {
      last.high = Math.max(last.high, bar.high);
      last.low = Math.min(last.low, bar.low);
      last.close = bar.close;
    } else {
      out.push({ key, open: bar.open, high: bar.high, low: bar.low, close: bar.close });
    }
  }
  return out;
}

/**
 * Prior-period reference levels (e.g. prior-day high/low/close + the current
 * period's open). Bars are assumed ascending by time. Returns an empty array
 * until at least one completed period plus a current one exist. Days and
 * weeks start at midnight in `exchangeTimeZone` (an IANA name; UTC's when
 * left out), as VWAP's do.
 */
export function computePeriodLevels(
  bars: ReadonlyArray<OHLCBar>,
  period: LevelPeriod = 'day',
  exchangeTimeZone?: string | null,
): PriceLevel[] {
  const periods = aggregate(bars, period, exchangeTimeZone);
  if (periods.length < 2) return [];

  const prior = periods[periods.length - 2];
  const current = periods[periods.length - 1];
  const p = period === 'day' ? 'D' : 'W';

  return [
    { id: `p${p}h`, label: `P${p}H`, price: prior.high },
    { id: `p${p}c`, label: `P${p}C`, price: prior.close },
    { id: `p${p}l`, label: `P${p}L`, price: prior.low },
    { id: 'open', label: period === 'day' ? 'Day Open' : 'Week Open', price: current.open },
  ];
}
