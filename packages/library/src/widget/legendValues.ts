import type { IndicatorValue } from '@tradecanvas/commons';
import { formatPrice } from '@tradecanvas/commons';

/**
 * Output fields that are not drawn — flags (trend direction, session key, bar
 * colour) and intermediate or running values — so the legend leaves them out.
 * Keep in step with the indicators' `render` in core.
 */
const SKIP_KEYS: Readonly<Record<string, readonly string[]>> = {
  psar: ['trend'],
  supertrend: ['trend'],
  svwap: ['session'],
  ao: ['up'],
  voldelta: ['up'],
  chaikinOsc: ['adl'],
  adx: ['dx'],
  lrc: ['slope'],
  ichimoku: ['chikou'],
};

/**
 * One-line indicators drawn in an up colour (`colors[0]`) or a down colour
 * (`colors[1]`) bar by bar: whether a point is drawn in the up colour.
 */
const TWO_TONE: Readonly<Record<string, (point: IndicatorValue) => boolean>> = {
  psar: (p) => p.trend === 1,
  supertrend: (p) => p.trend === 1,
  ao: (p) => p.up === 1,
  voldelta: (p) => p.up === 1,
  chaikinOsc: (p) => (p.value ?? 0) >= 0,
  cmf: (p) => (p.value ?? 0) >= 0,
  dpo: (p) => (p.value ?? 0) >= 0,
};

/** Indicators that draw in fixed colours of their own, not their style's. */
const OWN_COLOURS: ReadonlySet<string> = new Set(['ac']);

/** The finite line values of one indicator output point, in output order. */
export function legendNumbers(id: string, point: IndicatorValue | null | undefined): number[] {
  if (!point) return [];
  const skip = SKIP_KEYS[id];
  const numbers: number[] = [];
  for (const key in point) {
    const v = point[key];
    if (typeof v === 'number' && Number.isFinite(v) && !skip?.includes(key)) numbers.push(v);
  }
  return numbers;
}

/**
 * The colour a one-line indicator is drawn in at `point`, so its value reads
 * as part of the line; null = the neutral text colour.
 */
export function legendLineColor(
  id: string,
  colors: readonly string[],
  point: IndicatorValue | null | undefined,
): string | null {
  if (OWN_COLOURS.has(id)) return null;
  const isUp = TWO_TONE[id];
  if (!isUp) return colors[0] ?? null;
  if (!point) return null;
  return (isUp(point) ? colors[0] : colors[1]) ?? null;
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
  const size = Math.abs(value);
  if (size >= 1e6) return compactFormat(locale).format(value);
  const digits = size >= 1000 ? 1 : size >= 1 ? 2 : size >= 0.01 ? 4 : 6;
  return formatPrice(value, digits, locale);
}
