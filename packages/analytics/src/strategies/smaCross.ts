import type { StrategyFn, StrategyContext } from '../types.js';

export interface SmaCrossOptions {
  fastPeriod?: number;
  slowPeriod?: number;
  /** Position size (units, not cash). */
  size?: number;
  /** Tag attached to placed orders for reporting. */
  tag?: string;
}

/**
 * Classic SMA cross strategy.
 *
 * Goes long on the bar after the fast SMA crosses above the slow SMA, closes
 * (or reverses, depending on `allowShort`) on the opposite cross. The cross
 * is detected on `ctx.history.length - 1` (i.e. the closing bar that the
 * strategy is reacting to), so the fill happens on the next bar's open —
 * matching the backtester's no-look-ahead semantics.
 */
export function smaCrossStrategy(options: SmaCrossOptions = {}): StrategyFn {
  const fastPeriod = options.fastPeriod ?? 10;
  const slowPeriod = options.slowPeriod ?? 30;
  const size = options.size ?? 1;
  const tag = options.tag ?? 'sma-cross';

  if (fastPeriod >= slowPeriod) {
    throw new Error('smaCrossStrategy: fastPeriod must be less than slowPeriod');
  }

  return (ctx: StrategyContext) => {
    // Need slowPeriod + 1 closes to detect a cross (yesterday vs today SMAs).
    if (ctx.index < slowPeriod) return;

    const closes = ctx.history;
    const fastNow = sma(closes, ctx.index, fastPeriod);
    const slowNow = sma(closes, ctx.index, slowPeriod);
    const fastPrev = sma(closes, ctx.index - 1, fastPeriod);
    const slowPrev = sma(closes, ctx.index - 1, slowPeriod);

    const crossedUp = fastPrev <= slowPrev && fastNow > slowNow;
    const crossedDown = fastPrev >= slowPrev && fastNow < slowNow;

    if (crossedUp) {
      if (ctx.position?.side === 'short') ctx.close(tag);
      if (!ctx.position || ctx.position.side === 'short') {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: size, tag });
      }
    } else if (crossedDown) {
      if (ctx.position?.side === 'long') ctx.close(tag);
    }
  };
}

function sma(history: ReadonlyArray<{ close: number }>, endIdx: number, period: number): number {
  let sum = 0;
  for (let i = endIdx - period + 1; i <= endIdx; i++) {
    sum += history[i].close;
  }
  return sum / period;
}
