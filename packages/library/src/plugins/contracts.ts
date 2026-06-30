import type {
  IndicatorPlugin,
  DrawingPlugin,
  DataSeries,
  ViewportState,
  Theme,
  Point,
} from '@tradecanvas/commons';
import type { ChartRendererInterface } from '@tradecanvas/core';

/**
 * Plugin SDK contracts — FROZEN for 1.0. Authors extend the chart along four
 * axes. `IndicatorPlugin` and `DrawingPlugin` are re-used verbatim from
 * commons; `ChartTypePlugin` and `OverlayPlugin` are defined here because they
 * reference core's renderer interface.
 */
export const PLUGIN_API_VERSION = 1;

/** A custom chart type: a renderer plus an optional data transform. */
export interface ChartTypePlugin {
  descriptor: { type: string; name: string };
  createRenderer(): ChartRendererInterface;
  /** Derive the displayed series from raw OHLC (e.g. Heikin-Ashi, Renko). */
  transform?(data: DataSeries): DataSeries;
}

/** Render context handed to overlay plugins each frame. */
export interface OverlayRenderContext {
  viewport: ViewportState;
  data: DataSeries;
  theme: Theme;
}

/** A custom data overlay (e.g. a volume-profile-style layer). */
export interface OverlayPlugin {
  descriptor: { id: string; name: string; layer?: 'main' | 'overlay' | 'ui' };
  render(ctx: CanvasRenderingContext2D, context: OverlayRenderContext): void;
  hitTest?(point: Point, context: OverlayRenderContext): boolean;
}

/** Discriminated union accepted by `registerPlugin` and `chart.plugins.register`. */
export type ChartPlugin =
  | { kind: 'indicator'; plugin: IndicatorPlugin }
  | { kind: 'drawing'; plugin: DrawingPlugin }
  | { kind: 'chartType'; plugin: ChartTypePlugin }
  | { kind: 'overlay'; plugin: OverlayPlugin };

/** Overlays whose target layer matches `layer` (the default layer is `overlay`). */
export function overlaysForLayer(
  overlays: OverlayPlugin[],
  layer: 'main' | 'overlay' | 'ui',
): OverlayPlugin[] {
  return overlays.filter((o) => (o.descriptor.layer ?? 'overlay') === layer);
}

/** Stable identity for a plugin, used for registry de-duplication and `list()`. */
export function pluginKey(p: ChartPlugin): string {
  switch (p.kind) {
    case 'indicator':
      return `indicator:${p.plugin.descriptor.id}`;
    case 'drawing':
      return `drawing:${p.plugin.descriptor.type}`;
    case 'chartType':
      return `chartType:${p.plugin.descriptor.type}`;
    case 'overlay':
      return `overlay:${p.plugin.descriptor.id}`;
  }
}
