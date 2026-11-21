import type { ChartImageOptions, PdfPageOptions } from '@tradecanvas/commons';
import { imagesToPdf, type PdfImage } from './pdf.js';

/** The longest side a browser draws a canvas at, px, and the most pixels the strictest of them gives one. */
export const MAX_IMAGE_SIDE = 16_384;
export const MAX_IMAGE_PIXELS = 16_777_216;
/** How much of a picture `'jpeg'` and `'webp'` keep when the options do not say. */
const DEFAULT_QUALITY = 0.92;
/** How much a JPEG keeps where a PDF has to hold one: where the platform cannot pack pixels without loss. */
const PDF_JPEG_QUALITY = 0.95;
/** The frame a picture is printed from is taken away this long after, ms, where the browser never says the printing is over. */
const PRINT_FRAME_LIFE_MS = 5 * 60_000;
const PRINT_MARGIN = '12mm';

type ImageType = NonNullable<ChartImageOptions['type']>;
const MIME: Record<ImageType, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
const ENDING: Record<ImageType | 'pdf', string> = { png: 'png', jpeg: 'jpg', webp: 'webp', pdf: 'pdf' };

/**
 * The pixels a picture has to one CSS pixel of a chart `width` × `height`:
 * what is asked for (`fallback` when nothing usable is), held to what a
 * browser can draw.
 */
export function imageRatio(width: number, height: number, asked: number | undefined, fallback: number): number {
  const wanted = asked !== undefined && Number.isFinite(asked) && asked > 0 ? asked : fallback;
  if (!(width > 0) || !(height > 0)) return wanted;
  return Math.min(wanted, MAX_IMAGE_SIDE / Math.max(width, height), Math.sqrt(MAX_IMAGE_PIXELS / (width * height)));
}

/** The format and the quality a canvas is asked to encode itself in. */
function encoding(options: ChartImageOptions): [string, number | undefined] {
  const type = options.type && MIME[options.type] ? options.type : 'png';
  if (type === 'png') return [MIME.png, undefined];
  const quality = options.quality !== undefined && Number.isFinite(options.quality) ? Math.min(1, Math.max(0, options.quality)) : DEFAULT_QUALITY;
  return [MIME[type], quality];
}

/** A canvas as a data URL, in the format the options ask for. */
export function canvasDataURL(canvas: HTMLCanvasElement, options: ChartImageOptions = {}): string {
  return canvas.toDataURL(...encoding(options));
}

/** A canvas as a file's bytes, or null where the browser cannot encode it. */
export function canvasBlob(canvas: HTMLCanvasElement, options: ChartImageOptions = {}): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, ...encoding(options)));
}

/** A file name for a picture: the one given, with the format's ending where it has none; `chart` with no name. */
export function imageFileName(name: string | undefined, type: ImageType | 'pdf'): string {
  if (!name) return `chart.${ENDING[type]}`;
  return /\.[a-z0-9]{2,5}$/i.test(name) ? name : `${name}.${ENDING[type]}`;
}

/** Saves what `url` holds as a file, by a link the page never shows. Nothing, for no URL. */
export function downloadImage(url: string, filename: string): void {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Puts a PNG on the clipboard; false where the browser has no clipboard for
 * pictures, refuses, or the picture comes to nothing. The picture may still
 * be encoding: the clipboard is written before anything is awaited, because
 * Safari lets a page write it only while the click that asked is being handled.
 */
export async function copyImage(png: Promise<Blob | null>): Promise<boolean> {
  const Item = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  // A runtime with no navigator has no clipboard either: that is a false, not an error.
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard?.write || !Item) return false;
  try {
    const image = png.then((blob) => {
      if (!blob) throw new Error('No chart image to copy');
      return blob;
    });
    // The write reports a missing image; this keeps it from also showing as an unhandled rejection.
    image.catch(() => {});
    let item: ClipboardItem;
    try {
      item = new Item({ 'image/png': image });
    } catch (err) {
      // Older browsers take only a Blob here, so they wait for the encoding.
      if (!(err instanceof TypeError)) throw err;
      item = new Item({ 'image/png': await image });
    }
    await clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends a canvas to the printer: the browser's print dialog, for a page that
 * holds the picture and nothing else. It is printed from a frame of its own,
 * so the page the chart is on is neither printed nor changed; the paper is
 * turned the way the picture is.
 */
export function printCanvas(canvas: HTMLCanvasElement, options: { title?: string } = {}): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // Out of sight but laid out: a frame that is not displayed is printed blank by some browsers.
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const page = frame.contentDocument;
  const view = frame.contentWindow;
  if (!page || !view) {
    frame.remove();
    return;
  }
  let life: ReturnType<typeof setTimeout> | undefined;
  const done = () => {
    clearTimeout(life);
    frame.remove();
  };
  if (options.title) page.title = options.title;
  const style = page.createElement('style');
  const lying = canvas.width >= canvas.height ? 'landscape' : 'portrait';
  style.textContent = `@page { size: ${lying}; margin: ${PRINT_MARGIN}; } html, body { margin: 0; } img { display: block; max-width: 100%; max-height: 100vh; margin: 0 auto; }`;
  page.head.appendChild(style);
  const image = page.createElement('img');
  image.addEventListener('load', () => {
    view.addEventListener('afterprint', done);
    life = setTimeout(done, PRINT_FRAME_LIFE_MS);
    view.focus();
    view.print();
  });
  image.addEventListener('error', done);
  image.src = canvasDataURL(canvas);
  page.body.appendChild(image);
}

/** A canvas's pixels for a page of a PDF: red, green and blue, what shows through laid on white. */
export function canvasPdfImage(canvas: HTMLCanvasElement): PdfImage {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvasPdfImage: the canvas has no 2D context to read');
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const rgb = new Uint8Array(width * height * 3);
  for (let from = 0, to = 0; from < data.length; from += 4, to += 3) {
    const alpha = data[from + 3];
    if (alpha === 255) {
      rgb[to] = data[from];
      rgb[to + 1] = data[from + 1];
      rgb[to + 2] = data[from + 2];
    } else {
      // A PDF picture has no alpha: on paper, what shows through is white.
      const paper = 255 - alpha;
      rgb[to] = Math.round((data[from] * alpha) / 255) + paper;
      rgb[to + 1] = Math.round((data[from + 1] * alpha) / 255) + paper;
      rgb[to + 2] = Math.round((data[from + 2] * alpha) / 255) + paper;
    }
  }
  return { width, height, rgb };
}

/** A canvas as a JPEG for a PDF's page: for a platform that cannot pack pixels without loss. */
async function canvasPdfJpeg(canvas: HTMLCanvasElement): Promise<PdfImage> {
  const blob = await canvasBlob(canvas, { type: 'jpeg', quality: PDF_JPEG_QUALITY });
  if (!blob) throw new Error('canvasesToPdf: the canvas could not be encoded');
  return { width: canvas.width, height: canvas.height, jpeg: new Uint8Array(await blob.arrayBuffer()) };
}

/** A PDF with a page for each canvas, its picture kept without loss where the platform can pack it. */
export async function canvasesToPdf(canvases: readonly HTMLCanvasElement[], options: PdfPageOptions = {}): Promise<Blob> {
  const lossless = typeof CompressionStream === 'function';
  const images: PdfImage[] = [];
  for (const canvas of canvases) images.push(lossless ? canvasPdfImage(canvas) : await canvasPdfJpeg(canvas));
  return new Blob([(await imagesToPdf(images, options)) as BlobPart], { type: 'application/pdf' });
}
