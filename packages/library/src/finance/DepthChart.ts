import type { DepthChartOptions, DepthData, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, FinanceCrosshair, renderDepthChart } from '@tradecanvas/core';

export class DepthChart extends BaseFinanceChart {
  private options: DepthChartOptions;
  /** Always listening: `crosshair` in the options says whether its place is drawn, so it can be switched later. */
  private readonly crosshair: FinanceCrosshair;

  constructor(container: HTMLElement, options: DepthChartOptions) {
    super(container, options.theme, options.font);
    this.options = options;

    this.crosshair = new FinanceCrosshair(this.canvas, () => {
      // With the readout off a move changes nothing drawn: no frame for it.
      if (this.options.crosshair !== false) this.requestRender();
    });
    this.applyLabel();

    this.requestRender();
  }

  /** What screen readers hear: `ariaLabel`, else what the chart holds. */
  private applyLabel(): void {
    this.setLabel(this.options.ariaLabel ?? `Depth chart of ${this.options.data.bids.length} bids and ${this.options.data.asks.length} asks`);
  }

  protected renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void {
    const pos = this.options.crosshair === false ? null : this.crosshair.getPosition();
    renderDepthChart(ctx, width, height, this.options, theme, pos);
  }

  update(data: DepthData): void {
    this.options = { ...this.options, data };
    this.applyLabel();
    this.requestRender();
  }

  setOptions(opts: Partial<DepthChartOptions>): void {
    this.options = { ...this.options, ...opts };
    this.applyBaseOptions({ ...opts, ariaLabel: undefined });
    this.applyLabel();
    this.requestRender();
  }

  destroy(): void {
    this.crosshair.destroy();
    super.destroy();
  }
}
