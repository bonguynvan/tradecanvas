import { describe, it, expect, beforeEach } from 'vitest';
import { wireExecution, type ExecutionHost, type ExecutionIntentType } from '../wireExecution.js';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import type { TradingOrder, TradingPosition, ExecutionError } from '@tradecanvas/commons';

/** A fake host that records render calls and lets tests fire intents. */
function makeHost() {
  const intents = new Map<ExecutionIntentType, Set<(p: unknown) => void>>();
  const errors: ExecutionError[] = [];
  let orders: TradingOrder[] = [];
  let positions: TradingPosition[] = [];

  const host: ExecutionHost = {
    onIntent: (type, handler) => {
      let set = intents.get(type);
      if (!set) {
        set = new Set();
        intents.set(type, set);
      }
      set.add(handler);
      return () => set!.delete(handler);
    },
    setOrders: (o) => {
      orders = o;
    },
    setPositions: (p) => {
      positions = p;
    },
    onError: (e) => {
      errors.push(e);
    },
  };

  return {
    host,
    errors,
    emit: (type: ExecutionIntentType, payload: unknown) => {
      for (const h of intents.get(type) ?? []) h(payload);
    },
    get orders() {
      return orders;
    },
    get positions() {
      return positions;
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('wireExecution', () => {
  let adapter: PaperExecutionAdapter;
  let h: ReturnType<typeof makeHost>;
  let teardown: () => void;

  beforeEach(() => {
    adapter = new PaperExecutionAdapter({ markPrice: 100 });
    h = makeHost();
    teardown = wireExecution(adapter, h.host);
    adapter.connect({});
  });

  it('routes a market order intent and renders the resulting position', async () => {
    h.emit('orderPlace', { side: 'buy', type: 'market', price: 100, quantity: 1 });
    await flush();
    expect(h.positions).toHaveLength(1);
    expect(h.positions[0]).toMatchObject({ side: 'buy', entryPrice: 100, quantity: 1 });
  });

  it('renders a pending limit order from the adapter', async () => {
    h.emit('orderPlace', { side: 'buy', type: 'limit', price: 95, quantity: 1 });
    await flush();
    expect(h.orders).toHaveLength(1);
    expect(h.positions).toHaveLength(0);
  });

  it('routes positionClose to the adapter', async () => {
    h.emit('orderPlace', { side: 'buy', type: 'market', price: 100, quantity: 1 });
    await flush();
    const id = h.positions[0].id;

    h.emit('positionClose', { positionId: id });
    await flush();
    expect(h.positions).toHaveLength(0);
  });

  it('routes positionModify (SL/TP edit) to the adapter', async () => {
    h.emit('orderPlace', { side: 'buy', type: 'market', price: 100, quantity: 1 });
    await flush();
    const id = h.positions[0].id;

    h.emit('positionModify', { positionId: id, stopLoss: 90 });
    await flush();
    expect(h.positions[0].stopLoss).toBe(90);
  });

  it('stops routing and rendering after teardown', async () => {
    teardown();
    h.emit('orderPlace', { side: 'buy', type: 'market', price: 100, quantity: 1 });
    await flush();
    expect(h.positions).toHaveLength(0);
  });
});

describe('wireExecution: reverse and fills', () => {
  it('reverses through the adapter’s own reversePosition', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    const h = makeHost();
    const fills: unknown[] = [];
    h.host.onFill = (f) => fills.push(f);
    wireExecution(adapter, h.host);
    adapter.connect({});
    h.emit('orderPlace', { side: 'buy', type: 'market', price: 100, quantity: 2 });
    await flush();
    h.emit('positionReverse', { positionId: h.positions[0].id });
    await flush();
    expect(h.positions).toEqual([expect.objectContaining({ side: 'sell', quantity: 2 })]);
    expect(fills).toHaveLength(3); // open, close by the reverse, open the other way
  });

  it('closes and places a market order when the adapter can’t reverse', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    (adapter as { reversePosition?: unknown }).reversePosition = undefined;
    const h = makeHost();
    wireExecution(adapter, h.host);
    adapter.connect({});
    h.emit('orderPlace', { side: 'sell', type: 'market', price: 100, quantity: 1 });
    await flush();
    h.emit('positionReverse', { positionId: h.positions[0].id });
    await flush();
    expect(h.positions).toEqual([expect.objectContaining({ side: 'buy', quantity: 1 })]);
  });

  it('reports an error for a position it doesn’t know', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    (adapter as { reversePosition?: unknown }).reversePosition = undefined;
    const h = makeHost();
    wireExecution(adapter, h.host);
    adapter.connect({});
    h.emit('positionReverse', { positionId: 'nope' });
    await flush();
    expect(h.errors).toHaveLength(1);
  });
});

