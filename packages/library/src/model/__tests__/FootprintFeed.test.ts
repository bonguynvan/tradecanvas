import { describe, it, expect } from 'vitest';
import type { OHLCBar, Trade } from '@tradecanvas/commons';
import { FootprintStore } from '@tradecanvas/core';
import { FootprintFeed, barOfTrade, rowSizeOf } from '../FootprintFeed.js';

const MIN = 60_000;
const T0 = Date.UTC(2025, 0, 6);
const bars = (n: number, step = MIN): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * step, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
const trade = (time: number, price = 100, volume = 1, side: Trade['side'] = 'buy'): Trade => ({ time, price, volume, side });

function setup(series: OHLCBar[] = bars(5), span = MIN) {
  const store = new FootprintStore();
  store.setRowSize(1);
  const feed = new FootprintFeed(store, (time) => barOfTrade(series, time, span));
  const bought = (time: number) => store.get(time)?.levels.reduce((sum, level) => sum + level.buy, 0) ?? 0;
  return { store, feed, series, bought };
}

describe('which bar a trade is of', () => {
  const series = bars(5);

  it('is the last bar that had opened when it was made', () => {
    expect(barOfTrade(series, T0, MIN)).toBe(T0);
    expect(barOfTrade(series, T0 + MIN - 1, MIN)).toBe(T0);
    expect(barOfTrade(series, T0 + 2 * MIN + 5, MIN)).toBe(T0 + 2 * MIN);
    expect(barOfTrade(series, T0 + 4 * MIN + 59_999, MIN)).toBe(T0 + 4 * MIN);
  });

  it('is none for a trade from before the first bar', () => {
    expect(barOfTrade(series, T0 - 1, MIN)).toBeNull();
  });

  it('is a bar still to come for a trade made after the last bar ended, and when there are no bars yet', () => {
    expect(barOfTrade(series, T0 + 5 * MIN, MIN)).toBe('later');
    expect(barOfTrade([], T0, MIN)).toBe('later');
  });

  it('is the last bar, however late, where a bar has no set length', () => {
    expect(barOfTrade(series, T0 + 50 * MIN, Infinity)).toBe(T0 + 4 * MIN);
  });

  it('reads bars whose times are in seconds', () => {
    const inSeconds = series.map((bar) => ({ ...bar, time: bar.time / 1000 }));
    expect(barOfTrade(inSeconds, T0 + 2 * MIN + 5, MIN)).toBe(T0 + 2 * MIN);
  });

  it('puts a trade in a gap of the bars in the bar before the gap, while that bar lasts', () => {
    const gapped = [series[0], series[3]];
    expect(barOfTrade(gapped, T0 + 30_000, MIN)).toBe(T0);
    // The bar it was made in is not there: it is of none.
    expect(barOfTrade(gapped, T0 + MIN + 30_000, MIN)).toBeNull();
  });
});

