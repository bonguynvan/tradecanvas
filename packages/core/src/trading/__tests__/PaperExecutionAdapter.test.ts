import { describe, it, expect, beforeEach } from 'vitest';
import { PaperExecutionAdapter } from '../PaperExecutionAdapter.js';
import type { TradingPosition, FillEvent } from '@tradecanvas/commons';

describe('PaperExecutionAdapter', () => {
  let adapter: PaperExecutionAdapter;

  beforeEach(() => {
    adapter = new PaperExecutionAdapter({ markPrice: 100 });
    adapter.connect({});
  });

  it('fills a market order immediately and opens a position', async () => {
    const fills: FillEvent[] = [];
    adapter.on<FillEvent>('fill', (e) => fills.push(e.data));

    const order = await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 2 });

    expect(order.id).toBeTruthy();
    expect(adapter.getOrders()).toHaveLength(0);
    expect(adapter.getPositions()).toHaveLength(1);
    expect(adapter.getPositions()[0]).toMatchObject({ side: 'buy', entryPrice: 100, quantity: 2 });
    expect(fills).toHaveLength(1);
  });

  it('keeps a limit order pending until the mark price triggers it', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1 });
    expect(adapter.getOrders()).toHaveLength(1);
    expect(adapter.getPositions()).toHaveLength(0);

    adapter.setMarkPrice(94); // buy-limit triggers when price <= 95
    expect(adapter.getOrders()).toHaveLength(0);
    expect(adapter.getPositions()).toHaveLength(1);
  });

  it('modifies and cancels a pending order', async () => {
    const o = await adapter.placeOrder({ side: 'sell', type: 'limit', price: 110, quantity: 1 });

    await adapter.modifyOrder({ orderId: o.id, newPrice: 112, previousPrice: 110 });
    expect(adapter.getOrders()[0].price).toBe(112);

    await adapter.cancelOrder({ orderId: o.id });
    expect(adapter.getOrders()).toHaveLength(0);
  });

  it('edits SL/TP and auto-closes when the stop is hit', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1 });
    const pos: TradingPosition = adapter.getPositions()[0];

    await adapter.modifyPosition({ positionId: pos.id, stopLoss: 90, takeProfit: 120 });
    expect(adapter.getPositions()[0].stopLoss).toBe(90);

    adapter.setMarkPrice(89); // long stop-loss hit
    expect(adapter.getPositions()).toHaveLength(0);
  });

  it('closes a position explicitly', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1 });
    const id = adapter.getPositions()[0].id;

    await adapter.closePosition({ positionId: id });
    expect(adapter.getPositions()).toHaveLength(0);
  });

  it('reports connection state', () => {
    expect(adapter.getConnectionState()).toBe('connected');
    adapter.disconnect();
    expect(adapter.getConnectionState()).toBe('disconnected');
  });
});
