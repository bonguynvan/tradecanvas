import { describe, it, expect, beforeEach } from 'vitest';
import { TradingManager } from '../TradingManager.js';

let manager: TradingManager;
let events: { event: string; data: unknown }[];

beforeEach(() => {
  manager = new TradingManager();
  events = [];
  manager.setEventCallback((event, data) => events.push({ event, data }));
});

describe('a bracket placed through the manager', () => {
  it('goes out with the quantity it was sized with', () => {
    manager.startBracket('buy', 100, { quantity: 4 });
    expect(manager.getBracket()).toEqual(expect.objectContaining({ side: 'buy', entry: 100, quantity: 4 }));
    expect(manager.confirmBracket()).toBe(true);
    expect(events).toEqual([{ event: 'bracketPlace', data: expect.objectContaining({ side: 'buy', entry: 100, quantity: 4, riskReward: 2 }) }]);
  });

  it('goes out with no quantity when it has no size', () => {
    manager.startBracket('sell', 100);
    manager.confirmBracket();
    expect(events[0].data).not.toHaveProperty('quantity');
  });

  it('takes a size after it was started: the quantity a field was typed', () => {
    manager.startBracket('buy', 100);
    manager.setBracketSize({ risk: 10 }); // the stop a point away
    expect(manager.getBracket()?.quantity).toBe(10);
    manager.confirmBracket();
    expect(events[0].data).toEqual(expect.objectContaining({ quantity: 10 }));
  });

  it('has no bracket to read once it is confirmed or cancelled', () => {
    expect(manager.getBracket()).toBeNull();
    manager.startBracket('buy', 100, { quantity: 1 });
    manager.cancelBracket();
    expect(manager.getBracket()).toBeNull();
  });
});
