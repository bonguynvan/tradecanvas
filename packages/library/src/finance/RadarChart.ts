import type { ChartSeries, RadarChartOptions, Theme } from '@tradecanvas/commons';
import { computeRadarLayout, hitRadarAxis, renderRadar, type RadarLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';
import { counted } from './describe.js';

/** Several measures at once, a spoke each: a strategy's scorecard, a portfolio's factor exposures beside an index's. */
export class RadarChart extends InteractiveChart<RadarChartOptions, RadarLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): RadarLayout {
    return computeRadarLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: RadarLayout): void {
    renderRadar(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    return `Radar chart of ${this.options.series.length} series on ${counted(this.options.axes.length, 'axis', 'axes')}`;
  }

  protected clickable(): boolean {
    return this.options.onAxisClick !== undefined;
  }

  protected hits(layout: RadarLayout, x: number, y: number): boolean {
    return hitRadarAxis(layout, x, y) !== null;
  }

  /** The measure whose spoke is nearest the click, with each series' value on it. */
  protected clickAt(layout: RadarLayout, x: number, y: number): void {
    const index = hitRadarAxis(layout, x, y);
    if (index === null) return;
    this.options.onAxisClick?.({
      axis: layout.spokes[index].label,
      index,
      values: layout.shapes.map((shape) => ({ series: shape.name, value: shape.points[index]?.value ?? null })),
    });
  }

  update(series: ChartSeries[]): void {
    this.setOptions({ series });
  }
}
