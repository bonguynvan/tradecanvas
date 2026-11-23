import { describe, it, expect } from 'vitest';
import { PaperExecutionAdapter, type PaperExecutionOptions } from '../PaperExecutionAdapter.js';
import type { AccountSummary, ExecutionError, FillEvent } from '@tradecanvas/commons';

function connect(options: PaperExecutionOptions) {
  const adapter = new PaperExecutionAdapter({ markPrice: 100, ...options });
  const fills: FillEvent[] = [];
  const accounts: AccountSummary[] = [];
  const errors: ExecutionError[] = [];
  adapter.on<FillEvent>('fill', (e) => fills.push(e.data));
  adapter.on<AccountSummary>('account', (e) => accounts.push(e.data));
  adapter.on<ExecutionError>('error', (e) => errors.push(e.data));
  adapter.connect({});
  const market = (side: 'buy' | 'sell', quantity: number, extra: object = {}) => adapter.placeOrder({ side, type: 'market', price: 100, quantity, ...extra });
  return { adapter, fills, accounts, errors, market };
}

describe('PaperExecutionAdapter: an account with money in it', () => {
  it('has no account unless it is given a balance', async () => {
    const { adapter, accounts, market } = connect({});
    await market('buy', 1);
    expect(adapter.getAccount()).toBeNull();
    expect(accounts).toEqual([]);
  });

  it('starts with its balance, all of it free, and says so on connecting', () => {
    const { adapter, accounts } = connect({ balance: 10_000 });
    const start = { balance: 10_000, equity: 10_000, unrealisedPnl: 0, realisedPnl: 0, marginUsed: 0, freeMargin: 10_000, commission: 0 };
    expect(adapter.getAccount()).toEqual(start);
    expect(accounts).toEqual([start]);
  });

  it('holds a position’s value as margin, and counts its open profit in the equity as the price moves', async () => {
    const { adapter, accounts, market } = connect({ balance: 10_000 });
    await market('buy', 2);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 10_000, marginUsed: 200, freeMargin: 9_800 }));
    const before = accounts.length;
    adapter.setMarkPrice(110);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 10_000, unrealisedPnl: 20, equity: 10_020, marginUsed: 200, freeMargin: 9_820 }));
    expect(accounts.length).toBe(before + 1);
    expect(accounts.at(-1)).toEqual(adapter.getAccount());
  });

  it('puts what a close realises in the balance, and frees its margin', async () => {
    const { adapter, market } = connect({ balance: 10_000 });
    await market('sell', 2);
    adapter.setMarkPrice(95);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getAccount()).toEqual({ balance: 10_010, equity: 10_010, unrealisedPnl: 0, realisedPnl: 10, marginUsed: 0, freeMargin: 10_010, commission: 0 });
  });

  it('takes a stop-loss’s loss from the balance', async () => {
    const { adapter, market } = connect({ balance: 1_000 });
    await market('buy', 1, { stopLoss: 90 });
    adapter.setMarkPrice(89);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 990, realisedPnl: -10, marginUsed: 0 }));
  });

  it('says nothing new of the account when a price changes nothing in it', () => {
    const { adapter, accounts } = connect({ balance: 10_000 });
    adapter.setMarkPrice(101);
    adapter.setMarkPrice(102);
    expect(accounts).toHaveLength(1);
  });
});

