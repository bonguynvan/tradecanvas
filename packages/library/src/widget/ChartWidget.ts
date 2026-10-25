import type { ChartType, DataUpdatePayload, DrawingToolType, FeaturesConfig, HistoryLoadPayload, Quote, QuoteSource, SymbolInfo, Theme, TimeFrame, TimeZoneSetting } from '@tradecanvas/commons';
import { barTimeUnit, marketStatus, offsetAt, readQuote, stepDecimals, tickBarCount, tzLabel } from '@tradecanvas/commons';
import { settingToTimezone, timezoneOptions, timezoneToSetting } from './widgetTimezones.js';
import { installFormControls } from './formControls.js';
import { Chart } from '../Chart.js';
import { DARK_THEME, LIGHT_THEME, indicatorSource, parseIndicatorSource } from '@tradecanvas/commons';
import type { ActiveIndicatorInfo, ChartWidgetOptions, WidgetState, ChartSettingsState, SettingsStylePatch, WidgetPanel } from './types.js';
import { CHART_TYPES, DRAWING_TOOL_GROUPS, DEFAULT_SYMBOLS, DEFAULT_SETTINGS } from './widgetConfig.js';
import { SETTINGS_LOOK_KEYS } from './widgetSettingsLook.js';
import { injectWidgetStyles, removeWidgetStyles } from './WidgetStyles.js';
import { WidgetToolbar } from './WidgetToolbar.js';
import { setHostButtonActive, setHostButtonText } from './hostButtons.js';
import { WidgetDrawingSidebar } from './WidgetDrawingSidebar.js';
import { WidgetSettings, type SettingsTab } from './WidgetSettings.js';
import { WidgetStatusBar } from './WidgetStatusBar.js';
import { WidgetCommandPalette } from './WidgetCommandPalette.js';
import { WidgetSymbolSearch, type SymbolSearchFn } from './WidgetSymbolSearch.js';
import { WidgetHotkeySheet } from './WidgetHotkeySheet.js';
import { MOD_KEY } from './platformKeys.js';
import { WidgetReplayBar, DEFAULT_REPLAY_SPEED } from './WidgetReplayBar.js';
import { WidgetWatchlist, type WatchlistEntry } from './WidgetWatchlist.js';
import { WatchlistStore, type WatchlistList } from './WatchlistStore.js';
import { WidgetSymbolInfo, type SymbolInfoView } from './WidgetSymbolInfo.js';
import { SymbolNews, buildSymbolInfoView } from './symbolInfoView.js';
import { TOOL_HOTKEYS, toolShortcuts } from './drawingHotkeys.js';
import { WidgetChartNav } from './WidgetChartNav.js';
import { WidgetAlertsPanel, describeAlert, type AlertListItem, type AlertSource } from './WidgetAlertsPanel.js';
import { indicatorChipLabel } from '../indicatorLabel.js';
import { readChartTypeOptions } from '@tradecanvas/commons';
import { applyWidgetUI, resolveWidgetUI, typeSize, type ResolvedWidgetUI, type WidgetUIPreset, type WidgetUITheme } from './widgetUI.js';
import { WidgetObjectTree, drawingTypeLabel } from './WidgetObjectTree.js';
import { WidgetIndicatorSettings, type IndicatorDefault } from './WidgetIndicatorSettings.js';
import { WidgetIndicatorPicker, type IndicatorPickerItem } from './WidgetIndicatorPicker.js';
import { IndicatorDefaultsStore } from './indicatorDefaults.js';
import { ChartTemplateStore } from './chartTemplates.js';
import { WidgetDrawingStyle } from './WidgetDrawingStyle.js';
import { WidgetSelectionToolbar } from './WidgetSelectionToolbar.js';
import { DrawingDefaultsStore, DrawingTemplateStore } from './DrawingTemplateStore.js';
import { WidgetDrawingSettings, type DrawingTemplateLook } from './WidgetDrawingSettings.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import { drawingMenuEntries, type DrawingMenuAction } from './drawingMenu.js';
import { CHART_MENU_KEYS, TIMEZONE_ENTRY, chartMenuEntries, priceEntries, scaleModeOf, type ChartMenuAction, type ChartMenuContext } from './chartMenu.js';
import { WidgetAccountPanel } from './WidgetAccountPanel.js';
import { WidgetOrderTicket } from './WidgetOrderTicket.js';
import type { OrderTicketRules } from './orderTicket.js';
import { WidgetLayoutsUI } from './WidgetLayoutsUI.js';
import { WidgetNamePrompt } from './WidgetNamePrompt.js';
import { WidgetIntervalInput } from './WidgetIntervalInput.js';
import { IndicatorTemplateStore } from './indicatorTemplates.js';
import { isKeyTarget, isTyping, registerKeyRoot } from './keyTarget.js';
import { layoutChartState, readWidgetLayout, parseLayoutJson, type WidgetLayoutContent } from './widgetLayout.js';
import { LayoutSession } from '../state/LayoutSession.js';
import { localStorageLayouts, type SavedLayout } from '../state/layoutStorage.js';
import { DrawingFavoritesStore } from './DrawingFavoritesStore.js';
import { createIcon } from './icons.js';
import { watchKeyboardInset } from './keyboardInset.js';
import { NARROW_WIDGET_PX, watchNarrow } from './narrowMode.js';
import {
  availableTimeframes,
  initialTimeframeFavorites,
  parseTimeframeInput,
  timeframeForRange,
  timeframeLabel,
  withExtraTimeframes,
} from './widgetTimeframes.js';
import { WidgetGoToDate, utcToWallTime, wallTimeToUtc, type GoToTarget } from './WidgetGoToDate.js';
import { WidgetDock } from './WidgetDock.js';
import { comparedEntries, compareWayOptions, isCompareWay, type CompareWay } from './widgetCompare.js';
import { WidgetTooltip } from './WidgetTooltip.js';
import { WidgetIndicatorLegend, type IndicatorLegendPane, type IndicatorLegendRow, type PaneAction } from './WidgetIndicatorLegend.js';
import { formatIndicatorValue, legendValues } from './legendValues.js';
import { RANGE_PRESETS, SYMBOL_INDICATOR_IDS, indicatorCategory, rangePresetStart, servesTimeframe, sourceParam, withResampling, type RangePreset } from '@tradecanvas/core';
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
import { pickHostItem, withHostItems } from './hostMenus.js';
import { isChartKey, matchesHotkey, parseHotkey, typedIntoField, type ParsedHotkey } from './hostHotkeys.js';
import { CHART_STYLE_KEYS, type ChartStyleKey } from '@tradecanvas/commons';
import {
  markPart,
  commandFeature,
  CHART_MENU_FEATURES,
  DRAWING_MENU_FEATURES,
  filterMenuEntries,
  offFeatures,
  readWidgetFeatures,
  resolveWidgetFeatures,
  type WidgetFeature,
  type WidgetFeatureState,
  type WidgetFeatures,
} from './widgetFeatures.js';

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

/** A day: bars this long or longer have no time of day to go to. */
const DAY_MS = 86_400_000;

/** The switch each of the dock's panels, but the watchlist (an option), goes with. */
const PANEL_FEATURES = {
  alerts: 'alerts',
  objectTree: 'objectTree',
  dataWindow: 'dataWindow',
  symbolInfo: 'symbolInfo',
  depthLadder: 'depthLadder',
} as const satisfies Record<Exclude<WidgetPanel, 'watchlist'>, WidgetFeature>;

/** Money is written to the price step's decimals, but to no more than these. */
const MONEY_DECIMALS = 2;

/** The toolbar's button for a panel, where it has one. */
const PANEL_TOOLBAR_ROLES: Partial<Record<WidgetPanel, string>> = { alerts: 'alerts', objectTree: 'objects', symbolInfo: 'symbolInfo', depthLadder: 'trade' };

/**
 * The Latin letter a plain key press types, for a symbol search started on
 * the chart; null for anything else (a modifier held, Alt Gr, an input
 * method composing). On another script's keyboard the letter of the key's
 * place: tickers are Latin.
 */
function typedLetter(e: KeyboardEvent): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.keyCode === IME_KEY_CODE) return null;
  if (e.getModifierState?.('AltGraph')) return null;
  if (/^[a-z]$/i.test(e.key)) return e.key;
  const place = /^Key([A-Z])$/.exec(e.code ?? '');
  // A single character of another script; not a named key such as Enter or F5.
  return place && [...e.key].length === 1 && !/[\s\d]/.test(e.key) ? place[1].toLowerCase() : null;
}

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

/** `keyCode` of a key press that goes to an IME composing text. */
const IME_KEY_CODE = 229;
/** How often the status bar's clock moves on. */
const CLOCK_TICK_MS = 1000;
/** The settings' style keys that aren't colours: they go with the user from theme to theme. */
const LOOK_KEYS: readonly ChartStyleKey[] = SETTINGS_LOOK_KEYS.filter((key) => CHART_STYLE_KEYS[key] !== 'color');

/** The widget pressed last: with several on a page, Alt+ shortcuts act on that one. */



/** Whether the page is hidden: another tab, the app in the background. */
const pageHidden = (): boolean => typeof document !== 'undefined' && document.hidden;

/** Recent bars looked at to tell a market open on weekends. */
const WEEKDAY_SAMPLE = 200;

export class ChartWidget {
  private chart: Chart;
  private state: WidgetState;
  /** The theme for each mode: the host's own where it gave one, so the toggle brings it back. */
  private themeOf: { dark: Theme; light: Theme } = { dark: DARK_THEME, light: LIGHT_THEME };
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
  private stopKeyboardInset: (() => void) | null = null;
  /** Keeps `data-tcw-narrow` on the root while the widget is phone-narrow. */
  private stopNarrow: (() => void) | null = null;
  /** The widget's own lists and calendar for its selects and date fields. */
  private stopFormControls: (() => void) | null = null;
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
  /** The panels by the chart (watchlist, alerts, objects, data window, symbol info) and their rail. */
  private dock: WidgetDock | null = null;
  /** Whether the widget was narrow when the dock last looked (null: not yet). */
  private dockNarrow: boolean | null = null;
  /** Follows the widget's width for the dock. */
  private dockObserver: ResizeObserver | null = null;
  private hotkeySheet: WidgetHotkeySheet | null = null;
  private replayBar: WidgetReplayBar | null = null;
  private dragDrop: DragDropImporter | null = null;
  private alertsPanel: WidgetAlertsPanel | null = null;
  private objectTree: WidgetObjectTree | null = null;
  private indicatorSettings: WidgetIndicatorSettings | null = null;
  private indicatorPicker: WidgetIndicatorPicker | null = null;
  private drawingStyle: WidgetDrawingStyle | null = null;
  private drawingSettings: WidgetDrawingSettings | null = null;
  private drawingMenu: WidgetContextMenu | null = null;
  private selectionToolbar: WidgetSelectionToolbar | null = null;
  private selectionToolbarFrame: number | null = null;
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
  /** The chart templates of the settings' Template menu, and the prompt that names a new one. */
  private chartTemplates = new ChartTemplateStore();
  private chartTemplatePrompt: WidgetNamePrompt | null = null;
  /** Asks a drawing template's name, over the drawing's settings. */
  private drawingTemplatePrompt: WidgetNamePrompt | null = null;
  /**
   * The settings open now: as they were on opening, and the keys changed since
   * (a change, a reset, a template). Cancel puts those back, OK records them
   * as one step; the rest (an axis dragged meanwhile) is left as it is.
   */
  private settingsEdit: {
    settings: ChartSettingsState;
    style: { theme: string; overrides: SettingsStylePatch };
    keys: Set<keyof ChartSettingsState>;
    styleKeys: Set<ChartStyleKey>;
  } | null = null;
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
  /** The indicators starred in the indicators dialog. */
  private indicatorFavorites = new DrawingFavoritesStore('tcw:indicator-favorites');
  /** What "Save as default" kept for each kind of indicator. */
  private indicatorDefaults = new IndicatorDefaultsStore();
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
  /** Headlines per symbol, kept a few minutes; a late answer for an earlier symbol is dropped. */
  private news = new SymbolNews();
  private marketTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private onPageShown: (() => void) | null = null;
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
  /** The timeframe the user (or the host) picked: ranges never show finer than it, layouts keep it. */
  private chosenTimeframe: TimeFrame | null = null;
  /** Counts range clicks and the user's own picks: a range waiting behind a newer one gives way. */
  private rangeSeq = 0;
  /** Ranges apply one at a time, each reading the bars the last one brought. */
  private rangeQueue: Promise<void> = Promise.resolve();
  private compares: { id: string; symbol: string; color: string }[] = [];
  /** How the compare dialog adds a symbol: the way picked last. */
  private compareWay: CompareWay = 'percent';
  /** Symbols whose bars are on the way to be compared in percent. */
  private readonly comparesLoading = new Set<string>();
  /** Every switch, on or off (see `setFeatures`). */
  private featureState: WidgetFeatureState;
  /** The host's own shortcuts, first added first. */
  private hostHotkeys: { spec: import('./types.js').HotkeySpec; parsed: ParsedHotkey }[] = [];
  /** The menus of the host's toolbar dropdowns. */
  private readonly hostMenus = new Set<WidgetContextMenu>();
  /** The host's layer over the chart (`getSlot('chart')`), made when first asked for. */
  private hostLayer: HTMLDivElement | null = null;
  /** Whether the chart shows the "+" by the price axis while its switch is on. */
  private priceAxisAddDefault = false;

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
    this.featureState = resolveWidgetFeatures(options);

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
    this.themeOf = { ...this.themeOf, [isDark ? 'dark' : 'light']: resolvedTheme };

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
      priceAxisAddButton: this.featureState.alerts || options.trading !== false || this.featureState.sidebar,
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
    // The "+" goes with its switch and comes back as the host's features set it.
    this.priceAxisAddDefault = features.priceAxisAddButton === true;
    const chartFeatures: FeaturesConfig = {
      ...features,
      priceAxisAddButton: this.priceAxisAddDefault && this.featureState['menu.priceAxisAdd'],
    };

