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

/**
 * A tick step a price can be: a whole number of the smallest price step
 * (`tick`, 10 dong), else no finer than the decimals shown (1 at 0 decimals).
 */
function onPriceGrid(step: number, precision: number | null, tick: number | null): number {
  if (tick !== null && tick > 0) return Math.max(1, Math.ceil(step / tick - 1e-9)) * tick;
  if (precision !== null) return Math.max(step, 10 ** -precision);
  return step;
}

/** How many multiples of `step` lie in the range. */
function stepsIn(min: number, max: number, step: number): number {
  return Math.floor(max / step + 1e-9) - Math.ceil(min / step - 1e-9) + 1;
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
/** Tick labels this close (px) to any other tag on the axis give way to it. */
const AVOID_CLEARANCE_PX = 14;

export class PriceAxis {
  private locale = 'en-US';
  private reservedPrice: (() => number | null) | null = null;
  private precision: number | null = null;
  private tick: number | null = null;

  /** Decimals the labels show (the market's or the symbol's), or null to fit them to the range. */
  setPricePrecision(precision: number | null): void {
    this.precision = precision !== null && Number.isInteger(precision) && precision >= 0 ? precision : null;
  }

  /** The smallest price step (a symbol's `minTick`): ticks stay on whole numbers of it. Null: none. */
  setPriceTick(tick: number | null): void {
    this.tick = tick !== null && Number.isFinite(tick) && tick > 0 ? tick : null;
  }

  /**
   * The scale's step and the decimals its labels show, for the range on view:
   * on the symbol's price grid in its decimals; a fraction's steps with a
   * fraction format; and where fewer than two prices of the grid are on view
   * (a flat or deeply zoomed range), the plain step in the decimals it needs.
   */
  private scale(viewport: ViewportState): { step: number; precision: number } {
    const { min, max } = viewport.priceRange;
    const raw = computeTickStep(min, max, 8);
    const auto = autoPricePrecision(min, max);
    if (viewport.priceUnit) return { step: onUnits(raw, viewport.priceUnit), precision: this.precision ?? auto };
    const grid = onPriceGrid(raw, this.precision, this.tick);
    if (stepsIn(min, max, grid) < 2) return { step: raw, precision: Math.max(this.precision ?? 0, auto) };
    return { step: grid, precision: this.precision ?? auto };
  }

  /** A price as this scale writes it now (to measure the axis by). */
  labelText(price: number, viewport: ViewportState): string {
    return priceScaleText(price, viewport, this.scale(viewport).precision, this.locale);
  }

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
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    side: 'right' | 'left' = 'right',
    /** Centres of tags on this axis (value tags, high/low, orders): labels under them are skipped. */
    avoid: readonly number[] = [],
  ): void {
    const { chartRect, priceRange } = viewport;
    const left = side === 'left';
    const axisX = left ? chartRect.x : chartRect.x + chartRect.width;
    if (priceRange.max - priceRange.min <= 0) return;
    const toY = priceToYMapper(viewport);

    // Subtle vertical divider — single pixel, less assertive than a solid axis
    // line, for a calmer frame.
    ctx.strokeStyle = theme.style?.axis.price.line ?? theme.axisLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(axisX + 0.5, chartRect.y);
    ctx.lineTo(axisX + 0.5, chartRect.y + chartRect.height);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Compute labels
    const { step, precision } = this.scale(viewport);
    const firstPrice = Math.ceil(priceRange.min / step - 1e-9) * step;
    const font = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;

    // Collect label positions
    const labels: { y: number; text: string }[] = [];
    const reserved = left ? null : this.reservedPrice?.() ?? null;
    const reservedY = reserved === null ? null : priceToY(reserved, viewport);
    // By index, not by adding the step up: 0.1 + 0.1 + 0.1 would pass 0.3 and drop it.
    for (let i = 0; firstPrice + i * step <= priceRange.max + step * 1e-9; i++) {
      const price = firstPrice + i * step;
      const y = toY(price);
      if (reservedY !== null && Math.abs(y - reservedY) < TAG_CLEARANCE_PX) continue;
      if (avoid.some((a) => Math.abs(y - a) < AVOID_CLEARANCE_PX)) continue;
      labels.push({ y, text: priceScaleText(price, viewport, precision, this.locale) });
    }

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = left ? 'right' : 'left';

    // Tiny tick marks (3px notch) — gives the axis structure without the heavy
    // background rectangles that the previous implementation drew per label.
    ctx.strokeStyle = theme.style?.axis.price.line ?? theme.axisLine;
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
    ctx.fillStyle = theme.style?.axis.price.text ?? theme.axisLabel;
    for (const { y, text } of labels) {
      ctx.fillText(text, axisX + 8 * tick, y);
    }
  }
}
