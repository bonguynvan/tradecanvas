import type { OHLCBar } from '@tradecanvas/commons';
import { isValidBar } from '../DataManager.js';

/** What the components need of a chart to give it their `data`. */
export interface BarFeedHost {
  setData(data: OHLCBar[]): void;
  updateLastBar(bar: OHLCBar): void;
  appendBar(bar: OHLCBar): void;
  appendBars(bars: OHLCBar[]): void;
  /** The bars shown: read to tell bars another writer gave the chart. */
  getData(): readonly OHLCBar[];
  isExtendedHoursVisible(): boolean;
  isReplayActive(): boolean;
}

/** What `feedBars` gave back, for its next call. */
export interface FedBars {
  /** The array given, and how many bars it had then. */
  readonly source: readonly OHLCBar[];
  readonly length: number;
  /** Its last bar as it was then (a copy: the array may change in place). */
  readonly last: OHLCBar | null;
  /** The chart's last bar just after, the object itself: another writer's bar is another object. */
  readonly shownBar: OHLCBar | null;
  /** Fed during a replay: the bars went to the live series, out of sight. */
  readonly inReplay: boolean;
}

const sameBar = (a: OHLCBar, b: OHLCBar): boolean =>
  a === b || (a.time === b.time && a.open === b.open && a.high === b.high && a.low === b.low && a.close === b.close && a.volume === b.volume);
/**
 * A plain copy for the chart: a framework's state can be frozen, and its
 * proxies are not for reading in frames.
 */
const copy = (b: OHLCBar): OHLCBar => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
const lastOf = (bars: readonly OHLCBar[]): OHLCBar | null => (bars.length > 0 ? bars[bars.length - 1] : null);

/** Whether the first `count` bars of `next` are those of `prev`. */
function samePrefix(prev: readonly OHLCBar[], next: readonly OHLCBar[], count: number): boolean {
  for (let i = 0; i < count; i++) {
    if (!sameBar(prev[i], next[i])) return false;
  }
  return true;
}

/**
 * Whether the chart still shows what was fed: no stream or other code gave
 * it bars since. During a replay the bars shown are the replay's, and ticks
 * go to the live series beside them; after one, the live series is back,
 * and only its last time can tell. A last bar fed but not shown is fine
 * while extended hours are hidden: the chart keeps it aside.
 */
function chartAsFed(chart: BarFeedHost, prev: FedBars): boolean {
  if (chart.isReplayActive()) return true;
  const shown = lastOf(chart.getData());
  if (prev.inReplay) return shown?.time === prev.last?.time;
  if (shown !== prev.shownBar) return false;
  return shown?.time === prev.last?.time || !chart.isExtendedHoursVisible();
}

/** The bars after the forming one, if each is valid and later than the one before; else null. */
function addedAfter(next: readonly OHLCBar[], from: number): OHLCBar[] | null {
  const added: OHLCBar[] = [];
  for (let i = from; i < next.length; i++) {
    if (!isValidBar(next[i]) || !(next[i].time > next[i - 1].time)) return null;
    added.push(copy(next[i]));
  }
  return added;
}

/**
 * Feeds `next` as ticks when it goes on from what was fed: the bars before
 * the last as they were, the last one changed or bars added after it.
 * Returns false, having fed nothing, when it doesn't.
 */
function feedTicks(chart: BarFeedHost, next: readonly OHLCBar[], prev: FedBars): boolean {
  const p = prev.length;
  // A last bar the chart couldn't take was left out: what it shows isn't what was fed.
  if (p === 0 || !prev.last || !isValidBar(prev.last) || next.length < p || !chartAsFed(chart, prev)) return false;
  // The same array, changed in place: only its end can have moved. The one
  // before, changed in place since (cut short, say), can't be compared.
  if (next !== prev.source && (prev.source.length !== p || !samePrefix(prev.source, next, p - 1))) return false;
  const forming = next[p - 1];
  if (forming.time !== prev.last.time || !isValidBar(forming)) return false;
  const added = addedAfter(next, p);
  if (!added) return false;
  if (!sameBar(forming, prev.last)) chart.updateLastBar(copy(forming));
  if (added.length === 1) chart.appendBar(added[0]);
  else if (added.length > 1) chart.appendBars(added);
  return true;
}

/**
 * Bars into the chart, as the framework components take their `data`. Bars
 * that go on from those fed before (the last one changed, or bars added after
 * it) go in as ticks (`updateLastBar`, `appendBar`, `appendBars`), as a live
 * feed's do: the view isn't reset, and only the end is computed again. That
 * holds for a new array (`[...bars, next]`) and for the same one changed in
 * place. Anything else is a new series (`setData`): other bars, a bar the
 * chart can't take, or bars another writer gave the chart since. `prev` is
 * what the last call gave back (null for the first); the chart gets plain
 * copies.
 */
export function feedBars(chart: BarFeedHost, next: readonly OHLCBar[], prev: FedBars | null): FedBars {
  if (!prev || !feedTicks(chart, next, prev)) chart.setData(next.map(copy));
  const last = next.length > 0 ? copy(next[next.length - 1]) : null;
  const inReplay = chart.isReplayActive();
  return { source: next, length: next.length, last, shownBar: inReplay ? null : lastOf(chart.getData()), inReplay };
}
