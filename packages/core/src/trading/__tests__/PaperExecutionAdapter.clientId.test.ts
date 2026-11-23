import { describe, it, expect, beforeEach } from 'vitest';
import type { TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '../PaperExecutionAdapter.js';

// A press sent twice, or a retry after a slow answer, is one order: the account knows it by the id the chart gave it.
describe('PaperExecutionAdapter: an order sent again with its client order id', () => {
  let paper: PaperExecutionAdapter;
  let orders: TradingOrder[];
  let positions: TradingPosition[];

  beforeEach(() => {
    paper = new PaperExecutionAdapter({ markPrice: 100 });
    orders = [];
    positions = [];
    paper.on<TradingOrder[]>('orders', (e) => { orders = e.data; });
    paper.on<TradingPosition[]>('positions', (e) => { positions = e.data; });
    paper.connect({});
  });

  it('is the one order it was, and no second one', async () => {
    const intent = { side: 'buy', type: 'limit', price: 95, quantity: 2, clientOrderId: 'c1' } as const;
    const first = await paper.placeOrder(intent);
    const again = await paper.placeOrder(intent);
    expect(again.id).toBe(first.id);
    expect(orders).toHaveLength(1);
  });

  it('opens one position for a market order sent twice', async () => {
    const intent = { side: 'buy', type: 'market', price: 100, quantity: 1, clientOrderId: 'c2' } as const;
    await paper.placeOrder(intent);
    await paper.placeOrder(intent);
    expect(positions).toHaveLength(1);
    expect(positions[0].quantity).toBe(1);
  });

  it('takes another id, and an order with none, as orders of their own', async () => {
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, clientOrderId: 'c3' });
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, clientOrderId: 'c4' });
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1 });
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1 });
    expect(orders).toHaveLength(4);
  });

  it('forgets an id it refused: the order may be sent again once it can be taken', async () => {
    const dated = { side: 'buy', type: 'limit', price: 95, quantity: 1, timeInForce: 'gtd', clientOrderId: 'c5' } as const;
    await expect(paper.placeOrder(dated)).rejects.toThrow();
    const taken = await paper.placeOrder({ ...dated, timeInForce: 'gtc' });
    expect(taken.id).toBeTruthy();
    expect(orders).toHaveLength(1);
  });
});
