import type { OptionLeg, PayoffOptions, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_SIZE,
  TOP_MARK_ROOM,
  axisFormat,
  canvasMeasure,
  drawTooltip,
  drawTopMarks,
  drawValueAxis,
  extent,
  niceScale,
  numberFormat,
  readoutFormat,
  scaleToPx,
  type Measure,
  type NiceScale,
  type Rect,
} from './chartKit.js';

/** How far past the lowest and the highest strike the prices drawn go when no range is given, as a share of them. */
const AUTO_MARGIN = 0.2;
/** How strongly the profit and the loss tint the area between the line and zero. */
const FILL_ALPHA = 0.16;
/** Sums this near zero are zero: a sum of premiums and payoffs has rounding in it. */
const EPSILON = 1e-9;

const finite = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
/** How many of a leg, signed: under zero for one sold. A quantity that is no number, or under zero, is one. */
const sizeOf = (leg: OptionLeg) => (finite(leg.quantity) && leg.quantity >= 0 ? leg.quantity : 1) * (leg.side === 'short' ? -1 : 1);

/** The legs that can be priced: an option with its strike, the underlying with its entry. Another counts for nothing. */
function priced(legs: readonly OptionLeg[]): OptionLeg[] {
  return legs.filter((leg) => (leg.type === 'underlying' ? finite(leg.entry) : finite(leg.strike) && leg.strike >= 0));
}

/**
 * What one priced leg makes or loses at expiry with the underlying at
 * `price`, for one unit: a call or a put's worth there less the premium paid
 * (the other way for one sold), or the underlying's move from its entry.
 */
function legPayoff(leg: OptionLeg, price: number): number {
  const size = sizeOf(leg);
  if (leg.type === 'underlying') return (price - (leg.entry ?? 0)) * size;
  const strike = leg.strike ?? 0;
  const worth = leg.type === 'call' ? Math.max(0, price - strike) : Math.max(0, strike - price);
  return (worth - (finite(leg.premium) ? leg.premium : 0)) * size;
}

const unitsOf = (multiplier: number | undefined) => (finite(multiplier) && multiplier > 0 ? multiplier : 1);

/**
 * What the legs together make or lose at expiry with the underlying at
 * `price`: each leg's, times `multiplier` (the units a contract is for). A
 * leg without its strike, or the underlying without its entry, counts for nothing.
 */
export function optionPayoff(legs: readonly OptionLeg[], price: number, multiplier = 1): number {
  return priced(legs).reduce((sum, leg) => sum + legPayoff(leg, price), 0) * unitsOf(multiplier);
}

/** The prices where the payoff's line bends: the options' strikes, in order, each once. */
function kinks(legs: readonly OptionLeg[]): number[] {
  const strikes = priced(legs).filter((leg) => leg.type !== 'underlying' && (leg.strike ?? 0) > 0).map((leg) => leg.strike as number);
  return [...new Set(strikes)].sort((a, b) => a - b);
}

/** How the payoff changes for a move of one in the price, past the highest strike: the calls and the underlying. */
function slopeAbove(legs: readonly OptionLeg[]): number {
  return priced(legs).reduce((sum, leg) => sum + (leg.type === 'put' ? 0 : sizeOf(leg)), 0);
}

export interface PayoffStats {
  /** The most the legs can make at expiry (0 when every price is a loss); null: no limit. */
  maxProfit: number | null;
  /** The most they can lose, as a negative sum (0 when they cannot lose); null: no limit. */
  maxLoss: number | null;
  /** The underlying's prices where they make nothing and lose nothing, in order. */
  breakevens: number[];
}

/**
 * The most a set of legs can make and lose at expiry, and where it breaks
 * even. The payoff is straight between the strikes, so its extremes are at
 * a strike, at a price of 0, or past the highest strike, where a slope that
 * is not flat has no limit.
 */
