import type { DataSeries, ViewportState } from '@tradecanvas/commons';
import {
  barIndexToTime,
  barIndexToX,
  priceToYMapper,
  timestampToBarIndex,
  xToBarIndex,
  yToPrice,
} from '@tradecanvas/core';

/**
 * Where things go on screen in one frame, as the chart itself places them:
 * bars by time or index, prices on a log or upside-down scale too. For an
 * overlay plugin's `render`, built from the context it is handed.
 *
 * Bars are those of `context.data`, the series on screen: on a Renko, Kagi,
 * point & figure, line break or range-bar chart they are its bricks or
 * columns, not the feed's bars (`chart.isTimeAligned()` says which). Times
 * between bars and past either end are placed in proportion once there are
 * two bars; with fewer, a time lands on the nearest bar.
 */
export interface FrameScale {
  /** x of the middle of the bar at `time` (the data's own unit); between bars and past either end in proportion. */
  timeToX(time: number): number;
  /** The bar time at `x`, extrapolated past either end of the data. */
  xToTime(x: number): number;
  /** x of the middle of bar `index` of the data. */
  indexToX(index: number): number;
  /** The bar index at `x`, rounded to the nearest bar. */
  xToIndex(x: number): number;
  priceToY(price: number): number;
  yToPrice(y: number): number;
  /** A bar's body width in pixels at this zoom. */
  readonly barWidth: number;
  /** The first and last bar indexes on screen, within the data; `to < from` when there is none. */
  readonly visible: { readonly from: number; readonly to: number };
}

/**
 * The scale of an overlay plugin's frame:
 *
 * ```ts
 * render(ctx, context) {
 *   const s = overlayScale(context);
 *   for (let i = s.visible.from; i <= s.visible.to; i++) {
 *     ctx.fillRect(s.indexToX(i) - s.barWidth / 2, s.priceToY(context.data[i].high), s.barWidth, 2);
 *   }
 * }
 * ```
 */
export function overlayScale(context: { viewport: ViewportState; data: DataSeries }): FrameScale {
  const { viewport, data } = context;
  const toY = priceToYMapper(viewport);
  const last = data.length - 1;
  const from = Math.max(0, Math.floor(viewport.visibleRange.from));
  const to = Math.min(last, Math.ceil(viewport.visibleRange.to));
  const indexOf = (time: number) => (data.length > 0 ? timestampToBarIndex(time, data) : time);
  return {
    timeToX: (time) => barIndexToX(indexOf(time), viewport),
    xToTime: (x) => {
      const index = xToBarIndex(x, viewport);
      return data.length > 0 ? barIndexToTime(index, data) : index;
    },
    indexToX: (index) => barIndexToX(index, viewport),
    xToIndex: (x) => xToBarIndex(x, viewport),
    priceToY: toY,
    yToPrice: (y) => yToPrice(y, viewport),
    barWidth: viewport.barWidth,
    visible: to < from ? { from: 0, to: -1 } : { from, to },
  };
}
