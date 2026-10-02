import type {
  ChartOptions,
  ChartType,
  OHLCBar,
  DataSeries,
  Theme,
  ThemeName,
  ChartEventType,
  ChartEvent,
  ChartEventMap,
  TauriBridgeOptions,
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorOutput,
  ResolvedIndicatorStyle,
  DrawingToolType,
  DrawingState,
  DrawingStyle,
  DrawingPlugin,
  PanelPosition,
  TradingOrder,
  TradingPosition,
  DepthData,
  TradingConfig,
  MarketConfig,
  Locale,
  StreamConfig,
  ConnectionState,
  ConnectionInfo,
  TimeFrame,
  FeaturesConfig,
  ExecutionAdapter,
  ExecutionConfig,
} from '@tradecanvas/commons';
import { LayerType, setLocale as setGlobalLocale, computePriceLimits, PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice, parseIndicatorSource, indicatorSource } from '@tradecanvas/commons';
import {
  RenderEngine,
  Viewport,
  GridRenderer,
  PriceAxis,
  TimeAxis,
  InteractionManager,
  PaneResizeHandler,
  PanHandler,
  ZoomHandler,
  AxisDragHandler,
  AlertDragHandler,
  CrosshairHandler,
  IndicatorEngine,
  registerBuiltInIndicators,
  sourceParam,
  EventBus,
  DrawingManager,
  DrawingRenderer,
  registerBuiltInDrawingTools,
  TradingManager,
  TradingRenderer,
  StreamManager,
  ChartLegend,
  Screenshot,
  Watermark,
  BarCountdown,
  VolumeRenderer,
  VolumeProfileRenderer,
  MarketProfileRenderer,
  DepthHeatmapRenderer,
  PeriodLevelsRenderer,
  PivotMarkersRenderer,
  AlertManager,
  SignalMarkerManager,
  TradeZoneManager,
  MeasureOverlay,
  SelectionBoxOverlay,
  timestampToBarIndex,
  barTimeStepMs,
  rangePresetStart,
  ReplayManager,
  ChartStateManager,
  UndoRedoManager,
  Animator,
  KeyboardHandler,
  CrosshairTooltip,
  PinnedTooltip,
  DataExporter,
  SessionBreaks,
  SessionShading,
  CompareRenderer,
  CurrentPriceLine,
  xToBarIndex,
  findDominantSwing,
} from '@tradecanvas/core';
import type { ChartRendererInterface, RangePreset } from '@tradecanvas/core';
import { timeframeToMs } from '@tradecanvas/commons';
import { resolveRenderer, resolveDisplayData, isReshapedChartType } from './charts/ChartTypeStrategy.js';
import { AutoSaveScheduler } from './state/AutoSaveScheduler.js';
import { DataManager } from './DataManager.js';
import { ThemeManager } from './ThemeManager.js';
import { LayoutManager } from './layout/LayoutManager.js';
import { requiredPriceAxisWidth, nextPriceAxisWidth } from './layout/priceAxisWidth.js';
import { VerticalPanGate } from './interaction/verticalPanGate.js';
import { PluginManager } from './plugins/PluginManager.js';
import { wireExecution } from './trading/wireExecution.js';
import { overlaysForLayer, type ChartPlugin } from './plugins/contracts.js';

// Replaced at build time by Vite `define` (see vite.config.ts). The `typeof`
// guard keeps this safe when the source runs un-bundled (tests, ts-node).
declare const __TC_VERSION__: string;

/** The scale of an indicator pane with nothing to fit yet. */
const DEFAULT_PANE_RANGE = { min: 0, max: 100 } as const;

/** Bar times at or below this are seconds, not milliseconds (as `normalizeBarTime`). */
const SECONDS_TIME_LIMIT = 1e12;

export class Chart {
  static version = typeof __TC_VERSION__ !== 'undefined' ? __TC_VERSION__ : '0.0.0-dev';

  private engine: RenderEngine;
  private viewport: Viewport;
  private dataManager: DataManager;
  private themeManager: ThemeManager;
  private layoutManager: LayoutManager;
  private pluginManager: PluginManager;
  private indicatorEngine: IndicatorEngine;
  private drawingManager: DrawingManager;
  private drawingRenderer: DrawingRenderer;
  private tradingManager: TradingManager;
  private tradingRenderer: TradingRenderer;
  private eventBus: EventBus;
  private streamManager: StreamManager | null = null;
  private executionAdapter: ExecutionAdapter | null = null;
  private execTeardown: (() => void) | null = null;
  private autoScrollOnNewBar = true;
  private displayDataCache: DataSeries | null = null;
  /** Earliest bar of an `indicatorUpdate` waiting to be emitted; null = none pending. */
  private indicatorUpdateFrom: number | null = null;
  private resolvedLayoutCache: import('@tradecanvas/commons').ResolvedLayout | null = null;
  private panelInfoCache: import('@tradecanvas/core').PanelRenderInfo[] | null = null;
  private renderScheduled = false;
  /** Current price-axis width; grows to fit long (e.g. sub-cent) labels. */
  private priceAxisWidth = PRICE_AXIS_WIDTH;
  private measureCtx: CanvasRenderingContext2D | null | undefined;
  private containerSizeCache: { width: number; height: number } | null = null;
  private containerSizeCacheTime = 0;
  // Last-emitted viewport values, used to fire visibleRangeChange /
  // priceRangeChange / zoomChange only when something actually moved.
  private lastEmittedRange: { from: number; to: number } | null = null;
  private lastEmittedPriceRange: { min: number; max: number } | null = null;
  private lastEmittedBarWidth: number | null = null;
  private chartLegend: ChartLegend;
  private watermark: Watermark;
  private barCountdown: BarCountdown;
  /**
   * Indicators of the loaded layout this chart could not add (an unknown or
   * not yet registered id, a whitelist): saved back as they were, so saving
   * the layout again doesn't drop them.
   */
  private unrestoredIndicators: import('@tradecanvas/core').SnapshotIndicator[] = [];
  /** Display timezone, minutes east of UTC; null = the browser's. */
  private displayTzOffset: number | null = null;
  private sessionBreaks: SessionBreaks;
  private sessionShading: SessionShading;
  private compareRenderer: CompareRenderer;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private volumeRenderer: VolumeRenderer;
  private volumeProfile: VolumeProfileRenderer;
  private marketProfile: MarketProfileRenderer;
  private depthHeatmap: DepthHeatmapRenderer;
  private periodLevels: PeriodLevelsRenderer;
  private pivotMarkers: PivotMarkersRenderer;
  private alertManager: AlertManager;
  private signalMarkerManager: SignalMarkerManager;
  private tradeZoneManager: TradeZoneManager;
  private measureOverlay: MeasureOverlay;
  private selectionBoxOverlay = new SelectionBoxOverlay();
  private replayManager: ReplayManager;
  private replayBarUnsub: (() => void) | null = null;
  /** True while `replaySeek` runs: its bar is a jump, not a replay step. */
  private replaySeeking = false;
  /**
   * While a replay runs, the live series keeps moving here — stream and
   * host updates land in `live` instead of the replayed slice — and comes
   * back on `replayStop()`. `price` is the latest live tick.
   */
  private replaySession: { live: DataManager; price: { price: number; previousClose?: number } | null } | null = null;
  private undoRedoManager: UndoRedoManager;
  private autoSaveScheduler = new AutoSaveScheduler((key) => this.saveState(key));
  private animator: Animator;
  private crosshairTooltip: CrosshairTooltip;
  private pinnedTooltip: PinnedTooltip;
  private interactionManager: InteractionManager;
  private crosshairHandler: CrosshairHandler;
  private chartRenderer: ChartRendererInterface;
  private gridRenderer: GridRenderer;
  private priceAxis: PriceAxis;
  private timeAxis: TimeAxis;
  private options: ChartOptions & { chartType: ChartType };
  private features: Required<FeaturesConfig>;
  private marketConfig: MarketConfig | null = null;
  private container: HTMLElement;
  private currentPriceLine: import('@tradecanvas/core').CurrentPriceLine;
  private numberLocale: string;
  /** The market's price precision, when set: otherwise it follows the visible range. */
  private marketPricePrecision: number | null = null;
  private paneTitles = true;
  /**
   * The `autoScale` the chart was constructed with — distinct from
   * `this.options.autoScale`, which drag-to-scale/vertical-pan mutate at
   * runtime to freeze the Y-axis. `setData()` restores this default so a
   * freeze on the old symbol doesn't silently carry over to a new one.
   */
  private defaultAutoScale: boolean;
  private keyboardHandler: KeyboardHandler | null = null;
  private onWindowKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private currentSymbol: string = '';


