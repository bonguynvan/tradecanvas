import type { ChartTypeOptions } from '../types/chart.js';

const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const wholeIn = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The chart type settings in `raw` the chart can use: boxes, ranges and
 * reversals above 0, whole line and box counts in range. A type given at
 * all is in the result (empty when none of its settings were usable), so
 * a type's settings can be put back to their defaults.
 */
export function readChartTypeOptions(raw: unknown): ChartTypeOptions {
  if (!isObject(raw)) return {};
  const out: ChartTypeOptions = {};
  if (isObject(raw.renko)) {
    const { boxSize, atrPeriod } = raw.renko;
    out.renko = {
      ...(positive(boxSize) || boxSize === 'atr' ? { boxSize } : {}),
      ...(wholeIn(atrPeriod, 1, 500) ? { atrPeriod } : {}),
    };
  }
  if (isObject(raw.lineBreak)) {
    const { lines } = raw.lineBreak;
    out.lineBreak = wholeIn(lines, 1, 10) ? { lines } : {};
  }
  if (isObject(raw.kagi)) {
    const { reversal, reversalType } = raw.kagi;
    out.kagi = {
      ...(positive(reversal) ? { reversal } : {}),
      ...(reversalType === 'percent' || reversalType === 'price' ? { reversalType } : {}),
    };
  }
  if (isObject(raw.pointAndFigure)) {
    const { boxSize, reversal } = raw.pointAndFigure;
    out.pointAndFigure = {
      ...(positive(boxSize) || boxSize === 'auto' ? { boxSize } : {}),
      ...(wholeIn(reversal, 1, 10) ? { reversal } : {}),
    };
  }
  if (isObject(raw.rangeBars)) {
    const { range } = raw.rangeBars;
    out.rangeBars = positive(range) || range === 'auto' ? { range } : {};
  }
  return out;
}
