import type { DataSeries, OHLCBar } from '@tradecanvas/commons';

/**
 * The time of the source bar each bar a transform built was finished on.
 * Renko bricks, Kagi lines, line-break lines, point & figure columns and
 * range bars keep times of their own that only count them (each one a unit
 * after the last), so that every slot has its own time to look up; what the
 * axis labels them with is kept here, beside them, so those times stay as
 * they are.
 */
const madeAt = new WeakMap<OHLCBar, number>();

/** The series' times for the axis, kept while the series is the same array. */
const labelled = new WeakMap<DataSeries, readonly { time: number }[]>();

/** `bar`, as finished on the source bar at `time`. */
export function madeFrom(bar: OHLCBar, time: number): OHLCBar {
  madeAt.set(bar, time);
  return bar;
}

/**
 * The times a time axis labels `series`' slots with: for bars a transform
 * built (Renko, Kagi, line break, point & figure, range bars), the time of
 * the source bar each was finished on, so the axis reads the dates the
 * bricks span; for any other series, its own times. Several bricks finished
 * on one bar share its time.
 */
export function axisTimes(series: DataSeries): readonly { time: number }[] {
  const last = series[series.length - 1];
  if (!last || !madeAt.has(last)) return series;
  let times = labelled.get(series);
  if (!times) {
    let previous = madeAt.get(series[0]) ?? series[0].time;
    times = series.map((bar) => {
      previous = madeAt.get(bar) ?? previous;
      return { time: previous };
    });
    labelled.set(series, times);
  }
  return times;
}
