/**
 * How strongly a volume profile's rows show. Faint enough that the candles
 * under them, and the legend drawn over the plot, still read; the chart's
 * profile and the Volume Profile indicator share it so the two look alike.
 * It lives here, not with either, so the indicators (and their worker) don't
 * import a chart renderer for one number.
 */
export const PROFILE_ROW_ALPHA = 0.32;

/**
 * The rows' alpha for an indicator style's `opacity`: the shared strength
 * scaled by it, an opacity past 1 counting as 1 and one below 0 as 0, as a
 * restored chart state takes it. An opacity that is no finite number (cleared
 * with `{ opacity: undefined }`, say) keeps the shared strength: the canvas
 * ignores a NaN alpha and would draw the rows solid.
 */
export function profileRowAlpha(opacity: number): number {
  if (!Number.isFinite(opacity)) return PROFILE_ROW_ALPHA;
  return PROFILE_ROW_ALPHA * Math.min(1, Math.max(0, opacity));
}
