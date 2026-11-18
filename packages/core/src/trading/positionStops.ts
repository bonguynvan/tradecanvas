import type { TradingPosition } from '@tradecanvas/commons';

/** A new stop-loss's distance, as a share of the entry: a bracket's default risk. */
const RISK_FRACTION = 0.01;
/** A new take-profit's distance, in the stop's: a bracket's default reward:risk. */
const REWARD_RATIO = 2;

/** Which way from the entry a position's stop or target lies: up (1) for a long's target and a short's stop, down (-1) for the others. */
export function stopSide(pos: TradingPosition, which: 'stopLoss' | 'takeProfit'): 1 | -1 {
  return (pos.side === 'buy') === (which === 'takeProfit') ? 1 : -1;
}

/** Whether `price` is beyond both the entry and the price now, on `which`'s side: where it can be set without being hit at once. */
export function isBeyond(pos: TradingPosition, which: 'stopLoss' | 'takeProfit', price: number, currentPrice: number | null): boolean {
  const now = currentPrice !== null && Number.isFinite(currentPrice) ? currentPrice : pos.entryPrice;
  return stopSide(pos, which) > 0 ? price > Math.max(pos.entryPrice, now) : price < Math.min(pos.entryPrice, now);
}

/**
 * Where a stop-loss or a take-profit added to `pos` starts, before it is
 * dragged: as a bracket starts, a stop 1% of the entry away and a target 2R
 * away (twice the stop the position has, if it has one). Never on the wrong
 * side of the price now, so it is not hit the moment it is set: at least 1%
 * of the entry beyond the price.
 */
export function defaultStopPrice(pos: TradingPosition, which: 'stopLoss' | 'takeProfit', currentPrice: number | null): number {
  const entry = pos.entryPrice;
  const price = currentPrice !== null && Number.isFinite(currentPrice) ? currentPrice : entry;
  const step = Math.max(Math.abs(entry) * RISK_FRACTION, 1e-8);
  const up = stopSide(pos, which);
  const stop = pos.stopLoss;
  const risk = stop !== undefined && Number.isFinite(stop) && stop !== entry ? Math.abs(entry - stop) : step;
  const fromEntry = entry + up * (which === 'stopLoss' ? step : risk * REWARD_RATIO);
  const fromPrice = price + up * step;
  return up > 0 ? Math.max(fromEntry, fromPrice) : Math.min(fromEntry, fromPrice);
}
