import { LayerType } from '@tradecanvas/commons';
import type { Size, ViewportState, Theme, DataSeries, Rect, PaneStyle } from '@tradecanvas/commons';
import { priceToY, yToPrice, xToBarIndex, barIndexToX } from '../viewport/ScaleMapping.js';
import { PRICE_AXIS_WIDTH, autoPricePrecision, computeTickStep, formatPrice, lineDash } from '@tradecanvas/commons';
import { priceScaleText } from '../axis/PriceAxis.js';
import { LayerManager } from './LayerManager.js';
import { renderAxisValueLabels, layoutAxisValueLabels, drawAxisValueLabels, indicatorValuePrecision, type AxisValueLabel, type FixedAxisTag } from '../ui/axisValueLabels.js';
import { RenderLoop } from './RenderLoop.js';
import { DPRManager } from './DPRManager.js';
import type { CanvasLayer } from './CanvasLayer.js';
import type { GpuBackground, GpuDrawn, GpuRecorder, GpuRenderer } from './gpu.js';
import { canvasPlan, recordSteps, type DrawStep, type PaneSteps, type StepPlan } from './plotSteps.js';
import { CandlestickRenderer } from '../charts/CandlestickRenderer.js';
import type { ChartRendererInterface } from '../charts/ChartRenderer.js';
import { gridFitsGpu, type GridRenderer } from '../axis/GridRenderer.js';
import { crosshairLooks } from '../interaction/crosshairLooks.js';
import { crispX, crispY } from '../charts/pixelGrid.js';
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
import { fillTag } from '../ui/shapes.js';

/** Height of an indicator pane's title strip; the indicator draws below it. */
const PANEL_HEADER_HEIGHT = 20;
/** Below this a pane (folded to its header) draws no scale. */
const MIN_PANE_PLOT_HEIGHT = 8;

/** `steps` recorded in one region, all or none: a recorder holding all of them, or null. */
function recordAll(recorder: GpuRecorder | null, clip: Rect, steps: readonly DrawStep[]): GpuRecorder | null {
  if (!recorder) return null;
  // No text: there is no 2D layer between the GPU's background and its bars.
  const region = recorder.region(clip, { text: false });
  return steps.every((step) => region.step(step)) ? recorder : null;
}

/** Decimals for a pane's axis labels and header values, from its tick step. */
function panelPrecision(step: number): number {
  if (step < 1) return Math.ceil(-Math.log10(step)) + 1;
  return step < 10 ? 1 : 0;
}

export interface PanelRenderInfo {
  instanceId: string;
  /** Other instances drawn in this pane, on its scale. */
  members?: string[];
  rect: Rect;
  viewport: ViewportState;
  /** Its own background and separator, over the panes' style. */
  style?: PaneStyle;
}

export interface RenderContext {
  chartRenderer: ChartRendererInterface | null;
  gridRenderer: GridRenderer | null;
  priceAxis: PriceAxis | null;
  /**
   * The left price scale, when shown: overlays on it draw with this viewport
   * (its own range), and its axis sits left of the plot, `leftAxisWidth` wide.
   */
  leftViewport?: ViewportState | null;
  leftPriceAxis?: PriceAxis | null;
  leftAxisWidth?: number;
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
  /** The visible high and low, the bid and the ask. */
  priceLines?: import('../ui/PriceLines.js').PriceLines | null;
  alertManager: AlertManager | null;
  signalMarkerManager: SignalMarkerManager | null;
  measureOverlay: import('../features/MeasureOverlay.js').MeasureOverlay | null;
  selectionBoxOverlay?: import('../features/SelectionBoxOverlay.js').SelectionBoxOverlay | null;
  /** The "+" by the price axis, level with the crosshair. */
  priceAxisAddButton?: import('../interaction/PriceAxisAddButton.js').PriceAxisAddButton | null;
  tradeZoneManager: TradeZoneManager | null;
  panels: PanelRenderInfo[];
  priceLimits?: { ceiling: number; floor: number; reference: number; colors?: { ceiling?: string; floor?: string; reference?: string } } | null;
  timeAxisY?: number;
  viewport: ViewportState;
  theme: Theme;
  data: DataSeries;
  /** Tag each indicator line's latest value on its value axis (default on). */
  indicatorValueLabels?: boolean;
  /** Price text as the price axis writes it (precision, locale). */
  formatPrice?: (price: number) => string;
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
  /** The GPU renderer under the scene. */
  private gpu: GpuRenderer | null = null;
  /** A GPU whose context was lost, kept for when it comes back. */
  private lostGpu: GpuRenderer | null = null;

