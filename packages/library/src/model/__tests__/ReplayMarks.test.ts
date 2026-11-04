import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { intrabarPath } from '../../replay/intrabarPath.js';
import { firstAfter, firstAtOrAfter, formingFeed, MAX_REPLAY_CHUNKS, replayMarks, stepFeed } from '../ReplayMarks.js';

const bar = (time: number, open: number, high: number, low: number, close: number): OHLCBar => ({ time, open, high, low, close, volume: 1 });
const series = [bar(0, 10, 12, 9, 11), bar(1, 11, 15, 10, 14), bar(2, 14, 14, 8, 9), bar(3, 9, 10, 7, 10)];
const pathOf = (coarse: readonly OHLCBar[], i: number) => intrabarPath(coarse[i], []);

describe('firstAtOrAfter and firstAfter', () => {
  it('find the first bar at or after, and after, a time', () => {
    expect(firstAtOrAfter(series, 1)).toBe(1);
    expect(firstAtOrAfter(series, 1.5)).toBe(2);
    expect(firstAfter(series, 1)).toBe(2);
    expect(firstAfter(series, 9)).toBe(4);
    expect(firstAtOrAfter([], 0)).toBe(0);
  });
});

describe('replayMarks', () => {
  it('gives the extremes, the earlier first, then the close', () => {
    expect(replayMarks(series.slice(1, 3))).toEqual([[15, 1], [8, 2], [9, 2]]);
    // One bar: a rising bar dipped first.
    expect(replayMarks([series[1]])).toEqual([[10, 1], [15, 1], [14, 1]]);
    expect(replayMarks([series[2]])).toEqual([[14, 2], [8, 2], [9, 2]]);
  });
});

describe('stepFeed', () => {
  it('starts at the bar the replay begins on', () => {
    expect(stepFeed(series, 1, { time: null, fraction: 1 })).toEqual({ marks: [[14, 1]], fed: { time: 1, fraction: 1 } });
  });

  it('gives every step past the latest time given, and nothing behind it', () => {
    expect(stepFeed(series, 3, { time: 1, fraction: 1 })).toEqual({ marks: [[14, 2], [8, 2], [9, 2], [7, 3], [10, 3], [10, 3]], fed: { time: 3, fraction: 1 } });
    expect(stepFeed(series, 1, { time: 1, fraction: 1 })).toBeNull();
    expect(stepFeed(series, 9, { time: 1, fraction: 1 })).toBeNull();
  });

  it('gives a long jump in chunks, ending on the bar it lands on', () => {
    const long = Array.from({ length: MAX_REPLAY_CHUNKS * 3 }, (_, i) => bar(i, 10, 11 + (i % 7), 9 - (i % 5), 10));
    const feed = stepFeed(long, long.length - 1, { time: 0, fraction: 1 })!;
    expect(feed.marks).toHaveLength(MAX_REPLAY_CHUNKS * 3);
    expect(feed.marks.at(-1)).toEqual([10, long.length - 1]);
  });
});

describe('formingFeed', () => {
  it('starts where the forming bar is', () => {
    const path = pathOf(series, 1);
    expect(formingFeed(series, 1, path, 0, { time: null, fraction: 1 }, pathOf)).toEqual({ marks: [[11, 1]], fed: { time: 1, fraction: 0 } });
  });

  it('goes on along the same bar, and gives nothing behind where it was', () => {
    const path = pathOf(series, 1);
    const feed = formingFeed(series, 1, path, 1, { time: 1, fraction: 0 }, pathOf)!;
    expect(feed.fed).toEqual({ time: 1, fraction: 1 });
    expect(feed.marks.at(-1)).toEqual([14, 1]);
    expect(formingFeed(series, 1, path, 0.5, { time: 1, fraction: 0.5 }, pathOf)).toBeNull();
    expect(formingFeed(series, 0, pathOf(series, 0), 1, { time: 1, fraction: 0 }, pathOf)).toBeNull();
  });

  it('finishes a bar given in part, passes the bars a jump skips, then forms the new one', () => {
    const feed = formingFeed(series, 3, pathOf(series, 3), 0, { time: 0, fraction: 0.5 }, pathOf)!;
    const rest = feed.marks.slice(0, -7);
    expect(rest.at(-1)).toEqual([11, 0]);
    // A jump passes each bar in a chunk of its own here (few bars).
    expect(feed.marks.slice(-7)).toEqual([[10, 1], [15, 1], [14, 1], [14, 2], [8, 2], [9, 2], [9, 3]]);
    expect(feed.fed).toEqual({ time: 3, fraction: 0 });
  });

  it('gives nothing more of a bar given whole, and passes no bar between neighbours', () => {
    const feed = formingFeed(series, 1, pathOf(series, 1), 0, { time: 0, fraction: 1 }, pathOf)!;
    expect(feed.marks).toEqual([[11, 1]]);
  });

  it('passes a long jump in chunks', () => {
    const long = Array.from({ length: MAX_REPLAY_CHUNKS * 2 + 2 }, (_, i) => bar(i, 10, 12, 8, 11));
    const feed = formingFeed(long, long.length - 1, pathOf(long, long.length - 1), 0, { time: 0, fraction: 1 }, pathOf)!;
    // Bars 1 to n-2 in 500 chunks of 2 or 1, three marks each, then the forming bar's open.
    expect(feed.marks).toHaveLength(MAX_REPLAY_CHUNKS * 3 + 1);
    expect(feed.marks.at(-1)).toEqual([10, long.length - 1]);
  });
});
