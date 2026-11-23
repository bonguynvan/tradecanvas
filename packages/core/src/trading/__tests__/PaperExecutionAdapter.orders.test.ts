import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaperExecutionAdapter } from '../PaperExecutionAdapter.js';
import type { FillEvent, TradingOrder } from '@tradecanvas/commons';

let adapter: PaperExecutionAdapter;
let fills: FillEvent[];
let orderLists: TradingOrder[][];

function connect(options: ConstructorParameters<typeof PaperExecutionAdapter>[0] = { markPrice: 100 }): void {
  adapter = new PaperExecutionAdapter(options);
  fills = [];
  orderLists = [];
  adapter.on<FillEvent>('fill', (e) => fills.push(e.data));
  adapter.on<TradingOrder[]>('orders', (e) => orderLists.push(e.data));
  adapter.connect({});
}

beforeEach(() => connect());

describe('PaperExecutionAdapter: a stop-limit order moved', () => {
  it('takes its stop with it when told only where it goes, and puts its stop where it is told', async () => {
    const order = await adapter.placeOrder({ side: 'buy', type: 'stopLimit', price: 106, stopPrice: 105, quantity: 1 });
    await adapter.modifyOrder({ orderId: order.id, newPrice: 108 });
    expect(adapter.getOrders()[0]).toMatchObject({ price: 108, stopPrice: 107 });
    // The stop alone, the order where it is.
    await adapter.modifyOrder({ orderId: order.id, newPrice: 108, newStopPrice: 104 });
    expect(adapter.getOrders()[0]).toMatchObject({ type: 'stopLimit', price: 108, stopPrice: 104 });
    // Both, told where each goes.
    await adapter.modifyOrder({ orderId: order.id, newPrice: 110, newStopPrice: 109 });
    expect(adapter.getOrders()[0]).toMatchObject({ price: 110, stopPrice: 109 });
    // Told a stop that is no price, it moves the stop with the order.
    await adapter.modifyOrder({ orderId: order.id, newPrice: 111, newStopPrice: Number.NaN });
    expect(adapter.getOrders()[0]).toMatchObject({ price: 111, stopPrice: 110 });
  });

  it('keeps a stop order’s stop at its price, whatever stop it is told', async () => {
    const order = await adapter.placeOrder({ side: 'buy', type: 'stop', price: 110, stopPrice: 110, quantity: 1 });
    await adapter.modifyOrder({ orderId: order.id, newPrice: 112, newStopPrice: 150 });
    expect(adapter.getOrders()[0]).toMatchObject({ type: 'stop', price: 112, stopPrice: 112 });
  });
});

describe('PaperExecutionAdapter: a stop-limit order', () => {
  it('becomes a limit order at its price once the stop is reached, and fills there, not at the stop', async () => {
    // Buy when 105 trades, but pay no more than 104: the price has run past the limit.
    const order = await adapter.placeOrder({ side: 'buy', type: 'stopLimit', stopPrice: 105, price: 104, quantity: 1 });
    adapter.setMarkPrice(106);
    expect(adapter.getPositions()).toEqual([]);
    expect(adapter.getOrders()).toEqual([expect.objectContaining({ id: order.id, type: 'limit', price: 104, label: 'LIMIT' })]);
    expect(adapter.getOrders()[0].stopPrice).toBeUndefined();
    adapter.setMarkPrice(103.5);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'buy', entryPrice: 104 })]);
  });

  it('fills at once when the price that reached the stop is within its limit: at that price, not the limit', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'stopLimit', stopPrice: 105, price: 107, quantity: 1 });
    adapter.setMarkPrice(105.5);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ entryPrice: 105.5 })]);
    await adapter.placeOrder({ side: 'sell', type: 'stopLimit', stopPrice: 95, price: 93, quantity: 1 });
    adapter.setMarkPrice(94);
    expect(adapter.getPositions()[1]).toEqual(expect.objectContaining({ side: 'sell', entryPrice: 94 }));
  });

  it('is cancelled by the order of its group that fills first, and cancels them when it fills', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'stopLimit', stopPrice: 105, price: 107, quantity: 1, ocoGroup: 'entry' });
    const dip = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, ocoGroup: 'entry' });
    adapter.setMarkPrice(106);
    expect(adapter.getOrders()).toEqual([]);
    expect(fills).toHaveLength(1);
    expect(fills[0].orderId).not.toBe(dip.id);
  });

  it('waits below its stop', async () => {
    await adapter.placeOrder({ side: 'sell', type: 'stopLimit', stopPrice: 95, price: 96, quantity: 1 });
    adapter.setMarkPrice(97);
    expect(adapter.getOrders()).toEqual([expect.objectContaining({ type: 'stopLimit', stopPrice: 95 })]);
  });
});

