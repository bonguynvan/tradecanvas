import type { ChartType, DataUpdatePayload, DrawingToolType, FeaturesConfig, HistoryLoadPayload, OHLCBar, Quote, SymbolInfo, Theme, TimeFrame, TimeZoneSetting } from '@tradecanvas/commons';
import { barTimeUnit, marketStatus, offsetAt, stepDecimals, timeframeFollowsDays, tzLabel } from '@tradecanvas/commons';
import { settingToTimezone, timezoneOptions, timezoneToSetting } from './widgetTimezones.js';
import { installFormControls } from './formControls.js';
import { Chart } from '../Chart.js';
import { DARK_THEME, LIGHT_THEME, indicatorSource, parseIndicatorSource } from '@tradecanvas/commons';
import type { ActiveIndicatorInfo, ChartWidgetOptions, WidgetState, ChartSettingsState, WidgetPanel } from './types.js';
import { CHART_TYPES, DRAWING_TOOL_GROUPS, DEFAULT_SYMBOLS, DEFAULT_SETTINGS } from './widgetConfig.js';
import { SETTINGS_LOOK_KEYS } from './widgetSettingsLook.js';
import { injectWidgetStyles, removeWidgetStyles } from './WidgetStyles.js';
import { WidgetToolbar } from './WidgetToolbar.js';
import { setHostButtonActive, setHostButtonText } from './hostButtons.js';
import { createScope, effect, signal, type Signal } from './signals.js';
import { WidgetDrawingSidebar } from './WidgetDrawingSidebar.js';
import type { WidgetSettings } from './WidgetSettings.js';
import { WidgetStatusBar } from './WidgetStatusBar.js';
import type { WidgetCommandPalette } from './WidgetCommandPalette.js';
import type { WidgetSymbolSearch, SymbolSearchFn } from './WidgetSymbolSearch.js';
import type { WidgetHotkeySheet } from './WidgetHotkeySheet.js';
import { WidgetReplay, type ReplayHost } from './WidgetReplay.js';
import { browserStorage, pageHidden } from './pageEnv.js';
import { type WatchlistEntry } from './WidgetWatchlist.js';
import { type WatchlistList } from './WatchlistStore.js';
import { WidgetSymbolInfo, type SymbolInfoView } from './WidgetSymbolInfo.js';
import { SymbolNews, buildSymbolInfoView } from './symbolInfoView.js';
import { chartInfoFor, cleanSymbolInfo, mergeSymbolInfo, readSymbolCatalog, symbolTitle } from './symbolCatalog.js';
import { TOOL_HOTKEYS, toolShortcuts } from './drawingHotkeys.js';
import { WidgetChartNav } from './WidgetChartNav.js';
import { WidgetAlertsPanel } from './WidgetAlertsPanel.js';
import { indicatorChipLabel } from '../indicatorLabel.js';
import { widgetIndicatorLabel } from './indicatorInputWords.js';
import { readChartTypeOptions, type ChartTypeOptions } from '@tradecanvas/commons';
import { applyWidgetUI, resolveWidgetUI, scaledWidgetUI, typeSize, widgetScaleFor, widgetUIVariables, type ResolvedWidgetUI, type WidgetUIPreset, type WidgetUITheme } from './widgetUI.js';
import { WidgetObjectTree } from './WidgetObjectTree.js';
import type { WidgetIndicatorSettings, IndicatorDefault } from './WidgetIndicatorSettings.js';
import type { WidgetIndicatorPicker, IndicatorPickerItem } from './WidgetIndicatorPicker.js';
import { IndicatorDefaultsStore } from './indicatorDefaults.js';
import {
  ChartSettingsStore,
  hasTypeSettings,
  settingsStoreKey,
} from './chartSettingsStore.js';
import { WidgetDrawingStyle } from './WidgetDrawingStyle.js';
import { WidgetSelectionToolbar } from './WidgetSelectionToolbar.js';
import { DrawingDefaultsStore, DrawingTemplateStore } from './DrawingTemplateStore.js';
import type { WidgetDrawingSettings } from './WidgetDrawingSettings.js';
import { WidgetContextMenu } from './WidgetContextMenu.js';
import { TEXT_LAYOUTS } from './drawingText.js';
import { WidgetInlineText } from './WidgetInlineText.js';
import { chartMenuEntries, priceEntries } from './chartMenu.js';
import { WidgetAccountPanel } from './WidgetAccountPanel.js';
import { WidgetOrderTicket } from './WidgetOrderTicket.js';
import { WidgetNamePrompt } from './WidgetNamePrompt.js';
import { WidgetIntervalInput } from './WidgetIntervalInput.js';
import { IndicatorTemplateStore } from './indicatorTemplates.js';
import { IME_KEY_CODE, inOverlay, isKeyTarget, isTyping, registerKeyRoot } from './keyTarget.js';
import { type WidgetLayoutContent } from './widgetLayout.js';
import { LayoutSession } from '../state/LayoutSession.js';
import { DrawingFavoritesStore } from './DrawingFavoritesStore.js';
import { createIcon } from './icons.js';
import { watchKeyboardInset } from './keyboardInset.js';
import { watchNarrow } from './narrowMode.js';
import {
  availableTimeframes,
  initialTimeframeFavorites,
  withExtraTimeframes,
} from './widgetTimeframes.js';
import type { GoToTarget, WidgetGoToDate } from './WidgetGoToDate.js';
import { LazyPart, type Lazy, type ModuleRef } from './lazyPart.js';
import { DIALOGS, preloadDialogs } from './widgetDialogs.js';
import { utcToWallTime, wallTimeToUtc } from './wallTime.js';
import { WidgetDock } from './WidgetDock.js';
import { type CompareWay } from './widgetCompare.js';
import { WidgetTooltip } from './WidgetTooltip.js';
import { WidgetIndicatorLegend } from './WidgetIndicatorLegend.js';
import { formatIndicatorValue } from './legendValues.js';
import { RANGE_PRESETS, SYMBOL_INDICATOR_IDS, adapterFromFeed, indicatorCategory, sourceParam } from '@tradecanvas/core';
import { WidgetBracketBar } from './WidgetBracketBar.js';
import { AlertNotifier } from './AlertNotifier.js';
import { WidgetDepthLadder } from './WidgetDepthLadder.js';
import { WidgetDataWindow, PERCENT_DECIMALS as DATA_WINDOW_PERCENT_DECIMALS } from './WidgetDataWindow.js';
import type { DepthData } from '@tradecanvas/commons';
import { DragDropImporter, resampleOHLCV, inferTimeframeMs } from '../io/index.js';
import type { CrosshairMovePayload, CrosshairSyncPayload, DataSeries } from '@tradecanvas/commons';
import { formatVolumeLoc, timeframeToMs } from '@tradecanvas/commons';
import { resolveMessages, createTranslator, fill, type MessageKey, type Translator } from './i18n.js';
import { localizeToolGroups } from './widgetLocales.js';
import { WidgetLoadingOverlay } from './WidgetLoadingOverlay.js';
import { WidgetHistoryPill } from './WidgetHistoryPill.js';
import { pickHostItem, withHostItems } from './hostMenus.js';
import { isChartKey, matchesHotkey, parseHotkey, typedIntoField, type ParsedHotkey } from './hostHotkeys.js';
import { CHART_STYLE_KEYS, type ChartStyleKey } from '@tradecanvas/commons';
import { WidgetCompares, type ComparesHost } from './WidgetCompares.js';
import { WidgetWatchlists, type WatchlistsHost } from './WidgetWatchlists.js';
import { WidgetAlerts, type AlertsHost } from './WidgetAlerts.js';
import { WidgetTrading, type TradingHost } from './WidgetTrading.js';
import { WidgetMenus, type MenusHost } from './WidgetMenus.js';
import { WidgetLegendView, type LegendHost, LEGEND_INSET, STACK_GAP } from './WidgetLegendView.js';
import { WidgetCommands, type CommandsHost } from './WidgetCommands.js';
import { WidgetLayouts, type LayoutsHost } from './WidgetLayouts.js';
import { WidgetDockArea, type DockHost } from './WidgetDockArea.js';
import { WidgetChartSettings, type ChartSettingsHost } from './WidgetChartSettings.js';
import { WidgetDrawingEdit, type DrawingEditHost } from './WidgetDrawingEdit.js';
import { WidgetIntervals, type IntervalsHost } from './WidgetIntervals.js';
import {
  markPart,
  CHART_MENU_FEATURES,
  filterMenuEntries,
  offFeatures,
  readWidgetFeatures,
  resolveWidgetFeatures,
  type WidgetFeature,
  type WidgetFeatureState,
  type WidgetFeatures,
} from './widgetFeatures.js';

/** How long a just-drawn text waits for its press to end before asking for its words anyway. */
const TEXT_PROMPT_FALLBACK_MS = 600;
/** How far past a scale step (px) the widget must be before its look changes size: no flicker at the edge. */
const SCALE_DEAD_BAND = 24;
/** The tokens a bigger scale changes: bars, buttons, icons, menu rows and type. */
const SCALED_TOKENS = [
  '--tcw-toolbar-h', '--tcw-control-h', '--tcw-control-h-sm', '--tcw-icon', '--tcw-sidebar-w', '--tcw-menu-item-h',
  '--tcw-font-size', '--tcw-font-size-sm', '--tcw-font-size-xs', '--tcw-font-size-lg', '--tcw-font-size-xl', '--tcw-font-size-display',
] as const;

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

/** A day: bars this long or longer have no time of day to go to. */
const DAY_MS = 86_400_000;
/** How long the dialogs' code waits for the page to be idle before it loads anyway. */
const PRELOAD_IDLE_TIMEOUT_MS = 5000;
/** Where there is no idle callback (Safari): the code loads this long after the widget is up. */
const PRELOAD_DELAY_MS = 2000;
/** The watermark: the symbol, large and faint, behind the bars. */
const WATERMARK_FONT_SIZE = 48;
const WATERMARK_ON_DARK = 'rgba(255,255,255,0.03)';
const WATERMARK_ON_LIGHT = 'rgba(0,0,0,0.03)';

/** Money is written to the price step's decimals, but to no more than these. */
const MONEY_DECIMALS = 2;

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

/** How often the status bar's clock moves on. */
const CLOCK_TICK_MS = 1000;
/**
 * The switches a host feature of the same meaning has: with the feature off
 * the chart never draws it, so nothing kept, shared or set may turn it on.
 */
const FEATURE_SWITCHES = [
  ['barCountdown', 'barCountdown'],
  ['logScale', 'logScale'],
  ['legendVisible', 'legend'],
  ['volumeVisible', 'volume'],
] as const satisfies readonly (readonly [keyof ChartSettingsState, keyof FeaturesConfig])[];
/** The settings' style keys that aren't colours: they go with the user from theme to theme. */
const LOOK_KEYS: readonly ChartStyleKey[] = SETTINGS_LOOK_KEYS.filter((key) => CHART_STYLE_KEYS[key] !== 'color');

/** The widget pressed last: with several on a page, Alt+ shortcuts act on that one. */

/**
 * The options with a `feed` made into the widget's own adapter, so all
 * after reads `adapter` alone: one per widget, as a feed serves many.
 */
function withFeedAdapter(options: ChartWidgetOptions): ChartWidgetOptions {
  if (!options.feed) return options;
  if (options.adapter) throw new TypeError('A widget takes an adapter or a feed, not both');
  return { ...options, adapter: adapterFromFeed(options.feed), feed: undefined };
}

