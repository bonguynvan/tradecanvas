import { LayerType } from '@tradecanvas/commons';
import type { Size, ViewportState, Theme, DataSeries, Rect } from '@tradecanvas/commons';
import { priceToY, yToPrice, xToBarIndex, barIndexToX } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH, computeTickStep, formatPrice } from '@tradecanvas/commons';
import { LayerManager } from './LayerManager.js';
import { RenderLoop } from './RenderLoop.js';
import { DPRManager } from './DPRManager.js';
import type { CanvasLayer } from './CanvasLayer.js';
import type { ChartRendererInterface } from '../charts/ChartRenderer.js';
import type { GridRenderer } from '../axis/GridRenderer.js';
import type { PriceAxis } from '../axis/PriceAxis.js';
import type { TimeAxis } from '../axis/TimeAxis.js';
import type { CrosshairHandler } from '../interaction/CrosshairHandler.js';
import type { IndicatorEngine } from '../indicators/IndicatorEngine.js';
import type { DrawingRenderer } from '../drawings/DrawingRenderer.js';
import type { TradingRenderer } from '../trading/TradingRenderer.js';
import type { CurrentPriceLine } from '../realtime/CurrentPriceLine.js';
import type { ChartLegend } from '../ui/ChartLegend.js';
import type { Watermark } from '../ui/Watermark.js';
import type { BarCountdown } from '../ui/BarCountdown.js';
import type { SessionBreaks } from '../ui/SessionBreaks.js';
import type { VolumeRenderer } from '../charts/VolumeRenderer.js';
import type { CompareRenderer } from '../charts/CompareRenderer.js';
import type { AlertManager } from '../features/AlertManager.js';
import type { SignalMarkerManager } from '../features/SignalMarkerManager.js';
import type { TradeZoneManager } from '../features/TradeZoneManager.js';

/** Height of an indicator pane's title strip; the indicator draws below it. */
const PANEL_HEADER_HEIGHT = 20;

/** Decimals for a pane's axis labels and header values, from its tick step. */
function panelPrecision(step: number): number {
  if (step < 1) return Math.ceil(-Math.log10(step)) + 1;
  return step < 10 ? 1 : 0;
}

export interface PanelRenderInfo {
  instanceId: string;
  rect: Rect;
  viewport: ViewportState;
}

export interface RenderContext {
  chartRenderer: ChartRendererInterface | null;
  gridRenderer: GridRenderer | null;
  priceAxis: PriceAxis | null;
  timeAxis: TimeAxis | null;
  crosshairHandler: CrosshairHandler | null;
  indicatorEngine: IndicatorEngine | null;
  drawingRenderer: DrawingRenderer | null;
  tradingRenderer: TradingRenderer | null;
  currentPriceLine: CurrentPriceLine | null;
  chartLegend: ChartLegend | null;
  volumeRenderer: VolumeRenderer | null;
  volumeProfile: import('../charts/VolumeProfileRenderer.js').VolumeProfileRenderer | null;
  marketProfile: import('../charts/MarketProfileRenderer.js').MarketProfileRenderer | null;
  depthHeatmap: import('../charts/DepthHeatmapRenderer.js').DepthHeatmapRenderer | null;
  periodLevels: import('../charts/PeriodLevelsRenderer.js').PeriodLevelsRenderer | null;
  pivotMarkers: import('../charts/PivotMarkersRenderer.js').PivotMarkersRenderer | null;
  watermark: Watermark | null;
  barCountdown: BarCountdown | null;
  sessionBreaks: SessionBreaks | null;
  sessionShading: import('../ui/SessionShading.js').SessionShading | null;
  compareRenderer: CompareRenderer | null;
  alertManager: AlertManager | null;
  signalMarkerManager: SignalMarkerManager | null;
  measureOverlay: import('../features/MeasureOverlay.js').MeasureOverlay | null;
  selectionBoxOverlay?: import('../features/SelectionBoxOverlay.js').SelectionBoxOverlay | null;
  tradeZoneManager: TradeZoneManager | null;
  panels: PanelRenderInfo[];
  priceLimits?: { ceiling: number; floor: number; reference: number; colors?: { ceiling?: string; floor?: string; reference?: string } } | null;
  timeAxisY?: number;
  viewport: ViewportState;
  theme: Theme;
  data: DataSeries;
  /** BCP 47 locale for number formatting. Defaults to 'en-US' when not set. */
  numberLocale?: string;
  /** Write each indicator pane's name, and the values under the cursor, in its header (default). Off when the host labels panes itself. */
  paneTitles?: boolean;
  /** Draw registered overlay plugins for a layer (populated by the Chart). */
  renderOverlayPlugins?: ((ctx: CanvasRenderingContext2D, layer: 'main' | 'overlay' | 'ui') => void) | null;
}

