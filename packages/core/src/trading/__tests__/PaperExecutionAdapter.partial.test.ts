import { describe, it, expect } from 'vitest';
import { PaperExecutionAdapter, type PaperExecutionOptions } from '../PaperExecutionAdapter.js';
import type { ExecutionError, FillEvent, TradingOrder } from '@tradecanvas/commons';

/** A paper market that fills two of a limit order at each price that reaches it. */
function connect(options: PaperExecutionOptions = {}) {
  const adapter = new PaperExecutionAdapter({ markPrice: 100, fillSize: 2, ...options });
  const fills: FillEvent[] = [];
  const errors: ExecutionError[] = [];
  let orders: TradingOrder[] = [];
  let told = 0;
  adapter.on<FillEvent>('fill', (e) => fills.push(e.data));
  adapter.on<ExecutionError>('error', (e) => errors.push(e.data));
  adapter.on<TradingOrder[]>('orders', (e) => {
    orders = e.data;
    told++;
  });
  adapter.connect({});
  const limit = (side: 'buy' | 'sell', price: number, quantity: number, extra: object = {}) => adapter.placeOrder({ side, type: 'limit', price, quantity, ...extra });
  return { adapter, fills, errors, limit, orders: () => orders, told: () => told };
}

/** Each fill's part and what it left working, as `part` or `part+left`. */
const parts = (fills: FillEvent[]) => fills.map((fill) => (fill.remaining === undefined ? `${fill.quantity}` : `${fill.quantity}+${fill.remaining}`));

describe('PaperExecutionAdapter: a limit order larger than the market fills at one price', () => {
  it('fills a part at each price that reaches it, and works on for the rest', async () => {
    const { adapter, fills, limit, orders } = connect();
    const order = await limit('buy', 95, 5);
    adapter.setMarkPrice(95);
    expect(parts(fills)).toEqual(['2+3']);
    expect(fills[0]).toEqual(expect.objectContaining({ orderId: order.id, side: 'buy', price: 95, reason: 'order' }));
    expect(adapter.getOrders()).toEqual([expect.objectContaining({ id: order.id, quantity: 5, filledQuantity: 2 })]);
    expect(orders()).toEqual(adapter.getOrders());
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'buy', quantity: 2, entryPrice: 95 })]);

    // Through its limit: another part, at the limit.
    adapter.setMarkPrice(94);
    expect(parts(fills)).toEqual(['2+3', '2+1']);
    expect(fills[1].price).toBe(95);
    expect(adapter.getOrders()[0].filledQuantity).toBe(4);

    // Away from it: the rest waits.
    adapter.setMarkPrice(96);
    expect(fills).toHaveLength(2);

    // Back: the last of it, and the order is off the book.
    adapter.setMarkPrice(95);
    expect(parts(fills)).toEqual(['2+3', '2+1', '1']);
    expect(adapter.getOrders()).toEqual([]);
    expect(orders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 5, entryPrice: 95 })]);
  });

  it('builds one position of an order’s parts, at the average of their prices', async () => {
    const { adapter, fills } = connect();
    // A stop-limit that begins working at 101 fills its first part there, within its limit; what waits fills at the limit.
    await adapter.placeOrder({ side: 'buy', type: 'stopLimit', stopPrice: 100.5, price: 102, quantity: 4 });
    adapter.setMarkPrice(101);
    adapter.setMarkPrice(101.5);
    expect(fills.map((fill) => fill.price)).toEqual([101, 102]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 4, entryPrice: 101.5 })]);
    expect(fills.map((fill) => fill.positionId)).toEqual([adapter.getPositions()[0].id, adapter.getPositions()[0].id]);
  });

  it('keeps each order’s parts in a position of its own, as a filled order has one', async () => {
    const { adapter, limit } = connect();
    await limit('buy', 95, 3);
    await limit('buy', 94, 3);
    adapter.setMarkPrice(94);
    adapter.setMarkPrice(94);
    expect(adapter.getPositions().map((p) => [p.quantity, p.entryPrice])).toEqual([[3, 95], [3, 94]]);
    expect(adapter.getOrders()).toEqual([]);
  });

  it('opens another position for a part that fills after the one it was building was closed', async () => {
    const { adapter, limit } = connect();
    await limit('buy', 95, 4);
    adapter.setMarkPrice(95);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    adapter.setMarkPrice(95);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 2, entryPrice: 95 })]);
    expect(adapter.getOrders()).toEqual([]);
  });

  it('adds each part to the one position of a net account, and takes a part off one the other way', async () => {
    const { adapter, limit, fills } = connect({ positions: 'net' });
    await limit('buy', 95, 3);
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(95);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'buy', quantity: 3 })]);
    // Sold in parts: each takes its part off and realises it.
    await limit('sell', 105, 3);
    adapter.setMarkPrice(105);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'buy', quantity: 1 })]);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ quantity: 2, remaining: 1, pnl: 20 }));
    adapter.setMarkPrice(105);
    expect(adapter.getPositions()).toEqual([]);
  });

  it('gives the position the order’s stops and levels from its first part', async () => {
    const { adapter, limit } = connect();
    await limit('buy', 95, 4, { stopLoss: 90, takeProfit: 110, takeProfits: [{ price: 100, quantity: 1 }, { price: 105, quantity: 1 }] });
    adapter.setMarkPrice(95);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 2, stopLoss: 90, takeProfit: 110, takeProfits: [{ price: 100, quantity: 1 }, { price: 105, quantity: 1 }] })]);
    adapter.setMarkPrice(95);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 4, stopLoss: 90, takeProfit: 110 })]);
  });

  it('tells the orders each time a part fills', async () => {
    const { adapter, limit, told } = connect();
    await limit('buy', 95, 3);
    const before = told();
    adapter.setMarkPrice(95);
    expect(told()).toBe(before + 1);
    adapter.setMarkPrice(95);
    expect(told()).toBe(before + 2);
  });
});