describe('PaperExecutionAdapter: an order moved', () => {
  it('moves a stop order’s stop with its line: it then waits for the new price', async () => {
    const order = await adapter.placeOrder({ side: 'buy', type: 'stop', price: 105, stopPrice: 105, quantity: 1 });
    await adapter.modifyOrder({ orderId: order.id, newPrice: 108 });
    expect(adapter.getOrders()[0]).toEqual(expect.objectContaining({ price: 108, stopPrice: 108 }));
    adapter.setMarkPrice(106);
    expect(adapter.getPositions()).toEqual([]);
    adapter.setMarkPrice(108);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ entryPrice: 108 })]);
  });

  it('moves a stop-limit’s stop as far as its limit, keeping the room between them', async () => {
    const order = await adapter.placeOrder({ side: 'buy', type: 'stopLimit', stopPrice: 105, price: 107, quantity: 1 });
    await adapter.modifyOrder({ orderId: order.id, newPrice: 110 });
    expect(adapter.getOrders()[0]).toEqual(expect.objectContaining({ type: 'stopLimit', price: 110, stopPrice: 108 }));
  });

  it('moves a limit order’s price and gives it no stop', async () => {
    const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1 });
    await adapter.modifyOrder({ orderId: order.id, newPrice: 96 });
    expect(adapter.getOrders()[0].price).toBe(96);
    expect(adapter.getOrders()[0].stopPrice).toBeUndefined();
  });
});

describe('PaperExecutionAdapter: one cancels the other', () => {
  it('cancels the rest of a group when one of its orders fills', async () => {
    const target = await adapter.placeOrder({ side: 'sell', type: 'limit', price: 110, quantity: 1, ocoGroup: 'exit' });
    await adapter.placeOrder({ side: 'sell', type: 'stop', price: 90, stopPrice: 90, quantity: 1, ocoGroup: 'exit' });
    const other = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 80, quantity: 1 });
    expect(adapter.getOrders().map((o) => o.ocoGroup)).toEqual(['exit', 'exit', undefined]);
    adapter.setMarkPrice(111);
    expect(fills.map((f) => f.orderId)).toEqual([target.id]);
    expect(adapter.getOrders().map((o) => o.id)).toEqual([other.id]);
  });

  it('fills one order only when the price reaches two of a group at once', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 98, quantity: 1, ocoGroup: 'g' });
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 97, quantity: 1, ocoGroup: 'g' });
    adapter.setMarkPrice(96);
    expect(fills).toHaveLength(1);
    expect(adapter.getOrders()).toEqual([]);
  });

  it('leaves the group alone when one of it is cancelled by hand', async () => {
    const a = await adapter.placeOrder({ side: 'sell', type: 'limit', price: 110, quantity: 1, ocoGroup: 'exit' });
    const b = await adapter.placeOrder({ side: 'sell', type: 'stop', price: 90, stopPrice: 90, quantity: 1, ocoGroup: 'exit' });
    await adapter.cancelOrder({ orderId: a.id });
    expect(adapter.getOrders().map((o) => o.id)).toEqual([b.id]);
  });
});

