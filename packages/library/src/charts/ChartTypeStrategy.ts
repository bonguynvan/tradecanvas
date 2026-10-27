import type { ChartType, ChartTypeOptions, DataSeries } from '@tradecanvas/commons';
import { niceNumber } from '@tradecanvas/commons';
import {
  AreaRenderer,
  BarRenderer,
  BaselineRenderer,
  CandlestickRenderer,
  EquivolumeRenderer,
  HiLoRenderer,
  HLCAreaRenderer,
  HollowCandleRenderer,
  KagiRenderer,
  LineRenderer,
  LineWithMarkersRenderer,
  PointAndFigureRenderer,
  RenkoRenderer,
  StepLineRenderer,
  VolumeCandleRenderer,
  pointAndFigureColumns,
  toHeikinAshi,
  toKagi,
  toLineBreak,
  toRangeBars,
  toRenko,
} from '@tradecanvas/core';
import type { ChartRendererInterface, PointAndFigureColumns, ReshapeMemo } from '@tradecanvas/core';
import type { ChartTypePlugin } from '../plugins/contracts.js';

/**
 * Pure mapping from `ChartType` to the renderer class that draws it. Several
 * chart types reuse `CandlestickRenderer` against transformed data
 * (heikinAshi, lineBreak, rangeBars).
 */
export function createRendererFor(type: ChartType): ChartRendererInterface {
  switch (type) {
    case 'candlestick':
    case 'heikinAshi':
    case 'lineBreak':
    case 'rangeBars':
      return new CandlestickRenderer();
    case 'line':
      return new LineRenderer();
    case 'area':
      return new AreaRenderer();
    case 'bar':
      return new BarRenderer();
    case 'hollowCandle':
      return new HollowCandleRenderer();
    case 'baseline':
      return new BaselineRenderer();
    case 'renko':
      return new RenkoRenderer();
    case 'kagi':
      return new KagiRenderer();
    case 'pointAndFigure':
      return new PointAndFigureRenderer();
    case 'volumeCandles':
      return new VolumeCandleRenderer();
    case 'equivolume':
      return new EquivolumeRenderer();
    case 'hlcArea':
      return new HLCAreaRenderer();
    case 'stepLine':
      return new StepLineRenderer();
    case 'lineWithMarkers':
      return new LineWithMarkersRenderer();
    case 'hiLo':
      return new HiLoRenderer();
    default:
      return new CandlestickRenderer();
  }
}

/**
 * Transform raw OHLC bars into the display series for a given chart type,
 * with its settings (`options`; what isn't set is worked out from the data).
 * `step` is the market's price step (`rangeBarsStep`), when there is one:
 * the automatic range of range bars is a multiple of it. `memo` keeps the
 * size a reshaped type was raised to, for the next tick (`ReshapeMemo`).
 * Returns the input unchanged for chart types that render raw OHLC directly.
 *
 * Centralized so adding a new chart type only requires editing one file.
 */
export function transformDisplayData(
  type: ChartType,
  raw: DataSeries,
  options: ChartTypeOptions = {},
  step?: number,
  memo?: ReshapeMemo,
): DataSeries {
  if (raw.length === 0) return raw;

  switch (type) {
    case 'heikinAshi':
      return toHeikinAshi(raw);
    case 'renko': {
      const box = options.renko?.boxSize;
      return typeof box === 'number'
        ? toRenko(raw, { brickSize: box }, memo)
        : toRenko(raw, { brickSize: 0, useATR: true, atrPeriod: options.renko?.atrPeriod ?? 14 }, memo);
    }
    case 'lineBreak':
      return toLineBreak(raw, options.lineBreak?.lines ?? 3);
    case 'kagi':
      return toKagi(raw, options.kagi?.reversal ?? 4, options.kagi?.reversalType ?? 'percent', memo);
    case 'pointAndFigure':
      return pointAndFigureDisplay(raw, options, memo).columns;
    case 'rangeBars':
      // The bar still forming is drawn too, so the chart ends at the last price and is never blank.
      return toRangeBars(raw, { rangeSize: rangeBarsSize(raw, options, step), includeForming: true }, memo);
    default:
      return raw;
  }
}

/** Chart types that materially transform raw OHLC into a different series. */
export function isTransformedChartType(type: ChartType): boolean {
  switch (type) {
    case 'heikinAshi':
    case 'renko':
    case 'lineBreak':
    case 'kagi':
    case 'pointAndFigure':
    case 'rangeBars':
      return true;
    default:
      return false;
  }
}

/**
 * Transformed chart types that redraw the series into bars of their own
 * (bricks, lines, columns), so a drawn bar is not a data bar. Heikin-Ashi
 * keeps one bar per data bar.
 */
export function isReshapedChartType(type: ChartType): boolean {
  return type !== 'heikinAshi' && isTransformedChartType(type);
}

/**
 * A point & figure chart's columns and the box they were built on: the box
 * set, or 1% of the average close, raised when the columns would pass
 * 100,000, so the renderer draws the boxes the columns were built with.
 */
