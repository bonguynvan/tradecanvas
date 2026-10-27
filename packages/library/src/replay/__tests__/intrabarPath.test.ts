import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { intrabarPath, formingAt, pathMarks, pathStop } from '../intrabarPath.js';

const T = 1_000_000;
const MIN = 60_000;
const rising: OHLCBar = { time: T, open: 201, high: 204, low: 199, close: 202, volume: 90 };

describe('a bar with no finer bars', () => {
  it('walks open, low, high, close at an even pace in price', () => {
    const path = intrabarPath(rising);
    expect(path.points.map((p) => p.price)).toEqual([201, 199, 204, 202]);
    // Legs 2, 5, 2 of 9.
    expect(formingAt(path, 0)).toEqual({ time: T, open: 201, high: 201, low: 201, close: 201, volume: 0 });
    expect(formingAt(path, 2 / 9)).toMatchObject({ high: 201, low: 199, close: 199 });
    expect(formingAt(path, 0.5).close).toBeCloseTo(201.5);
    expect(formingAt(path, 7 / 9)).toMatchObject({ high: 204, low: 199, close: 204 });
    expect(formingAt(path, 1)).toEqual(rising);
    expect(formingAt(path, Number.NaN).close).toBe(201);
  });

  it('gives a paper account the prices it passed, once each', () => {
    const path = intrabarPath(rising);
    const marks = [...pathMarks(path, 0, 0.3), ...pathMarks(path, 0.3, 1)];
    expect(marks.map(([p]) => p)).toContain(199);
    expect(marks.map(([p]) => p)).toContain(204);
    expect(marks.at(-1)).toEqual([202, T]);
  });
});

describe('a bar made of finer bars', () => {
  const minutes: OHLCBar[] = [
    { time: T, open: 201, high: 201.5, low: 200, close: 200.5, volume: 10 },
    { time: T + MIN, open: 200.5, high: 203, low: 200.5, close: 203, volume: 30 },
    { time: T + 2 * MIN, open: 203, high: 203.5, low: 201, close: 201.5, volume: 40 },
  ];
  const bar: OHLCBar = { time: T, open: 201, high: 204, low: 199, close: 202, volume: 100 };

  it('gives each finer bar an equal share of the time', () => {
    const path = intrabarPath(bar, minutes);
    expect(formingAt(path, 1 / 3).time).toBe(T);
    expect(pathMarks(path, 1 / 3, 2 / 3).every(([, t]) => t === T + MIN)).toBe(true);
  });

  it('ends as the series has the bar, though the minutes disagree with it', () => {
    const path = intrabarPath(bar, minutes);
    // The minutes reach 203.5 and 200 and add up to 80; the bar says 204, 199, 100, close 202.
    const last = formingAt(path, 0.999);
    expect(last.high).toBe(204);
    expect(last.low).toBe(199);
    expect(last.close).toBeCloseTo(202, 1);
    expect(last.volume).toBeCloseTo(100, 0);
    expect(formingAt(path, 1)).toEqual(bar);
  });

  it('never leaves the bar’s range on the way', () => {
    const wild = [{ ...minutes[0], high: 500 }, minutes[1], minutes[2]];
    const path = intrabarPath(bar, wild);
    for (let f = 0; f <= 1; f += 0.01) expect(formingAt(path, f).high).toBeLessThanOrEqual(204);
  });
});

describe('under reduced motion', () => {
  it('stops at the last price the path has reached, without the slide between', () => {
    const path = intrabarPath(rising);
    expect(pathStop(path, 0.1)).toBe(0);
    expect(formingAt(path, pathStop(path, 0.5))).toMatchObject({ close: 199, low: 199, high: 201 });
    expect(formingAt(path, pathStop(path, 0.8)).close).toBe(204);
    expect(pathStop(path, 1)).toBe(1);
  });
});
