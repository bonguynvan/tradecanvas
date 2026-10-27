import type { DataSeries, OHLCBar } from '@tradecanvas/commons';
import { normalizeBarTime } from '@tradecanvas/commons';
import { DataManager, isValidBar, lastIndexOfTime, sameBar, sanitizeBar, timeInUnitOf, withTimeOf } from './DataManager.js';

/** Which bar times the chart shows, for bars like these; null: all of them. */
export type HoursFilter = (bars: readonly { time: number }[]) => ((time: number) => boolean) | null;

/** What a write did with a bar. */
export interface SeriesWrite {
  /**
   * Where the bar went: kept aside during a replay, into the whole series
   * only (outside the hours shown), onto the bars shown, or nowhere (older
   * than the last, from a stream).
   */
  readonly to: 'aside' | 'hidden' | 'shown' | 'none';
  /** The number of bars shown before it went on, after any filtering it set off. */
  readonly before: number;
  /** Whether the bars shown were filtered again first: any copy of them is stale. */
  readonly refiltered: boolean;
}

/** What a correction did with a bar (`replace`). */
export interface SeriesCorrection {
  /**
   * Where the bar was: in the live series kept aside during a replay, in the
   * whole series only (outside the hours shown), among the bars shown, or
   * nowhere (no loaded bar has its time, or the chart can't take it).
   */
  readonly to: 'aside' | 'hidden' | 'shown' | 'none';
  /** Its index among the bars shown; -1 when it isn't one of them. */
  readonly index: number;
  /** Whether its values changed: false for the bar loaded sent again, after the repairs every write makes. */
  readonly changed: boolean;
}

const NOWHERE: SeriesCorrection = { to: 'none', index: -1, changed: false };

/** What a batch of new bars did: how many the chart shows, from how many before. */
export interface SeriesBatch {
  /** Bars that went onto the bars shown (none during a replay). */
  readonly shown: number;
  /** The number of bars shown before them, after any filtering they set off. */
  readonly before: number;
  readonly refiltered: boolean;
  /** Whether they were kept aside, a replay running. */
  readonly aside: boolean;
}

/** What a page of older bars did: the bars it added to those shown, and all it took, hidden ones too. */
export interface SeriesPage {
  readonly added: number;
  readonly taken: number;
}

/** A bar onto a series by its time: the last one again, a new one after it, or an older one. */
export function barPlacement(series: readonly OHLCBar[], bar: OHLCBar): 'append' | 'update' | 'stale' {
  const last = series[series.length - 1];
  if (!last) return 'append';
  // Live bars are recent, so each time's own size tells its unit (a stream
  // in ms may feed a series in seconds).
  const at = normalizeBarTime(bar.time);
  const lastAt = normalizeBarTime(last.time);
  return at > lastAt ? 'append' : at === lastAt ? 'update' : 'stale';
}

/** Whether a bar's time and prices are all numbers. */
export function isWholeBar(b: OHLCBar): boolean {
  return [b.time, b.open, b.high, b.low, b.close].every(Number.isFinite);
}

/**
 * The chart's bars, and every way they change. It holds the bars the chart
 * shows; while the hours outside the symbol's regular ones are hidden, the
 * whole series beside them; and during a replay the live series, which every
 * live write goes to until the replay ends. Writes that take a bar say what
 * they did with it, for the chart to follow.
 */
export class SeriesStore {
  private readonly shown = new DataManager();
  /** Every bar, while some are hidden; null while all are shown. */
  private whole: OHLCBar[] | null = null;
  /** The live series during a replay, which the bars shown no longer follow. */
  private aside: DataManager | null = null;
  /** Bumped by every bar shown replaced in place (`replace`): what keeps a copy of the bars by their array writes them again. */
  private shownRevision = 0;

  constructor(private readonly hoursFilter: HoursFilter) {}

  /** The bars the chart shows. */
  bars(): DataSeries {
    return this.shown.getData();
  }

