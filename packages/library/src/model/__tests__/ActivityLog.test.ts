import { describe, it, expect, beforeEach } from 'vitest';
import type { TradingOrder } from '@tradecanvas/commons';
import { ActivityLog } from '../ActivityLog.js';

const limit = (id: string, price: number, over: Partial<TradingOrder> = {}): TradingOrder => ({ id, side: 'buy', type: 'limit', price, quantity: 2, ...over });

let log: ActivityLog;
beforeEach(() => {
  log = new ActivityLog();
  // What was working when the log began is not news.
  log.orders([], 0);
});
const kinds = () => log.entries().map((entry) => entry.kind);

describe('ActivityLog: the orders', () => {
  it('takes the orders it first hears of as what was there, and logs none of them', () => {
    const fresh = new ActivityLog();
    fresh.orders([limit('a', 95)], 10);
    expect(fresh.entries()).toEqual([]);
    fresh.orders([limit('a', 95), limit('b', 90)], 20);
    expect(fresh.entries().map((entry) => entry.orderId)).toEqual(['b']);
  });

  it('logs an order placed, with what it is', () => {
    log.orders([limit('a', 95, { side: 'sell', type: 'stop' })], 100);
    expect(log.entries()).toEqual([{ time: 100, kind: 'placed', orderId: 'a', side: 'sell', type: 'stop', quantity: 2, price: 95 }]);
  });

  it('logs an order moved to its new price, and nothing for one that stayed', () => {
    log.orders([limit('a', 95), limit('b', 90)], 100);
    log.orders([limit('a', 96), limit('b', 90)], 200);
    expect(log.entries().slice(2)).toEqual([{ time: 200, kind: 'moved', orderId: 'a', side: 'buy', type: 'limit', quantity: 2, price: 96 }]);
  });

  it('logs an order that left without filling as cancelled, as it was', () => {
    log.orders([limit('a', 95)], 100);
    log.orders([], 300);
    expect(log.entries()[1]).toEqual({ time: 300, kind: 'cancelled', orderId: 'a', side: 'buy', type: 'limit', quantity: 2, price: 95 });
  });

  it('logs a stop-limit order moved when its stop alone went elsewhere', () => {
    log.orders([limit('a', 106, { type: 'stopLimit', stopPrice: 105 })], 100);
    log.orders([limit('a', 106, { type: 'stopLimit', stopPrice: 104 })], 200);
    expect(log.entries().at(-1)).toMatchObject({ time: 200, kind: 'moved', orderId: 'a', type: 'stopLimit', price: 106 });
    // Where it was, told again: no news.
    log.orders([limit('a', 106, { type: 'stopLimit', stopPrice: 104 })], 300);
    expect(kinds()).toEqual(['placed', 'moved']);
  });

  it('says nothing when a stop-limit becomes a limit at its price: it is the same order, working on', () => {
    log.orders([limit('a', 104, { type: 'stopLimit', stopPrice: 105 })], 100);
    log.orders([limit('a', 104, { type: 'limit' })], 200);
    expect(kinds()).toEqual(['placed']);
  });
});

describe('ActivityLog: the fills', () => {
  const fill = { orderId: 'a', side: 'buy' as const, price: 95, quantity: 2, time: 400, reason: 'order' as const };

  it('logs a fill with its reason and what it realised', () => {
    log.fill({ orderId: 'x', side: 'sell', price: 110, quantity: 1, time: 500, reason: 'takeProfit', pnl: 15, commission: 0.2 });
    expect(log.entries()).toEqual([{ time: 500, kind: 'filled', orderId: 'x', side: 'sell', quantity: 1, price: 110, reason: 'takeProfit', pnl: 15 }]);
  });

  it('logs the rest of an order as cancelled when its fill dropped it: an immediate-or-cancel order filled in part', () => {
    log.fill({ orderId: 'i', side: 'buy', price: 100, quantity: 2, time: 400, reason: 'order', dropped: 3 });
    expect(log.entries()).toEqual([
      { time: 400, kind: 'filled', orderId: 'i', side: 'buy', quantity: 2, price: 100, reason: 'order' },
      { time: 400, kind: 'cancelled', orderId: 'i', side: 'buy', quantity: 3 },
    ]);
  });

  it('logs no cancellation with a fill that dropped nothing, or no amount', () => {
    log.fill({ ...fill, dropped: 0 });
    log.fill({ ...fill, orderId: 'b', dropped: Number.NaN });
    expect(kinds()).toEqual(['filled', 'filled']);
  });

  it('does not call an order cancelled when it left because it filled, whichever was told first', () => {
    log.orders([limit('a', 95)], 100);
    log.fill(fill);
    log.orders([], 400);
    expect(kinds()).toEqual(['placed', 'filled']);

    log.orders([limit('b', 90)], 500);
    log.orders([], 600);
    log.fill({ ...fill, orderId: 'b', time: 600 });
    expect(kinds()).toEqual(['placed', 'filled', 'placed', 'filled']);
  });

  it('still calls another order cancelled that left with the one that filled: the rest of its group', () => {
    log.orders([limit('a', 95), limit('b', 90)], 100);
    log.fill(fill);
    log.orders([], 400);
    expect(log.entries().slice(2).map((entry) => [entry.kind, entry.orderId])).toEqual([['filled', 'a'], ['cancelled', 'b']]);
  });
});

