import { describe, it, expect, beforeEach } from 'vitest';
import type { FillEvent, TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { sameSymbol } from '@tradecanvas/commons';
import { TradingBook, ofSymbol } from '../TradingBook.js';

const position = (id: string, over: Partial<TradingPosition> = {}): TradingPosition => ({ id, side: 'buy', entryPrice: 100, quantity: 1, ...over });
const order = (id: string, over: Partial<TradingOrder> = {}): TradingOrder => ({ id, side: 'buy', type: 'limit', price: 95, quantity: 1, ...over });
const fill = (orderId: string, over: Partial<FillEvent> = {}): FillEvent => ({ orderId, side: 'buy', price: 100, quantity: 1, time: 1, ...over });

let book: TradingBook;
beforeEach(() => {
  book = new TradingBook();
});

// A long of BTC was drawn on ETHUSDT after the symbol changed, its profit worked out from ETH's price.
describe('TradingBook: orders and positions', () => {
  it('keeps all it is given, of every symbol, as they were given', () => {
    const positions = [position('p1', { symbol: 'BTCUSDT' }), position('p2', { symbol: 'ETHUSDT' }), position('p3')];
    const orders = [order('o1', { symbol: 'ETHUSDT' }), order('o2')];
    book.setPositions(positions);
    book.setOrders(orders);
    expect(book.getPositions()).toEqual(positions);
    expect(book.getOrders()).toEqual(orders);
  });

  it('gives one that names no symbol none: a guess could keep a position off the chart of its own', () => {
    book.setPositions([position('p1')]);
    book.setOrders([order('o1')]);
    expect(book.getPositions()[0]).not.toHaveProperty('symbol');
    expect(book.getOrders()[0]).not.toHaveProperty('symbol');
  });

  it('holds lists of its own: changing what was given, or what it gives, changes nothing in it', () => {
    const given = [position('p1')];
    book.setPositions(given);
    given.push(position('p2'));
    book.getPositions().push(position('p3'));
    expect(book.getPositions().map((p) => p.id)).toEqual(['p1']);
  });
});

describe('TradingBook: fills', () => {
  it('takes a fill for its own symbol, else its position’s, its order’s, or the one shown as it came', () => {
    book.setPositions([position('p1', { symbol: 'BTCUSDT' })]);
    book.setOrders([order('o2', { symbol: 'BTCUSDT' })]);
    // All come while the chart shows ETH: a stop of the BTC long, the BTC order filled, and one nothing is known of.
    expect(book.addFill(fill('x', { positionId: 'p1' }), 'ETHUSDT').symbol).toBe('BTCUSDT');
    expect(book.addFill(fill('o2'), 'ETHUSDT').symbol).toBe('BTCUSDT');
    expect(book.addFill(fill('o9'), 'ETHUSDT').symbol).toBe('ETHUSDT');
    expect(book.addFill(fill('o9', { symbol: 'SOLUSDT' }), 'ETHUSDT').symbol).toBe('SOLUSDT');
  });

  it('names none on a fill while the chart shows no symbol, and leaves what it was given as it was', () => {
    const given = fill('o1');
    expect(book.addFill(given, '')).toBe(given);
    const told = book.addFill(given, 'BTCUSDT');
    expect(told).toEqual({ ...given, symbol: 'BTCUSDT' });
    expect(given).not.toHaveProperty('symbol');
  });

  it('keeps the latest thousand fills and the profit of them all', () => {
    for (let i = 0; i < 1005; i++) book.addFill(fill(`o${i}`, { pnl: 2 }), 'BTCUSDT');
    expect(book.getFills()).toHaveLength(1000);
    expect(book.getFills()[0].orderId).toBe('o5');
    expect(book.realisedPnl()).toBe(2010);
  });

  it('starts again with the fills it is given, and with none', () => {
    book.addFill(fill('o1', { pnl: 5 }), 'BTCUSDT');
    book.setFills([fill('o2', { pnl: 3 }), fill('o3', { pnl: -1 })], 'BTCUSDT');
    expect(book.getFills().map((f) => [f.orderId, f.symbol])).toEqual([['o2', 'BTCUSDT'], ['o3', 'BTCUSDT']]);
    expect(book.realisedPnl()).toBe(2);
    book.setFills([], 'BTCUSDT');
    expect(book.realisedPnl()).toBe(0);
  });
});

describe('ofSymbol: what a chart draws of an account', () => {
  const all = [position('a', { symbol: 'BTCUSDT' }), position('b', { symbol: 'ETHUSDT' }), position('c')];

  it('is what names its symbol, and what names none', () => {
    expect(ofSymbol(all, 'BTCUSDT').map((p) => p.id)).toEqual(['a', 'c']);
    expect(ofSymbol(all, 'ETHUSDT').map((p) => p.id)).toEqual(['b', 'c']);
  });

  it('is everything while the chart shows no symbol', () => {
    expect(ofSymbol(all, '').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  // An adapter said BTCUSDT and the chart showed BINANCE:BTCUSDT: the position was on no chart at all.
  it('takes a symbol under either of its names: with its venue, or its ticker alone, in any case', () => {
    expect(ofSymbol(all, 'BINANCE:BTCUSDT').map((p) => p.id)).toEqual(['a', 'c']);
    expect(ofSymbol(all, 'ethusdt').map((p) => p.id)).toEqual(['b', 'c']);
    expect(ofSymbol([position('v', { symbol: 'SIM:BTCUSDT' })], 'BINANCE:BTCUSDT')).toEqual([]);
  });
});

describe('sameSymbol', () => {
  it('is the same letters in any case', () => {
    expect(sameSymbol('BTCUSDT', 'btcusdt')).toBe(true);
    expect(sameSymbol('BTCUSDT', 'ETHUSDT')).toBe(false);
  });

  it('is the ticker where one alone names its venue', () => {
    expect(sameSymbol('BINANCE:BTCUSDT', 'BTCUSDT')).toBe(true);
    expect(sameSymbol('vcb', 'KBS:VCB')).toBe(true);
    expect(sameSymbol('HYPERLIQUID:xyz:NVDA', 'NVDA')).toBe(true);
    expect(sameSymbol('BINANCE:BTCUSDT', 'ETHUSDT')).toBe(false);
  });

  it('is the whole of each where both name a venue', () => {
    expect(sameSymbol('BINANCE:BTCUSDT', 'binance:btcusdt')).toBe(true);
    expect(sameSymbol('BINANCE:BTCUSDT', 'SIM:BTCUSDT')).toBe(false);
  });
});
