import type { DataSeries, IndicatorOutput, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { IndicatorValueMap } from '../IndicatorValueMap.js';

/**
 * Bars as six columns of numbers. A worker is handed the columns' buffers
 * (transferred, not copied), which costs nothing however many bars there
 * are; an array of bar objects would be copied object by object.
 */
export interface BarColumns {
  /** Each bar's time, in milliseconds. */
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
}

/** The bars as columns. */
export function barsToColumns(bars: DataSeries): BarColumns {
  const n = bars.length;
  const columns: BarColumns = {
    time: new Float64Array(n),
    open: new Float64Array(n),
    high: new Float64Array(n),
    low: new Float64Array(n),
    close: new Float64Array(n),
    volume: new Float64Array(n),
  };
  for (let i = 0; i < n; i++) {
    const bar = bars[i];
    columns.time[i] = bar.time;
    columns.open[i] = bar.open;
    columns.high[i] = bar.high;
    columns.low[i] = bar.low;
    columns.close[i] = bar.close;
    columns.volume[i] = bar.volume;
  }
  return columns;
}

/** The bars the columns hold, as objects again. */
export function columnsToBars(columns: BarColumns): OHLCBar[] {
  const { time, open, high, low, close, volume } = columns;
  const out: OHLCBar[] = new Array(time.length);
  for (let i = 0; i < time.length; i++) {
    out[i] = { time: time[i], open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] };
  }
  return out;
}

/** The buffers to transfer with the columns. */
export function barColumnBuffers(columns: BarColumns): ArrayBuffer[] {
  const { time, open, high, low, close, volume } = columns;
  return [time, open, high, low, close, volume].map((column) => column.buffer as ArrayBuffer);
}

/**
 * An indicator's output as columns: one `Float64Array` per line key, NaN
 * where a point has no value for it. Transferred back from a worker, these
 * cost nothing to pass, where a structured clone of the point objects would
 * be rebuilt one by one on the receiving thread.
 */
export interface OutputColumns {
  /** 1 where `series` has a point, 0 where it is null. Null when the output had no `series`. */
  present: Uint8Array | null;
  /** The keys found in the series' points, in the order first seen. */
  keys: string[];
  /** One column per key, in the order of `keys`. */
  columns: Float64Array[];
  /**
   * The output's `values` when they are not simply the series by bar time;
   * null when they are, and they are rebuilt from it.
   */
  values: Map<number, IndicatorValue> | null;
  meta?: Record<string, unknown>;
  /** What the plugin's `update` reads beside the output (`WorkerStateful`), when it keeps anything. */
  state?: unknown;
}

/** The keys every point in `series` has a value under, in the order first seen. */
function seriesKeys(series: readonly (IndicatorValue | null)[]): string[] {
  const keys = new Set<string>();
  for (const point of series) {
    if (!point) continue;
    for (const key in point) keys.add(key);
  }
  return [...keys];
}

/** Whether two points hold the same numbers under the same keys. */
function samePoint(a: IndicatorValue, b: IndicatorValue): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.is(a[key], b[key]));
}

/** Whether `values` holds each point of the series under its bar's time, and nothing else. */
function valuesFollowSeries(output: IndicatorOutput, series: readonly (IndicatorValue | null)[], time: Float64Array): boolean {
  if (series.length > time.length) return false;
  let count = 0;
  for (let i = 0; i < series.length; i++) {
    const point = series[i];
    if (!point) continue;
    count++;
    const value = output.values.get(time[i]);
    if (!value || !samePoint(value, point)) return false;
  }
  return count === output.values.size;
}

/** The output as columns over the bars at `time`, for a worker to send back. */
export function outputToColumns(output: IndicatorOutput, time: Float64Array): OutputColumns {
  const meta = output.meta ? { meta: output.meta } : {};
  const series = output.series;
  if (!series) return { present: null, keys: [], columns: [], values: new Map(output.values), ...meta };
  const keys = seriesKeys(series);
  const present = new Uint8Array(series.length);
  const columns = keys.map(() => new Float64Array(series.length).fill(NaN));
  for (let i = 0; i < series.length; i++) {
    const point = series[i];
    if (!point) continue;
    present[i] = 1;
    for (let k = 0; k < keys.length; k++) {
      const value = point[keys[k]];
      if (value !== undefined) columns[k][i] = value;
    }
  }
  const values = valuesFollowSeries(output, series, time) ? null : new Map(output.values);
  return { present, keys, columns, values, ...meta };
}

