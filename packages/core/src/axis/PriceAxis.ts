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

/**
 * The fewest decimals, up to `max`, that write every one of `prices` exactly:
 * ticks on a 500 step read 73,500 rather than 73,500.00, and one column of
 * ticks shares one count, so the figures line up.
 */
function tickDecimals(prices: readonly number[], max: number): number {
  for (let d = 0; d < max; d++) {
    const scale = 10 ** d;
    if (prices.every((p) => Math.abs(p * scale - Math.round(p * scale)) <= 1e-6 * Math.max(1, Math.abs(p * scale)))) return d;
  }
  return max;
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

/** The spacing (px) price labels aim for: how many fit follows the scale's height. */
export const PRICE_LABEL_SPACING_PX = 56;
/** Price labels never closer than this (px). */
export const MIN_PRICE_LABEL_GAP_PX = 30;
const MAX_PRICE_TICKS = 24;
/** No scale walks more ticks than this, whatever its range and step. */
const MAX_TICK_LOOP = 200;

/** How many ticks a scale `height` px tall aims for (the `maxTicks` of `computeTickStep`). */
export function tickTarget(height: number): number {
  return Math.max(2, Math.min(MAX_PRICE_TICKS, Math.round(height / PRICE_LABEL_SPACING_PX) + 1));
}

/** The round number at or under `value`: 1, 2 or 5 times a power of ten. */
function niceFloor(value: number): number {
  if (!(value > 0)) return 0;
  const base = 10 ** Math.floor(Math.log10(value) + 1e-9);
  const frac = value / base;
  return (frac < 2 ? 1 : frac < 5 ? 2 : 5) * base;
}

/** The next round step up: 1 → 2 → 5 → 10. */
function nextRoundStep(step: number): number {
  const exp = Math.floor(Math.log10(step) + 1e-9);
  const base = 10 ** exp;
  const frac = step / base;
  return (frac < 1.5 ? 2 : frac < 3.5 ? 5 : 10) * base;
}

/** A round step for `min`..`max` on a scale `height` px tall, its labels at least `MIN_PRICE_LABEL_GAP_PX` apart. */
export function roundStep(min: number, max: number, height: number): number {
  let step = computeTickStep(min, max, tickTarget(height));
  if (!(step > 0) || !(height > 0)) return step;
  const range = max - min;
  for (let i = 0; i < 8 && (step / range) * height < MIN_PRICE_LABEL_GAP_PX; i++) step = nextRoundStep(step);
  return step;
}

/** The multiples of `step` from `min` to `max`, by index (adding the step up drifts: 0.1 × 3 passes 0.3). */
export function stepTicks(min: number, max: number, step: number): number[] {
  if (!(step > 0) || !(max >= min)) return [];
  const out: number[] = [];
  const first = Math.ceil(min / step - 1e-9);
  // A step too fine for the price's digits would never move it on: stop
  // there, and after as many ticks as any scale shows.
  if (!Number.isFinite(first) || Math.abs(first) >= Number.MAX_SAFE_INTEGER) return [];
  for (let i = first; i * step <= max + step * 1e-9 && i - first < MAX_TICK_LOOP; i++) {
    const value = i * step;
    out.push(Math.abs(value) < step * 1e-9 ? 0 : value);
  }
  return out;
}

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
    const raw = roundStep(min, max, viewport.chartRect.height);
    const auto = autoPricePrecision(min, max);
    if (viewport.priceUnit) return { step: onUnits(raw, viewport.priceUnit), precision: this.precision ?? auto };
    const grid = onPriceGrid(raw, this.precision, this.tick);
    if (stepsIn(min, max, grid) < 2) return { step: raw, precision: Math.max(this.precision ?? 0, auto) };
    return { step: grid, precision: this.precision ?? auto };
  }

  /**
   * The prices the scale marks for the range on view, low to high: where its
   * labels and the grid's lines go. As many as the height fits. On a
   * percent or indexed scale, round percents or index points; on a log
   * scale, round prices whose step grows with the price, so its whole
   * height is labelled.
   */
  ticks(viewport: ViewportState): number[] {
    const { min, max } = viewport.priceRange;
    if (!(max - min > 0)) return [];
    const mode = viewport.scaleMode ?? (viewport.logScale ? 'logarithmic' : 'regular');
    const baseline = viewport.scaleBaseline;
    if ((mode === 'percentage' || mode === 'indexedTo100') && baseline) return this.rebasedTicks(viewport, mode, baseline);
    if (mode === 'logarithmic' && min > 0) return this.logTicks(viewport);
    return stepTicks(min, max, this.scale(viewport).step);
  }

  /** Ticks at round values of `value = price × 100 / baseline` (less 100 for percent). */
  private rebasedTicks(viewport: ViewportState, mode: 'percentage' | 'indexedTo100', baseline: number): number[] {
    const { min, max } = viewport.priceRange;
    const shift = mode === 'percentage' ? 100 : 0;
    const toValue = (price: number) => (price / baseline) * 100 - shift;
    const toPrice = (value: number) => ((value + shift) / 100) * baseline;
    const lo = Math.min(toValue(min), toValue(max));
    const hi = Math.max(toValue(min), toValue(max));
    const step = roundStep(lo, hi, viewport.chartRect.height);
    return stepTicks(lo, hi, step).map(toPrice).sort((a, b) => a - b);
  }

  /**
   * Ticks down a log scale from the top: from each tick, the next goes near
   * the price `PRICE_LABEL_SPACING_PX` below it, at a round multiple of a
   * step no larger than that drop (on the symbol's price grid), so labels
   * stay as far apart at the bottom as at the top (100k, 40k, 10k, 4k…).
   * One closer than `MIN_PRICE_LABEL_GAP_PX` to the last is skipped.
   */
  private logTicks(viewport: ViewportState): number[] {
    const { min, max } = viewport.priceRange;
    const perPx = Math.log(max / min) / viewport.chartRect.height;
    const toY = priceToYMapper(viewport);
    const drop = Math.exp(-perPx * PRICE_LABEL_SPACING_PX);
    const out: number[] = [];
    // The top tick: a round price at or under the top.
    let step = onPriceGrid(niceFloor(max * (1 - drop)), this.precision, this.tick);
    let price = Math.floor(max / step + 1e-9) * step;
    let lastY: number | null = null;
    for (let i = 0; i < 200 && price >= min && price > 0; i++) {
      const y = toY(price);
      if (lastY === null || Math.abs(y - lastY) >= MIN_PRICE_LABEL_GAP_PX) {
        out.push(price);
        lastY = y;
      }
      const target = price * drop;
      step = onPriceGrid(niceFloor(Math.min(price - target, target)), this.precision, this.tick);
      if (!(step > 0)) break;
      let next = Math.round(target / step) * step;
      if (next >= price) next -= step;
      price = next;
    }
    // A price step coarser than the scale leaves no round price in it: plain steps then.
    if (out.length === 0) return stepTicks(min, max, this.scale(viewport).step);
    return out.reverse();
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

    // Compute labels: on a price scale, in the decimals the ticks need (a
    // rebased scale writes its percents or points as it always has).
    const { precision } = this.scale(viewport);
    const ticks = this.ticks(viewport);
    const mode = viewport.scaleMode ?? (viewport.logScale ? 'logarithmic' : 'regular');
    const decimals = mode === 'regular' || mode === 'logarithmic' ? tickDecimals(ticks, precision) : precision;
    const font = `500 ${theme.font.sizeSmall}px ${theme.font.family}`;

    // Collect label positions
    const labels: { y: number; text: string }[] = [];
    const reserved = left ? null : this.reservedPrice?.() ?? null;
    const reservedY = reserved === null ? null : priceToY(reserved, viewport);
    for (const price of ticks) {
      const y = toY(price);
      if (reservedY !== null && Math.abs(y - reservedY) < TAG_CLEARANCE_PX) continue;
      if (avoid.some((a) => Math.abs(y - a) < AVOID_CLEARANCE_PX)) continue;
      labels.push({ y, text: priceScaleText(price, viewport, decimals, this.locale) });
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
