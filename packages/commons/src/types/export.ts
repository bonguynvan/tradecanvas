import type { Theme, ThemeName } from './theme.js';

/** How a chart is made into a picture. */
export interface ChartImageOptions {
  /** The picture's format. Default `'png'`: `'jpeg'` and `'webp'` make a smaller file and lose a little. */
  type?: 'png' | 'jpeg' | 'webp';
  /** How much of the picture `'jpeg'` and `'webp'` keep, 0 to 1. Default `0.92`. */
  quality?: number;
  /**
   * The picture's pixels to one of the chart's own (CSS) pixels: 2 for a
   * picture twice as sharp as a plain screen shows, 3 for paper. Default:
   * the screen's own ratio, and 2 for paper (`print`, `toPdf`). It is held to
   * what a browser can draw: no side past 16,384 pixels, no more than some 16
   * million pixels in all.
   */
  pixelRatio?: number;
  /**
   * The theme the picture is drawn in, when not the one the chart has:
   * `'light'` for paper, which `print` and `toPdf` take when this is left out.
   */
  theme?: ThemeName | Theme;
  /**
   * The picture's size in CSS pixels, when not the chart's own: the chart is
   * laid out again for it. A finance chart takes these; the price chart keeps
   * the size it has on the screen.
   */
  width?: number;
  height?: number;
}

/** What `print` takes: how the chart is made into a picture (a PNG, always), and the printed page's title. */
export interface ChartPrintOptions extends Omit<ChartImageOptions, 'type' | 'quality'> {
  /** The title of the page that is printed: browsers write it in the page's header, and offer it as a file name. */
  title?: string;
}

/** The paper a PDF's pages are, and how a picture lies on one. */
export interface PdfPageOptions {
  /** The paper by its name, or its two sides in millimetres. Default `'a4'`. */
  pageSize?: 'a3' | 'a4' | 'letter' | 'legal' | { width: number; height: number };
  /** `'landscape'` (default): the longer side across, as a chart is wider than it is high. */
  orientation?: 'landscape' | 'portrait';
  /** The room left round the picture, mm. Default `12`. */
  margin?: number;
  /** The document's title, as a reader shows it in its window and its properties. */
  title?: string;
}

/** What `toPdf` takes: how the chart is made into a picture, and the page it goes on. */
export interface ChartPdfOptions extends Omit<ChartImageOptions, 'type' | 'quality'>, PdfPageOptions {}