export class ChartWidget {
  /** The intervals the widget offers: the menu, the ones pinned, typed ones and the range bar's. */
  private readonly intervals = new WidgetIntervals(this.intervalsHost());
  /** Editing a drawing: its toolbar, its words typed in place, its settings and its templates. */
  private readonly drawingEdit = new WidgetDrawingEdit(this.drawingEditHost());
  /** The chart settings: their state, where they are kept, the dialog's edit, and the scale they show. */
  private readonly chartSettings = new WidgetChartSettings(this.chartSettingsHost());
  /** The dock by the chart: its panels, its rail and how wide it is. */
  private readonly docking = new WidgetDockArea(this.dockingHost());
  /** Saved layouts and shared views: what a layout holds, where it is kept, and the link to a view. */
  private readonly layouts = new WidgetLayouts(this.layoutsHost());
  /** The command palette's entries and the actions they run. */
  private readonly commands = new WidgetCommands(this.commandsHost());
  /** The legend over the chart: the symbol's row and the indicators' rows, and their menu. */
  private readonly legend = new WidgetLegendView(this.legendHost());
  /** The chart's context menus: on the chart, on a drawing, and the clear menu. */
  private readonly menus = new WidgetMenus(this.menusHost());
  /** Trading by the chart: the account panel, the order ticket, the depth ladder and the bracket bar. */
  private readonly trading = new WidgetTrading(this.tradingHost());
  /** Price alerts: their panel, what they are checked against, and the notices when one fires. */
  private readonly alerting = new WidgetAlerts(this.alertingHost());
  /** The watchlists by the chart: their symbols, lists and quotes. */
  private readonly watching = new WidgetWatchlists(this.watchingHost());
  /** Other symbols compared with the chart's: their bars, the compare dialog, the scale they hold. */
  private readonly comparing = new WidgetCompares(this.comparingHost());
  private chart!: Chart;
  private state!: WidgetState;
  /** The theme for each mode: the host's own where it gave one, so the toggle brings it back. */
  private themeOf: { dark: Theme; light: Theme } = { dark: DARK_THEME, light: LIGHT_THEME };
  private toolbar: WidgetToolbar | null = null;
  /** What is open, by its toolbar button's role (`'alerts'`, `'account'`, `'indicators'`…): one effect shows it on the toolbar. */
  private readonly openRoles = signal<ReadonlySet<string>>(new Set());
  private sidebar: WidgetDrawingSidebar | null = null;
  private settingsPart: Lazy<WidgetSettings> | null = null;
  private get settings(): WidgetSettings | null {
    return this.settingsPart?.get() ?? null;
  }
  private statusBar: WidgetStatusBar | null = null;
  private goToDatePart: Lazy<WidgetGoToDate> | null = null;
  private get goToDate(): WidgetGoToDate | null {
    return this.goToDatePart?.get() ?? null;
  }
  private tooltip!: WidgetTooltip;
  private indicatorLegend: WidgetIndicatorLegend | null = null;
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
    // The layer moves with the page: words being typed are kept first.
    this.drawingEdit.inlineText?.commit();
    this.toolbar?.setFullscreen(document.fullscreenElement === this.root);
    if (this.portal.isConnected) this.overlayHost(); // an open modal follows
  };
  private commandPalettePart: Lazy<WidgetCommandPalette> | null = null;
  private get commandPalette(): WidgetCommandPalette | null {
    return this.commandPalettePart?.get() ?? null;
  }
  private symbolSearchPart: Lazy<WidgetSymbolSearch> | null = null;
  private get symbolSearch(): WidgetSymbolSearch | null {
    return this.symbolSearchPart?.get() ?? null;
  }
  /** Letters typed on the chart while the symbol search's code loads: it opens with all of them. */
  private typedWhileLoading = '';
  private hotkeySheetPart: Lazy<WidgetHotkeySheet> | null = null;
  private get hotkeySheet(): WidgetHotkeySheet | null {
    return this.hotkeySheetPart?.get() ?? null;
  }
  /** Bar replay: its panel over the chart and the session it drives. Made in the constructor, once the chart is up. */
  private replay!: WidgetReplay;
  private dragDrop: DragDropImporter | null = null;
  private objectTree: WidgetObjectTree | null = null;
  private indicatorSettingsPart: Lazy<WidgetIndicatorSettings> | null = null;
  private get indicatorSettings(): WidgetIndicatorSettings | null {
    return this.indicatorSettingsPart?.get() ?? null;
  }
  private indicatorPickerPart: Lazy<WidgetIndicatorPicker> | null = null;
  private get indicatorPicker(): WidgetIndicatorPicker | null {
    return this.indicatorPickerPart?.get() ?? null;
  }
  private drawingStyle: WidgetDrawingStyle | null = null;
  private drawingSettingsPart: Lazy<WidgetDrawingSettings> | null = null;
  private get drawingSettings(): WidgetDrawingSettings | null {
    return this.drawingSettingsPart?.get() ?? null;
  }
  /** Whether the chart menu offers a download of the data. */
  private canExport = true;
  /** The latest fetch of each symbol the chart's indicators read. */
  private symbolLoads = new Map<string, number>();
  /** The widget's look. */
  private ui!: ResolvedWidgetUI;
  /** How much bigger than its sizes the look is drawn now (`WidgetUITheme.scale`): 1 up to full HD. */
  private uiScale = 1;
  /** Whether the look's tokens go on inline: a look was given, or it is drawn bigger. */
  private uiVariables = false;
  /** The chart's type sizes before the look scaled them. */
  private chartFontBase: { sizeSmall: number; sizeMedium: number; sizeLarge: number } | null = null;
  private scaleObserver: ResizeObserver | null = null;
  private templates = new IndicatorTemplateStore();
  private templatePrompt: WidgetNamePrompt | null = null;
  /** The note shown over a signal marker under the pointer. */
  private markerTip: HTMLDivElement | null = null;
  private dataWindow: WidgetDataWindow | null = null;
  private lastHoverIndex: number | null = null;
  /** The bar the crosshair reported at it: on Renko and the like a brick, not a data bar. */
  private lastHoverBar: OHLCBar | null = null;
  private lastHoverPrevClose: number | null = null;
  /** The bar the on-chart indicator values are read at; null = the latest. */
  private legendHoverIndex: number | null = null;
  /** The pointer's own crosshair is on this chart: it wins over one mirrored from another chart. */
  private pointerOnChart = false;
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
  private sessionRefPrice: number | null = null;
  private symbolInfoPanel: WidgetSymbolInfo | null = null;
  /** Headlines per symbol, kept a few minutes; a late answer for an earlier symbol is dropped. */
  private news = new SymbolNews();
  private marketTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private onPageShown: (() => void) | null = null;
  private chartNav: WidgetChartNav | null = null;
  /** Bars on screen, for the navigation's scroll step. */
  private visibleBarCount = 50;
  private root!: HTMLDivElement;
  private chartContainer!: HTMLDivElement;
  private loading!: WidgetLoadingOverlay;
  private historyPill!: WidgetHistoryPill;
  /** Bumped per stream connect; a connect that is no longer the latest leaves the UI to the newer one. */
  private connectSeq = 0;
  /** Bumped per local resample and widget.setData; a deferred local switch that is no longer the latest is skipped. */
  private localSeq = 0;
  /** Duration of the last local resample + setData, for SLOW_LOCAL_SWITCH_MS. */
  private lastLocalSwitchMs = 0;
  private destroyed = false;
  /** The widget's effects, disposed with it. */
  private readonly scope = createScope();
  /** Calls off the dialogs' preload when the widget goes before it ran. */
  private stopPreload: (() => void) | null = null;
  /** What each dialog loading now opens with when its code is in: the last ask. */
  private readonly waitingShow = new Map<Lazy<unknown>, (part: unknown) => void>();
  /** The mode and the theme shown: what the root, the portal, the chart and the watermark follow. */
  private look!: Signal<{ dark: boolean; theme: Theme }>;
  private options: ChartWidgetOptions;
  /** The tickers on offer, cleaned: what the toolbar, the watchlist and the saved state work with. */
  private symbols!: string[];
  /**
   * What came with the symbols given as SymbolInfo, by ticker: names, kinds,
   * exchanges and logos for the search and the symbol's titles. Never the
   * chart's: price steps and hours come from the feed or `setSymbolInfo`.
   */
  private symbolCatalog!: Map<string, SymbolInfo>;
  /**
   * What the chart knew of a symbol when the widget last switched from it.
   * With no feed to clear it, it stays the last symbol's until the chart is
   * told of the new one; anything told since is the new one's.
   */
  private chartInfoAtSwitch: SymbolInfo | null = null;
  private t!: Translator;
  private adapter: import('@tradecanvas/commons').DataAdapter | null = null;
  private boundGlobalKeydown: ((e: KeyboardEvent) => void) | null = null;
  // Finest-resolution series the widget has seen. When no live adapter is
  // attached, switching to a coarser timeframe resamples from this base
  // instead of refetching. See `setData` / `applyTimeframeData`.
  private baseSeries: DataSeries | null = null;
  private baseTimeframeMs = 0;
  /** The exchange's zone the bars on the chart were built in (null: UTC's), undefined when they weren't built. */
  private builtInZone: string | null | undefined = undefined;
  /** The timeframe the user (or the host) picked: ranges never show finer than it, layouts keep it. */
  private chosenTimeframe: TimeFrame | null = null;
  /** Every switch, on or off (see `setFeatures`). */
  private featureState!: WidgetFeatureState;
  /** The host's own shortcuts, first added first. */
  private hostHotkeys: { spec: import('./types.js').HotkeySpec; parsed: ParsedHotkey }[] = [];
  /** The menus of the host's toolbar dropdowns. */
  private readonly hostMenus = new Set<WidgetContextMenu>();
  /** The host's layer over the chart (`getSlot('chart')`), made when first asked for. */
  private hostLayer: HTMLDivElement | null = null;
  /** Whether the chart shows the "+" by the price axis while its switch is on. */
  private priceAxisAddDefault = false;

  constructor(container: HTMLElement, givenOptions: ChartWidgetOptions = {}) {
    const options = withFeedAdapter(givenOptions);
    this.options = options;
    const { isDark, resolvedTheme, features, chartFeatures } = this.readOptions(options);
    this.buildRoot(container, options, isDark, resolvedTheme);
    this.buildToolbar(options, features);
    const accountHost = this.buildBody(options, features);
    this.buildChart(options, resolvedTheme, features, chartFeatures);
    this.buildStatusBar(features);
    this.buildDialogs(features);
    this.followChart();
    this.wireDrawingEditing();
    this.wireChartMenus();
    this.buildTrading(options, accountHost);
    this.buildAlerts(options);
    this.buildPanels(features);
    this.buildCommandPalette();
    this.finishSetup(options);
  }

  /** The options read once: the symbols, the settings they seed, the theme, the chart's features, the intervals and the starting state. */
  private readOptions(options: ChartWidgetOptions): { isDark: boolean; resolvedTheme: Theme; features: FeaturesConfig; chartFeatures: FeaturesConfig } {
    // Read once, as plain JavaScript may hand over anything: tickers from here on, the info kept aside.
    const catalog = readSymbolCatalog(options.symbols ?? DEFAULT_SYMBOLS);
    this.symbols = catalog.names;
    this.symbolCatalog = catalog.info;
    // `numberLocale`, `timeZone`, `leftPriceScale`, the crosshair and the log
    // scale live in two places: the headless Chart gets them via
    // `chartOptions` (spread straight into `new Chart()` below) — but the
    // widget's own chrome (watchlist, alerts, go-to-date, settings panel,
    // Reset, layouts) reads `settingsState`, which otherwise stays on
    // DEFAULT_SETTINGS until the host touches the Settings UI. Seed it from
    // the same options so both layers start in sync.
    const chartOptions = options.chartOptions;
    this.chartSettings.settingsState = {
      ...DEFAULT_SETTINGS,
      ...(chartOptions?.crosshair?.mode ? { crosshairMode: chartOptions.crosshair.mode } : {}),
      ...(chartOptions?.logScale && chartOptions.features?.logScale !== false ? { logScale: true, scaleMode: 'logarithmic' as const } : {}),
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
      this.layouts.layoutKeyPrefix = cfg.keyPrefix ?? 'tcw:layout:';
      this.layouts.layoutDebounceMs = cfg.debounceMs ?? 1500;
    }
    // The Chart Settings kept in this browser: opt-in too.
    const settingsKey = settingsStoreKey(options.persistSettings);
    if (settingsKey) this.chartSettings.settingsStore = new ChartSettingsStore(settingsKey);

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
    this.chartSettings.settingsLocked = new Set(FEATURE_SWITCHES.filter(([, feature]) => features[feature] === false).map(([key]) => key));
    // The display toggles start where the host's features put them, and Reset goes back there.
    this.chartSettings.settingsDefaults = {
      ...this.chartSettings.settingsState,
      legendVisible: features.legend !== false,
      volumeVisible: features.volume !== false,
      barCountdown: features.barCountdown !== false,
      indicatorValueLabels: features.indicatorValueLabels === true,
      alignAxisLabels: features.alignAxisLabels !== false,
    };
    this.chartSettings.settingsState = { ...this.chartSettings.settingsDefaults };

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
      // Off until the user turns it on: a drawing goes where it is placed.
      magnetEnabled: false,
      magnetStrong: false,
      eraser: false,
      zoomArea: false,
      stayInDrawing: false,
      // Static data (no adapter) has no connection to report.
      connectionState: options.adapter ? 'connecting' : 'disconnected',
      connectionMessage: options.adapter ? this.t('status.connecting') : '',
    };
    return { isDark, resolvedTheme, features, chartFeatures };
  }

  /** The widget's root and portal, its direction and theme, and the look's tokens on both. */
  private buildRoot(container: HTMLElement, options: ChartWidgetOptions, isDark: boolean, resolvedTheme: Theme): void {
    injectWidgetStyles();

    this.root = document.createElement('div');
    this.root.className = 'tcw-root';
    // Right to left for Arabic, Hebrew and the like (or as asked); the chart itself runs left to right.
    const dir = options.dir === 'ltr' || options.dir === 'rtl' ? options.dir : isRtlLocale(options.locale) ? 'rtl' : 'ltr';
    this.root.dir = dir;
    this.portal.dir = dir;
    container.appendChild(this.root);
    this.tooltip = new WidgetTooltip(this.root);
    this.portal.className = 'tcw-root tcw-portal';
    this.look = signal({ dark: isDark, theme: resolvedTheme });
    let built = false;
    this.scope.run(() => effect(() => {
      const { dark, theme } = this.look.get();
      this.root.dataset.tcwTheme = this.portal.dataset.tcwTheme = dark ? 'dark' : 'light';
      // The chart is made with its theme below; a later change goes to it, the watermark's ink too.
      if (!built) return;
      this.keepingLook(() => this.chart.setTheme(theme));
      this.paintWatermark();
    }));
    built = true;
    // Sheets on a phone keep above the on-screen keyboard.
    this.stopKeyboardInset = watchKeyboardInset([this.root, this.portal]);
    // Narrow (a phone, a narrow column): a compact toolbar, the drawing tools behind a button.
    this.stopNarrow = watchNarrow(this.root, (narrow) => {
      // The toolbar's own width may not change as the switch flips: fit it again.
      this.toolbar?.fit();
      if (!narrow) this.sidebar?.closeOverlay();
      this.docking.syncRail();
    });
    // The look: tokens and layout switches on the root and the modal portal
    // alike. Without `ui` the tokens stay the stylesheet's (Print's), so a
    // host's CSS can still set them.
    this.ui = resolveWidgetUI(options.ui);
    this.uiVariables = options.ui !== undefined;
    this.uiScale = this.scaleNow();
    this.applyLookTokens();
    // On a wider screen the bars, buttons, icons and type grow with the widget.
    if (typeof ResizeObserver !== 'undefined') {
      this.scaleObserver = new ResizeObserver(() => this.fitScale());
      this.scaleObserver.observe(this.root);
    }
    this.markSwitchedOff();
    this.stopFormControls = installFormControls([this.root, this.portal], {
      layer: this.overlayHost,
      labels: () => ({ prevMonth: this.t('calendar.prevMonth'), nextMonth: this.t('calendar.nextMonth'), today: this.t('calendar.today') }),
      locale: () => this.intlLocale(),
    });
  }

  /** The toolbar along the top. */
  private buildToolbar(options: ChartWidgetOptions, features: FeaturesConfig): void {
    this.toolbar = new WidgetToolbar(
      this.root,
      {
        symbols: this.symbols,
        timeframes: this.intervals.timeframeMenu(),
        timeframeFavorites: this.intervals.pinnedTimeframes(),
        chartTypes: options.chartTypes
          ? CHART_TYPES.filter(ct => (options.chartTypes as ChartType[]).includes(ct.value))
          : CHART_TYPES,
      },
      {
        onSymbolClick: () => this.handleSymbolClick(),
        onSymbolInfo: () => this.toggleSymbolInfo(),
        onTimeframe: (tf) => this.handleTimeframe(tf),
        onToggleTimeframeFavorite: (tf) => this.intervals.handleToggleTimeframeFavorite(tf),
        onAddTimeframe: (text) => this.intervals.handleAddTimeframe(text),
        onRemoveTimeframe: (tf) => this.intervals.handleRemoveTimeframe(tf),
        onChartType: (type) => this.handleChartType(type),
        onIndicators: () => this.toggleIndicatorPicker(),
        onScreenshot: () => this.chart.screenshot(),
        onSettings: () => this.chartSettings.openSettings(),
        onToggleTheme: () => this.handleToggleTheme(),
        onToggleReplay: () => this.toggleReplay(),
        onToggleAlerts: () => this.alerting.toggleAlerts(),
        onToggleObjects: () => this.docking.toggleObjects(),
        onToggleAccount: options.trading !== false ? () => this.trading.toggleAccountPanel() : undefined,
        onLayouts: options.layouts !== false ? (anchor) => void this.layouts.layoutsUI?.openMenu(anchor) : undefined,
        onBracket: options.trading !== false ? (side) => this.trading.startBracket(side) : undefined,
        onToggleLadder: options.trading !== false && options.depthLadder ? () => this.trading.toggleLadder() : undefined,
        onOrderTicket: options.trading !== false ? () => this.trading.openOrderTicket() : undefined,
        onCompare: options.adapter && features.compareSymbols !== false ? () => this.comparing.handleAddCompare() : undefined,
        onUndo: () => this.chart.undo(),
        onRedo: () => this.chart.redo(),
        onToggleFullscreen: typeof document !== 'undefined' && document.fullscreenEnabled
          ? () => this.toggleFullscreen()
          : undefined,
      },
      this.t,
      this.overlayHost,
    );
    // A button changes only when its role opens or closes, so one never opened keeps the state it was made with.
    let shown: ReadonlySet<string> = new Set();
    this.scope.run(() => effect(() => {
      const open = this.openRoles.get();
      for (const role of new Set([...shown, ...open])) {
        if (shown.has(role) === open.has(role)) continue;
        if (role === 'indicators') this.toolbar?.setIndicatorsOpen(open.has(role));
        else this.toolbar?.setActive(role, open.has(role));
      }
      shown = open;
    }));
  }

  /** The row under the toolbar: the drawing tools, the chart's box, the dock and the watchlist; and the account panel's place under it. */
  private buildBody(options: ChartWidgetOptions, features: FeaturesConfig): HTMLDivElement {
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
        onClear: (anchor) => this.menus.openClearMenu(anchor),
        onToggleStyle: () => this.drawingStyle?.toggle(),
        onToggleStayInDrawing: () => this.handleToggleStayInDrawing(),
        onLockAll: (locked) => {
          this.chart.setDrawingsLocked(this.chart.getDrawings().map((d) => d.id), locked);
          this.refreshDrawingsState();
          this.docking.refreshObjects();
        },
        onHideAll: (hidden) => {
          this.chart.setDrawingsVisible(this.chart.getDrawings().map((d) => d.id), !hidden);
          this.refreshDrawingsState();
          this.docking.refreshObjects();
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
    this.docking.dock = new WidgetDock(body, {
      labels: { rail: this.t('dock.rail'), resize: this.t('dock.resize') },
      savedWidth: () => readDockWidth(),
      saveWidth: (width) => writeDockWidth(width),
      railShown: () => this.docking.railShown(),
      focusAfterClose: (page) => this.docking.panelFocusTarget(page as WidgetPanel),
      room: () => body.clientWidth,
    });
    if (options.watchlist) this.watching.createWatchlist(body, options.watchlist === true ? {} : options.watchlist);

    this.root.appendChild(body);
    // The account panel docks under the chart, above the status bar.
    const accountHost = document.createElement('div');
    accountHost.className = 'tcw-account-dock';
    markPart(accountHost, 'accountPanel');
    this.root.appendChild(accountHost);
    return accountHost;
  }

  /** The chart, and what follows its bars, its market and the page. */
  private buildChart(options: ChartWidgetOptions, resolvedTheme: Theme, features: FeaturesConfig, chartFeatures: FeaturesConfig): void {
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
    this.chartInfoAtSwitch = this.chart.getSymbolInfo();
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
    this.chart.on('historyLoad', (e) => {
      const payload = e.payload as HistoryLoadPayload;
      this.historyPill.update(payload);
      // Older bars in: the percent compares as deep, so their lines start where the chart does.
      if (payload.state === 'loaded') void this.comparing.extendPercentCompares();
    });
    this.chart.on('symbolInfoChange', () => {
      this.refreshSymbolTitle();
      this.refreshMarket();
      this.rebuildForZone();
      // A symbol's decimals often arrive after the lists were written (the
      // adapter's resolveSymbol answers late): write their prices again.
      this.refreshPriceTexts();
    });
    // A market set after the bars may name the zone their days start in.
    this.chart.on('marketChange', () => this.rebuildForZone());
    this.refreshSymbolTitle();

    // Symbol info: the panel, and the market's status in the status bar,
    // kept current as the clock runs toward the next open or close.
    this.symbolInfoPanel = new WidgetSymbolInfo(this.root, this.t, {
      onClose: () => this.docking.closePanelByHand('symbolInfo'),
      onToggle: (open) => {
        this.markOpen('symbolInfo', open);
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

    // The crosshair snaps to the bars, but a drawing goes where it is placed
    // until the magnet button is turned on.
    if (features.drawingMagnet !== false) this.chart.setDrawingMagnetMode('off');
  }

  /** The status bar along the bottom. */
  private buildStatusBar(features: FeaturesConfig): void {
    this.statusBar = new WidgetStatusBar(this.root, {
      presets: RANGE_PRESETS,
      presetLabels: { All: this.t('range.all') },
      groupLabel: this.t('range.presets'),
      goToLabel: this.t('range.goTo'),
      moreLabel: this.t('toolbar.more'),
      onPreset: (preset) => void this.intervals.applyRangePreset(preset),
      onGoTo: () => this.toggleGoToDate(),
      goToKeys: () => this.keysShown('hotkeys.goToDate', 'Alt+G'),
    }, {
      label: this.t('statusBar.label'),
      clock: {
        label: this.t('settings.timezone'),
        now: () => this.clockNow(),
        options: () => ({
          current: this.chartSettings.settingsState.timezone,
          list: timezoneOptions(this.chartSettings.settingsState.timezone, Date.now(), this.t('settings.timezone.local'), this.menus.exchangeChoice()),
        }),
        onPick: (value) => this.chartSettings.changeSettings({ timezone: value }),
      },
      scale: {
        labels: {
          group: this.t('settings.priceScale'),
          percent: this.t('settings.scale.percentage'),
          log: this.t('settings.scale.logarithmic'),
          auto: this.t('settings.autoScale'),
        },
        texts: { log: this.t('statusBar.log'), auto: this.t('statusBar.auto') },
        onPercent: () => this.chartSettings.toggleScaleMode('percentage'),
        onLog: features.logScale !== false ? () => this.chartSettings.toggleScaleMode('logarithmic') : undefined,
        onAuto: () => this.chartSettings.changeSettings({ autoScale: !this.chart.isAutoScale() }),
      },
    });
    // The clock each second, while the page is in view.
    this.clockTimer = setInterval(() => {
      if (!pageHidden() && this.featureState.statusBar && this.featureState['statusBar.clock']) this.statusBar?.tick();
    }, CLOCK_TICK_MS);
    // A drag on the price axis turns auto off without a settings change: the switch follows the chart.
    this.chart.on('priceRangeChange', () => this.chartSettings.refreshScaleSwitches());
    this.chartSettings.refreshScaleSwitches();
    this.goToDatePart = this.lazyPart(DIALOGS.goToDate, ({ WidgetGoToDate }) => new WidgetGoToDate(this.overlayHost, () => ({
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
    }), () => this.intlLocale(), (target) => this.goTo(target)));
  }

  /** The settings, the symbol search and the shortcut sheet, each made when first opened. */
  private buildDialogs(features: FeaturesConfig): void {
    this.settingsPart = this.lazyPart(DIALOGS.settings, ({ WidgetSettings }) => new WidgetSettings({
      onChange: (patch) => this.chartSettings.changeFromDialog(patch),
      onReset: () => this.chartSettings.resetSettings(),
      onClose: () => this.chartSettings.endSettingsEdit(true),
      onCancel: () => this.chartSettings.endSettingsEdit(false),
      templates: {
        list: () => this.chartSettings.chartTemplates.list().map((t) => t.name),
        apply: (name) => this.chartSettings.applyChartTemplate(name),
        remove: (name) => this.chartSettings.chartTemplates.remove(name),
        save: () => this.chartSettings.promptSaveChartTemplate(),
      },
      styleValue: (key) => this.chart.getStyleValue?.(key) ?? null,
      onStyleChange: (patch) => this.chartSettings.changeStyle(patch),
    }, this.t, {
      barCountdown: features.barCountdown,
      logScale: features.logScale,
      legend: features.legend,
      volume: features.volume,
      trading: features.trading !== false,
      exchangeZone: () => this.menus.exchangeChoice()?.zone,
    }, this.overlayHost));
    this.symbolSearchPart = this.lazyPart(DIALOGS.symbolSearch, ({ WidgetSymbolSearch }) => new WidgetSymbolSearch({
      onPick: (sym) => { void this.setSymbol(sym); },
      onClose: () => {},
    }, this.overlayHost, this.t));
    this.hotkeySheetPart = this.lazyPart(DIALOGS.hotkeySheet, ({ WidgetHotkeySheet }) => new WidgetHotkeySheet({ onClose: () => {} }, this.t, this.overlayHost));
    this.scope.run(() => this.chartSettings.followSettings());
  }

  /** The bars, the legend, compares, replay and the data window follow the chart's events. */
  private followChart(): void {
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

    // The OHLCV rows drawn taller or shorter (a switch wrapped their line): the stack under them follows.
    this.chart.on('legendResize', () => this.legend.scheduleLegend());

    // The indicators on the chart itself, instead of toolbar chips that overflow.
    this.chart.setPaneTitlesVisible(!this.featureState.indicatorLegend);
    this.indicatorLegend = new WidgetIndicatorLegend(this.chartContainer, {
      // A compare row's line may be the widget's or one the host put on the chart itself.
      onToggleVisible: (iid, visible, kind) => {
        if (kind === 'compare') this.chart.setCompareVisible(iid, visible);
        else this.chart.setIndicatorVisible(iid, visible);
        this.legend.scheduleLegend();
        if (this.objectTree?.isOpen()) this.docking.refreshObjects();
      },
      // The name opens the settings too: it goes with the row's settings button.
      onSettings: (iid) => {
        if (this.featureState['indicatorLegend.settings']) this.openIndicatorSettings(iid);
      },
      onRemove: (iid, kind) => {
        if (this.comparing.isPercentCompare(iid)) this.comparing.handleRemoveCompare(iid);
        else if (kind === 'compare') this.comparing.removeHostCompare(iid);
        else this.handleRemoveIndicator(iid);
      },
      onMore: (iid, anchor) => this.legend.openLegendMenu(iid, anchor),
      onPaneAction: (iid, action) => this.legend.runPaneAction(iid, action),
      // From the plot's left edge and the legend's foot, as the stack is placed: the drawings' labels keep clear of it.
      onStackResize: (size) => this.chart.setLegendStack?.(size ? { width: LEGEND_INSET + size.width, height: STACK_GAP + size.height } : null),
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
      offChartType: this.t('legend.offChartType'),
    });
    this.legend.legendMenu = new WidgetContextMenu(this.root, this.t('legend.more'));
    this.chart.on('crosshairMove', (e) => {
      const p = e.payload as { barIndex?: number };
      this.pointerOnChart = true;
      this.legendHoverIndex = typeof p.barIndex === 'number' ? p.barIndex : null;
      this.legend.scheduleLegend();
    });
    // Off the chart, the values go back to the latest bar.
    this.chart.on('crosshairLeave', () => {
      this.pointerOnChart = false;
      this.legendHoverIndex = null;
      this.legend.scheduleLegend();
    });
    // Another chart of a grid points at a bar here: its values, as under the pointer.
    this.chart.on('crosshairSync', (e) => {
      if (this.pointerOnChart) return;
      const p = e.payload as CrosshairSyncPayload;
      this.legendHoverIndex = p.bar && p.barIndex !== null ? p.barIndex : null;
      this.legend.scheduleLegend();
    });
    // A pan too: a compare's change is counted from the first bar on screen.
    // A compare line the host adds on the chart itself gets its row at once, as the widget's do.
    for (const event of ['indicatorUpdate', 'indicatorChange', 'dataUpdate', 'resize', 'paneResize', 'paneChange', 'themeChange', 'timeframeChange', 'visibleRangeChange', 'compareChange'] as const) {
      this.chart.on(event, () => this.legend.scheduleLegend());
    }
    // Whoever changes the chart type: percent compares hold the scale only where their lines are drawn.
    this.chart.on('chartTypeChange', () => {
      if (this.comparing.compareScaleHeld) this.comparing.showHeldScale();
      this.legend.scheduleLegend();
    });

    // Bar replay: its panel, the start bar picked on the chart, its keys.
    this.replay = new WidgetReplay(this.replayHost());
    this.replay.attach();
    // The phone's drawing button keeps to the plot as the chart lays out, or a left scale comes.
    for (const event of ['resize', 'dataUpdate', 'symbolInfoChange'] as const) {
      this.chart.on(event, () => this.placeDrawingButton());
    }
    this.placeDrawingButton();

    // Data Window — precise OHLCV + indicator values at the hovered bar.
    this.dataWindow = new WidgetDataWindow(this.root, {
      formatPrice: (p) => this.formatAlertPrice(p),
      formatPercent: (pct) => this.formatNumber(pct, DATA_WINDOW_PERCENT_DECIMALS),
      formatVolume: (volume) => this.formatVolume(volume),
      onClose: () => this.docking.closePanelByHand('dataWindow'),
    }, this.t);
    this.chart.on('crosshairMove', (e) => {
      const p = e.payload as CrosshairMovePayload;
      this.lastHoverIndex = typeof p.barIndex === 'number' ? p.barIndex : null;
      this.lastHoverBar = p.bar ?? null;
      this.lastHoverPrevClose = typeof p.prevClose === 'number' ? p.prevClose : null;
      if (this.dataWindow?.isOpen()) this.dataWindow.render(this.docking.buildDataWindowModel());
    });
    // The bar another chart of a grid points at here, or the latest again when it goes.
    this.chart.on('crosshairSync', (e) => {
      if (this.pointerOnChart) return;
      const p = e.payload as CrosshairSyncPayload;
      this.lastHoverIndex = p.bar && p.barIndex !== null ? p.barIndex : null;
      this.lastHoverBar = p.bar ?? null;
      this.lastHoverPrevClose = typeof p.prevClose === 'number' ? p.prevClose : null;
      if (this.dataWindow?.isOpen()) this.dataWindow.render(this.docking.buildDataWindowModel());
    });
  }

  /** Drawing styles, templates, defaults and the text typed in place. */
  private wireDrawingEditing(): void {
    // Drawing style + templates popover (paired with the sidebar palette button)
    const templates = new DrawingTemplateStore();
    // Each tool's saved defaults ("Save as default" in a drawing's settings).
    const defaults = new DrawingDefaultsStore();
    for (const [type, toolOptions] of Object.entries(defaults.all())) {
      this.chart.setDrawingToolDefaults(type as DrawingToolType, toolOptions ?? null);
    }
    this.drawingSettingsPart = this.lazyPart(DIALOGS.drawingSettings, ({ WidgetDrawingSettings }) => new WidgetDrawingSettings(this.root, {
      onBegin: (id) => this.chart.beginDrawingEdit(id),
      onChange: (id, patch) => this.chart.updateDrawing(id, patch),
      onEnd: (id, cancel) => {
        this.chart.endDrawingEdit(id, { cancel });
        // Cancel on the words of a text just drawn takes the text back.
        if (cancel && id === this.drawingEdit.justDrawnText) this.chart.takeBackDrawing(id);
        this.drawingEdit.justDrawnText = null;
        this.docking.refreshObjects();
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
        save: (look) => this.drawingEdit.promptSaveDrawingTemplate(templates, look),
        remove: (name, type) => templates.remove(name, type),
      },
    }, this.t));
    this.drawingEdit.inlineText = new WidgetInlineText(this.overlayHost);
    this.chart.on('drawingDoubleClick', (e) => {
      const id = (e.payload as { id: string }).id;
      // A text's words are what a double-click on it is for: typed in place over it.
      const type = this.chart.getDrawings().find((d) => d.id === id)?.type;
      if (type && TEXT_LAYOUTS[type] && this.drawingEdit.editTextInPlace(id, false)) return;
      this.drawingEdit.openDrawingSettings(id, type && TEXT_LAYOUTS[type] ? { tab: 'text' } : {});
    });
    // A text's drawing gone (undo, the trash, another chart's sync) takes its typing with it.
    this.chart.on('drawingRemove', (e) => {
      const id = (e.payload as { id: string }).id;
      if (id !== this.drawingEdit.inlineTextId) return;
      this.drawingEdit.inlineText?.close();
      // Its edit ends with it, so the next change to that id is recorded again.
      if (!this.drawingEdit.inlineTextNew) this.chart.endDrawingEdit(id);
      this.drawingEdit.inlineTextId = null;
    });
    // A text, a note or a callout just drawn asks for its words (not one added from code).
    this.chart.on('drawingCreate', (e) => {
      const { id, type, drawn } = e.payload as { id: string; type: string; drawn?: boolean };
      if (!drawn || !TEXT_LAYOUTS[type]) return;
      // The press that drew it is still down: opened now, the chart would take the
      // keyboard back when it ends. So once it ends, or soon after if it never does.
      this.drawingEdit.cancelTextPrompt?.();
      let fallback = 0;
      const stop = () => {
        window.removeEventListener('pointerup', afterPress);
        window.removeEventListener('pointercancel', afterPress);
        clearTimeout(fallback);
        this.drawingEdit.cancelTextPrompt = null;
      };
      const open = () => {
        stop();
        if (this.destroyed || !this.chart.getDrawings().some((d) => d.id === id)) return;
        if (this.drawingEdit.editTextInPlace(id, true)) return;
        this.drawingEdit.openDrawingSettings(id, { tab: 'text', justDrawn: true });
      };
      const afterPress = () => setTimeout(open, 0);
      window.addEventListener('pointerup', afterPress);
      window.addEventListener('pointercancel', afterPress);
      fallback = window.setTimeout(open, TEXT_PROMPT_FALLBACK_MS);
      this.drawingEdit.cancelTextPrompt = stop;
    });
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

  /** The drawing's and the chart's menus, its toolbar when selected, undo and redo, and typing an interval. */
  private wireChartMenus(): void {
    // Right-click on a drawing: settings, alert, order, group, lock, hide, delete.
    this.menus.drawingMenu = new WidgetContextMenu(this.root, this.t('drawingMenu.label'));
    this.chart.on('drawingContextMenu', (e) => {
      const { id, x, y } = e.payload as { id: string; x: number; y: number };
      this.menus.openDrawingMenu(id, x, y);
    });

    // A click on a drawing: its toolbar right over it, no right-click needed.
    this.drawingEdit.selectionToolbar = new WidgetSelectionToolbar(this.root, {
      onStyle: (patch) => {
        for (const id of this.chart.getSelectedDrawingIds()) {
          // A text without a box shows a fill only once its background is on: picking one turns it on.
          const type = this.chart.getDrawings().find((d) => d.id === id)?.type;
          const layout = type ? TEXT_LAYOUTS[type] : undefined;
          const own = patch.fillColor !== undefined && layout && !layout.box ? { ...patch, textBackground: true } : patch;
          this.chart.setSelectedDrawingStyle(own, id);
        }
        this.drawingEdit.updateSelectionToolbar();
      },
      onSettings: () => {
        const id = this.chart.getSelectedDrawingIds()[0];
        if (id) this.drawingEdit.openDrawingSettings(id);
      },
      onAlert: () => {
        const id = this.chart.getSelectedDrawingIds()[0];
        if (id) this.alerting.addDrawingAlert(id);
      },
      onLock: (locked) => {
        this.chart.setDrawingsLocked(this.chart.getSelectedDrawingIds(), locked);
        this.docking.refreshObjects();
        this.drawingEdit.updateSelectionToolbar();
      },
      onMore: (x, y) => {
        const id = this.chart.getSelectedDrawingIds()[0];
        if (!id) return;
        const offset = this.chartOffset();
        this.menus.openDrawingMenu(id, x - offset.x, y - offset.y);
      },
      onDelete: () => {
        // Locked drawings stay, and stay selected.
        this.chart.removeDrawings(this.chart.getSelectedDrawingIds());
        this.docking.refreshObjects();
        this.drawingEdit.updateSelectionToolbar();
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
      this.chart.on(event, () => this.drawingEdit.updateSelectionToolbar());
    }
    // While it shows, it follows the drawing through edits, undo, pans, zooms,
    // rescales and replay steps, once a frame.
    for (const event of [
      'drawingUpdate', 'drawingRemove', 'historyChange', 'visibleRangeChange', 'priceRangeChange', 'zoomChange',
      'resize', 'paneResize', 'paneChange', 'dataUpdate', 'replayStep', 'chartTypeChange',
    ] as const) {
      this.chart.on(event, () => this.drawingEdit.scheduleSelectionToolbar());
    }

    // Right-click elsewhere: what the plot, an axis or a pane offers. The "+"
    // by the price axis: what to do at its price.
    this.menus.chartMenu = new WidgetContextMenu(this.root, this.t('chartMenu.label'), this.t('common.back'));
    // Indicators that read another symbol (a compare on its own scale, a spread) ask for its bars.
    this.chart.on('symbolSeriesRequest', (e) => void this.comparing.loadSymbolSeries(e.payload.symbol));
    // Prices from the pointer go on the market's grid (its smallest step).
    this.chart.on('chartContextMenu', (e) => {
      if (!this.featureState['menu.chart']) return;
      const { area, x, y, price: raw, time, pane } = e.payload as import('@tradecanvas/commons').ChartContextMenuPayload;
      const price = raw === undefined ? undefined : this.chart.roundPrice(raw);
      const context = { ...this.menus.chartMenuContext(price), ...(pane ? { pane: this.chart.getPaneScale(pane) } : {}) };
      this.menus.menuPane = pane ?? null;
      this.menus.openChartMenu(filterMenuEntries(chartMenuEntries(area, context, this.t), CHART_MENU_FEATURES, this.featureState), x, y, { area, price, time });
    });
    this.chart.on('priceAxisAdd', (e) => {
      if (!this.featureState['menu.priceAxisAdd']) return;
      const { price: raw, x, y } = e.payload as import('@tradecanvas/commons').PriceAxisAddPayload;
      const price = this.chart.roundPrice(raw);
      const entries = filterMenuEntries(priceEntries(this.menus.chartMenuContext(price), this.t), CHART_MENU_FEATURES, this.featureState);
      this.menus.openChartMenu(entries, x, y, { area: 'priceAxisAdd', price });
    });

    // A signal marker under the pointer says what it is.
    this.chart.on('signalMarkerHover', (e) => this.showMarkerTip(e.payload));

    // Typing a number on the chart changes the interval.
    this.intervals.intervalInput = new WidgetIntervalInput(this.chartContainer, {
      title: this.t('interval.title'),
      hint: this.t('interval.hint'),
      invalid: this.t('interval.invalid'),
    }, (tf) => this.intervals.selectTypedTimeframe(tf));
  }

  /** Named layouts, the account panel, the order ticket and bracket orders. */
  private buildTrading(options: ChartWidgetOptions, accountHost: HTMLDivElement): void {
    // Named layouts: save, open, rename, delete, auto-save.
    if (options.layouts !== false) this.layouts.setupLayouts(options.layouts === true || options.layouts === undefined ? {} : options.layouts);

    // Account panel and order ticket.
    if (options.trading !== false) {
      this.trading.orderTicket = new WidgetOrderTicket(this.root, {
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
      this.trading.accountPanel = new WidgetAccountPanel(accountHost, {
        onClosePosition: (id) => this.chart.closePositionIntent(id),
        onReversePosition: (id) => this.chart.reversePositionIntent(id),
        onCancelOrder: (id) => this.chart.cancelOrderIntent(id),
        onNewOrder: () => this.trading.openOrderTicket(),
        formatPrice: (p) => this.formatAlertPrice(p),
        formatTime: (ms) => {
          const { date, time } = utcToWallTime(ms, this.displayTimezone());
          return `${date} ${time}`;
        },
        formatAmount: (v) => this.formatMoney(v),
        formatNumber: (v, d) => this.formatNumber(v, d),
        onToggle: (open) => {
          this.markOpen('account', open);
          this.trading.refreshAccount();
        },
      }, this.t);
      // indicatorUpdate comes once per tick, so open P&L follows the price.
      for (const event of ['ordersChange', 'positionsChange', 'executionFill', 'dataUpdate', 'indicatorUpdate'] as const) {
        this.chart.on(event, () => this.trading.refreshAccountSoon());
      }
    }

    // Bracket-order placement: floating confirm/cancel bar + event wiring.
    if (options.trading !== false) {
      this.trading.bracketBar = new WidgetBracketBar(this.chartContainer, {
        onConfirm: () => this.chart.confirmBracket(),
        onCancel: () => {
          this.chart.cancelBracket();
          this.trading.bracketBar?.hide();
        },
      }, this.t);
      this.chart.on('bracketPlace', (e) => {
        const b = e.payload;
        this.trading.bracketBar?.hide();
        this.say(fill(this.t(b.side === 'buy' ? 'bracket.longPlaced' : 'bracket.shortPlaced'), { rr: b.riskReward.toFixed(2) }));
      });

      // Depth-of-market ladder (opt-in; fed via widget.setDepth)
      if (options.depthLadder) {
        this.trading.depthLadder = new WidgetDepthLadder(this.root, {
          onTrade: (side, price) => {
            this.chart.placeOrderIntent({ side, type: 'limit', price });
            this.say(fill(this.t(side === 'buy' ? 'order.buyLimit' : 'order.sellLimit'), { price: this.formatAlertPrice(price) }));
          },
          formatPrice: (p) => this.formatAlertPrice(p),
          priceStep: (p) => this.chart.getPriceStep(p),
          onToggle: (open) => this.markOpen('ladder', open),
          onClose: () => this.docking.closePanelByHand('depthLadder'),
        }, undefined, this.t);
        // Your working orders, marked on the rows where they wait.
        const ladder = this.trading.depthLadder;
        this.chart.on('ordersChange', () => ladder.setOrders(this.chart.getOrders()));
      }
      // Esc-cancel originates in the chart; reflect it in the bar.
      this.chart.on('dataUpdate', (e) => {
        if (e.payload.kind === 'bracket') this.trading.bracketBar?.hide();
      });
    }
  }

  /** Price alerts, and the indicators dialog. */
  private buildAlerts(options: ChartWidgetOptions): void {
    this.alerting.alertsPanel = new WidgetAlertsPanel(this.root, {
      onClose: () => this.docking.closePanelByHand('alerts'),
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
      getChannelValue: (channel) => this.alerting.getAlertChannelValue(channel),
      formatPrice: (p) => this.formatAlertPrice(p),
    }, this.t);

    // Keep the panel list and toasts in sync with the chart's AlertManager.
    this.chart.on('alertAdd', () => this.alerting.refreshAlerts());
    this.chart.on('alertRemove', () => this.alerting.refreshAlerts());
    this.chart.on('alertUpdate', () => this.alerting.refreshAlerts());
    this.chart.on('alertExpired', (e) => {
      const p = e.payload;
      this.alerting.refreshAlerts();
      if (this.featureState.alerts) this.say(fill(this.t('alerts.expiredToast'), { text: p.message ?? this.alerting.alertText(p) }));
    });
    if (options.alertNotifications) {
      this.alerting.alertNotifier = new AlertNotifier(options.alertNotifications);
    }
    this.chart.on('alertTriggered', (e) => {
      const p = e.payload;
      this.alerting.refreshAlerts();
      if (!this.featureState.alerts) return;
      const text = `${this.alerting.alertText(p)}${p.message ? ` — ${p.message}` : ''}`;
      this.say(fill(this.t('alerts.fired'), { text }), 'info', 'bell');
      this.alerting.alertNotifier?.notify(text);
    });

    // The indicators dialog, from the toolbar's Indicators button.
    this.indicatorPickerPart = this.lazyPart(DIALOGS.indicatorPicker, ({ WidgetIndicatorPicker }) => new WidgetIndicatorPicker(this.overlayHost, {
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
      onClose: () => this.markOpen('indicators', false),
    }, this.t));
  }

  /** The object tree, and every panel into the dock. */
  private buildPanels(features: FeaturesConfig): void {
    this.indicatorSettingsPart = this.lazyPart(DIALOGS.indicatorSettings, ({ WidgetIndicatorSettings }) => new WidgetIndicatorSettings(this.root, {
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
    }, this.t));
    this.objectTree = new WidgetObjectTree(this.root, {
      onClose: () => this.docking.closePanelByHand('objectTree'),
      onRemoveIndicator: (iid) => this.handleRemoveIndicator(iid),
      onConfigureIndicator: (iid) => this.openIndicatorSettings(iid),
      onToggleIndicatorVisible: (iid, visible) => {
        this.chart.setIndicatorVisible(iid, visible);
        this.docking.refreshObjects();
        this.legend.scheduleLegend();
      },
      onRemoveDrawing: (id) => {
        if (this.drawingSettings?.editing() === id) this.drawingSettings.close(true);
        this.chart.removeDrawing(id);
        this.docking.refreshObjects();
      },
      onConfigureDrawing: (id) => this.drawingEdit.openDrawingSettings(id),
      onToggleDrawingVisible: (id, visible) => {
        this.chart.setDrawingVisible(id, visible);
        this.docking.refreshObjects();
      },
      onToggleDrawingLocked: (id, locked) => {
        this.chart.setDrawingLocked(id, locked);
        this.docking.refreshObjects();
      },
      onToggleGroupVisible: (group, visible) => {
        this.chart.setDrawingGroupVisible(group, visible);
        this.docking.refreshObjects();
      },
      onToggleGroupLocked: (group, locked) => {
        this.chart.setDrawingGroupLocked(group, locked);
        this.docking.refreshObjects();
      },
      onUngroup: (group) => {
        this.chart.ungroupDrawings(group);
        this.docking.refreshObjects();
      },
      onRenameGroup: (group, name) => {
        this.chart.renameDrawingGroup(group, name);
        this.docking.refreshObjects();
      },
      onSelectDrawing: (id) => this.chart.selectDrawing(id),
      onRenameDrawing: (id, name) => {
        this.chart.updateDrawing(id, { name: name || null });
        this.docking.refreshObjects();
      },
      onCloneDrawing: (id) => {
        this.chart.duplicateDrawing(id);
        this.docking.refreshObjects();
      },
      onMoveDrawing: (id, index) => {
        this.chart.moveDrawing(id, index);
        this.docking.refreshObjects();
      },
      onAddCompare: features.compareSymbols !== false ? () => this.comparing.handleAddCompare() : undefined,
      onRemoveCompare: (id) => this.comparing.removeCompared(id),
    }, this.t);
    const refresh = () => { if (this.objectTree?.isOpen()) this.docking.refreshObjects(); };
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
      this.chart.on(event, () => this.comparing.refreshCompareDialog());
    }

    // Every panel made: into the dock, in the rail's order.
    this.docking.setupDock();
  }

  /** The command palette, fullscreen and the keys. */
  private buildCommandPalette(): void {
    this.commandPalettePart = this.lazyPart(DIALOGS.commandPalette, ({ WidgetCommandPalette }) => new WidgetCommandPalette({
      onIndicator: (id) => this.handleAddIndicator(id),
      onChartType: (type) => this.handleChartType(type),
      onDrawingTool: (tool) => this.handleDrawingTool(tool),
      onTimeframe: (tf) => this.handleTimeframe(tf),
      onAction: (id) => this.commands.handleAction(id),
      onClose: () => {},
    }, this.overlayHost, this.t, {
      list: () => readRecentCommands(),
      add: (key) => writeRecentCommands([key, ...readRecentCommands().filter((k) => k !== key)]),
    }));

    this.boundGlobalKeydown = (e: KeyboardEvent) => {
      if (this.handleHostHotkey(e)) return;
      if (this.featureState.hotkeys && this.replay.isOpen() && this.replay.handleReplayKey(e)) return;
      // With several widgets on the page, the shortcuts go to the one used last.
      const mine = isKeyTarget(this.root);
      // The widget's keys may be switched off all together, or one by one.
      const keyOn = (name: WidgetFeature): boolean => this.featureState.hotkeys && this.featureState[name];
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        if (!mine || !keyOn('hotkeys.commandPalette') || !this.featureState.commandPalette) return;
        e.preventDefault();
        this.commands.toggleCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        // Ctrl/Cmd+P → symbol search (matches Bloomberg / many trading UIs)
        if (!mine || !keyOn('hotkeys.symbolSearch') || !this.featureState.symbolSearch) return;
        e.preventDefault();
        this.openSymbolSearch();
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        // Ctrl/Cmd+S → save the layout (rather than the page), once this widget was used.
        if (!this.layouts.layoutSession || !keyOn('hotkeys.save') || !this.featureState.layouts || isTyping() || !isKeyTarget(this.root, true)) return;
        e.preventDefault();
        void this.layouts.saveLayout();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && TOOL_HOTKEYS[e.code]) {
        // Alt+T trend line, Alt+H horizontal line… (the drawing tools' keys).
        if (e.defaultPrevented || isTyping() || !mine || inOverlay() || !keyOn('hotkeys.tools')) return;
        e.preventDefault();
        this.handleDrawingTool(TOOL_HOTKEYS[e.code]);
      } else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // A number typed on the chart starts an interval (5, 15m, 1h…).
        if (e.defaultPrevented || !this.intervals.intervalInput || !keyOn('intervalTyping') || isTyping() || inOverlay() || !isKeyTarget(this.root, true)) return;
        const active = document.activeElement;
        // Focus in another part of the page: the keys are its.
        if (active && active !== document.body && !this.root.contains(active)) return;
        e.preventDefault();
        this.intervals.intervalInput.open(e.key);
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
          this.chartSettings.changeSettings({ invertScale: !this.chartSettings.settingsState.invertScale });
        } else if (e.code === 'KeyR') {
          // Alt+R → the whole series in view, the price scale fitted to it.
          if (!keyOn('hotkeys.resetView')) return;
          e.preventDefault();
          this.resetView();
        } else if (keyOn('hotkeys.goToDate') && this.featureState.goToDate) {
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
  }

  /** The kept settings, the stream, the watchlist's ticks, the first update and onReady. */
  private finishSetup(options: ChartWidgetOptions): void {
    // The settings the user kept in this browser, over the host's starting values (Reset goes back to those).
    this.chartSettings.restoreKeptSettings();

    // The stream, or the interval from here without one.
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
    if (this.watching.watchlist) {
      this.watching.watchlistInterval = setInterval(() => this.watching.tickWatchlist(), 1000);
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

    // Once the constructor has returned (the name the host gives the
    // widget is set by then: `onReady: () => widget.openPanel('watchlist')`),
    // onReady, then a view shared in the URL over what it set up. The last
    // step here: a widget whose making failed calls neither.
    queueMicrotask(() => {
      if (this.destroyed) return;
      try {
        options.onReady?.(this.chart, this);
      } finally {
        // An error in onReady is the host's to see; the shared view still comes.
        if (!this.destroyed) this.layouts.restoreSharedView();
      }
    });
    this.preloadDialogsWhenIdle();
  }

  /**
   * The dialogs' code, loaded once the page has a moment to spare: not in the way of the chart
   * coming up, and in before the user opens one, so the first opens at once too.
   */
  private preloadDialogsWhenIdle(): void {
    const load = (): void => {
      if (!this.destroyed) void preloadDialogs();
    };
    const page = globalThis as {
      requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (page.requestIdleCallback && page.cancelIdleCallback) {
      const handle = page.requestIdleCallback(load, { timeout: PRELOAD_IDLE_TIMEOUT_MS });
      const cancel = page.cancelIdleCallback;
      this.stopPreload = () => cancel(handle);
    } else {
      const timer = setTimeout(load, PRELOAD_DELAY_MS);
      this.stopPreload = () => clearTimeout(timer);
    }
  }

  // --- Public API ---

  /**
   * Replace the symbols on offer, tickers or SymbolInfo as in the `symbols`
   * option. Does not change the active symbol. A watchlist made from
   * `symbols` (no `lists`, nothing kept) is replaced by their tickers too.
   */
  setSymbols(symbols: readonly (string | SymbolInfo)[]): void {
    const catalog = readSymbolCatalog(symbols);
    this.symbols = catalog.names;
    this.symbolCatalog = catalog.info;
    // A list made from the symbols follows them; lists given or kept stay.
    const store = this.watching.watchlistStore;
    if (store && this.watching.watchlistFromSymbols) {
      store.replace(store.getLists().map((l) => (l.id === 'default' ? { ...l, symbols: catalog.names } : l)));
    }
    this.refreshSymbolTitle();
    this.refreshSymbolInfo();
  }

  /** The symbols on offer, each with what came with it, for the search and compare dialogs. */
  private symbolEntries(): (string | SymbolInfo)[] {
    return this.symbols.map((symbol) => this.symbolCatalog.get(symbol) ?? symbol);
  }

  /**
   * What the chart knows of its symbol, to name it; null while it is still
   * another symbol's. It is this symbol's when it names it (in any case, or
   * with a venue before one of the two), or when the chart was told it since
   * the symbol changed: a feed may spell the symbol its own way ('BTC-USD' for
   * 'BTCUSD'). Its words are cleaned as the symbols given are, so a blank name
   * or a numeric exchange code neither shows nor erases theirs; the market's
   * hours, price step and zone are read from the chart's info as it is.
   */
  private chartSymbolInfo(): SymbolInfo | null {
    const info = this.chart.getSymbolInfo();
    const own = info && info !== this.chartInfoAtSwitch ? info : chartInfoFor(this.state.symbol, info);
    return own ? cleanSymbolInfo(own, this.state.symbol) : null;
  }

  /** The symbol's names: what the chart knows first, what came with `symbols` for the rest. */
  private displayInfo(): SymbolInfo | null {
    return mergeSymbolInfo(this.symbolCatalog.get(this.state.symbol), this.chartSymbolInfo()) ?? null;
  }

  /** The symbol's name and exchange as the tooltip of its button on the toolbar. */
  private refreshSymbolTitle(): void {
    this.toolbar?.setSymbolDescription(symbolTitle(this.displayInfo()));
  }

  // --- Watchlists ---

  /** Every watchlist, in order. */
  getWatchlists(): WatchlistList[] {
    return this.watching.getWatchlists();
  }

  /** The shown watchlist's id, or null without a watchlist. */
  getActiveWatchlist(): string | null {
    return this.watching.getActiveWatchlist();
  }

  /** Replace every watchlist (and which one shows). */
  setWatchlists(lists: WatchlistList[], activeList?: string): void {
    return this.watching.setWatchlists(lists, activeList);
  }

  setActiveWatchlist(id: string): void {
    return this.watching.setActiveWatchlist(id);
  }

  /** Add a symbol to a watchlist (the shown one by default). */
  addToWatchlist(symbol: string, listId?: string): void {
    return this.watching.addToWatchlist(symbol, listId);
  }

  removeFromWatchlist(symbol: string, listId?: string): void {
    return this.watching.removeFromWatchlist(symbol, listId);
  }

  /**
   * Quotes for the watchlist's rows (and `getQuote`), from your own feed.
   * What isn't a quote (no symbol, no finite last price) is left out.
   */
  setQuotes(quotes: readonly Quote[]): void {
    return this.watching.setQuotes(quotes);
  }

  /** The latest quote of a symbol, from the quote source or `setQuotes`. */
  getQuote(symbol: string): Quote | null {
    return this.watching.getQuote(symbol);
  }

  /**
   * Open a panel of the dock beside the chart (in a sheet on a phone), in
   * place of the one open. False when the widget hasn't it: no watchlist, no
   * depth ladder (the `depthLadder` option), or its switch off.
   */
  openPanel(panel: WidgetPanel): boolean {
    return this.docking.openPanel(panel);
  }

  /** Shut the dock. */
  closePanel(): void {
    return this.docking.closePanel();
  }

  /** The panel open in the dock, or null. */
  getOpenPanel(): WidgetPanel | null {
    return this.docking.getOpenPanel();
  }

  /** Open or close the symbol info panel (toggle when `open` is left out). */
  toggleSymbolInfo(open?: boolean): void {
    const panel = this.symbolInfoPanel;
    if (!panel) return;
    const opening = open ?? !panel.isOpen();
    // Switched off, it only closes.
    if (opening && !this.featureState.symbolInfo) return;
    if (opening) this.docking.dock?.open('symbolInfo');
    else this.docking.dock?.closePage('symbolInfo');
  }

  /** The market's status in the status bar, and the panel when it's open. */
  private refreshMarket(): void {
    if (pageHidden()) return;
    const status = marketStatus(this.chart.getSymbolInfo(), Date.now());
    const open = status.state === 'open';
    this.statusBar?.setMarket(
      status.state,
      this.t(open ? 'symbolInfo.open' : 'symbolInfo.closed'),
      this.t(open ? 'statusBar.marketOpen' : 'statusBar.marketClosed'),
    );
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
      names: this.displayInfo(),
      quote: this.watching.quotes.get(symbol),
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
    return this.chartSettings.settingsState.numberLocale || this.options.locale || 'en';
  }

  /** The language words in the panels are written in ("in 3 hours", weekday names): the widget's. */
  private textLocale(): string {
    return this.options.locale || 'en';
  }

  async setSymbol(symbol: string): Promise<void> {
    // Flush the outgoing symbol's layout BEFORE switching state, so the
    // saved snapshot reflects what the user actually saw under that ticker.
    this.layouts.flushActiveLayout();
    if (symbol !== this.state.symbol) {
      // Fill marks sit on this symbol's bars; the next symbol starts with none.
      this.chart.clearFills();
      this.chartInfoAtSwitch = this.chart.getSymbolInfo();
    }
    this.state = { ...this.state, symbol };
    this.sessionRefPrice = null;
    this.options.onSymbolChange?.(symbol);
    this.updateUI();
    this.refreshSymbolTitle();
    this.watching.watchlist?.setActive(symbol);
    this.refreshMarket();
    this.loadNews();
    this.layouts.layoutSession?.changed();
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
    return this.watching.setWatchlistEntry(symbol, entry);
  }

  /** Ignored when the chart's `features.timeframes` whitelist leaves `tf` out. */
  async setTimeframe(tf: TimeFrame): Promise<void> {
    if (!this.chart.isTimeframeAllowed(tf)) return;
    // The user's pick: it bounds the range bar from now on, and wins over a range on its way.
    this.chosenTimeframe = tf;
    this.intervals.rangeSeq++;
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
    this.layouts.layoutSession?.changed();
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
    this.look.set({ dark: isDark, theme: resolved });
    this.updateUI();
  }

  getChart(): Chart {
    return this.chart;
  }

  /**
   * Change the widget's look: a preset (`'print'`, `'studio'`,
   * `'terminal'`, `'capsule'`, `'desk'`) or your theme over one. Colours stay with
   * `setTheme`. The look sets the chart's bar layout and face too (its figures
   * face, which is the system's sans in Print; golden bars, except when compact),
   * over any set on the chart itself, unless `chartOptions` set the bar
   * layout or a `font.family`; the sizes of `chartOptions.font` stay.
   */
  setUI(theme: WidgetUIPreset | WidgetUITheme): void {
    this.ui = resolveWidgetUI(theme);
    this.uiVariables = true;
    this.uiScale = this.scaleNow();
    this.applyLookTokens();
    this.applyChartShapes();
    this.applyLegendFont();
    this.applyChartLook();
  }

  /** The scale the look is drawn at: its own, or by the widget's width when `'auto'` (1 before it is laid out). */
  private scaleNow(): number {
    if (this.ui.scale !== 'auto' && this.ui.scale !== undefined) return this.ui.scale;
    const width = this.root.clientWidth;
    return width > 0 ? widgetScaleFor(width) : 1;
  }

  /**
   * The look's tokens on the root and the modal portal, at its scale. Without
   * a look given and at scale 1 they stay the stylesheet's, so a host's CSS
   * can still set them.
   */
  private applyLookTokens(): void {
    const shown = scaledWidgetUI(this.ui, this.uiScale);
    for (const el of [this.root, this.portal]) {
      applyWidgetUI(el, shown, { variables: this.uiVariables });
      // With no look given the host's CSS keeps its tokens; a bigger scale sets only the sizes it grows.
      if (this.uiVariables) continue;
      const vars = widgetUIVariables(shown);
      for (const name of SCALED_TOKENS) {
        if (this.uiScale !== 1) el.style.setProperty(name, vars[name]);
        else el.style.removeProperty(name);
      }
    }
  }

  /** The widget was resized: a step wider or narrower draws the look at another scale. */
  private fitScale(): void {
    if (this.destroyed) return;
    const next = this.scaleNow();
    if (next === this.uiScale) return;
    // Within a few px of a step the scale stays: bars that grow may push a scrollbar back and forth.
    if (this.ui.scale === 'auto') {
      const width = this.root.clientWidth;
      const past = next > this.uiScale ? widgetScaleFor(width - SCALE_DEAD_BAND) : widgetScaleFor(width + SCALE_DEAD_BAND);
      if (past === this.uiScale) return;
    }
    this.uiScale = next;
    this.applyLookTokens();
    this.applyLegendFont();
    this.applyChartLook();
    this.toolbar?.fit();
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
    this.chart.setLegend({ fontFamily: this.ui.font.mono, fontSize: typeSize(Math.round(this.ui.font.size * this.uiScale), -1) });
  }

  /**
   * The look's chart: its figures (axes, tags) in the look's figures face, and
   * golden bars, but the classic 2 px gap when compact. `chartOptions` that set the bars or a face win;
   * sizes alone keep the look's face.
   */
  private applyChartLook(): void {
    const given = this.options.chartOptions;
    // More bars on screen with air between them (about 250 across 1920 px, from about 170); compact keeps the tight classic bars.
    if (!given?.barLayout) this.chart.setBarLayout(this.ui.density === 'compact' ? 'classic' : 'golden');
    // The chart's type grows with the look, from its sizes before any scaling; sizes `chartOptions.font` sets stay.
    const sizes = this.scaledChartSizes();
    // setFont goes over the font before it, so the sizes of `chartOptions.font` stay under the look's face.
    if (!given?.font?.family) this.chart.setFont({ family: this.ui.font.mono, ...sizes });
    else if (Object.keys(sizes).length > 0) this.chart.setFont(sizes);
  }

  /**
   * The chart's type sizes at the look's scale, or none to set: sizes of
   * `chartOptions.font` stay, and at scale 1 the chart keeps its own (a
   * scale gone back to 1 puts them back). The base is the chart's sizes
   * before the look first scaled them, or since a host changed them.
   */
  private scaledChartSizes(): Partial<{ sizeSmall: number; sizeMedium: number; sizeLarge: number }> {
    const given = this.options.chartOptions?.font;
    if (given?.sizeSmall !== undefined || given?.sizeMedium !== undefined || given?.sizeLarge !== undefined) return {};
    const now = this.chart.getFont?.();
    if (!now) return {};
    const current = { sizeSmall: now.sizeSmall, sizeMedium: now.sizeMedium, sizeLarge: now.sizeLarge };
    const written = this.drawingEdit.chartFontWritten;
    const changedByHost = !written || written.sizeSmall !== current.sizeSmall || written.sizeMedium !== current.sizeMedium || written.sizeLarge !== current.sizeLarge;
    if (changedByHost) this.chartFontBase = current;
    if (this.uiScale === 1 && !written) return {};
    const base = this.chartFontBase ?? current;
    const at = (n: number) => (this.uiScale === 1 ? n : Math.round(n * this.uiScale));
    const sizes = { sizeSmall: at(base.sizeSmall), sizeMedium: at(base.sizeMedium), sizeLarge: at(base.sizeLarge) };
    // Back at 1 the base is the chart's own again, and the look stops writing.
    this.drawingEdit.chartFontWritten = this.uiScale === 1 ? null : sizes;
    return sizes;
  }

  /** The chart's own tags and pills take the look's corners. */
  private applyChartShapes(): void {
    this.chart.setShapes({ tagRadius: this.ui.tagRadius });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scope.dispose();
    this.stopPreload?.();
    this.stopKeyboardInset?.();
    this.stopKeyboardInset = null;
    this.stopNarrow?.();
    this.docking.dockObserver?.disconnect();
    this.scaleObserver?.disconnect();
    this.drawingEdit.inlineText?.close();
    this.stopNarrow = null;
    this.stopFormControls?.();
    this.stopFormControls = null;

    if (this.boundGlobalKeydown) {
      document.removeEventListener('keydown', this.boundGlobalKeydown);
    }
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.unregisterKeys();
    this.tooltip.destroy();
    if (this.legend.legendFrame) cancelAnimationFrame(this.legend.legendFrame);
    this.indicatorLegend?.destroy();
    this.portal.remove();
    if (document.fullscreenElement === this.root) void document.exitFullscreen().catch(() => {});
    this.layouts.flushActiveLayout();
    this.commandPalettePart?.destroy();
    this.symbolSearchPart?.destroy();
    this.hotkeySheetPart?.destroy();
    this.replay.destroy();
    this.dragDrop?.detach();
    this.alerting.alertsPanel?.destroy();
    this.objectTree?.destroy();
    this.indicatorSettingsPart?.destroy();
    this.indicatorPickerPart?.destroy();
    this.drawingStyle?.destroy();
    this.drawingSettingsPart?.destroy();
    this.menus.drawingMenu?.destroy();
    this.menus.clearMenu?.destroy();
    this.drawingEdit.cancelTextPrompt?.();
    this.drawingEdit.selectionToolbar?.destroy();
    if (this.drawingEdit.selectionToolbarFrame !== null) cancelAnimationFrame(this.drawingEdit.selectionToolbarFrame);
    this.menus.chartMenu?.destroy();
    this.legend.legendMenu?.destroy();
    for (const menu of this.hostMenus) menu.destroy();
    this.hostMenus.clear();
    this.templatePrompt?.destroy();
    this.chartSettings.chartTemplatePrompt?.destroy();
    this.drawingEdit.drawingTemplatePrompt?.destroy();
    this.intervals.intervalInput?.destroy();
    this.markerTip?.remove();
    this.layouts.layoutSession?.destroy();
    this.layouts.layoutsUI?.destroy();
    this.chartSettings.settingsListeners.clear();
    this.trading.accountPanel?.destroy();
    this.trading.orderTicket?.destroy();
    if (this.trading.accountFrame) cancelAnimationFrame(this.trading.accountFrame);
    this.trading.bracketBar?.destroy();
    this.alerting.alertNotifier?.destroy();
    this.trading.depthLadder?.destroy();
    this.dataWindow?.destroy();
    if (this.watching.watchlistInterval) clearInterval(this.watching.watchlistInterval);
    if (this.marketTimer) clearInterval(this.marketTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.onPageShown) document.removeEventListener('visibilitychange', this.onPageShown);
    this.onPageShown = null;
    this.chartNav?.destroy();
    this.symbolInfoPanel?.destroy();
    this.docking.dock?.destroy();
    this.watching.stopQuotes?.();
    this.watching.stopQuotes = null;
    this.watching.watchlist?.destroy();
    this.toolbar?.destroy();
    this.sidebar?.destroy();
    this.settingsPart?.destroy();
    this.statusBar?.destroy();
    this.goToDatePart?.destroy();
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
    // Letters typed while its code loads add up, so none is lost; any other ask starts afresh.
    const typed = query === undefined ? '' : (this.symbolSearchPart?.isLoading() ? this.typedWhileLoading : '') + query;
    this.typedWhileLoading = typed;
    this.whenLoaded(this.symbolSearchPart, () => this.featureState.symbolSearch, (search) => {
      this.typedWhileLoading = '';
      search.open({
        symbols: this.symbolEntries(),
        current: this.state.symbol,
        currentInfo: this.chartSymbolInfo(),
        search: this.symbolSearchFn(),
        query: query === undefined ? undefined : typed,
        // Said where it can be done: letters typed on the chart open it.
        hint: this.sheetKeyOn('symbolTyping') ? this.t('symbolSearch.typeHint') : undefined,
      });
    });
  }

  /** The symbol search for another job (a symbol to add to a list, one to compare with), once its code is in. */
  private withSymbolSearch(on: () => boolean, show: (search: WidgetSymbolSearch) => void): void {
    this.typedWhileLoading = '';
    this.whenLoaded(this.symbolSearchPart, on, show);
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
    if (changed('selectionToolbar')) this.drawingEdit.updateSelectionToolbar();
    if (changed('indicatorLegend')) {
      this.chart.setPaneTitlesVisible(!this.featureState.indicatorLegend);
      this.legend.scheduleLegend();
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
    if (turnedOff('replay') && this.replay.isOpen()) this.replay.exitReplay();
    const closers: readonly [WidgetFeature, () => void][] = [
      ['alerts', () => this.docking.dock?.closePage('alerts')],
      ['objectTree', () => this.docking.dock?.closePage('objectTree')],
      ['symbolInfo', () => this.docking.dock?.closePage('symbolInfo')],
      ['dataWindow', () => this.docking.dock?.closePage('dataWindow')],
      ['accountPanel', () => this.trading.toggleAccountPanel(false)],
      ['orderTicket', () => this.trading.orderTicket?.close()],
      ['depthLadder', () => this.docking.dock?.closePage('depthLadder')],
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
      ['menu.chart', () => this.menus.chartMenu?.close()],
      ['menu.priceAxisAdd', () => this.menus.chartMenu?.close()],
      ['menu.drawing', () => this.menus.drawingMenu?.close()],
      ['indicatorLegend', () => this.legend.legendMenu?.close()],
      ['indicatorLegend.more', () => this.legend.legendMenu?.close()],
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

  /** The symbol behind the bars, in the ink of the mode shown. */
  private paintWatermark(): void {
    this.chart.setWatermark(this.state.symbol.replace('USDT', ' / USDT'), {
      fontSize: WATERMARK_FONT_SIZE,
      color: this.state.isDark ? WATERMARK_ON_DARK : WATERMARK_ON_LIGHT,
    });
  }

  /**
   * Runs a theme change, the user's look that isn't a colour (a grid way hidden, a dash) going
   * with them to the new theme: colours stay with the theme they were picked on.
   */
  private keepingLook(change: () => void): void {
    // The open settings keep what they changed: its colours belong to the theme that is going.
    if (this.chartSettings.settingsEdit) this.settings?.close();
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
      case 'hotkeys.save': return f.layouts && this.layouts.layoutSession !== null;
      case 'hotkeys.help': return f.hotkeySheet;
      case 'intervalTyping': return this.intervals.intervalInput !== null;
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
    this.docking.syncRail();
    // A preset, go to date or the market's word shown or hidden changes what the status bar must fit.
    this.statusBar?.fit();
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
      // The toolbar refits when the button's group changes width; a count as wide as the last costs nothing.
      setText: (text) => void setHostButtonText(element, spec.label, text),
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
        // Picked from "more", the button is folded: the menu hangs from "more", as the toolbar's own do,
        // and with no room past it ends where "more" does, as the More menu does. Right to left it
        // starts at the button's right edge, as the toolbar's own menus do.
        const anchor = toolbar.menuAnchor(button);
        menu.openUnder(withHostItems([], items), anchor, (id) => pickHostItem(id, items));
      },
    });
    element.setAttribute('aria-haspopup', 'menu');
    element.setAttribute('aria-expanded', 'false');
    toolbar.tidy();
    return {
      element,
      setText: (text) => void setHostButtonText(element, spec.label, text),
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

  /** Open or close the account panel (no argument: the other way from now). */
  toggleAccountPanel(open?: boolean): void {
    return this.trading.toggleAccountPanel(open);
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

  /** The display timezone from the settings; 'exchange' is the zone the chart resolved it to. */
  private displayTimezone(): TimeZoneSetting {
    const tz = settingToTimezone(this.chartSettings.settingsState.timezone);
    return tz === 'exchange' ? this.chart.getEffectiveTimeZone() : tz;
  }

  private toggleGoToDate(): void {
    this.whenLoaded(this.goToDatePart, () => this.featureState.goToDate, (dialog) => this.toggleLoadedGoToDate(dialog));
  }

  private toggleLoadedGoToDate(dialog: WidgetGoToDate): void {
    if (dialog.isOpen()) {
      dialog.close();
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
    dialog.open({
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

  /**
   * Render the base series at the active timeframe, resampling when coarser:
   * days, weeks, months and the hour frames that divide a day start at the
   * exchange's midnight (`getExchangeTimeZone`), else at UTC's.
   */
  private applyTimeframeData(): void {
    if (!this.baseSeries) return;
    const started = performance.now();
    const targetMs = timeframeToMs(this.state.timeframe);
    if (this.baseTimeframeMs > 0 && targetMs > this.baseTimeframeMs) {
      const zone = this.chart.getExchangeTimeZone() ?? null;
      this.chart.setData(resampleOHLCV(this.baseSeries, this.state.timeframe, this.resampleOptions(zone)));
      this.builtInZone = zone;
    } else {
      this.chart.setData(this.baseSeries);
      this.builtInZone = undefined;
    }
    this.lastLocalSwitchMs = performance.now() - started;
  }

  private resampleOptions(zone: string | null): { weekStartsOn: 0 | 1; timeZone?: string } {
    return { weekStartsOn: this.options.weekStartsOn ?? 1, timeZone: zone ?? undefined };
  }

  /**
   * The exchange's zone moved (the symbol's info, or the market, came after
   * the bars): build their days again, a view scrolled back on the times it
   * showed, at the same zoom. Bars that start where they did in any zone
   * (15m or 1h from minutes) stay.
   */
  private rebuildForZone(): void {
    if (this.adapter || this.builtInZone === undefined) return;
    const zone = this.chart.getExchangeTimeZone() ?? null;
    if (zone === this.builtInZone) return;
    if (!timeframeFollowsDays(this.state.timeframe)) {
      this.builtInZone = zone;
      return;
    }
    const from = this.timeToKeepInView();
    // New bars land at the live edge, which they keep, following the next ones.
    this.applyTimeframeData();
    if (from !== null) this.chart.scrollTo(from);
  }

  /**
   * Where a view scrolled back should start once the days are built again:
   * half a bar before the first bar on screen, so the new bar there is the
   * one that holds most of it, whichever way the zone moved the days. Null
   * at the live edge, and on Renko and the other types that redraw the bars,
   * whose times count bricks from the first bar and so move with it.
   */
  private timeToKeepInView(): number | null {
    if (!this.chart.isTimeAligned()) return null;
    const shown = this.chart.getVisibleTimeRange();
    const bars = this.chart.getData();
    if (!shown || bars.length < 2 || shown.to >= bars[bars.length - 1].time) return null;
    const first = bars.findIndex((bar) => bar.time === shown.from);
    if (first < 0) return null;
    return shown.from - (bars[first + 1].time - shown.from) / 2;
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

  private handleToggleFavorite(tool: DrawingToolType): void {
    const pinned = this.favoritesStore.toggle(tool);
    this.sidebar?.setFavorites(this.favoritesStore.list());
    this.say(pinned ? this.t('toast.pinned') : this.t('toast.unpinned'));
  }

  /**
   * Encode the current view (symbol, timeframe, chart type, scale,
   * indicators, drawings, and the Chart Settings changed from the defaults
   * but the viewer's time zone and number format; for the switches the
   * host's features set, from where they set them).
   */
  exportState(): string {
    return this.layouts.exportState();
  }

  /** Restore a view from an `exportState()` string. Returns false if malformed. */
  async importState(encoded: string): Promise<boolean> {
    return this.layouts.importState(encoded);
  }

  /**
   * A link's settings of chart types over the viewer's: the types it names
   * take the sender's, and so does the type it shows, whose settings it
   * leaves out when they are the defaults; the others stay as the viewer set
   * them. Undefined when the link speaks of no type with settings.
   */
  private overViewerTypeOptions(shown: ChartType | undefined, shared: ChartTypeOptions | undefined): ChartTypeOptions | undefined {
    const named: ChartTypeOptions = { ...(hasTypeSettings(shown) ? { [shown]: {} } : {}), ...shared };
    if (Object.keys(named).length === 0) return undefined;
    return { ...this.chartSettings.getSettings().chartTypeOptions, ...named };
  }

  /** Copy the chart image to the clipboard, with a toast on success/failure. */
  async copyChartImage(): Promise<void> {
    const ok = await this.chart.copyScreenshot();
    this.say(ok ? this.t('toast.imageCopied') : this.t('toast.imageCopyFailed'), ok ? 'info' : 'error');
  }

  /** Copy a shareable deep-link (current view encoded in the URL hash) to the clipboard. */
  async copyShareLink(): Promise<void> {
    return this.layouts.copyShareLink();
  }

  /** Feed order-book depth to the chart overlay, depth ladder, and heatmap. */
  setDepth(depth: DepthData | null): void {
    return this.trading.setDepth(depth);
  }

  /** Begin a draggable bracket order at the latest price and show the action bar. */
  startBracket(side: 'buy' | 'sell'): void {
    return this.trading.startBracket(side);
  }

  private openIndicatorSettings(instanceId: string): void {
    this.whenLoaded(this.indicatorSettingsPart, () => this.featureState.indicatorSettings, (dialog) => this.showIndicatorSettings(dialog, instanceId));
  }

  private showIndicatorSettings(dialog: WidgetIndicatorSettings, instanceId: string): void {
    // Looked up once the dialog is in: the indicator may have gone while its code loaded.
    const active = this.chart.getActiveIndicators();
    const ind = active.find((i) => i.instanceId === instanceId);
    if (!ind) return;
    const style = this.chart.getIndicatorStyle(instanceId);
    const pane = ind.descriptor.placement === 'panel' || !!ind.pane;
    const ownLevels = (this.chart.getIndicatorSetup() ?? []).find((s) => s.instanceId === instanceId)?.levels !== undefined;
    this.chart.beginIndicatorEdit(instanceId);
    dialog.open({
      instanceId,
      indicatorId: ind.id,
      name: ind.descriptor.name,
      defaults: ind.descriptor.defaultConfig,
      params: ind.params,
      inputs: ind.descriptor.inputs,
      lineSources: lineSourcesFor(instanceId, active, this.t),
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

  /**
   * Compare with another symbol: its percent change on the price scale
   * (`'percent'`, the default), its price on a scale of its own (`'scale'`)
   * or in a pane of its own (`'pane'`), the spread or ratio of this symbol
   * to it (`'spread'`, `'ratio'`), or how they correlate, by price or by
   * bar-to-bar returns (`'correlation'`, `'correlationLog'`). Its bars come
   * through the adapter, first, in every way: when the fetch fails or finds
   * no bars at the chart's interval, nothing is added and a toast says why.
   */
  async addCompareSymbol(symbol: string, way: CompareWay = 'percent'): Promise<void> {
    return this.comparing.addCompareSymbol(symbol, way);
  }

  /** The prices the panels show, written again in the decimals the chart has now. */
  private refreshPriceTexts(): void {
    this.alerting.refreshAlerts();
    this.trading.refreshAccountSoon();
    if (this.dataWindow?.isOpen()) this.dataWindow.render(this.docking.buildDataWindowModel());
  }

  /**
   * Money in the quote's units (a stop's risk, an order's value), in the
   * number locale: to the decimals of the price step, two at most (a forex
   * pip's five would be noise on money).
   */
  private formatMoney(value: number): string {
    return this.formatNumber(value, Math.min(stepDecimals(this.chart.getPriceStep()), MONEY_DECIMALS));
  }

  /** A volume as the data window shows it: in 만, 억 and 조 when the chart's numbers are Korean. */
  private formatVolume(volume: number): string {
    const locale = this.chartSettings.settingsState.numberLocale || 'en-US';
    return formatVolumeLoc(volume, locale);
  }

  /** A plain figure to `decimals`, in the number locale. */
  private formatNumber(value: number, decimals: number): string {
    const locale = this.chartSettings.settingsState.numberLocale || undefined;
    return value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  /**
   * `scale`: the price whose size picks the decimals when nothing sets them
   * (a change takes its bar's, so it reads in the decimals its prices do).
   */
  private formatAlertPrice(price: number, scale = price): string {
    // The chart's own price format (fractions, a host's function) wins, then
    // the market's or the symbol's decimals: then a price reads as the axis
    // writes it, in the chart's number locale.
    if (this.chart.getPriceFormatter?.() || this.chartSetsDecimals()) return this.chart.formatPrice(price);
    // Nothing sets them: pick digits from magnitude so BTC (64,200.5) and a
    // sub-dollar alt (0.04821) both read sensibly, whatever is on view.
    const abs = Math.abs(scale);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    const locale = this.chartSettings.settingsState.numberLocale || undefined;
    return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });
  }

  /**
   * An indicator's value as the legend and the data window write it: a line
   * in the chart's prices as the chart writes them; one in a pane of its own,
   * on a scale of its own or of another symbol in the decimals its size
   * calls for; both in the number locale.
   */
  private indicatorValueText(value: number, inPriceUnits: boolean, locale: string): string {
    return inPriceUnits ? this.chart.formatPrice(value) : formatIndicatorValue(value, locale);
  }

  /** Whether the market or the symbol sets the decimals prices show (the market's win, as on the chart). */
  private chartSetsDecimals(): boolean {
    // `!= null`: a feed's JSON can send null for a field it has none of, and the chart takes that as unset.
    return this.chart.getMarket?.()?.pricePrecision != null || this.chart.getSymbolInfo?.()?.pricePrecision != null;
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
    this.settings?.refresh(this.chartSettings.shownSettings(), type);
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
    this.whenLoaded(this.hotkeySheetPart, () => this.featureState.hotkeySheet, (sheet) => sheet.open({
      isOn: (name) => this.sheetKeyOn(name),
      extra: this.hostHotkeys.map((h) => ({ keys: h.parsed.display, text: h.spec.label })),
    }));
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
    // The mode's theme: the host's own, or the built-in one. The user's colours stay with each.
    this.look.set({ dark: isDark, theme: isDark ? this.themeOf.dark : this.themeOf.light });
    this.updateUI();
  }

  /** A dialog's code, loaded the first time it opens; a failed load says so. */
  private lazyPart<M, T extends { destroy(): void }>(module: ModuleRef<M>, build: (module: M) => T): LazyPart<M, T> {
    return new LazyPart(module, build, (part) => part.destroy(), () => this.say(this.t('common.partFailed'), 'error'));
  }

  /**
   * Runs `show` with a dialog: at once when its code is in, else once it has loaded, unless the
   * widget went or its switch turned off meanwhile. Of the asks made while it loads, the last
   * one opens it (another indicator's settings, another tab), once.
   */
  private whenLoaded<T>(part: Lazy<T> | null, on: () => boolean, show: (part: T) => void): void {
    if (!part || !on()) return;
    const loaded = part.now();
    if (loaded) {
      show(loaded);
      return;
    }
    const waiting = part.isLoading();
    this.waitingShow.set(part, show as (part: unknown) => void);
    if (waiting) return;
    void part.load().then((done) => {
      const latest = this.waitingShow.get(part);
      this.waitingShow.delete(part);
      if (done && latest && !this.destroyed && on()) latest(done);
    });
  }

  /** A toggle pressed again while its dialog's code loads: the dialog no longer opens. Whether one was waiting. */
  private cancelWaiting(part: Lazy<unknown> | null): boolean {
    return part !== null && part.isLoading() && this.waitingShow.delete(part);
  }

  /** The whole series in view, the price scale fitted to it (the menus' Reset, Alt+R). */
  private resetView(): void {
    this.chart.fitContent();
    this.chartSettings.changeSettings({ autoScale: true });
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
    return this.layouts.getLayoutSession();
  }

  /** The symbol showing. */
  getSymbol(): string {
    return this.state.symbol;
  }

  /** The interval showing. */
  getTimeframe(): TimeFrame {
    return this.state.timeframe;
  }

  /**
   * This chart as a layout: symbol, interval, scale, the Chart Settings (but
   * the viewer's time zone and number format) and the chart's state (no
   * theme). A copy, free to keep.
   */
  captureLayout(): WidgetLayoutContent {
    return this.layouts.captureLayout();
  }

  /** Show a layout from `captureLayout()`. */
  async restoreLayout(content: WidgetLayoutContent): Promise<void> {
    return this.layouts.restoreLayout(content);
  }

  /** `captureLayout()` as JSON. */
  getLayoutContent(): string {
    return this.layouts.getLayoutContent();
  }

  /** Show a layout from `getLayoutContent()`; `false` when it is not one. */
  async applyLayoutContent(content: string): Promise<boolean> {
    return this.layouts.applyLayoutContent(content);
  }

  // --- Chart Settings ---

  /**
   * The Chart Settings as they are now: the overlays, scales, crosshair,
   * legend, time zone, number format and a chart type's own settings. A
   * copy, free to keep. Read back from the chart first, so what was set on
   * `getChart()` itself is in it.
   */
  getSettings(): ChartSettingsState {
    return this.chartSettings.getSettings();
  }

  /**
   * Change some of the Chart Settings, as the settings dialog does (an open
   * one shows them). What isn't a setting, or not of its kind, is left out,
   * and numbers are put in the dialog's ranges. Not an undo step: the change
   * is yours, not the user's. Auto-scale stays on until the chart has bars,
   * so settings `onSettingsChange` gave after a drag on the price axis are
   * safe to give back right after the constructor.
   */
  setSettings(patch: Partial<ChartSettingsState>): void {
    return this.chartSettings.setSettings(patch);
  }

  /**
   * Hear of each change to the Chart Settings, with `getSettings()`: once
   * when the settings dialog closes with OK, never for Cancel or for a
   * change that leaves them as they were. Returns the function that stops it.
   */
  onSettingsChange(listener: (settings: ChartSettingsState) => void): () => void {
    return this.chartSettings.onSettingsChange(listener);
  }

  /** Save into the open layout, or ask for a name when there is none. */
  async saveLayout(): Promise<void> {
    return this.layouts.saveLayout();
  }

  /** Open a saved layout by id; `false` when it could not be. */
  async openLayout(id: string): Promise<boolean> {
    return this.layouts.openLayout(id);
  }

  // --- Layout persistence ---

  /**
   * Wipe the layout saved for `symbol` (or the active symbol if omitted).
   * Useful as an "Reset layout" command in user-facing menus.
   */
  clearSavedLayout(symbol?: string): void {
    return this.layouts.clearSavedLayout(symbol);
  }

  /** Rebuild the chip strip from the chart's indicator instances. */
  private syncIndicatorsFromChart(): void {
    const next = new Map<string, ActiveIndicatorInfo>();
    for (const a of this.chart.getActiveIndicators()) {
      next.set(a.instanceId, { id: a.id, label: widgetIndicatorLabel(a, this.t) });
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
    if (this.cancelWaiting(this.indicatorPickerPart)) return;
    this.whenLoaded(this.indicatorPickerPart, () => this.featureState['toolbar.indicators'], (picker) => {
      if (picker.isOpen()) return;
      picker.open({
        items: this.indicatorPickerItems(),
        favorites: this.indicatorFavorites.list(),
        templates: this.featureState.indicatorTemplates ? this.templateNames() : null,
        counts: this.indicatorCounts(),
      });
      this.markOpen('indicators', true);
    });
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
    this.replay.toggleReplay();
  }

  /**
   * Open replay (if it isn't open) and start it at bar `index` — paused, or
   * playing when `play` is set — skipping the pick-a-bar step.
   */
  replayFrom(index: number, play = false): void {
    this.replay.replayFrom(index, play);
  }

  /** What the replay reads of the widget and asks of it. */
  private replayHost(): ReplayHost {
    return {
      chart: () => this.chart,
      root: this.root,
      chartContainer: this.chartContainer,
      options: this.options,
      t: (key) => this.t(key),
      isOn: () => this.featureState.replay,
      isDestroyed: () => this.destroyed,
      loading: this.loading,
      symbol: () => this.state.symbol,
      timeframe: () => this.state.timeframe,
      adapter: () => this.adapter,
      baseSeries: () => this.baseSeries,
      baseTimeframeMs: () => this.baseTimeframeMs,
      resampleOptions: (zone) => this.resampleOptions(zone),
      textLocale: () => this.textLocale(),
      intlLocale: () => this.intlLocale(),
      say: (text, kind) => this.say(text, kind),
      markActive: (on) => this.markOpen('replay', on),
      bodyEl: () => this.bodyEl(),
    };
  }

  /** Where the plot starts in the body, for the phone's drawing button to sit over it. */
  private placeDrawingButton(): void {
    const body = this.bodyEl();
    if (!this.sidebar || !body) return;
    const inBody = this.chartContainer.getBoundingClientRect().left - body.getBoundingClientRect().left;
    this.sidebar.setPlotLeft(inBody + this.chart.getPlotRect().x);
  }

  private bodyEl(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(':scope > .tcw-body');
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

      this.paintWatermark();

      // Re-apply per-symbol layout (indicators, drawings, chart type) after
      // the new history is in. Doing this *after* connect ensures indicators
      // recalculate against the loaded data, not the previous symbol's data.
      this.layouts.applySymbolLayout(this.state.symbol);

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
      void this.comparing.refetchCompares();
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

  private updateUI(): void {
    this.refreshDrawingsState();
    this.legend.scheduleLegend();
    this.toolbar?.update(this.state);
    this.sidebar?.update(this.state);
    this.statusBar?.update({
      connectionState: this.state.connectionState,
      message: this.state.connectionMessage,
      symbol: this.state.symbol,
      timeframe: this.state.timeframe,
    });
  }

  /** Mark `role` open or closed; the toolbar's effect shows it. */
  private markOpen(role: string, open: boolean): void {
    const now = this.openRoles.peek();
    if (now.has(role) === open) return;
    const next = new Set(now);
    if (open) next.add(role);
    else next.delete(role);
    this.openRoles.set(next);
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

  /** What WidgetCompares reads of the widget and asks of it. */
  private comparingHost(): ComparesHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get adapter() { return w.adapter; },
      get chart() { return w.chart; },
      get destroyed() { return w.destroyed; },
      get featureState() { return w.featureState; },
      get options() { return w.options; },
      refreshObjects: (...args) => w.docking.refreshObjects(...args),
      refreshScaleSwitches: (...args) => w.chartSettings.refreshScaleSwitches(...args),
      say: (...args) => w.say(...args),
      scheduleLegend: (...args) => w.legend.scheduleLegend(...args),
      get settings() { return w.settings; },
      get settingsState() { return w.chartSettings.settingsState; },
      showScaleMode: (...args) => w.chartSettings.showScaleMode(...args),
      shownSettings: (...args) => w.chartSettings.shownSettings(...args),
      get state() { return w.state; },
      symbolEntries: (...args) => w.symbolEntries(...args),
      get symbolLoads() { return w.symbolLoads; },
      get symbolSearch() { return w.symbolSearch; },
      symbolSearchFn: (...args) => w.symbolSearchFn(...args),
      get t() { return w.t; },
      withSymbolSearch: (...args) => w.withSymbolSearch(...args),
    };
  }

  /** What WidgetWatchlists reads of the widget and asks of it. */
  private watchingHost(): WatchlistsHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get chart() { return w.chart; },
      chartSymbolInfo: (...args) => w.chartSymbolInfo(...args),
      closePanelByHand: (...args) => w.docking.closePanelByHand(...args),
      get destroyed() { return w.destroyed; },
      get options() { return w.options; },
      refreshSymbolInfo: (...args) => w.refreshSymbolInfo(...args),
      get sessionRefPrice() { return w.sessionRefPrice; },
      set sessionRefPrice(value) { w.sessionRefPrice = value; },
      setSymbol: (...args) => w.setSymbol(...args),
      get settingsState() { return w.chartSettings.settingsState; },
      get state() { return w.state; },
      symbolEntries: (...args) => w.symbolEntries(...args),
      symbolSearchFn: (...args) => w.symbolSearchFn(...args),
      get symbols() { return w.symbols; },
      get t() { return w.t; },
      withSymbolSearch: (...args) => w.withSymbolSearch(...args),
    };
  }

  /** What WidgetAlerts reads of the widget and asks of it. */
  private alertingHost(): AlertsHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get chart() { return w.chart; },
      get dock() { return w.docking.dock; },
      drawingToolName: (...args) => w.drawingToolName(...args),
      get featureState() { return w.featureState; },
      formatAlertPrice: (...args) => w.formatAlertPrice(...args),
      say: (...args) => w.say(...args),
      get t() { return w.t; },
    };
  }

  /** What WidgetTrading reads of the widget and asks of it. */
  private tradingHost(): TradingHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get chart() { return w.chart; },
      get destroyed() { return w.destroyed; },
      get dock() { return w.docking.dock; },
      get featureState() { return w.featureState; },
      formatAlertPrice: (...args) => w.formatAlertPrice(...args),
      say: (...args) => w.say(...args),
      get state() { return w.state; },
      get t() { return w.t; },
    };
  }

  /** What WidgetMenus reads of the widget and asks of it. */
  private menusHost(): MenusHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get adapter() { return w.adapter; },
      get alerting() { return w.alerting; },
      get canExport() { return w.canExport; },
      changeSettings: (...args) => w.chartSettings.changeSettings(...args),
      changeStyle: (...args) => w.chartSettings.changeStyle(...args),
      get chart() { return w.chart; },
      get chartContainer() { return w.chartContainer; },
      get drawingSettings() { return w.drawingSettings; },
      effectiveScaleMode: (...args) => w.chartSettings.effectiveScaleMode(...args),
      get featureState() { return w.featureState; },
      formatAlertPrice: (...args) => w.formatAlertPrice(...args),
      get objectTree() { return w.objectTree; },
      openDrawingSettings: (...args) => w.drawingEdit.openDrawingSettings(...args),
      openSettings: (...args) => w.chartSettings.openSettings(...args),
      get options() { return w.options; },
      refreshDrawingsState: (...args) => w.refreshDrawingsState(...args),
      refreshObjects: (...args) => w.docking.refreshObjects(...args),
      resetView: (...args) => w.resetView(...args),
      get root() { return w.root; },
      say: (...args) => w.say(...args),
      get settingsState() { return w.chartSettings.settingsState; },
      get state() { return w.state; },
      set state(value) { w.state = value; },
      get t() { return w.t; },
      toggleGoToDate: (...args) => w.toggleGoToDate(...args),
      get trading() { return w.trading; },
      updateUI: (...args) => w.updateUI(...args),
    };
  }

  /** What WidgetLegendView reads of the widget and asks of it. */
  private legendHost(): LegendHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get chart() { return w.chart; },
      get destroyed() { return w.destroyed; },
      get featureState() { return w.featureState; },
      handleRemoveIndicator: (...args) => w.handleRemoveIndicator(...args),
      get indicatorLegend() { return w.indicatorLegend; },
      indicatorValueText: (...args) => w.indicatorValueText(...args),
      get legendHoverIndex() { return w.legendHoverIndex; },
      openIndicatorSettings: (...args) => w.openIndicatorSettings(...args),
      get options() { return w.options; },
      get root() { return w.root; },
      get settingsState() { return w.chartSettings.settingsState; },
      get t() { return w.t; },
    };
  }

  /** What WidgetCommands reads of the widget and asks of it. */
  private commandsHost(): CommandsHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get adapter() { return w.adapter; },
      cancelWaiting: (...args) => w.cancelWaiting(...args),
      changeSettings: (...args) => w.chartSettings.changeSettings(...args),
      get chart() { return w.chart; },
      get commandPalette() { return w.commandPalette; },
      get commandPalettePart() { return w.commandPalettePart; },
      get comparing() { return w.comparing; },
      copyChartImage: (...args) => w.copyChartImage(...args),
      copyShareLink: (...args) => w.layouts.copyShareLink(...args),
      get featureState() { return w.featureState; },
      handleToggleTheme: (...args) => w.handleToggleTheme(...args),
      indicatorPickerItems: (...args) => w.indicatorPickerItems(...args),
      keysShown: (...args) => w.keysShown(...args),
      get layoutSession() { return w.layouts.layoutSession; },
      get menus() { return w.menus; },
      openHotkeySheet: (...args) => w.openHotkeySheet(...args),
      openPanel: (...args) => w.docking.openPanel(...args),
      openSettings: (...args) => w.chartSettings.openSettings(...args),
      openSymbolSearch: (...args) => w.openSymbolSearch(...args),
      get options() { return w.options; },
      resetView: (...args) => w.resetView(...args),
      saveLayout: (...args) => w.layouts.saveLayout(...args),
      say: (...args) => w.say(...args),
      get settings() { return w.settings; },
      get settingsState() { return w.chartSettings.settingsState; },
      shownSettings: (...args) => w.chartSettings.shownSettings(...args),
      get state() { return w.state; },
      get t() { return w.t; },
      get timeframes() { return w.timeframes; },
      toggleDataWindow: (...args) => w.docking.toggleDataWindow(...args),
      toggleGoToDate: (...args) => w.toggleGoToDate(...args),
      toggleSymbolInfo: (...args) => w.toggleSymbolInfo(...args),
      get watching() { return w.watching; },
      whenLoaded: (...args) => w.whenLoaded(...args),
    };
  }

  /** What WidgetLayouts reads of the widget and asks of it. */
  private layoutsHost(): LayoutsHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      allowedSettings: (...args) => w.chartSettings.allowedSettings(...args),
      applyChartType: (...args) => w.applyChartType(...args),
      applySettings: (...args) => w.chartSettings.applySettings(...args),
      get chart() { return w.chart; },
      get chosenTimeframe() { return w.chosenTimeframe; },
      claimSettings: (...args) => w.chartSettings.claimSettings(...args),
      get destroyed() { return w.destroyed; },
      displayTimezone: (...args) => w.displayTimezone(...args),
      getSettings: (...args) => w.chartSettings.getSettings(...args),
      keysShown: (...args) => w.keysShown(...args),
      get options() { return w.options; },
      overViewerTypeOptions: (...args) => w.overViewerTypeOptions(...args),
      get root() { return w.root; },
      say: (...args) => w.say(...args),
      setSymbol: (...args) => w.setSymbol(...args),
      setTimeframe: (...args) => w.setTimeframe(...args),
      get settings() { return w.settings; },
      get settingsDefaults() { return w.chartSettings.settingsDefaults; },
      showLinkSettings: (...args) => w.chartSettings.showLinkSettings(...args),
      shownSettings: (...args) => w.chartSettings.shownSettings(...args),
      get state() { return w.state; },
      set state(value) { w.state = value; },
      syncIndicatorsFromChart: (...args) => w.syncIndicatorsFromChart(...args),
      get t() { return w.t; },
      get toolbar() { return w.toolbar; },
      updateUI: (...args) => w.updateUI(...args),
    };
  }

  /** What WidgetDockArea reads of the widget and asks of it. */
  private dockingHost(): DockHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      markOpen: (...args) => w.markOpen(...args),
      get alerting() { return w.alerting; },
      get chart() { return w.chart; },
      get chartContainer() { return w.chartContainer; },
      get comparing() { return w.comparing; },
      get dataWindow() { return w.dataWindow; },
      get featureState() { return w.featureState; },
      formatAlertPrice: (...args) => w.formatAlertPrice(...args),
      indicatorValueText: (...args) => w.indicatorValueText(...args),
      get lastHoverBar() { return w.lastHoverBar; },
      get lastHoverIndex() { return w.lastHoverIndex; },
      get lastHoverPrevClose() { return w.lastHoverPrevClose; },
      get objectTree() { return w.objectTree; },
      refreshDrawingsState: (...args) => w.refreshDrawingsState(...args),
      get root() { return w.root; },
      get settingsState() { return w.chartSettings.settingsState; },
      get symbolInfoPanel() { return w.symbolInfoPanel; },
      get t() { return w.t; },
      get toolbar() { return w.toolbar; },
      get trading() { return w.trading; },
      get watching() { return w.watching; },
    };
  }

  /** What WidgetChartSettings reads of the widget and asks of it. */
  private chartSettingsHost(): ChartSettingsHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get chart() { return w.chart; },
      get comparing() { return w.comparing; },
      get destroyed() { return w.destroyed; },
      get featureState() { return w.featureState; },
      get layouts() { return w.layouts; },
      get legend() { return w.legend; },
      get overlayHost() { return w.overlayHost; },
      placeDrawingButton: (...args) => w.placeDrawingButton(...args),
      say: (...args) => w.say(...args),
      get settings() { return w.settings; },
      get settingsPart() { return w.settingsPart; },
      get state() { return w.state; },
      get statusBar() { return w.statusBar; },
      get t() { return w.t; },
      get watching() { return w.watching; },
      whenLoaded: (...args) => w.whenLoaded(...args),
    };
  }

  /** What WidgetDrawingEdit reads of the widget and asks of it. */
  private drawingEditHost(): DrawingEditHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get chart() { return w.chart; },
      get chartContainer() { return w.chartContainer; },
      chartOffset: (...args) => w.chartOffset(...args),
      get destroyed() { return w.destroyed; },
      get docking() { return w.docking; },
      get drawingSettingsPart() { return w.drawingSettingsPart; },
      drawingToolName: (...args) => w.drawingToolName(...args),
      get featureState() { return w.featureState; },
      get root() { return w.root; },
      say: (...args) => w.say(...args),
      get t() { return w.t; },
      get ui() { return w.ui; },
      whenLoaded: (...args) => w.whenLoaded(...args),
    };
  }

  /** What WidgetIntervals reads of the widget and asks of it. */
  private intervalsHost(): IntervalsHost {
    // Getters, so the host reads the widget as it is when asked, not as it was now.
    const w = this;
    return {
      get adapter() { return w.adapter; },
      get baseSeries() { return w.baseSeries; },
      get baseTimeframeMs() { return w.baseTimeframeMs; },
      get chart() { return w.chart; },
      get chosenTimeframe() { return w.chosenTimeframe; },
      set chosenTimeframe(value) { w.chosenTimeframe = value; },
      get customTimeframes() { return w.customTimeframes; },
      get destroyed() { return w.destroyed; },
      displayTimezone: (...args) => w.displayTimezone(...args),
      get featureState() { return w.featureState; },
      handleTimeframe: (...args) => w.handleTimeframe(...args),
      get options() { return w.options; },
      say: (...args) => w.say(...args),
      get state() { return w.state; },
      switchTimeframe: (...args) => w.switchTimeframe(...args),
      get timeframeFavorites() { return w.timeframeFavorites; },
      get timeframes() { return w.timeframes; },
      set timeframes(value) { w.timeframes = value; },
      get toolbar() { return w.toolbar; },
      updateUI: (...args) => w.updateUI(...args),
    };
  }
}

export { indicatorChipLabel };

type ActiveIndicator = ReturnType<Chart['getActiveIndicators']>[number];

export type { CompareWay };

/**
 * The lines `instanceId` can be computed from: every drawn line of the other
 * indicators, except those that already read from it (that would be a loop),
 * each named as the legend names its indicator, so two VWAPs read apart.
 */
export function lineSourcesFor(instanceId: string, active: readonly ActiveIndicator[], t: Translator): { value: string; label: string }[] {
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
    const name = widgetIndicatorLabel(ind, t);
    for (const plot of ind.descriptor.plots ?? []) {
      out.push({ value: indicatorSource(ind.instanceId, plot.key), label: `${name}: ${plot.title}` });
    }
  }
  return out;
}

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

function isRtlLocale(locale: string | undefined): boolean {
  return !!locale && /^(ar|he|iw|fa|ur|ps|yi|dv|ckb|sd|ug)(-|$)/i.test(locale);
}

