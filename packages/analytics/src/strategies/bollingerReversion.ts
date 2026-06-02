import type { StrategyFn, StrategyContext } from '../types.js';

export interface BollingerReversionOptions {
  period?: number;
  /** Number of standard deviations for the bands. */
  stdDev?: number;
  size?: number;
  tag?: string;
}

/**
 * Bollinger Band mean-reversion. Goes long when price closes below the lower
 * band and re-enters; exits when price re-touches the middle band (SMA).
 * Long-only — relies on the backtester's `allowShort: false` semantics to
 * happily close longs without throwing.
 */
export function bollingerReversionStrategy(options: BollingerReversionOptions = {}): StrategyFn {
  const period = options.period ?? 20;
  const stdDev = options.stdDev ?? 2;
  const size = options.size ?? 1;
  const tag = options.tag ?? 'bollinger-reversion';

  return (ctx: StrategyContext) => {
    if (ctx.index < period) return;

    const { mid, lower } = bollinger(ctx.history, ctx.index, period, stdDev);
    const close = ctx.bar.close;

    if (!ctx.position && close <= lower) {
      ctx.placeOrder({ side: 'long', type: 'market', quantity: size, tag });
    } else if (ctx.position?.side === 'long' && close >= mid) {
      ctx.close(tag);
    }
  };
}

function bollinger(
  history: ReadonlyArray<{ close: number }>,
  endIdx: number,
  period: number,
  stdDev: number,
): { mid: number; upper: number; lower: number } {
  let sum = 0;
  for (let i = endIdx - period + 1; i <= endIdx; i++) sum += history[i].close;
  const mid = sum / period;

  let varSum = 0;
  for (let i = endIdx - period + 1; i <= endIdx; i++) {
    const diff = history[i].close - mid;
    varSum += diff * diff;
  }
  const sd = Math.sqrt(varSum / period);
  return { mid, upper: mid + stdDev * sd, lower: mid - stdDev * sd };
}
