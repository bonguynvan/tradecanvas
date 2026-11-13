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

describe('PaperExecutionAdapter: closes, stops and reverses', () => {
  let adapter: PaperExecutionAdapter;
  let fills: FillEvent[];

  beforeEach(() => {
    adapter = new PaperExecutionAdapter({ markPrice: 100 });
    adapter.connect({});
    fills = [];
    adapter.on<FillEvent>('fill', (e) => fills.push(e.data));
  });

  it('opens a position with the stop-loss and take-profit of its order', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, stopLoss: 95, takeProfit: 110 });
    expect(adapter.getPositions()[0]).toMatchObject({ stopLoss: 95, takeProfit: 110 });
    expect(fills[0]).toMatchObject({ reason: 'order', positionId: adapter.getPositions()[0].id });
  });

  it('reports a close with the profit it realised', async () => {
    await adapter.placeOrder({ side: 'sell', type: 'market', price: 100, quantity: 2 });
    const [position] = adapter.getPositions();
    adapter.setMarkPrice(97);
    await adapter.closePosition({ positionId: position.id });
    expect(adapter.getPositions()).toEqual([]);
    expect(fills.at(-1)).toMatchObject({ side: 'buy', price: 97, quantity: 2, reason: 'close', pnl: 6, positionId: position.id });
  });

  it('reports a stop-loss and a take-profit hit at their prices', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, stopLoss: 95 });
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, takeProfit: 104 });
    adapter.setMarkPrice(105);
    expect(fills.at(-1)).toMatchObject({ reason: 'takeProfit', price: 104, pnl: 4 });
    adapter.setMarkPrice(94);
    expect(fills.at(-1)).toMatchObject({ reason: 'stopLoss', price: 95, pnl: -5 });
    expect(adapter.getPositions()).toEqual([]);
  });

  it('removes a stop with null and keeps one left out', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, stopLoss: 95, takeProfit: 110 });
    const [position] = adapter.getPositions();
    await adapter.modifyPosition({ positionId: position.id, stopLoss: null });
    expect(adapter.getPositions()[0]).toMatchObject({ stopLoss: undefined, takeProfit: 110 });
  });

  it('reverses a position: closes it and opens the same size the other way', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 3 });
    const [position] = adapter.getPositions();
    adapter.setMarkPrice(102);
    await adapter.reversePosition({ positionId: position.id });
    const [reversed] = adapter.getPositions();
    expect(reversed).toMatchObject({ side: 'sell', quantity: 3, entryPrice: 102 });
    expect(fills.slice(-2).map((f) => f.reason)).toEqual(['reverse', 'order']);
  });
});

describe('PaperExecutionAdapter fill times', () => {
  it('stamps fills with the mark’s time, and with now once a mark comes without one', async () => {
    const paper = new PaperExecutionAdapter({ markPrice: 100 });
    const times: number[] = [];
    paper.on<FillEvent>('fill', (e) => times.push(e.data.time));
    paper.setMarkPrice(100, 1_000);
    await paper.placeOrder({ side: 'buy', type: 'market', quantity: 1 });
    paper.setMarkPrice(101);
    const before = Date.now();
    await paper.placeOrder({ side: 'buy', type: 'market', quantity: 1 });
    expect(times[0]).toBe(1_000);
    expect(times[1]).toBeGreaterThanOrEqual(before);
  });
});

