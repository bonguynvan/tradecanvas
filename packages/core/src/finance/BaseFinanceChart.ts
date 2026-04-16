import type { Theme, ThemeName } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';

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
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, theme?: ThemeName | Theme) {
    this.container = container;
    this.theme = resolveTheme(theme);

    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.dpr = window.devicePixelRatio || 1;
    this.updateSize();

    this.resizeObserver = new ResizeObserver(() => {
      this.updateSize();
      this.requestRender();
    });
    this.resizeObserver.observe(container);
  }

  private updateSize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
  }

  requestRender(): void {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      this.ctx.save();
      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.renderChart(this.ctx, this.width, this.height, this.theme);
      this.ctx.restore();
    });
  }

  protected abstract renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void;

  setTheme(theme: ThemeName | Theme): void {
    this.theme = resolveTheme(theme);
    this.requestRender();
  }

  destroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.canvas.remove();
  }
}
