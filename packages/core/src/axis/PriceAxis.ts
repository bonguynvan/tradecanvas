import type { ViewportState, Theme } from '@tradecanvas/commons';
import { autoPricePrecision, computeTickStep, formatPriceScaleLabel } from '@tradecanvas/commons';

/**
 * A price on a scale: rebased on a percent / indexed scale, else in the
 * chart's price format (`viewport.formatPrice`), else in decimals.
 */
export function priceScaleText(price: number, viewport: ViewportState, precision: number, locale: string): string {
  const mode = viewport.scaleMode ?? (viewport.logScale ? 'logarithmic' : 'regular');
  if ((mode === 'percentage' || mode === 'indexedTo100') && viewport.scaleBaseline) {
    return formatPriceScaleLabel(price, mode, viewport.scaleBaseline, precision, locale);
  }
  return viewport.formatPrice ? viewport.formatPrice(price) : formatPriceScaleLabel(price, 'regular', undefined, precision, locale);
}

/** A tick step below 1 made a whole number of `unit`s, doubling (32nds: 1/32, 1/16, 1/8, 1/4, 1/2). */
function onUnits(step: number, unit: number | undefined): number {
  if (!unit || !(unit > 0) || step >= 1) return step;
  let s = unit;
  while (s < step) s *= 2;
  return s;
}
import { priceToY, priceToYMapper } from '../viewport/ScaleMapping.js';

/** Tick labels this close (px) to the last-price tag's centre are hidden under it. */
const TAG_CLEARANCE_PX = 12;

export class PriceAxis {
  private locale = 'en-US';
  private reservedPrice: (() => number | null) | null = null;

  /**
   * Price whose tag sits on the axis (the last-price tag). Tick labels it
   * would cover are skipped instead of showing half-hidden behind it.
   */
  setReservedPriceProvider(provider: (() => number | null) | null): void {
    this.reservedPrice = provider;
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Draw the scale beside the plot: on the right (the price scale), or on the
   * left — labels right-aligned against the plot, no last-price tag to avoid.
   */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, theme: Theme, side: 'right' | 'left' = 'right'): void {
    const { chartRect, priceRange } = viewport;
    const left = side === 'left';
    const axisX = left ? chartRect.x : chartRect.x + chartRect.width;
    if (priceRange.max - priceRange.min <= 0) return;
    const toY = priceToYMapper(viewport);

    // Subtle vertical divider — single pixel, less assertive than a solid axis
    // line, for a calmer frame.
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(axisX + 0.5, chartRect.y);
    ctx.lineTo(axisX + 0.5, chartRect.y + chartRect.height);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Compute labels
    const step = onUnits(computeTickStep(priceRange.min, priceRange.max, 8), viewport.priceUnit);
    const firstPrice = Math.ceil(priceRange.min / step) * step;
    const precision = autoPricePrecision(priceRange.min, priceRange.max);
    const font = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;

    // Collect label positions
    const labels: { y: number; text: string }[] = [];
    const reserved = left ? null : this.reservedPrice?.() ?? null;
    const reservedY = reserved === null ? null : priceToY(reserved, viewport);
    for (let price = firstPrice; price <= priceRange.max; price += step) {
      const y = toY(price);
      if (reservedY !== null && Math.abs(y - reservedY) < TAG_CLEARANCE_PX) continue;
      labels.push({ y, text: priceScaleText(price, viewport, precision, this.locale) });
    }

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = left ? 'right' : 'left';

    // Tiny tick marks (3px notch) — gives the axis structure without the heavy
    // background rectangles that the previous implementation drew per label.
    ctx.strokeStyle = theme.axisLine;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    const tick = left ? -1 : 1;
    for (const { y } of labels) {
      ctx.moveTo(axisX + tick, y + 0.5);
      ctx.lineTo(axisX + 4 * tick, y + 0.5);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Text labels — single fillStyle pass.
    ctx.fillStyle = theme.axisLabel;
    for (const { y, text } of labels) {
      ctx.fillText(text, axisX + 8 * tick, y);
    }
  }
}