    this.canExport = features.dataExport !== false;
    // The display toggles start where the host's features put them, and Reset goes back there.
    this.settingsDefaults = {
      ...this.settingsState,
      legendVisible: features.legend !== false,
      barCountdown: features.barCountdown !== false,
      indicatorValueLabels: features.indicatorValueLabels === true,
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
    // Right to left for Arabic, Hebrew and the like (or as asked); the chart itself runs left to right.
    const dir = options.dir === 'ltr' || options.dir === 'rtl' ? options.dir : isRtlLocale(options.locale) ? 'rtl' : 'ltr';
    this.root.dir = dir;
    this.portal.dir = dir;
    container.appendChild(this.root);
    this.tooltip = new WidgetTooltip(this.root);
    this.portal.className = 'tcw-root tcw-portal';
    this.portal.dataset.tcwTheme = this.root.dataset.tcwTheme;
    // Sheets on a phone keep above the on-screen keyboard.
    this.stopKeyboardInset = watchKeyboardInset([this.root, this.portal]);
    // Narrow (a phone, a narrow column): a compact toolbar, the drawing tools behind a button.
    this.stopNarrow = watchNarrow(this.root, (narrow) => {
      // The toolbar's own width may not change as the switch flips: fit it again.
      this.toolbar?.fit();
      if (!narrow) this.sidebar?.closeOverlay();
      this.syncRail();
    });
    // The look: tokens and layout switches on the root and the modal portal
    // alike. Without `ui` the tokens stay the stylesheet's (Print's), so a
    // host's CSS can still set them.
    this.ui = resolveWidgetUI(options.ui);
    const variables = options.ui !== undefined;
    applyWidgetUI(this.root, this.ui, { variables });
    applyWidgetUI(this.portal, this.ui, { variables });
    this.markSwitchedOff();
    this.stopFormControls = installFormControls([this.root, this.portal], {
      layer: this.overlayHost,
      labels: () => ({ prevMonth: this.t('calendar.prevMonth'), nextMonth: this.t('calendar.nextMonth'), today: this.t('calendar.today') }),
      locale: () => this.intlLocale(),
    });

    // 3. Create toolbar
    this.toolbar = new WidgetToolbar(
      this.root,
      {
        symbols: this.symbols,
        timeframes: this.timeframeMenu(),
        timeframeFavorites: this.pinnedTimeframes(),
        chartTypes: options.chartTypes
          ? CHART_TYPES.filter(ct => (options.chartTypes as ChartType[]).includes(ct.value))
          : CHART_TYPES,
      },
      {
        onSymbolClick: () => this.handleSymbolClick(),
        onSymbolInfo: () => this.toggleSymbolInfo(),
        onTimeframe: (tf) => this.handleTimeframe(tf),
        onToggleTimeframeFavorite: (tf) => this.handleToggleTimeframeFavorite(tf),
        onAddTimeframe: (text) => this.handleAddTimeframe(text),
        onRemoveTimeframe: (tf) => this.handleRemoveTimeframe(tf),
        onChartType: (type) => this.handleChartType(type),
        onIndicators: () => this.toggleIndicatorPicker(),
        onScreenshot: () => this.chart.screenshot(),
        onSettings: () => this.openSettings(),
        onToggleTheme: () => this.handleToggleTheme(),
        onToggleReplay: () => this.toggleReplay(),
        onToggleAlerts: () => this.toggleAlerts(),
        onToggleObjects: () => this.toggleObjects(),
        onToggleAccount: options.trading !== false ? () => this.toggleAccountPanel() : undefined,
        onLayouts: options.layouts !== false ? (anchor) => void this.layoutsUI?.openMenu(anchor) : undefined,
        onBracket: options.trading !== false ? (side) => this.startBracket(side) : undefined,
        onToggleLadder: options.trading !== false && options.depthLadder ? () => this.toggleLadder() : undefined,
        onOrderTicket: options.trading !== false ? () => this.openOrderTicket() : undefined,
        onCompare: options.adapter && features.compareSymbols !== false ? () => this.handleAddCompare() : undefined,
        onUndo: () => this.chart.undo(),
        onRedo: () => this.chart.redo(),
        onToggleFullscreen: typeof document !== 'undefined' && document.fullscreenEnabled
          ? () => this.toggleFullscreen()
          : undefined,
      },
      this.t,
      this.overlayHost,
    );

    // 4. Create body
    const body = document.createElement('div');
    body.className = 'tcw-body';

    if (options.drawingFavorites) this.favoritesStore.seedDefaults(options.drawingFavorites);
    this.sidebar = new WidgetDrawingSidebar(
      body,
      {
        drawingToolGroups: localizeToolGroups(DRAWING_TOOL_GROUPS, this.t),
        favorites: this.favoritesStore.list() as DrawingToolType[],
        shortcuts: toolShortcuts(),
      },
      {
        onDrawingTool: (tool) => this.handleDrawingTool(tool),
        onCancelDrawing: () => this.handleCancelDrawing(),
        onToggleMagnet: features.drawingMagnet !== false ? () => this.handleToggleMagnet() : undefined,
        onToggleEraser: () => this.chart.setEraserMode(!this.chart.isEraserMode()),
        onToggleZoomArea: () => this.chart.setZoomAreaMode(!this.chart.isZoomAreaMode()),
        onToggleFavorite: (tool) => this.handleToggleFavorite(tool),
        onClearDrawings: () => {
          this.chart.clearDrawings();
          this.state = { ...this.state, activeTool: null };
          this.updateUI();
        },
        onToggleStyle: () => this.drawingStyle?.toggle(),
        onToggleStayInDrawing: () => this.handleToggleStayInDrawing(),
        onLockAll: (locked) => {
          this.chart.setDrawingsLocked(this.chart.getDrawings().map((d) => d.id), locked);
          this.refreshDrawingsState();
          this.refreshObjects();
        },
        onHideAll: (hidden) => {
          this.chart.setDrawingsVisible(this.chart.getDrawings().map((d) => d.id), !hidden);
          this.refreshDrawingsState();
          this.refreshObjects();
        },
      },
    this.t,
    );

    this.chartContainer = document.createElement('div');
    this.chartContainer.className = 'tcw-chart-container';
    this.chartContainer.dir = 'ltr';
    body.appendChild(this.chartContainer);

    // Loading state: covers the empty chart until the first
    // bars land, then veils the previous chart during slow switches.
    this.loading = new WidgetLoadingOverlay(this.chartContainer, this.t('status.loading'));
    this.historyPill = new WidgetHistoryPill(this.chartContainer, {
      loading: this.t('history.loading'),
      failed: this.t('history.failed'),
    });

    // The dock: after the chart in the row, so its panel sits beside the chart and its rail at the edge.
    this.dock = new WidgetDock(body, {
      labels: { rail: this.t('dock.rail'), resize: this.t('dock.resize') },
      savedWidth: () => readDockWidth(),
      saveWidth: (width) => writeDockWidth(width),
      railShown: () => this.railShown(),
      focusAfterClose: (page) => this.panelFocusTarget(page as WidgetPanel),
      room: () => body.clientWidth,
    });
    if (options.watchlist) this.createWatchlist(body, options.watchlist === true ? {} : options.watchlist);

    this.root.appendChild(body);
    // The account panel docks under the chart, above the status bar.
    const accountHost = document.createElement('div');
    accountHost.className = 'tcw-account-dock';
    markPart(accountHost, 'accountPanel');
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
      features: chartFeatures,
    });
    // A shape the chart's options give stays until a look is set.
    if (!options.chartOptions?.shapes) this.applyChartShapes();
    this.applyLegendFont();
    this.applyChartLook();
    // New indicators of a kind look as its saved default has them.
    for (const [id, saved] of this.indicatorDefaults.all()) this.chart.setIndicatorDefaults(id, saved.style);

    // Navigation over the chart; a scroll step is a tenth of the bars on screen.
    this.chart.on('visibleRangeChange', (e) => {
      const { from, to } = e.payload as { from: number; to: number };
      if (Number.isFinite(from) && Number.isFinite(to)) this.visibleBarCount = Math.max(1, to - from);
    });
    this.chartNav = new WidgetChartNav(this.chartContainer, {
      zoomIn: () => this.chart.zoomIn(),
      zoomOut: () => this.chart.zoomOut(),
      scroll: (direction) => this.chart.scrollBars(direction * Math.max(1, Math.round(this.visibleBarCount / 10))),
      reset: () => this.resetView(),
      plotRect: () => this.chart.getPlotRect(),
    }, this.t);

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
      // A symbol's decimals often arrive after the lists were written (the
      // adapter's resolveSymbol answers late): write their prices again.
      this.refreshPriceTexts();
    });

    // Symbol info: the panel, and the market's status in the status bar,
    // kept current as the clock runs toward the next open or close.
    this.symbolInfoPanel = new WidgetSymbolInfo(this.root, this.t, {
      onClose: () => this.closePanelByHand('symbolInfo'),
      onToggle: (open) => {
        this.toolbar?.setActive('symbolInfo', open);
        if (open) {
          this.refreshSymbolInfo();
          this.loadNews();
        }
      },
    });
    this.marketTimer = setInterval(() => this.refreshMarket(), 30_000);
    // Back in view: the market's state now, not at the next tick of the timer.
    this.onPageShown = () => { if (!pageHidden()) this.refreshMarket(); };
    document.addEventListener('visibilitychange', this.onPageShown);

    // Drag-and-drop CSV / JSON onto the chart container — instant data load.
    // Opt-out via `dragDropImport: false`. The adapter (live stream) keeps
    // running but the next bar update will append to whatever we just
    // loaded — that's the expected behavior when overlaying historical data.
    this.dragDrop = new DragDropImporter(this.chartContainer, {
      onData: (data, result, file) => {
        this.setData(data);
        const loaded = fill(this.t('toast.fileLoaded'), { count: result.data.length, file: file.name });
        this.say(result.skipped > 0 ? `${loaded} (${fill(this.t('toast.fileSkipped'), { count: result.skipped })})` : loaded);
      },
      onError: (err, file) => {
        this.say(`${file.name}: ${err.message}`, 'error');
      },
    });
    if (this.featureState.dragDropImport) this.dragDrop.attach();

    // 6. Create status bar
    this.statusBar = new WidgetStatusBar(this.root, {
      presets: RANGE_PRESETS,
      presetLabels: { All: this.t('range.all') },
      groupLabel: this.t('range.presets'),
      goToLabel: this.t('range.goTo'),
      onPreset: (preset) => void this.applyRangePreset(preset),
      onGoTo: () => this.toggleGoToDate(),
    }, {
      clock: {
        label: this.t('settings.timezone'),
        now: () => this.clockNow(),
        options: () => ({
          current: this.settingsState.timezone,
          list: timezoneOptions(this.settingsState.timezone, Date.now(), this.t('settings.timezone.local'), this.exchangeChoice()),
        }),
        onPick: (value) => this.changeSettings({ timezone: value }),
      },
      scale: {
        labels: {
          group: this.t('settings.priceScale'),
          percent: this.t('settings.scale.percentage'),
          log: this.t('settings.scale.logarithmic'),
          auto: this.t('settings.autoScale'),
        },
        texts: { log: this.t('statusBar.log'), auto: this.t('statusBar.auto') },
        onPercent: () => this.toggleScaleMode('percentage'),
        onLog: features.logScale !== false ? () => this.toggleScaleMode('logarithmic') : undefined,
        onAuto: () => this.changeSettings({ autoScale: !this.chart.isAutoScale() }),
      },
    });
    // The clock each second, while the page is in view.
    this.clockTimer = setInterval(() => {
      if (!pageHidden() && this.featureState.statusBar && this.featureState['statusBar.clock']) this.statusBar?.tick();
    }, CLOCK_TICK_MS);
    // A drag on the price axis turns auto off without a settings change: the switch follows the chart.
    this.chart.on('priceRangeChange', () => this.refreshScaleSwitches());
    this.refreshScaleSwitches();
    this.goToDate = new WidgetGoToDate(this.overlayHost, () => ({
      title: this.t('goTo.title'),
      date: this.t('range.date'),
      range: this.t('goTo.range'),
      from: this.t('goTo.from'),
      to: this.t('goTo.to'),
      time: this.t('range.time'),
      submit: this.t('range.goToSubmit'),
      cancel: this.t('range.cancel'),
      close: this.t('common.close'),
      calendar: { prevMonth: this.t('calendar.prevMonth'), nextMonth: this.t('calendar.nextMonth'), today: this.t('calendar.today') },
    }), () => this.intlLocale(), (target) => this.goTo(target));

    // 7. Create settings (lazy, not appended until opened)
    this.settings = new WidgetSettings({
      onChange: (patch) => this.changeSettings(patch),
      onReset: () => this.resetSettings(),
      onClose: () => this.endSettingsEdit(true),
      onCancel: () => this.endSettingsEdit(false),
      templates: {
        list: () => this.chartTemplates.list().map((t) => t.name),
        apply: (name) => this.applyChartTemplate(name),
        remove: (name) => this.chartTemplates.remove(name),
        save: () => this.promptSaveChartTemplate(),
      },
      styleValue: (key) => this.chart.getStyleValue?.(key) ?? null,
      onStyleChange: (patch) => this.changeStyle(patch),
    }, this.t, {
      barCountdown: features.barCountdown,
      logScale: features.logScale,
      trading: features.trading !== false,
      exchangeZone: () => this.exchangeChoice()?.zone,
    }, this.overlayHost);

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
    this.chart.setPaneTitlesVisible(!this.featureState.indicatorLegend);
    this.indicatorLegend = new WidgetIndicatorLegend(this.chartContainer, {
      onToggleVisible: (iid, visible) => {
        this.chart.setIndicatorVisible(iid, visible);
        this.scheduleLegend();
        if (this.objectTree?.isOpen()) this.refreshObjects();
      },
      // The name opens the settings too: it goes with the row's settings button.
      onSettings: (iid) => {
        if (this.featureState['indicatorLegend.settings']) this.openIndicatorSettings(iid);
      },
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
      offInterval: this.t('indicatorSettings.offInterval'),
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
    for (const event of ['indicatorUpdate', 'indicatorChange', 'dataUpdate', 'resize', 'paneResize', 'paneChange', 'themeChange', 'timeframeChange'] as const) {
      this.chart.on(event, () => this.scheduleLegend());
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
    this.dataWindow = new WidgetDataWindow(this.root, {
      formatPrice: (p) => this.formatAlertPrice(p),
      onClose: () => this.closePanelByHand('dataWindow'),
    }, this.t);
    this.chart.on('crosshairMove', (e) => {
      const p = e.payload as { barIndex?: number };
      this.lastHoverIndex = typeof p.barIndex === 'number' ? p.barIndex : null;
      if (this.dataWindow?.isOpen()) this.dataWindow.render(this.buildDataWindowModel());
    });

    // Drawing style + templates popover (paired with the sidebar palette button)
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
      roundPrice: (price) => this.chart.roundPrice(price),
      priceStep: () => this.chart.getPriceStep(),
      onSaveDefault: (type, toolOptions) => {
        this.chart.setDrawingToolDefaults(type, toolOptions);
        defaults.set(type, this.chart.getDrawingToolDefaults(type));
        this.say(fill(this.t('drawingSettings.defaultSaved'), { name: this.drawingToolName(type) }));
      },
      templates: {
        list: (type) => templates.list(type),
        save: (look) => this.promptSaveDrawingTemplate(templates, look),
        remove: (name, type) => templates.remove(name, type),
      },
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

    // Right-click on a drawing: settings, alert, order, group, lock, hide, delete.
    this.drawingMenu = new WidgetContextMenu(this.root, this.t('drawingMenu.label'));
    this.chart.on('drawingContextMenu', (e) => {
      const { id, x, y } = e.payload as { id: string; x: number; y: number };
      this.openDrawingMenu(id, x, y);
    });

    // A click on a drawing: its toolbar right over it, no right-click needed.
    this.selectionToolbar = new WidgetSelectionToolbar(this.root, {
      onStyle: (patch) => {
        for (const id of this.chart.getSelectedDrawingIds()) this.chart.setSelectedDrawingStyle(patch, id);
        this.updateSelectionToolbar();
      },
      onSettings: () => {
        const id = this.chart.getSelectedDrawingIds()[0];
        if (id) this.openDrawingSettings(id);
      },
      onAlert: () => {
        const id = this.chart.getSelectedDrawingIds()[0];
        if (id) this.addDrawingAlert(id);
      },
      onLock: (locked) => {
        this.chart.setDrawingsLocked(this.chart.getSelectedDrawingIds(), locked);
        this.refreshObjects();
        this.updateSelectionToolbar();
      },
      onMore: (x, y) => {
        const id = this.chart.getSelectedDrawingIds()[0];
        if (!id) return;
        const offset = this.chartOffset();
        this.openDrawingMenu(id, x - offset.x, y - offset.y);
      },
      onDelete: () => {
        // Locked drawings stay, and stay selected.
        this.chart.removeDrawings(this.chart.getSelectedDrawingIds());
        this.refreshObjects();
        this.updateSelectionToolbar();
      },
    }, this.t);
    // Lock all and hide all show whether every drawing is.
    for (const event of ['drawingCreate', 'drawingUpdate', 'drawingRemove'] as const) {
      this.chart.on(event, () => this.refreshDrawingsState());
    }
    // Undo and redo on the toolbar, each off while there is nothing for it.
    this.chart.on('historyChange', (e) => {
      const { canUndo, canRedo } = e.payload as { canUndo: boolean; canRedo: boolean };
      this.toolbar?.setHistory(canUndo, canRedo);
    });
    // Selecting, or picking a tool, the eraser or the zoom area: at once.
    for (const event of ['drawingSelect', 'drawingToolChange', 'toolModeChange'] as const) {
      this.chart.on(event, () => this.updateSelectionToolbar());
    }
    // While it shows, it follows the drawing through edits, undo, pans, zooms,
    // rescales and replay steps, once a frame.
    for (const event of [
      'drawingUpdate', 'drawingRemove', 'historyChange', 'visibleRangeChange', 'priceRangeChange', 'zoomChange',
      'resize', 'paneResize', 'paneChange', 'dataUpdate', 'replayStep', 'chartTypeChange',
    ] as const) {
      this.chart.on(event, () => this.scheduleSelectionToolbar());
    }

    // Right-click elsewhere: what the plot, an axis or a pane offers. The "+"
    // by the price axis: what to do at its price.
    this.chartMenu = new WidgetContextMenu(this.root, this.t('chartMenu.label'), this.t('common.back'));
    // Indicators that read another symbol (a compare on its own scale, a spread) ask for its bars.
    this.chart.on('symbolSeriesRequest', (e) => void this.loadSymbolSeries(e.payload.symbol));
    // Prices from the pointer go on the market's grid (its smallest step).
    this.chart.on('chartContextMenu', (e) => {
      if (!this.featureState['menu.chart']) return;
      const { area, x, y, price: raw, time, pane } = e.payload as import('@tradecanvas/commons').ChartContextMenuPayload;
      const price = raw === undefined ? undefined : this.chart.roundPrice(raw);
      const context = { ...this.chartMenuContext(price), ...(pane ? { pane: this.chart.getPaneScale(pane) } : {}) };
      this.menuPane = pane ?? null;
      this.openChartMenu(filterMenuEntries(chartMenuEntries(area, context, this.t), CHART_MENU_FEATURES, this.featureState), x, y, { area, price, time });
    });
    this.chart.on('priceAxisAdd', (e) => {
      if (!this.featureState['menu.priceAxisAdd']) return;
      const { price: raw, x, y } = e.payload as import('@tradecanvas/commons').PriceAxisAddPayload;
      const price = this.chart.roundPrice(raw);
      const entries = filterMenuEntries(priceEntries(this.chartMenuContext(price), this.t), CHART_MENU_FEATURES, this.featureState);
      this.openChartMenu(entries, x, y, { area: 'priceAxisAdd', price });
    });

    // A signal marker under the pointer says what it is.
    this.chart.on('signalMarkerHover', (e) => this.showMarkerTip(e.payload));

    // Typing a number on the chart changes the interval.
    this.intervalInput = new WidgetIntervalInput(this.chartContainer, {
      title: this.t('interval.title'),
      hint: this.t('interval.hint'),
      invalid: this.t('interval.invalid'),
    }, (tf) => this.selectTypedTimeframe(tf));

    // Named layouts: save, open, rename, delete, auto-save.
    if (options.layouts !== false) this.setupLayouts(options.layouts === true || options.layouts === undefined ? {} : options.layouts);

    // Account panel and order ticket.
    if (options.trading !== false) {
      this.orderTicket = new WidgetOrderTicket(this.root, {
        onSubmit: (intent) => {
          this.chart.placeOrderIntent(intent);
          this.say(fill(this.t('ticket.sent'), {
            side: this.t(intent.side === 'buy' ? 'ticket.buy' : 'ticket.sell'),
            quantity: intent.quantity ?? 1,
            price: this.formatAlertPrice(intent.price),
          }));
        },
        formatPrice: (p) => this.formatAlertPrice(p),
        formatAmount: (v) => this.formatMoney(v),
        formatNumber: (v, d) => this.formatNumber(v, d),
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
        formatAmount: (v) => this.formatMoney(v),
        formatNumber: (v, d) => this.formatNumber(v, d),
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
      this.bracketBar = new WidgetBracketBar(this.chartContainer, {
        onConfirm: () => this.chart.confirmBracket(),
        onCancel: () => {
          this.chart.cancelBracket();
          this.bracketBar?.hide();
        },
      }, this.t);
      this.chart.on('bracketPlace', (e) => {
        const b = e.payload;
        this.bracketBar?.hide();
        this.say(fill(this.t(b.side === 'buy' ? 'bracket.longPlaced' : 'bracket.shortPlaced'), { rr: b.riskReward.toFixed(2) }));
      });

      // Depth-of-market ladder (opt-in; fed via widget.setDepth)
      if (options.depthLadder) {
        this.depthLadder = new WidgetDepthLadder(this.root, {
          onTrade: (side, price) => {
            this.chart.placeOrderIntent({ side, type: 'limit', price });
            this.say(fill(this.t(side === 'buy' ? 'order.buyLimit' : 'order.sellLimit'), { price: this.formatAlertPrice(price) }));
          },
          formatPrice: (p) => this.formatAlertPrice(p),
          priceStep: (p) => this.chart.getPriceStep(p),
          onToggle: (open) => this.toolbar?.setActive('ladder', open),
          onClose: () => this.closePanelByHand('depthLadder'),
        }, undefined, this.t);
        // Your working orders, marked on the rows where they wait.
        const ladder = this.depthLadder;
        this.chart.on('ordersChange', () => ladder.setOrders(this.chart.getOrders()));
      }
      // Esc-cancel originates in the chart; reflect it in the bar.
      this.chart.on('dataUpdate', (e) => {
        if (e.payload.kind === 'bracket') this.bracketBar?.hide();
      });
    }

    // 8a-bis. Price alerts panel (floating popover, toggled from the bell button)
    this.alertsPanel = new WidgetAlertsPanel(this.root, {
      onClose: () => this.closePanelByHand('alerts'),
      onAdd: ({ price, condition, message, channel, label, options }) => {
        try {
          this.chart.addAlert(price, condition, message, channel, label, options);
          return true;
        } catch {
          this.say(this.t('alerts.invalid'), 'error');
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
      this.refreshAlerts();
      if (this.featureState.alerts) this.say(fill(this.t('alerts.expiredToast'), { text: p.message ?? this.alertText(p) }));
    });
    if (options.alertNotifications) {
      this.alertNotifier = new AlertNotifier(options.alertNotifications);
    }
    this.chart.on('alertTriggered', (e) => {
      const p = e.payload;
      this.refreshAlerts();
      if (!this.featureState.alerts) return;
      const text = `${this.alertText(p)}${p.message ? ` — ${p.message}` : ''}`;
      this.say(fill(this.t('alerts.fired'), { text }), 'info', 'bell');
      this.alertNotifier?.notify(text);
    });

    // The indicators dialog, from the toolbar's Indicators button.
    this.indicatorPicker = new WidgetIndicatorPicker(this.overlayHost, {
      onAdd: (id) => this.handleAddIndicator(id),
      onFavorite: (id, on) => (on ? this.indicatorFavorites.add(id) : this.indicatorFavorites.remove(id)),
      templates: {
        onApply: (name) => this.applyIndicatorTemplate(name),
        onDelete: (name) => {
          this.templates.remove(name);
          this.indicatorPicker?.setTemplates(this.templateNames());
        },
        onSave: () => this.promptSaveIndicatorTemplate(),
      },
      onClose: () => this.toolbar?.setIndicatorsOpen(false),
    }, this.t);

    // 8a-ter. Object tree (indicators + drawings manager)
    this.indicatorSettings = new WidgetIndicatorSettings(this.root, {
      onApply: (instanceId, params) => {
        this.chart.updateIndicator(instanceId, params);
        this.syncIndicatorsFromChart(); // the legend shows the parameters
      },
      onStyle: (instanceId, style) => this.chart.updateIndicatorStyle(instanceId, style),
      onLevels: (instanceId, levels) => this.chart.setIndicatorLevels(instanceId, levels),
      onScale: (instanceId, scale) => this.chart.setIndicatorScale(instanceId, scale),
      onIntervals: (instanceId, intervals) => this.chart.setIndicatorIntervals(instanceId, intervals),
      onSaveDefault: (indicatorId, saved) => this.saveIndicatorDefault(indicatorId, saved),
      // Its changes are one undo step, none after a Cancel.
      onClose: () => this.chart.endIndicatorEdit(),
    }, this.t);
    this.objectTree = new WidgetObjectTree(this.root, {
      onClose: () => this.closePanelByHand('objectTree'),
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
    // Drawings kept to some intervals come and go with it.
    this.chart.on('timeframeChange', refreshSoon);
    this.chart.on('indicatorAdd', refresh);
    this.chart.on('indicatorRemove', refresh);
    this.chart.on('indicatorChange', refresh);
    // Compared symbols that are indicators come and go in the compare dialog's list.
    for (const event of ['indicatorAdd', 'indicatorRemove', 'indicatorChange'] as const) {
      this.chart.on(event, () => this.refreshCompareDialog());
    }

    // Every panel made: into the dock, in the rail's order.
    this.setupDock();

    // 8b. Command palette
    this.commandPalette = new WidgetCommandPalette({
      onIndicator: (id) => this.handleAddIndicator(id),
      onChartType: (type) => this.handleChartType(type),
      onDrawingTool: (tool) => this.handleDrawingTool(tool),
      onTimeframe: (tf) => this.handleTimeframe(tf),
      onAction: (id) => this.handleAction(id),
      onClose: () => {},
    }, this.overlayHost, this.t, {
      list: () => readRecentCommands(),
      add: (key) => writeRecentCommands([key, ...readRecentCommands().filter((k) => k !== key)]),
    });

    this.boundGlobalKeydown = (e: KeyboardEvent) => {
      if (this.featureState.hotkeys && this.replayBar?.isMounted() && this.handleReplayKey(e)) return;
      if (this.handleHostHotkey(e)) return;
      // With several widgets on the page, the shortcuts go to the one used last.
      const mine = isKeyTarget(this.root);
      // The widget's keys may be switched off all together, or one by one.
      const keyOn = (name: WidgetFeature): boolean => this.featureState.hotkeys && this.featureState[name];
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        if (!mine || !keyOn('hotkeys.commandPalette') || !this.featureState.commandPalette) return;
        e.preventDefault();
        this.toggleCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        // Ctrl/Cmd+P → symbol search (matches Bloomberg / many trading UIs)
        if (!mine || !keyOn('hotkeys.symbolSearch') || !this.featureState.symbolSearch) return;
        e.preventDefault();
        this.openSymbolSearch();
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        // Ctrl/Cmd+S → save the layout (rather than the page), once this widget was used.
        if (!this.layoutSession || !keyOn('hotkeys.save') || !this.featureState.layouts || isTyping() || !isKeyTarget(this.root, true)) return;
        e.preventDefault();
        void this.saveLayout();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && TOOL_HOTKEYS[e.code]) {
        // Alt+T trend line, Alt+H horizontal line… (the drawing tools' keys).
        if (e.defaultPrevented || isTyping() || !mine || inOverlay() || !keyOn('hotkeys.tools')) return;
        e.preventDefault();
        this.handleDrawingTool(TOOL_HOTKEYS[e.code]);
      } else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // A number typed on the chart starts an interval (5, 15m, 1h…).
        if (e.defaultPrevented || !this.intervalInput || !keyOn('intervalTyping') || isTyping() || inOverlay() || !isKeyTarget(this.root, true)) return;
        const active = document.activeElement;
        // Focus in another part of the page: the keys are its.
        if (active && active !== document.body && !this.root.contains(active)) return;
        e.preventDefault();
        this.intervalInput.open(e.key);
      } else if (typedLetter(e) !== null) {
        // A letter typed on the chart starts a symbol search with it.
        if (e.defaultPrevented || !keyOn('symbolTyping') || !this.featureState.symbolSearch || isTyping() || inOverlay() || !isKeyTarget(this.root, true)) return;
        const active = document.activeElement;
        // Focus in another part of the page: the keys are its.
        if (active && active !== document.body && !this.root.contains(active)) return;
        e.preventDefault();
        this.openSymbolSearch(typedLetter(e)!);
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyI' || e.code === 'KeyG' || e.code === 'KeyR')) {
        // By key position: on macOS Alt+G types "©".
        if (isTyping() || !mine) return;
        if (e.code === 'KeyI') {
          // Alt+I → invert the price scale.
          if (!keyOn('hotkeys.invertScale')) return;
          e.preventDefault();
          this.changeSettings({ invertScale: !this.settingsState.invertScale });
          this.settings?.refresh(this.settingsState);
        } else if (e.code === 'KeyR') {
          // Alt+R → the whole series in view, the price scale fitted to it.
          if (!keyOn('hotkeys.resetView')) return;
          e.preventDefault();
          this.resetView();
        } else if (this.goToDate && keyOn('hotkeys.goToDate') && this.featureState.goToDate) {
          // Alt+G → go to date.
          e.preventDefault();
          this.toggleGoToDate();
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only fire when the user isn't typing into an input.
        if (isTyping() || !mine || !keyOn('hotkeys.help') || !this.featureState.hotkeySheet) return;
        e.preventDefault();
        this.openHotkeySheet();
      }
    };
    document.addEventListener('keydown', this.boundGlobalKeydown);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    // A press in the widget's layer (a dialog, a menu) is a press in the widget.
    this.unregisterKeys = registerKeyRoot(this.root, [this.portal]);

    // 9. Connect stream
    if (options.adapter) {
      this.adapter = options.adapter;
      this.connectStream();
    } else {
      // No stream to say the interval: the legend and the indicators kept to some take it from here.
      this.chart.setDataTimeframe(this.state.timeframe);
    }

    // Watchlist live-update loop. 1s cadence keeps DOM churn low while still
    // feeling responsive; for sub-second visual response, apps can call
    // `setWatchlistEntry` directly from their own WebSocket.
    if (this.watchlist) {
      this.watchlistInterval = setInterval(() => this.tickWatchlist(), 1000);
    }

    // Initial UI update (the bars now built take the switches), and the dividers again once laid out
    // (a widget built before it was on the page).
    this.markSwitchedOff();
    requestAnimationFrame(() => {
      if (this.destroyed) return;
      this.toolbar?.tidy();
      this.sidebar?.tidy();
    });
    this.refreshMarket();
    this.updateUI();

    // 9. Once the constructor has returned (the name the host gives the
    // widget is set by then: `onReady: () => widget.openPanel('watchlist')`),
    // onReady, then a view shared in the URL over what it set up. The last
    // step here: a widget whose making failed calls neither.
    queueMicrotask(() => {
      if (this.destroyed) return;
      try {
        options.onReady?.(this.chart, this);
      } finally {
        // An error in onReady is the host's to see; the shared view still comes.
        if (!this.destroyed) this.restoreSharedView();
      }
    });
  }

  /** A view shared in the URL (`#tcw=`), when `shareUrl` is on. */
  private restoreSharedView(): void {
    if (!this.options.shareUrl || typeof location === 'undefined') return;
    const encoded = readShareHash(location.hash);
    if (encoded) void this.importState(encoded);
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

  /**
   * Open a panel of the dock beside the chart (in a sheet on a phone), in
   * place of the one open. False when the widget hasn't it: no watchlist, no
   * depth ladder (the `depthLadder` option), or its switch off.
   */
  openPanel(panel: WidgetPanel): boolean {
    if (!this.hasPanel(panel) || !this.dock) return false;
    this.dock.open(panel);
    return this.dock.current() === panel;
  }

  /** Whether the widget has `panel`: the watchlist and the ladder only when made with them, every one with its switch on. */
  private hasPanel(panel: WidgetPanel): boolean {
    if (panel === 'watchlist') return this.watchlist !== null;
    if (panel === 'depthLadder' && this.depthLadder === null) return false;
    return this.featureState[PANEL_FEATURES[panel]];
  }

  /** Shut the dock. */
  closePanel(): void {
    this.dock?.close();
  }

  /** The panel open in the dock, or null. */
  getOpenPanel(): WidgetPanel | null {
    return (this.dock?.current() as WidgetPanel | null | undefined) ?? null;
  }

  /** Open or close the symbol info panel (toggle when `open` is left out). */
  toggleSymbolInfo(open?: boolean): void {
    const panel = this.symbolInfoPanel;
    if (!panel) return;
    const opening = open ?? !panel.isOpen();
    // Switched off, it only closes.
    if (opening && !this.featureState.symbolInfo) return;
    if (opening) this.dock?.open('symbolInfo');
    else this.dock?.closePage('symbolInfo');
  }

  /** The market's status in the status bar, and the panel when it's open. */
  private refreshMarket(): void {
    if (pageHidden()) return;
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
    const symbol = this.state.symbol;
    return buildSymbolInfoView({
      symbol,
      info: this.chart.getSymbolInfo(),
      quote: this.quotes.get(symbol),
      bars: this.chart.getData(),
      formatPrice: (p) => this.formatAlertPrice(p),
      t: this.t,
      textLocale: this.textLocale(),
      numberLocale: this.intlLocale(),
      now: Date.now(),
    });
  }

  /** Headlines for the chart's symbol into the open panel; cached a few minutes. */
  private loadNews(): void {
    const panel = this.symbolInfoPanel;
    if (!panel?.isOpen()) return;
    const adapter = this.options.adapter;
    const source = this.options.news ?? (adapter?.fetchNews ? adapter.fetchNews.bind(adapter) : null);
    this.news.load(this.state.symbol, source, (news) => panel.renderNews(news), this.textLocale(), () => this.destroyed);
  }

  /** The BCP 47 tag numbers in the panels are written in. */
  private intlLocale(): string {
    return this.settingsState.numberLocale || this.options.locale || 'en';
  }

  /** The language words in the panels are written in ("in 3 hours", weekday names): the widget's. */
  private textLocale(): string {
    return this.options.locale || 'en';
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
      onAdd: () => this.symbolSearch?.open({ symbols: this.symbols, current: this.state.symbol, onPick: (sym) => store.add(sym), search: this.symbolSearchFn() }),
      onRemove: (sym) => store.removeSymbol(sym),
      onMove: (sym, index) => store.move(sym, index),
      onPickList: (id) => store.setActive(id),
      onCreateList: (name) => store.create(name),
      onRenameList: (id, name) => store.rename(id, name),
      onDeleteList: (id) => store.remove(id),
      onClose: () => this.closePanelByHand('watchlist'),
    }, {
      close: t('common.close'),
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
    if (!this.quoteSource || !this.watchlistStore || this.destroyed) return;
    const symbols = this.watchlistStore.getActive().symbols;
    // The same symbols in another order (a row moved) keep their subscription.
    const key = [...symbols].sort().join('\u0000');
    if (key === this.quotedKey) return;
    this.quotedKey = key;
    this.stopQuotes?.();
    this.stopQuotes = null;
    if (symbols.length === 0) return;
    try {
      this.stopQuotes = this.quoteSource.subscribeQuotes(symbols, (quotes) => {
        if (this.destroyed || !Array.isArray(quotes)) return;
        // A source of the host's is untrusted: what isn't a quote is left out.
        const read = quotes.map(readQuote).filter((q): q is Quote => q !== null);
        if (read.length > 0) this.takeQuotes(read);
      });
    } catch {
      this.stopQuotes = null;
    }
  }

  private takeQuotes(quotes: readonly Quote[]): void {
    for (const update of quotes) {
      // A stream frame carries less than a snapshot: what it leaves out stays.
      const quote = { ...this.quotes.get(update.symbol), ...update };
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
    // No one sees it: a hidden page, the app in the background.
    if (pageHidden()) return;
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
    // The user's pick: it bounds the range bar from now on, and wins over a range on its way.
    this.chosenTimeframe = tf;
    this.rangeSeq++;
    await this.switchTimeframe(tf);
  }

  /**
   * Show `tf`: refetch from the feed, or resample the bars on hand. A range's
   * switch comes here directly and leaves the user's pick as it was; the
   * host still hears `onTimeframeChange`, as the timeframe showing changed.
   */
  private async switchTimeframe(tf: TimeFrame): Promise<void> {
    this.state = { ...this.state, timeframe: tf };
    this.options.onTimeframeChange?.(tf);
    this.updateUI();
    this.layoutSession?.changed();
    if (this.adapter) {
      // Live adapter owns the data — refetch at the native resolution.
      await this.connectStream();
      return;
    }
    this.chart.setDataTimeframe(tf);
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
    this.themeOf = { ...this.themeOf, [isDark ? 'dark' : 'light']: resolved };
    this.state = { ...this.state, isDark };
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
    this.portal.dataset.tcwTheme = this.root.dataset.tcwTheme;
    this.keepingLook(() => this.chart.setTheme(resolved));
    this.updateUI();
  }

  getChart(): Chart {
    return this.chart;
  }

  /**
   * Change the widget's look: a preset (`'print'`, `'studio'`,
   * `'terminal'`, `'capsule'`) or your theme over one. Colours stay with
   * `setTheme`. The look sets the chart's bar layout and font too (golden and
   * the look's sans face when airy, classic and the theme's otherwise),
   * over any set on the chart itself, unless `chartOptions` set them.
   */
  setUI(theme: WidgetUIPreset | WidgetUITheme): void {
    this.ui = resolveWidgetUI(theme);
    applyWidgetUI(this.root, this.ui);
    applyWidgetUI(this.portal, this.ui);
    this.applyChartShapes();
    this.applyLegendFont();
    this.applyChartLook();
  }

  /** The widget's look, every token set. */
  getUI(): ResolvedWidgetUI {
    return resolveWidgetUI({ ...this.ui });
  }

  /**
   * The OHLCV legend on the chart takes the look's figures font, at the size
   * of the indicator rows the widget lists under it, so the two read as one
   * block and the prices line up in columns.
   */
  private applyLegendFont(): void {
    this.chart.setLegend({ fontFamily: this.ui.font.mono, fontSize: typeSize(this.ui.font.size, -1) });
  }

  /**
   * The airy look's chart: golden bars, and its figures (axes, tags) in the
   * look's figures face; any other look gives them back. `chartOptions`
   * that set the bars or the font win.
   */
  private applyChartLook(): void {
    const airy = this.ui.density === 'airy';
    const given = this.options.chartOptions;
    if (!given?.barLayout) this.chart.setBarLayout(airy ? 'golden' : 'classic');
    if (!given?.font) this.chart.setFont(airy ? { family: this.ui.font.mono } : null);
  }

  /** The chart's own tags and pills take the look's corners. */
  private applyChartShapes(): void {
    this.chart.setShapes({ tagRadius: this.ui.tagRadius });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopKeyboardInset?.();
    this.stopKeyboardInset = null;
    this.stopNarrow?.();
    this.dockObserver?.disconnect();
    this.stopNarrow = null;
    this.stopFormControls?.();
    this.stopFormControls = null;

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
    this.indicatorPicker?.destroy();
    this.drawingStyle?.destroy();
    this.drawingSettings?.destroy();
    this.drawingMenu?.destroy();
    this.selectionToolbar?.destroy();
    if (this.selectionToolbarFrame !== null) cancelAnimationFrame(this.selectionToolbarFrame);
    this.chartMenu?.destroy();
    this.legendMenu?.destroy();
    for (const menu of this.hostMenus) menu.destroy();
    this.hostMenus.clear();
    this.templatePrompt?.destroy();
    this.chartTemplatePrompt?.destroy();
    this.drawingTemplatePrompt?.destroy();
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
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.onPageShown) document.removeEventListener('visibilitychange', this.onPageShown);
    this.onPageShown = null;
    this.chartNav?.destroy();
    this.symbolInfoPanel?.destroy();
    this.dock?.destroy();
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
    if (!this.featureState.symbolSearch) return;
    this.openSymbolSearch();
  }

  /** The symbol search, started from `query` (a letter typed on the chart). */
  private openSymbolSearch(query?: string): void {
    this.symbolSearch?.open({
      symbols: this.symbols,
      current: this.state.symbol,
      search: this.symbolSearchFn(),
      query,
      // Said where it can be done: letters typed on the chart open it.
      hint: this.sheetKeyOn('symbolTyping') ? this.t('symbolSearch.typeHint') : undefined,
    });
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

  /**
   * A range from the range bar. A long one switches to the timeframe whose
   * bars it fits (five years of days in weeks, decades in months), a short
   * one back toward the user's own (`timeframeForRange`); then the range is
   * shown. Off with `features: { 'statusBar.rangeTimeframe': false }`.
   */
  private applyRangePreset(preset: RangePreset): Promise<void> {
    const seq = ++this.rangeSeq;
    // One at a time; a newer click, or the user's own pick, skips one still waiting.
    this.rangeQueue = this.rangeQueue
      .then(() => this.runRangePreset(preset, seq))
      .catch((err: unknown) => {
        this.say(err instanceof Error ? err.message : String(err), 'error');
      });
    return this.rangeQueue;
  }

  private async runRangePreset(preset: RangePreset, seq: number): Promise<void> {
    const current = () => seq === this.rangeSeq && !this.destroyed;
    if (!current()) return;
    // The timeframe the widget started on counts as the user's until they pick one.
    this.chosenTimeframe ??= this.state.timeframe;
    const tf = this.featureState['statusBar.rangeTimeframe'] ? this.timeframeForPreset(preset) : this.state.timeframe;
    if (tf !== this.state.timeframe) {
      await this.switchTimeframe(tf);
      // Superseded while loading, or the load failed: the bars aren't the range's.
      if (!current() || (this.adapter && this.state.connectionState === 'error')) return;
    }
    this.chart.setVisibleRangePreset(preset);
  }

  /** The timeframe `preset` shows in, from the bars on the chart now. */
  private timeframeForPreset(preset: RangePreset): TimeFrame {
    const current = this.state.timeframe;
    const data = this.chart.getData();
    if (data.length < 2) return current;
    const unit = barTimeUnit(data);
    const end = data[data.length - 1].time * unit;
    const start = preset === 'All' ? data[0].time * unit : rangePresetStart(preset, end, this.displayTimezone());
    if (start === null) return current;
    let first = data.length - 1;
    while (first > 0 && data[first - 1].time * unit >= start) first--;
    // Days a market trades in a week: all seven if any recent bar falls on a weekend.
    const tz = this.displayTimezone();
    const weekend = data.slice(-WEEKDAY_SAMPLE).some((bar) => {
      const ms = bar.time * unit;
      const day = new Date(ms + offsetAt(tz, ms) * 60_000).getUTCDay();
      return day === 0 || day === 6;
    });
    return timeframeForRange({
      dayShare: weekend ? 1 : 5 / 7,
      spanMs: end - start,
      barsInSpan: data.length - first,
      width: this.chart.getPlotRect().width,
      current,
      chosen: this.chosenTimeframe ?? current,
      available: this.timeframes.filter((tf) => this.chart.isTimeframeAllowed(tf) && this.canShowTimeframe(tf)),
    });
  }

  /** Whether a switch to `tf` brings bars: the feed serves it, or the bars here resample to it. */
  private canShowTimeframe(tf: TimeFrame): boolean {
    if (this.adapter) return servesTimeframe(this.adapter, tf);
    if (this.options.resampleTimeframes === false) return false;
    const data = this.chart.getData();
    if (data.length < 2) return false;
    // Resampling only makes bars coarser than those it starts from.
    const base = this.baseSeries ? this.baseTimeframeMs : inferTimeframeMs(data);
    return !(base > 0) || timeframeToMs(tf) >= base;
  }

  /** Fill the screen with the widget, or leave fullscreen. */
  toggleFullscreen(): void {
    if (document.fullscreenElement === this.root) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    this.root.requestFullscreen().catch((err: unknown) => {
      this.say(err instanceof Error ? err.message : this.t('toast.fullscreenUnavailable'), 'error');
    });
  }

  /** A drawing tool's name in the widget's language. */
  private drawingToolName(type: DrawingToolType): string {
    const key = `tool.${type}` as MessageKey;
    const name = this.t(key);
    return name === key ? this.chart.getDrawingToolDescriptor(type)?.name ?? type : name;
  }

  /** The chart container's top-left in the widget root's coordinates. */
  private chartOffset(): { x: number; y: number } {
    const chartRect = this.chartContainer.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    return { x: chartRect.left - rootRect.left, y: chartRect.top - rootRect.top };
  }

  /** `updateSelectionToolbar` on the next frame, once, while the toolbar shows. */
  private scheduleSelectionToolbar(): void {
    if (this.selectionToolbarFrame !== null || !this.selectionToolbar?.isOpen()) return;
    this.selectionToolbarFrame = requestAnimationFrame(() => {
      this.selectionToolbarFrame = null;
      this.updateSelectionToolbar();
    });
  }

  /**
   * Show the selection toolbar over the selected drawings, or hide it: when
   * nothing is selected, or while a tool, the eraser or the zoom area is on.
   */
  private updateSelectionToolbar(): void {
    const toolbar = this.selectionToolbar;
    if (!toolbar || this.destroyed) return;
    const selected = this.chart.getSelectedDrawingIds();
    if (!this.featureState.selectionToolbar || !selected?.length) {
      toolbar.hide();
      return;
    }
    const ids = new Set(selected);
    const drawings = this.chart.getDrawings().filter((d) => ids.has(d.id) && this.chart.isDrawingShown(d.id));
    const busy = this.chart.getDrawingTool() !== null || this.chart.isEraserMode() || this.chart.isZoomAreaMode();
    if (busy || drawings.length === 0) {
      toolbar.hide();
      return;
    }
    const offset = this.chartOffset();
    const plot = this.chart.getPlotRect();
    // Over all of them; at the top of the plot when none is on screen (an
    // extended line crossing it far from its anchors).
    const rect = unionRects(drawings.map((d) => this.chart.getDrawingRect(d.id)))
      ?? { x: plot.x + plot.width / 2, y: plot.y, width: 0, height: 0 };
    const primary = drawings[0];
    toolbar.show({
      rect: { x: rect.x + offset.x, y: rect.y + offset.y, width: rect.width, height: rect.height },
      bounds: { x: plot.x + offset.x, y: plot.y + offset.y, width: plot.width, height: plot.height },
      style: primary.style,
      locked: drawings.every((d) => d.locked),
      canDelete: drawings.some((d) => !d.locked),
      canSettings: this.drawingSettings !== null && this.featureState.drawingSettings && drawings.length === 1,
      canAlert: this.featureState.alerts && drawings.length === 1 && this.chart.canAddDrawingAlert(primary.id),
    });
  }

  /** Open a drawing's settings (double-click on it, or the object tree's settings button). */
  private openDrawingSettings(id: string): void {
    const drawing = this.chart.getDrawings().find((d) => d.id === id);
    const descriptor = drawing ? this.chart.getDrawingToolDescriptor(drawing.type) : null;
    if (!drawing || !descriptor || !this.drawingSettings || !this.featureState.drawingSettings) return;
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
      intervals: drawing.intervals ?? null,
    });
  }

  /** Save a drawing's look as a template of its tool, asking for its name over the drawing's settings. */
  private promptSaveDrawingTemplate(templates: DrawingTemplateStore, look: DrawingTemplateLook): void {
    this.drawingTemplatePrompt ??= new WidgetNamePrompt(this.root, this.t);
    this.drawingTemplatePrompt.open({
      title: this.t('drawingSettings.saveTemplateTitle'),
      submitLabel: this.t('common.save'),
      placeholder: this.drawingToolName(look.type),
      onSubmit: (name) => {
        templates.save(name, look.style, { type: look.type, options: look.options });
        this.say(fill(this.t('templates.saved'), { name: name.trim() }));
      },
    });
  }

  /** Add a "price crosses this drawing" alert and say so. */
  private addDrawingAlert(id: string): void {
    if (!this.featureState.alerts) return;
    const drawing = this.chart.getDrawings().find((d) => d.id === id);
    const name = drawing ? this.drawingToolName(drawing.type) : '';
    if (this.chart.addDrawingAlert(id, { label: name })) {
      this.say(fill(this.t('drawingSettings.alertAdded'), { name }));
    }
  }

  /** The menu of a right-clicked drawing; the chart has selected it (and its group) by now. */
  private openDrawingMenu(id: string, x: number, y: number): void {
    if (!this.drawingMenu || !this.featureState['menu.drawing']) return;
    const drawings = new Map(this.chart.getDrawings().map((d) => [d.id, d]));
    const selected = this.chart.getSelectedDrawingIds().flatMap((sid) => {
      const d = drawings.get(sid);
      return d ? [{ id: d.id, locked: d.locked, groupId: d.group?.id ?? null }] : [];
    });
    if (selected.length === 0) return;
    const entries = filterMenuEntries(drawingMenuEntries({
      selected,
      canConfigure: this.drawingSettings !== null,
      canAlert: this.chart.canAddDrawingAlert(id),
    }, this.t), DRAWING_MENU_FEATURES, this.featureState);
    const ids = selected.map((d) => d.id);
    const drawing = drawings.get(id);
    const extra = drawing ? this.options.drawingMenuItems?.({ id, type: drawing.type, selected: ids }) ?? [] : [];
    const all = withHostItems(entries, extra);
    if (all.length === 0) return;
    const chartRect = this.chartContainer.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    this.drawingMenu.open(all, chartRect.left - rootRect.left + x, chartRect.top - rootRect.top + y, (action) => {
      if (!pickHostItem(action, extra)) this.runDrawingMenuAction(id, ids, action as DrawingMenuAction);
    });
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
    const s = this.settingsState;
    const features = this.chart.getFeatures();
    return {
      price,
      lastPrice: data.length > 0 ? data[data.length - 1].close : null,
      formatPrice: (p) => this.formatAlertPrice(p),
      canAlert: this.alertsPanel !== null,
      canTrade: this.options.trading !== false,
      canOrderTicket: this.orderTicket !== null,
      canDraw: true,
      hasDrawings: drawings.length > 0,
      drawingsHidden: drawings.length > 0 && drawings.every((d) => !d.visible),
      canPaste: this.chart.canPasteDrawings(),
      hasIndicators: features.indicators !== false && this.removableIndicators().length > 0,
      canGoToDate: this.goToDate !== null,
      canExport: this.canExport,
      autoScale: this.chart.isAutoScale(),
      scaleMode: s.scaleMode,
      canLog: features.logScale !== false,
      inverted: this.chart.isInvertScale(),
      leftScale: s.leftPriceScale,
      labels: { values: s.indicatorValueLabels, ...(features.barCountdown !== false ? { countdown: s.barCountdown } : {}) },
      lines: { highLow: s.highLowLines, lastPrice: this.chart.getStyleValue('lastPrice.visible') !== false },
      timezone: { current: s.timezone, options: this.timezoneChoices() },
      keys: Object.fromEntries(CHART_MENU_KEYS
        .filter((k) => this.featureState.hotkeys && this.featureState[k.feature])
        .map((k) => [k.action, k.keys])),
    };
  }

  /** The indicators "Remove indicators" takes away: a comparison with another symbol stays, as it has a dialog of its own. */
  private removableIndicators(): string[] {
    return this.chart.getActiveIndicators().filter((ind) => !SYMBOL_INDICATOR_IDS.has(ind.id)).map((ind) => ind.instanceId);
  }

  /**
   * The exchange's zone, offered when the chart knows one (the symbol's, or
   * its market's) or the adapter can name the symbol's; its zone is null
   * while unknown.
   */
  private exchangeChoice(): { label: string; zone: string | null } | undefined {
    const zone = this.chart.getExchangeTimeZone() ?? null;
    if (zone === null && !this.adapter?.resolveSymbol) return undefined;
    return { label: this.t('settings.timezone.exchange'), zone };
  }

  /** The time zones on offer, the exchange's among them when there is one. */
  private timezoneChoices(): { value: string; label: string }[] {
    return timezoneOptions(this.settingsState.timezone, Date.now(), this.t('settings.timezone.local'), this.exchangeChoice())
      .map(({ value, label }) => ({ value, label }));
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
    const all = withHostItems(entries, extra);
    if (all.length === 0) return;
    const chartRect = this.chartContainer.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    this.chartMenu.open(all, chartRect.left - rootRect.left + x, chartRect.top - rootRect.top + y, (action) => {
      if (pickHostItem(action, extra)) return;
      if (action.startsWith(TIMEZONE_ENTRY)) this.changeSettings({ timezone: action.slice(TIMEZONE_ENTRY.length) });
      else this.runChartMenuAction(action as ChartMenuAction, context);
    });
  }

  // --- Feature switches ---

  /**
   * Turn switches on or off while running, by name (`WIDGET_FEATURES`): a
   * name without a dot is a whole capability (`alerts`, `settings`), a dotted
   * one a single place (`toolbar.screenshot`, `menu.chart.order`). Names not
   * given stay as they are.
   */
  setFeatures(patch: WidgetFeatures): void {
    const before = this.featureState;
    this.featureState = { ...before, ...readWidgetFeatures(patch) };
    const changed = (name: WidgetFeature): boolean => before[name] !== this.featureState[name];
    this.markSwitchedOff();
    this.closeSwitchedOff((name) => before[name] && !this.featureState[name]);
    if (changed('selectionToolbar')) this.updateSelectionToolbar();
    if (changed('indicatorLegend')) {
      this.chart.setPaneTitlesVisible(!this.featureState.indicatorLegend);
      this.scheduleLegend();
    }
    if (changed('menu.priceAxisAdd')) {
      this.chart.setFeatures({ priceAxisAddButton: this.priceAxisAddDefault && this.featureState['menu.priceAxisAdd'] });
    }
    if (changed('dragDropImport')) {
      if (this.featureState.dragDropImport) this.dragDrop?.attach();
      else this.dragDrop?.detach();
    }
    // A bar that came or went gives the chart another size: it follows now, its overlays with it.
    if ((['toolbar', 'sidebar', 'statusBar', 'accountPanel'] as const).some(changed)) this.chart.resize();
  }

  /** Every switch, on (`true`) or off. */
  getFeatures(): Record<WidgetFeature, boolean> {
    return { ...this.featureState };
  }

  /**
   * Whether this one switch is on, as set: not whether what it names shows.
   * A part shows while every switch it belongs to is on (its capability, its
   * place, the bar it sits in), so the replay button goes with `replay`,
   * `toolbar.replay` or `toolbar` off: with `features: { replay: false }`,
   * `isFeatureOn('toolbar.replay')` is still `true`. Ask for each of them.
   */
  isFeatureOn(name: WidgetFeature): boolean {
    return this.featureState[name] === true;
  }

  /** What a switch just turned off was showing goes with it: a replay ends, its panel, dialog or menu closes. */
  private closeSwitchedOff(turnedOff: (name: WidgetFeature) => boolean): void {
    if (turnedOff('replay') && this.replayBar?.isMounted()) this.exitReplay();
    const closers: readonly [WidgetFeature, () => void][] = [
      ['alerts', () => this.dock?.closePage('alerts')],
      ['objectTree', () => this.dock?.closePage('objectTree')],
      ['symbolInfo', () => this.dock?.closePage('symbolInfo')],
      ['dataWindow', () => this.dock?.closePage('dataWindow')],
      ['accountPanel', () => this.toggleAccountPanel(false)],
      ['orderTicket', () => this.orderTicket?.close()],
      ['depthLadder', () => this.dock?.closePage('depthLadder')],
      ['goToDate', () => this.goToDate?.close()],
      ['settings', () => this.settings?.close()],
      ['indicatorSettings', () => this.indicatorSettings?.close()],
      ['toolbar.indicators', () => this.indicatorPicker?.close()],
      ['drawingSettings', () => this.drawingSettings?.close(false)],
      ['sidebar', () => this.drawingStyle?.close()],
      ['commandPalette', () => this.commandPalette?.close()],
      ['hotkeySheet', () => this.hotkeySheet?.close()],
      ['symbolSearch', () => this.symbolSearch?.close()],
      ['compare', () => {
        if (this.symbolSearch?.isComparing()) this.symbolSearch.close();
      }],
      ['menu.chart', () => this.chartMenu?.close()],
      ['menu.priceAxisAdd', () => this.chartMenu?.close()],
      ['menu.drawing', () => this.drawingMenu?.close()],
      ['indicatorLegend', () => this.legendMenu?.close()],
      ['indicatorLegend.more', () => this.legendMenu?.close()],
    ];
    for (const [name, close] of closers) if (turnedOff(name)) close();
  }

  /**
   * A keyboard shortcut of your own: `keys` as `'Alt+N'`, `'Shift+R'`,
   * `'Ctrl+Shift+K'` (Ctrl is Cmd on a Mac) or one key, `label` what it does
   * in the shortcut sheet. It works while this widget was used last, not
   * while typing in a field or in a dialog, and not with the `hotkeys`
   * switch off. It comes before the widget's own shortcuts (which it then
   * replaces), not the chart's keys (arrows, Delete, Ctrl+Z…: those run as
   * well, and it warns). `null` for keys it can't read.
   */
  addHotkey(spec: import('./types.js').HotkeySpec): import('./types.js').HotkeyHandle | null {
    const parsed = parseHotkey(spec.keys);
    if (!parsed) {
      console.warn(`[ChartWidget] Can't read the shortcut "${spec.keys}": modifiers (Ctrl, Alt, Shift) and a key, joined by +.`);
      return null;
    }
    if (isChartKey(parsed)) {
      console.warn(`[ChartWidget] The chart answers ${spec.keys} itself (drawings, scrolling or zoom): both will run.`);
    }
    const entry = { spec, parsed };
    this.hostHotkeys = [...this.hostHotkeys, entry];
    return { remove: () => { this.hostHotkeys = this.hostHotkeys.filter((h) => h !== entry); } };
  }

  /** Runs the host's shortcut a key press is, if any; whether it did. */
  private handleHostHotkey(e: KeyboardEvent): boolean {
    if (this.hostHotkeys.length === 0 || !this.featureState.hotkeys) return false;
    // Text being composed (an IME) or typed with AltGr: the keys are the text's.
    if (e.isComposing || e.keyCode === IME_KEY_CODE || e.getModifierState?.('AltGraph')) return false;
    if (e.defaultPrevented || isTyping() || typedIntoField(e) || inOverlay()) return false;
    const hit = this.hostHotkeys.find((h) => matchesHotkey(e, h.parsed));
    if (!hit) return false;
    // A key without Ctrl or Alt types text elsewhere: only once this widget was pressed, and with
    // focus nowhere else on the page.
    const plain = !hit.parsed.ctrl && !hit.parsed.alt;
    if (!isKeyTarget(this.root, plain)) return false;
    const active = document.activeElement;
    if (plain && active && active !== document.body && !this.root.contains(active)) return false;
    e.preventDefault();
    hit.spec.onPress(e);
    return true;
  }

  /**
   * Runs a theme change, the user's look that isn't a colour (a grid way hidden, a dash) going
   * with them to the new theme: colours stay with the theme they were picked on.
   */
  private keepingLook(change: () => void): void {
    // The open settings keep what they changed: its colours belong to the theme that is going.
    if (this.settingsEdit) this.settings?.close();
    const user = (this.chart.getOverrides?.({ layer: 'user' }) ?? {}) as Record<string, unknown>;
    const kept = Object.fromEntries(LOOK_KEYS.filter((key) => user[key] !== undefined).map((key) => [key, user[key]]));
    change();
    if (Object.keys(kept).length > 0) this.chart.applyOverrides(kept, { layer: 'user' });
  }

  /** Whether a built-in key of the shortcut sheet works now (its switches, and what it needs). */
  private sheetKeyOn(name: WidgetFeature): boolean {
    const f = this.featureState;
    if (!f.hotkeys || !f[name]) return false;
    switch (name) {
      case 'hotkeys.commandPalette': return f.commandPalette;
      case 'hotkeys.symbolSearch': return f.symbolSearch;
      case 'hotkeys.goToDate': return f.goToDate;
      case 'hotkeys.save': return f.layouts && this.layoutSession !== null;
      case 'hotkeys.help': return f.hotkeySheet;
      case 'intervalTyping': return this.intervalInput !== null;
      case 'symbolTyping': return f.symbolSearch;
      default: return true;
    }
  }

  /** Puts the switches that are off on the widget and its dialogs (their parts hide), and tidies the bars' dividers. */
  private markSwitchedOff(): void {
    const off = offFeatures(this.featureState);
    for (const el of [this.root, this.portal]) {
      if (off) el.dataset.tcwOff = off;
      else delete el.dataset.tcwOff;
    }
    this.toolbar?.setSymbolSearch(this.featureState.symbolSearch);
    this.toolbar?.tidy();
    this.sidebar?.tidy();
    this.syncRail();
  }

  /**
   * A button of your own on the toolbar: an icon (built-in or yours), text,
   * a switch. Shown while the toolbar is.
   */
  addToolbarButton(spec: import('./types.js').ToolbarButtonSpec): import('./types.js').ToolbarButtonHandle | null {
    if (!this.toolbar) return null;
    const toolbar = this.toolbar;
    const element = toolbar.addHostButton(spec);
    toolbar.tidy();
    return {
      element,
      setActive: (on) => setHostButtonActive(element, on, spec.toggle === true),
      setText: (text) => setHostButtonText(element, spec.label, text),
      remove: () => {
        element.remove();
        toolbar.tidy();
      },
    };
  }

  /**
   * A menu button of your own on the toolbar: its entries come from `items`,
   * asked for each time it opens. Shown while the toolbar is.
   */
  addToolbarDropdown(spec: import('./types.js').ToolbarDropdownSpec): import('./types.js').ToolbarDropdownHandle | null {
    const toolbar = this.toolbar;
    if (!toolbar) return null;
    const menu = new WidgetContextMenu(this.root, spec.label);
    this.hostMenus.add(menu);
    const element = toolbar.addHostButton({
      id: spec.id,
      label: spec.label,
      icon: spec.icon,
      text: spec.text,
      side: spec.side,
      onClick: (button) => {
        if (menu.isOpen()) {
          menu.close();
          return;
        }
        const items = spec.items();
        if (items.length === 0) return;
        const box = button.getBoundingClientRect();
        const root = this.root.getBoundingClientRect();
        menu.open(withHostItems([], items), box.left - root.left, box.bottom - root.top + 2, (id) => pickHostItem(id, items), button);
      },
    });
    element.setAttribute('aria-haspopup', 'menu');
    element.setAttribute('aria-expanded', 'false');
    toolbar.tidy();
    return {
      element,
      setText: (text) => setHostButtonText(element, spec.label, text),
      remove: () => {
        menu.destroy();
        this.hostMenus.delete(menu);
        element.remove();
        toolbar.tidy();
      },
    };
  }

  /** A button of your own on the drawing sidebar, under its switches. Shown while the sidebar is. */
  addSidebarButton(spec: import('./types.js').SidebarButtonSpec): import('./types.js').SidebarButtonHandle | null {
    const sidebar = this.sidebar;
    if (!sidebar) return null;
    const element = sidebar.addHostButton(spec);
    return {
      element,
      setActive: (on) => setHostButtonActive(element, on, spec.toggle === true),
      remove: () => {
        element.remove();
        sidebar.tidy();
      },
    };
  }

  /** An item of your own on the status bar: text, or a button with `onClick`. Shown while the status bar is. */
  addStatusBarItem(spec: import('./types.js').StatusBarItemSpec): import('./types.js').StatusBarItemHandle | null {
    if (!this.statusBar) return null;
    const element = this.statusBar.addHostItem(spec);
    return {
      element,
      setText: (text) => {
        element.textContent = text;
        if (spec.label && spec.label !== text) element.setAttribute('aria-label', `${spec.label}: ${text}`);
        else element.removeAttribute('aria-label');
      },
      remove: () => element.remove(),
    };
  }

  /**
   * A place for anything of yours: beside the toolbar's chart controls
   * (`'toolbar.left'`) or its panel buttons (`'toolbar.right'`), under the
   * drawing sidebar's switches, on the status bar's left or right, or over
   * the chart (`'chart'`, a layer the pointer passes through). `null` for a
   * name it doesn't know.
   */
  getSlot(name: import('./types.js').WidgetSlot): HTMLElement | null {
    switch (name) {
      case 'toolbar.left': return this.toolbar?.hostSlot('left') ?? null;
      case 'toolbar.right': return this.toolbar?.hostSlot('right') ?? null;
      case 'sidebar': return this.sidebar?.hostSlot() ?? null;
      case 'statusBar.left': return this.statusBar?.hostSlot('left') ?? null;
      case 'statusBar.right': return this.statusBar?.hostSlot('right') ?? null;
      case 'chart': {
        if (!this.hostLayer) {
          this.hostLayer = document.createElement('div');
          this.hostLayer.className = 'tcw-host-layer';
          this.chartContainer.appendChild(this.hostLayer);
        }
        return this.hostLayer;
      }
      default: return null;
    }
  }

  private runChartMenuAction(action: ChartMenuAction, context: import('./types.js').ChartMenuItemsContext): void {
    const { price } = context;
    const at = price ?? NaN;
    const s = this.settingsState;
    const mode = scaleModeOf(action);
    if (mode) {
      this.changeSettings({ scaleMode: mode });
      return;
    }
    switch (action) {
      case 'alert':
        this.chart.addAlert(at, 'crossing');
        this.say(fill(this.t('chartMenu.alertAdded'), { price: this.formatAlertPrice(at) }));
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
        this.resetView();
        break;
      case 'resetPriceScale':
        this.changeSettings({ autoScale: true });
        break;
      case 'paste':
        this.chart.pasteDrawings();
        break;
      case 'removeIndicators':
        this.chart.removeIndicators(this.removableIndicators());
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
        // From the price axis, its tab.
        this.openSettings(context.area === 'priceAxis' ? 'scales' : undefined);
        break;
      case 'autoScale':
        this.changeSettings({ autoScale: !this.chart.isAutoScale() });
        break;
      case 'invertScale':
        this.changeSettings({ invertScale: !this.chart.isInvertScale() });
        break;
      case 'leftScale':
        this.changeSettings({ leftPriceScale: !s.leftPriceScale });
        break;
      case 'indicatorValueLabels':
        this.changeSettings({ indicatorValueLabels: !s.indicatorValueLabels });
        break;
      case 'barCountdown':
        this.changeSettings({ barCountdown: !s.barCountdown });
        break;
      case 'highLowLines':
        this.changeSettings({ highLowLines: !s.highLowLines });
        break;
      case 'lastPriceLine':
        this.changeStyle({ 'lastPrice.visible': this.chart.getStyleValue('lastPrice.visible') === false });
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
    // Switched off, it only closes.
    if (!panel.isOpen() && !this.featureState.accountPanel) return;
    panel.toggle();
  }

  /** The order ticket, at a price from the chart (or the market). */
  private openOrderTicket(price?: number): void {
    if (!this.featureState.orderTicket) return;
    const data = this.chart.getData();
    this.orderTicket?.open({
      price,
      lastPrice: data.length > 0 ? data[data.length - 1].close : null,
      rules: this.orderRules(),
      symbol: this.state.symbol,
      // − and + move a price by the market's step; a click on the chart lands between steps.
      step: (p) => this.chart.getPriceStep(p),
      round: (p) => this.chart.roundPrice(p),
    });
  }

  /** A market's rules for the order ticket (`setMarket`): its step, the day's limits, its lot. */
  private orderRules(): OrderTicketRules {
    const market = this.chart.getMarket();
    if (!market) return {};
    const stepped = market.priceStep !== undefined || (market.priceSteps?.length ?? 0) > 0;
    return {
      roundPrice: stepped ? (p) => this.chart.roundPrice(p) : undefined,
      limits: this.chart.getPriceLimits(),
      lot: market.volumeUnit,
      multiplier: market.contractMultiplier,
    };
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
    this.say(fill(this.t(`order.${kind}` as MessageKey), { price: this.formatAlertPrice(price) }));
  }

  /** The time now in the display zone ("14:05:09") and the zone's offset ("UTC+7"), for the status bar's clock. */
  private clockNow(): { time: string; zone: string } {
    const now = Date.now();
    const tz = this.displayTimezone();
    const pad = (n: number) => String(n).padStart(2, '0');
    const { time } = utcToWallTime(now, tz);
    return { time: `${time}:${pad(new Date(now).getUTCSeconds())}`, zone: tzLabel(offsetAt(tz, now)) };
  }

  /** Whether every drawing is locked, and every one hidden: the sidebar's lock all and hide all say so. */
  private refreshDrawingsState(): void {
    const drawings = this.chart.getDrawings() ?? [];
    const all = drawings.length > 0;
    this.sidebar?.setDrawingsState({
      locked: all && drawings.every((d) => d.locked),
      hidden: all && drawings.every((d) => !d.visible),
    });
  }

  /** The status bar's scale switches as the chart is now (a shared link or your code may have set it). */
  private refreshScaleSwitches(): void {
    this.statusBar?.setScale({ mode: this.chart.getScaleMode(), auto: this.chart.isAutoScale() });
  }

  /** `mode` on, or back to a regular scale when it is on already, through the settings. */
  private toggleScaleMode(mode: 'percentage' | 'logarithmic'): void {
    this.changeSettings({ scaleMode: this.chart.getScaleMode() === mode ? 'regular' : mode });
  }

  /** The display timezone from the settings; 'exchange' is the zone the chart resolved it to. */
  private displayTimezone(): TimeZoneSetting {
    const tz = settingToTimezone(this.settingsState.timezone);
    return tz === 'exchange' ? this.chart.getEffectiveTimeZone() : tz;
  }

  private toggleGoToDate(): void {
    if (!this.goToDate || !this.featureState.goToDate) return;
    if (this.goToDate.isOpen()) {
      this.goToDate.close();
      return;
    }
    const data = this.chart.getData();
    if (data.length === 0) return;
    const tz = this.displayTimezone();
    const unit = barTimeUnit(data);
    const wall = (time: number) => utcToWallTime(time * unit, tz);
    const last = data[data.length - 1].time;
    // The bars on screen, as the chart draws them (a Renko chart's bricks).
    const shown = this.chart.getVisibleTimeRange() ?? { from: data[0].time, to: last };
    const today = utcToWallTime(Date.now(), tz).date;
    this.goToDate.open({
      date: wall(last),
      range: { from: wall(shown.from), to: wall(shown.to) },
      // Daily bars and longer have no time of day.
      withTime: !(timeframeToMs(this.state.timeframe) >= DAY_MS),
      max: today,
      today,
    });
  }

  /** A moment to centre, or a span to show edge to edge, from the Go to dialog. */
  private goTo(target: GoToTarget): void {
    const data = this.chart.getData();
    const tz = this.displayTimezone();
    if (data.length === 0) return;
    const unit = barTimeUnit(data); // the bars' own unit
    if (target.kind === 'date') {
      const ms = wallTimeToUtc(target.date, target.time, tz);
      if (ms === null) return;
      this.chart.goToTime(ms / unit);
      if (ms / unit < data[0].time) this.say(this.t('range.beforeData'));
      return;
    }
    const from = wallTimeToUtc(target.from.date, target.from.time, tz);
    const to = wallTimeToUtc(target.to.date, target.to.time, tz);
    if (from === null || to === null) return;
    this.chart.setVisibleRange(from / unit, to / unit);
    if (Math.min(from, to) / unit < data[0].time) this.say(this.t('range.beforeData'));
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
    if (!this.featureState.customTimeframes) return false;
    const tf = parseTimeframeInput(text);
    if (!tf || !this.chart.isTimeframeAllowed(tf)) return false;
    if (this.adapter && !servesTimeframe(this.adapter, tf)) return false;
    // Tick bars come from a feed's trades; bars on the chart can't make them.
    if (!this.adapter && tickBarCount(tf) !== null) return false;
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
    // One not on offer would be added as a custom interval.
    if (!this.timeframes.includes(tf) && !this.featureState.customTimeframes) return false;
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
    if (!this.featureState.indicatorTemplates) return;
    const template = this.templates.get(name);
    if (!template) return;
    this.chart.applyIndicatorSetup(template.indicators);
    this.syncIndicatorsFromChart();
    this.updateUI();
    this.say(fill(this.t('templates.applied'), { name: template.name }));
  }

  /** Save the chart's indicators as a template, asking for its name. */
  private promptSaveIndicatorTemplate(): void {
    if (!this.featureState.indicatorTemplates) return;
    if (this.chart.getActiveIndicators().length === 0) {
      this.say(this.t('templates.nothing'), 'error');
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
          this.say(this.t('templates.saveFailed'), 'error');
          throw err;
        }
        this.indicatorPicker?.setTemplates(this.templateNames());
        this.say(fill(this.t('templates.saved'), { name }));
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

  private handleDataUpdate(p: DataUpdatePayload): void {
    if (p.kind === 'bars') {
      if (p.length > 0 && this.loading.isActive()) {
        this.loading.end();
        // A retry after a failed load just delivered history.
        if (this.state.connectionState === 'error') this.setConnectionState('connected', this.t('status.live'));
      }
      return;
    }
    if (p.kind === 'error') {
      // Only a failed *load* is reported from the error itself. Errors outside
      // one can be transient (a single failed poll on a healthy connection);
      // the status bar follows the stream's connection state below instead.
      if (this.loading.isActive()) {
        this.loading.fail(this.t('status.connectionFailed'));
        this.setConnectionState('error', p.error || this.t('status.connectionFailed'));
      }
      return;
    }
    if (p.kind !== 'connection') return;
    switch (p.connection.state) {
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

  /** The depth ladder, a page of the dock: open or shut it (the Trade menu's entry). */
  private toggleLadder(): void {
    if (!this.depthLadder || !this.featureState.depthLadder) return;
    this.dock?.toggle('depthLadder');
  }

  private toggleAlerts(): void {
    if (!this.alertsPanel || !this.featureState.alerts) return;
    this.dock?.toggle('alerts');
  }

  private handleToggleFavorite(tool: DrawingToolType): void {
    const pinned = this.favoritesStore.toggle(tool);
    this.sidebar?.setFavorites(this.favoritesStore.list());
    this.say(pinned ? this.t('toast.pinned') : this.t('toast.unpinned'));
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
    this.say(ok ? this.t('toast.imageCopied') : this.t('toast.imageCopyFailed'), ok ? 'info' : 'error');
  }

  /** Copy a shareable deep-link (current view encoded in the URL hash) to the clipboard. */
  async copyShareLink(): Promise<void> {
    const base = typeof location !== 'undefined' ? location.href : '';
    const url = buildShareUrl(base, this.exportState());
    try {
      await navigator.clipboard.writeText(url);
      this.say(this.t('toast.linkCopied'));
    } catch {
      this.say(this.t('toast.copyFailed'), 'error');
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
    if (!this.dataWindow || !this.featureState.dataWindow) return;
    this.dock?.toggle('dataWindow');
  }

  private toggleObjects(): void {
    if (!this.objectTree || !this.featureState.objectTree) return;
    this.dock?.toggle('objectTree');
  }

  /**
   * The dock's pages, in the rail's order: the watchlist, alerts, objects,
   * the data window, the symbol info and the depth ladder, all shut to start
   * with. Each draws itself as it shows, and says so on the toolbar's button.
   */
  private setupDock(): void {
    const dock = this.dock;
    if (!dock) return;
    if (this.watchlist) {
      const list = this.watchlist;
      // Hidden, its sparklines were drawn at no size: drawn again as it shows.
      dock.addPage({ id: 'watchlist', label: this.t('watchlist.title'), icon: 'list', element: list.element, parts: ['dock.watchlist'], onShow: () => list.redraw() });
    }
    const alerts = this.alertsPanel;
    if (alerts) {
      dock.addPage({
        id: 'alerts', label: this.t('alerts.title'), icon: 'bell', element: alerts.element, parts: ['dock.alerts', 'alerts'],
        onShow: () => {
          alerts.openPanel();
          this.refreshAlerts();
          this.toolbar?.setActive('alerts', true);
        },
        onHide: () => {
          alerts.close();
          this.toolbar?.setActive('alerts', false);
        },
      });
    }
    const tree = this.objectTree;
    if (tree) {
      dock.addPage({
        id: 'objectTree', label: this.t('objects.title'), icon: 'layers', element: tree.element, parts: ['dock.objectTree', 'objectTree'],
        onShow: () => {
          tree.openPanel();
          this.refreshObjects();
          this.toolbar?.setActive('objects', true);
        },
        onHide: () => {
          tree.close();
          this.toolbar?.setActive('objects', false);
        },
      });
    }
    const data = this.dataWindow;
    if (data) {
      dock.addPage({
        id: 'dataWindow', label: this.t('dataWindow.title'), icon: 'table', element: data.element, parts: ['dock.dataWindow', 'dataWindow'],
        onShow: () => {
          data.openPanel();
          data.render(this.buildDataWindowModel());
        },
        onHide: () => data.close(),
      });
    }
    const info = this.symbolInfoPanel;
    if (info) {
      dock.addPage({
        id: 'symbolInfo', label: this.t('symbolInfo.title'), icon: 'info', element: info.element, parts: ['dock.symbolInfo', 'symbolInfo'],
        onShow: () => info.open(),
        onHide: () => info.close(),
      });
    }
    const ladder = this.depthLadder;
    if (ladder) {
      dock.addPage({
        id: 'depthLadder', label: this.t('ladder.title'), icon: 'ladder', element: ladder.element, parts: ['dock.depthLadder', 'depthLadder'],
        onShow: () => ladder.openPanel(),
        onHide: () => ladder.close(),
      });
    }
    this.syncRail();
    this.fitDockToWidth();
    if (typeof ResizeObserver !== 'undefined') {
      this.dockObserver = new ResizeObserver(() => this.fitDockToWidth());
      this.dockObserver.observe(this.root);
    }
  }

  /**
   * The dock and the widget's width. Going narrow (a phone, a rotated
   * tablet) shuts any panel: it would be a sheet over the chart. No panel
   * opens by itself: the chart has the room until one is asked for.
   */
  private fitDockToWidth(): void {
    const dock = this.dock;
    const width = this.root.clientWidth;
    if (!dock || width === 0) return;
    const narrow = width < NARROW_WIDGET_PX;
    const was = this.dockNarrow;
    this.dockNarrow = narrow;
    if (narrow && was !== true) dock.close();
  }

  /** Whether the rail shows now: on, and the widget not narrow. */
  private railShown(): boolean {
    return this.featureState.dock && !this.root.hasAttribute('data-tcw-narrow');
  }

  /**
   * The rail's Tab stop on a button that shows, and the toolbar's alerts and
   * objects buttons hidden while the rail has its own for them (so the
   * "more" menu leaves them out too).
   */
  private syncRail(): void {
    this.dock?.syncRail();
    const rail = this.railShown();
    this.toolbar?.setRailed('alerts', rail && this.featureState['dock.alerts']);
    this.toolbar?.setRailed('objects', rail && this.featureState['dock.objectTree']);
    this.toolbar?.fit();
  }

  /** Where the keyboard goes when a panel shuts and the rail can't take it: its toolbar button, or "more" on a phone. */
  private panelFocusTarget(page: WidgetPanel): HTMLElement | null {
    const role = PANEL_TOOLBAR_ROLES[page];
    const own = role ? this.root.querySelector<HTMLElement>(`.tcw-toolbar [data-role="${role}"]`) : null;
    const narrow = this.root.hasAttribute('data-tcw-narrow');
    if (own && !own.hidden && !(narrow && own.classList.contains('tcw-toolbar-overflow'))) return own;
    return this.root.querySelector<HTMLElement>('.tcw-toolbar-more') ?? this.chartContainer;
  }

  /** A panel shut by its own close button: by hand. */
  private closePanelByHand(page: WidgetPanel): void {
    this.dock?.closePage(page);
  }

  private openIndicatorSettings(instanceId: string): void {
    if (!this.indicatorSettings || !this.featureState.indicatorSettings) return;
    const active = this.chart.getActiveIndicators();
    const ind = active.find((i) => i.instanceId === instanceId);
    if (!ind) return;
    const style = this.chart.getIndicatorStyle(instanceId);
    const pane = ind.descriptor.placement === 'panel' || !!ind.pane;
    const ownLevels = (this.chart.getIndicatorSetup() ?? []).find((s) => s.instanceId === instanceId)?.levels !== undefined;
    this.chart.beginIndicatorEdit(instanceId);
    this.indicatorSettings.open({
      instanceId,
      indicatorId: ind.id,
      name: ind.descriptor.name,
      defaults: ind.descriptor.defaultConfig,
      params: ind.params,
      inputs: ind.descriptor.inputs,
      lineSources: lineSourcesFor(instanceId, active),
      plots: ind.descriptor.plots,
      colors: style?.colors,
      lineWidth: style?.lineWidths[0],
      plotStyles: style?.plots,
      intervals: this.chart.getIndicatorIntervals(instanceId) ?? null,
      // Levels belong to pane indicators.
      levels: pane ? this.chart.getIndicatorLevels(instanceId) : undefined,
      defaultLevels: ind.descriptor.levels,
      ownLevels,
      scale: pane ? undefined : this.chart.getIndicatorScale(instanceId),
    });
  }

  private refreshObjects(): void {
    this.refreshDrawingsState();
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
      offInterval: d.visible && !this.chart.isDrawingShown(d.id),
      locked: d.locked,
      group: d.group,
    }));
    const compares = this.compares.map((c) => ({ id: c.id, label: c.symbol, color: c.color }));
    this.objectTree.setObjects(indicators, drawings, compares);
  }

  private async handleAddCompare(): Promise<void> {
    if (!this.featureState.compare) return;
    if (!this.adapter) {
      this.say(this.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    this.symbolSearch?.openCompare({
      symbols: this.symbols,
      current: this.state.symbol,
      search: this.symbolSearchFn(),
      ways: compareWayOptions(this.t),
      way: this.compareWay,
      compared: this.comparedNow(),
      onAdd: (symbol, way) => {
        if (!isCompareWay(way)) return;
        this.compareWay = way;
        void this.addCompareSymbol(symbol, way);
      },
      onRemove: (id) => {
        if (this.compares.some((c) => c.id === id)) this.handleRemoveCompare(id);
        else this.chart.removeIndicator(id);
      },
    });
  }

  /** What is compared with the chart's symbol now, as the compare dialog lists it. */
  private comparedNow(): ReturnType<typeof comparedEntries> {
    const ownPanes = new Set(this.chart.getIndicatorPanes().flatMap((p) => p.instanceIds));
    return comparedEntries(this.compares, this.chart.getActiveIndicators(), ownPanes, this.t);
  }

  /** The compare dialog's list, after something was compared or taken off. */
  private refreshCompareDialog(): void {
    if (this.symbolSearch?.isComparing()) this.symbolSearch.setCompared(this.comparedNow());
  }

  /**
   * Compare with another symbol: its percent change on the price scale
   * (`'percent'`, the default), its price on a scale of its own (`'scale'`)
   * or in a pane of its own (`'pane'`), the spread or ratio of this symbol
   * to it (`'spread'`, `'ratio'`), or how they correlate, by price or by
   * bar-to-bar returns (`'correlation'`, `'correlationLog'`). Its bars come
   * through the adapter.
   */
  async addCompareSymbol(symbol: string, way: CompareWay = 'percent'): Promise<void> {
    if (!this.adapter) {
      this.say(this.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    if (way !== 'percent') {
      const id = way === 'scale' ? this.chart.addIndicator('compareSymbol', { symbol }, 'bottom', { scale: 'left' })
        : way === 'pane' ? this.chart.addIndicator('compareSymbol', { symbol })
          : way === 'correlation' ? this.chart.addIndicator('correlation', { symbol })
            : way === 'correlationLog' ? this.chart.addIndicator('correlationlog', { symbol })
              : this.chart.addIndicator('spread', { symbol, mode: way });
      if (id && way === 'pane') this.chart.moveIndicatorToPane(id, 'new');
      return;
    }
    // On the chart already, or its bars on the way (picked twice in a row).
    if (this.compares.some((c) => c.symbol === symbol) || this.comparesLoading.has(symbol)) return;
    const id = `cmp_${symbol}`;
    this.comparesLoading.add(symbol);
    try {
      const bars = await withResampling(this.adapter).fetchHistory(symbol, this.state.timeframe, this.options.historyLimit ?? 500);
      if (this.destroyed || this.compares.some((c) => c.symbol === symbol)) return;
      const color = COMPARE_COLORS[this.compares.length % COMPARE_COLORS.length];
      // Percent mode normalizes mixed-price symbols (e.g. BTC vs a $2 alt) onto
      // a shared % axis — the right default for comparison.
      if (this.compares.length === 0) this.chart.setCompareMode('percent');
      this.chart.addCompareSymbol(id, symbol, bars, color);
      this.compares = [...this.compares, { id, symbol, color }];
      this.refreshObjects();
      this.refreshCompareDialog();
      this.say(fill(this.t('toast.comparing'), { symbol }));
    } catch (err: unknown) {
      this.say(`${symbol}: ${err instanceof Error ? err.message : this.t('toast.loadFailed')}`, 'error');
    } finally {
      this.comparesLoading.delete(symbol);
    }
  }

  private handleRemoveCompare(id: string): void {
    this.chart.removeCompareSymbol(id);
    this.compares = this.compares.filter((c) => c.id !== id);
    this.refreshObjects();
    this.refreshCompareDialog();
  }

  /**
   * Bars of a symbol the chart's indicators read (a compare on its own
   * scale, a spread), at the chart's interval. A later interval wins.
   */
  private async loadSymbolSeries(symbol: string): Promise<void> {
    if (!this.adapter) {
      this.say(this.t('toast.compareNeedsAdapter'), 'error');
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
      this.say(`${symbol}: ${err instanceof Error ? err.message : this.t('toast.loadFailed')}`, 'error');
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

  /** The prices the panels show, written again in the decimals the chart has now. */
  private refreshPriceTexts(): void {
    this.refreshAlerts();
    this.refreshAccountSoon();
    if (this.dataWindow?.isOpen()) this.dataWindow.render(this.buildDataWindowModel());
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
    // The price as the chart shows it: on its tick grid, or at its precision.
    if (channel === 'price') return data.length > 0 ? this.chart.roundPrice(data[data.length - 1].close) : null;
    const sep = channel.indexOf(':');
    if (sep < 0 || data.length === 0) return null;
    const instanceId = channel.slice(0, sep);
    const key = channel.slice(sep + 1);
    const v = this.chart.getIndicatorOutput(instanceId)?.series?.[data.length - 1]?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }

  /**
   * Money in the quote's units (a stop's risk, an order's value), in the
   * number locale: to the decimals of the price step, two at most (a forex
   * pip's five would be noise on money).
   */
  private formatMoney(value: number): string {
    return this.formatNumber(value, Math.min(stepDecimals(this.chart.getPriceStep()), MONEY_DECIMALS));
  }

  /** A plain figure to `decimals`, in the number locale. */
  private formatNumber(value: number, decimals: number): string {
    const locale = this.settingsState.numberLocale || undefined;
    return value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  private formatAlertPrice(price: number): string {
    // The chart's own price format (fractions, a host's function) wins, then
    // the market's or the symbol's decimals: then a price reads as the axis
    // writes it, in the chart's number locale.
    if (this.chart.getPriceFormatter?.() || this.chartSetsDecimals()) return this.chart.formatPrice(price);
    // Nothing sets them: pick digits from magnitude so BTC (64,200.5) and a
    // sub-dollar alt (0.04821) both read sensibly, whatever is on view.
    const abs = Math.abs(price);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    const locale = this.settingsState.numberLocale || undefined;
    return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });
  }

  /** Whether the market or the symbol sets the decimals prices show (the market's win, as on the chart). */
  private chartSetsDecimals(): boolean {
    return this.chart.getMarket?.()?.pricePrecision !== undefined || this.chart.getSymbolInfo?.()?.pricePrecision !== undefined;
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
    // Settings open: their Symbol tab shows the type's own colours.
    this.settings?.refresh(this.settingsState, type);
    this.updateUI();
  }

  /**
   * Add another instance — picking EMA twice gives two EMAs (e.g. 20 and 50
   * once their settings are changed). Remove one from its chip.
   */
  /** Add one as its saved default has it (the chip strip follows the indicatorAdd event); false when the chart won't. */
  private handleAddIndicator(indId: string): boolean {
    return this.chart.addIndicator(indId, this.indicatorDefaults.get(indId)?.params ?? {}) !== null;
  }

  /** "Save as default": new indicators of the kind start like this one, here and next time. */
  private saveIndicatorDefault(indicatorId: string, saved: IndicatorDefault): void {
    if (!this.indicatorDefaults.save(indicatorId, saved)) {
      this.say(this.t('indicatorSettings.defaultSaveFailed'), 'error');
      return;
    }
    this.chart.setIndicatorDefaults(indicatorId, saved.style);
    const name = this.chart.getAvailableIndicators()?.find((d) => d.id === indicatorId)?.shortName ?? indicatorId.toUpperCase();
    this.say(fill(this.t('indicatorSettings.defaultSaved'), { name }));
  }

  private handleRemoveIndicator(instanceId: string): void {
    this.chart.removeIndicator(instanceId);
  }

  private toggleCommandPalette(): void {
    if (this.commandPalette?.isOpen()) {
      this.commandPalette.close();
      return;
    }
    if (!this.featureState.commandPalette) return;
    this.commandPalette?.open(this.buildCommandItems());
  }

  private buildCommandItems(): CommandItem[] {
    const items: CommandItem[] = [];

    for (const ind of this.indicatorPickerItems()) {
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

    const toolKeys = toolShortcuts();
    for (const group of localizeToolGroups(DRAWING_TOOL_GROUPS, this.t)) {
      for (const tool of group.tools) {
        items.push({
          id: tool.value,
          label: tool.label,
          category: 'drawing',
          shortcut: toolKeys[tool.value] ? this.keysShown('hotkeys.tools', toolKeys[tool.value]!) : undefined,
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

    // The widget's own, with the keys the sheet lists for them.
    items.push(
      { id: 'symbolSearch', label: this.t('hotkeys.symbolSearch'), category: 'action', shortcut: this.keysShown('hotkeys.symbolSearch', `${MOD_KEY}+P`) },
      { id: 'compare', label: this.t('compare.title'), category: 'action' },
      { id: 'goToDate', label: this.t('hotkeys.goToDate'), category: 'action', shortcut: this.keysShown('hotkeys.goToDate', 'Alt+G') },
      { id: 'resetView', label: this.t('chartMenu.resetView'), category: 'action', shortcut: this.keysShown('hotkeys.resetView', 'Alt+R') },
      { id: 'invertScale', label: this.t('hotkeys.invertScale'), category: 'action', shortcut: this.keysShown('hotkeys.invertScale', 'Alt+I') },
      { id: 'saveLayout', label: this.t('hotkeys.saveLayout'), category: 'action', shortcut: this.keysShown('hotkeys.save', `${MOD_KEY}+S`) },
      { id: 'watchlist', label: this.t('watchlist.title'), category: 'action' },
      { id: 'alerts', label: this.t('alerts.title'), category: 'action' },
      { id: 'objectTree', label: this.t('objects.title'), category: 'action' },
      { id: 'dataWindow', label: this.t('action.dataWindow'), category: 'action' },
      { id: 'symbolInfo', label: this.t('action.symbolInfo'), category: 'action' },
      { id: 'screenshot', label: this.t('action.screenshot'), category: 'action' },
      { id: 'copyImage', label: this.t('action.copyImage'), category: 'action' },
      { id: 'shareView', label: this.t('action.shareView'), category: 'action' },
      { id: 'toggleTheme', label: this.t('action.toggleTheme'), category: 'action' },
      { id: 'settings', label: this.t('action.settings'), category: 'action' },
      { id: 'autoFib', label: this.t('action.autoFib'), category: 'action' },
      { id: 'clearDrawings', label: this.t('action.clearDrawings'), category: 'action' },
      { id: 'hotkeys', label: this.t('hotkeys.title'), category: 'action', shortcut: this.keysShown('hotkeys.help', '?') },
    );

    return items.filter((item) => item.category !== 'action' || (this.commandOn(item.id) && this.commandThere(item.id)));
  }

  /** Whether the widget has what a command works on: a watchlist, a feed to compare from, layouts to save to. */
  private commandThere(id: string): boolean {
    if (id === 'watchlist') return this.watchlist !== null;
    if (id === 'compare') return this.adapter !== null && this.options.chartOptions?.features?.compareSymbols !== false;
    if (id === 'saveLayout') return this.layoutSession !== null;
    return true;
  }

  /**
   * `keys` as a command's shortcut, where they work: their switch on (and
   * what they need there), and no shortcut of the host's on them instead.
   */
  private keysShown(name: WidgetFeature, keys: string): string | undefined {
    if (!this.sheetKeyOn(name)) return undefined;
    const taken = this.hostHotkeys.some((h) => h.parsed.display.join('+').toLowerCase() === keys.toLowerCase());
    return taken ? undefined : keys;
  }

  /** The shortcut sheet: the keys switched on, and the host's. */
  private openHotkeySheet(): void {
    this.hotkeySheet?.open({
      isOn: (name) => this.sheetKeyOn(name),
      extra: this.hostHotkeys.map((h) => ({ keys: h.parsed.display, text: h.spec.label })),
    });
  }

  /** Whether a command's switch (when it has one) is on. */
  private commandOn(id: string): boolean {
    const name = commandFeature(id);
    return name === undefined || this.featureState[name];
  }

  private handleAction(id: string): void {
    if (!this.commandOn(id)) return;
    switch (id) {
      case 'symbolSearch':
        this.openSymbolSearch();
        break;
      case 'compare':
        void this.handleAddCompare();
        break;
      case 'goToDate':
        this.toggleGoToDate();
        break;
      case 'resetView':
        this.resetView();
        break;
      case 'invertScale':
        this.changeSettings({ invertScale: !this.settingsState.invertScale });
        this.settings?.refresh(this.settingsState);
        break;
      case 'saveLayout':
        void this.saveLayout();
        break;
      case 'watchlist':
      case 'alerts':
      case 'objectTree':
        this.openPanel(id);
        break;
      case 'hotkeys':
        this.openHotkeySheet();
        break;
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
        this.say(id ? this.t('toast.autoFibAdded') : this.t('toast.noSwing'));
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
    if (!this.featureState.themeToggle) return;
    const isDark = !this.state.isDark;
    this.state = { ...this.state, isDark };
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
    this.portal.dataset.tcwTheme = this.root.dataset.tcwTheme;
    // The mode's theme: the host's own, or the built-in one. The user's colours stay with each.
    this.keepingLook(() => this.chart.setTheme(isDark ? this.themeOf.dark : this.themeOf.light));
    this.chart.setWatermark(this.state.symbol.replace('USDT', ' / USDT'), {
      fontSize: 48,
      color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    });
    this.updateUI();
  }

  private openSettings(tab?: SettingsTab): void {
    if (!this.featureState.settings || this.settings?.isOpen()) return;
    // The chart's own settings of its type (a layout may have brought them), and its scale as a drag left it.
    this.settingsState = {
      ...this.settingsState,
      chartTypeOptions: this.chart.getChartTypeOptions?.() ?? {},
      autoScale: this.chart.isAutoScale?.() ?? this.settingsState.autoScale,
    };
    this.settingsEdit = { settings: { ...this.settingsState }, style: this.settingsStyle(), keys: new Set(), styleKeys: new Set() };
    this.settings?.open(this.settingsState, this.state.chartType, tab);
  }

  /** The whole series in view, the price scale fitted to it (the menus' Reset, Alt+R). */
  private resetView(): void {
    this.chart.fitContent();
    this.changeSettings({ autoScale: true });
    this.settings?.refresh(this.settingsState);
  }

  /** The settings closed: OK keeps what they changed as one undo step, Cancel puts it back as it was on opening. */
  private endSettingsEdit(keep: boolean): void {
    const edit = this.settingsEdit;
    this.settingsEdit = null;
    if (!edit) return;
    const keys = [...edit.keys];
    const pick = (from: ChartSettingsState): Partial<ChartSettingsState> => Object.fromEntries(keys.map((k) => [k, from[k]]));
    const styleKeys = [...edit.styleKeys];
    const before = pick(edit.settings);
    const beforeStyle = styleKeys.length > 0
      ? { theme: edit.style.theme, overrides: Object.fromEntries(styleKeys.map((k) => [k, edit.style.overrides[k] ?? null])) as SettingsStylePatch }
      : null;
    if (!keep) {
      this.restoreSettings(before, beforeStyle);
      return;
    }
    const after = pick(this.settingsState);
    const afterStyle = styleKeys.length > 0 ? this.settingsStyle(styleKeys) : null;
    if (JSON.stringify([before, beforeStyle]) === JSON.stringify([after, afterStyle])) return;
    this.chart.recordUndo({ undo: () => this.restoreSettings(before, beforeStyle), redo: () => this.restoreSettings(after, afterStyle) });
  }

  /** In the open settings, the keys a change touched: what Cancel and the undo step go by. */
  private touchSettings(keys: Iterable<keyof ChartSettingsState>, styleKeys: Iterable<ChartStyleKey> = []): void {
    if (!this.settingsEdit) return;
    for (const key of keys) this.settingsEdit.keys.add(key);
    for (const key of styleKeys) this.settingsEdit.styleKeys.add(key);
  }

  /** A chart template in place of the chart's look: its switches, and its colours over the theme's. */
  private applyChartTemplate(name: string): void {
    const template = this.chartTemplates.get(name);
    if (!template) return;
    this.touchSettings(Object.keys(template.settings) as (keyof ChartSettingsState)[], SETTINGS_LOOK_KEYS);
    this.applySettings(template.settings);
    this.chart.resetOverrides([...SETTINGS_LOOK_KEYS], { layer: 'user' });
    this.chart.applyOverrides(template.style, { layer: 'user' });
    this.settings?.refresh(this.settingsState);
    this.say(fill(this.t('templates.applied'), { name }));
  }

  /** Save the chart's look as a template, asking for its name over the open settings. */
  private promptSaveChartTemplate(): void {
    this.chartTemplatePrompt ??= new WidgetNamePrompt(this.overlayHost(), this.t);
    this.chartTemplatePrompt.open({
      title: this.t('settings.saveTemplateTitle'),
      submitLabel: this.t('common.save'),
      placeholder: this.t('settings.templatePlaceholder'),
      onSubmit: (name) => {
        if (!this.chartTemplates.save(name, this.settingsState, this.settingsStyle().overrides)) {
          this.say(this.t('templates.saveFailed'), 'error');
          throw new Error('The template could not be saved');
        }
        this.say(fill(this.t('templates.saved'), { name }));
      },
    });
  }

  // --- Toast ---

  /**
   * Show a transient toast inside the widget. Auto-dismisses after 3.5s.
   * Used by the drag-drop importer for success / failure feedback, but
   * exposed so apps can post their own (e.g. "alert triggered at 64,200").
   * `icon`: one of the widget's icons (`'bell'`, `'check'`, `'info'`…) before the text.
   */
  toast(message: string, kind: 'info' | 'error' = 'info', icon?: string): void {
    const el = document.createElement('div');
    el.className = `tcw-toast ${kind === 'error' ? 'tcw-toast-error' : ''}`;
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    // An icon name the set doesn't have shows no icon.
    const svg = icon ? createIcon(icon, 14) : '';
    if (svg) {
      const mark = document.createElement('span');
      mark.className = 'tcw-toast-icon';
      mark.innerHTML = svg;
      el.appendChild(mark);
    }
    el.appendChild(document.createTextNode(message));
    // Over an open dialog (a template saved from the settings), not dimmed behind its backdrop.
    const dialogOpen = (host: HTMLElement) => host.querySelector('.tcw-modal-backdrop:not([hidden])') !== null;
    const host = dialogOpen(this.portal) ? this.portal : this.root;
    el.classList.toggle('tcw-toast-over', host === this.portal || dialogOpen(this.root));
    host.appendChild(el);
    // Trigger CSS transition on next frame
    requestAnimationFrame(() => el.classList.add('tcw-toast-in'));
    setTimeout(() => {
      el.classList.remove('tcw-toast-in');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      // Hard timeout in case transitionend doesn't fire (display:none, etc.)
      setTimeout(() => el.remove(), 400);
    }, 3500);
  }

  /**
   * The widget's own notices, unless the `toasts` switch is off; its errors
   * show either way (yours, through `toast`, always show).
   */
  private say(message: string, kind: 'info' | 'error' = 'info', icon?: string): void {
    if (this.featureState.toasts || kind === 'error') this.toast(message, kind, icon);
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
      // The user's timeframe, not one a long range switched to.
      timeframe: this.chosenTimeframe ?? this.state.timeframe,
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
    this.settings?.refresh(this.settingsState, this.state.chartType);
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
      capture: () => ({ content: this.getLayoutContent(), symbol: this.state.symbol, timeframe: this.chosenTimeframe ?? this.state.timeframe }),
      apply: async (layout: SavedLayout) => {
        if (!(await this.applyLayoutContent(layout.content))) throw new Error('Not a widget layout');
      },
    }, {
      autoSave: cfg.autoSave,
      debounceMs: cfg.debounceMs,
      onChange: () => this.toolbar?.setLayout(session.current()?.name ?? null, session.isDirty()),
      onError: () => this.say(this.t('layouts.saveFailed'), 'error'),
    });
    this.layoutSession = session;
    this.layoutsUI = new WidgetLayoutsUI(session, {
      root: this.root,
      t: this.t,
      saveKeys: () => this.keysShown('hotkeys.save', `${MOD_KEY}+S`),
      toast: (message, kind) => this.say(message, kind),
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
    this.indicatorPicker?.setCounts(this.indicatorCounts());
  }

  /** Open the indicators dialog, or close it when it is open. */
  private toggleIndicatorPicker(): void {
    if (this.indicatorPicker?.isOpen()) {
      this.indicatorPicker.close();
      return;
    }
    if (!this.indicatorPicker || !this.featureState['toolbar.indicators']) return;
    this.indicatorPicker.open({
      items: this.indicatorPickerItems(),
      favorites: this.indicatorFavorites.list(),
      templates: this.featureState.indicatorTemplates ? this.templateNames() : null,
      counts: this.indicatorCounts(),
    });
    this.toolbar?.setIndicatorsOpen(true);
  }

  /**
   * Every indicator the chart can add, your own included, as the dialog lists
   * them; not Compare's, which need the other symbol it asks for.
   */
  private indicatorPickerItems(): IndicatorPickerItem[] {
    return (this.chart.getAvailableIndicators() ?? [])
      .filter((d) => !SYMBOL_INDICATOR_IDS.has(d.id) && this.chart.isIndicatorAllowed(d.id) !== false)
      .map((d) => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName ?? d.id.toUpperCase(),
      placement: d.placement === 'panel' ? 'panel' : 'overlay',
      category: indicatorCategory(d),
    }));
  }

  /** How many of each indicator are on the chart. */
  private indicatorCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const { id } of this.state.activeIndicators.values()) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }

  private templateNames(): string[] {
    return this.templates.list().map((t) => t.name);
  }

  // --- Replay ---

  /** Open (or close) bar replay with its scrubber — what the toolbar's Replay button does. */
  toggleReplay(): void {
    if (this.replayBar?.isMounted()) {
      this.exitReplay();
    } else if (this.featureState.replay) {
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
    if (!this.featureState.replay) return;
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
      this.chart.replayStart({
        speed: this.replaySpeed,
        interval: 1000,
        startIndex: start,
        paused: true,
        revealMarks: this.options.replayRevealMarks !== false,
        ...(steps ? { steps } : {}),
      });
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
      if (!steps) this.say(this.t('replay.stepsFailed'), 'error');
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
    if (patch.scaleMode !== undefined || patch.autoScale !== undefined) queueMicrotask(() => this.refreshScaleSwitches());
    // Another zone: the clock says so at once.
    if (patch.timezone !== undefined) queueMicrotask(() => this.statusBar?.tick());
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
      this.chart.setTimeZone(settingToTimezone(patch.timezone));
    }
    if (patch.highLowLines !== undefined) this.chart.setHighLowLines(patch.highLowLines);
    if (patch.extendedHours !== undefined) this.chart.setExtendedHours(patch.extendedHours);
    if (patch.mainSeriesVisible !== undefined) this.chart.setMainSeriesVisible(patch.mainSeriesVisible);
    if (patch.chartTypeOptions !== undefined) {
      // Every type: one left out goes back to its defaults (a reset).
      this.chart.setChartTypeOptions({ renko: {}, lineBreak: {}, kagi: {}, pointAndFigure: {}, rangeBars: {}, ...patch.chartTypeOptions });
    }
  }

  private resetSettings(): void {
    // The look goes back to the theme's (not to a theme's of its own); the rest to the defaults.
    const before = { ...this.settingsState };
    const beforeStyle = this.settingsStyle();
    const defaults = { ...this.settingsDefaults };
    this.touchSettings(Object.keys(defaults) as (keyof ChartSettingsState)[], SETTINGS_LOOK_KEYS);
    this.applySettings(defaults);
    this.chart.resetOverrides([...SETTINGS_LOOK_KEYS], { layer: 'user' });
    const after = { ...this.settingsState };
    const afterStyle = this.settingsStyle();
    this.settings?.refresh(this.settingsState);
    // In the open settings, OK records it with the rest.
    if (this.settingsEdit || JSON.stringify([before, beforeStyle]) === JSON.stringify([after, afterStyle])) return;
    this.chart.recordUndo({ undo: () => this.restoreSettings(before, beforeStyle), redo: () => this.restoreSettings(after, afterStyle) });
  }

  /**
   * A change to the look in the settings: style keys on the user's layer (null
   * takes one away), kept with the theme they were picked on, and in the
   * chart's undo history. A burst on the same keys (a colour dragged across
   * the picker) is one step.
   */
  private changeStyle(patch: SettingsStylePatch): void {
    // Only the keys it touched: an undo leaves the rest (the host's own user overrides) as they are.
    const keys = Object.keys(patch) as ChartStyleKey[];
    this.touchSettings([], keys);
    const before = this.settingsStyle(keys);
    this.chart.applyOverrides(patch, { layer: 'user' });
    const after = this.settingsStyle(keys);
    if (this.settingsEdit || JSON.stringify(before) === JSON.stringify(after)) return;
    this.chart.recordUndo({
      subject: `style:${Object.keys(patch).sort().join(',')}`,
      undo: () => this.restoreSettings({}, before),
      redo: () => this.restoreSettings({}, after),
    });
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
    this.touchSettings(keys);
    const before = pick();
    this.applySettings(patch);
    const after = pick();
    if (this.settingsEdit || JSON.stringify(before) === JSON.stringify(after)) return;
    this.chart.recordUndo({
      subject: `settings:${Object.keys(patch).sort().join(',')}`,
      undo: () => this.restoreSettings(before),
      redo: () => this.restoreSettings(after),
    });
  }

  /**
   * The user's overrides on `keys` (null: none set), with the theme they go
   * with: what an undo of the look puts back.
   */
  private settingsStyle(keys: readonly ChartStyleKey[] = SETTINGS_LOOK_KEYS): { theme: string; overrides: SettingsStylePatch } {
    const user = (this.chart.getOverrides?.({ layer: 'user' }) ?? {}) as Record<string, unknown>;
    const overrides = Object.fromEntries(keys.map((key) => {
      const value = user[key];
      return [key, typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' ? value : null];
    })) as SettingsStylePatch;
    return { theme: this.chart.getTheme()?.name ?? '', overrides };
  }

  /** Settings back as they were (an undo or redo), shown in the settings if they're open. */
  private restoreSettings(values: Partial<ChartSettingsState>, style: { theme: string; overrides: SettingsStylePatch } | null = null): void {
    this.applySettings(values);
    // The look picked on another theme stays with that theme.
    if (style && style.theme === (this.chart.getTheme()?.name ?? '')) {
      this.chart.applyOverrides(style.overrides, { layer: 'user' });
    }
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
    if (!this.indicatorLegend || this.legendFrame || !this.featureState.indicatorLegend) return;
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
      const style = this.chart.getIndicatorStyle(ind.instanceId);
      // Not drawn on this interval: no values to read off it.
      const offInterval = ind.visible && ind.shown === false;
      const values = offInterval ? [] : legendValues(ind.descriptor, point, style?.colors ?? [], style?.plots);
      return {
        instanceId: ind.instanceId,
        label: indicatorChipLabel(ind.id, ind.params, ind.descriptor.defaultConfig, ind.descriptor.shortName),
        visible: ind.visible,
        offInterval,
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
    // Settings and remove go with the row's own buttons.
    const row: ContextMenuEntry[] = [];
    if (this.featureState.indicatorSettings && this.featureState['indicatorLegend.settings']) {
      row.push({ id: 'settings', label: this.t('legend.settings'), icon: 'settings' });
    }
    if (this.featureState['indicatorLegend.remove']) row.push({ id: 'remove', label: this.t('legend.remove'), icon: 'trash', danger: true });
    if (entries.length > 0 && row.length > 0) entries.push('separator');
    entries.push(...row);
    const indicatorId = this.chart.getActiveIndicators().find((i) => i.instanceId === instanceId)?.id ?? '';
    const extra = this.options.indicatorMenuItems?.({ instanceId, indicatorId }) ?? [];
    const all = withHostItems(entries, extra);
    if (all.length === 0) return;
    const box = anchor.getBoundingClientRect();
    const root = this.root.getBoundingClientRect();
    menu.open(all, box.left - root.left, box.bottom - root.top + 2, (id) => {
      if (pickHostItem(id, extra)) return;
      if (id === 'settings') this.openIndicatorSettings(instanceId);
      else if (id === 'remove') this.handleRemoveIndicator(instanceId);
      else if (id.startsWith('move:')) this.chart.moveIndicatorToPane(instanceId, id.slice('move:'.length));
      this.scheduleLegend();
    }, anchor);
  }

  private updateUI(): void {
    this.refreshDrawingsState();
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

export type { CompareWay };

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
/** Where the command palette's recent commands are kept, in this browser, and how many. */
const RECENT_COMMANDS_KEY = 'tcw:recentCommands';
const RECENT_COMMANDS_KEPT = 10;

function readRecentCommands(): string[] {
  try {
    const kept: unknown = JSON.parse(browserStorage()?.getItem(RECENT_COMMANDS_KEY) ?? '[]');
    return Array.isArray(kept) ? kept.filter((k): k is string => typeof k === 'string').slice(0, RECENT_COMMANDS_KEPT) : [];
  } catch {
    return []; // unreadable or refused: none
  }
}

function writeRecentCommands(keys: readonly string[]): void {
  try {
    browserStorage()?.setItem(RECENT_COMMANDS_KEY, JSON.stringify(keys.slice(0, RECENT_COMMANDS_KEPT)));
  } catch { /* storage full or refused: the palette forgets */ }
}

/** Where the dock's width is kept, in this browser. */
const DOCK_WIDTH_KEY = 'tcw:dockWidth';

function readDockWidth(): number | null {
  try {
    const kept = Number(browserStorage()?.getItem(DOCK_WIDTH_KEY) ?? NaN);
    return Number.isFinite(kept) && kept > 0 ? kept : null;
  } catch {
    return null; // storage refused: the default width
  }
}

function writeDockWidth(width: number): void {
  try {
    browserStorage()?.setItem(DOCK_WIDTH_KEY, String(width));
  } catch { /* storage full or refused: the width lasts this session */ }
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

type Box = { x: number; y: number; width: number; height: number };

/** The box around all the given boxes (nulls skipped); null when there are none. */
function unionRects(rects: (Box | null)[]): Box | null {
  const boxes = rects.filter((r): r is Box => r !== null);
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((r) => r.x));
  const y = Math.min(...boxes.map((r) => r.y));
  const right = Math.max(...boxes.map((r) => r.x + r.width));
  const bottom = Math.max(...boxes.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

function isRtlLocale(locale: string | undefined): boolean {
  return !!locale && /^(ar|he|iw|fa|ur|ps|yi|dv|ckb|sd|ug)(-|$)/i.test(locale);
}
