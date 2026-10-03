import type { ChartType, DrawingToolType, FeaturesConfig, HistoryLoadPayload, Quote, QuoteSource, SymbolInfo, Theme, TimeFrame, TimeZoneSetting } from '@tradecanvas/commons';
import { marketStatus, readNews, readQuote, isValidTimeZone, zoneOffsetMinutes, type NewsItem } from '@tradecanvas/commons';
import { settingToTimezone, timezoneToSetting } from './widgetTimezones.js';
import { Chart } from '../Chart.js';
import { DARK_THEME, LIGHT_THEME, indicatorSource, parseIndicatorSource } from '@tradecanvas/commons';
import type { ActiveIndicatorInfo, ChartWidgetOptions, WidgetState, ChartSettingsState } from './types.js';
import { CHART_TYPES, INDICATORS, POPULAR_INDICATORS, DRAWING_TOOL_GROUPS, DEFAULT_SYMBOLS, DEFAULT_SETTINGS } from './widgetConfig.js';
import { injectWidgetStyles, removeWidgetStyles } from './WidgetStyles.js';
import { WidgetToolbar, setHostButtonName } from './WidgetToolbar.js';
import { WidgetDrawingSidebar } from './WidgetDrawingSidebar.js';
import { WidgetSettings } from './WidgetSettings.js';
import { WidgetStatusBar } from './WidgetStatusBar.js';
import { WidgetCommandPalette } from './WidgetCommandPalette.js';
import { WidgetSymbolSearch, type SymbolSearchFn } from './WidgetSymbolSearch.js';
import { WidgetHotkeySheet } from './WidgetHotkeySheet.js';
import { WidgetReplayBar, DEFAULT_REPLAY_SPEED } from './WidgetReplayBar.js';
import { WidgetWatchlist, type WatchlistEntry } from './WidgetWatchlist.js';
import { WatchlistStore, type WatchlistList } from './WatchlistStore.js';
import { WidgetSymbolInfo, type SymbolInfoView } from './WidgetSymbolInfo.js';
import { WidgetChartNav } from './WidgetChartNav.js';
import { WidgetAlertsPanel, describeAlert, type AlertListItem, type AlertSource } from './WidgetAlertsPanel.js';
import { indicatorChipLabel } from '../indicatorLabel.js';
import { readChartTypeOptions } from '@tradecanvas/commons';
import { applyWidgetUI, resolveWidgetUI, type ResolvedWidgetUI, type WidgetUIPreset, type WidgetUITheme } from './widgetUI.js';
import { WidgetObjectTree, drawingTypeLabel } from './WidgetObjectTree.js';
import { WidgetIndicatorSettings } from './WidgetIndicatorSettings.js';
import { WidgetDrawingStyle } from './WidgetDrawingStyle.js';
import { DrawingDefaultsStore, DrawingTemplateStore } from './DrawingTemplateStore.js';
import { WidgetDrawingSettings } from './WidgetDrawingSettings.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import { drawingMenuEntries, type DrawingMenuAction } from './drawingMenu.js';
import { chartMenuEntries, priceEntries, type ChartMenuAction, type ChartMenuContext } from './chartMenu.js';
import { WidgetAccountPanel } from './WidgetAccountPanel.js';
import { WidgetOrderTicket } from './WidgetOrderTicket.js';
import { WidgetLayoutsUI } from './WidgetLayoutsUI.js';
import { WidgetNamePrompt } from './WidgetNamePrompt.js';
import { WidgetIntervalInput } from './WidgetIntervalInput.js';
import { IndicatorTemplateStore } from './indicatorTemplates.js';
import { isKeyTarget, isTyping, registerKeyRoot } from './keyTarget.js';
import { layoutChartState, readWidgetLayout, parseLayoutJson, type WidgetLayoutContent } from './widgetLayout.js';
import { LayoutSession } from '../state/LayoutSession.js';
import { localStorageLayouts, type SavedLayout } from '../state/layoutStorage.js';
import { DrawingFavoritesStore } from './DrawingFavoritesStore.js';
import {
  availableTimeframes,
  initialTimeframeFavorites,
  parseTimeframeInput,
  timeframeLabel,
  withExtraTimeframes,
} from './widgetTimeframes.js';
import { WidgetGoToDate, utcToWallTime, wallTimeToUtc } from './WidgetGoToDate.js';
import { WidgetTooltip } from './WidgetTooltip.js';
import { WidgetIndicatorLegend, type IndicatorLegendPane, type IndicatorLegendRow, type PaneAction } from './WidgetIndicatorLegend.js';
import { formatIndicatorValue, legendValues } from './legendValues.js';
import { RANGE_PRESETS, servesTimeframe, sourceParam, withResampling } from '@tradecanvas/core';
import { WidgetBracketBar } from './WidgetBracketBar.js';
import { AlertNotifier } from './AlertNotifier.js';
import { WidgetDepthLadder } from './WidgetDepthLadder.js';
import { WidgetDataWindow, type DataWindowModel } from './WidgetDataWindow.js';
import type { DepthData } from '@tradecanvas/commons';
import { encodeWidgetState, decodeWidgetState, readShareHash, buildShareUrl } from './widgetShareState.js';
import { DragDropImporter, resampleOHLCV, inferTimeframeMs } from '../io/index.js';
import type { DataSeries } from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';
import type { CommandItem } from './WidgetCommandPalette.js';
import { resolveMessages, createTranslator, fill, type MessageKey, type Translator } from './i18n.js';
import { chartTypeLabel, localizeToolGroups } from './widgetLocales.js';
import { WidgetLoadingOverlay } from './WidgetLoadingOverlay.js';
import { WidgetHistoryPill } from './WidgetHistoryPill.js';

/**
 * A local timeframe switch (resampling static data) that took at least this
 * long last time is announced with the loading veil before it runs, since the
 * main thread is about to be busy for several frames.
 */
const SLOW_LOCAL_SWITCH_MS = 48;
/** Base series this long are assumed slow to resample before any timing exists. */
const LARGE_SERIES_BARS = 50_000;

/** Upper bound on waiting for a paint — rAF never fires in a frame that isn't rendering. */
const PAINT_WAIT_MAX_MS = 100;

/** Resolve once the browser has painted the current DOM state (or gave up waiting). */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function' || document.hidden) {
      setTimeout(resolve, 0);
      return;
    }
    const fallback = setTimeout(resolve, PAINT_WAIT_MAX_MS);
    requestAnimationFrame(() => setTimeout(() => {
      clearTimeout(fallback);
      resolve();
    }, 0));
  });
}

/** Distinct line colors for comparison overlays, cycled by add order. */
const COMPARE_COLORS = ['#4c8dff', '#a57cff', '#1398a8', '#e25592', '#8a93a3', '#62c895'];

/** Gap between the on-chart indicator rows and the plot or pane edge, px. */
const LEGEND_INSET = 4;
/** A pane's row starts below the divider's grab zone (±6 px), so it never blocks a resize. */
const PANE_ROW_TOP = 7;
/** Rows of the indicators sharing a pane, one under the other (px). */
const PANE_ROW_STEP = 17;
/** Where a pane's buttons (move, fold, maximise) sit below its top edge. */
const PANE_CONTROLS_TOP = 3;
/** Finer intervals a replay may step through (those dividing the chart's interval are offered). */
const REPLAY_STEP_CANDIDATES: readonly TimeFrame[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];
/** The most finer bars fetched for one replay. */
const MAX_REPLAY_STEPS = 5000;
/** Focus is in a dialog or a menu (the widget's or the page's): its keys are its own. */
const inOverlay = (): boolean => {
  const active = document.activeElement;
  return active instanceof Element && active.closest('[role="dialog"], [aria-modal="true"], [role="menu"]') !== null;
};
/** Alt + a letter picks a drawing tool (by key position, so it works on any layout). */
const TOOL_HOTKEYS: Readonly<Record<string, DrawingToolType>> = {
  KeyT: 'trendLine',
  KeyH: 'horizontalLine',
  KeyJ: 'horizontalRay',
  KeyV: 'verticalLine',
  KeyC: 'crossLine',
  KeyF: 'fibRetracement',
};

/** The widget pressed last: with several on a page, Alt+ shortcuts act on that one. */

/** 1 when bar times are milliseconds, 1000 when they are seconds. */
const barTimeUnit = (data: ReadonlyArray<{ time: number }>): number =>
  (data[data.length - 1]?.time ?? 0) > 1e12 ? 1 : 1000;


export class ChartWidget {
  private chart: Chart;
  private state: WidgetState;
  private toolbar: WidgetToolbar | null = null;
  private sidebar: WidgetDrawingSidebar | null = null;
  private settings: WidgetSettings | null = null;
  private statusBar: WidgetStatusBar | null = null;
  private goToDate: WidgetGoToDate | null = null;
  private readonly tooltip: WidgetTooltip;
  private indicatorLegend: WidgetIndicatorLegend | null = null;
  private legendFrame = 0;
  /**
   * Modals (settings, search, command palette, hotkeys) mount here: it carries
   * the theme tokens to `document.body`, and moves inside the widget while
   * the widget is fullscreen, where nothing outside it is shown.
   */
  private readonly portal = document.createElement('div');
  private readonly overlayHost = (): HTMLElement => {
    const host = document.fullscreenElement === this.root ? this.root : document.body;
    if (this.portal.parentElement !== host) host.appendChild(this.portal);
    return this.portal;
  };
  /** Stops following presses for the page's shortcuts (see keyTarget). */
  private unregisterKeys: () => void = () => {};
  private readonly onFullscreenChange = () => {
    this.toolbar?.setFullscreen(document.fullscreenElement === this.root);
    if (this.portal.isConnected) this.overlayHost(); // an open modal follows
  };
  private commandPalette: WidgetCommandPalette | null = null;
  private symbolSearch: WidgetSymbolSearch | null = null;
  private hotkeySheet: WidgetHotkeySheet | null = null;
  private replayBar: WidgetReplayBar | null = null;
  private dragDrop: DragDropImporter | null = null;
  private alertsPanel: WidgetAlertsPanel | null = null;
  private objectTree: WidgetObjectTree | null = null;
  private indicatorSettings: WidgetIndicatorSettings | null = null;
  private drawingStyle: WidgetDrawingStyle | null = null;
  private drawingSettings: WidgetDrawingSettings | null = null;
  private drawingMenu: WidgetContextMenu | null = null;
  private chartMenu: WidgetContextMenu | null = null;
  /** The pane a chart menu was opened on (its scale switches act on it). */
  private menuPane: string | null = null;
  /** Whether the chart menu offers a download of the data. */
  private canExport = true;
  /** The latest fetch of each symbol the chart's indicators read. */
  private symbolLoads = new Map<string, number>();
  /** The widget's look. */
  private ui!: ResolvedWidgetUI;
  /** The legend row's "more" menu: move the indicator to another pane. */
  private legendMenu: WidgetContextMenu | null = null;
  private templates = new IndicatorTemplateStore();
  private templatePrompt: WidgetNamePrompt | null = null;
  private intervalInput: WidgetIntervalInput | null = null;
  /** The note shown over a signal marker under the pointer. */
  private markerTip: HTMLDivElement | null = null;
  private accountPanel: WidgetAccountPanel | null = null;
  private orderTicket: WidgetOrderTicket | null = null;
  private accountFrame = 0;
  private layoutSession: LayoutSession | null = null;
  private layoutsUI: WidgetLayoutsUI | null = null;
  private bracketBar: WidgetBracketBar | null = null;
  private alertNotifier: AlertNotifier | null = null;
  private depthLadder: WidgetDepthLadder | null = null;
  private dataWindow: WidgetDataWindow | null = null;
  private lastHoverIndex: number | null = null;
  /** The bar the on-chart indicator values are read at; null = the latest. */
  private legendHoverIndex: number | null = null;
  private favoritesStore = new DrawingFavoritesStore();
  /** Timeframes pinned to the toolbar (same store shape as drawing favourites). */
  private timeframeFavorites = new DrawingFavoritesStore('tcw:tf-favorites');
  /** Intervals the user typed in the timeframe menu. */
  private customTimeframes = new DrawingFavoritesStore('tcw:tf-custom');
  /** Timeframes on offer, shortest first. */
  private timeframes: TimeFrame[] = [];
  private watchlist: WidgetWatchlist | null = null;
  private watchlistSparkBuffer = new Map<string, number[]>();
  private sessionRefPrice: number | null = null;
  /** Per-symbol refPrice explicitly pushed by the host via `setWatchlistEntry` — takes precedence over `sessionRefPrice`. */
  private hostWatchlistRefPrice = new Map<string, number>();
  private watchlistInterval: ReturnType<typeof setInterval> | null = null;
  private watchlistStore: WatchlistStore | null = null;
  /** The list follows `setSymbols` (no lists given, none kept). */
  private watchlistFromSymbols = false;
  private quoteSource: QuoteSource | null = null;
  private stopQuotes: (() => void) | null = null;
  /** The symbols quotes are coming for, joined. */
  private quotedKey = '';
  /** The latest quote of each symbol. */
  private quotes = new Map<string, Quote>();
  private symbolInfoPanel: WidgetSymbolInfo | null = null;
  /** Bumped by each news request: a late answer for an earlier symbol is dropped. */
  private newsRequest = 0;
  /** Headlines per symbol, kept a few minutes. */
  private newsCache = new Map<string, { at: number; items: NewsItem[] }>();
  private marketTimer: ReturnType<typeof setInterval> | null = null;
  private chartNav: WidgetChartNav | null = null;
  /** Bars on screen, for the navigation's scroll step. */
  private visibleBarCount = 50;
  private replayPollInterval: ReturnType<typeof setInterval> | null = null;
  /** Bars revealed per second. */
  private replaySpeed = DEFAULT_REPLAY_SPEED;
  /** `'bar'`, or the finer interval a replay steps through. */
  private replayStep = 'bar';
  private replayStartSeq = 0;
  /** Finer bars fetched or built for the last replay in steps. */
  private replayStepsCache: { key: string; steps: DataSeries } | null = null;
  /** While picking the start bar: shades the bars right of the pointer. */
  private replayShade: HTMLDivElement | null = null;
  private layoutKeyPrefix: string | null = null;
  private layoutDebounceMs = 1500;
  private activeLayoutKey: string | null = null;
  private root: HTMLDivElement;
  private chartContainer: HTMLDivElement;
  private loading: WidgetLoadingOverlay;
  private historyPill: WidgetHistoryPill;
  /** Bumped per stream connect; a connect that is no longer the latest leaves the UI to the newer one. */
  private connectSeq = 0;
  /** Bumped per local resample and widget.setData; a deferred local switch that is no longer the latest is skipped. */
  private localSeq = 0;
  /** Duration of the last local resample + setData, for SLOW_LOCAL_SWITCH_MS. */
  private lastLocalSwitchMs = 0;
  private destroyed = false;
  private options: ChartWidgetOptions;
  private symbols: string[];
  private settingsState: ChartSettingsState;
  /** What Reset in the settings panel goes back to: the defaults, as the host's features set them. */
  private settingsDefaults: ChartSettingsState;
  private t: Translator;
  private adapter: import('@tradecanvas/commons').DataAdapter | null = null;
  private boundGlobalKeydown: ((e: KeyboardEvent) => void) | null = null;
  // Finest-resolution series the widget has seen. When no live adapter is
  // attached, switching to a coarser timeframe resamples from this base
  // instead of refetching. See `setData` / `applyTimeframeData`.
  private baseSeries: DataSeries | null = null;
  private baseTimeframeMs = 0;
  private compares: { id: string; symbol: string; color: string }[] = [];

