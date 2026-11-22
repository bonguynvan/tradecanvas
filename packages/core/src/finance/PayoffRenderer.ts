import type { OptionLeg, PayoffModel, PayoffOptions, Theme } from '@tradecanvas/commons';
import { withAlpha } from '@tradecanvas/commons';
import {
  AXIS_GAP,
  BOTTOM_LABELS,
  CHART_PAD,
  LABEL_SIZE,
  TOP_MARK_ROOM,
  axisFormat,
  canvasMeasure,
  LABEL_GAP,
  drawLegend,
  drawTooltip,
  drawTopMarks,
  drawValueAxis,
  extent,
  fitText,
  layoutLegend,
  niceScale,
  numberFormat,
  readoutFormat,
  scaleToPx,
  type LegendLayout,
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

/** Days in a year, for the time an option has left. */
const DAYS_A_YEAR = 365;
/** Steps along the line of a position's value before expiry: it is a curve, and the payoff's kinks are on it too. */
const TODAY_STEPS = 64;
const TODAY_DASH = [5, 4];

/** What an option's price is worked out from, besides the underlying's price and its strike. */
export interface OptionTerms {
  /** The time left, in years. None left, or less: the option is worth what it pays. */
  years: number;
  /** The implied volatility, a year's, as a share: `0.25` is 25%. */
  volatility: number;
  /** The interest rate, a year's, as a share. Default `0`. */
  rate?: number;
  /** The underlying's dividend yield, a year's, as a share. Default `0`. */
  dividendYield?: number;
}

/** How wide a legend entry's sample and its gap are at most, px: what a name is cut to fit beside. */
const LEGEND_SAMPLE_ROOM = 28;

/** The share of a standard normal under `x` (Abramowitz and Stegun 7.1.26, good to seven places); what is over `x` is the rest, exactly. */
function normalCdf(x: number): number {
  if (x < 0) return 1 - normalCdf(-x);
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 1 - (poly * Math.exp(-(x * x) / 2)) / 2;
}

/**
 * The Black-Scholes price of a European call or put: what one unit is
 * worth with the underlying at `spot`, by a model. With no time left it is
 * what the option pays. With nothing to move it (a volatility of zero or
 * under, an underlying or a strike at nothing) it is what its forward
 * pays, brought back to today: a put with the underlying at nothing is its
 * strike, discounted. 0 for a price or a strike under zero, for any of the
 * numbers that is none, and for a time without end. Good to about a part
 * in a million of the price: for a chart and a sum, not for a quote.
 */
export function optionPrice(type: 'call' | 'put', spot: number, strike: number, terms: OptionTerms): number {
  const { years, volatility } = terms;
  if (!finite(spot) || !finite(strike) || spot < 0 || strike < 0 || !finite(volatility)) return 0;
  if (Number.isNaN(years) || years === Number.POSITIVE_INFINITY) return 0;
  const sign = type === 'call' ? 1 : -1;
  if (!(years > 0)) return Math.max(0, sign * (spot - strike));
  const rate = finite(terms.rate) ? terms.rate : 0;
  const carried = spot * Math.exp(-(finite(terms.dividendYield) ? terms.dividendYield : 0) * years);
  const discounted = strike * Math.exp(-rate * years);
  // A rate over a time that takes either past what a number holds prices nothing.
  if (!Number.isFinite(carried) || !Number.isFinite(discounted)) return 0;
  // One outcome only: no volatility, or an underlying or a strike at nothing, which no volatility moves.
  if (!(volatility > 0) || carried === 0 || discounted === 0) return Math.max(0, sign * (carried - discounted));
  const spread = volatility * Math.sqrt(years);
  const d1 = Math.log(carried / discounted) / spread + spread / 2;
  const price = sign * (carried * normalCdf(sign * d1) - discounted * normalCdf(sign * (d1 - spread)));
  // Far out, the two tails' rounding can leave a hair under nothing.
  return Number.isFinite(price) ? Math.max(0, price) : 0;
}

/**
 * What the legs together make or lose before expiry with the underlying at
 * `price`: each option at its model price (`optionPrice`) less the premium
 * paid, the other way for one sold, the underlying by its move from its
 * entry; times `multiplier`. A leg's own `daysToExpiry` and `volatility`
 * stand in for the model's. With no days left, or days that are no number,
 * it is `optionPayoff`.
 */
export function positionValue(legs: readonly OptionLeg[], price: number, model: PayoffModel, multiplier = 1): number {
  let total = 0;
  for (const leg of priced(legs)) {
    if (leg.type === 'underlying') {
      total += (price - (leg.entry ?? 0)) * sizeOf(leg);
      continue;
    }
    const days = finite(leg.daysToExpiry) ? leg.daysToExpiry : model.daysToExpiry;
    const worth = optionPrice(leg.type, price, leg.strike ?? 0, {
      years: finite(days) ? days / DAYS_A_YEAR : 0,
      volatility: finite(leg.volatility) ? leg.volatility : model.volatility,
      rate: model.rate,
      dividendYield: model.dividendYield,
    });
    total += (worth - (finite(leg.premium) ? leg.premium : 0)) * sizeOf(leg);
  }
  return total * unitsOf(multiplier);
}

/** The model the chart draws a second line by, or null: its days and its volatility have to be numbers. */
export function payoffModelOf(options: PayoffOptions): PayoffModel | null {
  const model = options.model;
  return model && finite(model.daysToExpiry) && finite(model.volatility) ? model : null;
}

/** The names of the two lines: the payoff's, and the model's by its days unless it has one. */
function lineNames(options: PayoffOptions, model: PayoffModel): { expiry: string; today: string } {
  const days = Math.max(0, Math.round(model.daysToExpiry));
  return { expiry: options.expiryLabel ?? 'At expiry', today: model.label ?? `In ${days} ${days === 1 ? 'day' : 'days'}` };
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
  /** The position's value before expiry, by the options' `model`: a curve over the same prices. Null without a model. */
  today: PayoffPoint[] | null;
  /** The two lines' names, over the plot. Null without a model. */
  legend: LegendLayout | null;
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
export function computePayoffLayout(options: PayoffOptions, width: number, height: number, theme: Theme, measure: Measure): PayoffLayout {
  const { legs, multiplier } = options;
  const range = priceRange(options);
  const xScale = niceScale(range.min, range.max, Math.max(2, Math.floor(width / 110)));
  const prices = [xScale.min, ...kinks(legs).filter((k) => k > xScale.min && k < xScale.max), xScale.max];
  const values = prices.map((price) => optionPayoff(legs, price, multiplier));
  const model = payoffModelOf(options);
  // The value before expiry is a curve: sampled along the prices, the payoff's kinks among them.
  const span = xScale.max - xScale.min;
  const todayPrices = model
    ? [...new Set([...Array.from({ length: TODAY_STEPS + 1 }, (_, i) => xScale.min + (span * i) / TODAY_STEPS), ...prices])].sort((a, b) => a - b)
    : [];
  const todayValues = model ? todayPrices.map((price) => positionValue(legs, price, model, multiplier)) : [];
  const reach = extent([...values, ...todayValues]) ?? { min: 0, max: 0 };
  const yScale = niceScale(Math.min(0, reach.min), Math.max(0, reach.max), Math.max(2, Math.floor(height / 60)));
  const yFormat = options.valueFormat ?? axisFormat(yScale, options.locale);
  const xFormat = options.priceFormat ?? axisFormat(xScale, options.locale);
  const tickWidth = Math.max(0, ...yScale.ticks.map((tick) => measure(yFormat(tick), LABEL_SIZE)));
  const left = CHART_PAD + tickWidth + AXIS_GAP;
  const right = CHART_PAD + measure(xFormat(xScale.max), LABEL_SIZE) / 2;
  const names = model ? lineNames(options, model) : null;
  // Each name beside its line as it is drawn: the payoff's in its two colours, the other dashed. A name too long for the chart is cut.
  const nameRoom = Math.max(0, width - CHART_PAD * 2 - LEGEND_SAMPLE_ROOM);
  const profit = options.profitColor ?? theme.candleUp;
  const loss = options.lossColor ?? theme.candleDown;
  const legend = names
    ? layoutLegend(
        [
          { label: fitText(names.expiry, nameRoom, measure), color: profit, line: { colors: [profit, loss] } },
          { label: fitText(names.today, nameRoom, measure), color: theme.textSecondary, line: { dash: TODAY_DASH } },
        ],
        width - CHART_PAD * 2,
        measure,
      )
    : null;
  // Over the plot: the lines' names, then the price now and the breakevens.
  const top = CHART_PAD + (legend ? legend.height + LABEL_GAP : 0) + TOP_MARK_ROOM;
  const plot = { x: left, y: top, width: Math.max(1, width - left - right), height: Math.max(1, height - top - CHART_PAD - BOTTOM_LABELS) };
  const points = prices.map((price, i) => ({
    price,
    value: values[i],
    x: scaleToPx(xScale, price, plot.x, plot.width),
    y: scaleToPx(yScale, values[i], plot.y, plot.height, true),
  }));
  const today = model
    ? todayPrices.map((price, i) => ({
        price,
        value: todayValues[i],
        x: scaleToPx(xScale, price, plot.x, plot.width),
        y: scaleToPx(yScale, todayValues[i], plot.y, plot.height, true),
      }))
    : null;
  return { plot, xScale, yScale, points, zeroY: scaleToPx(yScale, 0, plot.y, plot.height, true), stats: payoffStats(legs, multiplier), today, legend };
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

  // The value before expiry: a dashed line over the payoff's, in the quiet ink, so the two are told apart without a colour.
  const model = payoffModelOf(options);
  if (layout.today && layout.today.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(plot.x, plot.y, plot.width, plot.height);
    ctx.clip();
    ctx.beginPath();
    layout.today.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.strokeStyle = theme.textSecondary;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.setLineDash(TODAY_DASH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (layout.legend) drawLegend(ctx, layout.legend, CHART_PAD, CHART_PAD, theme);

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
    const signed = (amount: number): string => `${amount > 0 ? '+' : ''}${valueFormat(amount)}`;
    const names = model ? lineNames(options, model) : null;
    const before = model ? positionValue(options.legs, price, model, options.multiplier) : null;
    // With a second line each amount says whose it is; alone, the payoff needs no name.
    drawTooltip(ctx, [
      { text: priceFormat(price), bold: true },
      { text: names ? `${names.expiry} ${signed(value)}` : signed(value), color: value >= 0 ? profit : loss },
      ...(names && before !== null ? [{ text: `${names.today} ${signed(before)}`, color: before >= 0 ? profit : loss }] : []),
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
