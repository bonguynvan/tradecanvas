import type { DataSeries, OHLCBar } from '@tradecanvas/commons';
import { formingAt, pathMarks, type IntrabarPath } from '../replay/intrabarPath.js';

/** A long jump goes to a paper account in at most this many chunks of bars, each giving its extremes and its close. */
export const MAX_REPLAY_CHUNKS = 500;

/** A price a paper account trades on, and its time: `[price, time]`. */
export type ReplayMark = [number, number];

/** How far a paper account has been given the replay: the latest time, and how far into that bar (1: all of it). */
export interface ReplayFed {
  time: number | null;
  fraction: number;
}

/** The marks to give a paper account, in order, and how far it has been given the replay after them. */
export interface ReplayFeed {
  marks: ReplayMark[];
  fed: ReplayFed;
}

/** Index of the first bar at or after `time` (the length when none is). */
export function firstAtOrAfter(series: DataSeries, time: number): number {
  let lo = 0;
  let hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The first bar of `series` after `time` (its length when none is). */
export function firstAfter(series: DataSeries, time: number): number {
  let lo = 0;
  let hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].time <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The prices a run of bars went through, in order, as far as the bars tell:
 * each extreme with its time, the earlier one first (within one bar, a rising
 * bar dipped first), then the close.
 */
export function replayMarks(run: readonly OHLCBar[]): ReplayMark[] {
  let lowAt = 0;
  let highAt = 0;
  for (let i = 1; i < run.length; i++) {
    if (run[i].low < run[lowAt].low) lowAt = i;
    if (run[i].high > run[highAt].high) highAt = i;
  }
  const low: ReplayMark = [run[lowAt].low, run[lowAt].time];
  const high: ReplayMark = [run[highAt].high, run[highAt].time];
  const lowFirst = lowAt !== highAt ? lowAt < highAt : run[lowAt].close >= run[lowAt].open;
  const last = run[run.length - 1];
  return [...(lowFirst ? [low, high] : [high, low]), [last.close, last.time]];
}

/** The marks of `run`, in chunks of at most `MAX_REPLAY_CHUNKS` of them. */
function chunkedMarks(run: readonly OHLCBar[]): ReplayMark[] {
  const marks: ReplayMark[] = [];
  const size = Math.ceil(run.length / MAX_REPLAY_CHUNKS);
  for (let i = 0; i < run.length; i += size) marks.push(...replayMarks(run.slice(i, i + size)));
  return marks;
}

/**
 * A paper account trades on the replayed prices and times, forward only:
 * it gets every step past the latest time it has seen (a jump ahead passes
 * them all, a long one in chunks), and nothing after a seek back or a
 * restart from an earlier bar until the replay is past that time again
 * (null). At the start its mark is where the replay begins.
 */
export function stepFeed(series: DataSeries, index: number, fed: ReplayFed): ReplayFeed | null {
  const bar = series[index];
  if (!bar) return null;
  if (fed.time === null) return { marks: [[bar.close, bar.time]], fed: { time: bar.time, fraction: fed.fraction } };
  if (bar.time <= fed.time) return null;
  const run = series.slice(firstAfter(series, fed.time), index + 1);
  return { marks: chunkedMarks(run), fed: { time: bar.time, fraction: fed.fraction } };
}

/**
 * A paper account trades on the prices a forming bar has been drawn
 * through, forward only by (time, fraction): the rest of a bar given in
 * part (along `pathOf` it), the bars a jump passes, then bar `index` of
 * `coarse` along `path` up to `fraction`. Null when that is behind.
 */
export function formingFeed(
  coarse: DataSeries,
  index: number,
  path: IntrabarPath,
  fraction: number,
  fed: ReplayFed,
  pathOf: (coarse: DataSeries, index: number) => IntrabarPath,
): ReplayFeed | null {
  const bar = coarse[index];
  if (!bar) return null;
  const at = { time: bar.time, fraction };
  if (fed.time === null) return { marks: [[formingAt(path, fraction).close, bar.time]], fed: at };
  if (bar.time < fed.time || (bar.time === fed.time && fraction <= fed.fraction)) return null;
  if (bar.time === fed.time) return { marks: pathMarks(path, fed.fraction, fraction), fed: at };
  const marks: ReplayMark[] = [];
  const part = firstAtOrAfter(coarse, fed.time);
  if (coarse[part]?.time === fed.time && fed.fraction < 1) marks.push(...pathMarks(pathOf(coarse, part), fed.fraction, 1));
  marks.push(...chunkedMarks(coarse.slice(firstAfter(coarse, fed.time), index)));
  marks.push(...pathMarks(path, -1, fraction));
  return { marks, fed: at };
}