describe('PaperExecutionAdapter: what trading costs', () => {
  it('charges a part of each fill’s value, on the way in and on the way out, and writes it on the fill', async () => {
    const { adapter, fills, market } = connect({ balance: 10_000, commission: { rate: 0.001 } });
    await market('buy', 2);
    expect(fills[0].commission).toBeCloseTo(0.2, 10);
    expect(adapter.getAccount()!.balance).toBeCloseTo(9_999.8, 10);
    adapter.setMarkPrice(110);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(fills[1].commission).toBeCloseTo(0.22, 10);
    const account = adapter.getAccount()!;
    expect(account.commission).toBeCloseTo(0.42, 10);
    expect(account.realisedPnl).toBe(20);
    expect(account.balance).toBeCloseTo(10_000 + 20 - 0.42, 10);
  });

  it('charges by the unit, and no less than its least', async () => {
    const { fills, market } = connect({ balance: 10_000, commission: { perUnit: 0.5, min: 2 } });
    await market('buy', 1);
    await market('buy', 10);
    expect(fills.map((f) => f.commission)).toEqual([2, 5]);
  });

  it('writes no commission on a fill when there is none to pay', async () => {
    const { fills, market } = connect({ balance: 10_000 });
    await market('buy', 1);
    expect(fills[0]).not.toHaveProperty('commission');
  });
});

describe('PaperExecutionAdapter: the market’s multiplier', () => {
  it('takes the chart’s market’s when it was given none of its own', async () => {
    const { adapter, fills, market } = connect({ balance: 10_000_000 });
    adapter.setMultiplier(1000);
    await market('buy', 100);
    expect(adapter.getAccount()!.marginUsed).toBe(10_000_000);
    adapter.setMarkPrice(101);
    expect(adapter.getAccount()!.unrealisedPnl).toBe(100_000);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(fills[1].pnl).toBe(100_000);
    // A market with none: the price is the money again.
    adapter.setMultiplier(undefined);
    adapter.setMarkPrice(100);
    await market('buy', 1);
    expect(adapter.getAccount()!.marginUsed).toBe(100);
  });

  it('keeps its own where one was given it', async () => {
    const { adapter, market } = connect({ balance: 100_000, multiplier: 10 });
    adapter.setMultiplier(1000);
    await market('buy', 2);
    expect(adapter.getAccount()!.marginUsed).toBe(2_000);
  });
});

