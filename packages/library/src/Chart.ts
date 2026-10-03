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
  DrawingOptions,
  DrawingOptionDefs,
  DrawingDescriptor,
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
  DataAdapter,
  TimeZoneSetting,
  SymbolInfo,
  OverlayScale,
  ViewportState,
  FeaturesConfig,
  ExecutionAdapter,
  ExecutionConfig,
} from '@tradecanvas/commons';
import { isValidTimeZone, sessionMinute, LayerType, setLocale as setGlobalLocale, computePriceLimits, PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice, parseIndicatorSource, indicatorSource, stepDecimals, priceFormatterFor, fractionTick } from '@tradecanvas/commons';
import type { ChartTypeOptions, PriceFormatter, PriceFraction, ShapeConfig, TimeFormatter } from '@tradecanvas/commons';
import { readChartTypeOptions, tickBarCount, normalizeBarTime, volumeColor } from '@tradecanvas/commons';
import { PriceLines, type BidAsk, SymbolSeriesStore, CompareSymbolIndicator, SpreadIndicator, HiLoRenderer } from '@tradecanvas/core';
import { regularHoursFilter } from './regularHours.js';
import { ChartA11y } from './chartA11y.js';
import { zonedDateFormatter } from '@tradecanvas/commons';
import { indicatorChipLabel } from './indicatorLabel.js';
import type { ExportColumn } from '@tradecanvas/core';
import {
  RenderEngine,
  Viewport,
  withResampling,
  servesTimeframe,
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
  DEFAULT_SESSION_HOURS,
  mergeSessionHours,
  CompareRenderer,
  CurrentPriceLine,
  xToBarIndex,
  xToTime,
  yToPrice,
  PriceAxisAddButton,
  findDominantSwing,
  readAlertOptions,
} from '@tradecanvas/core';
import type { ChartRendererInterface, RangePreset, SessionHoursConfig, DrawingPatch, DrawingOrderMove } from '@tradecanvas/core';
import { timeframeToMs } from '@tradecanvas/commons';
import { resolveRenderer, resolveDisplayData, isReshapedChartType } from './charts/ChartTypeStrategy.js';
import { AutoSaveScheduler } from './state/AutoSaveScheduler.js';
import { DataManager } from './DataManager.js';
import { HistoryPager, type HistoryLoader } from './HistoryPager.js';
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
/** `setTimezone(EXCHANGE_TIMEZONE)` shows the time zone of the symbol's exchange. */
export const EXCHANGE_TIMEZONE = 'exchange';
/** Throws a RangeError for a time zone the browser doesn't know or an offset that isn't a number. */
function assertTimezone(tz: TimeZoneSetting): void {
  if (typeof tz === 'string' && tz !== EXCHANGE_TIMEZONE && !isValidTimeZone(tz)) {
    throw new RangeError(`Unknown time zone: ${tz}`);
  }
  if (typeof tz === 'number' && !Number.isFinite(tz)) throw new RangeError(`Invalid UTC offset: ${tz}`);
}

/** Decimals of order and alert prices when neither the market nor the symbol sets them. */
const DEFAULT_ORDER_PRECISION = 2;
/** Room above and below the left scale's overlays, as a share of their range. */
const LEFT_SCALE_PADDING = 0.08;
/** Changes to one indicator closer together than this are one undo step (a colour dragged, a period typed). */
const INDICATOR_EDIT_MERGE_MS = 800;
/** Fewest bars ahead of the view that trigger the next history page. */
const HISTORY_AHEAD_MIN_BARS = 20;

