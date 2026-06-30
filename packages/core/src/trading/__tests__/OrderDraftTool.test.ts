import { describe, it, expect } from 'vitest';
import { OrderDraftTool, inferOrderType } from '../OrderDraftTool.js';

describe('inferOrderType', () => {
  it('buy below market is a limit, above is a stop', () => {
    expect(inferOrderType('buy', 95, 100)).toBe('limit');
    expect(inferOrderType('buy', 105, 100)).toBe('stop');
  });

  it('sell above market is a limit, below is a stop', () => {
    expect(inferOrderType('sell', 105, 100)).toBe('limit');
    expect(inferOrderType('sell', 95, 100)).toBe('stop');
  });

  it('at market resolves to limit', () => {
    expect(inferOrderType('buy', 100, 100)).toBe('limit');
    expect(inferOrderType('sell', 100, 100)).toBe('limit');
  });

  it('defaults to limit with no market price', () => {
    expect(inferOrderType('buy', 100, null)).toBe('limit');
    expect(inferOrderType('sell', 100, null)).toBe('limit');
  });
});

describe('OrderDraftTool', () => {
  it('starts, exposes a copied draft, and clears', () => {
    const tool = new OrderDraftTool();
    expect(tool.isActive()).toBe(false);

    tool.start('buy', 100, 2);
    expect(tool.isActive()).toBe(true);

    const draft = tool.getDraft();
    expect(draft).toEqual({ side: 'buy', price: 100, quantity: 2 });

    // getDraft returns a copy — mutating it must not affect the tool
    draft!.price = 0;
    expect(tool.getDraft()!.price).toBe(100);

    tool.cancel();
    expect(tool.isActive()).toBe(false);
    expect(tool.getDraft()).toBeNull();
  });

  it('setPrice updates an active draft only', () => {
    const tool = new OrderDraftTool();
    expect(tool.setPrice(123)).toBe(false);

    tool.start('sell', 100);
    expect(tool.setPrice(110)).toBe(true);
    expect(tool.getDraft()!.price).toBe(110);
  });

  it('toIntent builds a place intent with the inferred type', () => {
    const tool = new OrderDraftTool();
    expect(tool.toIntent(100)).toBeNull();

    tool.start('buy', 95, 3);
    expect(tool.toIntent(100)).toEqual({ side: 'buy', type: 'limit', price: 95, quantity: 3 });

    tool.setPrice(105);
    expect(tool.toIntent(100)).toEqual({ side: 'buy', type: 'stop', price: 105, quantity: 3 });
    expect(tool.toIntent(null)).toEqual({ side: 'buy', type: 'limit', price: 105, quantity: 3 });
  });
});
