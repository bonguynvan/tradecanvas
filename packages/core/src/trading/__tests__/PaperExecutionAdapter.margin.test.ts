import { describe, it, expect } from 'vitest';
import { PaperExecutionAdapter, type PaperExecutionOptions } from '../PaperExecutionAdapter.js';
import type { FillEvent, MarginCall, TradingPosition } from '@tradecanvas/commons';

/** An account of 1000 at ten times: a position's margin is a tenth of its value. */
function connect(options: PaperExecutionOptions = {}) {
  const adapter = new PaperExecutionAdapter({ markPrice: 100, balance: 1000, leverage: 10, ...options });
  const fills: FillEvent[] = [];
  const calls: MarginCall[] = [];
  const told: string[] = [];
  let positions: TradingPosition[] = [];
  adapter.on<FillEvent>('fill', (e) => {
    fills.push(e.data);
    told.push(`fill:${e.data.reason}`);
  });
  adapter.on<MarginCall>('marginCall', (e) => {
    calls.push(e.data);
    told.push('marginCall');
  });
  adapter.on<TradingPosition[]>('positions', (e) => (positions = e.data));
  adapter.connect({});
  const market = (side: 'buy' | 'sell', quantity: number) => adapter.placeOrder({ side, type: 'market', price: 100, quantity });
  return { adapter, fills, calls, told, market, positions: () => positions };
}

describe('PaperExecutionAdapter: how the equity stands to the margin held', () => {
  it('is in the account while a position holds margin, and not without one', async () => {
    const { adapter, market } = connect();
    expect(adapter.getAccount()).not.toHaveProperty('marginLevel');
    // Fifty at 100 is 5000: a margin of 500, which the equity of 1000 is twice.
    await market('buy', 50);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ equity: 1000, marginUsed: 500, marginLevel: 2 }));
    adapter.setMarkPrice(95);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ equity: 750, marginLevel: 1.5 }));
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getAccount()).not.toHaveProperty('marginLevel');
  });
});

describe('PaperExecutionAdapter: a margin call', () => {
  it('is said once when the equity falls under the level, and again only after it has been back over it', async () => {
    const { adapter, calls, market } = connect({ marginCallLevel: 1 });
    await market('buy', 50);
    // At the level is not under it.
    adapter.setMarkPrice(90);
    expect(calls).toEqual([]);
    adapter.setMarkPrice(89);
    expect(calls).toEqual([{ marginLevel: 0.9, level: 1, equity: 450, marginUsed: 500 }]);
    adapter.setMarkPrice(88);
    adapter.setMarkPrice(89.5);
    expect(calls).toHaveLength(1);
    // Back over it, then under again.
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(89);
    expect(calls).toHaveLength(2);
  });

  it('closes nothing: a warning is all it is', async () => {
    const { adapter, fills, market } = connect({ marginCallLevel: 1 });
    await market('buy', 50);
    adapter.setMarkPrice(70);
    expect(adapter.getPositions()).toHaveLength(1);
    expect(fills.filter((fill) => fill.reason === 'liquidation')).toEqual([]);
  });

  it('is said again for the next position, when the one it was said for is gone', async () => {
    const { adapter, calls, market } = connect({ marginCallLevel: 1 });
    await market('buy', 50);
    adapter.setMarkPrice(89);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    // 450 left; forty at 89 holds 356, and a fall to 86 leaves 330 of equity under it.
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 89, quantity: 40 });
    adapter.setMarkPrice(86);
    expect(calls).toHaveLength(2);
  });
});

describe('PaperExecutionAdapter: a stop-out', () => {
  it('closes the position at the price when the equity falls under the level, after the warning', async () => {
    const { adapter, fills, told, market, positions } = connect({ marginCallLevel: 1, stopOutLevel: 0.5 });
    await market('buy', 50);
    told.length = 0;
    // At 84 the fifty have lost 800: 200 of equity to 500 of margin.
    adapter.setMarkPrice(84);
    expect(told).toEqual(['marginCall', 'fill:liquidation']);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'liquidation', side: 'sell', price: 84, quantity: 50, pnl: -800 }));
    expect(adapter.getPositions()).toEqual([]);
    expect(positions()).toEqual([]);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 200, equity: 200, marginUsed: 0 }));
  });

  it('closes the one that loses most first, and no more than brings the account back over the level', async () => {
    const { adapter, fills, market } = connect({ stopOutLevel: 0.5 });
    await market('buy', 40);
    adapter.setMarkPrice(110);
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 110, quantity: 40 });
    const [first, second] = adapter.getPositions();
    // At 96.25 the first has lost 150 and the second 550: 300 of equity to 840 of margin.
    adapter.setMarkPrice(96.25);
    const closed = fills.filter((fill) => fill.reason === 'liquidation');
    expect(closed).toEqual([expect.objectContaining({ positionId: second.id, price: 96.25, quantity: 40, pnl: -550 })]);
    // The first is left: 300 of equity to its 400 of margin is over the level.
    expect(adapter.getPositions().map((p) => p.id)).toEqual([first.id]);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 450, equity: 300, marginUsed: 400, marginLevel: 0.75 }));
  });

  it('closes them all when nothing less will do', async () => {
    const { adapter, fills, market } = connect({ stopOutLevel: 0.5 });
    await market('buy', 40);
    adapter.setMarkPrice(110);
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 110, quantity: 40 });
    adapter.setMarkPrice(90);
    expect(fills.filter((fill) => fill.reason === 'liquidation')).toHaveLength(2);
    expect(adapter.getPositions()).toEqual([]);
  });

  it('closes a short as a long: by buying it back', async () => {
    const { adapter, fills, market } = connect({ stopOutLevel: 0.5 });
    await market('sell', 50);
    adapter.setMarkPrice(116);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'liquidation', side: 'buy', price: 116, quantity: 50, pnl: -800 }));
  });

  it('closes the one position of a net account', async () => {
    const { adapter, fills, market } = connect({ stopOutLevel: 0.5, positions: 'net' });
    await market('buy', 30);
    await market('buy', 20);
    adapter.setMarkPrice(84);
    expect(fills.filter((fill) => fill.reason === 'liquidation')).toEqual([expect.objectContaining({ quantity: 50, pnl: -800 })]);
    expect(adapter.getPositions()).toEqual([]);
  });

  it('charges the close as any other', async () => {
    const { adapter, fills, market } = connect({ stopOutLevel: 0.5, commission: { perUnit: 0.1 } });
    await market('buy', 50);
    adapter.setMarkPrice(84);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'liquidation', commission: 5 }));
  });

  it('lets a stop-loss the price reached close its position first, at the stop', async () => {
    const { adapter, fills } = connect({ stopOutLevel: 0.5 });
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 50, stopLoss: 90 });
    adapter.setMarkPrice(84);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'stopLoss', price: 90 }));
    expect(fills.some((fill) => fill.reason === 'liquidation')).toBe(false);
  });
});

