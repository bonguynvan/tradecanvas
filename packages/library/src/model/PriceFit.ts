import { PHI, computePriceRange, type DataSeries, type ViewportState } from '@tradecanvas/commons';
import { PRICE_SCALE_MARGIN } from '@tradecanvas/core';

/** Between the volume band and the lowest candle. */
const VOLUME_GAP = PHI ** -7;

export interface PriceRange {
  min: number;
  max: number;
}

/** The part of the viewport a fit writes to. */
export interface FitTarget {
  isInvertScale(): boolean;
  setScaleMargins(margins: { top: number; bottom: number }): void;
  fitToPrices(min: number, max: number): void;
}

/** What else is on the price scale besides the bars, read at fit time. */
export interface FitSources {
  /** Overlay indicators (Bollinger, Ichimoku…) over the bars from `from` to `to`. */
  overlayRange(from: number, to: number): PriceRange | null;
  /** The compare lines on view, or null when none are drawn. */
  compareRange(data: DataSeries, vs: ViewportState): PriceRange | null;
  /** The volume band's share of the plot when volume is on view, else null. */
  volumeRatio(data: DataSeries, from: number, to: number): number | null;
}

/**
 * When the main price scale is fitted to the bars, and what it is fitted to.
 * No DOM: the chart hands it the viewport and the other ranges on the scale.
 *
 * Auto-scale on fits every frame. Off, a new series (the first bars,
 * `setData`'s, a symbol or timeframe switch) is still fitted once, then held:
 * otherwise a chart would keep its empty 0 to 1, or the last symbol's prices.
 * Bars that come one by one into an empty chart are fitted until they fill it.
 */
export class PriceFit {
  private auto: boolean;
  /**
   * The `autoScale` asked for (the option, or `setAutoScale`), which a new
   * series goes back to. `auto` alone is also turned off by a drag of the
   * price axis or a vertical pan, which hold the range for this series only.
   */
  private preferred: boolean;
  /** A new series whose prices aren't on the axis yet. */
  private pending = true;
  /** The series began with no bars, so they come one by one: see `settle`. */
  private arriving = true;

  constructor(autoScale: boolean) {
    this.auto = autoScale;
    this.preferred = autoScale;
  }

  isAuto(): boolean {
    return this.auto;
  }

  /** Whether this frame fits the scale. */
  shouldFit(): boolean {
    return this.auto || this.pending;
  }

  /** The host's choice, kept by the series that come after. */
  setAuto(enabled: boolean, hasBars: boolean): void {
    this.auto = enabled;
    this.preferred = enabled;
    // Off once bars are coming in: held from what is on screen now, not after the next.
    if (!enabled && hasBars) this.arriving = false;
  }

  /** A drag of the price axis or a vertical pan: the range on screen is the user's, held from here. */
  hold(): void {
    this.auto = false;
    this.pending = false;
  }

  /** Auto-scale back on (a double-click of the price axis, a replay), the preference left as it is. */
  resume(): void {
    this.auto = true;
  }

  /** A new series replaced the bars: it goes back to the preference and is fitted once. */
  newSeries(empty: boolean): void {
    this.auto = this.preferred;
    this.pending = true;
    this.arriving = empty;
  }

  /**
   * After a frame was fitted: the new series' prices are on the axis once
   * some of its bars were on a plot with room for them, so auto-scale off
   * holds them from here. A chart with no size yet (a hidden tab or panel)
   * has none on view and fits them once it gets one.
   */
  settle(vs: ViewportState, shown: number): void {
    if (!this.pending || shown === 0 || vs.chartRect.width <= 0) return;
    const allOnView = vs.offset <= 0 && shown * (vs.barWidth + vs.barSpacing) - vs.offset <= vs.chartRect.width;
    if (!(this.arriving && allOnView)) this.pending = false;
  }

  /**
   * Fit the scale to the bars on view, the overlay indicators and the compare
   * lines, in margins of φ⁻⁵ above and below; with volume on view, the band
   * at the bottom is left to it.
   */
  fit(target: FitTarget, data: DataSeries, vs: ViewportState, sources: FitSources): void {
    if (data.length === 0) return;
    const from = Math.max(0, vs.visibleRange.from);
    const to = Math.min(vs.visibleRange.to, data.length - 1);
    const range = joinRanges(
      joinRanges(computePriceRange(data, from, to, 0), sources.overlayRange(from, to)),
      sources.compareRange(data, vs),
    )!;
    const ratio = sources.volumeRatio(data, from, to);
    const band = ratio === null ? PRICE_SCALE_MARGIN : ratio + VOLUME_GAP;
    // The band is at the screen's bottom: on an upside-down scale that is above the highest price.
    target.setScaleMargins(target.isInvertScale()
      ? { top: band, bottom: PRICE_SCALE_MARGIN }
      : { top: PRICE_SCALE_MARGIN, bottom: band });
    target.fitToPrices(range.min, range.max);
  }
}

/** Whether any bar from `from` to `to` traded. */
export function hasVolume(data: DataSeries, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) if (data[i].volume > 0) return true;
  return false;
}

/** Both ranges in one (either may be null). */
export function joinRanges(a: PriceRange | null, b: PriceRange | null): PriceRange | null {
  if (!a) return b;
  if (!b) return a;
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}