describe('PaperExecutionAdapter: how long an order works', () => {
  it('fills an immediate-or-cancel limit at once when the price is within it', async () => {
    for (const timeInForce of ['ioc', 'fok'] as const) {
      connect();
      const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 101, quantity: 2, timeInForce });
      // At the price there is, as a limit is its worst price.
      expect(fills).toEqual([expect.objectContaining({ orderId: order.id, price: 100, quantity: 2 })]);
      expect(adapter.getOrders()).toEqual([]);
    }
  });

  it('refuses one the price is not within, and leaves nothing working', async () => {
    for (const timeInForce of ['ioc', 'fok'] as const) {
      connect();
      await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 99, quantity: 1, timeInForce })).rejects.toThrow(/not filled at once/);
      expect(adapter.getOrders()).toEqual([]);
      expect(fills).toEqual([]);
    }
  });

  it('refuses one placed before the account has a price: there is nothing to fill it at', async () => {
    connect({});
    await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 101, quantity: 1, timeInForce: 'ioc' })).rejects.toThrow(/not filled at once/);
  });

  it('refuses a stop that is to fill at once or not at all: it waits by its nature', async () => {
    await expect(adapter.placeOrder({ side: 'buy', type: 'stop', price: 105, stopPrice: 105, quantity: 1, timeInForce: 'ioc' })).rejects.toThrow(/stop/);
    await expect(adapter.placeOrder({ side: 'buy', type: 'stopLimit', price: 106, stopPrice: 105, quantity: 1, timeInForce: 'fok' })).rejects.toThrow(/stop/);
  });

  it('takes a good-till-date order off once the mark’s time reaches its date', async () => {
    adapter.setMarkPrice(100, 1_000);
    const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtd', expireTime: 2_000 });
    expect(order.expireTime).toBe(2_000);
    adapter.setMarkPrice(99, 1_999);
    expect(adapter.getOrders()).toHaveLength(1);
    const before = orderLists.length;
    // The price that would fill it comes with the time that ends it: it has ended.
    adapter.setMarkPrice(94, 2_000);
    expect(adapter.getOrders()).toEqual([]);
    expect(fills).toEqual([]);
    expect(orderLists.length).toBeGreaterThan(before);
  });

  it('refuses a good-till-date order whose date has passed', async () => {
    adapter.setMarkPrice(100, 5_000);
    await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtd', expireTime: 5_000 })).rejects.toThrow(/passed/);
    expect(adapter.getOrders()).toEqual([]);
  });

  describe('with no time given with the price (a live chart)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(10_000);
    });
    afterEach(() => vi.useRealTimers());

    it('goes by the clock', async () => {
      await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtd', expireTime: 12_000 });
      adapter.setMarkPrice(99);
      expect(adapter.getOrders()).toHaveLength(1);
      vi.setSystemTime(12_000);
      adapter.setMarkPrice(94);
      expect(adapter.getOrders()).toEqual([]);
      expect(fills).toEqual([]);
    });
  });

  it('refuses a good-till-date order with no date', async () => {
    await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtd' })).rejects.toThrow(/expireTime/);
    await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtd', expireTime: Number.NaN })).rejects.toThrow(/expireTime/);
  });

  it('keeps a date only on a good-till-date order', async () => {
    adapter.setMarkPrice(100, 1_000);
    const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtc', expireTime: 2_000 });
    expect(order.expireTime).toBeUndefined();
    adapter.setMarkPrice(99, 3_000);
    expect(adapter.getOrders()).toHaveLength(1);
  });
});