export class RenderEngine {
  readonly layerManager: LayerManager;
  readonly renderLoop: RenderLoop;
  readonly dprManager: DPRManager;
  private renderCtx: RenderContext | null = null;

  // Cached canvas references — avoid a lookup per frame
  private sceneLayer: CanvasLayer | undefined;
  private topLayer: CanvasLayer | undefined;

  /**
   * Optional hook fired AFTER the canvas layers have been resized in
   * response to a container resize. The Chart class uses this to push the
   * new dimensions into its viewport + layout manager — without it, the
   * viewport keeps a stale chartRect forever and `scrollToEnd` / panning
   * compute against the wrong width.
   */
  onContainerResize: ((size: Size) => void) | null = null;

  constructor(container: HTMLElement) {
    this.layerManager = new LayerManager(container);
    this.renderLoop = new RenderLoop();
    this.dprManager = new DPRManager(container);

    this.layerManager.createLayers();
    this.cacheLayerRefs();

    this.renderLoop.setCallback((dirtyLayers) => this.render(dirtyLayers));

    this.dprManager.onResize((size, dpr) => {
      this.layerManager.resize(size, dpr);
      this.renderLoop.markAllDirty();
      // Notify the Chart so it can update viewport.chartRect + layout.
      // Without this, container resizes leave the viewport's idea of width
      // stuck at whatever it was at construction time.
      this.onContainerResize?.(size);
    });

    const size = this.dprManager.getContainerSize();
    const dpr = this.dprManager.getDpr();
    this.layerManager.resize(size, dpr);
  }

  private cacheLayerRefs(): void {
    this.sceneLayer = this.layerManager.getLayer(LayerType.Main);
    this.topLayer = this.layerManager.getLayer(LayerType.Hover);
  }

  setRenderContext(ctx: RenderContext): void {
    this.renderCtx = ctx;
  }

  start(): void {
    this.renderLoop.start();
  }

  stop(): void {
    this.renderLoop.stop();
  }

  requestRender(layer?: LayerType): void {
    if (layer !== undefined) {
      this.renderLoop.markDirty(layer);
    } else {
      this.renderLoop.markAllDirty();
    }
  }

  private render(dirtyLayers: ReadonlySet<LayerType>): void {
    const ctx = this.renderCtx;
    if (!ctx) return;

    // Skip rendering if viewport has zero dimensions
    const { chartRect } = ctx.viewport;
    if (chartRect.width <= 0 || chartRect.height <= 0) return;

    // Anything except a hover-only change redraws the scene. The top canvas
    // always follows: it is nearly empty, and what it shows (legend values,
    // crosshair pills) can depend on any of it.
    let sceneDirty = false;
    for (const layer of dirtyLayers) {
      if (layer !== LayerType.Hover) { sceneDirty = true; break; }
    }
    if (sceneDirty && this.sceneLayer) this.renderScene(this.sceneLayer, ctx);
    if (this.topLayer) this.renderTop(this.topLayer, ctx);
  }

