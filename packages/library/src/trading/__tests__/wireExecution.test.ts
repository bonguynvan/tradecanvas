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