  /** Called when the GPU context is lost and the engine has gone back to Canvas 2D. */
  onGpuLost: (() => void) | null = null;
  /** Called when the lost context came back and the engine draws with the GPU again. */
  onGpuRestored: (() => void) | null = null;

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

  /** Draw bars and volume with `gpu`, on its canvas under the scene. */
  attachGpu(gpu: GpuRenderer): void {
    this.detachGpu();
    this.placeGpu(gpu);
    // Lost: Canvas 2D, keeping the GPU for when its context comes back.
    gpu.onLost(() => {
      if (this.gpu !== gpu) return;
      this.gpu = null;
      this.lostGpu = gpu;
      this.layerManager.detachGpu();
      this.renderLoop.markAllDirty();
      this.onGpuLost?.();
    });
    gpu.onRestored?.(() => {
      if (this.lostGpu !== gpu) return;
      this.lostGpu = null;
      this.placeGpu(gpu);
      this.onGpuRestored?.();
    });
  }

  private placeGpu(gpu: GpuRenderer): void {
    this.gpu = gpu;
    this.layerManager.attachGpu(gpu.canvas);
    this.renderLoop.markAllDirty();
  }

  /** Back to Canvas 2D for everything. */
  detachGpu(): void {
    const gpu = this.gpu ?? this.lostGpu;
    if (!gpu) return;
    this.gpu = null;
    this.lostGpu = null;
    this.layerManager.detachGpu();
    gpu.destroy();
    this.renderLoop.markAllDirty();
  }

  /** Draw every layer now, synchronously (a screenshot reads the GPU canvas before the browser clears it). */
  renderNow(): void {
    this.render(new Set([LayerType.Main, LayerType.Hover]));
  }

