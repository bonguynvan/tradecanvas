import type { TimeFrame } from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';

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

const isKnown = (tf: TimeFrame): boolean => Number.isFinite(timeframeToMs(tf));

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
    .sort((a, b) => timeframeToMs(a) - timeframeToMs(b));
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