  constructor(container: HTMLElement, options: ChartOptions & { plugins?: ChartPlugin[] }) {
    this.container = container;
    this.options = { ...options, chartType: options.chartType ?? 'candlestick' };
    this.numberLocale = options.numberLocale ?? 'en-US';
    this.defaultAutoScale = options.autoScale !== false;

    // Resolve feature flags (all default to true)
    const f = options.features ?? {};
    this.features = {
      drawings: f.drawings ?? true,
      drawingTools: f.drawingTools ?? [],
      drawingMagnet: f.drawingMagnet ?? true,
      drawingUndoRedo: f.drawingUndoRedo ?? true,
      trading: f.trading ?? true,
      // Off by default: right-click is the browser's, and a stray right-click
      // shouldn't be one step from an order. Opt in with features.tradingContextMenu.
      tradingContextMenu: f.tradingContextMenu ?? false,
      indicators: f.indicators ?? true,
      indicatorIds: f.indicatorIds ?? [],
      panning: f.panning ?? true,
      zooming: f.zooming ?? true,
      crosshair: f.crosshair ?? true,
      crosshairTooltip: f.crosshairTooltip ?? true,
      keyboard: f.keyboard ?? true,
      priceAxis: f.priceAxis ?? true,
      timeAxis: f.timeAxis ?? true,
      grid: f.grid ?? (options.grid?.visible ?? true),
      legend: f.legend ?? true,
      indicatorValueLabels: f.indicatorValueLabels ?? true,
      volume: f.volume ?? true,
      watermark: f.watermark ?? true,
      saveLoad: f.saveLoad ?? true,
      screenshot: f.screenshot ?? true,
      alerts: f.alerts ?? true,
      replay: f.replay ?? true,
      sessionBreaks: f.sessionBreaks ?? true,
      barCountdown: f.barCountdown ?? true,
      compareSymbols: f.compareSymbols ?? true,
      dataExport: f.dataExport ?? true,
      logScale: f.logScale ?? true,
      timeframes: f.timeframes ?? [],
      defaultTimeframeFavorites: f.defaultTimeframeFavorites ?? [],
    };

    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.tabIndex = 0; // Allow keyboard events
    container.style.outline = 'none';

    // Initialize managers
    this.dataManager = new DataManager();
    this.themeManager = new ThemeManager(options.theme);
    this.layoutManager = new LayoutManager();
    this.indicatorEngine = new IndicatorEngine();
    this.pluginManager = new PluginManager(this.indicatorEngine, { plugins: options.plugins });
    this.eventBus = new EventBus();

    registerBuiltInIndicators(this.indicatorEngine);

    // Drawing tools
    this.drawingManager = new DrawingManager();
    registerBuiltInDrawingTools(this.drawingManager);
    this.drawingRenderer = new DrawingRenderer(this.drawingManager);
    this.drawingManager.setRequestRender(() => {
      // Sync entire render context so drawings render with same viewport as candles
      this.syncRenderContext();
      this.engine.requestRender(LayerType.Overlay);
      this.scheduleAutoSave();
    });
    this.drawingManager.setEventCallback((event, data) => {
      this.eventBus.emit(event as ChartEventType, data);
    });
    // Pasted drawings obey the same switches as drawing tools.
    this.drawingManager.setToolFilter((type) =>
      this.features.drawings && (this.features.drawingTools.length === 0 || this.features.drawingTools.includes(type)));
    // Undo/redo
    this.undoRedoManager = new UndoRedoManager();
    this.drawingManager.setUndoRedoManager(this.undoRedoManager);
    this.drawingManager.setDataGetter(() => this.dataManager.getData());
    this.drawingManager.setDisplayDataGetter(() => this.getDisplayData());
    // Magnet mode
    if (options.crosshair?.mode === 'magnet' && this.features.drawingMagnet) {
      this.drawingManager.setMagnetMode('magnet');
    }

    // Trading
    this.tradingManager = new TradingManager({
      enabled: this.features.trading,
      contextMenu: { enabled: this.features.tradingContextMenu },
    });
    this.tradingRenderer = new TradingRenderer(this.tradingManager);
    this.tradingManager.setContainer(container);
    this.tradingManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.tradingManager.setEventCallback((event, data) => {
      this.eventBus.emit(event as ChartEventType, data);
    });

    // Rendering
    this.engine = new RenderEngine(container);
    const size = this.engine.dprManager.getContainerSize();
    this.viewport = new Viewport(
      size.width,
      size.height,
      options.minBarSpacing ?? 2,
      options.maxBarSpacing ?? 30,
      options.rightMargin ?? 5,
    );
    this.viewport.setPanLimits({
      freePan: options.freePan ?? true,
      minVisibleBars: options.panLimits?.minVisibleBars ?? 3,
    });
    this.layoutManager.resize(size.width, size.height);

    // Sync viewport + layout when the container resizes. Without this hook
    // the chart's viewport keeps its construction-time chartRect forever
    // (which is wrong if the container started at 0 or got resized since),
    // and `scrollToEnd` / clampOffset compute against stale dimensions —
    // chart sticks at the wrong offset and the user can't scroll to the
    // latest bar.
    this.engine.onContainerResize = (newSize) => {
      if (newSize.width <= 0 || newSize.height <= 0) return;
      const wasAtEnd = this.viewport.isAtEnd();
      this.viewport.resize(newSize.width, newSize.height);
      this.layoutManager.resize(newSize.width, newSize.height);
      // wasAtEnd carries the user's intent: if they were tracking the live
      // edge before the resize, keep them there afterwards. Otherwise leave
      // their scroll position alone.
      this.updateViewportAndRender(wasAtEnd);
    };

    // Chart renderer
    this.chartRenderer = this.createChartRenderer(this.options.chartType);
    this.gridRenderer = new GridRenderer();
    if (options.grid?.visible === false) this.gridRenderer.setVisible(false);
    this.priceAxis = new PriceAxis();
    this.priceAxis.setLocale(this.numberLocale);
    this.timeAxis = new TimeAxis();

    // Crosshair
    this.crosshairHandler = new CrosshairHandler();
    this.crosshairHandler.setLocale(this.numberLocale);
    if (options.crosshair?.mode) {
      this.crosshairHandler.setMode(options.crosshair.mode);
    }
    // Crosshair callback — fired via microtask AFTER render, only when the bar
    // changes: no extra render requests, and the tooltip's one measurement
    // happens once per bar, not per mouse move.
    this.crosshairHandler.setCallback((barIndex, point) => {
      if (barIndex !== null && point) {
        const data = this.dataManager.getData();
        const bar = barIndex < data.length ? data[barIndex] : undefined;

        // Update legend (canvas-rendered, will show on next UI paint)
        this.chartLegend.setHoverBar(bar ?? null);

        // Update tooltip (DOM, lightweight update only when bar changes).
        // Over an indicator pane there is no price crosshair to sit beside.
        const vs = this.viewport.getState();
        const inPlot = point.y >= vs.chartRect.y && point.y <= vs.chartRect.y + vs.chartRect.height;
        if (bar && inPlot && this.features.crosshairTooltip) {
          this.crosshairTooltip.show(point, bar, this.themeManager.getTheme(), this.cachedContainerSize(), {
            prevClose: barIndex > 0 ? data[barIndex - 1]?.close : undefined,
            priceRange: vs.priceRange,
            plot: vs.chartRect,
            barStepMs: barTimeStepMs(data),
          });
        } else {
          this.crosshairTooltip.hide();
        }

        // Refresh the pinned tooltip's delta strip against the hovered bar.
        // Cheap when there's nothing pinned (early returns inside reposition).
        if (this.pinnedTooltip.isPinned()) {
          this.pinnedTooltip.reposition(
            this.viewport.getState(),
            bar ?? null,
            barIndex,
            this.themeManager.getTheme(),
          );
        }

        // Emit for external consumers
        this.eventBus.emit('crosshairMove', { point, bar, barIndex });
      } else {
        this.crosshairTooltip.hide();
        this.chartLegend.setHoverBar(null);
        this.eventBus.emit('crosshairLeave', {});
      }
    });

    // Chart legend (OHLCV overlay)
    this.chartLegend = new ChartLegend();
    this.chartLegend.setChartType(this.options.chartType);
    this.chartLegend.setLocale(this.numberLocale);

    // Watermark + Volume
    this.watermark = new Watermark();
    if (options.watermark) this.watermark.setConfig(options.watermark);
    this.volumeRenderer = new VolumeRenderer();
    this.volumeProfile = new VolumeProfileRenderer();
    this.marketProfile = new MarketProfileRenderer();
    this.depthHeatmap = new DepthHeatmapRenderer();
    this.periodLevels = new PeriodLevelsRenderer();
    this.pivotMarkers = new PivotMarkersRenderer();

    // Bar countdown timer
    this.barCountdown = new BarCountdown();
    this.barCountdown.setVisible(this.features.barCountdown);
    this.sessionBreaks = new SessionBreaks();
    this.sessionBreaks.setLocale(this.numberLocale);
    this.sessionShading = new SessionShading();
    this.compareRenderer = new CompareRenderer();

    // Apply session break config from options
    if (options.sessionBreaks) {
      this.sessionBreaks.setConfig({
        visible: options.sessionBreaks.visible ?? true,
        color: options.sessionBreaks.color,
        lineStyle: options.sessionBreaks.lineStyle,
        lineWidth: options.sessionBreaks.lineWidth,
      });
    } else if (options.features?.sessionBreaks !== false) {
      this.sessionBreaks.setVisible(true);
    }

    // Apply log scale from options
    if (options.logScale && this.features.logScale) {
      this.viewport.setLogScale(true);
    }

    // Animation
    this.animator = new Animator();

    // Crosshair tooltip (DOM)
    this.crosshairTooltip = new CrosshairTooltip();
    this.crosshairTooltip.create(container);
    this.crosshairTooltip.setLocale(this.numberLocale);
    this.pinnedTooltip = new PinnedTooltip();
    this.pinnedTooltip.create(container);

    // Keyboard navigation
    this.keyboardHandler = new KeyboardHandler({
      scrollBars: (count) => {
        const barUnit = this.viewport.getState().barWidth + this.viewport.getState().barSpacing;
        this.viewport.scrollBy(count * barUnit);
        this.updateViewportAndRender();
      },
      zoom: (delta) => {
        const chartWidth = this.viewport.getState().chartRect.width;
        this.viewport.zoom(delta, chartWidth / 2);
        this.updateViewportAndRender();
      },
      goToStart: () => {
        this.viewport.scrollBy(-Infinity);
        this.updateViewportAndRender();
      },
      goToEnd: () => {
        this.viewport.scrollToEnd();
        this.updateViewportAndRender();
      },
      fitContent: () => this.fitContent(),
    });
    this.keyboardHandler.setEnabled(this.features.keyboard);

    // Attach keyboard listener to window. Only consume the event when the
    // chart actually handles the key AND the container is the focused element
    // (or an ancestor) — this prevents the chart from swallowing keystrokes
    // intended for inputs elsewhere on the page.
    this.onWindowKeyDown = (e: KeyboardEvent) => {
      if (!this.keyboardHandler) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== this.container && !this.container.contains(active)) {
        return;
      }
      // Ignore when typing in a form field that happens to live inside the chart.
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      if (this.keyboardHandler.handleKey(e)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.onWindowKeyDown);

    // Current price line (standalone, works without StreamManager)
    this.currentPriceLine = new CurrentPriceLine();
    this.currentPriceLine.setLocale(this.numberLocale);
    this.priceAxis.setReservedPriceProvider(() =>
      this.currentPriceLine.isVisible() ? this.currentPriceLine.getPrice() : null);

    // Alerts
    this.alertManager = new AlertManager();
    this.alertManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.alertManager.on('triggered', (alert) => {
      const payload = { id: alert.id, price: alert.price, condition: alert.condition, message: alert.message, triggered: alert.triggered };
      this.eventBus.emit('alertTriggered', payload);
      // Back-compat: legacy listeners keyed off dataUpdate.
      this.eventBus.emit('dataUpdate', { alert: 'triggered', alertId: alert.id, price: alert.price, message: alert.message });
    });
    this.alertManager.on('added', (alert) => {
      this.eventBus.emit('alertAdd', { id: alert.id, price: alert.price, condition: alert.condition, message: alert.message, triggered: alert.triggered });
    });
    this.alertManager.on('removed', (id) => {
      this.eventBus.emit('alertRemove', { id });
    });
    this.alertManager.on('updated', (alert) => {
      this.eventBus.emit('alertUpdate', { id: alert.id, price: alert.price, condition: alert.condition, message: alert.message, triggered: alert.triggered });
    });

    // Signal markers
    this.signalMarkerManager = new SignalMarkerManager();
    this.signalMarkerManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.signalMarkerManager.setDataGetter(() => this.dataManager.getData());
    this.signalMarkerManager.on('added', (m) => {
      this.eventBus.emit('signalMarkerAdd' as ChartEventType, { id: m.id, source: m.source, direction: m.direction });
    });
    this.signalMarkerManager.on('removed', (id) => {
      this.eventBus.emit('signalMarkerRemove' as ChartEventType, { id });
    });

    // Trade zones
    this.tradeZoneManager = new TradeZoneManager();
    this.tradeZoneManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.tradeZoneManager.setDataGetter(() => this.dataManager.getData());
    this.tradeZoneManager.on('added', (z) => {
      this.eventBus.emit('tradeZoneAdd' as ChartEventType, { id: z.id, direction: z.direction });
    });
    this.tradeZoneManager.on('removed', (id) => {
      this.eventBus.emit('tradeZoneRemove' as ChartEventType, { id });
    });

    // Replay
    this.replayManager = new ReplayManager();

    // Measure overlay (shift-drag ruler)
    this.measureOverlay = new MeasureOverlay();

    // Interaction
    this.interactionManager = new InteractionManager(container);
    if (this.features.panning) {
      // Decides per gesture when a drag also moves the price scale.
      const verticalGate = new VerticalPanGate();
      this.interactionManager.setPanHandler(
        new PanHandler(
          (deltaX, deltaY) => {
            if (deltaX) this.viewport.scrollBy(deltaX);

            // Grab-and-drag the price scale vertically. Auto-scale would just
            // recompute the range on the next frame, so engaging the drag
            // turns it off (double-click the price axis to restore), mirroring
            // the price-axis drag-scale gesture.
            if (verticalGate.step(deltaX, deltaY, this.options.autoScale !== false) && deltaY) {
              this.options.autoScale = false;
              this.viewport.panPriceRange(deltaY);
            }

            this.updateViewportAndRender();
          },
          () => verticalGate.reset(),
        ),
      );
    }
    if (this.features.zooming) {
      this.interactionManager.setZoomHandler(
        new ZoomHandler((delta, centerX) => {
          this.viewport.zoom(delta, centerX);
          this.updateViewportAndRender();
        }),
      );

      // Axis drag-scaling:
      //   drag price axis  → scalePriceRange(factor), disables autoScale
      //   drag time axis   → zoom around chart center
      //   dblclick axis    → reset (price: re-enable autoScale; time: fitContent)
      const axisDrag = new AxisDragHandler(
        (factor) => {
          this.options.autoScale = false;
          this.viewport.scalePriceRange(factor);
          this.syncRenderContext();
          this.engine.requestRender();
          this.emitViewportEvents();
        },
        (factor) => {
          const cw = this.viewport.getState().chartRect.width;
          // factor > 1 means zoom OUT (compress time). Map to negative delta
          // because Viewport.zoom uses (1 + delta) on barWidth — positive
          // delta zooms in.
          this.viewport.zoom(1 / factor - 1, cw / 2);
          this.updateViewportAndRender();
        },
      );
      this.interactionManager.setAxisDragHandler(
        axisDrag,
        () => this.viewport.getState(),
        (axis) => {
          if (axis === 'price') {
            this.options.autoScale = true;
            this.updateViewportAndRender();
          } else {
            this.fitContent();
          }
        },
      );
    }
    if (this.features.crosshair) {
      this.interactionManager.setCrosshairHandler(this.crosshairHandler);
    }
    if (this.features.drawings) {
      this.interactionManager.setDrawingManager(
        this.drawingManager,
        // Inject current data so drawing anchors are stored/resolved as real
        // timestamps (survives timeframe/symbol switches).
        () => ({ ...this.viewport.getState(), data: this.getDisplayData() }),
      );
    }
    if (this.features.trading) {
      this.interactionManager.setTradingManager(
        this.tradingManager,
        () => ({ ...this.viewport.getState(), data: this.getDisplayData() }),
      );
    }
    if (this.features.alerts) {
      const alertDrag = new AlertDragHandler(this.alertManager, () => this.viewport.getState());
      this.interactionManager.setAlertDragHandler(alertDrag);
    }

    // Drag pane dividers to resize indicator panels.
    const paneResize = new PaneResizeHandler();
    paneResize.configure(
      () => this.getResolvedLayout(),
      (panelId, size) => this.setPanelSize(panelId, size),
    );
    this.interactionManager.setPaneResizeHandler(paneResize);
    // Alt-click pins the OHLC tooltip at the bar under the cursor. Hitting
    // it a second time on the same bar unpins.
    this.interactionManager.setAltClickHandler((pos) => {
      const data = this.getDisplayData();
      if (data.length === 0) return;
      const vp = this.viewport.getState();
      const barUnit = vp.barWidth + vp.barSpacing;
      const idx = Math.round((vp.offset + pos.x) / barUnit);
      if (idx < 0 || idx >= data.length) return;
      if (this.pinnedTooltip.isPinned() && this.pinnedTooltip.getPinnedIndex() === idx) {
        this.pinnedTooltip.unpin();
      } else {
        this.pinnedTooltip.pin(data[idx], idx, this.themeManager.getTheme());
      }
      this.pinnedTooltip.reposition(
        this.viewport.getState(),
        this.dataManager.getData()[idx] ?? null,
        idx,
        this.themeManager.getTheme(),
      );
      this.engine.requestRender(LayerType.Overlay);
    });

    this.interactionManager.setClickHandler((pos) => {
      const data = this.getDisplayData();
      this.eventBus.emit('click', { x: pos.x, y: pos.y });
      if (data.length === 0) return;
      // Canonical bar mapping (accounts for chartRect.x + bar centering) so the
      // clicked bar matches the crosshair / drawings.
      const idx = xToBarIndex(pos.x, this.viewport.getState());
      if (idx < 0 || idx >= data.length) return;
      this.eventBus.emit('barClick', { bar: data[idx], barIndex: idx, point: pos });
    });

    this.interactionManager.setEscapeHandler(() => {
      if (this.features.trading && this.tradingManager.isBracketActive()) {
        this.tradingManager.cancelBracket();
        this.eventBus.emit('dataUpdate', { bracket: 'cancelled' });
        return;
      }
      if (this.pinnedTooltip.isPinned()) {
        this.pinnedTooltip.unpin();
        this.engine.requestRender(LayerType.Overlay);
      }
    });

    this.interactionManager.setConfirmHandler(() => {
      if (this.features.trading && this.tradingManager.isBracketActive()) {
        this.tradingManager.confirmBracket();
        return true;
      }
      return false;
    });

    // Shift-drag measure tool — transient overlay. Coords resolved via
    // viewport + displayData so the ruler sticks to the data during zoom.
    this.interactionManager.setMeasureHandlers({
      begin: (pos) => {
        this.measureOverlay.begin(pos, this.viewport.getState(), this.getDisplayData());
      },
      move: (pos) => {
        this.measureOverlay.update(pos, this.viewport.getState(), this.getDisplayData());
      },
      end: () => {
        this.measureOverlay.end();
      },
    });

    // Ctrl/⌘-drag: select every drawing the box covers; Ctrl/⌘-click adds or
    // removes one. The box is kept inside the plot (moves are followed
    // off-chart), so the selection matches what the box showed.
    const inPlot = (pos: { x: number; y: number }) => {
      const r = this.viewport.getState().chartRect;
      return {
        x: Math.max(r.x, Math.min(r.x + r.width, pos.x)),
        y: Math.max(r.y, Math.min(r.y + r.height, pos.y)),
      };
    };
    this.interactionManager.setBoxSelectHandlers({
      begin: (pos) => this.selectionBoxOverlay.begin(inPlot(pos)),
      move: (pos) => this.selectionBoxOverlay.update(inPlot(pos)),
      end: () => {
        const box = this.selectionBoxOverlay.end();
        if (!box || !this.features.drawings) return;
        // With the bar series, so anchors resolve as timestamps (as for drawing hit-tests).
        const vs = { ...this.viewport.getState(), data: this.getDisplayData() };
        if (box.isClick) this.drawingManager.toggleSelectionAt({ x: box.x1, y: box.y1 }, vs);
        else this.drawingManager.selectInRect(box, vs);
        this.engine.requestRender(LayerType.Overlay);
      },
      cancel: () => this.selectionBoxOverlay.cancel(),
    });

    // A plain hover only moves pointer-tied visuals (crosshair, its axis
    // pills, measure ruler, selection box): repaint just the top canvas.
    this.interactionManager.setOverlayDirtyCallback((hoverOnly) => {
      this.engine.requestRender(hoverOnly ? LayerType.Hover : LayerType.Overlay);
    });
    this.interactionManager.attach();

    // Set render context
    this.syncRenderContext();
    this.engine.start();
  }

