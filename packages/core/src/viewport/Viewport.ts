import type { ViewportState, Rect, DataSeries } from '@tradecanvas/commons';
import { clamp, computePriceRange } from '@tradecanvas/commons';
import { DEFAULT_BAR_WIDTH, DEFAULT_BAR_SPACING, PRICE_AXIS_WIDTH, TIME_AXIS_HEIGHT } from '@tradecanvas/commons';

export class Viewport {
  private state: ViewportState;
  private dataLength = 0;
  private minBarWidth: number;
  private maxBarWidth: number;
  private rightMarginBars: number;

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

  /** Returns a snapshot (deep copy). Safe to store/pass. */
  getState(): ViewportState {
    return {
      visibleRange: { ...this.state.visibleRange },
      priceRange: { ...this.state.priceRange },
      barWidth: this.state.barWidth,
      barSpacing: this.state.barSpacing,
      offset: this.state.offset,
      chartRect: { ...this.state.chartRect },
      logScale: this.state.logScale,
    };
  }

  setLogScale(enabled: boolean): void {
    this.state.logScale = enabled;
  }

  isLogScale(): boolean {
    return this.state.logScale ?? false;
  }

  setRightMargin(bars: number): void {
    this.rightMarginBars = bars;
  }

  private computeChartRect(width: number, height: number): Rect {
    return {
      x: 0,
      y: 0,
      width: Math.max(0, width - PRICE_AXIS_WIDTH),
      height: Math.max(0, height - TIME_AXIS_HEIGHT),
    };
  }

  resize(width: number, height: number): void {
    this.state.chartRect = this.computeChartRect(width, height);
    this.clampOffset();
  }

  setChartRect(rect: Rect): void {
    this.state.chartRect = {
      x: rect.x,
      y: rect.y,
      width: Math.max(0, rect.width),
      height: Math.max(0, rect.height),
    };
    this.clampOffset();
    this.updateVisibleRange();
  }

  updateData(data: DataSeries, autoScale: boolean): void {
    this.dataLength = data.length;
    if (this.dataLength === 0) return;

    this.clampOffset();
    this.updateVisibleRange();

    if (autoScale) {
      this.state.priceRange = computePriceRange(
        data,
        this.state.visibleRange.from,
        Math.min(this.state.visibleRange.to, this.dataLength - 1),
        0.08, // 8% padding for more breathing room
      );
    }
  }

  setPriceRange(min: number, max: number): void {
    this.state.priceRange = { min, max };
  }

  scrollBy(deltaPixels: number): void {
    this.state.offset += deltaPixels;
    this.clampOffset();
    this.updateVisibleRange();
  }

  /** Returns true if the viewport is scrolled to show the latest bars. */
  isAtEnd(): boolean {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    const rightMarginPx = this.rightMarginBars * barUnit;
    const totalWidth = this.dataLength * barUnit;
    // Natural "scrolled to end" offset — may be negative when data is shorter
    // than the viewport (right-aligned with empty space on the left).
    const endOffset = totalWidth - this.state.chartRect.width + rightMarginPx;
    return this.state.offset >= endOffset - barUnit * 2;
  }

  scrollToEnd(): void {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    const rightMarginPx = this.rightMarginBars * barUnit;
    const totalWidth = this.dataLength * barUnit;
    // Position last bar with rightMargin breathing room from the right edge.
    // For short data this offset is negative — that's intentional. It puts
    // the bars on the right side of the viewport with empty space on the
    // left, matching TradingView's behaviour for sparse charts.
    this.state.offset = totalWidth - this.state.chartRect.width + rightMarginPx;
    this.updateVisibleRange();
  }

  zoom(delta: number, centerX: number): void {
    const oldBarWidth = this.state.barWidth;
    const newBarWidth = clamp(
      oldBarWidth * (1 + delta),
      this.minBarWidth,
      this.maxBarWidth,
    );
    if (newBarWidth === oldBarWidth) return;

    const barUnit = this.state.barWidth + this.state.barSpacing;
    const centerBarIndex = (this.state.offset + centerX) / barUnit;

    this.state.barWidth = newBarWidth;
    const newBarUnit = newBarWidth + this.state.barSpacing;
    this.state.offset = centerBarIndex * newBarUnit - centerX;

    this.clampOffset();
    this.updateVisibleRange();
  }

  private clampOffset(): void {
    if (this.state.chartRect.width <= 0) return;
    const barUnit = this.state.barWidth + this.state.barSpacing;
    const totalWidth = this.dataLength * barUnit;
    const rightMarginPx = this.rightMarginBars * barUnit;

    // Natural "scrolled to end" offset — last bar `rightMarginPx` from the
    // right edge of the chart area. Positive when data overflows the
    // viewport, negative when data is shorter than the viewport.
    const endOffset = totalWidth - this.state.chartRect.width + rightMarginPx;

    let minOffset: number;
    let maxOffset: number;

    if (endOffset > 0) {
      // Long data: user can pan left to history or scroll right to the end.
      // Allow a half-viewport of "empty space on the left" past offset 0
      // for breathing room when looking at the oldest bars.
      minOffset = -(this.state.chartRect.width * 0.5);
      maxOffset = endOffset;
    } else {
      // Short data: lock the viewport to the right-aligned position. There's
      // nothing to scroll to — all bars fit, with empty space on the left.
      // TradingView does this same lock for sparse charts.
      minOffset = endOffset;
      maxOffset = endOffset;
    }

    this.state.offset = clamp(this.state.offset, minOffset, maxOffset);
  }

  private updateVisibleRange(): void {
    const barUnit = this.state.barWidth + this.state.barSpacing;
    if (barUnit <= 0 || this.state.chartRect.width <= 0) return;
    const from = Math.floor(this.state.offset / barUnit);
    const visibleBars = Math.ceil(this.state.chartRect.width / barUnit) + 1;
    const to = Math.min(from + visibleBars, this.dataLength - 1);
    this.state.visibleRange = { from: Math.max(0, from), to: Math.max(0, to) };
  }
}