describe('FootprintFeed', () => {
  it('holds the live trades until the recent ones are in, then counts those made after them', () => {
    const { feed, store, bought } = setup();
    feed.live([trade(T0 + 2 * MIN + 10, 100, 4), trade(T0 + 2 * MIN + 20, 100, 8)]);
    expect(store.bars()).toEqual([]);
    // The feed's recent trades end at +2m10: the live one of that moment is the same trade.
    feed.history([trade(T0 + MIN + 1, 100, 1), trade(T0 + 2 * MIN + 10, 100, 4)], 1000);
    expect(bought(T0 + MIN)).toBe(1);
    expect(bought(T0 + 2 * MIN)).toBe(12);
    // From then on live trades go straight in.
    feed.live([trade(T0 + 2 * MIN + 30, 100, 2)]);
    expect(bought(T0 + 2 * MIN)).toBe(14);
  });

  it('leaves out the bar the recent trades began part way through, when the feed had more than it gave', () => {
    const { feed, store, bought } = setup();
    feed.history([trade(T0 + MIN + 40_000, 100, 5), trade(T0 + MIN + 50_000, 100, 5), trade(T0 + 2 * MIN + 1, 100, 3)], 3);
    expect(store.get(T0 + MIN)).toBeNull();
    expect(bought(T0 + 2 * MIN)).toBe(3);
  });

  it('keeps that bar when the feed gave every trade it had', () => {
    const { feed, bought } = setup();
    feed.history([trade(T0 + MIN + 40_000, 100, 5), trade(T0 + 2 * MIN + 1, 100, 3)], 1000);
    expect(bought(T0 + MIN)).toBe(5);
  });

  it('counts no trade twice when the recent ones are asked for again', () => {
    const { feed, store, bought } = setup();
    feed.history([trade(T0 + 1, 100, 1), trade(T0 + 2, 100, 1)], 1000);
    const again = new FootprintFeed(store, (time) => barOfTrade(bars(5), time, MIN));
    again.history([trade(T0 + 1, 100, 1), trade(T0 + 2, 100, 1), trade(T0 + 3, 100, 1)], 1000);
    expect(bought(T0)).toBe(3);
  });

  it('counts the live trades from the start when the feed has no recent ones to give', () => {
    const { feed, bought } = setup();
    feed.live([trade(T0 + 10, 100, 4)]);
    feed.skipHistory();
    expect(bought(T0)).toBe(4);
    feed.live([trade(T0 + 20, 100, 1)]);
    expect(bought(T0)).toBe(5);
  });

  it('keeps a trade of a bar still to come, and counts it when the bar is there', () => {
    const series = bars(2);
    const { feed, store, bought } = setup(series);
    feed.skipHistory();
    feed.live([trade(T0 + 2 * MIN + 5, 100, 7)]);
    expect(store.bars()).toEqual([]);
    // Nothing changes while the bar is not there.
    feed.settle();
    expect(store.bars()).toEqual([]);
    series.push({ ...series[1], time: T0 + 2 * MIN });
    feed.settle();
    expect(bought(T0 + 2 * MIN)).toBe(7);
    // Counted once: settling again adds nothing.
    feed.settle();
    expect(bought(T0 + 2 * MIN)).toBe(7);
  });

  it('counts a later trade after the ones kept for it, in the order they were made', () => {
    const series = bars(2);
    const { feed, store } = setup(series);
    feed.skipHistory();
    // No sides: each is told by the one before it, so the order matters.
    feed.live([{ time: T0 + 2 * MIN + 1, price: 100, volume: 1, side: 'sell' }, { time: T0 + 2 * MIN + 2, price: 101, volume: 2 }]);
    series.push({ ...series[1], time: T0 + 2 * MIN });
    feed.live([{ time: T0 + 2 * MIN + 3, price: 100, volume: 4 }]);
    expect(store.get(T0 + 2 * MIN)!.levels).toEqual([
      { price: 100, buy: 0, sell: 5 },
      { price: 101, buy: 2, sell: 0 },
    ]);
  });

  it('drops a trade from before the first bar, and what is no trade', () => {
    const { feed, store } = setup();
    feed.skipHistory();
    feed.live([trade(T0 - 5, 100, 1), { time: T0 + 1, price: Number.NaN, volume: 1, side: 'buy' }]);
    expect(store.bars()).toEqual([]);
  });

  it('says whether anything was counted, so the chart draws only then', () => {
    const { feed } = setup();
    expect(feed.live([trade(T0 + 1)])).toBe(false);
    expect(feed.history([], 1000)).toBe(true);
    expect(feed.live([trade(T0 - 5)])).toBe(false);
    expect(feed.live([trade(T0 + 2)])).toBe(true);
  });
});

describe('the row size of rows given by hand', () => {
  it('is the smallest step between their prices', () => {
    expect(rowSizeOf([{ time: T0, levels: [{ price: 100, buy: 1, sell: 1 }, { price: 101, buy: 1, sell: 1 }, { price: 100.5, buy: 1, sell: 1 }] }])).toBeCloseTo(0.5, 12);
    expect(rowSizeOf([
      { time: T0, levels: [{ price: 100, buy: 1, sell: 1 }, { price: 110, buy: 1, sell: 1 }] },
      { time: T0 + MIN, levels: [{ price: 102, buy: 1, sell: 1 }, { price: 104, buy: 1, sell: 1 }] },
    ])).toBe(2);
  });

  it('is unknown with no two prices to measure', () => {
    expect(rowSizeOf([])).toBeNull();
    expect(rowSizeOf([{ time: T0, levels: [{ price: 100, buy: 1, sell: 1 }] }])).toBeNull();
    expect(rowSizeOf([{ time: T0, levels: [{ price: 100, buy: 1, sell: 1 }, { price: 100, buy: 2, sell: 2 }] }])).toBeNull();
  });
});
