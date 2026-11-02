import type { AnchorPoint, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { priceToY, timestampToBarIndex } from '../viewport/ScaleMapping.js';

/** 'magnet' snaps an anchor to the nearest open, high, low or close within reach; 'strong' always does. */
export type MagnetMode = 'none' | 'magnet' | 'strong';

/** How near (px) the weak magnet has to be to a price to snap to it. */
const MAGNET_REACH_PX = 30;

/**
 * Snap a point to the closest open, high, low or close of the bar under it.
 * `time` is a timestamp when `viewport.data` is set, else a bar index; the
 * result uses the same. Past either end of the bars there is nothing to snap
 * to and the point stays where it was placed (a target in the empty future).
 * Out of the weak magnet's reach, only the time snaps to the bar.
 */
export function snapToBar(
  time: number,
  price: number,
  mode: MagnetMode,
  bars: readonly OHLCBar[],
  viewport?: ViewportState,
): AnchorPoint {
  return snapToValues(time, price, mode, bars, (i) => [bars[i].open, bars[i].high, bars[i].low, bars[i].close], viewport);
}

/**
 * Snap a point to the closest of `valuesAt(bar)` at the bar under it, as
 * `snapToBar` does with its prices: an indicator pane's lines, say. A bar
 * with no values snaps the time only.
 */
export function snapToValues(
  time: number,
  price: number,
  mode: MagnetMode,
  bars: readonly OHLCBar[],
  valuesAt: (barIndex: number) => readonly number[],
  viewport?: ViewportState,
): AnchorPoint {
  if (mode === 'none' || bars.length === 0) return { time, price };
  const useTimestamps = !!(viewport?.data && viewport.data.length > 0);
  const idx = Math.round(useTimestamps ? timestampToBarIndex(time, bars) : time);
  if (idx < 0 || idx > bars.length - 1) return { time, price };
  const snappedTime = useTimestamps ? bars[idx].time : idx;
  const candidates = valuesAt(idx).filter((v) => Number.isFinite(v));
  if (candidates.length === 0) return { time: snappedTime, price };

  let closest = candidates[0];
  for (const candidate of candidates) {
    if (Math.abs(price - candidate) < Math.abs(price - closest)) closest = candidate;
  }
  // Measured on screen, so it holds on a log scale too.
  if (mode === 'magnet' && viewport && Math.abs(priceToY(price, viewport) - priceToY(closest, viewport)) > MAGNET_REACH_PX) {
    return { time: snappedTime, price };
  }
  return { time: snappedTime, price: closest };
}
