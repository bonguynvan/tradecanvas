import { describe, it, expect } from 'vitest';
import { positionOutcome } from '../tools/positionOutcome.js';
import type { PositionLevels } from '../tools/RiskReward.js';

/** A long at 50, stop 40, target 70, one unit. */
const LONG: PositionLevels = {
  side: 'buy', entry: 50, stopLoss: 40, takeProfit: 70,
  quantity: 1, quantityDecimals: 2, riskAmount: 10, rewardAmount: 20, riskReward: 2,
};
/** A short at 50, stop 60, target 30, two units. */
const SHORT: PositionLevels = { ...LONG, side: 'sell', stopLoss: 60, takeProfit: 30, quantity: 2 };

/** Bars at times 0, 1, 2…: each [open, high, low, close]. */
const bars = (...ohlc: [number, number, number, number][]) =>
  ohlc.map(([open, high, low, close], time) => ({ time, open, high, low, close, volume: 1 }));
const QUIET: [number, number, number, number] = [50, 52, 48, 51];

describe('positionOutcome', () => {
  it('closes a long at its target when the price reaches it first', () => {
    const series = bars(QUIET, QUIET, [55, 71, 54, 69], [40, 45, 30, 35]);
    expect(positionOutcome(LONG, series, 0, 3)).toEqual({ kind: 'target', entryIndex: 0, exitIndex: 2, exitPrice: 70, pnl: 20 });
  });

  it('closes a long at its stop when the price reaches that first', () => {
    const series = bars(QUIET, [48, 49, 39, 41], [55, 71, 54, 69]);
    expect(positionOutcome(LONG, series, 0, 2)).toEqual({ kind: 'stop', entryIndex: 0, exitIndex: 1, exitPrice: 40, pnl: -10 });
  });

  it('takes the stop when one bar reaches both: which came first is not in the bar', () => {
    const series = bars(QUIET, [50, 75, 35, 60]);
    expect(positionOutcome(LONG, series, 0, 1)?.kind).toBe('stop');
  });

  it('fills a gap past a level at the bar’s open, as a stop order would be', () => {
    expect(positionOutcome(LONG, bars(QUIET, [36, 38, 33, 37]), 0, 1)).toMatchObject({ kind: 'stop', exitPrice: 36, pnl: -14 });
    expect(positionOutcome(LONG, bars(QUIET, [74, 76, 73, 75]), 0, 1)).toMatchObject({ kind: 'target', exitPrice: 74, pnl: 24 });
  });

  it('ends at the close of the last bar in its span when neither level is reached', () => {
    const series = bars(QUIET, QUIET, [51, 58, 50, 57], [55, 80, 30, 60]);
    expect(positionOutcome(LONG, series, 0, 2)).toEqual({ kind: 'ended', entryIndex: 0, exitIndex: 2, exitPrice: 57, pnl: 7 });
  });

  it('is still open at the last bar when its span reaches past the data', () => {
    const series = bars(QUIET, QUIET, [51, 58, 50, 57]);
    expect(positionOutcome(LONG, series, 0, 10)).toEqual({ kind: 'open', entryIndex: 0, exitIndex: 2, exitPrice: 57, pnl: 7 });
  });

  it('mirrors a short: its target below, its stop above, its profit on a fall', () => {
    expect(positionOutcome(SHORT, bars(QUIET, [45, 46, 29, 31]), 0, 1)).toMatchObject({ kind: 'target', exitPrice: 30, pnl: 40 });
    expect(positionOutcome(SHORT, bars(QUIET, [55, 61, 54, 58]), 0, 1)).toMatchObject({ kind: 'stop', exitPrice: 60, pnl: -20 });
    expect(positionOutcome(SHORT, bars(QUIET, [64, 66, 63, 65]), 0, 1)).toMatchObject({ kind: 'stop', exitPrice: 64, pnl: -28 });
  });

  it('enters on the first bar at or after the entry’s time', () => {
    // Bars an hour apart; the entry drawn half way to the second.
    const HOUR = 3_600_000;
    const series = bars(QUIET, QUIET, [55, 71, 54, 69]).map((b, i) => ({ ...b, time: i * HOUR }));
    expect(positionOutcome(LONG, series, HOUR / 2, 2 * HOUR)).toMatchObject({ entryIndex: 1, exitIndex: 2, kind: 'target' });
  });

  it('has no outcome when its right edge was drawn left of the entry: a trade does not run back in time', () => {
    expect(positionOutcome(LONG, bars(QUIET, QUIET, [55, 71, 54, 69]), 2, 0)).toBeNull();
  });

  it('closes at the open of a bar that gaps past the target, though it then falls to the stop', () => {
    expect(positionOutcome(LONG, bars(QUIET, [74, 76, 35, 40]), 0, 1)).toMatchObject({ kind: 'target', exitPrice: 74 });
  });

  it('has no outcome without a bar after the entry in its span, or without bars', () => {
    expect(positionOutcome(LONG, bars(QUIET, QUIET), 1, 5)).toBeNull();
    expect(positionOutcome(LONG, bars(QUIET, QUIET), 0, 0)).toBeNull();
    expect(positionOutcome(LONG, [], 0, 5)).toBeNull();
    // Drawn wholly in the future: no bar there yet.
    expect(positionOutcome(LONG, bars(QUIET, QUIET), 5, 9)).toBeNull();
  });
});