// The account held one multiplier for every position, and the chart's market set it: looking at
// another market revalued what was open, booked the wrong profit and could close it out.
describe('PaperExecutionAdapter: a position keeps what its price was worth when it opened', () => {
  it('books the profit of its own market after the chart’s market changes', async () => {
    const { adapter, fills, market } = connect({ markPrice: 26.4, balance: 10_000_000 });
    adapter.setMultiplier(1000);
    await market('buy', 100);
    adapter.setMarkPrice(27.4);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ marginUsed: 2_640_000 }));
    expect(adapter.getAccount()!.unrealisedPnl).toBeCloseTo(100_000, 6);
    // The chart shows a market with no multiplier: the position is what it was.
    adapter.setMultiplier(undefined);
    expect(adapter.getAccount()!.marginUsed).toBe(2_640_000);
    expect(adapter.getAccount()!.unrealisedPnl).toBeCloseTo(100_000, 6);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(fills[1].pnl).toBeCloseTo(100_000, 6);
    expect(adapter.getAccount()!.balance).toBeCloseTo(10_100_000, 6);
  });

  it('is not called for margin because the chart shows a futures market', async () => {
    const { adapter, market } = connect({ markPrice: 26.4, balance: 10_000_000, marginCallLevel: 1, stopOutLevel: 0.5 });
    const calls: unknown[] = [];
    adapter.on('marginCall', (e) => calls.push(e.data));
    adapter.setMultiplier(1000);
    await market('buy', 100);
    adapter.setMultiplier(100_000);
    adapter.setMarkPrice(26.41);
    expect(calls).toEqual([]);
    expect(adapter.getPositions()).toHaveLength(1);
    expect(adapter.getPositions()[0].multiplier).toBe(1000);
  });

  it('keeps for a waiting order what its price was worth when it was placed', async () => {
    const { adapter } = connect({ markPrice: 26.4, balance: 100_000_000 });
    adapter.setMultiplier(1000);
    await adapter.placeOrder({ side: 'buy', type: 'limit', quantity: 100, price: 26 });
    // The chart shows another market before the price comes.
    adapter.setMultiplier(undefined);
    adapter.setMarkPrice(26);
    expect(adapter.getPositions()[0].multiplier).toBe(1000);
    expect(adapter.getAccount()!.marginUsed).toBe(2_600_000);
  });

  it('turns a position into one of the same market, whatever the chart shows', async () => {
    const { adapter, market } = connect({ markPrice: 26.4, balance: 100_000_000 });
    adapter.setMultiplier(1000);
    await market('buy', 100);
    adapter.setMultiplier(undefined);
    await adapter.reversePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getPositions()).toHaveLength(1);
    expect(adapter.getPositions()[0]).toEqual(expect.objectContaining({ side: 'sell', multiplier: 1000 }));
  });

  it('stops out the position that loses the most money, not the most points', async () => {
    const { adapter, market } = connect({ markPrice: 100, balance: 1_500_000, stopOutLevel: 0.9 });
    const closed: string[] = [];
    adapter.on<FillEvent>('fill', (e) => { if (e.data.reason === 'liquidation') closed.push(e.data.positionId!); });
    await market('buy', 1000); // a price worth 1: down 5 a share is 5,000
    adapter.setMultiplier(1000);
    await market('buy', 10); // a price worth 1,000: down 5 is 50,000
    const [cheap, dear] = adapter.getPositions();
    adapter.setMarkPrice(40);
    expect(closed[0]).toBe(dear.id);
    expect(closed).not.toContain(cheap.id);
  });

  it('counts an order at the multiplier its intent carries, whatever was said last', async () => {
    const { adapter } = connect({ markPrice: 26.4, balance: 100_000_000 });
    adapter.setMultiplier(undefined);
    await adapter.placeOrder({ side: 'buy', type: 'market', quantity: 100, price: 26.4, multiplier: 1000 });
    expect(adapter.getPositions()[0].multiplier).toBe(1000);
    expect(adapter.getAccount()!.marginUsed).toBe(2_640_000);
    // An account given its own keeps it.
    const own = connect({ markPrice: 26.4, balance: 100_000_000, multiplier: 10 });
    await own.adapter.placeOrder({ side: 'buy', type: 'market', quantity: 100, price: 26.4, multiplier: 1000 });
    expect(own.adapter.getAccount()!.marginUsed).toBe(26_400);
  });

  it('forgets what an order and a position were worth once they are gone', async () => {
    const { adapter, market } = connect({ markPrice: 100, balance: 1_000_000 });
    adapter.setMultiplier(1000);
    for (let i = 0; i < 5; i++) {
      await market('buy', 1);
      await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    }
    await market('buy', 1);
    const kept = adapter as unknown as { orderWorth: Map<string, number>; openedWorth: Map<string, number> };
    expect(kept.openedWorth.size).toBe(1);
    expect(kept.orderWorth.size).toBeLessThanOrEqual(1);
  });

  it('says on what was open what it was opened at, once a chart tells it a multiplier', async () => {
    const { adapter, market } = connect({ markPrice: 100, balance: 1_000_000 });
    await market('buy', 2);
    expect(adapter.getPositions()[0].multiplier).toBeUndefined();
    adapter.setMultiplier(1000);
    expect(adapter.getPositions()[0].multiplier).toBe(1);
    expect(adapter.getAccount()!.marginUsed).toBe(200);
  });
});

describe('PaperExecutionAdapter: leverage and a contract’s multiplier', () => {
  it('holds a part of a position’s value as margin: the value over the leverage', async () => {
    const { adapter, market } = connect({ balance: 1_000, leverage: 10 });
    await market('buy', 20);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ marginUsed: 200, freeMargin: 800 }));
  });

  it('counts a point as the multiplier’s worth, in the profit, the margin and the commission', async () => {
    const { adapter, fills, market } = connect({ balance: 100_000, multiplier: 100, leverage: 5, commission: { rate: 0.001 } });
    await market('buy', 2);
    expect(adapter.getAccount()!.marginUsed).toBe(4_000);
    expect(fills[0].commission).toBeCloseTo(20, 10);
    adapter.setMarkPrice(101);
    expect(adapter.getAccount()!.unrealisedPnl).toBe(200);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(fills[1].pnl).toBe(200);
  });
});

