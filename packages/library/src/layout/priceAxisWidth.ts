import { PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice } from '@tradecanvas/commons';

/** Axis label: 8px tick notch + gap on the left, 6px margin on the right. */
const LABEL_CHROME = 14;
/** Last-price tag: its figures start 8px in, as the scale's labels do, with 6px of margin on the right. */
const PRICE_TAG_CHROME = 14;
/** Crosshair tag: its figures start 8px in; the rest is margin on the right, as it had with its notch. */
const CROSSHAIR_PILL_CHROME = 22;
/** The widest percentage the crosshair's tag is given room for. */
const CHANGE_SAMPLE = '+00.00%';
/** Widths snap to this grid so a one-pixel label change doesn't relayout. */
const WIDTH_GRANULARITY = 4;
/** Shrinking waits until this much room is spare, so panning doesn't make the axis twitch. */
export const AXIS_SHRINK_SLACK = 12;

export interface PriceAxisWidthInput {
  min: number;
  max: number;
  lastPrice: number | null;
  /** Decimals for the scale and its tags (a market's or symbol's `pricePrecision`), or null to fit the range. */
  tagPrecision: number | null;
  locale: string;
  /** The chart's price format, when it has one: labels and tags print with it. */
  format?: ((price: number) => string) | null;
  /** The scale's label for a price as the axis writes it (its decimals, percent, a fraction), when known. */
  scaleLabel?: ((price: number) => string) | null;
  /**
   * Labels and tags the indicator panes write on the same axis (their scales,
   * their latest values): it is one strip down the chart, as wide as the
   * widest of any pane's.
   */
  paneLabels?: readonly string[];
  paneTags?: readonly string[];
  /** The crosshair's tag has a percentage under its price (`crosshair.labelChange`): room for that line too. */
  crosshairChange?: boolean;
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
  const axisPrecision = input.tagPrecision ?? autoPricePrecision(min, max);
  const tagPrecision = axisPrecision;
  const prices = lastPrice !== null ? [min, max, lastPrice] : [min, max];

  let need = PRICE_AXIS_WIDTH;
  for (const price of prices) {
    if (!Number.isFinite(price)) continue;
    const label = input.scaleLabel ? input.scaleLabel(price) : input.format ? input.format(price) : formatPrice(price, axisPrecision, locale);
    const tag = input.format ? label : formatPrice(price, tagPrecision, locale);
    need = Math.max(
      need,
      measure(label, `500 ${fontSizeSmall}px ${fontFamily}`) + LABEL_CHROME,
      measure(tag, `bold ${Math.max(fontSizeSmall, 11)}px ${fontFamily}`) + PRICE_TAG_CHROME,
      measure(tag, `600 ${fontSizeSmall}px ${fontFamily}`) + CROSSHAIR_PILL_CHROME,
    );
  }
  const labelFont = `500 ${fontSizeSmall}px ${fontFamily}`;
  // A change of two figures before the point: a wider one, rare under a pointer, is cut at the axis's edge.
  if (input.crosshairChange) need = Math.max(need, measure(CHANGE_SAMPLE, labelFont) + PRICE_TAG_CHROME);
  for (const label of input.paneLabels ?? []) need = Math.max(need, measure(label, labelFont) + LABEL_CHROME);
  // A pane's tag is drawn in the theme's small size, bold: as wide as the last price's, measured at the wider of the two.
  for (const tag of input.paneTags ?? []) {
    need = Math.max(need, measure(tag, `bold ${Math.max(fontSizeSmall, 11)}px ${fontFamily}`) + PRICE_TAG_CHROME);
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
