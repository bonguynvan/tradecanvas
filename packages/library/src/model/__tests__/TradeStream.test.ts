import { describe, it, expect } from 'vitest';
import type { Trade } from '@tradecanvas/commons';
import { TradeStream } from '../TradeStream.js';

const trade = (time: number, volume = 1, price = 100): Trade => ({ time, price, volume, side: 'buy' });
const times = (trades: readonly Trade[]) => trades.map((t) => t.time);

describe('TradeStream', () => {
  it('tells the recent trades in the order they were made, then the live ones as they come', () => {
    const stream = new TradeStream();
    const { fresh, held } = stream.recent([trade(3), trade(1), trade(2)], 1000);
    expect(times(fresh)).toEqual([1, 2, 3]);
    expect(held).toEqual([]);
    expect(times(stream.live([trade(4), trade(5)]))).toEqual([4, 5]);
  });

  it('holds the live trades that come before the recent ones, and tells them after, apart, none twice', () => {
    const stream = new TradeStream();
    expect(stream.live([trade(5), trade(6)])).toEqual([]);
    // The recent ones end at 5: the live trade of that moment is the same trade.
    const { fresh, held } = stream.recent([trade(3), trade(4), trade(5)], 1000);
    expect(times(fresh)).toEqual([3, 4, 5]);
    expect(times(held)).toEqual([6]);
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
    stream.recent([trade(1), trade(2)], 1000);
    stream.live([trade(3)]);
    expect(times(stream.recent([trade(1), trade(2), trade(3), trade(4)], 1000).fresh)).toEqual([4]);
  });

  it('tells the trades it missed though later ones were told first, as after a dropped connection', () => {
    const stream = new TradeStream();
    stream.recent([trade(1), trade(2)], 1000);
    // The connection drops; trades 3 to 5 are made unseen; it comes back and a live trade is first to arrive.
    expect(times(stream.live([trade(6)]))).toEqual([6]);
    expect(times(stream.recent([trade(2), trade(3), trade(4), trade(5), trade(6)], 1000).fresh)).toEqual([3, 4, 5]);
  });

  it('tells two trades alike as two, and a third like them only when the feed has three', () => {
    const stream = new TradeStream();
    stream.recent([trade(1), trade(1)], 1000);
    expect(times(stream.recent([trade(1), trade(1)], 1000).fresh)).toEqual([]);
    expect(times(stream.recent([trade(1), trade(1), trade(1)], 1000).fresh)).toEqual([1]);
    // Alike in time, not in size: another trade.
    expect(stream.recent([trade(1), trade(1), trade(1), trade(1, 2)], 1000).fresh).toEqual([trade(1, 2)]);
  });

  it('holds again when told to: a feed followed anew waits for its recent trades once more', () => {
    const stream = new TradeStream();
    stream.recent([trade(1)], 1000);
    stream.hold();
    expect(stream.live([trade(3)])).toEqual([]);
    const { fresh, held } = stream.recent([trade(1), trade(2)], 1000);
    expect(times(fresh)).toEqual([2]);
    expect(times(held)).toEqual([3]);
  });

  it('says where the recent trades begin when the feed had more than it gave and they are all new', () => {
    const stream = new TradeStream();
    // As many as were asked for, none told before: the feed's list may begin part way through.
    expect(stream.recent([trade(10), trade(11)], 2)).toMatchObject({ begins: 10, before: null });
    // Fewer than asked for: the feed gave every trade it had.
    expect(new TradeStream().recent([trade(10), trade(11)], 1000)).toMatchObject({ begins: null, before: null });
    // The list reaches back to what was told: nothing is missing in between.
    expect(stream.recent([trade(11), trade(12)], 2)).toMatchObject({ begins: null, before: null });
    // It no longer does (a long break): the latest trade told before it is where the hole starts.
    expect(stream.recent([trade(30), trade(31)], 2)).toMatchObject({ begins: 30, before: 12 });
  });

  it('keeps the trades told lately, by the time they were made, those given by hand among them', () => {
    const stream = new TradeStream(4);
    stream.recent([trade(1), trade(2)], 1000);
    stream.live([trade(5)]);
    expect(times(stream.byHand([trade(4), trade(Number.NaN)]))).toEqual([4]);
    expect(times(stream.trades())).toEqual([1, 2, 4, 5]);
    // Over what it keeps, the oldest told go.
    stream.live([trade(6), trade(7)]);
    expect(times(stream.trades())).toEqual([4, 5, 6, 7]);
    // What it forgot it no longer knows as told.
    expect(times(stream.recent([trade(1), trade(7)], 1000).fresh)).toEqual([1]);
  });

  it('holds no more live trades than it may while the recent ones are on their way, the newest of them', () => {
    const stream = new TradeStream(1000, 3);
    stream.live([trade(1), trade(2), trade(3), trade(4), trade(5)]);
    expect(times(stream.noRecent())).toEqual([3, 4, 5]);
  });

  it('leaves out what is no trade', () => {
    const stream = new TradeStream();
    const bad = [trade(Number.NaN), { time: 2, price: Number.NaN, volume: 1 }, { time: 3, price: 100, volume: 0 }, { time: 4, price: -1, volume: 1 }];
    expect(times(stream.recent([...bad, trade(5)], 1000).fresh)).toEqual([5]);
    expect(times(stream.live([...bad, trade(6)]))).toEqual([6]);
    expect(stream.recent(undefined as unknown as Trade[], 1000).fresh).toEqual([]);
  });
});
