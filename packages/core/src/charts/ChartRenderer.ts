import type { DataSeries, ViewportState, Theme } from '@chart-lib/commons';

export interface ChartRendererInterface {
  render(
    ctx: CanvasRenderingContext2D,
    data: DataSeries,
    viewport: ViewportState,
    theme: Theme,
  ): void;
}
