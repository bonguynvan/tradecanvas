import { describe, it, expect, beforeEach } from 'vitest';
import type { FillEvent, TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '../PaperExecutionAdapter.js';

let paper: PaperExecutionAdapter;
let orders: TradingOrder[];
let positions: TradingPosition[];
let fills: FillEvent[];

function account(options: ConstructorParameters<typeof PaperExecutionAdapter>[0] = { markPrice: 100 }): void {
  paper = new PaperExecutionAdapter(options);
  orders = [];
  positions = [];
  fills = [];
  paper.on<TradingOrder[]>('orders', (e) => { orders = e.data; });
  paper.on<TradingPosition[]>('positions', (e) => { positions = e.data; });
  paper.on<FillEvent>('fill', (e) => { fills.push(e.data); });
  paper.connect({});
}

beforeEach(() => account());

const BTC = 'BTCUSDT';
const ETH = 'ETHUSDT';

// The account was one market: a price of ETH filled, stopped and valued what was bought of BTC.
describe('PaperExecutionAdapter: what it makes is of the symbol the order named', () => {
  it('names it on the order, the position it opens and each fill', async () => {
    const order = await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, symbol: BTC });
    expect(order.symbol).toBe(BTC);
    expect(orders[0].symbol).toBe(BTC);
    paper.setMarkPrice(95, undefined, BTC);
    expect(positions[0].symbol).toBe(BTC);
    expect(fills.at(-1)?.symbol).toBe(BTC);
    await paper.closePosition({ positionId: positions[0].id });
    expect(fills.at(-1)).toMatchObject({ reason: 'close', symbol: BTC });
  });

  it('names none on what an order with no symbol makes, as before', async () => {
    const order = await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1 });
    expect(order).not.toHaveProperty('symbol');
    expect(positions[0]).not.toHaveProperty('symbol');
    expect(fills[0]).not.toHaveProperty('symbol');
  });
});

describe('PaperExecutionAdapter: a price is of one symbol', () => {
  it('fills an order only at a price of its own symbol', async () => {
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, symbol: BTC });
    // ETH at 3 is under BTC's limit, and is no price of BTC's.
    paper.setMarkPrice(3, undefined, ETH);
    expect(orders).toHaveLength(1);
    expect(positions).toHaveLength(0);
    paper.setMarkPrice(95, undefined, BTC);
    expect(orders).toHaveLength(0);
    expect(positions).toEqual([expect.objectContaining({ entryPrice: 95, symbol: BTC })]);
  });

  it('leaves a position’s stop, its profit and the account as they were when another symbol’s price comes', async () => {
    account({ markPrice: 100, balance: 1000, leverage: 10 });
    paper.setMarkPrice(100, undefined, BTC);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, stopLoss: 90, symbol: BTC });
    paper.setMarkPrice(3, undefined, ETH);
    expect(positions).toHaveLength(1);
    expect(paper.getAccount()).toMatchObject({ unrealisedPnl: 0, equity: 1000 });
    paper.setMarkPrice(104, undefined, BTC);
    expect(paper.getAccount()).toMatchObject({ unrealisedPnl: 4, equity: 1004 });
  });

  it('closes and reverses a position at its own symbol’s price, whatever came last', async () => {
    paper.setMarkPrice(100, undefined, BTC);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, symbol: BTC });
    paper.setMarkPrice(104, undefined, BTC);
    paper.setMarkPrice(3, undefined, ETH);
    await paper.reversePosition({ positionId: positions[0].id });
    expect(fills.at(-2)).toMatchObject({ reason: 'reverse', price: 104, pnl: 4 });
    expect(positions).toEqual([expect.objectContaining({ side: 'sell', entryPrice: 104, symbol: BTC })]);
    await paper.closePosition({ positionId: positions[0].id });
    expect(fills.at(-1)).toMatchObject({ reason: 'close', price: 104 });
  });

  it('fills a market order at its own symbol’s price, and at the order’s own with no price of its symbol yet', async () => {
    paper.setMarkPrice(100, undefined, BTC);
    paper.setMarkPrice(3, undefined, ETH);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100.5, quantity: 1, symbol: BTC });
    await paper.placeOrder({ side: 'buy', type: 'market', price: 20, quantity: 1, symbol: 'SOLUSDT' });
    expect(positions.map((p) => [p.symbol, p.entryPrice])).toEqual([[BTC, 100], ['SOLUSDT', 20]]);
  });

  it('does not stop a position out on another symbol’s price', async () => {
    account({ markPrice: 100, balance: 100, leverage: 10, stopOutLevel: 0.5 });
    paper.setMarkPrice(100, undefined, BTC);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 5, symbol: BTC });
    paper.setMarkPrice(3, undefined, ETH);
    expect(positions).toHaveLength(1);
    expect(fills.some((fill) => fill.reason === 'liquidation')).toBe(false);
  });

  it('keeps one net position a symbol on a net account', async () => {
    account({ markPrice: 100, positions: 'net' });
    paper.setMarkPrice(100, undefined, BTC);
    paper.setMarkPrice(3, undefined, ETH);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 2, symbol: BTC });
    await paper.placeOrder({ side: 'sell', type: 'market', price: 3, quantity: 1, symbol: ETH });
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, symbol: BTC });
    expect(positions.map((p) => [p.symbol, p.side, p.quantity])).toEqual([[BTC, 'buy', 3], [ETH, 'sell', 1]]);
  });
});

