import type { StrategyFn, StrategyContext } from '../types.js';

export interface RsiReversionOptions {
  period?: number;
  oversold?: number;
  overbought?: number;
  size?: number;
  tag?: string;
}

/**
 * RSI(14) mean-reversion. Goes long when RSI crosses up through `oversold`
 * (default 30); exits when RSI crosses up through `overbought` (default 70).
 * No shorts — pure mean-reversion long-only by default.
 */
export function rsiReversionStrategy(options: RsiReversionOptions = {}): StrategyFn {
  const period = options.period ?? 14;
  const oversold = options.oversold ?? 30;
  const overbought = options.overbought ?? 70;
  const size = options.size ?? 1;
  const tag = options.tag ?? 'rsi-reversion';

  return (ctx: StrategyContext) => {
    if (ctx.index < period + 1) return;
    const rsiNow = rsi(ctx.history, ctx.index, period);
    const rsiPrev = rsi(ctx.history, ctx.index - 1, period);

    const enteringFromOversold = rsiPrev < oversold && rsiNow >= oversold;
    const enteringFromOverbought = rsiPrev < overbought && rsiNow >= overbought;

    if (enteringFromOversold && !ctx.position) {
      ctx.placeOrder({ side: 'long', type: 'market', quantity: size, tag });
    } else if (enteringFromOverbought && ctx.position?.side === 'long') {
      ctx.close(tag);
    }
  };
}

function rsi(history: ReadonlyArray<{ close: number }>, endIdx: number, period: number): number {
  let gains = 0;
  let losses = 0;
  for (let i = endIdx - period + 1; i <= endIdx; i++) {
    const change = history[i].close - history[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}