describe('PaperExecutionAdapter: what a part-filled order may still do', () => {
  it('is moved with what has filled of it kept', async () => {
    const { adapter, limit } = connect();
    const order = await limit('buy', 95, 5);
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(97);
    await adapter.modifyOrder({ orderId: order.id, newPrice: 96 });
    expect(adapter.getOrders()).toEqual([expect.objectContaining({ price: 96, quantity: 5, filledQuantity: 2 })]);
    adapter.setMarkPrice(96);
    expect(adapter.getOrders()[0].filledQuantity).toBe(4);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 4, entryPrice: 95.5 })]);
  });

  it('is cancelled for the rest: what filled stays a position', async () => {
    const { adapter, limit, fills } = connect();
    const order = await limit('buy', 95, 5);
    adapter.setMarkPrice(95);
    await adapter.cancelOrder({ orderId: order.id });
    adapter.setMarkPrice(95);
    expect(fills).toHaveLength(1);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 2 })]);
  });

  it('ends at its date for the rest', async () => {
    const { adapter, limit, fills } = connect();
    // The market's own clock, as a replay gives it: the date is by it.
    adapter.setMarkPrice(100, 500);
    await limit('buy', 95, 5, { timeInForce: 'gtd', expireTime: 2000 });
    adapter.setMarkPrice(95, 1000);
    adapter.setMarkPrice(95, 2000);
    expect(fills).toHaveLength(1);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 2 })]);
  });

  it('cancels the rest of its group with its first part', async () => {
    const { adapter, limit } = connect();
    await limit('buy', 95, 5, { ocoGroup: 'entry' });
    await adapter.placeOrder({ side: 'buy', type: 'stop', price: 110, stopPrice: 110, quantity: 5, ocoGroup: 'entry' });
    adapter.setMarkPrice(95);
    expect(adapter.getOrders()).toEqual([expect.objectContaining({ type: 'limit', filledQuantity: 2 })]);
  });

  it('is cancelled, and says why, when the account cannot carry its next part', async () => {
    const { adapter, limit, errors } = connect({ balance: 1000, leverage: 10, fillSize: 30 });
    // Ninety at 100 hold 900: the account carries the whole order as it is placed.
    await limit('buy', 100, 90);
    adapter.setMarkPrice(100);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 30 })]);
    // At 70 the thirty have lost 900: nothing is left to hold the next thirty with.
    adapter.setMarkPrice(70);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 30 })]);
    expect(errors).toEqual([expect.objectContaining({ message: expect.stringContaining('Not enough free margin') })]);
  });

  it('pays for each part as a fill of its own', async () => {
    const { adapter, limit, fills } = connect({ balance: 10_000, commission: { min: 1 } });
    await limit('buy', 95, 5);
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(95);
    expect(fills.map((fill) => fill.commission)).toEqual([1, 1, 1]);
    expect(adapter.getAccount()!.commission).toBe(3);
  });
});

