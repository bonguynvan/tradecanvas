import type { ViewportState } from '@tradecanvas/commons';
import { computeTickStep } from '@tradecanvas/commons';
import { priceToYMapper } from '../viewport/ScaleMapping.js';

/** The grid's lines as CSS-pixel centres: one across per price step, one down every few slots. */
export interface GridLines {
  horizontal: number[];
  vertical: number[];
}

/**
 * Where the axes put their labels: the grid draws its lines there, so lines
 * and labels agree. Either can be left out for the grid's own even spacing.
 */
export interface GridMarks {
  /** Prices the price axis labels. */
  prices?: readonly number[];
  /** Slots the time axis labels. */
  slots?: readonly number[];
}

/** Bars between vertical lines: at least this many pixels apart. */
const MIN_COLUMN_SPACING = 80;

/** Where the grid lines go, for the 2D grid and the GPU alike. */
export function gridLines(viewport: ViewportState, marks: GridMarks = {}): GridLines {
  const { chartRect, priceRange } = viewport;
  if (priceRange.max - priceRange.min <= 0) return { horizontal: [], vertical: [] };
  const toY = priceToYMapper(viewport);

  const horizontal: number[] = [];
  if (marks.prices) {
    for (const price of marks.prices) horizontal.push(Math.round(toY(price)) + 0.5);
  } else {
    const priceStep = computeTickStep(priceRange.min, priceRange.max, 8);
    const firstPrice = Math.ceil(priceRange.min / priceStep) * priceStep;
    for (let i = 0; firstPrice + i * priceStep <= priceRange.max; i++) {
      horizontal.push(Math.round(toY(firstPrice + i * priceStep)) + 0.5);
    }
  }

  const vertical: number[] = [];
  const barUnit = viewport.barWidth + viewport.barSpacing;
  const offsetX = -viewport.offset + chartRect.x + viewport.barWidth / 2;
  if (marks.slots) {
    for (const slot of marks.slots) vertical.push(Math.round(slot * barUnit + offsetX) + 0.5);
    return { horizontal, vertical };
  }
  const barsPerGrid = Math.max(1, Math.ceil(MIN_COLUMN_SPACING / barUnit));
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
