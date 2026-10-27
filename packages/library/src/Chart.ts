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
  PriceLimitInfo,
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
import { isValidTimeZone, sessionMinute, symbolTimeZone, LayerType, setLocale as setGlobalLocale, computePriceLimits, priceStepAt, PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice, parseIndicatorSource, indicatorSource, stepDecimals, priceFormatterFor, fractionTick } from '@tradecanvas/commons';
import type { BarLayout, ChartTypeOptions, DataUpdatePayload, FontConfig, IndicatorId, IndicatorParamsFor, PriceFormatter, PriceFraction, ShapeConfig, TimeFormatter } from '@tradecanvas/commons';
import type { ChartStyleKey, ChartStyleOverrides, ChartStyleOverridesPatch, IndicatorIntervals, IndicatorStyleConfig, PaneStyle, ResolvedChartStyle, StyleLayer } from '@tradecanvas/commons';
import { PHI, computePriceRange, readChartTypeOptions, tickBarCount, barTimeUnit, readChartStyleOverrides, readIndicatorPlotStyles, readPaneStyle } from '@tradecanvas/commons';
import { PRICE_SCALE_MARGIN, PriceLines, type BidAsk, SymbolSeriesStore, CompareSymbolIndicator, SpreadIndicator, CorrelationCoefficientIndicator, CorrelationLogIndicator, SYMBOL_INDICATOR_IDS, HiLoRenderer, PointAndFigureRenderer, ReshapeMemo, isPriceLevelAlert, loadWebGL, gpuContextsLeft, whenGpuContextFree } from '@tradecanvas/core';
import type { GpuRenderer, RendererMode } from '@tradecanvas/core';
import { regularHoursFilter } from './regularHours.js';
import { ChartA11y } from './chartA11y.js';
import { barDateZone, barsAreDaily, zonedDateFormatter } from '@tradecanvas/commons';
import { indicatorChipLabel } from './indicatorLabel.js';
import type { ExportColumn } from '@tradecanvas/core';
import {
  RenderEngine,
  Viewport,
  ResamplingAdapter,
  withResampling,
  servesTimeframe,
  SYMBOL_ZONE_WAIT_MS,
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
  timeToX,
  priceToY,
  PriceAxisAddButton,
  findDominantSwing,
  readAlertOptions,
} from '@tradecanvas/core';
import type { ChartRendererInterface, CompareValue, RangePreset, SessionHoursConfig, DrawingPatch, DrawingOrderMove } from '@tradecanvas/core';
import { timeframeToMs } from '@tradecanvas/commons';
import { resolveRenderer, resolveDisplayData, isReshapedChartType, pointAndFigureDisplay, rangeBarsStep } from './charts/ChartTypeStrategy.js';
import { AutoSaveScheduler } from './state/AutoSaveScheduler.js';
import { isValidBar } from './DataManager.js';
import { SeriesStore, isWholeBar, type LiveChange } from './SeriesStore.js';
import { HistoryPager, type HistoryLoader } from './HistoryPager.js';
import { ThemeManager } from './ThemeManager.js';
import { startOverrides } from './style/styleOptions.js';
import { LayoutManager } from './layout/LayoutManager.js';
import { requiredPriceAxisWidth, nextPriceAxisWidth } from './layout/priceAxisWidth.js';
import { LabelWidths } from './layout/labelWidths.js';
import { VerticalPanGate } from './interaction/verticalPanGate.js';
import { PluginManager } from './plugins/PluginManager.js';
import { wireExecution } from './trading/wireExecution.js';
import { overlaysForLayer, type ChartPlugin } from './plugins/contracts.js';
import { ReplayStepLoader } from './replay/ReplayStepLoader.js';
import { formingAt, intrabarPath, pathMarks, pathStop, type IntrabarPath } from './replay/intrabarPath.js';
import { resolveReplayStep } from './replay/replayStep.js';

// Replaced at build time by Vite `define` (see vite.config.ts). The `typeof`
// guard keeps this safe when the source runs un-bundled (tests, ts-node).
declare const __TC_VERSION__: string;

/** The scale of an indicator pane with nothing to fit yet. */
const DEFAULT_PANE_RANGE = { min: 0, max: 100 } as const;

/** `setTimeZone(EXCHANGE_TIME_ZONE)` shows the zone of the symbol's exchange, else of its market (`getExchangeTimeZone`). */
export const EXCHANGE_TIME_ZONE = 'exchange';
/** @deprecated Use `EXCHANGE_TIME_ZONE`. */
export const EXCHANGE_TIMEZONE = EXCHANGE_TIME_ZONE;
/** Throws a RangeError for a time zone the browser doesn't know or an offset that isn't a number. */
function assertTimeZone(tz: TimeZoneSetting): void {
  if (typeof tz === 'string' && tz !== EXCHANGE_TIME_ZONE && !isValidTimeZone(tz)) {
    throw new RangeError(`Unknown time zone: ${tz}`);
  }
  if (typeof tz === 'number' && !Number.isFinite(tz)) throw new RangeError(`Invalid UTC offset: ${tz}`);
}
/**
 * A symbol's zone under both names: `timeZone`, and the older `timezone` that
 * code may still read. When the two disagree, the one that moved from `held`
 * (the zone the chart has for this symbol) is the new zone, so
 * `{ ...getSymbolInfo(), timezone: zone }` changes it as `timeZone: zone` does;
 * otherwise `timeZone` is.
 */
function withBothZoneSpellings(info: SymbolInfo, held: string | undefined): SymbolInfo {
  const { timeZone, timezone } = info;
  const moved = timeZone !== undefined && timezone !== undefined && timeZone !== timezone && timeZone === held;
  const zone = moved ? timezone : symbolTimeZone(info);
  return zone === undefined ? info : { ...info, timeZone: zone, timezone: zone };
}

/** Room above and below the left scale's overlays, as a share of their range. */
const LEFT_SCALE_PADDING = 0.08;
/** Between the lowest candle and the volume bars: φ⁻⁷ (3%) of the plot's height. */
const VOLUME_GAP = PHI ** -7;
/** Changes to one indicator closer together than this are one undo step (a colour dragged, a period typed). */
const INDICATOR_EDIT_MERGE_MS = 800;
/** Fewest bars ahead of the view that trigger the next history page. */
const HISTORY_AHEAD_MIN_BARS = 20;

/** Narrowest box (px) the zoom-area tool zooms into. */
const MIN_ZOOM_BOX_PX = 8;

/** Drawings drawn across the whole plot's width, or its height, whatever their anchors. */
const FULL_WIDTH_DRAWINGS = new Set(['horizontalLine', 'crossLine']);
const FULL_HEIGHT_DRAWINGS = new Set(['verticalLine', 'crossLine']);

export class Chart {
  static version = typeof __TC_VERSION__ !== 'undefined' ? __TC_VERSION__ : '0.0.0-dev';

  private engine: RenderEngine;
  private viewport: Viewport;
  /** The bars: those shown, the whole series while some hours are hidden, the live one during a replay. */
  private readonly series = new SeriesStore((bars) => this.sessionKeep(bars), (change) => this.followLiveChange(change));
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
  /** The size a reshaped type was raised to on this series, so a tick walks it once (cleared when the series is replaced). */
  private readonly reshapeMemo = new ReshapeMemo();
  /** The price step the cached range bars were built on: a new step (the symbol's `minTick` arrives) builds them again. */
  private displayDataStep: number | undefined;
  /** Earliest bar of an `indicatorUpdate` waiting to be emitted; null = none pending. */
  private indicatorUpdateFrom: number | null = null;
  private resolvedLayoutCache: import('@tradecanvas/commons').ResolvedLayout | null = null;
  private panelInfoCache: import('@tradecanvas/core').PanelRenderInfo[] | null = null;
  /** Panes' own styles, by the instance whose pane it is (`setPaneStyle`). */
  private paneStyles = new Map<string, PaneStyle>();
  /** The background last put on the container (setTheme, a style change), so a host's own stays. */
  private lastBackground: string | null = null;
  private renderScheduled = false;
  /** A live tick's refit left for when the chart draws again (it is paused). */
  private renderDeferred = false;
  /** Current price-axis width; grows to fit long (e.g. sub-cent) labels. */
  private priceAxisWidth = PRICE_AXIS_WIDTH;
  /** A canvas out of the page, to measure on when the chart has none of its own (destroyed). */
  private measureCtx: CanvasRenderingContext2D | null | undefined;
  /** The axis labels' widths as measured on the chart's canvas in the page, kept while panning. */
  private readonly labelWidths = new LabelWidths();
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
  /** An edit of one indicator under way (`beginIndicatorEdit`): the indicators as it began. */
  private indicatorEdit: { subject: string; before: SnapshotIndicator[] } | null = null;
  /** Alerts of deleted drawings, put back if an undo brings the drawing back. */
  private removedDrawingAlerts = new Map<string, import('@tradecanvas/core').PriceAlert[]>();
  /** The zoom-area tool is waiting for its box. */
  private zoomAreaMode = false;
  /** The "+" by the price axis. */
  private priceAxisAddButton = new PriceAxisAddButton();
  /** The time zone shown: the setting, with 'exchange' resolved (`getExchangeTimeZone`, else UTC). */
  private displayTz: TimeZoneSetting = null;
  /** What `setTimeZone` was given; 'exchange' follows the symbol, else its market. */
  private timeZoneSetting: TimeZoneSetting = null;
  /** What the feed (or host) said about the symbol on the chart. */
  private symbolInfo: SymbolInfo | null = null;
  /** Bumped per symbol asked about: an answer about a symbol the chart left is dropped. */
  private symbolInfoSeq = 0;
  /**
   * While the stream asks about its next symbol, the indicators, the
   * prior-day lines, the market profile and the bars built from trades keep
   * the last symbol's zone: the next one most often trades on the same
   * exchange, so its bars compute once, in the zone they keep.
   */
  private studyZoneHeld = false;
  /** The zone `applyStudyZone` last gave: the one held while `studyZoneHeld`. */
  private studyZone: string | null = null;
  /** Ends the hold when the feed says nothing of the next symbol for as long as its built days wait (`SYMBOL_ZONE_WAIT_MS`). */
  private studyZoneTimer: ReturnType<typeof setTimeout> | null = null;
  /** A disconnect's end of the hold, waiting to see whether a connect follows at once. */
  private studyZoneReleaseQueued = false;
  private sessionBreaks: SessionBreaks;
  private sessionShading: SessionShading;
  /** The session hours the host set (or the default); a symbol's own hours show over them. */
  private hostSessionHours: SessionHoursConfig = { ...DEFAULT_SESSION_HOURS };
  private compareRenderer: CompareRenderer;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  /** Why drawing is paused: the host's `suspend()`, a hidden page, the chart off screen. */
  private pausedFor = { host: false, page: false, offscreen: false };
  /** Undoes the page listeners `watchVisibility` set. */
  private stopWatchingVisibility: (() => void) | null = null;
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
   * While a replay runs. The live series keeps moving aside in the series
   * store — stream and host updates land there instead of the replayed
   * slice — and comes back on `replayStop()`. `price` is the latest live tick.
   */
  private replaySession: ReplaySession | null = null;
  /** Why the replay is being rebuilt, while it is: its step says so. */
  private replayCause: 'series' | 'older' | null = null;
  /** During a replay in finer steps: the steps, and the series they build. */
  private replayStepsSeries: DataSeries | null = null;
  private replayCoarse: DataSeries | null = null;
  /** Whether the running replay shows markers and trades only as it reaches them. */
  private replayRevealMarks = true;
  /** Bars of the series left out before a replay's window (`hideHistory`). */
  private replayOffset = 0;
  /** With `animate`: the host's finer bars by the time of the bar they shape. */
  private replayPieces: Map<number, OHLCBar[]> | null = null;
  /** With `animate` and a `step`: the finer bars fetched for the bars ahead. */
  private replayLoader: { key: string; loader: ReplayStepLoader } | null = null;
  /** The bar forming on screen and the path it began with (it keeps it: a page landing late shapes later bars). */
  private replayForming: { index: number; path: IntrabarPath } | null = null;
  private replayPhaseUnsub: (() => void) | null = null;
  private undoRedoManager: UndoRedoManager;
  private autoSaveScheduler = new AutoSaveScheduler((key) => this.saveState(key));
  private animator: Animator;
  private crosshairTooltip: CrosshairTooltip;
  private pinnedTooltip: PinnedTooltip;
  private interactionManager: InteractionManager;
  private crosshairHandler: CrosshairHandler;
  private chartRenderer: ChartRendererInterface;
  /** The latest `setRenderer` call: an earlier one that resolves later is dropped. */
  private rendererToken = 0;
  /** Stops waiting for a WebGL context to come free (the charts held all they may). */
  private stopWaitingForGpu: (() => void) | null = null;
  private disposed = false;
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
  /**
   * A new series whose prices aren't on the axis yet (the first bars, or
   * `setData`'s): they are fitted once even with auto-scale off, which then
   * holds them. Off, a chart would otherwise keep its empty 0 to 1, or the
   * last symbol's prices.
   */
  private priceFitPending = true;
  /**
   * The series began with no bars (a new chart, `setData([])`, an empty
   * history), so its bars come one by one: see `priceFitDone`. A hold the
   * user or the host asks for (a drag of the price axis, `setAutoScale(false)`)
   * ends it.
   */
  private seriesArriving = true;
  private keyboardHandler: KeyboardHandler | null = null;
  private a11y: ChartA11y | null = null;
  private onWindowKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private currentSymbol: string = '';
  /** Timeframe and adapter of the connected stream, for paging its history. */
  private streamTimeframe: TimeFrame | null = null;
  /** The stream draws tick bars ('100T'), which are not evenly spaced in time. */
  private tickStream = false;
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


  constructor(container: HTMLElement, options: ChartOptions & {
    /** Plugins to install with the chart: indicators, drawing tools, chart types and overlays of your own. */
    plugins?: ChartPlugin[];
  }) {
    // Checked before anything is built: a throw later would leave the DOM and listeners behind.
    if (options.timeZone != null) assertTimeZone(options.timeZone);
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
      indicatorValueLabels: f.indicatorValueLabels ?? false,
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
    this.history = new HistoryPager({
      // During a replay the live series pages, not the bars replayed.
      oldestTime: () => (this.replaySession ? this.series.liveBars() : this.series.bars())[0]?.time ?? null,
      prepend: (bars) => this.prependBars(bars),
      emit: (payload) => this.eventBus.emit('historyLoad', payload),
    });
    this.themeManager = new ThemeManager(options.theme);
    this.themeManager.setChartType(this.options.chartType ?? 'candlestick');
    this.applyStyle(startOverrides(options), 'host', false);
    this.layoutManager = new LayoutManager();
    this.indicatorEngine = new IndicatorEngine();
    this.pluginManager = new PluginManager(this.indicatorEngine, { plugins: options.plugins });
    this.eventBus = new EventBus();

    registerBuiltInIndicators(this.indicatorEngine);
    // Indicators on other symbols' bars, kept by this chart.
    this.indicatorEngine.register(new CompareSymbolIndicator(this.symbolSeries));
    this.indicatorEngine.register(new SpreadIndicator(this.symbolSeries));
    this.indicatorEngine.register(new CorrelationCoefficientIndicator(this.symbolSeries));
    this.indicatorEngine.register(new CorrelationLogIndicator(this.symbolSeries));

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
    this.drawingManager.setDataGetter(() => this.series.bars(), () => this.series.revision());
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
    this.engine = new RenderEngine(container, options.maxPixelRatio);
    const size = this.engine.dprManager.getContainerSize();
    this.viewport = new Viewport(
      size.width,
      size.height,
      options.minBarSpacing ?? 2,
      options.maxBarSpacing ?? 30,
      options.rightMargin ?? 5,
    );
    if (options.barLayout) this.viewport.setBarLayout(options.barLayout);
    this.viewport.setPanLimits({
      freePan: options.freePan ?? true,
      minVisibleBars: options.panLimits?.minVisibleBars ?? 3,
    });
    if (options.minBarUnit !== undefined) this.viewport.setMinBarUnit(options.minBarUnit);
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
      // A window resize, a phone rotation or a panel beside the chart changes
      // the container without a call to resize(); what lays itself out over
      // the chart (the widget's replay bar, its toasts) waits for this event.
      this.eventBus.emit('resize', newSize);
    };

    // Chart renderer
    this.chartRenderer = this.createChartRenderer(this.options.chartType);
    this.gridRenderer = new GridRenderer();
    if (options.grid?.visible === false) this.gridRenderer.setVisible(false);
    this.priceAxis = new PriceAxis();
    this.priceAxis.setLocale(this.numberLocale);
    this.leftPriceAxis.setLocale(this.numberLocale);
    // Tags beside the axis (orders, positions, alerts) group prices as it does.
    this.viewport.setNumberLocale(this.numberLocale);
    this.timeAxis = new TimeAxis();
    this.timeAxis.setLocale(this.numberLocale);