  constructor(container: HTMLElement, options: ChartWidgetOptions = {}) {
    this.options = options;
    this.symbols = options.symbols ?? DEFAULT_SYMBOLS;
    // `numberLocale`, `timeZone` and `leftPriceScale` live in two places:
    // the headless Chart gets them via `chartOptions` (spread straight into
    // `new Chart()` below) — but the widget's own chrome (watchlist, alerts,
    // go-to-date, settings panel, Reset) reads `settingsState`, which
    // otherwise stays on DEFAULT_SETTINGS until the host touches the Settings
    // UI. Seed it from the same options so both layers start in sync.
    const chartOptions = options.chartOptions;
    this.settingsState = {
      ...DEFAULT_SETTINGS,
      ...(chartOptions?.numberLocale ? { numberLocale: chartOptions.numberLocale } : {}),
      ...(chartOptions?.timeZone != null ? { timezone: timezoneToSetting(chartOptions.timeZone) } : {}),
      ...(chartOptions?.leftPriceScale !== undefined ? { leftPriceScale: chartOptions.leftPriceScale } : {}),
      ...(chartOptions?.highLowLines !== undefined ? { highLowLines: chartOptions.highLowLines } : {}),
      ...(chartOptions?.extendedHours !== undefined ? { extendedHours: chartOptions.extendedHours } : {}),
      ...(chartOptions?.chartTypeOptions ? { chartTypeOptions: readChartTypeOptions(chartOptions.chartTypeOptions) } : {}),
    };
    this.t = createTranslator(resolveMessages(options.locale, options.messages));

    // Resolve layout persistence config. Treated as opt-in — defaults to
    // `false` so existing apps don't suddenly start writing to localStorage.
    if (options.persistLayouts) {
      const cfg = options.persistLayouts === true ? {} : options.persistLayouts;
      this.layoutKeyPrefix = cfg.keyPrefix ?? 'tcw:layout:';
      this.layoutDebounceMs = cfg.debounceMs ?? 1500;
    }

    // Resolve theme
    const isDark = this.resolveIsDark(options.theme);
    const resolvedTheme = this.resolveTheme(options.theme);

    // The chart's feature flags; controls for switched-off features are left out.
    // Host overrides win per key (see the Chart below).
    const features: FeaturesConfig = {
      drawings: true,
      drawingMagnet: true,
      drawingUndoRedo: true,
      indicators: true,
      trading: options.trading !== false,
      tradingContextMenu: false,
      // The "+" by the price axis offers an alert, an order or a line at a price.
      priceAxisAddButton: options.alerts !== false || options.trading !== false || options.drawingTools !== false,
      volume: true,
      legend: true,
      crosshair: true,
      // Pro trading charts have no cursor-following OHLCV popup — just the
      // legend, which ChartWidget already renders. Off by default here
      // (the headless Chart's own default stays `true`); opt back in via
      // `chartOptions: { features: { crosshairTooltip: true } }`.
      crosshairTooltip: false,
      keyboard: true,
      screenshot: true,
      alerts: true,
      barCountdown: true,
      logScale: true,
      watermark: true,
      ...options.chartOptions?.features,
    };

    this.canExport = features.dataExport !== false;
    // The display toggles start where the host's features put them, and Reset goes back there.
    this.settingsDefaults = {
      ...this.settingsState,
      legendVisible: features.legend !== false,
      barCountdown: features.barCountdown !== false,
      indicatorValueLabels: features.indicatorValueLabels !== false,
    };
    this.settingsState = { ...this.settingsDefaults };

    this.timeframes = withExtraTimeframes(
      availableTimeframes(options.timeframes, features.timeframes),
      this.customTimeframes.list() as TimeFrame[],
      features.timeframes,
    );
    // First run, or none of the saved pins is on offer here: start from the defaults.
    if (!this.timeframes.some((tf) => this.timeframeFavorites.has(tf))) {
      const initial = initialTimeframeFavorites(this.timeframes, features.defaultTimeframeFavorites, !!options.timeframes?.length);
      for (const tf of initial) this.timeframeFavorites.add(tf);
    }
    const requestedTimeframe = options.timeframe ?? '5m';
    const startTimeframe = !features.timeframes?.length || features.timeframes.includes(requestedTimeframe)
      ? requestedTimeframe
      : this.timeframes[0] ?? requestedTimeframe;

    // Initialize state
    this.state = {
      symbol: options.symbol ?? this.symbols[0] ?? 'BTCUSDT',
      timeframe: startTimeframe,
      chartType: options.chartOptions?.chartType ?? 'candlestick',
      isDark,
      activeIndicators: new Map(),
      activeTool: null,
      magnetEnabled: features.drawingMagnet !== false,
      magnetStrong: false,
      eraser: false,
      zoomArea: false,
      stayInDrawing: false,
      // Static data (no adapter) has no connection to report.
      connectionState: options.adapter ? 'connecting' : 'disconnected',
      connectionMessage: options.adapter ? this.t('status.connecting') : '',
    };


    // 1. Inject styles
    injectWidgetStyles();

    // 2. Create DOM skeleton
    this.root = document.createElement('div');
    this.root.className = 'tcw-root';
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
    container.appendChild(this.root);
    this.tooltip = new WidgetTooltip(this.root);
    this.portal.className = 'tcw-root tcw-portal';
    this.portal.dataset.tcwTheme = this.root.dataset.tcwTheme;
    // The look: tokens and layout switches on the root and the modal portal
    // alike. Without `ui` the tokens stay the stylesheet's (Studio's), so a
    // host's CSS can still set them.
    this.ui = resolveWidgetUI(options.ui);
    const variables = options.ui !== undefined;
    applyWidgetUI(this.root, this.ui, { variables });
    applyWidgetUI(this.portal, this.ui, { variables });

    // 3. Create toolbar
    if (options.toolbar !== false) {
      this.toolbar = new WidgetToolbar(
        this.root,
        {
          symbols: this.symbols,
          timeframes: this.timeframeMenu(),
          timeframeFavorites: this.pinnedTimeframes(),
          chartTypes: options.chartTypes
            ? CHART_TYPES.filter(ct => (options.chartTypes as ChartType[]).includes(ct.value))
            : CHART_TYPES,
          indicators: INDICATORS,
          popularIndicatorIds: POPULAR_INDICATORS,
        },
        {
          onSymbolClick: () => this.handleSymbolClick(),
          onSymbolInfo: options.symbolInfo !== false ? () => this.toggleSymbolInfo() : undefined,
          onTimeframe: (tf) => this.handleTimeframe(tf),
          onToggleTimeframeFavorite: (tf) => this.handleToggleTimeframeFavorite(tf),
          onAddTimeframe: options.customTimeframes === false ? undefined : (text) => this.handleAddTimeframe(text),
          onRemoveTimeframe: (tf) => this.handleRemoveTimeframe(tf),
          onChartType: (type) => this.handleChartType(type),
          onAddIndicator: (id) => this.handleAddIndicator(id),
          onScreenshot: () => this.chart.screenshot(),
          onSettings: () => this.openSettings(),
          onToggleTheme: () => this.handleToggleTheme(),
          onToggleReplay: () => this.toggleReplay(),
          onToggleAlerts: options.alerts !== false ? () => this.toggleAlerts() : undefined,
          onToggleObjects: options.objectTree !== false ? () => this.toggleObjects() : undefined,
          onToggleAccount: options.trading !== false && options.accountPanel !== false ? () => this.accountPanel?.toggle() : undefined,
          onLayouts: options.layouts !== false ? (anchor) => void this.layoutsUI?.openMenu(anchor) : undefined,
          ...(options.indicatorTemplates !== false
            ? {
              onApplyIndicatorTemplate: (name: string) => this.applyIndicatorTemplate(name),
              onSaveIndicatorTemplate: () => this.promptSaveIndicatorTemplate(),
              onDeleteIndicatorTemplate: (name: string) => {
                this.templates.remove(name);
                this.toolbar?.setIndicatorTemplates(this.templates.list().map((t) => t.name), true);
              },
            }
            : {}),
          onBracket: options.trading !== false ? (side) => this.startBracket(side) : undefined,
          onToggleLadder: options.trading !== false && options.depthLadder ? () => this.depthLadder?.toggle() : undefined,
          onToggleFullscreen: options.fullscreen !== false && typeof document !== 'undefined' && document.fullscreenEnabled
            ? () => this.toggleFullscreen()
            : undefined,
        },
        this.t,
      );
    }

    // 4. Create body
    const body = document.createElement('div');
    body.className = 'tcw-body';

    if (options.drawingTools !== false) {
      if (options.drawingFavorites) this.favoritesStore.seedDefaults(options.drawingFavorites);
      this.sidebar = new WidgetDrawingSidebar(
        body,
        { drawingToolGroups: localizeToolGroups(DRAWING_TOOL_GROUPS, this.t), favorites: this.favoritesStore.list() as DrawingToolType[] },
        {
          onDrawingTool: (tool) => this.handleDrawingTool(tool),
          onCancelDrawing: () => this.handleCancelDrawing(),
          onToggleMagnet: features.drawingMagnet !== false ? () => this.handleToggleMagnet() : undefined,
          onToggleEraser: () => this.chart.setEraserMode(!this.chart.isEraserMode()),
          onToggleZoomArea: () => this.chart.setZoomAreaMode(!this.chart.isZoomAreaMode()),
          onToggleFavorite: (tool) => this.handleToggleFavorite(tool),
          onUndo: () => this.chart.undo(),
          onRedo: () => this.chart.redo(),
          onClearDrawings: () => {
            this.chart.clearDrawings();
            this.state = { ...this.state, activeTool: null };
            this.updateUI();
          },
          onToggleStyle: () => this.drawingStyle?.toggle(),
          onToggleStayInDrawing: () => this.handleToggleStayInDrawing(),
        },
      this.t,
    );
    }

    this.chartContainer = document.createElement('div');
    this.chartContainer.className = 'tcw-chart-container';
    body.appendChild(this.chartContainer);

    // Loading state: covers the empty chart until the first
    // bars land, then veils the previous chart during slow switches.
    this.loading = new WidgetLoadingOverlay(this.chartContainer, this.t('status.loading'));
    this.historyPill = new WidgetHistoryPill(this.chartContainer, {
      loading: this.t('history.loading'),
      failed: this.t('history.failed'),
    });

    // Watchlist sidebar (right side). Appended AFTER the chart container so
    // it sits to the right of the canvas in the flexbox row.
    if (options.watchlist) this.createWatchlist(body, options.watchlist === true ? {} : options.watchlist);

    this.root.appendChild(body);
    // The account panel docks under the chart, above the status bar.
    const accountHost = document.createElement('div');
    accountHost.className = 'tcw-account-dock';
    this.root.appendChild(accountHost);

    // 5. Create chart
    this.chart = new Chart(this.chartContainer, {
      chartType: this.state.chartType,
      theme: resolvedTheme,
      autoScale: true,
      crosshair: { mode: 'magnet' },
      // Screen readers hear the chart in the widget's language.
      a11y: {
        labels: {
          role: this.t('a11y.role'),
          summary: this.t('a11y.summary'),
          empty: this.t('a11y.empty'),
          view: this.t('a11y.view'),
          bar: this.t('a11y.bar'),
          keys: this.t('a11y.keys'),
          typeName: (type) => {
            const key = `chartType.${type}` as MessageKey;
            const name = this.t(key);
            return name === key ? type : name;
          },
        },
      },
      ...options.chartOptions,
      // `features` is merged explicitly (host overrides win per-key) rather
      // than inherited wholesale from the `...options.chartOptions` spread
      // above — otherwise passing e.g. `chartOptions: { features: { x } }`
      // would silently drop every other default.
      features,
    });
    // A shape the chart's options give stays until a look is set.
    if (!options.chartOptions?.shapes) this.applyChartShapes();

    // Navigation over the chart; a scroll step is a tenth of the bars on screen.
    this.chart.on('visibleRangeChange', (e) => {
      const { from, to } = e.payload as { from: number; to: number };
      if (Number.isFinite(from) && Number.isFinite(to)) this.visibleBarCount = Math.max(1, to - from);
    });
    if (options.navigation !== false) {
      this.chartNav = new WidgetChartNav(this.chartContainer, {
        zoomIn: () => this.chart.zoomIn(),
        zoomOut: () => this.chart.zoomOut(),
        scroll: (direction) => this.chart.scrollBars(direction * Math.max(1, Math.round(this.visibleBarCount / 10))),
        reset: () => {
          this.chart.fitContent();
          this.changeSettings({ autoScale: true });
        },
        plotRect: () => this.chart.getPlotRect(),
      }, this.t);
    }

    // New bars end the loading state, whoever supplied them (stream snapshot,
    // widget.setData, or the host calling getChart().setData directly); stream
    // errors surface in the status bar and, mid-load, on the loading veil.
    this.chart.on('dataUpdate', (e) => this.handleDataUpdate(e.payload));
    this.chart.on('historyLoad', (e) => this.historyPill.update(e.payload as HistoryLoadPayload));
    this.chart.on('symbolInfoChange', (e) => {
      const info = (e.payload as { info: SymbolInfo | null }).info;
      const text = info ? [info.description, info.exchange].filter(Boolean).join(' · ') : '';
      this.toolbar?.setSymbolDescription(text || null);
      this.refreshMarket();
    });

    // Symbol info: the panel, and the market's status in the status bar,
    // kept current as the clock runs toward the next open or close.
    if (options.symbolInfo !== false) {
      this.symbolInfoPanel = new WidgetSymbolInfo(this.root, this.t, {
        onToggle: (open) => {
          this.toolbar?.setActive('symbolInfo', open);
          if (open) {
            this.refreshSymbolInfo();
            this.loadNews();
          }
        },
      });
    }
    this.marketTimer = setInterval(() => this.refreshMarket(), 30_000);

    // Drag-and-drop CSV / JSON onto the chart container — instant data load.
    // Opt-out via `dragDropImport: false`. The adapter (live stream) keeps
    // running but the next bar update will append to whatever we just
    // loaded — that's the expected behavior when overlaying historical data.
    if (options.dragDropImport !== false) {
      this.dragDrop = new DragDropImporter(this.chartContainer, {
        onData: (data, result, file) => {
          this.setData(data);
          const loaded = fill(this.t('toast.fileLoaded'), { count: result.data.length, file: file.name });
          this.toast(result.skipped > 0 ? `${loaded} (${fill(this.t('toast.fileSkipped'), { count: result.skipped })})` : loaded);
        },
        onError: (err, file) => {
          this.toast(`${file.name}: ${err.message}`, 'error');
        },
      });
      this.dragDrop.attach();
    }

    // 6. Create status bar
    if (options.statusBar !== false) {
      const range = options.rangeBar !== false;
      this.statusBar = new WidgetStatusBar(this.root, range ? {
        presets: RANGE_PRESETS,
        presetLabels: { All: this.t('range.all') },
        groupLabel: this.t('range.presets'),
        goToLabel: this.t('range.goTo'),
        onPreset: (preset) => this.chart.setVisibleRangePreset(preset),
        onGoTo: () => this.toggleGoToDate(),
      } : undefined);
      if (range) {
        this.goToDate = new WidgetGoToDate(this.root, {
          title: this.t('range.goTo'),
          date: this.t('range.date'),
          time: this.t('range.time'),
          submit: this.t('range.goToSubmit'),
          cancel: this.t('range.cancel'),
        }, ({ date, time }) => this.goToWallTime(date, time));
      }
    }

    // 7. Create settings (lazy, not appended until opened)
    if (options.settings !== false) {
      this.settings = new WidgetSettings({
        onChange: (patch) => this.changeSettings(patch),
        onReset: () => this.resetSettings(),
        onClose: () => {},
      }, this.t, {
        barCountdown: features.barCountdown,
        logScale: features.logScale,
        exchangeZone: this.adapter?.resolveSymbol ? () => this.chart.getSymbolInfo()?.timezone ?? null : undefined,
      }, this.overlayHost);
    }

    // 8a. Symbol search
    this.symbolSearch = new WidgetSymbolSearch({
      onPick: (sym) => { void this.setSymbol(sym); },
      onClose: () => {},
    }, this.overlayHost, this.t);
    this.hotkeySheet = new WidgetHotkeySheet({ onClose: () => {} }, this.t, this.overlayHost);

    // The sidebar follows the chart's drawing tool: finished, cancelled with
    // Esc, or kept for the next drawing in stay-in-drawing mode.
    this.chart.on('drawingToolChange', (e) => {
      const tool = (e.payload as { tool: DrawingToolType | null }).tool;
      if (tool === this.state.activeTool) return;
      this.state = { ...this.state, activeTool: tool };
      this.updateUI();
    });
    // The eraser and the zoom tool turn themselves off (Escape, a tool picked, a zoom done).
    this.chart.on('toolModeChange', (e) => {
      const { eraser, zoomArea } = e.payload as { eraser?: boolean; zoomArea?: boolean };
      this.state = {
        ...this.state,
        eraser: eraser ?? this.state.eraser,
        zoomArea: zoomArea ?? this.state.zoomArea,
      };
      this.updateUI();
    });

    // The indicator list mirrors the chart's indicators, whoever adds or removes them.
    this.chart.on('indicatorAdd', () => this.syncIndicatorsFromChart());
    this.chart.on('indicatorRemove', () => this.syncIndicatorsFromChart());

    // The indicators on the chart itself, instead of toolbar chips that overflow.
    if (options.indicatorLegend !== false) {
      this.chart.setPaneTitlesVisible(false);
      this.indicatorLegend = new WidgetIndicatorLegend(this.chartContainer, {
        onToggleVisible: (iid, visible) => {
          this.chart.setIndicatorVisible(iid, visible);
          this.scheduleLegend();
          if (this.objectTree?.isOpen()) this.refreshObjects();
        },
        onSettings: (iid) => this.openIndicatorSettings(iid),
        onRemove: (iid) => this.handleRemoveIndicator(iid),
        onMore: (iid, anchor) => this.openLegendMenu(iid, anchor),
        onPaneAction: (iid, action) => this.runPaneAction(iid, action),
      }, {
        show: this.t('legend.show'),
        hide: this.t('legend.hide'),
        settings: this.t('legend.settings'),
        remove: this.t('legend.remove'),
        collapse: this.t('legend.collapse'),
        expand: this.t('legend.expand'),
        more: this.t('legend.more'),
        paneUp: this.t('pane.moveUp'),
        paneDown: this.t('pane.moveDown'),
        paneCollapse: this.t('pane.collapse'),
        paneExpand: this.t('pane.expand'),
        paneMaximize: this.t('pane.maximize'),
        paneRestore: this.t('pane.restore'),
      });
      this.legendMenu = new WidgetContextMenu(this.root, this.t('legend.more'));
      this.chart.on('crosshairMove', (e) => {
        const p = e.payload as { barIndex?: number };
        this.legendHoverIndex = typeof p.barIndex === 'number' ? p.barIndex : null;
        this.scheduleLegend();
      });
      // Off the chart, the values go back to the latest bar.
      this.chart.on('crosshairLeave', () => {
        this.legendHoverIndex = null;
        this.scheduleLegend();
      });
      for (const event of ['indicatorUpdate', 'indicatorChange', 'dataUpdate', 'resize', 'paneResize', 'paneChange', 'themeChange'] as const) {
        this.chart.on(event, () => this.scheduleLegend());
      }
    }

    // Replay: while picking, a click starts the replay at that bar; during a
    // replay it jumps the cursor there.
    this.chart.on('barClick', (e) => {
      if (!this.replayBar?.isMounted()) return;
      const idx = (e.payload as { barIndex?: number }).barIndex;
      if (typeof idx !== 'number') return;
      if (this.replayBar.getMode() === 'select') {
        this.startReplayAt(idx);
        return;
      }
      if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
      // To the end of the bar clicked (in finer steps, its last step).
      this.chart.replaySeekToBar(idx);
      this.replayBar.setState('paused');
    });
    // While picking the start bar, shade the bars that would be hidden.
    this.chart.on('crosshairMove', (e) => {
      if (this.replayBar?.getMode() !== 'select' || !this.replayBar.isMounted()) return;
      const point = (e.payload as { point?: { x: number } | null }).point;
      this.positionReplayShade(point?.x ?? null);
    });

    // Data Window — precise OHLCV + indicator values at the hovered bar.
    this.dataWindow = new WidgetDataWindow(this.root, { formatPrice: (p) => this.formatAlertPrice(p) }, this.t);
    this.chart.on('crosshairMove', (e) => {
      const p = e.payload as { barIndex?: number };
      this.lastHoverIndex = typeof p.barIndex === 'number' ? p.barIndex : null;
      if (this.dataWindow?.isOpen()) this.dataWindow.render(this.buildDataWindowModel());
    });

    // Drawing style + templates popover (paired with the sidebar palette button)
    if (options.drawingTools !== false) {
      const templates = new DrawingTemplateStore();
      // Each tool's saved defaults ("Save as default" in a drawing's settings).
      const defaults = new DrawingDefaultsStore();
      for (const [type, toolOptions] of Object.entries(defaults.all())) {
        this.chart.setDrawingToolDefaults(type as DrawingToolType, toolOptions ?? null);
      }
      this.drawingSettings = new WidgetDrawingSettings(this.root, {
        onBegin: (id) => this.chart.beginDrawingEdit(id),
        onChange: (id, patch) => this.chart.updateDrawing(id, patch),
        onEnd: (id, cancel) => {
          this.chart.endDrawingEdit(id, { cancel });
          this.refreshObjects();
        },
        toWallTime: (time) => utcToWallTime(time * barTimeUnit(this.chart.getData()), this.displayTimezone()),
        fromWallTime: (date, time) => {
          const ms = wallTimeToUtc(date, time, this.displayTimezone());
          return ms === null ? null : ms / barTimeUnit(this.chart.getData());
        },
        onAddAlert: (id) => this.addDrawingAlert(id),
        onSaveDefault: (type, toolOptions) => {
          this.chart.setDrawingToolDefaults(type, toolOptions);
          defaults.set(type, this.chart.getDrawingToolDefaults(type));
          this.toast(fill(this.t('drawingSettings.defaultSaved'), { name: this.drawingToolName(type) }));
        },
        templates,
      }, this.t);
      this.chart.on('drawingDoubleClick', (e) => this.openDrawingSettings((e.payload as { id: string }).id));
      this.drawingStyle = new WidgetDrawingStyle(
        this.root,
        {
          onStyleChange: (style) => {
            this.chart.setDrawingStyle(style);
            this.chart.setSelectedDrawingStyle(style);
          },
          getStyle: () => this.chart.getDrawingStyle(),
        },
        templates,
      this.t,
    );
    }

    // Right-click on a drawing: settings, alert, order, group, lock, hide, delete.
    this.drawingMenu = new WidgetContextMenu(this.root, this.t('drawingMenu.label'));
    this.chart.on('drawingContextMenu', (e) => {
      const { id, x, y } = e.payload as { id: string; x: number; y: number };
      this.openDrawingMenu(id, x, y);
    });

    // Right-click elsewhere: what the plot, an axis or a pane offers. The "+"
    // by the price axis: what to do at its price.
    this.chartMenu = new WidgetContextMenu(this.root, this.t('chartMenu.label'));
    // Indicators that read another symbol (a compare on its own scale, a spread) ask for its bars.
    this.chart.on('symbolSeriesRequest', (e) => void this.loadSymbolSeries(e.payload.symbol));
    // Prices from the pointer go on the market's grid (its smallest step).
    this.chart.on('chartContextMenu', (e) => {
      const { area, x, y, price: raw, time, pane } = e.payload as import('@tradecanvas/commons').ChartContextMenuPayload;
      const price = raw === undefined ? undefined : this.chart.roundPrice(raw);
      const context = { ...this.chartMenuContext(price), ...(pane ? { pane: this.chart.getPaneScale(pane) } : {}) };
      this.menuPane = pane ?? null;
      this.openChartMenu(chartMenuEntries(area, context, this.t), x, y, { area, price, time });
    });
    this.chart.on('priceAxisAdd', (e) => {
      const { price: raw, x, y } = e.payload as import('@tradecanvas/commons').PriceAxisAddPayload;
      const price = this.chart.roundPrice(raw);
      this.openChartMenu(priceEntries(this.chartMenuContext(price), this.t), x, y, { area: 'priceAxisAdd', price });
    });

    // A signal marker under the pointer says what it is.
    this.chart.on('signalMarkerHover', (e) => this.showMarkerTip(e.payload));

    // Typing a number on the chart changes the interval.
    if (options.intervalTyping !== false) {
      this.intervalInput = new WidgetIntervalInput(this.chartContainer, {
        title: this.t('interval.title'),
        hint: this.t('interval.hint'),
        invalid: this.t('interval.invalid'),
      }, (tf) => this.selectTypedTimeframe(tf));
    }
    if (options.indicatorTemplates !== false) this.toolbar?.setIndicatorTemplates(this.templates.list().map((t) => t.name));

    // Named layouts: save, open, rename, delete, auto-save.
    if (options.layouts !== false) this.setupLayouts(options.layouts === true || options.layouts === undefined ? {} : options.layouts);

    // Account panel and order ticket.
    if (options.trading !== false && options.accountPanel !== false) {
      this.orderTicket = new WidgetOrderTicket(this.root, {
        onSubmit: (intent) => {
          this.chart.placeOrderIntent(intent);
          this.toast(fill(this.t('ticket.sent'), {
            side: this.t(intent.side === 'buy' ? 'ticket.buy' : 'ticket.sell'),
            quantity: intent.quantity ?? 1,
            price: this.formatAlertPrice(intent.price),
          }));
        },
        formatPrice: (p) => this.formatAlertPrice(p),
      }, this.t);
      this.accountPanel = new WidgetAccountPanel(accountHost, {
        onClosePosition: (id) => this.chart.closePositionIntent(id),
        onReversePosition: (id) => this.chart.reversePositionIntent(id),
        onCancelOrder: (id) => this.chart.cancelOrderIntent(id),
        onNewOrder: () => this.openOrderTicket(),
        formatPrice: (p) => this.formatAlertPrice(p),
        formatTime: (ms) => {
          const { date, time } = utcToWallTime(ms, this.displayTimezone());
          return `${date} ${time}`;
        },
        onToggle: (open) => {
          this.toolbar?.setActive('account', open);
          this.refreshAccount();
        },
      }, this.t);
      // indicatorUpdate comes once per tick, so open P&L follows the price.
      for (const event of ['ordersChange', 'positionsChange', 'executionFill', 'dataUpdate', 'indicatorUpdate'] as const) {
        this.chart.on(event, () => this.refreshAccountSoon());
      }
    }

    // Bracket-order placement: floating confirm/cancel bar + event wiring.
    if (options.trading !== false) {
      this.bracketBar = new WidgetBracketBar(this.root, {
        onConfirm: () => this.chart.confirmBracket(),
        onCancel: () => {
          this.chart.cancelBracket();
          this.bracketBar?.hide();
        },
      }, this.t);
      this.chart.on('bracketPlace', (e) => {
        const b = e.payload;
        this.bracketBar?.hide();
        this.toast(fill(this.t(b.side === 'buy' ? 'bracket.longPlaced' : 'bracket.shortPlaced'), { rr: b.riskReward.toFixed(2) }));
      });

      // Depth-of-market ladder (opt-in; fed via widget.setDepth)
      if (options.depthLadder) {
        this.depthLadder = new WidgetDepthLadder(this.root, {
          onTrade: (side, price) => {
            this.chart.placeOrderIntent({ side, type: 'limit', price });
            this.toast(fill(this.t(side === 'buy' ? 'order.buyLimit' : 'order.sellLimit'), { price: this.formatAlertPrice(price) }));
          },
          formatPrice: (p) => this.formatAlertPrice(p),
        }, undefined, this.t);
      }
      // Esc-cancel originates in the chart; reflect it in the bar.
      this.chart.on('dataUpdate', (e) => {
        const p = e.payload as { bracket?: string };
        if (p && p.bracket === 'cancelled') this.bracketBar?.hide();
      });
    }

    // 8a-bis. Price alerts panel (floating popover, toggled from the bell button)
    if (options.alerts !== false) {
      this.alertsPanel = new WidgetAlertsPanel(this.root, {
        onAdd: ({ price, condition, message, channel, label, options }) => {
          try {
            this.chart.addAlert(price, condition, message, channel, label, options);
            return true;
          } catch {
            this.toast(this.t('alerts.invalid'), 'error');
            return false;
          }
        },
        formatTime: (ms) => {
          const { date, time } = utcToWallTime(ms, this.displayTimezone());
          return `${date} ${time}`;
        },
        onRemove: (id) => this.chart.removeAlert(id),
        onClear: () => this.chart.clearAlerts(),
        getChannelValue: (channel) => this.getAlertChannelValue(channel),
        formatPrice: (p) => this.formatAlertPrice(p),
      }, this.t);

      // Keep the panel list and toasts in sync with the chart's AlertManager.
      this.chart.on('alertAdd', () => this.refreshAlerts());
      this.chart.on('alertRemove', () => this.refreshAlerts());
      this.chart.on('alertUpdate', () => this.refreshAlerts());
      this.chart.on('alertExpired', (e) => {
        const p = e.payload;
        this.toast(fill(this.t('alerts.expiredToast'), { text: p.message ?? this.alertText(p) }));
        this.refreshAlerts();
      });
      if (options.alertNotifications) {
        this.alertNotifier = new AlertNotifier(options.alertNotifications);
      }
      this.chart.on('alertTriggered', (e) => {
        const p = e.payload;
        const text = `${this.alertText(p)}${p.message ? ` — ${p.message}` : ''}`;
        this.toast(`🔔 ${fill(this.t('alerts.fired'), { text })}`, 'info');
        this.alertNotifier?.notify(text);
        this.refreshAlerts();
      });
    }

    // 8a-ter. Object tree (indicators + drawings manager)
    if (options.objectTree !== false) {
      this.indicatorSettings = new WidgetIndicatorSettings(this.root, {
        onApply: (instanceId, params) => {
          this.chart.updateIndicator(instanceId, params);
          this.syncIndicatorsFromChart(); // the legend shows the parameters
        },
        onStyle: (instanceId, style) => this.chart.updateIndicatorStyle(instanceId, style),
        onLevels: (instanceId, levels) => this.chart.setIndicatorLevels(instanceId, levels),
        onScale: (instanceId, scale) => this.chart.setIndicatorScale(instanceId, scale),
        onClose: () => {},
      }, this.t);
      this.objectTree = new WidgetObjectTree(this.root, {
        onRemoveIndicator: (iid) => this.handleRemoveIndicator(iid),
        onConfigureIndicator: (iid) => this.openIndicatorSettings(iid),
        onToggleIndicatorVisible: (iid, visible) => {
          this.chart.setIndicatorVisible(iid, visible);
          this.refreshObjects();
          this.scheduleLegend();
        },
        onRemoveDrawing: (id) => {
          if (this.drawingSettings?.editing() === id) this.drawingSettings.close(true);
          this.chart.removeDrawing(id);
          this.refreshObjects();
        },
        onConfigureDrawing: this.drawingSettings ? (id) => this.openDrawingSettings(id) : undefined,
        onToggleDrawingVisible: (id, visible) => {
          this.chart.setDrawingVisible(id, visible);
          this.refreshObjects();
        },
        onToggleDrawingLocked: (id, locked) => {
          this.chart.setDrawingLocked(id, locked);
          this.refreshObjects();
        },
        onToggleGroupVisible: (group, visible) => {
          this.chart.setDrawingGroupVisible(group, visible);
          this.refreshObjects();
        },
        onToggleGroupLocked: (group, locked) => {
          this.chart.setDrawingGroupLocked(group, locked);
          this.refreshObjects();
        },
        onUngroup: (group) => {
          this.chart.ungroupDrawings(group);
          this.refreshObjects();
        },
        onRenameGroup: (group, name) => {
          this.chart.renameDrawingGroup(group, name);
          this.refreshObjects();
        },
        onAddCompare: features.compareSymbols !== false ? () => this.handleAddCompare() : undefined,
        onRemoveCompare: (id) => this.handleRemoveCompare(id),
      }, this.t);
      const refresh = () => { if (this.objectTree?.isOpen()) this.refreshObjects(); };
      // A drawing changes many times a second while its settings are edited
      // (a colour being picked): rebuild the list once a frame at most.
      let refreshFrame = 0;
      const refreshSoon = () => {
        if (refreshFrame || !this.objectTree?.isOpen()) return;
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0;
          if (!this.destroyed) refresh();
        });
      };
      this.chart.on('drawingCreate', refresh);
      this.chart.on('drawingRemove', refresh);
      this.chart.on('drawingUpdate', refreshSoon);
      this.chart.on('indicatorAdd', refresh);
      this.chart.on('indicatorRemove', refresh);
      this.chart.on('indicatorChange', refresh);
    }

    // 8b. Command palette
    this.commandPalette = new WidgetCommandPalette({
      onIndicator: (id) => this.handleAddIndicator(id),
      onChartType: (type) => this.handleChartType(type),
      onDrawingTool: (tool) => this.handleDrawingTool(tool),
      onTimeframe: (tf) => this.handleTimeframe(tf),
      onAction: (id) => this.handleAction(id),
      onClose: () => {},
    }, this.overlayHost, this.t);

    this.boundGlobalKeydown = (e: KeyboardEvent) => {
      if (this.replayBar?.isMounted() && this.handleReplayKey(e)) return;
      // With several widgets on the page, the shortcuts go to the one used last.
      const mine = isKeyTarget(this.root);
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        if (!mine) return;
        e.preventDefault();
        this.toggleCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        // Ctrl/Cmd+P → symbol search (matches Bloomberg / many trading UIs)
        if (!mine) return;
        e.preventDefault();
        this.symbolSearch?.open(this.symbols, this.state.symbol, undefined, this.symbolSearchFn());
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        // Ctrl/Cmd+S → save the layout (rather than the page), once this widget was used.
        if (!this.layoutSession || isTyping() || !isKeyTarget(this.root, true)) return;
        e.preventDefault();
        void this.saveLayout();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && TOOL_HOTKEYS[e.code]) {
        // Alt+T trend line, Alt+H horizontal line… (the drawing tools' keys).
        if (e.defaultPrevented || isTyping() || !mine || inOverlay() || this.options.drawingTools === false) return;
        e.preventDefault();
        this.handleDrawingTool(TOOL_HOTKEYS[e.code]);
      } else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // A number typed on the chart starts an interval (5, 15m, 1h…).
        if (e.defaultPrevented || !this.intervalInput || isTyping() || inOverlay() || !isKeyTarget(this.root, true)) return;
        const active = document.activeElement;
        // Focus in another part of the page: the keys are its.
        if (active && active !== document.body && !this.root.contains(active)) return;
        e.preventDefault();
        this.intervalInput.open(e.key);
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyI' || e.code === 'KeyG')) {
        // By key position: on macOS Alt+G types "©".
        if (isTyping() || !mine) return;
        if (e.code === 'KeyI') {
          // Alt+I → invert the price scale.
          e.preventDefault();
          this.changeSettings({ invertScale: !this.settingsState.invertScale });
        } else if (this.goToDate) {
          // Alt+G → go to date.
          e.preventDefault();
          this.toggleGoToDate();
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only fire when the user isn't typing into an input.
        if (isTyping() || !mine) return;
        e.preventDefault();
        this.hotkeySheet?.open();
      }
    };
    document.addEventListener('keydown', this.boundGlobalKeydown);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.unregisterKeys = registerKeyRoot(this.root);

    // 9. Connect stream
    if (options.adapter) {
      this.adapter = options.adapter;
      this.connectStream();
    }

    // Watchlist live-update loop. 1s cadence keeps DOM churn low while still
    // feeling responsive; for sub-second visual response, apps can call
    // `setWatchlistEntry` directly from their own WebSocket.
    if (this.watchlist) {
      this.watchlistInterval = setInterval(() => this.tickWatchlist(), 1000);
    }

    // Initial UI update
    this.refreshMarket();
    this.updateUI();

    // 9. Fire onReady
    options.onReady?.(this.chart);

    // Deep-link restore: apply a `#tcw=` view from the URL when enabled.
    if (options.shareUrl && typeof location !== 'undefined') {
      const encoded = readShareHash(location.hash);
      if (encoded) void this.importState(encoded);
    }
  }

  // --- Public API ---

  /** Replace the searchable symbol catalog. Does not change the active symbol. */
  setSymbols(symbols: string[]): void {
    this.symbols = symbols;
    // A list made from the symbols follows them; lists given or kept stay.
    const store = this.watchlistStore;
    if (store && this.watchlistFromSymbols) {
      store.replace(store.getLists().map((l) => (l.id === 'default' ? { ...l, symbols } : l)));
    }
  }

  // --- Watchlists ---

  /** Every watchlist, in order. */
  getWatchlists(): WatchlistList[] {
    return this.watchlistStore?.getLists() ?? [];
  }

  /** The shown watchlist's id, or null without a watchlist. */
  getActiveWatchlist(): string | null {
    return this.watchlistStore?.getActive().id ?? null;
  }

  /** Replace every watchlist (and which one shows). */
  setWatchlists(lists: WatchlistList[], activeList?: string): void {
    this.watchlistFromSymbols = false;
    this.watchlistStore?.replace(lists, activeList);
  }

  setActiveWatchlist(id: string): void {
    this.watchlistStore?.setActive(id);
  }

  /** Add a symbol to a watchlist (the shown one by default). */
  addToWatchlist(symbol: string, listId?: string): void {
    this.watchlistStore?.add(symbol, listId);
  }

  removeFromWatchlist(symbol: string, listId?: string): void {
    this.watchlistStore?.removeSymbol(symbol, listId);
  }

  /**
   * Quotes for the watchlist's rows (and `getQuote`), from your own feed.
   * What isn't a quote (no symbol, no finite last price) is left out.
   */
  setQuotes(quotes: readonly Quote[]): void {
    const read = quotes.map(readQuote).filter((q): q is Quote => q !== null);
    if (read.length > 0) this.takeQuotes(read);
  }

  /** The latest quote of a symbol, from the quote source or `setQuotes`. */
  getQuote(symbol: string): Quote | null {
    const quote = this.quotes.get(symbol);
    return quote ? { ...quote } : null;
  }

  /** Open or close the symbol info panel (toggle when `open` is left out). */
  toggleSymbolInfo(open?: boolean): void {
    const panel = this.symbolInfoPanel;
    if (!panel) return;
    if (open === undefined) panel.toggle();
    else if (open) panel.open();
    else panel.close();
  }

  /** The market's status in the status bar, and the panel when it's open. */
  private refreshMarket(): void {
    const status = marketStatus(this.chart.getSymbolInfo(), Date.now());
    this.statusBar?.setMarket(status.state, this.t(status.state === 'open' ? 'symbolInfo.open' : 'symbolInfo.closed'));
    this.refreshSymbolInfo();
  }

  private refreshSymbolInfo(): void {
    const panel = this.symbolInfoPanel;
    if (!panel?.isOpen() || this.destroyed) return;
    panel.render(this.symbolInfoView());
  }

  private symbolInfoView(): SymbolInfoView {
    const info = this.chart.getSymbolInfo();
    const symbol = this.state.symbol;
    const quote = this.quotes.get(symbol);
    const day = sessionDay(this.chart.getData(), info?.timezone);
    const fp = (p: number) => this.formatAlertPrice(p);
    const locale = this.intlLocale();

    const last = quote?.last ?? day?.close;
    const prevClose = quote?.prevClose ?? day?.prevClose;
    const change = quote?.change ?? (last !== undefined && prevClose !== undefined ? last - prevClose : undefined);
    const base = last !== undefined && change !== undefined ? last - change : undefined;
    const percent = quote?.changePercent ?? (change !== undefined && base ? (change / base) * 100 : undefined);

    const status = marketStatus(info, Date.now());
    let statusText = this.t(status.state === 'open' ? 'symbolInfo.open' : status.state === 'closed' ? 'symbolInfo.closed' : 'symbolInfo.always');
    if (status.state !== 'always' && status.next !== null) {
      const when = relativeTime(status.next - Date.now(), locale);
      statusText += ` · ${fill(this.t(status.state === 'open' ? 'symbolInfo.closesIn' : 'symbolInfo.opensIn'), { when })}`;
    }

    const stats: { label: string; value: string }[] = [];
    const add = (label: string, value: string | undefined) => {
      if (value) stats.push({ label, value });
    };
    const price = (v: number | undefined) => (v !== undefined ? fp(v) : undefined);
    add(this.t('dataWindow.open'), price(quote?.open ?? day?.open));
    add(this.t('dataWindow.high'), price(quote?.high ?? day?.high));
    add(this.t('dataWindow.low'), price(quote?.low ?? day?.low));
    add(this.t('symbolInfo.prevClose'), price(prevClose));
    const volume = quote?.volume ?? day?.volume;
    add(this.t('dataWindow.volume'), volume !== undefined ? compactNumber(volume, locale) : undefined);
    add(this.t('symbolInfo.bid'), price(quote?.bid));
    add(this.t('symbolInfo.ask'), price(quote?.ask));
    add(this.t('symbolInfo.tick'), info?.minTick !== undefined ? String(info.minTick) : undefined);
    add(this.t('symbolInfo.currency'), info?.currency);
    add(this.t('symbolInfo.timezone'), info?.timezone);
    add(this.t('symbolInfo.hours'), sessionsText(info, locale));

    const sign = (change ?? 0) >= 0 ? '+' : '-';
    return {
      symbol,
      description: info?.description,
      meta: [info?.exchange, info?.type].filter(Boolean).join(' · ') || undefined,
      price: last !== undefined ? fp(last) : undefined,
      change: change !== undefined
        ? { text: `${sign}${fp(Math.abs(change))}${percent !== undefined ? ` (${sign}${Math.abs(percent).toFixed(2)}%)` : ''}`, up: change >= 0 }
        : undefined,
      status: { state: status.state, text: statusText },
      stats,
    };
  }

  /** Headlines for the chart's symbol into the open panel; cached a few minutes. */
  private loadNews(): void {
    const panel = this.symbolInfoPanel;
    if (!panel?.isOpen()) return;
    const adapter = this.options.adapter;
    const source = this.options.news ?? (adapter?.fetchNews ? adapter.fetchNews.bind(adapter) : null);
    if (!source) {
      panel.renderNews({ kind: 'none' });
      return;
    }
    const symbol = this.state.symbol;
    const request = ++this.newsRequest;
    const show = (items: NewsItem[]) => {
      const locale = this.intlLocale();
      panel.renderNews({
        kind: 'items',
        items: items.map((item) => ({
          title: item.title,
          url: item.url,
          meta: [item.source, relativeTime(item.time - Date.now(), locale)].filter(Boolean).join(' · '),
        })),
      });
    };
    const cached = this.newsCache.get(symbol);
    if (cached && Date.now() - cached.at < NEWS_TTL_MS) {
      show(cached.items);
      return;
    }
    panel.renderNews({ kind: 'loading' });
    Promise.resolve()
      .then(() => source(symbol, NEWS_LIMIT))
      .then((raw) => {
        if (request !== this.newsRequest || this.destroyed) return;
        const items = readNews(raw, NEWS_LIMIT);
        this.newsCache.set(symbol, { at: Date.now(), items });
        show(items);
      })
      .catch(() => {
        if (request === this.newsRequest && !this.destroyed) panel.renderNews({ kind: 'failed' });
      });
  }

  /** The BCP 47 tag dates and numbers in the panels are written in. */
  private intlLocale(): string {
    return this.settingsState.numberLocale || this.options.locale || 'en';
  }

  private createWatchlist(body: HTMLElement, opts: import('./types.js').WatchlistOptions): void {
    const storage = opts.persist ? browserStorage() : null;
    const store = new WatchlistStore({
      lists: opts.lists,
      activeList: opts.activeList,
      symbols: this.symbols,
      defaultName: this.t('watchlist.title'),
      storage,
      storageKey: opts.storageKey,
    });
    this.watchlistStore = store;
    this.watchlistFromSymbols = !opts.lists && !opts.persist;
    this.quoteSource = opts.quotes === false ? null : opts.quotes ?? (this.options.adapter?.subscribeQuotes ? this.options.adapter as QuoteSource : null);

    const t = (key: Parameters<typeof this.t>[0]) => this.t(key);
    this.watchlist = new WidgetWatchlist(body, {
      onSelect: (sym) => { void this.setSymbol(sym); },
      onAdd: () => this.symbolSearch?.open(this.symbols, this.state.symbol, (sym) => store.add(sym), this.symbolSearchFn()),
      onRemove: (sym) => store.removeSymbol(sym),
      onMove: (sym, index) => store.move(sym, index),
      onPickList: (id) => store.setActive(id),
      onCreateList: (name) => store.create(name),
      onRenameList: (id, name) => store.rename(id, name),
      onDeleteList: (id) => store.remove(id),
    }, {
      title: t('watchlist.title'),
      lists: t('watchlist.lists'),
      newList: t('watchlist.newList'),
      rename: t('watchlist.rename'),
      deleteList: t('watchlist.deleteList'),
      confirmDelete: t('watchlist.confirmDelete'),
      add: t('watchlist.add'),
      remove: t('watchlist.remove'),
      empty: t('watchlist.empty'),
      listName: t('watchlist.listName'),
    });
    this.watchlist.setActive(this.state.symbol);
    this.watchlist.setLocale(this.settingsState.numberLocale || undefined);
    const show = () => {
      this.watchlist?.setLists(store.getLists(), store.getActive().id);
      this.followQuotes();
    };
    store.subscribe(() => {
      show();
      opts.onChange?.(store.getLists(), store.getActive().id);
    });
    show();
  }

  /** Quotes for the shown list's symbols: a new subscription when they change. */
  private followQuotes(): void {
    if (!this.quoteSource || !this.watchlistStore) return;
    const symbols = this.watchlistStore.getActive().symbols;
    const key = symbols.join('\u0000');
    if (key === this.quotedKey) return;
    this.quotedKey = key;
    this.stopQuotes?.();
    this.stopQuotes = null;
    if (symbols.length === 0) return;
    try {
      this.stopQuotes = this.quoteSource.subscribeQuotes(symbols, (quotes) => {
        if (!this.destroyed) this.takeQuotes(quotes);
      });
    } catch {
      this.stopQuotes = null;
    }
  }

  private takeQuotes(quotes: readonly Quote[]): void {
    for (const quote of quotes) {
      this.quotes.set(quote.symbol, quote);
      const buf = this.watchlistSparkBuffer.get(quote.symbol) ?? [];
      buf.push(quote.last);
      if (buf.length > 40) buf.shift();
      this.watchlistSparkBuffer.set(quote.symbol, buf);
      const hostRef = this.hostWatchlistRefPrice.get(quote.symbol);
      this.watchlist?.setEntry(quote.symbol, {
        lastPrice: quote.last,
        refPrice: hostRef ?? (quote.change !== undefined ? quote.last - quote.change : undefined),
        sparkline: buf.slice(),
      });
    }
    if (quotes.some((q) => q.symbol === this.state.symbol)) this.refreshSymbolInfo();
  }

  async setSymbol(symbol: string): Promise<void> {
    // Flush the outgoing symbol's layout BEFORE switching state, so the
    // saved snapshot reflects what the user actually saw under that ticker.
    this.flushActiveLayout();
    // Fill marks sit on this symbol's bars; the next symbol starts with none.
    if (symbol !== this.state.symbol) this.chart.clearFills();
    this.state = { ...this.state, symbol };
    this.sessionRefPrice = null;
    this.options.onSymbolChange?.(symbol);
    this.updateUI();
    this.watchlist?.setActive(symbol);
    this.refreshMarket();
    this.loadNews();
    this.layoutSession?.changed();
    if (this.adapter) {
      await this.connectStream();
    }
  }

  /**
   * Push an entry into the watchlist (e.g., from your own WebSocket).
   * Call with the symbols you care about; the active symbol is updated
   * automatically from the chart's live data.
   *
   * A host-supplied `refPrice` takes precedence over the widget's own
   * session-open guess for that symbol — including the active one, so the
   * auto-tick loop stops clobbering it (see `tickWatchlist`).
   */
  setWatchlistEntry(symbol: string, entry: Partial<WatchlistEntry>): void {
    if (entry.refPrice !== undefined) {
      this.hostWatchlistRefPrice.set(symbol, entry.refPrice);
    }
    this.watchlist?.setEntry(symbol, entry);
  }

  private tickWatchlist(): void {
    // A symbol with quotes shows them (the day's move), not the loaded bars'.
    if (!this.watchlist || this.quotes.has(this.state.symbol)) return;
    const data = this.chart.getData();
    if (data.length === 0) return;
    const last = data[data.length - 1];
    const hostRef = this.hostWatchlistRefPrice.get(this.state.symbol);
    // Reference price: first bar of the loaded slice — that's the closest
    // approximation of "session open" without timezone bookkeeping. Only
    // used as a fallback; a refPrice the host already pushed via
    // `setWatchlistEntry` (even for the active symbol) always wins.
    if (hostRef === undefined && this.sessionRefPrice === null) {
      this.sessionRefPrice = data[0].open;
    }

    const buf = this.watchlistSparkBuffer.get(this.state.symbol) ?? [];
    buf.push(last.close);
    if (buf.length > 40) buf.shift();
    this.watchlistSparkBuffer.set(this.state.symbol, buf);

    this.watchlist.setEntry(this.state.symbol, {
      lastPrice: last.close,
      refPrice: hostRef ?? this.sessionRefPrice ?? data[0].open,
      sparkline: buf.slice(),
    });
  }

  /** Ignored when the chart's `features.timeframes` whitelist leaves `tf` out. */
  async setTimeframe(tf: TimeFrame): Promise<void> {
    if (!this.chart.isTimeframeAllowed(tf)) return;
    this.state = { ...this.state, timeframe: tf };
    this.options.onTimeframeChange?.(tf);
    this.updateUI();
    this.layoutSession?.changed();
    if (this.adapter) {
      // Live adapter owns the data — refetch at the native resolution.
      await this.connectStream();
      return;
    }
    if (this.options.resampleTimeframes === false) return;
    // Static data: aggregate the base series locally. Lazily adopt whatever is
    // currently on the chart as the base if the host fed it via getChart().
    if (!this.baseSeries) {
      const current = this.chart.getData();
      if (current.length > 0) {
        this.baseSeries = current;
        this.baseTimeframeMs = inferTimeframeMs(current);
      }
    }
    await this.switchLocalTimeframe();
  }

  setTheme(theme: import('@tradecanvas/commons').ThemeName | Theme): void {
    const isDark = this.resolveIsDark(theme);
    const resolved = this.resolveTheme(theme);
    this.state = { ...this.state, isDark };
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
    this.portal.dataset.tcwTheme = this.root.dataset.tcwTheme;
    this.chart.setTheme(resolved);
    this.updateUI();
  }

  getChart(): Chart {
    return this.chart;
  }

  /**
   * Change the widget's look: a preset (`'studio'`, `'terminal'`,
   * `'capsule'`) or your theme over one. Colours stay with `setTheme`.
   */
  setUI(theme: WidgetUIPreset | WidgetUITheme): void {
    this.ui = resolveWidgetUI(theme);
    applyWidgetUI(this.root, this.ui);
    applyWidgetUI(this.portal, this.ui);
    this.applyChartShapes();
  }

  /** The widget's look, every token set. */
  getUI(): ResolvedWidgetUI {
    return resolveWidgetUI({ ...this.ui });
  }

  /** The chart's own tags and pills take the look's corners. */
  private applyChartShapes(): void {
    this.chart.setShapes({ tagRadius: this.ui.tagRadius });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.boundGlobalKeydown) {
      document.removeEventListener('keydown', this.boundGlobalKeydown);
    }
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.unregisterKeys();
    this.tooltip.destroy();
    if (this.legendFrame) cancelAnimationFrame(this.legendFrame);
    this.indicatorLegend?.destroy();
    this.portal.remove();
    if (document.fullscreenElement === this.root) void document.exitFullscreen().catch(() => {});
    this.flushActiveLayout();
    this.commandPalette?.destroy();
    this.symbolSearch?.destroy();
    this.hotkeySheet?.destroy();
    if (this.replayPollInterval) clearInterval(this.replayPollInterval);
    this.replayShade?.remove();
    this.replayBar?.destroy();
    this.dragDrop?.detach();
    this.alertsPanel?.destroy();
    this.objectTree?.destroy();
    this.indicatorSettings?.destroy();
    this.drawingStyle?.destroy();
    this.drawingSettings?.destroy();
    this.drawingMenu?.destroy();
    this.chartMenu?.destroy();
    this.legendMenu?.destroy();
    this.templatePrompt?.destroy();
    this.intervalInput?.destroy();
    this.markerTip?.remove();
    this.layoutSession?.destroy();
    this.layoutsUI?.destroy();
    this.accountPanel?.destroy();
    this.orderTicket?.destroy();
    if (this.accountFrame) cancelAnimationFrame(this.accountFrame);
    this.bracketBar?.destroy();
    this.alertNotifier?.destroy();
    this.depthLadder?.destroy();
    this.dataWindow?.destroy();
    if (this.watchlistInterval) clearInterval(this.watchlistInterval);
    if (this.marketTimer) clearInterval(this.marketTimer);
    this.chartNav?.destroy();
    this.symbolInfoPanel?.destroy();
    this.stopQuotes?.();
    this.stopQuotes = null;
    this.watchlist?.destroy();
    this.toolbar?.destroy();
    this.sidebar?.destroy();
    this.settings?.destroy();
    this.statusBar?.destroy();
    this.goToDate?.destroy();
    this.loading.destroy();
    this.historyPill.destroy();
    this.chart.destroy();
    this.root.remove();
    removeWidgetStyles();
  }

  // --- Internal handlers ---

  private handleSymbolClick(): void {
    // Opens the fuzzy search modal. The cycle-through behaviour the toolbar
    // used to do is gone — a real search scales past 3-4 symbols and matches
    // what users expect from professional trading terminals.
    this.symbolSearch?.open(this.symbols, this.state.symbol, undefined, this.symbolSearchFn());
  }

  /** The host's symbol search, else the adapter's; none filters `symbols`. */
  private symbolSearchFn(): SymbolSearchFn | undefined {
    if (this.options.searchSymbols) return this.options.searchSymbols;
    const adapter = this.adapter;
    if (!adapter?.searchSymbols) return undefined;
    return (query, signal) => adapter.searchSymbols!(query, { signal, limit: 50 });
  }

  private handleTimeframe(tf: TimeFrame): void {
    void this.setTimeframe(tf);
  }

  /** Fill the screen with the widget, or leave fullscreen. */
  toggleFullscreen(): void {
    if (document.fullscreenElement === this.root) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    this.root.requestFullscreen().catch((err: unknown) => {
      this.toast(err instanceof Error ? err.message : this.t('toast.fullscreenUnavailable'), 'error');
    });
  }

  /** A drawing tool's name in the widget's language. */
  private drawingToolName(type: DrawingToolType): string {
    const key = `tool.${type}` as MessageKey;
    const name = this.t(key);
    return name === key ? this.chart.getDrawingToolDescriptor(type)?.name ?? type : name;
  }

  /** Open a drawing's settings (double-click on it, or the object tree's settings button). */
  private openDrawingSettings(id: string): void {
    const drawing = this.chart.getDrawings().find((d) => d.id === id);
    const descriptor = drawing ? this.chart.getDrawingToolDescriptor(drawing.type) : null;
    if (!drawing || !descriptor || !this.drawingSettings) return;
    this.drawingSettings.open({
      id,
      type: drawing.type,
      name: this.drawingToolName(drawing.type),
      style: { ...drawing.style },
      options: this.chart.getDrawingOptions(id),
      defs: descriptor.options ?? {},
      anchors: drawing.anchors.map((a) => ({ ...a })),
      fill: descriptor.fill === true,
      text: descriptor.text === true,
      alertable: this.chart.canAddDrawingAlert(id),
    });
  }

  /** Add a "price crosses this drawing" alert and say so. */
  private addDrawingAlert(id: string): void {
    const drawing = this.chart.getDrawings().find((d) => d.id === id);
    const name = drawing ? this.drawingToolName(drawing.type) : '';
    if (this.chart.addDrawingAlert(id, { label: name })) {
      this.toast(fill(this.t('drawingSettings.alertAdded'), { name }));
    }
  }

  /** The menu of a right-clicked drawing; the chart has selected it (and its group) by now. */
  private openDrawingMenu(id: string, x: number, y: number): void {
    if (!this.drawingMenu) return;
    const drawings = new Map(this.chart.getDrawings().map((d) => [d.id, d]));
    const selected = this.chart.getSelectedDrawingIds().flatMap((sid) => {
      const d = drawings.get(sid);
      return d ? [{ id: d.id, locked: d.locked, groupId: d.group?.id ?? null }] : [];
    });
    if (selected.length === 0) return;
    const entries = drawingMenuEntries({
      selected,
      canConfigure: this.drawingSettings !== null,
      canAlert: this.chart.canAddDrawingAlert(id),
    }, this.t);
    const chartRect = this.chartContainer.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const ids = selected.map((d) => d.id);
    this.drawingMenu.open(entries, chartRect.left - rootRect.left + x, chartRect.top - rootRect.top + y,
      (action) => this.runDrawingMenuAction(id, ids, action as DrawingMenuAction));
  }

  private runDrawingMenuAction(id: string, ids: readonly string[], action: DrawingMenuAction): void {
    switch (action) {
      case 'settings':
        this.openDrawingSettings(id);
        return;
      case 'alert':
        this.addDrawingAlert(id);
        return;
      case 'front':
      case 'forward':
      case 'backward':
      case 'back':
        this.chart.moveDrawing(id, action);
        break;
      case 'group':
        this.chart.groupDrawings(ids);
        break;
      case 'ungroup': {
        const groups = new Set(this.chart.getDrawings().filter((d) => ids.includes(d.id)).map((d) => d.group?.id));
        for (const group of groups) if (group) this.chart.ungroupDrawings(group);
        break;
      }
      case 'lock':
      case 'unlock':
        this.chart.setDrawingsLocked(ids, action === 'lock');
        break;
      case 'hide':
        this.chart.setDrawingsVisible(ids, false);
        break;
      case 'duplicate':
        this.chart.duplicateDrawing(id);
        break;
      case 'delete': {
        const editing = this.drawingSettings?.editing();
        if (editing && ids.includes(editing)) this.drawingSettings?.close(true);
        this.chart.removeDrawings(ids);
        break;
      }
    }
    if (this.objectTree?.isOpen()) this.refreshObjects();
  }

  /** What the chart's menus can offer here, and how the chart is set now. */
  private chartMenuContext(price: number | undefined): ChartMenuContext {
    const drawings = this.chart.getDrawings();
    const data = this.chart.getData();
    return {
      price,
      lastPrice: data.length > 0 ? data[data.length - 1].close : null,
      formatPrice: (p) => this.formatAlertPrice(p),
      canAlert: this.alertsPanel !== null,
      canTrade: this.options.trading !== false,
      canOrderTicket: this.orderTicket !== null,
      canDraw: this.options.drawingTools !== false,
      hasDrawings: drawings.length > 0,
      drawingsHidden: drawings.length > 0 && drawings.every((d) => !d.visible),
      canGoToDate: this.goToDate !== null,
      canExport: this.canExport,
      autoScale: this.chart.isAutoScale(),
      scaleMode: this.settingsState.scaleMode,
      inverted: this.chart.isInvertScale(),
    };
  }

  /**
   * Open a chart menu at (x, y) in the chart's pixels, the host's own entries
   * last; nothing when it has no entries.
   */
  private openChartMenu(
    entries: import('./WidgetContextMenu.js').ContextMenuEntry[],
    x: number,
    y: number,
    context: import('./types.js').ChartMenuItemsContext,
  ): void {
    if (!this.chartMenu) return;
    const extra = this.options.chartMenuItems?.(context) ?? [];
    const all: import('./WidgetContextMenu.js').ContextMenuEntry[] = [
      ...entries,
      ...(entries.length > 0 && extra.length > 0 ? ['separator' as const] : []),
      ...extra.map((item, i) => ({ id: `host:${i}`, label: item.label, icon: item.icon, danger: item.danger, checked: item.checked })),
    ];
    if (all.length === 0) return;
    const chartRect = this.chartContainer.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    this.chartMenu.open(all, chartRect.left - rootRect.left + x, chartRect.top - rootRect.top + y, (action) => {
      if (action.startsWith('host:')) extra[Number(action.slice('host:'.length))]?.onSelect();
      else this.runChartMenuAction(action as ChartMenuAction, context.price);
    });
  }

  /**
   * A button of your own on the toolbar: an icon (built-in or yours), text,
   * a switch. `null` without a toolbar.
   */
  addToolbarButton(spec: import('./types.js').ToolbarButtonSpec): import('./types.js').ToolbarButtonHandle | null {
    if (!this.toolbar) return null;
    const element = this.toolbar.addHostButton(spec);
    const textSpan = (): HTMLSpanElement => {
      const found = element.querySelector<HTMLSpanElement>('.tcw-host-btn-text');
      if (found) return found;
      const added = document.createElement('span');
      added.className = 'tcw-host-btn-text';
      element.appendChild(added);
      return added;
    };
    return {
      element,
      setActive: (on) => {
        element.classList.toggle('tcw-active', on);
        if (spec.toggle) element.setAttribute('aria-pressed', String(on));
      },
      setText: (text) => {
        textSpan().textContent = text;
        setHostButtonName(element, spec.label);
      },
      remove: () => element.remove(),
    };
  }

  private runChartMenuAction(action: ChartMenuAction, price: number | undefined): void {
    const at = price ?? NaN;
    switch (action) {
      case 'alert':
        this.chart.addAlert(at, 'crossing');
        this.toast(fill(this.t('chartMenu.alertAdded'), { price: this.formatAlertPrice(at) }));
        break;
      case 'buyLimit':
      case 'sellLimit':
      case 'buyStop':
      case 'sellStop':
        this.placeOrderAt(action, at);
        break;
      case 'orderTicket':
        this.openOrderTicket(price);
        break;
      case 'exportData':
        // Every bar loaded, with the indicator lines, named after the symbol and interval.
        this.chart.exportAllData('csv', `${this.state.symbol}-${this.state.timeframe}.csv`.replace(/[^\w.-]+/g, '_'));
        break;
      case 'paneLog':
      case 'paneInvert':
      case 'panePercent': {
        const pane = this.menuPane;
        if (!pane) break;
        const scale = this.chart.getPaneScale(pane);
        this.chart.setPaneScale(pane, action === 'paneLog' ? { log: !scale.log }
          : action === 'paneInvert' ? { invert: !scale.invert } : { percent: !scale.percent });
        break;
      }
      case 'horizontalLine': {
        const data = this.chart.getData();
        if (data.length > 0) this.chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: data[data.length - 1].time, price: at }] });
        break;
      }
      case 'resetView':
        this.chart.fitContent();
        this.changeSettings({ autoScale: true });
        break;
      case 'hideDrawings':
        this.chart.setDrawingsVisible(this.chart.getDrawings().map((d) => d.id), false);
        break;
      case 'showDrawings':
        this.chart.setDrawingsVisible(this.chart.getDrawings().map((d) => d.id), true);
        break;
      case 'removeDrawings':
        // One undo step; locked drawings stay.
        this.chart.removeDrawings(this.chart.getDrawings().map((d) => d.id));
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'autoScale':
        this.changeSettings({ autoScale: !this.chart.isAutoScale() });
        break;
      case 'logScale':
        this.changeSettings({ scaleMode: this.settingsState.scaleMode === 'logarithmic' ? 'regular' : 'logarithmic' });
        break;
      case 'percentScale':
        this.changeSettings({ scaleMode: this.settingsState.scaleMode === 'percentage' ? 'regular' : 'percentage' });
        break;
      case 'invertScale':
        this.changeSettings({ invertScale: !this.chart.isInvertScale() });
        break;
      case 'goToDate':
        this.toggleGoToDate();
        break;
    }
    if (this.objectTree?.isOpen()) this.refreshObjects();
  }

  /** Open or close the account panel (no argument: the other way from now). */
  toggleAccountPanel(open?: boolean): void {
    const panel = this.accountPanel;
    if (!panel || open === panel.isOpen()) return;
    panel.toggle();
  }

  /** The order ticket, at a price from the chart (or the market). */
  private openOrderTicket(price?: number): void {
    const data = this.chart.getData();
    this.orderTicket?.open({ price, lastPrice: data.length > 0 ? data[data.length - 1].close : null });
  }

  /** Redraw the account panel once a frame at most (ticks, fills and order changes come in bursts). */
  private refreshAccountSoon(): void {
    if (this.accountFrame || !this.accountPanel) return;
    this.accountFrame = requestAnimationFrame(() => {
      this.accountFrame = 0;
      if (!this.destroyed) this.refreshAccount();
    });
  }

  private refreshAccount(): void {
    if (!this.accountPanel) return;
    const data = this.chart.getData();
    const price = data.length > 0 ? data[data.length - 1].close : null;
    this.accountPanel.update({
      positions: this.chart.getPositions(),
      orders: this.chart.getOrders(),
      fills: this.chart.getFills(),
      price,
      realisedPnl: this.chart.getRealisedPnl(),
    });
    this.orderTicket?.setLastPrice(price);
  }

  /** Ask for a limit or stop order at `price` (one unit), and say so. */
  private placeOrderAt(kind: 'buyLimit' | 'sellLimit' | 'buyStop' | 'sellStop', price: number): void {
    const side = kind.startsWith('buy') ? 'buy' : 'sell';
    const stop = kind.endsWith('Stop');
    this.chart.placeOrderIntent(stop ? { side, type: 'stop', price, stopPrice: price, quantity: 1 } : { side, type: 'limit', price, quantity: 1 });
    this.toast(fill(this.t(`order.${kind}` as MessageKey), { price: this.formatAlertPrice(price) }));
  }

  /** The display timezone from the settings; 'exchange' is the zone the chart resolved it to. */
  private displayTimezone(): TimeZoneSetting {
    const tz = settingToTimezone(this.settingsState.timezone);
    return tz === 'exchange' ? this.chart.getEffectiveTimezone() : tz;
  }

  private toggleGoToDate(): void {
    if (!this.goToDate) return;
    if (this.goToDate.isOpen()) {
      this.goToDate.close();
      return;
    }
    const data = this.chart.getData();
    if (data.length === 0) return;
    this.goToDate.open(
      utcToWallTime(data[data.length - 1].time * barTimeUnit(data), this.displayTimezone()),
      this.root.querySelector('[data-role="goto"]'),
    );
  }

  private goToWallTime(date: string, time: string): void {
    const ms = wallTimeToUtc(date, time, this.displayTimezone());
    const data = this.chart.getData();
    if (ms === null || data.length === 0) return;
    const ts = ms / barTimeUnit(data); // the bars' own unit
    this.chart.goToTime(ts);
    if (ts < data[0].time) this.toast(this.t('range.beforeData'));
  }

  /** Pinned timeframes that are still on offer, shortest first. */
  private pinnedTimeframes(): TimeFrame[] {
    const pinned = this.timeframeFavorites.list();
    return this.timeframes.filter((tf) => pinned.includes(tf));
  }

  /** The timeframe menu's rows, typed intervals marked so they can be removed. */
  private timeframeMenu(): { value: TimeFrame; label: string; custom: boolean }[] {
    return this.timeframes.map((value) => ({ value, label: timeframeLabel(value), custom: this.customTimeframes.has(value) }));
  }

  /** A typed interval: switch to it, adding and pinning it when it is new. False when it isn't one. */
  private handleAddTimeframe(text: string): boolean {
    const tf = parseTimeframeInput(text);
    if (!tf || !this.chart.isTimeframeAllowed(tf)) return false;
    if (this.adapter && !servesTimeframe(this.adapter, tf)) return false;
    if (!this.timeframes.includes(tf)) {
      this.customTimeframes.add(tf);
      this.timeframeFavorites.add(tf);
      this.timeframes = withExtraTimeframes(this.timeframes, [tf]);
      this.toolbar?.setTimeframes(this.timeframeMenu(), this.pinnedTimeframes());
    }
    this.handleTimeframe(tf);
    return true;
  }

  /** A note by a signal marker: its source or label, side, confidence, price and time; null hides it. */
  private showMarkerTip(hover: { marker: import('@tradecanvas/commons').SignalMarker | null; x: number; y: number }): void {
    const { marker } = hover;
    if (!marker) {
      if (this.markerTip) this.markerTip.hidden = true;
      return;
    }
    if (!this.markerTip) {
      this.markerTip = document.createElement('div');
      this.markerTip.className = 'tcw-marker-tip';
      this.markerTip.setAttribute('role', 'tooltip');
      this.chartContainer.appendChild(this.markerTip);
    }
    const side = marker.direction === 'long' ? this.t('account.long') : marker.direction === 'short' ? this.t('account.short') : this.t('markers.neutral');
    const title = document.createElement('strong');
    title.textContent = marker.label ? `${marker.label} · ${marker.source}` : marker.source;
    const line = document.createElement('div');
    line.textContent = `${side} · ${this.formatAlertPrice(marker.price)} · ${fill(this.t('markers.confidence'), { pct: Math.round(marker.confidence * 100) })}`;
    const when = document.createElement('div');
    const { date, time } = utcToWallTime(marker.time, this.displayTimezone());
    when.textContent = `${date} ${time}`;
    this.markerTip.replaceChildren(title, line, when);
    this.markerTip.hidden = false;
    // Beside the pointer, kept inside the chart.
    const box = this.chartContainer.getBoundingClientRect();
    const left = Math.min(hover.x + 12, Math.max(0, box.width - this.markerTip.offsetWidth - 4));
    const top = Math.max(0, hover.y - this.markerTip.offsetHeight - 10);
    this.markerTip.style.left = `${left}px`;
    this.markerTip.style.top = `${top}px`;
  }

  /** A typed interval: one on offer is picked; another joins the menu (not the toolbar's pins). */
  private selectTypedTimeframe(tf: TimeFrame): boolean {
    if (!this.chart.isTimeframeAllowed(tf)) return false;
    if (this.adapter && !servesTimeframe(this.adapter, tf)) return false;
    if (!this.timeframes.includes(tf)) {
      this.customTimeframes.add(tf);
      this.timeframes = withExtraTimeframes(this.timeframes, [tf]);
      this.toolbar?.setTimeframes(this.timeframeMenu(), this.pinnedTimeframes());
    }
    this.handleTimeframe(tf);
    return true;
  }

  /** Put a template's indicators in place of the chart's (one undo step). */
  private applyIndicatorTemplate(name: string): void {
    const template = this.templates.get(name);
    if (!template) return;
    this.chart.applyIndicatorSetup(template.indicators);
    this.syncIndicatorsFromChart();
    this.updateUI();
    this.toast(fill(this.t('templates.applied'), { name: template.name }));
  }

  /** Save the chart's indicators as a template, asking for its name. */
  private promptSaveIndicatorTemplate(): void {
    if (this.chart.getActiveIndicators().length === 0) {
      this.toast(this.t('templates.nothing'), 'error');
      return;
    }
    this.templatePrompt ??= new WidgetNamePrompt(this.root, this.t);
    this.templatePrompt.open({
      title: this.t('templates.saveTitle'),
      submitLabel: this.t('common.save'),
      placeholder: this.t('templates.namePlaceholder'),
      onSubmit: (name) => {
        try {
          this.templates.save(name, this.chart.getIndicatorSetup());
        } catch (err) {
          this.toast(this.t('templates.saveFailed'), 'error');
          throw err;
        }
        this.toolbar?.setIndicatorTemplates(this.templates.list().map((t) => t.name));
        this.toast(fill(this.t('templates.saved'), { name }));
      },
    });
  }

  private handleRemoveTimeframe(tf: TimeFrame): void {
    if (!this.customTimeframes.has(tf)) return;
    this.customTimeframes.remove(tf);
    this.timeframeFavorites.remove(tf);
    this.timeframes = this.timeframes.filter((t) => t !== tf);
    this.toolbar?.setTimeframes(this.timeframeMenu(), this.pinnedTimeframes());
    this.updateUI();
  }

  private handleToggleTimeframeFavorite(tf: TimeFrame): void {
    this.timeframeFavorites.toggle(tf);
    this.toolbar?.setTimeframeFavorites(this.pinnedTimeframes());
    this.updateUI();
  }

  /**
   * Load the widget's base series. Prefer this over `getChart().setData()` so
   * client-side timeframe resampling has a finest-resolution source to
   * aggregate from. The data is rendered at the current timeframe (resampled
   * when that timeframe is coarser than the data's native spacing).
   */
  setData(data: DataSeries): void {
    this.localSeq++; // supersedes a local switch still waiting to run
    this.baseSeries = data;
    this.baseTimeframeMs = inferTimeframeMs(data);
    this.applyTimeframeData();
    // Static data is loaded the moment it's set, even an empty series. With a
    // live adapter the stream's own load decides (connectStream).
    if (!this.adapter) this.loading.end();
  }

  /**
   * Local timeframe switch. When it is expected to block the main thread for
   * several frames, veil the chart first and let that paint — otherwise the
   * click would look ignored until the new chart pops in.
   */
  private async switchLocalTimeframe(): Promise<void> {
    if (!this.baseSeries) return;
    const seq = ++this.localSeq;
    const expectSlow = this.lastLocalSwitchMs >= SLOW_LOCAL_SWITCH_MS
      || this.baseSeries.length >= LARGE_SERIES_BARS;
    try {
      if (expectSlow) {
        this.loading.begin(this.chart.getData().length > 0, true);
        await afterPaint();
        // Superseded: the newer switch or setData() ends the loading state.
        if (seq !== this.localSeq || this.destroyed) return;
      }
      this.applyTimeframeData();
    } finally {
      // Also on a throw (bad data, a failing custom indicator) — never leave
      // the veil up.
      if (seq === this.localSeq) this.loading.end();
    }
  }

  /** Render the base series at the active timeframe, resampling when coarser. */
  private applyTimeframeData(): void {
    if (!this.baseSeries) return;
    const started = performance.now();
    const targetMs = timeframeToMs(this.state.timeframe);
    if (this.baseTimeframeMs > 0 && targetMs > this.baseTimeframeMs) {
      const weekStartsOn = this.options.weekStartsOn ?? 1;
      this.chart.setData(resampleOHLCV(this.baseSeries, this.state.timeframe, { weekStartsOn }));
    } else {
      this.chart.setData(this.baseSeries);
    }
    this.lastLocalSwitchMs = performance.now() - started;
  }

  private handleDataUpdate(payload: unknown): void {
    if (!payload || typeof payload !== 'object') return;
    const p = payload as { length?: number; error?: string; connection?: { state?: string } };
    if (typeof p.length === 'number') {
      if (p.length > 0 && this.loading.isActive()) {
        this.loading.end();
        // A retry after a failed load just delivered history.
        if (this.state.connectionState === 'error') this.setConnectionState('connected', this.t('status.live'));
      }
      return;
    }
    if (p.error !== undefined) {
      // Only a failed *load* is reported from the error itself. Errors outside
      // one can be transient (a single failed poll on a healthy connection);
      // the status bar follows the stream's connection state below instead.
      if (this.loading.isActive()) {
        this.loading.fail(this.t('status.connectionFailed'));
        this.setConnectionState('error', p.error || this.t('status.connectionFailed'));
      }
      return;
    }
    switch (p.connection?.state) {
      case 'connected':
        // A retry that brought back an empty history ends a failed load too.
        if (this.loading.hasFailed()) this.loading.end();
        if (!this.loading.isActive() && this.state.connectionState !== 'connected') {
          this.setConnectionState('connected', this.t('status.live'));
        }
        break;
      case 'reconnecting':
        if (!this.loading.isActive()) this.setConnectionState('connecting', this.t('status.connecting'));
        break;
      case 'error':
        if (!this.loading.isActive()) this.setConnectionState('error', this.t('status.connectionFailed'));
        break;
    }
  }

  private setConnectionState(connectionState: WidgetState['connectionState'], connectionMessage: string): void {
    this.state = { ...this.state, connectionState, connectionMessage };
    this.updateUI();
  }

  private toggleAlerts(): void {
    if (!this.alertsPanel) return;
    this.alertsPanel.toggle();
    if (this.alertsPanel.isOpen()) this.refreshAlerts();
  }

  private handleToggleFavorite(tool: DrawingToolType): void {
    const pinned = this.favoritesStore.toggle(tool);
    this.sidebar?.setFavorites(this.favoritesStore.list());
    this.toast(pinned ? this.t('toast.pinned') : this.t('toast.unpinned'));
  }

  /** Encode the current view (symbol, timeframe, chart type, scale, indicators, drawings). */
  exportState(): string {
    const indicators = this.chart.getActiveIndicators().map((i) => ({
      id: i.id,
      params: i.params as Record<string, number | string | boolean>,
    }));
    return encodeWidgetState({
      v: 1,
      symbol: this.state.symbol,
      timeframe: this.state.timeframe,
      chartType: this.state.chartType,
      scaleMode: this.chart.getScaleMode(),
      indicators,
      drawings: this.chart.getDrawings(),
    });
  }

  /** Restore a view from an `exportState()` string. Returns false if malformed. */
  async importState(encoded: string): Promise<boolean> {
    const s = decodeWidgetState(encoded);
    if (!s) return false;

    // Symbol/timeframe first so any stream/layout restore happens before we
    // overlay the shared view on top.
    if (s.symbol && s.symbol !== this.state.symbol) await this.setSymbol(s.symbol);
    if (s.timeframe && s.timeframe !== this.state.timeframe) await this.setTimeframe(s.timeframe);

    if (s.chartType) this.applyChartType(s.chartType);
    this.chart.setScaleMode(s.scaleMode);

    // The shared indicators in place of the chart's, as one undo step.
    this.chart.applyIndicatorSetup(s.indicators.map((ind, i) => ({ id: ind.id, instanceId: `shared_${i}`, params: ind.params })));
    this.chart.setDrawings(s.drawings);
    this.updateUI();
    return true;
  }

  /** Copy the chart image to the clipboard, with a toast on success/failure. */
  async copyChartImage(): Promise<void> {
    const ok = await this.chart.copyScreenshot();
    this.toast(ok ? this.t('toast.imageCopied') : this.t('toast.imageCopyFailed'), ok ? 'info' : 'error');
  }

  /** Copy a shareable deep-link (current view encoded in the URL hash) to the clipboard. */
  async copyShareLink(): Promise<void> {
    const base = typeof location !== 'undefined' ? location.href : '';
    const url = buildShareUrl(base, this.exportState());
    try {
      await navigator.clipboard.writeText(url);
      this.toast(this.t('toast.linkCopied'));
    } catch {
      this.toast(this.t('toast.copyFailed'), 'error');
    }
  }

  /** Feed order-book depth to the chart overlay, depth ladder, and heatmap. */
  setDepth(depth: DepthData | null): void {
    this.chart.setDepthData(depth);
    this.depthLadder?.setData(depth);
    if (depth) this.chart.pushDepthSnapshot(depth);
  }

  /** Begin a draggable bracket order at the latest price and show the action bar. */
  startBracket(side: 'buy' | 'sell'): void {
    if (this.chart.startBracket(side)) {
      this.bracketBar?.show(side);
    }
  }

  private buildDataWindowModel(): DataWindowModel {
    const data = this.chart.getData();
    const idx = this.lastHoverIndex;
    if (idx === null || idx < 0 || idx >= data.length) {
      return { ohlc: null, change: 0, changePct: 0, indicators: [] };
    }
    const bar = data[idx];
    const prevClose = idx > 0 ? data[idx - 1].close : bar.open;
    const change = bar.close - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const indicators = this.chart.getActiveIndicators().map((ind) => {
      const series = this.chart.getIndicatorOutput(ind.instanceId)?.series;
      const point = series?.[idx] ?? null;
      // The drawn lines by their titles ("Signal"), else every field by its key.
      const fields = ind.descriptor.plots?.map((p) => [p.key, p.title] as const)
        ?? Object.keys(point ?? {}).map((k) => [k, k] as const);
      const values = point
        ? fields
            .filter(([key]) => typeof point[key] === 'number' && Number.isFinite(point[key]))
            .map(([key, title]) => ({ key: title, value: point[key] as number }))
        : [];
      return { name: ind.descriptor.name, values };
    }).filter((i) => i.values.length > 0);

    return {
      ohlc: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume },
      change,
      changePct,
      indicators,
    };
  }

  private toggleDataWindow(): void {
    if (!this.dataWindow) return;
    this.dataWindow.toggle();
    if (this.dataWindow.isOpen()) this.dataWindow.render(this.buildDataWindowModel());
  }

  private toggleObjects(): void {
    if (!this.objectTree) return;
    this.objectTree.toggle();
    if (this.objectTree.isOpen()) this.refreshObjects();
  }

  private openIndicatorSettings(instanceId: string): void {
    if (!this.indicatorSettings) return;
    const active = this.chart.getActiveIndicators();
    const ind = active.find((i) => i.instanceId === instanceId);
    if (!ind) return;
    const style = this.chart.getIndicatorStyle(instanceId);
    const pane = ind.descriptor.placement === 'panel' || !!ind.pane;
    this.indicatorSettings.open({
      instanceId,
      name: ind.descriptor.name,
      defaults: ind.descriptor.defaultConfig,
      params: ind.params,
      inputs: ind.descriptor.inputs,
      lineSources: lineSourcesFor(instanceId, active),
      plots: ind.descriptor.plots,
      colors: style?.colors,
      lineWidth: style?.lineWidths[0],
      // Levels belong to pane indicators.
      levels: pane ? this.chart.getIndicatorLevels(instanceId) : undefined,
      defaultLevels: ind.descriptor.levels,
      scale: pane ? undefined : this.chart.getIndicatorScale(instanceId),
    });
  }

  private refreshObjects(): void {
    if (!this.objectTree) return;
    const indicators = this.chart.getActiveIndicators().map((i) => ({
      instanceId: i.instanceId,
      name: i.descriptor.name,
      visible: i.visible,
    }));
    const drawings = this.chart.getDrawings().map((d) => ({
      id: d.id,
      label: drawingTypeLabel(d.type, this.t),
      visible: d.visible,
      locked: d.locked,
      group: d.group,
    }));
    const compares = this.compares.map((c) => ({ id: c.id, label: c.symbol, color: c.color }));
    this.objectTree.setObjects(indicators, drawings, compares);
  }

  private async handleAddCompare(): Promise<void> {
    if (!this.adapter) {
      this.toast(this.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    const taken = new Set([this.state.symbol, ...this.compares.map((c) => c.symbol)]);
    const options = this.symbols.filter((s) => !taken.has(s));
    this.symbolSearch?.open(options.length ? options : this.symbols, this.state.symbol, (symbol) => {
      this.pickCompareWay(symbol);
    }, this.symbolSearchFn());
  }

  /** How to compare with `symbol`: a menu by the chart's top left. */
  private pickCompareWay(symbol: string): void {
    const main = this.state.symbol;
    const entries = [
      { id: 'percent', label: this.t('compare.percent') },
      { id: 'scale', label: this.t('compare.ownScale') },
      { id: 'pane', label: this.t('compare.ownPane') },
      { id: 'spread', label: fill(this.t('compare.spread'), { main, other: symbol }) },
      { id: 'ratio', label: fill(this.t('compare.ratio'), { main, other: symbol }) },
    ];
    const rect = this.chart.getPlotRect();
    this.chartMenu?.open(entries, rect.x + 24, rect.y + 24, (way) => void this.addCompareSymbol(symbol, way as CompareWay));
  }

  /**
   * Compare with another symbol: its percent change on the price scale
   * (`'percent'`, the default), its price on a scale of its own (`'scale'`)
   * or in a pane of its own (`'pane'`), or the spread or ratio of this
   * symbol to it (`'spread'`, `'ratio'`). Its bars come through the adapter.
   */
  async addCompareSymbol(symbol: string, way: CompareWay = 'percent'): Promise<void> {
    if (!this.adapter) {
      this.toast(this.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    if (way !== 'percent') {
      const id = way === 'scale' ? this.chart.addIndicator('compareSymbol', { symbol }, 'bottom', { scale: 'left' })
        : way === 'pane' ? this.chart.addIndicator('compareSymbol', { symbol })
          : this.chart.addIndicator('spread', { symbol, mode: way });
      if (id && way === 'pane') this.chart.moveIndicatorToPane(id, 'new');
      return;
    }
    if (this.compares.some((c) => c.symbol === symbol)) return;
    const color = COMPARE_COLORS[this.compares.length % COMPARE_COLORS.length];
    const id = `cmp_${symbol}`;
    try {
      const bars = await withResampling(this.adapter).fetchHistory(symbol, this.state.timeframe, this.options.historyLimit ?? 500);
      // Percent mode normalizes mixed-price symbols (e.g. BTC vs a $2 alt) onto
      // a shared % axis — the right default for comparison.
      if (this.compares.length === 0) this.chart.setCompareMode('percent');
      this.chart.addCompareSymbol(id, symbol, bars, color);
      this.compares = [...this.compares, { id, symbol, color }];
      this.refreshObjects();
      this.toast(fill(this.t('toast.comparing'), { symbol }));
    } catch (err: unknown) {
      this.toast(`${symbol}: ${err instanceof Error ? err.message : this.t('toast.loadFailed')}`, 'error');
    }
  }

  private handleRemoveCompare(id: string): void {
    this.chart.removeCompareSymbol(id);
    this.compares = this.compares.filter((c) => c.id !== id);
    this.refreshObjects();
  }

  /**
   * Bars of a symbol the chart's indicators read (a compare on its own
   * scale, a spread), at the chart's interval. A later interval wins.
   */
  private async loadSymbolSeries(symbol: string): Promise<void> {
    if (!this.adapter) {
      this.toast(this.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    const timeframe = this.state.timeframe;
    const seq = (this.symbolLoads.get(symbol) ?? 0) + 1;
    this.symbolLoads.set(symbol, seq);
    // Only the latest fetch of a symbol, at the interval on screen, answers.
    const stale = () => this.destroyed || timeframe !== this.state.timeframe || this.symbolLoads.get(symbol) !== seq;
    try {
      const limit = Math.max(this.chart.getData().length, this.options.historyLimit ?? 500);
      const bars = await withResampling(this.adapter).fetchHistory(symbol, timeframe, limit);
      if (stale()) return;
      this.chart.setSymbolSeries(symbol, bars);
    } catch (err: unknown) {
      if (stale()) return;
      // Keep what the chart had; an indicator on the symbol may ask again.
      this.chart.setSymbolSeries(symbol, this.chart.getSymbolSeries(symbol));
      this.toast(`${symbol}: ${err instanceof Error ? err.message : this.t('toast.loadFailed')}`, 'error');
    }
  }

  /** Refetch every comparison overlay at the current symbol/timeframe. */
  private async refetchCompares(): Promise<void> {
    // The symbols indicators read, at the new interval.
    for (const symbol of this.chart.getRequiredSymbols?.() ?? []) void this.loadSymbolSeries(symbol);
    if (!this.adapter || this.compares.length === 0) return;
    // A comparison against the now-active symbol is redundant — drop it.
    const stale = this.compares.filter((c) => c.symbol === this.state.symbol);
    for (const c of stale) this.handleRemoveCompare(c.id);

    for (const c of this.compares) {
      try {
        const bars = await withResampling(this.adapter).fetchHistory(c.symbol, this.state.timeframe, this.options.historyLimit ?? 500);
        this.chart.updateCompareData(c.id, bars);
      } catch { /* leave the stale overlay in place if the refetch fails */ }
    }
  }

  private refreshAlerts(): void {
    if (!this.alertsPanel) return;
    const sources = this.buildAlertSources();
    this.alertsPanel.setSources(sources);
    this.alertsPanel.setAlerts(this.chart.getAlerts().map((a) => this.alertListItem(a, sources)));
  }

  private alertListItem(a: AlertListItem, sources: readonly AlertSource[]): AlertListItem {
    return {
      id: a.id,
      price: a.price,
      condition: a.condition,
      message: a.message,
      triggered: a.triggered,
      channel: a.channel,
      label: a.label,
      drawingId: a.drawingId,
      target: a.target,
      targetLabel: a.target ? sources.find((s) => s.channel === a.target)?.label : undefined,
      percent: a.percent,
      bars: a.bars,
      onBarClose: a.onBarClose,
      expiresAt: a.expiresAt,
      expired: a.expired,
    };
  }

  /** An alert in words, for a toast or a notification: "Price crossing EMA 20", "RSI greater than 70". */
  private alertText(p: AlertListItem): string {
    return describeAlert(this.alertListItem(p, this.buildAlertSources()), this.t, (price) => this.formatAlertPrice(price), true);
  }

  /** Price + every active indicator line, as selectable alert sources. */
  private buildAlertSources(): { channel: string; label: string }[] {
    const sources = [{ channel: 'price', label: this.t('alerts.source.price') }];
    for (const ind of this.chart.getActiveIndicators()) {
      // Use the latest point — multi-output indicators (MACD, Stochastic) only
      // have all their lines populated once warmed up; the first point may not.
      const series = this.chart.getIndicatorOutput(ind.instanceId)?.series;
      const point = series && series.length > 0 ? series[series.length - 1] : null;
      const keys = point ? Object.keys(point).filter((k) => typeof point[k] === 'number') : [];
      for (const key of keys) {
        const label = keys.length > 1 ? `${ind.descriptor.name} ${key}` : ind.descriptor.name;
        sources.push({ channel: `${ind.instanceId}:${key}`, label });
      }
    }
    return sources;
  }

  /** Latest value for an alert source channel (price or indicator line). */
  private getAlertChannelValue(channel: string): number | null {
    const data = this.chart.getData();
    if (channel === 'price') return data.length > 0 ? data[data.length - 1].close : null;
    const sep = channel.indexOf(':');
    if (sep < 0 || data.length === 0) return null;
    const instanceId = channel.slice(0, sep);
    const key = channel.slice(sep + 1);
    const v = this.chart.getIndicatorOutput(instanceId)?.series?.[data.length - 1]?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }

  private formatAlertPrice(price: number): string {
    // The chart's own price format (fractions, a host's function) wins.
    const custom = this.chart.getPriceFormatter?.();
    if (custom) return custom(price);
    // No fixed precision config on the widget — pick digits from magnitude so
    // BTC (64,200.5) and a sub-dollar alt (0.04821) both read sensibly.
    const abs = Math.abs(price);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    const locale = this.settingsState.numberLocale || undefined;
    return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });
  }

  /** The user picked a chart type: applied, and undoable. */
  private handleChartType(type: ChartType): void {
    const before = this.state.chartType;
    if (type === before) return;
    this.applyChartType(type);
    this.chart.recordUndo({ subject: 'chartType', undo: () => this.applyChartType(before), redo: () => this.applyChartType(type) });
  }

  private applyChartType(type: ChartType): void {
    this.state = { ...this.state, chartType: type };
    this.chart.setChartType(type);
    this.updateUI();
  }

  /**
   * Add another instance — picking EMA twice gives two EMAs (e.g. 20 and 50
   * once their settings are changed). Remove one from its chip.
   */
  private handleAddIndicator(indId: string): void {
    this.chart.addIndicator(indId); // the chip strip follows the indicatorAdd event
  }

  private handleRemoveIndicator(instanceId: string): void {
    this.chart.removeIndicator(instanceId);
  }

  private toggleCommandPalette(): void {
    if (this.commandPalette?.isOpen()) {
      this.commandPalette.close();
      return;
    }
    this.commandPalette?.open(this.buildCommandItems());
  }

  private buildCommandItems(): CommandItem[] {
    const items: CommandItem[] = [];

    for (const ind of INDICATORS) {
      items.push({
        id: ind.id,
        label: ind.name,
        category: 'indicator',
        active: [...this.state.activeIndicators.values()].some((a) => a.id === ind.id),
      });
    }

    for (const ct of CHART_TYPES) {
      items.push({
        id: ct.value,
        label: chartTypeLabel(ct, this.t),
        category: 'chartType',
        active: this.state.chartType === ct.value,
      });
    }

    for (const group of localizeToolGroups(DRAWING_TOOL_GROUPS, this.t)) {
      for (const tool of group.tools) {
        items.push({
          id: tool.value,
          label: tool.label,
          category: 'drawing',
          active: this.state.activeTool === tool.value,
        });
      }
    }

    for (const tf of this.timeframes) {
      items.push({
        id: tf,
        label: timeframeLabel(tf),
        category: 'timeframe',
        active: this.state.timeframe === tf,
      });
    }

    items.push(
      { id: 'screenshot', label: this.t('action.screenshot'), category: 'action', shortcut: '' },
      { id: 'copyImage', label: this.t('action.copyImage'), category: 'action' },
      { id: 'toggleTheme', label: this.t('action.toggleTheme'), category: 'action' },
      { id: 'settings', label: this.t('action.settings'), category: 'action' },
      { id: 'shareView', label: this.t('action.shareView'), category: 'action' },
      { id: 'autoFib', label: this.t('action.autoFib'), category: 'action' },
      { id: 'dataWindow', label: this.t('action.dataWindow'), category: 'action' },
      ...(this.symbolInfoPanel ? [{ id: 'symbolInfo', label: this.t('action.symbolInfo'), category: 'action' as const }] : []),
      { id: 'clearDrawings', label: this.t('action.clearDrawings'), category: 'action' },
    );

    return items;
  }

  private handleAction(id: string): void {
    switch (id) {
      case 'screenshot':
        this.chart.screenshot();
        break;
      case 'toggleTheme':
        this.handleToggleTheme();
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'copyImage':
        void this.copyChartImage();
        break;
      case 'shareView':
        void this.copyShareLink();
        break;
      case 'autoFib': {
        const id = this.chart.autoFib();
        this.toast(id ? this.t('toast.autoFibAdded') : this.t('toast.noSwing'));
        break;
      }
      case 'dataWindow':
        this.toggleDataWindow();
        break;
      case 'symbolInfo':
        this.toggleSymbolInfo();
        break;
      case 'clearDrawings':
        this.chart.clearDrawings();
        this.state = { ...this.state, activeTool: null };
        this.updateUI();
        break;
    }
  }

  private handleDrawingTool(tool: DrawingToolType): void {
    this.state = { ...this.state, activeTool: tool };
    this.chart.setDrawingTool(tool);
    this.updateUI();
  }

  /** The cursor button: no tool, no eraser, no zoom box. */
  private handleCancelDrawing(): void {
    this.state = { ...this.state, activeTool: null };
    this.chart.setDrawingTool(null);
    this.chart.setEraserMode(false);
    this.chart.setZoomAreaMode(false);
    this.updateUI();
  }

  private handleToggleStayInDrawing(): void {
    const stayInDrawing = !this.state.stayInDrawing;
    this.state = { ...this.state, stayInDrawing };
    this.chart.setStayInDrawingMode(stayInDrawing);
    this.updateUI();
  }

  /** The magnet button goes off → weak → strong → off. */
  private handleToggleMagnet(): void {
    const mode = !this.state.magnetEnabled ? 'weak' : this.state.magnetStrong ? 'off' : 'strong';
    this.state = { ...this.state, magnetEnabled: mode !== 'off', magnetStrong: mode === 'strong' };
    this.chart.setDrawingMagnetMode(mode);
    this.updateUI();
  }

  private handleToggleTheme(): void {
    const isDark = !this.state.isDark;
    this.state = { ...this.state, isDark };
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
    this.portal.dataset.tcwTheme = this.root.dataset.tcwTheme;
    this.chart.setTheme(isDark ? DARK_THEME : LIGHT_THEME);
    this.chart.setWatermark(this.state.symbol.replace('USDT', ' / USDT'), {
      fontSize: 48,
      color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    });
    this.updateUI();
  }

  private openSettings(): void {
    // The chart's own settings of its type (a layout may have brought them).
    this.settingsState = { ...this.settingsState, chartTypeOptions: this.chart.getChartTypeOptions?.() ?? {} };
    this.settings?.open(this.settingsState, this.state.chartType);
  }

  // --- Toast ---

  /**
   * Show a transient toast inside the widget. Auto-dismisses after 3.5s.
   * Used by the drag-drop importer for success / failure feedback, but
   * exposed so apps can post their own (e.g. "alert triggered at 64,200").
   */
  toast(message: string, kind: 'info' | 'error' = 'info'): void {
    const el = document.createElement('div');
    el.className = `tcw-toast ${kind === 'error' ? 'tcw-toast-error' : ''}`;
    el.textContent = message;
    this.root.appendChild(el);
    // Trigger CSS transition on next frame
    requestAnimationFrame(() => el.classList.add('tcw-toast-in'));
    setTimeout(() => {
      el.classList.remove('tcw-toast-in');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      // Hard timeout in case transitionend doesn't fire (display:none, etc.)
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }

  // --- Named layouts ---

  /** Named layouts: save, open, rename, delete, auto-save. `null` with `layouts: false`. */
  getLayoutSession(): LayoutSession | null {
    return this.layoutSession;
  }

  /** The symbol showing. */
  getSymbol(): string {
    return this.state.symbol;
  }

  /** The interval showing. */
  getTimeframe(): TimeFrame {
    return this.state.timeframe;
  }

  /** This chart as a layout: symbol, interval, scale and the chart's state (no theme). A copy, free to keep. */
  captureLayout(): WidgetLayoutContent {
    const json = this.chart.saveState();
    const state = json ? parseLayoutJson(json) : null;
    // The theme stays the viewer's; the time of the capture would make every capture differ.
    const chart = state && typeof state === 'object' ? layoutChartState(state as Record<string, unknown>) : null;
    return {
      v: 1,
      symbol: this.state.symbol,
      timeframe: this.state.timeframe,
      scaleMode: this.settingsState.scaleMode,
      invertScale: this.settingsState.invertScale,
      chart,
    };
  }

  /** Show a layout from `captureLayout()`. */
  async restoreLayout(content: WidgetLayoutContent): Promise<void> {
    if (content.symbol !== this.state.symbol) await this.setSymbol(content.symbol);
    if (content.timeframe !== this.state.timeframe) await this.setTimeframe(content.timeframe);
    if (this.destroyed) return;
    if (content.chart) {
      this.chart.loadState(JSON.stringify(layoutChartState(content.chart)));
      const type = content.chart.chartType;
      if (typeof type === 'string') this.state = { ...this.state, chartType: type as ChartType };
    }
    this.applySettings({ scaleMode: content.scaleMode, invertScale: content.invertScale });
    this.syncIndicatorsFromChart();
    this.updateUI();
  }

  /** `captureLayout()` as JSON. */
  getLayoutContent(): string {
    return JSON.stringify(this.captureLayout());
  }

  /** Show a layout from `getLayoutContent()`; `false` when it is not one. */
  async applyLayoutContent(content: string): Promise<boolean> {
    const layout = readWidgetLayout(parseLayoutJson(content));
    if (!layout) return false;
    await this.restoreLayout(layout);
    return true;
  }

  private setupLayouts(cfg: import('./types.js').WidgetLayoutsOptions): void {
    const session = new LayoutSession(cfg.storage ?? localStorageLayouts(), {
      capture: () => ({ content: this.getLayoutContent(), symbol: this.state.symbol, timeframe: this.state.timeframe }),
      apply: async (layout: SavedLayout) => {
        if (!(await this.applyLayoutContent(layout.content))) throw new Error('Not a widget layout');
      },
    }, {
      autoSave: cfg.autoSave,
      debounceMs: cfg.debounceMs,
      onChange: () => this.toolbar?.setLayout(session.current()?.name ?? null, session.isDirty()),
      onError: () => this.toast(this.t('layouts.saveFailed'), 'error'),
    });
    this.layoutSession = session;
    this.layoutsUI = new WidgetLayoutsUI(session, {
      root: this.root,
      t: this.t,
      toast: (message, kind) => this.toast(message, kind),
      formatTime: (ms) => {
        const { date, time } = utcToWallTime(ms, this.displayTimezone());
        return `${date} ${time}`;
      },
    });
    this.chart.on('stateChange', () => session.changed());
    if (cfg.openLast) {
      void session.list().then(([last]) => (last && !this.destroyed ? this.openLayout(last.id) : undefined), () => undefined);
    }
  }

  /** Save into the open layout, or ask for a name when there is none. */
  async saveLayout(): Promise<void> {
    await this.layoutsUI?.save();
  }

  /** Open a saved layout by id; `false` when it could not be. */
  async openLayout(id: string): Promise<boolean> {
    return (await this.layoutsUI?.open(id)) ?? false;
  }

  // --- Layout persistence ---

  /**
   * Wipe the layout saved for `symbol` (or the active symbol if omitted).
   * Useful as an "Reset layout" command in user-facing menus.
   */
  clearSavedLayout(symbol?: string): void {
    if (!this.layoutKeyPrefix) return;
    const target = symbol ?? this.state.symbol;
    try {
      localStorage.removeItem(this.layoutKeyPrefix + target);
    } catch { /* localStorage may be unavailable (private mode, SSR, etc.) */ }
  }

  private applySymbolLayout(symbol: string): void {
    if (!this.layoutKeyPrefix) return;
    const key = this.layoutKeyPrefix + symbol;
    this.activeLayoutKey = key;

    try {
      // Best-effort load. If parsing or any restore step throws, we silently
      // fall back to a fresh layout — a corrupted layout shouldn't break the
      // chart.
      const ok = this.chart.loadStateFromStorage(key);
      if (ok) this.syncIndicatorsFromChart();
    } catch { /* swallow — layout will be rebuilt from user actions */ }

    // Wire chart-level auto-save so any further drawing/indicator change
    // flushes itself into this symbol's slot.
    this.chart.setAutoSave(key, this.layoutDebounceMs);
  }

  private flushActiveLayout(): void {
    if (!this.activeLayoutKey) return;
    try { this.chart.saveState(this.activeLayoutKey); } catch { /* same */ }
    this.chart.disableAutoSave();
    this.activeLayoutKey = null;
  }

  /** Rebuild the chip strip from the chart's indicator instances. */
  private syncIndicatorsFromChart(): void {
    const next = new Map<string, ActiveIndicatorInfo>();
    for (const a of this.chart.getActiveIndicators()) {
      next.set(a.instanceId, { id: a.id, label: indicatorChipLabel(a.id, a.params, a.descriptor.defaultConfig, a.descriptor.shortName) });
    }
    this.state = { ...this.state, activeIndicators: next };
    this.updateUI();
  }

  // --- Replay ---

  /** Open (or close) bar replay with its scrubber — what the toolbar's Replay button does. */
  toggleReplay(): void {
    if (this.replayBar?.isMounted()) {
      this.exitReplay();
    } else {
      this.enterReplay();
    }
  }

  /**
   * Open replay in "pick a start bar" mode: the bars right of the pointer
   * are shaded, and a click cuts the chart there and waits paused. Play
   * starts from a default point; "random bar" picks one.
   */
  private enterReplay(): void {
    if (this.replayTotal() < 2) return;

    const t = this.t;
    this.replayBar = new WidgetReplayBar(
      {
        onPlay: () => {
          if (this.replayBar?.getMode() === 'select') {
            this.startReplayAt(Math.max(1, this.replayTotal() - 100), true);
            return;
          }
          if (this.chart.getReplayState() === 'paused') this.chart.replayResume();
          this.replayBar?.setState('playing');
        },
        onPause: () => {
          this.chart.replayPause();
          this.replayBar?.setState('paused');
        },
        onStepBack: () => this.stepReplay(-1),
        onStepForward: () => this.stepReplay(1),
        onSeek: (idx) => {
          if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
          this.chart.replaySeek(idx);
          this.replayBar?.setState('paused');
        },
        onSpeedChange: (barsPerSecond) => {
          this.replaySpeed = barsPerSecond;
          this.chart.setReplaySpeed(barsPerSecond);
        },
        onRandomStart: () => {
          const n = this.replayTotal();
          // Somewhere in the middle 80%, so there is history before and bars after.
          const lo = Math.max(1, Math.floor(n * 0.1));
          const hi = Math.max(lo, Math.floor(n * 0.9));
          this.startReplayAt(lo + Math.floor(Math.random() * (hi - lo + 1)));
        },
        onClose: () => this.exitReplay(),
        onStepChange: (step) => {
          this.replayStep = step;
          if (this.replayBar?.getMode() !== 'replay') return;
          // Mid-replay: start again in the new steps from the bar before the
          // forming one (so the rest of it isn't given away), playing if it was.
          const playing = this.chart.getReplayState() === 'playing';
          this.startReplayAt(Math.max(0, this.chart.getReplayBarIndex() - 1), playing);
        },
      },
      {
        selectHint: t('replay.selectHint'),
        random: t('replay.random'),
        realtime: t('replay.realtime'),
        barsPerSecond: t('replay.barsPerSecond'),
        play: t('replay.play'),
        pause: t('replay.pause'),
        stepBack: t('replay.stepBack'),
        stepForward: t('replay.stepForward'),
        replay: t('replay.label'),
        position: t('replay.position'),
        speed: t('replay.speed'),
        step: t('replay.step'),
      },
    );
    const steps = [
      { value: 'bar', label: t('replay.step.bar') },
      ...this.replayStepOptions().map((tf) => ({ value: tf, label: tf })),
    ];
    if (!steps.some((s) => s.value === this.replayStep)) this.replayStep = 'bar';
    this.replayBar.mount(this.chartContainer, { total: this.replayTotal(), speed: this.replaySpeed, mode: 'select', steps, step: this.replayStep });

    this.replayShade = document.createElement('div');
    this.replayShade.className = 'tcw-replay-shade';
    this.replayShade.hidden = true;
    this.chartContainer.appendChild(this.replayShade);
    this.chartContainer.addEventListener('mouseleave', this.hideReplayShade);
  }

  private readonly hideReplayShade = (): void => this.positionReplayShade(null);

  /**
   * Open replay (if it isn't open) and start it at bar `index` — paused, or
   * playing when `play` is set — skipping the pick-a-bar step.
   */
  replayFrom(index: number, play = false): void {
    if (!this.replayBar?.isMounted()) this.enterReplay();
    this.startReplayAt(index, play);
  }

  /** Cut the chart at `index` and wait paused (or play at once). */
  private startReplayAt(index: number, play = false): void {
    const bar = this.replayBar;
    if (!bar) return;
    const n = this.replayTotal();
    const start = Math.max(0, Math.min(Number.isFinite(index) ? Math.floor(index) : 0, n - 1));
    this.replayShade?.remove();
    this.replayShade = null;
    this.chartContainer.removeEventListener('mouseleave', this.hideReplayShade);
    bar.setMode('replay');
    // A newer start (a quicker step choice) wins over one still fetching its steps.
    const seq = ++this.replayStartSeq;
    const go = (steps: DataSeries | null) => {
      if (this.destroyed || this.replayBar !== bar || !bar.isMounted() || seq !== this.replayStartSeq) return;
      this.chart.replayStart({ speed: this.replaySpeed, interval: 1000, startIndex: start, paused: true, ...(steps ? { steps } : {}) });
      if (play) this.chart.replayResume();
      bar.setState(play ? 'playing' : 'paused');
      this.syncReplayBar();
      if (this.replayPollInterval) clearInterval(this.replayPollInterval);
      this.replayPollInterval = setInterval(() => this.syncReplayBar(), 150);
    };
    if (this.replayStep === 'bar') {
      go(null);
      return;
    }
    void this.replayStepsFor(this.replayStep as TimeFrame).then((steps) => {
      if (seq !== this.replayStartSeq) return; // a newer start took over
      if (!steps) this.toast(this.t('replay.stepsFailed'), 'error');
      go(steps);
    });
  }

  /** Finer intervals a replay can step through: they divide the chart's, and the feed (or the bars loaded) has them. */
  private replayStepOptions(): TimeFrame[] {
    const current = timeframeToMs(this.state.timeframe);
    return REPLAY_STEP_CANDIDATES.filter((tf) => {
      const ms = timeframeToMs(tf);
      if (!(ms < current) || current % ms !== 0) return false;
      if (this.adapter) return servesTimeframe(this.adapter, tf);
      return this.baseSeries !== null && this.baseTimeframeMs > 0 && ms >= this.baseTimeframeMs && ms % this.baseTimeframeMs === 0;
    });
  }

  /** The finer bars for a replay in `tf` steps: from the feed, or built from the bars loaded. Null when there are none. */
  private async replayStepsFor(tf: TimeFrame): Promise<DataSeries | null> {
    const key = `${this.state.symbol}|${this.state.timeframe}|${tf}`;
    if (this.replayStepsCache?.key === key) return this.replayStepsCache.steps;
    let steps: DataSeries | null = null;
    if (this.adapter) {
      const ratio = Math.max(1, Math.round(timeframeToMs(this.state.timeframe) / timeframeToMs(tf)));
      const limit = Math.min(MAX_REPLAY_STEPS, Math.max(this.chart.getData().length, 100) * ratio);
      try {
        steps = await withResampling(this.adapter).fetchHistory(this.state.symbol, tf, limit);
      } catch {
        steps = null;
      }
    } else if (this.baseSeries) {
      steps = timeframeToMs(tf) === this.baseTimeframeMs ? this.baseSeries : resampleOHLCV(this.baseSeries, tf);
    }
    if (!steps || steps.length === 0) return null;
    this.replayStepsCache = { key, steps };
    return steps;
  }

  /** Bars available to replay: the whole series, not the slice on screen. */
  private replayTotal(): number {
    return this.chart.isReplayActive() ? this.chart.getReplayProgress().total : this.chart.getData().length;
  }

  /** Mirror the replay engine in the bar; close it if the session ended elsewhere. */
  private syncReplayBar(): void {
    const bar = this.replayBar;
    if (!bar?.isMounted() || bar.getMode() !== 'replay') return;
    if (!this.chart.isReplayActive()) {
      // e.g. a symbol or timeframe switch replaced the series.
      this.teardownReplayUi();
      return;
    }
    const p = this.chart.getReplayProgress();
    const state = this.chart.getReplayState();
    bar.setProgress(p.current, p.total);
    bar.setState(state === 'stopped' ? 'paused' : state);
    bar.setEnded(state !== 'playing' && p.total > 0 && p.current >= p.total - 1);
  }

  private stepReplay(delta: number): void {
    if (this.replayBar?.getMode() !== 'replay') return;
    const p = this.chart.getReplayProgress();
    if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
    this.chart.replaySeek(Math.max(0, Math.min(p.total - 1, p.current + delta)));
    this.replayBar.setState('paused');
    this.syncReplayBar();
  }

  /** Replay shortcuts: Shift+←/→ step one bar; Escape cancels picking a start bar. */
  private handleReplayKey(e: KeyboardEvent): boolean {
    if (e.defaultPrevented) return false;
    const active = document.activeElement as HTMLElement | null;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
      return false;
    }
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && this.replayBar?.getMode() === 'replay') {
      e.preventDefault();
      // The chart's own Shift+Arrow scrolls ten bars; this one steps the replay.
      e.stopPropagation();
      this.stepReplay(e.key === 'ArrowRight' ? 1 : -1);
      return true;
    }
    if (e.key === 'Escape' && this.replayBar?.getMode() === 'select') {
      this.exitReplay();
      return true;
    }
    return false;
  }

  private positionReplayShade(x: number | null): void {
    const shade = this.replayShade;
    if (!shade) return;
    const plot = this.chart.getPlotRect();
    if (x === null || x < plot.x || x > plot.x + plot.width) {
      shade.hidden = true;
      return;
    }
    shade.hidden = false;
    shade.style.left = `${x}px`;
    shade.style.top = `${plot.y}px`;
    shade.style.width = `${plot.x + plot.width - x}px`;
    shade.style.height = `${plot.height}px`;
  }

  /** Leave replay and return to the live series (with updates that arrived meanwhile). */
  private exitReplay(): void {
    this.teardownReplayUi();
    this.chart.replayStop();
  }

  private teardownReplayUi(): void {
    if (this.replayPollInterval) {
      clearInterval(this.replayPollInterval);
      this.replayPollInterval = null;
    }
    this.replayShade?.remove();
    this.replayShade = null;
    this.chartContainer.removeEventListener('mouseleave', this.hideReplayShade);
    this.replayBar?.unmount();
    this.replayBar = null;
  }

  private applySettings(patch: Partial<ChartSettingsState>): void {
    this.settingsState = { ...this.settingsState, ...patch };
    if (patch.scaleMode !== undefined || patch.logScale !== undefined || patch.invertScale !== undefined) this.layoutSession?.changed();
    this.scheduleLegend(); // the OHLCV legend's rows and the locale move or reword it

    if (patch.gridVisible !== undefined) this.chart.setGridVisible(patch.gridVisible);
    if (patch.volumeVisible !== undefined) this.chart.setVolumeVisible(patch.volumeVisible);
    if (patch.volumeProfileVisible !== undefined) this.chart.setVolumeProfileVisible(patch.volumeProfileVisible);
    if (patch.marketProfileVisible !== undefined) this.chart.setMarketProfileVisible(patch.marketProfileVisible);
    if (patch.marketProfileSplit !== undefined) this.chart.setMarketProfileConfig({ splitBySession: patch.marketProfileSplit });
    if (patch.marketProfileLetters !== undefined) this.chart.setMarketProfileConfig({ letters: patch.marketProfileLetters });
    if (patch.marketProfileBuckets !== undefined) this.chart.setMarketProfileConfig({ buckets: patch.marketProfileBuckets });
    if (patch.marketProfileOpacity !== undefined) this.chart.setMarketProfileConfig({ opacity: patch.marketProfileOpacity });
    if (patch.depthHeatmapVisible !== undefined) this.chart.setDepthHeatmapVisible(patch.depthHeatmapVisible);
    if (patch.depthHeatmapOpacity !== undefined) this.chart.setDepthHeatmapConfig({ opacity: patch.depthHeatmapOpacity });
    if (patch.sessionShadingVisible !== undefined) this.chart.setSessionShadingVisible(patch.sessionShadingVisible);
    if (patch.pivotMarkersVisible !== undefined) this.chart.setPivotMarkersVisible(patch.pivotMarkersVisible);
    if (patch.pivotStrength !== undefined) this.chart.setPivotMarkersConfig({ left: patch.pivotStrength, right: patch.pivotStrength });
    if (patch.pivotStructureLabels !== undefined) this.chart.setPivotMarkersConfig({ structureLabels: patch.pivotStructureLabels });
    if (patch.periodLevelsVisible !== undefined) this.chart.setPeriodLevelsVisible(patch.periodLevelsVisible);
    if (patch.periodLevelsPeriod !== undefined) this.chart.setPeriodLevelsPeriod(patch.periodLevelsPeriod);
    if (patch.legendVisible !== undefined) this.chart.setLegend({ visible: patch.legendVisible });
    if (patch.barCountdown !== undefined) this.chart.setBarCountdownVisible(patch.barCountdown);
    if (patch.indicatorValueLabels !== undefined) this.chart.setIndicatorValueLabelsVisible(patch.indicatorValueLabels);
    if (patch.crosshairMode !== undefined) this.chart.setCrosshairMode(patch.crosshairMode);
    if (patch.autoScale !== undefined) this.chart.setAutoScale(patch.autoScale);
    if (patch.invertScale !== undefined) this.chart.setInvertScale(patch.invertScale);
    if (patch.leftPriceScale !== undefined) this.chart.setLeftPriceScaleVisible(patch.leftPriceScale);
    if (patch.scaleMode !== undefined) {
      this.chart.setScaleMode(patch.scaleMode);
      // Keep the legacy logScale flag mirrored so persisted layouts stay valid.
      this.settingsState = { ...this.settingsState, logScale: patch.scaleMode === 'logarithmic' };
    } else if (patch.logScale !== undefined) {
      this.chart.setLogScale(patch.logScale);
      this.settingsState = { ...this.settingsState, scaleMode: patch.logScale ? 'logarithmic' : 'regular' };
    }
    if (patch.numberLocale !== undefined) {
      this.chart.setNumberLocale(patch.numberLocale);
      this.watchlist?.setLocale(patch.numberLocale || undefined);
    }
    if (patch.timezone !== undefined) {
      this.chart.setTimezone(settingToTimezone(patch.timezone));
    }
    if (patch.highLowLines !== undefined) this.chart.setHighLowLines(patch.highLowLines);
    if (patch.extendedHours !== undefined) this.chart.setExtendedHours(patch.extendedHours);
    if (patch.mainSeriesVisible !== undefined) this.chart.setMainSeriesVisible(patch.mainSeriesVisible);
    if (patch.chartTypeOptions !== undefined) {
      // Every type: one left out goes back to its defaults (a reset).
      this.chart.setChartTypeOptions({ renko: {}, lineBreak: {}, kagi: {}, pointAndFigure: {}, rangeBars: {}, ...patch.chartTypeOptions });
    }

    // Apply theme colors
    const currentTheme = this.chart.getTheme();
    const themeUpdate = { ...currentTheme } as Record<string, unknown>;
    let themeChanged = false;

    if (patch.candleUpColor !== undefined) { themeUpdate.candleUp = patch.candleUpColor; themeChanged = true; }
    if (patch.candleDownColor !== undefined) { themeUpdate.candleDown = patch.candleDownColor; themeChanged = true; }
    if (patch.candleUpWick !== undefined) { themeUpdate.candleUpWick = patch.candleUpWick; themeChanged = true; }
    if (patch.candleDownWick !== undefined) { themeUpdate.candleDownWick = patch.candleDownWick; themeChanged = true; }
    if (patch.backgroundColor !== undefined) { themeUpdate.background = patch.backgroundColor; themeChanged = true; }
    if (patch.gridColor !== undefined) { themeUpdate.grid = patch.gridColor; themeChanged = true; }

    if (themeChanged) {
      this.chart.setTheme(themeUpdate as unknown as Theme);
    }
  }

  private resetSettings(): void {
    const before = { ...this.settingsState };
    this.settingsState = { ...this.settingsDefaults };
    this.applySettings(this.settingsState);
    const after = { ...this.settingsState };
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    this.chart.recordUndo({ undo: () => this.restoreSettings(before), redo: () => this.restoreSettings(after) });
  }

  /**
   * A settings change the user made: applied, and put in the chart's undo
   * history with its drawings and indicators. A burst on the same settings
   * (a colour dragged across the picker) is one step.
   */
  private changeSettings(patch: Partial<ChartSettingsState>): void {
    const keys = Object.keys(patch) as (keyof ChartSettingsState)[];
    // The scale mode and the legacy log flag move together.
    if (keys.includes('scaleMode') || keys.includes('logScale')) {
      for (const k of ['scaleMode', 'logScale'] as const) if (!keys.includes(k)) keys.push(k);
    }
    const pick = (): Partial<ChartSettingsState> => Object.fromEntries(keys.map((k) => [k, this.settingsState[k]]));
    const before = pick();
    this.applySettings(patch);
    const after = pick();
    if (JSON.stringify(before) === JSON.stringify(after)) return;
    this.chart.recordUndo({
      subject: `settings:${Object.keys(patch).sort().join(',')}`,
      undo: () => this.restoreSettings(before),
      redo: () => this.restoreSettings(after),
    });
  }

  /** Settings back as they were (an undo or redo), shown in the settings if they're open. */
  private restoreSettings(values: Partial<ChartSettingsState>): void {
    this.applySettings(values);
    this.settings?.refresh(this.settingsState);
  }

  private async connectStream(): Promise<void> {
    if (!this.adapter) return;
    const seq = ++this.connectSeq;

    this.state = {
      ...this.state,
      connectionState: 'connecting',
      connectionMessage: this.t('status.connecting'),
    };
    this.updateUI();
    // Keep the previous chart up while the next one loads; it only gets the
    // veil if the request is slow (see WidgetLoadingOverlay).
    this.loading.begin(this.chart.getData().length > 0);

    try {
      this.chart.disconnectStream();
      await this.chart.connect({
        adapter: this.adapter,
        symbol: this.state.symbol,
        timeframe: this.state.timeframe,
        historyLimit: this.options.historyLimit ?? 500,
        historyPageSize: this.options.historyPageSize,
      });
      // A newer switch started while this one was loading — it owns the UI now.
      if (seq !== this.connectSeq || this.destroyed) return;

      this.chart.setWatermark(this.state.symbol.replace('USDT', ' / USDT'), {
        fontSize: 48,
        color: this.state.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      });

      // Re-apply per-symbol layout (indicators, drawings, chart type) after
      // the new history is in. Doing this *after* connect ensures indicators
      // recalculate against the loaded data, not the previous symbol's data.
      this.applySymbolLayout(this.state.symbol);

      if (this.loading.hasFailed()) {
        // History failed to load; the stream keeps retrying and the next
        // snapshot ends the loading state (handleDataUpdate).
        this.state = { ...this.state, connectionState: 'error' };
      } else {
        this.loading.end();
        this.state = {
          ...this.state,
          connectionState: 'connected',
          connectionMessage: this.t('status.live'),
        };
      }

      // Re-pull comparison overlays at the (possibly new) timeframe so they
      // stay aligned with the main series. Drop the active symbol if it ended
      // up in the compare set after a symbol switch.
      void this.refetchCompares();
    } catch (err: unknown) {
      if (seq !== this.connectSeq || this.destroyed) return;
      this.loading.fail(this.t('status.connectionFailed'));
      this.state = {
        ...this.state,
        connectionState: 'error',
        connectionMessage: err instanceof Error ? err.message : this.t('status.connectionFailed'),
      };
    }

    this.updateUI();
  }

  /** Redraw the on-chart indicator list on the next frame (coalesced). */
  private scheduleLegend(): void {
    if (!this.indicatorLegend || this.legendFrame) return;
    this.legendFrame = requestAnimationFrame(() => {
      this.legendFrame = 0;
      this.renderLegend();
    });
  }

  private renderLegend(): void {
    if (!this.indicatorLegend || this.destroyed) return;
    const last = this.chart.getData().length - 1;
    // Renko, Kagi and the like redraw the series: the hovered bar is not a
    // data bar, so their values stay on the latest one.
    const hover = this.chart.isTimeAligned() ? this.legendHoverIndex : null;
    const idx = hover === null ? last : Math.min(Math.max(hover, 0), last);
    // Each pane's indicators, its own first, stacked down from its top.
    const panes = new Map<string, { x: number; y: number; width: number; height: number; row: number }>();
    for (const pane of this.chart.getIndicatorPanes()) {
      (pane.instanceIds ?? [pane.instanceId]).forEach((id, row) => panes.set(id, { ...pane.rect, row }));
    }
    const locale = this.settingsState.numberLocale || 'en-US';
    const rows: IndicatorLegendRow[] = this.chart.getActiveIndicators().map((ind) => {
      const pane = panes.get(ind.instanceId) ?? null;
      const point = idx >= 0 ? this.chart.getIndicatorOutput(ind.instanceId)?.series?.[idx] : null;
      const colors = this.chart.getIndicatorStyle(ind.instanceId)?.colors ?? [];
      const values = legendValues(ind.descriptor, point, colors);
      return {
        instanceId: ind.instanceId,
        label: indicatorChipLabel(ind.id, ind.params, ind.descriptor.defaultConfig, ind.descriptor.shortName),
        visible: ind.visible,
        values: values.map((v) => ({
          text: pane ? formatIndicatorValue(v.value, locale) : this.chart.formatPrice(v.value),
          color: v.color,
        })),
        pane: pane
          ? {
            x: pane.x + LEGEND_INSET,
            // A short pane with many indicators: the last rows overlap rather than spill out.
            y: pane.y + Math.min(PANE_ROW_TOP + pane.row * PANE_ROW_STEP, Math.max(PANE_ROW_TOP, pane.height - PANE_ROW_STEP)),
            width: pane.width - 2 * LEGEND_INSET,
          }
          : null,
      };
    });
    const plot = this.chart.getPlotRect();
    const maximized = this.chart.getMaximizedPane();
    const labelOf = (id: string) => rows.find((r) => r.instanceId === id)?.label ?? '';
    // As the panes show: one maximised folds the others.
    const paneControls: IndicatorLegendPane[] = this.chart.getIndicatorPanes().map((pane) => ({
      instanceId: pane.instanceId,
      x: pane.rect.x + pane.rect.width - LEGEND_INSET,
      y: pane.rect.y + PANE_CONTROLS_TOP,
      label: labelOf(pane.instanceId),
      collapsed: this.chart.isPaneCollapsed(pane.instanceId),
      maximized: maximized === pane.instanceId,
      canMoveUp: this.chart.canMovePane(pane.instanceId, -1),
      canMoveDown: this.chart.canMovePane(pane.instanceId, 1),
    }));
    this.indicatorLegend.update(rows, { left: plot.x + LEGEND_INSET, top: this.chart.getLegendBottom() + 1 }, paneControls);
  }

  /** A pane's button on the chart. */
  private runPaneAction(instanceId: string, action: PaneAction): void {
    if (action === 'up' || action === 'down') this.chart.movePane(instanceId, action === 'up' ? -1 : 1);
    else if (action === 'collapse' || action === 'expand') this.chart.setPaneCollapsed(instanceId, action === 'collapse');
    else this.chart.setMaximizedPane(action === 'maximize' ? instanceId : null);
    this.scheduleLegend();
  }

  /**
   * An indicator's "more" menu: into the pane above or below it (the price
   * pane at the top), a pane of its own, back to the price pane; then its
   * settings and remove.
   */
  private openLegendMenu(instanceId: string, anchor: HTMLElement): void {
    const menu = this.legendMenu;
    if (!menu) return;
    if (menu.isOpen()) {
      menu.close();
      return;
    }
    // The price pane, then each indicator pane top to bottom.
    const places = ['price', ...this.chart.getIndicatorPanes().map((p) => p.instanceId)];
    const at = 1 + this.chart.getIndicatorPanes().findIndex((p) => p.instanceIds.includes(instanceId));
    const above = places[at - 1];
    const below = places[at + 1];
    const can = (target: string | undefined) => target !== undefined && this.chart.canMoveIndicatorToPane(instanceId, target);
    const entries: ContextMenuEntry[] = [];
    if (can(above)) entries.push({ id: `move:${above}`, label: this.t(above === 'price' ? 'legend.movePrice' : 'legend.moveUp'), icon: 'arrowUp' });
    if (can(below)) entries.push({ id: `move:${below}`, label: this.t('legend.moveDown'), icon: 'arrowDown' });
    if (can('new')) entries.push({ id: 'move:new', label: this.t('legend.moveNew'), icon: 'plus' });
    if (above !== 'price' && can('price')) entries.push({ id: 'move:price', label: this.t('legend.movePrice'), icon: 'trendingUp' });
    if (entries.length > 0) entries.push('separator');
    entries.push(
      { id: 'settings', label: this.t('legend.settings'), icon: 'settings' },
      { id: 'remove', label: this.t('legend.remove'), icon: 'trash', danger: true },
    );
    const box = anchor.getBoundingClientRect();
    const root = this.root.getBoundingClientRect();
    menu.open(entries, box.left - root.left, box.bottom - root.top + 2, (id) => {
      if (id === 'settings') this.openIndicatorSettings(instanceId);
      else if (id === 'remove') this.handleRemoveIndicator(instanceId);
      else if (id.startsWith('move:')) this.chart.moveIndicatorToPane(instanceId, id.slice('move:'.length));
      this.scheduleLegend();
    }, anchor);
  }

  private updateUI(): void {
    this.scheduleLegend();
    this.toolbar?.update(this.state);
    this.sidebar?.update(this.state);
    this.statusBar?.update({
      connectionState: this.state.connectionState,
      message: this.state.connectionMessage,
      symbol: this.state.symbol,
      timeframe: this.state.timeframe,
    });
  }

  private resolveIsDark(theme?: import('@tradecanvas/commons').ThemeName | Theme): boolean {
    if (theme === undefined || theme === 'dark') return true;
    if (theme === 'light') return false;
    // If it's a Theme object, check background color
    if (typeof theme === 'object' && theme.background) {
      return this.isColorDark(theme.background);
    }
    return true;
  }

  private resolveTheme(theme?: import('@tradecanvas/commons').ThemeName | Theme): Theme {
    if (theme === undefined || theme === 'dark') return DARK_THEME;
    if (theme === 'light') return LIGHT_THEME;
    if (typeof theme === 'object') return theme as Theme;
    return DARK_THEME;
  }

  private isColorDark(color: string): boolean {
    // Simple heuristic: if it starts with # and R+G+B < 384 (half of 768)
    if (color.startsWith('#') && color.length >= 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return (r + g + b) < 384;
    }
    return true;
  }
}

export { indicatorChipLabel };

type ActiveIndicator = ReturnType<Chart['getActiveIndicators']>[number];

/** How `addCompareSymbol` compares: percent change on the price scale, its own scale or pane, spread, ratio. */
export type CompareWay = 'percent' | 'scale' | 'pane' | 'spread' | 'ratio';

/**
 * The lines `instanceId` can be computed from: every drawn line of the other
 * indicators, except those that already read from it (that would be a loop).
 */
export function lineSourcesFor(instanceId: string, active: readonly ActiveIndicator[]): { value: string; label: string }[] {
  const readsFrom = (ind: ActiveIndicator): string | null => {
    const name = sourceParam(ind.descriptor);
    return (name && parseIndicatorSource(ind.params[name])?.instanceId) || null;
  };
  // Everything downstream of `instanceId`.
  const downstream = new Set([instanceId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const ind of active) {
      const from = readsFrom(ind);
      if (from && downstream.has(from) && !downstream.has(ind.instanceId)) {
        downstream.add(ind.instanceId);
        grew = true;
      }
    }
  }
  const out: { value: string; label: string }[] = [];
  for (const ind of active) {
    if (downstream.has(ind.instanceId)) continue;
    const name = indicatorChipLabel(ind.id, ind.params, ind.descriptor.defaultConfig, ind.descriptor.shortName);
    for (const plot of ind.descriptor.plots ?? []) {
      out.push({ value: indicatorSource(ind.instanceId, plot.key), label: `${name}: ${plot.title}` });
    }
  }
  return out;
}

/** The page's localStorage, or null where it can't be used (private mode, SSR). */
function browserStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const NEWS_LIMIT = 10;
const NEWS_TTL_MS = 5 * 60_000;
const DAY_MS = 86_400_000;

/**
 * The latest day in the bars, in the exchange's zone (UTC when it has none):
 * its open, range, volume and last close, and the close before it.
 */
function sessionDay(
  bars: readonly { time: number; open: number; high: number; low: number; close: number; volume?: number }[],
  zone: string | undefined,
): { open: number; high: number; low: number; close: number; volume: number; prevClose?: number } | null {
  if (bars.length === 0) return null;
  const tz = zone && isValidTimeZone(zone) ? zone : null;
  const dayOf = (t: number) => {
    const ms = t < 1e11 ? t * 1000 : t; // bars timed in seconds
    return Math.floor((ms + (tz ? zoneOffsetMinutes(tz, ms) * 60_000 : 0)) / DAY_MS);
  };
  const last = bars[bars.length - 1];
  const today = dayOf(last.time);
  let first = bars.length - 1;
  while (first > 0 && dayOf(bars[first - 1].time) === today) first--;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  for (let i = first; i < bars.length; i++) {
    high = Math.max(high, bars[i].high);
    low = Math.min(low, bars[i].low);
    volume += bars[i].volume ?? 0;
  }
  return { open: bars[first].open, high, low, close: last.close, volume, prevClose: first > 0 ? bars[first - 1].close : undefined };
}

/** "in 3 hours", "5 minutes ago": the nearest whole minutes, hours or days. */
function relativeTime(deltaMs: number, locale: string): string {
  const minutes = deltaMs / 60_000;
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] = Math.abs(minutes) < 60
    ? [Math.round(minutes) || Math.sign(minutes) || 1, 'minute']
    : Math.abs(minutes) < 48 * 60
      ? [Math.round(minutes / 60), 'hour']
      : [Math.round(minutes / 1440), 'day'];
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
  } catch {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(value, unit);
  }
}

function compactNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
}

/** "09:30–16:00 Mon–Fri", from a symbol's sessions; undefined without any. */
function sessionsText(info: SymbolInfo | null, locale: string): string | undefined {
  const sessions = info?.sessions ?? [];
  if (sessions.length === 0) return undefined;
  let names: string[];
  try {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    names = Array.from({ length: 7 }, (_, d) => format.format(Date.UTC(1970, 0, 4 + d))); // 4 Jan 1970 was a Sunday
  } catch {
    names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
  const daysText = (days: number[] | undefined): string => {
    const list = [...new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
    if (list.length === 0 || list.length === 7) return '';
    const contiguous = list.every((d, i) => i === 0 || d === list[i - 1] + 1);
    return contiguous && list.length > 2 ? `${names[list[0]]}–${names[list[list.length - 1]]}` : list.map((d) => names[d]).join(', ');
  };
  return sessions.map((s) => [`${s.start}–${s.end}`, daysText(s.days)].filter(Boolean).join(' ')).join(', ');
}
