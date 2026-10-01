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