describe('wireExecution and a confirmed bracket', () => {
  const bracket = { side: 'buy', entry: 95, stopLoss: 90, takeProfit: 105, quantity: 2, riskReward: 2 };

  /** A host at a market price of 100 that records the brackets the adapter took. */
  const wired = (options?: Parameters<typeof wireExecution>[2], adapter = new PaperExecutionAdapter({ markPrice: 100 })) => {
    const h = makeHost();
    const taken: unknown[][] = [];
    h.host.marketPrice = () => 100;
    h.host.onBracketOrder = (order, placed) => taken.push([order, placed]);
    wireExecution(adapter, h.host, options);
    adapter.connect({});
    return { h, taken, adapter, emit: (payload: unknown) => h.emit('bracketPlace' as ExecutionIntentType, payload) };
  };

  it('sends it to the adapter as one order, its stop-loss and take-profit on it, when asked to', async () => {
    const { h, taken, emit } = wired({ brackets: 'place' });
    emit(bracket);
    await flush();
    expect(h.orders).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 95, quantity: 2, stopLoss: 90, takeProfit: 105 })]);
    expect(taken).toEqual([[expect.objectContaining({ price: 95 }), bracket]]);
  });

  it('makes the entry a stop order past the price, as a broker would take it', async () => {
    const { h, emit } = wired({ brackets: 'place' });
    emit({ ...bracket, entry: 102, stopLoss: 98, takeProfit: 110 });
    emit({ side: 'sell', entry: 97, stopLoss: 99, takeProfit: 93, quantity: 1, riskReward: 2 });
    await flush();
    expect(h.orders.map((o) => [o.side, o.type])).toEqual([['buy', 'stop'], ['sell', 'stop']]);
  });

  it('sends no bracket without a quantity: a size no one saw is not placed', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    const asked: unknown[] = [];
    adapter.placeOrder = (intent) => { asked.push(intent); return Promise.reject(new Error('not asked')); };
    const { h, emit } = wired({ brackets: 'place' }, adapter);
    const { quantity: _, ...noQuantity } = bracket;
    emit(noQuantity);
    emit({ ...bracket, quantity: 0 });
    await flush();
    expect(asked).toEqual([]);
    expect(h.errors).toEqual([
      expect.objectContaining({ command: 'bracketPlace', reason: 'noQuantity' }),
      expect.objectContaining({ command: 'bracketPlace', reason: 'noQuantity' }),
    ]);
  });

  it('sends no bracket with no price to tell a limit entry from a stop', async () => {
    const { h, taken, emit } = wired({ brackets: 'place' });
    h.host.marketPrice = () => null;
    emit(bracket);
    await flush();
    expect(h.orders).toEqual([]);
    expect(taken).toEqual([]);
    expect(h.errors).toEqual([expect.objectContaining({ command: 'bracketPlace', reason: 'noPrice' })]);
  });

  it('tells nothing of a bracket the adapter took after it was disconnected', async () => {
    const h = makeHost();
    const taken: unknown[] = [];
    h.host.marketPrice = () => 100;
    h.host.onBracketOrder = (order) => taken.push(order);
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    const teardown = wireExecution(adapter, h.host, { brackets: 'place' });
    adapter.connect({});
    h.emit('bracketPlace' as ExecutionIntentType, bracket);
    teardown();
    await flush();
    expect(taken).toEqual([]);
  });

  it('only emits it, as before, without being asked to send it', async () => {
    for (const options of [undefined, { brackets: 'event' as const }]) {
      const { h, taken, emit } = wired(options);
      emit(bracket);
      await flush();
      expect(h.orders).toEqual([]);
      expect(taken).toEqual([]);
    }
  });

  it('reports a bracket the adapter refuses', async () => {
    const adapter = new PaperExecutionAdapter({ markPrice: 100 });
    adapter.placeOrder = () => Promise.reject(new Error('margin'));
    const { h, taken, emit } = wired({ brackets: 'place' }, adapter);
    emit(bracket);
    await flush();
    expect(taken).toEqual([]);
    expect(h.errors).toEqual([expect.objectContaining({ message: 'Execution command failed: bracketPlace' })]);
  });
});
