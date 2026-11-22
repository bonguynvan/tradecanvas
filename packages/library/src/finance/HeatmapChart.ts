import type { HeatmapCell, HeatmapOptions, Theme } from '@tradecanvas/commons';
import { BaseFinanceChart, FinanceCrosshair, ImageStore, computeHeatmapLayout, renderHeatmap } from '@tradecanvas/core';
import type { CellImage, GroupRect, LayoutRect } from '@tradecanvas/core';

export class HeatmapChart extends BaseFinanceChart {
  private options: HeatmapOptions;
  /** Always listening: `crosshair` in the options says whether its place is drawn, so it can be switched later. */
  private readonly crosshair: FinanceCrosshair;
  private cachedRects: LayoutRect[] = [];
  private cachedGroups: GroupRect[] = [];
  private currentData: HeatmapCell[] = [];
  private lastLayoutWidth = 0;
  private lastLayoutHeight = 0;
  /** The cells' logos, each asked for when its cell first draws it: a frame is drawn again when one has come. */
  private readonly logos = new ImageStore(() => this.requestRender());
  private readonly logoOf = (cell: HeatmapCell): CellImage | null => this.logos.get(cell.logo);
  /** Always listening: a callback given later through `setOptions` is called too. */
  private readonly handleClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.onCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
  };

  constructor(container: HTMLElement, options: HeatmapOptions) {
    super(container, options.theme, options.font);
    this.options = options;
    this.currentData = options.data ?? [];

    this.crosshair = new FinanceCrosshair(this.canvas, () => {
      // With the readout off a move changes nothing drawn: no frame for it.
      if (this.options.crosshair !== false) this.requestRender();
    });
    this.canvas.addEventListener('click', this.handleClick);

    this.applyLabel();
    this.recomputeLayout();
    this.requestRender();
  }

  /** What screen readers hear: `ariaLabel`, else the cells and groups it has. */
  private applyLabel(): void {
    const groups = new Set(this.currentData.map((c) => c.group).filter(Boolean)).size;
    const described = this.options.grouped && groups > 0
      ? `Market map of ${this.currentData.length} cells in ${groups} groups`
      : `Heatmap of ${this.currentData.length} cells`;
    this.setLabel(this.options.ariaLabel ?? described);
  }

  private recomputeLayout(): void {
    this.lastLayoutWidth = this.width;
    this.lastLayoutHeight = this.height;
    const { rects, groups } = computeHeatmapLayout({ ...this.options, data: this.currentData }, this.width, this.height);
    this.cachedRects = rects;
    this.cachedGroups = groups;
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

    const pos = this.options.crosshair === false ? null : this.crosshair.getPosition();
    renderHeatmap(ctx, width, height, this.currentData, this.cachedRects, this.options, theme, pos, this.cachedGroups, this.logoOf);
  }

  /** A picture of the chart: laid out for the picture's own size, with nothing under a pointer. */
  protected renderStill(ctx: CanvasRenderingContext2D, width: number, height: number, theme: Theme): void {
    const { rects, groups } = computeHeatmapLayout({ ...this.options, data: this.currentData }, width, height);
    renderHeatmap(ctx, width, height, this.currentData, rects, this.options, theme, null, groups, this.logoOf);
  }

  update(data: HeatmapCell[]): void {
    this.currentData = data;
    this.options = { ...this.options, data };
    this.applyLabel();
    this.recomputeLayout();
    this.requestRender();
  }

  setOptions(opts: Partial<HeatmapOptions>): void {
    this.options = { ...this.options, ...opts };
    // The label is the heatmap's own to word (applyLabel): only the theme is taken here.
    this.applyBaseOptions({ ...('theme' in opts ? { theme: opts.theme } : {}), ...('font' in opts ? { font: opts.font } : {}) });
    if (opts.data) {
      this.currentData = opts.data;
    }
    this.applyLabel();
    this.recomputeLayout();
    this.requestRender();
  }

  destroy(): void {
    this.crosshair.destroy();
    this.logos.destroy();
    this.canvas.removeEventListener('click', this.handleClick);
    super.destroy();
  }
}
