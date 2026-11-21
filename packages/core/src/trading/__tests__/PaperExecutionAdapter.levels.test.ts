import { describe, it, expect } from 'vitest';
import { PaperExecutionAdapter, type PaperExecutionOptions } from '../PaperExecutionAdapter.js';
import type { FillEvent } from '@tradecanvas/commons';

function connect(options: PaperExecutionOptions = {}) {
  const adapter = new PaperExecutionAdapter({ markPrice: 100, ...options });
  const fills: FillEvent[] = [];
  adapter.on<FillEvent>('fill', (e) => fills.push(e.data));
  adapter.connect({});
  const market = (side: 'buy' | 'sell', quantity: number, extra: object = {}) => adapter.placeOrder({ side, type: 'market', price: 100, quantity, ...extra });
  return { adapter, fills, market, position: () => adapter.getPositions()[0] };
}

describe('PaperExecutionAdapter: a position taken off in parts', () => {
  it('gives the position its order’s take-profit levels, the nearest first', async () => {
    const { market, position } = connect();
    await market('buy', 3, { takeProfits: [{ price: 120, quantity: 1 }, { price: 110, quantity: 1 }] });
    expect(position().takeProfits).toEqual([{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }]);
    const short = connect();
    await short.market('sell', 3, { takeProfits: [{ price: 80, quantity: 1 }, { price: 90, quantity: 1 }] });
    expect(short.position().takeProfits).toEqual([{ price: 90, quantity: 1 }, { price: 80, quantity: 1 }]);
  });

  it('closes a level’s part when the price reaches it, at the level, and leaves the rest open', async () => {
    const { adapter, fills, market, position } = connect();
    await market('buy', 3, { takeProfits: [{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }] });
    adapter.setMarkPrice(111);
    expect(fills[1]).toEqual(expect.objectContaining({ side: 'sell', price: 110, quantity: 1, reason: 'takeProfit', pnl: 10, positionId: position().id }));
    expect(position()).toEqual(expect.objectContaining({ quantity: 3, closedQuantity: 1, takeProfits: [{ price: 120, quantity: 1 }] }));
  });

  it('closes each level a price jumps past, the nearest first', async () => {
    const { adapter, fills, market, position } = connect();
    await market('buy', 3, { takeProfits: [{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }] });
    adapter.setMarkPrice(125);
    expect(fills.slice(1).map((f) => [f.price, f.quantity, f.pnl])).toEqual([[110, 1, 10], [120, 1, 20]]);
    expect(position().closedQuantity).toBe(2);
    expect(position().takeProfits).toBeUndefined();
  });

  it('is gone when its levels have taken all of it', async () => {
    const { adapter, fills, market } = connect();
    await market('sell', 2, { takeProfits: [{ price: 95, quantity: 1 }, { price: 90, quantity: 1 }] });
    adapter.setMarkPrice(94);
    expect(adapter.getPositions()).toHaveLength(1);
    adapter.setMarkPrice(89);
    expect(adapter.getPositions()).toEqual([]);
    expect(fills.slice(1).map((f) => f.pnl)).toEqual([5, 10]);
  });

  it('closes what is left when a level asks for more than that', async () => {
    const { adapter, fills, market } = connect();
    await market('buy', 2, { takeProfits: [{ price: 110, quantity: 1.5 }, { price: 120, quantity: 5 }] });
    adapter.setMarkPrice(121);
    expect(fills.slice(1).map((f) => f.quantity)).toEqual([1.5, 0.5]);
    expect(adapter.getPositions()).toEqual([]);
  });

  it('closes the rest at the take-profit, and all that is left at the stop-loss', async () => {
    const { adapter, fills, market } = connect();
    await market('buy', 3, { takeProfits: [{ price: 110, quantity: 1 }], takeProfit: 130 });
    adapter.setMarkPrice(131);
    expect(fills.slice(1).map((f) => [f.price, f.quantity])).toEqual([[110, 1], [130, 2]]);
    expect(adapter.getPositions()).toEqual([]);

    const stopped = connect();
    await stopped.market('buy', 3, { takeProfits: [{ price: 110, quantity: 1 }], stopLoss: 95 });
    stopped.adapter.setMarkPrice(111);
    stopped.adapter.setMarkPrice(94);
    expect(stopped.fills.at(-1)).toEqual(expect.objectContaining({ reason: 'stopLoss', quantity: 2, pnl: -10 }));
    expect(stopped.adapter.getPositions()).toEqual([]);
  });

  it('takes no level that is no price or no quantity', async () => {
    const { market, position } = connect();
    await market('buy', 3, { takeProfits: [{ price: Number.NaN, quantity: 1 }, { price: 110, quantity: 0 }, { price: 115, quantity: 1 }, { price: -5, quantity: 1 }] });
    expect(position().takeProfits).toEqual([{ price: 115, quantity: 1 }]);
    const none = connect();
    await none.market('buy', 3, { takeProfits: [] });
    expect(none.position().takeProfits).toBeUndefined();
  });

  it('carries the levels of a waiting order to the position it opens', async () => {
    const { adapter, position } = connect();
    const order = await adapter.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 2, takeProfits: [{ price: 105, quantity: 1 }] });
    expect(order.takeProfits).toEqual([{ price: 105, quantity: 1 }]);
    adapter.setMarkPrice(94);
    expect(position().takeProfits).toEqual([{ price: 105, quantity: 1 }]);
  });
});

describe('PaperExecutionAdapter: a position’s levels changed', () => {
  it('sets them, replaces them, and takes them all off', async () => {
    const { adapter, market, position } = connect();
    await market('buy', 3);
    await adapter.modifyPosition({ positionId: position().id, takeProfits: [{ price: 120, quantity: 1 }, { price: 110, quantity: 1 }] });
    expect(position().takeProfits).toEqual([{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }]);
    await adapter.modifyPosition({ positionId: position().id, stopLoss: 90 });
    expect(position().takeProfits).toHaveLength(2);
    await adapter.modifyPosition({ positionId: position().id, takeProfits: [{ price: 115, quantity: 2 }] });
    expect(position().takeProfits).toEqual([{ price: 115, quantity: 2 }]);
    await adapter.modifyPosition({ positionId: position().id, takeProfits: null });
    expect(position().takeProfits).toBeUndefined();
  });
});

describe('PaperExecutionAdapter: levels and the account', () => {
  it('puts each part’s gain in the balance, frees its margin and charges its fill', async () => {
    const { adapter, fills, market } = connect({ balance: 1_000, commission: { min: 1 } });
    await market('buy', 4, { takeProfits: [{ price: 110, quantity: 1 }] });
    expect(adapter.getAccount()!.marginUsed).toBe(400);
    adapter.setMarkPrice(110);
    expect(fills[1].commission).toBe(1);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 1_000 - 1 + 10 - 1, realisedPnl: 10, marginUsed: 300, unrealisedPnl: 30 }));
  });

  it('keeps the levels of a net position a fill adds to, and takes the fill’s when it brings them', async () => {
    const { market, position } = connect({ positions: 'net' });
    await market('buy', 2, { takeProfits: [{ price: 110, quantity: 1 }] });
    await market('buy', 1);
    expect(position().takeProfits).toEqual([{ price: 110, quantity: 1 }]);
    await market('buy', 1, { takeProfits: [{ price: 120, quantity: 2 }] });
    expect(position().takeProfits).toEqual([{ price: 120, quantity: 2 }]);
  });
});