  /** The GPU renderer in use, if any. */
  getGpu(): GpuRenderer | null {
    return this.gpu;
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
    const gpu = this.gpu;
    // Candles the GPU draws itself; any other series is a step like the rest.
    const native = !!gpu && ctx.chartRenderer instanceof CandlestickRenderer;
    const series: DrawStep[] = ctx.chartRenderer ? [(s) => ctx.chartRenderer!.render(s, data, viewport, theme)] : [];
    const plot: DrawStep[] = [
      ...(native ? [] : series),
      ...(ctx.compareRenderer ? [(s: CanvasRenderingContext2D) => ctx.compareRenderer!.render(s, data, viewport, theme)] : []),
      ...(ctx.indicatorEngine?.overlayDraws(viewport, ctx.leftViewport ?? undefined) ?? []),
    ];
    const panes = this.paneSteps(ctx);
    let drawn: GpuDrawn = { series: false, volume: false, background: false };
    let plan = canvasPlan(plot);

    if (gpu) {
      ({ drawn, plan } = this.renderGpu(gpu, ctx, c, plot, panes));
      // The GPU drew nothing (its context is lost): its candles go first.
      if (native && !drawn.series) plan = { ...plan, plot: [...series, ...plan.plot] };
    } else {
      this.renderBackground(c, ctx);
    }

    // --- Series, volume, overlay indicators (clipped to the main chart) ---
    c.save();
    c.beginPath();
    c.rect(viewport.chartRect.x, viewport.chartRect.y, viewport.chartRect.width, viewport.chartRect.height);
    c.clip();
    if (!gpu) {
      // Liquidity heatmap (backmost, behind volume + candles)
      ctx.depthHeatmap?.render(c, viewport, theme);
    }
    // Volume bars (drawn first, behind candles)
    if (!drawn.volume) ctx.volumeRenderer?.render(c, data, viewport, theme);
    if (!gpu) {
      ctx.volumeProfile?.render(c, data, viewport, theme);
      ctx.marketProfile?.render(c, data, viewport, theme);
    }
    // The series, compare and overlays: what the GPU didn't draw, over what it did.
    plan.plotText?.drawText(c);
    for (const step of plan.plot) step(c);
    // Break labels over the bars and indicators, which would otherwise hide them.
    ctx.sessionBreaks?.renderLabels(c, viewport, theme, data);
    ctx.periodLevels?.render(c, data, viewport, theme);
    ctx.pivotMarkers?.render(c, data, viewport, theme);
    ctx.renderOverlayPlugins?.(c, 'main');
    c.restore();

    this.renderPanels(c, ctx, panes, plan);

    // --- Chart objects: limits, trade zones, drawings, orders, markers, alerts ---
    if (ctx.priceLimits) this.renderPriceLimits(c, viewport, theme, ctx.priceLimits);
    ctx.tradeZoneManager?.render(c, viewport, theme);
    ctx.drawingRenderer?.render(c, viewport, theme);
    ctx.tradingRenderer?.render(c, viewport, theme);
    ctx.signalMarkerManager?.render(c, viewport, theme);
    ctx.alertManager?.render(c, viewport, theme);
    ctx.priceLines?.render(c, viewport, theme, data);

    // --- Axes and price tags ---
    // Tags are placed first: value tags step around the fixed ones (last
    // price, high/low, orders), and the scale's labels give way to them all.
    const fixedTags = this.fixedAxisTags(ctx);
    const valueTags = ctx.indicatorValueLabels !== false ? this.overlayValueTags(ctx, fixedTags) : [];
    ctx.priceAxis?.render(c, viewport, theme, 'right', [...fixedTags.map((t) => t.y), ...valueTags.map((t) => t.y)]);
    drawAxisValueLabels(c, valueTags, viewport.chartRect.x + viewport.chartRect.width, viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH, theme);
    if (ctx.leftViewport) {
      ctx.leftPriceAxis?.render(c, ctx.leftViewport, theme, 'left');
      if (ctx.indicatorValueLabels !== false) this.renderLeftValueLabels(c, ctx, ctx.leftViewport);
    }
    // Trading axis badges paint ON TOP of the regular price axis labels
    // so position entry prices and order trigger prices are always visible.
    ctx.tradingRenderer?.renderAxisBadges(c, viewport, theme);
    ctx.priceLines?.renderAxisTags(c, viewport, theme, data);
    ctx.currentPriceLine?.render(c, viewport, theme);
    ctx.timeAxis?.render(c, viewport, theme, data, ctx.timeAxisY);
    this.renderPanelAxes(c, ctx);
  }

  /**
   * With a GPU: the grid, session shading, break lines, bars and volume on
   * the GPU, then what was recorded of the plot and panes. What goes under
   * the bars (a depth heatmap, volume profiles, with volume under them as in
   * Canvas 2D) is recorded to go under them too. A watermark needs Canvas
   * 2D, and so does what goes under the bars when the GPU can't take all of
   * it: then the whole background goes on a 2D canvas under the GPU's,
   * there only while needed.
   */
  private renderGpu(
    gpu: GpuRenderer,
    ctx: RenderContext,
    scene: CanvasRenderingContext2D,
    plot: DrawStep[],
    panes: readonly PaneSteps[],
  ): { drawn: GpuDrawn; plan: StepPlan } {
    const { viewport, theme, data } = ctx;
    const dpr = this.layerManager.getDpr();
    const underSteps = this.underSteps(ctx);
    // Text under the bars (a market profile's readout, its letters) needs a
    // 2D canvas under them: then all of it goes there, unrecorded.
    const underText = !!(ctx.marketProfile?.isVisible() && ctx.marketProfile.drawsText());
    const under = underSteps.length > 0 && !underText ? recordAll(gpu.recorder?.(dpr, scene) ?? null, viewport.chartRect, underSteps) : null;
    const underOnBack = underSteps.length > 0 && !under;
    // What the GPU can draw of the plot and panes, recorded before it draws.
    const recorder = gpu.recorder?.(dpr, scene) ?? null;
    const recorded = recorder ? recordSteps(recorder, viewport.chartRect, plot, panes) : canvasPlan(plot);
    const profiles = !!(ctx.volumeProfile?.isVisible() || ctx.marketProfile?.isVisible());
    // A grid the GPU can't draw as it looks (dashed, wider, two colours) takes the background to Canvas 2D.
    const gridOn2d = !!ctx.gridRenderer?.isVisible() && !gridFitsGpu(theme);
    const background: GpuBackground | null = ctx.watermark?.isVisible() || underOnBack || gridOn2d ? null : {
      grid: ctx.gridRenderer?.isVisible() ?? false,
      rects: [...(ctx.sessionShading?.rects(data, viewport, theme) ?? []), ...(ctx.sessionBreaks?.lineRects(viewport, theme, data) ?? [])],
    };
    // With a profile, volume goes under it, among the steps under the bars.
    const volume = ctx.volumeRenderer?.isVisible() && !profiles ? { heightRatio: ctx.volumeRenderer.getHeightRatio() } : null;
    const drawn = gpu.render({
      data, viewport, theme,
      // The ratio the canvases are sized for, which may trail the screen's.
      dpr,
      candles: ctx.chartRenderer instanceof CandlestickRenderer,
      volume, background, under, recorded: recorder,
    });
    const plan = drawn.recorded ? recorded : canvasPlan(plot);
    const result = { drawn: { ...drawn, volume: drawn.volume || profiles }, plan };
    const backgroundDrawn = background !== null && !!drawn.background;
    const backSteps = under !== null && drawn.under ? [] : underSteps;
    if (backgroundDrawn && backSteps.length === 0) {
      this.layerManager.dropBackLayer();
      return result;
    }
    this.renderBackCanvas(ctx, backSteps, !backgroundDrawn);
    return result;
  }

