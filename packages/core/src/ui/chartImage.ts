import type { ChartImageOptions, PdfPageOptions } from '@tradecanvas/commons';
import { imagesToPdf, type PdfImage, type PdfPicture } from './pdf.js';

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
/**
 * How long after a file was saved from an object URL the URL is let go of,
 * ms. In the click's own task, Firefox and Safari have saved nothing, or a
 * part, of a large file.
 */
const REVOKE_AFTER_MS = 40_000;

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

/**
 * The size a picture is laid out at, in CSS pixels: each side as asked for
 * (a part of a pixel too: a grid's cell is laid out to the pixels it has),
 * and the chart's own for a side left out or one that is no size. No side
 * is past what a canvas can be.
 */
export function pictureSize(own: { width: number; height: number }, asked: { width?: number; height?: number }): { width: number; height: number } {
  const side = (wanted: number | undefined, mine: number): number =>
    wanted !== undefined && Number.isFinite(wanted) && wanted > 0 ? Math.min(wanted, MAX_IMAGE_SIDE) : mine;
  return { width: side(asked.width, own.width), height: side(asked.height, own.height) };
}

/**
 * The pixels of a picture `size` CSS pixels at `ratio`: each side a whole
 * number, one at least. Where rounding the sides takes them past the most
 * pixels a canvas has (a ratio held to that by `imageRatio` leaves no room
 * for it), the longer side gives way.
 */
export function picturePixels(size: { width: number; height: number }, ratio: number): { width: number; height: number } {
  const pixels = { width: Math.max(1, Math.round(size.width * ratio)), height: Math.max(1, Math.round(size.height * ratio)) };
  while (pixels.width * pixels.height > MAX_IMAGE_PIXELS) {
    if (pixels.width >= pixels.height) pixels.width--;
    else pixels.height--;
  }
  return pixels;
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

/**
 * A file name for a picture: the one given, with the format's ending unless
 * it has a picture's ending already; `chart` with no name. A dot elsewhere
 * is part of the name: `BTC.USD` is a symbol, not a file of the kind `USD`.
 */
export function imageFileName(name: string | undefined, type: ImageType | 'pdf'): string {
  if (!name) return `chart.${ENDING[type]}`;
  return /\.(png|jpe?g|webp|pdf)$/i.test(name) ? name : `${name}.${ENDING[type]}`;
}

/**
 * What of a name (a symbol, say) a file's name can carry: the letters and
 * digits of any writing, a dot, a dash and an underscore, and an underscore
 * for a run of anything else. Nothing, for a name with no letter or digit.
 */
export function fileNamePart(name: string): string {
  const kept = name.trim().replace(/[^\p{L}\p{N}_.-]+/gu, '_');
  return /[\p{L}\p{N}]/u.test(kept) ? kept : '';
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

/** Saves a file's bytes under `filename`, by an address of its own that is let go of once the browser has had time to save. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadImage(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

/** Whether the browser has a clipboard a picture can be put on: asked before one is drawn for it. */
export function canCopyImage(): boolean {
  // A runtime with no navigator has no clipboard either.
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  return !!clipboard?.write && !!(globalThis as { ClipboardItem?: unknown }).ClipboardItem;
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
 * turned the way the picture is. False, and nothing shown, for a canvas the
 * page may not read (one that holds a picture from another site). The page
 * has to allow `data:` pictures; where it allows no inline style, the picture
 * prints at the browser's own size and paper.
 */
export function printCanvas(canvas: HTMLCanvasElement, options: { title?: string } = {}): boolean {
  // Read first: with no picture there is nothing to make a frame for.
  let picture: string;
  try {
    picture = canvasDataURL(canvas);
  } catch {
    return false;
  }
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
    return false;
  }
  // A page written here is the frame's from now on: a browser still loading the empty page it began with does not put that back over this one.
  page.open();
  page.write('<!doctype html><html><head></head><body></body></html>');
  page.close();
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
    try {
      view.focus();
      view.print();
    } catch {
      // A page that may not print (a sandboxed frame): nothing to wait for.
      done();
    }
  });
  image.addEventListener('error', done);
  image.src = picture;
  page.body.appendChild(image);
  return true;
}

/**
 * Whether the page may read what `canvas` holds (a canvas, or a picture a
 * canvas would draw). One with a picture from another site drawn on it may
 * not be read, nor may any canvas it is then drawn on: it is tried on a
 * canvas of one pixel, so the caller's stays good.
 */
export function canvasReadable(canvas: CanvasImageSource): boolean {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const ctx = probe.getContext('2d');
  if (!ctx) return false;
  try {
    ctx.drawImage(canvas, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
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

/**
 * A PDF with a page for each canvas. A picture is kept without loss where
 * the platform can pack its pixels (`CompressionStream`: every current
 * browser), and as a JPEG that keeps nearly all of it where it cannot. Each
 * canvas is read when its page is written, so one page's pixels are held at
 * a time.
 */
export async function canvasesToPdf(canvases: readonly HTMLCanvasElement[], options: PdfPageOptions = {}): Promise<Blob> {
  const lossless = typeof CompressionStream === 'function';
  const pictures: PdfPicture[] = canvases.map((canvas) => () => (lossless ? canvasPdfImage(canvas) : canvasPdfJpeg(canvas)));
  return new Blob([(await imagesToPdf(pictures, options)) as BlobPart], { type: 'application/pdf' });
}
