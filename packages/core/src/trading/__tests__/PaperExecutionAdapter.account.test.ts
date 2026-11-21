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
