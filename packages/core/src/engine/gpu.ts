import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';

/** Which renderer draws the chart: Canvas 2D, WebGL, or WebGL where it's fast and Canvas 2D otherwise. */
export type RendererMode = 'canvas' | 'webgl' | 'auto';

/** A filled rectangle in CSS pixels, in `color` at `alpha` (as `globalAlpha` would draw it). */
export interface GpuRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alpha: number;
}

/** What goes under the bars, unclipped: the grid, then filled rectangles (session shading, break lines). */
export interface GpuBackground {
  grid: boolean;
  rects: readonly GpuRect[];
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
}

/** What it drew: the rest is left to the 2D layers. */
export interface GpuDrawn {
  series: boolean;
  volume: boolean;
  background: boolean;
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
  /** Called once if the GPU context is lost (the engine then draws with Canvas 2D). */
  onLost(callback: () => void): void;
  destroy(): void;
}
