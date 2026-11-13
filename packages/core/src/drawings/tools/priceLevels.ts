import type { DrawingLevel, DrawingState, ViewportState } from '@tradecanvas/commons';
import { formatPrice } from '@tradecanvas/commons';
import { priceToY } from '../../viewport/ScaleMapping.js';
import { belowKeepOut, clearSpot, formatDrawingPrice, fillTextWithHalo, type LabelBox } from './labels.js';
import { crispY } from '../../charts/pixelGrid.js';
import { drawingFill, drawingLook, readableText, roleFont } from '../drawingLook.js';

/** Decimals a level's percentage shows (61.8%); none for a whole one (50%). */
const LEVEL_PERCENT_DECIMALS = 1;
/** How strongly a band between two levels is shaded. */
const BAND_ALPHA = 0.06;
/** How far above its line a level's label sits, px. */
const LABEL_LIFT = 3;
/** Between a line's end and a label beside it. */
const LABEL_BESIDE_GAP = 6;
/** How strongly the levels between 0 and 1 show. */
const INNER_ALPHA = 0.8;

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
  /**
   * The lines stop at `x0` or `x1` on the labels' side (not extended there):
   * a label goes beside its line's end, outside the bands, where there is
   * room on the plot, and over the line as before where there is not.
   */
  labelsOutside?: boolean;
  /** Shade the band between each level and the next. */
  background: boolean;
}

/**
 * A level's text: its percentage, its price, or both. The percentage is in
 * `locale`, as the price beside it is, so a German reader sees 61,8% next to
 * 99.726,1, not a 61.8 that reads as 618.
 */
export function levelLabel(
  level: number,
  price: number,
  showLevels: boolean,
  showPrices: boolean,
  format: (price: number) => string = (p) => p.toFixed(2),
  locale = 'en-US',
): string {
  const percent = level * 100;
  const decimals = Math.abs(percent - Math.round(percent)) < 1e-9 ? 0 : LEVEL_PERCENT_DECIMALS;
  const pct = `${formatPrice(percent, decimals, locale)}%`;
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
      // Each band in its upper level's colour, all as light: a rainbow of rising strengths read as noise.
      const own = sorted[i + 1].level.color;
      ctx.fillStyle = own ?? drawingFill(state.style, 1);
      ctx.globalAlpha = BAND_ALPHA;
      ctx.fillRect(look.x0, Math.min(yA, yB), width, Math.abs(yB - yA));
    }
    ctx.globalAlpha = 1;
  }

  ctx.font = roleFont('label');
  ctx.textBaseline = 'bottom';
  ctx.textAlign = look.labelPosition === 'right' ? 'right' : 'left';
  const labelX = look.labelPosition === 'right' ? look.x1 - 4 : look.x0 + 4;
  // The 0 and 1 levels' labels first, which the others are read against and which are never
  // left out; then the others, each left out where it would cover a label already drawn.
  const labelHeight = drawingLook().sizes.label;
  const placed: LabelBox[] = [];
  const isKey = (value: number) => value === 0 || value === 1;
  const lines = levels.map(({ level, price }) => ({ level, price, y: priceToY(price, viewport) }));
  for (const { level, y } of lines) {
    const color = level.color ?? state.style.color;
    applyLineStyle(color);
    ctx.globalAlpha = isKey(level.value) ? 1 : INNER_ALPHA;
    // On whole device pixels: one sharp row per level, not a soft smear.
    const line = crispY(ctx, y, Number(ctx.lineWidth) || 1);
    ctx.lineWidth = line.width;
    ctx.beginPath();
    ctx.moveTo(look.x0, line.y);
    ctx.lineTo(look.x1, line.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const order = [...lines].sort((a, b) => Number(isKey(b.level.value)) - Number(isKey(a.level.value)));
  for (const { level, price, y } of order) {
    const text = levelLabel(level.value, price, look.showLevels, look.showPrices, (p) => formatDrawingPrice(p, p, viewport), viewport.numberLocale);
    if (!text) continue;
    // Above its line, or under it where the legend or a label drawn before covers that; a level
    // with neither clear is left unlabelled, but never 0 or 1, which go above their line anyway.
    const width = ctx.measureText(text).width;
    ctx.fillStyle = readableText(level.color ?? state.style.color);
    ctx.textBaseline = 'top';
    if (look.labelsOutside) {
      // Beside the line's end, level with it: clear of the candles between the anchors.
      const onRight = look.labelPosition === 'right';
      const besideLeft = onRight ? look.x1 + LABEL_BESIDE_GAP : look.x0 - LABEL_BESIDE_GAP - width;
      const plot = viewport.chartRect;
      if (besideLeft >= plot.x && besideLeft + width <= plot.x + plot.width) {
        const beside = { left: besideLeft, right: besideLeft + width, top: y - labelHeight / 2, bottom: y + labelHeight / 2 };
        if (!clearSpot([beside], placed) && !isKey(level.value)) continue;
        placed.push(beside);
        ctx.textAlign = 'left';
        fillTextWithHalo(ctx, text, beside.left, beside.top);
        continue;
      }
      ctx.textAlign = onRight ? 'right' : 'left';
    }
    const left = look.labelPosition === 'right' ? labelX - width : labelX;
    const above = { left, right: left + width, top: y - LABEL_LIFT - labelHeight, bottom: y - LABEL_LIFT };
    const under = { left, right: left + width, top: y + LABEL_LIFT, bottom: y + LABEL_LIFT + labelHeight };
    // Pushed under the legend, where it covers both.
    const legendFoot = belowKeepOut(left, left + width, y + LABEL_LIFT) + LABEL_LIFT;
    const pushed = { left, right: left + width, top: legendFoot, bottom: legendFoot + labelHeight };
    const spot = clearSpot([above, under, pushed], placed) ?? (isKey(level.value) ? pushed : null);
    if (!spot) continue;
    placed.push(spot);
    fillTextWithHalo(ctx, text, labelX, spot.top);
  }
  ctx.globalAlpha = 1;
}

/** The dashes of a Fibonacci tool's trend line (px). */
const TREND_DASH = [5, 4];
/** How strongly the trend line shows under the levels. */
const TREND_ALPHA = 0.8;

/** A Fibonacci tool's dashed trend line through its points, on screen. */
export function strokeTrendLine(ctx: CanvasRenderingContext2D, points: readonly { x: number; y: number }[], color: string): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = TREND_ALPHA;
  ctx.setLineDash(TREND_DASH);
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** Levels without their own colours: drawn in the drawing's (a Fibonacci tool's "one colour"). */
export function inOneColor(levels: readonly PriceLevel[]): PriceLevel[] {
  return levels.map(({ level, price }) => ({ level: { ...level, color: undefined }, price }));
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