    // Crosshair
    this.crosshairHandler = new CrosshairHandler();
    this.crosshairHandler.setLocale(this.numberLocale);
    // A Renko-like chart type from the options has no times past its bricks.
    this.applyTimeSpacing();
    if (options.crosshair?.mode) {
      this.crosshairHandler.setMode(options.crosshair.mode);
    }
    // Crosshair callback — fired via microtask AFTER render, only when the bar
    // changes: no extra render requests, and the tooltip's one measurement
    // happens once per bar, not per mouse move.
    this.crosshairHandler.setDataSource(() => this.crosshairSeries());
    this.crosshairHandler.setCallback((barIndex, point) => {
      if (barIndex !== null && point) {
        const data = this.crosshairSeries();
        const bar = barIndex >= 0 && barIndex < data.length ? data[barIndex] : undefined;

        // Update legend (canvas-rendered, will show on next UI paint)
        this.chartLegend.setHoverBar(bar ?? null, barIndex > 0 ? data[barIndex - 1] ?? null : null);

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
            timeUnit: barTimeUnit(data),
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
    this.pinnedTooltip.setLocale(this.numberLocale);
    if (options.priceFormat) this.applyPriceFormat(options.priceFormat);
    if (options.chartTypeOptions) this.chartTypeOptions = readChartTypeOptions(options.chartTypeOptions);
    if (options.highLowLines) this.priceLines.setHighLow(true);
    if (options.shapes) this.themeManager.setShape(readShapes(options.shapes));
    if (options.font) this.themeManager.setFont(readFont(options.font));
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
        formatTime: (time) => this.spokenBarTime(time),
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
    // A compare's label at its line's end keeps clear of an alert's label at the plot's right edge.
    this.compareRenderer.setReservedLevels(() => this.alertManager.getAlerts().filter(isPriceLevelAlert).map((a) => a.price));
    this.alertManager.on('triggered', (alert) => {
      this.eventBus.emit('alertTriggered', alertPayload(alert));
      // Back-compat: legacy listeners keyed off dataUpdate.
      this.eventBus.emit('dataUpdate', { kind: 'alert', alert: 'triggered', alertId: alert.id, price: alert.price, message: alert.message } satisfies DataUpdatePayload);
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
    this.signalMarkerManager.setDataGetter(() => this.series.bars());
    this.signalMarkerManager.on('added', (m) => {
      this.eventBus.emit('signalMarkerAdd' as ChartEventType, { id: m.id, source: m.source, direction: m.direction });
    });
    this.signalMarkerManager.on('removed', (id) => {
      this.eventBus.emit('signalMarkerRemove' as ChartEventType, { id });
    });

    // Trade zones
    this.tradeZoneManager = new TradeZoneManager();
    this.tradeZoneManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.tradeZoneManager.setDataGetter(() => this.series.bars());
    this.tradeZoneManager.on('added', (z) => {
      this.eventBus.emit('tradeZoneAdd' as ChartEventType, { id: z.id, direction: z.direction });
    });
    this.tradeZoneManager.on('removed', (id) => {
      this.eventBus.emit('tradeZoneRemove' as ChartEventType, { id });
    });

    // Replay
    this.replayManager = new ReplayManager();
    this.replayManager.on('complete', () => {
      const barIndex = this.getReplayBarIndex();
      const bar = this.replayCoarse?.[barIndex];
      if (bar) this.eventBus.emit('replayComplete', { barIndex, time: bar.time });
    });
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
              this.holdPriceScale();
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
          this.holdPriceScale();
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
        this.pinnedTooltip.pin(data[idx], idx, this.themeManager.getTheme(), barTimeUnit(data), barsAreDaily(data) === true);
      }
      this.pinnedTooltip.reposition(
        this.viewport.getState(),
        this.series.bars()[idx] ?? null,
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
        this.eventBus.emit('dataUpdate', { kind: 'bracket', bracket: 'cancelled' } satisfies DataUpdatePayload);
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
    this.interactionManager.setPageScroll(options.pageScroll ?? false);
    this.interactionManager.attach();

    if (options.timeZone !== undefined && options.timeZone !== null) this.setTimeZone(options.timeZone);
    if (options.leftPriceScale) this.leftScaleRequested = true;

    // Set render context
    this.syncRenderContext();
    this.engine.start();
    this.watchVisibility(container, options.pauseWhenHidden !== false);
    // A lost GPU context: the engine is back on Canvas 2D, until it comes back.
    this.engine.onGpuLost = () => this.eventBus.emit('rendererChange', { renderer: 'canvas', reason: 'contextLost' });
    this.engine.onGpuRestored = () => this.eventBus.emit('rendererChange', { renderer: 'webgl', reason: 'contextRestored' });
    if (this.options.renderer && this.options.renderer !== 'canvas') void this.setRenderer(this.options.renderer);
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
    // A replay goes on over the new series, at the same time; one a paper
    // account trades ends when the symbol changes (its orders are of the old one).
    const session = this.replaySession;
    if (session && !restoring && data.length > 0 && !this.replayEndsFor(this.currentSymbol)) {
      this.loadDuringReplay(data);
      return;
    }
    // A full replace is a new series: a stream's reconnect no longer merges into it.
    this.snapshotKey = null;
    this.endReplaySession();
    this.history.reset();
    this.series.load(data);
    this.crosshairHandler.setData(this.series.bars());
    this.displayDataCache = null;
    this.reshapeMemo.clear();
    this.sessionBreaks.invalidateCache();
    // A full data replace means a new series (symbol/timeframe switch, not
    // a live tick — those go through appendBar/updateLastBar instead), so
    // un-freeze the Y-axis the same way scrollToEnd below resets the X-axis.
    // Otherwise a price-axis drag or vertical pan on the old symbol silently
    // keeps the new symbol's chart stuck on the old price range. Auto-scale
    // set off fits the new series once too, then holds it.
    this.options.autoScale = this.defaultAutoScale;
    this.priceFitPending = true;
    // New data context (symbol / timeframe) — drop stale alert prev-values so
    // the next tick seeds cleanly instead of crossing against the old series.
    // The bars kept: a bar the chart can't take is left out.
    const kept = this.series.bars();
    this.seriesArriving = kept.length === 0;
    const lastKept = kept[kept.length - 1];
    if (!restoring) {
      this.alertManager.clearLastValues();
      // The first live price after the bars crosses a level from their last close.
      if (lastKept) this.alertManager.seedLastValue('price', lastKept.close);
    }
    this.recalcIndicators(kept);
    // Auto-set current price line from last bar's close
    if (lastKept) this.currentPriceLine.setPrice(lastKept.close);
    this.updateViewportAndRender(true);
    this.emitBars(kept.length);
  }

  /**
   * A new series during a replay: the live series kept aside, which the
   * replay carries over to (the store tells it). Alerts start again from
   * its last close, as they follow the live market.
   */
  private loadDuringReplay(data: DataSeries): void {
    this.snapshotKey = null;
    this.history.reset();
    this.alertManager.clearLastValues();
    const last = data[data.length - 1];
    if (last && isValidBar(last)) this.alertManager.seedLastValue('price', last.close);
    if (this.replaySession) this.replaySession.price = null; // the old series' live price
    this.series.load(data);
  }

  /**
   * Add older bars in front of the data — e.g. a page of history loaded as
   * the user scrolls back. Bars at or after the first loaded bar are skipped.
   * The same bars stay on screen. During a replay they join the live series
   * and the replay, at the same time. Returns how many bars were added.
   */
  prependBars(bars: OHLCBar[]): number {
    if (this.replaySession) return this.series.prepend(bars).taken;
    // The bar at the left edge, by time: Renko bricks and the like are rebuilt
    // from the whole series, so counting what was added would not find it.
    const shown = this.getDisplayData();
    const leftIndex = Math.max(0, Math.min(shown.length - 1, Math.floor(this.viewport.getState().visibleRange.from)));
    const leftTime = shown[leftIndex]?.time;
    // Hidden extended hours: the older bars all go to the whole series, the
    // regular ones on the chart too; the page counts as loaded either way.
    const { added, taken } = this.series.prepend(bars);
    if (added === 0) return taken;
    const data = this.series.bars();
    this.crosshairHandler.setData(data);
    this.displayDataCache = null;
    this.reshapeMemo.clear();
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
    return taken;
  }

  /**
   * A stream snapshot for the series already on the chart (a reconnect): keep
   * the older bars paged in and the view, replace the rest.
   */
  private mergeSnapshot(bars: OHLCBar[]): void {
    // The viewport learns the new length when it is fitted, below.
    const follow = this.viewport.isAtEnd();
    if (!this.series.mergeSnapshot(bars)) {
      this.setData(bars);
      return;
    }
    const merged = this.series.bars();
    this.crosshairHandler.setData(merged);
    this.displayDataCache = null;
    this.reshapeMemo.clear();
    this.sessionBreaks.invalidateCache();
    // The same series goes on (a reconnect): alerts keep their bars and last values.
    this.recalcIndicators(merged);
    if (merged.length > 0) this.currentPriceLine.setPrice(merged[merged.length - 1].close);
    this.updateViewportAndRender(follow);
    this.emitBars(merged.length);
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
    if (!this.replayPages()) return Promise.resolve(0);
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
      if (!this.replayPages() || !this.history.hasLoader() || isReshapedChartType(this.options.chartType)) return;
      const { visibleRange, chartRect } = this.viewport.getState();
      // No size (hidden: a grid's tab not shown, a collapsed panel), no view to
      // fill: a chart 0 wide would page back through the whole history. The
      // check comes again when it gets one.
      if (chartRect.width <= 0) return;
      const { from, to } = visibleRange;
      this.history.maybeLoad(Math.max(0, Math.floor(from)), Math.max(HISTORY_AHEAD_MIN_BARS, to - from));
    });
  }

  /** Page the connected stream's history through its adapter, if it can. */
  private useStreamHistory(feed: DataAdapter, pageSize: number | undefined, check = true): void {
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
    // Not before the new bars are in: a page would go in front of the old ones.
    if (check) this.checkHistory();
  }

  /**
   * A new bar after the last, from your own feed. Its close is the live
   * price: the price line, the orders' P&L and the alerts follow it, as
   * they do `setCurrentPrice` and a connected stream. Sends `dataUpdate`
   * (`{ kind: 'bars', length }`), before the alerts it sets off. A bar the
   * chart can't take (a price that isn't a number, below zero, a high under
   * its low) is left out, price and all.
   */
  appendBar(bar: OHLCBar): void {
    if (!isValidBar(bar)) return;
    const write = this.series.append(bar);
    // Before anything reads the bars shown: the price follows on the bars as they are now.
    if (write.refiltered) this.displayDataCache = null;
    if (write.to !== 'shown') {
      this.takeLivePrice(bar.close);
      if (write.to === 'hidden') this.scheduleRender();
      return;
    }
    // Follow the live edge only if the view is already there — browsing
    // history shouldn't be yanked back to the end on every new bar.
    const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
    const before = write.before;
    const data = this.series.bars();
    this.crosshairHandler.setData(data);
    this.displayDataCache = null;
    // Re-finalise the bar that just closed (its last tick may differ from the
    // final close) and compute the new one; everything older is untouched.
    this.recalcIndicatorsFrom(data, data.length - 2);
    // Measured from the close before it, as a stream measures a new bar: one opening there is level.
    this.currentPriceLine.setPrice(bar.close, data[data.length - 2]?.close);
    this.updateViewportAndRender(follow);
    if (data.length !== before) this.emitBars(data.length);
    // Last: an alert's listener sees the chart with its new bar.
    this.followLivePrice(bar.close);
  }

  /**
   * Several new bars at once (a catch-up after a reconnect), the indicators
   * computed once. The last bar's close is the live price, as with
   * `appendBar`; one `dataUpdate` for them all.
   */
  appendBars(bars: OHLCBar[]): void {
    bars = bars.filter(isValidBar);
    if (bars.length === 0) return;
    const price = bars[bars.length - 1].close;
    const write = this.series.appendMany(bars);
    if (write.refiltered) this.displayDataCache = null;
    if (write.shown === 0) {
      this.takeLivePrice(price);
      if (!write.aside) this.scheduleRender();
      return;
    }
    // As `appendBar`: the live edge only while the view is there and auto-scroll is on.
    const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
    const before = write.before;
    this.displayDataCache = null;
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, before - 1);
    this.crosshairHandler.setData(data);
    this.currentPriceLine.setPrice(price, data[data.length - 2]?.close);
    this.updateViewportAndRender(follow);
    if (data.length !== before) this.emitBars(data.length);
    this.followLivePrice(price);
  }

  /**
   * The forming bar again, with its latest values (same `time` as the last
   * bar). Its close is the live price: the price line, the orders' P&L and
   * the alerts follow it. A tick sends no `dataUpdate`; `indicatorUpdate`
   * says the indicators moved. A bar the chart can't take is left out.
   */
  updateLastBar(bar: OHLCBar): void {
    if (!isValidBar(bar)) return;
    const write = this.series.updateLast(bar);
    if (write.refiltered) this.displayDataCache = null;
    if (write.to !== 'shown') {
      this.takeLivePrice(bar.close);
      if (write.to === 'hidden') this.scheduleRender();
      return;
    }
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
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, data.length - 1);
    // After the indicators: an alert on a line compares with its value at this bar.
    this.followLivePrice(bar.close);
    this.scheduleRender();
  }

