import type { CurveChartOptions, CurveSeries, Theme } from '@tradecanvas/commons';
import { computeCurveLayout, renderCurve, type CurveLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** Values against a strike or a tenor, a line for each series: a volatility smile, a term structure, a yield curve. */
export class CurveChart extends InteractiveChart<CurveChartOptions, CurveLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): CurveLayout {
    return computeCurveLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: CurveLayout): void {
    renderCurve(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const names = this.options.series.map((s) => s.name).join(', ');
    return names ? `Curve chart: ${names}` : 'Curve chart';
  }

  protected clickable(): boolean {
    return false;
  }

  protected hits(): boolean {
    return false;
  }

  protected clickAt(): void {}

  update(series: CurveSeries[]): void {
    this.setOptions({ series });
  }
}
