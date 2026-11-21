import type { BoxPlotGroup, BoxPlotOptions, Theme } from '@tradecanvas/commons';
import { computeBoxPlotLayout, renderBoxPlot, type BoxPlotLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';
import { counted } from './describe.js';

/** How each group's values spread: the quartiles as a box, whiskers to the ends, outliers beyond. Returns by weekday, by strategy. */
export class BoxPlotChart extends InteractiveChart<BoxPlotOptions, BoxPlotLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): BoxPlotLayout {
    return computeBoxPlotLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: BoxPlotLayout): void {
    renderBoxPlot(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    return `Box plot of ${counted(this.options.data.length, 'group')}`;
  }

  protected clickable(): boolean {
    return false;
  }

  protected hits(): boolean {
    return false;
  }

  protected clickAt(): void {}

  update(data: BoxPlotGroup[]): void {
    this.setOptions({ data });
  }
}
