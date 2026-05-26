import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Backtester } from '../Backtester.js';
import { FixedCommission } from '../commission.js';

function bars(closes: number[]): OHLCBar[] {
  return closes.map((c, i) => ({
    time: i * 60_000,
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: 100,
  }));
}

describe('Backtester', () => {
  it('throws when fewer than 2 bars provided', () => {
    const bt = new Backtester({ initialCash: 1000 });
    expect(() => bt.run([], () => {})).toThrow();
  });

  it('buy-and-hold tracks bar appreciation', () => {
    const bt = new Backtester({ initialCash: 10_000 });
    const data = bars([100, 110, 120, 130]);
    let placed = false;
    const result = bt.run(data, (ctx) => {
      if (!placed && !ctx.position) {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: 10 });
        placed = true;
      }
    });
    // Bought on bar 1 open (~110), final mark at bar 3 close (130).
    // Strategy doesn't run on the last bar, so the order from bar 2 fills on bar 3 open if we placed late;
    // here we place on bar 0 → fills bar 1 open. PnL = (130 - 110) * 10 = 200.
    expect(result.finalEquity).toBeCloseTo(10_000 + 200);
    expect(result.fills).toHaveLength(1);
  });

  it('round-trip realizes pnl and records a closed trade', () => {
    const bt = new Backtester({ initialCash: 10_000 });
    const data = bars([100, 110, 120, 130]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: 5 });
      } else if (ctx.index === 1 && ctx.position) {
        ctx.close();
      }
    });
    // Buy bar1 @ 110, sell bar2 @ 120 → pnl = 50
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].pnl).toBeCloseTo(50);
  });

  it('applies fixed commission per fill', () => {
    const bt = new Backtester({
      initialCash: 10_000,
      commission: new FixedCommission(5),
    });
    const data = bars([100, 110, 120]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: 1 });
      }
    });
    expect(result.fills[0].commission).toBe(5);
  });

  it('limit order does not fill if price not touched', () => {
    const bt = new Backtester({ initialCash: 10_000 });
    const data = bars([100, 110, 120]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        ctx.placeOrder({ side: 'long', type: 'limit', quantity: 1, price: 50 });
      }
    });
    expect(result.fills).toHaveLength(0);
  });

  it('limit order fills when price trades through', () => {
    const bt = new Backtester({ initialCash: 10_000 });
    const data = bars([100, 110, 95, 100]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        ctx.placeOrder({ side: 'long', type: 'limit', quantity: 1, price: 96 });
      }
    });
    expect(result.fills).toHaveLength(1);
    expect(result.fills[0].price).toBeLessThanOrEqual(96);
  });

  it('cancel removes a pending order', () => {
    const bt = new Backtester({ initialCash: 10_000 });
    const data = bars([100, 110, 120]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        const id = ctx.placeOrder({ side: 'long', type: 'limit', quantity: 1, price: 50 });
        ctx.cancel(id);
      }
    });
    expect(result.fills).toHaveLength(0);
  });

  it('respects allowShort=false', () => {
    const bt = new Backtester({ initialCash: 10_000, allowShort: false });
    const data = bars([100, 110, 120]);
    expect(() =>
      bt.run(data, (ctx) => {
        if (ctx.index === 0) {
          ctx.placeOrder({ side: 'short', type: 'market', quantity: 1 });
        }
      }),
    ).toThrow();
  });

  it('allows closing a long position when allowShort=false (close()/sell)', () => {
    const bt = new Backtester({ initialCash: 10_000, allowShort: false });
    const data = bars([100, 110, 120, 130]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: 5 });
      } else if (ctx.index === 1 && ctx.position) {
        ctx.close();
      }
    });
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].pnl).toBeCloseTo(50);
  });

  it('allows partial close of a long position when allowShort=false', () => {
    const bt = new Backtester({ initialCash: 10_000, allowShort: false });
    const data = bars([100, 110, 120, 130]);
    const result = bt.run(data, (ctx) => {
      if (ctx.index === 0) {
        ctx.placeOrder({ side: 'long', type: 'market', quantity: 10 });
      } else if (ctx.index === 1 && ctx.position) {
        ctx.placeOrder({ side: 'short', type: 'market', quantity: 4 });
      }
    });
    expect(result.fills).toHaveLength(2);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].quantity).toBe(4);
  });

  it('still blocks short orders that would exceed the existing long when allowShort=false', () => {
    const bt = new Backtester({ initialCash: 10_000, allowShort: false });
    const data = bars([100, 110, 120, 130]);
    expect(() =>
      bt.run(data, (ctx) => {
        if (ctx.index === 0) {
          ctx.placeOrder({ side: 'long', type: 'market', quantity: 5 });
        } else if (ctx.index === 1 && ctx.position) {
          // Trying to flip net short is still rejected
          ctx.placeOrder({ side: 'short', type: 'market', quantity: 10 });
        }
      }),
    ).toThrow();
  });
});
