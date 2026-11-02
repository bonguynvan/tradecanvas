import type { TimeZoneSetting } from '@tradecanvas/commons';
import { barDateParts, barTimeUnit, barsAreDaily, timeParts, type TimeParts } from '@tradecanvas/commons';
import { barIndexToTime } from '../viewport/ScaleMapping.js';

/**
 * How much a bar's time stands out: the largest calendar step since the bar
 * before it. A new year outranks a new month, a month a day, a day an hour,
 * and among those a round one (a quarter, the 15th, noon, the half hour)
 * the rest, so the marks that fit are the ones that say the most.
 */
export const MARK_WEIGHT = {
  year: 100,
  quarter: 91,
  month: 90,
  dayOfFive: 81,
  day: 80,
  hour12: 73,
  hour6: 72,
  hour3: 71,
  hour: 70,
  minute30: 63,
  minute15: 62,
  minute5: 61,
  minute: 60,
  /** Bars within one minute (seconds, ticks): labelled with their seconds. */
  within: 50,
} as const;

/** The weights, highest first: the order marks are chosen in. */
const LEVELS: readonly number[] = [...new Set(Object.values(MARK_WEIGHT))].sort((a, b) => b - a);
/** Weights are bytes. */
const WEIGHT_RANGE = 256;

/** What a mark's label says: the year, the month, the day of the month, or the time. */
export type MarkKind = 'year' | 'month' | 'day' | 'time';

export function markKind(weight: number): MarkKind {
  if (weight >= MARK_WEIGHT.year) return 'year';
  if (weight >= MARK_WEIGHT.month) return 'month';
  if (weight >= MARK_WEIGHT.day) return 'day';
  return 'time';
}

/** A slot the time axis labels and the grid draws a line down. */
export interface TimeMark {
  /** The slot: a bar's index, or past the last bar, a slot in the future. */
  index: number;
  /** Its time in milliseconds, in UTC. */
  time: number;
  weight: number;
}

export interface TimeMarkQuery {
  /** The slots on view. */
  from: number;
  to: number;
  /** Slots between two marks at least. */
  gapBars: number;
  tz: TimeZoneSetting;
  /** Whether the empty future right of the last bar gets marks (off for tick bars and bricks). */
  timesPastData: boolean;
  /** The exchange's zone: daily bars not stamped at 00:00 UTC are dated there (`barDateParts`). */
  exchangeZone?: string | null;
}

/** The weight of a bar at `cur` after one at `prev`; 0 for the first bar, which has nothing to stand out from. */
export function markWeight(prev: TimeParts | null, cur: TimeParts): number {
  if (!prev) return 0;
  if (cur.year !== prev.year) return MARK_WEIGHT.year;
  // Months count from 1: January, April, July and October start quarters.
  if (cur.month !== prev.month) return cur.month % 3 === 1 ? MARK_WEIGHT.quarter : MARK_WEIGHT.month;
  if (cur.day !== prev.day) return cur.day % 5 === 0 ? MARK_WEIGHT.dayOfFive : MARK_WEIGHT.day;
  if (cur.hours !== prev.hours) {
    const h = cur.hours;
    return h % 12 === 0 ? MARK_WEIGHT.hour12 : h % 6 === 0 ? MARK_WEIGHT.hour6 : h % 3 === 0 ? MARK_WEIGHT.hour3 : MARK_WEIGHT.hour;
  }
  if (cur.minutes !== prev.minutes) {
    const m = cur.minutes;
    return m % 30 === 0 ? MARK_WEIGHT.minute30 : m % 15 === 0 ? MARK_WEIGHT.minute15 : m % 5 === 0 ? MARK_WEIGHT.minute5 : MARK_WEIGHT.minute;
  }
  return MARK_WEIGHT.within;
}

/** Future slots weighed beyond those on view, so panning into the future recomputes less. */
const FUTURE_CHUNK = 256;
/** Gaps are rounded up to steps this far apart, so a zoom recomputes the marks now and then, not every frame. */
const GAP_RATIO = 1.25;

/** `gap` rounded up to the next step of `GAP_RATIO`: marks at most a quarter further apart than asked. */
function quantiseGap(gap: number): number {
  if (!(gap > 1)) return 1;
  return Math.ceil(GAP_RATIO ** Math.ceil(Math.log(gap) / Math.log(GAP_RATIO) - 1e-9));
}

/**
 * Picks the time axis's marks, and the grid's columns with them. Each bar is
 * weighed once by the calendar step it starts; then, heaviest first, a bar
 * becomes a mark unless one is already closer than the gap. Marks belong to
 * bars, not to slots on screen: panning moves them with their bars, and
 * history put in front leaves them where they were. Both steps are cached:
 * weights while the series is the same, marks while the gap is too.
 */
export class TimeMarker {
  private weights = new Uint8Array(0);
  private times: number[] = [];
  /** What `weights` and `times` were made for: the bars weighed, the zones, the slots. */
  private weighed: { bars: number; tz: TimeZoneSetting; exchangeZone: string | null; daily: boolean; extent: number; unit: number } | null = null;
  /**
   * The array the bars were weighed from: the same one grown in place keeps
   * its weights without a look at each time. Held weakly, so a series let go
   * (another symbol) is not kept alive by the axis.
   */
  private weighedFrom: WeakRef<ArrayLike<{ time: number }>> | null = null;
  /** Counts each change to `weights`, which are written in place while they have room. */
  private revision = 0;
  private chosen: Int32Array = new Int32Array(0);
  private chosenFor: { gapBars: number; extent: number; revision: number } | null = null;

