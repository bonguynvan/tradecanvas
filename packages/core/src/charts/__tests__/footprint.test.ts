import { describe, it, expect } from 'vitest';
import type { FootprintLevel, Trade } from '@tradecanvas/commons';
import {
  FootprintStore,
  autoFootprintRow,
  footprintImbalances,
  footprintOf,
  footprintRowFactor,
  footprintStats,
  footprintText,
  mergeFootprintRows,
} from '../footprint.js';

const MIN = 60_000;
const trade = (time: number, price: number, volume: number, side?: Trade['side']): Trade => ({ time, price, volume, ...(side ? { side } : {}) });
const level = (price: number, buy: number, sell: number): FootprintLevel => ({ price, buy, sell });

describe('the row a price falls in', () => {
  it('is about a ten-thousandth of the price when left to the chart, rounded to 1, 2 or 5', () => {
    expect(autoFootprintRow(60_000)).toBe(5);
    expect(autoFootprintRow(3_000)).toBeCloseTo(0.2, 12);
    expect(autoFootprintRow(100)).toBeCloseTo(0.01, 12);
    expect(autoFootprintRow(0.5)).toBeCloseTo(0.00005, 12);
  });

  it('is none for a price that is no price', () => {
    for (const price of [0, -4, Number.NaN, Number.POSITIVE_INFINITY]) expect(autoFootprintRow(price), String(price)).toBe(0);
  });
});

describe('FootprintStore', () => {
  it('counts each trade in the row of its price, by who took it', () => {
    const store = new FootprintStore();
    store.setRowSize(0.5);
    store.add(0, trade(1, 100.2, 3, 'buy'));
    store.add(0, trade(2, 100.4, 2, 'sell'));
    store.add(0, trade(3, 100.5, 4, 'buy'));
    store.add(0, trade(4, 99.9, 1, 'sell'));
    expect(store.get(0)).toEqual({ time: 0, levels: [level(99.5, 0, 1), level(100, 3, 2), level(100.5, 4, 0)] });
  });

  it('puts a price on a row’s edge in the row it starts, however the division comes out', () => {
    const store = new FootprintStore();
    store.setRowSize(0.1);
    // 100.3 / 0.1 is 1002.9999999999999 in floating point.
    store.add(0, trade(1, 100.3, 1, 'buy'));
    store.add(0, trade(2, 100.39, 1, 'buy'));
    expect(store.get(0)!.levels).toEqual([level(100.3, 2, 0)]);
  });

  it('keeps each bar’s rows apart, oldest bar first', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    store.add(MIN, trade(MIN + 1, 10, 1, 'buy'));
    store.add(0, trade(1, 10, 2, 'sell'));
    expect(store.bars().map((bar) => bar.time)).toEqual([0, MIN]);
    expect(store.get(0)!.levels).toEqual([level(10, 0, 2)]);
    expect(store.get(2 * MIN)).toBeNull();
  });

  it('tells a trade with no side by the trade before it: up was bought, down was sold, level as the last', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    // Nothing to tell the first by: it is left out.
    expect(store.add(0, trade(1, 10, 5))).toBe(false);
    expect(store.add(0, trade(2, 11, 1))).toBe(true);
    expect(store.add(0, trade(3, 11, 2))).toBe(true);
    expect(store.add(0, trade(4, 10, 4))).toBe(true);
    expect(store.add(0, trade(5, 10, 8))).toBe(true);
    expect(store.get(0)!.levels).toEqual([level(10, 0, 12), level(11, 3, 0)]);
  });

  it('leaves out what is no trade, and counts nothing before it has a row size', () => {
    const store = new FootprintStore();
    expect(store.add(0, trade(1, 10, 1, 'buy'))).toBe(false);
    store.setRowSize(1);
    for (const bad of [trade(1, Number.NaN, 1, 'buy'), trade(1, 10, 0, 'buy'), trade(1, 10, -2, 'buy'), trade(1, -3, 1, 'buy'), trade(Number.NaN, 10, 1, 'buy')]) {
      expect(store.add(0, bad)).toBe(false);
    }
    expect(store.add(Number.NaN, trade(1, 10, 1, 'buy'))).toBe(false);
    expect(store.bars()).toEqual([]);
  });

  it('gives the same rows object until a trade changes that bar', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    store.add(0, trade(1, 10, 1, 'buy'));
    store.add(MIN, trade(MIN, 10, 1, 'buy'));
    const first = store.get(0);
    expect(store.get(0)).toBe(first);
    store.add(MIN, trade(MIN + 1, 10, 1, 'buy'));
    expect(store.get(0)).toBe(first);
    store.add(0, trade(2, 10, 1, 'buy'));
    expect(store.get(0)).not.toBe(first);
    expect(store.get(0)!.levels).toEqual([level(10, 2, 0)]);
  });

  it('takes a bar’s rows as given, in its own rows, in place of what it had', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    store.add(0, trade(1, 10, 9, 'buy'));
    store.set({ time: 0, levels: [level(10.6, 1, 2), level(10.2, 3, 4), level(12, 5, 0), level(11, Number.NaN, 2), level(13, -1, 2)] });
    // 10.2 and 10.6 are one row; a row with a number that cannot be is left out.
    expect(store.get(0)!.levels).toEqual([level(10, 4, 6), level(12, 5, 0)]);
    // No rows: the bar has no footprint.
    store.set({ time: 0, levels: [] });
    expect(store.get(0)).toBeNull();
  });

  it('keeps the newest bars when it holds more than it may', () => {
    const store = new FootprintStore(3);
    store.setRowSize(1);
    for (let i = 0; i < 5; i++) store.add(i * MIN, trade(i * MIN, 10, 1, 'buy'));
    expect(store.bars().map((bar) => bar.time)).toEqual([2 * MIN, 3 * MIN, 4 * MIN]);
  });

  it('starts again on another row size, and keeps its rows on the same one', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    store.add(0, trade(1, 10, 1, 'buy'));
    expect(store.setRowSize(1)).toBe(false);
    expect(store.bars()).toHaveLength(1);
    expect(store.setRowSize(0.5)).toBe(true);
    expect(store.bars()).toEqual([]);
    expect(store.getRowSize()).toBe(0.5);
    // A size that is none is refused.
    expect(store.setRowSize(-1)).toBe(false);
    expect(store.getRowSize()).toBe(0.5);
  });

  it('forgets its row size with its rows when it is to serve another series', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    store.add(0, trade(1, 10, 1, 'buy'));
    store.clear();
    expect(store.getRowSize()).toBe(1);
    store.reset();
    expect(store.getRowSize()).toBe(0);
    expect(store.add(0, trade(1, 10, 1, 'buy'))).toBe(false);
  });

  it('knows the time of the latest trade it counted', () => {
    const store = new FootprintStore();
    store.setRowSize(1);
    expect(store.latestTrade()).toBe(-Infinity);
    store.add(0, trade(7, 10, 1, 'buy'));
    store.add(0, trade(5, 10, 1, 'buy'));
    expect(store.latestTrade()).toBe(7);
    store.clear();
    expect(store.latestTrade()).toBe(-Infinity);
  });
});