describe('PaperExecutionAdapter: an order the account cannot carry', () => {
  it('is refused, and nothing is opened', async () => {
    const { adapter, fills, market } = connect({ balance: 150 });
    await expect(market('buy', 2)).rejects.toThrow(/margin/i);
    expect(adapter.getPositions()).toEqual([]);
    expect(fills).toEqual([]);
    await market('buy', 1);
    await expect(market('buy', 1)).rejects.toThrow(/margin/i);
  });

  it('says what the order needs and what the account has, to the cent', async () => {
    const { market } = connect({ balance: 1_000 / 3 });
    await expect(market('buy', 5)).rejects.toThrow('Not enough free margin: the order needs 500, the account has 333.33');
  });

  it('is refused as a waiting order too, by the price it waits at', async () => {
    const { adapter } = connect({ balance: 150 });
    await expect(adapter.placeOrder({ side: 'buy', type: 'limit', price: 90, quantity: 2 })).rejects.toThrow(/margin/i);
    expect(adapter.getOrders()).toEqual([]);
  });

  it('is cancelled when the money it needed has gone by the time its price comes, and says so', async () => {
    const { adapter, errors, market } = connect({ balance: 150 });
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 90, quantity: 1 });
    await market('buy', 1);
    adapter.setMarkPrice(89);
    expect(adapter.getOrders()).toEqual([]);
    expect(adapter.getPositions()).toHaveLength(1);
    expect(errors).toEqual([expect.objectContaining({ message: expect.stringMatching(/margin/i) })]);
  });

  it('counts the commission in what an order needs', async () => {
    const { market } = connect({ balance: 100, commission: { min: 1 } });
    await expect(market('buy', 1)).rejects.toThrow(/margin/i);
  });

  it('needs no margin to take from a net position, only for what turns it round', async () => {
    const { adapter, market } = connect({ balance: 250, positions: 'net' });
    await market('buy', 2);
    await market('sell', 1);
    expect(adapter.getPositions()[0].quantity).toBe(1);
    await expect(market('sell', 5)).rejects.toThrow(/margin/i);
    await market('sell', 3);
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'sell', quantity: 2 })]);
  });

  it('closes a position whatever the account holds', async () => {
    const { adapter, market } = connect({ balance: 100 });
    await market('buy', 1);
    adapter.setMarkPrice(10);
    await adapter.closePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 10, marginUsed: 0 }));
  });
});