/** Narrowest box (px) the zoom-area tool zooms into. */
const MIN_ZOOM_BOX_PX = 8;

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
  /** Above 0 while indicators change as a whole (a layout, an undo): no undo steps are recorded. */
  private indicatorHistoryDepth = 0;
  /** Alerts of deleted drawings, put back if an undo brings the drawing back. */
  private removedDrawingAlerts = new Map<string, import('@tradecanvas/core').PriceAlert[]>();
  /** The zoom-area tool is waiting for its box. */
  private zoomAreaMode = false;
  /** The "+" by the price axis. */
  private priceAxisAddButton = new PriceAxisAddButton();
  /** Display timezone, minutes east of UTC; null = the browser's. */
  /** The time zone shown: the setting, with 'exchange' resolved to the symbol's zone. */
  private displayTz: TimeZoneSetting = null;
  /** What `setTimezone` was given; 'exchange' follows the symbol. */
  private timezoneSetting: TimeZoneSetting = null;
  /** What the feed (or host) said about the symbol on the chart. */
  private symbolInfo: SymbolInfo | null = null;
  /** Bumped per symbol asked about: an answer about a symbol the chart left is dropped. */
  private symbolInfoSeq = 0;
  private sessionBreaks: SessionBreaks;
  private sessionShading: SessionShading;
  /** The session hours the host set (or the default); a symbol's own hours show over them. */
  private hostSessionHours: SessionHoursConfig = { ...DEFAULT_SESSION_HOURS };
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
  private replaySession: {
    live: DataManager;
    price: { price: number; previousClose?: number } | null;
    /** The latest replayed time a paper account has been given (it only goes forward). */
    fedTime: number | null;
  } | null = null;
  /** During a replay in finer steps: the steps, and the series they build. */
  private replayStepsSeries: DataSeries | null = null;
  private replayCoarse: DataSeries | null = null;
  private undoRedoManager: UndoRedoManager;
  private autoSaveScheduler = new AutoSaveScheduler((key) => this.saveState(key));
  private animator: Animator;
  private crosshairTooltip: CrosshairTooltip;
  private pinnedTooltip: PinnedTooltip;
  private interactionManager: InteractionManager;
  private crosshairHandler: CrosshairHandler;
  private chartRenderer: ChartRendererInterface;
  /** Settings of the chart types that build their own bars. */
  private chartTypeOptions: ChartTypeOptions = {};
  private mainSeriesVisible = true;
  /** The visible high and low, the bid and the ask. */
  private priceLines = new PriceLines();
  /** Other symbols' bars, for the indicators that compare with them. */
  private symbolSeries = new SymbolSeriesStore();
  /** Bars outside the symbol's regular hours shown. */
  private extendedHours = true;
  /** A replay being restarted (or the chart going): its stop is not reported. */
  private replayRestarting = false;
  /** While they are hidden: the whole series, theirs included (the data manager has the rest). */
  private fullSeries: OHLCBar[] | null = null;
  /** Symbols asked for (`symbolSeriesRequest`) and not given yet. */
  private requestedSymbols = new Set<string>();
  private gridRenderer: GridRenderer;
  private priceAxis: PriceAxis;
  /** The left price scale: overlays put on it, else a mirror of the price scale. */
  private leftPriceAxis = new PriceAxis();
  private leftScaleRequested = false;
  private leftAxisWidth = PRICE_AXIS_WIDTH;
  /** The left scale's viewport this frame; null while it is hidden. */
  private leftViewport: ViewportState | null = null;
  private timeAxis: TimeAxis;
  private options: ChartOptions & { chartType: ChartType };
  private features: Required<FeaturesConfig>;
  private marketConfig: MarketConfig | null = null;
  private container: HTMLElement;
  private currentPriceLine: import('@tradecanvas/core').CurrentPriceLine;
  private numberLocale: string;
  /** The market's price precision, when set: otherwise it follows the visible range. */
  private marketPricePrecision: number | null = null;
  /** The chart's price format (`priceFormat`), or null for decimals. */
  private priceFormatter: PriceFormatter | null = null;
  /** A fraction format's smallest step (a 32nd), or null. */
  private priceUnit: number | null = null;
  private paneTitles = true;
  /**
   * The `autoScale` the chart was constructed with — distinct from
   * `this.options.autoScale`, which drag-to-scale/vertical-pan mutate at
   * runtime to freeze the Y-axis. `setData()` restores this default so a
   * freeze on the old symbol doesn't silently carry over to a new one.
   */
  private defaultAutoScale: boolean;
  private keyboardHandler: KeyboardHandler | null = null;
  private a11y: ChartA11y | null = null;
  private onWindowKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private currentSymbol: string = '';
  /** Timeframe and adapter of the connected stream, for paging its history. */
  private streamTimeframe: TimeFrame | null = null;
  /** The symbol and timeframe last told (symbolChange, timeframeChange). */
  private announcedSymbol: string | null = null;
  private announcedTimeframe: TimeFrame | null = null;
  private streamAdapter: DataAdapter | null = null;
  /** Pages older bars in as the view nears the oldest one. */
  private history: HistoryPager;
  /** Whether the history loader is the connected stream's (and goes with it). */
  private historyFromStream = false;
  /** Whether the host set a loader of its own: the stream's never replaces it. */
  private hostHistoryLoader = false;
  /** Symbol and timeframe of the series the last stream snapshot loaded. */
  private snapshotKey: string | null = null;
  private historyCheckQueued = false;


  constructor(container: HTMLElement, options: ChartOptions & { plugins?: ChartPlugin[] }) {
    // Checked before anything is built: a throw later would leave the DOM and listeners behind.
    if (options.timeZone != null) assertTimezone(options.timeZone);
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
      priceAxisAddButton: f.priceAxisAddButton ?? false,
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
    // Nothing on the chart is text to select: a double-click would otherwise
    // select its hidden screen-reader text, and the next press inside that
    // selection would start the browser's own drag instead of a pan.
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';

    // Initialize managers
    this.dataManager = new DataManager();
    this.history = new HistoryPager({
      oldestTime: () => this.dataManager.getData()[0]?.time ?? null,
      prepend: (bars) => this.prependBars(bars),
      emit: (payload) => this.eventBus.emit('historyLoad', payload),
    });
    this.themeManager = new ThemeManager(options.theme);
    this.layoutManager = new LayoutManager();
    this.indicatorEngine = new IndicatorEngine();
    this.pluginManager = new PluginManager(this.indicatorEngine, { plugins: options.plugins });
    this.eventBus = new EventBus();

    registerBuiltInIndicators(this.indicatorEngine);
    // Indicators on other symbols' bars, kept by this chart.
    this.indicatorEngine.register(new CompareSymbolIndicator(this.symbolSeries));
    this.indicatorEngine.register(new SpreadIndicator(this.symbolSeries));

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
      this.followDrawingAlerts(event, (data as { id?: string } | null)?.id);
      this.eventBus.emit(event as ChartEventType, data);
      if (event === 'drawingCreate' || event === 'drawingUpdate' || event === 'drawingRemove') this.announceStateChange();
    });
    // Pasted drawings obey the same switches as drawing tools.
    this.drawingManager.setToolFilter((type) =>
      this.features.drawings && (this.features.drawingTools.length === 0 || this.features.drawingTools.includes(type)));
    // Undo/redo
    this.undoRedoManager = new UndoRedoManager();
    let history = '';
    this.undoRedoManager.setOnChange(() => {
      const { canUndo, canRedo } = this.undoRedoManager.getState();
      const now = `${canUndo}|${canRedo}`;
      if (now === history) return;
      history = now;
      this.eventBus.emit('historyChange', { canUndo, canRedo });
    });
    this.drawingManager.setUndoRedoManager(this.undoRedoManager);
    this.drawingManager.setSelectionListener((ids) => this.eventBus.emit('drawingSelect', { ids, primary: ids[0] ?? null }));
    this.drawingManager.setForeignHistory((action, direction) => {
      if (action.type === 'custom') action.custom?.[direction]();
      else this.applyIndicatorStep(action, direction);
    });
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
    this.leftPriceAxis.setLocale(this.numberLocale);
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
    if (options.priceFormat) this.applyPriceFormat(options.priceFormat);
    if (options.chartTypeOptions) this.chartTypeOptions = readChartTypeOptions(options.chartTypeOptions);
    if (options.highLowLines) this.priceLines.setHighLow(true);
    if (options.shapes) this.themeManager.setShape(readShapes(options.shapes));
    // Their tags in the chart's precision, locale and format.
    this.priceLines.setPriceText((p) => this.formatPrice(p));
    if (options.extendedHours === false) this.extendedHours = false;
    if (options.timeFormatter) this.applyTimeFormatter(options.timeFormatter);

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

    // Screen readers: a summary, the view after a key moves it, the bars one by one.
    if (options.a11y !== false) {
      this.a11y = new ChartA11y(container, {
        symbol: () => this.currentSymbol || this.symbolInfo?.symbol || '',
        timeframe: () => this.streamTimeframe ?? '',
        chartType: () => this.options.chartType ?? 'candlestick',
        bars: () => this.getDisplayData(),
        visibleRange: () => this.viewport.getState().visibleRange,
        formatPrice: (price) => this.formatPrice(price),
        formatTime: (time) => zonedDateFormatter(this.numberLocale || 'en-US', { dateStyle: 'medium', timeStyle: 'short' }, this.displayTz)(
          time > SECONDS_TIME_LIMIT ? time : time * 1000,
        ),
        showBar: (time) => this.setCrosshairTime(time),
      }, options.a11y?.labels);
      for (const event of ['dataUpdate', 'chartTypeChange', 'symbolChange', 'timeframeChange'] as const) {
        this.eventBus.on(event, () => this.a11y?.refresh(event !== 'dataUpdate'));
      }
    }

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
      // A control inside the chart (a button over it) takes its own keys: Space presses it.
      if (active && active !== this.container && active.matches('button, a[href], select, [role="button"], [role="menuitem"]')) return;
      // Comma and period read the bars one at a time.
      if (this.a11y && this.features.keyboard && (e.key === ',' || e.key === '.') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.a11y.readBar(e.key === '.' ? 1 : -1);
        return;
      }
      if (this.keyboardHandler.handleKey(e)) {
        e.preventDefault();
        this.a11y?.viewMoved();
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
    // Alerts on drawings check the drawing's lines where they are at the latest bar.
    this.alertManager.setDrawingLevels((id) => this.drawingLevelsNow(id));
    this.alertManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.alertManager.on('triggered', (alert) => {
      this.eventBus.emit('alertTriggered', alertPayload(alert));
      // Back-compat: legacy listeners keyed off dataUpdate.
      this.eventBus.emit('dataUpdate', { alert: 'triggered', alertId: alert.id, price: alert.price, message: alert.message });
    });
    this.alertManager.on('added', (alert) => {
      this.eventBus.emit('alertAdd', alertPayload(alert));
    });
    this.alertManager.on('removed', (id) => {
      this.eventBus.emit('alertRemove', { id });
    });
    this.alertManager.on('expired', (alert) => {
      this.eventBus.emit('alertExpired', alertPayload(alert));
    });
    this.alertManager.on('updated', (alert) => {
      this.eventBus.emit('alertUpdate', alertPayload(alert));
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
    this.replayManager.on('stateChange', (state) => {
      if (!this.replayRestarting) this.eventBus.emit('replayState', { state });
    });

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
    // The time axis sits below the panes; the left scale's strip carries
    // overlays' labels only, or mirrors the price scale and scales it.
    this.interactionManager.setAxisStrips(() => ({
      plot: this.viewport.getState().chartRect,
      timeAxisTop: this.timeAxisTop(),
      left: {
        width: this.isLeftPriceScaleShown() ? this.leftAxisWidth : 0,
        scales: !this.indicatorEngine.hasLeftScaleOverlays(),
      },
    }));
    if (this.features.zooming) {
      this.interactionManager.setZoomHandler(
        new ZoomHandler((delta, centerX) => {
          // The pointer is in chart coordinates; zoom anchors in plot ones.
          this.viewport.zoom(delta, centerX - this.viewport.getState().chartRect.x);
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
      this.interactionManager.setDrawingDoubleClick((id) => this.eventBus.emit('drawingDoubleClick', { id }));
      this.interactionManager.setDrawingContextMenu((id, pos) => {
        if (this.drawingManager.select(id)) this.eventBus.emit('drawingContextMenu', { id, x: pos.x, y: pos.y });
      });
    }
    // Off any drawing: the host's menu for where it was, when one listens.
    this.interactionManager.setChartContextMenu((area, pos) => {
      if (!this.eventBus.hasListeners('chartContextMenu')) return false;
      this.eventBus.emit('chartContextMenu', this.contextAt(area, pos));
      return true;
    });
    // The "+" rides on the crosshair: without one it is neither drawn nor pressed.
    this.priceAxisAddButton.setEnabled(this.features.priceAxisAddButton && this.features.crosshair);
    this.interactionManager.setPriceAxisAddButton(this.priceAxisAddButton, (pos) => {
      const price = yToPrice(pos.y, this.viewport.getState());
      if (Number.isFinite(price)) this.eventBus.emit('priceAxisAdd', { price, x: pos.x, y: pos.y });
    });
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

    // Signal markers react to the pointer, when someone listens.
    this.interactionManager.setSignalMarkerHitTest(
      (pos) => (this.eventBus.hasListeners('signalMarkerHover') || this.eventBus.hasListeners('signalMarkerClick')
        ? this.signalMarkerManager.markerAt(pos, this.viewport.getState())
        : null),
      (marker, pos) => this.eventBus.emit('signalMarkerHover', { marker: marker as import('@tradecanvas/commons').SignalMarker | null, x: pos.x, y: pos.y }),
      // A hand only where a click does something.
      () => this.eventBus.hasListeners('signalMarkerClick'),
    );
    this.interactionManager.setClickHandler((pos) => {
      const data = this.getDisplayData();
      const marker = this.eventBus.hasListeners('signalMarkerClick') ? this.signalMarkerManager.markerAt(pos, this.viewport.getState()) : null;
      if (marker) {
        this.eventBus.emit('signalMarkerClick', { marker, x: pos.x, y: pos.y });
        return;
      }
      this.eventBus.emit('click', { x: pos.x, y: pos.y });
      if (data.length === 0) return;
      // Canonical bar mapping (accounts for chartRect.x + bar centering) so the
      // clicked bar matches the crosshair / drawings.
      const idx = xToBarIndex(pos.x, this.viewport.getState());
      if (idx < 0 || idx >= data.length) return;
      this.eventBus.emit('barClick', { bar: data[idx], barIndex: idx, point: pos });
    });

    this.interactionManager.setEscapeHandler(() => {
      if (this.zoomAreaMode) {
        this.setZoomAreaMode(false);
        return;
      }
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
        if (box && this.zoomAreaMode) {
          // A click, or a box too narrow to hold a bar or two, keeps the tool waiting.
          if (box.x1 - box.x0 < MIN_ZOOM_BOX_PX) return;
          this.zoomToBox(box);
          this.setZoomAreaMode(false);
          return;
        }
        if (!box || !this.features.drawings) return;
        // With the bar series, so anchors resolve as timestamps (as for drawing hit-tests).
        const vs = { ...this.viewport.getState(), data: this.getDisplayData() };
        if (box.isClick) this.drawingManager.toggleSelectionAt({ x: box.x1, y: box.y1 }, vs);
        else this.drawingManager.selectInRect(box, vs);
        this.engine.requestRender(LayerType.Overlay);
      },
      cancel: () => {
        this.selectionBoxOverlay.cancel();
        this.setZoomAreaMode(false);
      },
    });

    // A plain hover only moves pointer-tied visuals (crosshair, its axis
    // pills, measure ruler, selection box): repaint just the top canvas.
    this.interactionManager.setOverlayDirtyCallback((hoverOnly) => {
      this.engine.requestRender(hoverOnly ? LayerType.Hover : LayerType.Overlay);
    });
    this.interactionManager.attach();

    if (options.timeZone !== undefined && options.timeZone !== null) this.setTimezone(options.timeZone);
    if (options.leftPriceScale) this.leftScaleRequested = true;

    // Set render context
    this.syncRenderContext();
    this.engine.start();
  }

  // --- Data ---

  setData(data: DataSeries): void {
    this.loadSeries(data, false);
  }

  /**
   * `setData`; `restoring` puts the live series back after a replay, which
   * goes on as it was for alerts (their bars and last values stay).
   */
  private loadSeries(data: DataSeries, restoring: boolean): void {
    // A full replace is a new series: any replay of the old one ends, and a
    // stream's reconnect no longer merges into it.
    this.snapshotKey = null;
    this.endReplaySession();
    this.history.reset();
    this.dataManager.setData(this.regularOnly(data));
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
    if (!restoring) this.alertManager.clearLastValues();
    this.recalcIndicators(this.dataManager.getData());
    // Auto-set current price line from last bar's close
    if (data.length > 0) {
      this.currentPriceLine.setPrice(data[data.length - 1].close);
    }
    this.updateViewportAndRender(true);
    this.eventBus.emit('dataUpdate', { length: data.length });
  }

  /**
   * Add older bars in front of the data — e.g. a page of history loaded as
   * the user scrolls back. Bars at or after the first loaded bar are skipped.
   * The same bars stay on screen. Ignored during a replay. Returns how many
   * bars were added.
   */
  prependBars(bars: OHLCBar[]): number {
    if (this.replaySession) return 0;
    // Hidden extended hours: the older bars all go to the whole series, the
    // regular ones on the chart too; the page counts as loaded either way.
    let taken: number | null = null;
    if (this.fullSeries) {
      const first = this.fullSeries[0]?.time;
      const seen = new Set<number>();
      const older = bars
        .filter((b) => isWholeBar(b) && (first === undefined || b.time < first) && !seen.has(b.time) && seen.add(b.time))
        .sort((a, b) => a.time - b.time);
      this.fullSeries = [...older, ...this.fullSeries];
      const keep = this.sessionKeep(this.fullSeries);
      taken = older.length;
      bars = keep ? older.filter((b) => keep(b.time)) : older;
    }
    // The bar at the left edge, by time: Renko bricks and the like are rebuilt
    // from the whole series, so counting what was added would not find it.
    const shown = this.getDisplayData();
    const leftIndex = Math.max(0, Math.min(shown.length - 1, Math.floor(this.viewport.getState().visibleRange.from)));
    const leftTime = shown[leftIndex]?.time;
    const added = this.dataManager.prependBars(bars);
    if (added === 0) return taken ?? 0;
    const data = this.dataManager.getData();
    this.crosshairHandler.setData(data);
    this.displayDataCache = null;
    this.sessionBreaks.invalidateCache();
    // Both hold bar positions that just moved.
    if (this.pinnedTooltip.isPinned()) this.pinnedTooltip.unpin();
    this.measureOverlay.end();
    this.recalcIndicators(data);
    if (leftTime !== undefined) {
      const now = Math.round(timestampToBarIndex(leftTime, this.getDisplayData()));
      this.viewport.prependBars(now - leftIndex);
    }
    this.updateViewportAndRender();
    return taken ?? added;
  }

  /**
   * A stream snapshot for the series already on the chart (a reconnect): keep
   * the older bars paged in and the view, replace the rest.
   */
  private mergeSnapshot(bars: OHLCBar[]): void {
    const data = this.fullSeries ?? this.dataManager.getData();
    const first = bars[0]?.time;
    let keep = 0;
    while (first !== undefined && keep < data.length && data[keep].time < first) keep++;
    // Merge only when the snapshot reaches back over the old bars: after a
    // longer outage it starts later, and joining them would hide a gap.
    if (keep === 0 || keep === data.length) {
      this.setData(bars);
      return;
    }
    const follow = this.viewport.isAtEnd();
    this.dataManager.setData(this.regularOnly(data.slice(0, keep).concat(bars)));
    const merged = this.dataManager.getData();
    this.crosshairHandler.setData(merged);
    this.displayDataCache = null;
    this.sessionBreaks.invalidateCache();
    // The same series goes on (a reconnect): alerts keep their bars and last values.
    this.recalcIndicators(merged);
    if (merged.length > 0) this.currentPriceLine.setPrice(merged[merged.length - 1].close);
    this.updateViewportAndRender(follow);
    this.eventBus.emit('dataUpdate', { length: merged.length });
  }

  /**
   * Load older bars as the user scrolls back: `loader(before, limit)` gets the
   * oldest loaded bar's time and returns up to `limit` older bars (an empty
   * array once the history starts). A connected stream whose adapter has
   * `fetchHistoryBefore` sets this up by itself. Pass null to stop.
   */
  setHistoryLoader(loader: HistoryLoader | null, options?: { pageSize?: number }): void {
    this.historyFromStream = false;
    this.hostHistoryLoader = loader !== null;
    this.history.setLoader(loader, options?.pageSize);
    this.checkHistory();
  }

  /** Load one page of older bars now. Resolves to the number of bars added. */
  loadMoreHistory(): Promise<number> {
    if (this.replaySession) return Promise.resolve(0);
    return this.history.loadMore();
  }

  /** Whether older bars can still be loaded (a loader is set and the start wasn't reached). */
  hasMoreHistory(): boolean {
    return this.history.hasLoader() && this.history.hasMore();
  }

  isLoadingHistory(): boolean {
    return this.history.isLoading();
  }

  /**
   * Page older bars in when less than a screen of them is left of the view —
   * after the current update, so a page that just landed reports itself
   * before the next one starts. Not for chart types that reshape the bars
   * (Renko, Kagi…): a handful of bricks can stand for a whole page.
   */
  private checkHistory(): void {
    if (this.historyCheckQueued || !this.history.hasLoader()) return;
    this.historyCheckQueued = true;
    queueMicrotask(() => {
      this.historyCheckQueued = false;
      if (this.replaySession || !this.history.hasLoader() || isReshapedChartType(this.options.chartType)) return;
      const { from, to } = this.viewport.getState().visibleRange;
      this.history.maybeLoad(Math.max(0, Math.floor(from)), Math.max(HISTORY_AHEAD_MIN_BARS, to - from));
    });
  }

  /** Page the connected stream's history through its adapter, if it can. */
  private useStreamHistory(feed: DataAdapter, pageSize: number | undefined): void {
    if (this.hostHistoryLoader) return;
    // The same wrapper the stream uses: pages of a 7m chart are 7m bars.
    const adapter = withResampling(feed);
    const fetchBefore = adapter.fetchHistoryBefore;
    const timeframe = this.streamTimeframe;
    // Tick bars come from recent trades: a feed keeps no older ones to page in.
    if (!fetchBefore || timeframe === null || tickBarCount(timeframe) !== null) {
      if (this.historyFromStream) this.history.setLoader(null);
      this.historyFromStream = false;
      return;
    }
    const symbol = this.currentSymbol;
    this.history.setLoader((before, limit) => fetchBefore.call(adapter, symbol, timeframe, before, limit), pageSize);
    this.historyFromStream = true;
    this.checkHistory();
  }

  appendBar(bar: OHLCBar): void {
    if (this.replaySession) {
      this.replaySession.live.appendBar(bar);
      return;
    }
    if (!this.takeBar(bar, 'append')) return;
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
    bars = bars.filter((bar) => this.takeBar(bar, 'append'));
    if (bars.length === 0) return;
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
    if (!this.takeBar(bar, 'update')) {
      this.currentPriceLine.setPrice(bar.close);
      this.scheduleRender();
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
    // A tick outside regular hours, while they are hidden, moves only the price line.
    const keep = this.fullSeries ? this.sessionKeep(this.fullSeries) : null;
    if (keep && !keep(tick.time)) {
      this.currentPriceLine.setPrice(tick.price);
      this.scheduleRender();
      return;
    }
    this.dataManager.updateLastBarFromTick(tick);
    this.currentPriceLine.setPrice(tick.price);
    // While extended hours are hidden, the whole series keeps the same bar.
    const full = this.fullSeries;
    const merged = this.dataManager.getData()[this.dataManager.getLength() - 1];
    if (full && merged && full.length > 0 && full[full.length - 1].time === merged.time) full[full.length - 1] = merged;
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
    const previous = this.options.chartType ?? 'candlestick';
    this.options.chartType = type as ChartType;
    this.chartRenderer = this.createChartRenderer(type);
    this.chartLegend.setChartType(type as ChartType);
    this.displayDataCache = null;
    this.updateViewportAndRender(true);
    this.markStateChanged();
    if (type !== previous) this.eventBus.emit('chartTypeChange', { type, previous });
  }

  /**
   * Settings of Renko, Line Break, Kagi, Point & Figure and range bars, by
   * type: each type given replaces that type's settings (`{}` puts it back
   * to the defaults). Values it can't use are left out.
   */
  setChartTypeOptions(options: ChartTypeOptions): void {
    this.chartTypeOptions = { ...this.chartTypeOptions, ...readChartTypeOptions(options) };
    this.displayDataCache = null;
    this.updateViewportAndRender(true);
    this.markStateChanged();
  }

  getChartTypeOptions(): ChartTypeOptions {
    return readChartTypeOptions(this.chartTypeOptions);
  }

  /**
   * Show or hide the bars outside the symbol's regular hours
   * (`SymbolInfo.sessions`, in its `timezone`): pre- and post-market. Hidden,
   * they are kept aside and come back when shown again. Bars a day or longer,
   * and symbols without hours, are left as they are.
   */
  setExtendedHours(show: boolean): void {
    if (show === this.extendedHours) return;
    this.extendedHours = show;
    this.reapplyExtendedHours();
    this.markStateChanged();
  }

  isExtendedHoursVisible(): boolean {
    return this.extendedHours;
  }

  /** Which bar times to show, for bars like `data`'s; null: all of them. */
  private sessionKeep(data: readonly { time: number }[]): ((time: number) => boolean) | null {
    return this.extendedHours ? null : regularHoursFilter(this.symbolInfo, data);
  }

  /** The bars of `all` the chart shows (no state kept). */
  private shownBars(all: OHLCBar[]): OHLCBar[] {
    const keep = this.sessionKeep(all);
    return keep ? all.filter((b) => keep(b.time)) : all.slice();
  }

  /** The bars of `all` the chart shows; while some are hidden, `all` is kept as the whole series. */
  private regularOnly(all: OHLCBar[]): OHLCBar[] {
    const keep = this.sessionKeep(all);
    this.fullSeries = keep ? all.slice() : null;
    return keep ? all.filter((b) => keep(b.time)) : all;
  }

  /** A new or updated bar into the whole series (while one is kept): whether the chart shows it. */
  /** A stream bar onto the bars shown: the last one again or a new one after it; false for an older one. */
  private placeStreamBar(bar: OHLCBar): boolean {
    const how = barPlacement(this.dataManager.getData(), bar);
    if (how === 'stale') return false;
    if (how === 'append') this.dataManager.appendBar(bar);
    else this.dataManager.updateLastBar(bar);
    return true;
  }

  private takeBar(bar: OHLCBar, how: 'append' | 'update'): boolean {
    // Hidden hours with no whole series yet (too few bars to tell the interval): start one now if it can.
    if (!this.fullSeries && !this.extendedHours && !this.replaySession) {
      const data = this.dataManager.getData();
      // The interval is told by the last bars: no need to copy the rest.
      const tail = data.slice(-12);
      const all = how === 'append' || tail.length === 0 ? [...tail, bar] : [...tail.slice(0, -1), bar];
      if (this.sessionKeep(all)) {
        this.fullSeries = data.slice();
        const keep = this.sessionKeep(this.fullSeries.length > 1 ? this.fullSeries : all);
        if (keep && data.some((b) => !keep(b.time))) {
          this.dataManager.setData(data.filter((b) => keep(b.time)));
          this.displayDataCache = null;
        }
      }
    }
    const full = this.fullSeries;
    if (!full) return true;
    if (how === 'append' || full.length === 0) full.push(bar);
    else full[full.length - 1] = bar;
    const keep = this.sessionKeep(full);
    return !keep || keep(bar.time);
  }

  /** The bars shown again after the extended hours or the symbol's hours changed. */
  private reapplyExtendedHours(): void {
    if (this.replaySession) return; // the replay's end brings the series back through the filter
    const all = this.fullSeries ?? this.dataManager.getData().slice();
    if (!this.fullSeries && !this.sessionKeep(all)) return; // nothing hidden before or now
    this.dataManager.setData(this.regularOnly(all));
    const data = this.dataManager.getData();
    this.crosshairHandler.setData(data);
    this.displayDataCache = null;
    this.sessionBreaks.invalidateCache();
    this.recalcIndicators(data);
    this.updateViewportAndRender(true);
    this.eventBus.emit('dataUpdate', { length: data.length });
  }

  /** The price lines for this frame: during a replay without the live bid and ask. */
  private quoteLines(): PriceLines {
    this.priceLines.setQuoteShown(this.replaySession === null);
    return this.priceLines;
  }

  /**
   * The shapes the chart draws: `tagRadius` rounds its price tags, axis
   * pills and order badges (0: square, 999: pills). Kept through theme
   * changes.
   */
  setShapes(shapes: ShapeConfig): void {
    const read = readShapes(shapes);
    if (read.tagRadius === undefined) return;
    this.themeManager.setShape({ ...this.themeManager.getTheme().shape, ...read });
    this.syncRenderContext();
    this.engine.requestRender();
  }

  getShapes(): ShapeConfig {
    return { ...this.themeManager.getTheme().shape };
  }

  /** Show or hide the main series (its bars, candles or line); the rest of the chart stays. */
  setMainSeriesVisible(visible: boolean): void {
    this.mainSeriesVisible = visible;
    this.syncRenderContext();
    this.engine.requestRender();
  }

  isMainSeriesVisible(): boolean {
    return this.mainSeriesVisible;
  }

  /** Mark the highest high and lowest low on screen with a line and a price tag. */
  setHighLowLines(visible: boolean): void {
    this.priceLines.setHighLow(visible);
    this.engine.requestRender();
  }

  isHighLowLinesVisible(): boolean {
    return this.priceLines.isHighLowVisible();
  }

  /**
   * Mark the best bid and ask with lines and price tags (null takes them
   * off). A connected feed whose ticks carry `bid` / `ask` keeps them up to date.
   */
  setBidAsk(quote: BidAsk | null): void {
    this.priceLines.setBidAsk(quote);
    this.engine.requestRender(LayerType.Overlay);
  }

  getBidAsk(): BidAsk | null {
    return this.priceLines.getBidAsk();
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
    options: { pane?: string; scale?: OverlayScale } = {},
  ): string | null {
    return this.recordIndicators(undefined, () => this.addIndicatorNow(id, params, position, options));
  }

  private addIndicatorNow(
    id: string,
    params: Record<string, number | string | boolean>,
    position: PanelPosition,
    options: { pane?: string; scale?: OverlayScale; instanceId?: string },
  ): string | null {
    if (!this.features.indicators) return null;
    if (this.features.indicatorIds.length > 0 && !this.features.indicatorIds.includes(id)) return null;
    const descriptor = this.indicatorEngine.getAvailableIndicators().find((d) => d.id === id);
    const pane = descriptor ? this.paneFor(descriptor, params, options.pane) : null;
    const instanceId = this.indicatorEngine.addIndicator(id, params, this.dataManager.getData(), {
      ...(pane ? { pane } : {}),
      ...(options.scale === 'left' ? { scale: 'left' as const } : {}),
      ...(options.instanceId ? { instanceId: options.instanceId } : {}),
    });
    if (descriptor?.placement === 'panel' && !pane) this.layoutManager.addPanel(instanceId, position);
    // The layout (a new pane) or the price scale (a new overlay) may change.
    this.updateViewportAndRender();
    this.eventBus.emit('indicatorAdd', { instanceId, id });
    this.markStateChanged();
    this.requestMissingSymbols(instanceId);
    return instanceId;
  }

  // --- Other symbols' bars ---

  /**
   * Another symbol's bars, for the indicators that read it ('compareSymbol',
   * 'spread'): they line them up with the chart's bars by time. Give them
   * again after a timeframe change; null forgets them.
   */
  setSymbolSeries(symbol: string, bars: DataSeries | null): void {
    symbol = symbol.trim();
    this.symbolSeries.set(symbol, bars);
    this.requestedSymbols.delete(symbol);
    const data = this.dataManager.getData();
    let changed = false;
    for (const ind of this.indicatorEngine.getActiveIndicators()) {
      if (!SYMBOL_INDICATORS.has(ind.id) || String(ind.params.symbol ?? '').trim() !== symbol.trim()) continue;
      this.indicatorEngine.updateIndicator(ind.instanceId, {}, data);
      changed = true;
    }
    if (!changed) return;
    this.announceIndicatorUpdate(0);
    this.updateViewportAndRender();
  }

  /** A symbol no indicator reads any more may be asked for again later. */
  private forgetUnreadSymbols(): void {
    const required = new Set(this.getRequiredSymbols());
    for (const symbol of this.requestedSymbols) if (!required.has(symbol)) this.requestedSymbols.delete(symbol);
  }

  /** The bars given for `symbol`, or null. */
  getSymbolSeries(symbol: string): DataSeries | null {
    return this.symbolSeries.get(symbol) ?? null;
  }

  /** The symbols the chart's indicators read, whether their bars are here or not. */
  getRequiredSymbols(): string[] {
    const out = new Set<string>();
    for (const ind of this.indicatorEngine.getActiveIndicators()) {
      const symbol = ind.params.symbol;
      if (SYMBOL_INDICATORS.has(ind.id) && typeof symbol === 'string' && symbol.trim()) out.add(symbol.trim());
    }
    return [...out];
  }

  /**
   * Ask once for the symbol an indicator just added or changed reads, when
   * the chart hasn't got it (not for symbols other indicators read: one
   * whose fetch failed is asked for again only by an indicator on it).
   */
  private requestMissingSymbols(instanceId: string): void {
    this.forgetUnreadSymbols();
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    const symbol = config && SYMBOL_INDICATORS.has(config.id) && typeof config.params.symbol === 'string' ? config.params.symbol.trim() : '';
    if (!symbol || this.symbolSeries.has(symbol) || this.requestedSymbols.has(symbol)) return;
    this.requestedSymbols.add(symbol);
    this.eventBus.emit('symbolSeriesRequest', { symbol });
  }

  /**
   * Change an indicator's inputs. A source that would make it read from its
   * own lines (through other indicators) is ignored.
   */
  updateIndicator(instanceId: string, params: Record<string, number | string | boolean>): void {
    this.recordIndicators(instanceId, () => this.updateIndicatorNow(instanceId, params));
  }

  private updateIndicatorNow(instanceId: string, params: Record<string, number | string | boolean>): void {
    const descriptor = this.indicatorEngine.getIndicatorDescriptor(instanceId);
    const name = descriptor ? sourceParam(descriptor) : null;
    const before = name ? this.indicatorEngine.getIndicatorConfig(instanceId)?.params[name] : undefined;
    this.indicatorEngine.updateIndicator(instanceId, params, this.dataManager.getData());
    this.announceIndicatorUpdate(0);
    this.markStateChanged();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'params' });
    this.requestMissingSymbols(instanceId);
    // A price-pane indicator follows a new source into its pane, and leaves
    // it when it no longer reads from it; otherwise it stays where it is.
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if (descriptor?.placement === 'overlay' && config && name && config.params[name] !== before) {
      const line = parseIndicatorSource(config.params[name]);
      const pane = line ? this.paneHostOf(line.instanceId, instanceId)
        : parseIndicatorSource(before) ? null : config.pane ?? null;
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

  /**
   * Put a price-pane overlay on the left price scale (fit to its own values,
   * the scale shows by itself) or back on the price scale. False when the
   * indicator isn't a price-pane overlay.
   */
  setIndicatorScale(instanceId: string, scale: OverlayScale): boolean {
    return this.recordIndicators(instanceId, () => this.setIndicatorScaleNow(instanceId, scale));
  }

  private setIndicatorScaleNow(instanceId: string, scale: OverlayScale): boolean {
    if (!this.indicatorEngine.setScale(instanceId, scale)) return false;
    this.updateViewportAndRender();
    this.markStateChanged();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'scale' });
    return true;
  }

  getIndicatorScale(instanceId: string): OverlayScale {
    return this.indicatorEngine.getIndicatorConfig(instanceId)?.scale === 'left' ? 'left' : 'right';
  }

  /** Show the left price scale even without overlays on it (it then mirrors the price scale). */
  setLeftPriceScaleVisible(visible: boolean): void {
    this.leftScaleRequested = visible;
    this.updateViewportAndRender();
  }

  /** Whether the left price scale is on screen: asked for, or carrying an overlay. */
  isLeftPriceScaleShown(): boolean {
    return this.features.priceAxis !== false && (this.leftScaleRequested || this.indicatorEngine.hasLeftScaleOverlays());
  }

  /** The left price scale's range on screen, or null while it is hidden. */
  getLeftPriceRange(): { min: number; max: number } | null {
    return this.leftViewport ? { ...this.leftViewport.priceRange } : null;
  }

  /**
   * The left scale's viewport for this frame: fit to the overlays on it over
   * the visible bars (on a plain linear scale), or the price scale's when
   * none is.
   */
  private computeLeftViewport(): ViewportState | null {
    if (!this.isLeftPriceScaleShown()) return null;
    const vs = this.viewport.getState();
    if (!this.indicatorEngine.hasLeftScaleOverlays()) return vs;
    const range = this.indicatorEngine.getOverlayPriceRange(vs.visibleRange.from, vs.visibleRange.to, 'left');
    if (!range) return vs;
    const span = range.max - range.min || Math.abs(range.max) || 1;
    return {
      ...vs,
      priceRange: { min: range.min - span * LEFT_SCALE_PADDING, max: range.max + span * LEFT_SCALE_PADDING },
      logScale: false,
      scaleMode: 'regular',
      invertScale: false,
      // The overlays' own numbers, not the price's format.
      formatPrice: undefined,
      priceUnit: undefined,
    };
  }

  /** Set an indicator's reference levels; `null` restores its indicator's defaults. */
  setIndicatorLevels(instanceId: string, levels: readonly number[] | null): void {
    this.recordIndicators(instanceId, () => this.setIndicatorLevelsNow(instanceId, levels));
  }

  private setIndicatorLevelsNow(instanceId: string, levels: readonly number[] | null): void {
    if (!this.indicatorEngine.setLevels(instanceId, levels)) return;
    this.updateViewportAndRender();
    this.markStateChanged();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'levels' });
  }

  /**
   * Remove an indicator, and the indicators computed from its lines with it.
   * Others drawn in its pane keep the pane (a pane indicator takes it over)
   * or go back to the price pane.
   */
  removeIndicator(instanceId: string): void {
    this.recordIndicators(undefined, () => this.removeIndicatorNow(instanceId));
  }

  private removeIndicatorNow(instanceId: string): void {
    if (!this.indicatorEngine.getIndicatorConfig(instanceId)) return;
    // It and everything computed from its lines, the last readers first.
    const doomed = [instanceId, ...this.indicatorEngine.getDependents(instanceId)];
    for (const id of doomed.reverse()) this.detachIndicator(id);
    this.markStateChanged();
    this.updateViewportAndRender();
  }

  /**
   * Remove one indicator. The first pane indicator drawn in its pane takes the
   * pane over and the others stay in it.
   */
  private detachIndicator(instanceId: string): void {
    if (!this.indicatorEngine.getIndicatorConfig(instanceId)) return;
    const panel = this.layoutManager.getPanels().find((p) => p.id === instanceId);
    const members = this.indicatorEngine.getPaneMembers(instanceId);
    const isPanel = (id: string) => this.indicatorEngine.getIndicatorDescriptor(id)?.placement === 'panel';
    const heir = panel ? members.find(isPanel) ?? null : null;
    this.indicatorEngine.removeIndicator(instanceId);
    if (heir) {
      this.indicatorEngine.setPane(heir, null);
      this.layoutManager.renamePanel(instanceId, heir);
    } else {
      this.layoutManager.removePanel(instanceId);
    }
    // With an heir the others stay in its pane; without one (only price-pane
    // indicators were drawn here) they go back to the price pane.
    for (const member of members) {
      if (member !== heir) this.indicatorEngine.setPane(member, heir);
      this.eventBus.emit('indicatorChange', { instanceId: member, change: 'pane' });
    }
    this.eventBus.emit('indicatorRemove', { instanceId });
    this.forgetUnreadSymbols();
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
    this.markStateChanged();
  }

  /**
   * Move an indicator to another pane: `target` is an indicator drawn there
   * (it joins that pane, on its scale), `'new'` a pane of its own (indicators
   * that draw in a pane), or `'price'` the price pane (overlays). Indicators
   * drawn in its own pane stay there (one of them takes the pane over) or
   * follow it when they read its lines. False when it can't go there.
   */
  moveIndicatorToPane(instanceId: string, target: string): boolean {
    return this.recordIndicators(instanceId, () => this.moveIndicatorToPaneNow(instanceId, target));
  }

  /** Whether `moveIndicatorToPane(instanceId, target)` would move it. */
  canMoveIndicatorToPane(instanceId: string, target: string): boolean {
    return this.paneMoveHost(instanceId, target) !== undefined;
  }

  /** Where a move would put the indicator: the pane's host, `null` (its own or the price pane), or `undefined` when it can't go. */
  private paneMoveHost(instanceId: string, target: string): string | null | undefined {
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    const descriptor = this.indicatorEngine.getIndicatorDescriptor(instanceId);
    if (!config || !descriptor) return undefined;
    // An overlay computed from another indicator's line stays with that line.
    const name = sourceParam(descriptor);
    if (descriptor.placement === 'overlay' && name && parseIndicatorSource(config.params[name])) return undefined;
    if (target === 'price') return descriptor.placement === 'overlay' && config.pane ? null : undefined;
    if (target === 'new') {
      const ownsPane = this.layoutManager.getPanels().some((p) => p.id === instanceId);
      return descriptor.placement === 'panel' && !ownsPane ? null : undefined;
    }
    const host = this.paneHostOf(target, instanceId);
    return host && host !== config.pane && host !== instanceId ? host : undefined;
  }

  private moveIndicatorToPaneNow(instanceId: string, target: string): boolean {
    const host = this.paneMoveHost(instanceId, target);
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if (host === undefined || !config) return false;
    // Where it was, before the moves below change the config.
    const formerPane = config.pane;
    const ownsPane = this.layoutManager.getPanels().some((p) => p.id === instanceId);

    const changed = new Set<string>([instanceId]);
    if (ownsPane) {
      // Its pane's other indicators: those reading its lines go with it; of
      // the rest, the first that draws in a pane takes the pane over.
      const members = this.indicatorEngine.getPaneMembers(instanceId);
      const readers = new Set(this.indicatorEngine.getDependents(instanceId));
      const staying = members.filter((m) => !readers.has(m));
      const heir = staying.find((m) => this.indicatorEngine.getIndicatorDescriptor(m)?.placement === 'panel') ?? null;
      if (heir) {
        this.indicatorEngine.setPane(heir, null);
        this.layoutManager.renamePanel(instanceId, heir);
        for (const m of staying) if (m !== heir) this.indicatorEngine.setPane(m, heir);
      } else {
        this.layoutManager.removePanel(instanceId);
        for (const m of staying) this.indicatorEngine.setPane(m, null);
      }
      for (const m of members) {
        if (readers.has(m)) this.indicatorEngine.setPane(m, host ?? instanceId);
        changed.add(m);
      }
    }
    this.indicatorEngine.setPane(instanceId, host);
    if (target === 'new') {
      this.layoutManager.addPanel(instanceId, 'bottom');
      // Those reading its lines come along into its new pane.
      for (const m of this.indicatorEngine.getDependents(instanceId)) {
        if (this.indicatorEngine.getIndicatorConfig(m)?.pane === formerPane) {
          this.indicatorEngine.setPane(m, instanceId);
          changed.add(m);
        }
      }
    }
    for (const id of changed) this.eventBus.emit('indicatorChange', { instanceId: id, change: 'pane' });
    this.updateViewportAndRender();
    this.markStateChanged();
    return true;
  }

  /**
   * Fold a pane to its header, or open it again: the pane `instanceId` is
   * drawn in. While a pane is maximised, this puts the panes back first.
   */
  setPaneCollapsed(instanceId: string, collapsed: boolean): boolean {
    const pane = this.paneOf(instanceId);
    return this.recordIndicators(pane, () => this.paneChange(pane, 'collapsed', () => this.layoutManager.setPanelCollapsed(pane, collapsed)));
  }

  /** Whether the pane `instanceId` is drawn in shows folded (folded, or another pane is maximised). */
  isPaneCollapsed(instanceId: string): boolean {
    return this.layoutManager.isPanelShownCollapsed(this.paneOf(instanceId));
  }

  /** Let one pane take the room (the others fold, the price pane keeps a strip); `null` puts them back. */
  setMaximizedPane(instanceId: string | null): boolean {
    const pane = instanceId === null ? null : this.paneOf(instanceId);
    const subject = pane ?? this.layoutManager.getMaximizedPanel() ?? '';
    return this.recordIndicators(subject, () => this.paneChange(subject, 'maximized', () => this.layoutManager.setMaximizedPanel(pane)));
  }

  getMaximizedPane(): string | null {
    return this.layoutManager.getMaximizedPanel();
  }

  /**
   * A pane's value scale: logarithmic (used while all its values are above 0;
   * linear otherwise), upside down. The pane `instanceId` is drawn in.
   */
  setPaneScale(instanceId: string, scale: { log?: boolean; invert?: boolean; percent?: boolean }): boolean {
    const pane = this.paneOf(instanceId);
    return this.recordIndicators(pane, () => this.paneChange(pane, 'scale', () => this.layoutManager.setPanelScale(pane, scale)));
  }

  /** The pane's value scale as set (see `setPaneScale`). */
  getPaneScale(instanceId: string): { log: boolean; invert: boolean; percent: boolean } {
    const panel = this.layoutManager.getPanels().find((p) => p.id === this.paneOf(instanceId));
    return { log: !!panel?.logScale, invert: !!panel?.invertScale, percent: !!panel?.percentScale };
  }

  /** A pane's first value on screen (its own indicator's first line), the 0% of a percent scale. */
  private paneBaseline(instanceId: string, from: number, to: number): number | undefined {
    const series = this.indicatorEngine.getOutput(instanceId)?.series;
    const descriptor = this.indicatorEngine.getIndicatorDescriptor(instanceId);
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

  /** Move a pane one place up (`-1`) or down (`1`) among the panes on its side. */
  movePane(instanceId: string, delta: -1 | 1): boolean {
    const pane = this.paneOf(instanceId);
    return this.recordIndicators(pane, () => this.paneChange(pane, 'order', () => this.layoutManager.movePanel(pane, delta)));
  }

  /** Whether `movePane(instanceId, delta)` would move it. */
  canMovePane(instanceId: string, delta: -1 | 1): boolean {
    return this.layoutManager.canMovePanel(this.paneOf(instanceId), delta);
  }

  /** The pane an indicator is drawn in: its own, or the one it shares. */
  private paneOf(instanceId: string): string {
    return this.indicatorEngine.getIndicatorConfig(instanceId)?.pane ?? instanceId;
  }

  private paneChange(instanceId: string, change: 'collapsed' | 'maximized' | 'order' | 'scale', apply: () => boolean): boolean {
    if (!apply()) return false;
    this.updateViewportAndRender();
    this.eventBus.emit('paneChange', { instanceId, change });
    this.markStateChanged();
    return true;
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

  /**
   * A price on the market's grid: a multiple of its smallest step (`minTick`),
   * else rounded to its precision, else to the decimals the axis shows.
   */
  roundPrice(price: number): number {
    if (!Number.isFinite(price)) return price;
    const tick = this.symbolInfo?.minTick ?? this.priceUnit ?? undefined;
    if (tick !== undefined && tick > 0) return Number((Math.round(price / tick) * tick).toFixed(stepDecimals(tick)));
    const { min, max } = this.viewport.getState().priceRange;
    return Number(price.toFixed(this.marketPricePrecision ?? autoPricePrecision(min, max)));
  }

  /**
   * How prices read on the price scale and everything that prints one: a
   * function of yours, fractions of a point (`{ denominator: 32 }` prints
   * `101'16`), or null for decimals. Indicator panes keep their own numbers.
   */
  setPriceFormat(format: PriceFormatter | PriceFraction | null): void {
    this.applyPriceFormat(format);
    // The axis may need room for the new labels, and the frame its new format.
    this.updateViewportAndRender();
  }

  /** The chart's price format as a function (`priceFormat`), or null for decimals. */
  getPriceFormatter(): PriceFormatter | null {
    return this.priceFormatter;
  }

  private applyPriceFormat(format: PriceFormatter | PriceFraction | null): void {
    this.priceFormatter = priceFormatterFor(format);
    this.priceUnit = format && typeof format !== 'function' ? fractionTick(format) : null;
    this.viewport.setPriceFormat(this.priceFormatter, this.priceUnit);
    this.crosshairTooltip.setPriceFormatter(this.priceFormatter);
    this.pinnedTooltip.setPriceFormatter(this.priceFormatter);
  }

  /** How times read on the time axis, the crosshair and the tooltip; null for the chart's own. */
  setTimeFormatter(formatter: TimeFormatter | null): void {
    this.applyTimeFormatter(formatter);
    this.engine.requestRender();
  }

  private applyTimeFormatter(formatter: TimeFormatter | null): void {
    this.timeAxis.setTimeFormatter(formatter);
    this.crosshairHandler.setTimeFormatter(formatter);
    this.crosshairTooltip.setTimeFormatter(formatter);
  }

  /**
   * A price as the price axis writes it: in the chart's price format when it
   * has one (`priceFormat`), else at the market's precision or the visible
   * range's, in the number locale.
   */
  formatPrice(price: number): string {
    if (this.priceFormatter) return this.priceFormatter(price);
    const { min, max } = this.viewport.getState().priceRange;
    return formatPrice(price, this.marketPricePrecision ?? autoPricePrecision(min, max), this.numberLocale);
  }

  // --- Drawing tools ---

  setDrawingTool(type: DrawingToolType | null): void {
    if (!this.features.drawings) return;
    // If whitelist is set, check it
    if (type && this.features.drawingTools.length > 0 && !this.features.drawingTools.includes(type)) return;
    // A tool picked puts the eraser and the zoom box away (the manager does the eraser).
    if (type) this.setZoomAreaMode(false);
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
    this.dropOrphanDrawingAlerts();
    this.announceStateChange();
  }

  /** Append a drawing (id auto-assigned, active style applied). Returns the id. */
  addDrawing(state: {
    type: import('@tradecanvas/commons').DrawingToolType;
    anchors: import('@tradecanvas/commons').AnchorPoint[];
    style?: Partial<DrawingStyle>;
    /** The tool's own settings (see `getDrawingOptionDefs`); its defaults fill the rest. */
    options?: DrawingOptions;
    visible?: boolean;
    locked?: boolean;
    meta?: Record<string, unknown>;
  }): string | null {
    if (!this.features.drawings) return null;
    const id = this.drawingManager.addDrawing(state);
    this.markStateChanged();
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

  /** Remove several drawings as one undo step; locked ones stay. Returns how many went. */
  removeDrawings(ids: readonly string[]): number {
    return this.drawingManager.removeDrawings(ids);
  }

  /** A drawing tool's name, anchors, options and style fields; null for an unknown tool. */
  getDrawingToolDescriptor(type: DrawingToolType): DrawingDescriptor | null {
    const descriptor = this.drawingManager.getDescriptor(type);
    return descriptor ? structuredClone(descriptor) : null;
  }

  /** The settings a drawing tool offers beyond the shared style (levels, extend…), with defaults. */
  getDrawingOptionDefs(type: DrawingToolType): DrawingOptionDefs {
    return this.drawingManager.getOptionDefs(type);
  }

  /** Every option of a drawing, its tool's defaults filled in. */
  getDrawingOptions(id: string): DrawingOptions {
    return this.drawingManager.getDrawingOptions(id);
  }

  /** Change some of a drawing's options; invalid ones are dropped. False for an unknown drawing. */
  setDrawingOptions(id: string, options: DrawingOptions): boolean {
    return this.updateDrawing(id, { options });
  }

  /**
   * Change a drawing's anchors (as many as it has), style or options, as one
   * undo step — or as part of the edit begun with `beginDrawingEdit`.
   * Applies to locked drawings too. False for an unknown drawing or wrong anchors.
   */
  updateDrawing(id: string, patch: DrawingPatch): boolean {
    const changed = this.drawingManager.updateDrawing(id, patch);
    if (changed) this.markStateChanged();
    return changed;
  }

  /** Start an edit (a settings dialog): the `updateDrawing` calls until `endDrawingEdit` are one undo step. */
  beginDrawingEdit(id: string): boolean {
    return this.drawingManager.beginEdit(id);
  }

  /** Keep the edit as one undo step, or with `cancel` put the drawing back as it was. */
  endDrawingEdit(id: string, options: { cancel?: boolean } = {}): void {
    this.drawingManager.endEdit(id, options);
    this.markStateChanged();
  }

  /** Options new drawings of `type` start with; null clears them. */
  setDrawingToolDefaults(type: DrawingToolType, options: DrawingOptions | null): void {
    this.drawingManager.setToolDefaults(type, options);
  }

  getDrawingToolDefaults(type: DrawingToolType): DrawingOptions {
    return this.drawingManager.getToolDefaults(type);
  }

  setDrawingVisible(id: string, visible: boolean): void {
    this.drawingManager.setDrawingVisible(id, visible);
  }

  setDrawingLocked(id: string, locked: boolean): void {
    this.drawingManager.setDrawingLocked(id, locked);
  }

  /** Show or hide several drawings (a selection, say) as one undo step. */
  setDrawingsVisible(ids: readonly string[], visible: boolean): void {
    this.drawingManager.setDrawingsVisible(ids, visible);
  }

  /** Lock or unlock several drawings as one undo step. */
  setDrawingsLocked(ids: readonly string[], locked: boolean): void {
    this.drawingManager.setDrawingsLocked(ids, locked);
  }

  clearDrawings(): void {
    this.drawingManager.clearDrawings();
    this.dropOrphanDrawingAlerts();
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

  /** Select a drawing (and the rest of its group); false for one it can't (unknown, hidden). */
  selectDrawing(id: string): boolean {
    const ok = this.drawingManager.select(id);
    if (ok) this.engine.requestRender();
    return ok;
  }

  getUndoRedoState(): { canUndo: boolean; canRedo: boolean } {
    return this.undoRedoManager.getState();
  }

  /**
   * Put a change of yours in the chart's undo history, with its drawings and
   * indicators: undo (Ctrl/Cmd+Z) calls `undo`, redo calls `redo`. Call it
   * after making the change. Changes about the same `subject` close together
   * merge into one step (a colour dragged across a picker). Ignored when
   * `features.drawingUndoRedo` is off.
   */
  recordUndo(step: { undo: () => void; redo: () => void; subject?: string }): void {
    if (!this.features.drawingUndoRedo || typeof step?.undo !== 'function' || typeof step.redo !== 'function') return;
    const at = performance.now();
    const last = this.undoRedoManager.last();
    if (step.subject !== undefined && last?.type === 'custom' && last.custom?.subject === step.subject && at - last.custom.at < INDICATOR_EDIT_MERGE_MS) {
      // Undo goes back to before the burst; redo to its end.
      this.undoRedoManager.replaceLast({ ...last, custom: { undo: last.custom.undo, redo: step.redo, subject: step.subject, at } });
      return;
    }
    this.undoRedoManager.push({ type: 'custom', before: null, after: null, custom: { undo: step.undo, redo: step.redo, subject: step.subject, at } });
  }

  // --- Drawing magnet ---

  /** The weak magnet on or off. Ignored (stays off) when `features.drawingMagnet` is false. */
  setDrawingMagnet(enabled: boolean): void {
    this.setDrawingMagnetMode(enabled ? 'weak' : 'off');
  }

  /** Whether a magnet (weak or strong) is on. */
  getDrawingMagnet(): boolean {
    return this.drawingManager.getMagnetMode() !== 'none';
  }

  /**
   * Snap new anchors to the bar's open, high, low or close: 'weak' when the
   * pointer is near one, 'strong' always. Stays off when
   * `features.drawingMagnet` is false.
   */
  setDrawingMagnetMode(mode: 'off' | 'weak' | 'strong'): void {
    const on = this.features.drawingMagnet && mode !== 'off';
    this.drawingManager.setMagnetMode(!on ? 'none' : mode === 'strong' ? 'strong' : 'magnet');
  }

  getDrawingMagnetMode(): 'off' | 'weak' | 'strong' {
    const mode = this.drawingManager.getMagnetMode();
    return mode === 'none' ? 'off' : mode === 'strong' ? 'strong' : 'weak';
  }

  // --- Right-click and the "+" by the price axis ---

  /** The price and bar time at a right-click, as far as its area has them. */
  private contextAt(area: import('@tradecanvas/commons').ChartContextArea, pos: { x: number; y: number }): import('@tradecanvas/commons').ChartContextMenuPayload {
    const vs = { ...this.viewport.getState(), data: this.getDisplayData() };
    const payload: import('@tradecanvas/commons').ChartContextMenuPayload = { area, x: pos.x, y: pos.y };
    if (area === 'plot' || area === 'priceAxis') payload.price = yToPrice(pos.y, vs);
    if ((area === 'plot' || area === 'timeAxis') && vs.data.length > 0) payload.time = xToTime(pos.x, vs);
    if (area === 'pane') {
      const pane = this.getIndicatorPanes().find((p) => pos.y >= p.rect.y && pos.y <= p.rect.y + p.rect.height);
      if (pane) payload.pane = pane.instanceId;
    }
    return payload;
  }

  /** Show or hide the "+" by the price axis (`features.priceAxisAddButton`). */
  setPriceAxisAddButton(visible: boolean): void {
    this.features.priceAxisAddButton = visible;
    this.priceAxisAddButton.setEnabled(visible && this.features.crosshair);
    this.engine.requestRender(LayerType.Overlay);
  }

  // --- Eraser and zoom area ---

  /**
   * The eraser: while on, clicking a drawing removes it (each one undoable).
   * Picking a drawing tool or pressing Escape turns it off. `toolModeChange`
   * reports `{ eraser }`.
   */
  setEraserMode(on: boolean): void {
    if (on) this.setZoomAreaMode(false);
    this.drawingManager.setEraser(on && this.features.drawings);
  }

  isEraserMode(): boolean {
    return this.drawingManager.isEraser();
  }

  /**
   * The zoom-area tool: the next drag draws a box and the chart zooms to its
   * bars; then it turns itself off. `toolModeChange` reports `{ zoomArea }`.
   */
  setZoomAreaMode(on: boolean): void {
    if (on === this.zoomAreaMode) return;
    this.zoomAreaMode = on;
    if (on) {
      this.drawingManager.setEraser(false);
      this.drawingManager.setActiveTool(null);
    }
    this.interactionManager?.setZoomAreaMode(on);
    this.eventBus.emit('toolModeChange', { zoomArea: on });
  }

  isZoomAreaMode(): boolean {
    return this.zoomAreaMode;
  }

  /** Zoom to the bars under a box dragged in zoom-area mode. */
  private zoomToBox(box: { x0: number; x1: number }): void {
    const vs = { ...this.viewport.getState(), data: this.getDisplayData() };
    this.setVisibleRange(xToTime(box.x0, vs), xToTime(box.x1, vs));
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
  /**
   * Download the bars on screen as CSV or JSON, each indicator line in a
   * column of its own (`indicators: false` leaves them out). Does nothing
   * when `features.dataExport` is false.
   */
  exportVisibleData(format: 'csv' | 'json' = 'csv', filename?: string, options: { indicators?: boolean } = {}): void {
    if (!this.features.dataExport) return;
    this.download(format, filename, { ...options, range: 'visible' });
  }

  /** `exportVisibleData` for every bar loaded. Does nothing when `features.dataExport` is false. */
  exportAllData(format: 'csv' | 'json' = 'csv', filename?: string, options: { indicators?: boolean } = {}): void {
    if (!this.features.dataExport) return;
    this.download(format, filename, { ...options, range: 'all' });
  }

  /**
   * The bars and their indicator lines, one column per line named as the
   * legend names it ("SMA 20", "MACD 12 26 9 Signal"): every bar loaded, or
   * those on screen (`range: 'visible'`).
   */
  getExportData(options: { range?: 'all' | 'visible'; indicators?: boolean } = {}): { bars: OHLCBar[]; columns: ExportColumn[] } {
    const data = this.dataManager.getData();
    let from = 0;
    let to = data.length - 1;
    if (options.range === 'visible') {
      const { visibleRange } = this.viewport.getState();
      from = Math.max(0, visibleRange.from);
      to = Math.min(data.length - 1, visibleRange.to);
    }
    const bars = data.slice(from, to + 1);
    if (options.indicators === false) return { bars, columns: [] };
    const columns: ExportColumn[] = [];
    for (const ind of this.indicatorEngine.getActiveIndicators()) {
      const series = this.indicatorEngine.getOutput(ind.instanceId)?.series;
      if (!series) continue;
      const name = indicatorChipLabel(ind.id, ind.params, ind.descriptor.defaultConfig, ind.descriptor.shortName);
      const plots = ind.descriptor.plots ?? Object.keys(series.find((p) => p) ?? {}).map((key) => ({ key, title: key }));
      for (const plot of plots) {
        const title = plots.length > 1 ? ` ${plot.title ?? plot.key}` : '';
        columns.push({ name: `${name}${title}`, values: bars.map((_, i) => series[from + i]?.[plot.key] ?? null) });
      }
    }
    // Two alike (an SMA 20 on the close and one on RSI) get a number each, so no column is lost.
    const seen = new Map<string, number>();
    for (const column of columns) {
      const count = (seen.get(column.name) ?? 0) + 1;
      seen.set(column.name, count);
      if (count > 1) column.name = `${column.name} (${count})`;
    }
    return { bars, columns };
  }

  /** `getExportData` as CSV or JSON text. */
  getExportText(format: 'csv' | 'json' = 'csv', options: { range?: 'all' | 'visible'; indicators?: boolean } = {}): string {
    const { bars, columns } = this.getExportData(options);
    return format === 'json' ? DataExporter.toJSON(bars, columns) : DataExporter.toCSV(bars, columns);
  }

  private download(format: 'csv' | 'json', filename: string | undefined, options: { range: 'all' | 'visible'; indicators?: boolean }): void {
    const text = this.getExportText(format, options);
    if (format === 'json') DataExporter.download(text, filename ?? 'chart-data.json', 'application/json');
    else DataExporter.download(text, filename ?? 'chart-data.csv', 'text/csv');
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

  /** Something a saved layout holds changed: auto-save it, and say so. */
  private markStateChanged(): void {
    this.scheduleAutoSave();
    this.announceStateChange();
  }

  private announceStateChange(): void {
    if (this.eventBus.hasListeners('stateChange')) this.eventBus.emit('stateChange', {});
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
    this.recordIndicators(instanceId, () => this.setIndicatorVisibleNow(instanceId, visible));
  }

  private setIndicatorVisibleNow(instanceId: string, visible: boolean): void {
    if (this.indicatorEngine.setVisible(instanceId, visible) !== null) {
      this.updateViewportAndRender();
      this.markStateChanged();
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
    this.recordIndicators(instanceId, () => this.updateIndicatorStyleNow(instanceId, style));
  }

  private updateIndicatorStyleNow(instanceId: string, style: { colors?: string[]; lineWidths?: number[]; opacity?: number }): void {
    this.indicatorEngine.updateIndicatorStyle(instanceId, style);
    this.engine.requestRender();
    this.markStateChanged();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'style' });
  }

  // --- Trading ---

  setOrders(orders: TradingOrder[]): void {
    if (!this.features.trading) return;
    this.tradingManager.setOrders(orders);
    this.eventBus.emit('ordersChange', { orders });
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
    this.eventBus.emit('positionsChange', { positions });
  }

  /** The working orders on the chart (`setOrders`, or the execution adapter's). */
  getOrders(): TradingOrder[] {
    return this.tradingManager.getOrders();
  }

  /** The open positions on the chart (`setPositions`, or the execution adapter's). */
  getPositions(): TradingPosition[] {
    return this.tradingManager.getPositions();
  }

  /** Fills marked on the chart, oldest first: the execution adapter's, or `addFill`'s. */
  getFills(): import('@tradecanvas/commons').FillEvent[] {
    return this.tradingManager.getFills();
  }

  /** The P&L the fills realised since the last `clearFills`, all of them (the marks keep the latest 1000). */
  getRealisedPnl(): number {
    return this.tradingManager.getRealisedPnl();
  }

  /** Mark a fill on the chart (without an execution adapter, a host reports its own). */
  addFill(fill: import('@tradecanvas/commons').FillEvent): void {
    if (!this.features.trading) return;
    this.tradingManager.addFill(fill);
    this.eventBus.emit('executionFill', fill);
  }

  clearFills(): void {
    this.tradingManager.setFills([]);
  }

  /**
   * Ask for an order to be cancelled: emits `orderCancel`, which an execution
   * adapter carries out (as the × on the order's line does).
   */
  cancelOrderIntent(orderId: string): void {
    if (this.features.trading) this.eventBus.emit('orderCancel', { orderId });
  }

  /** Ask for a position to be closed: emits `positionClose`. */
  closePositionIntent(positionId: string): void {
    if (this.features.trading) this.eventBus.emit('positionClose', { positionId });
  }

  /** Ask for a position to be reversed (closed, then the same size the other way): emits `positionReverse`. */
  reversePositionIntent(positionId: string): void {
    if (this.features.trading) this.eventBus.emit('positionReverse', { positionId });
  }

  /** Ask for a position's stop-loss or take-profit to change (null removes it): emits `positionModify`. */
  modifyPositionIntent(intent: import('@tradecanvas/commons').PositionModifyIntent): void {
    if (this.features.trading) this.eventBus.emit('positionModify', intent);
  }

  setDepthData(depth: DepthData | null): void {
    if (!this.features.trading) return;
    this.tradingManager.setDepthData(depth);
  }

  setCurrentPrice(price: number, _pulseColor?: string): void {
    this.followLivePrice(price);
    if (this.replaySession) {
      // During a replay the price line shows the replayed close; the live
      // price comes back with replayStop(). Orders and alerts stay live.
      this.replaySession.price = { price };
    } else {
      // Also update standalone price line (visible even without trading feature)
      this.currentPriceLine.setPrice(price);
      this.scheduleRender();
    }
  }

  /** Whether a paper account trades on the replay (it takes a mark price) rather than on the live price. */
  private replayTrades(): boolean {
    return this.replaySession !== null && this.executionAdapter?.setMarkPrice !== undefined;
  }

  /** The orders and the alerts follow a live price (a paper account in a replay follows the replay). */
  private followLivePrice(price: number): void {
    if (!this.replayTrades()) this.tradingManager.setCurrentPrice(price);
    if (this.features.alerts) this.checkAlerts(price);
  }

  /**
   * Alerts against a live price, and against the indicator lines they watch,
   * all as of the same moment (a line crossing another compares like with
   * like). During a replay they keep watching the live market: the bars are
   * the live ones, and indicator lines — computed on the replayed bars — wait.
   */
  private checkAlerts(price: number): void {
    const live = this.replaySession ? this.replaySession.live.getData() : this.dataManager.getData();
    this.alertManager.setBarTime(live.length > 0 ? live[live.length - 1].time : null);
    const values = new Map<string, number>([['price', price]]);
    if (!this.replaySession) this.collectIndicatorValues(values);
    // A line against a line only with both of this moment (not during a replay).
    this.alertManager.checkChannels(values, { together: true });
    this.alertManager.checkDrawings(price);
  }

  /**
   * The latest values of the indicator lines alerts watch or compare with.
   * Channel format: `<instanceId>:<key>`; instanceIds are `tc_<id>_<n>` and
   * built-in keys are colon-free, so the first colon splits them. Values come
   * from the recalculated series, so indicator alerts evaluate at bar cadence
   * (the live intrabar tick doesn't repaint closed-bar indicator values).
   * Cheap — only walks alerts whose channel isn't `'price'`, usually none.
   */
  private collectIndicatorValues(into: Map<string, number>): void {
    const data = this.dataManager.getData();
    if (data.length === 0) return;
    const lastIdx = data.length - 1;
    const channels = this.alertManager.getAlerts().flatMap((a) => (a.target ? [a.channel, a.target] : [a.channel]));
    for (const channel of channels) {
      if (into.has(channel)) continue;
      const sep = channel.indexOf(':');
      if (sep < 0) continue;
      const point = this.indicatorEngine.getOutput(channel.slice(0, sep))?.series?.[lastIdx];
      const value = point?.[channel.slice(sep + 1)];
      if (typeof value === 'number' && Number.isFinite(value)) into.set(channel, value);
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
    if (!servesTimeframe(config.adapter, config.timeframe)) {
      throw new RangeError(`${config.adapter.name} cannot serve the ${config.timeframe} timeframe`);
    }
    this.snapshotKey = null;
    // Back to the live series first, so a failed history load can't leave
    // the replayed slice on screen.
    this.replayStop();
    this.disconnectStream();

    this.streamManager = new StreamManager();

    this.streamManager.on('snapshot', (bars) => {
      const key = `${this.currentSymbol}|${this.streamTimeframe}`;
      if (this.replaySession) {
        this.replaySession.live.setData(bars);
      } else if (key === this.snapshotKey && this.dataManager.getLength() > 0) {
        this.mergeSnapshot(bars); // a reconnect: keep the paged-in history and the view
      } else {
        this.setData(bars);
      }
      this.snapshotKey = key;
      this.useStreamHistory(config.adapter, config.historyPageSize);
    });

    // Each bar lands by its time: the last bar again (its latest values, a
    // close included), a new one after it, or none when it is older.
    this.streamManager.on('barClose', (bar) => {
      if (this.replaySession) {
        this.replaySession.live.appendBar(bar);
        return;
      }
      const how = barPlacement(this.fullSeries ?? this.dataManager.getData(), bar);
      if (how === 'stale' || !this.takeBar(bar, how)) return;
      const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
      if (!this.placeStreamBar(bar)) return;
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
      this.currentPriceLine.setPrice(bar.close);
      const how = barPlacement(this.fullSeries ?? this.dataManager.getData(), bar);
      if (how === 'stale' || !this.takeBar(bar, how) || !this.placeStreamBar(bar)) {
        this.scheduleRender();
        return;
      }
      // Recalculate indicators so panel/overlay series track the forming bar
      // instead of freezing until bar close — incrementally, since only the
      // last bar changed.
      const data = this.dataManager.getData();
      this.recalcIndicatorsFrom(data, data.length - 1);
      this.scheduleRender();
    });

    this.setBidAsk(null); // the last symbol's quote
    // A tick may carry one side only: the other stays.
    this.streamManager.on('quote', (quote) => {
      const now = this.priceLines.getBidAsk();
      this.setBidAsk({ bid: quote.bid ?? now?.bid, ask: quote.ask ?? now?.ask });
    });

    this.streamManager.on('priceChange', ({ price, previousClose }) => {
      // Orders and alerts keep tracking the live market during a replay; the
      // price line shows the replayed close instead.
      this.followLivePrice(price);
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
    this.setStreamTarget(config.symbol, config.timeframe);
    this.streamAdapter = config.adapter;

    const manager = this.streamManager;
    this.resolveStreamSymbol(config.adapter, config.symbol);
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

  /** The stream's symbol and timeframe, told when they change. */
  private setStreamTarget(symbol: string, timeframe: TimeFrame): void {
    const previousSymbol = this.announcedSymbol;
    const previousTimeframe = this.announcedTimeframe;
    this.currentSymbol = symbol;
    this.streamTimeframe = timeframe;
    if (symbol !== previousSymbol) {
      this.announcedSymbol = symbol;
      this.eventBus.emit('symbolChange', { symbol, previous: previousSymbol });
    }
    if (timeframe !== previousTimeframe) {
      this.announcedTimeframe = timeframe;
      this.eventBus.emit('timeframeChange', { timeframe, previous: previousTimeframe });
    }
  }

  /**
   * Switch symbol or timeframe on an active stream without full reconnect.
   */
  async switchStream(symbol: string, timeframe: TimeFrame): Promise<void> {
    if (!this.streamManager) return;
    const adapter = this.streamAdapter;
    if (adapter && !servesTimeframe(adapter, timeframe)) {
      throw new RangeError(`${adapter.name} cannot serve the ${timeframe} timeframe`);
    }
    this.setStreamTarget(symbol, timeframe);
    // Until the new series is in, a page would be the new symbol's bars in
    // front of the old one's.
    if (this.historyFromStream) this.history.setLoader(null);
    this.barCountdown.setTimeframeMs(timeframeToMs(timeframe));
    if (adapter) this.resolveStreamSymbol(adapter, symbol);
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
    this.symbolInfoSeq++; // a lookup still on its way no longer applies
    this.priceLines.setBidAsk(null);
    if (this.streamManager) {
      this.streamManager.dispose();
      this.streamManager = null;
    }
    if (this.historyFromStream) {
      this.history.setLoader(null);
      this.historyFromStream = false;
    }
    this.streamAdapter = null;
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
      onFill: (fill) => {
        this.tradingManager.addFill(fill);
        this.eventBus.emit('executionFill', fill);
      },
      getPositions: () => this.tradingManager.getPositions(),
    });
    Promise.resolve(adapter.connect(config)).catch((cause) =>
      this.eventBus.emit('executionError', { message: 'Execution connect failed', cause }),
    );
  }

  /** Tear down the active execution adapter (if any) and stop routing intents. */
  disconnectExecution(): void {
    this.returnMarkToLive();
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
    // They count in the auto scale.
    this.updateViewportAndRender();
  }

  removeCompareSymbol(id: string): void {
    this.compareRenderer.removeSymbol(id);
    this.updateViewportAndRender();
  }

  updateCompareData(id: string, data: DataSeries): void {
    this.compareRenderer.setSymbolData(id, data);
    this.updateViewportAndRender();
  }

  setCompareMode(mode: 'percent' | 'absolute'): void {
    this.compareRenderer.setMode(mode);
    this.updateViewportAndRender();
  }

  clearCompareSymbols(): void {
    this.compareRenderer.clear();
    this.updateViewportAndRender();
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
    const startMs = rangePresetStart(preset, data[last].time * unit, this.displayTz);
    const start = startMs === null ? null : startMs / unit;
    if (start === null || start < data[0].time) {
      this.fitContent();
      return;
    }
    // The first bar after `start`, so "1D" on 1-minute bars is 1440 bars, not
    // 1441; YTD starts on the year's first bar, the one at 1 January 00:00.
    const at = timestampToBarIndex(start, data);
    const first = Math.min(last, preset === 'YTD' ? Math.ceil(at) : Math.floor(at) + 1);
    this.viewport.zoomToBarRange(first, last + this.viewport.getRightMargin());
    this.viewport.scrollToEnd();
    this.updateViewportAndRender();
  }

  scrollToEnd(): void {
    this.viewport.scrollToEnd();
    this.updateViewportAndRender();
  }

  /** Scroll by `bars` bars: later for a positive count, earlier for a negative one. */
  scrollBars(bars: number): void {
    if (!Number.isFinite(bars) || bars === 0) return;
    const { barWidth, barSpacing } = this.viewport.getState();
    this.viewport.scrollBy(bars * (barWidth + barSpacing));
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
    this.markStateChanged();
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
   * The timezone for the time axis, crosshair, tooltip, day breaks and range
   * presets: an IANA zone (`'America/New_York'`, daylight saving included), a
   * fixed offset in minutes east of UTC (`-300`, `330`), or null for the
   * browser's. Throws a RangeError for a zone the browser doesn't know.
   */
  setTimezone(tz: TimeZoneSetting): void {
    assertTimezone(tz);
    this.timezoneSetting = tz;
    this.applyTimezone();
  }

  /** What `setTimezone` was given — `'exchange'` included. */
  getTimezone(): TimeZoneSetting {
    return this.timezoneSetting;
  }

  /** The zone the chart shows: `'exchange'` resolved to the symbol's zone (UTC when unknown). */
  getEffectiveTimezone(): TimeZoneSetting {
    return this.displayTz;
  }

  private applyTimezone(): void {
    const exchange = this.symbolInfo?.timezone;
    const tz = this.timezoneSetting === EXCHANGE_TIMEZONE
      ? (exchange && isValidTimeZone(exchange) ? exchange : 'UTC')
      : this.timezoneSetting;
    this.displayTz = tz;
    this.timeAxis.setTimezoneOffset(tz);
    this.crosshairHandler.setTimezoneOffset(tz);
    this.crosshairTooltip.setTimezoneOffset(tz);
    this.pinnedTooltip.setTimezone(tz);
    this.sessionBreaks.setTimezone(tz);
    this.engine.requestRender();
  }

  // --- Symbol info ---

  /**
   * What is known about the symbol on the chart — usually from the stream's
   * adapter (`resolveSymbol`), which a connected chart asks by itself. Its
   * price precision applies unless `setMarket` set one; its zone backs
   * `setTimezone('exchange')`; its hours feed the session shading.
   */
  setSymbolInfo(info: SymbolInfo | null): void {
    this.symbolInfo = info ? { ...info, sessions: info.sessions?.map((session) => ({ ...session })) } : null;
    if (this.marketConfig?.pricePrecision === undefined) {
      this.applyPricePrecision(this.symbolInfo?.pricePrecision ?? null);
    }
    const windows = (this.symbolInfo?.sessions ?? []).flatMap((session) => {
      const startMinute = sessionMinute(session.start);
      const endMinute = sessionMinute(session.end);
      return startMinute === null || endMinute === null ? [] : [{ startMinute, endMinute }];
    });
    const zone = this.symbolInfo?.timezone;
    // A symbol without hours of its own goes back to the host's.
    this.sessionShading.replaceConfig(windows.length > 0 && zone && isValidTimeZone(zone)
      ? { timeZone: zone, windows, startMinute: windows[0].startMinute, endMinute: windows[windows.length - 1].endMinute }
      : this.hostSessionHours);
    if (this.timezoneSetting === EXCHANGE_TIMEZONE) this.applyTimezone();
    this.reapplyExtendedHours();
    this.updateViewportAndRender();
    this.eventBus.emit('symbolInfoChange', { info: this.symbolInfo });
  }

  getSymbolInfo(): SymbolInfo | null {
    return this.symbolInfo;
  }

  /** Ask the stream's adapter about `symbol`, if it can tell; a late answer about another symbol is dropped. */
  private resolveStreamSymbol(adapter: DataAdapter, symbol: string): void {
    const resolve = adapter.resolveSymbol?.bind(adapter);
    if (!resolve) return;
    const seq = ++this.symbolInfoSeq;
    if (this.symbolInfo && this.symbolInfo.symbol !== symbol) this.setSymbolInfo(null);
    // Taken as a promise: an adapter may throw, or answer without one.
    Promise.resolve().then(() => resolve(symbol)).then(
      (info) => {
        // No answer leaves what the host set for the symbol, if anything.
        if (info && seq === this.symbolInfoSeq && this.currentSymbol === symbol) this.setSymbolInfo(info);
      },
      (err: unknown) => {
        // Only the symbol's details are missing; the feed itself is fine.
        if (seq === this.symbolInfoSeq) console.warn(`No symbol info for "${symbol}":`, err);
      },
    );
  }

  /** `setTimezone` with a fixed offset in minutes east of UTC, or null for the browser's zone. */
  setTimezoneOffset(minutes: number | null): void {
    this.setTimezone(minutes);
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
  setSessionShadingConfig(config: Partial<SessionHoursConfig>): void {
    // The host's hours win over the symbol's, until the next symbol brings its own.
    this.hostSessionHours = mergeSessionHours(this.hostSessionHours, config);
    this.sessionShading.replaceConfig(this.hostSessionHours);
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

  /**
   * Add an alert on `channel` (`'price'`, or an indicator line
   * `'<instanceId>:<key>'`) at `price`. `options` compare with another line
   * instead (`target`), measure a move (`movesUp` / `movesDown` with
   * `percent` and `bars`), look only at closed bars (`onBarClose`), or end it
   * (`expiresAt`). Throws a RangeError for options that don't fit together.
   */
  addAlert(
    price: number,
    condition: import('@tradecanvas/core').AlertCondition = 'crossing',
    message?: string,
    channel = 'price',
    label?: string,
    options: import('@tradecanvas/core').AlertOptions = {},
  ): string | null {
    if (!this.features.alerts) return null;
    const id = this.alertManager.addAlert(price, condition, message, false, channel, label, options);
    this.markStateChanged();
    return id;
  }

  removeAlert(id: string): void {
    this.alertManager.removeAlert(id);
    this.markStateChanged();
  }

  // --- Drawing order and groups ---

  /** Ids of the selected drawings, the one clicked last first. */
  getSelectedDrawingIds(): string[] {
    return this.drawingManager.getSelectedDrawingIds();
  }

  /** Draw a drawing on top of the others, under them, or one step up or down. False when already there. */
  moveDrawing(id: string, to: DrawingOrderMove): boolean {
    const moved = this.drawingManager.moveDrawing(id, to);
    if (moved) this.markStateChanged();
    return moved;
  }

  /** Group drawings (two or more): they are then selected, hidden and locked together. Returns the group id. */
  groupDrawings(ids: readonly string[], name?: string): string | null {
    const group = this.drawingManager.groupDrawings(ids, name);
    if (group) this.markStateChanged();
    return group;
  }

  ungroupDrawings(groupId: string): boolean {
    return this.afterDrawingChange(this.drawingManager.ungroup(groupId));
  }

  renameDrawingGroup(groupId: string, name: string): boolean {
    return this.afterDrawingChange(this.drawingManager.renameGroup(groupId, name));
  }

  setDrawingGroupVisible(groupId: string, visible: boolean): boolean {
    return this.afterDrawingChange(this.drawingManager.setGroupVisible(groupId, visible));
  }

  setDrawingGroupLocked(groupId: string, locked: boolean): boolean {
    return this.afterDrawingChange(this.drawingManager.setGroupLocked(groupId, locked));
  }

  /** Every drawing group, its drawings bottom to top. */
  getDrawingGroups(): { id: string; name: string; ids: string[] }[] {
    return this.drawingManager.getGroups();
  }

  private afterDrawingChange(changed: boolean): boolean {
    if (changed) this.markStateChanged();
    return changed;
  }

  /** Whether a drawing has lines an alert can cross (trend lines, rays, horizontals, channels). */
  canAddDrawingAlert(drawingId: string): boolean {
    return this.features.alerts && this.drawingLevelsNow(drawingId) !== null;
  }

  /**
   * Where a drawing's lines are at the latest bar, as drawn on the chart's
   * scale; null when it has none there (a trend line that ends before it).
   */
  private drawingLevelsNow(drawingId: string): number[] | null {
    // Alerts watch the live market, during a replay too.
    const data = this.replaySession ? this.replaySession.live.getData() : this.getDisplayData();
    if (data.length === 0) return null;
    const viewport = { ...this.viewport.getState(), data };
    return this.drawingManager.priceAt(drawingId, data[data.length - 1].time, viewport);
  }

  /**
   * A drawing's alerts go with it, and come back with it when an undo
   * brings the drawing back.
   */
  private followDrawingAlerts(event: string, drawingId: string | undefined): void {
    if (!drawingId || !this.alertManager) return;
    if (event === 'drawingRemove') {
      const taken = this.alertManager.takeDrawingAlerts(drawingId);
      if (taken.length > 0) this.removedDrawingAlerts.set(drawingId, taken);
    } else if (event === 'drawingCreate') {
      const back = this.removedDrawingAlerts.get(drawingId);
      if (!back) return;
      this.removedDrawingAlerts.delete(drawingId);
      this.alertManager.restoreAlerts(back);
    }
  }

  /** Remove alerts on drawings no longer on the chart (drawings replaced or cleared). */
  private dropOrphanDrawingAlerts(): void {
    this.removedDrawingAlerts.clear();
    if (!this.alertManager) return;
    const removed = this.alertManager.pruneDrawingAlerts(new Set(this.drawingManager.getDrawings().map((d) => d.id)));
    if (removed > 0) this.markStateChanged();
  }

  /**
   * Alert when the price crosses a drawing's line(s): a trend line where it
   * is at the latest bar, any line of a channel. Removed with the drawing.
   * Null when the drawing has no line to cross.
   */
  addDrawingAlert(
    drawingId: string,
    options: { condition?: 'crossing' | 'crossingUp' | 'crossingDown'; message?: string; repeating?: boolean; label?: string } = {},
  ): string | null {
    if (!this.canAddDrawingAlert(drawingId)) return null;
    const id = this.alertManager.addDrawingAlert(drawingId, options.condition ?? 'crossing', options.message, options.repeating ?? false, options.label);
    this.markStateChanged();
    return id;
  }

  getAlerts(): import('@tradecanvas/core').PriceAlert[] {
    return this.alertManager.getAlerts();
  }

  clearAlerts(): void {
    this.alertManager.clearAlerts();
    this.markStateChanged();
  }

  saveAlerts(key: string): void {
    this.alertManager.saveToStorage(key);
  }

  /** Load alerts saved with `saveAlerts`. Alerts on drawings that aren't on the chart are dropped. */
  loadAlerts(key: string): void {
    this.alertManager.loadFromStorage(key);
    this.alertManager.pruneDrawingAlerts(new Set(this.drawingManager.getDrawings().map((d) => d.id)));
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
   *
   * With `steps` (finer bars), each step grows the forming bar from them.
   * A connected execution adapter that takes a mark price (a paper one)
   * trades on the replayed price and time.
   */
  replayStart(config?: Partial<import('@tradecanvas/core').ReplayConfig>): void {
    if (!this.features.replay) return;
    this.history.reset();
    if (!this.replaySession) {
      if (this.dataManager.getLength() === 0) return; // nothing to replay
      const live = new DataManager();
      live.setData(this.fullSeries ?? this.dataManager.getData());
      this.replaySession = { live, price: null, fedTime: null };
    }
    // Replay the live series as it stands now (a restart includes bars that
    // arrived during the previous run).
    const coarse = this.shownBars(this.replaySession.live.getData());
    const { steps: rawSteps, ...playConfig } = config ?? {};
    const steps = rawSteps ? replaySteps(rawSteps, coarse) : null;
    this.replayStepsSeries = steps;
    this.replayCoarse = coarse;
    // A replay fits each step; a price-axis drag from before shouldn't pin it.
    this.options.autoScale = true;
    // Loading stops the run before: that is a restart, not the replay ending.
    this.replayRestarting = true;
    try {
      this.replayManager.load(steps ?? coarse);
    } finally {
      this.replayRestarting = false;
    }
    if (steps && playConfig.startIndex !== undefined) playConfig.startIndex = lastStepOfBar(steps, coarse, playConfig.startIndex);
    // Each replayStart used to stack another 'bar' listener, so a restarted
    // replay ran every step once per previous start.
    this.replayBarUnsub?.();
    let loaded = -1; // bars of `coarse` shown, as of the last step (the forming one included)
    let lastStep = -1;
    let forming: OHLCBar | null = null;
    const series = steps ?? coarse;
    this.replayBarUnsub = this.replayManager.on('bar', ({ index }) => {
      // Which bar of the chart's series forms now, and how it looks.
      let barIndex = index;
      let shownBar: OHLCBar = coarse[index];
      if (steps) {
        const step = steps[index];
        barIndex = barAt(coarse, step.time);
        const sameBar = forming !== null && lastStep === index - 1 && barIndex === loaded - 1;
        forming = sameBar && forming ? mergeBar(forming, step) : formingBar(coarse[barIndex], steps, index);
        shownBar = forming;
      }
      lastStep = index;
      const nextLen = barIndex + 1;
      const forward = loaded > 0 && nextLen >= loaded && this.dataManager.getLength() === loaded;
      // Like live data: a replay step follows the newest bar while the view
      // rests at the end, and leaves it alone while the user looks at history.
      // The first step and any seek (back or forward) show the replay
      // position. (Read before the new bars land: `isAtEnd` compares against
      // the old length.)
      const stepForward = forward && !this.replaySeeking;
      const follow = !stepForward || (this.autoScrollOnNewBar && this.viewport.isAtEnd());
      if (forward) {
        // Forward: the bar that was forming closes as it is in the series, the
        // newly revealed bars are appended, and indicators update from there.
        if (steps && nextLen > loaded) this.dataManager.updateLastBar(coarse[loaded - 1]);
        for (let j = loaded; j < nextLen - 1; j++) this.dataManager.appendBar(coarse[j]);
        if (nextLen > loaded) this.dataManager.appendBar(shownBar);
        else this.dataManager.updateLastBar(shownBar);
        this.recalcIndicatorsFrom(this.dataManager.getData(), Math.max(0, loaded - 1));
      } else {
        // First step, or a seek: reload the prefix.
        this.dataManager.setData([...coarse.slice(0, barIndex), shownBar]);
        this.recalcIndicators(this.dataManager.getData());
      }
      loaded = nextLen;
      // The price line follows the replay, not the live market.
      this.currentPriceLine.setPrice(shownBar.close, barIndex > 0 ? coarse[barIndex - 1].close : undefined);
      this.crosshairHandler.setData(this.dataManager.getData());
      // The display cache isn't keyed to the data array — without this the
      // chart kept drawing the pre-replay series.
      this.displayDataCache = null;
      this.updateViewportAndRender(follow);
      this.feedReplaySteps(series, index);
      // Up to when it has shown: the next step's time (past the last one, its spacing on).
      const next = series[index + 1]?.time;
      const until = next ?? series[index].time + (index > 0 ? series[index].time - series[index - 1].time : 0);
      this.eventBus.emit('replayStep', { barIndex, time: coarse[barIndex].time, until });
    });
    this.replayManager.play(playConfig);
  }

  /** Jump the replay to show the bars (or finer steps) that opened before `time`. */
  replaySeekToTime(time: number): void {
    if (!this.replaySession || !this.replayCoarse) return;
    const series = this.replayStepsSeries ?? this.replayCoarse;
    let lo = 0;
    let hi = series.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (series[mid].time < time) lo = mid;
      else hi = mid - 1;
    }
    this.replaySeek(lo);
  }

  /** A replay step's price to an adapter that takes a mark (a paper account), and to the orders on the chart. */
  private feedReplayPrice(price: number, time?: number): void {
    const adapter = this.executionAdapter;
    if (!adapter?.setMarkPrice) return;
    adapter.setMarkPrice(price, time);
    this.tradingManager.setCurrentPrice(price);
  }

  /** A paper account trading on the replay goes back to the live price (the orders too), and its fills to the clock. */
  private returnMarkToLive(): void {
    const session = this.replaySession;
    if (!session || !this.replayTrades()) return;
    const live = session.live.getData();
    const price = session.price?.price ?? live[live.length - 1]?.close;
    if (price !== undefined) this.feedReplayPrice(price);
  }

  /**
   * A paper account trades on the replayed prices and times, forward only:
   * it gets every step past the latest time it has seen (a jump ahead passes
   * them all, a long one in chunks), and nothing after a seek back or a
   * restart from an earlier bar until the replay is past that time again.
   */
  private feedReplaySteps(series: DataSeries, index: number): void {
    const session = this.replaySession;
    const adapter = this.executionAdapter;
    const bar = series[index];
    if (!session || !adapter?.setMarkPrice || !bar) return;
    if (session.fedTime === null) {
      // The start: the account's mark is where the replay begins.
      session.fedTime = bar.time;
      this.feedReplayPrice(bar.close, bar.time);
      return;
    }
    if (bar.time <= session.fedTime) return;
    const run = series.slice(firstAfter(series, session.fedTime), index + 1);
    session.fedTime = bar.time;
    const size = Math.ceil(run.length / MAX_REPLAY_CHUNKS);
    for (let i = 0; i < run.length; i += size) {
      for (const [price, time] of replayMarks(run.slice(i, i + size))) adapter.setMarkPrice(price, time);
    }
    this.tradingManager.setCurrentPrice(bar.close);
  }

  /**
   * The bar of the chart's series the replay is on (the forming one), or -1
   * without a replay.
   */
  getReplayBarIndex(): number {
    if (!this.replaySession) return -1;
    const { current } = this.replayManager.getProgress();
    const steps = this.replayStepsSeries;
    return steps && this.replayCoarse ? barAt(this.replayCoarse, steps[current]?.time ?? -Infinity) : current;
  }

  /** Jump the replay to the end of bar `barIndex` of the chart's series (a click on it). */
  replaySeekToBar(barIndex: number): void {
    const steps = this.replayStepsSeries;
    this.replaySeek(steps && this.replayCoarse ? lastStepOfBar(steps, this.replayCoarse, barIndex) : barIndex);
  }

  replayPause(): void { this.replayManager.pause(); }
  replayResume(): void { this.replayManager.resume(); }
  /** End the replay and return to the live series (with updates that arrived meanwhile). */
  replayStop(): void {
    const session = this.replaySession;
    this.endReplaySession();
    if (!session) return;
    this.loadSeries(session.live.getData(), true);
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
    this.returnMarkToLive();
    this.replaySession = null;
    this.replayStepsSeries = null;
    this.replayCoarse = null;
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
    return ChartStateManager.capture(
      {
        getDrawings: () => this.getDrawings(),
        getTheme: () => this.getTheme(),
        getAlerts: () => this.getAlerts(),
        getIndicators: () => this.getIndicatorSetup(),
      },
      { chartType: this.options.chartType, chartTypeOptions: this.getChartTypeOptions(), symbol: this.currentSymbol || undefined },
    );
  }

  /**
   * Put `list` in place of the chart's indicators (a layout, a template, an
   * undo), with their panes as they were: size, order, fold, maximise.
   * `keepIds` keeps each instance's id (an undo): the indicators still alike
   * are changed in place, not taken down and put back. Otherwise the ids are
   * new and the map says old → new.
   */
  private restoreIndicators(list: readonly SnapshotIndicator[], keepIds: boolean): Map<string, string> {
    // Hosts and sources first, so a pane member finds its pane and a reader its line.
    const ordered = dependencyOrder(list);
    const instanceIds = new Map<string, string>();
    this.unrestoredIndicators = [];
    const known = new Set(this.indicatorEngine.getAvailableIndicators().map((d) => d.id));
    const restored: [SnapshotIndicator, string][] = [];
    const kept = new Set<string>();

    if (keepIds) {
      // Take down only what differs in kind or place; the rest is edited in place.
      const wanted = new Map(ordered.map((ind) => [ind.instanceId, ind]));
      const current = this.getIndicatorSetup();
      for (const cur of current) {
        const want = wanted.get(cur.instanceId);
        if (want && sameKindAndPlace(cur, want)) kept.add(cur.instanceId);
      }
      for (const cur of current) {
        if (!kept.has(cur.instanceId)) this.removeIndicator(cur.instanceId);
      }
      // A reader taken down with its source comes back with it.
      for (const id of [...kept]) if (!this.indicatorEngine.getIndicatorConfig(id)) kept.delete(id);
    } else {
      for (const active of this.indicatorEngine.getActiveIndicators()) this.removeIndicator(active.instanceId);
    }

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

    for (const ind of ordered) {
      let instanceId: string | null = null;
      if (kept.has(ind.instanceId)) {
        instanceId = ind.instanceId;
        const params = this.indicatorEngine.getIndicatorConfig(instanceId)?.params ?? {};
        const changed: Record<string, number | string | boolean> = {};
        for (const [name, value] of Object.entries(renamed(ind.params))) if (params[name] !== value) changed[name] = value;
        if (Object.keys(changed).length > 0) this.updateIndicator(instanceId, changed);
      } else {
        const position = (['top', 'bottom', 'left', 'right'] as const).find((p) => p === ind.position) ?? 'bottom';
        try {
          if (!known.has(ind.id)) throw new Error('no such indicator is registered');
          const pane = ind.pane ? instanceIds.get(ind.pane) : undefined;
          instanceId = this.addIndicatorNow(ind.id, renamed(ind.params), position, {
            ...(pane ? { pane } : {}),
            ...(ind.scale === 'left' ? { scale: 'left' as const } : {}),
            ...(keepIds ? { instanceId: ind.instanceId } : {}),
          });
        } catch (err) {
          console.warn(`Layout indicator "${ind.id}" kept but not shown:`, err);
        }
      }
      if (!instanceId) {
        this.unrestoredIndicators.push(ind);
        continue;
      }
      instanceIds.set(ind.instanceId, instanceId);
      restored.push([ind, instanceId]);
      this.restoreLooks(instanceId, ind);
    }
    this.restorePanes(restored);
    this.updateViewportAndRender();
    return instanceIds;
  }

  /** An indicator's style, visibility and levels as `ind` has them, changing only what differs. */
  private restoreLooks(instanceId: string, ind: SnapshotIndicator): void {
    const style = this.indicatorEngine.getIndicatorStyle(instanceId);
    if (ind.style && JSON.stringify({ ...style, ...ind.style }) !== JSON.stringify(style)) this.updateIndicatorStyle(instanceId, ind.style);
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if ((ind.visible ?? true) !== (config?.visible ?? true)) this.setIndicatorVisible(instanceId, ind.visible ?? true);
    const levels = ind.levels ?? null;
    if (JSON.stringify(levels) !== JSON.stringify(config?.levels ?? null)) this.setIndicatorLevels(instanceId, levels);
  }

  /** The panes as they were: size first (it opens a fold), then fold, order, maximise. */
  private restorePanes(restored: readonly [SnapshotIndicator, string][]): void {
    for (const [ind, instanceId] of restored) {
      if (ind.paneSize !== undefined) this.layoutManager.setPanelSize(instanceId, ind.paneSize);
      if (ind.paneSize !== undefined || ind.paneCollapsed) this.layoutManager.setPanelCollapsed(instanceId, !!ind.paneCollapsed);
      if (ind.paneSize !== undefined) this.layoutManager.setPanelScale(instanceId, { log: !!ind.paneLog, invert: !!ind.paneInvert, percent: !!ind.panePercent });
    }
    const ordered = restored
      .filter(([ind]) => ind.paneOrder !== undefined)
      .sort(([a], [b]) => (a.paneOrder ?? 0) - (b.paneOrder ?? 0))
      .map(([, instanceId]) => instanceId);
    if (ordered.length > 1) this.layoutManager.orderPanels(ordered);
    const maximized = restored.find(([ind]) => ind.paneMaximized);
    this.layoutManager.setMaximizedPanel(maximized ? maximized[1] : null);
  }

  /**
   * The chart's indicators as a layout or a template keeps them: inputs,
   * style, levels, scale and panes (shared, size, order, fold, maximise).
   */
  getIndicatorSetup(): import('@tradecanvas/core').SnapshotIndicator[] {
    const panels = this.layoutManager.getPanels();
    const maximized = this.layoutManager.getMaximizedPanel();
    return [
      ...this.indicatorEngine.getActiveIndicators().map((ind) => {
        const panel = panels.find((p) => p.id === ind.instanceId);
        const config = this.indicatorEngine.getIndicatorConfig(ind.instanceId);
        return {
          id: ind.id,
          instanceId: ind.instanceId,
          params: { ...ind.params },
          position: panel?.position,
          style: this.indicatorEngine.getIndicatorStyle(ind.instanceId) ?? undefined,
          visible: ind.visible,
          levels: config?.levels?.slice(),
          pane: ind.pane,
          scale: config?.scale,
          ...(panel
            ? {
                paneSize: panel.size,
                paneOrder: panels.indexOf(panel),
                ...(panel.collapsed ? { paneCollapsed: true } : {}),
                ...(maximized === ind.instanceId ? { paneMaximized: true } : {}),
                ...(panel.logScale ? { paneLog: true } : {}),
                ...(panel.invertScale ? { paneInvert: true } : {}),
                ...(panel.percentScale ? { panePercent: true } : {}),
              }
            : {}),
        };
      }),
      ...this.unrestoredIndicators,
    ];
  }

  /**
   * Put a set of indicators (from `getIndicatorSetup`, a template) in place
   * of the chart's, as one undo step.
   */
  applyIndicatorSetup(list: readonly SnapshotIndicator[]): void {
    if (!this.features.indicators) return;
    this.recordIndicators(undefined, () => {
      const before = new Map(this.indicatorEngine.getActiveIndicators().map((a) => [a.instanceId, a.id]));
      const instanceIds = this.withoutIndicatorHistory(() => this.restoreIndicators(list, false));
      this.followIndicatorAlerts(before, [...instanceIds.values()]);
      this.markStateChanged();
    });
  }

  /**
   * Alerts on the lines of indicators that went (`before`: id → kind) move to
   * the one new indicator of the same kind (`added`), when there is just one;
   * others stay as they are, as alerts on a removed indicator do.
   */
  private followIndicatorAlerts(before: ReadonlyMap<string, string>, added: readonly string[]): void {
    if (!this.features.alerts) return;
    // A channel on a replaced indicator → the one new indicator of its kind (or null: leave it).
    const heirOf = (channel: string): string | null => {
      const sep = channel.indexOf(':');
      if (sep <= 0) return null;
      const from = channel.slice(0, sep);
      const kind = before.get(from);
      if (!kind || this.indicatorEngine.getIndicatorConfig(from)) return null;
      const heirs = added.filter((id) => this.indicatorEngine.getIndicatorConfig(id)?.id === kind);
      return heirs.length === 1 ? heirs[0] + channel.slice(sep) : null;
    };
    for (const alert of this.alertManager.getAlerts()) {
      const channel = heirOf(alert.channel);
      const target = alert.target ? heirOf(alert.target) : null;
      if (!channel && !target) continue;
      const { target: _t, percent, bars, onBarClose, expiresAt } = alert;
      this.alertManager.removeAlert(alert.id);
      this.alertManager.addAlert(alert.price, alert.condition, alert.message, alert.repeating, channel ?? alert.channel, alert.label, {
        ...(alert.target ? { target: target ?? alert.target } : {}),
        ...(percent !== undefined ? { percent } : {}),
        ...(bars !== undefined ? { bars } : {}),
        ...(onBarClose ? { onBarClose } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
      });
    }
  }

  /** Run `change` without recording undo steps for the indicators it changes. */
  private withoutIndicatorHistory<T>(change: () => T): T {
    this.indicatorHistoryDepth++;
    try {
      return change();
    } finally {
      this.indicatorHistoryDepth--;
    }
  }

  /**
   * Run an indicator change as one undo step (the indicators before and
   * after). Quick changes to the same indicator (a colour dragged, a period
   * typed) merge into one step.
   */
  private recordIndicators<T>(subject: string | undefined, change: () => T): T {
    if (this.indicatorHistoryDepth > 0 || !this.features.drawingUndoRedo) return change();
    const before = this.getIndicatorSetup();
    const result = this.withoutIndicatorHistory(change);
    const after = this.getIndicatorSetup();
    if (JSON.stringify(before) === JSON.stringify(after)) return result;
    const now = performance.now();
    const last = this.undoRedoManager.last();
    const merge = subject !== undefined && last?.type === 'indicators' && last.indicators?.subject === subject
      && now - (last.indicators.at ?? 0) < INDICATOR_EDIT_MERGE_MS
      && JSON.stringify(last.indicators.after) === JSON.stringify(before);
    const step = { type: 'indicators' as const, before: null, after: null };
    if (merge && last?.indicators) {
      // Back where the burst began (hidden, then shown again): no step left.
      if (JSON.stringify(last.indicators.before) === JSON.stringify(after)) this.undoRedoManager.dropLast();
      else this.undoRedoManager.replaceLast({ ...step, indicators: { ...last.indicators, after, at: now } });
    } else {
      this.undoRedoManager.push({ ...step, indicators: { before, after, subject, at: now } });
    }
    return result;
  }

  /** Undo or redo an indicator step: the indicators as they were, under their own ids. */
  private applyIndicatorStep(action: import('@tradecanvas/core').UndoableAction, direction: 'undo' | 'redo'): void {
    const step = action.indicators;
    if (!step) return;
    this.withoutIndicatorHistory(() => this.restoreIndicators(direction === 'undo' ? step.before : step.after, true));
    this.markStateChanged();
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
    // The saved type's settings (none saved: the defaults).
    this.chartTypeOptions = snapshot.chartTypeOptions ?? {};
    this.displayDataCache = null;
    if (snapshot.chartType) this.setChartType(snapshot.chartType);
    if (snapshot.drawings) this.setDrawings(snapshot.drawings);
    if (snapshot.theme) this.setTheme(snapshot.theme as any);

    // Indicators get new instance ids: remember old → new for alert channels.
    // Version-1 saves never captured indicators, so they leave them alone.
    const instanceIds = snapshot.version >= 2 && this.features.indicators
      ? this.withoutIndicatorHistory(() => this.restoreIndicators(snapshot.indicators, false))
      : new Map<string, string>();
    // Another layout: the old steps no longer apply to it.
    this.undoRedoManager.clear();

    if (snapshot.alerts && this.features.alerts) {
      this.alertManager.clearAlerts();
      for (const a of snapshot.alerts) {
        // A one-shot alert that already fired stays fired (as AlertManager's own storage does).
        if (a.triggered && !a.repeating) continue;
        // `<instanceId>:<key>` channels follow their indicator to its new id.
        const follow = (ch: string) => {
          const sep = ch.indexOf(':');
          const renamed = sep > 0 ? instanceIds.get(ch.slice(0, sep)) : undefined;
          return renamed ? renamed + ch.slice(sep) : ch;
        };
        const channel = follow(a.channel);
        const options = { ...readAlertOptions(a as unknown as Record<string, unknown>), ...(a.target ? { target: follow(a.target) } : {}) };
        if (a.expired) continue;
        if (a.drawingId) {
          if (this.drawingManager.hasPriceLevels(a.drawingId) && (a.condition === 'crossing' || a.condition === 'crossingUp' || a.condition === 'crossingDown')) {
            this.alertManager.addDrawingAlert(a.drawingId, a.condition, a.message, a.repeating, a.label);
          }
          continue;
        }
        try {
          this.alertManager.addAlert(a.price, a.condition, a.message, a.repeating, channel, a.label, options);
        } catch (err) {
          console.warn('Layout alert left out:', err);
        }
      }
    }
    this.markStateChanged();
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
    this.leftPriceAxis.setLocale(locale);
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
        volumeUp: volumeColor(config.colorScheme.up),
        volumeDown: volumeColor(config.colorScheme.down),
      };
      this.themeManager.setTheme(marketTheme);
    }

    // Apply price precision to trading, alerts, and price line
    if (config.pricePrecision !== undefined) this.applyPricePrecision(config.pricePrecision);

    // Longer price labels may need a wider axis.
    this.updateViewportAndRender();
  }

  /** Prices show `precision` decimals everywhere; null goes back to fitting the price range. */
  private applyPricePrecision(precision: number | null): void {
    this.marketPricePrecision = precision;
    this.tradingManager.setConfig({ pricePrecision: precision ?? undefined });
    this.alertManager.setPricePrecision(precision ?? DEFAULT_ORDER_PRECISION);
    this.streamManager?.priceLine.setPricePrecision(precision);
    this.currentPriceLine.setPricePrecision(precision);
    this.crosshairHandler.setPricePrecision(precision);
    this.chartLegend.setPricePrecision(precision);
    this.crosshairTooltip.setPricePrecision(precision);
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
    // A loader of the host's own: no page lands in, or is asked for by, a destroyed chart.
    this.history.setLoader(null);
    this.disableAutoSave();
    this.disconnectStream();
    this.disconnectExecution();
    if (this.onWindowKeyDown) {
      window.removeEventListener('keydown', this.onWindowKeyDown);
      this.onWindowKeyDown = null;
    }
    this.keyboardHandler = null;
    this.a11y?.destroy();
    this.a11y = null;
    this.interactionManager.detach();
    this.tradingManager.destroy();
    this.animator.dispose();
    this.crosshairTooltip.destroy();
    this.pinnedTooltip.destroy();
    this.replayRestarting = true; // going away: no word to the others
    this.replayManager.dispose();
    this.alertManager.dispose();
    this.undoRedoManager.clear();
    this.engine.destroy();
    this.eventBus.destroy();
    this.container.innerHTML = '';
  }

  // --- Internal ---

  private createChartRenderer(type: ChartType | string): ChartRendererInterface {
    const renderer = resolveRenderer(type, (t) => this.pluginManager.getChartType(t));
    if (renderer instanceof HiLoRenderer) renderer.setPriceText((p) => this.formatPrice(p));
    return renderer;
  }

  /** Cached display data. Invalidated when raw data or chart type changes. */
  private getDisplayData(): DataSeries {
    if (this.displayDataCache) return this.displayDataCache;
    const raw = this.dataManager.getData();
    if (raw.length === 0) return raw;
    const result = resolveDisplayData(this.options.chartType, raw, (t) => this.pluginManager.getChartType(t), this.chartTypeOptions);
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
      // A tick moves indicator values: refit the panes' scales.
      this.panelInfoCache = null;
      this.fitDataAndAxes();
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
    // and the compare lines on the price scale.
    if (autoScale) {
      const overlayRange = joinRanges(
        this.indicatorEngine.getOverlayPriceRange(vs.visibleRange.from, Math.min(vs.visibleRange.to, displayData.length - 1)),
        this.features.compareSymbols ? this.compareRenderer.getPriceRange(displayData, vs) : null,
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

    this.layoutManager.setLeftAxisWidth(this.isLeftPriceScaleShown() ? this.leftAxisWidth : 0);
    const resolved = this.getResolvedLayout();
    this.viewport.setChartRect(resolved.mainChartRect);

    this.fitDataAndAxes(scrollToEnd);

    this.syncRenderContext();
    this.engine.requestRender();

    this.emitViewportEvents();
  }

  /**
   * Fit the data to the plot, then size both price scales to their labels. A
   * scale that changes width changes the plot, so the data is fit again —
   * before anything reads the layout for this frame.
   */
  private fitDataAndAxes(scrollToEnd = false): void {
    this.applyDataToViewport(scrollToEnd);
    const priceResized = this.fitPriceAxisWidth();
    this.leftViewport = this.computeLeftViewport();
    if (this.fitLeftAxisWidth() || priceResized) this.applyDataToViewport(scrollToEnd);
  }

  /** Size the left scale to its widest label; true when the layout changed. */
  private fitLeftAxisWidth(): boolean {
    const left = this.leftViewport;
    if (!left) return false;
    const theme = this.themeManager.getTheme();
    const required = requiredPriceAxisWidth({
      min: left.priceRange.min,
      max: left.priceRange.max,
      lastPrice: null,
      tagPrecision: null,
      locale: this.numberLocale,
      fontFamily: theme.font.family,
      fontSizeSmall: theme.font.sizeSmall,
      measure: (text, font) => this.measureText(text, font),
    });
    const next = nextPriceAxisWidth(this.leftAxisWidth, required);
    if (next === this.leftAxisWidth) return false;
    this.leftAxisWidth = next;
    this.layoutManager.setLeftAxisWidth(next);
    this.resolvedLayoutCache = null;
    this.panelInfoCache = null;
    this.viewport.setChartRect(this.getResolvedLayout().mainChartRect);
    return true;
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
      tagPrecision: this.marketPricePrecision,
      locale: this.numberLocale,
      format: this.priceFormatter,
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

    this.checkHistory();
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
      // On a log scale only while all its values are above 0.
      const logRange = panel.config.logScale ? this.indicatorEngine.getPaneValueRange(panel.config.id, from, to, true) : null;
      const priceRange = logRange ?? this.indicatorEngine.getPaneValueRange(panel.config.id, from, to) ?? { ...DEFAULT_PANE_RANGE };

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
          // Each pane has its own value scale: linear unless set to log (and
          // all its values are above 0), upright unless set upside down.
          logScale: logRange !== null,
          // In percent: labels only, of its first value on screen.
          scaleMode: panel.config.percentScale ? 'percentage' as const : 'regular' as const,
          scaleBaseline: panel.config.percentScale ? this.paneBaseline(panel.config.id, from, to) : undefined,
          // A pane's values are its own, not prices.
          formatPrice: undefined,
          priceUnit: undefined,
          invertScale: !!panel.config.invertScale,
        },
      };
    });

    this.panelInfoCache = panels;
    return panels;
  }

  /** Where the time axis starts: below the main chart and every pane under it. */
  private timeAxisTop(): number {
    const resolved = this.getResolvedLayout();
    const bottomPanelHeight = resolved.panels
      .filter(p => p.config.position === 'bottom')
      .reduce((sum, p) => sum + p.rect.height, 0);
    return resolved.mainChartRect.y + resolved.mainChartRect.height + bottomPanelHeight;
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

    const panels = this.features.indicators ? this.buildPanelRenderInfos() : [];
    const timeAxisY = this.timeAxisTop();

    const displayData = this.getDisplayData();
    this.leftViewport = this.computeLeftViewport();
    this.engine.setRenderContext({
      leftViewport: this.leftViewport,
      leftPriceAxis: this.leftPriceAxis,
      leftAxisWidth: this.leftAxisWidth,
      chartRenderer: this.mainSeriesVisible ? this.chartRenderer : null,
      priceLines: this.quoteLines(),
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
      priceAxisAddButton: this.priceAxisAddButton,
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

type SnapshotIndicator = import('@tradecanvas/core').SnapshotIndicator;

/**
 * `list` with each indicator after the one whose pane it is drawn in and the
 * ones whose lines it reads (otherwise in the order given).
 */
function dependencyOrder(list: readonly SnapshotIndicator[]): SnapshotIndicator[] {
  const byId = new Map(list.map((ind) => [ind.instanceId, ind]));
  const out: SnapshotIndicator[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (ind: SnapshotIndicator) => {
    if (done.has(ind.instanceId) || visiting.has(ind.instanceId)) return;
    visiting.add(ind.instanceId);
    const needs = [ind.pane, ...Object.values(ind.params).map((v) => parseIndicatorSource(v)?.instanceId)];
    for (const id of needs) {
      const dep = id ? byId.get(id) : undefined;
      if (dep) visit(dep);
    }
    visiting.delete(ind.instanceId);
    done.add(ind.instanceId);
    out.push(ind);
  };
  for (const ind of list) visit(ind);
  return out;
}

/** The same indicator in the same place: kind, the pane it is drawn in, its scale, and a pane of its own or not. */
function sameKindAndPlace(a: SnapshotIndicator, b: SnapshotIndicator): boolean {
  return a.id === b.id
    && (a.pane ?? null) === (b.pane ?? null)
    && (a.scale ?? null) === (b.scale ?? null)
    && (a.position === undefined) === (b.position === undefined);
}

/** Shapes the chart can draw: a corner radius from 0 to 999 px. */
function readShapes(shapes: ShapeConfig): ShapeConfig {
  const r = shapes.tagRadius;
  return typeof r === 'number' && Number.isFinite(r) && r >= 0 ? { tagRadius: Math.min(r, 999) } : {};
}

/** The indicators that read another symbol's bars (`params.symbol`). */
const SYMBOL_INDICATORS: ReadonlySet<string> = new Set(['compareSymbol', 'spread']);

/** Both ranges in one (either may be null). */
function joinRanges(
  a: { min: number; max: number } | null,
  b: { min: number; max: number } | null,
): { min: number; max: number } | null {
  if (!a) return b;
  if (!b) return a;
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

/** An alert as its events carry it. */
function alertPayload(alert: import('@tradecanvas/core').PriceAlert): import('@tradecanvas/commons').AlertPayload {
  return {
    id: alert.id,
    price: alert.price,
    condition: alert.condition,
    message: alert.message,
    triggered: alert.triggered,
    channel: alert.channel,
    label: alert.label,
    target: alert.target,
    drawingId: alert.drawingId,
    percent: alert.percent,
    bars: alert.bars,
  };
}

/** At most this many marks per jump go to a paper account (a long jump goes by in chunks). */
const MAX_REPLAY_CHUNKS = 500;

/** The first bar of `series` after `time` (its length when none is). */
function firstAfter(series: DataSeries, time: number): number {
  let lo = 0;
  let hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].time <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The prices a run of bars went through, in order, as far as the bars tell:
 * each extreme with its time, the earlier one first (within one bar, a rising
 * bar dipped first), then the close.
 */
function replayMarks(run: readonly OHLCBar[]): [number, number][] {
  let lowAt = 0;
  let highAt = 0;
  for (let i = 1; i < run.length; i++) {
    if (run[i].low < run[lowAt].low) lowAt = i;
    if (run[i].high > run[highAt].high) highAt = i;
  }
  const low: [number, number] = [run[lowAt].low, run[lowAt].time];
  const high: [number, number] = [run[highAt].high, run[highAt].time];
  const lowFirst = lowAt !== highAt ? lowAt < highAt : run[lowAt].close >= run[lowAt].open;
  const last = run[run.length - 1];
  return [...(lowFirst ? [low, high] : [high, low]), [last.close, last.time]];
}

/** How far the last of `coarse` reaches: its widest recent spacing (months differ, weekends skip). */
function lastBarSpan(coarse: DataSeries): number {
  let span = 0;
  for (let i = Math.max(1, coarse.length - 10); i < coarse.length; i++) span = Math.max(span, coarse[i].time - coarse[i - 1].time);
  return span > 0 ? span : Infinity;
}

/**
 * Finer bars for a replay of `coarse`: sorted, inside its span (from its
 * first bar to the end of its last one), with no repeated times. Where they
 * start later than `coarse` (a feed's history is shorter), its earlier bars
 * come first as whole steps, so a bar index means the same bar either way.
 */
function replaySteps(steps: DataSeries, coarse: DataSeries): DataSeries | null {
  if (coarse.length === 0) return null;
  const end = coarse[coarse.length - 1].time + lastBarSpan(coarse);
  const sorted = steps
    .filter((b) => isWholeBar(b) && b.time >= coarse[0].time && b.time < end)
    .sort((a, b) => a.time - b.time);
  const fine: OHLCBar[] = [];
  for (const bar of sorted) if (fine.length === 0 || fine[fine.length - 1].time !== bar.time) fine.push(bar);
  if (fine.length === 0) return null;
  // The first coarse bar the finer ones cover from its start; the ones before are whole steps.
  const from = coarse.findIndex((b) => b.time >= fine[0].time);
  if (from < 0) return null; // they only reach into the last bar
  const head = coarse.slice(0, from);
  const tail = fine.filter((b) => b.time >= coarse[from].time);
  return [...head, ...tail];
}

function isWholeBar(b: OHLCBar): boolean {
  return [b.time, b.open, b.high, b.low, b.close].every(Number.isFinite);
}

/** The bar of `coarse` holding `time`: the last one starting at or before it (0 before the first). */
function barAt(coarse: DataSeries, time: number): number {
  let lo = 0;
  let hi = coarse.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (coarse[mid].time <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The last step inside bar `barIndex` of `coarse` (where that bar is whole), or the nearest before it. */
function lastStepOfBar(steps: DataSeries, coarse: DataSeries, barIndex: number): number {
  const bar = Math.max(0, Math.min(Math.floor(Number.isFinite(barIndex) ? barIndex : 0), coarse.length - 1));
  const end = bar + 1 < coarse.length ? coarse[bar + 1].time : Infinity;
  let at = -1;
  for (let i = 0; i < steps.length && steps[i].time < end; i++) at = i;
  return Math.max(0, at);
}

/** Bar `bar` as it stood after step `index`: built from its steps so far. */
function formingBar(bar: OHLCBar, steps: DataSeries, index: number): OHLCBar {
  let i = index;
  while (i > 0 && steps[i - 1].time >= bar.time) i--;
  let out: OHLCBar = { ...steps[i], time: bar.time };
  for (let j = i + 1; j <= index; j++) out = mergeBar(out, steps[j]);
  return out;
}

/** `bar` with one more step in it. */
function mergeBar(bar: OHLCBar, step: OHLCBar): OHLCBar {
  return {
    time: bar.time,
    open: bar.open,
    high: Math.max(bar.high, step.high),
    low: Math.min(bar.low, step.low),
    close: step.close,
    volume: (bar.volume ?? 0) + (step.volume ?? 0),
  };
}

/** How a stream bar lands on `series`: after its last bar, as its last bar again, or before it (stale). */
function barPlacement(series: readonly OHLCBar[], bar: OHLCBar): 'append' | 'update' | 'stale' {
  const last = series[series.length - 1];
  if (!last) return 'append';
  const at = normalizeBarTime(bar.time);
  const lastAt = normalizeBarTime(last.time);
  return at > lastAt ? 'append' : at === lastAt ? 'update' : 'stale';
}