  /** What goes under the bars, in Canvas 2D's order: the depth heatmap, then with a profile, volume and the profiles. */
  private underSteps(ctx: RenderContext): DrawStep[] {
    const { viewport, theme, data } = ctx;
    const steps: DrawStep[] = [];
    if (ctx.depthHeatmap?.isVisible()) steps.push((c) => ctx.depthHeatmap!.render(c, viewport, theme));
    if (ctx.volumeProfile?.isVisible() || ctx.marketProfile?.isVisible()) {
      if (ctx.volumeRenderer?.isVisible()) steps.push((c) => ctx.volumeRenderer!.render(c, data, viewport, theme));
      if (ctx.volumeProfile?.isVisible()) steps.push((c) => ctx.volumeProfile!.render(c, data, viewport, theme));
      if (ctx.marketProfile?.isVisible()) steps.push((c) => ctx.marketProfile!.render(c, data, viewport, theme));
    }
    return steps;
  }

  /** The 2D canvas under the GPU's: the background unless the GPU drew it, then `under` (clipped to the plot). */
  private renderBackCanvas(ctx: RenderContext, under: readonly DrawStep[], background: boolean): void {
    const back = this.layerManager.backLayer();
    if (!back) return;
    back.clear();
    if (background) this.renderBackground(back.ctx, ctx);
    if (under.length > 0) this.inPlot(back.ctx, ctx.viewport, () => under.forEach((step) => step(back.ctx)));
  }

  /** The background: grid, session shading and breaks, watermark. */
  private renderBackground(c: CanvasRenderingContext2D, ctx: RenderContext): void {
    const { viewport, theme, data } = ctx;
    ctx.gridRenderer?.render(c, viewport, theme);
    ctx.sessionShading?.render(c, data, viewport, theme);
    ctx.sessionBreaks?.renderLines(c, viewport, theme, data);
    ctx.watermark?.render(c, viewport, theme);
  }

  /** Run `draw` clipped to the main plot. */
  private inPlot(c: CanvasRenderingContext2D, viewport: ViewportState, draw: () => void): void {
    c.save();
    c.beginPath();
    c.rect(viewport.chartRect.x, viewport.chartRect.y, viewport.chartRect.width, viewport.chartRect.height);
    c.clip();
    draw();
    c.restore();
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
    ctx.priceAxisAddButton?.render(c, viewport, theme, ctx.crosshairHandler?.getPosition() ?? null);
    ctx.chartLegend?.render(c, viewport, theme, data);
    ctx.barCountdown?.render(c, viewport, theme, data);
    ctx.renderOverlayPlugins?.(c, 'ui');
    this.renderPanelHoverValues(c, ctx);
  }

