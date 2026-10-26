import { formatPrice } from '@tradecanvas/commons';
import { indicatorValuePrecision, type CompareValue } from '@tradecanvas/core';
import type { IndicatorLegendRow } from './WidgetIndicatorLegend.js';
import { signed } from './signedFigure.js';

/** A price shows no fewer decimals than this, as the chart's prices do. */
const PRICE_DECIMALS = 2;
/** A change shows this many, as the percent scale's labels do. */
const CHANGE_DECIMALS = 2;

/**
 * A compared symbol's price, in decimals of its own by its size (65,432.10,
 * 0.1002): the chart's decimals are the main symbol's, which would write a
 * 0.1002 coin as 0.10.
 */
export function formatComparePrice(price: number, locale = 'en-US'): string {
  return formatPrice(price, Math.max(PRICE_DECIMALS, indicatorValuePrecision(price)), locale);
}

/** A change in percent with its sign (+8.45%, -7.69%), none when it reads as nothing. */
export function formatChangePercent(change: number, locale = 'en-US'): string {
  const text = signed(formatPrice(Math.abs(change), CHANGE_DECIMALS, locale), change, formatPrice(0, CHANGE_DECIMALS, locale));
  return `${text}%`;
}

/**
 * The legend's rows for the symbols compared in percent (`chart.getCompareValues`):
 * each one's price and its change since its first bar on screen, the change
 * in its line's colour, as the percent scale reads it.
 */
export function compareLegendRows(values: readonly CompareValue[], locale = 'en-US'): IndicatorLegendRow[] {
  return values.map((v) => ({
    instanceId: v.id,
    kind: 'compare',
    label: v.label,
    visible: v.visible,
    values: [
      ...(v.close !== null ? [{ text: formatComparePrice(v.close, locale), color: null }] : []),
      ...(v.change !== null ? [{ text: formatChangePercent(v.change, locale), color: v.color }] : []),
    ],
    pane: null,
  }));
}
