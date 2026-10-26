import type { OHLCBar, TimeFrame } from '@tradecanvas/commons';
import type { Translator } from './i18n.js';
import type { CompareEntry } from './WidgetSymbolSearch.js';

/**
 * How `addCompareSymbol` compares: percent change on the price scale, the
 * price on a scale or in a pane of its own, the spread or ratio, or how the
 * two correlate (by price or by returns).
 */
export type CompareWay = 'percent' | 'scale' | 'pane' | 'spread' | 'ratio' | 'correlation' | 'correlationLog';

export const COMPARE_WAYS: readonly CompareWay[] = ['percent', 'scale', 'pane', 'spread', 'ratio', 'correlation', 'correlationLog'];

const WAY_LABELS = {
  percent: 'compare.percent',
  scale: 'compare.ownScale',
  pane: 'compare.ownPane',
  spread: 'compare.way.spread',
  ratio: 'compare.way.ratio',
  correlation: 'compare.way.correlation',
  correlationLog: 'compare.way.correlationLog',
} as const satisfies Record<CompareWay, string>;

export function isCompareWay(value: string): value is CompareWay {
  return (COMPARE_WAYS as readonly string[]).includes(value);
}

/** The ways as the compare dialog offers them. */
export function compareWayOptions(t: Translator): { id: CompareWay; label: string }[] {
  return COMPARE_WAYS.map((id) => ({ id, label: t(WAY_LABELS[id]) }));
}

/** A symbol on the chart in percent, over the main series. */
export interface CompareOverlay {
  id: string;
  symbol: string;
  color: string;
}

/** A symbol the widget compares in percent: its line, and the bars it was given. */
export interface PercentCompare extends CompareOverlay {
  /** Never changed in place: new bars come as a new array. */
  bars: OHLCBar[];
  /** The interval `bars` are at: the one before a switch until its bars come. */
  timeframe: TimeFrame;
  /** The feed had nothing older than its first bar: no use asking again. */
  atStart?: boolean;
  /** The interval its bars failed to come at: none are on their way, so no older stretch waits for them. */
  failedAt?: TimeFrame;
}

/** How many of `bars` come before `time`: the stretch a compare that starts there lacks. */
export function barsBefore(bars: readonly { time: number }[], time: number): number {
  const at = bars.findIndex((b) => b.time >= time);
  return at < 0 ? bars.length : at;
}

/** `older` in front of `bars`, leaving out any not older than its first; null when none is. */
export function withOlderBars(bars: readonly OHLCBar[], older: readonly OHLCBar[]): OHLCBar[] | null {
  const first = bars[0]?.time ?? Number.POSITIVE_INFINITY;
  const add = older.filter((b) => b.time < first);
  return add.length > 0 ? [...add, ...bars] : null;
}

/** What the compare list needs to know of an indicator on the chart. */
export interface CompareIndicator {
  instanceId: string;
  id: string;
  params: Record<string, unknown>;
}

/** The indicators that read another symbol, and how each compares. */
function indicatorWay(indicator: CompareIndicator, inOwnPane: boolean): CompareWay | null {
  switch (indicator.id) {
    case 'compareSymbol': return inOwnPane ? 'pane' : 'scale';
    case 'spread': return indicator.params.mode === 'ratio' ? 'ratio' : 'spread';
    case 'correlation': return 'correlation';
    case 'correlationlog': return 'correlationLog';
    default: return null;
  }
}

/**
 * What is compared with the chart's symbol: the percent overlays, then the
 * indicators that read another symbol, each with how it compares.
 * `ownPanes` holds the indicators drawn in a pane of their own.
 */
export function comparedEntries(
  overlays: readonly CompareOverlay[],
  indicators: readonly CompareIndicator[],
  ownPanes: ReadonlySet<string>,
  t: Translator,
): CompareEntry[] {
  const entries: CompareEntry[] = overlays.map((o) => ({ id: o.id, symbol: o.symbol, way: t(WAY_LABELS.percent), color: o.color }));
  for (const indicator of indicators) {
    const symbol = indicator.params.symbol;
    const way = indicatorWay(indicator, ownPanes.has(indicator.instanceId));
    if (!way || typeof symbol !== 'string' || !symbol) continue;
    entries.push({ id: indicator.instanceId, symbol, way: t(WAY_LABELS[way]) });
  }
  return entries;
}
