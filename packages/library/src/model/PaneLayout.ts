import type { PaneStyle, ResolvedLayout, ViewportState } from '@tradecanvas/commons';
import type { IndicatorEngine, PanelRenderInfo } from '@tradecanvas/core';
import type { LayoutManager } from '../layout/LayoutManager.js';

/** The pane's title and the line under it, above its plot. */
export const PANE_HEADER_HEIGHT = 20;
/** A pane's scale with no values on view. */
const DEFAULT_PANE_RANGE = { min: 0, max: 100 } as const;

/** What the panes read of the indicators drawn in them. */
export type PaneSources = Pick<
  IndicatorEngine,
  'getPaneValueRange' | 'getPaneMembers' | 'peekOutput' | 'getIndicatorDescriptor' | 'getActiveIndicators'
>;

/** Where the hovered bar is reported: from the top of the highest pane beside the price pane to the bottom of the lowest. */
export interface ReportBounds {
  top: number;
  bottom: number;
}

/**
 * The indicator panes as the renderer draws them: their place from the
 * layout, each on its own value scale, with its own style. Worked out once
 * a frame and kept until the layout or the values move. No DOM.
 */
export class PaneLayout {
  private layout: ResolvedLayout | null = null;
  private infos: PanelRenderInfo[] | null = null;
  private readonly styles = new Map<string, PaneStyle>();

  constructor(
    private readonly manager: LayoutManager,
    private readonly sources: PaneSources,
    /** Told each new layout's report bounds, for the crosshair. */
    private readonly onLayout: (bounds: ReportBounds) => void,
  ) {}

  resolved(): ResolvedLayout {
    if (!this.layout) {
      this.layout = this.manager.resolve();
      this.onLayout(reportBounds(this.layout));
    }
    return this.layout;
  }

  /** The layout changed (a size, a pane, an axis width): worked out again on the next read. */
  invalidate(): void {
    this.layout = null;
    this.infos = null;
  }

  /** The panes' values moved (a tick, a new indicator, a style): their scales are worked out again. */
  invalidateScales(): void {
    this.infos = null;
  }

  /** Each pane as drawn under the main viewport, read only when they are worked out again. */
  panels(mainState: () => ViewportState): PanelRenderInfo[] {
    if (this.infos) return this.infos;
    const main = mainState();
    const { from, to } = main.visibleRange;
    this.infos = this.resolved().panels.map((panel) => {
      const id = panel.config.id;
      // The pane's one value scale: plots, axis, crosshair and levels all use it.
      // On a log scale only while all its values are above 0.
      const logRange = panel.config.logScale ? this.sources.getPaneValueRange(id, from, to, true) : null;
      const priceRange = logRange ?? this.sources.getPaneValueRange(id, from, to) ?? { ...DEFAULT_PANE_RANGE };
      const style = this.styles.get(id);
      return {
        instanceId: id,
        members: this.sources.getPaneMembers(id),
        ...(style ? { style } : {}),
        rect: panel.rect,
        viewport: {
          ...main,
          // Below the pane's header.
          chartRect: {
            x: panel.rect.x,
            y: panel.rect.y + PANE_HEADER_HEIGHT,
            width: panel.rect.width,
            height: Math.max(0, panel.rect.height - PANE_HEADER_HEIGHT),
          },
          priceRange,
          logScale: logRange !== null,
          // In percent: labels only, of its first value on screen.
          scaleMode: panel.config.percentScale ? 'percentage' as const : 'regular' as const,
          scaleBaseline: panel.config.percentScale ? this.baseline(id, from, to) : undefined,
          // A pane's values are its own, not prices.
          formatPrice: undefined,
          pricePrecision: undefined,
          priceUnit: undefined,
          invertScale: !!panel.config.invertScale,
        },
      };
    });
    return this.infos;
  }

  /** Where the time axis starts: below the main chart and every pane under it. */
  timeAxisTop(): number {
    const { mainChartRect, panels } = this.resolved();
    const below = panels.filter((p) => p.config.position === 'bottom').reduce((sum, p) => sum + p.rect.height, 0);
    return mainChartRect.y + mainChartRect.height + below;
  }

  /**
   * The panes with nothing to draw on this chart type: every indicator in
   * them is left off it (a compare in its own pane, a correlation, on
   * Renko). They are laid out as if they weren't there, so no empty pane
   * with a made-up scale takes the plot's room; back on candles they return.
   */
  offChartType(): Set<string> {
    const active = this.sources.getActiveIndicators();
    const off = new Set(active.filter((ind) => ind.offChartType).map((ind) => ind.instanceId));
    const aside = new Set<string>();
    for (const panel of this.manager.getPanels()) {
      const members = active.filter((ind) => ind.instanceId === panel.id || ind.pane === panel.id);
      if (members.length > 0 && members.every((ind) => off.has(ind.instanceId))) aside.add(panel.id);
    }
    return aside;
  }

  // --- A pane's own style ---

  style(paneId: string): PaneStyle | undefined {
    return this.styles.get(paneId);
  }

  /** Set (or with null, take off) a pane's style: whether it changed. */
  setStyle(paneId: string, style: PaneStyle | null): boolean {
    if (JSON.stringify(style) === JSON.stringify(this.styles.get(paneId) ?? null)) return false;
    if (style) this.styles.set(paneId, style);
    else this.styles.delete(paneId);
    this.infos = null;
    return true;
  }

  /** A pane's style goes with the pane: to the indicator that takes it over, or away with it (`heir` null). */
  passStyle(paneId: string, heir: string | null): void {
    const style = this.styles.get(paneId);
    this.styles.delete(paneId);
    if (heir && style) this.styles.set(heir, style);
    this.infos = null;
  }

  /** A pane's first value on screen (its own indicator's first line), the 0% of a percent scale. */
  private baseline(paneId: string, from: number, to: number): number | undefined {
    const series = this.sources.peekOutput(paneId)?.series;
    const descriptor = this.sources.getIndicatorDescriptor(paneId);
    if (!series || !descriptor) return undefined;
    const key = descriptor.plots?.[0]?.key;
    for (let i = Math.max(0, from); i <= to && i < series.length; i++) {
      const point = series[i];
      if (!point) continue;
      const value = key !== undefined ? point[key] : Object.values(point).find((v) => typeof v === 'number' && Number.isFinite(v));
      if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return value;
    }
    return undefined;
  }
}

/** The hovered bar is reported over the price pane and the panes above and below it. */
export function reportBounds(layout: ResolvedLayout): ReportBounds {
  const main = layout.mainChartRect;
  let top = main.y;
  let bottom = main.y + main.height;
  for (const panel of layout.panels) {
    if (panel.config.position !== 'top' && panel.config.position !== 'bottom') continue;
    top = Math.min(top, panel.rect.y);
    bottom = Math.max(bottom, panel.rect.y + panel.rect.height);
  }
  return { top, bottom };
}
