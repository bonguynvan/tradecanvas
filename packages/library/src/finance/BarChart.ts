import type { BarChartOptions, ChartSeries, Theme } from '@tradecanvas/commons';
import { computeBarLayout, hitBar, renderBarChart, type BarLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/**
 * Bars by category: series side by side or stacked, up and down from zero,
 * upright or sideways. Net flows, volumes by session, returns by period.
 */
export class BarChart extends InteractiveChart<BarChartOptions, BarLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): BarLayout {
    return computeBarLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: BarLayout): void {
    renderBarChart(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const names = this.options.series.map((s) => s.name).join(', ');
    return `Bar chart of ${names}, ${this.options.categories.length} categories`;
  }

  protected clickable(): boolean {
    return this.options.onBarClick !== undefined;
  }

  protected hits(layout: BarLayout, x: number, y: number): boolean {
    return hitBar(layout, x, y) !== null;
  }

  protected clickAt(layout: BarLayout, x: number, y: number): void {
    const bar = hitBar(layout, x, y);
    if (bar) this.options.onBarClick?.({ category: bar.category, series: bar.series, value: bar.value, index: bar.index });
  }

  /** New values: the categories and their series. */
  update(categories: string[], series: ChartSeries[]): void {
    this.setOptions({ categories, series });
  }
}
