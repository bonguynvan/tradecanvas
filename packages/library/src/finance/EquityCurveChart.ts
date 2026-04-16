import type { EquityCurveOptions, EquityPoint, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, FinanceCrosshair, renderEquityCurve } from '@tradecanvas/core';

export class EquityCurveChart extends BaseFinanceChart {
  private options: EquityCurveOptions;
  private crosshair: FinanceCrosshair | null = null;

  constructor(container: HTMLElement, options: EquityCurveOptions) {
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
    renderEquityCurve(ctx, width, height, this.options, theme, pos);
  }

  update(data: EquityPoint[], benchmark?: EquityPoint[]): void {
    this.options = { ...this.options, data };
    if (benchmark !== undefined) {
      this.options = { ...this.options, benchmark };
    }
    this.requestRender();
  }

  setOptions(opts: Partial<EquityCurveOptions>): void {
    this.options = { ...this.options, ...opts };
    this.requestRender();
  }

  destroy(): void {
    this.crosshair?.destroy();
    super.destroy();
  }
}