describe('PaperExecutionAdapter: orders that fill at once or not at all, in a market of parts', () => {
  it('fills what there is of an immediate-or-cancel order and drops the rest', async () => {
    const { adapter, fills, told } = connect();
    const before = told();
    const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 101, quantity: 5, timeInForce: 'ioc' });
    expect(order).toEqual(expect.objectContaining({ quantity: 5, filledQuantity: 2 }));
    // Nothing of it works on: the fill left nothing waiting.
    expect(parts(fills)).toEqual(['2']);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ quantity: 2, entryPrice: 100 })]);
    // The next price fills no more of it, into that position or another.
    adapter.setMarkPrice(100);
    expect(fills).toHaveLength(1);
    expect(adapter.getPositions()).toHaveLength(1);
    expect(told()).toBeGreaterThanOrEqual(before);
  });

  it('fills an immediate-or-cancel order whole when the market has it all', async () => {
    const { adapter, fills } = connect();
    const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 101, quantity: 2, timeInForce: 'ioc' });
    expect(order.filledQuantity).toBeUndefined();
    expect(parts(fills)).toEqual(['2']);
  });

  it('refuses a fill-or-kill order the market cannot fill whole, and fills one it can', async () => {
    const { adapter, fills } = connect();
    await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 101, quantity: 5, timeInForce: 'fok' })).rejects.toThrow(/not filled at once/);
    expect(fills).toEqual([]);
    expect(adapter.getPositions()).toEqual([]);
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 101, quantity: 2, timeInForce: 'fok' });
    expect(parts(fills)).toEqual(['2']);
  });

  it('fills a market order and a stop whole: the paper market takes them at the price there is', async () => {
    const { adapter, fills } = connect();
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 7 });
    await adapter.placeOrder({ side: 'buy', type: 'stop', price: 104, stopPrice: 104, quantity: 9 });
    adapter.setMarkPrice(104);
    expect(parts(fills)).toEqual(['7', '9']);
    expect(adapter.getOrders()).toEqual([]);
    // A position closed, its stop-loss and its take-profit are whole too.
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'close', quantity: 7 }));
  });
});

describe('PaperExecutionAdapter: a market with no size of its own', () => {
  it('fills every order whole, as it did, and says nothing of parts', async () => {
    const { adapter, fills, limit } = connect({ fillSize: undefined });
    await limit('buy', 95, 5);
    adapter.setMarkPrice(95);
    expect(parts(fills)).toEqual(['5']);
    expect(fills[0]).not.toHaveProperty('remaining');
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()[0]).toEqual(expect.objectContaining({ quantity: 5 }));
  });

  it('takes no size that is no number above zero', async () => {
    for (const fillSize of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { adapter, fills, limit } = connect({ fillSize });
      await limit('buy', 95, 5);
      adapter.setMarkPrice(95);
      expect(parts(fills), String(fillSize)).toEqual(['5']);
    }
  });

  it('fills an order no larger than the size in one', async () => {
    const { adapter, fills, limit } = connect();
    await limit('buy', 95, 2);
    adapter.setMarkPrice(95);
    expect(parts(fills)).toEqual(['2']);
    expect(adapter.getOrders()).toEqual([]);
  });

  it('counts parts built of fractions as the order they add up to', async () => {
    const { adapter, fills, limit } = connect({ fillSize: 0.1 });
    await limit('buy', 95, 0.3);
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(95);
    adapter.setMarkPrice(95);
    // Three tenths are not 0.3 to the last bit: the third part is the last all the same.
    expect(fills).toHaveLength(3);
    expect(fills[2]).not.toHaveProperty('remaining');
    expect(adapter.getOrders()).toEqual([]);
  });
});