export function payoffStats(legs: readonly OptionLeg[], multiplier = 1): PayoffStats {
  if (priced(legs).length === 0) return { maxProfit: 0, maxLoss: 0, breakevens: [] };
  const at = [0, ...kinks(legs)];
  const values = at.map((price) => optionPayoff(legs, price, multiplier));
  const rising = slopeAbove(legs);
  const range = extent(values) ?? { min: 0, max: 0 };
  // Nothing: by the size of the sums themselves, which a small multiplier makes small.
  const nothing = EPSILON * Math.max(Math.abs(range.min), Math.abs(range.max));
  const isNothing = (value: number) => Math.abs(value) <= nothing;
  const breakevens: number[] = [];
  for (let i = 0; i < at.length; i++) {
    const value = values[i];
    if (isNothing(value)) {
      // A stretch at zero is no one price: only where the line comes to zero from a side.
      const before = i > 0 ? values[i - 1] : value;
      const leaves = i < at.length - 1 ? !isNothing(values[i + 1]) : Math.abs(rising) > EPSILON;
      if (!isNothing(before) || leaves) breakevens.push(at[i]);
    } else if (i < at.length - 1 && !isNothing(values[i + 1]) && value * values[i + 1] < 0) {
      breakevens.push(at[i] + ((at[i + 1] - at[i]) * -value) / (values[i + 1] - value));
    }
  }
  // Past the highest strike the line runs on at its slope: it may cross zero once more.
  const last = values[values.length - 1];
  if (Math.abs(rising) > EPSILON && !isNothing(last) && last * rising < 0) breakevens.push(at[at.length - 1] - last / (rising * unitsOf(multiplier)));
  return {
    maxProfit: rising > EPSILON ? null : Math.max(0, range.max),
    maxLoss: rising < -EPSILON ? null : Math.min(0, range.min),
    breakevens: [...new Set(breakevens.map((price) => Number(price.toPrecision(12))))].sort((a, b) => a - b),
  };
}

export interface PayoffPoint {
  price: number;
  value: number;
  x: number;
  y: number;
}

export interface PayoffLayout {
  plot: Rect;
  xScale: NiceScale;
  yScale: NiceScale;
  /** The line: its ends, and each strike between them. */
  points: PayoffPoint[];
  /** The y of zero profit, on the plot. */
  zeroY: number;
  stats: PayoffStats;
}

/** The prices drawn: the range given, else from under the lowest strike (or the entry, or the price now) to over the highest. Never under zero. */
function priceRange(options: PayoffOptions): { min: number; max: number } {
  const given = options.range;
  if (given && finite(given.min) && finite(given.max) && given.max > Math.max(0, given.min)) return { min: Math.max(0, given.min), max: given.max };
  const around = extent([
    ...kinks(options.legs),
    ...priced(options.legs).filter((leg) => leg.type === 'underlying').map((leg) => leg.entry as number),
    ...(finite(options.spot) ? [options.spot] : []),
  ]);
  // Nothing to go by, or nothing above zero: any prices will do.
  if (!around || around.max <= 0) return { min: 0, max: 1 };
  const { min: lo, max: hi } = around;
  const margin = Math.max(hi - lo, hi * AUTO_MARGIN) * (hi > lo ? 0.5 : 1);
  return { min: Math.max(0, lo - margin), max: hi + margin };
}