  /** Each pane's drawing as steps: its background, then its levels and indicators. */
  private paneSteps(ctx: RenderContext): PaneSteps[] {
    const { theme, panels } = ctx;
    const indicatorEngine = ctx.indicatorEngine;
    if (!indicatorEngine || panels.length === 0) return [];
    const out: PaneSteps[] = [];
    for (const panel of panels) {
      const { rect, viewport } = panel;
      if (rect.width <= 0 || rect.height <= 0) continue;
      const ids = panel.members?.length ? [panel.instanceId, ...panel.members] : [panel.instanceId];
      const steps: DrawStep[] = [];
      for (const id of ids) {
        const levels = indicatorEngine.isVisible(id) ? indicatorEngine.getLevels(id) : [];
        if (levels.length > 0) steps.push((c) => this.renderLevels(c, levels, viewport, theme));
      }
      for (const id of ids) steps.push((c) => indicatorEngine.renderPanel(c, id, viewport));
      out.push({
        id: panel.instanceId,
        rect,
        inner: { x: rect.x, y: rect.y + PANEL_HEADER_HEIGHT, width: rect.width, height: rect.height - PANEL_HEADER_HEIGHT },
        background: (c) => {
          c.fillStyle = panel.style?.background ?? theme.style?.panes.background ?? theme.background;
          c.fillRect(rect.x, rect.y, rect.width, rect.height);
        },
        steps,
      });
    }
    return out;
  }

  /** Indicator panes: background, divider, name and the indicator itself (what the GPU didn't draw). */
  private renderPanels(c: CanvasRenderingContext2D, ctx: RenderContext, panes: readonly PaneSteps[], plan: StepPlan): void {
    const { theme } = ctx;
    const indicatorEngine = ctx.indicatorEngine;
    if (!indicatorEngine || panes.length === 0) return;

    // Cache font string once for all panels
    const panelFont = `10px ${theme.font.family}`;
    // Build descriptor lookup once per frame — avoids O(n*m) .find() per panel
    const descMap = this.panelDescriptors(indicatorEngine);

    const paneStyles = new Map(ctx.panels.map((p) => [p.instanceId, p.style]));
    for (const pane of panes) {
      const { rect, inner } = pane;
      const gpu = plan.panes.get(pane.id);
      const own = paneStyles.get(pane.id);
      c.save();
      c.beginPath();
      c.rect(rect.x, rect.y, rect.width, rect.height);
      c.clip();

      if (!gpu?.background) pane.background(c);

      // Thick divider bar at top of panel
      c.fillStyle = own?.separator ?? theme.style?.panes.separator ?? theme.axisLine;
      c.fillRect(rect.x, rect.y, rect.width, 3);

      // Panel indicator name in header area
      c.fillStyle = theme.style?.panes.title ?? theme.textSecondary;
      c.font = panelFont;
      c.textBaseline = 'top';
      c.textAlign = 'left';
      const desc = descMap.get(pane.id);
      if (desc && ctx.paneTitles !== false) c.fillText(desc.descriptor.name, rect.x + 6, rect.y + 6);

      // Clip indicator rendering to below the header
      c.save();
      c.beginPath();
      c.rect(inner.x, inner.y, inner.width, inner.height);
      c.clip();
      gpu?.text?.drawText(c);
      for (const step of gpu ? gpu.rest : pane.steps) step(c);
      c.restore();

      c.restore();
    }
  }

  /** Tags fixed on the price axis: the last price, the high/low and bid/ask lines, positions and orders. */
  private fixedAxisTags(ctx: RenderContext): FixedAxisTag[] {
    const { viewport, data } = ctx;
    const { chartRect } = viewport;
    const tags: FixedAxisTag[] = [];
    const last = ctx.currentPriceLine?.isVisible() && ctx.theme.style?.lastPrice.visible !== false ? ctx.currentPriceLine.getPrice() : null;
    if (last !== null && last !== undefined) tags.push({ y: priceToY(last, viewport), half: 10 });
    for (const level of ctx.priceLines?.levels(data, viewport) ?? []) tags.push({ y: priceToY(level.price, viewport), half: 8 });
    for (const y of ctx.tradingRenderer?.axisTagYs(viewport) ?? []) tags.push({ y, half: 9 });
    return tags.filter((t) => t.y >= chartRect.y && t.y <= chartRect.y + chartRect.height);
  }