describe('PaperExecutionAdapter: an account with no levels, or no money', () => {
  it('is warned of nothing and closed out of nothing unless it is given the levels', async () => {
    const { adapter, fills, calls, market } = connect();
    await market('buy', 50);
    adapter.setMarkPrice(50);
    expect(calls).toEqual([]);
    expect(fills).toHaveLength(1);
    expect(adapter.getPositions()).toHaveLength(1);
    expect(adapter.getAccount()!.equity).toBe(-1500);
  });

  it('has no margin to call when it keeps no money', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100, marginCallLevel: 1, stopOutLevel: 0.5 });
    const calls: MarginCall[] = [];
    adapter.on<MarginCall>('marginCall', (e) => calls.push(e.data));
    adapter.connect({});
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 50 });
    adapter.setMarkPrice(1);
    expect(calls).toEqual([]);
    expect(adapter.getPositions()).toHaveLength(1);
  });

  it('takes no level that is no number above zero', async () => {
    const { adapter, calls, market } = connect({ marginCallLevel: Number.NaN, stopOutLevel: -1 });
    await market('buy', 50);
    adapter.setMarkPrice(50);
    expect(calls).toEqual([]);
    expect(adapter.getPositions()).toHaveLength(1);
  });
});

describe('PaperExecutionAdapter: the margin, as it is counted', () => {
  it('counts a contract’s multiplier in the margin and in the equity alike', async () => {
    const { adapter, market } = connect({ multiplier: 10 });
    // Five at 100, ten a point: 5000 of value, 500 of margin.
    await market('buy', 5);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ marginUsed: 500, marginLevel: 2 }));
    adapter.setMarkPrice(95);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ equity: 750, marginLevel: 1.5 }));
  });

  it('holds the margin at the entry’s price: a price that moves changes the equity, not the margin', async () => {
    const { adapter, market } = connect();
    await market('buy', 50);
    adapter.setMarkPrice(120);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ marginUsed: 500, equity: 2000, marginLevel: 4 }));
  });

  it('warns at the next price of a level a fill brought under, not at the fill', async () => {
    const { adapter, calls, market } = connect({ marginCallLevel: 1.2 });
    // Ninety at 100 hold 900: the equity of 1000 is under 1.2 of it from the start.
    await market('buy', 90);
    expect(calls).toEqual([]);
    adapter.setMarkPrice(100);
    expect(calls).toEqual([expect.objectContaining({ level: 1.2, equity: 1000, marginUsed: 900 })]);
  });

  it('warns once though what hears it closes the position there and then', async () => {
    const { adapter, calls, told, market } = connect({ marginCallLevel: 1, stopOutLevel: 0.5 });
    await market('buy', 50);
    told.length = 0;
    adapter.on('marginCall', () => void adapter.closePosition({ positionId: adapter.getPositions()[0].id }));
    adapter.setMarkPrice(89);
    expect(told).toEqual(['marginCall', 'fill:close']);
    expect(calls).toHaveLength(1);
    expect(adapter.getPositions()).toEqual([]);
  });

  it('leaves the orders that wait working after a stop-out, and takes none the money left cannot carry', async () => {
    const { adapter, market } = connect({ stopOutLevel: 0.5 });
    const errors: { message: string }[] = [];
    adapter.on<{ message: string }>('error', (e) => errors.push(e.data));
    await market('buy', 50);
    // Forty at 80 would hold 320: the account can carry it now.
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 80, quantity: 40 });
    adapter.setMarkPrice(84);
    expect(adapter.getPositions()).toEqual([]);
    expect(adapter.getOrders()).toHaveLength(1);
    // 200 is left: when its price comes the order is cancelled, and says why.
    adapter.setMarkPrice(80);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([]);
    expect(errors).toEqual([expect.objectContaining({ message: expect.stringContaining('Not enough free margin') })]);
  });

  it('is neither warned nor stopped out by a price that is none', async () => {
    const { adapter, calls, market } = connect({ marginCallLevel: 1, stopOutLevel: 0.5 });
    await market('buy', 50);
    adapter.setMarkPrice(Number.NaN);
    adapter.setMarkPrice(0);
    expect(calls).toEqual([]);
    expect(adapter.getPositions()).toHaveLength(1);
  });
});
