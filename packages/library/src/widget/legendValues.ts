import type { IndicatorDescriptor, IndicatorValue } from '@tradecanvas/commons';
import { formatPrice } from '@tradecanvas/commons';
import { plotColor, indicatorValuePrecision } from '@tradecanvas/core';

/** One value in an indicator's legend row; `color` null = the neutral text colour. */
export interface LegendValue {
  value: number;
  color: string | null;
}

/**
 * An indicator's values at one bar, as its legend shows them: one per plot it
 * draws, in drawing order, each in the colour its line has at that bar (the
 * up or down colour of a two-tone plot). An indicator that declares no plots
 * shows every finite field, in its colour only when there is just one.
 */
export function legendValues(
  descriptor: Pick<IndicatorDescriptor, 'plots'>,
  point: IndicatorValue | null | undefined,
  colors: readonly string[],
): LegendValue[] {
  if (!point) return [];
  const plots = descriptor.plots;
  if (!plots) {
    const numbers: number[] = [];
    for (const key in point) {
      const v = point[key];
      if (typeof v === 'number' && Number.isFinite(v)) numbers.push(v);
    }
    const color = numbers.length === 1 ? colors[0] ?? null : null;
    return numbers.map((value) => ({ value, color }));
  }
  const style = { colors: [...colors], lineWidths: [], opacity: 1 };
  const out: LegendValue[] = [];
  for (const plot of plots) {
    const v = point[plot.key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out.push({ value: v, color: colors.length ? plotColor(plot, style, point) : null });
  }
  return out;
}

/** Compact formats ("1.23M") by locale; the legend formats every frame. */
const compactFormats = new Map<string, Intl.NumberFormat>();

function compactFormat(locale: string): Intl.NumberFormat {
  let format = compactFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 });
    compactFormats.set(locale, format);
  }
  return format;
}

/**
 * A pane indicator's value (RSI 54.32, MACD 0.0012, OBV 1.23M): the decimals
 * follow its size, and big ones are shortened.
 */
export function formatIndicatorValue(value: number, locale = 'en-US'): string {
  if (Math.abs(value) >= 1e6) return compactFormat(locale).format(value);
  return formatPrice(value, indicatorValuePrecision(value), locale);
}
