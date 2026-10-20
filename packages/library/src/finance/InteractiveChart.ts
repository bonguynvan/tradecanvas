import type { BaseFinanceChartOptions, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, FinanceCrosshair, canvasMeasure, type Measure } from '@tradecanvas/core';

type HoverOptions = BaseFinanceChartOptions & { crosshair?: boolean };

/**
 * A finance chart that follows the pointer and answers clicks: it keeps the
 * layout it last drew, so a click finds what is under it without redrawing.
 */
export abstract class InteractiveChart<O extends HoverOptions, L> extends BaseFinanceChart {
  protected options: O;
  protected layout: L | null = null;
  /** What the cached layout was worked out for: a pointer move redraws without laying out again. */
  private layoutFor: { options: O; width: number; height: number; theme: Theme } | null = null;
  private readonly crosshair: FinanceCrosshair;
  private readonly onClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    if (this.layout) this.clickAt(this.layout, e.clientX - rect.left, e.clientY - rect.top);
  };
  private readonly onMove = (e: PointerEvent) => {
    if (!this.layout || !this.clickable()) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.style.cursor = this.hits(this.layout, e.clientX - rect.left, e.clientY - rect.top) ? 'pointer' : '';
  };

  constructor(container: HTMLElement, options: O) {
    super(container, options.theme);
    this.options = options;
    this.crosshair = new FinanceCrosshair(this.canvas, () => this.requestRender());
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('pointermove', this.onMove);
    // describe() reads only `options`, set above: subclasses keep no state of their own.
    this.applyLabel();
    this.requestRender();
  }

  /** Where everything goes, for the chart's size and theme. */
  protected abstract compute(width: number, height: number, theme: Theme, measure: Measure): L;
  /** Draws the chart from its layout. */
  protected abstract draw(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme, pointer: { x: number; y: number } | null, layout: L): void;
  /** A sentence for screen readers when the options give none. */
  protected abstract describe(): string;
  /** Whether a click callback is set. */
  protected abstract clickable(): boolean;
  /** Whether something clickable is at (x, y). */
  protected abstract hits(layout: L, x: number, y: number): boolean;
  /** Calls the click callback for what is at (x, y). */
  protected abstract clickAt(layout: L, x: number, y: number): void;

  protected renderChart(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme): void {
    const pointer = this.options.crosshair === false ? null : this.crosshair.getPosition();
    const was = this.layoutFor;
    if (!this.layout || !was || was.options !== this.options || was.width !== width || was.height !== height || was.theme !== theme) {
      this.layout = this.compute(width, height, theme, canvasMeasure(ctx, theme));
      this.layoutFor = { options: this.options, width, height, theme };
    }
    this.draw(ctx, width, height, theme, pointer, this.layout);
  }

  setOptions(options: Partial<O>): void {
    this.options = { ...this.options, ...options };
    if ('theme' in options) this.setTheme(options.theme ?? 'dark');
    this.applyLabel();
    this.requestRender();
  }

  private applyLabel(): void {
    this.setLabel(this.options.ariaLabel ?? this.describe());
  }

  destroy(): void {
    this.crosshair.destroy();
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('pointermove', this.onMove);
    super.destroy();
  }
}
