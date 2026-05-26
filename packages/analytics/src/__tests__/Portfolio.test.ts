import { describe, it, expect } from 'vitest';
import { Portfolio } from '../Portfolio.js';
import type { Fill } from '../types.js';

function fill(side: 'long' | 'short', qty: number, price: number, time = 0, commission = 0): Fill {
  return { orderId: `o${time}`, side, quantity: qty, price, time, commission, slippage: 0 };
}

describe('Portfolio', () => {
  it('opens a long position and reports cash/equity correctly', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('long', 10, 100, 0));
    expect(p.getCash()).toBe(9_000);
    expect(p.getPosition()?.quantity).toBe(10);
    expect(p.equity(100)).toBe(10_000);
    expect(p.equity(110)).toBe(10_100);
  });

  it('realizes pnl on a round-trip long trade', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('long', 10, 100, 0));
    p.applyFill(fill('short', 10, 110, 1));
    expect(p.getPosition()).toBeNull();
    expect(p.getCash()).toBe(10_100);
    expect(p.getRealizedPnl()).toBe(100);
    expect(p.getTrades()).toHaveLength(1);
    expect(p.getTrades()[0].pnl).toBe(100);
  });

  it('realizes pnl on a short trade where price falls', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('short', 5, 100, 0));
    p.applyFill(fill('long', 5, 90, 1));
    expect(p.getRealizedPnl()).toBe(50);
    expect(p.getTrades()[0].side).toBe('short');
  });

  it('partial close leaves remaining position and records one trade', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('long', 10, 100, 0));
    p.applyFill(fill('short', 4, 110, 1));
    expect(p.getPosition()?.quantity).toBe(6);
    expect(p.getTrades()).toHaveLength(1);
    expect(p.getTrades()[0].quantity).toBe(4);
    expect(p.getTrades()[0].pnl).toBe(40);
  });

  it('flip from long to short closes original and opens new', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('long', 5, 100, 0));
    p.applyFill(fill('short', 8, 110, 1));
    expect(p.getPosition()?.side).toBe('short');
    expect(p.getPosition()?.quantity).toBe(3);
    expect(p.getTrades()).toHaveLength(1);
    expect(p.getTrades()[0].pnl).toBe(50);
  });

  it('averages price when adding to position', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('long', 10, 100, 0));
    p.applyFill(fill('long', 10, 120, 1));
    expect(p.getPosition()?.averagePrice).toBe(110);
    expect(p.getPosition()?.quantity).toBe(20);
  });

  it('mark records equity curve points', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.mark(0, 100);
    p.applyFill(fill('long', 10, 100, 1));
    p.mark(1, 105);
    expect(p.getEquityCurve()).toHaveLength(2);
    expect(p.getEquityCurve()[1].equity).toBe(10_050);
    expect(p.getEquityCurve()[1].unrealizedPnl).toBe(50);
  });

  it('commission reduces cash on open', () => {
    const p = new Portfolio({ initialCash: 10_000 });
    p.applyFill(fill('long', 10, 100, 0, 5));
    expect(p.getCash()).toBe(8_995);
  });
});
