import type { ViewportState } from '@tradecanvas/commons';
import { computeTickStep } from '@tradecanvas/commons';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/** The grid's lines as CSS-pixel centres: one across per price step, one down every few slots. */
export interface GridLines {
  horizontal: number[];
  vertical: number[];
}

/** Bars between vertical lines: at least this many pixels apart. */
const MIN_COLUMN_SPACING = 80;

/** Where the grid lines go, for the 2D grid and the GPU alike. */
export function gridLines(viewport: ViewportState): GridLines {
  const { chartRect, priceRange } = viewport;
  if (priceRange.max - priceRange.min <= 0) return { horizontal: [], vertical: [] };
  const toY = priceToYMapper(viewport);

  const horizontal: number[] = [];
  const priceStep = computeTickStep(priceRange.min, priceRange.max, 8);
  const firstPrice = Math.ceil(priceRange.min / priceStep) * priceStep;
  for (let price = firstPrice; price <= priceRange.max; price += priceStep) {
    horizontal.push(Math.round(toY(price)) + 0.5);
  }

  const vertical: number[] = [];
  const barUnit = viewport.barWidth + viewport.barSpacing;
  const barsPerGrid = Math.max(1, Math.ceil(MIN_COLUMN_SPACING / barUnit));
  const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;
  // Every slot on screen — the empty space past either end of the data
  // (where the chart can be panned) keeps its grid too.
  const from = Math.floor(viewport.offset / barUnit);
  const to = Math.ceil((viewport.offset + chartRect.width) / barUnit);
  for (let i = from; i <= to; i++) {
    if (i % barsPerGrid !== 0) continue;
    vertical.push(Math.round(i * barUnit + offsetX) + 0.5);
  }
  return { horizontal, vertical };
}