describe('PaperExecutionAdapter: one net position (positions: net)', () => {
  beforeEach(() => connect({ markPrice: 100, positions: 'net' }));
  const market = (side: 'buy' | 'sell', quantity: number, extra: object = {}) =>
    adapter.placeOrder({ side, type: 'market', price: 100, quantity, ...extra });

  it('adds a fill the same way to the position, at the average of their prices', async () => {
    await market('buy', 1);
    adapter.setMarkPrice(110);
    await market('buy', 3);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'buy', quantity: 4, entryPrice: 107.5 })]);
    expect(fills[1]).toEqual(expect.objectContaining({ positionId: adapter.getPositions()[0].id, quantity: 3 }));
    expect(fills[1].pnl).toBeUndefined();
  });

  it('takes a fill the other way off the position, and realises that part', async () => {
    await market('buy', 4);
    adapter.setMarkPrice(105);
    await market('sell', 1);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'buy', quantity: 3, entryPrice: 100 })]);
    expect(fills[1]).toEqual(expect.objectContaining({ side: 'sell', quantity: 1, price: 105, pnl: 5 }));
  });

  it('closes the position with a fill of its size the other way', async () => {
    await market('sell', 2);
    adapter.setMarkPrice(97);
    await market('buy', 2);
    expect(adapter.getPositions()).toEqual([]);
    expect(fills[1].pnl).toBe(6);
  });

  it('turns the position round with a larger fill the other way: the rest opens at the fill’s price', async () => {
    await market('buy', 2, { stopLoss: 90 });
    adapter.setMarkPrice(104);
    await market('sell', 5, { stopLoss: 110 });
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'sell', quantity: 3, entryPrice: 104, stopLoss: 110 })]);
    expect(fills[1]).toEqual(expect.objectContaining({ quantity: 5, pnl: 8, positionId: adapter.getPositions()[0].id }));
  });

  it('keeps the position’s stops when the fill added brings none, and takes the fill’s when it brings them', async () => {
    await market('buy', 1, { stopLoss: 90, takeProfit: 120 });
    await market('buy', 1);
    expect(adapter.getPositions()[0]).toEqual(expect.objectContaining({ stopLoss: 90, takeProfit: 120 }));
    await market('buy', 1, { stopLoss: 95 });
    expect(adapter.getPositions()[0]).toEqual(expect.objectContaining({ stopLoss: 95, takeProfit: 120 }));
  });

  it('closes a position built of fractions with its size, leaving no dust and turning nothing round', async () => {
    await market('buy', 0.1);
    await market('buy', 0.2); // 0.30000000000000004 held
    await market('sell', 0.3);
    expect(adapter.getPositions()).toEqual([]);
    await market('sell', 0.7);
    await market('buy', 0.1);
    await market('buy', 0.6); // 0.7 less 0.1 is a hair under 0.6
    expect(adapter.getPositions()).toEqual([]);
  });

  it('leaves the position’s stops when a fill takes from it, and brings the fill’s own when it turns it round', async () => {
    await market('buy', 3, { stopLoss: 90, takeProfit: 120 });
    await market('sell', 1, { stopLoss: 130 });
    expect(adapter.getPositions()[0]).toEqual(expect.objectContaining({ quantity: 2, stopLoss: 90, takeProfit: 120 }));
    await market('sell', 3);
    const turned = adapter.getPositions()[0];
    expect(turned).toEqual(expect.objectContaining({ side: 'sell', quantity: 1 }));
    expect(turned.stopLoss).toBeUndefined();
    expect(turned.takeProfit).toBeUndefined();
  });

  it('closes, reverses and stops out the one position as it does any', async () => {
    await market('buy', 2, { stopLoss: 95 });
    await adapter.reversePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'sell', quantity: 2 })]);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getPositions()).toEqual([]);
    await market('buy', 1, { stopLoss: 95 });
    adapter.setMarkPrice(94);
    expect(adapter.getPositions()).toEqual([]);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ reason: 'stopLoss', pnl: -5 }));
  });

  it('nets working orders as they fill, too', async () => {
    await market('buy', 2);
    await adapter.placeOrder({ side: 'sell', type: 'limit', price: 108, quantity: 2 });
    adapter.setMarkPrice(109);
    expect(adapter.getPositions()).toEqual([]);
    expect(fills[1].pnl).toBe(16);
  });
});

describe('PaperExecutionAdapter: a position an order (positions: hedge, the default)', () => {
  it('opens one each fill, whatever way', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1 });
    await adapter.placeOrder({ side: 'sell', type: 'market', price: 100, quantity: 1 });
    expect(adapter.getPositions()).toHaveLength(2);
  });
});