/** The payoff's line over its prices, for a chart `width` × `height`. */
export function computePayoffLayout(options: PayoffOptions, width: number, height: number, _theme: Theme, measure: Measure): PayoffLayout {
  const { legs, multiplier } = options;
  const range = priceRange(options);
  const xScale = niceScale(range.min, range.max, Math.max(2, Math.floor(width / 110)));
  const prices = [xScale.min, ...kinks(legs).filter((k) => k > xScale.min && k < xScale.max), xScale.max];
  const values = prices.map((price) => optionPayoff(legs, price, multiplier));
  const reach = extent(values) ?? { min: 0, max: 0 };
  const yScale = niceScale(Math.min(0, reach.min), Math.max(0, reach.max), Math.max(2, Math.floor(height / 60)));
  const yFormat = options.valueFormat ?? axisFormat(yScale, options.locale);
  const xFormat = options.priceFormat ?? axisFormat(xScale, options.locale);
  const tickWidth = Math.max(0, ...yScale.ticks.map((tick) => measure(yFormat(tick), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const right = CHART_PAD + measure(xFormat(xScale.max), LABEL_SIZE) / 2;
  // Over the plot: the price now and the breakevens.
  const top = CHART_PAD + TOP_MARK_ROOM;
  const plot = { x: left, y: top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - CHART_PAD - BOTTOM_LABELS) };
  const points = prices.map((price, i) => ({
    price,
    value: values[i],
    x: scaleToPx(xScale, price, plot.x, plot.width),
    y: scaleToPx(yScale, values[i], plot.y, plot.height, true),
  }));
  return { plot, xScale, yScale, points, zeroY: scaleToPx(yScale, 0, plot.y, plot.height, true), stats: payoffStats(legs, multiplier) };
}

/** The price under the pointer's x, inside the plot; null outside it. */
export function payoffPriceAt(layout: PayoffLayout, x: number, y: number): number | null {
  const { plot, xScale } = layout;
  if (x < plot.x || x > plot.x + plot.width || y < plot.y || y > plot.y + plot.height) return null;
  return xScale.min + ((x - plot.x) / plot.width) * (xScale.max - xScale.min);
}

export function renderPayoff(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: PayoffOptions,
  theme: Theme,
  pointer: { x: number; y: number } | null,
  layout: PayoffLayout = computePayoffLayout(options, width, height, theme, canvasMeasure(ctx, theme)),
): PayoffLayout {
  const { plot, points, zeroY } = layout;
  const valueFormat = options.valueFormat ?? numberFormat(options.locale);
  const priceFormat = options.priceFormat ?? readoutFormat(layout.xScale, options.locale);
  const profit = options.profitColor ?? theme.candleUp;
  const loss = options.lossColor ?? theme.candleDown;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  drawValueAxis(ctx, plot, layout.yScale, 'vertical', theme, options.valueFormat ?? axisFormat(layout.yScale, options.locale));
  drawValueAxis(ctx, plot, layout.xScale, 'horizontal', theme, options.priceFormat ?? axisFormat(layout.xScale, options.locale));
  if (points.length < 2) return layout;

  // The area between the line and zero: the profit's colour above it, the loss's below.
  for (const [color, clipY, clipHeight] of [[profit, plot.y, zeroY - plot.y], [loss, zeroY, plot.y + plot.height - zeroY]] as const) {
    if (clipHeight <= 0) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x, clipY, plot.width, clipHeight);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(points[0].x, zeroY);
    for (const point of points) ctx.lineTo(point.x, point.y);
    ctx.lineTo(points[points.length - 1].x, zeroY);
    ctx.closePath();
    ctx.fillStyle = withAlpha(color, FILL_ALPHA);
    ctx.fill();
    // The line itself, in the side's colour.
    ctx.beginPath();
    points.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  // Zero profit: where the legs break even.
  ctx.save();
  ctx.strokeStyle = theme.textSecondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.x, Math.round(zeroY) + 0.5);
  ctx.lineTo(plot.x + plot.width, Math.round(zeroY) + 0.5);
  ctx.stroke();
  ctx.restore();

  drawMarks(ctx, layout, options, theme, priceFormat);

  const price = pointer && options.crosshair !== false ? payoffPriceAt(layout, pointer.x, pointer.y) : null;
  if (price !== null && pointer) {
    const value = optionPayoff(options.legs, price, options.multiplier);
    const x = Math.round(pointer.x) + 0.5;
    const y = scaleToPx(layout.yScale, value, plot.y, plot.height, true);
    ctx.save();
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.height);
    ctx.stroke();
    ctx.fillStyle = value >= 0 ? profit : loss;
    ctx.beginPath();
    ctx.arc(pointer.x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawTooltip(ctx, [
      { text: priceFormat(price), bold: true },
      { text: `${value > 0 ? '+' : ''}${valueFormat(value)}`, color: value >= 0 ? profit : loss },
    ], pointer, { x: 0, y: 0, width, height }, theme);
  }
  return layout;
}

/** The price now and the breakevens: a dashed line each, its price over the plot. */
function drawMarks(ctx: CanvasRenderingContext2D, layout: PayoffLayout, options: PayoffOptions, theme: Theme, priceFormat: (value: number) => string): void {
  const { plot, xScale } = layout;
  const prices = [
    ...(finite(options.spot) ? [{ price: options.spot, color: theme.text, label: options.spotLabel }] : []),
    ...layout.stats.breakevens.map((price) => ({ price, color: theme.textSecondary, label: undefined as string | undefined })),
  ].filter((mark) => mark.price >= xScale.min && mark.price <= xScale.max);
  drawTopMarks(ctx, plot, prices.map((mark) => ({
    x: scaleToPx(xScale, mark.price, plot.x, plot.width),
    color: mark.color,
    text: mark.label ? `${mark.label} ${priceFormat(mark.price)}` : priceFormat(mark.price),
  })), theme);
}
