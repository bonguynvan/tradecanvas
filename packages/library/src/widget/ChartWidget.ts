import type { ChartType, DrawingToolType, FeaturesConfig, Theme, TimeFrame } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import type { ActiveIndicatorInfo, ChartWidgetOptions, WidgetState, ChartSettingsState } from './types.js';
import { CHART_TYPES, INDICATORS, POPULAR_INDICATORS, DRAWING_TOOL_GROUPS, DEFAULT_SYMBOLS, DEFAULT_SETTINGS } from './widgetConfig.js';
import { injectWidgetStyles, removeWidgetStyles } from './WidgetStyles.js';
import { WidgetToolbar } from './WidgetToolbar.js';
import { WidgetDrawingSidebar } from './WidgetDrawingSidebar.js';
import { WidgetSettings } from './WidgetSettings.js';
import { WidgetStatusBar } from './WidgetStatusBar.js';
import { WidgetCommandPalette } from './WidgetCommandPalette.js';
import { WidgetSymbolSearch } from './WidgetSymbolSearch.js';
import { WidgetHotkeySheet } from './WidgetHotkeySheet.js';
import { WidgetReplayBar, DEFAULT_REPLAY_SPEED } from './WidgetReplayBar.js';
import { WidgetWatchlist, type WatchlistEntry } from './WidgetWatchlist.js';
import { WidgetAlertsPanel } from './WidgetAlertsPanel.js';
import { WidgetObjectTree, drawingTypeLabel } from './WidgetObjectTree.js';
import { WidgetIndicatorSettings } from './WidgetIndicatorSettings.js';
import { WidgetDrawingStyle } from './WidgetDrawingStyle.js';
import { DrawingTemplateStore } from './DrawingTemplateStore.js';
import { DrawingFavoritesStore } from './DrawingFavoritesStore.js';
import { availableTimeframes, initialTimeframeFavorites, timeframeLabel } from './widgetTimeframes.js';
import { WidgetGoToDate, utcToWallTime, wallTimeToUtc } from './WidgetGoToDate.js';
import { WidgetTooltip } from './WidgetTooltip.js';
import { WidgetIndicatorLegend, type IndicatorLegendRow } from './WidgetIndicatorLegend.js';
import { formatIndicatorValue, legendValues } from './legendValues.js';
import { RANGE_PRESETS } from '@tradecanvas/core';
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
import { resolveMessages, createTranslator, type Translator } from './i18n.js';
import { WidgetLoadingOverlay } from './WidgetLoadingOverlay.js';

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

/** The widget pressed last: with several on a page, Alt+ shortcuts act on that one. */
let lastPressedWidget: ChartWidget | null = null;

/** 1 when bar times are milliseconds, 1000 when they are seconds. */
const barTimeUnit = (data: ReadonlyArray<{ time: number }>): number =>
  (data[data.length - 1]?.time ?? 0) > 1e12 ? 1 : 1000;

