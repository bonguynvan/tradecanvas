import type { Bar3DChartOptions, ChartSeries, Theme } from '@tradecanvas/commons';
import { computeBar3DLayout, hitBar3D, renderBar3D, type Bar3DLayout, type Measure } from '@tradecanvas/core';
import { Chart3D } from './Chart3D.js';
import { counted } from './describe.js';

/** A column for each value, in rows a series deep, in a box that a drag turns: returns by quarter and asset class, volume by hour and weekday. */
export class Bar3DChart extends Chart3D<Bar3DChartOptions, Bar3DLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): Bar3DLayout {
    return computeBar3DLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: Bar3DLayout): void {
    renderBar3D(ctx, width, height, this.options, theme, this.turning ? null : pointer, layout);
  }

  protected describe(): string {
    // Either may be missing where the options come from plain JavaScript: the chart then draws nothing.
    return `3D bar chart of ${this.options.series?.length ?? 0} series over ${counted(this.options.categories?.length ?? 0, 'category', 'categories')}`;
  }

  protected clickable(): boolean {
    return this.options.onBarClick !== undefined;
  }

  protected hits(layout: Bar3DLayout, x: number, y: number): boolean {
    return hitBar3D(layout, x, y) !== null;
  }

  protected pick(layout: Bar3DLayout, x: number, y: number): void {
    const bar = hitBar3D(layout, x, y);
    if (bar) this.options.onBarClick?.(bar.hit);
  }

  /** New values, and new categories when they changed too. */
  update(series: ChartSeries[], categories?: string[]): void {
    this.setOptions(categories ? { series, categories } : { series });
  }
}
