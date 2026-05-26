import type { OHLCBar } from '@tradecanvas/commons';
import type { Side, SlippageModel } from './types.js';

export const NO_SLIPPAGE: SlippageModel = {
  apply: (price) => price,
};

export class PercentSlippage implements SlippageModel {
  /** rate = 0.0005 → 5bps adverse */
  constructor(private readonly rate: number) {}

  apply(intendedPrice: number, side: Side): number {
    const adverse = side === 'long' ? 1 + this.rate : 1 - this.rate;
    return intendedPrice * adverse;
  }
}

export class RangeBasedSlippage implements SlippageModel {
  /** factor = 0.1 → 10% of the bar's range pushes against the order */
  constructor(private readonly factor: number) {}

  apply(intendedPrice: number, side: Side, bar: OHLCBar): number {
    const range = bar.high - bar.low;
    const push = range * this.factor;
    return side === 'long' ? intendedPrice + push : intendedPrice - push;
  }
}
