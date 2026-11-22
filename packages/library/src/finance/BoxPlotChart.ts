import type { BoxPlotGroup, BoxPlotOptions, Theme } from '@tradecanvas/commons';
import { computeBoxPlotLayout, hitBox, renderBoxPlot, type BoxPlotLayout, type Measure } from '@tradecanvas/core';
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
    return this.options.onBoxClick !== undefined;
  }

  protected hits(layout: BoxPlotLayout, x: number, y: number): boolean {
    return hitBox(layout, x, y) !== null;
  }

  protected clickAt(layout: BoxPlotLayout, x: number, y: number): void {
    const box = hitBox(layout, x, y);
    if (box) this.options.onBoxClick?.(box.group, box.stats);
  }

  update(data: BoxPlotGroup[]): void {
    this.setOptions({ data });
  }
}