  length(): number {
    return this.shown.getLength();
  }

  /**
   * Moves when a bar shown was replaced in place, the array the same: a copy
   * kept by the array and a few bars it samples (the GPU's) is stale.
   */
  revision(): number {
    return this.shownRevision;
  }

  /** The live series: kept aside during a replay, else every bar, hidden ones too. */
  liveBars(): DataSeries {
    return this.aside?.getData() ?? this.whole ?? this.shown.getData();
  }

  // --- A whole series ---

  /** A new series: the bars shown are those of `bars` in the hours shown. */
  load(bars: DataSeries): void {
    this.shown.setData(this.regularOnly(bars));
  }

  /**
   * Older bars in front of the series held: those before its first, once
   * each. Returns how many the chart shows (`added`) and how many it took,
   * hidden ones too (`taken`).
   */
  prepend(bars: readonly OHLCBar[]): SeriesPage {
    let taken: number | null = null;
    let onShown: readonly OHLCBar[] = bars;
    if (this.whole) {
      const first = this.whole[0]?.time;
      const seen = new Set<number>();
      const older = bars
        .filter(isWholeBar)
        .map((b) => this.inSeriesUnit(b))
        .filter((b) => (first === undefined || b.time < first) && !seen.has(b.time) && seen.add(b.time))
        .sort((a, b) => a.time - b.time);
      this.whole = [...older, ...this.whole];
      const keep = this.hoursFilter(this.whole);
      taken = older.length;
      onShown = keep ? older.filter((b) => keep(b.time)) : older;
    }
    const added = this.shown.prependBars(onShown);
    return { added, taken: taken ?? added };
  }

  /**
   * A stream's snapshot for the series held (a reconnect): the older bars
   * paged in before it are kept. False when it doesn't reach back over them
   * (after a longer outage it starts later, and joining them would hide a
   * gap): load it instead.
   */
  mergeSnapshot(bars: DataSeries): boolean {
    const data = this.whole ?? this.shown.getData();
    const first = bars[0]?.time;
    let keep = 0;
    while (first !== undefined && keep < data.length && data[keep].time < first) keep++;
    if (keep === 0 || keep === data.length) return false;
    this.shown.setData(this.regularOnly(data.slice(0, keep).concat(bars)));
    return true;
  }

  /** The bars shown again after the extended hours or the symbol's hours changed: whether they did. */
  refilter(): boolean {
    if (this.aside) return false; // the replay's end brings the series back through the filter
    const all = this.whole ?? this.shown.getData().slice();
    if (!this.whole && !this.hoursFilter(all)) return false; // nothing hidden before or now
    this.shown.setData(this.regularOnly(all));
    return true;
  }

  // --- Live bars ---

  /** A new bar after the last, from the host: on the bars shown unless outside the hours shown. */
  append(given: OHLCBar): SeriesWrite {
    if (this.aside) {
      this.aside.appendBar(given);
      return this.wrote('aside', false);
    }
    const bar = this.inSeriesUnit(given);
    const refiltered = this.startWholeSeries(bar, 'append');
    if (!this.take(bar, 'append')) return this.wrote('hidden', refiltered);
    const before = this.shown.getLength();
    this.shown.appendBar(bar);
    return { to: 'shown', before, refiltered };
  }

  /** New bars after the last, from the host: the ones shown and what the first write set off. */
  appendMany(bars: readonly OHLCBar[]): SeriesBatch {
    if (this.aside) {
      for (const bar of bars) this.aside.appendBar(bar);
      return { shown: 0, before: this.shown.getLength(), refiltered: false, aside: true };
    }
    let refiltered = false;
    const onShown: OHLCBar[] = [];
    for (const given of bars) {
      const bar = this.inSeriesUnit(given);
      refiltered = this.startWholeSeries(bar, 'append') || refiltered;
      if (this.take(bar, 'append')) onShown.push(bar);
    }
    const before = this.shown.getLength();
    for (const bar of onShown) this.shown.appendBar(bar);
    return { shown: onShown.length, before, refiltered, aside: false };
  }

