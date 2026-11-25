import type { ChartImageOptions, ChartPdfOptions, ChartPrintOptions, FontConfig, Theme, ThemeName } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { DPRManager, backingSize } from '../engine/DPRManager.js';
import { isolateFontFeatures } from '../engine/CanvasLayer.js';
import { canvasBlob, canvasDataURL, canvasesToPdf, copyImage, downloadImage, imageFileName, imageRatio, picturePixels, printCanvas } from '../ui/chartImage.js';

/** A picture for paper has this many pixels to a CSS pixel when the options do not say, and is drawn in this theme. */
const PAPER_PIXEL_RATIO = 2;
const PAPER_THEME: ThemeName = 'light';

/** The options for a picture that goes on paper: light and sharp unless they say otherwise. */
function forPaper<O extends ChartImageOptions>(options: O): O {
  return { ...options, theme: options.theme ?? PAPER_THEME, pixelRatio: options.pixelRatio ?? PAPER_PIXEL_RATIO };
}

function namedTheme(theme?: ThemeName | Theme): Theme {
  if (!theme || theme === 'dark') return DARK_THEME;
  if (theme === 'light') return LIGHT_THEME;
  return theme as Theme;
}

/**
 * The theme a finance chart draws with: `theme`, its text in `font` where
 * that says, else in the theme's own face (a sans one with digits of one
 * width in the dark and the light theme).
 */
export function financeTheme(theme?: ThemeName | Theme, font?: Partial<FontConfig>): Theme {
  const base = namedTheme(theme);
  // A key given as undefined is a key not given: it must not blank the theme's own.
  const given = Object.fromEntries(Object.entries(font ?? {}).filter(([, value]) => value !== undefined)) as Partial<FontConfig>;
  return { ...base, font: { ...base.font, ...given } };
}

export abstract class BaseFinanceChart {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected container: HTMLElement;
  protected theme: Theme;
  protected width = 0;
  protected height = 0;
  protected dpr = 1;
  private frameId: number | null = null;
  /** The container's size, in CSS and in device pixels, and the screen's pixel ratio as they change. */
  private readonly sizer: DPRManager;

  /** The theme and the font as the options gave them: either may change alone. */
  private themeGiven: ThemeName | Theme | undefined;
  private fontGiven: Partial<FontConfig> | undefined;

  constructor(container: HTMLElement, theme?: ThemeName | Theme, font?: Partial<FontConfig>) {
    this.container = container;
    this.themeGiven = theme;
    this.fontGiven = font;
    this.theme = financeTheme(theme, font);

    this.canvas = document.createElement('canvas');
    // Always the container's size, never a size of its own in pixels: the
    // canvas is in the page's flow, and one that held its width would keep a
    // container sized by its content from shrinking.
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    isolateFontFeatures(this.canvas);
    // A picture to assistive technology; setLabel says what it shows.
    this.canvas.setAttribute('role', 'img');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.sizer = new DPRManager(container);
    this.updateSize();
    // It calls inside a frame: sized and drawn in the same one, so a resize shows no cleared canvas.
    this.sizer.onResize(() => {
      this.updateSize();
      this.renderNow();
    });
  }

  /**
   * Sizes the canvas to the container: its own count of device pixels where
   * the browser gives one, so that at a ratio like 1.25 or 1.5 the picture is
   * not stretched by a fraction of a pixel and its lines stay sharp.
   */
  private updateSize(): void {
    this.dpr = this.sizer.getDpr();
    const size = this.sizer.readContainerSize();
    this.width = size.width;
    this.height = size.height;
    if (this.width <= 0 || this.height <= 0) return;
    const backing = backingSize(size, this.dpr, this.sizer.getDeviceSize());
    // Setting a canvas's size clears it, the same size or not.
    if (this.canvas.width !== backing.width) this.canvas.width = backing.width;
    if (this.canvas.height !== backing.height) this.canvas.height = backing.height;
  }

