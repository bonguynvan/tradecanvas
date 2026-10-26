import type { DataSeries, ViewportState, Theme } from '@tradecanvas/commons';
import { priceTagText } from '@tradecanvas/commons';
import { barIndexToX, priceToY } from '../viewport/ScaleMapping.js';
import { findPivots, classifyPivots } from './pivots.js';

/** Significant digits a pivot below 1 shows without a market precision. */
const SMALL_PRICE_DIGITS = 4;
/** Most decimals a pivot below 1 shows. */
const MAX_DECIMALS = 10;

/** How the swing markers find and label pivots: `PivotMarkersRenderer.getConfig()`. */
export interface PivotMarkersConfig {
  /** Bars on the left a pivot is the extreme of. */
  left: number;
  /** Bars on the right a pivot is the extreme of. */
  right: number;
  showLabels: boolean;
  /** Market-structure labels (HH/HL/LH/LL). */
  structureLabels: boolean;
}

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
  private structureLabels = false;

  setVisible(v: boolean): void { this.visible = v; }
  isVisible(): boolean { return this.visible; }
  setStrength(left: number, right: number): void {
    this.left = Math.max(1, Math.floor(left));
    this.right = Math.max(1, Math.floor(right));
  }
  setShowLabels(v: boolean): void { this.showLabels = v; }
  /** Show market-structure labels (HH/HL/LH/LL) on each pivot. */
  setStructureLabels(v: boolean): void { this.structureLabels = v; }
  /** Its strength and labels, as the setters left them. */
  getConfig(): PivotMarkersConfig {
    return { left: this.left, right: this.right, showLabels: this.showLabels, structureLabels: this.structureLabels };
  }

  render(ctx: CanvasRenderingContext2D, data: DataSeries, viewport: ViewportState, theme: Theme): void {
    if (!this.visible || data.length === 0) return;
    const found = findPivots(data, this.left, this.right);
    if (found.length === 0) return;
    const pivots = this.structureLabels ? classifyPivots(found) : found;

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
      // Outside the bar: highs above it on screen, lows below — swapped when inverted.
      const above = isHigh !== (viewport.invertScale === true);
      const tipY = above ? y - 8 : y + 8;

      ctx.fillStyle = color;
      ctx.beginPath();
      if (above) {
        // ▼ pointing down, sitting above the bar
        ctx.moveTo(x - size, tipY - size);
        ctx.lineTo(x + size, tipY - size);
        ctx.lineTo(x, tipY);
      } else {
        // ▲ pointing up, sitting below the bar
        ctx.moveTo(x - size, tipY + size);
        ctx.lineTo(x + size, tipY + size);
        ctx.lineTo(x, tipY);
      }
      ctx.closePath();
      ctx.fill();

      const text: string | null =
        this.structureLabels && 'label' in p ? String(p.label) : this.showLabels ? pivotPriceText(p.price, viewport) : null;
      if (text) {
        ctx.textBaseline = above ? 'bottom' : 'top';
        ctx.fillText(text, x, above ? tipY - size - 1 : tipY + size + 1);
      }
    }
    ctx.restore();
  }
}

/**
 * A pivot's price as the chart writes one: its price format, else grouped in
 * the number locale at the market's or the symbol's decimals, or at 2 (4
 * significant digits below 1) when neither sets them.
 */
function pivotPriceText(price: number, viewport: ViewportState): string {
  return priceTagText(price, viewport, viewport.pricePrecision ?? pivotDecimals(price));
}

function pivotDecimals(price: number): number {
  const abs = Math.abs(price);
  if (abs >= 1) return 2;
  if (abs === 0) return SMALL_PRICE_DIGITS - 1;
  return Math.min(MAX_DECIMALS, SMALL_PRICE_DIGITS - 1 - Math.floor(Math.log10(abs)));
}