  /** The forming bar again, from the host. */
  updateLast(given: OHLCBar): SeriesWrite {
    if (this.aside) {
      this.aside.updateLastBar(given);
      return this.wrote('aside', false);
    }
    const bar = this.inSeriesUnit(given);
    const refiltered = this.startWholeSeries(bar, 'update');
    if (!this.take(bar, 'update')) return this.wrote('hidden', refiltered);
    const before = this.shown.getLength();
    this.shown.updateLastBar(bar);
    return { to: 'shown', before, refiltered };
  }

  /** A trade into the forming bar. One outside the hours shown moves no bar. */
  mergeTick(tick: { price: number; volume?: number; time: number }): SeriesWrite {
    if (this.aside) {
      this.aside.updateLastBarFromTick(tick);
      return this.wrote('aside', false);
    }
    const keep = this.whole ? this.hoursFilter(this.whole) : null;
    if (keep && this.whole && !keep(timeInUnitOf(this.whole, tick.time))) return this.wrote('hidden', false);
    const before = this.shown.getLength();
    this.shown.updateLastBarFromTick(tick);
    // While extended hours are hidden, the whole series keeps the same bar.
    const whole = this.whole;
    const merged = this.shown.getData()[this.shown.getLength() - 1];
    if (whole && merged && whole.length > 0 && whole[whole.length - 1].time === merged.time) whole[whole.length - 1] = merged;
    return { to: 'shown', before, refiltered: false };
  }

  /**
   * A stream's bar, placed by its time: the last bar again, a new one after
   * it, or none when it is older. During a replay it goes onto the live
   * series kept aside the same way.
   */
  placeStreamBar(given: OHLCBar): SeriesWrite {
    if (this.aside) {
      const how = barPlacement(this.aside.getData(), given);
      if (how === 'append') this.aside.appendBar(given);
      else if (how === 'update') this.aside.updateLastBar(given);
      return this.wrote(how === 'stale' ? 'none' : 'aside', false);
    }
    const bar = this.inSeriesUnit(given);
    const how = barPlacement(this.whole ?? this.shown.getData(), bar);
    if (how === 'stale') return this.wrote('none', false);
    const refiltered = this.startWholeSeries(bar, how);
    if (!this.take(bar, how)) return this.wrote('hidden', refiltered);
    const before = this.shown.getLength();
    const onShown = barPlacement(this.shown.getData(), bar);
    if (onShown === 'stale') return { to: 'none', before, refiltered };
    if (onShown === 'append') this.shown.appendBar(bar);
    else this.shown.updateLastBar(bar);
    return { to: 'shown', before, refiltered };
  }

  /**
   * A loaded bar again, with new values: the bar with the same time,
   * wherever it is, repaired as every write repairs a bar. During a replay
   * it is the live series kept aside; outside the hours shown, the whole
   * series only. Nowhere when no loaded bar has its time: a bar the chart
   * left out (it couldn't take it) isn't loaded either. Bar times don't
   * change, so the hours shown need no filtering again.
   */
  replace(given: OHLCBar): SeriesCorrection {
    if (this.aside) {
      const { index, changed } = this.aside.replaceBar(given);
      return index < 0 ? NOWHERE : { to: 'aside', index: -1, changed };
    }
    if (!isValidBar(given)) return NOWHERE;
    const bar = this.inSeriesUnit(given);
    const whole = this.whole;
    const at = whole ? lastIndexOfTime(whole, bar.time) : -1;
    if (whole) {
      if (at < 0 || !isValidBar(whole[at])) return NOWHERE;
      const keep = this.hoursFilter(whole);
      if (keep && !keep(bar.time)) return this.replaceHidden(whole, at, bar);
    }
    const { index, changed } = this.shown.replaceBar(bar);
    if (index < 0) return NOWHERE;
    if (changed) {
      // The whole series holds the same bar as the one shown, as a tick leaves it.
      if (whole) whole[at] = this.shown.getData()[index];
      this.shownRevision++;
    }
    return { to: 'shown', index, changed };
  }

