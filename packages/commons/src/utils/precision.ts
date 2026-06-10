export function formatPrice(value: number, precision = 2, locale = 'en-US'): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

import type { PriceScaleMode } from '../types/rendering.js';

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
    return indexed.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
