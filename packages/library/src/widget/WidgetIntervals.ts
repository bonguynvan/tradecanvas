import type { TimeFrame } from '@tradecanvas/commons';
import { barTimeUnit, offsetAt, tickBarCount } from '@tradecanvas/commons';
import { WidgetIntervalInput } from './WidgetIntervalInput.js';
import { parseTimeframeInput, timeframeForRange, timeframeLabel, withExtraTimeframes } from './widgetTimeframes.js';
import { rangePresetStart, servesTimeframe, type RangePreset } from '@tradecanvas/core';
import { inferTimeframeMs } from '../io/index.js';
import { timeframeToMs } from '@tradecanvas/commons';
import type { ChartWidget } from './ChartWidget.js';

/** Recent bars looked at to tell a market open on weekends. */
const WEEKDAY_SAMPLE = 200;

/** What the intervals read of the widget around them, and ask of them. */
export interface IntervalsHost {
  readonly adapter: ChartWidget['adapter'];
  readonly baseSeries: ChartWidget['baseSeries'];
  readonly baseTimeframeMs: ChartWidget['baseTimeframeMs'];
  readonly chart: ChartWidget['chart'];
  chosenTimeframe: ChartWidget['chosenTimeframe'];
  readonly customTimeframes: ChartWidget['customTimeframes'];
  readonly destroyed: ChartWidget['destroyed'];
  displayTimezone: ChartWidget['displayTimezone'];
  readonly featureState: ChartWidget['featureState'];
  handleTimeframe: ChartWidget['handleTimeframe'];
  readonly options: ChartWidget['options'];
  say: ChartWidget['say'];
  readonly state: ChartWidget['state'];
  switchTimeframe: ChartWidget['switchTimeframe'];
  readonly timeframeFavorites: ChartWidget['timeframeFavorites'];
  timeframes: ChartWidget['timeframes'];
  readonly toolbar: ChartWidget['toolbar'];
  updateUI: ChartWidget['updateUI'];
}

/**
 * The intervals the widget offers: the interval menu and the ones pinned to the toolbar, one
 * added, removed or made a favourite, one typed on the chart, and the range bar's presets with
 * the interval each one switches to.
 */
export class WidgetIntervals {
  constructor(private readonly host: IntervalsHost) {}

  intervalInput: WidgetIntervalInput | null = null;

  /** Counts range clicks and the user's own picks: a range waiting behind a newer one gives way. */
  rangeSeq = 0;

  /** Ranges apply one at a time, each reading the bars the last one brought. */
  private rangeQueue: Promise<void> = Promise.resolve();

  /**
   * A range from the range bar. A long one switches to the timeframe whose
   * bars it fits (five years of days in weeks, decades in months), a short
   * one back toward the user's own (`timeframeForRange`); then the range is
   * shown. Off with `features: { 'statusBar.rangeTimeframe': false }`.
   */
  applyRangePreset(preset: RangePreset): Promise<void> {
    const seq = ++this.rangeSeq;
    // One at a time; a newer click, or the user's own pick, skips one still waiting.
    this.rangeQueue = this.rangeQueue
      .then(() => this.runRangePreset(preset, seq))
      .catch((err: unknown) => {
        this.host.say(err instanceof Error ? err.message : String(err), 'error');
      });
    return this.rangeQueue;
  }

  private async runRangePreset(preset: RangePreset, seq: number): Promise<void> {
    const current = () => seq === this.rangeSeq && !this.host.destroyed;
    if (!current()) return;
    // The timeframe the widget started on counts as the user's until they pick one.
    this.host.chosenTimeframe ??= this.host.state.timeframe;
    const tf = this.host.featureState['statusBar.rangeTimeframe'] ? this.timeframeForPreset(preset) : this.host.state.timeframe;
    if (tf !== this.host.state.timeframe) {
      await this.host.switchTimeframe(tf);
      // Superseded while loading, or the load failed: the bars aren't the range's.
      if (!current() || (this.host.adapter && this.host.state.connectionState === 'error')) return;
    }
    this.host.chart.setVisibleRangePreset(preset);
  }