describe('PaperExecutionAdapter: told no symbol', () => {
  it('is one market, as it was: a price with no symbol works every order, named or not', async () => {
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, symbol: BTC });
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1 });
    paper.setMarkPrice(95);
    expect(orders).toHaveLength(0);
    expect(positions).toHaveLength(2);
  });

  it('values everything at a price that names none, whatever was known by symbol before it', async () => {
    account({ markPrice: 100, balance: 1000, leverage: 10 });
    paper.setMarkPrice(100, undefined, BTC);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 1, symbol: BTC });
    paper.setMarkPrice(104);
    expect(paper.getAccount()).toMatchObject({ unrealisedPnl: 4 });
    await paper.closePosition({ positionId: positions[0].id });
    expect(fills.at(-1)).toMatchObject({ reason: 'close', price: 104 });
  });

  it('works an order that names no symbol at a price of any', async () => {
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1 });
    paper.setMarkPrice(95, undefined, ETH);
    expect(positions).toHaveLength(1);
  });
});

// The margin of an order was counted against the first position held, whichever symbol's it was.
describe('PaperExecutionAdapter: a net account’s money, a symbol at a time', () => {
  beforeEach(() => {
    account({ markPrice: 100, balance: 1000, leverage: 1, positions: 'net' });
    paper.setMarkPrice(100, undefined, BTC);
    paper.setMarkPrice(100, undefined, ETH);
  });

  it('refuses an order of one symbol that only the closing of another’s position could pay for', async () => {
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 9, symbol: BTC });
    // 100 is free: a short of 5 ETH needs 500, and closes nothing of the long of BTC.
    await expect(paper.placeOrder({ side: 'sell', type: 'market', price: 100, quantity: 5, symbol: ETH })).rejects.toThrow();
    expect(positions.map((p) => [p.symbol, p.quantity])).toEqual([[BTC, 9]]);
  });

  it('takes an order that closes its own symbol’s position, whichever position was opened first', async () => {
    await paper.placeOrder({ side: 'sell', type: 'market', price: 100, quantity: 1, symbol: ETH });
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 8, symbol: BTC });
    // 100 is free, and selling the 8 BTC opens nothing: it needs none of it.
    await paper.placeOrder({ side: 'sell', type: 'market', price: 100, quantity: 8, symbol: BTC });
    expect(positions.map((p) => [p.symbol, p.side, p.quantity])).toEqual([[ETH, 'sell', 1]]);
  });
});

describe('PaperExecutionAdapter: one symbol under two names', () => {
  it('takes a price by its ticker for an order that names its venue, in any case, and no other venue’s', async () => {
    await paper.placeOrder({ side: 'buy', type: 'limit', price: 95, quantity: 1, symbol: 'BINANCE:BTCUSDT' });
    paper.setMarkPrice(95, undefined, 'SIM:BTCUSDT');
    expect(positions).toHaveLength(0);
    paper.setMarkPrice(95, undefined, 'btcusdt');
    expect(positions).toEqual([expect.objectContaining({ symbol: 'BINANCE:BTCUSDT', entryPrice: 95 })]);
    paper.setMarkPrice(99, undefined, 'BTCUSDT');
    await paper.closePosition({ positionId: positions[0].id });
    expect(fills.at(-1)).toMatchObject({ reason: 'close', price: 99 });
  });

  it('keeps one net position for a symbol named both ways', async () => {
    account({ markPrice: 100, positions: 'net' });
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 2, symbol: 'BINANCE:BTCUSDT' });
    await paper.placeOrder({ side: 'sell', type: 'market', price: 100, quantity: 1, symbol: 'BTCUSDT' });
    expect(positions.map((p) => [p.side, p.quantity])).toEqual([['buy', 1]]);
  });
});

describe('PaperExecutionAdapter: a position whose symbol has had no price', () => {
  it('is worth what it was opened at, and a stop-out closes it there', async () => {
    account({ markPrice: 100, balance: 200, leverage: 10, stopOutLevel: 0.5 });
    paper.setMarkPrice(100, undefined, BTC);
    await paper.placeOrder({ side: 'buy', type: 'market', price: 100, quantity: 5, symbol: BTC });
    await paper.placeOrder({ side: 'buy', type: 'market', price: 20, quantity: 50, symbol: 'SOLUSDT' });
    expect(paper.getAccount()).toMatchObject({ unrealisedPnl: 0, marginUsed: 150 });
    // The long of BTC loses 160: closing it leaves 40 against the 100 SOL holds, still under half.
    paper.setMarkPrice(68, undefined, BTC);
    expect(positions).toEqual([]);
    expect(fills.filter((fill) => fill.reason === 'liquidation').map((fill) => [fill.symbol, fill.price])).toEqual([[BTC, 68], ['SOLUSDT', 20]]);
  });
});
