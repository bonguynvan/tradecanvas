import { PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice } from '@tradecanvas/commons';

/** Axis label: 8px tick notch + gap on the left, 6px margin on the right. */
const LABEL_CHROME = 14;
/** Last-price tag: 12px badge padding + 2px margin. */
const PRICE_TAG_CHROME = 14;
/** Crosshair pill: 16px padding + 5px notch + 1px margin. */
const CROSSHAIR_PILL_CHROME = 22;
/** Widths snap to this grid so a one-pixel label change doesn't relayout. */
const WIDTH_GRANULARITY = 4;
/** Shrinking waits until this much room is spare, so panning doesn't make the axis twitch. */
export const AXIS_SHRINK_SLACK = 12;

export interface PriceAxisWidthInput {
  min: number;
  max: number;
  lastPrice: number | null;
  /** Decimals for the price tags (a market's `pricePrecision`), or null to follow the axis. */
  tagPrecision: number | null;
  locale: string;
  fontFamily: string;
  fontSizeSmall: number;
  measure: (text: string, font: string) => number;
}

/**
 * Width the price axis needs for its widest label — tick labels, the
 * last-price tag and the crosshair pill — never below `PRICE_AXIS_WIDTH`.
 * A sub-cent asset ("0,000004349") needs ~90px where BTC fits the default.
 */
export function requiredPriceAxisWidth(input: PriceAxisWidthInput): number {
  const { min, max, lastPrice, locale, fontFamily, fontSizeSmall, measure } = input;
  const axisPrecision = autoPricePrecision(min, max);
  const tagPrecision = input.tagPrecision ?? axisPrecision;
  const prices = lastPrice !== null ? [min, max, lastPrice] : [min, max];

  let need = PRICE_AXIS_WIDTH;
  for (const price of prices) {
    if (!Number.isFinite(price)) continue;
    const label = formatPrice(price, axisPrecision, locale);
    const tag = formatPrice(price, tagPrecision, locale);
    need = Math.max(
      need,
      measure(label, `500 ${fontSizeSmall}px ${fontFamily}`) + LABEL_CHROME,
      measure(tag, `bold 11px ${fontFamily}`) + PRICE_TAG_CHROME,
      measure(tag, `600 ${fontSizeSmall}px ${fontFamily}`) + CROSSHAIR_PILL_CHROME,
    );
  }
  // The default stays exact; only widened axes snap to the grid.
  return need <= PRICE_AXIS_WIDTH ? PRICE_AXIS_WIDTH : Math.ceil(need / WIDTH_GRANULARITY) * WIDTH_GRANULARITY;
}

/** The axis width to use next: grow at once, shrink only once enough room is spare. */
export function nextPriceAxisWidth(current: number, required: number): number {
  if (required > current) return required;
  if (required <= current - AXIS_SHRINK_SLACK) return required;
  return current;
}