  marks(data: ArrayLike<{ time: number }>, query: TimeMarkQuery): TimeMark[] {
    const n = data.length;
    if (n === 0) return [];
    const gapBars = quantiseGap(query.gapBars);
    const lastSlot = query.timesPastData ? Math.max(n - 1, Math.ceil(query.to)) : n - 1;
    const extent = lastSlot <= n - 1 ? n : Math.ceil((lastSlot + 1 - n) / FUTURE_CHUNK) * FUTURE_CHUNK + n;
    this.weigh(data, query.tz, query.exchangeZone ?? null, extent);
    this.choose(gapBars, extent);
    const from = Math.max(0, Math.floor(query.from));
    const to = Math.min(lastSlot, Math.ceil(query.to));
    const chosen = this.chosen;
    // The first mark on view, by binary search: a long series has thousands left of it.
    let lo = 0;
    let hi = chosen.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (chosen[mid] < from) lo = mid + 1;
      else hi = mid;
    }
    const out: TimeMark[] = [];
    for (let k = lo; k < chosen.length && chosen[k] <= to; k++) {
      const index = chosen[k];
      out.push({ index, time: this.times[index], weight: this.weights[index] });
    }
    return out;
  }

  /**
   * Weigh the bars and the future slots. A series rebuilt as a new array (a
   * derived chart type on every tick) keeps its weights while its times are
   * the same; bars appended are weighed on from the last one kept. Only
   * history put in front, or another zone, weighs everything again. Daily
   * bars are weighed by their dates (`barDateParts`), whatever zone is shown.
   */
  private weigh(data: ArrayLike<{ time: number }>, tz: TimeZoneSetting, exchangeZone: string | null, extent: number): void {
    const n = data.length;
    const unit = barTimeUnit(data);
    const daily = barsAreDaily(data) === true;
    const partsOf = daily ? (t: number) => barDateParts(t, tz, exchangeZone) : (t: number) => timeParts(t, tz);
    const w = this.weighed;
    // Bars weighed before that still have their times: their weights stand.
    let keep = 0;
    if (w && w.tz === tz && w.exchangeZone === exchangeZone && w.daily === daily && w.unit === unit) {
      const limit = Math.min(w.bars, n);
      const times = this.times;
      if (data === this.weighedFrom?.deref() && n >= w.bars) {
        // The same array: bars are pushed onto it or replaced by bars at their
        // times, never moved, so the times weighed stand. Looking at each one
        // every frame cost most of a frame on a million bars; the last is
        // looked at all the same.
        keep = limit > 0 && data[limit - 1].time * unit === times[limit - 1] ? limit : 0;
      } else {
        while (keep < limit && data[keep].time * unit === times[keep]) keep++;
        if (keep < limit) keep = 0;
      }
    }
    if (this.weighedFrom?.deref() !== data) this.weighedFrom = new WeakRef(data);
    if (w && keep === n && w.bars === n && w.extent === extent) return;
    // Bars kept are weighed on in place while there is room; room for an
    // eighth more, so a live series reallocates now and then, not per bar.
    const grow = keep > 0 && this.weights.length >= extent;
    const weights = grow ? this.weights : new Uint8Array(extent + (extent >> 3));
    const times = keep > 0 ? this.times : [];
    if (keep > 0 && !grow) weights.set(this.weights.subarray(0, keep));
    times.length = keep;
    let prev: TimeParts | null = keep > 0 ? partsOf(times[keep - 1]) : null;
    for (let i = keep; i < extent; i++) {
      // Past the last bar the slots' times are extrapolated, as the axis does.
      const time = (i < n ? data[i].time : barIndexToTime(i, data as ReadonlyArray<{ time: number }>)) * unit;
      const parts = partsOf(time);
      // Bars at one time (bricks made from the same bar) start nothing: only the first is weighed.
      weights[i] = i > 0 && time === times[i - 1] ? 0 : markWeight(prev, parts);
      times[i] = time;
      prev = parts;
    }
    this.weights = weights;
    this.times = times;
    this.weighed = { bars: n, tz, exchangeZone, daily, extent, unit };
    this.revision++;
  }

  private choose(gapBars: number, extent: number): void {
    const c = this.chosenFor;
    if (c && c.gapBars === gapBars && c.extent === extent && c.revision === this.revision) return;
    const weights = this.weights;
    const blocked = new Uint8Array(extent);
    const picked: number[] = [];
    // The slots of each weight in order, by a counting sort: each level then
    // walks its own slots, not all of them once per level.
    const starts = new Int32Array(WEIGHT_RANGE + 1);
    for (let i = 0; i < extent; i++) starts[weights[i] + 1]++;
    for (let k = 1; k <= WEIGHT_RANGE; k++) starts[k] += starts[k - 1];
    const bySlot = new Int32Array(extent);
    const next = starts.slice(0, WEIGHT_RANGE);
    for (let i = 0; i < extent; i++) bySlot[next[weights[i]]++] = i;
    for (const level of LEVELS) {
      for (let k = starts[level]; k < starts[level + 1]; k++) {
        const i = bySlot[k];
        if (blocked[i]) continue;
        picked.push(i);
        const lo = Math.max(0, i - gapBars + 1);
        const hi = Math.min(extent - 1, i + gapBars - 1);
        for (let j = lo; j <= hi; j++) blocked[j] = 1;
      }
    }
    this.chosen = Int32Array.from(picked).sort();
    this.chosenFor = { gapBars, extent, revision: this.revision };
  }
}
