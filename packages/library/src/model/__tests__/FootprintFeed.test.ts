import { describe, it, expect } from 'vitest';
import type { OHLCBar, Trade } from '@tradecanvas/commons';
import { FootprintStore } from '@tradecanvas/core';
import { FootprintFeed, barOfTrade, barSpanOf, footprintRowSize, rowSizeOf } from '../FootprintFeed.js';

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
  it('counts the trades it is given, each in the bar of its time', () => {
    const { feed, bought } = setup();
    expect(feed.recent([trade(T0 + MIN + 1, 100, 1), trade(T0 + 2 * MIN + 10, 100, 4)], null, null)).toBe(true);
    expect(bought(T0 + MIN)).toBe(1);
    expect(bought(T0 + 2 * MIN)).toBe(4);
    expect(feed.live([trade(T0 + 2 * MIN + 30, 100, 2)])).toBe(true);
    expect(bought(T0 + 2 * MIN)).toBe(6);
  });

  it('leaves out the bar the recent trades began part way through, its live trades too', () => {
    const { feed, store, bought } = setup();
    // The feed had more than it gave: its list begins at +1m40, part way through that bar.
    feed.recent([trade(T0 + MIN + 40_000, 100, 5), trade(T0 + MIN + 50_000, 100, 5), trade(T0 + 2 * MIN + 1, 100, 3)], T0 + MIN + 40_000, null);
    expect(store.get(T0 + MIN)).toBeNull();
    expect(bought(T0 + 2 * MIN)).toBe(3);
    // Part of a bar is no footprint of it: a live trade of that bar is left out as well.
    feed.live([trade(T0 + MIN + 58_000, 100, 9)]);
    expect(store.get(T0 + MIN)).toBeNull();
    feed.live([trade(T0 + 2 * MIN + 5, 100, 2)]);
    expect(bought(T0 + 2 * MIN)).toBe(5);
  });

  it('drops the bar it had last before a hole in the trades: its end is missing', () => {
    const { feed, store, bought } = setup();
    feed.recent([trade(T0 + 10, 100, 1), trade(T0 + MIN + 10, 100, 2)], null, null);
    expect(bought(T0 + MIN)).toBe(2);
    // A long break: the recent trades begin at +3m30, and the latest told before them was at +1m10.
    feed.recent([trade(T0 + 3 * MIN + 30_000, 100, 5), trade(T0 + 4 * MIN + 1, 100, 7)], T0 + 3 * MIN + 30_000, T0 + MIN + 10);
    expect(bought(T0)).toBe(1);
    expect(store.get(T0 + MIN)).toBeNull();
    expect(store.get(T0 + 3 * MIN)).toBeNull();
    expect(bought(T0 + 4 * MIN)).toBe(7);
  });

  it('keeps a trade of a bar still to come, and counts it when the bar is there', () => {
    const series = bars(2);
    const { feed, store, bought } = setup(series);
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
    // No sides: each is told by the one before it, so the order matters.
    feed.live([{ time: T0 + 2 * MIN + 1, price: 100, volume: 1, side: 'sell' }, { time: T0 + 2 * MIN + 2, price: 101, volume: 2 }]);
    series.push({ ...series[1], time: T0 + 2 * MIN });
    feed.live([{ time: T0 + 2 * MIN + 3, price: 100, volume: 4 }]);
    expect(store.get(T0 + 2 * MIN)!.levels).toEqual([
      { price: 100, buy: 0, sell: 5 },
      { price: 101, buy: 2, sell: 0 },
    ]);
  });

  it('keeps the trades that come before the footprint has a row size, and counts them once it has', () => {
    const store = new FootprintStore();
    const series = bars(5);
    const feed = new FootprintFeed(store, (time) => barOfTrade(series, time, MIN));
    expect(feed.live([trade(T0 + 10, 100, 4)])).toBe(false);
    feed.settle();
    expect(store.bars()).toEqual([]);
    store.setRowSize(1);
    expect(feed.settle()).toBe(true);
    expect(store.get(T0)!.levels).toEqual([{ price: 100, buy: 4, sell: 0 }]);
  });

  it('drops a trade from before the first bar, and what is no trade', () => {
    const { feed, store } = setup();
    feed.live([trade(T0 - 5, 100, 1), { time: T0 + 1, price: Number.NaN, volume: 1, side: 'buy' }]);
    expect(store.bars()).toEqual([]);
  });

  it('says whether anything was counted, so the chart draws only then', () => {
    const { feed } = setup();
    expect(feed.live([trade(T0 - 5)])).toBe(false);
    expect(feed.recent([], null, null)).toBe(false);
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

describe('how long a bar lasts', () => {
  const series = bars(5);

  it('is its timeframe, for seconds, minutes, hours, days and weeks', () => {
    expect(barSpanOf('1m', series)).toBe(MIN);
    expect(barSpanOf('30s', series)).toBe(30_000);
    expect(barSpanOf('4h', series)).toBe(4 * 60 * MIN);
    expect(barSpanOf('1d', series)).toBe(24 * 60 * MIN);
    expect(barSpanOf('2w', series)).toBe(14 * 24 * 60 * MIN);
  });

  it('is not set for months, whose lengths differ, nor for bars of trades', () => {
    expect(barSpanOf('1M', series)).toBe(Infinity);
    expect(barSpanOf('100T', series)).toBe(Infinity);
  });

  it('is the distance of the last two bars where the timeframe is not known, for bars under a day', () => {
    expect(barSpanOf(null, series)).toBe(MIN);
    expect(barSpanOf(null, bars(5, 24 * 60 * MIN))).toBe(Infinity);
    expect(barSpanOf(null, bars(1))).toBe(Infinity);
    expect(barSpanOf(null, series.map((bar) => ({ ...bar, time: bar.time / 1000 })))).toBe(MIN);
  });
});

describe('the row size a footprint keeps', () => {
  const given = [{ time: T0, levels: [{ price: 100, buy: 1, sell: 1 }, { price: 100.5, buy: 1, sell: 1 }] }];

  it('is the one set, whatever else is known', () => {
    expect(footprintRowSize(0.25, given, 60_000, 0.1)).toBe(0.25);
  });

  it('is the step of the rows given by hand when none is set', () => {
    expect(footprintRowSize('auto', given, 60_000, undefined)).toBe(0.5);
  });

  it('is about a ten-thousandth of the price otherwise, in whole steps of the market’s', () => {
    expect(footprintRowSize('auto', undefined, 60_000, undefined)).toBe(5);
    // A step of 2: 5 is no whole number of them, 4 and 6 are; the nearer of equals, upward.
    expect(footprintRowSize('auto', undefined, 60_000, 2)).toBe(6);
    // A step wider than the row: one step.
    expect(footprintRowSize('auto', undefined, 50, 0.1)).toBeCloseTo(0.1, 12);
    expect(footprintRowSize('auto', [], 60_000, undefined)).toBe(5);
  });

  it('is not known without a price', () => {
    expect(footprintRowSize('auto', undefined, 0, undefined)).toBe(0);
  });
});
