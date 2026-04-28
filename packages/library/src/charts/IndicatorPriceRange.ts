import type { IndicatorOutput } from '@tradecanvas/commons';

export interface PriceRange {
  min: number;
  max: number;
}

const DEFAULT_RANGE: PriceRange = { min: 0, max: 100 };
const PADDING = 0.1;

/**
 * Compute a padded {min, max} price range for an indicator panel from the
 * visible slice of its output. Returns a sensible default range when the
 * output is empty or has no values inside [from, to].
 *
 * Pure — no canvas, no viewport object, just the values map and bar bounds.
 * Iterates the output's `values` map in insertion order; we treat its index
 * (0…N-1) as the bar index, matching how the engine inserts values.
 */
export function computeIndicatorPriceRange(
  output: IndicatorOutput | null,
  from: number,
  to: number,
): PriceRange {
  if (!output) return { ...DEFAULT_RANGE };

  let vMin = Infinity;
  let vMax = -Infinity;
  let idx = 0;
  for (const [, val] of output.values) {
    if (idx >= from && idx <= to) {
      for (const key in val) {
        const v = val[key];
        if (v !== undefined && Number.isFinite(v)) {
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
      }
    }
    idx++;
  }

  if (vMin === Infinity) return { ...DEFAULT_RANGE };

  const range = vMax - vMin || 1;
  return {
    min: vMin - range * PADDING,
    max: vMax + range * PADDING,
  };
}
