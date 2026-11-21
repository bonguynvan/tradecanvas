import type { SurfaceChartOptions, Theme } from '@tradecanvas/commons';
import { TURNING_SURFACE_POINTS, computeSurfaceLayout, hitSurfacePoint, renderSurface, type SurfaceLayout, type Measure } from '@tradecanvas/core';
import { Chart3D } from './Chart3D.js';

/**
 * Values over two axes as a sheet in a box that a drag turns: implied
 * volatility by strike and expiry, a position's worth by price and day, or
 * with `style: 'slices'` an order book's depth over time.
 */
export class SurfaceChart extends Chart3D<SurfaceChartOptions, SurfaceLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): SurfaceLayout {
    // With fewer points while it turns: a frame of a drag has no time for a large grid whole.
    return computeSurfaceLayout(this.options, width, height, theme, measure, this.turning ? TURNING_SURFACE_POINTS : undefined);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: SurfaceLayout): void {
    renderSurface(ctx, width, height, this.options, theme, this.turning ? null : pointer, layout);
  }

  protected describe(): string {
    // An axis may be missing where the options come from plain JavaScript: the chart then draws nothing.
    return `3D surface of ${this.options.x?.length ?? 0} by ${this.options.y?.length ?? 0} points`;
  }

  protected clickable(): boolean {
    return this.options.onPointClick !== undefined;
  }

  protected hits(layout: SurfaceLayout, x: number, y: number): boolean {
    return hitSurfacePoint(layout, x, y) !== null;
  }

  protected pick(layout: SurfaceLayout, x: number, y: number): void {
    const hit = hitSurfacePoint(layout, x, y);
    if (hit) this.options.onPointClick?.(hit.point);
  }

  /** New values, and new points along the axes when they changed too. */
  update(values: number[][], axes: { x?: number[] | string[]; y?: number[] | string[] } = {}): void {
    this.setOptions({ values, ...(axes.x ? { x: axes.x } : {}), ...(axes.y ? { y: axes.y } : {}) });
  }
}