/** The point at bar `i`: each key with a number there. */
function pointAt(columns: OutputColumns, i: number): IndicatorValue {
  const point: IndicatorValue = {};
  for (let k = 0; k < columns.keys.length; k++) {
    const value = columns.columns[k][i];
    if (!Number.isNaN(value)) point[columns.keys[k]] = value;
  }
  return point;
}

type PointMaker = (i: number) => IndicatorValue;

/**
 * A maker of points that have a value under every key, for the common
 * counts of keys: each point one object literal, which is built several
 * times faster than an object filled key by key. `value` alone, the key
 * most indicators have, is written out so it needs no computed key.
 */
function fullPointMaker(keys: readonly string[], cols: readonly Float64Array[]): PointMaker | null {
  const [a, b, c, d] = keys;
  const [ca, cb, cc, cd] = cols;
  switch (keys.length) {
    case 1: return a === 'value' ? (i) => ({ value: ca[i] }) : (i) => ({ [a]: ca[i] });
    case 2: return (i) => ({ [a]: ca[i], [b]: cb[i] });
    case 3: return (i) => ({ [a]: ca[i], [b]: cb[i], [c]: cc[i] });
    case 4: return (i) => ({ [a]: ca[i], [b]: cb[i], [c]: cc[i], [d]: cd[i] });
    default: return null;
  }
}

/** Whether bar `i` has a value in every column. */
function hasEvery(cols: readonly Float64Array[], i: number): boolean {
  for (let k = 0; k < cols.length; k++) if (Number.isNaN(cols[k][i])) return false;
  return true;
}

/**
 * Makes an output from its columns a slice of bars at a time, so a long
 * one can be rebuilt over several tasks, the page answering in between.
 * `columnsToOutput` does it in one go.
 */
export class OutputDecoder {
  private next = 0;
  private readonly series: (IndicatorValue | null)[];
  private readonly full: PointMaker | null;
  /** The times and points of `values`, in order, when they are the series'. */
  private readonly keys: number[] = [];
  private readonly points: IndicatorValue[] = [];

  constructor(private readonly columns: OutputColumns, private readonly time: ArrayLike<number>) {
    this.series = new Array(columns.present?.length ?? 0);
    this.full = fullPointMaker(columns.keys, columns.columns);
  }

  /** Rebuild up to `count` more bars; true once every bar is done. */
  step(count: number): boolean {
    const present = this.columns.present;
    if (!present) return true;
    const end = Math.min(present.length, this.next + count);
    const rebuild = this.columns.values === null;
    for (let i = this.next; i < end; i++) {
      if (present[i] === 0) {
        this.series[i] = null;
        continue;
      }
      const point = this.full && hasEvery(this.columns.columns, i) ? this.full(i) : pointAt(this.columns, i);
      this.series[i] = point;
      if (rebuild) {
        this.keys.push(this.time[i]);
        this.points.push(point);
      }
    }
    this.next = end;
    return end === present.length;
  }

  /** The output, once `step` said every bar is done. */
  output(): IndicatorOutput {
    const { columns } = this;
    const meta = columns.meta ? { meta: columns.meta } : {};
    if (!columns.present) return { values: columns.values ?? new Map(), ...meta };
    const values = columns.values ?? IndicatorValueMap.fromAscending(this.keys, this.points);
    return { values, series: this.series, ...meta };
  }
}

/**
 * The output the columns hold: its series of points, and `values` by the
 * times of the bars it was computed on (`time`) sharing them.
 */
export function columnsToOutput(columns: OutputColumns, time: ArrayLike<number>): IndicatorOutput {
  const decoder = new OutputDecoder(columns, time);
  decoder.step(Infinity);
  return decoder.output();
}

/** The buffers to transfer with the output's columns. */
export function outputColumnBuffers(columns: OutputColumns): ArrayBuffer[] {
  const buffers = columns.columns.map((column) => column.buffer as ArrayBuffer);
  if (columns.present) buffers.push(columns.present.buffer as ArrayBuffer);
  return buffers;
}
