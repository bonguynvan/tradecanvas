import { formatPrice, type ViewportState } from '@tradecanvas/commons';
import { panelPrecision, priceScaleText, roundStep, stepTicks } from './PriceAxis.js';
import { indicatorValuePrecision } from '../ui/axisValueLabels.js';

/** Below this plot height (px) a pane is folded to its header and writes no scale. */
export const MIN_PANE_PLOT_HEIGHT = 8;

/** The step and decimals of a pane's value scale, or null when it writes none (a folded or flat pane). */
export function panelScale(pv: ViewportState): { step: number; precision: number } | null {
  const { min, max } = pv.priceRange;
  if (!(max - min > 0) || pv.chartRect.height < MIN_PANE_PLOT_HEIGHT) return null;
  const step = roundStep(min, max, pv.chartRect.height);
  return { step, precision: panelPrecision(step) };
}

/** Every label a pane's value scale writes, as its axis draws them. */
export function panelScaleTexts(pv: ViewportState, locale: string): string[] {
  const scale = panelScale(pv);
  if (!scale) return [];
  const { min, max } = pv.priceRange;
  return stepTicks(min, max, scale.step).map((value) => priceScaleText(value, pv, scale.precision, locale));
}

/** A pane indicator's latest value as its tag on the axis writes it: in percent on a percent pane, like its scale. */
export function panelTagText(value: number, pv: ViewportState, locale: string): string {
  return pv.scaleMode === 'percentage' && pv.scaleBaseline
    ? priceScaleText(value, pv, 2, locale)
    : formatPrice(value, indicatorValuePrecision(value), locale);
}
