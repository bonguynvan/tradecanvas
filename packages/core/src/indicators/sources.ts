import type {
  DataSeries,
  IndicatorDescriptor,
  IndicatorOutput,
  IndicatorValue,
  OHLCBar,
  PriceSource,
} from '@tradecanvas/commons';
import { isPriceSource, parseIndicatorSource, sourcePrice } from '@tradecanvas/commons';

/** Where an instance's input comes from. */
export type InputSource =
  | { kind: 'bars' }
  | { kind: 'price'; source: PriceSource }
  | { kind: 'line'; instanceId: string; key: string };

/** The parameter that picks an indicator's source, if it has one. */
export function sourceParam(descriptor: Pick<IndicatorDescriptor, 'inputs'>): string | null {
  const inputs = descriptor.inputs;
  if (!inputs) return null;
  for (const name in inputs) if (inputs[name]?.source) return name;
  return null;
}

/** An instance's input, from its source parameter: the bars as they are, a price, or another indicator's line. */
export function inputSource(
  descriptor: Pick<IndicatorDescriptor, 'inputs'>,
  params: Readonly<Record<string, unknown>>,
): InputSource {
  const name = sourceParam(descriptor);
  if (!name) return { kind: 'bars' };
  const value = params[name];
  const line = parseIndicatorSource(value);
  if (line) return { kind: 'line', ...line };
  if (isPriceSource(value) && value !== 'close') return { kind: 'price', source: value };
  return { kind: 'bars' };
}

/**
 * `data` with each bar's `close` replaced by its `source` price, for an
 * indicator that reads `close`. Reuses `into` (the previous result), redoing
 * only bars from `from` on: on a live tick only the last bar is rebuilt.
 */
export function priceSourceBars(data: DataSeries, source: PriceSource, into: OHLCBar[] | null = null, from = 0): OHLCBar[] {
  const out = into && from > 0 && from <= into.length ? into : [];
  const start = out === into ? from : 0;
  out.length = data.length;
  for (let i = start; i < data.length; i++) {
    const bar = data[i];
    out[i] = { ...bar, close: sourcePrice(bar, source) };
  }
  return out;
}

/**
 * Bars made of another indicator's line `key`, from its first value on: open,
 * high, low and close all hold the line's value, so any indicator can run on
 * it. A gap after the first value repeats the last value. Null while the line
 * has no value yet. `start` is the index in `data` of the first bar.
 */
export function lineSourceBars(
  data: DataSeries,
  line: readonly (IndicatorValue | null)[] | undefined,
  key: string,
): { bars: OHLCBar[]; start: number } | null {
  if (!line) return null;
  let start = -1;
  for (let i = 0; i < data.length && i < line.length; i++) {
    const v = line[i]?.[key];
    if (v !== undefined && Number.isFinite(v)) { start = i; break; }
  }
  if (start < 0) return null;
  const bars: OHLCBar[] = new Array(data.length - start);
  let last = line[start]![key]!;
  for (let i = start; i < data.length; i++) {
    const v = line[i]?.[key];
    if (v !== undefined && Number.isFinite(v)) last = v;
    const bar = data[i];
    bars[i - start] = { time: bar.time, open: last, high: last, low: last, close: last, volume: bar.volume };
  }
  return { bars, start };
}

/** An output computed on bars from `start` on, re-indexed to the full series of `length` bars. */
export function alignOutput(output: IndicatorOutput, start: number, length: number): IndicatorOutput {
  if (start === 0 || !output.series) return output;
  const series: (IndicatorValue | null)[] = new Array(length).fill(null);
  for (let i = 0; i < output.series.length && start + i < length; i++) series[start + i] = output.series[i];
  return { ...output, series };
}

/** An output with no values over `length` bars. */
export function emptyOutput(length: number): IndicatorOutput {
  return { values: new Map(), series: new Array(length).fill(null) };
}
