import type { DepthChartOptions, DepthData, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, FinanceCrosshair, renderDepthChart } from '@tradecanvas/core';

export class DepthChart extends BaseFinanceChart {
  private options: DepthChartOptions;
  private crosshair: FinanceCrosshair | null = null;

  constructor(container: HTMLElement, options: DepthChartOptions) {
    super(container, options.theme);
    this.options = options;

    if (options.crosshair !== false) {
      this.crosshair = new FinanceCrosshair(this.canvas, () => this.requestRender());
    }

    this.requestRender();
  }

  protected renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void {
    const pos = this.crosshair?.getPosition() ?? null;
    renderDepthChart(ctx, width, height, this.options, theme, pos);
  }

  update(data: DepthData): void {
    this.options = { ...this.options, data };
    this.requestRender();
  }

  setOptions(opts: Partial<DepthChartOptions>): void {
    this.options = { ...this.options, ...opts };
    this.requestRender();
  }

  destroy(): void {
    this.crosshair?.destroy();
    super.destroy();
  }
}