  /** A trade's price into the forming bar (its high, low, close and volume): the live price, as with `updateLastBar`. */
  updateLastBarFromTick(tick: { price: number; volume?: number; time: number }): void {
    if (!Number.isFinite(tick.price) || tick.price < 0) return;
    if (tick.volume !== undefined && !(Number.isFinite(tick.volume) && tick.volume >= 0)) return;
    // A tick outside regular hours, while they are hidden, moves the price line and what follows the price, not a bar.
    const write = this.series.mergeTick(tick);
    if (write.to !== 'shown') {
      this.takeLivePrice(tick.price);
      if (write.to === 'hidden') this.scheduleRender();
      return;
    }
    this.currentPriceLine.setPrice(tick.price);
    if (this.options.chartType !== 'candlestick' && this.options.chartType !== 'line'
        && this.options.chartType !== 'area' && this.options.chartType !== 'bar'
        && this.options.chartType !== 'hollowCandle') {
      this.displayDataCache = null;
    }
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, data.length - 1);
    this.followLivePrice(tick.price);
    this.scheduleRender();
  }

  /**
   * A loaded bar again, with new values: the bar with the same `time`,
   * wherever it is in the series (a feed learned a closed bar was off). The
   * indicators are computed again from it on, the chart types built from
   * the bars too, and the view stays. Several corrections before the next
   * frame are computed once, from the earliest. Sends `dataUpdate`
   * (`{ kind: 'correction', time, index }`).
   *
   * It is no live price: the orders and the alerts don't follow it, and no
   * alert fires. A corrected last bar is the price line's, measured from the
   * bar before it, and the price alerts' last value, as after `setData`.
   * During a replay it corrects the live series: a bar the replay has
   * passed shows corrected at once (the replay carries over at the same
   * time), a later one when the replay reaches it; a bar in the extended
   * hours, while they are hidden, shows when they are shown. The bar loaded sent again (after the repairs every
   * write makes: a missing volume is 0) changes nothing.
   *
   * False, and nothing changes, when no loaded bar has that time (a new bar
   * is `appendBar`'s, older ones `prependBars`') or the chart can't take the
   * bar (a price that isn't a number, below zero, a high under its low).
   */
  updateBar(bar: OHLCBar): boolean {
    if (!isValidBar(bar)) return false;
    const write = this.series.replace(bar);
    if (write.to === 'none') return false;
    // Kept aside during a replay, or outside the hours shown: it shows when they do.
    if (write.to === 'shown' && write.changed) this.showCorrection(write.index);
    return true;
  }

  /** The bar shown at `i` was corrected: what follows from its values does, the view as it was. */
  private showCorrection(i: number): void {
    const data = this.series.bars();
    const bar = data[i];
    this.displayDataCache = null;
    this.reshapeMemo.clear();
    // Deferred: corrections before the next read cost one computation, from the earliest.
    this.indicatorEngine.deferRecalculateFrom(data, i);
    this.announceIndicatorUpdate(i);
    if (i === data.length - 1) {
      // As `setData` leaves the last bar: the price line's, and where the next price crosses from.
      this.currentPriceLine.setPrice(bar.close, data[i - 1]?.close);
      this.alertManager.seedLastValue('price', bar.close);
    }
    this.refreshShownBar(i);
    this.eventBus.emit('dataUpdate', { kind: 'correction', time: bar.time, index: i } satisfies DataUpdatePayload);
    this.scheduleRender();
  }

  /**
   * The tooltips, the legend and the crosshair's listeners hold the bar
   * they were given: give them the corrected one. The bar after it moves
   * too, its change measured from this one's close; with bricks or boxes,
   * any bar can.
   */
  private refreshShownBar(i: number): void {
    const pinned = this.pinnedTooltip.isPinned() ? this.pinnedTooltip.getPinnedIndex() : -1;
    const hovered = this.crosshairHandler.getReportedBarIndex();
    // Nothing holds a bar from it on: no need to build the bars shown before the frame does.
    if (pinned < i && hovered === null) return;
    const aligned = this.isTimeAligned();
    // Heikin-Ashi bars after it are built from it.
    if (aligned && pinned >= i) {
      const shown = this.getDisplayData();
      if (shown[pinned]) this.pinnedTooltip.pin(shown[pinned], pinned, this.themeManager.getTheme(), barTimeUnit(shown), barsAreDaily(shown) === true);
    }
    if (hovered !== null && (!aligned || hovered === i || hovered === i + 1)) this.crosshairHandler.refresh();
  }

  // --- Chart type ---

  /** The type the chart is drawn as: what `setChartType`, the `chartType` option or a loaded layout set; `'candlestick'` by default. */
  getChartType(): ChartType | (string & {}) {
    return this.options.chartType ?? 'candlestick';
  }

  setChartType(type: ChartType | (string & {})): void {
    const previous = this.options.chartType ?? 'candlestick';
    this.options.chartType = type as ChartType;
    // The series' own style keys for this type.
    this.themeManager.setChartType(type as ChartType);
    this.chartRenderer = this.createChartRenderer(type);
    this.chartLegend.setChartType(type as ChartType);
    this.displayDataCache = null;
    this.applyTimeSpacing();
    this.updateViewportAndRender(true);
    this.markStateChanged();
    if (type !== previous) this.eventBus.emit('chartTypeChange', { type, previous });
  }

  /**
   * Times for the empty slots past the data only when bars are evenly spaced
   * in time: not for tick bars, nor for Renko-like charts that redraw them.
   */
  private applyTimeSpacing(): void {
    const even = !this.tickStream && !isReshapedChartType(this.options.chartType);
    this.timeAxis.setTimesPastData(even);
    this.crosshairHandler.setTimesPastData(even);
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
    // New settings build other bars: a screen reader hears the new summary, as after a new type.
    this.a11y?.refresh(true);
    this.markStateChanged();
  }

  getChartTypeOptions(): ChartTypeOptions {
    return readChartTypeOptions(this.chartTypeOptions);
  }

  /**
   * Show or hide the bars outside the symbol's regular hours
   * (`SymbolInfo.sessions`, in its `timeZone`): pre- and post-market. Hidden,
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

  /** The bars shown again after the extended hours or the symbol's hours changed. */
  private reapplyExtendedHours(): void {
    if (!this.series.refilter()) return;
    const data = this.series.bars();
    this.crosshairHandler.setData(data);
    this.displayDataCache = null;
    this.reshapeMemo.clear();
    this.sessionBreaks.invalidateCache();
    this.recalcIndicators(data);
    this.updateViewportAndRender(true);
    this.emitBars(data.length);
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

  /**
   * The face and sizes of the chart's own text (the axes, the tags, the
   * crosshair's pills), over every theme and on top of the font set before:
   * `{ family: SANS_FONT_FAMILY }` for proportional figures. The legend takes
   * the face, unless `setLegend` names one, at its own size (`setLegend`); in a
   * widget its face and size come from the look (`ui.font`). Null goes back to
   * each theme's own. A family that is empty or a size that isn't a number
   * above zero is left out.
   */
  setFont(font: Partial<FontConfig> | null): void {
    if (font === null) {
      this.themeManager.setFont(null);
    } else {
      const read = readFont(font);
      if (Object.keys(read).length === 0) return;
      this.themeManager.setFont(read);
    }
    // The price axis is as wide as its labels: fitted again for the new face and size.
    this.updateViewportAndRender();
  }

  /** The chart's text as drawn: the theme's font with any set by `setFont` over it. */
  getFont(): FontConfig {
    return { ...this.themeManager.getTheme().font };
  }

  /**
   * How a bar fills its slot: `'golden'` (the body φ⁻¹ of the slot at every
   * zoom) or `'classic'` (a 2 px gap). Over bars on screen the zoom stays.
   */
  setBarLayout(layout: BarLayout): void {
    // The same layout again runs nothing: no pass, no events (a widget sets it on every look).
    if ((layout !== 'golden' && layout !== 'classic') || layout === this.viewport.getBarLayout()) return;
    this.viewport.setBarLayout(layout);
    this.updateViewportAndRender();
  }

  getBarLayout(): BarLayout {
    return this.viewport.getBarLayout();
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
   *
   * A built-in's id and inputs are typed: `BuiltInIndicators` lists every
   * one with its inputs, their defaults, and the keys of its lines.
   */
  addIndicator<Id extends IndicatorId>(
    id: Id,
    params?: IndicatorParamsFor<Id>,
    position: PanelPosition = 'bottom',
    options: { pane?: string; scale?: OverlayScale } = {},
  ): string | null {
    return this.recordIndicators(undefined, () => this.addIndicatorNow(id, params ?? {}, position, options));
  }

  private addIndicatorNow(
    id: string,
    params: Record<string, number | string | boolean>,
    position: PanelPosition,
    options: { pane?: string; scale?: OverlayScale; instanceId?: string },
  ): string | null {
    if (!this.isIndicatorAllowed(id)) return null;
    const descriptor = this.indicatorEngine.getAvailableIndicators().find((d) => d.id === id);
    const pane = descriptor ? this.paneFor(descriptor, params, options.pane) : null;
    const instanceId = this.indicatorEngine.addIndicator(id, params, this.series.bars(), {
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
   * 'spread', 'correlation', 'correlationlog'): they line them up with the
   * chart's bars by time. Give them
   * again after a timeframe change; null forgets them.
   */
  setSymbolSeries(symbol: string, bars: DataSeries | null): void {
    symbol = symbol.trim();
    this.symbolSeries.set(symbol, bars);
    this.requestedSymbols.delete(symbol);
    const data = this.series.bars();
    let changed = false;
    for (const ind of this.indicatorEngine.getActiveIndicators()) {
      if (!SYMBOL_INDICATOR_IDS.has(ind.id) || String(ind.params.symbol ?? '').trim() !== symbol.trim()) continue;
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
      if (SYMBOL_INDICATOR_IDS.has(ind.id) && typeof symbol === 'string' && symbol.trim()) out.add(symbol.trim());
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
    const symbol = config && SYMBOL_INDICATOR_IDS.has(config.id) && typeof config.params.symbol === 'string' ? config.params.symbol.trim() : '';
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
    this.indicatorEngine.updateIndicator(instanceId, params, this.series.bars());
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

  /** Whether `setLeftPriceScaleVisible` asked for the left scale; it also shows while an overlay is on it (`isLeftPriceScaleShown`). */
  isLeftPriceScaleVisible(): boolean {
    return this.leftScaleRequested;
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
      // The overlays' own numbers, not the price's format or decimals.
      formatPrice: undefined,
      pricePrecision: undefined,
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

  /** Remove several indicators, each as `removeIndicator` does, in one undo step. */
  removeIndicators(instanceIds: readonly string[]): void {
    this.recordIndicators(undefined, () => {
      for (const id of instanceIds) this.removeIndicatorNow(id);
    });
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
    // A pane's own style goes with the pane: to its heir, or away with it.
    const paneStyle = this.paneStyles.get(instanceId);
    this.paneStyles.delete(instanceId);
    if (heir) {
      this.indicatorEngine.setPane(heir, null);
      this.layoutManager.renamePanel(instanceId, heir);
      if (paneStyle) this.paneStyles.set(heir, paneStyle);
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

  /**
   * The style indicators of kind `id` start with from now on: colours, line
   * widths, opacity, each plot's dash and visibility (null: their own
   * again). Indicators already on the chart keep theirs. Not saved: it is
   * your app's.
   */
  setIndicatorDefaults(id: string, style: IndicatorStyleConfig | null): void {
    if (!style) {
      this.indicatorEngine.setStyleDefaults(id, null);
      return;
    }
    const { plots, ...rest } = style;
    const read = plots !== undefined ? readIndicatorPlotStyles(plots) : undefined;
    this.indicatorEngine.setStyleDefaults(id, { ...rest, ...(read ? { plots: read } : {}) });
  }

  /**
   * An indicator pane's own background and separator, over the panes' style
   * (`panes.*` overrides); null takes them away. Colours it can't use are
   * left out. Saved with the pane's indicator, and undone with it.
   */
  setPaneStyle(instanceId: string, style: PaneStyle | null): void {
    const pane = this.paneOf(instanceId);
    if (!this.layoutManager.getPanels().some((p) => p.id === pane)) return;
    this.recordIndicators(pane, () => this.setPaneStyleNow(pane, style ? readPaneStyle(style) : null));
  }

  private setPaneStyleNow(instanceId: string, style: PaneStyle | null): void {
    if (JSON.stringify(style) === JSON.stringify(this.paneStyles.get(instanceId) ?? null)) return;
    if (style) this.paneStyles.set(instanceId, style);
    else this.paneStyles.delete(instanceId);
    this.panelInfoCache = null;
    this.syncRenderContext();
    this.engine.requestRender();
    this.markStateChanged();
  }

  /** The own style of the pane `instanceId` is drawn in, or null when it has none. */
  getPaneStyle(instanceId: string): PaneStyle | null {
    const style = this.paneStyles.get(this.paneOf(instanceId));
    return style ? { ...style } : null;
  }

  /**
   * An indicator's values, by the instance id `addIndicator` returned; null
   * for an unknown one. `series[i]` is its value at bar `i` of `getData()`,
   * an object keyed by its lines (`{ value }` for RSI, `{ macd, signal,
   * histogram }` for MACD: `BuiltInIndicators[id]['lines']`), or null where
   * it has none yet (before its period fills). `values` holds the same by
   * bar time.
   *
   * @example
   * const rsi = chart.addIndicator('rsi', { period: 14 })!;
   * const out = chart.getIndicatorOutput(rsi);
   * const latest = out?.series?.[chart.getData().length - 1]?.value;
   */
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
      // Its pane's own style goes with the pane: to the heir, or away with it.
      const paneStyle = this.paneStyles.get(instanceId);
      this.paneStyles.delete(instanceId);
      if (heir) {
        this.indicatorEngine.setPane(heir, null);
        this.layoutManager.renamePanel(instanceId, heir);
        if (paneStyle) this.paneStyles.set(heir, paneStyle);
        for (const m of staying) if (m !== heir) this.indicatorEngine.setPane(m, heir);
      } else {
        this.layoutManager.removePanel(instanceId);
        for (const m of staying) this.indicatorEngine.setPane(m, null);
      }
      this.panelInfoCache = null;
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

  /** Tag each indicator line's latest value on its value axis (off by default). */
  setIndicatorValueLabelsVisible(visible: boolean): void {
    this.features.indicatorValueLabels = visible;
    this.syncRenderContext();
    this.engine.requestRender();
  }

  isIndicatorValueLabelsVisible(): boolean {
    return this.features.indicatorValueLabels;
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
    return this.getDisplayData().length === this.series.length();
  }

  /**
   * A price on the market's grid: a multiple of its smallest step (`minTick`),
   * else rounded to its precision, else to the decimals the axis shows.
   */
  roundPrice(price: number): number {
    if (!Number.isFinite(price)) return price;
    const tick = this.stepAt(price);
    if (tick !== undefined) return Number((Math.round(price / tick) * tick).toFixed(stepDecimals(tick)));
    const { min, max } = this.viewport.getState().priceRange;
    return Number(price.toFixed(this.marketPricePrecision ?? autoPricePrecision(min, max)));
  }

  /** The newest bar's close, 0 without bars. */
  private lastClose(): number {
    const bars = this.series.bars();
    return bars[bars.length - 1]?.close ?? 0;
  }

  /** The symbol's `minTick`, a fraction's unit, or the market's step at `price` (its band). */
  private stepAt(price: number): number | undefined {
    const tick = this.symbolInfo?.minTick ?? this.priceUnit ?? undefined;
    if (tick !== undefined && tick > 0) return tick;
    return this.marketConfig ? priceStepAt(price, this.marketConfig) : undefined;
  }

  /**
   * The smallest step prices move in: the symbol's `minTick`, a fraction's
   * unit (`priceFormat: { denominator: 32 }`), the market's step at `price`
   * (at the last close without one: HOSE's step depends on the price), else
   * one unit of the decimals prices show. `roundPrice` puts prices on it; a
   * plugin can size price rows by it.
   */
  getPriceStep(price?: number): number {
    const tick = this.stepAt(price ?? this.lastClose());
    if (tick !== undefined) return tick;
    const { min, max } = this.viewport.getState().priceRange;
    const decimals = this.marketPricePrecision ?? autoPricePrecision(min, max);
    return Number((10 ** -decimals).toFixed(decimals));
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

  /** Whether `pasteDrawings()` would paste: drawings copied (here or on another chart of the page). */
  canPasteDrawings(): boolean {
    return this.features.drawings !== false && this.drawingManager.canPaste();
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
    /** The intervals it shows on (`{ minutes: false }`: not on minute charts); unset: all. */
    intervals?: IndicatorIntervals;
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
   * Change a drawing's anchors (as many as it has), style, options or the
   * intervals it shows on (`intervals: null`: all of them), as one undo step
   * — or as part of the edit begun with `beginDrawingEdit`. Applies to locked
   * drawings too. False for an unknown drawing or wrong anchors.
   */
  updateDrawing(id: string, patch: DrawingPatch): boolean {
    const changed = this.drawingManager.updateDrawing(id, patch);
    if (changed) this.markStateChanged();
    return changed;
  }

  /**
   * Whether a drawing is on the chart: not hidden, and kept to no intervals
   * or to the chart's (see `DrawingState.intervals`). False for an unknown one.
   */
  isDrawingShown(id: string): boolean {
    return this.drawingManager.isShown(id);
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
    const data = this.series.bars();
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

  /**
   * Save the layout to `localStorage[key]` by itself, as `saveState(key)`
   * does: `delayMs` (above 0) after the last change to what it holds (a
   * drawing added, moved or removed, an indicator, an alert, the chart type,
   * the theme, a style override), the changes of that time at once.
   * `loadStateFromStorage(key)` brings it back; `disableAutoSave()` stops it,
   * as `destroy()` does: a change in the last `delayMs` before it is not
   * saved (`saveState(key)` first, to keep it).
   */
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

  /**
   * The intervals an indicator shows on (null: all of them): `{ minutes:
   * false }` hides it on every minute chart, `{ hours: [1, 4] }` shows it on
   * 1h to 4h only. The chart reads them against the interval of the stream
   * it is connected to, or the one `setDataTimeframe` gave; with neither it
   * shows the indicator.
   */
  setIndicatorIntervals(instanceId: string, intervals: IndicatorIntervals | null): void {
    this.recordIndicators(instanceId, () => this.setIndicatorIntervalsNow(instanceId, intervals));
  }

  private setIndicatorIntervalsNow(instanceId: string, intervals: IndicatorIntervals | null): void {
    if (!this.indicatorEngine.setIntervals(instanceId, intervals)) return;
    this.updateViewportAndRender();
    this.markStateChanged();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'intervals' });
  }

  /** The intervals an indicator shows on; null when all of them. */
  getIndicatorIntervals(instanceId: string): IndicatorIntervals | null {
    return this.indicatorEngine.getIntervals(instanceId);
  }

  /** Get current config for a specific indicator instance */
  getIndicatorConfig(instanceId: string): { id: string; params: Record<string, unknown> } | null {
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if (!config) return null;
    return { id: config.id, params: { ...config.params } };
  }

  /**
   * An indicator's colours, line widths and opacity, and each plot's own
   * dash and visibility (`plots`, by plot key, merged into what it had).
   */
  updateIndicatorStyle(instanceId: string, style: IndicatorStyleConfig): void {
    this.recordIndicators(instanceId, () => this.updateIndicatorStyleNow(instanceId, style));
  }

  private updateIndicatorStyleNow(instanceId: string, style: IndicatorStyleConfig): void {
    const { plots, ...rest } = style;
    const read = plots !== undefined ? readIndicatorPlotStyles(plots) : undefined;
    this.indicatorEngine.updateIndicatorStyle(instanceId, { ...rest, ...(read ? { plots: read } : {}) });
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
    const data = this.series.bars();
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
    const data = this.series.bars();
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

  /**
   * A price from the host's own feed: what follows the live price, and the
   * price line (during a replay, kept for when it ends).
   */
  private takeLivePrice(price: number): void {
    this.followLivePrice(price);
    if (this.replaySession) this.replaySession.price = { price };
    else this.currentPriceLine.setPrice(price);
  }

  /** `dataUpdate` for the bars: the series is `length` bars now. */
  private emitBars(length: number): void {
    this.eventBus.emit('dataUpdate', { kind: 'bars', length } satisfies DataUpdatePayload);
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
    const live = this.replaySession ? this.series.liveBars() : this.series.bars();
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
    const data = this.series.bars();
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
    // A replay waits for the new series and goes on over it (a failed load
    // keeps it waiting for the reconnect's; replayStop() brings the live one back).
    this.holdReplayFor(config.symbol);
    this.disconnectStream();

    this.streamManager = new StreamManager();
    this.streamManager.setTimeZone(this.studyZoneHeld ? this.studyZone : this.getExchangeTimeZone());

    this.streamManager.on('snapshot', (bars) => {
      const key = this.streamSeriesKey(config.adapter);
      if (key === this.snapshotKey && this.replaySession) {
        this.series.mergeSnapshot(bars); // a reconnect during a replay: into the live series kept aside
      } else if (key === this.snapshotKey && this.series.length() > 0) {
        this.mergeSnapshot(bars); // a reconnect: keep the paged-in history and the view
      } else {
        // A replay older than the new bars pages back as they land: the stream's pages must be there by then.
        if (this.replaySession) this.useStreamHistory(config.adapter, config.historyPageSize, false);
        this.setData(bars);
      }
      this.snapshotKey = key;
      this.useStreamHistory(config.adapter, config.historyPageSize);
    });

    // Each bar lands by its time: the last bar again (its latest values, a
    // close included), a new one after it, or none when it is older. A
    // closed one older than the last is a correction of the bar loaded at
    // its time: final, even when the host's own bars run ahead of the stream.
    this.streamManager.on('barClose', (bar) => {
      if (!isValidBar(bar)) return;
      const write = this.series.placeStreamBar(bar);
      if (write.refiltered) this.displayDataCache = null;
      if (write.to === 'none') {
        this.updateBar(bar);
        return;
      }
      // Its final close is a live price the stream's priceChange doesn't send.
      if (write.to === 'aside') this.followLivePrice(bar.close);
      if (write.to !== 'shown') return;
      const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
      const before = write.before;
      const data = this.series.bars();
      this.crosshairHandler.setData(data);
      this.displayDataCache = null;
      this.recalcIndicatorsFrom(data, data.length - 2);
      this.updateViewportAndRender(follow);
      if (data.length !== before) this.emitBars(data.length);
      this.followLivePrice(bar.close);
    });

    // The feed's last word on a bar already past: no live price.
    this.streamManager.on('barCorrection', (bar) => {
      this.updateBar(bar);
    });

    this.streamManager.on('barUpdate', (bar) => {
      if (!isValidBar(bar)) return;
      const write = this.series.placeStreamBar(bar);
      if (write.refiltered) this.displayDataCache = null;
      // A frame of a bar older than the last is stale: it moves nothing, the price line included.
      if (write.to === 'none') return;
      if (!this.replaySession) this.currentPriceLine.setPrice(bar.close);
      // During a replay the bars shown are the replay's: nothing to draw again.
      if (this.replaySession) return;
      const before = write.before;
      if (write.to !== 'shown') {
        this.scheduleRender();
        return;
      }
      // Indicators follow the forming bar instead of freezing until it
      // closes — incrementally, since only the last bar changed, and once
      // before the next read (the frame, an alert, the legend) for all the
      // ticks that came since, not once a tick.
      const data = this.series.bars();
      this.indicatorEngine.deferRecalculateFrom(data, data.length - 1);
      this.announceIndicatorUpdate(data.length - 1);
      // A new bar comes forming first (most feeds): the series grew. The price follows from priceChange.
      if (data.length !== before) this.emitBars(data.length);
      this.scheduleRender();
    });

    this.setBidAsk(null); // the last symbol's quote
    // A tick may carry one side only: the other stays.
    this.streamManager.on('quote', (quote) => {
      const now = this.priceLines.getBidAsk();
      this.setBidAsk({ bid: quote.bid ?? now?.bid, ask: quote.ask ?? now?.ask });
    });

    this.streamManager.on('priceChange', ({ price, previousClose }) => {
      if (!Number.isFinite(price) || price < 0) return;
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
      this.eventBus.emit('dataUpdate', { kind: 'connection', connection: info } satisfies DataUpdatePayload);
    });

    this.streamManager.on('error', (err) => {
      this.eventBus.emit('dataUpdate', { kind: 'error', error: err.message } satisfies DataUpdatePayload);
    });

    // The feed learned more about the symbol (after it was asked, or later): this chart's, it applies.
    this.streamManager.on('symbolInfo', (info) => this.applyFeedSymbolInfo(info));

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

  /**
   * The series a stream's history is of: its symbol, its timeframe and the
   * zone whose midnight the days the feed's wrapper builds for it start at.
   * The same series again (a reconnect, or a switch back before the next
   * one's history landed) is merged with the bars on screen; days built in
   * a zone the feed has named since replace them, so two zones' days never mix.
   */
  private streamSeriesKey(feed: DataAdapter): string {
    const adapter = withResampling(feed);
    const timeframe = this.streamTimeframe;
    const days = adapter instanceof ResamplingAdapter && timeframe !== null ? adapter.bucketFor(this.currentSymbol, timeframe) : null;
    return `${this.currentSymbol}|${timeframe}|${days?.timeZone ?? ''}`;
  }

  /** The stream's symbol and timeframe, told when they change. */
  private setStreamTarget(symbol: string, timeframe: TimeFrame): void {
    const previousSymbol = this.announcedSymbol;
    this.currentSymbol = symbol;
    this.streamTimeframe = timeframe;
    this.tickStream = tickBarCount(timeframe) !== null;
    this.applyTimeSpacing();
    // The legend's title line names them (a name set with setSymbolName stands until the symbol changes).
    if (symbol !== previousSymbol) this.chartLegend.setSymbol(symbol);
    if (symbol !== previousSymbol) {
      this.announcedSymbol = symbol;
      this.eventBus.emit('symbolChange', { symbol, previous: previousSymbol });
    }
    this.useTimeframe(timeframe);
  }

  /**
   * The interval of the bars given with `setData`, where no stream says it:
   * the legend's title line names it, `timeframeChange` reports it, and
   * indicators kept to some intervals follow it. Null: not known (they all
   * show). A connected stream's own interval stands.
   */
  setDataTimeframe(timeframe: TimeFrame | null): void {
    if (this.streamManager) return;
    this.useTimeframe(timeframe);
    this.engine.requestRender(LayerType.Hover);
  }

  /** The chart's interval: the legend names it, the indicators kept to some come and go with it. */
  private useTimeframe(timeframe: TimeFrame | null): void {
    const previous = this.announcedTimeframe;
    this.chartLegend.setTimeframe(timeframe ?? '');
    if (this.indicatorEngine.setTimeframe(timeframe)) this.updateViewportAndRender();
    this.drawingManager.setTimeframe(timeframe);
    if (timeframe === previous) return;
    this.announcedTimeframe = timeframe;
    if (timeframe) this.eventBus.emit('timeframeChange', { timeframe, previous });
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
    this.holdReplayFor(symbol);
    this.setStreamTarget(symbol, timeframe);
    // Until the new series is in, a page would be the new symbol's bars in
    // front of the old one's.
    if (this.historyFromStream) this.history.setLoader(null);
    this.barCountdown.setTimeframeMs(timeframeToMs(timeframe));
    if (adapter) this.resolveStreamSymbol(adapter, symbol);
    await this.streamManager.switchTo(symbol, timeframe);
  }

  /** Whether `addIndicator(id)` may add one: indicators on, and `id` listed when `features.indicatorIds` lists any. */
  isIndicatorAllowed(id: string): boolean {
    const allowed = this.features.indicatorIds;
    return this.features.indicators && (allowed.length === 0 || allowed.includes(id));
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
    this.releaseStudyZoneAfterCaller();
    this.priceLines.setBidAsk(null);
    if (this.streamManager) {
      this.streamManager.dispose();
      this.streamManager = null;
    }
    if (this.historyFromStream) {
      this.history.setLoader(null);
      this.historyFromStream = false;
    }
    // A replay's finer bars came from this feed: the next one connected brings its own.
    this.replayLoader?.loader.dispose();
    this.replayLoader = null;
    this.streamAdapter = null;
    // Bars set by hand after this aren't tick bars.
    this.tickStream = false;
    this.applyTimeSpacing();
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

  isBarCountdownVisible(): boolean {
    return this.barCountdown.isVisible();
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
    this.eventBus.emit('compareChange', { id, change: 'add' });
  }

  removeCompareSymbol(id: string): void {
    this.compareRenderer.removeSymbol(id);
    this.updateViewportAndRender();
    this.eventBus.emit('compareChange', { id, change: 'remove' });
  }

  updateCompareData(id: string, data: DataSeries): void {
    this.compareRenderer.setSymbolData(id, data);
    this.updateViewportAndRender();
    this.eventBus.emit('compareChange', { id, change: 'data' });
  }

  setCompareMode(mode: 'percent' | 'absolute'): void {
    this.compareRenderer.setMode(mode);
    this.updateViewportAndRender();
  }

  /** Show or hide a compare line (`addCompareSymbol`'s id); a hidden one leaves the auto scale. */
  setCompareVisible(id: string, visible: boolean): void {
    this.compareRenderer.setSymbolVisible(id, visible);
    this.updateViewportAndRender();
    this.eventBus.emit('compareChange', { id, change: 'visible' });
  }

  /**
   * Each compare line at bar `barIndex` (the last bar by default), for a
   * legend: the other symbol's close at or before it, and its change in
   * percent since its first bar on screen, which is what its line reads on
   * a percent price scale (`setScaleMode('percentage')`). Past the compare's
   * last bar (bars you fetched once, the chart streaming on), its last close,
   * with `stale` true. Where the chart draws no compare lines, on Renko,
   * Kagi, line break, point & figure and range bars (`isTimeAligned()`
   * false), each one's close at the latest data bar, whatever `barIndex`,
   * and no change.
   */
  getCompareValues(barIndex?: number): CompareValue[] {
    if (!this.comparesDrawn()) {
      const bars = this.series.bars();
      return this.compareRenderer.valuesAt(bars, null, bars.length - 1);
    }
    const data = this.getDisplayData();
    return this.compareRenderer.valuesAt(data, this.viewport.getState(), barIndex ?? data.length - 1);
  }

  /**
   * Compare lines line up with the bars by time: not on the chart types
   * that redraw them (Renko bricks, Kagi lines…), whose times only count
   * them, so a line there would read the other symbol at the wrong bars or
   * at none.
   */
  private comparesDrawn(): boolean {
    return this.isTimeAligned();
  }

  /** Take every compare line off, each told as a `compareChange` of `'remove'`. */
  clearCompareSymbols(): void {
    const ids = this.compareRenderer.getSymbols().map((sym) => sym.id);
    this.compareRenderer.clear();
    this.updateViewportAndRender();
    for (const id of ids) this.eventBus.emit('compareChange', { id, change: 'remove' });
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
    const data = this.series.bars();
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
    const unit = barTimeUnit(data);
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
   * The times of the first and last bars on screen, in the bars' own unit:
   * of the series drawn (a Renko chart's bricks, not the bars under them).
   * Null without data.
   */
  getVisibleTimeRange(): { from: number; to: number } | null {
    const data = this.getDisplayData();
    if (data.length === 0) return null;
    // The bars whose middles are inside the plot (the viewport's range keeps a bar more each side to draw).
    const { offset, barWidth, barSpacing, chartRect } = this.viewport.getState();
    const unit = barWidth + barSpacing;
    if (unit <= 0) return null;
    const first = Math.ceil((offset - barWidth / 2) / unit);
    const last = Math.floor((offset + chartRect.width - barWidth / 2) / unit);
    const at = (index: number) => data[Math.max(0, Math.min(data.length - 1, index))].time;
    return { from: at(first), to: at(Math.max(first, last)) };
  }

  /**
   * Show the bars between two timestamps edge to edge. Times past either end
   * of the data are allowed (they map into the empty future / past).
   */
  setVisibleRange(fromTimestamp: number, toTimestamp: number): void {
    // The series on screen: bricks, not the bars under them, on Renko and the like.
    const data = this.getDisplayData();
    if (data.length === 0) return;
    const a = timestampToBarIndex(Math.min(fromTimestamp, toTimestamp), data);
    const b = timestampToBarIndex(Math.max(fromTimestamp, toTimestamp), data);
    // Previously this only changed the bar width around the centre, so the
    // requested range was not actually what ended up on screen.
    this.viewport.zoomToBarRange(a, b);
    this.updateViewportAndRender();
  }

  /**
   * Pause drawing, for a host that knows better than the page: a WebView
   * whose app went to the background, a tab of its own UI out of view. Data,
   * indicators and alerts keep up; `resume()` draws what changed.
   */
  suspend(): void {
    this.setPaused('host', true);
  }

  resume(): void {
    this.setPaused('host', false);
  }

  /** Whether the chart isn't drawing now: suspended, scrolled off screen, or on a hidden page. */
  isSuspended(): boolean {
    return this.pausedFor.host || this.pausedFor.page || this.pausedFor.offscreen;
  }

  private setPaused(reason: keyof Chart['pausedFor'], on: boolean): void {
    const was = this.isSuspended();
    this.pausedFor = { ...this.pausedFor, [reason]: on };
    const now = this.isSuspended();
    if (was === now || this.disposed) return;
    if (now) {
      this.engine.renderLoop.pause();
      return;
    }
    if (this.renderDeferred) {
      this.renderDeferred = false;
      this.scheduleRender();
    }
    this.engine.renderLoop.resume();
  }

  /**
   * With `pause`, stop drawing while the chart is off screen or the page
   * hidden: no frames for no one, which on a phone is battery, and in a page
   * of many charts, the frames of those in view. Either way, a page back in
   * view or a network back wakes the stream (a phone asleep leaves a dead
   * socket behind).
   */
  private watchVisibility(container: HTMLElement, pause: boolean): void {
    const stops: (() => void)[] = [];
    if (pause && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        const last = entries[entries.length - 1];
        if (last) this.setPaused('offscreen', !last.isIntersecting);
      });
      observer.observe(container);
      stops.push(() => observer.disconnect());
    }
    if (typeof document !== 'undefined') {
      const onVisibility = () => {
        if (pause) this.setPaused('page', document.hidden);
        if (!document.hidden) this.streamManager?.wake('visible');
      };
      document.addEventListener('visibilitychange', onVisibility);
      stops.push(() => document.removeEventListener('visibilitychange', onVisibility));
      if (pause && document.hidden) this.setPaused('page', true);
    }
    if (typeof window !== 'undefined') {
      const onOnline = () => this.streamManager?.wake('online');
      window.addEventListener('online', onOnline);
      stops.push(() => window.removeEventListener('online', onOnline));
    }
    this.stopWatchingVisibility = () => stops.forEach((stop) => stop());
  }

  /**
   * Leave vertical swipes and the plain wheel to the page (see
   * `ChartOptions.pageScroll`); the chart pans sideways and zooms with two
   * fingers or Ctrl + wheel.
   */
  setPageScroll(on: boolean): void {
    this.options.pageScroll = on;
    this.interactionManager.setPageScroll(on);
  }

  getPageScroll(): boolean {
    return this.options.pageScroll ?? false;
  }

  /**
   * The highest device pixel ratio to draw at (see `ChartOptions.maxPixelRatio`):
   * 2 by default, `Infinity` for the screen's own. The canvases resize at once.
   */
  setMaxPixelRatio(max: number): void {
    this.engine.dprManager.setMaxPixelRatio(max);
  }

  getMaxPixelRatio(): number {
    return this.engine.dprManager.getMaxPixelRatio();
  }

  /**
   * How narrow a bar slot may get to fit a long series, px (see
   * `ChartOptions.minBarUnit`): 0.25 by default, down to 0.02.
   */
  setMinBarUnit(px: number): void {
    this.viewport.setMinBarUnit(px);
    this.updateViewportAndRender();
  }

  getMinBarUnit(): number {
    return this.viewport.getMinBarUnit();
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
    const n = this.getDisplayData().length;
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
    this.lastBackground = this.themeManager.getTheme().background;
    this.engine.requestRender();
    this.eventBus.emit('themeChange', { theme: themeOrName });
    this.markStateChanged();
  }

  /**
   * The theme as set. The style overrides go on it apart: what is drawn
   * reads back from `getStyleValue` and `getStyle`.
   */
  getTheme(): Theme {
    return this.themeManager.getBaseTheme();
  }

  // --- Style overrides ---

  /**
   * Override any part of the chart's look, by key: the grid's lines each way,
   * the crosshair, the axes, the panes, the legend, the last price, the
   * volume, the main series as each chart type draws it, and more
   * (`CHART_STYLE_KEYS` lists them). A value sets a key, `null` takes it away.
   *
   * Candles: `series.candlestick.upColor` and `downColor` colour the bodies
   * and the wicks with them; `wickUpColor` and `wickDownColor` give the
   * wicks colours of their own. The other chart types take their up and
   * down colours from these when they have none of their own.
   *
   * `layer: 'host'` (default) is your app's: kept through theme changes,
   * never saved. `layer: 'user'` is what the person using the chart chose:
   * kept with the theme it was made on and saved with `saveState`. The
   * user's win over the host's. Unknown keys and values are left out with a
   * warning. Emits `styleChange`.
   */
  applyOverrides(patch: ChartStyleOverridesPatch, options: { layer?: StyleLayer } = {}): void {
    this.applyStyle(patch, options.layer ?? 'host', true);
  }

  /**
   * `overrides` in place of all of a layer's (the wrappers' `overrides` prop
   * does this): keys left out are taken away.
   */
  setOverrides(overrides: ChartStyleOverrides, options: { layer?: StyleLayer } = {}): void {
    const layer = options.layer ?? 'host';
    const { overrides: read, rejected } = readChartStyleOverrides(overrides);
    if (rejected.length > 0) console.warn(`Style overrides left out (unknown key or value): ${rejected.join(', ')}`);
    const values = Object.fromEntries(Object.entries(read).filter(([, v]) => v !== null)) as ChartStyleOverrides;
    if (this.themeManager.setOverrides(values, layer)) this.styleChanged(layer);
  }

  /** Take away `keys` from a layer, or all of its overrides without. */
  resetOverrides(keys?: readonly ChartStyleKey[], options: { layer?: StyleLayer } = {}): void {
    const layer = options.layer ?? 'host';
    if (this.themeManager.resetOverrides(layer, keys)) this.styleChanged(layer);
  }

  /** A layer's overrides (the user's: those for the current theme). */
  getOverrides(options: { layer?: StyleLayer } = {}): ChartStyleOverrides {
    return this.themeManager.getOverrides(options.layer ?? 'host');
  }

  /** The finer looks as resolved from the theme and the overrides. */
  getStyle(): Readonly<ResolvedChartStyle> {
    return this.themeManager.getTheme().style!;
  }

  /** What a key resolves to now: its override, or what it falls back to. */
  getStyleValue(key: ChartStyleKey): string | number | boolean | null {
    return this.themeManager.getStyleValue(key);
  }

  private applyStyle(patch: ChartStyleOverridesPatch, layer: StyleLayer, notify: boolean): void {
    const { overrides, rejected } = readChartStyleOverrides(patch);
    if (rejected.length > 0) console.warn(`Style overrides left out (unknown key or value): ${rejected.join(', ')}`);
    if (this.themeManager.applyOverrides(overrides, layer) && notify) this.styleChanged(layer);
  }

  private styleChanged(layer: StyleLayer): void {
    this.syncRenderContext();
    // The container's background only when the chart's changed: a host's own stays otherwise.
    const background = this.themeManager.getTheme().background;
    if (background !== this.lastBackground) {
      this.container.style.backgroundColor = background;
      this.lastBackground = background;
    }
    this.engine.requestRender();
    this.eventBus.emit('styleChange', { layer });
    // The user's are part of the chart's state; the host's are not.
    if (layer === 'user') this.markStateChanged();
  }

  // --- Watermark ---

  setWatermark(text: string, opts?: { color?: string; fontSize?: number }): void {
    this.watermark.setConfig({ text, ...opts });
    this.engine.requestRender(LayerType.Background);
  }

  // --- Auto Scale ---

  /**
   * Fit the price axis to the bars on view as they move, or hold the range
   * on screen (`false`), across `setData` too. Off, a new series (the first
   * bars, `setData`'s, a stream's symbol or timeframe switch) is still fitted
   * once, then held; bars that come one by one into an empty chart are
   * fitted until they fill it.
   */
  setAutoScale(enabled: boolean): void {
    this.options.autoScale = enabled;
    // Unlike the drag-to-scale/vertical-pan gesture freeze, an explicit call
    // here is a deliberate preference — it should survive the next setData()
    // the same way a constructor-time `autoScale: false` would.
    this.defaultAutoScale = enabled;
    // Off once bars are coming in: held from what is on screen now, not after the next.
    if (!enabled && this.series.length() > 0) this.seriesArriving = false;
    this.updateViewportAndRender();
  }

  /** A drag of the price axis or a vertical pan: the range on screen is the user's, held from here. */
  private holdPriceScale(): void {
    this.options.autoScale = false;
    this.priceFitPending = false;
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
    return this.series.bars();
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
    // The scale gives the band back to the candles, or takes it again.
    this.updateViewportAndRender();
  }

  /** Whether the volume bars are drawn: switched on, and `features.volume` not off. */
  isVolumeVisible(): boolean {
    return this.features.volume && this.volumeRenderer.isVisible();
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

  /** How the Market Profile is drawn, as `setMarketProfileConfig` left it. */
  getMarketProfileConfig(): import('@tradecanvas/core').MarketProfileConfig {
    return this.marketProfile.getConfig();
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

  getDepthHeatmapConfig(): { opacity: number; capacity: number } {
    return this.depthHeatmap.getConfig();
  }

  /**
   * Record an order-book snapshot for the liquidity heatmap, stamped at
   * `time`, or else at the latest bar's time. Call alongside `setDepthData`
   * on each book update; pass `time` to fill in books recorded for older
   * bars, oldest first.
   */
  pushDepthSnapshot(depth: import('@tradecanvas/commons').DepthData, time?: number): void {
    const data = this.series.bars();
    const at = time ?? data[data.length - 1]?.time;
    if (at === undefined || !Number.isFinite(at)) return;
    this.depthHeatmap.push(at, depth);
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

  getPeriodLevelsPeriod(): import('@tradecanvas/core').LevelPeriod {
    return this.periodLevels.getPeriod();
  }

  /**
   * The time zone for the time axis, crosshair, tooltip, day breaks and range
   * presets: an IANA zone (`'America/New_York'`, daylight saving included), a
   * fixed offset in minutes east of UTC (`-300`, `330`), `'exchange'` for the
   * symbol's zone (`setSymbolInfo`), else its market's (`setMarket`), else
   * UTC, or null for the browser's. Throws a RangeError for a zone the
   * browser doesn't know. The `timeZone` option sets it at the start.
   *
   * @example
   * chart.setTimeZone('America/New_York'); // New York's time, daylight saving included
   * chart.setTimeZone(330);                // UTC+5:30, in minutes
   * chart.setTimeZone('exchange');         // the symbol's zone, else its market's
   * chart.setTimeZone(null);               // the browser's
   */
  setTimeZone(tz: TimeZoneSetting): void {
    assertTimeZone(tz);
    this.timeZoneSetting = tz;
    this.applyTimeZone();
  }

  /** What `setTimeZone` was given — `'exchange'` included. */
  getTimeZone(): TimeZoneSetting {
    return this.timeZoneSetting;
  }

  /** The zone the chart shows: `'exchange'` resolved to the symbol's zone, else its market's (UTC when neither names one). */
  getEffectiveTimeZone(): TimeZoneSetting {
    return this.displayTz;
  }

  /**
   * The zone `'exchange'` stands for: the symbol's (`setSymbolInfo`, or the
   * stream's adapter), else its market's (`setMarket`); null when neither
   * names one the browser knows, and `'exchange'` then shows UTC.
   */
  getExchangeTimeZone(): string | null {
    return [symbolTimeZone(this.symbolInfo), this.marketConfig?.timeZone].find((zone) => zone && isValidTimeZone(zone)) ?? null;
  }

  /** @deprecated Use `setTimeZone`, spelled as the `timeZone` option is. */
  setTimezone(tz: TimeZoneSetting): void {
    this.setTimeZone(tz);
  }

  /** @deprecated Use `getTimeZone`. */
  getTimezone(): TimeZoneSetting {
    return this.getTimeZone();
  }

  /** @deprecated Use `getEffectiveTimeZone`. */
  getEffectiveTimezone(): TimeZoneSetting {
    return this.getEffectiveTimeZone();
  }

  /** @deprecated Use `getExchangeTimeZone`. */
  getExchangeTimezone(): string | null {
    return this.getExchangeTimeZone();
  }

  /** @deprecated Use `setTimeZone`, which takes an offset in minutes east of UTC, or null for the browser's zone. */
  setTimezoneOffset(minutes: number | null): void {
    this.setTimeZone(minutes);
  }

  /**
   * The exchange's zone where it counts beyond the zone shown: daily bars
   * built at its midnight are dated there, and so are days built from ticks.
   * Indicators that start again each day, week or month, the prior-day lines
   * and the market profile's sessions count their days there too.
   */
  private applyExchangeZone(): void {
    const zone = this.getExchangeTimeZone();
    this.timeAxis.setExchangeTimeZone(zone);
    this.crosshairHandler.setExchangeTimeZone(zone);
    this.crosshairTooltip.setExchangeTimeZone(zone);
    this.pinnedTooltip.setExchangeTimeZone(zone);
    if (!this.studyZoneHeld) this.applyStudyZone(zone);
  }

  /**
   * The zone the indicators, the prior-day lines, the market profile and the
   * bars built from trades count their days in. Held through a switch, the
   * next symbol's trades go on building the day its history ends on when it
   * trades on the same exchange, rather than starting UTC's day beside it.
   */
  private applyStudyZone(zone: string | null): void {
    this.studyZone = zone;
    this.streamManager?.setTimeZone(zone);
    this.periodLevels.setExchangeTimeZone(zone);
    this.marketProfile.setExchangeTimeZone(zone);
    const bars = this.series.bars();
    // With no bars yet, the data that comes computes them. Otherwise only
    // the indicators that count days in the zone, before the next read, not
    // now: the bars the symbol's hours filter again follow in setSymbolInfo,
    // and computing them computes everything once.
    if (this.indicatorEngine.setExchangeTimeZone(zone, bars.length > 0 ? bars : undefined) && bars.length > 0) {
      this.announceIndicatorUpdate(0);
    }
  }

  /**
   * The indicators keep the last symbol's zone while the feed is asked about
   * the next, for at most as long as the days it builds wait for the answer.
   */
  private holdStudyZone(): void {
    this.endStudyZoneWait();
    this.studyZoneHeld = true;
    this.studyZoneTimer = setTimeout(() => this.releaseStudyZone(), SYMBOL_ZONE_WAIT_MS);
  }

  private endStudyZoneWait(): void {
    this.studyZoneReleaseQueued = false;
    if (this.studyZoneTimer === null) return;
    clearTimeout(this.studyZoneTimer);
    this.studyZoneTimer = null;
  }

  /** No word on the next symbol is coming: the indicators and the rest take the chart's zone. */
  private releaseStudyZone(): void {
    this.endStudyZoneWait();
    if (!this.studyZoneHeld) return;
    this.studyZoneHeld = false;
    this.applyStudyZone(this.getExchangeTimeZone());
    if (!this.disposed) this.updateViewportAndRender();
  }

  /**
   * A disconnect ends the hold once the code that called it has run, unless
   * a connect came in it: a symbol switch made of `disconnectStream()` and
   * `connect()`, as the widget's are, asks about the next symbol in that
   * connect, which holds the zone on from its question, as `switchStream` does.
   */
  private releaseStudyZoneAfterCaller(): void {
    if (!this.studyZoneHeld) return;
    this.endStudyZoneWait();
    this.studyZoneReleaseQueued = true;
    queueMicrotask(() => {
      if (!this.studyZoneReleaseQueued || this.disposed) return;
      this.releaseStudyZone();
    });
  }

  /**
   * A bar's time as a screen reader hears it, in the chart's locale: a daily
   * bar's date, the one it stands for in any zone shown (`barDateZone`), as
   * the axis gives it; any other bar's date and time in the zone shown.
   */
  private spokenBarTime(time: number): string {
    const data = this.getDisplayData();
    const ms = time * barTimeUnit(data);
    const locale = this.numberLocale || 'en-US';
    if (barsAreDaily(data) === true) {
      return zonedDateFormatter(locale, { dateStyle: 'medium' }, barDateZone(ms, this.displayTz, this.getExchangeTimeZone()))(ms);
    }
    return zonedDateFormatter(locale, { dateStyle: 'medium', timeStyle: 'short' }, this.displayTz)(ms);
  }

  private applyTimeZone(): void {
    const tz = this.timeZoneSetting === EXCHANGE_TIME_ZONE ? (this.getExchangeTimeZone() ?? 'UTC') : this.timeZoneSetting;
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
   * price precision applies unless `setMarket` set one; its zone
   * (`timeZone`) backs `setTimeZone('exchange')` and dates daily bars; its
   * hours feed the session shading. `getSymbolInfo()` gives the zone as `timeZone` and as the older
   * `timezone`; given both with different zones, `timeZone` is the one, unless
   * it is the zone the chart already has for the symbol and `timezone` is new
   * (`{ ...chart.getSymbolInfo(), timezone: zone }` changes it).
   */
  setSymbolInfo(info: SymbolInfo | null): void {
    // From the host or the feed: the indicators take the zone it brings, or none.
    this.studyZoneHeld = false;
    this.endStudyZoneWait();
    this.useSymbolInfo(info);
  }

  /** `setSymbolInfo`, leaving the indicators' zone held or not as it is. */
  private useSymbolInfo(info: SymbolInfo | null): void {
    const held = info && this.symbolInfo?.symbol === info.symbol ? symbolTimeZone(this.symbolInfo) : undefined;
    this.symbolInfo = info ? withBothZoneSpellings({ ...info, sessions: info.sessions?.map((session) => ({ ...session })) }, held) : null;
    this.chartLegend.setExchange(this.symbolInfo?.exchange ?? '');
    this.engine.requestRender(LayerType.Hover);
    this.priceAxis.setPriceTick(this.symbolInfo?.minTick ?? null);
    if (this.marketConfig?.pricePrecision === undefined) {
      this.applyPricePrecision(this.symbolInfo?.pricePrecision ?? null);
    }
    const windows = (this.symbolInfo?.sessions ?? []).flatMap((session) => {
      const startMinute = sessionMinute(session.start);
      const endMinute = sessionMinute(session.end);
      return startMinute === null || endMinute === null ? [] : [{ startMinute, endMinute }];
    });
    const zone = symbolTimeZone(this.symbolInfo);
    // A symbol without hours of its own goes back to the host's.
    this.sessionShading.replaceConfig(windows.length > 0 && zone && isValidTimeZone(zone)
      ? { timeZone: zone, windows, startMinute: windows[0].startMinute, endMinute: windows[windows.length - 1].endMinute }
      : this.hostSessionHours);
    if (this.timeZoneSetting === EXCHANGE_TIME_ZONE) this.applyTimeZone();
    this.applyExchangeZone();
    this.reapplyExtendedHours();
    this.updateViewportAndRender();
    this.eventBus.emit('symbolInfoChange', { info: this.symbolInfo });
  }

  getSymbolInfo(): SymbolInfo | null {
    return this.symbolInfo;
  }

  /**
   * What the feed says about the symbol after it was asked: this chart's
   * (any case), over what is known of it, so a partial message keeps the rest.
   * The same again changes nothing.
   */
  private applyFeedSymbolInfo(info: Partial<SymbolInfo> | null | undefined): void {
    if (!info || typeof info !== 'object') return;
    const symbol = this.currentSymbol;
    const sameSymbol = (s: string | undefined) => !s || s.toUpperCase() === symbol.toUpperCase();
    if (!sameSymbol(info.symbol)) return;
    const known = this.symbolInfo && sameSymbol(this.symbolInfo.symbol) ? this.symbolInfo : null;
    // A zone in either spelling moves it: the known one is in both.
    const next: SymbolInfo = withBothZoneSpellings({ ...known, ...info, symbol: info.symbol || known?.symbol || symbol }, symbolTimeZone(known));
    if (known && JSON.stringify(next) === JSON.stringify(known)) return;
    // An answer to resolveSymbol still on its way is older than this.
    this.symbolInfoSeq++;
    this.setSymbolInfo(next);
  }

  /** Ask the stream's adapter about `symbol`, if it can tell; a late answer about another symbol is dropped. */
  private resolveStreamSymbol(adapter: DataAdapter, symbol: string): void {
    // Through the stream's own wrapper: the question it asks to build the symbol's days is this one.
    const source = withResampling(adapter);
    const resolve = source.resolveSymbol?.bind(source);
    // Another symbol's details go, whether or not the feed can be asked (it may send them later).
    // Its zone stays with the indicators until the answer comes.
    if (this.symbolInfo && this.symbolInfo.symbol !== symbol) {
      if (resolve) this.holdStudyZone();
      else this.studyZoneHeld = false;
      this.useSymbolInfo(null);
    } else if (resolve && this.studyZoneHeld) {
      // A switch on before the last symbol's answer came: the hold lasts as
      // long from this question, as the days the feed builds wait for it.
      this.holdStudyZone();
    }
    if (!resolve) {
      this.releaseStudyZone();
      return;
    }
    const seq = ++this.symbolInfoSeq;
    // Taken as a promise: an adapter may throw, or answer without one.
    Promise.resolve().then(() => resolve(symbol)).then(
      (info) => {
        // A newer question, or a disconnect, settles the zone instead.
        if (seq !== this.symbolInfoSeq) return;
        // No answer leaves what the host set for the symbol, if anything, and the chart's zone.
        if (info && this.currentSymbol === symbol) this.setSymbolInfo(info);
        else this.releaseStudyZone();
      },
      (err: unknown) => {
        if (seq !== this.symbolInfoSeq) return;
        // Only the symbol's details are missing; the feed itself is fine.
        this.releaseStudyZone();
        console.warn(`No symbol info for "${symbol}":`, err);
      },
    );
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

  getPivotMarkersConfig(): import('@tradecanvas/core').PivotMarkersConfig {
    return this.pivotMarkers.getConfig();
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

  /** Whether the legend is drawn: shown by `setLegend`, and `features.legend` not off. */
  isLegendVisible(): boolean {
    return this.features.legend && this.chartLegend.getConfig().visible;
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

  // --- Renderer ---

  /**
   * Draw the bars and volume with WebGL 2 (`'webgl'`; `'auto'` only on a real
   * GPU, not a software one) or with Canvas 2D (`'canvas'`). Resolves to what
   * draws now: Canvas 2D where WebGL 2 can't be had, or while the charts on
   * the page hold as many WebGL contexts as they may (`setMaxWebGLCharts`;
   * WebGL follows once one is let go). The WebGL code loads on first use.
   * Emits `rendererChange`.
   */
  async setRenderer(mode: RendererMode): Promise<'canvas' | 'webgl'> {
    const token = ++this.rendererToken;
    this.waitForGpu(null);
    if (mode === 'canvas') {
      this.applyRenderer(null);
      return 'canvas';
    }
    // Already on the GPU: keep that context rather than make a second one.
    if (this.engine.getGpu()) return 'webgl';
    return this.takeGpu(mode, token, true);
  }

  /** WebGL for `mode`; or Canvas 2D, waiting for a context to come free when the charts hold all they may. */
  private async takeGpu(mode: 'webgl' | 'auto', token: number, report: boolean): Promise<'canvas' | 'webgl'> {
    const { gpu, reason } = await loadWebGL(mode);
    // Superseded by a later call, or the chart is gone.
    if (token !== this.rendererToken || this.disposed) {
      gpu?.destroy();
      return this.getRenderer();
    }
    if (reason === 'limit') {
      // One may have come free since it was asked for (a superseded call let go).
      if (gpuContextsLeft() > 0) return this.takeGpu(mode, token, report);
      this.waitForGpu(() => void this.takeGpu(mode, token, false));
      if (report) this.applyRenderer(null, 'limit');
      return this.getRenderer();
    }
    // A retry that found no WebGL after all says nothing: it said 'limit' already.
    if (gpu || report) this.applyRenderer(gpu, reason);
    return this.getRenderer();
  }

  private waitForGpu(retry: (() => void) | null): void {
    this.stopWaitingForGpu?.();
    this.stopWaitingForGpu = retry ? whenGpuContextFree(retry) : null;
  }

  /** What draws the bars and volume now. */
  getRenderer(): 'canvas' | 'webgl' {
    return this.engine.getGpu() ? 'webgl' : 'canvas';
  }

  private applyRenderer(gpu: GpuRenderer | null, reason?: 'unsupported' | 'limit'): void {
    const before = this.getRenderer();
    if (gpu) this.engine.attachGpu(gpu);
    else this.engine.detachGpu();
    const now = this.getRenderer();
    if (now !== before || reason) this.eventBus.emit('rendererChange', reason ? { renderer: now, reason } : { renderer: now });
  }

  /**
   * Draw right before reading the canvases: the GPU canvas is cleared once
   * shown, and a paused chart hasn't drawn what changed since.
   */
  private freshFrame(): void {
    if (this.isSuspended()) {
      if (this.renderDeferred) {
        this.renderDeferred = false;
        this.refitForTick();
      }
      this.engine.renderNow();
      return;
    }
    if (this.engine.getGpu()) this.engine.renderNow();
  }

  // --- Screenshot ---

  screenshot(filename?: string): void {
    if (!this.features.screenshot) return;
    this.freshFrame();
    Screenshot.download(this.container, filename, this.themeManager.getTheme().background);
  }

  /** Copy the chart image to the clipboard. Returns false if unsupported/blocked. */
  async copyScreenshot(): Promise<boolean> {
    if (!this.features.screenshot) return false;
    const ClipboardItemCtor = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    // A runtime with no navigator has no clipboard either: that is a false, not an error.
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clipboard?.write || !ClipboardItemCtor) return false;
    try {
      this.freshFrame();
      const png = Screenshot.toBlob(this.container, this.themeManager.getTheme().background).then((blob) => {
        if (!blob) throw new Error('No chart image to copy');
        return blob;
      });
      // The write reports a missing image; this keeps it from also showing as an unhandled rejection.
      png.catch(() => {});
      // The item is made, and written, before anything is awaited, while the
      // image still encodes: Safari lets a page write the clipboard only while
      // the click that asked for it is being handled.
      let item: ClipboardItem;
      try {
        item = new ClipboardItemCtor({ 'image/png': png });
      } catch (err) {
        // Older browsers take only a Blob here, so they wait for the encoding.
        if (!(err instanceof TypeError)) throw err;
        item = new ClipboardItemCtor({ 'image/png': await png });
      }
      await clipboard.write([item]);
      return true;
    } catch {
      return false;
    }
  }

  screenshotDataURL(): string | null {
    if (!this.features.screenshot) return null;
    this.freshFrame();
    return Screenshot.toDataURL(this.container, this.themeManager.getTheme().background);
  }

  async screenshotBlob(): Promise<Blob | null> {
    if (!this.features.screenshot) return null;
    this.freshFrame();
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
    const data = this.replaySession ? this.series.liveBars() : this.getDisplayData();
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
   * `startIndex` is the first bar it reveals, an index of `getData()`: the
   * bars before it show at once, the later ones as it reaches them.
   * `interval` (ms, 500 by default) and `speed` (1) pace it at one bar
   * every `interval / speed` ms: `{ startIndex: 60, interval: 250 }` plays
   * from bar 60 at four bars a second. `paused: true` waits at the start.
   *
   * With `steps` (finer bars), each step grows the forming bar from them.
   * `animate: true` grows each bar over its time instead, and with `step`
   * (`'auto'` or an interval) the chart fetches the finer bars that shape it
   * through the connected feed; `step` needs `animate`.
   * A connected execution adapter that takes a mark price (a paper one)
   * trades on the replayed price and time.
   *
   * Signal markers and trade zones show as the replay reaches them
   * (`revealMarks: false` shows them all). `startTime` starts at a time
   * instead of a bar, `hideHistory` leaves the bars before the start out,
   * and `duration` plays to the end in about that long, however many bars.
   *
   * The replay is a time over the live series: when that changes (`setData`,
   * `connect` or `switchStream` to another symbol or timeframe, older bars,
   * the extended hours, a correction) it goes on over the new bars at the
   * same time, held while they load, and its indices change with them (a
   * load that fails keeps it held, still telling the state it was asked to
   * keep, until a later load comes in or `replayStop()`). It
   * ends there only when a paper account trades it and the symbol changes.
   * Call `replayStop()` first to end it as before.
   */
  replayStart(config?: Partial<import('@tradecanvas/core').ReplayConfig>): void {
    if (!this.features.replay) return;
    // A restart of a replay without its history: bar indices count in its window.
    const restartWindow = this.replaySession ? this.replayOffset : 0;
    if (!this.replaySession) {
      if (this.series.length() === 0) return; // nothing to replay
      this.series.beginReplay();
      this.replaySession = newReplaySession(this.currentSymbol);
    }
    const session = this.replaySession;
    // Replay the live series as it stands now (a restart includes bars that
    // arrived during the previous run).
    const { steps: rawSteps, startTime, hideHistory, revealMarks, step, ...playConfig } = config ?? {};
    // Set each start: the clock keeps what it was given before.
    playConfig.animate = playConfig.animate === true;
    const full = this.series.inHoursShown(this.series.liveBars());
    // Where it starts, as a bar of the whole series: from a time, or an index.
    // A restart within a window (no `startTime`, history not asked back) keeps
    // the window, and its index counts in it, as the replay's indices do.
    const inWindow = restartWindow > 0 && startTime === undefined && hideHistory !== false;
    let start = playConfig.startIndex;
    if (startTime !== undefined && start === undefined) start = firstAtOrAfter(full, startTime);
    else if (inWindow && start !== undefined) start += restartWindow;
    const windowStart = inWindow
      ? restartWindow
      : hideHistory && start !== undefined && start > 0 ? Math.min(Math.floor(start), full.length - 1) : 0;
    const coarse = windowStart > 0 ? full.slice(windowStart) : full;
    if (start !== undefined) playConfig.startIndex = start - windowStart;
    session.windowTime = windowStart > 0 ? coarse[0]?.time ?? null : null;
    session.steps = rawSteps ?? null;
    session.stepsSymbol = this.currentSymbol;
    session.until = null;
    session.animate = playConfig.animate;
    session.step = playConfig.animate ? step ?? null : null;
    this.replayRevealMarks = revealMarks !== false;
    this.useReplayLoader(session, true);
    const steps = rawSteps ? this.replayStepsOver(session, coarse, true) : null;
    // A replay fits each step; a price-axis drag from before shouldn't pin it.
    this.options.autoScale = true;
    this.buildReplay(coarse, steps, windowStart);
    const stepped = this.replayStepsSeries;
    if (stepped && playConfig.startIndex !== undefined) playConfig.startIndex = lastStepOfBar(stepped, coarse, playConfig.startIndex);
    const series = stepped ?? coarse;
    // Markers and trades as far as the start, or all of them.
    const first = series[Math.max(0, Math.min(Math.floor(Number(playConfig.startIndex ?? 0)) || 0, series.length - 1))];
    this.revealReplayMarks(this.replayRevealMarks ? first?.time ?? null : null);
    // Started while the next series loads: it waits there, to go on as asked.
    if (session.held) {
      session.held.state = playConfig.paused ? 'paused' : 'playing';
      playConfig.paused = true;
    }
    // Playing from a bar: the cut shows at once, not only after the first step.
    if (!playConfig.paused && playConfig.startIndex !== undefined && playConfig.startIndex >= 1) this.replaySeek(playConfig.startIndex - 1);
    this.replayManager.play(playConfig);
  }

  /**
   * Load a replay of `coarse` (in `steps`, finer bars, when given) into the
   * clock, stopped at its start, and show each of its steps. The bars before
   * `windowStart` of the series are left out (`hideHistory`).
   */
  private buildReplay(coarse: DataSeries, finer: DataSeries | null, windowStart: number): void {
    // With `animate` the clock counts the chart's bars; finer bars only shape them.
    const animate = this.replaySession?.animate === true;
    const steps = animate ? null : finer;
    this.replayPieces = animate && finer ? piecesByBar(finer, coarse) : null;
    this.replayForming = null;
    this.replayOffset = windowStart;
    this.replayStepsSeries = steps;
    this.replayCoarse = coarse;
    // Loading stops the run before: that is a restart, not the replay ending.
    const restarting = this.replayRestarting;
    this.replayRestarting = true;
    try {
      this.replayManager.load(steps ?? coarse);
    } finally {
      this.replayRestarting = restarting;
    }
    // Each replayStart used to stack another 'bar' listener, so a restarted
    // replay ran every step once per previous start.
    this.replayBarUnsub?.();
    this.replayPhaseUnsub?.();
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
        // Its last step ends the bar as the series has it: finer bars can disagree with it.
        shownBar = closesBar(steps, coarse, index, barIndex) ? coarse[barIndex] : forming;
      }
      const formed = this.replayForming;
      this.replayForming = null;
      lastStep = index;
      const nextLen = barIndex + 1;
      const forward = loaded > 0 && nextLen >= loaded && this.series.length() === loaded;
      // Like live data: a replay step follows the newest bar while the view
      // rests at the end, and leaves it alone while the user looks at history.
      // The first step and any seek (back or forward) show the replay
      // position. (Read before the new bars land: `isAtEnd` compares against
      // the old length.)
      const stepForward = forward && !this.replaySeeking;
      let follow = !stepForward || (this.autoScrollOnNewBar && this.viewport.isAtEnd());
      const shownBefore = this.series.length();
      if (forward) {
        // Forward: the bar that was forming closes as it is in the series, the
        // newly revealed bars are appended, and indicators update from there.
        // (With `animate` it was drawn part way; a bar already whole is written again unchanged.)
        if (nextLen > loaded) this.series.updateReplayed(coarse[loaded - 1]);
        for (let j = loaded; j < nextLen - 1; j++) this.series.appendReplayed(coarse[j]);
        if (nextLen > loaded) this.series.appendReplayed(shownBar);
        else this.series.updateReplayed(shownBar);
        this.recalcIndicatorsFrom(this.series.bars(), Math.max(0, loaded - 1));
      } else {
        // First step, or a seek: reload the prefix.
        this.series.showReplayed([...coarse.slice(0, barIndex), shownBar]);
        this.recalcIndicators(this.series.bars());
      }
      loaded = nextLen;
      // Older bars came in front: the view stays on the same bars.
      if (this.replayCause === 'older') {
        this.viewport.prependBars(nextLen - shownBefore);
        follow = false;
      }
      // The price line follows the replay, not the live market.
      this.currentPriceLine.setPrice(shownBar.close, barIndex > 0 ? coarse[barIndex - 1].close : undefined);
      this.crosshairHandler.setData(this.series.bars());
      // Up to when it has shown: the next step's time (past the last one, its spacing on).
      const next = series[index + 1]?.time;
      const until = next ?? series[index].time + (index > 0 ? series[index].time - series[index - 1].time : 1);
      if (this.replaySession) this.replaySession.until = until;
      // Markers and trades as far as the replay has shown, in the same frame as its bars.
      if (this.replayRevealMarks) this.revealReplayMarks(until);
      // The display cache isn't keyed to the data array — without this the
      // chart kept drawing the pre-replay series.
      this.displayDataCache = null;
      this.reshapeMemo.clear();
      this.updateViewportAndRender(follow);
      if (animate) this.feedReplayForming(coarse, index, formed?.index === index ? formed.path : this.replayPathOf(coarse, index), 1);
      else this.feedReplaySteps(series, index);
      const cause = this.replayCause !== null ? 'series' : stepForward ? 'play' : 'seek';
      this.eventBus.emit('replayStep', { barIndex, time: coarse[barIndex].time, stepTime: series[index].time, until, total: coarse.length, cause });
    });
    if (!animate) return;
    this.replayPhaseUnsub = this.replayManager.on('phase', ({ index, fraction }) => {
      const bar = coarse[index];
      // Shown as far as the bar before it (a new one appends), or forming it now.
      if (!bar || this.series.length() !== loaded || (loaded !== index && loaded !== index + 1)) return;
      const path = this.replayForming?.index === index ? this.replayForming.path : this.replayPathOf(coarse, index);
      const f = prefersReducedMotion() ? pathStop(path, fraction) : fraction;
      const appended = loaded === index;
      // A new bar follows the newest while the view rests at the end (read before it lands).
      const follow = appended && this.autoScrollOnNewBar && this.viewport.isAtEnd();
      const shown = formingAt(path, f);
      if (appended) this.series.appendReplayed(shown);
      else this.series.updateReplayed(shown);
      loaded = index + 1;
      this.replayForming = { index, path };
      this.drawFormingBar(shown, index > 0 ? coarse[index - 1].close : undefined, appended, follow);
      this.feedReplayForming(coarse, index, path, f);
      this.loadReplaySteps(coarse, index);
    });
  }

  /**
   * The bar forming in a replay drawn again, as `updateLastBar` draws a live
   * one, without the live price: alerts and orders keep watching the market.
   * A new bar fits the view as a replay step does.
   */
  private drawFormingBar(bar: OHLCBar, previousClose: number | undefined, appended: boolean, follow: boolean): void {
    this.currentPriceLine.setPrice(bar.close, previousClose);
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, data.length - 1);
    if (appended || !PLAIN_CHART_TYPES.has(this.options.chartType)) this.displayDataCache = null;
    if (!appended) {
      this.scheduleRender();
      return;
    }
    this.crosshairHandler.setData(data);
    this.reshapeMemo.clear();
    this.updateViewportAndRender(follow);
  }

  /** The path bar `index` of `coarse` forms along: its finer bars when they are in, else its own prices. */
  private replayPathOf(coarse: DataSeries, index: number): IntrabarPath {
    const bar = coarse[index];
    const finer = this.replayPieces?.get(bar.time) ?? this.replayLoader?.loader.piecesOf(bar.time) ?? [];
    return intrabarPath(bar, finer);
  }

  /** Finer bars for the bars the next few seconds of playback show, and none kept for those behind. */
  private loadReplaySteps(coarse: DataSeries, index: number): void {
    const loader = this.replayLoader?.loader;
    if (!loader) return;
    loader.evictBefore(coarse[index].time);
    const barMs = this.replayManager.getStepMs();
    loader.ensure(coarse, index, Number.isFinite(barMs) && barMs > 0 ? Math.ceil(REPLAY_LOOKAHEAD_MS / barMs) : 1);
  }

  /**
   * The loader of finer bars for a replay with `animate` and a `step`, kept
   * while the symbol and the interval are (`fresh`: a new one, at a start).
   * None without a connected feed, or a step it serves.
   */
  private useReplayLoader(session: ReplaySession, fresh: boolean): void {
    const adapter = this.streamAdapter;
    const chartTf = this.streamTimeframe;
    const step = session.step && adapter && chartTf !== null
      ? resolveReplayStep(session.step, chartTf, (tf) => servesTimeframe(adapter, tf))
      : null;
    const key = `${this.currentSymbol}|${chartTf}|${step}`;
    if (!fresh && this.replayLoader?.key === key) return;
    this.replayLoader?.loader.dispose();
    this.replayLoader = null;
    if (!step || !adapter || chartTf === null) return;
    const feed = withResampling(adapter);
    const fetchBefore = feed.fetchHistoryBefore;
    const symbol = this.currentSymbol;
    const barMs = timeframeToMs(chartTf);
    const loader = new ReplayStepLoader({
      source: fetchBefore ? (before, limit) => fetchBefore.call(feed, symbol, step, before, limit) : null,
      step,
      ratio: Math.max(1, Math.round(barMs / timeframeToMs(step))),
      barMs,
      keep: (bars) => this.series.inHoursShown(bars),
      report: (payload) => this.eventBus.emit('replayStepsLoad', payload),
    });
    this.replayLoader = { key, loader };
  }

  /**
   * A paper account trades on the prices a forming bar has been drawn
   * through, forward only by (time, fraction): the rest of a bar given in
   * part, the bars a jump passes, then this one up to `fraction`.
   */
  private feedReplayForming(coarse: DataSeries, index: number, path: IntrabarPath, fraction: number): void {
    const session = this.replaySession;
    const adapter = this.executionAdapter;
    const bar = coarse[index];
    if (!session || !adapter?.setMarkPrice || !bar) return;
    const fedTime = session.fedTime;
    if (fedTime === null) {
      session.fedTime = bar.time;
      session.fedFraction = fraction;
      this.feedReplayPrice(formingAt(path, fraction).close, bar.time);
      return;
    }
    if (bar.time < fedTime || (bar.time === fedTime && fraction <= session.fedFraction)) return;
    const marks: [number, number][] = [];
    if (bar.time > fedTime) {
      const part = firstAtOrAfter(coarse, fedTime);
      if (coarse[part]?.time === fedTime && session.fedFraction < 1) marks.push(...pathMarks(this.replayPathOf(coarse, part), session.fedFraction, 1));
      const passed = coarse.slice(firstAfter(coarse, fedTime), index);
      const size = Math.ceil(passed.length / MAX_REPLAY_CHUNKS);
      for (let i = 0; i < passed.length; i += size) marks.push(...replayMarks(passed.slice(i, i + size)));
      marks.push(...pathMarks(path, -1, fraction));
    } else {
      marks.push(...pathMarks(path, session.fedFraction, fraction));
    }
    session.fedTime = bar.time;
    session.fedFraction = fraction;
    for (const [price, time] of marks) adapter.setMarkPrice(price, time);
    const price = marks[marks.length - 1]?.[0];
    if (price !== undefined) this.tradingManager.setCurrentPrice(price);
  }

  /** The store says the live series changed during a replay: the replay follows it, by time. */
  private followLiveChange(change: LiveChange): void {
    const session = this.replaySession;
    if (!session) return;
    // A bar corrected that the replay hasn't reached yet shows when it does.
    if (change.kind === 'bar' && !(session.until !== null && change.time < session.until)) return;
    this.rebaseReplay(change.kind);
  }

  /**
   * Rebuild the replay on the live series as it is now, at the time it had
   * reached: the last bar (or step) that closed by then, so nothing after it
   * shows. Indices are worked out again from the time. A time older than the
   * series pages older bars in first, while a history loader has them. A
   * replay held for a new series goes on as it was asked to; one held while
   * the hours change or a bar is corrected stays held.
   */
  private rebaseReplay(kind: LiveChange['kind']): void {
    const session = this.replaySession;
    if (!session) return;
    const full = this.series.inHoursShown(this.series.liveBars());
    if (full.length === 0) return;
    const windowStart = session.windowTime === null ? 0 : Math.min(firstAtOrAfter(full, session.windowTime), full.length - 1);
    const coarse = windowStart > 0 ? full.slice(windowStart) : full;
    this.useReplayLoader(session, false);
    const steps = this.replayStepsOver(session, coarse);
    const stepped = session.animate ? null : steps;
    const at = session.until === null ? 0 : positionAt(stepped ?? coarse, session.until);
    if (at < 0 && this.canPageBackForReplay(session)) {
      this.holdReplay();
      if (session.held) session.held.pagesBack++;
      queueMicrotask(() => void this.pageBackForReplay(session));
      return;
    }
    const reported = this.getReplayState();
    const stayHeld = session.held !== null && (kind === 'hours' || kind === 'bar');
    const goOn = session.held?.state ?? reported;
    if (!stayHeld) session.held = null;
    session.symbol = this.currentSymbol;
    // A `duration` keeps the time it had left (read before the clock takes the new steps).
    const remaining = this.replayManager.remainingMs();
    this.clearBarHolders();
    if (session.animate) mapReplayFeed(session, this.replayCoarse, coarse);
    const restarting = this.replayRestarting;
    this.replayRestarting = true;
    this.replayCause = kind === 'older' ? 'older' : 'series';
    try {
      this.buildReplay(coarse, steps, windowStart);
      this.restartReplayAt(Math.max(0, at), remaining, !stayHeld && goOn === 'playing');
    } finally {
      this.replayRestarting = restarting;
      this.replayCause = null;
    }
    const state = this.getReplayState();
    if (state !== reported && !restarting) this.eventBus.emit('replayState', { state });
    this.emitBars(this.series.length());
  }

  /** The replay just rebuilt, at step `at`: a `duration` pace takes the `remaining` ms it had left. */
  private restartReplayAt(at: number, remaining: number | null, play: boolean): void {
    this.replayManager.play({ paused: true, startIndex: at, ...(remaining !== null ? { duration: remaining } : {}) });
    if (play) this.replayManager.resume();
  }

  /** The pinned tooltip and the ruler hold bar positions, which a rebuilt replay moves. */
  private clearBarHolders(): void {
    if (this.pinnedTooltip.isPinned()) this.pinnedTooltip.unpin();
    this.measureOverlay.end();
    this.sessionBreaks.invalidateCache();
  }

  /** The host's finer steps over `coarse`, while they are of its symbol and fit its bars; else none. */
  private replayStepsOver(session: ReplaySession, coarse: DataSeries, starting = false): DataSeries | null {
    if (!session.steps || session.stepsSymbol !== this.currentSymbol) return null;
    // Only the hours shown: after-hours steps never reach the last regular bar.
    const steps = replaySteps(this.series.inHoursShown(session.steps), coarse);
    return steps && (starting || stepsFit(steps, coarse)) ? steps : null;
  }

  /** Whether a replay's time older than the series can page older bars in to reach it. */
  private canPageBackForReplay(session: ReplaySession): boolean {
    return this.history.hasLoader() && this.history.hasMore() && (session.held?.pagesBack ?? 0) < MAX_REPLAY_PAGES_BACK;
  }

  /** One page of older bars for a held replay; when none comes, it goes on from the first bar there is. */
  private async pageBackForReplay(session: ReplaySession): Promise<void> {
    if (this.replaySession !== session || !session.held) return;
    // A page that lands rebuilds the replay itself (the store tells it).
    const added = await this.history.loadMore();
    if (added > 0 || this.replaySession !== session || !session.held) return;
    session.held.pagesBack = MAX_REPLAY_PAGES_BACK;
    this.rebaseReplay('older');
  }

  /** A replay waits while a new series loads: its clock stops, untold, and it goes on as it was once the series is in. */
  private holdReplay(): void {
    const session = this.replaySession;
    if (!session || session.held) return;
    const state = this.replayManager.getState() === 'playing' ? 'playing' : 'paused';
    const restarting = this.replayRestarting;
    this.replayRestarting = true;
    try {
      this.replayManager.pause();
    } finally {
      this.replayRestarting = restarting;
    }
    session.held = { state, pagesBack: 0 };
  }

  /** A series of `symbol` is on its way: a replay ends if a paper account trades it on another symbol, else waits for it. */
  private holdReplayFor(symbol: string): void {
    if (!this.replaySession) return;
    if (this.replayEndsFor(symbol)) this.replayStop();
    else this.holdReplay();
  }

  /** Whether a replay ends on a series of `symbol`: a paper account trades it, and the symbol is another. */
  private replayEndsFor(symbol: string): boolean {
    const session = this.replaySession;
    return session !== null && this.replayTrades() && symbol !== session.symbol;
  }

  /** Whether history pages in now: always outside a replay; in one, over the whole series and not held. */
  private replayPages(): boolean {
    const session = this.replaySession;
    return session === null || (session.windowTime === null && session.held === null);
  }

  /** Markers and trades as far as a replay has shown, from its window on; `null` shows them all. */
  private revealReplayMarks(until: number | null): void {
    const from = until !== null && this.replayOffset > 0 ? this.replayCoarse?.[0]?.time ?? -Infinity : -Infinity;
    this.signalMarkerManager.setRevealUntil(until, from);
    this.tradeZoneManager.setRevealUntil(until, from);
  }

  /** Jump the replay to show the bars (or finer steps) that closed by `time`. */
  replaySeekToTime(time: number): void {
    if (!this.replaySession || !this.replayCoarse) return;
    // The last bar (or step) that closed by then: a coarser chart following a
    // finer one never shows a bar whole before it closes.
    this.replaySeek(Math.max(0, positionAt(this.replayStepsSeries ?? this.replayCoarse, time)));
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
    const live = this.series.liveBars();
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
    if (this.replayForming) return this.replayForming.index;
    const { current } = this.replayManager.getProgress();
    const steps = this.replayStepsSeries;
    return steps && this.replayCoarse ? barAt(this.replayCoarse, steps[current]?.time ?? -Infinity) : current;
  }

  /** Jump the replay to the end of bar `barIndex` of the chart's series (a click on it). */
  replaySeekToBar(barIndex: number): void {
    const steps = this.replayStepsSeries;
    this.replaySeek(steps && this.replayCoarse ? lastStepOfBar(steps, this.replayCoarse, barIndex) : barIndex);
  }

  replayPause(): void {
    if (!this.setHeldState('paused')) this.replayManager.pause();
  }
  replayResume(): void {
    if (!this.setHeldState('playing')) this.replayManager.resume();
  }

  /** A replay held for a new series goes on in `state` once the series is in. False when none is held. */
  private setHeldState(state: 'playing' | 'paused'): boolean {
    const held = this.replaySession?.held;
    if (!held) return false;
    if (held.state !== state) {
      held.state = state;
      this.eventBus.emit('replayState', { state });
    }
    return true;
  }
  /** End the replay and return to the live series (with updates that arrived meanwhile). */
  replayStop(): void {
    const session = this.replaySession;
    const live = this.endReplaySession();
    if (!session || !live) return;
    this.loadSeries(live, true);
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

  /**
   * The box a drawing covers on screen, in CSS pixels relative to the chart
   * container, cut to the plot: where a host puts a toolbar or a note over
   * it. Lines that run across the whole plot (horizontal, vertical, cross)
   * span it on that side. Null for an unknown or hidden drawing (or one kept
   * off this interval), or one that is all off screen.
   */
  getDrawingRect(id: string): { x: number; y: number; width: number; height: number } | null {
    const drawing = this.drawingManager.getDrawings().find((d) => d.id === id);
    if (!drawing || !this.drawingManager.isShown(id) || drawing.anchors.length === 0) return null;
    const vs = { ...this.viewport.getState(), data: this.getDisplayData() };
    const plot = vs.chartRect;
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const anchor of drawing.anchors) {
      const x = timeToX(anchor.time, vs);
      const y = priceToY(anchor.price, vs);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    if (FULL_WIDTH_DRAWINGS.has(drawing.type)) [left, right] = [plot.x, plot.x + plot.width];
    else if (drawing.type === 'horizontalRay') right = plot.x + plot.width;
    if (FULL_HEIGHT_DRAWINGS.has(drawing.type)) [top, bottom] = [plot.y, plot.y + plot.height];
    left = Math.max(left, plot.x);
    right = Math.min(right, plot.x + plot.width);
    top = Math.max(top, plot.y);
    bottom = Math.min(bottom, plot.y + plot.height);
    if (!(left <= right && top <= bottom)) return null;
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  /**
   * Stop the replay clock and drop the session without touching the bars
   * shown. Returns the live series it kept aside; null without a replay.
   */
  private endReplaySession(): DataSeries | null {
    if (!this.replaySession) return null;
    this.returnMarkToLive();
    const live = this.series.endReplay();
    this.replaySession = null;
    this.replayStepsSeries = null;
    this.replayCoarse = null;
    this.replayBarUnsub?.();
    this.replayBarUnsub = null;
    this.replayPhaseUnsub?.();
    this.replayPhaseUnsub = null;
    this.replayLoader?.loader.dispose();
    this.replayLoader = null;
    this.replayPieces = null;
    this.replayForming = null;
    this.replayManager.stop();
    this.replayOffset = 0;
    this.revealReplayMarks(null);
    return live;
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
  /** A replay held while the next series loads reports the state it goes on in. */
  getReplayState(): 'playing' | 'paused' | 'stopped' {
    return this.replaySession?.held?.state ?? this.replayManager.getState();
  }

  /**
   * Where the replay is: `current` and `total` count its steps, `time` is
   * when the bar forming now opened and `until` the time it has shown
   * everything before (null without a replay, or before its first step).
   * Indices are of the series replayed now and change when it does; the
   * time doesn't: `replaySeekToTime(until)` comes back to it.
   */
  getReplayProgress(): { current: number; total: number; percent: number; time: number | null; until: number | null } {
    const session = this.replaySession;
    const bar = session ? this.replayCoarse?.[this.getReplayBarIndex()] : undefined;
    return { ...this.replayManager.getProgress(), time: session?.until != null && bar ? bar.time : null, until: session?.until ?? null };
  }

  // --- Save / Load ---

  /** Everything `loadState` restores: chart type, theme, drawings, indicators, alerts. */
  private captureSnapshot(): import('@tradecanvas/core').ChartSnapshot {
    return ChartStateManager.capture(
      {
        getDrawings: () => this.getDrawings(),
        // The theme as set: the overrides go apart, the user's saved by theme.
        getTheme: () => this.themeManager.getBaseTheme(),
        getAlerts: () => this.getAlerts(),
        getIndicators: () => this.getIndicatorSetup(),
        getOverrides: () => this.themeManager.getUserOverrides(),
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
    const { plots: havePlots, ...have } = this.indicatorEngine.getIndicatorStyle(instanceId) ?? { colors: [], lineWidths: [], opacity: 1 };
    const { plots: wantPlots, ...want } = ind.style ?? {};
    if (ind.style && JSON.stringify({ ...have, ...want }) !== JSON.stringify(have)) this.updateIndicatorStyle(instanceId, want);
    // Plot styles are merged by updateIndicatorStyle: here they are put back whole.
    if (JSON.stringify(wantPlots ?? {}) !== JSON.stringify(havePlots ?? {})) {
      this.indicatorEngine.setPlotStyles(instanceId, wantPlots ?? null);
      this.engine.requestRender();
    }
    const config = this.indicatorEngine.getIndicatorConfig(instanceId);
    if ((ind.visible ?? true) !== (config?.visible ?? true)) this.setIndicatorVisible(instanceId, ind.visible ?? true);
    const levels = ind.levels ?? null;
    if (JSON.stringify(levels) !== JSON.stringify(config?.levels ?? null)) this.setIndicatorLevels(instanceId, levels);
    const intervals = ind.intervals ?? null;
    if (JSON.stringify(intervals) !== JSON.stringify(config?.intervals ?? null)) this.setIndicatorIntervalsNow(instanceId, intervals);
    this.setPaneStyleNow(instanceId, ind.paneStyle ? readPaneStyle(ind.paneStyle) : null);
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
          ...(config?.intervals ? { intervals: this.indicatorEngine.getIntervals(ind.instanceId) ?? undefined } : {}),
          ...(panel && this.paneStyles.has(ind.instanceId) ? { paneStyle: { ...this.paneStyles.get(ind.instanceId) } } : {}),
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
  /**
   * Start an edit of one indicator, as its settings dialog does: its changes
   * until `endIndicatorEdit` are one undo step, and none when they end where
   * they began (a cancel that put everything back).
   */
  beginIndicatorEdit(instanceId: string): void {
    this.endIndicatorEdit();
    if (!this.features.drawingUndoRedo) return;
    this.indicatorEdit = { subject: instanceId, before: this.getIndicatorSetup() };
    this.indicatorHistoryDepth++;
  }

  /** End the edit `beginIndicatorEdit` started, as one undo step when anything changed. */
  endIndicatorEdit(): void {
    const edit = this.indicatorEdit;
    if (!edit) return;
    this.indicatorEdit = null;
    this.indicatorHistoryDepth--;
    const after = this.getIndicatorSetup();
    if (JSON.stringify(after) === JSON.stringify(edit.before)) return;
    this.undoRedoManager.push({ type: 'indicators', before: null, after: null, indicators: { before: edit.before, after, subject: edit.subject, at: performance.now() } });
  }

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

  /**
   * The layout as JSON: the drawings, the indicators and their panes, the
   * alerts, the chart type and its settings, the theme and the style
   * overrides, the symbol; not the bars. With `key`, also written to
   * `localStorage[key]`, the key as given (it throws where localStorage does:
   * blocked, or full). Null with `features.saveLoad` off.
   */
  saveState(key?: string): string | null {
    if (!this.features.saveLoad) return null;
    const snapshot = this.captureSnapshot();
    const json = ChartStateManager.serialize(snapshot);
    if (key) ChartStateManager.saveToStorage(key, snapshot);
    return json;
  }

  /**
   * A layout `saveState` gave, in place of the chart's own drawings,
   * indicators, alerts, chart type and style overrides. The bars and the
   * symbol stay; so does the theme, unless the layout's is `'dark'` or
   * `'light'`.
   */
  loadState(json: string): void {
    if (!this.features.saveLoad) return;
    const snapshot = ChartStateManager.deserialize(json);
    // The saved type's settings (none saved: the defaults).
    this.chartTypeOptions = snapshot.chartTypeOptions ?? {};
    this.displayDataCache = null;
    this.reshapeMemo.clear();
    if (snapshot.chartType) this.setChartType(snapshot.chartType);
    if (snapshot.drawings) this.setDrawings(snapshot.drawings);
    // A save names its theme: a built-in one loads, another (only its name was
    // kept) leaves the chart's theme as it is.
    if (snapshot.theme === 'dark' || snapshot.theme === 'light') this.setTheme(snapshot.theme);
    // The user's overrides as saved. A save from before them (version 1 or 2) leaves them alone.
    if (snapshot.version >= 3 && this.themeManager.setUserOverrides(snapshot.overrides ?? {})) this.styleChanged('user');

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

  /** The layout saved under `localStorage[key]` (`saveState(key)`, `setAutoSave(key)`); false when there is none, and it throws on one that isn't JSON. */
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
   * (e.g. price axis labels, crosshair value badges, month names on the time axis).
   * Defaults to 'en-US'. Example values: 'de-DE', 'vi-VN', 'fr-FR'.
   */
  setNumberLocale(locale: string): void {
    this.numberLocale = locale;
    this.viewport.setNumberLocale(locale);
    this.priceAxis.setLocale(locale);
    this.leftPriceAxis.setLocale(locale);
    this.crosshairHandler.setLocale(locale);
    this.timeAxis.setLocale(locale);
    this.chartLegend.setLocale(locale);
    this.crosshairTooltip.setLocale(locale);
    this.pinnedTooltip.setLocale(locale);
    this.currentPriceLine.setLocale(locale);
    // Separators change label widths; the axis may need to refit.
    this.updateViewportAndRender();
  }

  getNumberLocale(): string {
    return this.numberLocale;
  }

  // --- Market ---

  /**
   * The rules of the market the symbol trades on (`MARKET_HOSE`,
   * `MARKET_NYSE`… or your own): its price steps for `roundPrice` and the
   * order ticket, its decimals on every price, its colours on the candles,
   * its daily limits once `setPriceLimits` gives the reference.
   *
   * The axis keeps its zone: `setTimeZone('exchange')` shows the market's
   * (the symbol's own, when `setSymbolInfo` gave one). That zone also dates
   * daily bars, and starts the days a `ChartWidget` builds from its bars.
   * Numbers keep the chart's locale (`numberLocale`). Sends `marketChange`.
   *
   * @example
   * chart.setMarket(MARKET_HOSE);
   * chart.setTimeZone('exchange');     // Asia/Ho_Chi_Minh
   * chart.setPriceLimits(25.35);       // yesterday's close: ceiling 27.1, floor 23.6
   */
  setMarket(config: MarketConfig): void {
    this.marketConfig = config;
    // The host names the zone: the indicators wait for no symbol's.
    this.studyZoneHeld = false;
    this.endStudyZoneWait();
    // `'exchange'` shows the market's zone when the symbol names none.
    if (this.timeZoneSetting === EXCHANGE_TIME_ZONE) this.applyTimeZone();
    this.applyExchangeZone();

    // The market's colours on the candles; volume keeps the theme's own.
    if (config.colorScheme) {
      const base = this.themeManager.getBaseTheme();
      const marketTheme: Theme = {
        ...base,
        candleUp: config.colorScheme.up,
        candleDown: config.colorScheme.down,
        candleUpWick: config.colorScheme.up,
        candleDownWick: config.colorScheme.down,
      };
      this.themeManager.setTheme(marketTheme);
    }

    // Apply price precision to trading, alerts, and price line
    if (config.pricePrecision !== undefined) this.applyPricePrecision(config.pricePrecision);

    // Longer price labels may need a wider axis.
    this.updateViewportAndRender();
    this.eventBus.emit('marketChange', { market: config });
  }

  /** Prices show `precision` decimals everywhere; null goes back to fitting the price range. */
  private applyPricePrecision(precision: number | null): void {
    this.marketPricePrecision = precision;
    // On the viewport for what draws from it alone: drawing labels, price
    // limits, pivots, the measure, the market profile and plugins.
    this.viewport.setPricePrecision(precision);
    this.pinnedTooltip.setPricePrecision(precision);
    this.priceAxis.setPricePrecision(precision);
    this.tradingManager.setConfig({ pricePrecision: precision ?? undefined });
    this.alertManager.setPricePrecision(precision);
    this.tradeZoneManager.setPricePrecision(precision);
    this.streamManager?.priceLine.setPricePrecision(precision);
    this.currentPriceLine.setPricePrecision(precision);
    this.crosshairHandler.setPricePrecision(precision);
    this.chartLegend.setPricePrecision(precision);
    this.crosshairTooltip.setPricePrecision(precision);
  }

  getMarket(): MarketConfig | null {
    return this.marketConfig;
  }

  /**
   * The day's ceiling, floor and reference prices, from the market's limits
   * and the reference `setPriceLimits` gave; null without them.
   */
  getPriceLimits(): PriceLimitInfo | null {
    const market = this.marketConfig;
    if (!market?.priceLimits?.enabled || !market.priceLimits.referencePrice) return null;
    return computePriceLimits(market.priceLimits.referencePrice, market);
  }

  /** The day's reference price, for the limits; a later `setMarket` starts without one. */
  setPriceLimits(referencePrice: number): void {
    if (!this.marketConfig?.priceLimits) return;
    // A copy: the market given may be a preset other charts share.
    this.marketConfig = {
      ...this.marketConfig,
      priceLimits: { ...this.marketConfig.priceLimits, referencePrice },
    };
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
      this.updateViewportAndRender();
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
    this.disposed = true;
    this.stopWatchingVisibility?.();
    this.stopWatchingVisibility = null;
    this.waitForGpu(null);
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
    this.labelWidths.destroy();
    this.container.innerHTML = '';
  }

  // --- Internal ---

  private createChartRenderer(type: ChartType | string): ChartRendererInterface {
    const renderer = resolveRenderer(type, (t) => this.pluginManager.getChartType(t));
    if (renderer instanceof HiLoRenderer) renderer.setPriceText((p) => this.formatPrice(p));
    return renderer;
  }

  /** Cached display data. Invalidated when raw data or chart type changes. */
  /**
   * The bars the crosshair reports: the data bars where each drawn bar is one
   * (candles, Heikin-Ashi: the real prices), the series drawn where it isn't
   * (Renko bricks, Kagi lines), whose slots are not data indices.
   */
  private crosshairSeries(): DataSeries {
    return this.isTimeAligned() ? this.series.bars() : this.getDisplayData();
  }

  private getDisplayData(): DataSeries {
    const raw = this.series.bars();
    // Range bars go on the market's own grid, not the decimals the axis shows, which follow the view: the
    // coarsest step of the bars their range is measured on, so a last price over a band edge rebuilds nothing.
    const step = this.options.chartType === 'rangeBars' ? rangeBarsStep(raw, (price) => this.stepAt(price)) : undefined;
    if (this.displayDataCache && step === this.displayDataStep) return this.displayDataCache;
    if (raw.length === 0) return raw;
    const result = this.displaySeries(raw, step);
    this.displayDataCache = result;
    this.displayDataStep = step;
    return result;
  }

  /**
   * The series the chart type draws. The built-in point & figure's columns
   * come with the box they were built on, which its renderer draws them at,
   * in the one walk (a plugin's chart type keeps its own).
   */
  private displaySeries(raw: DataSeries, step: number | undefined): DataSeries {
    const type = this.options.chartType;
    const lookup = (t: string) => this.pluginManager.getChartType(t);
    if (type !== 'pointAndFigure' || lookup(type)) return resolveDisplayData(type, raw, lookup, this.chartTypeOptions, step, this.reshapeMemo);
    const { columns, boxSize } = pointAndFigureDisplay(raw, this.chartTypeOptions, this.reshapeMemo);
    if (this.chartRenderer instanceof PointAndFigureRenderer) this.chartRenderer.setBoxSize(boxSize);
    return columns;
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

  /**
   * Draw a frame soon, though nothing the chart knows of changed: after a
   * plugin's own settings changed, say (an overlay's display mode), in a
   * quiet market with no ticks to redraw it. The frame refits the scales to
   * the data as a tick's would. Requests before the frame make one frame; a
   * destroyed chart ignores them.
   */
  requestRender(): void {
    this.scheduleRender();
  }

  /** Lightweight render for streaming updates. No layout resolve, no indicator recalc. */
  private scheduleRender(): void {
    if (this.renderScheduled || this.disposed) return;
    // Paused: nothing draws, so the refit waits for resume (or a screenshot).
    if (this.isSuspended()) {
      this.renderDeferred = true;
      return;
    }
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      if (this.disposed) return;
      if (this.isSuspended()) {
        this.renderDeferred = true;
        return;
      }
      this.refitForTick();
    });
  }

  private refitForTick(): void {
    // A tick moves indicator values: refit the panes' scales.
    this.panelInfoCache = null;
    this.fitDataAndAxes();
    this.syncRenderContext();
    this.engine.requestRender();
    this.emitViewportEvents();
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
    const autoScale = this.options.autoScale !== false || this.priceFitPending;

    // updateData first so dataLength is current for scrollToEnd — but only
    // fit the price range once the FINAL visible window is known. Fitting
    // before scrollToEnd measured the old window (e.g. deep history) and left
    // every bar of a freshly loaded series off-screen.
    this.viewport.updateData(displayData, false);
    if (scrollToEnd) {
      this.viewport.scrollToEnd();
      this.viewport.updateData(displayData, false);
    }

    const vs = this.viewport.getState();

    // Baseline for percentage / indexed-to-100 axis labels: the close of the
    // first visible bar. Ignored by other scale modes.
    if (displayData.length > 0) {
      const baseIdx = Math.max(0, Math.min(vs.visibleRange.from, displayData.length - 1));
      this.viewport.setScaleBaseline(displayData[baseIdx]?.close);
    }

    // Fitted on the new baseline: percent compare lines start there.
    if (autoScale) this.fitPriceScale(displayData, this.viewport.getState());
    return displayData;
  }

  /**
   * Fit the price scale to the bars on view, the overlay indicators (BB,
   * Ichimoku…) and the compare lines, in margins of φ⁻⁵ above and below;
   * with volume on view, the band at the bottom is left to it.
   */
  private fitPriceScale(displayData: DataSeries, vs: ViewportState): void {
    if (displayData.length === 0) return;
    const from = Math.max(0, vs.visibleRange.from);
    const to = Math.min(vs.visibleRange.to, displayData.length - 1);
    const range = joinRanges(
      joinRanges(computePriceRange(displayData, from, to, 0), this.indicatorEngine.getOverlayPriceRange(from, to)),
      this.features.compareSymbols && this.comparesDrawn() ? this.compareRenderer.getPriceRange(displayData, vs) : null,
    )!;
    const volume = this.features.volume && this.volumeRenderer.isVisible() && hasVolume(displayData, from, to);
    const band = volume ? this.volumeRenderer.getHeightRatio() + VOLUME_GAP : PRICE_SCALE_MARGIN;
    // The band is at the screen's bottom: on an upside-down scale that is above the highest price.
    this.viewport.setScaleMargins(this.viewport.isInvertScale()
      ? { top: band, bottom: PRICE_SCALE_MARGIN }
      : { top: PRICE_SCALE_MARGIN, bottom: band });
    this.viewport.fitToPrices(range.min, range.max);
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
    const shown = this.applyDataToViewport(scrollToEnd);
    const priceResized = this.fitPriceAxisWidth();
    this.leftViewport = this.computeLeftViewport();
    if (this.fitLeftAxisWidth() || priceResized) this.applyDataToViewport(scrollToEnd);
    // The new series' prices are on the axis: auto-scale off holds them from here.
    if (this.priceFitPending && this.priceFitDone(shown)) this.priceFitPending = false;
  }

  /**
   * Whether the new series' bars on view were fitted: there are some, on a
   * plot with room for them. A chart with no size yet (a hidden tab or
   * panel) has none on view, so it fits them once it gets one. A series that
   * began with no bars is still coming in while all of it fits on screen:
   * each bar it gets one by one is fitted too, not just its first.
   */
  private priceFitDone(shown: DataSeries): boolean {
    const { chartRect, offset, barWidth, barSpacing } = this.viewport.getState();
    if (shown.length === 0 || chartRect.width <= 0) return false;
    const allOnView = offset <= 0 && shown.length * (barWidth + barSpacing) - offset <= chartRect.width;
    return !(this.seriesArriving && allOnView);
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
      scaleLabel: (price) => this.priceAxis.labelText(price, this.viewport.getState()),
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

  /**
   * The width of a label as the chart draws it. It measures on the chart's own
   * canvas: in Chromium a canvas's text takes what the page passes down to the
   * element (the widget's tabular figures, wider in a proportional face),
   * which a canvas out of the page doesn't get, so the axis would be sized too
   * narrow for its crosshair pill. Such a measure costs more than one out of
   * the page, so its widths are kept; a canvas not yet in the page measures
   * afresh each time, as its widths change once it is.
   */
  private measureText(text: string, font: string): number {
    const scene = this.engine.layerManager.getLayer(LayerType.Main)?.ctx;
    if (scene?.canvas.isConnected) return this.labelWidths.get(text, font, () => measureWith(scene, text, font));
    const ctx = scene ?? this.detachedMeasureContext();
    if (!ctx) return text.length * 7; // no canvas (SSR/tests): a generous estimate
    return measureWith(ctx, text, font);
  }

  private detachedMeasureContext(): CanvasRenderingContext2D | null {
    if (this.measureCtx === undefined) {
      this.measureCtx = typeof document !== 'undefined'
        ? document.createElement('canvas').getContext('2d')
        : null;
    }
    return this.measureCtx;
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

      const style = this.paneStyles.get(panel.config.id);
      return {
        instanceId: panel.config.id,
        members: this.indicatorEngine.getPaneMembers(panel.config.id),
        ...(style ? { style } : {}),
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
          pricePrecision: undefined,
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
      compareRenderer: this.comparesDrawn() ? this.compareRenderer : null,
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
      // A bar replaced in place leaves the array the same: the GPU's copy needs telling.
      seriesRevision: this.series.revision(),
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
    const limits = this.getPriceLimits();
    if (!limits || !this.marketConfig) return null;
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

/** The width of `text` in `font` on `ctx`, whose own font is put back after. */
function measureWith(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  const drawing = ctx.font;
  ctx.font = font;
  const width = ctx.measureText(text).width;
  ctx.font = drawing;
  return width;
}

/** The longest family list `setFont` takes, characters. */
const MAX_FONT_FAMILY = 300;

/** A font the chart can draw with: a family that isn't empty, sizes above zero. */
function readFont(font: Partial<FontConfig>): Partial<FontConfig> {
  const out: Partial<FontConfig> = {};
  // A list of faces, nothing a style sheet could read more into (the family also reaches CSS text).
  const family = font.family;
  if (typeof family === 'string' && family.trim() !== '' && family.length <= MAX_FONT_FAMILY && !/[;{}<>\\]|\/\*/.test(family)) out.family = family;
  for (const key of ['sizeSmall', 'sizeMedium', 'sizeLarge'] as const) {
    const size = font[key];
    if (typeof size === 'number' && Number.isFinite(size) && size > 0) out[key] = size;
  }
  return out;
}

/** Shapes the chart can draw: a corner radius from 0 to 999 px. */
function readShapes(shapes: ShapeConfig): ShapeConfig {
  const r = shapes.tagRadius;
  return typeof r === 'number' && Number.isFinite(r) && r >= 0 ? { tagRadius: Math.min(r, 999) } : {};
}

/** Whether any bar from `from` to `to` traded. */
function hasVolume(data: DataSeries, from: number, to: number): boolean {
  for (let i = from; i <= to; i++) if (data[i].volume > 0) return true;
  return false;
}

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

/** How far ahead of the bar forming a replay has its finer bars fetched, in playback time (ms). */
const REPLAY_LOOKAHEAD_MS = 8000;

/** Chart types that draw the series itself: a bar written in place needs no new display data. */
const PLAIN_CHART_TYPES: ReadonlySet<string> = new Set(['candlestick', 'line', 'area', 'bar', 'hollowCandle']);

/** At most this many pages of older bars a replay loads to reach its time on a new series. */
const MAX_REPLAY_PAGES_BACK = 10;

/** How many of the last finer steps are checked against the bars they build. */
const STEPS_FIT_SAMPLES = 50;

/** How far outside its bar's range a step's close may lie (a share of the range), for rounding. */
const STEPS_FIT_TOLERANCE = 0.001;

/**
 * A replay of the live series, which the stream and host updates keep
 * moving aside in the series store while the bars shown are the replay's;
 * they come back on `replayStop()`.
 */
interface ReplaySession {
  /** The latest live price, for when the replay ends. */
  price: { price: number; previousClose?: number } | null;
  /** The latest replayed time a paper account has been given (it only goes forward). */
  fedTime: number | null;
  /** How far into the bar at `fedTime` it has been given (1: all of it). */
  fedFraction: number;
  /** Whether bars form as they play (`animate`), and the finer interval that shapes them. */
  animate: boolean;
  step: TimeFrame | 'auto' | null;
  /** Up to when the replay has shown everything (its last step's `until`); null before its first step. */
  until: number | null;
  /** Where a `hideHistory` window starts, by time; null without one. */
  windowTime: number | null;
  /** The host's finer bars, and the symbol they are of. */
  steps: DataSeries | null;
  stepsSymbol: string;
  /** The symbol replayed. */
  symbol: string;
  /**
   * Held while the next series loads, or older bars page in to reach its
   * time: the state it goes on in, and the pages asked for.
   */
  held: { state: 'playing' | 'paused'; pagesBack: number } | null;
}

function newReplaySession(symbol: string): ReplaySession {
  return { price: null, fedTime: null, fedFraction: 1, animate: false, step: null, until: null, windowTime: null, steps: null, stepsSymbol: symbol, symbol, held: null };
}

/**
 * The last of `series` that closed by `until` (the next one opened by then;
 * the last one, its span passed): -1 when none did.
 */
/** How long bar `i` of `series` lasts: to the next bar, or the last bars' spacing. */
function barSpanAt(series: DataSeries, i: number): number {
  const next = series[i + 1];
  return next ? next.time - series[i].time : lastBarSpan(series);
}

/**
 * Where a paper account has been fed to in a replay, moved from the bars of
 * `before` onto those of `after` by time: on another timeframe it is fed the
 * rest of the bar it was in, and nothing it was given again.
 */
function mapReplayFeed(session: ReplaySession, before: DataSeries | null, after: DataSeries): void {
  const fedTime = session.fedTime;
  if (fedTime === null || !before || before.length === 0 || after.length === 0) return;
  const span = barSpanAt(before, barAt(before, fedTime));
  const at = fedTime + (Number.isFinite(span) ? session.fedFraction * span : 0);
  const k = barAt(after, at);
  const start = after[k].time;
  if (start > at) return; // older than the new bars: they are all ahead of it
  const into = barSpanAt(after, k);
  // At a bar's open exactly: the bar before it, all given.
  if (at === start && k > 0) {
    session.fedTime = after[k - 1].time;
    session.fedFraction = 1;
    return;
  }
  session.fedTime = start;
  session.fedFraction = Number.isFinite(into) && into > 0 ? Math.min(1, (at - start) / into) : 0;
}

function positionAt(series: DataSeries, until: number): number {
  const next = firstAfter(series, until);
  const last = series.length - 1;
  if (next > last && last >= 0 && series[last].time + lastBarSpan(series) <= until) return last;
  return Math.max(-1, next - 2);
}

/** The smallest gap between the last bars of `series`, or Infinity. */
function recentSpacing(series: DataSeries): number {
  let gap = Infinity;
  for (let i = Math.max(1, series.length - 10); i < series.length; i++) gap = Math.min(gap, series[i].time - series[i - 1].time);
  return gap;
}

/**
 * Whether finer steps fit `coarse`: finer than its bars, and the bars they
 * build hold their prices (another symbol's steps don't).
 */
function stepsFit(steps: DataSeries, coarse: DataSeries): boolean {
  if (!(recentSpacing(steps) < recentSpacing(coarse))) return false;
  const from = Math.max(0, steps.length - STEPS_FIT_SAMPLES);
  for (let i = from; i < steps.length; i++) {
    const bar = coarse[barAt(coarse, steps[i].time)];
    const slack = (bar.high - bar.low) * STEPS_FIT_TOLERANCE + Number.EPSILON;
    if (steps[i].close > bar.high + slack || steps[i].close < bar.low - slack) return false;
  }
  return true;
}

/** At most this many marks per jump go to a paper account (a long jump goes by in chunks). */
const MAX_REPLAY_CHUNKS = 500;

/** Index of the first bar at or after `time` (the length when none is). */
function firstAtOrAfter(series: DataSeries, time: number): number {
  let lo = 0;
  let hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

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

/** Whether step `index` is the last of bar `barIndex` of `coarse`: the next step is in a later bar. */
function closesBar(steps: DataSeries, coarse: DataSeries, index: number, barIndex: number): boolean {
  const next = steps[index + 1];
  const nextBar = coarse[barIndex + 1];
  return next !== undefined && nextBar !== undefined && next.time >= nextBar.time;
}

/** Finer bars grouped by the bar of `coarse` they are in. */
function piecesByBar(steps: DataSeries, coarse: DataSeries): Map<number, OHLCBar[]> {
  const out = new Map<number, OHLCBar[]>();
  for (const step of steps) {
    const time = coarse[barAt(coarse, step.time)].time;
    const list = out.get(time);
    if (list) list.push(step);
    else out.set(time, [step]);
  }
  return out;
}

/** Whether the system asks for less motion: a forming bar then steps between its prices. */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