describe('a bar’s footprint in figures', () => {
  const levels = [level(10, 1, 6), level(11, 8, 2), level(12, 3, 3)];

  it('adds up what was bought and sold, and finds the price most traded at', () => {
    expect(footprintStats(levels)).toEqual({ buy: 12, sell: 11, volume: 23, delta: 1, poc: 11, maxSide: 8, maxVolume: 10, maxDelta: 6 });
  });

  it('has no price most traded at with no rows', () => {
    expect(footprintStats([])).toEqual({ buy: 0, sell: 0, volume: 0, delta: 0, poc: null, maxSide: 0, maxVolume: 0, maxDelta: 0 });
  });
});

describe('rows drawn taller than they are kept', () => {
  it('are the kept rows added up, on multiples of the taller row', () => {
    const levels = [level(9.5, 1, 1), level(10, 2, 0), level(10.5, 0, 3), level(11.5, 4, 4)];
    expect(mergeFootprintRows(levels, 0.5, 2)).toEqual([level(9, 1, 1), level(10, 2, 3), level(11, 4, 4)]);
    // One to one: the rows as they are.
    expect(mergeFootprintRows(levels, 0.5, 1)).toBe(levels);
  });

  it('are 1, 2, 5, 10… rows each: the first that is tall enough to read', () => {
    expect(footprintRowFactor(14, 12)).toBe(1);
    expect(footprintRowFactor(7, 12)).toBe(2);
    expect(footprintRowFactor(3, 12)).toBe(5);
    expect(footprintRowFactor(1.3, 12)).toBe(10);
    expect(footprintRowFactor(0.7, 12)).toBe(20);
    expect(footprintRowFactor(0.05, 12)).toBe(500);
    // A row with no height on screen is not worked on for ever.
    expect(Number.isFinite(footprintRowFactor(0, 12))).toBe(true);
  });
});

