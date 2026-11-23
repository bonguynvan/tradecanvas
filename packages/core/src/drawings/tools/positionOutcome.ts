import type { OHLCBar } from '@tradecanvas/commons';
import { timestampToBarIndex } from '../../viewport/ScaleMapping.js';
import type { PositionLevels } from './RiskReward.js';

/** A bar index this close to a whole one is that bar: times rounded in a saved layout land a hair off. */
const INDEX_EPSILON = 1e-6;

/** How a Long/Short Position's trade went over the bars in its span. */
export interface PositionOutcome {
  /**
   * `'target'` or `'stop'`: the price reached that level first. `'ended'`:
   * neither, by the last bar in the span. `'open'`: neither yet, and the span
   * reaches past the last bar.
   */
  kind: 'target' | 'stop' | 'ended' | 'open';
  /** The bar the trade was entered on: the first at or after the entry's time. */
  entryIndex: number;
  /** The bar it closed on, or the last one read. */
  exitIndex: number;
  /** The price it closed at: the level, a gap's open past it, or the last bar's close. */
  exitPrice: number;
  /** What it made or lost, in the account's money: the quantity times the move. */
  pnl: number;
}

/**
 * Plays a position's trade over the bars from its entry (`from`) to its right
 * edge (`to`): entered on the first bar at or after `from`, then each bar
 * after it is checked for the stop and the target. A bar that opens past a
 * level closes the trade at its open, as a stop order would; one that reaches
 * both within it is taken as the stop, since which came first is not in the
 * bar. `null` when no bar after the entry is in the span, and for a span that
 * ends before its entry: a trade does not run back in time.
 */
export function positionOutcome(levels: PositionLevels, bars: ReadonlyArray<OHLCBar>, from: number, to: number, multiplier = 1): PositionOutcome | null {
  const n = bars.length;
  if (n === 0) return null;
  if (!(to > from)) return null;
  const entryIndex = Math.max(0, Math.ceil(timestampToBarIndex(from, bars) - INDEX_EPSILON));
  const spanEnd = Math.floor(timestampToBarIndex(to, bars) + INDEX_EPSILON);
  const last = Math.min(spanEnd, n - 1);
  if (entryIndex >= last) return null;

  const long = levels.side === 'buy';
  const close = (kind: PositionOutcome['kind'], exitIndex: number, exitPrice: number): PositionOutcome => ({
    kind, entryIndex, exitIndex, exitPrice, pnl: (exitPrice - levels.entry) * levels.quantity * (long ? 1 : -1) * multiplier,
  });
  for (let i = entryIndex + 1; i <= last; i++) {
    const bar = bars[i];
    // The open comes first: a bar that gaps past a level closes the trade there, whatever it does after.
    if (long) {
      if (bar.open <= levels.stopLoss) return close('stop', i, bar.open);
      if (bar.open >= levels.takeProfit) return close('target', i, bar.open);
      if (bar.low <= levels.stopLoss) return close('stop', i, levels.stopLoss);
      if (bar.high >= levels.takeProfit) return close('target', i, levels.takeProfit);
    } else {
      if (bar.open >= levels.stopLoss) return close('stop', i, bar.open);
      if (bar.open <= levels.takeProfit) return close('target', i, bar.open);
      if (bar.high >= levels.stopLoss) return close('stop', i, levels.stopLoss);
      if (bar.low <= levels.takeProfit) return close('target', i, levels.takeProfit);
    }
  }
  return close(spanEnd > n - 1 ? 'open' : 'ended', last, bars[last].close);
}
