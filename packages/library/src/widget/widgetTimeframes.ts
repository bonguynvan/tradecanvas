import type { TimeFrame } from '@tradecanvas/commons';
import { isTimeFrame, tickBarCount, timeframeToMs } from '@tradecanvas/commons';

/** The timeframe menu when the host offers no list of its own. */
export const WIDGET_TIMEFRAMES: TimeFrame[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1M'];

/** On the toolbar until the user pins others. */
export const WIDGET_TIMEFRAME_FAVORITES: TimeFrame[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

const MAX_FALLBACK_FAVORITES = 6;

/** "1m", "1H", "1D", "1W"; minutes and months keep their case ("1m" vs "1M"). */
export function timeframeLabel(tf: TimeFrame): string {
  const unit = tf.slice(-1);
  return unit === 'h' || unit === 'd' || unit === 'w' ? tf.slice(0, -1) + unit.toUpperCase() : tf;
}

const isKnown = (tf: TimeFrame): boolean => Number.isFinite(timeframeToMs(tf)) || tickBarCount(tf) !== null;

/** Shortest first: tick timeframes (fewest trades first), then by length. */
const byLength = (a: TimeFrame, b: TimeFrame): number => {
  const ta = tickBarCount(a);
  const tb = tickBarCount(b);
  if (ta !== null || tb !== null) return ta === null ? 1 : tb === null ? -1 : ta - tb;
  return timeframeToMs(a) - timeframeToMs(b);
};

/**
 * The timeframes to offer, shortest first: the widget's own list (or the
 * default menu), less any that the chart's `features.timeframes` whitelist
 * leaves out.
 */
export function availableTimeframes(widgetList?: TimeFrame[], whitelist?: TimeFrame[]): TimeFrame[] {
  const allowed = whitelist?.length ? whitelist : null;
  const base = widgetList?.length ? widgetList : (allowed ?? WIDGET_TIMEFRAMES);
  return [...new Set(base)]
    .filter((tf) => isKnown(tf) && (!allowed || allowed.includes(tf)))
    .sort(byLength);
}

/**
 * The toolbar's first favourites: the host's defaults; else, when the host
 * chose the list, all of it (so a short custom list shows as before); else
 * the standard set; else the first few offered.
 */
export function initialTimeframeFavorites(
  available: TimeFrame[],
  hostDefaults?: TimeFrame[],
  hostChoseList = false,
): TimeFrame[] {
  if (hostDefaults?.length) return available.filter((tf) => hostDefaults.includes(tf));
  if (hostChoseList) return [...available];
  const standard = available.filter((tf) => WIDGET_TIMEFRAME_FAVORITES.includes(tf));
  return standard.length > 0 ? standard : available.slice(0, MAX_FALLBACK_FAVORITES);
}

/** Largest count a typed interval may have. */
const MAX_TYPED_COUNT = 9999;

/** Units a typed interval may use; lower-case `m` is minutes, upper-case `M` months. */
const TYPED_UNITS: Record<string, 's' | 'm' | 'h' | 'd' | 'w' | 'M'> = {
  '': 'm', s: 's', S: 's', m: 'm', h: 'h', H: 'h', d: 'd', D: 'd', w: 'w', W: 'w', M: 'M',
};

/** Larger unit each one rolls up into, and how many make one. */
const ROLL_UP: Partial<Record<'s' | 'm' | 'h', ['m' | 'h' | 'd', number]>> = { s: ['m', 60], m: ['h', 60], h: ['d', 24] };

/**
 * A typed interval as a timeframe, or null: a whole count and an optional
 * unit (`7`, `7m`, `2H`, `3d`, `1W`, `2M`; minutes when the unit is left
 * out). Written in its largest whole unit, so `60` and `1h` are the same.
 */
export function parseTimeframeInput(text: string): TimeFrame | null {
  const match = /^(\d+)([a-zA-Z]?)$/.exec(text.trim());
  if (!match) return null;
  // Ticks: bars of that many trades (`100T`), from a feed with trades.
  if (match[2] === 'T' || match[2] === 't') {
    const tf = `${Number(match[1])}T` as TimeFrame;
    return Number(match[1]) <= MAX_TYPED_COUNT && tickBarCount(tf) !== null ? tf : null;
  }
  let count = Number(match[1]);
  let unit = TYPED_UNITS[match[2]];
  if (!unit || !Number.isSafeInteger(count) || count < 1) return null;
  for (let up = ROLL_UP[unit as 's' | 'm' | 'h']; up && count % up[1] === 0; up = ROLL_UP[unit as 's' | 'm' | 'h']) {
    count /= up[1];
    unit = up[0];
  }
  if (count > MAX_TYPED_COUNT) return null;
  const tf = `${count}${unit}`;
  return isTimeFrame(tf) ? tf : null;
}

/** `list` plus `extra`, without repeats, leaving out what the whitelist excludes, shortest first. */
export function withExtraTimeframes(list: TimeFrame[], extra: TimeFrame[], whitelist?: TimeFrame[]): TimeFrame[] {
  const allowed = whitelist?.length ? whitelist : null;
  const added = extra.filter((tf) => isKnown(tf) && (!allowed || allowed.includes(tf)));
  return [...new Set([...list, ...added])].sort(byLength);
}