describe('where one side outdid the other', () => {
  it('compares what was bought at a price with what was sold one row below, and the other way round', () => {
    // Bought 9 at 11 against 2 sold at 10, and sold 6 at 11 against 1 bought at 12: both three times over.
    // Sold 2 at 10 against 9 bought at 11, and bought 1 at 12 against 6 sold at 11: neither.
    const levels = [level(10, 1, 2), level(11, 9, 6), level(12, 1, 30)];
    expect(footprintImbalances(levels, 1, 3)).toEqual([
      { buy: false, sell: false },
      { buy: true, sell: true },
      { buy: false, sell: false },
    ]);
  });

  it('counts a row nothing traded in between two that did as nothing, and has no row to compare past the ends', () => {
    const levels = [level(10, 5, 5), level(12, 4, 7)];
    expect(footprintImbalances(levels, 1, 3)).toEqual([
      // Sold 5 at 10 against nothing bought at 11.
      { buy: false, sell: true },
      // Bought 4 at 12 against nothing sold at 11.
      { buy: true, sell: false },
    ]);
  });

  it('marks none with the ratio switched off', () => {
    const levels = [level(10, 1, 2), level(11, 9, 6)];
    for (const ratio of [0, 1, Number.NaN]) expect(footprintImbalances(levels, 1, ratio).some((flag) => flag.buy || flag.sell), String(ratio)).toBe(false);
  });
});

describe('trades into footprints in one call', () => {
  it('puts each trade in the bar of its time and the row of its price', () => {
    const bars = footprintOf([trade(10, 100.2, 1, 'buy'), trade(MIN + 5, 100.7, 2, 'sell'), trade(20, 100.4, 3, 'sell'), trade(MIN + 9, 100.9, 4, 'buy')], '1m', 0.5);
    expect(bars).toEqual([
      { time: 0, levels: [level(100, 1, 3)] },
      { time: MIN, levels: [level(100.5, 4, 2)] },
    ]);
  });
});

describe('a cell’s number', () => {
  it('is short: thousands, millions and billions by a letter, small sizes with their decimals', () => {
    expect(footprintText(0)).toBe('0');
    expect(footprintText(0.0523)).toBe('0.052');
    expect(footprintText(0.5)).toBe('0.5');
    expect(footprintText(3.456)).toBe('3.46');
    expect(footprintText(12)).toBe('12');
    expect(footprintText(12.34)).toBe('12.3');
    expect(footprintText(850.4)).toBe('850');
    expect(footprintText(1_234)).toBe('1.2K');
    expect(footprintText(125_000)).toBe('125K');
    expect(footprintText(2_500_000)).toBe('2.5M');
    expect(footprintText(3_100_000_000)).toBe('3.1B');
    expect(footprintText(-1_234)).toBe('-1.2K');
    // What rounds up to the next letter takes it.
    expect(footprintText(999_960)).toBe('1M');
  });
});

describe('rows a thousandth tall at a price in the tens of thousands', () => {
  const ROW = 0.001;
  const prices = Array.from({ length: 2000 }, (_, k) => Number((60_000 + k * ROW).toFixed(3)));

  it('puts each price on a row’s edge in the row it starts', () => {
    const store = new FootprintStore();
    store.setRowSize(ROW);
    for (const price of prices) store.add(0, trade(1, price, 1, 'buy'));
    const levels = store.get(0)!.levels;
    expect(levels).toHaveLength(prices.length);
    expect(levels.map((l) => l.price)).toEqual(prices);
    expect(levels.every((l) => l.buy === 1)).toBe(true);
  });

  it('draws them several to one in the rows they belong to, and compares the right rows', () => {
    const levels = prices.map((price) => level(price, 1, 1));
    const merged = mergeFootprintRows(levels, ROW, 5);
    expect(merged).toHaveLength(prices.length / 5);
    expect(merged.every((row) => row.buy === 5 && row.sell === 5)).toBe(true);
    // Level everywhere: no side outdid the other, at any row.
    expect(footprintImbalances(levels, ROW, 3).some((flag) => flag.buy || flag.sell)).toBe(false);
    expect(footprintImbalances(merged, ROW * 5, 3).some((flag) => flag.buy || flag.sell)).toBe(false);
  });
});
