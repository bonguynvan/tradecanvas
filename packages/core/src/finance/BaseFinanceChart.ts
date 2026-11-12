import type { Theme, ThemeName } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { DPRManager, backingSize } from '../engine/DPRManager.js';
import { isolateFontFeatures } from '../engine/CanvasLayer.js';

function resolveTheme(theme?: ThemeName | Theme): Theme {
  if (!theme || theme === 'dark') return DARK_THEME;
  if (theme === 'light') return LIGHT_THEME;
  return theme as Theme;
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

  constructor(container: HTMLElement, theme?: ThemeName | Theme) {
    this.container = container;
    this.theme = resolveTheme(theme);

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
  protected applyBaseOptions(options: { theme?: ThemeName | Theme; ariaLabel?: string }): void {
    if ('theme' in options) this.theme = resolveTheme(options.theme);
    if (options.ariaLabel !== undefined) this.setLabel(options.ariaLabel);
  }

  /** What the chart shows, for screen readers (the canvas's aria-label). */
  setLabel(label: string): void {
    this.canvas.setAttribute('aria-label', label);
  }

  setTheme(theme: ThemeName | Theme): void {
    this.theme = resolveTheme(theme);
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
