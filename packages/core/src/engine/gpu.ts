import type { ChartOptions, DataSeries, Rect, Theme, ViewportState } from '@tradecanvas/commons';

/** Which renderer draws the chart: Canvas 2D, WebGL, or WebGL where it's fast and Canvas 2D otherwise. */
export type RendererMode = NonNullable<ChartOptions['renderer']>;

/** A filled rectangle in CSS pixels, in `color` at `alpha` (as `globalAlpha` would draw it). */
export interface GpuRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
  /** Dashed down from the top: on and off lengths in CSS pixels, as `setLineDash` lays them out. */
  dash?: readonly [number, number];
}

/** What goes under the bars, unclipped: the grid, then filled rectangles (session shading, break lines). */
export interface GpuBackground {
  grid: boolean;
  rects: readonly GpuRect[];
}

/**
 * Canvas 2D drawing recorded for the GPU, region by region (the plot, a
 * pane), in the order the GPU draws it: after the bars.
 */
export interface GpuRecorder {
  /** Start a region of the chart, clipped to `clip` (CSS pixels). */
  region(clip: Rect): GpuRegion;
}

export interface GpuRegion {
  /**
   * Run `draw` on a recording 2D context. True when the GPU can draw all of
   * it; false when it can't, and then nothing of it is kept: draw it with
   * Canvas 2D (and everything after it, to keep the order).
   */
  step(draw: (c: CanvasRenderingContext2D) => void): boolean;
  /** The text the kept steps wrote (the GPU draws none), drawn on a 2D context. */
  drawText(c: CanvasRenderingContext2D): void;
}

/** What a GPU renderer is asked to draw in a frame. */
export interface GpuFrame {
  data: DataSeries;
  viewport: ViewportState;
  theme: Theme;
  /** Device pixels per CSS pixel. */
  dpr: number;
  /** Draw the main series as candles. */
  candles: boolean;
  /** Draw volume, this share of the plot high; null for none. */
  volume: { heightRatio: number } | null;
  /** Draw the background under the bars; null to leave it to Canvas 2D. */
  background: GpuBackground | null;
  /** Drawing recorded on this renderer's `recorder()`, drawn over the bars. */
  recorded?: GpuRecorder | null;
}

/** What it drew: the rest is left to the 2D layers. */
export interface GpuDrawn {
  series: boolean;
  volume: boolean;
  background: boolean;
  /** Whether it drew `recorded`. */
  recorded?: boolean;
}

/**
 * A renderer on its own canvas, under the 2D scene: the heavy, regular
 * geometry (grid, bars, volume) on the GPU. The engine falls back to Canvas
 * 2D for whatever it doesn't draw, and altogether when its context is lost.
 */
export interface GpuRenderer {
  readonly canvas: HTMLCanvasElement;
  /** A short name of the GPU, for diagnostics. */
  readonly label: string;
  render(frame: GpuFrame): GpuDrawn;
  /**
   * A recorder for this frame's drawing at `dpr`; `measure` measures text and
   * draws nothing. Without one, everything past the bars is Canvas 2D.
   */
  recorder?(dpr: number, measure: CanvasRenderingContext2D | null): GpuRecorder;
  /** Called once if the GPU context is lost (the engine then draws with Canvas 2D). */
  onLost(callback: () => void): void;
  destroy(): void;
}
