import type {
  ChartOptions,
  ChartType,
  FootprintBar,
  OHLCBar,
  Trade,
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
  Point,
  ViewportState,
  FeaturesConfig,
  ExecutionAdapter,
  ExecutionConfig,
  CrosshairCursor,
} from '@tradecanvas/commons';
import { isValidTimeZone, sessionMinute, symbolTimeZone, tradingDayStart, LayerType, setLocale as setGlobalLocale, computePriceLimits, createMarketTheme, priceStepAt, PRICE_AXIS_WIDTH, autoPricePrecision, formatPrice, stepDecimals, priceFormatterFor, fractionTick } from '@tradecanvas/commons';
import { CHART_SPACING } from '@tradecanvas/commons';
import type { BarLayout, ChartDensity, ChartImageOptions, ChartPdfOptions, ChartPrintOptions, ChartSpacing, ChartTypeOptions, DataUpdatePayload, FontConfig, IndicatorId, IndicatorParamsFor, PriceFormatter, PriceFraction, ShapeConfig, TimeFormatter } from '@tradecanvas/commons';
import type { ResolvedLayout, ChartStyleKey, ChartStyleOverrides, ChartStyleOverridesPatch, IndicatorIntervals, IndicatorStyleConfig, PaneStyle, ResolvedChartStyle, StyleLayer } from '@tradecanvas/commons';
import { readChartTypeOptions, tickBarCount, barTimeUnit, readChartStyleOverrides, readIndicatorPlotStyles, readPaneStyle } from '@tradecanvas/commons';
import { PriceLines, type BidAsk, SymbolSeriesStore, CompareSymbolIndicator, CompareSymbolPaneIndicator, SpreadIndicator, CorrelationCoefficientIndicator, CorrelationLogIndicator, axisTimes, HiLoRenderer, PointAndFigureRenderer, isPriceLevelAlert, loadWebGL, gpuContextsLeft, whenGpuContextFree, idleCssCursor, isCrosshairCursor } from '@tradecanvas/core';
import type { GpuRenderer, RendererMode } from '@tradecanvas/core';
import { canCopyImage, canvasBlob, canvasDataURL, canvasReadable, canvasesToPdf, copyImage, downloadImage, imageFileName, imageRatio, picturePixels, pictureSize, printCanvas } from '@tradecanvas/core';
import { indicatorWorkerPool, INDICATOR_WORKER_MIN_BARS, THEME_LOOK_KEYS, valuePlots, panelScale, panelScaleTexts, panelTagText, type IndicatorWorkerLease } from '@tradecanvas/core';
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
  streamAdapterOf,
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
  EventBus,
  DrawingManager,
  DrawingRenderer,
  registerBuiltInDrawingTools,
  TradingManager,
  TradingRenderer,
  DepthOverlayLayer,
  StreamManager,
  ChartLegend,
  Screenshot,
  Watermark,
  BarCountdown,
  VolumeRenderer,
  VolumeProfileRenderer,
  MarketProfileRenderer,
  DepthHeatmapRenderer,
  FootprintRenderer,
  FootprintStore,
  FOOTPRINT_IMBALANCE,
  FOOTPRINT_MAX_SLOT,
  FOOTPRINT_SLOT_GAP,
  FOOTPRINT_TEXT_BAR_WIDTH,
  PeriodLevelsRenderer,
  PivotMarkersRenderer,
  AlertManager,
  SignalMarkerManager,
  ChartMarkManager,
  type MarkBadge,
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
  PRICE_AXIS_ADD_STRIP,
  findDominantSwing,
} from '@tradecanvas/core';
import type { BracketDraft, BracketSize, ChartRendererInterface, CompareValue, RangePreset, SessionHoursConfig, DrawingPatch, DrawingOrderMove } from '@tradecanvas/core';
import { timeframeToMs } from '@tradecanvas/commons';
import { resolveRenderer, isReshapedChartType } from './charts/ChartTypeStrategy.js';
import { AutoSaveScheduler } from './state/AutoSaveScheduler.js';
import { isValidBar } from './DataManager.js';
import { SeriesStore, isWholeBar, type LiveChange } from './SeriesStore.js';
import { PriceFit, hasVolume } from './model/PriceFit.js';
import { FootprintFeed, barOfTrade, barSpanOf, footprintRowSize } from './model/FootprintFeed.js';
import { TradeStream } from './model/TradeStream.js';
import { TradingBook, ofSymbol } from './model/TradingBook.js';
import { DisplaySeries } from './model/DisplaySeries.js';
import { ActivityLog, type ActivityEntry } from './model/ActivityLog.js';
import { PaneLayout } from './model/PaneLayout.js';
import { IndicatorHistory, INDICATOR_EDIT_MERGE_MS } from './model/IndicatorHistory.js';
import { IndicatorPanes } from './model/IndicatorPanes.js';
import { captureIndicatorSetup, dependencyOrder, keptInPlace, renameSources, restorePanes } from './model/IndicatorSetup.js';
import { SymbolRequests } from './model/SymbolRequests.js';
import { drawingPaneAt, drawingPaneViewport, takesDrawing } from './model/DrawingPanes.js';
import { HistoryPager, type HistoryLoader } from './HistoryPager.js';
import { ThemeManager } from './ThemeManager.js';
import { readFont, readShapes, startOverrides } from './style/styleOptions.js';
import { LayoutManager } from './layout/LayoutManager.js';
import { requiredPriceAxisWidth, nextPriceAxisWidth } from './layout/priceAxisWidth.js';
import { LabelWidths } from './layout/labelWidths.js';
import { VerticalPanGate } from './interaction/verticalPanGate.js';
import { PluginManager } from './plugins/PluginManager.js';
import { wireExecution } from './trading/wireExecution.js';
import { overlaysForLayer, type ChartPlugin } from './plugins/contracts.js';
import { ReplayStepLoader } from './replay/ReplayStepLoader.js';
import { formingAt, intrabarPath, pathStop, type IntrabarPath } from './replay/intrabarPath.js';
import { resolveReplayStep } from './replay/replayStep.js';
import { checkAlerts, DrawingAlertStash, moveAlertsToHeirs, restoreLayoutAlerts } from './model/AlertWatch.js';
import { firstAfter, firstAtOrAfter, formingFeed, stepFeed, type ReplayMark } from './model/ReplayMarks.js';

// Replaced at build time by Vite `define` (see vite.config.ts). The `typeof`
// guard keeps this safe when the source runs un-bundled (tests, ts-node).
declare const __TC_VERSION__: string;

/** `setTimeZone(EXCHANGE_TIME_ZONE)` shows the zone of the symbol's exchange, else of its market (`getExchangeTimeZone`). */
export const EXCHANGE_TIME_ZONE = 'exchange';
/** Throws a RangeError for a time zone the browser doesn't know or an offset that isn't a number. */
function assertTimeZone(tz: TimeZoneSetting): void {
  if (typeof tz === 'string' && tz !== EXCHANGE_TIME_ZONE && !isValidTimeZone(tz)) {
    throw new RangeError(`Unknown time zone: ${tz}`);
  }
  if (typeof tz === 'number' && !Number.isFinite(tz)) throw new RangeError(`Invalid UTC offset: ${tz}`);
}

/** Room above and below the left scale's overlays, as a share of their range. */
const LEFT_SCALE_PADDING = 0.08;
/** How many of its recent trades a feed is asked for when a footprint starts. */
const FOOTPRINT_RECENT_TRADES = 1000;
/** The slot a chart turned into a footprint opens at: a little over the narrowest whose footprint carries both sides' numbers. */
const FOOTPRINT_OPENING_SLOT = FOOTPRINT_TEXT_BAR_WIDTH + FOOTPRINT_SLOT_GAP + 8;
/** How long the live trades are held for a feed's recent ones, ms: a feed that never answers must not hold them back for ever. */
const RECENT_TRADES_WAIT_MS = 10_000;
/** The feed whose trades the chart follows: the series it is of, what counts them into the footprint, how to stop listening, and the wait for its recent trades. */
interface TradesLive {
  key: string;
  feed: FootprintFeed;
  stop: () => void;
  wait: ReturnType<typeof setTimeout> | null;
}
/** How many times a picture at a size of its own fits its bars and sizes its scales: a scale that changes width changes the plot once. */
const PICTURE_FIT_ROUNDS = 3;
/** The base an order's id writes its numbers in: digits and letters, short. */
const ID_RADIX = 36;
/** How many characters of chance mark one chart's order ids from another's. */
const ID_MARK_LENGTH = 6;
/** Fewest bars ahead of the view that trigger the next history page. */
const HISTORY_AHEAD_MIN_BARS = 20;

