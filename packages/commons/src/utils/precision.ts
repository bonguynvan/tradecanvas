const NUMBER_FORMAT_CACHE_LIMIT = 64;
const numberFormatCache = new Map<string, Intl.NumberFormat>();

/**
 * `Number#toLocaleString(locale, options)` constructs a fresh
 * `Intl.NumberFormat` on every call — ~20µs in V8 versus ~0.4µs to reuse one.
 * Axis labels, the legend, crosshair pills and panel axes format dozens of
 * numbers per frame, so formatters are cached per (locale, precision). The
 * output is identical: per spec, `toLocaleString` is defined as exactly this.
 */
function numberFormat(locale: string, precision: number): Intl.NumberFormat {
  const key = `${locale}|${precision}`;
  let nf = numberFormatCache.get(key);
  if (!nf) {
    if (numberFormatCache.size >= NUMBER_FORMAT_CACHE_LIMIT) numberFormatCache.clear();
    nf = new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
    numberFormatCache.set(key, nf);
  }
  return nf;
}

export function formatPrice(value: number, precision = 2, locale = 'en-US'): string {
  return numberFormat(locale, precision).format(value);
}

/**
 * Decimals the price axis uses for a visible price range: one more than its
 * tick step needs, 2 at minimum. Everything that prints a price next to the
 * axis (legend, crosshair pill, last-price tag) shares it, so a sub-cent
 * asset reads "0.000004349" everywhere instead of "0.00" off the axis.
 */
export function autoPricePrecision(min: number, max: number): number {
  if (!(max > min) || !Number.isFinite(min) || !Number.isFinite(max)) return 2;
  const step = computeTickStep(min, max, 8);
  return step > 0 && step < 1 ? Math.ceil(-Math.log10(step)) + 1 : 2;
}

import type { PriceScaleMode } from '../types/rendering.js';
import type { PriceFormatter, PriceFraction } from '../types/chart.js';
import { computeTickStep } from './math.js';

/**
 * Format a price-axis label for a given scale mode.
 *
 * - `regular` / `logarithmic`: the raw price.
 * - `percentage`: change from `baseline`, e.g. `+12.34%`.
 * - `indexedTo100`: the price rebased so `baseline` reads as 100.
 *
 * Falls back to a plain price when a baseline is required but missing/zero.
 */
export function formatPriceScaleLabel(
  price: number,
  mode: PriceScaleMode,
  baseline: number | undefined,
  precision = 2,
  locale = 'en-US',
): string {
  if ((mode === 'percentage' || mode === 'indexedTo100') && baseline && baseline !== 0) {
    if (mode === 'percentage') {
      const pct = (price / baseline - 1) * 100;
      const sign = pct > 0 ? '+' : '';
      return `${sign}${pct.toFixed(2)}%`;
    }
    const indexed = (price / baseline) * 100;
    return formatPrice(indexed, 2, locale);
  }
  return formatPrice(price, precision, locale);
}

/**
 * `value` in fractions of a point: whole points, an apostrophe, then the
 * fraction's numerator padded to the denominator's digits (`101'16` for
 * 101.5 in 32nds). A `subDenominator` of 2 or 4 adds the half or quarter of
 * that fraction as one more digit, as futures quote it (`101'165`, `110'162`,
 * `110'167`). Rounds to the nearest step. A denominator that isn't a whole
 * number above 1 gives plain digits.
 */
export function formatFraction(value: number, denominator: number, subDenominator = 1): string {
  const sub = Number.isInteger(subDenominator) && subDenominator > 1 ? subDenominator : 1;
  if (!Number.isFinite(value) || !Number.isInteger(denominator) || denominator < 2) return String(value);
  const steps = denominator * sub;
  const total = Math.round(Math.abs(value) * steps);
  const whole = Math.floor(total / steps);
  const rest = total - whole * steps;
  const numerator = Math.floor(rest / sub);
  const width = String(denominator - 1).length;
  const tail = sub > 1 ? String(Math.floor(((rest - numerator * sub) / sub) * 10)) : '';
  const sign = value < 0 && total > 0 ? '-' : '';
  return `${sign}${whole}'${String(numerator).padStart(width, '0')}${tail}`;
}

/**
 * The smallest step a fraction format prints (a 32nd; a quarter of one with
 * `subDenominator` 4), or null for a denominator it can't print (it falls
 * back to plain digits then).
 */
export function fractionTick(fraction: PriceFraction): number | null {
  if (!Number.isInteger(fraction.denominator) || fraction.denominator < 2) return null;
  const sub = Number.isInteger(fraction.subDenominator) && (fraction.subDenominator ?? 0) > 1 ? fraction.subDenominator as number : 1;
  return 1 / (fraction.denominator * sub);
}

/** The formatter a `priceFormat` option stands for: its function, its fraction's, or null for decimals. */
export function priceFormatterFor(format: PriceFormatter | PriceFraction | null | undefined): PriceFormatter | null {
  if (!format) return null;
  if (typeof format === 'function') return format;
  // A denominator it can't print leaves the chart's decimals.
  if (fractionTick(format) === null) return null;
  return (price) => formatFraction(price, format.denominator, format.subDenominator);
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(2) + 'K';
  return value.toFixed(0);
}

export function detectPrecision(values: number[]): number {
  let maxDecimals = 0;
  for (const v of values) {
    const str = v.toString();
    const dot = str.indexOf('.');
    if (dot >= 0) {
      maxDecimals = Math.max(maxDecimals, str.length - dot - 1);
    }
  }
  return Math.min(maxDecimals, 8);
}
