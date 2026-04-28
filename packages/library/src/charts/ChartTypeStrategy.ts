import type { ChartType, DataSeries } from '@tradecanvas/commons';
import {
  AreaRenderer,
  BarRenderer,
  BaselineRenderer,
  CandlestickRenderer,
  HollowCandleRenderer,
  KagiRenderer,
  LineRenderer,
  PointAndFigureRenderer,
  RenkoRenderer,
  toHeikinAshi,
  toKagi,
  toLineBreak,
  toPointAndFigure,
  toRangeBars,
  toRenko,
} from '@tradecanvas/core';
import type { ChartRendererInterface } from '@tradecanvas/core';

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
    default:
      return new CandlestickRenderer();
  }
}

/**
 * Transform raw OHLC bars into the display series for a given chart type.
 * Returns the input unchanged for chart types that render raw OHLC directly.
 *
 * Centralized so adding a new chart type only requires editing one file.
 */
export function transformDisplayData(type: ChartType, raw: DataSeries): DataSeries {
  if (raw.length === 0) return raw;

  switch (type) {
    case 'heikinAshi':
      return toHeikinAshi(raw);
    case 'renko':
      return toRenko(raw, { brickSize: 0, useATR: true, atrPeriod: 14 });
    case 'lineBreak':
      return toLineBreak(raw, 3);
    case 'kagi':
      return toKagi(raw, 4);
    case 'pointAndFigure': {
      const avgPrice = averageClose(raw);
      return toPointAndFigure(raw, avgPrice * 0.01, 3);
    }
    case 'rangeBars': {
      const avgPrice = averageClose(raw);
      return toRangeBars(raw, { rangeSize: avgPrice * 0.005 });
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

function averageClose(raw: DataSeries): number {
  let sum = 0;
  for (const b of raw) sum += b.close;
  return sum / raw.length;
}
