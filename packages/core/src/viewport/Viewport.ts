import type { BarLayout, ViewportState, Rect, DataSeries, PriceScaleMode, ScaleMargins } from '@tradecanvas/commons';
import { PHI, clamp, computePriceRange, fitPriceRange } from '@tradecanvas/commons';
import { DEFAULT_BAR_WIDTH, DEFAULT_BAR_SPACING, PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@tradecanvas/commons';

/**
 * Narrowest bar slot (bar + gap) in CSS pixels. Below the usual floor (the
 * slot whose body is `minBarWidth`) the chart only zooms out as far as it
 * takes to fit every loaded bar, and never past this.
 */
export const MIN_BAR_UNIT = 0.25;
/** The narrowest `setMinBarUnit` allows: 50 bars a pixel. */
export const MIN_BAR_UNIT_LIMIT = 0.02;

/** A golden bar's body: this share of its slot. */
const GOLDEN_BODY = 1 / PHI;
/** Where a golden chart opens: φ⁴ px a slot. */
const GOLDEN_OPENING_SLOT = PHI ** 4;

/** Room above the highest high and below the lowest low: φ⁻⁵ (9%) of the scale's height. */
export const PRICE_SCALE_MARGIN = PHI ** -5;
/** Margins must leave the prices at least this share of the height. */
const MIN_PRICE_SHARE = 0.2;

export class Viewport {
  private state: ViewportState;
  // A field rather than state: computeChartRect runs while state is being built.
  private priceAxisWidth = PRICE_AXIS_WIDTH;
  /**
   * `getState()` used to deep-clone on every single call — cheap in
   * isolation, but a single render pass calls it 8-10+ times (render
   * context, panel layout, overlay plugins, event emission, …), and it
   * runs on every pan/zoom/resize frame. That's a lot of short-lived
   * garbage generated at 60fps, which shows up as GC-pause micro-stutter
   * during continuous dragging. Cached here and invalidated by every
   * mutating method instead — multiple reads between mutations now return
   * the same object instead of re-cloning.
   */
  private stateCache: ViewportState | null = null;
  private dataLength = 0;
  private margins: ScaleMargins = { top: PRICE_SCALE_MARGIN, bottom: PRICE_SCALE_MARGIN };
  private minBarWidth: number;
  private maxBarWidth: number;
  private rightMarginBars: number;
  private freePan = true;
  private minVisibleBars = 3;
  private minBarUnit = MIN_BAR_UNIT;
  private barLayout: BarLayout = 'classic';

  constructor(
    containerWidth: number,
    containerHeight: number,
    minBarWidth = 2,
    maxBarWidth = 30,
    rightMarginBars = 5,
  ) {
    this.minBarWidth = minBarWidth;
    this.maxBarWidth = maxBarWidth;
    this.rightMarginBars = rightMarginBars;
    const chartRect = this.computeChartRect(containerWidth, containerHeight);
    this.state = {
      visibleRange: { from: 0, to: 0 },
      priceRange: { min: 0, max: 1 },
      barWidth: DEFAULT_BAR_WIDTH,
      barSpacing: DEFAULT_BAR_SPACING,
      offset: 0,
      chartRect,
    };
  }

  /**
   * Returns a snapshot (deep copy). Safe to store/pass. Cached: repeated
   * calls between mutations return the same object rather than re-cloning.
   */
  getState(): ViewportState {
    if (!this.stateCache) {
      this.stateCache = {
        visibleRange: { ...this.state.visibleRange },
        priceRange: { ...this.state.priceRange },
        barWidth: this.state.barWidth,
        barSpacing: this.state.barSpacing,
        offset: this.state.offset,
        chartRect: { ...this.state.chartRect },
        logScale: this.state.logScale,
        scaleMode: this.state.scaleMode,
        scaleBaseline: this.state.scaleBaseline,
        invertScale: this.state.invertScale,
        priceAxisWidth: this.state.priceAxisWidth,
        formatPrice: this.state.formatPrice,
        numberLocale: this.state.numberLocale,
        pricePrecision: this.state.pricePrecision,
        priceUnit: this.state.priceUnit,
      };
    }
    return this.stateCache;
  }

  /** Drop the cached snapshot — called by every method that mutates `state`. */
  private invalidate(): void {
    this.stateCache = null;
  }

  setLogScale(enabled: boolean): void {
    this.setScaleMode(enabled ? 'logarithmic' : 'regular');
  }

  isLogScale(): boolean {
    return (this.state.scaleMode ?? (this.state.logScale ? 'logarithmic' : 'regular')) === 'logarithmic';
  }

  /** Set the price-scale presentation. Keeps `logScale` mirrored for back-compat. */
  setScaleMode(mode: PriceScaleMode): void {
    this.state.scaleMode = mode;
    this.state.logScale = mode === 'logarithmic';
    this.invalidate();
  }

  getScaleMode(): PriceScaleMode {
    return this.state.scaleMode ?? (this.state.logScale ? 'logarithmic' : 'regular');
  }

  /** Turn the price scale upside down (higher prices lower on screen). */
  setInvertScale(inverted: boolean): void {
    this.state.invertScale = inverted;
    this.invalidate();
  }

  isInvertScale(): boolean {
    return this.state.invertScale === true;
  }

  /** The number locale prices on the scale are grouped in. */
  setNumberLocale(locale: string): void {
    this.state.numberLocale = locale;
    this.invalidate();
  }

  /**
   * Decimals prices on the scale show, the market's or the symbol's; null
   * (or anything but a whole number from 0 up) leaves each label its own.
   */
  setPricePrecision(precision: number | null): void {
    this.state.pricePrecision = precision !== null && Number.isInteger(precision) && precision >= 0 ? precision : undefined;
    this.invalidate();
  }

  /** How prices on the scale read (null: decimals), and the step they move in (a fraction's). */
  setPriceFormat(format: ((price: number) => string) | null, unit: number | null = null): void {
    this.state.formatPrice = format ?? undefined;
    this.state.priceUnit = unit ?? undefined;
    this.invalidate();
  }

  /** Reference price for percentage / indexed-to-100 axis labels. */
  setScaleBaseline(price: number | undefined): void {
    this.state.scaleBaseline = price;
    this.invalidate();
  }

  setRightMargin(bars: number): void {
    this.rightMarginBars = bars;
  }

  getRightMargin(): number {
    return this.rightMarginBars;
  }

  /**
   * How far the chart can be dragged. `freePan` (default) allows dragging
   * past the newest bar into empty future space, or past the
   * oldest bar, until only `minVisibleBars` bars remain at the edge. With
   * `freePan: false` the newest bar stops at its resting position, as in 1.x
   * before 1.3.
   */
  setPanLimits(limits: { freePan?: boolean; minVisibleBars?: number }): void {
    if (limits.freePan !== undefined) this.freePan = limits.freePan;
    if (limits.minVisibleBars !== undefined) this.minVisibleBars = Math.max(1, Math.floor(limits.minVisibleBars));
    this.clampOffset();
    this.updateVisibleRange();
  }

  /** Offset at which the newest bar sits `rightMargin` bars from the right edge — the resting view. */
  private endOffset(): number {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    return this.dataLength * barUnit - this.state.chartRect.width + this.rightMarginBars * barUnit;
  }

  /** Width of the price axis strip; see `ViewportState.priceAxisWidth`. */
  setPriceAxisWidth(width: number): void {
    if (this.priceAxisWidth === width) return;
    this.priceAxisWidth = width;
    this.state.priceAxisWidth = width;
    this.invalidate();
  }

  private computeChartRect(width: number, height: number): Rect {
    return {
      x: 0,
      y: 0,
      width: Math.max(0, width - this.priceAxisWidth),
      height: Math.max(0, height - TIME_AXIS_HEIGHT),
    };
  }

  resize(width: number, height: number): void {
    this.state.chartRect = this.computeChartRect(width, height);
    this.invalidate();
    this.clampUnit();
    this.clampOffset();
  }

  setChartRect(rect: Rect): void {
    this.state.chartRect = {
      x: rect.x,
      y: rect.y,
      width: Math.max(0, rect.width),
      height: Math.max(0, rect.height),
    };
    this.invalidate();
    this.clampUnit();
    this.clampOffset();
    this.updateVisibleRange();
  }

  /**
   * How a bar fills its slot (see `BarLayout`). Before any bars the chart
   * opens at the layout's own slot; over bars on screen the zoom stays and
   * only its split into body and gap changes.
   */
  setBarLayout(layout: BarLayout): void {
    const next: BarLayout = layout === 'golden' ? 'golden' : 'classic';
    if (next === this.barLayout) return;
    // A view at the newest bar stays there, though the other layout's limits
    // may move the slot (golden zooms further in and out than classic).
    const atEnd = this.dataLength > 0 && this.isAtEnd();
    this.barLayout = next;
    this.applyUnit(this.dataLength === 0 ? this.openingUnit() : this.state.barWidth + this.state.barSpacing);
    this.clampUnit();
    if (atEnd) {
      this.state.offset = this.endOffset();
      this.invalidate();
    }
    this.clampOffset();
    this.updateVisibleRange();
  }

  getBarLayout(): BarLayout {
    return this.barLayout;
  }

  /** The slot a chart opens at: 10 px classic (8 and a 2 px gap), φ⁴ golden. */
  private openingUnit(): number {
    return this.barLayout === 'golden' ? GOLDEN_OPENING_SLOT : DEFAULT_BAR_WIDTH + DEFAULT_BAR_SPACING;
  }

  /** The usual narrowest slot: where the body is `minBarWidth` (classic: and the 2px gap). */
  private floorUnit(): number {
    return this.barLayout === 'golden' ? this.minBarWidth / GOLDEN_BODY : this.minBarWidth + DEFAULT_BAR_SPACING;
  }

  /**
   * The narrowest slot right now: the usual floor, or less when the loaded
   * bars only fit below it — down to `minBarUnit` (`MIN_BAR_UNIT` unless set).
   */
  private minUnit(): number {
    const floor = this.floorUnit();
    const width = this.state.chartRect.width;
    const slots = this.dataLength + this.rightMarginBars;
    if (width <= 0 || slots <= 0) return floor;
    return Math.max(this.minBarUnit, Math.min(floor, width / slots));
  }

  /**
   * How narrow a slot may get to fit a long series, px: `MIN_BAR_UNIT` (four
   * bars a pixel) by default, down to `MIN_BAR_UNIT_LIMIT`. Below a pixel the
   * bars are drawn a pixel column at a time. Anything else sets the default.
   */
  setMinBarUnit(px: number): void {
    this.minBarUnit = Number.isFinite(px) ? Math.max(MIN_BAR_UNIT_LIMIT, Math.min(px, this.floorUnit())) : MIN_BAR_UNIT;
    this.clampUnit();
    this.clampOffset();
    this.updateVisibleRange();
    this.invalidate();
  }

  getMinBarUnit(): number {
    return this.minBarUnit;
  }

  private maxUnit(): number {
    return this.barLayout === 'golden' ? this.maxBarWidth / GOLDEN_BODY : this.maxBarWidth + DEFAULT_BAR_SPACING;
  }

  /**
   * Split a slot into bar and gap. Golden: the body is φ⁻¹ of it, at every
   * size. Classic: above the floor the gap stays 2px, below it both shrink
   * in the floor's proportions, so the bars never turn into gaps.
   */
  private applyUnit(unit: number): void {
    const floor = this.floorUnit();
    if (this.barLayout === 'golden') {
      this.state.barWidth = unit * GOLDEN_BODY;
      this.state.barSpacing = unit - this.state.barWidth;
    } else if (unit >= floor) {
      this.state.barWidth = unit - DEFAULT_BAR_SPACING;
      this.state.barSpacing = DEFAULT_BAR_SPACING;
    } else {
      const share = this.minBarWidth / floor;
      this.state.barWidth = unit * share;
      this.state.barSpacing = unit - this.state.barWidth;
    }
    this.invalidate();
  }

  /**
   * Keep the slot within the current limits — a dense zoom of a long series
   * grows back to the floor when a shorter one replaces it. Keeps the bar at
   * the left edge in place.
   */
  private clampUnit(): void {
    const unit = this.state.barWidth + this.state.barSpacing;
    const next = clamp(unit, this.minUnit(), this.maxUnit());
    if (next === unit || unit <= 0) return;
    this.state.offset = (this.state.offset / unit) * next;
    this.applyUnit(next);
  }

  updateData(data: DataSeries, autoScale: boolean): void {
    const wasEmpty = this.dataLength === 0;
    this.dataLength = data.length;
    if (this.dataLength === 0) return;
    this.clampUnit();
    // A chart that gets its first bars (e.g. only via appendBar) rests at the
    // live edge, so following new bars works from the start.
    if (wasEmpty) this.state.offset = this.endOffset();

    this.clampOffset();
    this.updateVisibleRange();

    if (autoScale) {
      const { min, max } = computePriceRange(data, this.state.visibleRange.from, Math.min(this.state.visibleRange.to, this.dataLength - 1), 0);
      this.fitToPrices(min, max);
    }
  }

  /**
   * Room the fitted scale leaves above the highest price and below the
   * lowest, as shares of its height. Margins that leave the prices less than
   * a fifth of it are refused.
   */
  setScaleMargins(margins: ScaleMargins): void {
    const ok = (v: number) => Number.isFinite(v) && v >= 0;
    if (!ok(margins.top) || !ok(margins.bottom) || 1 - margins.top - margins.bottom < MIN_PRICE_SHARE) return;
    this.margins = { top: margins.top, bottom: margins.bottom };
  }

  getScaleMargins(): ScaleMargins {
    return { ...this.margins };
  }

  /** Fit the scale to `min`..`max` with its margins. */
  fitToPrices(min: number, max: number): void {
    this.state.priceRange = fitPriceRange(min, max, this.margins, this.isLogScale());
    this.invalidate();
  }

  /**
   * The bars on screen moved `count` slots right (bars added in front of the
   * data; negative when a reshaped series lost some): move the view with
   * them, so the same bars stay on screen.
   */
  prependBars(count: number): void {
    if (count === 0 || !Number.isFinite(count)) return;
    this.dataLength += count;
    this.state.offset += count * (this.state.barWidth + this.state.barSpacing);
    this.invalidate();
    this.updateVisibleRange();
  }

  setPriceRange(min: number, max: number): void {
    this.state.priceRange = { min, max };
    this.invalidate();
  }

  /**
   * Multiply the visible price range by `factor` around its midpoint.
   * `factor > 1` expands (zooms out vertically), `< 1` compresses.
   * Used by drag-on-price-axis scaling.
   */
  scalePriceRange(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const { min, max } = this.state.priceRange;
    const mid = (min + max) / 2;
    const half = (max - min) / 2;
    const newHalf = Math.max(half * factor, 1e-9);
    this.state.priceRange = { min: mid - newHalf, max: mid + newHalf };
    this.invalidate();
  }

  scrollBy(deltaPixels: number): void {
    this.state.offset += deltaPixels;
    this.invalidate();
    this.clampOffset();
    this.updateVisibleRange();
  }

  /**
   * Shift the visible price range vertically by a pixel delta, keeping its
   * span fixed. `deltaPixels` uses PanHandler's sign (`lastY - y`), so a
   * drag UP is positive and moves the candles up with the cursor — i.e.
   * the price window slides DOWN to lower values.
   *
   * Only meaningful with auto-scale off — otherwise the next `updateData`
   * recomputes the range and the shift is lost. Used by vertical
   * chart-body panning, the counterpart to `scrollBy` on the time axis.
   */
  panPriceRange(deltaPixels: number): void {
    const h = this.state.chartRect.height;
    if (h <= 0 || deltaPixels === 0) return;
    const { min, max } = this.state.priceRange;
    // Upside down, dragging up has to reveal higher prices instead.
    const frac = (this.state.invertScale ? -deltaPixels : deltaPixels) / h;
    if (this.isLogScale() && min > 0 && max > 0) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      const shift = (logMax - logMin) * frac;
      this.state.priceRange = {
        min: Math.exp(logMin - shift),
        max: Math.exp(logMax - shift),
      };
      this.invalidate();
      return;
    }
    const shift = (max - min) * frac;
    this.state.priceRange = { min: min - shift, max: max - shift };
    this.invalidate();
  }

  /**
   * Whether the view rests at the latest bars (within two bars of the resting
   * position). Panned into history — or out into empty future space — it is
   * not, so a new bar doesn't yank the view back.
   */
  isAtEnd(): boolean {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    return Math.abs(this.state.offset - this.endOffset()) <= barUnit * 2;
  }

  scrollToEnd(): void {
    // Position last bar with rightMargin breathing room from the right edge.
    // For short data this offset is negative — that's intentional. It puts
    // the bars on the right side of the viewport with empty space on the
    // left, the usual behaviour for sparse charts.
    this.state.offset = this.endOffset();
    this.invalidate();
    this.updateVisibleRange();
  }

  zoom(delta: number, centerX: number): void {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    // Classic: above the floor the bar grows or shrinks and the gap stays, as
    // it always has; below it, and golden at every size, the whole slot scales.
    const grownBar = this.state.barWidth * (1 + delta);
    const wanted = this.barLayout === 'classic' && barUnit >= this.floorUnit() && grownBar >= this.minBarWidth
      ? grownBar + DEFAULT_BAR_SPACING
      : barUnit * (1 + delta);
    const newBarUnit = clamp(wanted, this.minUnit(), this.maxUnit());
    if (newBarUnit === barUnit) return;

    const atEnd = this.isAtEnd();
    const centerBarIndex = (this.state.offset + centerX) / barUnit;

    this.applyUnit(newBarUnit);
    // Zooming at the live edge keeps the newest bar pinned there, instead of
    // drifting off it and silently stopping the follow of new bars.
    this.state.offset = atEnd ? this.endOffset() : centerBarIndex * newBarUnit - centerX;
    this.invalidate();

    this.clampOffset();
    this.updateVisibleRange();
  }

  /**
   * Fit bar slots `from`..`to` (inclusive, fractional allowed, may extend past
   * the data) across the chart width. If the slot hits its min/max the range
   * is centred instead.
   */
  zoomToBarRange(from: number, to: number): void {
    const width = this.state.chartRect.width;
    if (width <= 0 || !Number.isFinite(from) || !Number.isFinite(to) || to < from) return;
    const slots = to - from + 1;
    const unit = clamp(width / slots, this.minUnit(), this.maxUnit());
    this.applyUnit(unit);
    this.state.offset = ((from + to + 1) / 2) * unit - width / 2;
    this.invalidate();
    this.clampOffset();
    this.updateVisibleRange();
  }

  private clampOffset(): void {
    if (this.state.chartRect.width <= 0) return;
    const barUnit = this.state.barWidth + this.state.barSpacing;
    const width = this.state.chartRect.width;

    // Natural "scrolled to end" offset — last bar `rightMarginPx` from the
    // right edge of the chart area. Positive when data overflows the
    // viewport, negative when data is shorter than the viewport.
    const endOffset = this.endOffset();

    let minOffset: number;
    let maxOffset: number;

    if (this.freePan && this.dataLength > 0) {
      // Drag until only `minVisibleBars` bars remain —
      // the newest ones at the left edge (empty future to the right) or the
      // oldest ones at the right edge. Same rule for long and short series.
      const keep = Math.min(this.minVisibleBars, this.dataLength);
      minOffset = keep * barUnit - width;
      maxOffset = (this.dataLength - keep) * barUnit;
      // Never lock the resting view out (e.g. a huge right margin).
      minOffset = Math.min(minOffset, endOffset);
      maxOffset = Math.max(maxOffset, endOffset);
    } else if (endOffset > 0) {
      // Long data: user can pan left to history or scroll right to the end.
      // Allow a half-viewport of "empty space on the left" past offset 0
      // for breathing room when looking at the oldest bars.
      minOffset = -(width * 0.5);
      maxOffset = endOffset;
    } else {
      // Short data: every bar already fits, with empty space left over — the
      // right-aligned `endOffset` is still where the view RESTS by default
      // (unchanged), but it is no longer a lock. A trader
      // reasonably expects to drag the (few) bars toward the centre or left of
      // the pane instead of having them welded to the right edge — reported
      // against a 3-bar year chart, 2026-08-27. Half a viewport of play on each
      // side of the resting position mirrors the "long data" branch's own
      // half-viewport breathing room above, rather than inventing a new
      // constant.
      const play = width * 0.5;
      minOffset = endOffset - play;
      maxOffset = endOffset + play;
    }

    this.state.offset = clamp(this.state.offset, minOffset, maxOffset);
    this.invalidate();
  }

  private updateVisibleRange(): void {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    if (barUnit <= 0 || this.state.chartRect.width <= 0) return;
    const from = Math.floor(this.state.offset / barUnit);
    const visibleBars = Math.ceil(this.state.chartRect.width / barUnit) + 1;
    const to = Math.min(from + visibleBars, this.dataLength - 1);
    this.state.visibleRange = { from: Math.max(0, from), to: Math.max(0, to) };
    this.invalidate();
  }
}