  /** Overlay indicators' latest values as tags on the price axis, clear of the fixed tags. */
  private overlayValueTags(ctx: RenderContext, fixed: readonly FixedAxisTag[]): AxisValueLabel[] {
    const values = ctx.indicatorEngine?.getLatestOverlayValues();
    if (!values?.length) return [];
    const { viewport } = ctx;
    const { chartRect } = viewport;
    const format = ctx.formatPrice ?? ((v: number) => formatPrice(v, 2, ctx.numberLocale ?? 'en-US'));
    const labels: AxisValueLabel[] = values.map((v) => ({ y: priceToY(v.value, viewport), text: format(v.value), color: v.color }));
    return layoutAxisValueLabels(labels, { top: chartRect.y, bottom: chartRect.y + chartRect.height }, fixed);
  }

  /** Left-scale overlays' latest values as tags on the left axis. */
  private renderLeftValueLabels(c: CanvasRenderingContext2D, ctx: RenderContext, left: ViewportState): void {
    const values = ctx.indicatorEngine?.getLatestOverlayValues('left');
    if (!values?.length) return;
    const { chartRect } = left;
    const width = ctx.leftAxisWidth ?? PRICE_AXIS_WIDTH;
    // Its own precision: volume-like values don't take the price's decimals.
    const precision = autoPricePrecision(left.priceRange.min, left.priceRange.max);
    const locale = ctx.numberLocale ?? 'en-US';
    const labels: AxisValueLabel[] = values.map((v) => ({
      y: priceToY(v.value, left), text: formatPrice(v.value, precision, locale), color: v.color,
    }));
    renderAxisValueLabels(c, labels, chartRect.x - width, width,
      { top: chartRect.y, bottom: chartRect.y + chartRect.height }, ctx.theme);
  }

