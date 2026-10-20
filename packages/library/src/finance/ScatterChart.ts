import type { ScatterChartOptions, ScatterSeries, Theme } from '@tradecanvas/commons';
import { computeScatterLayout, nearestPoint, renderScatter, type ScatterLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** Points on two value axes, bubbles when they have a size: risk against return, value against growth. */
export class ScatterChart extends InteractiveChart<ScatterChartOptions, ScatterLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): ScatterLayout {
    return computeScatterLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: ScatterLayout): void {
    renderScatter(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const points = this.options.series.reduce((n, s) => n + s.points.length, 0);
    const axes = this.options.xLabel && this.options.yLabel ? ` of ${this.options.yLabel} against ${this.options.xLabel}` : '';
    return `Scatter chart${axes}, ${points} points`;
  }

  protected clickable(): boolean {
    return this.options.onPointClick !== undefined;
  }

  protected hits(layout: ScatterLayout, x: number, y: number): boolean {
    return nearestPoint(layout, x, y) !== null;
  }

  protected clickAt(layout: ScatterLayout, x: number, y: number): void {
    const p = nearestPoint(layout, x, y);
    if (p) this.options.onPointClick?.(p.point, p.series);
  }

  update(series: ScatterSeries[]): void {
    this.setOptions({ series });
  }
}