  requestRender(): void {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      // The container may have had no size when the chart was made.
      if (this.width === 0 || this.height === 0) this.updateSize();
      this.renderNow();
    });
  }

  private renderNow(): void {
    if (this.width === 0 || this.height === 0) return;
    this.ctx.save();
    // By the backing store's own size: it is the box's device pixels, which the ratio only approximates.
    this.ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderChart(this.ctx, this.width, this.height, this.theme);
    this.ctx.restore();
  }

  protected abstract renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void;

  /**
   * Takes what every finance chart's options may hold: a theme, when the
   * options name one, and a label for screen readers. It asks for no frame;
   * the chart that calls it does.
   */
  protected applyBaseOptions(options: { theme?: ThemeName | Theme; font?: Partial<FontConfig>; ariaLabel?: string }): void {
    if ('theme' in options) this.themeGiven = options.theme;
    if ('font' in options) this.fontGiven = options.font;
    if ('theme' in options || 'font' in options) this.theme = financeTheme(this.themeGiven, this.fontGiven);
    if (options.ariaLabel !== undefined) this.setLabel(options.ariaLabel);
  }

  /**
   * Draws the chart for a picture of it: what `renderChart` draws, whole,
   * with nothing that follows the pointer or is on its way somewhere, and
   * without touching what the chart on the page keeps between frames (a
   * picture may be another size than the chart).
   */
  protected renderStill(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme): void {
    this.renderChart(ctx, width, height, theme);
  }

  /**
   * The chart drawn again on a canvas of its own, for a picture: at the
   * chart's size by the screen's pixel ratio, or as `options` say (another
   * size, more pixels, another theme). Nothing that follows the pointer is
   * on it. Null for a chart with no size.
   */
  toCanvas(options: ChartImageOptions = {}): HTMLCanvasElement | null {
    if (this.width === 0 || this.height === 0) this.updateSize();
    const side = (asked: number | undefined, own: number) => (asked !== undefined && Number.isFinite(asked) && asked > 0 ? asked : own);
    const width = side(options.width, this.width);
    const height = side(options.height, this.height);
    if (!(width > 0) || !(height > 0)) return null;
    const ratio = imageRatio(width, height, options.pixelRatio, this.dpr || 1);
    const canvas = document.createElement('canvas');
    const pixels = picturePixels({ width, height }, ratio);
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const theme = options.theme !== undefined ? financeTheme(options.theme, this.fontGiven) : this.theme;
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    // A chart with no ground of its own (a sparkline) still has one in a picture: a JPEG or a page has no see-through.
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);
    this.renderStill(ctx, width, height, theme);
    return canvas;
  }

  /** The chart as a picture in a data URL, or null for a chart with no size. */
  screenshotDataURL(options: ChartImageOptions = {}): string | null {
    const canvas = this.toCanvas(options);
    return canvas ? canvasDataURL(canvas, options) : null;
  }

  /** The chart as a picture file's bytes, or null for a chart with no size. */
  async screenshotBlob(options: ChartImageOptions = {}): Promise<Blob | null> {
    const canvas = this.toCanvas(options);
    return canvas ? canvasBlob(canvas, options) : null;
  }

  /** Saves the chart as a picture file: `filename` (`chart` with none), ending as the format does. */
  screenshot(filename?: string, options: ChartImageOptions = {}): void {
    const url = this.screenshotDataURL(options);
    if (url) downloadImage(url, imageFileName(filename, options.type ?? 'png'));
  }

  /** Puts the chart on the clipboard as a PNG. False where the browser has no clipboard for pictures, or refuses. */
  copyScreenshot(options: Omit<ChartImageOptions, 'type' | 'quality'> = {}): Promise<boolean> {
    const canvas = this.toCanvas(options);
    return copyImage(canvas ? canvasBlob(canvas) : Promise.resolve(null));
  }

  /**
   * Opens the browser's print dialog for the chart alone: a page that holds
   * its picture and nothing of the page it is on. In the light theme and at
   * twice the pixels unless `options` say otherwise. False for a chart with
   * no size.
   */
  print(options: ChartPrintOptions = {}): boolean {
    const canvas = this.toCanvas(forPaper(options));
    return canvas !== null && printCanvas(canvas, { title: options.title });
  }

  /**
   * The chart as a PDF of one page: its picture, kept without loss, as
   * large as fits within the margins. A4 on its side, in the light theme
   * and at twice the pixels unless `options` say otherwise. Null for a chart
   * with no size.
   */
  async toPdf(options: ChartPdfOptions = {}): Promise<Blob | null> {
    const canvas = this.toCanvas(forPaper(options));
    return canvas ? canvasesToPdf([canvas], options) : null;
  }

  /** What the chart shows, for screen readers (the canvas's aria-label). */
  setLabel(label: string): void {
    this.canvas.setAttribute('aria-label', label);
  }

  setTheme(theme: ThemeName | Theme): void {
    this.themeGiven = theme;
    this.theme = financeTheme(theme, this.fontGiven);
    this.requestRender();
  }

  destroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.sizer.destroy();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.canvas.remove();
  }
}
