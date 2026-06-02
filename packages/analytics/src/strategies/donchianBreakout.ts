import type { StrategyFn, StrategyContext } from '../types.js';

export interface DonchianBreakoutOptions {
  /** Lookback for the entry channel high/low. */
  entryPeriod?: number;
  /** Lookback for the exit channel — usually shorter than entry. */
  exitPeriod?: number;
  size?: number;
  tag?: string;
}

/**
 * Donchian channel breakout — classic Turtle-style trend follower.
 *
 * Long entry: close > highest high of last `entryPeriod` bars (excluding current).
 * Long exit:  close < lowest low of last `exitPeriod` bars (excluding current).
 * Mirror on the short side when `allowShort` is enabled by the backtester.
 */
export function donchianBreakoutStrategy(options: DonchianBreakoutOptions = {}): StrategyFn {
  const entryPeriod = options.entryPeriod ?? 20;
  const exitPeriod = options.exitPeriod ?? 10;
  const size = options.size ?? 1;
  const tag = options.tag ?? 'donchian-breakout';

  return (ctx: StrategyContext) => {
    if (ctx.index < entryPeriod) return;

    const close = ctx.bar.close;
    const entryHigh = highestHigh(ctx.history, ctx.index - entryPeriod, ctx.index - 1);
    const entryLow = lowestLow(ctx.history, ctx.index - entryPeriod, ctx.index - 1);
    const exitHigh = highestHigh(ctx.history, ctx.index - exitPeriod, ctx.index - 1);
    const exitLow = lowestLow(ctx.history, ctx.index - exitPeriod, ctx.index - 1);

    if (!ctx.position) {
      if (close > entryHigh) {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: size, tag });
      } else if (close < entryLow) {
        ctx.placeOrder({ side: 'short', type: 'market', quantity: size, tag });
      }
    } else if (ctx.position.side === 'long' && close < exitLow) {
      ctx.close(tag);
    } else if (ctx.position.side === 'short' && close > exitHigh) {
      ctx.close(tag);
    }
  };
}

function highestHigh(history: ReadonlyArray<{ high: number }>, from: number, to: number): number {
  let h = -Infinity;
  for (let i = Math.max(0, from); i <= to; i++) {
    if (history[i].high > h) h = history[i].high;
  }
  return h;
}

function lowestLow(history: ReadonlyArray<{ low: number }>, from: number, to: number): number {
  let l = Infinity;
  for (let i = Math.max(0, from); i <= to; i++) {
    if (history[i].low < l) l = history[i].low;
  }
  return l;
}