  /** A stream's snapshot during a replay: the live series kept aside. */
  loadAside(bars: DataSeries): void {
    this.aside?.setData(bars);
  }

  // --- A replay ---

  /** A replay begins: the live series is kept aside, and the bars shown are the replay's. */
  beginReplay(): void {
    if (this.aside) return;
    this.aside = new DataManager();
    this.aside.setData(this.whole ?? this.shown.getData());
  }

  /** The replay ends: the live series kept aside, to load again; null without a replay. */
  endReplay(): DataSeries | null {
    const aside = this.aside;
    this.aside = null;
    return aside ? aside.getData() : null;
  }

  /** The bars of `all` the chart would show in the hours shown (no state kept). */
  inHoursShown(all: DataSeries): OHLCBar[] {
    const keep = this.hoursFilter(all);
    return keep ? all.filter((b) => keep(b.time)) : all.slice();
  }

  /** The replay's bars as far as it has come. */
  showReplayed(bars: DataSeries): void {
    this.shown.setData(bars);
  }

  /** The replay steps on: a bar after the last. */
  appendReplayed(bar: OHLCBar): void {
    this.shown.appendBar(bar);
  }

  /** The replay's forming bar again. */
  updateReplayed(bar: OHLCBar): void {
    this.shown.updateLastBar(bar);
  }

  // --- Hidden hours ---

  /**
   * A bar in the unit of the series held (the whole one while some bars are
   * hidden), so the whole series never mixes seconds and milliseconds.
   */
  private inSeriesUnit(bar: OHLCBar): OHLCBar {
    return withTimeOf(this.whole ?? this.shown.getData(), bar);
  }

  /** A bar outside the hours shown, corrected in the whole series only: it shows with the hours. */
  private replaceHidden(whole: OHLCBar[], at: number, bar: OHLCBar): SeriesCorrection {
    const repaired = sanitizeBar(bar);
    const changed = !sameBar(whole[at], repaired);
    if (changed) whole[at] = repaired;
    return { to: 'hidden', index: -1, changed };
  }

  private wrote(to: SeriesWrite['to'], refiltered: boolean): SeriesWrite {
    return { to, before: this.shown.getLength(), refiltered };
  }

  /** The bars of `all` shown; while some are hidden, `all` is kept as the whole series. */
  private regularOnly(all: DataSeries): DataSeries {
    const keep = this.hoursFilter(all);
    this.whole = keep ? all.slice() : null;
    return keep ? all.filter((b) => keep(b.time)) : all;
  }

  /**
   * Hidden hours with no whole series yet (too few bars to tell the
   * interval): start one now if the bar tells it. Whether that filtered the
   * bars shown.
   */
  private startWholeSeries(bar: OHLCBar, how: 'append' | 'update'): boolean {
    if (this.whole) return false;
    const data = this.shown.getData();
    // The interval is told by the last bars: no need to copy the rest.
    const tail = data.slice(-12);
    const all = how === 'append' || tail.length === 0 ? [...tail, bar] : [...tail.slice(0, -1), bar];
    if (!this.hoursFilter(all)) return false;
    this.whole = data.slice();
    const keep = this.hoursFilter(this.whole.length > 1 ? this.whole : all);
    if (!keep || !data.some((b) => !keep(b.time))) return false;
    this.shown.setData(data.filter((b) => keep(b.time)));
    return true;
  }

  /** A new or updated bar into the whole series (while one is kept): whether the chart shows it. */
  private take(bar: OHLCBar, how: 'append' | 'update'): boolean {
    const whole = this.whole;
    if (!whole) return true;
    if (how === 'append' || whole.length === 0) whole.push(bar);
    else whole[whole.length - 1] = bar;
    const keep = this.hoursFilter(whole);
    return !keep || keep(bar.time);
  }
}
