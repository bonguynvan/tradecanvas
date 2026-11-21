import type { ChartImageOptions, ChartPdfOptions } from '@tradecanvas/commons';
import { canvasesToPdf } from '@tradecanvas/core';

/** What gives a picture of itself for a page: a chart of either kind, or a canvas as it is. */
export type PdfPageSource = HTMLCanvasElement | { toCanvas(options?: ChartImageOptions): HTMLCanvasElement | null };

/** A picture for paper is drawn in this theme and with this many pixels to a CSS pixel, unless the options say otherwise. */
const PAPER_THEME = 'light';
const PAPER_PIXEL_RATIO = 2;

/**
 * A PDF with a page for each chart, in the order given: a report. A chart
 * is the price chart, a finance chart, or anything with `toCanvas`; a canvas
 * goes in as it is. Each is drawn again for paper, in the light theme and at
 * twice the pixels unless `options` say otherwise, and kept without loss
 * where the browser can pack pixels (every current one can). A chart with no
 * picture to give (no size, screenshots switched off) has no page; null when
 * none has one.
 */
export async function chartsToPdf(charts: readonly PdfPageSource[], options: ChartPdfOptions = {}): Promise<Blob | null> {
  const picture: ChartImageOptions = { theme: options.theme ?? PAPER_THEME, pixelRatio: options.pixelRatio ?? PAPER_PIXEL_RATIO };
  if (options.width !== undefined) picture.width = options.width;
  if (options.height !== undefined) picture.height = options.height;
  const pages: HTMLCanvasElement[] = [];
  for (const chart of charts) {
    const canvas = 'toCanvas' in chart ? chart.toCanvas(picture) : chart;
    if (canvas && canvas.width > 0 && canvas.height > 0) pages.push(canvas);
  }
  return pages.length > 0 ? canvasesToPdf(pages, options) : null;
}
