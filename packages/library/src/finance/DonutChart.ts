import type { DonutChartOptions, DonutSlice, Theme } from '@tradecanvas/commons';
import { computeDonutLayout, hitSlice, renderDonut, type DonutLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';

/** Parts of a whole as a ring (or a pie): allocation, exposure, order flow by side. */
export class DonutChart extends InteractiveChart<DonutChartOptions, DonutLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): DonutLayout {
    return computeDonutLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: DonutLayout): void {
    renderDonut(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    const parts = this.options.data.filter((s) => Number.isFinite(s.value) && s.value > 0).map((s) => s.label).join(', ');
    return `${(this.options.innerRadius ?? 0.6) > 0 ? 'Donut' : 'Pie'} chart of ${parts}`;
  }

  protected clickable(): boolean {
    return this.options.onSliceClick !== undefined;
  }

  protected hits(layout: DonutLayout, x: number, y: number): boolean {
    return hitSlice(layout, x, y) !== null;
  }

  protected clickAt(layout: DonutLayout, x: number, y: number): void {
    const arc = hitSlice(layout, x, y);
    if (arc) this.options.onSliceClick?.(arc.slice);
  }

  update(data: DonutSlice[]): void {
    this.setOptions({ data });
  }
}
