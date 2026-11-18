import { describe, it, expect } from 'vitest';
import type { TradingPosition } from '@tradecanvas/commons';
import { defaultStopPrice } from '../positionStops.js';

const long: TradingPosition = { id: 'p1', side: 'buy', entryPrice: 100, quantity: 1 };
const short: TradingPosition = { id: 'p2', side: 'sell', entryPrice: 100, quantity: 1 };

describe('defaultStopPrice: where a new stop-loss or take-profit starts', () => {
  it('puts a stop 1% of the entry below a long and a target 2R over it, as a bracket does', () => {
    expect(defaultStopPrice(long, 'stopLoss', 100)).toBeCloseTo(99);
    expect(defaultStopPrice(long, 'takeProfit', 100)).toBeCloseTo(102);
  });

  it('mirrors them for a short', () => {
    expect(defaultStopPrice(short, 'stopLoss', 100)).toBeCloseTo(101);
    expect(defaultStopPrice(short, 'takeProfit', 100)).toBeCloseTo(98);
  });

  it('puts the target at twice the risk of the stop the position has', () => {
    expect(defaultStopPrice({ ...long, stopLoss: 95 }, 'takeProfit', 100)).toBeCloseTo(110);
    expect(defaultStopPrice({ ...short, stopLoss: 104 }, 'takeProfit', 100)).toBeCloseTo(92);
  });

  it('starts beyond the price now, so neither is hit the moment it is set', () => {
    // A long in a loss: the stop goes below the price, not below the entry over it.
    expect(defaultStopPrice(long, 'stopLoss', 97)).toBeCloseTo(96);
    // A long in a profit past its 2R: the target goes over the price.
    expect(defaultStopPrice(long, 'takeProfit', 105)).toBeCloseTo(106);
    expect(defaultStopPrice(short, 'stopLoss', 103)).toBeCloseTo(104);
    expect(defaultStopPrice(short, 'takeProfit', 95)).toBeCloseTo(94);
  });

  it('reads from the entry when there is no price yet', () => {
    expect(defaultStopPrice(long, 'stopLoss', null)).toBeCloseTo(99);
  });
});