describe('PaperExecutionAdapter: the account through every way a position changes', () => {
  it('charges a reverse twice, the close and the opening, and keeps the margin of the position turned', async () => {
    const { adapter, fills, market } = connect({ balance: 10_000, commission: { min: 1 } });
    await market('buy', 2);
    adapter.setMarkPrice(110);
    await adapter.reversePosition({ positionId: adapter.getPositions()[0].id });
    expect(fills.map((f) => f.commission)).toEqual([1, 1, 1]);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 10_000 + 20 - 3, realisedPnl: 20, commission: 3, marginUsed: 220 }));
  });

  it('reverses a position when what the close leaves carries the one it opens', async () => {
    const { adapter, market } = connect({ balance: 1_000 });
    await market('buy', 10);
    adapter.setMarkPrice(90);
    // The close leaves 900, and ten at 90 hold 900.
    await adapter.reversePosition({ positionId: adapter.getPositions()[0].id });
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ side: 'sell', quantity: 10, entryPrice: 90 })]);
  });

  it('refuses a reverse the account cannot carry, and leaves the position as it was', async () => {
    const { adapter, fills, market } = connect({ balance: 1_000, commission: { rate: 0.06 } });
    await market('buy', 9);
    // 946 left after the first commission. A reverse costs 54 to close and 54 to open, and holds 900.
    const before = adapter.getPositions()[0];
    await expect(adapter.reversePosition({ positionId: before.id })).rejects.toThrow(/margin/i);
    expect(adapter.getPositions()).toEqual([before]);
    expect(fills).toHaveLength(1);
  });

  it('realises and charges on a net position turned round, and holds the margin of what is left', async () => {
    const { adapter, fills, market } = connect({ balance: 10_000, positions: 'net', commission: { perUnit: 1 } });
    await market('buy', 2);
    await market('buy', 1);
    expect(adapter.getAccount()!.marginUsed).toBe(300);
    adapter.setMarkPrice(110);
    await market('sell', 5);
    expect(fills.at(-1)).toEqual(expect.objectContaining({ pnl: 30, commission: 5 }));
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ realisedPnl: 30, commission: 8, balance: 10_000 + 30 - 8, marginUsed: 220, unrealisedPnl: 0 }));
  });

  it('puts a take-profit’s gain and a trailed stop’s in the balance', async () => {
    const { adapter, market } = connect({ balance: 1_000 });
    await market('buy', 1, { takeProfit: 105 });
    adapter.setMarkPrice(106);
    expect(adapter.getAccount()!.balance).toBe(1_005);
    await market('buy', 1, { stopLoss: 100, trailingStop: 6 });
    adapter.setMarkPrice(120);
    adapter.setMarkPrice(113);
    expect(adapter.getAccount()).toEqual(expect.objectContaining({ balance: 1_005 + 8, marginUsed: 0 }));
  });

  it('sizes a stop order by its stop, on placing it and when its price comes', async () => {
    const { adapter, errors } = connect({ balance: 1_000 });
    // It fills at its stop, 120: ten of them hold 1200.
    await expect(adapter.placeOrder({ side: 'buy', type: 'stop', price: 90, stopPrice: 120, quantity: 10 })).rejects.toThrow(/margin/i);
    await adapter.placeOrder({ side: 'buy', type: 'stop', price: 120, stopPrice: 100.5, quantity: 9 });
    adapter.setMarkPrice(101);
    expect(errors).toEqual([]);
    expect(adapter.getPositions()).toHaveLength(1);
  });

  it('sizes an order that fills at once by the price there is, not by its limit', async () => {
    const { adapter } = connect({ balance: 1_000 });
    await adapter.placeOrder({ side: 'buy', type: 'limit', price: 105, quantity: 10, timeInForce: 'ioc' });
    expect(adapter.getPositions()).toEqual([expect.objectContaining({ entryPrice: 100, quantity: 10 })]);
  });

  it('tells the account before the fill and the positions, so what reads it then reads it as it is', async () => {
    const { adapter, market } = connect({ balance: 1_000, commission: { min: 1 } });
    const seen: [string, number][] = [];
    adapter.on('fill', () => seen.push(['fill', adapter.getAccount()!.balance]));
    adapter.on('positions', () => seen.push(['positions', adapter.getAccount()!.marginUsed]));
    const order: string[] = [];
    for (const type of ['account', 'fill', 'positions'] as const) adapter.on(type, () => order.push(type));
    await market('buy', 2);
    expect(seen).toEqual([['fill', 999], ['positions', 200]]);
    expect(order).toEqual(['account', 'fill', 'positions']);
  });

  it('carries an order that needs all there is, to the last digit of a large account', async () => {
    const { adapter, market } = connect({ balance: 30_000_000.3, leverage: 3 });
    await market('buy', 900_000.009);
    expect(adapter.getPositions()).toHaveLength(1);
  });

  it('starts again from its balance when it is connected again, with what it holds', () => {
    const { adapter, accounts } = connect({ balance: 500 });
    adapter.connect({});
    expect(accounts).toHaveLength(1);
    expect(adapter.getAccount()!.balance).toBe(500);
  });
});
