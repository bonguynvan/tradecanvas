import { describe, it, expect } from 'vitest';
import type { Trade } from '@tradecanvas/commons';
import { TapeModel, sizeDecimals } from '../tapeRows.js';

const trade = (time: number, price: number, volume: number, side?: Trade['side']): Trade => ({ time, price, volume, ...(side ? { side } : {}) });

describe('the decimals a size needs', () => {
  it('are none for a whole size, and as many as it has for a part of one, four at the most', () => {
    expect(sizeDecimals(100)).toBe(0);
    expect(sizeDecimals(1.5)).toBe(1);
    expect(sizeDecimals(0.25)).toBe(2);
    expect(sizeDecimals(0.0015)).toBe(4);
    expect(sizeDecimals(0.123456789)).toBe(4);
    // A sum that floating point left a hair off is the size it was meant to be.
    expect(sizeDecimals(0.1 + 0.2)).toBe(1);
    expect(sizeDecimals(Number.NaN)).toBe(0);
  });
});

describe('TapeModel', () => {
  it('keeps the trades newest first, each with who took it', () => {
    const tape = new TapeModel();
    tape.push([trade(1, 100, 2, 'buy'), trade(2, 99, 3, 'sell')]);
    tape.push([trade(3, 101, 1, 'buy')]);
    expect(tape.rows().map((row) => [row.time, row.price, row.volume, row.side])).toEqual([
      [3, 101, 1, 'buy'],
      [2, 99, 3, 'sell'],
      [1, 100, 2, 'buy'],
    ]);
  });

  it('says how many rows a push added, the newest first, so a list can put just those on top', () => {
    const tape = new TapeModel();
    expect(tape.push([trade(1, 100, 2, 'buy'), trade(2, 99, 3, 'sell')])!.map((row) => row.time)).toEqual([2, 1]);
    expect(tape.push([])).toEqual([]);
  });

  it('tells a trade with no side by the trade before it, and leaves the first of all untold', () => {
    const tape = new TapeModel();
    tape.push([trade(1, 100, 1), trade(2, 101, 1), trade(3, 101, 1), trade(4, 100, 1)]);
    expect(tape.rows().map((row) => row.side)).toEqual(['sell', 'buy', 'buy', null]);
  });

  it('shows no more rows than it may, the newest of them', () => {
    const tape = new TapeModel(3);
    tape.push([1, 2, 3, 4, 5].map((t) => trade(t, 100, 1, 'buy')));
    expect(tape.rows().map((row) => row.time)).toEqual([5, 4, 3]);
  });

  it('shows only trades of the least size and over, and the smaller ones again when the least is lowered', () => {
    const tape = new TapeModel();
    tape.push([trade(1, 100, 0.5, 'buy'), trade(2, 100, 5, 'sell'), trade(3, 100, 2, 'buy')]);
    tape.setMinSize(2);
    expect(tape.rows().map((row) => row.time)).toEqual([3, 2]);
    // A push says only what it adds to the rows shown.
    expect(tape.push([trade(4, 100, 1, 'buy'), trade(5, 100, 9, 'buy')])!.map((row) => row.time)).toEqual([5]);
    tape.setMinSize(0);
    expect(tape.rows().map((row) => row.time)).toEqual([5, 4, 3, 2, 1]);
    // A least size that is none is no least size.
    tape.setMinSize(Number.NaN);
    expect(tape.getMinSize()).toBe(0);
    tape.setMinSize(-4);
    expect(tape.getMinSize()).toBe(0);
  });

  it('adds up what the buyers and the sellers took of the rows shown', () => {
    const tape = new TapeModel();
    tape.push([trade(1, 100, 2, 'buy'), trade(2, 99, 3, 'sell'), trade(3, 99, 5), trade(4, 100, 0.5, 'buy')]);
    // The third is told by the one before it: the price stayed, so the sellers took it too.
    expect(tape.totals()).toEqual({ buy: 2.5, sell: 8 });
    tape.setMinSize(1);
    expect(tape.totals()).toEqual({ buy: 2, sell: 8 });
  });

  it('marks a trade several times the usual size as large', () => {
    const tape = new TapeModel();
    tape.push(Array.from({ length: 20 }, (_, i) => trade(i, 100, 1, 'buy')));
    const [large, usual] = tape.push([trade(20, 100, 1.5, 'buy'), trade(21, 100, 12, 'sell')])!;
    expect(large.large).toBe(true);
    expect(usual.large).toBe(false);
    // With few trades to tell the usual size by, none is.
    const fresh = new TapeModel();
    expect(fresh.push([trade(1, 100, 50, 'buy')])![0].large).toBe(false);
  });

  it('puts a trade that comes late where its time is, and says the rows changed in the middle', () => {
    const tape = new TapeModel();
    tape.push([trade(1, 100, 1, 'buy'), trade(5, 100, 1, 'buy')]);
    // A trade missed while the connection was down, asked for afterwards.
    expect(tape.push([trade(3, 101, 2)])).toBeNull();
    expect(tape.rows().map((row) => row.time)).toEqual([5, 3, 1]);
    // Told by the trade before it in time, not the one that came before it.
    expect(tape.rows()[1].side).toBe('buy');
    // In their order again: the rows a push adds, as before.
    expect(tape.push([trade(6, 100, 1, 'sell')])!.map((row) => row.time)).toEqual([6]);
    // One of the same moment as the newest is in order.
    expect(tape.push([trade(6, 100, 2, 'sell')])).not.toBeNull();
  });

  it('writes sizes to the decimals the finest of the trades it keeps needs', () => {
    const tape = new TapeModel(2, 3);
    tape.push([trade(1, 100, 3, 'buy')]);
    expect(tape.sizeDecimals()).toBe(0);
    tape.push([trade(2, 100, 0.25, 'buy')]);
    expect(tape.sizeDecimals()).toBe(2);
    // The fine one no longer kept, the sizes are whole again.
    tape.push([trade(3, 100, 1, 'buy'), trade(4, 100, 2, 'buy'), trade(5, 100, 4, 'buy')]);
    expect(tape.sizeDecimals()).toBe(0);
    tape.push([trade(6, 100, 0.5, 'buy')]);
    tape.clear();
    expect(tape.sizeDecimals()).toBe(0);
  });

  it('shows the usual number of rows when told a number that is none, and a thousand at the most', () => {
    for (const rows of [Number.NaN, 0, -3, Infinity]) expect(new TapeModel(rows).getCapacity(), String(rows)).toBe(200);
    expect(new TapeModel(5000).getCapacity()).toBe(1000);
    expect(new TapeModel(12.7).getCapacity()).toBe(12);
  });

  it('leaves out what is no trade, and forgets all when cleared', () => {
    const tape = new TapeModel();
    tape.push([trade(1, Number.NaN, 1, 'buy'), trade(2, 100, 0, 'buy'), trade(Number.NaN, 100, 1, 'buy'), trade(3, 100, 1, 'buy')]);
    expect(tape.rows().map((row) => row.time)).toEqual([3]);
    tape.clear();
    expect(tape.rows()).toEqual([]);
    expect(tape.totals()).toEqual({ buy: 0, sell: 0 });
    // The first trade after is told by none before it.
    tape.push([trade(4, 105, 1)]);
    expect(tape.rows()[0].side).toBeNull();
  });

  it('keeps more trades than it shows, so a lower least size has them, up to a limit', () => {
    const tape = new TapeModel(2, 5);
    tape.push([1, 2, 3, 4, 5, 6, 7].map((t) => trade(t, 100, t, 'buy')));
    tape.setMinSize(0);
    expect(tape.rows().map((row) => row.time)).toEqual([7, 6]);
    // Of the five kept (3 to 7), those of 3 and over, two of them shown.
    tape.setMinSize(3);
    expect(tape.rows().map((row) => row.time)).toEqual([7, 6]);
    expect(tape.kept()).toBe(5);
  });
});
