import type { ChartType, ChartTypeOptions, DataSeries } from '@tradecanvas/commons';
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
  toHeikinAshi,
  toKagi,
  toLineBreak,
  toPointAndFigure,
  toRangeBars,
  toRenko,
} from '@tradecanvas/core';
import type { ChartRendererInterface } from '@tradecanvas/core';
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
 * Returns the input unchanged for chart types that render raw OHLC directly.
 *
 * Centralized so adding a new chart type only requires editing one file.
 */
export function transformDisplayData(type: ChartType, raw: DataSeries, options: ChartTypeOptions = {}): DataSeries {
  if (raw.length === 0) return raw;

  switch (type) {
    case 'heikinAshi':
      return toHeikinAshi(raw);
    case 'renko': {
      const box = options.renko?.boxSize;
      return typeof box === 'number'
        ? toRenko(raw, { brickSize: box })
        : toRenko(raw, { brickSize: 0, useATR: true, atrPeriod: options.renko?.atrPeriod ?? 14 });
    }
    case 'lineBreak':
      return toLineBreak(raw, options.lineBreak?.lines ?? 3);
    case 'kagi':
      return toKagi(raw, options.kagi?.reversal ?? 4, options.kagi?.reversalType ?? 'percent');
    case 'pointAndFigure':
      return toPointAndFigure(raw, pointAndFigureBox(raw, options), options.pointAndFigure?.reversal ?? 3);
    case 'rangeBars': {
      const range = options.rangeBars?.range;
      return toRangeBars(raw, { rangeSize: typeof range === 'number' ? range : averageClose(raw) * 0.005 });
    }
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

/** The box of a point & figure chart: the one set, or 1% of the average close. */
export function pointAndFigureBox(raw: DataSeries, options: ChartTypeOptions = {}): number {
  const box = options.pointAndFigure?.boxSize;
  return typeof box === 'number' ? box : averageClose(raw) * 0.01;
}

function averageClose(raw: DataSeries): number {
  let sum = 0;
  for (const b of raw) sum += b.close;
  return sum / raw.length;
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
): DataSeries {
  if (raw.length === 0) return raw;
  const plugin = lookup?.(type);
  if (plugin?.transform) return plugin.transform(raw);
  return transformDisplayData(type as ChartType, raw, options);
}
