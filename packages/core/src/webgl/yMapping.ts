import type { ViewportState } from '@tradecanvas/commons';

/**
 * Price-to-pixel uniforms for a frame, as `priceToYMapper` maps (linear or
 * log, upright or inverted). Prices reach the GPU relative to a base price.
 */
export interface YMapping {
  log: number;
  invert: number;
  /** Linear: y = yA + rel * yB. */
  yA: number;
  yB: number;
  /** Log: the base price less the lowest price, and the lowest price. */
  logOffset: number;
  min: number;
  /** Log: the smallest price ratio to the lowest price taken, as `priceToYMapper` floors prices at `Number.EPSILON`. */
  logFloor: number;
  logK: number;
  top: number;
  bottom: number;
}

export function yMapping(viewport: ViewportState, base: number): YMapping {
  const { min, max } = viewport.priceRange;
  const { y: top, height } = viewport.chartRect;
  const invert = viewport.invertScale === true ? 1 : 0;
  const flat: YMapping = { log: 0, invert, yA: top + height / 2, yB: 0, logOffset: 0, min: 1, logFloor: 0, logK: 0, top, bottom: top + height };
  if (viewport.logScale && min > 0 && max > 0) {
    const logRange = Math.log(max) - Math.log(min);
    if (logRange === 0) return flat;
    return { ...flat, log: 1, logOffset: base - min, min, logFloor: Number.EPSILON / min, logK: height / logRange };
  }
  const range = max - min;
  if (range === 0) return flat;
  const k = height / range;
  return invert
    ? { ...flat, yA: top + (base - min) * k, yB: k }
    : { ...flat, yA: top + (max - base) * k, yB: -k };
}

/**
 * The CSS-pixel y the shaders compute for a price `rel` above the base
 * (`cssY` in shaders.ts), step by step; `f` rounds each step, as float32
 * does on the GPU (identity for double precision).
 *
 * Log scale goes through log(1 + (price − min) / min) rather than
 * log(price) − log(min): float32 keeps the small difference exactly where
 * the two large logarithms would lose it.
 */
export function mappedY(m: YMapping, rel: number, f: (x: number) => number = (x) => x): number {
  if (m.log === 1) {
    const ratio = f(1 + f(f(rel + m.logOffset) / m.min));
    const v = f(f(Math.log(Math.max(ratio, m.logFloor))) * m.logK);
    return m.invert === 1 ? f(m.top + v) : f(m.bottom - v);
  }
  return f(m.yA + f(rel * m.yB));
}
