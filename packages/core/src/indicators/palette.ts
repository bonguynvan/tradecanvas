import type { IndicatorIntervals, IndicatorPlotStyle } from '@tradecanvas/commons';
import { TC_SERIES_COLORS } from '@tradecanvas/commons';

/** The series palette rotated to start at `shift`: a new indicator's colours. */
export function paletteFrom(shift: number): string[] {
  return [...TC_SERIES_COLORS.slice(shift), ...TC_SERIES_COLORS.slice(0, shift)];
}

/** Whether `colors` is still a rotation of the series palette (given by the chart, not chosen by someone). */
export function isSeriesPalette(colors: readonly string[]): boolean {
  const n = TC_SERIES_COLORS.length;
  if (colors.length !== n) return false;
  const shift = TC_SERIES_COLORS.indexOf(colors[0]);
  return shift >= 0 && colors.every((c, i) => c === TC_SERIES_COLORS[(shift + i) % n]);
}

/** A copy of plot styles, each its own object. */
export function copyPlots(plots: Record<string, IndicatorPlotStyle>): Record<string, IndicatorPlotStyle> {
  return Object.fromEntries(Object.entries(plots).map(([key, plot]) => [key, { ...plot }]));
}

/** A copy of interval rules, each range its own. */
export function copyIntervals(intervals: IndicatorIntervals): IndicatorIntervals {
  return Object.fromEntries(Object.entries(intervals).map(([unit, rule]) => [unit, rule === false ? false : [rule[0], rule[1]]]));
}
