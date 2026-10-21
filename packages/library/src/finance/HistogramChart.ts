import type { HistogramOptions, Theme } from '@tradecanvas/commons';
import { computeHistogramLayout, renderHistogram, type HistogramLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** How values spread: daily returns, trade results, with lines at the mean or a VaR. */
export class HistogramChart extends InteractiveChart<HistogramOptions, HistogramLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): HistogramLayout {
    return computeHistogramLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: HistogramLayout): void {
    renderHistogram(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    return `Histogram of ${this.options.values.length} values`;
  }

  protected clickable(): boolean {
    return false;
  }

  protected hits(): boolean {
    return false;
  }

  protected clickAt(): void {}

  update(values: number[]): void {
    this.setOptions({ values });
  }
}
