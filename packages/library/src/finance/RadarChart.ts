import type { ChartSeries, RadarChartOptions, Theme } from '@tradecanvas/commons';
import { computeRadarLayout, renderRadar, type RadarLayout, type Measure } from '@tradecanvas/core';
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
    return false;
  }

  protected hits(): boolean {
    return false;
  }

  protected clickAt(): void {}

  update(series: ChartSeries[]): void {
    this.setOptions({ series });
  }
}