  /** Everything that only changes with data, viewport or chart objects. */
  private renderScene(layer: CanvasLayer, ctx: RenderContext): void {
    const { viewport, theme, data } = ctx;
    layer.clear();
    const c = layer.ctx;

    // --- Background: grid, session shading/breaks, watermark ---
    ctx.gridRenderer?.render(c, viewport, theme);
    ctx.sessionShading?.render(c, data, viewport, theme);
    ctx.sessionBreaks?.render(c, viewport, theme, data);
    ctx.watermark?.render(c, viewport, theme);

    // --- Series, volume, overlay indicators (clipped to the main chart) ---
    c.save();
    c.beginPath();
    c.rect(viewport.chartRect.x, viewport.chartRect.y, viewport.chartRect.width, viewport.chartRect.height);
    c.clip();
    // Liquidity heatmap (backmost, behind volume + candles)
    ctx.depthHeatmap?.render(c, viewport, theme);
    // Volume bars (drawn first, behind candles)
    ctx.volumeRenderer?.render(c, data, viewport, theme);
    ctx.volumeProfile?.render(c, data, viewport, theme);
    ctx.marketProfile?.render(c, data, viewport, theme);
    ctx.chartRenderer?.render(c, data, viewport, theme);
    ctx.compareRenderer?.render(c, data, viewport, theme);
    ctx.indicatorEngine?.renderOverlays(c, viewport);
    ctx.periodLevels?.render(c, data, viewport, theme);
    ctx.pivotMarkers?.render(c, data, viewport, theme);
    ctx.renderOverlayPlugins?.(c, 'main');
    c.restore();

    this.renderPanels(c, ctx);

    // --- Chart objects: limits, trade zones, drawings, orders, markers, alerts ---
    if (ctx.priceLimits) this.renderPriceLimits(c, viewport, theme, ctx.priceLimits);
    ctx.tradeZoneManager?.render(c, viewport, theme);
    ctx.drawingRenderer?.render(c, viewport);
    ctx.tradingRenderer?.render(c, viewport, theme);
    ctx.signalMarkerManager?.render(c, viewport, theme);
    ctx.alertManager?.render(c, viewport, theme);

    // --- Axes and price tags ---
    ctx.priceAxis?.render(c, viewport, theme);
    // Trading axis badges paint ON TOP of the regular price axis labels
    // so position entry prices and order trigger prices are always visible.
    ctx.tradingRenderer?.renderAxisBadges(c, viewport, theme);
    ctx.currentPriceLine?.render(c, viewport, theme);
    ctx.timeAxis?.render(c, viewport, theme, data, ctx.timeAxisY);
    this.renderPanelAxes(c, ctx);
  }

  /**
   * Pointer-tied visuals only — crosshair, its axis pills, the legend (it
   * shows the hovered bar), bar countdown, measure ruler, selection box.
   * A hover redraws just this thin layer, never the scene underneath.
   */
  private renderTop(layer: CanvasLayer, ctx: RenderContext): void {
    const { viewport, theme, data } = ctx;
    layer.clear();
    const c = layer.ctx;

    ctx.measureOverlay?.render(c, viewport, theme);
    ctx.selectionBoxOverlay?.render(c, viewport, theme);
    ctx.crosshairHandler?.render(c, viewport, theme);
    // Overlay plugins sit above the crosshair and repaint with it, as they did
    // when every pointer move repainted the overlay layer.
    ctx.renderOverlayPlugins?.(c, 'overlay');
    this.renderPanelCrosshair(c, ctx);
    // Crosshair axis hover pills sit on top of the static price/time labels.
    ctx.crosshairHandler?.renderAxisLabels(c, viewport, theme, data, ctx.timeAxisY);
    ctx.chartLegend?.render(c, viewport, theme, data);
    ctx.barCountdown?.render(c, viewport, theme, data);
    ctx.renderOverlayPlugins?.(c, 'ui');
    this.renderPanelHoverValues(c, ctx);
  }

  /** Indicator panes: background, divider, name and the indicator itself. */
  private renderPanels(c: CanvasRenderingContext2D, ctx: RenderContext): void {
    const { theme } = ctx;
    const panels = ctx.panels;
    const indicatorEngine = ctx.indicatorEngine;
    if (!indicatorEngine || panels.length === 0) return;

    // Cache font string once for all panels
    const panelFont = `10px ${theme.font.family}`;
    // Build descriptor lookup once per frame — avoids O(n*m) .find() per panel
    const descMap = this.panelDescriptors(indicatorEngine);

    for (const panel of panels) {
      if (panel.rect.width <= 0 || panel.rect.height <= 0) continue;

      c.save();
      c.beginPath();
      c.rect(panel.rect.x, panel.rect.y, panel.rect.width, panel.rect.height);
      c.clip();

      // Panel background
      c.fillStyle = theme.background;
      c.fillRect(panel.rect.x, panel.rect.y, panel.rect.width, panel.rect.height);

      // Thick divider bar at top of panel
      c.fillStyle = theme.axisLine;
      c.fillRect(panel.rect.x, panel.rect.y, panel.rect.width, 3);

      // Panel indicator name in header area
      c.fillStyle = theme.textSecondary;
      c.font = panelFont;
      c.textBaseline = 'top';
      c.textAlign = 'left';
      const desc = descMap.get(panel.instanceId);
      if (desc && ctx.paneTitles !== false) c.fillText(desc.descriptor.name, panel.rect.x + 6, panel.rect.y + 6);

      // Clip indicator rendering to below the header
      c.save();
      c.beginPath();
      c.rect(panel.rect.x, panel.rect.y + PANEL_HEADER_HEIGHT, panel.rect.width, panel.rect.height - PANEL_HEADER_HEIGHT);
      c.clip();
      indicatorEngine.renderPanel(c, panel.instanceId, panel.viewport);
      c.restore();

      c.restore();
    }
  }