const isTyping = (): boolean => {
  const active = document.activeElement as HTMLElement | null;
  return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
};

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
  private readonly onRootPointerDown = () => { lastPressedWidget = this; };
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
  /** Timeframes on offer, shortest first. */
  private timeframes: TimeFrame[] = [];
  private watchlist: WidgetWatchlist | null = null;
  private watchlistSparkBuffer = new Map<string, number[]>();
  private sessionRefPrice: number | null = null;
  /** Per-symbol refPrice explicitly pushed by the host via `setWatchlistEntry` — takes precedence over `sessionRefPrice`. */
  private hostWatchlistRefPrice = new Map<string, number>();
  private watchlistInterval: ReturnType<typeof setInterval> | null = null;
  private replayPollInterval: ReturnType<typeof setInterval> | null = null;
  /** Bars revealed per second. */
  private replaySpeed = DEFAULT_REPLAY_SPEED;
  /** While picking the start bar: shades the bars right of the pointer. */
  private replayShade: HTMLDivElement | null = null;
  private layoutKeyPrefix: string | null = null;
  private layoutDebounceMs = 1500;
  private activeLayoutKey: string | null = null;
  private root: HTMLDivElement;
  private chartContainer: HTMLDivElement;
  private loading: WidgetLoadingOverlay;
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
    // `numberLocale` lives in two places: the headless Chart gets it via
    // `chartOptions` (spread straight into `new Chart()` below) — but the
    // widget's own chrome (watchlist, alerts, hotkey sheet, settings panel)
    // reads `settingsState.numberLocale`, which otherwise stays on
    // DEFAULT_SETTINGS' 'en-US' until the host touches the Settings UI.
    // Seed it from the same option so both layers start in sync.
    this.settingsState = {
      ...DEFAULT_SETTINGS,
      ...(options.chartOptions?.numberLocale ? { numberLocale: options.chartOptions.numberLocale } : {}),
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

    this.timeframes = availableTimeframes(options.timeframes, features.timeframes);
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

    // 3. Create toolbar
    if (options.toolbar !== false) {
      this.toolbar = new WidgetToolbar(
        this.root,
        {
          symbols: this.symbols,
          timeframes: this.timeframes.map((value) => ({ value, label: timeframeLabel(value) })),
          timeframeFavorites: this.pinnedTimeframes(),
          chartTypes: options.chartTypes
            ? CHART_TYPES.filter(ct => (options.chartTypes as ChartType[]).includes(ct.value))
            : CHART_TYPES,
          indicators: INDICATORS,
          popularIndicatorIds: POPULAR_INDICATORS,
        },
        {
          onSymbolClick: () => this.handleSymbolClick(),
          onTimeframe: (tf) => this.handleTimeframe(tf),
          onToggleTimeframeFavorite: (tf) => this.handleToggleTimeframeFavorite(tf),
          onChartType: (type) => this.handleChartType(type),
          onAddIndicator: (id) => this.handleAddIndicator(id),
          onScreenshot: () => this.chart.screenshot(),
          onSettings: () => this.openSettings(),
          onToggleTheme: () => this.handleToggleTheme(),
          onToggleReplay: () => this.toggleReplay(),
          onToggleAlerts: options.alerts !== false ? () => this.toggleAlerts() : undefined,
          onToggleObjects: options.objectTree !== false ? () => this.toggleObjects() : undefined,
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
        { drawingToolGroups: DRAWING_TOOL_GROUPS, favorites: this.favoritesStore.list() as DrawingToolType[] },
        {
          onDrawingTool: (tool) => this.handleDrawingTool(tool),
          onCancelDrawing: () => this.handleCancelDrawing(),
          onToggleMagnet: features.drawingMagnet !== false ? () => this.handleToggleMagnet() : undefined,
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
      );
    }

    this.chartContainer = document.createElement('div');
    this.chartContainer.className = 'tcw-chart-container';
    body.appendChild(this.chartContainer);

    // Loading state: covers the empty chart until the first
    // bars land, then veils the previous chart during slow switches.
    this.loading = new WidgetLoadingOverlay(this.chartContainer, this.t('status.loading'));

    // Watchlist sidebar (right side). Appended AFTER the chart container so
    // it sits to the right of the canvas in the flexbox row.
    if (options.watchlist) {
      this.watchlist = new WidgetWatchlist(body, this.symbols, {
        onSelect: (sym) => { void this.setSymbol(sym); },
      }, this.t('watchlist.title'));
      this.watchlist.setActive(this.state.symbol);
      this.watchlist.setLocale(this.settingsState.numberLocale || undefined);
    }

    this.root.appendChild(body);

    // 5. Create chart
    this.chart = new Chart(this.chartContainer, {
      chartType: this.state.chartType,
      theme: resolvedTheme,
      autoScale: true,
      crosshair: { mode: 'magnet' },
      ...options.chartOptions,
      // `features` is merged explicitly (host overrides win per-key) rather
      // than inherited wholesale from the `...options.chartOptions` spread
      // above — otherwise passing e.g. `chartOptions: { features: { x } }`
      // would silently drop every other default.
      features,
    });

    // New bars end the loading state, whoever supplied them (stream snapshot,
    // widget.setData, or the host calling getChart().setData directly); stream
    // errors surface in the status bar and, mid-load, on the loading veil.
    this.chart.on('dataUpdate', (e) => this.handleDataUpdate(e.payload));

    // Drag-and-drop CSV / JSON onto the chart container — instant data load.
    // Opt-out via `dragDropImport: false`. The adapter (live stream) keeps
    // running but the next bar update will append to whatever we just
    // loaded — that's the expected behavior when overlaying historical data.
    if (options.dragDropImport !== false) {
      this.dragDrop = new DragDropImporter(this.chartContainer, {
        onData: (data, result, file) => {
          this.setData(data);
          this.toast(`Loaded ${result.data.length} bars from ${file.name}` + (result.skipped > 0 ? ` (${result.skipped} skipped)` : ''));
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
        onChange: (patch) => this.applySettings(patch),
        onReset: () => this.resetSettings(),
        onClose: () => {},
      }, this.t, { barCountdown: features.barCountdown, logScale: features.logScale }, this.overlayHost);
    }

    // 8a. Symbol search
    this.symbolSearch = new WidgetSymbolSearch({
      onPick: (sym) => { void this.setSymbol(sym); },
      onClose: () => {},
    }, this.overlayHost);
    this.hotkeySheet = new WidgetHotkeySheet({ onClose: () => {} }, this.t, this.overlayHost);

    // The sidebar follows the chart's drawing tool: finished, cancelled with
    // Esc, or kept for the next drawing in stay-in-drawing mode.
    this.chart.on('drawingToolChange', (e) => {
      const tool = (e.payload as { tool: DrawingToolType | null }).tool;
      if (tool === this.state.activeTool) return;
      this.state = { ...this.state, activeTool: tool };
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
      }, {
        show: this.t('legend.show'),
        hide: this.t('legend.hide'),
        settings: this.t('legend.settings'),
        remove: this.t('legend.remove'),
        collapse: this.t('legend.collapse'),
        expand: this.t('legend.expand'),
      });
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
      for (const event of ['indicatorUpdate', 'indicatorChange', 'dataUpdate', 'resize', 'paneResize', 'themeChange'] as const) {
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
      this.chart.replaySeek(idx);
      this.replayBar.setState('paused');
    });
    // While picking the start bar, shade the bars that would be hidden.
    this.chart.on('crosshairMove', (e) => {
      if (this.replayBar?.getMode() !== 'select' || !this.replayBar.isMounted()) return;
      const point = (e.payload as { point?: { x: number } | null }).point;
      this.positionReplayShade(point?.x ?? null);
    });

    // Data Window — precise OHLCV + indicator values at the hovered bar.
    this.dataWindow = new WidgetDataWindow(this.root, { formatPrice: (p) => this.formatAlertPrice(p) });
    this.chart.on('crosshairMove', (e) => {
      const p = e.payload as { barIndex?: number };
      this.lastHoverIndex = typeof p.barIndex === 'number' ? p.barIndex : null;
      if (this.dataWindow?.isOpen()) this.dataWindow.render(this.buildDataWindowModel());
    });

    // Drawing style + templates popover (paired with the sidebar palette button)
    if (options.drawingTools !== false) {
      this.drawingStyle = new WidgetDrawingStyle(
        this.root,
        {
          onStyleChange: (style) => {
            this.chart.setDrawingStyle(style);
            this.chart.setSelectedDrawingStyle(style);
          },
          getStyle: () => this.chart.getDrawingStyle(),
        },
        new DrawingTemplateStore(),
      );
    }

    // Bracket-order placement: floating confirm/cancel bar + event wiring.
    if (options.trading !== false) {
      this.bracketBar = new WidgetBracketBar(this.root, {
        onConfirm: () => this.chart.confirmBracket(),
        onCancel: () => {
          this.chart.cancelBracket();
          this.bracketBar?.hide();
        },
      });
      this.chart.on('bracketPlace', (e) => {
        const b = e.payload;
        this.bracketBar?.hide();
        this.toast(`${b.side === 'buy' ? 'Long' : 'Short'} bracket placed · ${b.riskReward.toFixed(2)}R`);
      });

      // Depth-of-market ladder (opt-in; fed via widget.setDepth)
      if (options.depthLadder) {
        this.depthLadder = new WidgetDepthLadder(this.root, {
          onTrade: (side, price) => {
            this.chart.placeOrderIntent({ side, type: 'limit', price });
            this.toast(`${side === 'buy' ? 'Buy' : 'Sell'} limit @ ${this.formatAlertPrice(price)}`);
          },
          formatPrice: (p) => this.formatAlertPrice(p),
        });
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
        onAdd: (price, condition, message, channel, label) => {
          this.chart.addAlert(price, condition, message, channel, label);
        },
        onRemove: (id) => this.chart.removeAlert(id),
        onClear: () => this.chart.clearAlerts(),
        getChannelValue: (channel) => this.getAlertChannelValue(channel),
        formatPrice: (p) => this.formatAlertPrice(p),
      });

      // Keep the panel list and toasts in sync with the chart's AlertManager.
      this.chart.on('alertAdd', () => this.refreshAlerts());
      this.chart.on('alertRemove', () => this.refreshAlerts());
      this.chart.on('alertUpdate', () => this.refreshAlerts());
      if (options.alertNotifications) {
        this.alertNotifier = new AlertNotifier(options.alertNotifications);
      }
      this.chart.on('alertTriggered', (e) => {
        const p = e.payload;
        const text = `Price ${this.formatAlertPrice(p.price)}${p.message ? ` — ${p.message}` : ''}`;
        this.toast(`🔔 Alert: ${text}`, 'info');
        this.alertNotifier?.notify(text);
        this.refreshAlerts();
      });
    }

    // 8a-ter. Object tree (indicators + drawings manager)
    if (options.objectTree !== false) {
      this.indicatorSettings = new WidgetIndicatorSettings(this.root, {
        onApply: (instanceId, params) => {
          this.chart.updateIndicator(instanceId, params);
          this.syncIndicatorsFromChart(); // the chip shows the parameters
        },
        onClose: () => {},
      });
      this.objectTree = new WidgetObjectTree(this.root, {
        onRemoveIndicator: (iid) => this.handleRemoveIndicator(iid),
        onConfigureIndicator: (iid) => this.openIndicatorSettings(iid),
        onToggleIndicatorVisible: (iid, visible) => {
          this.chart.setIndicatorVisible(iid, visible);
          this.refreshObjects();
          this.scheduleLegend();
        },
        onRemoveDrawing: (id) => {
          this.chart.removeDrawing(id);
          this.refreshObjects();
        },
        onToggleDrawingVisible: (id, visible) => {
          this.chart.setDrawingVisible(id, visible);
          this.refreshObjects();
        },
        onToggleDrawingLocked: (id, locked) => {
          this.chart.setDrawingLocked(id, locked);
          this.refreshObjects();
        },
        onAddCompare: features.compareSymbols !== false ? () => this.handleAddCompare() : undefined,
        onRemoveCompare: (id) => this.handleRemoveCompare(id),
      });
      const refresh = () => { if (this.objectTree?.isOpen()) this.refreshObjects(); };
      this.chart.on('drawingCreate', refresh);
      this.chart.on('drawingRemove', refresh);
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
    }, this.overlayHost);

    this.boundGlobalKeydown = (e: KeyboardEvent) => {
      if (this.replayBar?.isMounted() && this.handleReplayKey(e)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        // Ctrl/Cmd+P → symbol search (matches Bloomberg / many trading UIs)
        e.preventDefault();
        this.symbolSearch?.open(this.symbols, this.state.symbol);
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyI' || e.code === 'KeyG')) {
        // By key position: on macOS Alt+G types "©".
        if (isTyping() || (lastPressedWidget !== null && lastPressedWidget !== this)) return;
        if (e.code === 'KeyI') {
          // Alt+I → invert the price scale.
          e.preventDefault();
          this.applySettings({ invertScale: !this.settingsState.invertScale });
        } else if (this.goToDate) {
          // Alt+G → go to date.
          e.preventDefault();
          this.toggleGoToDate();
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only fire when the user isn't typing into an input.
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
        e.preventDefault();
        this.hotkeySheet?.open();
      }
    };
    document.addEventListener('keydown', this.boundGlobalKeydown);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.root.addEventListener('pointerdown', this.onRootPointerDown, true);

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
    this.watchlist?.setSymbols(symbols);
  }

  async setSymbol(symbol: string): Promise<void> {
    // Flush the outgoing symbol's layout BEFORE switching state, so the
    // saved snapshot reflects what the user actually saw under that ticker.
    this.flushActiveLayout();
    this.state = { ...this.state, symbol };
    this.sessionRefPrice = null;
    this.options.onSymbolChange?.(symbol);
    this.updateUI();
    this.watchlist?.setActive(symbol);
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
    if (!this.watchlist) return;
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

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.boundGlobalKeydown) {
      document.removeEventListener('keydown', this.boundGlobalKeydown);
    }
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.root.removeEventListener('pointerdown', this.onRootPointerDown, true);
    this.tooltip.destroy();
    if (this.legendFrame) cancelAnimationFrame(this.legendFrame);
    this.indicatorLegend?.destroy();
    if (lastPressedWidget === this) lastPressedWidget = null;
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
    this.bracketBar?.destroy();
    this.alertNotifier?.destroy();
    this.depthLadder?.destroy();
    this.dataWindow?.destroy();
    if (this.watchlistInterval) clearInterval(this.watchlistInterval);
    this.watchlist?.destroy();
    this.toolbar?.destroy();
    this.sidebar?.destroy();
    this.settings?.destroy();
    this.statusBar?.destroy();
    this.goToDate?.destroy();
    this.loading.destroy();
    this.chart.destroy();
    this.root.remove();
    removeWidgetStyles();
  }

  // --- Internal handlers ---

  private handleSymbolClick(): void {
    // Opens the fuzzy search modal. The cycle-through behaviour the toolbar
    // used to do is gone — a real search scales past 3-4 symbols and matches
    // what users expect from professional trading terminals.
    this.symbolSearch?.open(this.symbols, this.state.symbol);
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
      this.toast(err instanceof Error ? err.message : 'Fullscreen is not available', 'error');
    });
  }

  /** The display timezone from the settings: minutes east of UTC, null = local. */
  private displayTzOffset(): number | null {
    const tz = this.settingsState.timezone;
    return tz === 'local' || !Number.isFinite(Number(tz)) ? null : Number(tz);
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
      utcToWallTime(data[data.length - 1].time * barTimeUnit(data), this.displayTzOffset()),
      this.root.querySelector('[data-role="goto"]'),
    );
  }

  private goToWallTime(date: string, time: string): void {
    const ms = wallTimeToUtc(date, time, this.displayTzOffset());
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
    this.toast(pinned ? 'Pinned to favorites' : 'Unpinned');
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

    if (s.chartType) this.handleChartType(s.chartType);
    this.chart.setScaleMode(s.scaleMode);

    for (const instanceId of [...this.state.activeIndicators.keys()]) this.chart.removeIndicator(instanceId);
    for (const ind of s.indicators) this.chart.addIndicator(ind.id, ind.params);
    this.chart.setDrawings(s.drawings);
    this.updateUI();
    return true;
  }

  /** Copy the chart image to the clipboard, with a toast on success/failure. */
  async copyChartImage(): Promise<void> {
    const ok = await this.chart.copyScreenshot();
    this.toast(ok ? 'Chart image copied' : 'Copy failed — image clipboard unavailable', ok ? 'info' : 'error');
  }

  /** Copy a shareable deep-link (current view encoded in the URL hash) to the clipboard. */
  async copyShareLink(): Promise<void> {
    const base = typeof location !== 'undefined' ? location.href : '';
    const url = buildShareUrl(base, this.exportState());
    try {
      await navigator.clipboard.writeText(url);
      this.toast('Share link copied');
    } catch {
      this.toast('Copy failed — clipboard unavailable', 'error');
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
    const ind = this.chart.getActiveIndicators().find((i) => i.instanceId === instanceId);
    if (!ind) return;
    this.indicatorSettings.open({
      instanceId,
      name: ind.descriptor.name,
      defaults: ind.descriptor.defaultConfig,
      params: ind.params,
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
      label: drawingTypeLabel(d.type),
      visible: d.visible,
      locked: d.locked,
    }));
    const compares = this.compares.map((c) => ({ id: c.id, label: c.symbol, color: c.color }));
    this.objectTree.setObjects(indicators, drawings, compares);
  }

  private async handleAddCompare(): Promise<void> {
    if (!this.adapter) {
      this.toast('Comparison needs a live data adapter', 'error');
      return;
    }
    const taken = new Set([this.state.symbol, ...this.compares.map((c) => c.symbol)]);
    const options = this.symbols.filter((s) => !taken.has(s));
    this.symbolSearch?.open(options.length ? options : this.symbols, this.state.symbol, (symbol) => {
      void this.addCompareSymbol(symbol);
    });
  }

  /** Overlay another symbol's normalized series. Fetches history via the adapter. */
  async addCompareSymbol(symbol: string): Promise<void> {
    if (!this.adapter || this.compares.some((c) => c.symbol === symbol)) return;
    const color = COMPARE_COLORS[this.compares.length % COMPARE_COLORS.length];
    const id = `cmp_${symbol}`;
    try {
      const bars = await this.adapter.fetchHistory(symbol, this.state.timeframe, this.options.historyLimit ?? 500);
      // Percent mode normalizes mixed-price symbols (e.g. BTC vs a $2 alt) onto
      // a shared % axis — the right default for comparison.
      if (this.compares.length === 0) this.chart.setCompareMode('percent');
      this.chart.addCompareSymbol(id, symbol, bars, color);
      this.compares = [...this.compares, { id, symbol, color }];
      this.refreshObjects();
      this.toast(`Comparing ${symbol}`);
    } catch (err: unknown) {
      this.toast(`${symbol}: ${err instanceof Error ? err.message : 'failed to load'}`, 'error');
    }
  }

  private handleRemoveCompare(id: string): void {
    this.chart.removeCompareSymbol(id);
    this.compares = this.compares.filter((c) => c.id !== id);
    this.refreshObjects();
  }

  /** Refetch every comparison overlay at the current symbol/timeframe. */
  private async refetchCompares(): Promise<void> {
    if (!this.adapter || this.compares.length === 0) return;
    // A comparison against the now-active symbol is redundant — drop it.
    const stale = this.compares.filter((c) => c.symbol === this.state.symbol);
    for (const c of stale) this.handleRemoveCompare(c.id);

    for (const c of this.compares) {
      try {
        const bars = await this.adapter.fetchHistory(c.symbol, this.state.timeframe, this.options.historyLimit ?? 500);
        this.chart.updateCompareData(c.id, bars);
      } catch { /* leave the stale overlay in place if the refetch fails */ }
    }
  }

  private refreshAlerts(): void {
    if (!this.alertsPanel) return;
    this.alertsPanel.setSources(this.buildAlertSources());
    this.alertsPanel.setAlerts(
      this.chart.getAlerts().map((a) => ({
        id: a.id,
        price: a.price,
        condition: a.condition,
        message: a.message,
        triggered: a.triggered,
        channel: a.channel,
        label: a.label,
      })),
    );
  }

  /** Price + every active indicator line, as selectable alert sources. */
  private buildAlertSources(): { channel: string; label: string }[] {
    const sources = [{ channel: 'price', label: 'Price' }];
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
    // No fixed precision config on the widget — pick digits from magnitude so
    // BTC (64,200.5) and a sub-dollar alt (0.04821) both read sensibly.
    const abs = Math.abs(price);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    const locale = this.settingsState.numberLocale || undefined;
    return price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: digits });
  }

  private handleChartType(type: ChartType): void {
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
        label: ct.label,
        category: 'chartType',
        active: this.state.chartType === ct.value,
      });
    }

    for (const group of DRAWING_TOOL_GROUPS) {
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
      { id: 'screenshot', label: 'Screenshot', category: 'action', shortcut: '' },
      { id: 'copyImage', label: 'Copy Chart Image', category: 'action' },
      { id: 'toggleTheme', label: 'Toggle Theme', category: 'action' },
      { id: 'settings', label: 'Settings', category: 'action' },
      { id: 'shareView', label: 'Share View (copy link)', category: 'action' },
      { id: 'autoFib', label: 'Auto Fibonacci (visible swing)', category: 'action' },
      { id: 'dataWindow', label: 'Toggle Data Window', category: 'action' },
      { id: 'clearDrawings', label: 'Clear All Drawings', category: 'action' },
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
        this.toast(id ? 'Auto Fibonacci added' : 'No clear swing in view');
        break;
      }
      case 'dataWindow':
        this.toggleDataWindow();
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

  private handleCancelDrawing(): void {
    this.state = { ...this.state, activeTool: null };
    this.chart.setDrawingTool(null);
    this.updateUI();
  }

  private handleToggleStayInDrawing(): void {
    const stayInDrawing = !this.state.stayInDrawing;
    this.state = { ...this.state, stayInDrawing };
    this.chart.setStayInDrawingMode(stayInDrawing);
    this.updateUI();
  }

  private handleToggleMagnet(): void {
    const magnetEnabled = !this.state.magnetEnabled;
    this.state = { ...this.state, magnetEnabled };
    this.chart.setDrawingMagnet(magnetEnabled);
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
    this.settings?.open(this.settingsState);
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
      },
    );
    this.replayBar.mount(this.chartContainer, { total: this.replayTotal(), speed: this.replaySpeed, mode: 'select' });

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
    this.chart.replayStart({ speed: this.replaySpeed, interval: 1000, startIndex: start, paused: true });
    if (play) this.chart.replayResume();
    bar.setState(play ? 'playing' : 'paused');
    this.syncReplayBar();

    if (this.replayPollInterval) clearInterval(this.replayPollInterval);
    this.replayPollInterval = setInterval(() => this.syncReplayBar(), 150);
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
    if (patch.crosshairMode !== undefined) this.chart.setCrosshairMode(patch.crosshairMode);
    if (patch.autoScale !== undefined) this.chart.setAutoScale(patch.autoScale);
    if (patch.invertScale !== undefined) this.chart.setInvertScale(patch.invertScale);
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
      this.chart.setTimezoneOffset(patch.timezone === 'local' ? null : Number(patch.timezone));
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
    this.settingsState = { ...DEFAULT_SETTINGS };
    this.applySettings(this.settingsState);
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
          ? { x: pane.x + LEGEND_INSET, y: pane.y + PANE_ROW_TOP + pane.row * PANE_ROW_STEP, width: pane.width - 2 * LEGEND_INSET }
          : null,
      };
    });
    const plot = this.chart.getPlotRect();
    this.indicatorLegend.update(rows, { left: plot.x + LEGEND_INSET, top: this.chart.getLegendBottom() + 1 });
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

/**
 * "EMA 20", "BB 20 2", "MACD 12 26 9": the short name (`shortName`, else the
 * id in capitals) plus up to three numeric parameters, in the indicator's own
 * order, so two instances of the same indicator can be told apart.
 */
export function indicatorChipLabel(
  id: string,
  params: Record<string, unknown>,
  defaults?: Record<string, unknown>,
  shortName?: string,
): string {
  const order = defaults ? Object.keys(defaults) : Object.keys(params);
  const numbers = order
    .map((k) => params[k])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .slice(0, 3)
    .map((v) => String(Number(v.toFixed(4))));
  return [shortName ?? id.toUpperCase(), ...numbers].join(' ');
}
