import type { DataSeries, ViewportState } from '@tradecanvas/commons';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/**
 * Below this bar width (CSS px) bar-shaped charts draw one column per pixel
 * instead of one shape per bar: thousands of sub-pixel candles would blur
 * into each other and cost a path segment each.
 */
export const DENSE_BAR_WIDTH = 1;

export function isDense(viewport: Pick<ViewportState, 'barWidth'>): boolean {
  return viewport.barWidth < DENSE_BAR_WIDTH;
}

/** The bars on one pixel column merged into one: first open, last close, extremes, largest volume. */
export interface PixelColumn {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Walk bars `from`..`to` merged per pixel column (`Math.floor` of their x).
 * The column object is reused between calls: copy it to keep it.
 */
export function forEachPixelColumn(
  data: DataSeries,
  from: number,
  to: number,
  toX: (index: number) => number,
  visit: (column: Readonly<PixelColumn>) => void,
): void {
  const last = Math.min(to, data.length - 1);
  if (from > last) return;
  const col: PixelColumn = { x: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 };
  let open = false;
  for (let i = Math.max(0, from); i <= last; i++) {
    const bar = data[i];
    const x = Math.floor(toX(i));
    if (open && x !== col.x) {
      visit(col);
      open = false;
    }
    if (!open) {
      col.x = x;
      col.open = bar.open;
      col.high = bar.high;
      col.low = bar.low;
      col.volume = bar.volume;
      open = true;
    } else {
      if (bar.high > col.high) col.high = bar.high;
      if (bar.low < col.low) col.low = bar.low;
      if (bar.volume > col.volume) col.volume = bar.volume;
    }
    col.close = bar.close;
  }
  if (open) visit(col);
}

/**
 * Draw a dense price series as one high–low line per pixel column, coloured by
 * the column's direction (its last close against its first open).
 */
export function renderDenseBars(
  ctx: CanvasRenderingContext2D,
  data: DataSeries,
  viewport: ViewportState,
  upColor: string,
  downColor: string,
): void {
  const { from, to } = viewport.visibleRange;
  const barUnit = viewport.barWidth + viewport.barSpacing;
  const offsetX = -viewport.offset + viewport.chartRect.x + viewport.barWidth / 2;
  const toY = priceToYMapper(viewport);
  const up = new Path2D();
  const down = new Path2D();
  forEachPixelColumn(data, from, to, (i) => i * barUnit + offsetX, (c) => {
    const path = c.close >= c.open ? up : down;
    const x = c.x + 0.5;
    const top = toY(c.high);
    const bottom = toY(c.low);
    // A flat column still gets a pixel, like a doji's body.
    path.moveTo(x, Math.min(top, bottom) - 0.5);
    path.lineTo(x, Math.max(top, bottom, Math.min(top, bottom) + 1) + 0.5);
  });
  ctx.lineWidth = 1;
  ctx.strokeStyle = upColor;
  ctx.stroke(up);
  ctx.strokeStyle = downColor;
  ctx.stroke(down);
}
