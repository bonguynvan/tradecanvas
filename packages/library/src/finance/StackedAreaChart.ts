import type { ChartSeries, StackedAreaOptions, Theme } from '@tradecanvas/commons';
import { computeStackedAreaLayout, renderStackedArea, type StackedAreaLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';
import { counted } from './describe.js';

/** Several series one on another over time: what a total is made of, or with `normalized` how its mix changes. */
export class StackedAreaChart extends InteractiveChart<StackedAreaOptions, StackedAreaLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): StackedAreaLayout {
    return computeStackedAreaLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: StackedAreaLayout): void {
    renderStackedArea(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    return `Stacked area chart of ${this.options.series.length} series over ${counted(this.options.categories.length, 'point')}`;
  }

  protected clickable(): boolean {
    return false;
  }

  protected hits(): boolean {
    return false;
  }

  protected clickAt(): void {}

  /** New values, and new points along x when they changed too. */
  update(series: ChartSeries[], categories?: string[]): void {
    this.setOptions(categories ? { series, categories } : { series });
  }
}