  // --- Data ---

  setData(data: DataSeries): void {
    // A full replace is a new series: any replay of the old one ends.
    this.endReplaySession();
    this.dataManager.setData(data);
    this.crosshairHandler.setData(this.dataManager.getData());
    this.displayDataCache = null;
    this.sessionBreaks.invalidateCache();
    // A full data replace means a new series (symbol/timeframe switch, not
    // a live tick — those go through appendBar/updateLastBar instead), so
    // un-freeze the Y-axis the same way scrollToEnd below resets the X-axis.
    // Otherwise a price-axis drag or vertical pan on the old symbol silently
    // keeps the new symbol's chart stuck on the old price range.
    this.options.autoScale = this.defaultAutoScale;
    // New data context (symbol / timeframe) — drop stale alert prev-values so
    // the next tick seeds cleanly instead of crossing against the old series.
    this.alertManager.clearLastValues();
    this.recalcIndicators(this.dataManager.getData());
    // Auto-set current price line from last bar's close
    if (data.length > 0) {
      this.currentPriceLine.setPrice(data[data.length - 1].close);
    }
    this.updateViewportAndRender(true);
    this.eventBus.emit('dataUpdate', { length: data.length });
  }

  appendBar(bar: OHLCBar): void {
    if (this.replaySession) {
      this.replaySession.live.appendBar(bar);
      return;
    }
    // Follow the live edge only if the view is already there — browsing
    // history shouldn't be yanked back to the end on every new bar.
    const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
    this.dataManager.appendBar(bar);
    const data = this.dataManager.getData();
    this.crosshairHandler.setData(data);
    this.displayDataCache = null;
    // Re-finalise the bar that just closed (its last tick may differ from the
    // final close) and compute the new one; everything older is untouched.
    this.recalcIndicatorsFrom(data, data.length - 2);
    this.updateViewportAndRender(follow);
  }

  /**
   * Append multiple bars at once (e.g., catch-up after reconnect).
   * More efficient than calling appendBar() in a loop — recalculates
   * indicators only once at the end.
   */
  appendBars(bars: OHLCBar[]): void {
    if (bars.length === 0) return;
    if (this.replaySession) {
      for (const bar of bars) this.replaySession.live.appendBar(bar);
      return;
    }
    const follow = this.viewport.isAtEnd();
    const firstChanged = this.dataManager.getLength() - 1;
    for (const bar of bars) {
      this.dataManager.appendBar(bar);
    }
    this.displayDataCache = null;
    this.recalcIndicatorsFrom(this.dataManager.getData(), firstChanged);
    this.crosshairHandler.setData(this.dataManager.getData());
    this.updateViewportAndRender(follow);
  }

  updateLastBar(bar: OHLCBar): void {
    if (this.replaySession) {
      this.replaySession.live.updateLastBar(bar);
      return;
    }
    this.dataManager.updateLastBar(bar);
    this.currentPriceLine.setPrice(bar.close);
    // For non-transform chart types, the displayDataCache still points to the
    // same raw array (mutated in place), so no need to invalidate.
    // Only invalidate for transform types that produce derived arrays.
    if (this.options.chartType !== 'candlestick' && this.options.chartType !== 'line'
        && this.options.chartType !== 'area' && this.options.chartType !== 'bar'
        && this.options.chartType !== 'hollowCandle') {
      this.displayDataCache = null;
    }
    // Keep indicator lines in sync with the forming bar. Without this, panel
    // + overlay indicators freeze until bar close. Only the last bar changed.
    const data = this.dataManager.getData();
    this.recalcIndicatorsFrom(data, data.length - 1);
    this.scheduleRender();
  }

  /** Merge a price tick into the current last bar (convenience for live feeds) */
  updateLastBarFromTick(tick: { price: number; volume?: number; time: number }): void {
    if (this.replaySession) {
      this.replaySession.live.updateLastBarFromTick(tick);
      if (Number.isFinite(tick.price)) this.replaySession.price = { price: tick.price };
      return;
    }
    this.dataManager.updateLastBarFromTick(tick);
    this.currentPriceLine.setPrice(tick.price);
    if (this.options.chartType !== 'candlestick' && this.options.chartType !== 'line'
        && this.options.chartType !== 'area' && this.options.chartType !== 'bar'
        && this.options.chartType !== 'hollowCandle') {
      this.displayDataCache = null;
    }
    const data = this.dataManager.getData();
    this.recalcIndicatorsFrom(data, data.length - 1);
    this.scheduleRender();
  }

  // --- Chart type ---

  setChartType(type: ChartType | (string & {})): void {
    this.options.chartType = type as ChartType;
    this.chartRenderer = this.createChartRenderer(type);
    this.chartLegend.setChartType(type as ChartType);
    this.displayDataCache = null;
    this.updateViewportAndRender(true);
  }

  // --- Indicators ---

  /**
   * Add an indicator. Panel indicators get a pane of their own at `position`.
   * `options.pane` draws it in another indicator's pane instead, on that
   * pane's scale; a price-pane indicator computed from a pane indicator's
   * line (`source: 'ind:<instanceId>:<key>'`) goes there by itself.
   */
  addIndicator(
    id: string,
    params: Record<string, number | string | boolean> = {},
    position: PanelPosition = 'bottom',
    options: { pane?: string } = {},
  ): string | null {
    if (!this.features.indicators) return null;
    if (this.features.indicatorIds.length > 0 && !this.features.indicatorIds.includes(id)) return null;
    const descriptor = this.indicatorEngine.getAvailableIndicators().find((d) => d.id === id);
    const pane = descriptor ? this.paneFor(descriptor, params, options.pane) : null;
    const instanceId = this.indicatorEngine.addIndicator(id, params, this.dataManager.getData(), pane ? { pane } : {});
    if (descriptor?.placement === 'panel' && !pane) this.layoutManager.addPanel(instanceId, position);
    // The layout (a new pane) or the price scale (a new overlay) may change.
    this.updateViewportAndRender();
    this.eventBus.emit('indicatorAdd', { instanceId, id });
    this.scheduleAutoSave();
    return instanceId;
  }

