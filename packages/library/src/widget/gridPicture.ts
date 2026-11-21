import type { ChartImageOptions } from '@tradecanvas/commons';
import { imageRatio, picturePixels, pictureSize } from '@tradecanvas/core';

/** A chart of the grid and where its cell is in the grid, in CSS pixels. */
export interface GridPiece {
  /** What gives the chart's picture at a size of its own: a `Chart`. */
  chart: { toCanvas(options?: ChartImageOptions): HTMLCanvasElement | null };
  /** The cell's box, from the grid's top-left corner. One with no size is not on the page (a narrow grid shows one chart at a time). */
  box: { x: number; y: number; width: number; height: number };
}

/**
 * The charts of a grid as one picture, each in its cell, on `ground` where
 * nothing is (the line between two cells). Each chart is drawn again for
 * its cell, whole: the room its widget's bars take on the page is the
 * chart's in the picture. A chart with no picture to give (screenshots
 * switched off) leaves its cell to the ground. `options` are a chart's own
 * picture's: a `width` or a `height` is the whole grid's, of which each
 * chart has its share, and with no `pixelRatio` the picture has the
 * screen's (`screenRatio`). Null when the grid has no size, or no chart has
 * a picture to give.
 */
export function gridPicture(
  pieces: readonly GridPiece[],
  grid: { width: number; height: number },
  options: ChartImageOptions,
  ground: string,
  screenRatio: number,
): HTMLCanvasElement | null {
  if (!(grid.width > 0) || !(grid.height > 0)) return null;
  const size = pictureSize(grid, options);
  const across = size.width / grid.width;
  const down = size.height / grid.height;
  const ratio = imageRatio(size.width, size.height, options.pixelRatio, screenRatio);
  const pixels = picturePixels(size, ratio);
  // A cell's edges in the picture's pixels: whole, so two cells a pixel apart stay a line apart.
  const edge = (at: number, scale: number, most: number): number => Math.min(most, Math.round(at * scale * ratio));
  const pictures = pieces.flatMap(({ chart, box }) => {
    if (!(box.width > 0) || !(box.height > 0)) return [];
    const left = edge(box.x, across, pixels.width);
    const top = edge(box.y, down, pixels.height);
    const width = edge(box.x + box.width, across, pixels.width) - left;
    const height = edge(box.y + box.height, down, pixels.height) - top;
    if (width <= 0 || height <= 0) return [];
    // The chart is asked for the very pixels its cell has: a picture of another size would be blurred into its place.
    const picture = chart.toCanvas({
      width: width / ratio,
      height: height / ratio,
      pixelRatio: ratio,
      ...(options.theme !== undefined ? { theme: options.theme } : {}),
    });
    return picture ? [{ picture, left, top, width, height }] : [];
  });
  if (pictures.length === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, pixels.width, pixels.height);
  for (const { picture, left, top, width, height } of pictures) ctx.drawImage(picture, left, top, width, height);
  return canvas;
}
