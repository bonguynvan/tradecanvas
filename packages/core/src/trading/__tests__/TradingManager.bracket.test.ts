import { describe, it, expect, beforeEach } from 'vitest';
import { TradingManager } from '../TradingManager.js';

let manager: TradingManager;
let placed: unknown[];

beforeEach(() => {
  manager = new TradingManager();
  placed = [];
  manager.setEventCallback((event, data) => {
    if (event === 'bracketPlace') placed.push(data);
  });
});

describe('TradingManager — a bracket placed from a drawing’s levels', () => {
  it('reports the stop, the target and the quantity it was started with', () => {
    manager.startBracket('buy', 50, { stopLoss: 40, takeProfit: 70, quantity: 1.5 });
    expect(manager.confirmBracket()).toBe(true);
    expect(placed).toEqual([{ side: 'buy', entry: 50, stopLoss: 40, takeProfit: 70, quantity: 1.5, riskReward: 2 }]);
    expect(manager.isBracketActive()).toBe(false);
  });

  it('leaves the quantity out when it was started without one', () => {
    manager.startBracket('sell', 50);
    manager.confirmBracket();
    expect(placed).toEqual([{ side: 'sell', entry: 50, stopLoss: 50.5, takeProfit: 49, riskReward: 2 }]);
  });
});
