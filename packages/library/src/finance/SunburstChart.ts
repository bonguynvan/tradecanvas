import type { SunburstNode, SunburstOptions, Theme } from '@tradecanvas/commons';
import { computeSunburstLayout, hitSunburstArc, renderSunburst, type SunburstLayout, type Measure } from '@tradecanvas/core';
import { InteractiveChart } from './InteractiveChart.js';
import { counted } from './describe.js';

/** Parts of a whole and the parts inside them, a ring a level: an allocation by asset class, then sector, then holding. */
export class SunburstChart extends InteractiveChart<SunburstOptions, SunburstLayout> {
  protected compute(width: number, height: number, theme: Theme, measure: Measure): SunburstLayout {
    return computeSunburstLayout(this.options, width, height, theme, measure);
  }

  protected draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: SunburstLayout): void {
    renderSunburst(ctx, width, height, this.options, theme, pointer, layout);
  }

  protected describe(): string {
    return `Sunburst chart of ${counted(this.options.data.length, 'part')}`;
  }

  protected clickable(): boolean {
    return this.options.onNodeClick !== undefined;
  }

  protected hits(layout: SunburstLayout, x: number, y: number): boolean {
    return hitSunburstArc(layout, x, y) !== null;
  }

  protected clickAt(layout: SunburstLayout, x: number, y: number): void {
    const arc = hitSunburstArc(layout, x, y);
    if (arc) this.options.onNodeClick?.(arc.node, arc.path);
  }

  update(data: SunburstNode[]): void {
    this.setOptions({ data });
  }
}
