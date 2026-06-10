import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';
import { findPivots } from './pivots.js';

/**
 * Marks fractal swing highs/lows with small triangles (▼ above a pivot high,
 * ▲ below a pivot low). Recomputed against the full series each render; only
 * the visible pivots are drawn.
 */
export class PivotMarkersRenderer {
  private visible = false;
  private left = 5;
  private right = 5;
  private showLabels = false;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }
  setStrength(left: number, right: number): void {
    this.left = Math.max(1, Math.floor(left));
    this.right = Math.max(1, Math.floor(right));
  }
  setShowLabels(v: boolean): void { this.showLabels = v; }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;
    const pivots = findPivots(data, this.left, this.right);
    if (pivots.length === 0) return;

    const { from, to } = viewport.visibleRange;
    const size = 5;
    ctx.save();
    ctx.font = `10px ${theme.font.family}`;
    ctx.textAlign = 'center';

    for (const p of pivots) {
      if (p.index < from - 1 || p.index > to + 1) continue;
      const x = barIndexToX(p.index, viewport);
      const y = priceToY(p.price, viewport);
      const isHigh = p.type === 'high';
      const color = isHigh ? theme.candleDown : theme.candleUp;
      const tipY = isHigh ? y - 8 : y + 8;

      ctx.fillStyle = color;
      ctx.beginPath();
      if (isHigh) {
        // ▼ pointing down, sitting above the high
        ctx.moveTo(x - size, tipY - size);
        ctx.lineTo(x + size, tipY - size);
        ctx.lineTo(x, tipY);
      } else {
        // ▲ pointing up, sitting below the low
        ctx.moveTo(x - size, tipY + size);
        ctx.lineTo(x + size, tipY + size);
        ctx.lineTo(x, tipY);
      }
      ctx.closePath();
      ctx.fill();

      if (this.showLabels) {
        ctx.textBaseline = isHigh ? 'bottom' : 'top';
        ctx.fillText(formatPrice(p.price), x, isHigh ? tipY - size - 1 : tipY + size + 1);
      }
    }
    ctx.restore();
  }
}

function formatPrice(v: number): string {
  const abs = Math.abs(v);
  return abs >= 1000 ? v.toFixed(2) : abs >= 1 ? v.toFixed(2) : v.toPrecision(4);
}