export function pointAndFigureDisplay(raw: DataSeries, options: ChartTypeOptions = {}, memo?: ReshapeMemo): PointAndFigureColumns {
  const box = options.pointAndFigure?.boxSize;
  const asked = typeof box === 'number' ? box : averageClose(raw) * 0.01;
  return pointAndFigureColumns(raw, asked, options.pointAndFigure?.reversal ?? 3, memo);
}

function averageClose(raw: DataSeries): number {
  let sum = 0;
  for (const b of raw) sum += b.close;
  return sum / raw.length;
}

/** Closed bars the automatic range of range bars averages the true range of. */
const RANGE_BARS_AUTO_BARS = 100;
/** Bars it takes to have a closed bar with a true range: fewer use a share of the price. */
const RANGE_BARS_MIN_BARS = 3;
/** The automatic range without a true range to go by: about this share of the last close. */
const RANGE_BARS_PRICE_SHARE = 0.01;
/** Digits a range is kept to, so five steps of 0.1 read 0.5. */
const RANGE_DIGITS = 15;

const cleanRange = (size: number): number => Number(size.toPrecision(RANGE_DIGITS));

/**
 * The range of range bars: the one set, as it is, or for 'auto' the mean true
 * range of the last 100 closed bars (all of them when there are fewer; the
 * bar still forming is left out, so a tick doesn't reshape the history). It
 * is rounded to a 1-2-5 number, so it holds still as bars close, then to a
 * whole number of price steps (`step`, one at least), so bars close on prices
 * the market can trade. With 2 bars or fewer, about a hundredth of the last close.
 * `toRangeBars` raises either kind when the closed bars would make more than
 * 100,000 range bars, or the last bar that many on its own; one under half
 * the 15th significant digit of the largest price closes no bar.
 */
export function rangeBarsSize(raw: DataSeries, options: ChartTypeOptions = {}, step?: number): number {
  const range = options.rangeBars?.range;
  if (typeof range === 'number') return range;
  const trueRange = raw.length >= RANGE_BARS_MIN_BARS ? meanTrueRange(raw) : 0;
  const lastClose = Math.abs(raw[raw.length - 1]?.close ?? 0);
  const size = trueRange > 0 ? trueRange : lastClose * RANGE_BARS_PRICE_SHARE || 1;
  return onSteps(cleanRange(niceNumber(size, true)), step);
}

/** The closed bars the automatic range is measured on, `from` to before `end`: the last 100, the bar still forming left out. */
function autoWindow(raw: DataSeries): { from: number; end: number } {
  const end = raw.length - 1;
  return { from: Math.max(0, end - RANGE_BARS_AUTO_BARS), end };
}

/** The mean true range of the closed bars the automatic range is measured on. */
function meanTrueRange(raw: DataSeries): number {
  const { from, end } = autoWindow(raw);
  let sum = 0;
  for (let i = from; i < end; i++) {
    const { high, low } = raw[i];
    const prev = i > 0 ? raw[i - 1].close : low;
    sum += Math.max(high - low, Math.abs(high - prev), Math.abs(low - prev));
  }
  return end > from ? sum / (end - from) : 0;
}

/**
 * The price step automatic range bars go on: the coarsest the market has over
 * the closed bars the range is measured on (on a market whose step depends on
 * the price, the step at their highest or their lowest price), so a last price
 * that crosses a band edge doesn't change the range of the whole history. With
 * one bar, the step at its close; undefined when the market has no step.
 */
export function rangeBarsStep(raw: DataSeries, stepAt: (price: number) => number | undefined): number | undefined {
  const { from, end } = autoWindow(raw);
  if (end <= from) return stepAt(raw[raw.length - 1]?.close ?? 0);
  let high = -Infinity;
  let low = Infinity;
  for (let i = from; i < end; i++) {
    high = Math.max(high, raw[i].high);
    low = Math.min(low, raw[i].low);
  }
  return coarser(stepAt(high), stepAt(low));
}

function coarser(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  return b === undefined ? a : Math.max(a, b);
}

/** `size` as a whole number of price steps, one at least; as it is without a step. */
function onSteps(size: number, step?: number): number {
  if (step === undefined || !(step > 0)) return size;
  return cleanRange(Math.max(1, Math.round(size / step)) * step);
}

/** Look up a registered custom chart-type plugin by its `type` string. */
export type ChartTypeLookup = (type: string) => ChartTypePlugin | undefined;

/**
 * Resolve the renderer for a chart type, preferring a registered
 * `ChartTypePlugin` over the built-in mapping.
 */
export function resolveRenderer(type: string, lookup?: ChartTypeLookup): ChartRendererInterface {
  const plugin = lookup?.(type);
  if (plugin) return plugin.createRenderer();
  return createRendererFor(type as ChartType);
}

/**
 * Resolve the display series for a chart type, preferring a plugin's
 * `transform` over the built-in transforms.
 */
export function resolveDisplayData(
  type: string,
  raw: DataSeries,
  lookup?: ChartTypeLookup,
  options?: ChartTypeOptions,
  step?: number,
  memo?: ReshapeMemo,
): DataSeries {
  if (raw.length === 0) return raw;
  const plugin = lookup?.(type);
  if (plugin?.transform) return plugin.transform(raw);
  return transformDisplayData(type as ChartType, raw, options, step, memo);
}