  /** Panel Y-axes: axis line, ticks and value labels. */
  private renderPanelAxes(c: CanvasRenderingContext2D, ctx: RenderContext): void {
    const { theme } = ctx;
    const locale = ctx.numberLocale ?? 'en-US';
    const panelFont = `${theme.font.sizeSmall}px ${theme.font.family}`;

    for (const panel of ctx.panels) {
      const pv = panel.viewport;
      const pr = panel.rect;
      const { min, max } = pv.priceRange;
      if (max - min <= 0 || pr.height <= 0) continue;

      const axisX = pr.x + pr.width;
      const insetRect = pv.chartRect; // already inset by header

      c.strokeStyle = theme.axisLine;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(axisX + 0.5, pr.y);
      c.lineTo(axisX + 0.5, pr.y + pr.height);
      c.stroke();

      const step = computeTickStep(min, max, 4);
      const firstVal = Math.ceil(min / step) * step;
      const precision = panelPrecision(step);

      c.font = panelFont;
      c.textBaseline = 'middle';
      c.textAlign = 'left';

      for (let val = firstVal; val <= max; val += step) {
        const y = priceToY(val, pv);
        if (y < insetRect.y || y > insetRect.y + insetRect.height) continue;
        c.strokeStyle = theme.axisLine;
        c.beginPath();
        c.moveTo(axisX, Math.round(y) + 0.5);
        c.lineTo(axisX + 4, Math.round(y) + 0.5);
        c.stroke();
        c.fillStyle = theme.axisLabel;
        c.fillText(formatPrice(val, precision, locale), axisX + 6, y);
      }
    }
  }

  /** Crosshair lines inside the hovered indicator pane. */
  private renderPanelCrosshair(c: CanvasRenderingContext2D, ctx: RenderContext): void {
    const cursorPos = ctx.crosshairHandler?.getPosition();
    if (!cursorPos || ctx.panels.length === 0) return;
    const { theme } = ctx;
    for (const panel of ctx.panels) {
      const pr = panel.rect;
      if (cursorPos.x < pr.x || cursorPos.x > pr.x + pr.width || cursorPos.y < pr.y || cursorPos.y > pr.y + pr.height) {
        continue;
      }
      const pv = panel.viewport;
      // Vertical line (synced with main chart bar snapping)
      const barIdx = xToBarIndex(cursorPos.x, pv);
      const snappedIdx = Math.max(0, Math.min((ctx.data?.length ?? 1) - 1, Math.round(barIdx)));
      const cx = barIndexToX(snappedIdx, pv);

      c.save();
      c.beginPath();
      c.rect(pr.x, pr.y, pr.width, pr.height);
      c.clip();
      c.setLineDash([4, 4]);
      c.strokeStyle = theme.crosshair;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(Math.round(cx) + 0.5, pr.y);
      c.lineTo(Math.round(cx) + 0.5, pr.y + pr.height);
      c.stroke();
      c.beginPath();
      c.moveTo(pr.x, Math.round(cursorPos.y) + 0.5);
      c.lineTo(pr.x + pr.width, Math.round(cursorPos.y) + 0.5);
      c.stroke();
      c.setLineDash([]);
      c.restore();
      break;
    }
  }

