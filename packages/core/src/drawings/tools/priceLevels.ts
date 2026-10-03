import type { DrawingLevel, DrawingState, ViewportState } from '@tradecanvas/commons';
import { priceToY } from '../../viewport/ScaleMapping.js';
import { formatDrawingPrice, drawingFont, fillTextWithHalo } from './labels.js';
import { crispY } from '../../charts/pixelGrid.js';

/** A Fibonacci level at its price. */
export interface PriceLevel {
  level: DrawingLevel;
  price: number;
}

export interface PriceLevelLook {
  /** Left and right ends of the lines, in pixels. */
  x0: number;
  x1: number;
  showLevels: boolean;
  showPrices: boolean;
  labelPosition: 'left' | 'right';
  /** Shade the band between each level and the next. */
  background: boolean;
}

export function levelLabel(
  level: number,
  price: number,
  showLevels: boolean,
  showPrices: boolean,
  format: (price: number) => string = (p) => p.toFixed(2),
): string {
  const pct = `${(level * 100).toFixed(1)}%`;
  const value = format(price);
  if (showLevels && showPrices) return `${pct} (${value})`;
  return showLevels ? pct : showPrices ? value : '';
}

/**
 * Horizontal Fibonacci levels: one line per level in its colour (the
 * drawing's when it has none), optional bands between them, and labels.
 * Levels 0 and 1 are drawn solid, the others a little lighter.
 */
export function renderPriceLevels(
  ctx: CanvasRenderingContext2D,
  state: DrawingState,
  viewport: ViewportState,
  levels: readonly PriceLevel[],
  look: PriceLevelLook,
  applyLineStyle: (color: string) => void,
): void {
  const width = look.x1 - look.x0;
  if (look.background && levels.length > 1) {
    const sorted = [...levels].sort((a, b) => a.level.value - b.level.value);
    for (let i = 0; i < sorted.length - 1; i++) {
      const yA = priceToY(sorted[i].price, viewport);
      const yB = priceToY(sorted[i + 1].price, viewport);
      const own = sorted[i + 1].level.color;
      const fill = own ?? state.style.fillColor;
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.globalAlpha = own ? 0.07 : 0.05 + i * 0.02;
      ctx.fillRect(look.x0, Math.min(yA, yB), width, Math.abs(yB - yA));
    }
    ctx.globalAlpha = 1;
  }

  ctx.font = drawingFont(11);
  ctx.textBaseline = 'bottom';
  ctx.textAlign = look.labelPosition === 'right' ? 'right' : 'left';
  const labelX = look.labelPosition === 'right' ? look.x1 - 4 : look.x0 + 4;
  for (const { level, price } of levels) {
    const y = priceToY(price, viewport);
    const color = level.color ?? state.style.color;
    applyLineStyle(color);
    ctx.globalAlpha = level.value === 0 || level.value === 1 ? 1 : 0.8;
    // On whole device pixels: one sharp row per level, not a soft smear.
    const line = crispY(ctx, y, Number(ctx.lineWidth) || 1);
    ctx.lineWidth = line.width;
    ctx.beginPath();
    ctx.moveTo(look.x0, line.y);
    ctx.lineTo(look.x1, line.y);
    ctx.stroke();
    const text = levelLabel(level.value, price, look.showLevels, look.showPrices, (p) => formatDrawingPrice(p, p, viewport));
    if (text) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      fillTextWithHalo(ctx, text, labelX, y - 3);
    }
  }
  ctx.globalAlpha = 1;
}

/** Whether `point` is on one of the level lines. */
export function hitPriceLevels(
  point: { x: number; y: number },
  viewport: ViewportState,
  levels: readonly PriceLevel[],
  x0: number,
  x1: number,
  tolerance: number,
): boolean {
  if (point.x < x0 - tolerance || point.x > x1 + tolerance) return false;
  return levels.some(({ price }) => Math.abs(point.y - priceToY(price, viewport)) <= tolerance);
}