  /** An indicator's reference levels (RSI 30 / 70): faint dashed lines across its pane, under the plots. */
  private renderLevels(c: CanvasRenderingContext2D, levels: readonly number[], viewport: ViewportState, theme: Theme): void {
    if (levels.length === 0) return;
    const { chartRect } = viewport;
    c.save();
    c.strokeStyle = theme.axisLabel;
    c.globalAlpha = 0.45;
    c.lineWidth = 1;
    c.setLineDash([4, 4]);
    c.beginPath();
    for (const level of levels) {
      const y = Math.round(priceToY(level, viewport)) + 0.5;
      c.moveTo(chartRect.x, y);
      c.lineTo(chartRect.x + chartRect.width, y);
    }
    c.stroke();
    c.restore();
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
      // A pane folded to its header has no room for a scale.
      if (max - min <= 0 || pr.height <= 0 || pv.chartRect.height < MIN_PANE_PLOT_HEIGHT) continue;

      const axisX = pr.x + pr.width;
      const insetRect = pv.chartRect; // already inset by header
      // A pane's value scale looks as the price scale does.
      const axisLine = theme.style?.axis.price.line ?? theme.axisLine;
      const axisText = theme.style?.axis.price.text ?? theme.axisLabel;

      c.strokeStyle = axisLine;
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

      for (let tick = firstVal; tick <= max; tick += step) {
        // Accumulated steps leave -1e-17 where zero is meant: "-0.0".
        const val = Math.abs(tick) < step * 1e-6 ? 0 : tick;
        const y = priceToY(val, pv);
        if (y < insetRect.y || y > insetRect.y + insetRect.height) continue;
        c.strokeStyle = axisLine;
        c.beginPath();
        c.moveTo(axisX, Math.round(y) + 0.5);
        c.lineTo(axisX + 4, Math.round(y) + 0.5);
        c.stroke();
        c.fillStyle = axisText;
        c.fillText(priceScaleText(val, pv, precision, locale), axisX + 6, y);
      }

      // The pane indicator's latest values, tagged on its axis.
      const latest = ctx.indicatorValueLabels !== false
        ? [panel.instanceId, ...(panel.members ?? [])].flatMap((id) => ctx.indicatorEngine?.getLatestValues(id) ?? [])
        : null;
      if (latest?.length) {
        const labels = latest.map((v) => ({
          y: priceToY(v.value, pv),
          // On a percent pane, in percent like its scale.
          text: pv.scaleMode === 'percentage' && pv.scaleBaseline
            ? priceScaleText(v.value, pv, 2, locale)
            : formatPrice(v.value, indicatorValuePrecision(v.value), locale),
          color: v.color,
        }));
        renderAxisValueLabels(c, labels, axisX, ctx.viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH,
          { top: insetRect.y, bottom: insetRect.y + insetRect.height }, theme);
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
      // Folded to its header: nothing to point at.
      if (pv.chartRect.height < MIN_PANE_PLOT_HEIGHT) continue;
      // Vertical line (synced with main chart bar snapping)
      const barIdx = xToBarIndex(cursorPos.x, pv);
      const snappedIdx = Math.max(0, Math.min((ctx.data?.length ?? 1) - 1, Math.round(barIdx)));
      const cx = barIndexToX(snappedIdx, pv);

      const looks = crosshairLooks(theme);
      c.save();
      c.beginPath();
      c.rect(pr.x, pr.y, pr.width, pr.height);
      c.clip();
      if (looks.vertical.visible) {
        c.setLineDash(lineDash(looks.vertical.style, [4, 4], looks.vertical.width));
        c.strokeStyle = looks.vertical.color;
        const column = crispX(c, cx, looks.vertical.width);
        c.lineWidth = column.width;
        c.beginPath();
        c.moveTo(column.x, pr.y);
        c.lineTo(column.x, pr.y + pr.height);
        c.stroke();
      }
      if (looks.horizontal.visible) {
        c.setLineDash(lineDash(looks.horizontal.style, [4, 4], looks.horizontal.width));
        c.strokeStyle = looks.horizontal.color;
        const row = crispY(c, cursorPos.y, looks.horizontal.width);
        c.lineWidth = row.width;
        c.beginPath();
        c.moveTo(pr.x, row.y);
        c.lineTo(pr.x + pr.width, row.y);
        c.stroke();
      }
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
      if (max - min <= 0 || pr.height <= 0 || pv.chartRect.height < MIN_PANE_PLOT_HEIGHT) continue;
      const axisX = pr.x + pr.width;
      const precision = panelPrecision(computeTickStep(min, max, 4));

      if (cursorPos.x >= pr.x && cursorPos.x <= pr.x + pr.width && cursorPos.y >= pr.y && cursorPos.y <= pr.y + pr.height) {
        const valText = priceScaleText(yToPrice(cursorPos.y, pv), pv, precision, locale);
        c.font = `bold ${theme.font.sizeSmall}px ${theme.font.family}`;
        const tw = c.measureText(valText).width;
        const badgeW = Math.min(tw + 10, (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2);
        const looks = crosshairLooks(theme);
        c.fillStyle = looks.labelBackground;
        fillTag(c, axisX + 1, cursorPos.y - 9, badgeW, 18, theme);
        c.fillStyle = looks.labelText;
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
      const desc = descMap?.get(panel.instanceId);
      const plots = desc?.descriptor.plots;
      const parts: string[] = [];
      if (plots) {
        for (const plot of plots) {
          const v = val[plot.key];
          if (v !== undefined && Number.isFinite(v)) parts.push(`${plot.title} ${priceScaleText(v, pv, precision, locale)}`);
        }
      } else {
        for (const key in val) {
          const v = val[key];
          if (v !== undefined) parts.push(`${key}: ${v.toFixed(precision)}`);
        }
      }
      if (parts.length === 0) continue;
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
      ctx.fillText(`${label} ${viewport.formatPrice?.(price) ?? price.toFixed(2)}`, chartRect.x + 4, y - 2);

      // Axis badge
      const axisX = chartRect.x + chartRect.width + 1;
      ctx.fillStyle = color;
      fillTag(ctx, axisX, y - 7, (viewport.priceAxisWidth ?? PRICE_AXIS_WIDTH) - 2, 14, theme);
      ctx.fillStyle = '#000';
      ctx.font = normalFont;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(viewport.formatPrice?.(price) ?? price.toFixed(2), axisX + 4, y);
    }
  }

  destroy(): void {
    this.renderLoop.stop();
    this.detachGpu();
    this.dprManager.destroy();
    this.layerManager.destroy();
  }
}
