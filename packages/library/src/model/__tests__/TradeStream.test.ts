import { describe, it, expect } from 'vitest';
import type { Trade } from '@tradecanvas/commons';
import { TradeStream } from '../TradeStream.js';

const trade = (time: number, volume = 1): Trade => ({ time, price: 100, volume, side: 'buy' });
const times = (trades: readonly Trade[]) => trades.map((t) => t.time);

describe('TradeStream', () => {
  it('tells the recent trades in the order they were made, then the live ones as they come', () => {
    const stream = new TradeStream();
    expect(times(stream.recent([trade(3), trade(1), trade(2)]))).toEqual([1, 2, 3]);
    expect(times(stream.live([trade(4), trade(5)]))).toEqual([4, 5]);
    expect(stream.toldUntil()).toBe(5);
  });

  it('holds the live trades that come before the recent ones, and tells them after, none twice', () => {
    const stream = new TradeStream();
    expect(stream.live([trade(5), trade(6)])).toEqual([]);
    // The recent ones end at 5: the live trade of that moment is the same trade.
    expect(times(stream.recent([trade(3), trade(4), trade(5)]))).toEqual([3, 4, 5, 6]);
    expect(times(stream.live([trade(7)]))).toEqual([7]);
  });

  it('tells the live trades held when the feed has no recent ones to give', () => {
    const stream = new TradeStream();
    stream.live([trade(5)]);
    expect(times(stream.noRecent())).toEqual([5]);
    expect(times(stream.live([trade(6)]))).toEqual([6]);
    // Said again, there is nothing held.
    expect(stream.noRecent()).toEqual([]);
  });

  it('tells only what it has not told when the recent trades are asked for again', () => {
    const stream = new TradeStream();
    stream.recent([trade(1), trade(2)]);
    stream.live([trade(3)]);
    expect(times(stream.recent([trade(1), trade(2), trade(3), trade(4)]))).toEqual([4]);
  });

  it('carries on from where another left off: a feed followed again tells no trade a second time', () => {
    const first = new TradeStream();
    first.recent([trade(1), trade(2)]);
    const again = new TradeStream(first.toldUntil());
    expect(times(again.recent([trade(1), trade(2), trade(3)]))).toEqual([3]);
  });

  it('leaves out what has no time, and has told nothing before its first trade', () => {
    const stream = new TradeStream();
    expect(stream.toldUntil()).toBe(-Infinity);
    expect(times(stream.recent([trade(Number.NaN), trade(2)]))).toEqual([2]);
    expect(times(stream.live([trade(Number.NaN), trade(3)]))).toEqual([3]);
  });
});