  /** Crosshair value badge on a pane's axis and the hovered bar's values in each pane header. */
  private renderPanelHoverValues(c: CanvasRenderingContext2D, ctx: RenderContext): void {
    const cursorPos = ctx.crosshairHandler?.getPosition();
    const indicatorEngine = ctx.indicatorEngine;
    if (!cursorPos || ctx.panels.length === 0) return;
    const { theme, viewport, data } = ctx;
    const locale = ctx.numberLocale ?? 'en-US';
    const panelFont = `${theme.font.sizeSmall}px ${theme.font.family}`;
    const descMap = indicatorEngine ? this.panelDescriptors(indicatorEngine) : null;

    for (const panel of ctx.panels) {
      const pv = panel.viewport;
      const pr = panel.rect;
      const { min, max } = pv.priceRange;
      if (max - min <= 0 || pr.height <= 0) continue;
      const axisX = pr.x + pr.width;
      const precision = panelPrecision(computeTickStep(min, max, 4));

      if (cursorPos.x >= pr.x && cursorPos.x <= pr.x + pr.width && cursorPos.y >= pr.y && cursorPos.y <= pr.y + pr.height) {
        const valText = formatPrice(yToPrice(cursorPos.y, pv), precision, locale);
        c.font = `bold ${theme.font.sizeSmall}px ${theme.font.family}`;
        const tw = c.measureText(valText).width;
        const badgeW = Math.min(tw + 10, (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2);
        c.fillStyle = theme.crosshair;
        c.fillRect(axisX + 1, cursorPos.y - 9, badgeW, 18);
        c.fillStyle = theme.background;
        c.textBaseline = 'middle';
        c.textAlign = 'left';
        c.fillText(valText, axisX + 5, cursorPos.y);
      }

      // The values at the cursor go in the header, unless the host shows them itself.
      if (!indicatorEngine || ctx.paneTitles === false) continue;
      const snappedIdx = Math.max(0, Math.min((data?.length ?? 1) - 1, Math.round(xToBarIndex(cursorPos.x, pv))));
      const output = indicatorEngine.getOutput(panel.instanceId);
      const val = output?.series && snappedIdx < output.series.length ? output.series[snappedIdx] : null;
      if (!val) continue;
      const parts: string[] = [];
      for (const key in val) {
        const v = val[key];
        if (v !== undefined) parts.push(`${key}: ${v.toFixed(precision)}`);
      }
      if (parts.length === 0) continue;
      const desc = descMap?.get(panel.instanceId);
      c.font = panelFont;
      const nameWidth = desc ? c.measureText(desc.descriptor.name).width + 14 : 10;
      c.fillStyle = theme.textSecondary;
      c.textBaseline = 'top';
      c.textAlign = 'left';
      c.fillText(parts.join('  '), pr.x + nameWidth, pr.y + 6);
    }
  }

  private panelDescriptors(indicatorEngine: IndicatorEngine): Map<string, ReturnType<IndicatorEngine['getPanelIndicators']>[number]> {
    const map = new Map<string, ReturnType<IndicatorEngine['getPanelIndicators']>[number]>();
    for (const d of indicatorEngine.getPanelIndicators()) map.set(d.instanceId, d);
    return map;
  }

  private renderPriceLimits(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    theme: Theme,
    limits: NonNullable<RenderContext['priceLimits']>,
  ): void {
    const { chartRect } = viewport;
    const lines = [
      { price: limits.ceiling, color: limits.colors?.ceiling ?? '#FF00FF', label: 'CE' },
      { price: limits.floor, color: limits.colors?.floor ?? '#00FFFF', label: 'FL' },
      { price: limits.reference, color: limits.colors?.reference ?? '#FFD700', label: 'REF' },
    ];

    const boldFont = `bold 9px ${theme.font.family}`;
    const normalFont = `10px ${theme.font.family}`;

    for (const { price, color, label } of lines) {
      const y = priceToY(price, viewport);
      if (y < chartRect.y || y > chartRect.y + chartRect.height) continue;

      ctx.setLineDash([8, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartRect.x, Math.round(y) + 0.5);
      ctx.lineTo(chartRect.x + chartRect.width, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.font = boldFont;
      ctx.fillStyle = color;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} ${price.toFixed(2)}`, chartRect.x + 4, y - 2);

      // Axis badge
      const axisX = chartRect.x + chartRect.width + 1;
      ctx.fillStyle = color;
      ctx.fillRect(axisX, y - 7, (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2, 14);
      ctx.fillStyle = '#000';
      ctx.font = normalFont;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), axisX + 4, y);
    }
  }

  destroy(): void {
    this.renderLoop.stop();
    this.dprManager.destroy();
    this.layerManager.destroy();
  }
}
