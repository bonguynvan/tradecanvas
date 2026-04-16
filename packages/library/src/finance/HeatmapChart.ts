import type { HeatmapCell, HeatmapOptions, Theme } from '@tradecanvas/commons';
import {
  BaseFinanceChart,
  FinanceCrosshair,
  layoutUniformGrid,
  layoutSquarifiedTreemap,
  renderHeatmap,
} from '@tradecanvas/core';
import type { LayoutRect } from '@tradecanvas/core';

export class HeatmapChart extends BaseFinanceChart {
  private options: HeatmapOptions;
  private crosshair: FinanceCrosshair | null = null;
  private cachedRects: LayoutRect[] = [];
  private currentData: HeatmapCell[] = [];
  private lastLayoutWidth = 0;
  private lastLayoutHeight = 0;
  private handleClick: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement, options: HeatmapOptions) {
    super(container, options.theme);
    this.options = options;
    this.currentData = options.data ?? [];

    if (options.crosshair !== false) {
      this.crosshair = new FinanceCrosshair(this.canvas, () => this.requestRender());
    }

    if (options.onCellClick) {
      this.handleClick = (e: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.onCanvasClick(x, y);
      };
      this.canvas.addEventListener('click', this.handleClick);
    }

    this.recomputeLayout();
    this.requestRender();
  }

  private recomputeLayout(): void {
    const bounds = { x: 0, y: 0, width: this.width, height: this.height };
    const padding = this.options.cellPadding ?? 2;
    this.lastLayoutWidth = this.width;
    this.lastLayoutHeight = this.height;

    if (this.options.weighted) {
      const weighted = this.currentData.map(c => ({
        id: c.id,
        weight: c.weight ?? (Math.abs(c.value) || 1),
      }));
      this.cachedRects = layoutSquarifiedTreemap(weighted, bounds, padding);
    } else {
      this.cachedRects = layoutUniformGrid(
        this.currentData.map(c => ({ id: c.id })),
        bounds,
        padding,
      );
    }
  }

  private onCanvasClick(x: number, y: number): void {
    if (!this.options.onCellClick) return;

    for (const lr of this.cachedRects) {
      const r = lr.rect;
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        const cell = this.currentData.find(c => c.id === lr.id);
        if (cell) this.options.onCellClick(cell);
        return;
      }
    }
  }

  protected renderChart(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    theme: Theme,
  ): void {
    if (width !== this.lastLayoutWidth || height !== this.lastLayoutHeight) {
      this.recomputeLayout();
    }

    const pos = this.crosshair?.getPosition() ?? null;
    renderHeatmap(ctx, width, height, this.currentData, this.cachedRects, this.options, theme, pos);
  }

  update(data: HeatmapCell[]): void {
    this.currentData = data;
    this.options = { ...this.options, data };
    this.recomputeLayout();
    this.requestRender();
  }

  setOptions(opts: Partial<HeatmapOptions>): void {
    this.options = { ...this.options, ...opts };
    if (opts.data) {
      this.currentData = opts.data;
    }
    this.recomputeLayout();
    this.requestRender();
  }

  destroy(): void {
    this.crosshair?.destroy();
    if (this.handleClick) {
      this.canvas.removeEventListener('click', this.handleClick);
    }
    super.destroy();
  }
}