describe('PaperExecutionAdapter: a trailing stop', () => {
  let adapter: PaperExecutionAdapter;
  const stop = () => adapter.getPositions()[0]?.stopLoss;
  const open = async (side: 'buy' | 'sell', stopLoss?: number): Promise<string> => {
    await adapter.placeOrder({ side, type: 'market', price: 100, quantity: 1, stopLoss });
    return adapter.getPositions()[0].id;
  };

  beforeEach(() => {
    adapter = new PaperExecutionAdapter({ markPrice: 100 });
    adapter.connect({});
  });

  it('follows a long up at its distance, never back down, and closes it there', async () => {
    const id = await open('buy', 95);
    await adapter.modifyPosition({ positionId: id, trailingStop: 5 });
    expect(adapter.getPositions()[0]).toMatchObject({ stopLoss: 95, trailingStop: 5 });
    adapter.setMarkPrice(110);
    expect(stop()).toBe(105);
    adapter.setMarkPrice(107);
    expect(stop()).toBe(105);
    const fills: FillEvent[] = [];
    adapter.on<FillEvent>('fill', (e) => fills.push(e.data));
    adapter.setMarkPrice(105);
    expect(adapter.getPositions()).toHaveLength(0);
    expect(fills[0]).toMatchObject({ price: 105, reason: 'stopLoss' });
  });

  it('follows a short down, and never back up', async () => {
    const id = await open('sell', 106);
    await adapter.modifyPosition({ positionId: id, trailingStop: 4 });
    adapter.setMarkPrice(90);
    expect(stop()).toBe(94);
    adapter.setMarkPrice(93);
    expect(stop()).toBe(94);
  });

  it('gives a position with no stop one at its distance from the price now', async () => {
    const id = await open('buy');
    await adapter.modifyPosition({ positionId: id, trailingStop: 3 });
    expect(stop()).toBe(97);
  });

  it('never loosens a stop that is already nearer than the distance', async () => {
    const id = await open('buy', 98);
    await adapter.modifyPosition({ positionId: id, trailingStop: 5 });
    expect(stop()).toBe(98);
    adapter.setMarkPrice(102);
    expect(stop()).toBe(98);
    adapter.setMarkPrice(104);
    expect(stop()).toBe(99);
  });

  it('stops following when the trail is taken away, the stop staying where it is', async () => {
    const id = await open('buy', 95);
    await adapter.modifyPosition({ positionId: id, trailingStop: 5 });
    adapter.setMarkPrice(110);
    await adapter.modifyPosition({ positionId: id, trailingStop: null });
    expect(adapter.getPositions()[0].trailingStop).toBeUndefined();
    adapter.setMarkPrice(120);
    expect(stop()).toBe(105);
  });

  it('follows from a stop moved by hand, and ends with the stop removed', async () => {
    const id = await open('buy', 95);
    await adapter.modifyPosition({ positionId: id, trailingStop: 5 });
    await adapter.modifyPosition({ positionId: id, stopLoss: 99 });
    expect(adapter.getPositions()[0]).toMatchObject({ stopLoss: 99, trailingStop: 5 });
    adapter.setMarkPrice(106);
    expect(stop()).toBe(101);
    // No stop, nothing to trail.
    await adapter.modifyPosition({ positionId: id, stopLoss: null });
    expect(adapter.getPositions()[0].trailingStop).toBeUndefined();
    adapter.setMarkPrice(130);
    expect(stop()).toBeUndefined();
  });

  it('leaves a stop moved back by hand where it was put, and follows on from there', async () => {
    const id = await open('buy', 95);
    await adapter.modifyPosition({ positionId: id, trailingStop: 5 });
    // Looser than its distance: it does not spring back.
    await adapter.modifyPosition({ positionId: id, stopLoss: 90 });
    expect(stop()).toBe(90);
    adapter.setMarkPrice(100.5);
    expect(stop()).toBe(95.5);
  });

  it('takes no distance that is not a positive number', async () => {
    const id = await open('buy', 95);
    for (const trailingStop of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      await adapter.modifyPosition({ positionId: id, trailingStop });
      expect(adapter.getPositions()[0].trailingStop).toBeUndefined();
    }
  });

  it('says so each time the stop moves, and not when it does not', async () => {
    const id = await open('buy', 95);
    await adapter.modifyPosition({ positionId: id, trailingStop: 5 });
    let told = 0;
    adapter.on<TradingPosition[]>('positions', () => told++);
    adapter.setMarkPrice(101);
    adapter.setMarkPrice(100.5);
    expect(told).toBe(1);
  });
});

describe('PaperExecutionAdapter: an order that opens a trailing position', () => {
  let adapter: PaperExecutionAdapter;
  beforeEach(() => {
    adapter = new PaperExecutionAdapter({ markPrice: 100 });
    adapter.connect({});
  });

  it('gives a market order\u2019s position its trail at once', async () => {
    await adapter.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, stopLoss: 96, trailingStop: 4 });
    expect(adapter.getPositions()[0]).toMatchObject({ stopLoss: 96, trailingStop: 4 });
    adapter.setMarkPrice(108);
    expect(adapter.getPositions()[0].stopLoss).toBe(104);
  });

  it('keeps the trail on a waiting order and hands it to the position it opens', async () => {
    await adapter.placeOrder({ side: 'sell', type: 'limit', price: 110, quantity: 1, stopLoss: 113, trailingStop: 3 });
    expect(adapter.getOrders()[0]).toMatchObject({ stopLoss: 113, trailingStop: 3 });
    adapter.setMarkPrice(110);
    expect(adapter.getPositions()[0]).toMatchObject({ side: 'sell', stopLoss: 113, trailingStop: 3 });
    adapter.setMarkPrice(100);
    expect(adapter.getPositions()[0].stopLoss).toBe(103);
  });

  it('takes no trail that is not a distance', async () => {
    for (const trailingStop of [0, -1, Number.NaN]) {
      const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 90, quantity: 1, stopLoss: 85, trailingStop });
      expect(order.trailingStop).toBeUndefined();
    }
  });
});