/** Narrowest box (px) the zoom-area tool zooms into. */
const MIN_ZOOM_BOX_PX = 8;
/** A picture for paper (`print`, `toPdf`) is drawn in this theme and with this many pixels to a CSS pixel, unless its options say otherwise. */
const PAPER_THEME = 'light';
const PAPER_PIXEL_RATIO = 2;
/** Arrow keys on selected drawings: a bar across or a pixel up or down; Shift moves this many. */
const NUDGE_SHIFT_STEPS = 10;
/** Each arrow key's step for selected drawings: bars across, pixels down. */
const NUDGE_KEYS: Record<string, [bars: number, px: number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Drawings drawn across the whole plot's width, or its height, whatever their anchors. */
const FULL_WIDTH_DRAWINGS = new Set(['horizontalLine', 'crossLine']);
const FULL_HEIGHT_DRAWINGS = new Set(['verticalLine', 'crossLine']);

/** Whether a day's limits given whole are prices: three numbers, the reference between a floor above zero and its ceiling. */
function soundLimits(limits: PriceLimitInfo): boolean {
  const { ceiling, floor, reference } = limits;
  return [ceiling, floor, reference].every(Number.isFinite) && floor > 0 && floor <= reference && reference <= ceiling;
}

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
  /** The page's indicator worker, held while `indicatorWorker` is 'auto'. */
  private indicatorWorker: IndicatorWorkerLease | null = null;
  /** True while outputs that changed outside a computation of the chart's wait to be drawn (a microtask away). */
  private indicatorsLanding = false;
  private drawingManager: DrawingManager;
  private drawingRenderer: DrawingRenderer;
  private tradingManager: TradingManager;
  /** The order book on the plot: it draws with or without the trading layer. */
  private depthLayer = new DepthOverlayLayer();
  private tradingRenderer: TradingRenderer;
  private eventBus: EventBus;
  private streamManager: StreamManager | null = null;
  private executionAdapter: ExecutionAdapter | null = null;
  /** The time of the last price the adapter was given on a replay, ms; undefined while it runs on the clock. */
  private markedAt: number | undefined;
  /** What a confirmed bracket does with the adapter connected. */
  private executionBrackets: 'event' | 'place' = 'place';
  /** What happened to the orders: placed, moved, cancelled, filled, refused. */
  private readonly activity = new ActivityLog();
  /** The connected adapter's account, when it keeps one. */
  private account: import('@tradecanvas/commons').AccountSummary | null = null;
  private execTeardown: (() => void) | null = null;
  /** The orders, positions and fills the chart is told of, of every symbol: those of the symbol shown are drawn. */
  private readonly book = new TradingBook();
  /**
   * The symbol whose orders, positions and fills are drawn: the stream's, or the one said for bars
   * set by hand (`setSymbol`), whichever was told last. `''` with neither: all are drawn.
   */
  private tradedSymbol = '';
  /** This chart's own mark in the ids it gives orders, and how many it has given. */
  private readonly clientOrderMark = Math.random().toString(ID_RADIX).slice(2, 2 + ID_MARK_LENGTH).padEnd(ID_MARK_LENGTH, '0');
  private clientOrderSeq = 0;
  private autoScrollOnNewBar = true;
  /** The drawn series (Renko bricks…) the indicators were last worked out on; null: the data bars. */
  private indicatorsOnDrawn: DataSeries | null = null;
  /** The series the chart type draws, kept between frames. */
  private readonly display: DisplaySeries;
  /** Earliest bar of an `indicatorUpdate` waiting to be emitted; null = none pending. */
  private indicatorUpdateFrom: number | null = null;
  /** The indicator panes as drawn: their layout, scales and own styles. */
  private readonly panes: PaneLayout;
  /** Which pane each indicator is drawn in, and who takes a pane over. */
  private readonly indicatorPanes: IndicatorPanes;
  /** The indicators' undo steps: a burst of edits as one, an edit (a settings dialog) as one. */
  private readonly indicatorHistory: IndicatorHistory;
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
  /** What a host lays under the legend (`setLegendStack`), for drawing labels to keep clear of. */
  private legendStack: { width: number; height: number } | null = null;
  private watermark: Watermark;
  private barCountdown: BarCountdown;
  /**
   * Indicators of the loaded layout this chart could not add (an unknown or
   * not yet registered id, a whitelist): saved back as they were, so saving
   * the layout again doesn't drop them.
   */
  private unrestoredIndicators: import('@tradecanvas/core').SnapshotIndicator[] = [];
  /** Alerts of deleted drawings, put back if an undo brings the drawing back (none before the alerts are made). */
  private drawingAlerts: DrawingAlertStash | null = null;
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
  /** A signal marker is under the pointer: its listeners are told when it leaves. */
  private signalMarkerHovered = false;
  /** Where the pointer last was over a badge or a marker, for a hover that ends with the pointer still. */
  private lastHoverPos = { x: 0, y: 0 };
  private chartMarkManager: ChartMarkManager;
  /** The badge under the pointer, the same object while it stays on it: a move within it is not a new hover. */
  private hoveredBadge: MarkBadge | null = null;
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
  /** Where the crosshair rests: the bar and the point the floating tooltip is shown for when a press is held there. */
  private crosshairAt: { barIndex: number; point: Point } | null = null;
  /** A mouse press is held still on the plot: the floating tooltip shows where it is asked for that way (`crosshairTooltip: 'hold'`). */
  private tooltipHeld = false;
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
  /** What traded at each price of each bar: what the footprint chart draws. */
  private readonly footprint = new FootprintStore();
  /** Trades given by hand (`addTrades`), those of bars still to come kept until the bars are there. */
  private footprintByHand = new FootprintFeed(this.footprint, (time) => this.footprintBarOf(time));
  /** The connected feed's trades, followed while the chart shows a footprint or someone asked for them. */
  private tradesLive: TradesLive | null = null;
  /** How many asked for the feed's trades (`followTrades`). */
  private tradeFollowers = 0;
  /** The symbol's trades told so far: each of the feed's is told once, however often it is asked for them. */
  private tradesTold = new TradeStream();
  /** The feed's trades counted into the footprint so far: each counted once, and anew once the footprint starts over. */
  private footprintCounted = new TradeStream();
  /** The row size the footprint was told to keep; 'auto': worked out from the rows given, or the price. */
  private footprintRowSet: number | 'auto' = 'auto';
  /** A footprint chosen: zoom in to where its numbers read, once its bars are there. */
  private footprintZoomPending = false;
  /** Up to when a replay has shown: the footprint draws no cells from there on. */
  private footprintShownUntil: number | null = null;
  private mainSeriesVisible = true;
  /** The visible high and low, the bid and the ask. */
  private priceLines = new PriceLines();
  /** Other symbols' bars, for the indicators that compare with them. */
  private symbolSeries = new SymbolSeriesStore();
  /** Bars outside the symbol's regular hours shown. */
  private extendedHours = true;
  /** A replay being restarted (or the chart going): its stop is not reported. */
  private replayRestarting = false;
  /** The other symbols the indicators read, and those asked for (`symbolSeriesRequest`) and not given yet. */
  private readonly symbolRequests: SymbolRequests;
  private gridRenderer: GridRenderer;
  private priceAxis: PriceAxis;
  /** The left price scale: overlays put on it, else a mirror of the price scale. */
  private leftPriceAxis = new PriceAxis();
  private leftScaleRequested = false;
  private leftAxisWidth = PRICE_AXIS_WIDTH;
  /** While a picture at a size of its own is drawn: the chart is laid out for the picture, not for the page. */
  private picturing = false;
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
  /** When the price scale is fitted to the bars, and to what. */
  private readonly priceFit: PriceFit;
  /** How much room the chart leaves around its bars (`options.density`, `setDensity`). */
  private density: ChartDensity;
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
  /** When the stream last told anything (bars, a bar's update or close, a trade, a quote, a price), by the clock; null before it has. */
  private feedToldAt: number | null = null;
  /** Asked before a button on the chart closes or reverses a position (`setPositionGuard`). */
  private positionGuard: ((action: 'positionClose' | 'positionReverse', positionId: string, send: () => void) => void) | null = null;
  /** Asked before a bracket or a draft order is sent on being confirmed (`setOrderGate`). */
  private orderGate: (() => boolean) | null = null;
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
    this.priceFit = new PriceFit(options.autoScale !== false);
    this.density = options.density === 'compact' ? 'compact' : 'comfortable';
    const spacing = CHART_SPACING[this.density];
    this.priceFit.setSpacing(spacing);
    this.display = new DisplaySeries({
      bars: () => this.series.bars(),
      version: () => this.series.version(),
      chartType: () => this.options.chartType,
      chartTypeOptions: () => this.chartTypeOptions,
      lookup: (t) => this.pluginManager.getChartType(t),
      stepAt: (price) => this.stepAt(price),
      onBoxSize: (box) => {
        if (this.chartRenderer instanceof PointAndFigureRenderer) this.chartRenderer.setBoxSize(box);
      },
    });

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
      depth: f.depth ?? false,
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
      alignAxisLabels: f.alignAxisLabels ?? true,
      drawingAxisSpans: f.drawingAxisSpans ?? true,
      volume: f.volume ?? true,
      watermark: f.watermark ?? true,
      saveLoad: f.saveLoad ?? true,
      screenshot: f.screenshot ?? true,
      alerts: f.alerts ?? true,
      replay: f.replay ?? true,
      sessionBreaks: f.sessionBreaks ?? true,
      marks: f.marks ?? true,
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
    // The canvases are see-through: the theme's background from the start, as setTheme gives it
    // later, so a dark chart on a light page isn't drawn on white. A background the host gave its
    // element stays.
    if (!this.container.style.backgroundColor) {
      this.container.style.backgroundColor = this.themeManager.getTheme().background;
      this.lastBackground = this.themeManager.getTheme().background;
    }
    this.layoutManager = new LayoutManager();
    this.indicatorEngine = new IndicatorEngine();
    // The chart's theme from the start: indicators added before the first frame take its look too.
    this.indicatorEngine.setTheme(this.themeManager.getTheme());
    this.panes = new PaneLayout(this.layoutManager, this.indicatorEngine, (bounds) => this.crosshairHandler.setReportBounds(bounds));
    this.indicatorPanes = new IndicatorPanes(this.indicatorEngine, this.layoutManager, {
      passStyle: (from, heir) => this.panes.passStyle(from, heir),
      renamePane: (from, to) => this.renamePane(from, to),
      invalidateScales: () => this.panes.invalidateScales(),
    });
    this.symbolRequests = new SymbolRequests(this.indicatorEngine, this.symbolSeries);
    this.pluginManager = new PluginManager(this.indicatorEngine, { plugins: options.plugins });
    this.eventBus = new EventBus();

    registerBuiltInIndicators(this.indicatorEngine);
    // Indicators on other symbols' bars, kept by this chart.
    this.indicatorEngine.register(new CompareSymbolIndicator(this.symbolSeries));
    this.indicatorEngine.register(new CompareSymbolPaneIndicator(this.symbolSeries));
    this.indicatorEngine.register(new SpreadIndicator(this.symbolSeries));
    this.indicatorEngine.register(new CorrelationCoefficientIndicator(this.symbolSeries));
    this.indicatorEngine.register(new CorrelationLogIndicator(this.symbolSeries));
    if (options.indicatorWorker === 'auto') this.useIndicatorWorker();

    // Drawing tools
    this.drawingManager = new DrawingManager();
    registerBuiltInDrawingTools(this.drawingManager);
    this.drawingRenderer = new DrawingRenderer(this.drawingManager);
    this.drawingRenderer.setKeepOut(() => this.legendKeepOut());
    this.drawingRenderer.setTimeFormat((time) => this.crosshairHandler.formatTime(time, this.getDisplayData()));
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
    this.indicatorHistory = new IndicatorHistory({
      steps: this.undoRedoManager,
      snapshot: () => this.getIndicatorSetup(),
      enabled: () => this.features.drawingUndoRedo,
    });
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
    this.depthLayer.setConfig({ enabled: this.features.depth, ...options.depthOverlay });
    this.tradingManager.setContainer(container);
    this.tradingManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    // A price set by hand (a line dragged, a bracket, the right-click menu) is a price of the market: on its step.
    this.tradingManager.setPriceRounding((price) => this.roundPrice(price));
    // And an order's own is one of today's: inside the day's ceiling and floor, where the market has them.
    this.tradingManager.setOrderPriceBounds(() => this.getPriceLimits());
    this.tradingManager.setEventCallback((event, data) => {
      // An order asked for on the chart itself (a draft confirmed, the engine's own menu) goes out with an id, as one asked for by code.
      const payload = event === 'orderPlace' ? this.withClientOrderId(data as import('@tradecanvas/commons').OrderPlaceIntent) : data;
      const send = () => this.eventBus.emit(event as ChartEventType, payload);
      // A button on a position's line closes or reverses it in one press: whoever guards those is asked first.
      if (this.positionGuard && (event === 'positionClose' || event === 'positionReverse')) {
        this.positionGuard(event, (data as { positionId: string }).positionId, send);
        return;
      }
      send();
    });
    // The profile's figures start in the legend's corner: they are written under it, however tall it is drawn.
    this.eventBus.on('legendResize', () => this.clearProfileOfLegend());
    // The activity log hears what the chart is told, whoever tells it: an adapter, or the app's own calls.
    this.eventBus.on('ordersChange', (e) => this.activity.orders((e.payload as { orders: TradingOrder[] }).orders, this.activityTime()));
    this.eventBus.on('executionFill', (e) => this.activity.fill(e.payload as import('@tradecanvas/commons').FillEvent));
    this.eventBus.on('executionError', (e) => this.activity.error(e.payload as import('@tradecanvas/commons').ExecutionErrorPayload, this.activityTime()));
    // With no adapter the orders are the app's to give, and it gives another symbol's for another symbol: those are no news.
    this.eventBus.on('symbolChange', () => {
      if (!this.executionAdapter) this.activity.rebase();
    });

    // Rendering
    this.engine = new RenderEngine(container, options.maxPixelRatio);
    const size = this.engine.dprManager.getContainerSize();
    this.viewport = new Viewport(
      size.width,
      size.height,
      options.minBarSpacing ?? 2,
      options.maxBarSpacing ?? 30,
      options.rightMargin ?? spacing.rightMargin,
    );
    this.viewport.setBarLayout(options.barLayout ?? spacing.barLayout);
    // Until the first fit sets them, the scale's margins are the density's too.
    this.viewport.setScaleMargins({ top: spacing.priceMargin, bottom: spacing.priceMargin });
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
      this.takeSize(newSize);
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
    this.useFootprintWidths('candlestick', this.options.chartType);
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
    if (isCrosshairCursor(options.crosshair?.cursor)) this.crosshairHandler.setCursor(options.crosshair.cursor);
    // An order's line dragged to a price writes that price itself: the crosshair's would sit a few pixels from it.
    this.crosshairHandler.setPriceHeld(() => this.tradingManager.isDraggingLine());
    // The price it writes is the market's there: what the "+" beside it, or a right-click, places at.
    this.crosshairHandler.setPriceRounding((price) => this.roundPrice(price));
    // Where the theme says so, the price under the pointer says how far it is from the last.
    // Not with the last price hidden: the change would be from a price the chart does not show.
    this.crosshairHandler.setChangeBase(() => (this.currentPriceLine.isVisible() ? this.currentPriceLine.getPrice() : null));
    // Crosshair callback — fired via microtask AFTER render, only when the bar
    // changes: no extra render requests, and the tooltip's one measurement
    // happens once per bar, not per mouse move.
    this.crosshairHandler.setDataSource(() => this.crosshairSeries());
    this.crosshairHandler.setCallback((barIndex, point) => {
      this.crosshairAt = barIndex !== null && point ? { barIndex, point } : null;
      if (barIndex !== null && point) {
        const data = this.crosshairSeries();
        const bar = barIndex >= 0 && barIndex < data.length ? data[barIndex] : undefined;
        const prevClose = barIndex > 0 ? data[barIndex - 1]?.close : undefined;
        // A brick's own time only counts bricks: the tooltip and listeners get the date the axis gives it.
        const times = axisTimes(data);
        const time = bar ? times[barIndex]?.time ?? bar.time : undefined;

        // The legend is drawn in the frame that found this bar, before it knew it: one more
        // paint of the pointer's layer shows it, or a pointer that comes to rest leaves the
        // legend on the bar before while the data window and the indicator rows show this one.
        this.chartLegend.setHoverBar(bar ?? null, barIndex > 0 ? data[barIndex - 1] ?? null : null);
        if (this.features.legend) this.engine.requestRender(LayerType.Hover);

        // Update tooltip (DOM, lightweight update only when bar changes).
        this.placeCrosshairTooltip(barIndex, point, times);

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
        this.eventBus.emit('crosshairMove', { point, bar, barIndex, ...(time !== undefined ? { time } : {}), ...(prevClose !== undefined ? { prevClose } : {}) });
      } else {
        this.crosshairTooltip.hide();
        this.chartLegend.setHoverBar(null);
        if (this.features.legend) this.engine.requestRender(LayerType.Hover);
        this.eventBus.emit('crosshairLeave', {});
        // Another chart's crosshair still mirrored here: back to its bar, not the latest.
        const synced = this.crosshairHandler.getSyncedSlot();
        if (synced !== null) this.showSyncedBar(synced);
      }
    });

    // Chart legend (OHLCV overlay)
    this.chartLegend = new ChartLegend();
    this.chartLegend.setChartType(this.options.chartType);
    this.chartLegend.setLocale(this.numberLocale);
    this.chartLegend.setSpacing(legendSpacing(spacing));
    // Drawn taller or shorter: what a host stacks under it (the widget's indicator rows) moves,
    // and the drawings' labels are placed again around it.
    this.chartLegend.setResizeListener(() => {
      this.eventBus.emit('legendResize', { bottom: this.getLegendBottom() });
      this.engine.requestRender();
    });

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
    this.applyFootprintOptions();
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
      // With drawings selected, the arrows move them instead of the chart.
      if (this.nudgeSelectedDrawings(e)) {
        e.preventDefault();
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
    this.drawingAlerts = new DrawingAlertStash(this.alertManager);
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

    // Marks: what happened at a time, as badges at the foot of the price pane,
    // on the bars as they are drawn (Heikin-Ashi's, a replay's bars so far).
    this.chartMarkManager = new ChartMarkManager();
    this.chartMarkManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    // No bars for them where the bars are not times (bricks, boxes): they wait for a chart type that has them.
    this.chartMarkManager.setDataGetter(() => (this.isTimeAligned() ? this.getDisplayData() : []));

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
            if (verticalGate.step(deltaX, deltaY, this.priceFit.isAuto()) && deltaY) {
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
      timeAxisTop: this.panes.timeAxisTop(),
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
            this.priceFit.resume();
            this.updateViewportAndRender();
          } else {
            this.fitContent();
          }
        },
      );
    }
    if (this.features.crosshair) {
      this.interactionManager.setCrosshairHandler(this.crosshairHandler);
      this.applyIdleCursor();
    }
    if (this.features.drawings) {
      this.interactionManager.setDrawingManager(
        this.drawingManager,
        // Inject current data so drawing anchors are stored/resolved as real
        // timestamps (survives timeframe/symbol switches).
        () => ({ ...this.viewport.getState(), data: this.getDisplayData() }),
      );
      // Drawings begun on an indicator pane are made and drawn on its scale.
      this.drawingManager.setPanes({
        paneAt: (pos) => this.drawingPaneAt(pos),
        viewportOf: (id) => this.drawingPaneViewport(id),
        hasPane: (id) => this.layoutManager.getPanels().some((panel) => panel.id === id),
        valuesAt: (id, barIndex) => this.indicatorEngine.getPaneValuesAt(id, barIndex),
      });
      this.interactionManager.setDrawingDoubleClick((id, pos) => this.eventBus.emit('drawingDoubleClick', { id, x: pos.x, y: pos.y }));
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
    this.applyPriceAxisAdd();
    this.interactionManager.setPriceAxisAddButton(this.priceAxisAddButton, (pos) => {
      // The price there on the market's grid: what is added at it (an order, an alert) is at a price the market has.
      const price = this.roundPrice(yToPrice(pos.y, this.viewport.getState()));
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
      // Dragged, an alert is at a price of the market, as one set from the "+" or the menu is.
      alertDrag.setPriceRounding((price) => this.roundPrice(price));
      this.interactionManager.setAlertDragHandler(alertDrag);
    }

    // Drag pane dividers to resize indicator panels.
    const paneResize = new PaneResizeHandler();
    paneResize.configure(
      () => this.getResolvedLayout(),
      (panelId, size) => this.dragPanelTo(panelId, size),
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
    this.applyTooltipHold();

    // A mark's badge reacts to the pointer always (it shows what it marks);
    // a signal marker when someone listens. A badge is over a marker under it.
    this.interactionManager.setSignalMarkerHitTest(
      (pos) => this.markBadgeAt(pos)
        ?? (this.eventBus.hasListeners('signalMarkerHover') || this.eventBus.hasListeners('signalMarkerClick')
          ? this.signalMarkerManager.markerAt(pos, this.viewport.getState())
          : null),
      (hit, pos) => {
        const badge = hit !== null && hit === this.hoveredBadge ? this.hoveredBadge : null;
        // Off a badge (onto nothing, or onto a signal marker): its words go, and its listeners hear.
        if (!badge && this.chartMarkManager.setHovered(null)) this.eventBus.emit('markHover', { marks: null, x: pos.x, y: pos.y });
        this.lastHoverPos = pos;
        if (badge) {
          // Onto a badge from a signal marker: the marker's listeners hear it left.
          if (this.signalMarkerHovered) {
            this.signalMarkerHovered = false;
            this.eventBus.emit('signalMarkerHover', { marker: null, x: pos.x, y: pos.y });
          }
          this.chartMarkManager.setHovered(badge);
          this.eventBus.emit('markHover', { marks: badge.marks.map((m) => ({ ...m })), x: pos.x, y: pos.y });
          return;
        }
        if (hit === null && !this.signalMarkerHovered) return;
        this.signalMarkerHovered = hit !== null;
        this.eventBus.emit('signalMarkerHover', { marker: hit as import('@tradecanvas/commons').SignalMarker | null, x: pos.x, y: pos.y });
      },
      // A hand only where a click does something: on a badge always, on a marker when someone listens.
      () => this.chartMarkManager.isHovering() || this.eventBus.hasListeners('signalMarkerClick'),
    );
    this.interactionManager.setClickHandler((pos) => {
      const data = this.getDisplayData();
      const badge = this.features.marks ? this.chartMarkManager.badgeAt(pos, this.viewport.getState()) : null;
      if (badge) {
        this.eventBus.emit('markClick', { marks: badge.marks.map((m) => ({ ...m })), x: pos.x, y: pos.y });
        return;
      }
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
        this.confirmBracket();
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
    // removes one. The box is kept inside the plot it began in, the price
    // pane's or an indicator pane's (moves are followed off-chart), so the
    // selection matches what the box showed.
    let boxPane: string | null | undefined;
    const inPlot = (pos: { x: number; y: number }) => {
      const pane = boxPane ? this.drawingPaneViewport(boxPane) : null;
      const r = pane ? pane.chartRect : this.viewport.getState().chartRect;
      return {
        x: Math.max(r.x, Math.min(r.x + r.width, pos.x)),
        y: Math.max(r.y, Math.min(r.y + r.height, pos.y)),
      };
    };
    this.interactionManager.setBoxSelectHandlers({
      begin: (pos) => {
        // Zooming to an area is the price pane's; a selection, the pane pressed.
        boxPane = this.zoomAreaMode ? undefined : this.drawingPaneAt(pos);
        this.selectionBoxOverlay.begin(inPlot(pos));
      },
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
        if (boxPane === null) return;
        if (box.isClick) this.drawingManager.toggleSelectionAt({ x: box.x1, y: box.y1 }, vs);
        else this.drawingManager.selectInRect(box, vs, boxPane);
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
    this.display.reset();
    this.sessionBreaks.invalidateCache();
    // A full data replace means a new series (symbol/timeframe switch, not
    // a live tick — those go through appendBar/updateLastBar instead), so
    // un-freeze the Y-axis the same way scrollToEnd below resets the X-axis.
    // Otherwise a price-axis drag or vertical pan on the old symbol silently
    // keeps the new symbol's chart stuck on the old price range. Auto-scale
    // set off fits the new series once too, then holds it.
    this.priceFit.newSeries(this.series.length() === 0);
    // New data context (symbol / timeframe) — drop stale alert prev-values so
    // the next tick seeds cleanly instead of crossing against the old series.
    // The bars kept: a bar the chart can't take is left out.
    const kept = this.series.bars();
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
    this.fitFewColumns();
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
    this.display.reset();
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
    this.display.reset();
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

  /** Load one page of older bars now. Resolves to the number of bars added (while a page is on its way, that page's). */
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
    // Re-finalise the bar that just closed (its last tick may differ from the
    // final close) and compute the new one; everything older is untouched.
    this.recalcIndicatorsFrom(data, data.length - 2);
    // Measured from the close before it, as a stream measures a new bar: one opening there is level.
    this.currentPriceLine.setPrice(bar.close, data[data.length - 2]?.close);
    this.updateViewportAndRender(follow);
    if (data.length !== before) this.emitBars(data.length);
    else this.lastBarMoved();
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
    if (write.shown === 0) {
      this.takeLivePrice(price);
      if (!write.aside) this.scheduleRender();
      return;
    }
    // As `appendBar`: the live edge only while the view is there and auto-scroll is on.
    const follow = this.autoScrollOnNewBar && this.viewport.isAtEnd();
    const before = write.before;
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, before - 1);
    this.crosshairHandler.setData(data);
    this.currentPriceLine.setPrice(price, data[data.length - 2]?.close);
    this.updateViewportAndRender(follow);
    if (data.length !== before) this.emitBars(data.length);
    else this.lastBarMoved();
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
    if (write.to !== 'shown') {
      this.takeLivePrice(bar.close);
      if (write.to === 'hidden') this.scheduleRender();
      return;
    }
    this.currentPriceLine.setPrice(bar.close);
    // Keep indicator lines in sync with the forming bar. Without this, panel
    // + overlay indicators freeze until bar close. Only the last bar changed.
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, data.length - 1);
    // After the indicators: an alert on a line compares with its value at this bar.
    this.followLivePrice(bar.close);
    this.lastBarMoved();
    this.scheduleRender();
  }

  /**
   * A trade's price into the forming bar (its high, low, close and volume):
   * the live price, as with `updateLastBar`. With the trade's `side`, the
   * bar's `buyVolume` counts it too; a trade with a volume and no side leaves
   * the bar with none.
   */
  updateLastBarFromTick(tick: { price: number; volume?: number; time: number; side?: 'buy' | 'sell' }): void {
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
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, data.length - 1);
    this.followLivePrice(tick.price);
    this.lastBarMoved();
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
    this.display.reset();
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
    this.useFootprintWidths(previous, type);
    // A new renderer, even for the type set: it takes what the series is built on (the point & figure box) on the next build.
    this.display.invalidate();
    this.chartLegend.setChartType(type as ChartType);
    this.applyTimeSpacing();
    this.updateViewportAndRender(true);
    this.fitFewColumns();
    this.syncTradeFeed();
    this.markStateChanged();
    // Bricks and boxes draw no marks: a badge under the pointer goes with the bars it stood on.
    if (!this.isTimeAligned()) this.dropMarkHover();
    if (type !== previous) this.eventBus.emit('chartTypeChange', { type, previous });
  }

  /**
   * A point & figure chart has a column for each reversal, often a few dozen
   * for a whole series, and Renko, Kagi, line break and range bars a brick
   * or a line for each move of their size: at the width of a bar they would
   * sit in a corner of an empty plot. Fewer than the view holds are fitted
   * to it, on a new type, box or series; more are left at the width they
   * are, as candles are.
   */
  private fitFewColumns(): void {
    this.zoomIntoFootprint();
    const type = this.options.chartType;
    if (!isReshapedChartType(type) || this.pluginManager.getChartType(type)) return;
    const n = this.getDisplayData().length;
    const { chartRect, barWidth, barSpacing } = this.viewport.getState();
    const slots = chartRect.width / (barWidth + barSpacing);
    if (n > 0 && slots > n + this.viewport.getRightMargin()) this.fitContent();
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
    this.applyFootprintOptions();
    this.syncTradeFeed();
    this.updateViewportAndRender(true);
    this.fitFewColumns();
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
    this.display.reset();
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
   * `{ family: MONO_FONT_FAMILY }` for monospaced figures. The legend takes
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
    if (layout !== 'golden' && layout !== 'classic') return;
    // A layout set here is the chart's own from now on: a density doesn't change it.
    this.options.barLayout = layout;
    if (layout === this.viewport.getBarLayout()) return;
    this.viewport.setBarLayout(layout);
    this.updateViewportAndRender();
  }

  getBarLayout(): BarLayout {
    return this.viewport.getBarLayout();
  }

  /**
   * How much room the chart leaves around its bars: `'comfortable'` or
   * `'compact'`, the chart as it was before 2.0 (see `ChartDensity`). The
   * `barLayout` and `rightMargin` the chart was made with stay as given.
   */
  setDensity(density: ChartDensity): void {
    // The same density again runs nothing: no pass, no events (a widget sets it on every look).
    if ((density !== 'comfortable' && density !== 'compact') || density === this.density) return;
    this.density = density;
    const spacing = CHART_SPACING[density];
    this.priceFit.setSpacing(spacing);
    this.chartLegend.setSpacing(legendSpacing(spacing));
    if (this.options.rightMargin === undefined) this.viewport.setRightMargin(spacing.rightMargin);
    if (!this.options.barLayout) this.viewport.setBarLayout(spacing.barLayout);
    this.updateViewportAndRender();
  }

  getDensity(): ChartDensity {
    return this.density;
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
    this.eventBus.emit('bidAskChange', quote ? { ...quote } : null);
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
    return this.indicatorHistory.record(undefined, () => this.addIndicatorNow(id, params ?? {}, position, options));
  }

  private addIndicatorNow(
    id: string,
    params: Record<string, number | string | boolean>,
    position: PanelPosition,
    options: { pane?: string; scale?: OverlayScale; instanceId?: string },
  ): string | null {
    if (!this.isIndicatorAllowed(id)) return null;
    const descriptor = this.indicatorEngine.getAvailableIndicators().find((d) => d.id === id);
    const pane = descriptor ? this.indicatorPanes.paneFor(descriptor, params, options.pane) : null;
    const instanceId = this.indicatorEngine.addIndicator(id, params, this.indicatorBars(), {
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
    this.symbolRequests.given(symbol);
    const readers = this.symbolRequests.readersOf(symbol);
    if (readers.length === 0) return;
    const data = this.indicatorBars();
    for (const instanceId of readers) this.indicatorEngine.updateIndicator(instanceId, {}, data);
    this.announceIndicatorUpdate(0);
    this.updateViewportAndRender();
  }

  /** The bars given for `symbol`, or null. */
  getSymbolSeries(symbol: string): DataSeries | null {
    return this.symbolSeries.get(symbol) ?? null;
  }

  /** The symbols the chart's indicators read, whether their bars are here or not. */
  getRequiredSymbols(): string[] {
    return this.symbolRequests.required();
  }

  /**
   * Ask once for the symbol an indicator just added or changed reads, when
   * the chart hasn't got it (not for symbols other indicators read: one
   * whose fetch failed is asked for again only by an indicator on it).
   */
  private requestMissingSymbols(instanceId: string): void {
    const symbol = this.symbolRequests.toAsk(instanceId);
    if (symbol) this.eventBus.emit('symbolSeriesRequest', { symbol });
  }

  /**
   * Change an indicator's inputs. A source that would make it read from its
   * own lines (through other indicators) is ignored.
   */
  updateIndicator(instanceId: string, params: Record<string, number | string | boolean>): void {
    this.indicatorHistory.record(instanceId, () => this.updateIndicatorNow(instanceId, params));
  }

  private updateIndicatorNow(instanceId: string, params: Record<string, number | string | boolean>): void {
    const before = this.indicatorPanes.sourceOf(instanceId);
    this.indicatorEngine.updateIndicator(instanceId, params, this.indicatorBars());
    this.announceIndicatorUpdate(0);
    this.markStateChanged();
    this.eventBus.emit('indicatorChange', { instanceId, change: 'params' });
    this.requestMissingSymbols(instanceId);
    // A price-pane indicator follows a new source into its pane, and leaves
    // it when it no longer reads from it; otherwise it stays where it is.
    if (this.indicatorPanes.followSource(instanceId, before)) this.eventBus.emit('indicatorChange', { instanceId, change: 'pane' });
    this.updateViewportAndRender();
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
    return this.indicatorHistory.record(instanceId, () => this.setIndicatorScaleNow(instanceId, scale));
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
    this.indicatorHistory.record(instanceId, () => this.setIndicatorLevelsNow(instanceId, levels));
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
    this.indicatorHistory.record(undefined, () => this.removeIndicatorNow(instanceId));
  }

  /** Remove several indicators, each as `removeIndicator` does, in one undo step. */
  removeIndicators(instanceIds: readonly string[]): void {
    this.indicatorHistory.record(undefined, () => {
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
    // Each indicator drawn in its pane is reported as it changes panes.
    const members = this.indicatorPanes.detach(instanceId, (member) => this.eventBus.emit('indicatorChange', { instanceId: member, change: 'pane' }));
    if (!members) return;
    this.eventBus.emit('indicatorRemove', { instanceId });
    this.symbolRequests.forgetUnread();
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
    const pane = this.indicatorPanes.paneOf(instanceId);
    if (!this.layoutManager.getPanels().some((p) => p.id === pane)) return;
    this.indicatorHistory.record(pane, () => this.setPaneStyleNow(pane, style ? readPaneStyle(style) : null));
  }

  private setPaneStyleNow(instanceId: string, style: PaneStyle | null): void {
    if (!this.panes.setStyle(instanceId, style)) return;
    this.syncRenderContext();
    this.engine.requestRender();
    this.markStateChanged();
  }

  /** The own style of the pane `instanceId` is drawn in, or null when it has none. */
  getPaneStyle(instanceId: string): PaneStyle | null {
    const style = this.panes.style(this.indicatorPanes.paneOf(instanceId));
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
   * With `indicatorWorker: 'auto'`, an indicator still being computed in the
   * worker is computed here first, so the values are always the bars' own;
   * `{ drawn: true }` returns the ones drawn now instead, without waiting (the
   * last ones, or null for an indicator just added): what a legend or a
   * data window that follows the pointer reads.
   *
   * @example
   * const rsi = chart.addIndicator('rsi', { period: 14 })!;
   * const out = chart.getIndicatorOutput(rsi);
   * const latest = out?.series?.[chart.getData().length - 1]?.value;
   */
  getIndicatorOutput(instanceId: string, options: { drawn?: boolean } = {}): IndicatorOutput | null {
    return options.drawn ? this.indicatorEngine.peekOutput(instanceId) : this.indicatorEngine.getOutput(instanceId);
  }

  /** Full recomputes over many bars in the page's indicator worker (`indicatorWorker: 'auto'`). */
  private useIndicatorWorker(): void {
    this.indicatorWorker = indicatorWorkerPool.acquire();
    this.indicatorEngine.useWorker(this.indicatorWorker.client, {
      minBars: INDICATOR_WORKER_MIN_BARS,
      onLand: () => this.indicatorsLandedSoon(),
    });
  }

  /**
   * Outputs from the worker landed, or a read finished here what was still
   * out: drawn once, after what runs now (a read may be part of an export).
   */
  private indicatorsLandedSoon(): void {
    if (this.indicatorsLanding) return;
    this.indicatorsLanding = true;
    queueMicrotask(() => {
      this.indicatorsLanding = false;
      this.indicatorsLanded();
    });
  }

  /**
   * New outputs are in place outside a computation the chart asked for:
   * say so, fit the scales to them and draw them, and give the alerts on
   * their lines the values they waited for.
   */
  private indicatorsLanded(): void {
    if (this.disposed) return;
    this.announceIndicatorUpdate(0);
    this.updateViewportAndRender();
    const last = this.series.bars().at(-1);
    const onLines = this.alertManager.getAlerts().some((alert) => alert.channel !== 'price' || alert.target !== undefined);
    if (this.features.alerts && onLines && last && !this.replaySession) this.checkAlerts(last.close);
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

  /** A pane's divider dragged: the pane as tall on screen as it was dragged, the panes giving way or not. */
  private dragPanelTo(instanceId: string, height: number): void {
    this.layoutManager.setPanelHeightOnScreen(instanceId, height);
    this.updateViewportAndRender();
    this.eventBus.emit('paneResize', { instanceId, size: height });
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
    return this.indicatorHistory.record(instanceId, () => this.moveIndicatorToPaneNow(instanceId, target));
  }

  /** Whether `moveIndicatorToPane(instanceId, target)` would move it. */
  canMoveIndicatorToPane(instanceId: string, target: string): boolean {
    return this.indicatorPanes.moveHost(instanceId, target) !== undefined;
  }

  private moveIndicatorToPaneNow(instanceId: string, target: string): boolean {
    const changed = this.indicatorPanes.move(instanceId, target);
    if (!changed) return false;
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
    const pane = this.indicatorPanes.paneOf(instanceId);
    return this.indicatorHistory.record(pane, () => this.paneChange(pane, 'collapsed', () => this.layoutManager.setPanelCollapsed(pane, collapsed)));
  }

  /** Whether the pane `instanceId` is drawn in shows folded (folded, or another pane is maximised). */
  isPaneCollapsed(instanceId: string): boolean {
    return this.layoutManager.isPanelShownCollapsed(this.indicatorPanes.paneOf(instanceId));
  }

  /** Let one pane take the room (the others fold, the price pane keeps a strip); `null` puts them back. */
  setMaximizedPane(instanceId: string | null): boolean {
    const pane = instanceId === null ? null : this.indicatorPanes.paneOf(instanceId);
    const subject = pane ?? this.layoutManager.getMaximizedPanel() ?? '';
    return this.indicatorHistory.record(subject, () => this.paneChange(subject, 'maximized', () => this.layoutManager.setMaximizedPanel(pane)));
  }

  getMaximizedPane(): string | null {
    return this.layoutManager.getMaximizedPanel();
  }

  /**
   * A pane's value scale: logarithmic (used while all its values are above 0;
   * linear otherwise), upside down. The pane `instanceId` is drawn in.
   */
  setPaneScale(instanceId: string, scale: { log?: boolean; invert?: boolean; percent?: boolean }): boolean {
    const pane = this.indicatorPanes.paneOf(instanceId);
    return this.indicatorHistory.record(pane, () => this.paneChange(pane, 'scale', () => this.layoutManager.setPanelScale(pane, scale)));
  }

  /** The pane's value scale as set (see `setPaneScale`). */
  getPaneScale(instanceId: string): { log: boolean; invert: boolean; percent: boolean } {
    const panel = this.layoutManager.getPanels().find((p) => p.id === this.indicatorPanes.paneOf(instanceId));
    return { log: !!panel?.logScale, invert: !!panel?.invertScale, percent: !!panel?.percentScale };
  }

  /** Move a pane one place up (`-1`) or down (`1`) among the panes on its side. */
  movePane(instanceId: string, delta: -1 | 1): boolean {
    const pane = this.indicatorPanes.paneOf(instanceId);
    return this.indicatorHistory.record(pane, () => this.paneChange(pane, 'order', () => this.layoutManager.movePanel(pane, delta)));
  }

  /** Whether `movePane(instanceId, delta)` would move it. */
  canMovePane(instanceId: string, delta: -1 | 1): boolean {
    return this.layoutManager.canMovePanel(this.indicatorPanes.paneOf(instanceId), delta);
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
    // The panes' tags share the price axis: it widens for them, or narrows again.
    this.updateViewportAndRender();
  }

  isIndicatorValueLabelsVisible(): boolean {
    return this.features.indicatorValueLabels;
  }

  /** Move the price axis's tags apart where they would cover one another, the last price's staying on its line (on by default). */
  setAxisLabelsAligned(aligned: boolean): void {
    this.features.alignAxisLabels = aligned;
    this.syncRenderContext();
    this.engine.requestRender();
  }

  isAxisLabelsAligned(): boolean {
    return this.features.alignAxisLabels;
  }

  /** Mark the selected (or the drawn) drawing's span on the axes, its ends labelled (on by default). */
  setDrawingAxisSpansVisible(visible: boolean): void {
    this.features.drawingAxisSpans = visible;
    this.syncRenderContext();
    this.engine.requestRender();
  }

  isDrawingAxisSpansVisible(): boolean {
    return this.features.drawingAxisSpans;
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
   * The size of what you lay over the chart under the legend (rows of your
   * own, as ChartWidget's indicator rows are), from the plot's left edge and
   * `getLegendBottom()` down, in CSS px: drawing labels keep clear of it as
   * they keep clear of the legend. `null` when nothing is there.
   */
  setLegendStack(size: { width: number; height: number } | null): void {
    const next = size && size.width > 0 && size.height > 0 ? { width: size.width, height: size.height } : null;
    const same = next === this.legendStack
      || (next !== null && this.legendStack !== null && next.width === this.legendStack.width && next.height === this.legendStack.height);
    if (same) return;
    this.legendStack = next;
    this.clearProfileOfLegend();
    this.engine.requestRender();
  }

  /** The legend's rows as drawn and what is stacked under them: drawing labels keep clear of these. */
  private legendKeepOut(): { x: number; y: number; width: number; height: number }[] {
    const plot = this.viewport.getState().chartRect;
    const bottom = this.getLegendBottom();
    const boxes: { x: number; y: number; width: number; height: number }[] = [];
    const width = this.features.legend ? this.chartLegend.getWidth() : 0;
    if (width > 0 && bottom > plot.y) boxes.push({ x: plot.x, y: plot.y, width, height: bottom - plot.y });
    if (this.legendStack) boxes.push({ x: plot.x, y: bottom, ...this.legendStack });
    return boxes;
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

  /**
   * Replace the drawings with saved ones (what `getDrawings()` gave). A state
   * with no value for an option whose default has changed since (a
   * retracement's `reversed` and extends, a channel's `middleLine`) is read as
   * one saved before the change and keeps the look it was drawn with; a state
   * written by hand says these options itself, or goes through `addDrawing`.
   */
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
    /** The indicator pane it goes on (an id from `getIndicatorPanes()`): its anchors' prices are that pane's values. Unset: the price pane. */
    paneId?: string;
    /** Its name in the object tree (at most 80 characters); unset: its tool's. */
    name?: string;
    meta?: Record<string, unknown>;
  }): string | null {
    if (!this.features.drawings) return null;
    if (state.paneId !== undefined && !this.takesDrawing(state.paneId, state.type)) return null;
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

  /**
   * An arrow key with drawings selected: move them a bar across or a pixel
   * up or down (Shift: ten), one undo step for a run of presses. False when
   * it is not an arrow, or nothing selected can move.
   */
  private nudgeSelectedDrawings(e: KeyboardEvent): boolean {
    const step = NUDGE_KEYS[e.key];
    if (!step || !this.features.drawings || e.ctrlKey || e.metaKey || e.altKey) return false;
    const times = e.shiftKey ? NUDGE_SHIFT_STEPS : 1;
    const viewport = { ...this.viewport.getState(), data: this.getDisplayData() };
    return this.drawingManager.nudge(step[0] * times, step[1] * times, viewport);
  }

  /**
   * The size the words of a line or a rectangle are written at (px): the
   * drawing's own `fontSize`, or the chart's for drawings' text. Null for
   * no such drawing. With `getDrawingTextRect`, for an editor of your own.
   */
  getDrawingTextSize(id: string): number | null {
    return this.drawingManager.textSizeOf(id);
  }

  /**
   * Where a drawing's text box was drawn last, its padding included, in the
   * chart's own pixels (as `getDrawingRect`); null for a drawing that writes
   * in no box, a hidden one, or one not drawn yet. To lay a text box of yours
   * over its words.
   */
  getDrawingTextRect(id: string): { x: number; y: number; width: number; height: number } | null {
    if (!this.drawingManager.isShown(id)) return null;
    return this.drawingManager.textBoxOf(id, { ...this.viewport.getState(), data: this.getDisplayData() });
  }

  /**
   * Change a drawing just made within the step that made it (its words typed
   * in place): one undo takes the drawing and the change away. Once another
   * step came after it, the change is a step of its own.
   */
  amendNewDrawing(id: string, patch: DrawingPatch): boolean {
    const changed = this.drawingManager.amendNew(id, patch);
    if (changed) this.markStateChanged();
    return changed;
  }

  /**
   * Take back a drawing just made, as a "Cancel" right after it: with the
   * step that made it when that is the history's last, so nothing is left to
   * undo or redo; else removed as a step of its own.
   */
  takeBackDrawing(id: string): void {
    if (!this.features.drawings) return;
    this.drawingManager.takeBack(id);
    this.markStateChanged();
  }

  /**
   * Remove every drawing (`'drawings'`), every indicator (`'indicators'`) or
   * both (`'all'`, the default) as one undo step. Locked drawings stay, as
   * they do when a selection is removed. Returns how many of each went.
   */
  removeAll(what: 'drawings' | 'indicators' | 'all' = 'all'): { drawings: number; indicators: number } {
    return this.undoRedoManager.group(() => {
      const drawings = what === 'indicators' ? 0 : this.removeDrawings(this.getDrawings().map((d) => d.id));
      const ids = what === 'drawings' ? [] : this.getActiveIndicators().map((i) => i.instanceId);
      if (ids.length > 0) this.removeIndicators(ids);
      return { drawings, indicators: ids.length };
    });
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
    // The price on the market's grid, as the "+" by the axis gives it.
    if (area === 'plot' || area === 'priceAxis') payload.price = this.roundPrice(yToPrice(pos.y, vs));
    if ((area === 'plot' || area === 'timeAxis') && vs.data.length > 0) payload.time = xToTime(pos.x, vs);
    if (area === 'pane') {
      const pane = this.getIndicatorPanes().find((p) => pos.y >= p.rect.y && pos.y <= p.rect.y + p.rect.height);
      if (pane) payload.pane = pane.instanceId;
    }
    return payload;
  }

  /**
   * The "+" rides on the crosshair: without one it is neither drawn nor
   * pressed. While it shows, the trading tags end left of its strip, so it
   * never covers their buttons.
   */
  private applyPriceAxisAdd(): void {
    const on = this.features.priceAxisAddButton && this.features.crosshair;
    this.priceAxisAddButton.setEnabled(on);
    this.tradingManager.setTagInset(on ? PRICE_AXIS_ADD_STRIP : 0);
  }

  /** Show or hide the "+" by the price axis (`features.priceAxisAddButton`). */
  setPriceAxisAddButton(visible: boolean): void {
    this.features.priceAxisAddButton = visible;
    this.applyPriceAxisAdd();
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
    const data = this.exportBars();
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
      const name = indicatorChipLabel(ind.id, ind.params, ind.descriptor.defaultConfig, ind.descriptor.shortName, ind.descriptor.inputs);
      // Marks on some bars (`kind: 'markers'`) are no column: they are not values.
      const plots = ind.descriptor.plots ? valuePlots(ind.descriptor.plots) : Object.keys(series.find((p) => p) ?? {}).map((key) => ({ key, title: key }));
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
    this.indicatorHistory.record(instanceId, () => this.setIndicatorVisibleNow(instanceId, visible));
  }

  /** Show or hide several indicators at once, as one undo step. */
  setIndicatorsVisible(instanceIds: readonly string[], visible: boolean): void {
    if (instanceIds.length === 0) return;
    this.undoRedoManager.group(() => {
      for (const id of instanceIds) this.setIndicatorVisible(id, visible);
    });
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
    this.indicatorHistory.record(instanceId, () => this.setIndicatorIntervalsNow(instanceId, intervals));
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
    this.indicatorHistory.record(instanceId, () => this.updateIndicatorStyleNow(instanceId, style));
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

  /**
   * The account's working orders, all of them. One that names its symbol
   * (`symbol`) is drawn on the chart of that symbol and kept on another,
   * where `getOrders` and `ordersChange` still give it; one that names none
   * is drawn on whatever the chart shows.
   */
  setOrders(orders: TradingOrder[]): void {
    if (!this.features.trading) return;
    this.book.setOrders(orders);
    this.tradingManager.setOrders(ofSymbol(orders, this.tradedSymbol));
    this.eventBus.emit('ordersChange', { orders });
  }

  /**
   * The symbol the chart shows, as it was given: its stream's (`connect`,
   * `switchStream`), or the one said for bars set by hand (`setSymbol`); `''`
   * with neither. The orders, positions and fills it draws are those of this
   * symbol, and the orders it asks for name it.
   */
  getSymbol(): string {
    return this.tradedSymbol;
  }

  /**
   * Say which symbol the chart's bars are of, where they are set by hand
   * (`setData`); a stream names its own. The chart then draws that symbol's
   * orders, positions and fills, keeps those that name another, and names it
   * on the orders it asks for. `''` takes it back: everything is drawn.
   */
  setSymbol(symbol: string): void {
    this.showTradingOf(symbol);
  }

  /** Another symbol shown: its own orders, positions and fills are drawn, and the last one's are kept. */
  private showTradingOf(symbol: string): void {
    if (symbol === this.tradedSymbol) return;
    this.tradedSymbol = symbol;
    // The account is told what a price of this symbol is worth, as the market now set has it.
    this.executionAdapter?.setMultiplier?.(this.marketConfig?.contractMultiplier, symbol);
    if (!this.features.trading) return;
    this.tradingManager.setOrders(ofSymbol(this.book.getOrders(), symbol));
    this.tradingManager.setPositions(ofSymbol(this.book.getPositions(), symbol));
    this.tradingManager.setFills(ofSymbol(this.book.getFills(), symbol));
    this.engine.requestRender();
  }

  /**
   * Begin placing a draggable bracket order (entry + stop-loss + take-profit).
   * Defaults the entry to the latest close when `entry` is omitted. Drag the
   * three lines to adjust; confirm with Enter (emits `bracketPlace`) or cancel
   * with Esc. `size` gives it its quantity: `{ quantity: 2 }`, or
   * `{ risk: 50 }` for the quantity that loses 50 at the stop, which follows
   * the lines as they are dragged. With no size it has no quantity, and a
   * connected execution adapter is not sent it. Returns false if trading is
   * disabled or no price is available.
   */
  startBracket(side: import('@tradecanvas/commons').OrderSide, entry?: number, size?: BracketSize): boolean {
    if (!this.features.trading) return false;
    const data = this.series.bars();
    const price = entry ?? (data.length > 0 ? data[data.length - 1].close : null);
    if (price === null) return false;
    // A risk is money: the quantity it buys is counted by what a price is worth on the market, unless the host says.
    const multiplier = this.marketConfig?.contractMultiplier;
    const sized = size && size.risk !== undefined && size.multiplier === undefined && multiplier !== undefined ? { ...size, multiplier } : size;
    this.tradingManager.startBracket(side, price, sized);
    return true;
  }

  /** Size the bracket being placed anew (a quantity typed in a field). With none being placed it does nothing. */
  setBracketSize(size: BracketSize | undefined): void {
    if (this.features.trading) this.tradingManager.setBracketSize(size);
  }

  /** The bracket being placed: its side, its three prices and the quantity its size gives it now. Null with none. */
  getBracket(): BracketDraft | null {
    return this.features.trading ? this.tradingManager.getBracket() : null;
  }

  cancelBracket(): void {
    if (this.features.trading) this.tradingManager.cancelBracket();
  }

  /**
   * Confirm the bracket being placed: `bracketPlace` goes out, and with an
   * execution adapter connected it is sent as an order. A bracket the adapter
   * would not be sent (it has no quantity) is not confirmed: `executionError`
   * says why (`reason: 'noQuantity'`), and it stays to be given a size.
   * Returns whether it was confirmed.
   */
  confirmBracket(): boolean {
    if (!this.features.trading) return false;
    const bracket = this.tradingManager.getBracket();
    if (bracket && bracket.quantity === undefined && this.placesBrackets()) {
      this.eventBus.emit('executionError', { message: 'A bracket with no quantity is not sent to the adapter', command: 'bracketPlace', reason: 'noQuantity' });
      return false;
    }
    if (this.orderGate && !this.orderGate()) return false;
    return this.tradingManager.confirmBracket();
  }

  /**
   * Ask before the chart sends an order it was only asked to confirm: a
   * bracket or a draft order dragged on the plot (Enter, `confirmBracket`,
   * `confirmOrderDraft`). Answered false, nothing is sent and the bracket or
   * the draft stays as it is. `ChartWidget` holds them back while its feed is
   * down; null asks no one.
   */
  setOrderGate(gate: (() => boolean) | null): void {
    this.orderGate = gate;
  }

  /**
   * Ask before a button on a position's line closes or reverses it: the guard
   * is given what was pressed, the position's id and `send`, and calls `send`
   * when it is to go ahead (after a confirmation, say), or never. Your own
   * calls of `closePositionIntent` and `reversePositionIntent` are not asked
   * about. `ChartWidget` confirms these presses with it; null asks no one.
   */
  setPositionGuard(guard: ((action: 'positionClose' | 'positionReverse', positionId: string, send: () => void) => void) | null): void {
    this.positionGuard = guard;
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
    if (!this.features.trading || (this.orderGate && !this.orderGate())) return false;
    return this.tradingManager.confirmOrderDraft();
  }

  isOrderDraftActive(): boolean {
    return this.features.trading && this.tradingManager.isOrderDraftActive();
  }

  /**
   * Ask for an order: the `orderPlace` event, which a connected execution
   * adapter places; with none, the app listens (`chart.on('orderPlace', …)`)
   * and sends it to its own order management.
   *
   * The order goes out with a `clientOrderId`, an id of its own: the one it
   * came with, else one the chart gives it. A broker that takes it turns a
   * repeat of the same order away, and what became of the order is told by
   * it: `orderPlaced` once an adapter took it, or an `executionError` that
   * names it. Returns the order as it was sent, or null with trading off.
   */
  placeOrderIntent(intent: import('@tradecanvas/commons').OrderPlaceIntent): import('@tradecanvas/commons').OrderPlaceIntent | null {
    if (!this.features.trading) return null;
    const sent = this.withClientOrderId(intent);
    this.eventBus.emit('orderPlace', sent);
    return sent;
  }

  /**
   * An order as it goes out: with an id of its own (the one it has, else a new one), so that a
   * broker can tell a press sent twice from two orders and what became of it be told by it; and
   * with the symbol it is for, the one shown unless it names another, so that an account of many
   * symbols knows which.
   */
  private withClientOrderId(intent: import('@tradecanvas/commons').OrderPlaceIntent): import('@tradecanvas/commons').OrderPlaceIntent {
    const named = intent.symbol !== undefined || this.tradedSymbol === '' ? intent : { ...intent, symbol: this.tradedSymbol };
    return named.clientOrderId ? named : { ...named, clientOrderId: this.nextClientOrderId() };
  }

  /** An id for one order asked for: this chart's own mark, the moment and a count, so that no two are alike on a page or across reloads. */
  private nextClientOrderId(): string {
    this.clientOrderSeq += 1;
    return `tc-${this.clientOrderMark}-${Date.now().toString(ID_RADIX)}-${this.clientOrderSeq.toString(ID_RADIX)}`;
  }

  /** The account's open positions, all of them: one that names its symbol is drawn on the chart of that symbol and kept on another, as an order is (`setOrders`). */
  setPositions(positions: TradingPosition[]): void {
    if (!this.features.trading) return;
    this.book.setPositions(positions);
    this.tradingManager.setPositions(ofSymbol(positions, this.tradedSymbol));
    this.eventBus.emit('positionsChange', { positions });
  }

  /** The account's working orders (`setOrders`, or the execution adapter's), of every symbol: the chart draws those of the one it shows (`getSymbol`). */
  getOrders(): TradingOrder[] {
    return this.book.getOrders();
  }

  /** The account's open positions (`setPositions`, or the execution adapter's), of every symbol: the chart draws those of the one it shows (`getSymbol`). */
  getPositions(): TradingPosition[] {
    return this.book.getPositions();
  }

  /**
   * What happened to the orders, oldest first, the latest 200: each placed,
   * moved, cancelled or filled, and what was refused with why. Read from the
   * orders, fills and errors the chart is told, from an execution adapter or
   * from `setOrders` and `addFill`. The orders there when it began are not
   * in it, nor those there when an adapter is connected or taken away, or
   * (with no adapter) when the symbol changes. An order filled in part and
   * then taken off is logged cancelled. `ordersChange`, `executionFill` and
   * `executionError` follow it.
   */
  getActivityLog(): ActivityEntry[] {
    return this.activity.entries();
  }

  /** Empty the activity log. */
  clearActivityLog(): void {
    this.activity.clear();
  }

  /**
   * The moment an order placed now is placed at, in milliseconds: the clock's,
   * or, while a paper account trades on a replay, the replay's (the time of
   * the last price the account was given). It is what the account's fills are
   * timed with, and what it holds the date of a good-till-date order against.
   */
  getTradingTime(): number {
    return this.executionAdapter?.setMarkPrice !== undefined && this.markedAt !== undefined ? this.markedAt : Date.now();
  }

  /** When something that is no fill happened: now, or on a replay the bar it is at (as the paper account's fills are timed). */
  private activityTime(): number {
    if (this.replaySession === null) return Date.now();
    return this.series.bars().at(-1)?.time ?? Date.now();
  }

  /**
   * The account's fills, oldest first, of every symbol (the latest 1000): the
   * execution adapter's, or `addFill`'s. Each has its `symbol`: its own, else
   * its position's or its order's, else the one the chart showed as it came.
   * The chart marks those of the symbol it shows.
   */
  getFills(): import('@tradecanvas/commons').FillEvent[] {
    return this.book.getFills();
  }

  /** The P&L the fills realised since the last `clearFills`, all of them, of every symbol (the marks keep the latest 1000). */
  getRealisedPnl(): number {
    return this.book.realisedPnl();
  }

  /** A fill of the account (without an execution adapter, a host reports its own): marked on the chart of its symbol. */
  addFill(fill: import('@tradecanvas/commons').FillEvent): void {
    if (!this.features.trading) return;
    this.tellFill(fill);
  }

  /** A fill kept with its symbol, marked where the chart shows that symbol, and told. */
  private tellFill(fill: import('@tradecanvas/commons').FillEvent): void {
    const told = this.book.addFill(fill, this.tradedSymbol);
    if (ofSymbol([told], this.tradedSymbol).length > 0) this.tradingManager.addFill(told);
    this.eventBus.emit('executionFill', told);
  }

  /** Forget the fills, of every symbol: their marks, and the profit they realised. */
  clearFills(): void {
    this.book.setFills([], this.tradedSymbol);
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

  /**
   * Feed the order book to the overlay on the plot (`features.depth`, or
   * `features.trading`, whose default is on). Null clears it. The overlay
   * draws once it is enabled: `features.depth` does that, else
   * `setDepthOverlay({ enabled: true })`.
   */
  setDepthData(depth: DepthData | null): void {
    if (!this.features.trading && !this.features.depth) return;
    this.depthLayer.setData(depth);
    this.engine.requestRender(LayerType.Overlay);
  }

  /** Change how the order book is drawn (`DepthOverlayConfig`): keys left out keep their value. */
  setDepthOverlay(config: import('@tradecanvas/commons').DepthOverlayConfig): void {
    this.depthLayer.setConfig(config);
    this.engine.requestRender(LayerType.Overlay);
  }

  getDepthOverlay(): import('@tradecanvas/commons').DepthOverlayConfig {
    return this.depthLayer.getConfig();
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
    // A trade made before its bar was there can be counted now.
    this.settleFootprint();
    this.eventBus.emit('dataUpdate', { kind: 'bars', length } satisfies DataUpdatePayload);
    // A mirrored crosshair stays on its slot: the legend reads the bar there now, not the old series'.
    const synced = this.crosshairHandler.getSyncedSlot();
    if (synced !== null) this.showSyncedBar(synced);
  }

  /**
   * The last bar shown has new values with no `dataUpdate` (the series did
   * not grow, or a replay moved): the screen readers' summary says its last
   * price, at most once a second while a feed streams or a replay plays.
   */
  private lastBarMoved(): void {
    this.a11y?.refresh();
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
   * So does a line still computing in the indicator worker: it is not
   * finished here for a tick, and its alerts are checked when it lands.
   */
  private checkAlerts(price: number): void {
    const live = this.replaySession ? this.series.liveBars() : this.series.bars();
    const engine = this.indicatorEngine;
    const lines = this.replaySession || this.series.length() === 0
      ? null
      : (id: string) => (engine.isComputingInWorker(id) ? undefined : engine.peekOutput(id)?.series);
    checkAlerts(this.alertManager, { price, barTime: live.length > 0 ? live[live.length - 1].time : null, lines });
  }

  setTradingConfig(config: Partial<TradingConfig>): void {
    if (!this.features.trading) return;
    this.tradingManager.setConfig(config);
    if (config.depthOverlay) this.setDepthOverlay(config.depthOverlay);
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
   *
   * Or from a feed the chart pulls from (`DataFeed`, `ManualFeed`):
   * `chart.connect({ feed, symbol: 'AAPL', timeframe: '1d' })`.
   * Throws when the config has both an adapter and a feed, or neither.
   */
  async connect(options: StreamConfig): Promise<void> {
    // One adapter for the whole connection: a feed's is made once, here.
    const config: StreamConfig & { adapter: DataAdapter } = { ...options, adapter: streamAdapterOf(options), feed: undefined };
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
      this.feedToldAt = Date.now();
      const key = this.streamSeriesKey(config.adapter);
      const reconnected = key === this.snapshotKey;
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
      // The bars the trades are counted into are there now; after a reconnect, the trades made meanwhile are asked for.
      this.syncTradeFeed(reconnected);
    });

    // Each bar lands by its time: the last bar again (its latest values, a
    // close included), a new one after it, or none when it is older. A
    // closed one older than the last is a correction of the bar loaded at
    // its time: final, even when the host's own bars run ahead of the stream.
    // A trade at the price there was moves no bar and no price line: it is a word from the feed all the same.
    this.streamManager.on('tick', () => {
      this.feedToldAt = Date.now();
    });
    this.streamManager.on('barClose', (bar) => {
      this.feedToldAt = Date.now();
      if (!isValidBar(bar)) return;
      const write = this.series.placeStreamBar(bar);
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
      this.recalcIndicatorsFrom(data, data.length - 2);
      this.updateViewportAndRender(follow);
      if (data.length !== before) this.emitBars(data.length);
      else this.lastBarMoved();
      this.followLivePrice(bar.close);
    });

    // The feed's last word on a bar already past: no live price.
    this.streamManager.on('barCorrection', (bar) => {
      this.feedToldAt = Date.now();
      this.updateBar(bar);
    });

    this.streamManager.on('barUpdate', (bar) => {
      this.feedToldAt = Date.now();
      if (!isValidBar(bar)) return;
      const write = this.series.placeStreamBar(bar);
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
      else this.lastBarMoved();
      this.scheduleRender();
    });

    this.setBidAsk(null); // the last symbol's quote
    // A tick may carry one side only: the other stays.
    this.streamManager.on('quote', (quote) => {
      this.feedToldAt = Date.now();
      const now = this.priceLines.getBidAsk();
      this.setBidAsk({ bid: quote.bid ?? now?.bid, ask: quote.ask ?? now?.ask });
    });

    this.streamManager.on('priceChange', ({ price, previousClose }) => {
      this.feedToldAt = Date.now();
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
      // Connected again: it has the wait from now to tell something.
      if (info.state === 'connected') this.feedToldAt = Date.now();
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
    // Another series: its bars are other bars, and the rows kept are not theirs.
    if (symbol !== this.currentSymbol || timeframe !== this.streamTimeframe) this.forgetFootprint();
    // Another symbol's trades are all new.
    if (symbol !== this.currentSymbol) this.tradesTold = new TradeStream();
    this.currentSymbol = symbol;
    this.showTradingOf(symbol);
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
   * When the connected stream last told anything: its bars, a bar's update,
   * a quote or a price, by the clock (ms); null before it has, and with bars
   * set by hand. A feed that is connected and tells nothing has stalled, or
   * its market is shut: `ChartWidget` reads this to stop saying "Live".
   */
  getFeedTime(): number | null {
    return this.feedToldAt;
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
    // No stream: nothing is told, and nothing is waited for.
    this.feedToldAt = null;
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
    this.stopTradeFeed();
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
    // Another broker's orders are what is there, not orders placed now.
    this.activity.rebase();
    this.executionAdapter = adapter;
    // An adapter that counts money counts it as the chart's market does.
    adapter.setMultiplier?.(this.marketConfig?.contractMultiplier, this.tradedSymbol ?? undefined);
    this.executionBrackets = config.brackets ?? 'place';
    this.execTeardown = wireExecution(adapter, {
      onIntent: (type, handler) => {
        const wrapped = (e: ChartEvent) => handler(e.payload);
        this.eventBus.on(type, wrapped);
        return () => this.eventBus.off(type, wrapped);
      },
      setOrders: (orders) => this.setOrders(orders),
      setPositions: (positions) => this.setPositions(positions),
      onError: (error) => this.eventBus.emit('executionError', error),
      onOrderPlaced: (intent, order) => this.eventBus.emit('orderPlaced', { intent, order }),
      newClientOrderId: () => this.nextClientOrderId(),
      onFill: (fill) => this.tellFill(fill),
      getPositions: () => this.book.getPositions(),
      symbol: () => this.tradedSymbol || undefined,
      multiplier: () => this.marketConfig?.contractMultiplier ?? 1,
      // On the market's grid, as a bracket's entry is: one started at the market is a limit there, not a stop a step over it.
      marketPrice: () => {
        const close = this.series.bars().at(-1)?.close;
        return close === undefined ? null : this.roundPrice(close);
      },
      onBracketOrder: (order, bracket) => this.eventBus.emit('bracketOrder', { order, bracket }),
      setAccount: (account) => {
        // Read on wiring and told again on connecting: the same figures are one change.
        if (this.account && JSON.stringify(this.account) === JSON.stringify(account)) return;
        this.account = { ...account };
        this.eventBus.emit('accountChange', { account: { ...account } });
      },
      onMarginCall: (call) => this.eventBus.emit('marginCall', { ...call }),
    }, { brackets: this.executionBrackets });
    this.eventBus.emit('executionChange', { connected: true });
    Promise.resolve(adapter.connect(config)).catch((cause) =>
      this.eventBus.emit('executionError', { message: 'Execution connect failed', cause }),
    );
  }

  /**
   * Whether a confirmed bracket goes to the connected adapter as an order,
   * not only as the `bracketPlace` event: with an adapter connected, unless
   * it was connected with `brackets: 'event'`.
   */
  placesBrackets(): boolean {
    return this.executionAdapter !== null && this.executionBrackets === 'place';
  }

  /** Tear down the active execution adapter (if any) and stop routing intents. */
  disconnectExecution(): void {
    this.returnMarkToLive();
    // The next adapter starts on the clock, whatever this one was given.
    this.markedAt = undefined;
    this.executionBrackets = 'place';
    if (this.execTeardown) {
      this.execTeardown();
      this.execTeardown = null;
    }
    if (this.executionAdapter) {
      this.executionAdapter.disconnect();
      this.executionAdapter = null;
      this.activity.rebase();
      this.eventBus.emit('executionChange', { connected: false });
    }
    if (this.account) {
      this.account = null;
      this.eventBus.emit('accountChange', { account: null });
    }
  }

  /**
   * The connected execution adapter's account: its balance, equity, margin
   * and what trading cost. Null with no adapter, or one that keeps no money
   * (the paper account without a `balance`). `accountChange` follows it.
   */
  getAccount(): import('@tradecanvas/commons').AccountSummary | null {
    return this.account ? { ...this.account } : null;
  }

  /**
   * Hide or show the positions, the orders and their fill marks. Hidden, none
   * is drawn and none can be pressed or dragged; they are still kept, and
   * still follow the execution adapter. A bracket or an order being placed
   * still shows.
   */
  setTradingVisible(visible: boolean): void {
    this.tradingManager.setHidden(!visible);
  }

  isTradingVisible(): boolean {
    return !this.tradingManager.isHidden();
  }

  /**
   * Lock or unlock the positions' and orders' lines: locked, no line or tag
   * of theirs can be dragged (an order's price, a stop, a target), and a
   * position offers no SL or TP to drag out. Their buttons (close, cancel,
   * reverse, trail, remove a stop) still act.
   */
  setTradingLocked(locked: boolean): void {
    this.tradingManager.setLocked(locked);
  }

  isTradingLocked(): boolean {
    return this.tradingManager.isLocked();
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
    this.applyIdleCursor();
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
    this.applyIdleCursor();
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
    // Unlike the drag-to-scale/vertical-pan gesture freeze, an explicit call
    // here is a deliberate preference: it survives the next setData() the
    // same way a constructor-time `autoScale: false` would.
    this.priceFit.setAuto(enabled, this.series.length() > 0);
    this.updateViewportAndRender();
  }

  /** A drag of the price axis or a vertical pan: the range on screen is the user's, held from here. */
  private holdPriceScale(): void {
    this.priceFit.hold();
  }

  isAutoScale(): boolean {
    return this.priceFit.isAuto();
  }

  // --- Crosshair ---

  setCrosshairMode(mode: 'normal' | 'magnet' | 'hidden'): void {
    this.crosshairHandler.setMode(mode);
    this.engine.requestRender(LayerType.Hover);
  }

  getCrosshairMode(): string {
    return this.crosshairHandler.getMode();
  }

  /**
   * What the pointer looks like over the chart: `'cross'` (the crosshair's
   * lines, a crosshair cursor), `'dot'` (the lines, a small dot for a cursor)
   * or `'arrow'` (no lines, the arrow cursor; the price and the time still
   * follow the pointer on the axes). Emits `crosshairCursorChange`.
   */
  setCrosshairCursor(cursor: CrosshairCursor): void {
    if (!isCrosshairCursor(cursor) || cursor === this.crosshairHandler.getCursor()) return;
    this.crosshairHandler.setCursor(cursor);
    this.applyIdleCursor();
    this.engine.requestRender(LayerType.Hover);
    this.eventBus.emit('crosshairCursorChange', { cursor });
  }

  getCrosshairCursor(): CrosshairCursor {
    return this.crosshairHandler.getCursor();
  }

  /** The CSS cursor over the plot for the cursor kind, in the crosshair's colour as now resolved. */
  private applyIdleCursor(): void {
    const theme = this.themeManager.getTheme();
    const color = theme.style?.crosshair.vertical.color ?? theme.crosshair;
    this.interactionManager.setIdleCursor(idleCssCursor(this.crosshairHandler.getCursor(), color, theme.background));
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
   * The legend reads that bar, and `crosshairSync` says which one; no
   * `crosshairMove` fires, so linked charts don't echo each other.
   */
  setCrosshairTime(time: number | null): void {
    const data = this.getDisplayData();
    const slot = time === null || data.length === 0 ? null : Math.floor(timestampToBarIndex(time, data));
    if (slot === this.crosshairHandler.getSyncedSlot()) return;
    this.crosshairHandler.setSyncedSlot(slot);
    this.showSyncedBar(slot);
    this.engine.requestRender(LayerType.Hover);
  }

  /**
   * The legend follows a mirrored crosshair as it follows the pointer, or the
   * other charts of a grid keep showing their latest bar. The pointer's own
   * crosshair, when there is one here, keeps the legend.
   */
  private showSyncedBar(slot: number | null): void {
    if (slot === null) {
      if (!this.crosshairHandler.getPosition()) this.chartLegend.setHoverBar(null);
      this.eventBus.emit('crosshairSync', { barIndex: null });
      return;
    }
    const series = this.crosshairSeries();
    const bar = slot >= 0 && slot < series.length ? series[slot] : undefined;
    const prev = bar && slot > 0 ? series[slot - 1] : undefined;
    if (!this.crosshairHandler.getPosition()) this.chartLegend.setHoverBar(bar ?? null, prev ?? null);
    const time = bar ? axisTimes(series)[slot]?.time ?? bar.time : undefined;
    this.eventBus.emit('crosshairSync', {
      barIndex: slot,
      ...(bar ? { bar } : {}),
      ...(time !== undefined ? { time } : {}),
      ...(prev ? { prevClose: prev.close } : {}),
    });
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
    this.clearProfileOfLegend();
    this.engine.requestRender(LayerType.Main);
  }

  isMarketProfileVisible(): boolean {
    return this.marketProfile.isVisible();
  }

  setMarketProfileConfig(config: { buckets?: number; widthRatio?: number; opacity?: number; valueAreaPct?: number; highlightPoC?: boolean; showStats?: boolean; splitBySession?: boolean; letters?: boolean; color?: string | null; valueAreaColor?: string | null }): void {
    if (config.buckets !== undefined) this.marketProfile.setBuckets(config.buckets);
    if (config.widthRatio !== undefined) this.marketProfile.setWidthRatio(config.widthRatio);
    if (config.opacity !== undefined) this.marketProfile.setOpacity(config.opacity);
    if (config.valueAreaPct !== undefined) this.marketProfile.setValueAreaPct(config.valueAreaPct);
    if (config.highlightPoC !== undefined) this.marketProfile.setHighlightPoC(config.highlightPoC);
    if (config.showStats !== undefined) this.marketProfile.setShowStats(config.showStats);
    if (config.splitBySession !== undefined) this.marketProfile.setSplitBySession(config.splitBySession);
    if (config.letters !== undefined) this.marketProfile.setLetters(config.letters);
    // Colours of its own (null: the theme's again), so that candles hidden or coloured otherwise leave the profile as it is.
    this.marketProfile.setColors({ color: config.color, valueAreaColor: config.valueAreaColor });
    this.engine.requestRender(LayerType.Main);
  }

  /**
   * The profile's figures are written under the legend's lines, which start in the same corner,
   * and under what a host stacks beneath them (`setLegendStack`: the widget's rows of indicators).
   */
  private clearProfileOfLegend(): void {
    const top = this.viewport.getState().chartRect.y;
    const legend = this.isLegendVisible() ? Math.max(0, this.getLegendBottom() - top) : 0;
    this.marketProfile.setClearTop(legend + (this.legendStack?.height ?? 0));
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

  /**
   * How the liquidity heatmap is drawn. `bidColor` and `askColor` are colours of its own (null:
   * the theme's rising and falling candles again): a chart that hides its candles, or colours
   * them for something else, keeps its heatmap with them.
   */
  setDepthHeatmapConfig(config: { opacity?: number; capacity?: number; bidColor?: string | null; askColor?: string | null }): void {
    if (config.opacity !== undefined) this.depthHeatmap.setOpacity(config.opacity);
    if (config.capacity !== undefined) this.depthHeatmap.setCapacity(config.capacity);
    this.depthHeatmap.setColors({ bidColor: config.bidColor, askColor: config.askColor });
    this.engine.requestRender(LayerType.Main);
  }

  getDepthHeatmapConfig(): import('@tradecanvas/core').DepthHeatmapConfig {
    return this.depthHeatmap.getConfig();
  }

  /**
   * Record an order-book snapshot for the liquidity heatmap, stamped at
   * `time`, or else at the latest bar's time. Call alongside `setDepthData`
   * on each book update; pass `time` to fill in books recorded for older
   * bars, oldest first. During a replay the latest bar is the live one:
   * a live book belongs to now, and shows once the replay ends.
   */
  pushDepthSnapshot(depth: import('@tradecanvas/commons').DepthData, time?: number): void {
    const data = this.replaySession ? this.series.liveBars() : this.series.bars();
    const at = time ?? data[data.length - 1]?.time;
    if (at === undefined || !Number.isFinite(at)) return;
    this.depthHeatmap.push(at, depth);
    if (this.depthHeatmap.isVisible()) this.engine.requestRender(LayerType.Main);
  }

  clearDepthHeatmap(): void {
    this.depthHeatmap.clear();
    this.engine.requestRender(LayerType.Main);
  }

  // --- Footprint ---

  /**
   * Trades into the footprint (`chartType: 'footprint'`): each is counted in
   * the bar of its time and the row of its price, on the side that took it
   * (`side`; one that does not say is told by the trade before it: bought
   * when the price went up to it, sold when it went down). A trade of a bar
   * that is not there yet is kept until it is; one from before the first
   * bar is left out. A chart connected to a feed with trades asks for them
   * itself while it shows a footprint (`chartTypeOptions.footprint.collect`).
   * They are told as a `trades` event, as the feed's are.
   */
  addTrades(trades: readonly Trade[]): void {
    this.resolveFootprintRow();
    if (this.footprintByHand.live(trades)) this.footprintChanged();
    this.tellTrades(this.tradesTold.byHand(trades), false);
  }

  /**
   * The trades of the chart's symbol told lately, oldest first: up to 2,000
   * of them, the feed's and those given by hand. For a listener that comes
   * after trades were told (a chart that shows a footprint follows them
   * from the start): read these, then listen for `trades`.
   */
  getTrades(): Trade[] {
    return this.tradesTold.trades();
  }

  /**
   * Follow the trades of the chart's symbol until the function it returns is
   * called: the connected feed's recent trades, then its live ones, as
   * `trades` events (a feed with `fetchTrades` and `subscribeTrades`; any
   * other tells none). The feed is asked once for any number of followers
   * and let go when the last one stops, unless the chart shows a footprint,
   * which follows them by itself. Followed before a feed is connected, it
   * starts with the connection.
   */
  followTrades(): () => void {
    this.tradeFollowers++;
    this.syncTradeFeed();
    let following = true;
    return () => {
      if (!following) return;
      following = false;
      this.tradeFollowers--;
      this.syncTradeFeed();
    };
  }

  /**
   * Rows of the footprint as given, for a host that keeps them itself: each
   * bar's rows (its `time` in milliseconds) replace the ones it had; a bar
   * with no rows has no footprint. With no row size set
   * (`chartTypeOptions.footprint.rowSize`), the first rows given set it: the
   * smallest step between their prices.
   */
  setFootprint(bars: readonly FootprintBar[]): void {
    this.resolveFootprintRow(bars);
    for (const bar of bars) this.footprint.set(bar);
    this.footprintChanged();
  }

  /** The footprint of the bar at `time` (ms), null when it has none; with no time, every bar's, oldest first. */
  getFootprint(): FootprintBar[];
  getFootprint(time: number): FootprintBar | null;
  getFootprint(time?: number): FootprintBar[] | FootprintBar | null {
    // Copies: the rows kept are the ones drawn, and are not the host's to change.
    const copy = (bar: FootprintBar): FootprintBar => ({ time: bar.time, levels: bar.levels.map((level) => ({ ...level })) });
    if (time === undefined) return this.footprint.bars().map(copy);
    const bar = this.footprint.get(time);
    return bar ? copy(bar) : null;
  }

  /** Forget every bar's footprint: for a host that gave the rows and now shows another series. */
  clearFootprint(): void {
    this.forgetFootprint();
    this.syncTradeFeed();
    this.footprintChanged();
  }

  /** The rows kept and the trades waiting for their bars are another series': gone, the feed's included. */
  private forgetFootprint(): void {
    this.stopTradeFeed();
    this.footprint.reset();
    // Nothing is counted any more: the feed's recent trades are all to count again.
    this.footprintCounted = new TradeStream();
    this.footprintByHand = new FootprintFeed(this.footprint, (time) => this.footprintBarOf(time));
  }

  /** The bar of the live series a trade made at `time` is of. */
  private footprintBarOf(time: number): number | 'later' | null {
    const bars = this.series.liveBars();
    return barOfTrade(bars, time, barSpanOf(this.streamTimeframe ?? this.announcedTimeframe, bars));
  }


  /**
   * The row size, once: the one set; else the step of the rows given by
   * hand; else about a ten-thousandth of the last price, in whole steps of
   * the market's price step where it has one.
   */
  private resolveFootprintRow(given?: readonly FootprintBar[]): void {
    if (this.footprint.getRowSize() > 0) return;
    const bars = this.series.liveBars();
    const price = bars[bars.length - 1]?.close ?? 0;
    const size = footprintRowSize(this.footprintRowSet, given, price, this.stepAt(price));
    if (size > 0) this.footprint.setRowSize(size);
  }

  /** The footprint's settings into its renderer; another row size starts the footprint again. */
  private applyFootprintOptions(): void {
    const options = this.chartTypeOptions.footprint ?? {};
    if (this.chartRenderer instanceof FootprintRenderer) {
      this.chartRenderer.setCells(options.cells ?? 'bidAsk');
      this.chartRenderer.setImbalance(options.imbalance ?? FOOTPRINT_IMBALANCE);
      this.chartRenderer.setTotals(options.totals !== false);
    }
    const rowSize = typeof options.rowSize === 'number' ? options.rowSize : 'auto';
    if (rowSize === this.footprintRowSet) return;
    this.footprintRowSet = rowSize;
    // The rows kept cannot be cut into rows of another size.
    this.forgetFootprint();
  }

  /** Whether the feed's trades are counted into the footprint: not where the host gives its rows itself. */
  private collectsFootprint(): boolean {
    return this.chartTypeOptions.footprint?.collect !== false;
  }

  /**
   * Follow the feed's trades while the chart shows a footprint or someone
   * asked for them (`followTrades`), of a connected series whose bars are
   * in, and stop when no one does: its recent trades once, then its live
   * ones.
   */
  private syncTradeFeed(reconnected = false): void {
    const adapter = this.streamAdapter;
    const symbol = this.currentSymbol;
    const collects = this.collectsFootprint();
    const wanted = ((this.options.chartType === 'footprint' && collects) || this.tradeFollowers > 0)
      && !!adapter?.fetchTrades && !!adapter.subscribeTrades
      && this.snapshotKey !== null && this.snapshotKey === this.streamSeriesKey(adapter);
    // Counted into the footprint or not is part of what the feed is followed for: a change starts it again.
    const key = wanted ? `${this.snapshotKey}|${collects ? 'counted' : 'told'}` : null;
    if (key === (this.tradesLive?.key ?? null)) {
      // The same series after a dropped connection: the trades made while it was down are in the feed's recent ones.
      if (reconnected && this.tradesLive) this.fetchRecentTrades(this.tradesLive, adapter, symbol, collects);
      return;
    }
    this.stopTradeFeed();
    if (key === null || !adapter?.subscribeTrades) return;
    const feed = new FootprintFeed(this.footprint, (time) => this.footprintBarOf(time));
    const live: TradesLive = { key, feed, stop: () => {}, wait: null };
    this.tradesLive = live;
    // Live trades wait for the recent ones, so each is told, and counted, in its turn.
    this.tradesTold.hold();
    if (collects) this.footprintCounted.hold();
    live.stop = adapter.subscribeTrades(symbol, (trades) => {
      if (this.tradesLive !== live) return;
      if (collects) this.countTrades(live, this.footprintCounted.live(trades));
      this.tellTrades(this.tradesTold.live(trades), false);
    });
    this.fetchRecentTrades(live, adapter, symbol, collects);
  }

  /** Trades into the footprint, by the feed followed. */
  private countTrades(live: TradesLive, trades: readonly Trade[]): void {
    if (trades.length === 0) return;
    this.resolveFootprintRow();
    if (live.feed.live(trades)) this.footprintChanged();
  }

  /** The live trades held for the feed's recent ones, which are not coming: counted and told as they are. */
  private releaseHeldTrades(live: TradesLive, collects: boolean): void {
    if (collects) this.countTrades(live, this.footprintCounted.noRecent());
    this.tellTrades(this.tradesTold.noRecent(), false);
  }

  /** Trades as a `trades` event, to whoever listens; none, no event. */
  private tellTrades(trades: Trade[], recent: boolean): void {
    if (trades.length > 0) this.eventBus.emit('trades', { trades, recent });
  }

  /** The feed's recent trades, while `live` is still the feed followed: into the footprint where they are counted, and told, those it has left out. */
  private fetchRecentTrades(live: TradesLive, adapter: DataAdapter | null, symbol: string, collects: boolean): void {
    if (!adapter?.fetchTrades) return;
    const mine = (): boolean => this.tradesLive === live;
    const answered = (): void => {
      if (live.wait !== null) clearTimeout(live.wait);
      live.wait = null;
    };
    // A feed that never answers: the live trades held for its recent ones go on without them.
    answered();
    live.wait = setTimeout(() => {
      live.wait = null;
      if (mine()) this.releaseHeldTrades(live, collects);
    }, RECENT_TRADES_WAIT_MS);
    adapter.fetchTrades(symbol, FOOTPRINT_RECENT_TRADES).then(
      (trades) => {
        if (!mine()) return;
        answered();
        if (collects) {
          const counted = this.footprintCounted.recent(trades, FOOTPRINT_RECENT_TRADES);
          this.resolveFootprintRow();
          const recent = live.feed.recent(counted.fresh, counted.begins, counted.before);
          const held = live.feed.live(counted.held);
          if (recent || held) this.footprintChanged();
        }
        const told = this.tradesTold.recent(trades, FOOTPRINT_RECENT_TRADES);
        this.tellTrades(told.fresh, true);
        this.tellTrades(told.held, false);
      },
      (error: unknown) => {
        if (!mine()) return;
        answered();
        // No recent trades: the live ones count from the first.
        this.releaseHeldTrades(live, collects);
        const message = error instanceof Error ? error.message : String(error);
        this.eventBus.emit('dataUpdate', { kind: 'error', error: message } satisfies DataUpdatePayload);
      },
    );
  }

  private stopTradeFeed(): void {
    const live = this.tradesLive;
    if (!live) return;
    if (live.wait !== null) clearTimeout(live.wait);
    live.wait = null;
    live.stop();
    this.tradesLive = null;
  }

  /** Trades kept for bars that were still to come: counted when the bars are there. */
  private settleFootprint(): void {
    // Trades kept for want of a row size too: the bars that are there now say the price it is worked out from.
    this.resolveFootprintRow();
    const byHand = this.footprintByHand.settle();
    const live = this.tradesLive?.feed.settle() ?? false;
    if (byHand || live) this.footprintChanged();
  }

  private footprintChanged(): void {
    if (this.options.chartType === 'footprint') this.engine.requestRender(LayerType.Main);
  }

  private setFootprintShownUntil(until: number | null): void {
    this.footprintShownUntil = until;
    if (this.chartRenderer instanceof FootprintRenderer) this.chartRenderer.setShownUntil(until);
  }

  /**
   * A footprint's bars carry numbers: they may get much wider than candles
   * do, and a chart that turns into one zooms in to where they read. Any
   * other type keeps the usual limit, and bars wider than it are narrowed.
   */
  private useFootprintWidths(previous: ChartType | string, type: ChartType | string): void {
    const footprint = type === 'footprint';
    this.viewport.setMaxBarSlot(footprint ? FOOTPRINT_MAX_SLOT : null);
    this.footprintZoomPending = footprint && (previous !== 'footprint' || this.footprintZoomPending);
  }

  /** Once the footprint has bars: to the narrowest bars that carry both sides' numbers, at the newest ones. */
  private zoomIntoFootprint(): void {
    if (!this.footprintZoomPending || this.series.bars().length === 0) return;
    this.footprintZoomPending = false;
    this.viewport.setBarSlot(FOOTPRINT_OPENING_SLOT);
    this.updateViewportAndRender(true);
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
   * bars built from trades count their days in, and the minute the trading
   * day starts at for the first three (`tradingDayStart` of the symbol's
   * sessions; the bars built from trades keep the zone's midnight). Held through a switch, the
   * next symbol's trades go on building the day its history ends on when it
   * trades on the same exchange, rather than starting UTC's day beside it.
   */
  private applyStudyZone(zone: string | null): void {
    this.studyZone = zone;
    this.streamManager?.setTimeZone(zone);
    // A session that runs past midnight (CME's 17:00 to 16:00) starts the trading day at its open.
    const dayStart = tradingDayStart(this.symbolInfo?.sessions);
    this.periodLevels.setExchangeTimeZone(zone);
    this.periodLevels.setDayStart(dayStart);
    this.marketProfile.setExchangeTimeZone(zone);
    this.marketProfile.setDayStart(dayStart);
    const bars = this.series.bars();
    // With no bars yet, the data that comes computes them. Otherwise only
    // the indicators that count days in the zone, before the next read, not
    // now: the bars the symbol's hours filter again follow in setSymbolInfo,
    // and computing them computes everything once.
    const zoneMoved = this.indicatorEngine.setExchangeTimeZone(zone, bars.length > 0 ? bars : undefined);
    const startMoved = this.indicatorEngine.setSessionStart(dayStart, bars.length > 0 ? bars : undefined);
    if ((zoneMoved || startMoved) && bars.length > 0) this.announceIndicatorUpdate(0);
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
   * hours feed the session shading.
   */
  setSymbolInfo(info: SymbolInfo | null): void {
    // From the host or the feed: the indicators take the zone it brings, or none.
    this.studyZoneHeld = false;
    this.endStudyZoneWait();
    this.useSymbolInfo(info);
  }

  /** `setSymbolInfo`, leaving the indicators' zone held or not as it is. */
  private useSymbolInfo(info: SymbolInfo | null): void {
    this.symbolInfo = info ? { ...info, sessions: info.sessions?.map((session) => ({ ...session })) } : null;
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
    const next: SymbolInfo = { ...known, ...info, symbol: info.symbol || known?.symbol || symbol };
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

  /**
   * The floating tooltip for the bar at `barIndex`, beside `point`: under a
   * pointer that hovers (`crosshairTooltip: true`), or only while a press is
   * held still (`'hold'`). Hidden otherwise, and over an indicator pane, where
   * there is no price crosshair to sit beside.
   */
  private placeCrosshairTooltip(barIndex: number, point: Point, times = axisTimes(this.crosshairSeries())): void {
    const data = this.crosshairSeries();
    const bar = barIndex >= 0 && barIndex < data.length ? data[barIndex] : undefined;
    const vs = this.viewport.getState();
    const inPlot = point.y >= vs.chartRect.y && point.y <= vs.chartRect.y + vs.chartRect.height;
    const asked = this.features.crosshairTooltip === 'hold' ? this.tooltipHeld : this.features.crosshairTooltip;
    if (!bar || !inPlot || !asked) {
      this.crosshairTooltip.hide();
      return;
    }
    // A brick's own time only counts bricks: the tooltip gets the date the axis gives it.
    const time = times[barIndex]?.time ?? bar.time;
    this.crosshairTooltip.show(point, time === bar.time ? bar : { ...bar, time }, this.themeManager.getTheme(), this.cachedContainerSize(), {
      prevClose: barIndex > 0 ? data[barIndex - 1]?.close : undefined,
      priceRange: vs.priceRange,
      plot: vs.chartRect,
      barStepMs: barTimeStepMs(times),
      timeUnit: barTimeUnit(times),
    });
  }

  /**
   * A mouse press held still asks for the tooltip only where the feature says
   * so (`crosshairTooltip: 'hold'`, with a crosshair to sit beside): elsewhere
   * a press held stays the pan it was, and a click when let go.
   */
  private applyTooltipHold(): void {
    const asked = this.features.crosshair && this.features.crosshairTooltip === 'hold';
    this.interactionManager.setHoldHandler(asked ? (held, pos) => this.holdTooltip(held, pos) : null);
    if (!asked) this.tooltipHeld = false;
  }

  /** The press is held still (the tooltip shows for the bar the crosshair rests on), or let go (it goes). */
  private holdTooltip(held: boolean, pos: Point): void {
    this.tooltipHeld = held;
    const at = this.crosshairAt;
    // Beside the press itself: the crosshair's own point is where the pointer came onto this bar.
    if (held && at) this.placeCrosshairTooltip(at.barIndex, pos);
    else this.crosshairTooltip.hide();
  }

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

  /**
   * The chart as a canvas, for a picture of it. With nothing asked that the
   * screen cannot give, it is read off the chart's own canvases as they are
   * now. For more pixels than the screen's (`pixelRatio`) or another theme
   * (`theme`), the frame is drawn again on the picture's canvas, in Canvas
   * 2D whatever the chart itself draws with: the chart on the page is left
   * as it is. Null with screenshots switched off or a chart with no size.
   */
  toCanvas(options: ChartImageOptions = {}): HTMLCanvasElement | null {
    if (!this.features.screenshot) return null;
    const own = this.engine.dprManager.readContainerSize();
    const size = pictureSize(own, options);
    const sized = size.width !== own.width || size.height !== own.height;
    if (options.pixelRatio === undefined && options.theme === undefined && !sized) {
      this.freshFrame();
      const read = Screenshot.compose(this.container, this.themeManager.getTheme().background);
      // Canvases of no size make a picture of none.
      return read && read.width > 0 && read.height > 0 ? read : null;
    }
    // A chart with no size has no layout to draw at another, and a picture asked for
    // while one is being drawn (by a plugin, as it draws) would lay the chart out under it.
    if (!(own.width > 0) || !(own.height > 0) || this.picturing) return null;
    const ratio = imageRatio(size.width, size.height, options.pixelRatio, this.engine.dprManager.getDpr());
    const canvas = document.createElement('canvas');
    const pixels = picturePixels(size, ratio);
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // A paused chart hasn't taken in what changed since it stopped drawing: the
    // scales are fitted for the picture, quietly. The frame it owes the page
    // stays owed, and resuming draws it and says what moved.
    if (this.isSuspended() && this.renderDeferred) {
      this.panes.invalidateScales();
      this.fitDataAndAxes();
      this.syncRenderContext();
    }
    const paint = (): void => {
      ctx.setTransform(canvas.width / size.width, 0, 0, canvas.height / size.height, 0, 0);
      // The plot's ground is the container's on the page: the picture needs its own.
      ctx.fillStyle = this.themeManager.getTheme().background;
      ctx.fillRect(0, 0, size.width, size.height);
      this.engine.renderTo(ctx);
    };
    // At another size or in another font the legend is another size: worked out before the frame, whose
    // drawings keep clear of it, and the page's put back after.
    const frame = (): void => {
      if (this.features.legend) this.chartLegend.measure(ctx, this.viewport.getState(), this.themeManager.getTheme(), this.getDisplayData());
      paint();
    };
    // False where the size leaves no room for a plot: there is nothing to draw of the chart.
    const draw = sized ? (): boolean => this.atSize(size, frame) : (): boolean => (frame(), true);
    if (options.theme === undefined && !sized) {
      paint();
    } else {
      // The chart in the other theme, at the other size, for as long as the picture takes: nothing on the page is told or changed.
      let drawn = false;
      try {
        this.chartLegend.keepSize(() => {
          if (options.theme === undefined) drawn = draw();
          else {
            this.themeManager.withTheme(options.theme, () => {
              this.syncRenderContext();
              drawn = draw();
            });
          }
        });
      } finally {
        this.syncRenderContext();
        // A frame notes where its labels and tags are as it draws them, and what is pressed on the page is
        // found by those notes: the page's own frame is drawn again before anything can be. A paused chart
        // draws when it is shown again.
        if (this.isSuspended()) this.engine.requestRender();
        else this.engine.renderNow();
      }
      if (!drawn) return null;
    }
    // A host's canvas is laid over the chart where the chart is on the page: it has no place at another size.
    if (!sized) this.drawGuestCanvases(ctx);
    return canvas;
  }

  /**
   * Runs `draw` with the chart laid out at `size`, the bars now on view on
   * view there, and puts the page's layout back: a picture at a size of its
   * own. Nothing is told, and no canvas of the chart's is touched. The bars
   * are as wide as the size makes them, within what a bar can be: past
   * that, more or fewer of them are on view, about the same middle. What
   * follows the pointer is left out, the pointer being at a place on the
   * page. False, with nothing drawn, where the size leaves the plot no room.
   */
  private atSize(size: { width: number; height: number }, draw: () => void): boolean {
    const own = this.engine.dprManager.readContainerSize();
    const kept = { viewport: this.viewport.snapshot(), fit: this.priceFit.snapshot(), priceAxisWidth: this.priceAxisWidth, leftAxisWidth: this.leftAxisWidth };
    const { offset, barWidth, barSpacing, chartRect } = this.viewport.getState();
    const unit = barWidth + barSpacing;
    const first = unit > 0 ? offset / unit : 0;
    const last = unit > 0 ? first + chartRect.width / unit - 1 : 0;
    /** The bars that are on view on the page, fitted to the plot the picture's layout leaves. */
    const place = (): void => {
      this.panes.invalidate();
      this.viewport.setChartRect(this.getResolvedLayout().mainChartRect);
      this.viewport.zoomToBarRange(first, last);
    };
    this.picturing = true;
    try {
      // With no crosshair on the picture to say which bar, its legend reads the latest (`keepSize` puts the page's back).
      this.chartLegend.setHoverBar(null);
      this.layoutManager.resize(size.width, size.height);
      // The bars are fitted to the plot, and the plot is what the scales leave: again, should a scale change width.
      for (let round = 1; round <= PICTURE_FIT_ROUNDS; round++) {
        place();
        if (!this.fitDataAndAxes()) break;
        // Still changing at the last round: the bars are placed in the plot as it now is, and their prices fitted there.
        if (round === PICTURE_FIT_ROUNDS) {
          place();
          this.applyDataToViewport();
        }
      }
      const plot = this.viewport.getState().chartRect;
      if (!(plot.width > 0) || !(plot.height > 0)) return false;
      this.syncRenderContext();
      draw();
      return true;
    } finally {
      this.picturing = false;
      this.layoutManager.resize(own.width, own.height);
      this.priceAxisWidth = kept.priceAxisWidth;
      this.leftAxisWidth = kept.leftAxisWidth;
      this.layoutManager.setPriceAxisWidth(kept.priceAxisWidth);
      this.layoutManager.setLeftAxisWidth(this.isLeftPriceScaleShown() ? kept.leftAxisWidth : 0);
      this.viewport.restore(kept.viewport);
      this.priceFit.restore(kept.fit);
      this.panes.invalidate();
      this.leftViewport = this.computeLeftViewport();
    }
  }

  /**
   * The canvases in the chart's container that are not the chart's own (a
   * layer a host laid over it), each where it is: a picture read off the
   * screen has them, so one drawn again has them too. One that is not shown
   * is left out, and so is one the page may not read (it holds a picture
   * from another site): drawn on the picture, it would make the whole
   * picture one nobody can read.
   */
  private drawGuestCanvases(ctx: CanvasRenderingContext2D): void {
    const own = new Set(this.engine.layerManager.ownCanvases());
    const guests = [...this.container.querySelectorAll('canvas')].filter((canvas) => !own.has(canvas));
    if (guests.length === 0) return;
    const box = this.container.getBoundingClientRect();
    for (const guest of guests) {
      const at = guest.getBoundingClientRect();
      if (!(at.width > 0) || !(at.height > 0) || getComputedStyle(guest).visibility === 'hidden' || !canvasReadable(guest)) continue;
      ctx.drawImage(guest, at.left - box.left, at.top - box.top, at.width, at.height);
    }
  }

  /** Saves the chart as a picture file: `filename` (`chart` with none), ending as the format does. `options`: see `toCanvas`. */
  screenshot(filename?: string, options: ChartImageOptions = {}): void {
    const url = this.screenshotDataURL(options);
    if (url) downloadImage(url, imageFileName(filename, options.type ?? 'png'));
  }

  /** Copy the chart image to the clipboard, as a PNG. Returns false if unsupported/blocked. `options`: see `toCanvas`. */
  async copyScreenshot(options: Omit<ChartImageOptions, 'type' | 'quality'> = {}): Promise<boolean> {
    if (!this.features.screenshot) return false;
    // Nothing is drawn where there is no clipboard to put it on.
    if (!canCopyImage()) return false;
    const canvas = this.toCanvas(options);
    return copyImage(canvas ? canvasBlob(canvas) : Promise.resolve(null));
  }

  /** The chart as a picture in a data URL. `options`: its format, and see `toCanvas`. */
  screenshotDataURL(options: ChartImageOptions = {}): string | null {
    const canvas = this.toCanvas(options);
    return canvas ? canvasDataURL(canvas, options) : null;
  }

  /** The chart as a picture file's bytes. `options`: its format, and see `toCanvas`. */
  async screenshotBlob(options: ChartImageOptions = {}): Promise<Blob | null> {
    const canvas = this.toCanvas(options);
    return canvas ? canvasBlob(canvas, options) : null;
  }

  /**
   * Opens the browser's print dialog for the chart alone: a page that holds
   * its picture and nothing of the page it is on. Drawn again for paper: in
   * the light theme and at twice the pixels unless `options` say otherwise.
   * False when there was no picture to print (screenshots off, a chart with
   * no size, a picture the page may not read).
   */
  print(options: ChartPrintOptions = {}): boolean {
    const canvas = this.toCanvas({ ...options, theme: options.theme ?? PAPER_THEME, pixelRatio: options.pixelRatio ?? PAPER_PIXEL_RATIO });
    return canvas !== null && printCanvas(canvas, { title: options.title });
  }

  /**
   * The chart as a PDF of one page: its picture, kept without loss, as
   * large as fits within the margins. A4 on its side, in the light theme
   * and at twice the pixels unless `options` say otherwise. Null with
   * screenshots switched off or a chart with no size.
   */
  async toPdf(options: ChartPdfOptions = {}): Promise<Blob | null> {
    const canvas = this.toCanvas({ ...options, theme: options.theme ?? PAPER_THEME, pixelRatio: options.pixelRatio ?? PAPER_PIXEL_RATIO });
    return canvas ? canvasesToPdf([canvas], options) : null;
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

  /**
   * Draw a drawing on top of the others, under them, one step up or down, or
   * at a place in the order (`getDrawings()` lists them bottom first, 0 the
   * bottom). False when already there.
   */
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
    // A pane's drawing is at the pane's values, not at prices.
    if (this.drawingManager.getDrawings().find((d) => d.id === drawingId)?.paneId !== undefined) return null;
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
    if (!drawingId || !this.drawingAlerts) return;
    if (event === 'drawingRemove') this.drawingAlerts.removed(drawingId);
    else if (event === 'drawingCreate') this.drawingAlerts.created(drawingId);
  }

  /** Remove alerts on drawings no longer on the chart (drawings replaced or cleared). */
  private dropOrphanDrawingAlerts(): void {
    if (!this.drawingAlerts) return;
    const removed = this.drawingAlerts.prune(new Set(this.drawingManager.getDrawings().map((d) => d.id)));
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

  // --- Marks: what happened at a time ---

  /**
   * Replace the marks on the chart: headlines, earnings dates, dividends,
   * each a small badge at the foot of the price pane on the bar that holds
   * its time. The pointer over one reads its title; a click emits
   * `markClick`. What is given is read as untrusted input: a mark needs a
   * title and a time, and only http(s) links are kept. They are the feed's,
   * not the user's: a saved state does not hold them. Renko, Kagi, line
   * break, point & figure and range bars draw none (`isTimeAligned()` false):
   * their bars are not times.
   */
  setMarks(marks: readonly import('@tradecanvas/commons').ChartMark[]): void {
    this.marksChanged(() => this.chartMarkManager.setMarks(marks), true);
  }

  /**
   * Add one mark (one with the same id is replaced); its id, or null for one
   * with no title or time, or one more than the 2,000 a chart keeps.
   */
  addMark(mark: Omit<import('@tradecanvas/commons').ChartMark, 'id'> & { id?: string }): string | null {
    return this.marksChanged(() => this.chartMarkManager.addMark(mark), (id) => id !== null);
  }

  removeMark(id: string): void {
    this.marksChanged(() => this.chartMarkManager.removeMark(id), false);
  }

  /** Change the marks with `change`, and say so (`marksChange`) when their number changed, or `always` (told the result). */
  private marksChanged<T>(change: () => T, always: boolean | ((result: T) => boolean)): T {
    const before = this.chartMarkManager.count();
    const result = change();
    const count = this.chartMarkManager.count();
    const said = typeof always === 'function' ? always(result) : always;
    if (said || count !== before) {
      // The badge under the pointer may be another now, or gone: the next move reads what is there.
      this.dropMarkHover();
      this.eventBus.emit('marksChange', { count });
    }
    return result;
  }

  /** No badge is under the pointer any more (the marks changed, or went): its words go, and its listeners hear once. */
  private dropMarkHover(): void {
    this.hoveredBadge = null;
    if (!this.chartMarkManager.setHovered(null)) return;
    this.eventBus.emit('markHover', { marks: null, x: this.lastHoverPos.x, y: this.lastHoverPos.y });
  }

  /** The marks on the chart, earliest first. */
  getMarks(): import('@tradecanvas/commons').ChartMark[] {
    return this.chartMarkManager.getMarks();
  }

  clearMarks(): void {
    this.marksChanged(() => this.chartMarkManager.clearMarks(), false);
  }

  /** The badge under `pos`, the same object while the pointer stays on it; null off one or with the feature off. */
  private markBadgeAt(pos: { x: number; y: number }): MarkBadge | null {
    const found = this.features.marks ? this.chartMarkManager.badgeAt(pos, this.viewport.getState()) : null;
    const same = found !== null && this.hoveredBadge !== null && found.marks[0].id === this.hoveredBadge.marks[0].id && found.marks.length === this.hoveredBadge.marks.length;
    if (!same) this.hoveredBadge = found;
    return this.hoveredBadge;
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
    this.priceFit.resume();
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
      // The books of the bars the replay has shown, not those of the bars still to come.
      this.depthHeatmap.setShownUntil(until);
      // A bar's footprint is its whole one: a bar still forming from finer steps shows none until it has closed.
      const whole = !steps || closesBar(steps, coarse, index, barIndex);
      this.setFootprintShownUntil(whole ? until * barTimeUnit(series) : coarse[barIndex].time * barTimeUnit(coarse));
      // Markers and trades as far as the replay has shown, in the same frame as its bars.
      if (this.replayRevealMarks) this.revealReplayMarks(until);
      // The replay's bars are a series of their own: what was kept is of no use.
      this.display.reset();
      this.updateViewportAndRender(follow);
      if (animate) this.feedReplayForming(coarse, index, formed?.index === index ? formed.path : this.replayPathOf(coarse, index), 1);
      else this.feedReplaySteps(series, index);
      const cause = this.replayCause !== null ? 'series' : stepForward ? 'play' : 'seek';
      this.eventBus.emit('replayStep', { barIndex, time: coarse[barIndex].time, stepTime: series[index].time, until, total: coarse.length, cause });
      this.lastBarMoved();
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
    this.lastBarMoved();
    const data = this.series.bars();
    this.recalcIndicatorsFrom(data, data.length - 1);
    if (!appended) {
      this.scheduleRender();
      return;
    }
    this.crosshairHandler.setData(data);
    this.display.reset();
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
    if (!session || !this.executionAdapter?.setMarkPrice) return;
    const fed = { time: session.fedTime, fraction: session.fedFraction };
    const feed = formingFeed(coarse, index, path, fraction, fed, (c, i) => this.replayPathOf(c, i));
    if (!feed) return;
    session.fedTime = feed.fed.time;
    session.fedFraction = feed.fed.fraction;
    this.feedReplayMarks(feed.marks);
  }

  /** Marks of a replay to a paper account in order, and the orders on the chart to the last of them. */
  private feedReplayMarks(marks: readonly ReplayMark[]): void {
    const adapter = this.executionAdapter;
    if (!adapter?.setMarkPrice) return;
    // Each a price of the symbol shown: it works no order of another.
    for (const [price, time] of marks) adapter.setMarkPrice(price, time, this.tradedSymbol || undefined);
    const last = marks[marks.length - 1];
    if (last === undefined) return;
    this.markedAt = this.markTimeOf(last[1]);
    this.tradingManager.setCurrentPrice(last[0]);
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
    this.chartMarkManager.setRevealUntil(until, from);
    this.tradeZoneManager.setRevealUntil(until, from);
  }

  /** Jump the replay to show the bars (or finer steps) that closed by `time`. */
  replaySeekToTime(time: number): void {
    if (!this.replaySession || !this.replayCoarse) return;
    // The last bar (or step) that closed by then: a coarser chart following a
    // finer one never shows a bar whole before it closes.
    this.replaySeek(Math.max(0, positionAt(this.replayStepsSeries ?? this.replayCoarse, time)));
  }

  /** A mark's time as the paper account takes it: one that is no number is none, and the account runs on the clock. */
  private markTimeOf(time: number | undefined): number | undefined {
    return time !== undefined && Number.isFinite(time) ? time : undefined;
  }

  /** A replay step's price to an adapter that takes a mark (a paper account), and to the orders on the chart. */
  private feedReplayPrice(price: number, time?: number): void {
    const adapter = this.executionAdapter;
    if (!adapter?.setMarkPrice) return;
    adapter.setMarkPrice(price, time, this.tradedSymbol || undefined);
    this.markedAt = this.markTimeOf(time);
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
    if (!session || !this.executionAdapter?.setMarkPrice) return;
    const feed = stepFeed(series, index, { time: session.fedTime, fraction: session.fedFraction });
    if (!feed) return;
    session.fedTime = feed.fed.time;
    this.feedReplayMarks(feed.marks);
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
   * span it on that side. Its tags and handles count once it has been drawn,
   * where they sit off its points. Null for an unknown or hidden drawing (or one kept
   * off this interval), or one that is all off screen.
   */
  getDrawingRect(id: string): { x: number; y: number; width: number; height: number } | null {
    const drawing = this.drawingManager.getDrawings().find((d) => d.id === id);
    if (!drawing || !this.drawingManager.isShown(id) || drawing.anchors.length === 0) return null;
    const vs = drawing.paneId === undefined ? { ...this.viewport.getState(), data: this.getDisplayData() } : this.drawingPaneViewport(drawing.paneId);
    if (!vs) return null;
    const plot = vs.chartRect;
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const anchor of drawing.anchors) {
      // A drawing kept to the screen holds its points as shares of the plot.
      const { x, y } = this.drawingManager.anchorPoint(drawing.type, anchor, vs);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    if (FULL_WIDTH_DRAWINGS.has(drawing.type)) [left, right] = [plot.x, plot.x + plot.width];
    else if (drawing.type === 'horizontalRay') right = plot.x + plot.width;
    if (FULL_HEIGHT_DRAWINGS.has(drawing.type)) [top, bottom] = [plot.y, plot.y + plot.height];
    // All off screen: its tags, kept on the plot, don't make it shown.
    if (right < plot.x || left > plot.x + plot.width || bottom < plot.y || top > plot.y + plot.height) return null;
    // Its tags and handles where they sit off its points: a toolbar over it keeps clear of them too.
    const drawn = this.drawingManager.drawnExtent(id);
    if (drawn) {
      left = Math.min(left, drawn.x);
      right = Math.max(right, drawn.x + drawn.width);
      top = Math.min(top, drawn.y);
      bottom = Math.max(bottom, drawn.y + drawn.height);
    }
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
    this.depthHeatmap.setShownUntil(null);
    this.setFootprintShownUntil(null);
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
        // A drawing of a pane that is gone is kept for undo, not saved: a
        // reload's new ids could put it on another pane.
        getDrawings: () => [
          ...this.getDrawings().filter((d) => d.paneId === undefined || this.layoutManager.getPanels().some((panel) => panel.id === d.paneId)),
          ...this.keptPaneDrawings,
        ],
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
      const current = this.getIndicatorSetup();
      for (const id of keptInPlace(current, ordered)) kept.add(id);
      for (const cur of current) {
        if (!kept.has(cur.instanceId)) this.removeIndicator(cur.instanceId);
      }
      // A reader taken down with its source comes back with it, and so does
      // one drawn in the pane of an indicator taken down (it would stay where
      // the take-down left it): until none is left to take down.
      const hostOf = new Map(current.map((cur) => [cur.instanceId, cur.pane]));
      for (let changed = true; changed;) {
        changed = false;
        for (const id of [...kept]) {
          const host = hostOf.get(id);
          if (this.indicatorEngine.getIndicatorConfig(id) && !(host && !kept.has(host))) continue;
          if (this.indicatorEngine.getIndicatorConfig(id)) this.removeIndicator(id);
          kept.delete(id);
          changed = true;
        }
      }
    } else {
      for (const active of this.indicatorEngine.getActiveIndicators()) this.removeIndicator(active.instanceId);
    }

    // Lines read from other indicators and shared panes refer to old ids: follow them.
    const renamed = (params: Record<string, unknown>) => renameSources(params, instanceIds);

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
    // Restored hosts and sources first, they go back in the order they were
    // listed in: the legend, the drawing order and a pane's stack stay as saved.
    this.indicatorEngine.orderIndicators(list.flatMap((ind) => instanceIds.get(ind.instanceId) ?? []));
    restorePanes(this.layoutManager, restored);
    this.updateViewportAndRender();
    return instanceIds;
  }

  /** An indicator's style, visibility and levels as `ind` has them, changing only what differs. */
  private restoreLooks(instanceId: string, ind: SnapshotIndicator): void {
    const { plots: havePlots, ...have } = this.indicatorEngine.getIndicatorStyle(instanceId) ?? { colors: [], lineWidths: [], opacity: 1 };
    const { plots: wantPlots, ...want } = ind.style ?? {};
    if (ind.style && JSON.stringify({ ...have, ...want }) !== JSON.stringify(have)) this.updateIndicatorStyle(instanceId, want);
    // Plot styles are merged by updateIndicatorStyle: here they are put back whole.
    // A part the setup leaves out is the theme's (its descriptor's look): back to it.
    if (ind.style && this.indicatorEngine.followThemeLook(instanceId, THEME_LOOK_KEYS.filter((key) => ind.style![key] === undefined))) {
      this.engine.requestRender();
    }
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

  /**
   * The chart's indicators as a layout or a template keeps them: inputs,
   * style, levels, scale and panes (shared, size, order, fold, maximise).
   */
  getIndicatorSetup(): import('@tradecanvas/core').SnapshotIndicator[] {
    return [
      ...captureIndicatorSetup(this.indicatorEngine, this.layoutManager, (id) => this.panes.style(id) ?? null),
      ...this.unrestoredIndicators,
    ];
  }

  /**
   * Put a set of indicators (from `getIndicatorSetup`, a template) in place
   * of the chart's, as one undo step.
   */
  applyIndicatorSetup(list: readonly SnapshotIndicator[]): void {
    if (!this.features.indicators) return;
    this.indicatorHistory.record(undefined, () => {
      const before = new Map(this.indicatorEngine.getActiveIndicators().map((a) => [a.instanceId, a.id]));
      const instanceIds = this.indicatorHistory.quietly(() => this.restoreIndicators(list, false));
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
    moveAlertsToHeirs(this.alertManager, before, added, (id) => this.indicatorEngine.getIndicatorConfig(id)?.id);
  }

  /**
   * Start an edit of one indicator, as its settings dialog does: its changes
   * until `endIndicatorEdit` are one undo step, and none when they end where
   * they began (a cancel that put everything back).
   */
  beginIndicatorEdit(instanceId: string): void {
    this.indicatorHistory.begin(instanceId);
  }

  /** End the edit `beginIndicatorEdit` started, as one undo step when anything changed. */
  endIndicatorEdit(): void {
    this.indicatorHistory.end();
  }

  /** Undo or redo an indicator step: the indicators as they were, under their own ids. */
  private applyIndicatorStep(action: import('@tradecanvas/core').UndoableAction, direction: 'undo' | 'redo'): void {
    const step = action.indicators;
    if (!step) return;
    // Indicators taken down on the way hand their panes on, but the drawings
    // stay put: the step's own renames below are where they belong.
    this.replayingIndicatorStep = true;
    try {
      this.indicatorHistory.quietly(() => this.restoreIndicators(direction === 'undo' ? step.before : step.after, true));
    } finally {
      this.replayingIndicatorStep = false;
    }
    // The drawings on a pane another indicator took over go with it, either way.
    const renames = step.renames ?? [];
    const walk = direction === 'undo' ? [...renames].reverse().map(([from, to]) => [to, from] as const) : renames;
    for (const [from, to] of walk) this.drawingManager.renamePanes(new Map([[from, to]]));
    this.markStateChanged();
  }

  /** Drawings of indicators a loaded layout could not restore: not on the chart, saved again as they were. */
  private keptPaneDrawings: DrawingState[] = [];
  /** An undo or a redo is putting the indicators back: their drawings move only by the step's renames. */
  private replayingIndicatorStep = false;

  /** Whether pane `paneId` is on the chart and takes a `type` drawing: no price-only tool goes on a pane. */
  private takesDrawing(paneId: string, type: string): boolean {
    return takesDrawing(this.layoutManager.getPanels(), paneId, !!this.drawingManager.getDescriptor(type)?.priceOnly);
  }

  /** Hand pane `from` to the indicator `to`: its layout and its drawings. */
  private renamePane(from: string, to: string): void {
    this.layoutManager.renamePanel(from, to);
    if (!this.replayingIndicatorStep) this.drawingManager.renamePanes(new Map([[from, to]]));
    this.indicatorHistory.renamed(from, to);
  }

  /**
   * The pane a drawing begun at `pos` goes on: undefined the price pane, an
   * indicator pane's id, null where none takes drawings (an axis, a header,
   * a side or folded pane).
   */
  private drawingPaneAt(pos: { x: number; y: number }): string | null | undefined {
    return drawingPaneAt(pos, this.viewport.getState().chartRect, this.layoutManager.getPanels(), (id) => this.drawingPaneViewport(id));
  }

  /**
   * The viewport a pane's drawings are drawn and read with: its plot under
   * the header, its value scale, the bars' times. Null for a pane that takes
   * none: on a side (its x is not the time), folded, or too short to draw in.
   */
  private drawingPaneViewport(paneId: string): ViewportState | null {
    const panel = this.layoutManager.getPanels().find((p) => p.id === paneId);
    return drawingPaneViewport(
      panel,
      !!panel && this.layoutManager.isPanelShownCollapsed(paneId),
      () => this.buildPanelRenderInfos().find((p) => p.instanceId === paneId)?.viewport,
      () => this.getDisplayData(),
    );
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
    this.display.reset();
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
      ? this.indicatorHistory.quietly(() => this.restoreIndicators(snapshot.indicators, false))
      : new Map<string, string>();
    // A drawing on a pane follows the pane's indicator to its new id. One of
    // an indicator the layout could not restore is kept aside, unseen, and
    // saved again as it was; one of a pane the layout lacks goes.
    this.drawingManager.renamePanes(instanceIds);
    const unrestored = new Set(this.unrestoredIndicators.map((ind) => ind.instanceId));
    const drawings = this.drawingManager.getDrawings();
    const placed = drawings.filter((d) => d.paneId === undefined || this.takesDrawing(d.paneId, d.type));
    this.keptPaneDrawings = drawings.filter((d) => d.paneId !== undefined && unrestored.has(d.paneId));
    if (placed.length !== drawings.length) this.drawingManager.setDrawings(placed);
    // Another layout: the old steps no longer apply to it.
    this.undoRedoManager.clear();

    if (snapshot.alerts && this.features.alerts) {
      restoreLayoutAlerts(this.alertManager, snapshot.alerts, instanceIds, (id) => this.drawingManager.hasPriceLevels(id), (err) => {
        console.warn('Layout alert left out:', err);
      });
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
      this.themeManager.setTheme(createMarketTheme(this.themeManager.getBaseTheme(), config.colorScheme));
    }

    // Apply price precision to trading, alerts, and price line
    if (config.pricePrecision !== undefined) this.applyPricePrecision(config.pricePrecision);
    // What a price is worth on this market, for the amounts on the trading tags, the quantity a
    // position drawing's risk buys and the account connected: none given is none kept.
    this.tradingManager.setConfig({ amountMultiplier: config.contractMultiplier });
    this.drawingManager.setAmountMultiplier(config.contractMultiplier);
    this.executionAdapter?.setMultiplier?.(config.contractMultiplier, this.tradedSymbol ?? undefined);

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
    const { referencePrice, ceiling, floor } = market.priceLimits;
    // Given as they are for the day: they stand over what the percentages make.
    if (ceiling !== undefined && floor !== undefined) return { ceiling, floor, reference: referencePrice };
    return computePriceLimits(referencePrice, market);
  }

  /**
   * The day's limits; a later `setMarket` starts without them. A number is the
   * reference price: the ceiling and the floor are the market's percentages of
   * it. An object is the three as the broker or the exchange gives them for
   * the symbol, which is what to pass where it does: a special band, or a
   * stock's first session on another exchange, is no percentage of the
   * reference. They are taken as given, not put on the market's price step,
   * and they are the day's limits on a market whose preset has none. Ones
   * that are no prices (not numbers, a ceiling under its floor, a reference
   * outside the two) are not taken.
   */
  setPriceLimits(limits: number | PriceLimitInfo): void {
    if (!this.marketConfig) return;
    const given = typeof limits === 'number' ? null : limits;
    // A reference alone needs the market's percentages; the three given need nothing of the market.
    if (!given && !this.marketConfig.priceLimits) return;
    if (given && !soundLimits(given)) return;
    const { ceiling: _ceiling, floor: _floor, ...kept } = this.marketConfig.priceLimits ?? { enabled: true };
    // A copy: the market given may be a preset other charts share.
    this.marketConfig = {
      ...this.marketConfig,
      priceLimits: given
        // Given for the day, they are the day's limits on a market whose preset has none too.
        ? { ...kept, enabled: true, referencePrice: given.reference, ceiling: given.ceiling, floor: given.floor }
        : { ...kept, referencePrice: limits as number },
    };
    // The lines are drawn from the render context, not read each frame: give it the new ones.
    this.syncRenderContext();
    this.engine.requestRender();
  }

  // --- Features ---

  /** Get the resolved feature configuration */
  getFeatures(): Readonly<Required<FeaturesConfig>> {
    return this.features;
  }

  /** Update feature flags at runtime. Only provided keys are changed. */
  setFeatures(patch: Partial<FeaturesConfig>): void {
    const legendBottom = this.getLegendBottom();
    Object.assign(this.features, patch);
    // The book turns on and off with the switch, as it does at the start.
    if (patch.depth !== undefined) this.setDepthOverlay({ enabled: patch.depth });
    // The legend switched off or on: what is stacked under it moves, as when it is drawn another height.
    if (patch.legend !== undefined && this.getLegendBottom() !== legendBottom) {
      this.eventBus.emit('legendResize', { bottom: this.getLegendBottom() });
    }

    // Apply immediate side-effects
    if (patch.crosshair !== undefined || patch.crosshairTooltip !== undefined) {
      this.applyTooltipHold();
      // No longer under a hovering pointer: it shows again when it is asked for.
      if (!this.features.crosshair || this.features.crosshairTooltip !== true) this.crosshairTooltip.hide();
    }
    if (patch.priceAxisAddButton !== undefined || patch.crosshair !== undefined) {
      this.applyPriceAxisAdd();
      this.engine.requestRender(LayerType.Overlay);
    }
    if (patch.grid !== undefined) {
      this.engine.requestRender(LayerType.Background);
    }
    if (patch.marks !== undefined) {
      // Switched off under the pointer: its words go with it.
      if (!patch.marks) this.dropMarkHover();
      this.engine.requestRender(LayerType.Overlay);
    }
    if (patch.volume !== undefined) {
      this.volumeRenderer.setVisible(patch.volume);
      this.updateViewportAndRender();
    }
    if (patch.drawings === false) {
      this.drawingManager.setActiveTool(null);
    }
    if (patch.trading === false) {
      // Of every symbol: none is kept to come back on another.
      this.book.setOrders([]);
      this.book.setPositions([]);
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
    this.engine.layerManager.resize(size, dpr, this.engine.dprManager.getDeviceSize());
    // Check if viewport was at the end before resize
    const wasAtEnd = this.viewport.isAtEnd();
    this.takeSize(size);
    this.updateViewportAndRender(wasAtEnd);
    this.eventBus.emit('resize', size);
  }

  /**
   * The container's new size, taken into the layout and the viewport. The
   * viewport is given the plot the layout leaves, not the container less
   * the price scale: a left scale, or a pane beside the plot, is room the
   * bars do not have, and bars fitted below the usual slot would be widened
   * to that room and stay so.
   */
  private takeSize(size: { width: number; height: number }): void {
    this.layoutManager.resize(size.width, size.height);
    this.panes.invalidate();
    this.viewport.setChartRect(this.getResolvedLayout().mainChartRect);
  }

  destroy(): void {
    this.disposed = true;
    // Its recomputes in the worker go with it: none lands on a chart that is gone.
    this.indicatorEngine.stopWorker();
    this.indicatorWorker?.release();
    this.indicatorWorker = null;
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
    this.stopTradeFeed();
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
    if (renderer instanceof FootprintRenderer) {
      const options = this.chartTypeOptions.footprint ?? {};
      renderer.setStore(this.footprint);
      renderer.setCells(options.cells ?? 'bidAsk');
      renderer.setImbalance(options.imbalance ?? FOOTPRINT_IMBALANCE);
      renderer.setTotals(options.totals !== false);
      renderer.setShownUntil(this.footprintShownUntil);
    }
    return renderer;
  }

  /**
   * The bars the crosshair reports: the data bars where each drawn bar is one
   * (candles, Heikin-Ashi: the real prices), the series drawn where it isn't
   * (Renko bricks, Kagi lines), whose slots are not data indices.
   */
  private crosshairSeries(): DataSeries {
    return this.isTimeAligned() ? this.series.bars() : this.getDisplayData();
  }

  private getDisplayData(): DataSeries {
    return this.display.get();
  }

  /** Recompute indicators from bar `from` on, and say so (live ticks, closes, replay steps). */
  private recalcIndicatorsFrom(data: DataSeries, from: number): void {
    // A new bar can add, move or take away bricks anywhere near the end: all of them again.
    if (!this.isTimeAligned()) return this.recalcIndicators(data);
    this.indicatorEngine.recalculateFrom(data, from);
    this.indicatorsOnDrawn = null;
    this.announceIndicatorUpdate(from);
  }

  private recalcIndicators(data: DataSeries): void {
    const bars = this.indicatorBars(data);
    this.indicatorEngine.recalculateAll(bars);
    this.indicatorsOnDrawn = bars === data ? null : bars;
    this.announceIndicatorUpdate(0);
  }

  /**
   * The bars an export writes, beside the indicator values worked out on
   * them: on Renko and the like the bricks drawn, each dated as the axis
   * dates it (by the bar it was finished on), not the bars under them.
   */
  private exportBars(): DataSeries {
    if (this.isTimeAligned()) return this.series.bars();
    const drawn = this.getDisplayData();
    const times = axisTimes(drawn);
    return drawn.map((bar, i) => ({ ...bar, time: times[i]?.time ?? bar.time }));
  }

  /**
   * The bars indicators are worked out on: the data bars where each drawn
   * bar is one, the series drawn on Renko, Kagi and the like, so a line sits
   * on the bricks and reads their closes, as the legend and the data window
   * read it at a brick.
   */
  private indicatorBars(data: DataSeries = this.series.bars()): DataSeries {
    return this.isTimeAligned() ? data : this.getDisplayData();
  }

  /** A new chart type, box or series drawn: the indicators follow the bars drawn. */
  private syncIndicatorBars(displayData: DataSeries): void {
    const aligned = this.isTimeAligned();
    if (aligned ? this.indicatorsOnDrawn === null : this.indicatorsOnDrawn === displayData) return;
    this.recalcIndicators(this.series.bars());
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
    this.panes.invalidateScales();
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
    this.syncIndicatorBars(displayData);

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
    if (this.priceFit.shouldFit()) this.fitPriceScale(displayData, this.viewport.getState());
    return displayData;
  }

  /** Fit the price scale to the bars on view and what else is on it: see `PriceFit.fit`. */
  private fitPriceScale(displayData: DataSeries, vs: ViewportState): void {
    this.priceFit.fit(this.viewport, displayData, vs, {
      overlayRange: (from, to) => this.indicatorEngine.getOverlayPriceRange(from, to),
      compareRange: (data, state) => (this.features.compareSymbols && this.comparesDrawn() ? this.compareRenderer.getPriceRange(data, state) : null),
      volumeRatio: (data, from, to) =>
        (this.features.volume && this.volumeRenderer.isVisible() && hasVolume(data, from, to) ? this.volumeRenderer.getHeightRatio() : null),
      // A footprint's totals stand under its bars.
      footRoom: (data, state) => (this.chartRenderer instanceof FootprintRenderer ? this.chartRenderer.totalsRoom(state, this.themeManager.getTheme(), data) : 0),
    });
  }

  /** Full update: resolve layout, update viewport, sync context, request render. */
  private updateViewportAndRender(scrollToEnd = false): void {
    // Before the layout and the scales: an indicator that reads another symbol by time is not drawn on bricks.
    this.indicatorEngine.setBarsTimed(this.comparesDrawn());
    this.layoutManager.setPanelsAside(this.panes.offChartType());
    this.panes.invalidate();

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
   * before anything reads the layout for this frame. True when a scale
   * changed width.
   */
  private fitDataAndAxes(scrollToEnd = false): boolean {
    const shown = this.applyDataToViewport(scrollToEnd);
    const priceResized = this.fitPriceAxisWidth();
    this.leftViewport = this.computeLeftViewport();
    const resized = this.fitLeftAxisWidth() || priceResized;
    if (resized) this.applyDataToViewport(scrollToEnd);
    // The new series' prices are on the axis: auto-scale off holds them from here.
    this.priceFit.settle(this.viewport.getState(), shown.length);
    return resized;
  }

  /**
   * What the indicator panes write on the price axis: their scales' labels,
   * and their latest values' tags where those are shown. The panes share the
   * price pane's axis strip, so it must be as wide as the widest of them.
   */
  private paneAxisTexts(): { paneLabels: string[]; paneTags: string[] } {
    if (!this.features.indicators) return { paneLabels: [], paneTags: [] };
    const locale = this.numberLocale;
    // A pane folded to its header, or flat, writes no scale and no tags: nothing to make room for.
    const panes = this.buildPanelRenderInfos().filter((p) => p.rect.height > 0 && panelScale(p.viewport) !== null);
    const paneLabels = panes.flatMap((p) => panelScaleTexts(p.viewport, locale));
    const paneTags = this.features.indicatorValueLabels
      ? panes.flatMap((p) => [p.instanceId, ...(p.members ?? [])]
        .flatMap((id) => this.indicatorEngine.getLatestValues(id))
        .map((v) => panelTagText(v.value, p.viewport, locale)))
      : [];
    return { paneLabels, paneTags };
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
    this.panes.invalidate();
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
      ...this.paneAxisTexts(),
      crosshairChange: theme.style?.crosshair.labelChange ?? false,
      fontFamily: theme.font.family,
      fontSizeSmall: theme.font.sizeSmall,
      measure: (text, font) => this.measureText(text, font),
    });
    const next = nextPriceAxisWidth(this.priceAxisWidth, required);
    if (next === this.priceAxisWidth) return false;

    this.priceAxisWidth = next;
    this.layoutManager.setPriceAxisWidth(next);
    this.viewport.setPriceAxisWidth(next);
    this.panes.invalidate();
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

  private getResolvedLayout(): ResolvedLayout {
    return this.panes.resolved();
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
    return this.panes.panels(() => this.viewport.getState());
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

    // Indicators draw in the theme drawn, and those on their descriptor's look for it follow it.
    this.indicatorEngine.setTheme(this.themeManager.getTheme());
    const panels = this.features.indicators ? this.buildPanelRenderInfos() : [];
    const timeAxisY = this.panes.timeAxisTop();

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
      // A picture at a size of its own has nothing that follows the pointer: the pointer is at a place on the page.
      crosshairHandler: this.features.crosshair && !this.picturing ? this.crosshairHandler : null,
      indicatorEngine: this.features.indicators ? this.indicatorEngine : null,
      drawingRenderer: this.features.drawings ? this.drawingRenderer : null,
      tradingRenderer: this.features.trading ? this.tradingRenderer : null,
      // The live market's book: beside a replay's price it would be read as the replay's.
      depthOverlay: (this.features.trading || this.features.depth) && !this.replaySession ? this.depthLayer : null,
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
      measureOverlay: this.picturing ? null : this.measureOverlay,
      selectionBoxOverlay: this.picturing ? null : this.selectionBoxOverlay,
      priceAxisAddButton: this.picturing ? null : this.priceAxisAddButton,
      signalMarkerManager: this.signalMarkerManager,
      chartMarkManager: this.features.marks ? this.chartMarkManager : null,
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
      alignAxisLabels: this.features.alignAxisLabels,
      drawingAxisSpans: this.features.drawingAxisSpans,
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

/** The width of `text` in `font` on `ctx`, whose own font is put back after. */
function measureWith(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  const drawing = ctx.font;
  ctx.font = font;
  const width = ctx.measureText(text).width;
  ctx.font = drawing;
  return width;
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

/** The part of a density's spacing the legend is laid out with. */
function legendSpacing(spacing: ChartSpacing): { inset: number; top: number; lineGap: number } {
  return { inset: spacing.legendInset, top: spacing.legendTop, lineGap: spacing.legendLineGap };
}

/** `bar` with one more step in it. */
function mergeBar(bar: OHLCBar, step: OHLCBar): OHLCBar {
  const merged: OHLCBar = {
    time: bar.time,
    open: bar.open,
    high: Math.max(bar.high, step.high),
    low: Math.min(bar.low, step.low),
    close: step.close,
    volume: (bar.volume ?? 0) + (step.volume ?? 0),
  };
  // What the buyers took adds up too, while both say.
  if (bar.buyVolume !== undefined && step.buyVolume !== undefined) merged.buyVolume = bar.buyVolume + step.buyVolume;
  return merged;
}