describe('ActivityLog: what was refused', () => {
  it('logs why, from the error and what caused it', () => {
    log.error({ message: 'Execution command failed: orderPlace', command: 'orderPlace', cause: new Error('Not enough free margin') }, 700);
    log.error({ message: 'A bracket with no quantity is not sent to the adapter', command: 'bracketPlace', reason: 'noQuantity' }, 800);
    log.error({ message: 'Lost', cause: 'timeout' }, 900);
    expect(log.entries()).toEqual([
      { time: 700, kind: 'rejected', message: 'Not enough free margin' },
      { time: 800, kind: 'rejected', message: 'A bracket with no quantity is not sent to the adapter' },
      { time: 900, kind: 'rejected', message: 'Lost: timeout' },
    ]);
  });
});

describe('ActivityLog: what it keeps', () => {
  it('keeps the newest entries, as many as it was given room for', () => {
    const small = new ActivityLog(3);
    small.orders([], 0);
    for (let i = 1; i <= 5; i++) small.error({ message: `e${i}` }, i);
    expect(small.entries().map((entry) => entry.message)).toEqual(['e3', 'e4', 'e5']);
  });

  it('hands out copies, oldest first', () => {
    log.error({ message: 'one' }, 1);
    log.entries()[0].message = 'changed';
    expect(log.entries()[0].message).toBe('one');
  });

  it('starts again empty when cleared, still knowing the orders that are working', () => {
    log.orders([limit('a', 95)], 100);
    log.clear();
    expect(log.entries()).toEqual([]);
    log.orders([limit('a', 95)], 200);
    expect(log.entries()).toEqual([]);
    log.orders([], 300);
    expect(kinds()).toEqual(['cancelled']);
  });
});

describe('ActivityLog: an order filled in parts', () => {
  const part = (quantity: number, time: number) => ({ orderId: 'a', side: 'buy' as const, price: 95, quantity, time, reason: 'order' as const });

  it('logs the rest cancelled when an order part filled is taken off', () => {
    log.orders([limit('a', 95, { quantity: 10 })], 100);
    log.fill(part(4, 200));
    log.orders([limit('a', 95, { quantity: 10 })], 200);
    log.orders([], 300);
    expect(kinds()).toEqual(['placed', 'filled', 'cancelled']);
    // What was cancelled is what was left of it, not the whole it began as.
    expect(log.entries().map((entry) => entry.quantity)).toEqual([10, 4, 6]);
  });

  it('logs no cancellation when its parts add up to the order', () => {
    log.orders([limit('a', 95, { quantity: 10 })], 100);
    log.fill(part(4, 200));
    log.fill(part(6, 300));
    log.orders([], 300);
    expect(kinds()).toEqual(['placed', 'filled', 'filled']);
  });
});

describe('ActivityLog: what it is told by reference', () => {
  it('sees an order moved when the app changed the same object and gave it again', () => {
    const order = limit('a', 95);
    const orders = [order];
    log.orders(orders, 100);
    order.price = 97;
    log.orders(orders, 200);
    expect(log.entries()[1]).toEqual(expect.objectContaining({ kind: 'moved', price: 97 }));
  });
});

describe('ActivityLog: starting over from another set of orders', () => {
  it('takes the next orders as what is there, logging nothing of the change', () => {
    log.orders([limit('a', 95), limit('b', 90)], 100);
    log.rebase();
    log.orders([limit('z', 50)], 200);
    expect(kinds()).toEqual(['placed', 'placed']);
    log.orders([], 300);
    expect(log.entries().at(-1)).toEqual(expect.objectContaining({ kind: 'cancelled', orderId: 'z' }));
  });
});