  updateIndicator(instanceId: string, params: Record<string, number | string | boolean>): void {
    this.indicatorEngine.updateIndicator(instanceId, params, this.dataManager.getData());
    this.announceIndicatorUpdate(0);
    this.scheduleAutoSave();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'params' });
    // A price-pane indicator follows its source into a pane, or back out of it.
    const descriptor = this.indicatorEngine.getIndicatorDescriptor(instanceId);
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if (descriptor?.placement === 'overlay' && config) {
      const pane = this.paneFor(descriptor, config.params, undefined, instanceId);
      if ((pane ?? undefined) !== config.pane) {
        this.indicatorEngine.setPane(instanceId, pane);
        this.eventBus.emit('indicatorChange', { instanceId, change: 'pane' });
      }
    }
    this.updateViewportAndRender();
  }

  /**
   * The pane an indicator is drawn in, other than its own: the pane of the
   * instance `requested`, or, for a price-pane indicator computed from a pane
   * indicator's line, that indicator's pane. Null = the price pane (overlays)
   * or a pane of its own (panels).
   */
  private paneFor(
    descriptor: IndicatorDescriptor,
    params: Readonly<Record<string, unknown>>,
    requested?: string,
    self?: string,
  ): string | null {
    if (requested) return this.paneHostOf(requested, self);
    if (descriptor.placement !== 'overlay') return null;
    const name = sourceParam(descriptor);
    const line = name ? parseIndicatorSource(params[name]) : null;
    return line ? this.paneHostOf(line.instanceId, self) : null;
  }

  /** The instance owning the pane `instanceId` is drawn in; null for the price pane. */
  private paneHostOf(instanceId: string, self?: string): string | null {
    if (instanceId === self) return null;
    if (this.layoutManager.getPanels().some((p) => p.id === instanceId)) return instanceId;
    const pane = this.indicatorEngine.getIndicatorConfig(instanceId)?.pane;
    return pane && pane !== self ? pane : null;
  }

  /** An indicator's reference levels (RSI 30 / 70): its own, else its indicator's defaults. */
  getIndicatorLevels(instanceId: string): number[] {
    return this.indicatorEngine.getLevels(instanceId);
  }

  /** Set an indicator's reference levels; `null` restores its indicator's defaults. */
  setIndicatorLevels(instanceId: string, levels: readonly number[] | null): void {
    if (!this.indicatorEngine.setLevels(instanceId, levels)) return;
    this.updateViewportAndRender();
    this.scheduleAutoSave();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'levels' });
  }

  /**
   * Remove an indicator, and the indicators computed from its lines with it.
   * Others drawn in its pane keep the pane (a pane indicator takes it over)
   * or go back to the price pane.
   */
  removeIndicator(instanceId: string): void {
    if (!this.indicatorEngine.getIndicatorConfig(instanceId)) return;
    for (const reader of this.indicatorEngine.getDependents(instanceId).reverse()) {
      if (this.indicatorEngine.getIndicatorConfig(reader)) this.removeIndicator(reader);
    }
    const panel = this.layoutManager.getPanels().find((p) => p.id === instanceId);
    const members = this.indicatorEngine.getPaneMembers(instanceId);
    this.indicatorEngine.removeIndicator(instanceId);
    let heir: string | null = null;
    for (const member of members) {
      const isPanel = this.indicatorEngine.getIndicatorDescriptor(member)?.placement === 'panel';
      if (isPanel && panel && !heir) {
        heir = member;
        this.indicatorEngine.setPane(member, null);
        this.layoutManager.renamePanel(instanceId, member);
      } else if (heir) {
        this.indicatorEngine.setPane(member, heir);
      } else {
        this.indicatorEngine.setPane(member, null);
        if (isPanel) this.layoutManager.addPanel(member, panel?.position ?? 'bottom');
      }
      this.eventBus.emit('indicatorChange', { instanceId: member, change: 'pane' });
    }
    if (!heir) this.layoutManager.removePanel(instanceId);
    this.eventBus.emit('indicatorRemove', { instanceId });
    this.scheduleAutoSave();
    this.updateViewportAndRender();
  }

  /** The colours, line widths and opacity an indicator draws with (a copy), or null. */
  getIndicatorStyle(instanceId: string): ResolvedIndicatorStyle | null {
    return this.indicatorEngine.getIndicatorStyle(instanceId);
  }

  getIndicatorOutput(instanceId: string): IndicatorOutput | null {
    return this.indicatorEngine.getOutput(instanceId);
  }

  registerIndicator(plugin: IndicatorPlugin): void {
    this.pluginManager.registerIndicator(plugin);
  }

  /** The chart's plugin registry — register custom indicators / drawings / chart types / overlays. */
  get plugins(): PluginManager {
    return this.pluginManager;
  }

  static indicators(): IndicatorDescriptor[] {
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    return engine.getAvailableIndicators();
  }

  // --- Panel layout ---

  setPanelPosition(instanceId: string, position: PanelPosition): void {
    this.layoutManager.setPanelPosition(instanceId, position);
    this.updateViewportAndRender();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'pane' });
  }

  setPanelSize(instanceId: string, size: number): void {
    this.layoutManager.setPanelSize(instanceId, size);
    this.updateViewportAndRender();
    this.eventBus.emit('paneResize', { instanceId, size });
  }

  /**
   * Indicator panes, in CSS pixels relative to the container: the whole pane,
   * its 20 px header (where the name is written) included.
   */
  getIndicatorPanes(): { instanceId: string; instanceIds: string[]; rect: { x: number; y: number; width: number; height: number } }[] {
    return this.buildPanelRenderInfos().map((p) => ({
      instanceId: p.instanceId,
      instanceIds: [p.instanceId, ...(p.members ?? [])],
      rect: { ...p.rect },
    }));
  }

  /** Tag each indicator line's latest value on its value axis (default on). */
  setIndicatorValueLabelsVisible(visible: boolean): void {
    this.features.indicatorValueLabels = visible;
    this.syncRenderContext();
    this.engine.requestRender();
  }

  /** Write each pane's indicator name and hovered values in its header (default); off when you label panes yourself. */
  setPaneTitlesVisible(visible: boolean): void {
    this.paneTitles = visible;
    this.engine.requestRender();
  }

  /**
   * The y (CSS px, container-relative) just below the OHLCV legend — where
   * content stacked under it starts. The plot's top edge when it is hidden.
   */
  getLegendBottom(): number {
    const top = this.viewport.getState().chartRect.y;
    return this.features.legend ? top + this.chartLegend.getHeight() : top;
  }

  /**
   * Whether each drawn bar is one data bar (candles, lines, Heikin-Ashi…).
   * Renko, Kagi, point & figure, line break and range bars redraw the series,
   * so a bar index on screen is not an index into the data.
   */
  isTimeAligned(): boolean {
    if (isReshapedChartType(this.options.chartType)) return false;
    return this.getDisplayData().length === this.dataManager.getLength();
  }

  /** A price as the price axis writes it: the market's precision or the visible range's, in the number locale. */
  formatPrice(price: number): string {
    const { min, max } = this.viewport.getState().priceRange;
    return formatPrice(price, this.marketPricePrecision ?? autoPricePrecision(min, max), this.numberLocale);
  }

  // --- Drawing tools ---

  setDrawingTool(type: DrawingToolType | null): void {
    if (!this.features.drawings) return;
    // If whitelist is set, check it
    if (type && this.features.drawingTools.length > 0 && !this.features.drawingTools.includes(type)) return;
    this.drawingManager.setActiveTool(type);
  }

  getDrawingTool(): DrawingToolType | null {
    return this.drawingManager.getActiveTool();
  }

  /** Keep the drawing tool after each drawing, to draw several in a row (Esc ends). */
  setStayInDrawingMode(enabled: boolean): void {
    this.drawingManager.setStayInDrawingMode(enabled);
  }

  isStayInDrawingMode(): boolean {
    return this.drawingManager.isStayInDrawingMode();
  }

  /** Copy the selected drawings (also Ctrl/⌘+C on the chart). Returns how many. */
  copyDrawings(): number {
    return this.drawingManager.copySelection();
  }

  /**
   * Paste copied drawings (also Ctrl/⌘+V) — from this chart or another one on
   * the page. Returns the new drawings' ids.
   */
  pasteDrawings(): string[] {
    if (!this.features.drawings) return [];
    return this.drawingManager.paste();
  }

  setDrawingStyle(style: Partial<DrawingStyle>): void {
    this.drawingManager.setStyle(style);
  }

  getDrawingStyle(): DrawingStyle {
    return this.drawingManager.getActiveStyle();
  }

  getSelectedDrawingId(): string | null {
    return this.drawingManager.getSelectedDrawingId();
  }

  /** Restyle the selected drawing (or one by id). Returns true if applied. */
  setSelectedDrawingStyle(style: Partial<DrawingStyle>, id?: string): boolean {
    return this.drawingManager.setSelectedDrawingStyle(style, id);
  }

  getDrawings(): DrawingState[] {
    return this.drawingManager.getDrawings();
  }

  setDrawings(drawings: DrawingState[]): void {
    this.drawingManager.setDrawings(drawings);
  }

  /** Append a drawing (id auto-assigned, active style applied). Returns the id. */
  addDrawing(state: {
    type: import('@tradecanvas/commons').DrawingToolType;
    anchors: import('@tradecanvas/commons').AnchorPoint[];
    style?: Partial<DrawingStyle>;
    visible?: boolean;
    locked?: boolean;
    meta?: Record<string, unknown>;
  }): string | null {
    if (!this.features.drawings) return null;
    const id = this.drawingManager.addDrawing(state);
    this.scheduleAutoSave();
    return id;
  }

  /**
   * Draw a Fibonacci retracement over the dominant swing (extreme high/low) in
   * the visible range. Returns the new drawing's id, or null if no swing.
   */
  autoFib(): string | null {
    if (!this.features.drawings) return null;
    const data = this.getDisplayData();
    const vs = this.viewport.getState();
    const swing = findDominantSwing(data, vs.visibleRange.from, vs.visibleRange.to);
    if (!swing) return null;
    return this.addDrawing({ type: 'fibRetracement', anchors: [swing[0], swing[1]] });
  }

  removeDrawing(id: string): void {
    this.drawingManager.removeDrawing(id);
  }

  setDrawingVisible(id: string, visible: boolean): void {
    this.drawingManager.setDrawingVisible(id, visible);
  }

  setDrawingLocked(id: string, locked: boolean): void {
    this.drawingManager.setDrawingLocked(id, locked);
  }

  clearDrawings(): void {
    this.drawingManager.clearDrawings();
  }

  registerDrawingTool(plugin: DrawingPlugin): void {
    this.drawingManager.register(plugin);
  }

  // --- Undo/Redo ---

  undo(): boolean {
    if (!this.features.drawingUndoRedo) return false;
    return this.drawingManager.undo();
  }

  redo(): boolean {
    if (!this.features.drawingUndoRedo) return false;
    return this.drawingManager.redo();
  }

  getUndoRedoState(): { canUndo: boolean; canRedo: boolean } {
    return this.undoRedoManager.getState();
  }

  // --- Drawing magnet ---

  /** Ignored (stays off) when `features.drawingMagnet` is false. */
  setDrawingMagnet(enabled: boolean): void {
    this.drawingManager.setMagnetMode(enabled && this.features.drawingMagnet ? 'magnet' : 'none');
  }

  getDrawingMagnet(): boolean {
    return this.drawingManager.getMagnetMode() === 'magnet';
  }

  // --- Bulk drawing operations ---

  lockAllDrawings(): void {
    this.drawingManager.lockAllDrawings();
  }

  unlockAllDrawings(): void {
    this.drawingManager.unlockAllDrawings();
  }

  hideAllDrawings(): void {
    this.drawingManager.hideAllDrawings();
  }

  showAllDrawings(): void {
    this.drawingManager.showAllDrawings();
  }

  // --- Drawing duplication ---

  duplicateDrawing(id?: string): string | null {
    const targetId = id ?? this.drawingManager.getSelectedDrawingId();
    if (!targetId) return null;
    return this.drawingManager.duplicateDrawing(targetId);
  }

  // --- Data export ---

  /** Does nothing when `features.dataExport` is false. */
  exportVisibleData(format: 'csv' | 'json' = 'csv', filename?: string): void {
    if (!this.features.dataExport) return;
    const vp = this.viewport.getState();
    const data = this.dataManager.getData();
    const from = Math.max(0, vp.visibleRange.from);
    const to = Math.min(data.length - 1, vp.visibleRange.to);
    const slice = data.slice(from, to + 1);

    if (format === 'json') {
      const content = DataExporter.toJSON(slice);
      DataExporter.download(content, filename ?? 'chart-data.json', 'application/json');
    } else {
      const content = DataExporter.toCSV(slice);
      DataExporter.download(content, filename ?? 'chart-data.csv', 'text/csv');
    }
  }

  /** Does nothing when `features.dataExport` is false. */
  exportAllData(format: 'csv' | 'json' = 'csv', filename?: string): void {
    if (!this.features.dataExport) return;
    const data = this.dataManager.getData();
    if (format === 'json') {
      const content = DataExporter.toJSON(data);
      DataExporter.download(content, filename ?? 'chart-data.json', 'application/json');
    } else {
      const content = DataExporter.toCSV(data);
      DataExporter.download(content, filename ?? 'chart-data.csv', 'text/csv');
    }
  }

  // --- Auto-save ---

  setAutoSave(key: string, delayMs = 5000): void {
    this.autoSaveScheduler.enable(key, delayMs);
  }

  disableAutoSave(): void {
    this.autoSaveScheduler.disable();
  }

  private scheduleAutoSave(): void {
    this.autoSaveScheduler.schedule();
  }

  // --- Indicator introspection ---

  getAvailableIndicators(): IndicatorDescriptor[] {
    return this.indicatorEngine.getAvailableIndicators();
  }

  getIndicatorInputs(id: string): { id: string; params: Record<string, unknown> } | null {
    const indicators = this.indicatorEngine.getAvailableIndicators();
    const desc = indicators.find(i => i.id === id);
    if (!desc) return null;
    return { id: desc.id, params: desc.defaultConfig };
  }

  /** Get all active indicator instances with their current params */
  getActiveIndicators(): import('@tradecanvas/core').ActiveIndicatorInfo[] {
    return this.indicatorEngine.getActiveIndicators();
  }

  /** Show or hide an indicator without removing it. */
  setIndicatorVisible(instanceId: string, visible: boolean): void {
    if (this.indicatorEngine.setVisible(instanceId, visible) !== null) {
      this.updateViewportAndRender();
      this.scheduleAutoSave();
      this.eventBus.emit('indicatorChange', { instanceId, change: 'visible' });
    }
  }

  /** Get current config for a specific indicator instance */
  getIndicatorConfig(instanceId: string): { id: string; params: Record<string, unknown> } | null {
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if (!config) return null;
    return { id: config.id, params: { ...config.params } };
  }

  /** Update indicator colors/line widths at runtime */
  updateIndicatorStyle(instanceId: string, style: { colors?: string[]; lineWidths?: number[]; opacity?: number }): void {
    this.indicatorEngine.updateIndicatorStyle(instanceId, style);
    this.engine.requestRender();
    this.scheduleAutoSave();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'style' });
  }

  // --- Trading ---

  setOrders(orders: TradingOrder[]): void {
    if (!this.features.trading) return;
    this.tradingManager.setOrders(orders);
  }

  /**
   * Begin placing a draggable bracket order (entry + stop-loss + take-profit).
   * Defaults the entry to the latest close when `entry` is omitted. Drag the
   * three lines to adjust; confirm with Enter (emits `bracketPlace`) or cancel
   * with Esc. Returns false if trading is disabled or no price is available.
   */
  startBracket(side: import('@tradecanvas/commons').OrderSide, entry?: number): boolean {
    if (!this.features.trading) return false;
    const data = this.dataManager.getData();
    const price = entry ?? (data.length > 0 ? data[data.length - 1].close : null);
    if (price === null) return false;
    this.tradingManager.startBracket(side, price);
    return true;
  }

  cancelBracket(): void {
    if (this.features.trading) this.tradingManager.cancelBracket();
  }

  confirmBracket(): boolean {
    return this.features.trading ? this.tradingManager.confirmBracket() : false;
  }

  isBracketActive(): boolean {
    return this.features.trading && this.tradingManager.isBracketActive();
  }

  /**
   * Begin a drag-to-create single order at `price` (default: latest close) for
   * `side`. Drag the line to a level — the order type (limit/stop) is inferred
   * from the level vs the current price. Confirm with `confirmOrderDraft()`
   * (emits `orderPlace`) or cancel with `cancelOrderDraft()`. Returns false if
   * trading is disabled or no price is available.
   */
  startOrderDraft(side: import('@tradecanvas/commons').OrderSide, price?: number): boolean {
    if (!this.features.trading) return false;
    const data = this.dataManager.getData();
    const p = price ?? (data.length > 0 ? data[data.length - 1].close : null);
    if (p === null) return false;
    this.tradingManager.startOrderDraft(side, p);
    return true;
  }

  cancelOrderDraft(): void {
    if (this.features.trading) this.tradingManager.cancelOrderDraft();
  }

  confirmOrderDraft(): boolean {
    return this.features.trading ? this.tradingManager.confirmOrderDraft() : false;
  }

  isOrderDraftActive(): boolean {
    return this.features.trading && this.tradingManager.isOrderDraftActive();
  }

  /**
   * Emit an `orderPlace` intent (e.g. from a depth-ladder click). The chart
   * does not create the order itself — the host listens via
   * `chart.on('orderPlace', …)` and submits to its OMS.
   */
  placeOrderIntent(intent: import('@tradecanvas/commons').OrderPlaceIntent): void {
    if (!this.features.trading) return;
    this.eventBus.emit('orderPlace', intent);
  }

  setPositions(positions: TradingPosition[]): void {
    if (!this.features.trading) return;
    this.tradingManager.setPositions(positions);
  }

  setDepthData(depth: DepthData | null): void {
    if (!this.features.trading) return;
    this.tradingManager.setDepthData(depth);
  }

  setCurrentPrice(price: number, _pulseColor?: string): void {
    this.tradingManager.setCurrentPrice(price);
    if (this.replaySession) {
      // During a replay the price line shows the replayed close; the live
      // price comes back with replayStop(). Orders and alerts stay live.
      this.replaySession.price = { price };
    } else {
      // Also update standalone price line (visible even without trading feature)
      this.currentPriceLine.setPrice(price);
      this.scheduleRender();
    }
    if (this.features.alerts) {
      this.alertManager.checkPrice(price);
      this.feedIndicatorAlerts();
    }
  }

  /**
   * Feed the latest indicator-line values to any indicator-channel alerts.
   * Channel format: `<instanceId>:<key>`; instanceIds are `tc_<id>_<n>` and
   * built-in keys are colon-free, so the first colon splits them. Values come
   * from the recalculated series, so indicator alerts evaluate at bar cadence
   * (the live intrabar tick doesn't repaint closed-bar indicator values).
   * Cheap — only walks alerts whose channel isn't `'price'`, usually none.
   */
  private feedIndicatorAlerts(): void {
    const alerts = this.alertManager.getAlerts();
    const data = this.dataManager.getData();
    if (data.length === 0) return;
    const lastIdx = data.length - 1;
    const seen = new Set<string>();
    for (const alert of alerts) {
      if (alert.channel === 'price' || seen.has(alert.channel)) continue;
      seen.add(alert.channel);
      const sep = alert.channel.indexOf(':');
      if (sep < 0) continue;
      const instanceId = alert.channel.slice(0, sep);
      const key = alert.channel.slice(sep + 1);
      const point = this.indicatorEngine.getOutput(instanceId)?.series?.[lastIdx];
      const value = point?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        this.alertManager.checkChannel(alert.channel, value);
      }
    }
  }

  setTradingConfig(config: Partial<TradingConfig>): void {
    if (!this.features.trading) return;
    this.tradingManager.setConfig(config);
  }

  // --- Real-time Streaming ---

  /**
   * Connect to a real-time data source.
   * Loads history, starts streaming, manages reconnection automatically.
   *
   * @example
   * import { BinanceAdapter } from '@tradecanvas/core';
   * chart.connect({
   *   adapter: new BinanceAdapter(),
   *   symbol: 'BTCUSDT',
   *   timeframe: '1m',
   * });
   */
  async connect(config: StreamConfig): Promise<void> {
    // Back to the live series first, so a failed history load can't leave
    // the replayed slice on screen.
    this.replayStop();
    this.disconnectStream();

    this.streamManager = new StreamManager();

    this.streamManager.on('snapshot', (bars) => {
      if (this.replaySession) {
        this.replaySession.live.setData(bars);
        return;
      }
      this.setData(bars);
    });

    this.streamManager.on('barClose', (bar) => {
      if (this.replaySession) {
        this.replaySession.live.appendBar(bar);
        return;
      }
      const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
      this.dataManager.appendBar(bar);
      const data = this.dataManager.getData();
      this.crosshairHandler.setData(data);
      this.displayDataCache = null;
      this.recalcIndicatorsFrom(data, data.length - 2);
      this.updateViewportAndRender(follow);
    });

    this.streamManager.on('barUpdate', (bar) => {
      if (this.replaySession) {
        this.replaySession.live.updateLastBar(bar);
        return;
      }
      this.dataManager.updateLastBar(bar);
      this.currentPriceLine.setPrice(bar.close);
      // Recalculate indicators so panel/overlay series track the forming bar
      // instead of freezing until bar close — incrementally, since only the
      // last bar changed.
      const data = this.dataManager.getData();
      this.recalcIndicatorsFrom(data, data.length - 1);
      this.scheduleRender();
    });

    this.streamManager.on('priceChange', ({ price, previousClose }) => {
      // Orders keep tracking the live market during a replay; the price line
      // shows the replayed close instead.
      this.tradingManager.setCurrentPrice(price);
      if (this.replaySession) {
        this.replaySession.price = { price, previousClose: previousClose ?? undefined };
        return;
      }
      this.currentPriceLine.setPrice(price, previousClose ?? undefined);
      this.engine.requestRender(LayerType.Overlay);
    });

    this.streamManager.on('connectionChange', (info) => {
      this.eventBus.emit('dataUpdate', { connection: info });
    });

    this.streamManager.on('error', (err) => {
      this.eventBus.emit('dataUpdate', { error: err.message });
    });

    this.autoScrollOnNewBar = config.autoScroll !== false;
    this.currentSymbol = config.symbol;

    const manager = this.streamManager;
    await manager.connect(config);
    // Superseded by a newer connect() (fast symbol/timeframe switching) or a
    // disconnect while history was loading — leave the countdown to it.
    if (this.streamManager !== manager) return;

    // Set up bar countdown timer based on timeframe
    const tfMs = timeframeToMs(config.timeframe);
    this.barCountdown.setTimeframeMs(tfMs);

    // Start countdown refresh interval
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      if (this.barCountdown.isVisible()) {
        this.engine.requestRender(LayerType.Hover);
      }
    }, 1000);
  }

  /**
   * Switch symbol or timeframe on an active stream without full reconnect.
   */
  async switchStream(symbol: string, timeframe: TimeFrame): Promise<void> {
    if (!this.streamManager) return;
    this.currentSymbol = symbol;
    this.barCountdown.setTimeframeMs(timeframeToMs(timeframe));
    await this.streamManager.switchTo(symbol, timeframe);
  }

  /** False when `features.timeframes` is set and does not list `timeframe`. */
  isTimeframeAllowed(timeframe: TimeFrame): boolean {
    const allowed = this.features.timeframes;
    return allowed.length === 0 || allowed.includes(timeframe);
  }

  /**
   * Switch to a new timeframe. Requires an active stream connection.
   * Ignored when `features.timeframes` does not list it.
   * Internally calls switchStream with the current symbol.
   */
  async setTimeframe(timeframe: TimeFrame): Promise<void> {
    if (!this.streamManager) throw new Error('No active stream. Call connect() first.');
    if (!this.isTimeframeAllowed(timeframe)) return;
    await this.switchStream(this.currentSymbol, timeframe);
  }

  /**
   * Disconnect the real-time stream.
   */
  disconnectStream(): void {
    if (this.streamManager) {
      this.streamManager.dispose();
      this.streamManager = null;
    }
  }

  /**
   * Connect an execution adapter, turning the trading overlay into a live
   * trading surface. The adapter is the source of truth: the chart routes its
   * emitted order/position intents into the adapter and renders the
   * `orders` / `positions` the adapter emits back. With no adapter connected,
   * those intents remain plain events (the default). Listen for failures via
   * `chart.on('executionError', …)`.
   */
  connectExecution(adapter: ExecutionAdapter, config: ExecutionConfig = {}): void {
    if (!this.features.trading) {
      throw new Error('connectExecution requires features.trading to be enabled');
    }
    this.disconnectExecution();
    this.executionAdapter = adapter;
    this.execTeardown = wireExecution(adapter, {
      onIntent: (type, handler) => {
        const wrapped = (e: ChartEvent) => handler(e.payload);
        this.eventBus.on(type, wrapped);
        return () => this.eventBus.off(type, wrapped);
      },
      setOrders: (orders) => this.setOrders(orders),
      setPositions: (positions) => this.setPositions(positions),
      onError: (error) => this.eventBus.emit('executionError', error),
    });
    Promise.resolve(adapter.connect(config)).catch((cause) =>
      this.eventBus.emit('executionError', { message: 'Execution connect failed', cause }),
    );
  }

  /** Tear down the active execution adapter (if any) and stop routing intents. */
  disconnectExecution(): void {
    if (this.execTeardown) {
      this.execTeardown();
      this.execTeardown = null;
    }
    if (this.executionAdapter) {
      this.executionAdapter.disconnect();
      this.executionAdapter = null;
    }
  }

  /** The connected execution adapter, or null (e.g. for adapter-specific calls). */
  getExecutionAdapter(): ExecutionAdapter | null {
    return this.executionAdapter;
  }

  /** Ignored (stays hidden) when `features.barCountdown` is false. */
  setBarCountdownVisible(visible: boolean): void {
    this.barCountdown.setVisible(visible && this.features.barCountdown);
    this.engine.requestRender(LayerType.Hover);
  }

  setSessionBreaksVisible(visible: boolean): void {
    this.sessionBreaks.setVisible(visible);
    this.engine.requestRender(LayerType.Background);
  }

  // --- Compare symbols ---

  /** Does nothing when `features.compareSymbols` is false. */
  addCompareSymbol(id: string, label: string, data: DataSeries, color: string): void {
    if (!this.features.compareSymbols) return;
    this.compareRenderer.addSymbol({ id, label, data, color, visible: true });
    this.engine.requestRender(LayerType.Main);
  }

  removeCompareSymbol(id: string): void {
    this.compareRenderer.removeSymbol(id);
    this.engine.requestRender(LayerType.Main);
  }

  updateCompareData(id: string, data: DataSeries): void {
    this.compareRenderer.setSymbolData(id, data);
    this.engine.requestRender(LayerType.Main);
  }

  setCompareMode(mode: 'percent' | 'absolute'): void {
    this.compareRenderer.setMode(mode);
    this.engine.requestRender(LayerType.Main);
  }

  clearCompareSymbols(): void {
    this.compareRenderer.clear();
    this.engine.requestRender(LayerType.Main);
  }

  // --- Price scale ---

  /** Turning it on is ignored when `features.logScale` is false. */
  setLogScale(enabled: boolean): void {
    if (enabled && !this.features.logScale) return;
    this.viewport.setLogScale(enabled);
    this.updateViewportAndRender();
  }

  isLogScale(): boolean {
    return this.viewport.isLogScale();
  }

  /** Turn the price scale upside down: higher prices lower on screen. */
  setInvertScale(inverted: boolean): void {
    this.viewport.setInvertScale(inverted);
    this.updateViewportAndRender();
  }

  isInvertScale(): boolean {
    return this.viewport.isInvertScale();
  }

  /**
   * Set the price-scale presentation: `regular`, `logarithmic`, `percentage`
   * (axis labels show % change from the first visible bar), or `indexedTo100`
   * (rebased so the first visible bar reads as 100).
   */
  setScaleMode(mode: import('@tradecanvas/commons').PriceScaleMode): void {
    if (mode === 'logarithmic' && !this.features.logScale) return;
    this.viewport.setScaleMode(mode);
    this.updateViewportAndRender();
  }

  getScaleMode(): import('@tradecanvas/commons').PriceScaleMode {
    return this.viewport.getScaleMode();
  }

  setSessionBreaksConfig(config: { color?: string; lineStyle?: 'solid' | 'dashed' | 'dotted'; lineWidth?: number }): void {
    this.sessionBreaks.setConfig(config);
    this.engine.requestRender(LayerType.Background);
  }

  getConnectionState(): ConnectionState {
    return this.streamManager?.getConnectionState() ?? 'disconnected';
  }

  getConnectionInfo(): ConnectionInfo {
    return this.streamManager?.getConnectionInfo() ?? { state: 'disconnected' };
  }

  setAutoScroll(enabled: boolean): void {
    this.autoScrollOnNewBar = enabled;
  }

  // --- Viewport ---

  scrollTo(timestamp: number): void {
    const data = this.dataManager.getData();
    for (let i = 0; i < data.length; i++) {
      if (data[i].time >= timestamp) {
        const barUnit = this.viewport.getState().barWidth + this.viewport.getState().barSpacing;
        this.viewport.scrollBy(i * barUnit - this.viewport.getState().offset);
        this.updateViewportAndRender();
        return;
      }
    }
  }

  /**
   * Centre the bar that contains `time` — in the bars' own unit, ms or s —
   * (the first or last bar when `time` lies outside the data), keeping the zoom. Returns that bar's index, or -1
   * without data.
   */
  goToTime(time: number): number {
    const data = this.getDisplayData(); // the series on screen (renko bricks, kagi lines…)
    if (data.length === 0 || !Number.isFinite(time)) return -1;
    const index = Math.max(0, Math.min(data.length - 1, Math.floor(timestampToBarIndex(time, data))));
    const vs = this.viewport.getState();
    const centredOffset = index * (vs.barWidth + vs.barSpacing) + vs.barWidth / 2 - vs.chartRect.width / 2;
    this.viewport.scrollBy(centredOffset - vs.offset);
    this.updateViewportAndRender();
    return index;
  }

  /**
   * Show a span that ends at the last bar: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y or
   * All. Months and YTD follow the calendar in the display timezone. Only
   * loaded bars can be shown, so a span longer than the data shows all of it.
   */
  setVisibleRangePreset(preset: RangePreset): void {
    const data = this.getDisplayData();
    if (data.length === 0) return;
    const last = data.length - 1;
    // Bars may carry seconds rather than milliseconds; the calendar works in ms.
    const unit = data[last].time > SECONDS_TIME_LIMIT ? 1 : 1000;
    const startMs = rangePresetStart(preset, data[last].time * unit, this.displayTzOffset);
    const start = startMs === null ? null : startMs / unit;
    if (start === null || start < data[0].time) {
      this.fitContent();
      return;
    }
    // The first bar after `start`, so "1D" on 1-minute bars is 1440 bars, not 1441.
    const first = Math.min(last, Math.floor(timestampToBarIndex(start, data)) + 1);
    this.viewport.zoomToBarRange(first, last + this.viewport.getRightMargin());
    this.viewport.scrollToEnd();
    this.updateViewportAndRender();
  }

  scrollToEnd(): void {
    this.viewport.scrollToEnd();
    this.updateViewportAndRender();
  }

  /**
   * Show the bars between two timestamps edge to edge. Times past either end
   * of the data are allowed (they map into the empty future / past).
   */
  setVisibleRange(fromTimestamp: number, toTimestamp: number): void {
    const data = this.dataManager.getData();
    if (data.length === 0) return;
    const a = timestampToBarIndex(Math.min(fromTimestamp, toTimestamp), data);
    const b = timestampToBarIndex(Math.max(fromTimestamp, toTimestamp), data);
    // Previously this only changed the bar width around the centre, so the
    // requested range was not actually what ended up on screen.
    this.viewport.zoomToBarRange(a, b);
    this.updateViewportAndRender();
  }

  /** Change free-panning bounds at runtime — see `ChartOptions.freePan` / `panLimits`. */
  setPanLimits(limits: { freePan?: boolean; minVisibleBars?: number }): void {
    this.viewport.setPanLimits(limits);
    this.updateViewportAndRender();
  }

  zoomIn(): void {
    const chartWidth = this.viewport.getState().chartRect.width;
    this.viewport.zoom(0.2, chartWidth / 2);
    this.updateViewportAndRender();
  }

  zoomOut(): void {
    const chartWidth = this.viewport.getState().chartRect.width;
    this.viewport.zoom(-0.2, chartWidth / 2);
    this.updateViewportAndRender();
  }

  /**
   * Fit all bars on screen with the usual right margin, resting at the live
   * edge — so new bars keep following afterwards. If they can't all fit at
   * the minimum bar width, the newest ones are shown.
   */
  fitContent(): void {
    const n = this.dataManager.getLength();
    if (n === 0) return;
    this.viewport.zoomToBarRange(0, n - 1 + this.viewport.getRightMargin());
    this.viewport.scrollToEnd();
    this.updateViewportAndRender();
  }

  // --- Events ---

  on<K extends ChartEventType>(type: K, handler: (event: ChartEvent<K extends keyof ChartEventMap ? ChartEventMap[K] : unknown>) => void): void {
    this.eventBus.on(type, handler as (event: ChartEvent) => void);
  }

  off<K extends ChartEventType>(type: K, handler: (event: ChartEvent<K extends keyof ChartEventMap ? ChartEventMap[K] : unknown>) => void): void {
    this.eventBus.off(type, handler as (event: ChartEvent) => void);
  }

  enableTauriBridge(options?: Partial<TauriBridgeOptions>): void {
    this.eventBus.enableTauriBridge({ enabled: true, ...options });
  }

  disableTauriBridge(): void {
    this.eventBus.disableTauriBridge();
  }

  // --- Theme ---

  setTheme(themeOrName: ThemeName | Theme): void {
    this.themeManager.setTheme(themeOrName);
    this.syncRenderContext();
    this.container.style.backgroundColor = this.themeManager.getTheme().background;
    this.engine.requestRender();
    this.eventBus.emit('themeChange', { theme: themeOrName });
  }

  getTheme(): Theme {
    return this.themeManager.getTheme();
  }

  // --- Watermark ---

  setWatermark(text: string, opts?: { color?: string; fontSize?: number }): void {
    this.watermark.setConfig({ text, ...opts });
    this.engine.requestRender(LayerType.Background);
  }

  // --- Auto Scale ---

  setAutoScale(enabled: boolean): void {
    this.options.autoScale = enabled;
    // Unlike the drag-to-scale/vertical-pan gesture freeze, an explicit call
    // here is a deliberate preference — it should survive the next setData()
    // the same way a constructor-time `autoScale: false` would.
    this.defaultAutoScale = enabled;
    this.updateViewportAndRender();
  }

  isAutoScale(): boolean {
    return this.options.autoScale !== false;
  }

  // --- Crosshair ---

  setCrosshairMode(mode: 'normal' | 'magnet' | 'hidden'): void {
    this.crosshairHandler.setMode(mode);
    this.engine.requestRender(LayerType.Hover);
  }

  getCrosshairMode(): string {
    return this.crosshairHandler.getMode();
  }

  setCrosshairPosition(point: { x: number; y: number } | null): void {
    if (point) {
      this.crosshairHandler.onPointerMove(point);
    } else {
      this.crosshairHandler.onPointerLeave();
    }
    this.engine.requestRender(LayerType.Hover);
  }

  /**
   * Show a time-only crosshair — a vertical line and time label on the bar
   * that contains `time` — as when mirroring another chart; null clears it.
   * Fires no crosshair events, so linked charts don't echo each other.
   */
  setCrosshairTime(time: number | null): void {
    const data = this.getDisplayData();
    const slot = time === null || data.length === 0 ? null : Math.floor(timestampToBarIndex(time, data));
    if (slot === this.crosshairHandler.getSyncedSlot()) return;
    this.crosshairHandler.setSyncedSlot(slot);
    this.engine.requestRender(LayerType.Hover);
  }

  getData(): DataSeries {
    return this.dataManager.getData();
  }

  // --- Grid ---

  setGridVisible(visible: boolean): void {
    this.gridRenderer.setVisible(visible);
    this.engine.requestRender(LayerType.Background);
  }

  isGridVisible(): boolean {
    return this.gridRenderer.isVisible();
  }

  // --- Volume ---

  setVolumeVisible(visible: boolean): void {
    this.volumeRenderer.setVisible(visible);
    this.engine.requestRender(LayerType.Main);
  }

  // --- Volume Profile ---

  setVolumeProfileVisible(visible: boolean): void {
    this.volumeProfile.setVisible(visible);
    this.engine.requestRender(LayerType.Main);
  }

  isVolumeProfileVisible(): boolean {
    return this.volumeProfile.isVisible();
  }

  setVolumeProfileConfig(config: { buckets?: number; widthRatio?: number; opacity?: number; highlightPoC?: boolean }): void {
    if (config.buckets !== undefined) this.volumeProfile.setBuckets(config.buckets);
    if (config.widthRatio !== undefined) this.volumeProfile.setWidthRatio(config.widthRatio);
    if (config.opacity !== undefined) this.volumeProfile.setOpacity(config.opacity);
    if (config.highlightPoC !== undefined) this.volumeProfile.setHighlightPoC(config.highlightPoC);
    this.engine.requestRender(LayerType.Main);
  }

  // --- Market Profile (TPO) ---

  setMarketProfileVisible(visible: boolean): void {
    this.marketProfile.setVisible(visible);
    this.engine.requestRender(LayerType.Main);
  }

  isMarketProfileVisible(): boolean {
    return this.marketProfile.isVisible();
  }

  setMarketProfileConfig(config: { buckets?: number; widthRatio?: number; opacity?: number; valueAreaPct?: number; highlightPoC?: boolean; showStats?: boolean; splitBySession?: boolean; letters?: boolean }): void {
    if (config.buckets !== undefined) this.marketProfile.setBuckets(config.buckets);
    if (config.widthRatio !== undefined) this.marketProfile.setWidthRatio(config.widthRatio);
    if (config.opacity !== undefined) this.marketProfile.setOpacity(config.opacity);
    if (config.valueAreaPct !== undefined) this.marketProfile.setValueAreaPct(config.valueAreaPct);
    if (config.highlightPoC !== undefined) this.marketProfile.setHighlightPoC(config.highlightPoC);
    if (config.showStats !== undefined) this.marketProfile.setShowStats(config.showStats);
    if (config.splitBySession !== undefined) this.marketProfile.setSplitBySession(config.splitBySession);
    if (config.letters !== undefined) this.marketProfile.setLetters(config.letters);
    this.engine.requestRender(LayerType.Main);
  }

  /** POC / VAH / VAL of the currently rendered Market Profile, or null. */
  getMarketProfileStats(): import('@tradecanvas/core').MarketProfileStats | null {
    return this.marketProfile.getStats();
  }

  // --- Liquidity heatmap ---

  setDepthHeatmapVisible(visible: boolean): void {
    this.depthHeatmap.setVisible(visible);
    this.engine.requestRender(LayerType.Main);
  }

  isDepthHeatmapVisible(): boolean {
    return this.depthHeatmap.isVisible();
  }

  setDepthHeatmapConfig(config: { opacity?: number; capacity?: number }): void {
    if (config.opacity !== undefined) this.depthHeatmap.setOpacity(config.opacity);
    if (config.capacity !== undefined) this.depthHeatmap.setCapacity(config.capacity);
    this.engine.requestRender(LayerType.Main);
  }

  /**
   * Record an order-book snapshot for the liquidity heatmap, stamped at the
   * latest bar's time. Call alongside `setDepthData` on each book update.
   */
  pushDepthSnapshot(depth: import('@tradecanvas/commons').DepthData): void {
    const data = this.dataManager.getData();
    if (data.length === 0) return;
    this.depthHeatmap.push(data[data.length - 1].time, depth);
    if (this.depthHeatmap.isVisible()) this.engine.requestRender(LayerType.Main);
  }

  clearDepthHeatmap(): void {
    this.depthHeatmap.clear();
    this.engine.requestRender(LayerType.Main);
  }

  // --- Prior-period levels (PDH / PDL / PDC) ---

  setPeriodLevelsVisible(visible: boolean): void {
    this.periodLevels.setVisible(visible);
    this.engine.requestRender(LayerType.Main);
  }

  isPeriodLevelsVisible(): boolean {
    return this.periodLevels.isVisible();
  }

  setPeriodLevelsPeriod(period: import('@tradecanvas/core').LevelPeriod): void {
    this.periodLevels.setPeriod(period);
    this.engine.requestRender(LayerType.Main);
  }

  /**
   * Set the timezone for time-axis labels and the crosshair time pill.
   * `null` = browser-local; a number = fixed UTC offset in minutes (e.g. -300
   * for EST, 330 for IST).
   */
  setTimezoneOffset(minutes: number | null): void {
    this.displayTzOffset = minutes;
    this.timeAxis.setTimezoneOffset(minutes);
    this.crosshairHandler.setTimezoneOffset(minutes);
    this.crosshairTooltip.setTimezoneOffset(minutes);
    this.engine.requestRender(LayerType.UI);
  }

  // --- Pivot / swing markers ---

  setPivotMarkersVisible(visible: boolean): void {
    this.pivotMarkers.setVisible(visible);
    this.engine.requestRender(LayerType.Overlay);
  }

  isPivotMarkersVisible(): boolean {
    return this.pivotMarkers.isVisible();
  }

  setPivotMarkersConfig(config: { left?: number; right?: number; showLabels?: boolean; structureLabels?: boolean }): void {
    if (config.left !== undefined || config.right !== undefined) {
      this.pivotMarkers.setStrength(config.left ?? 5, config.right ?? config.left ?? 5);
    }
    if (config.showLabels !== undefined) this.pivotMarkers.setShowLabels(config.showLabels);
    if (config.structureLabels !== undefined) this.pivotMarkers.setStructureLabels(config.structureLabels);
    this.engine.requestRender(LayerType.Overlay);
  }

  // --- Session (RTH) shading ---

  setSessionShadingVisible(visible: boolean): void {
    this.sessionShading.setVisible(visible);
    this.engine.requestRender(LayerType.Background);
  }

  isSessionShadingVisible(): boolean {
    return this.sessionShading.isVisible();
  }

  /**
   * Configure the regular session window (minutes-of-day + tz offset). Pass
   * `windows` for a split session — a market with a midday recess (e.g. SET's
   * 10:00–12:30 and 14:30–16:30) — so the lunch break dims like pre-/post-market.
   */
  setSessionShadingConfig(config: Partial<import('@tradecanvas/core').SessionHoursConfig>): void {
    this.sessionShading.setConfig(config);
    this.engine.requestRender(LayerType.Background);
  }

  // --- Tooltip ---

  setTooltipVisible(visible: boolean): void {
    if (!visible) this.crosshairTooltip.hide();
  }

  // --- Legend ---

  setLegend(config: Partial<import('@tradecanvas/core').LegendConfig>): void {
    this.chartLegend.setConfig(config);
    this.engine.requestRender(LayerType.Hover);
  }

  setSymbolName(symbol: string): void {
    this.chartLegend.setSymbol(symbol);
    this.engine.requestRender(LayerType.Hover);
  }

  /**
   * Set a status text displayed in the chart legend area (e.g., "LIVE . 8ms").
   * Pass null to clear.
   */
  setStatusText(text: string | null): void {
    this.chartLegend.setStatusText(text);
    this.engine.requestRender(LayerType.Hover);
  }

  // --- Screenshot ---

  screenshot(filename?: string): void {
    if (!this.features.screenshot) return;
    Screenshot.download(this.container, filename, this.themeManager.getTheme().background);
  }

  /** Copy the chart image to the clipboard. Returns false if unsupported/blocked. */
  async copyScreenshot(): Promise<boolean> {
    if (!this.features.screenshot) return false;
    try {
      const blob = await Screenshot.toBlob(this.container, this.themeManager.getTheme().background);
      const ClipboardItemCtor = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (!blob || !navigator.clipboard?.write || !ClipboardItemCtor) return false;
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      return true;
    } catch {
      return false;
    }
  }

  screenshotDataURL(): string | null {
    if (!this.features.screenshot) return null;
    return Screenshot.toDataURL(this.container, this.themeManager.getTheme().background);
  }

  async screenshotBlob(): Promise<Blob | null> {
    if (!this.features.screenshot) return null;
    return Screenshot.toBlob(this.container, this.themeManager.getTheme().background);
  }

  // --- Alerts ---

  addAlert(
    price: number,
    condition: import('@tradecanvas/core').AlertCondition = 'crossing',
    message?: string,
    channel = 'price',
    label?: string,
  ): string | null {
    if (!this.features.alerts) return null;
    const id = this.alertManager.addAlert(price, condition, message, false, channel, label);
    this.scheduleAutoSave();
    return id;
  }

  removeAlert(id: string): void {
    this.alertManager.removeAlert(id);
    this.scheduleAutoSave();
  }

  getAlerts(): import('@tradecanvas/core').PriceAlert[] {
    return this.alertManager.getAlerts();
  }

  clearAlerts(): void {
    this.alertManager.clearAlerts();
    this.scheduleAutoSave();
  }

  saveAlerts(key: string): void {
    this.alertManager.saveToStorage(key);
  }

  loadAlerts(key: string): void {
    this.alertManager.loadFromStorage(key);
    this.engine.requestRender(LayerType.Overlay);
  }

  // --- Signal Markers ---

  addSignalMarker(marker: Omit<import('@tradecanvas/commons').SignalMarker, 'id'> & { id?: string }): string {
    return this.signalMarkerManager.addMarker(marker);
  }

  removeSignalMarker(id: string): void {
    this.signalMarkerManager.removeMarker(id);
  }

  getSignalMarkers(): import('@tradecanvas/commons').SignalMarker[] {
    return this.signalMarkerManager.getMarkers();
  }

  setSignalMarkers(markers: import('@tradecanvas/commons').SignalMarker[]): void {
    this.signalMarkerManager.setMarkers(markers);
  }

  clearSignalMarkers(): void {
    this.signalMarkerManager.clearMarkers();
  }

  setSignalMarkerStyle(style: Partial<import('@tradecanvas/commons').SignalMarkerStyle>): void {
    this.signalMarkerManager.setStyle(style);
  }

  // --- Trade Zones ---

  addTradeZone(zone: Omit<import('@tradecanvas/commons').TradeZone, 'id'> & { id?: string }): string {
    return this.tradeZoneManager.addZone(zone);
  }

  updateTradeZone(id: string, updates: Partial<Omit<import('@tradecanvas/commons').TradeZone, 'id'>>): void {
    this.tradeZoneManager.updateZone(id, updates);
  }

  removeTradeZone(id: string): void {
    this.tradeZoneManager.removeZone(id);
  }

  getTradeZones(): import('@tradecanvas/commons').TradeZone[] {
    return this.tradeZoneManager.getZones();
  }

  setTradeZones(zones: import('@tradecanvas/commons').TradeZone[]): void {
    this.tradeZoneManager.setZones(zones);
  }

  clearTradeZones(): void {
    this.tradeZoneManager.clearZones();
  }

  setTradeZoneStyle(style: Partial<import('@tradecanvas/commons').TradeZoneStyle>): void {
    this.tradeZoneManager.setStyle(style);
  }

  // --- Replay ---

  /**
   * Replay the series bar by bar. While it runs the chart is detached from
   * live data: stream ticks and `appendBar`/`updateLastBar` calls are kept
   * aside (orders still track the live price), the price line shows the
   * replayed close, and auto-scale refits every step. `replayStop()` brings
   * back the live series, including everything that arrived meanwhile.
   */
  replayStart(config?: Partial<import('@tradecanvas/core').ReplayConfig>): void {
    if (!this.features.replay) return;
    if (!this.replaySession) {
      if (this.dataManager.getLength() === 0) return; // nothing to replay
      const live = new DataManager();
      live.setData(this.dataManager.getData());
      this.replaySession = { live, price: null };
    }
    // Replay the live series as it stands now (a restart includes bars that
    // arrived during the previous run).
    const data = this.replaySession.live.getData().slice();
    // A replay fits each step; a price-axis drag from before shouldn't pin it.
    this.options.autoScale = true;
    this.replayManager.load(data);
    let loaded = -1; // bars of `data` currently in the DataManager, as of the last step
    // Each replayStart used to stack another 'bar' listener, so a restarted
    // replay ran every step once per previous start.
    this.replayBarUnsub?.();
    this.replayBarUnsub = this.replayManager.on('bar', ({ bar: _bar, index }) => {
      const nextLen = index + 1;
      const forward = loaded > 0 && nextLen > loaded && this.dataManager.getLength() === loaded;
      // Like live data: a replay step follows the newest bar while the view
      // rests at the end, and leaves it alone while the user looks at history.
      // The first step and any seek (back or forward) show the replay
      // position. (Read before the new bars land: `isAtEnd` compares against
      // the old length.)
      const step = forward && !this.replaySeeking;
      const follow = !step || (this.autoScrollOnNewBar && this.viewport.isAtEnd());
      if (forward) {
        // Forward step: append just the newly revealed bars and update
        // indicators from there — not re-copy, re-sanitize and recompute the
        // whole prefix on every tick of the replay clock.
        for (let j = loaded; j < nextLen; j++) this.dataManager.appendBar(data[j]);
        this.recalcIndicatorsFrom(this.dataManager.getData(), loaded);
      } else {
        // First step, or a seek backwards: reload the prefix.
        this.dataManager.setData(data.slice(0, nextLen));
        this.recalcIndicators(this.dataManager.getData());
      }
      loaded = nextLen;
      // The price line follows the replay, not the live market.
      this.currentPriceLine.setPrice(data[index].close, index > 0 ? data[index - 1].close : undefined);
      this.crosshairHandler.setData(this.dataManager.getData());
      // The display cache isn't keyed to the data array — without this the
      // chart kept drawing the pre-replay series.
      this.displayDataCache = null;
      this.updateViewportAndRender(follow);
    });
    this.replayManager.play(config);
  }

  replayPause(): void { this.replayManager.pause(); }
  replayResume(): void { this.replayManager.resume(); }
  /** End the replay and return to the live series (with updates that arrived meanwhile). */
  replayStop(): void {
    const session = this.replaySession;
    this.endReplaySession();
    if (!session) return;
    this.setData(session.live.getData());
    if (session.price) this.currentPriceLine.setPrice(session.price.price, session.price.previousClose);
  }

  /** Whether a replay session is open (playing or paused). */
  isReplayActive(): boolean {
    return this.replaySession !== null;
  }

  /** The plot area in CSS pixels, relative to the chart container (no axes). */
  getPlotRect(): { x: number; y: number; width: number; height: number } {
    const { x, y, width, height } = this.viewport.getState().chartRect;
    return { x, y, width, height };
  }

  /** Stop the replay clock and drop the session without touching the data. */
  private endReplaySession(): void {
    if (!this.replaySession) return;
    this.replaySession = null;
    this.replayBarUnsub?.();
    this.replayBarUnsub = null;
    this.replayManager.stop();
  }

  replaySeek(index: number): void {
    this.replaySeeking = true;
    try {
      this.replayManager.seekTo(index);
    } finally {
      this.replaySeeking = false;
    }
  }
  setReplaySpeed(speed: number): void { this.replayManager.setSpeed(speed); }
  getReplayState(): 'playing' | 'paused' | 'stopped' { return this.replayManager.getState(); }
  getReplayProgress(): { current: number; total: number; percent: number } { return this.replayManager.getProgress(); }

  // --- Save / Load ---

  /** Everything `loadState` restores: chart type, theme, drawings, indicators, alerts. */
  private captureSnapshot(): import('@tradecanvas/core').ChartSnapshot {
    const panels = this.layoutManager.getPanels();
    return ChartStateManager.capture(
      {
        getDrawings: () => this.getDrawings(),
        getTheme: () => this.getTheme(),
        getAlerts: () => this.getAlerts(),
        getIndicators: () => [
          ...this.indicatorEngine.getActiveIndicators().map((ind) => ({
            id: ind.id,
            instanceId: ind.instanceId,
            params: ind.params,
            position: panels.find((p) => p.id === ind.instanceId)?.position,
            style: this.indicatorEngine.getIndicatorStyle(ind.instanceId) ?? undefined,
            visible: ind.visible,
            levels: this.indicatorEngine.getIndicatorConfig(ind.instanceId)?.levels?.slice(),
            pane: ind.pane,
          })),
          ...this.unrestoredIndicators,
        ],
      },
      { chartType: this.options.chartType, symbol: this.currentSymbol || undefined },
    );
  }

  saveState(key?: string): string | null {
    if (!this.features.saveLoad) return null;
    const snapshot = this.captureSnapshot();
    const json = ChartStateManager.serialize(snapshot);
    if (key) ChartStateManager.saveToStorage(key, snapshot);
    return json;
  }

  loadState(json: string): void {
    if (!this.features.saveLoad) return;
    const snapshot = ChartStateManager.deserialize(json);
    if (snapshot.chartType) this.setChartType(snapshot.chartType);
    if (snapshot.drawings) this.setDrawings(snapshot.drawings);
    if (snapshot.theme) this.setTheme(snapshot.theme as any);

    // Indicators get new instance ids: remember old → new for alert channels.
    // Version-1 saves never captured indicators, so they leave them alone.
    const instanceIds = new Map<string, string>();
    if (snapshot.version >= 2 && this.features.indicators) {
      this.unrestoredIndicators = [];
      const known = new Set(this.indicatorEngine.getAvailableIndicators().map((d) => d.id));
      for (const active of this.indicatorEngine.getActiveIndicators()) this.removeIndicator(active.instanceId);
      // Lines read from other indicators and shared panes refer to old ids: follow them.
      const renamed = (params: Record<string, unknown>): Record<string, number | string | boolean> => {
        const out = { ...params } as Record<string, number | string | boolean>;
        for (const [name, value] of Object.entries(out)) {
          const line = parseIndicatorSource(value);
          const to = line && instanceIds.get(line.instanceId);
          if (to) out[name] = indicatorSource(to, line.key);
        }
        return out;
      };
      const restored: [import('@tradecanvas/core').SnapshotIndicator, string][] = [];
      for (const ind of snapshot.indicators) {
        const position = (['top', 'bottom', 'left', 'right'] as const).find((p) => p === ind.position) ?? 'bottom';
        let instanceId: string | null = null;
        try {
          if (!known.has(ind.id)) throw new Error('no such indicator is registered');
          const pane = ind.pane ? instanceIds.get(ind.pane) : undefined;
          instanceId = this.addIndicator(ind.id, renamed(ind.params), position, pane ? { pane } : {});
        } catch (err) {
          console.warn(`Layout indicator "${ind.id}" kept but not shown:`, err);
        }
        if (!instanceId) {
          this.unrestoredIndicators.push(ind);
          continue;
        }
        instanceIds.set(ind.instanceId, instanceId);
        restored.push([ind, instanceId]);
        if (ind.style) this.updateIndicatorStyle(instanceId, ind.style);
        if (ind.visible === false) this.setIndicatorVisible(instanceId, false);
        if (ind.levels) this.setIndicatorLevels(instanceId, ind.levels);
      }
      // A line read from an indicator restored after its reader: point it there now.
      for (const [ind, instanceId] of restored) {
        const changed: Record<string, number | string | boolean> = {};
        for (const [name, value] of Object.entries(renamed(ind.params))) {
          if (value !== ind.params[name] && this.indicatorEngine.getIndicatorConfig(instanceId)?.params[name] !== value) changed[name] = value;
        }
        if (Object.keys(changed).length) this.updateIndicator(instanceId, changed);
      }
    }

    if (snapshot.alerts && this.features.alerts) {
      this.alertManager.clearAlerts();
      for (const a of snapshot.alerts) {
        // A one-shot alert that already fired stays fired (as AlertManager's own storage does).
        if (a.triggered && !a.repeating) continue;
        // `<instanceId>:<key>` channels follow their indicator to its new id.
        const sep = a.channel.indexOf(':');
        const renamed = sep > 0 ? instanceIds.get(a.channel.slice(0, sep)) : undefined;
        const channel = renamed ? renamed + a.channel.slice(sep) : a.channel;
        this.alertManager.addAlert(a.price, a.condition, a.message, a.repeating, channel, a.label);
      }
    }
    this.scheduleAutoSave();
  }

  loadStateFromStorage(key: string): boolean {
    if (!this.features.saveLoad) return false;
    const snapshot = ChartStateManager.loadFromStorage(key);
    if (!snapshot) return false;
    this.loadState(ChartStateManager.serialize(snapshot));
    return true;
  }

  downloadState(filename?: string): void {
    if (!this.features.saveLoad) return;
    ChartStateManager.downloadFile(this.captureSnapshot(), filename);
  }

  async loadStateFromFile(): Promise<void> {
    if (!this.features.saveLoad) return;
    const snapshot = await ChartStateManager.loadFromFile();
    this.loadState(ChartStateManager.serialize(snapshot));
  }

  // --- Locale ---

  setLocale(locale: Locale): void {
    setGlobalLocale(locale);
    this.engine.requestRender();
  }

  /**
   * Update the BCP 47 locale used for number formatting
   * (e.g. price axis labels, crosshair value badges).
   * Defaults to 'en-US'. Example values: 'de-DE', 'vi-VN', 'fr-FR'.
   */
  setNumberLocale(locale: string): void {
    this.numberLocale = locale;
    this.priceAxis.setLocale(locale);
    this.crosshairHandler.setLocale(locale);
    this.chartLegend.setLocale(locale);
    this.crosshairTooltip.setLocale(locale);
    this.sessionBreaks.setLocale(locale);
    this.currentPriceLine.setLocale(locale);
    // Separators change label widths; the axis may need to refit.
    this.updateViewportAndRender();
  }

  getNumberLocale(): string {
    return this.numberLocale;
  }

  // --- Market ---

  setMarket(config: MarketConfig): void {
    this.marketConfig = config;

    // Apply market color scheme to theme
    if (config.colorScheme) {
      const base = this.themeManager.getTheme();
      const marketTheme: Theme = {
        ...base,
        candleUp: config.colorScheme.up,
        candleDown: config.colorScheme.down,
        candleUpWick: config.colorScheme.up,
        candleDownWick: config.colorScheme.down,
        volumeUp: config.colorScheme.up.replace(')', ', 0.3)').replace('rgb(', 'rgba(') || `${config.colorScheme.up}4D`,
        volumeDown: config.colorScheme.down.replace(')', ', 0.3)').replace('rgb(', 'rgba(') || `${config.colorScheme.down}4D`,
      };
      this.themeManager.setTheme(marketTheme);
    }

    // Apply price precision to trading, alerts, and price line
    if (config.pricePrecision !== undefined) {
      this.marketPricePrecision = config.pricePrecision;
      this.tradingManager.setConfig({ pricePrecision: config.pricePrecision });
      this.alertManager.setPricePrecision(config.pricePrecision);
      this.streamManager?.priceLine.setPricePrecision(config.pricePrecision);
      this.currentPriceLine.setPricePrecision(config.pricePrecision);
      this.crosshairHandler.setPricePrecision(config.pricePrecision);
      this.chartLegend.setPricePrecision(config.pricePrecision);
      this.crosshairTooltip.setPricePrecision(config.pricePrecision);
    }

    // Longer price labels may need a wider axis.
    this.updateViewportAndRender();
  }

  getMarket(): MarketConfig | null {
    return this.marketConfig;
  }

  setPriceLimits(referencePrice: number): void {
    if (!this.marketConfig) return;
    const limits = computePriceLimits(referencePrice, this.marketConfig);
    if (limits) {
      this.marketConfig.priceLimits = {
        ...this.marketConfig.priceLimits!,
        referencePrice,
      };
    }
    this.engine.requestRender();
  }

  // --- Features ---

  /** Get the resolved feature configuration */
  getFeatures(): Readonly<Required<FeaturesConfig>> {
    return this.features;
  }

  /** Update feature flags at runtime. Only provided keys are changed. */
  setFeatures(patch: Partial<FeaturesConfig>): void {
    Object.assign(this.features, patch);

    // Apply immediate side-effects
    if (patch.crosshair === false || patch.crosshairTooltip === false) {
      this.crosshairTooltip.hide();
    }
    if (patch.grid !== undefined) {
      this.engine.requestRender(LayerType.Background);
    }
    if (patch.volume !== undefined) {
      this.volumeRenderer.setVisible(patch.volume);
      this.engine.requestRender(LayerType.Main);
    }
    if (patch.drawings === false) {
      this.drawingManager.setActiveTool(null);
    }
    if (patch.trading === false) {
      this.tradingManager.setOrders([]);
      this.tradingManager.setPositions([]);
    }
    if (patch.keyboard !== undefined) {
      this.keyboardHandler?.setEnabled(patch.keyboard);
    }

    this.engine.requestRender();
  }

  // --- Lifecycle ---

  resize(): void {
    const size = this.engine.dprManager.readContainerSize();
    if (size.width <= 0 || size.height <= 0) return;
    this.containerSizeCache = size;
    this.containerSizeCacheTime = Date.now();
    // Resize canvas layers immediately (don't wait for DPRManager's debounced callback)
    const dpr = this.engine.dprManager.getDpr();
    this.engine.layerManager.resize(size, dpr);
    // Check if viewport was at the end before resize
    const wasAtEnd = this.viewport.isAtEnd();
    this.viewport.resize(size.width, size.height);
    this.layoutManager.resize(size.width, size.height);
    this.updateViewportAndRender(wasAtEnd);
    this.eventBus.emit('resize', size);
  }

  destroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.disableAutoSave();
    this.disconnectStream();
    this.disconnectExecution();
    if (this.onWindowKeyDown) {
      window.removeEventListener('keydown', this.onWindowKeyDown);
      this.onWindowKeyDown = null;
    }
    this.keyboardHandler = null;
    this.interactionManager.detach();
    this.tradingManager.destroy();
    this.animator.dispose();
    this.crosshairTooltip.destroy();
    this.pinnedTooltip.destroy();
    this.replayManager.dispose();
    this.undoRedoManager.clear();
    this.engine.destroy();
    this.eventBus.destroy();
    this.container.innerHTML = '';
  }

  // --- Internal ---

  private createChartRenderer(type: ChartType | string): ChartRendererInterface {
    return resolveRenderer(type, (t) => this.pluginManager.getChartType(t));
  }

  /** Cached display data. Invalidated when raw data or chart type changes. */
  private getDisplayData(): DataSeries {
    if (this.displayDataCache) return this.displayDataCache;
    const raw = this.dataManager.getData();
    if (raw.length === 0) return raw;
    const result = resolveDisplayData(this.options.chartType, raw, (t) => this.pluginManager.getChartType(t));
    this.displayDataCache = result;
    return result;
  }

  /** Recompute indicators from bar `from` on, and say so (live ticks, closes, replay steps). */
  private recalcIndicatorsFrom(data: DataSeries, from: number): void {
    this.indicatorEngine.recalculateFrom(data, from);
    this.announceIndicatorUpdate(from);
  }

  private recalcIndicators(data: DataSeries): void {
    this.indicatorEngine.recalculateAll(data);
    this.announceIndicatorUpdate(0);
  }

  /**
   * Emit `indicatorUpdate` once per task, from the earliest changed bar, after
   * the update that caused it has finished and scheduled its redraw: a
   * listener can neither interrupt a live tick nor read the layout before
   * the chart has updated it.
   */
  private announceIndicatorUpdate(from: number): void {
    if (this.indicatorUpdateFrom !== null) {
      this.indicatorUpdateFrom = Math.min(this.indicatorUpdateFrom, from);
      return;
    }
    this.indicatorUpdateFrom = from;
    queueMicrotask(() => {
      const first = this.indicatorUpdateFrom;
      this.indicatorUpdateFrom = null;
      if (first !== null) this.eventBus.emit('indicatorUpdate', { from: first });
    });
  }

  /** Lightweight render for streaming updates. No layout resolve, no indicator recalc. */
  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.applyDataToViewport();
      if (this.fitPriceAxisWidth()) this.applyDataToViewport();
      this.syncRenderContext();
      this.engine.requestRender();
      this.emitViewportEvents();
    });
  }

  /**
   * Push the display data into the viewport and apply auto-scale. The single
   * place auto-scale is computed — both the live-tick path (`scheduleRender`)
   * and the pan/zoom/data path (`updateViewportAndRender`) go through it.
   * They used to diverge: ticks fit candles only while pan/zoom also fit
   * overlay indicators (Bollinger, Keltner, Ichimoku…), so the price scale
   * jumped on every tick and jumped back on every pan frame.
   */
  private applyDataToViewport(scrollToEnd = false): DataSeries {
    const displayData = this.getDisplayData();
    const autoScale = this.options.autoScale !== false;

    // updateData first so dataLength is current for scrollToEnd — but only
    // fit the price range once the FINAL visible window is known. Fitting
    // before scrollToEnd measured the old window (e.g. deep history) and left
    // every bar of a freshly loaded series off-screen.
    this.viewport.updateData(displayData, autoScale && !scrollToEnd);
    if (scrollToEnd) {
      this.viewport.scrollToEnd();
      if (autoScale) this.viewport.updateData(displayData, true);
    }

    const vs = this.viewport.getState();

    // Baseline for percentage / indexed-to-100 axis labels: the close of the
    // first visible bar. Ignored by other scale modes.
    if (displayData.length > 0) {
      const baseIdx = Math.max(0, Math.min(vs.visibleRange.from, displayData.length - 1));
      this.viewport.setScaleBaseline(displayData[baseIdx]?.close);
    }

    // Expand the fitted range to include overlay indicator values (BB, Ichimoku, etc.)
    if (autoScale) {
      const overlayRange = this.indicatorEngine.getOverlayPriceRange(
        vs.visibleRange.from,
        Math.min(vs.visibleRange.to, displayData.length - 1),
      );
      if (overlayRange) {
        const current = vs.priceRange;
        const expandedMin = Math.min(current.min, overlayRange.min);
        const expandedMax = Math.max(current.max, overlayRange.max);
        if (expandedMin < current.min || expandedMax > current.max) {
          const range = expandedMax - expandedMin || 1;
          this.viewport.setPriceRange(
            expandedMin - range * 0.02,
            expandedMax + range * 0.02,
          );
        }
      }
    }
    return displayData;
  }

  /** Full update: resolve layout, update viewport, sync context, request render. */
  private updateViewportAndRender(scrollToEnd = false): void {
    // Invalidate layout cache
    this.resolvedLayoutCache = null;
    this.panelInfoCache = null;

    const resolved = this.getResolvedLayout();
    this.viewport.setChartRect(resolved.mainChartRect);

    this.applyDataToViewport(scrollToEnd);
    // A wider/narrower axis changes the plot width, so fit the data again.
    if (this.fitPriceAxisWidth()) this.applyDataToViewport(scrollToEnd);

    this.syncRenderContext();
    this.engine.requestRender();

    this.emitViewportEvents();
  }

  /**
   * Size the price axis to its widest label (tick labels, last-price tag,
   * crosshair pill), as an auto-width scale — so a sub-cent
   * price isn't clipped. Returns true when the width, and so the layout,
   * changed.
   */
  private fitPriceAxisWidth(): boolean {
    if (!this.features.priceAxis) return false;
    const { priceRange } = this.viewport.getState();
    const theme = this.themeManager.getTheme();
    const required = requiredPriceAxisWidth({
      min: priceRange.min,
      max: priceRange.max,
      lastPrice: this.currentPriceLine.getPrice(),
      tagPrecision: this.marketConfig?.pricePrecision ?? null,
      locale: this.numberLocale,
      fontFamily: theme.font.family,
      fontSizeSmall: theme.font.sizeSmall,
      measure: (text, font) => this.measureText(text, font),
    });
    const next = nextPriceAxisWidth(this.priceAxisWidth, required);
    if (next === this.priceAxisWidth) return false;

    this.priceAxisWidth = next;
    this.layoutManager.setPriceAxisWidth(next);
    this.viewport.setPriceAxisWidth(next);
    this.resolvedLayoutCache = null;
    this.panelInfoCache = null;
    this.viewport.setChartRect(this.getResolvedLayout().mainChartRect);
    return true;
  }

  private measureText(text: string, font: string): number {
    if (this.measureCtx === undefined) {
      this.measureCtx = typeof document !== 'undefined'
        ? document.createElement('canvas').getContext('2d')
        : null;
    }
    const ctx = this.measureCtx;
    if (!ctx) return text.length * 7; // no canvas (SSR/tests): a generous estimate
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  /**
   * Fire the public viewport events (`visibleRangeChange`, `priceRangeChange`,
   * `zoomChange`) whenever the corresponding piece of viewport state changed
   * since the last render. Called at the end of every updateViewportAndRender,
   * so panning, zooming, resizing, and data updates all surface to consumers.
   */
  private emitViewportEvents(): void {
    const vs = this.viewport.getState();

    const from = Math.max(0, Math.floor(vs.visibleRange.from));
    const to = Math.max(from, Math.ceil(vs.visibleRange.to));
    if (
      !this.lastEmittedRange ||
      this.lastEmittedRange.from !== from ||
      this.lastEmittedRange.to !== to
    ) {
      this.lastEmittedRange = { from, to };
      this.eventBus.emit('visibleRangeChange', { from, to });
    }

    const { min, max } = vs.priceRange;
    if (
      !this.lastEmittedPriceRange ||
      this.lastEmittedPriceRange.min !== min ||
      this.lastEmittedPriceRange.max !== max
    ) {
      this.lastEmittedPriceRange = { min, max };
      this.eventBus.emit('priceRangeChange', { min, max });
    }

    // `barWidth` here is pixels-per-bar — the value Viewport.zoom() mutates.
    if (this.lastEmittedBarWidth !== vs.barWidth) {
      this.lastEmittedBarWidth = vs.barWidth;
      this.eventBus.emit('zoomChange', { barWidth: vs.barWidth });
    }
  }

  private getResolvedLayout() {
    if (!this.resolvedLayoutCache) {
      this.resolvedLayoutCache = this.layoutManager.resolve();
      this.syncCrosshairBounds(this.resolvedLayoutCache);
    }
    return this.resolvedLayoutCache;
  }

  /** The hovered bar is reported over the price pane and the panes above and below it. */
  private syncCrosshairBounds(layout: import('@tradecanvas/commons').ResolvedLayout): void {
    const main = layout.mainChartRect;
    let top = main.y;
    let bottom = main.y + main.height;
    for (const panel of layout.panels) {
      if (panel.config.position !== 'top' && panel.config.position !== 'bottom') continue;
      top = Math.min(top, panel.rect.y);
      bottom = Math.max(bottom, panel.rect.y + panel.rect.height);
    }
    this.crosshairHandler.setReportBounds({ top, bottom });
  }

  /** Cache container size for 500ms to avoid layout thrashing on rapid calls */
  private cachedContainerSize(): { width: number; height: number } {
    const now = Date.now();
    if (!this.containerSizeCache || now - this.containerSizeCacheTime > 500) {
      this.containerSizeCache = this.engine.dprManager.getContainerSize();
      this.containerSizeCacheTime = now;
    }
    return this.containerSizeCache;
  }

  private buildPanelRenderInfos(): import('@tradecanvas/core').PanelRenderInfo[] {
    if (this.panelInfoCache) return this.panelInfoCache;

    const resolved = this.getResolvedLayout();
    const mainVP = this.viewport.getState();

    const { from, to } = mainVP.visibleRange;
    const panels = resolved.panels.map((panel) => {
      // The pane's one value scale: plots, axis, crosshair and levels all use it.
      const priceRange = this.indicatorEngine.getPaneValueRange(panel.config.id, from, to) ?? { ...DEFAULT_PANE_RANGE };

      // Inset the indicator drawing area below the panel header (title + divider)
      const PANEL_HEADER_HEIGHT = 20;
      const insetRect = {
        x: panel.rect.x,
        y: panel.rect.y + PANEL_HEADER_HEIGHT,
        width: panel.rect.width,
        height: Math.max(0, panel.rect.height - PANEL_HEADER_HEIGHT),
      };

      return {
        instanceId: panel.config.id,
        members: this.indicatorEngine.getPaneMembers(panel.config.id),
        rect: panel.rect,
        viewport: {
          ...mainVP,
          chartRect: insetRect,
          priceRange,
          // Panes keep their own upright, linear value scale; log and
          // inverted belong to the price pane only.
          logScale: false,
          scaleMode: 'regular' as const,
          invertScale: false,
        },
      };
    });

    this.panelInfoCache = panels;
    return panels;
  }

  private syncRenderContext(): void {
    // Keep the pinned tooltip anchored to its bar through pans / zooms.
    if (this.pinnedTooltip.isPinned()) {
      this.pinnedTooltip.reposition(
        this.viewport.getState(),
        null,
        null,
        this.themeManager.getTheme(),
      );
    }

    const resolved = this.getResolvedLayout();
    const panels = this.features.indicators ? this.buildPanelRenderInfos() : [];

    // Compute where the time axis should render: below main chart + all bottom panels
    const bottomPanelHeight = resolved.panels
      .filter(p => p.config.position === 'bottom')
      .reduce((sum, p) => sum + p.rect.height, 0);
    const timeAxisY = resolved.mainChartRect.y + resolved.mainChartRect.height + bottomPanelHeight;

    const displayData = this.getDisplayData();
    this.engine.setRenderContext({
      chartRenderer: this.chartRenderer,
      gridRenderer: this.features.grid ? this.gridRenderer : null,
      priceAxis: this.features.priceAxis ? this.priceAxis : null,
      timeAxis: this.features.timeAxis ? this.timeAxis : null,
      crosshairHandler: this.features.crosshair ? this.crosshairHandler : null,
      indicatorEngine: this.features.indicators ? this.indicatorEngine : null,
      drawingRenderer: this.features.drawings ? this.drawingRenderer : null,
      tradingRenderer: this.features.trading ? this.tradingRenderer : null,
      currentPriceLine: this.currentPriceLine,
      chartLegend: this.features.legend ? this.chartLegend : null,
      volumeRenderer: this.features.volume ? this.volumeRenderer : null,
      volumeProfile: this.volumeProfile,
      marketProfile: this.marketProfile,
      depthHeatmap: this.depthHeatmap,
      periodLevels: this.periodLevels,
      pivotMarkers: this.pivotMarkers,
      watermark: this.features.watermark ? this.watermark : null,
      barCountdown: this.barCountdown,
      sessionBreaks: this.sessionBreaks,
      sessionShading: this.sessionShading,
      compareRenderer: this.compareRenderer,
      alertManager: this.features.alerts ? this.alertManager : null,
      measureOverlay: this.measureOverlay,
      selectionBoxOverlay: this.selectionBoxOverlay,
      signalMarkerManager: this.signalMarkerManager,
      tradeZoneManager: this.tradeZoneManager,
      panels,
      priceLimits: this.buildPriceLimits(),
      timeAxisY,
      // Attach data to the viewport so drawings/indicators can treat
      // `anchor.time` as a real timestamp and convert via timestampToBarIndex.
      viewport: { ...this.viewport.getState(), data: displayData },
      theme: this.themeManager.getTheme(),
      data: displayData,
      numberLocale: this.numberLocale,
      paneTitles: this.paneTitles,
      indicatorValueLabels: this.features.indicatorValueLabels,
      formatPrice: (price) => this.formatPrice(price),
      renderOverlayPlugins: (c, layer) => this.drawOverlayPlugins(c, layer),
    });
  }

  /** Draw registered overlay plugins for a layer (called by the engine). */
  private drawOverlayPlugins(
    ctx: CanvasRenderingContext2D,
    layer: 'main' | 'overlay' | 'ui',
  ): void {
    const overlays = overlaysForLayer(this.pluginManager.getOverlays(), layer);
    if (overlays.length === 0) return;
    const context = {
      viewport: this.viewport.getState(),
      data: this.getDisplayData(),
      theme: this.themeManager.getTheme(),
    };
    for (const overlay of overlays) {
      overlay.render(ctx, context);
    }
  }

  private buildPriceLimits() {
    if (!this.marketConfig?.priceLimits?.enabled || !this.marketConfig.priceLimits.referencePrice) return null;
    const limits = computePriceLimits(this.marketConfig.priceLimits.referencePrice, this.marketConfig);
    if (!limits) return null;
    return {
      ...limits,
      colors: this.marketConfig.colorScheme ? {
        ceiling: this.marketConfig.colorScheme.ceiling,
        floor: this.marketConfig.colorScheme.floor,
        reference: this.marketConfig.colorScheme.reference,
      } : undefined,
    };
  }
}