  /** The timeframe `preset` shows in, from the bars on the chart now. */
  private timeframeForPreset(preset: RangePreset): TimeFrame {
    const current = this.host.state.timeframe;
    const data = this.host.chart.getData();
    if (data.length < 2) return current;
    const unit = barTimeUnit(data);
    const end = data[data.length - 1].time * unit;
    const start = preset === 'All' ? data[0].time * unit : rangePresetStart(preset, end, this.host.displayTimezone());
    if (start === null) return current;
    let first = data.length - 1;
    while (first > 0 && data[first - 1].time * unit >= start) first--;
    // Days a market trades in a week: all seven if any recent bar falls on a weekend.
    const tz = this.host.displayTimezone();
    const weekend = data.slice(-WEEKDAY_SAMPLE).some((bar) => {
      const ms = bar.time * unit;
      const day = new Date(ms + offsetAt(tz, ms) * 60_000).getUTCDay();
      return day === 0 || day === 6;
    });
    return timeframeForRange({
      dayShare: weekend ? 1 : 5 / 7,
      spanMs: end - start,
      barsInSpan: data.length - first,
      width: this.host.chart.getPlotRect().width,
      current,
      chosen: this.host.chosenTimeframe ?? current,
      available: this.host.timeframes.filter((tf) => this.host.chart.isTimeframeAllowed(tf) && this.canShowTimeframe(tf)),
    });
  }

  /** Whether a switch to `tf` brings bars: the feed serves it, or the bars here resample to it. */
  private canShowTimeframe(tf: TimeFrame): boolean {
    if (this.host.adapter) return servesTimeframe(this.host.adapter, tf);
    if (this.host.options.resampleTimeframes === false) return false;
    const data = this.host.chart.getData();
    if (data.length < 2) return false;
    // Resampling only makes bars coarser than those it starts from.
    const base = this.host.baseSeries ? this.host.baseTimeframeMs : inferTimeframeMs(data);
    return !(base > 0) || timeframeToMs(tf) >= base;
  }

  /** Pinned timeframes that are still on offer, shortest first. */
  pinnedTimeframes(): TimeFrame[] {
    const pinned = this.host.timeframeFavorites.list();
    return this.host.timeframes.filter((tf) => pinned.includes(tf));
  }

  /** The timeframe menu's rows, typed intervals marked so they can be removed. */
  timeframeMenu(): { value: TimeFrame; label: string; custom: boolean }[] {
    return this.host.timeframes.map((value) => ({ value, label: timeframeLabel(value), custom: this.host.customTimeframes.has(value) }));
  }

  /** A typed interval: switch to it, adding and pinning it when it is new. False when it isn't one. */
  handleAddTimeframe(text: string): boolean {
    if (!this.host.featureState.customTimeframes) return false;
    const tf = parseTimeframeInput(text);
    if (!tf || !this.host.chart.isTimeframeAllowed(tf)) return false;
    if (this.host.adapter && !servesTimeframe(this.host.adapter, tf)) return false;
    // Tick bars come from a feed's trades; bars on the chart can't make them.
    if (!this.host.adapter && tickBarCount(tf) !== null) return false;
    if (!this.host.timeframes.includes(tf)) {
      this.host.customTimeframes.add(tf);
      this.host.timeframeFavorites.add(tf);
      this.host.timeframes = withExtraTimeframes(this.host.timeframes, [tf]);
      this.host.toolbar?.setTimeframes(this.timeframeMenu(), this.pinnedTimeframes());
    }
    this.host.handleTimeframe(tf);
    return true;
  }

  /** A typed interval: one on offer is picked; another joins the menu (not the toolbar's pins). */
  selectTypedTimeframe(tf: TimeFrame): boolean {
    if (!this.host.chart.isTimeframeAllowed(tf)) return false;
    // One not on offer would be added as a custom interval.
    if (!this.host.timeframes.includes(tf) && !this.host.featureState.customTimeframes) return false;
    if (this.host.adapter && !servesTimeframe(this.host.adapter, tf)) return false;
    if (!this.host.timeframes.includes(tf)) {
      this.host.customTimeframes.add(tf);
      this.host.timeframes = withExtraTimeframes(this.host.timeframes, [tf]);
      this.host.toolbar?.setTimeframes(this.timeframeMenu(), this.pinnedTimeframes());
    }
    this.host.handleTimeframe(tf);
    return true;
  }

  handleRemoveTimeframe(tf: TimeFrame): void {
    if (!this.host.customTimeframes.has(tf)) return;
    this.host.customTimeframes.remove(tf);
    this.host.timeframeFavorites.remove(tf);
    this.host.timeframes = this.host.timeframes.filter((t) => t !== tf);
    this.host.toolbar?.setTimeframes(this.timeframeMenu(), this.pinnedTimeframes());
    this.host.updateUI();
  }

  handleToggleTimeframeFavorite(tf: TimeFrame): void {
    this.host.timeframeFavorites.toggle(tf);
    this.host.toolbar?.setTimeframeFavorites(this.pinnedTimeframes());
    this.host.updateUI();
  }
}
