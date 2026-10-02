import type { ViewportState, Theme } from '@tradecanvas/commons';
import { computeTickStep } from '@tradecanvas/commons';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

export class GridRenderer {
  private visible = true;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }

  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme): void {
    if (!this.visible) return;
    const { chartRect, priceRange } = viewport;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    if (priceRange.max - priceRange.min <= 0) return;
    const toY = priceToYMapper(viewport);

    // Single path for all grid lines — one stroke call
    ctx.beginPath();

    // Horizontal grid lines (price levels)
    const priceStep = computeTickStep(priceRange.min, priceRange.max, 8);
    const firstPrice = Math.ceil(priceRange.min / priceStep) * priceStep;
    for (let price = firstPrice; price <= priceRange.max; price += priceStep) {
      const y = Math.round(toY(price)) + 0.5;
      ctx.moveTo(chartRect.x, y);
      ctx.lineTo(chartRect.x + chartRect.width, y);
    }

    // Vertical grid lines (time intervals)
    const barUnit = viewport.barWidth + viewport.barSpacing;
    const barsPerGrid = Math.max(1, Math.ceil(80 / barUnit));
    const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;
    // Every slot on screen — the empty space past either end of the data
    // (where the chart can be panned) keeps its grid too.
    const from = Math.floor(viewport.offset / barUnit);
    const to = Math.ceil((viewport.offset + chartRect.width) / barUnit);
    for (let i = from; i <= to; i++) {
      if (i % barsPerGrid !== 0) continue;
      const x = Math.round(i * barUnit + offsetX) + 0.5;
      ctx.moveTo(x, chartRect.y);
      ctx.lineTo(x, chartRect.y + chartRect.height);
    }

    ctx.stroke();
  }
}
