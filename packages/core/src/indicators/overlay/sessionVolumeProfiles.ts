import type { DataSeries } from '@tradecanvas/commons';
import { periodKeyer } from '../periods.js';

/** One trading day's volume by price: how much traded in each row of the day's range. */
export interface SessionVolumeProfile {
  /** The day's first and last bar. */
  start: number;
  end: number;
  /** The day, as its key on the exchange's clock. */
  time: number;
  /** The day's low and high: the rows split this range. */
  low: number;
  high: number;
  /** Each row's height, in price; 0 for a day that traded at one price. */
  rowHeight: number;
  /** The volume in each row, from the lowest. */
  volumes: number[];
  /** What traded in the day. */
  total: number;
  /** The middle of the busiest row: the point of control. */
  poc: number;
  /** The value area: the rows around the POC that hold `valueArea` percent of the day's volume. */
  valueAreaLow: number;
  valueAreaHigh: number;
  /** The value area's lowest and highest row. */
  valueAreaRows: [number, number];
}

export interface SessionVolumeProfileOptions {
  /** Rows a day's range is split into; 24. */
  rows?: number;
  /** The share of the day's volume the value area holds, in percent; 70. */
  valueArea?: number;
  /** The exchange's IANA time zone: a day starts at its midnight. UTC when left out. */
  timeZone?: string | null;
  /** When the trading day starts, minutes after that midnight (1020 for 17:00, `tradingDayStart`); midnight when left out. */
  sessionStart?: number | null;
}

/** The options as a scan uses them. */
export interface SessionVolumeRules {
  rows: number;
  valueArea: number;
  timeZone: string | null;
  sessionStart: number | null;
}

/** A price a hair over a row's floor is still in the row under it: a bar's high at 101 is not in the row 101–102. */
const EDGE = 1e-9;
const DEFAULT_ROWS = 24;
const DEFAULT_VALUE_AREA = 70;
/** Rows the value area takes on at a time, on the heavier side. */
const VALUE_AREA_STEP = 2;

export function sessionVolumeRules(options: SessionVolumeProfileOptions = {}): SessionVolumeRules {
  const rows = Number.isFinite(options.rows) ? Math.max(1, Math.floor(options.rows as number)) : DEFAULT_ROWS;
  const area = Number.isFinite(options.valueArea) ? Math.min(100, Math.max(1, options.valueArea as number)) : DEFAULT_VALUE_AREA;
  return { rows, valueArea: area, timeZone: options.timeZone ?? null, sessionStart: options.sessionStart ?? null };
}

const counts = (low: number, high: number, volume: number): boolean =>
  Number.isFinite(low) && Number.isFinite(high) && high >= low && Number.isFinite(volume) && volume > 0;

