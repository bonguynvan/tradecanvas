import type { SparklineOptions, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, renderSparkline } from '@tradecanvas/core';

export class SparklineChart extends BaseFinanceChart {
  private options: SparklineOptions;

  constructor(container: HTMLElement, options: SparklineOptions) {
    super(container, options.theme, options.font);
    this.options = options;
    this.applyLabel();
    this.requestRender();
  }

  /** What screen readers hear: `ariaLabel`, else what the chart holds. */
  private applyLabel(): void {
    this.setLabel(this.options.ariaLabel ?? `Sparkline of ${this.options.data.length} points`);
  }

  protected renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void {
    renderSparkline(ctx, width, height, this.options, theme);
  }

  update(data: number[]): void {
    this.options = { ...this.options, data };
    this.applyLabel();
    this.requestRender();
  }

  setOptions(opts: Partial<SparklineOptions>): void {
    this.options = { ...this.options, ...opts };
    this.applyBaseOptions({ ...opts, ariaLabel: undefined });
    this.applyLabel();
    this.requestRender();
  }
}
