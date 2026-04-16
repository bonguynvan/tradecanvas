import type { SparklineOptions, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, renderSparkline } from '@tradecanvas/core';

export class SparklineChart extends BaseFinanceChart {
  private options: SparklineOptions;

  constructor(container: HTMLElement, options: SparklineOptions) {
    super(container, options.theme);
    this.options = options;
    this.requestRender();
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
    this.requestRender();
  }

  setOptions(opts: Partial<SparklineOptions>): void {
    this.options = { ...this.options, ...opts };
    this.requestRender();
  }
}
