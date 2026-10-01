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
 * Pure — no canvas, no viewport object, just the output and bar bounds.
 * This runs on every autoScale render frame (pan/zoom), once per visible
 * panel indicator, so the hot path must stay O(visible range): it walks
 * `output.series` (array, indexed by bar position) directly over
 * `[from, to]`. Falls back to scanning the `values` Map in insertion order
 * (O(dataset length), treating index 0…N-1 as the bar index) only when a
 * plugin hasn't published `series` — real built-in indicators always do.
 */
export function computeIndicatorPriceRange(
  output: IndicatorOutput | null,
  from: number,
  to: number,
): PriceRange {
  if (!output) return { ...DEFAULT_RANGE };

  let vMin = Infinity;
  let vMax = -Infinity;

  if (output.series) {
    const end = Math.min(to, output.series.length - 1);
    for (let idx = Math.max(0, from); idx <= end; idx++) {
      const val = output.series[idx];
      if (!val) continue;
      for (const key in val) {
        const v = val[key];
        if (v !== undefined && Number.isFinite(v)) {
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
      }
    }
  } else {
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
  }

  if (vMin === Infinity) return { ...DEFAULT_RANGE };

  const range = vMax - vMin || 1;
  return {
    min: vMin - range * PADDING,
    max: vMax + range * PADDING,
  };
}
