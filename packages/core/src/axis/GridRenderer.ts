import type { ViewportState, Theme } from '@tradecanvas/commons';
import { gridLines } from './gridLines.js';

export class GridRenderer {
  private visible = true;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.visible) return;
    const { chartRect } = viewport;
    const { horizontal, vertical } = gridLines(viewport);
    if (horizontal.length === 0 && vertical.length === 0) return;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    // Single path for all grid lines — one stroke call
    ctx.beginPath();
    for (const y of horizontal) {
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
    }
    for (const x of vertical) {
      ctx.moveTo(x, chartRect.y);
      ctx.lineTo(x, chartRect.y + chartRect.height);
    }
    ctx.stroke();
  }
}