/** The profile of bars `start` to `end`, one day; null when none of them traded. */
function profileOf(data: DataSeries, start: number, end: number, time: number, rules: SessionVolumeRules): SessionVolumeProfile | null {
  let low = Infinity;
  let high = -Infinity;
  for (let i = start; i <= end; i++) {
    const bar = data[i];
    if (!counts(bar.low, bar.high, bar.volume)) continue;
    if (bar.low < low) low = bar.low;
    if (bar.high > high) high = bar.high;
  }
  if (!(high >= low)) return null;
  const { rows } = rules;
  const rowHeight = (high - low) / rows;
  const volumes = new Array<number>(rows).fill(0);
  let total = 0;
  for (let i = start; i <= end; i++) {
    const bar = data[i];
    if (!counts(bar.low, bar.high, bar.volume)) continue;
    total += bar.volume;
    if (rowHeight === 0) {
      volumes[0] += bar.volume;
      continue;
    }
    // The rows the bar's range covers share its volume evenly.
    const first = Math.min(rows - 1, Math.floor((bar.low - low) / rowHeight + EDGE));
    const last = Math.min(rows - 1, Math.max(first, Math.ceil((bar.high - low) / rowHeight - EDGE) - 1));
    const part = bar.volume / (last - first + 1);
    for (let r = first; r <= last; r++) volumes[r] += part;
  }
  let busiest = 0;
  for (let r = 1; r < rows; r++) if (volumes[r] > volumes[busiest]) busiest = r;
  // From the busiest row, the heavier of the two rows below and the two above joins, a pair at a time (one where
  // only one is left), until the area holds its share: the value area as Market Profile counts it. A tie goes up.
  const target = (total * rules.valueArea) / 100;
  let lo = busiest;
  let hi = busiest;
  let held = volumes[busiest];
  while (held < target && (lo > 0 || hi < rows - 1)) {
    const below = lo > 0 ? volumes[lo - 1] + (lo > 1 ? volumes[lo - 2] : 0) : -1;
    const above = hi < rows - 1 ? volumes[hi + 1] + (hi < rows - 2 ? volumes[hi + 2] : 0) : -1;
    const step = below > above ? -1 : 1;
    for (let n = 0; n < VALUE_AREA_STEP; n++) {
      if (step < 0 && lo > 0) held += volumes[--lo];
      else if (step > 0 && hi < rows - 1) held += volumes[++hi];
    }
  }
  return {
    start, end, time, low, high, rowHeight, volumes, total,
    poc: low + (busiest + 0.5) * rowHeight,
    valueAreaLow: low + lo * rowHeight,
    valueAreaHigh: low + (hi + 1) * rowHeight,
    valueAreaRows: [lo, hi],
  };
}

/** The first bar of the day bar `at` is in. */
export function sessionStartOf(data: DataSeries, at: number, timeZone: string | null, dayStart: number | null = null): number {
  const keyOf = periodKeyer(data, 'session', timeZone, dayStart);
  const key = keyOf(data[at].time);
  let start = at;
  while (start > 0 && keyOf(data[start - 1].time) === key) start--;
  return start;
}

/**
 * Brings `profiles`, made of bars unchanged before `from`, up to `data`:
 * the day bar `from` is in is worked out again, and every day after it.
 * With no profiles and `from` 0 it makes them all. `profiles` is changed in
 * place and stays in the order of the days. Gives the first bar of the day
 * worked out again: the bars from it on may have other lines.
 */
export function resumeSessionProfiles(data: DataSeries, profiles: SessionVolumeProfile[], from: number, rules: SessionVolumeRules): number {
  if (data.length === 0) {
    profiles.length = 0;
    return 0;
  }
  const restart = from <= 0 ? 0 : sessionStartOf(data, Math.min(from, data.length - 1), rules.timeZone, rules.sessionStart);
  while (profiles.length > 0 && profiles[profiles.length - 1].start >= restart) profiles.pop();
  const keyOf = periodKeyer(data, 'session', rules.timeZone, rules.sessionStart);
  let start = restart;
  let key = keyOf(data[restart].time);
  for (let i = restart + 1; i <= data.length; i++) {
    const next = i < data.length ? keyOf(data[i].time) : Number.NaN;
    if (next === key) continue;
    const profile = profileOf(data, start, i - 1, key, rules);
    if (profile) profiles.push(profile);
    start = i;
    key = next;
  }
  return restart;
}

/**
 * The volume profile of each trading day of `data`: the day's range split
 * into `rows` rows, each bar's volume shared evenly by the rows its range
 * covers, the busiest row's middle (the POC), and the value area around it
 * that holds `valueArea` percent of the day's volume, grown two rows at a
 * time toward the heavier pair, as Market Profile counts it. A day
 * starts at midnight on `timeZone`'s clock, or at `sessionStart` minutes after it.
 * Bars with no volume, or a range that is no number, are left out, and a
 * day with none left has no profile.
 */
export function sessionVolumeProfiles(data: DataSeries, options: SessionVolumeProfileOptions = {}): SessionVolumeProfile[] {
  const profiles: SessionVolumeProfile[] = [];
  resumeSessionProfiles(data, profiles, 0, sessionVolumeRules(options));
  return profiles;
}
