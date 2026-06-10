import type { ChartType, DrawingToolType, Theme, TimeFrame } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import type { ChartWidgetOptions, WidgetState, ChartSettingsState } from './types.js';
import { TIMEFRAMES, CHART_TYPES, INDICATORS, POPULAR_INDICATORS, DRAWING_TOOL_GROUPS, DEFAULT_SYMBOLS, DEFAULT_SETTINGS } from './widgetConfig.js';
import { injectWidgetStyles, removeWidgetStyles } from './WidgetStyles.js';
import { WidgetToolbar } from './WidgetToolbar.js';
import { WidgetDrawingSidebar } from './WidgetDrawingSidebar.js';
import { WidgetSettings } from './WidgetSettings.js';
import { WidgetStatusBar } from './WidgetStatusBar.js';
import { WidgetCommandPalette } from './WidgetCommandPalette.js';
import { WidgetSymbolSearch } from './WidgetSymbolSearch.js';
import { WidgetHotkeySheet } from './WidgetHotkeySheet.js';
import { WidgetReplayBar } from './WidgetReplayBar.js';
import { WidgetWatchlist, type WatchlistEntry } from './WidgetWatchlist.js';
import { WidgetAlertsPanel } from './WidgetAlertsPanel.js';
import { WidgetObjectTree, drawingTypeLabel } from './WidgetObjectTree.js';
import { WidgetIndicatorSettings } from './WidgetIndicatorSettings.js';
import { WidgetDrawingStyle } from './WidgetDrawingStyle.js';
import { DrawingTemplateStore } from './DrawingTemplateStore.js';
import { WidgetBracketBar } from './WidgetBracketBar.js';
import { DragDropImporter, resampleOHLCV, inferTimeframeMs } from '../io/index.js';
import type { DataSeries } from '@tradecanvas/commons';
import { timeframeToMs } from '@tradecanvas/commons';
import type { CommandItem } from './WidgetCommandPalette.js';

/** Distinct line colors for comparison overlays, cycled by add order. */
const COMPARE_COLORS = ['#f7931a', '#627eea', '#26a17b', '#e84142', '#8247e5', '#f3ba2f'];

export class ChartWidget {
  private chart: Chart;
  private state: WidgetState;
  private toolbar: WidgetToolbar | null = null;
  private sidebar: WidgetDrawingSidebar | null = null;
  private settings: WidgetSettings | null = null;
  private statusBar: WidgetStatusBar | null = null;
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
  private watchlist: WidgetWatchlist | null = null;
  private watchlistSparkBuffer = new Map<string, number[]>();
  private sessionRefPrice: number | null = null;
  private watchlistInterval: ReturnType<typeof setInterval> | null = null;
  private replayOriginalData: DataSeries | null = null;
  private replayPollInterval: ReturnType<typeof setInterval> | null = null;
  private replaySpeed = 5;
  private layoutKeyPrefix: string | null = null;
  private layoutDebounceMs = 1500;
  private activeLayoutKey: string | null = null;
  private root: HTMLDivElement;
  private chartContainer: HTMLDivElement;
  private destroyed = false;
  private options: ChartWidgetOptions;
  private symbols: string[];
  private settingsState: ChartSettingsState;
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
    this.settingsState = { ...DEFAULT_SETTINGS };

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

    // Initialize state
    this.state = {
      symbol: options.symbol ?? this.symbols[0] ?? 'BTCUSDT',
      timeframe: options.timeframe ?? '5m',
      chartType: options.chartOptions?.chartType ?? 'candlestick',
      isDark,
      activeIndicators: new Map(),
      activeTool: null,
      magnetEnabled: true,
      connectionState: 'connecting',
      connectionMessage: 'Connecting...',
    };


    // 1. Inject styles
    injectWidgetStyles();

    // 2. Create DOM skeleton
    this.root = document.createElement('div');
    this.root.className = 'tcw-root';
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
    container.appendChild(this.root);

    // 3. Create toolbar
    if (options.toolbar !== false) {
      this.toolbar = new WidgetToolbar(
        this.root,
        {
          symbols: this.symbols,
          timeframes: options.timeframes
            ? TIMEFRAMES.filter(tf => (options.timeframes as TimeFrame[]).includes(tf.value))
            : TIMEFRAMES,
          chartTypes: options.chartTypes
            ? CHART_TYPES.filter(ct => (options.chartTypes as ChartType[]).includes(ct.value))
            : CHART_TYPES,
          indicators: INDICATORS,
          popularIndicatorIds: POPULAR_INDICATORS,
        },
        {
          onSymbolClick: () => this.handleSymbolClick(),
          onTimeframe: (tf) => this.handleTimeframe(tf),
          onChartType: (type) => this.handleChartType(type),
          onAddIndicator: (id) => this.handleAddIndicator(id),
          onRemoveIndicator: (iid) => this.handleRemoveIndicator(iid),
          onScreenshot: () => this.chart.screenshot(),
          onSettings: () => this.openSettings(),
          onToggleTheme: () => this.handleToggleTheme(),
          onToggleReplay: () => this.toggleReplay(),
          onToggleAlerts: options.alerts !== false ? () => this.toggleAlerts() : undefined,
          onToggleObjects: options.objectTree !== false ? () => this.toggleObjects() : undefined,
          onBracket: options.trading !== false ? (side) => this.startBracket(side) : undefined,
        },
      );
    }

    // 4. Create body
    const body = document.createElement('div');
    body.className = 'tcw-body';

    if (options.drawingTools !== false) {
      this.sidebar = new WidgetDrawingSidebar(
        body,
        { drawingToolGroups: DRAWING_TOOL_GROUPS },
        {
          onDrawingTool: (tool) => this.handleDrawingTool(tool),
          onCancelDrawing: () => this.handleCancelDrawing(),
          onToggleMagnet: () => this.handleToggleMagnet(),
          onUndo: () => this.chart.undo(),
          onRedo: () => this.chart.redo(),
          onClearDrawings: () => {
            this.chart.clearDrawings();
            this.state = { ...this.state, activeTool: null };
            this.updateUI();
          },
          onToggleStyle: () => this.drawingStyle?.toggle(),
        },
      );
    }

    this.chartContainer = document.createElement('div');
    this.chartContainer.className = 'tcw-chart-container';
    body.appendChild(this.chartContainer);

    // Watchlist sidebar (right side). Appended AFTER the chart container so
    // it sits to the right of the canvas in the flexbox row.
    if (options.watchlist) {
      this.watchlist = new WidgetWatchlist(body, this.symbols, {
        onSelect: (sym) => { void this.setSymbol(sym); },
      });
      this.watchlist.setActive(this.state.symbol);
    }

    this.root.appendChild(body);

    // 5. Create chart
    this.chart = new Chart(this.chartContainer, {
      chartType: this.state.chartType,
      theme: resolvedTheme,
      autoScale: true,
      crosshair: { mode: 'magnet' },
      features: {
        drawings: true,
        drawingMagnet: true,
        drawingUndoRedo: true,
        indicators: true,
        trading: options.trading !== false,
        tradingContextMenu: options.trading !== false,
        volume: true,
        legend: true,
        crosshair: true,
        keyboard: true,
        screenshot: true,
        alerts: true,
        barCountdown: true,
        logScale: true,
        watermark: true,
      },
      ...options.chartOptions,
    });

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
      this.statusBar = new WidgetStatusBar(this.root);
    }

    // 7. Create settings (lazy, not appended until opened)
    if (options.settings !== false) {
      this.settings = new WidgetSettings({
        onChange: (patch) => this.applySettings(patch),
        onReset: () => this.resetSettings(),
        onClose: () => {},
      });
    }

    // 8a. Symbol search
    this.symbolSearch = new WidgetSymbolSearch({
      onPick: (sym) => { void this.setSymbol(sym); },
      onClose: () => {},
    });
    this.hotkeySheet = new WidgetHotkeySheet({ onClose: () => {} });

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
      // Esc-cancel originates in the chart; reflect it in the bar.
      this.chart.on('dataUpdate', (e) => {
        const p = e.payload as { bracket?: string };
        if (p && p.bracket === 'cancelled') this.bracketBar?.hide();
      });
    }

    // 8a-bis. Price alerts panel (floating popover, toggled from the bell button)
    if (options.alerts !== false) {
      this.alertsPanel = new WidgetAlertsPanel(this.root, {
        onAdd: (price, condition, message) => {
          this.chart.addAlert(price, condition, message);
        },
        onRemove: (id) => this.chart.removeAlert(id),
        onClear: () => this.chart.clearAlerts(),
        getCurrentPrice: () => {
          const data = this.chart.getData();
          return data.length > 0 ? data[data.length - 1].close : null;
        },
        formatPrice: (p) => this.formatAlertPrice(p),
      });

      // Keep the panel list and toasts in sync with the chart's AlertManager.
      this.chart.on('alertAdd', () => this.refreshAlerts());
      this.chart.on('alertRemove', () => this.refreshAlerts());
      this.chart.on('alertUpdate', () => this.refreshAlerts());
      this.chart.on('alertTriggered', (e) => {
        const p = e.payload;
        this.toast(`🔔 Alert: price ${this.formatAlertPrice(p.price)}${p.message ? ` — ${p.message}` : ''}`, 'info');
        this.refreshAlerts();
      });
    }

    // 8a-ter. Object tree (indicators + drawings manager)
    if (options.objectTree !== false) {
      this.indicatorSettings = new WidgetIndicatorSettings(this.root, {
        onApply: (instanceId, params) => this.chart.updateIndicator(instanceId, params),
        onClose: () => {},
      });
      this.objectTree = new WidgetObjectTree(this.root, {
        onRemoveIndicator: (iid) => this.handleRemoveIndicator(iid),
        onConfigureIndicator: (iid) => this.openIndicatorSettings(iid),
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
        onAddCompare: () => this.handleAddCompare(),
        onRemoveCompare: (id) => this.handleRemoveCompare(id),
      });
      const refresh = () => { if (this.objectTree?.isOpen()) this.refreshObjects(); };
      this.chart.on('drawingCreate', refresh);
      this.chart.on('drawingRemove', refresh);
      this.chart.on('indicatorAdd', refresh);
      this.chart.on('indicatorRemove', refresh);
    }

    // 8b. Command palette
    this.commandPalette = new WidgetCommandPalette({
      onIndicator: (id) => this.handleAddIndicator(id),
      onChartType: (type) => this.handleChartType(type),
      onDrawingTool: (tool) => this.handleDrawingTool(tool),
      onTimeframe: (tf) => this.handleTimeframe(tf),
      onAction: (id) => this.handleAction(id),
      onClose: () => {},
    });

    this.boundGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        // Ctrl/Cmd+P → symbol search (matches Bloomberg / many trading UIs)
        e.preventDefault();
        this.symbolSearch?.open(this.symbols, this.state.symbol);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only fire when the user isn't typing into an input.
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
        e.preventDefault();
        this.hotkeySheet?.open();
      }
    };
    document.addEventListener('keydown', this.boundGlobalKeydown);

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
   */
  setWatchlistEntry(symbol: string, entry: Partial<WatchlistEntry>): void {
    this.watchlist?.setEntry(symbol, entry);
  }

  private tickWatchlist(): void {
    if (!this.watchlist) return;
    const data = this.chart.getData();
    if (data.length === 0) return;
    const last = data[data.length - 1];
    // Reference price: first bar of the loaded slice — that's the closest
    // approximation of "session open" without timezone bookkeeping. Apps
    // that need true session-open can override via `setWatchlistEntry`.
    if (this.sessionRefPrice === null) {
      this.sessionRefPrice = data[0].open;
    }

    const buf = this.watchlistSparkBuffer.get(this.state.symbol) ?? [];
    buf.push(last.close);
    if (buf.length > 40) buf.shift();
    this.watchlistSparkBuffer.set(this.state.symbol, buf);

    this.watchlist.setEntry(this.state.symbol, {
      lastPrice: last.close,
      refPrice: this.sessionRefPrice,
      sparkline: buf.slice(),
    });
  }

  async setTimeframe(tf: TimeFrame): Promise<void> {
    this.state = { ...this.state, timeframe: tf };
    this.options.onTimeframeChange?.(tf);
    this.updateUI();
    if (this.adapter) {
      await this.connectStream();
      return;
    }
    if (this.options.resampleTimeframes !== false) {
      this.applyTimeframeData();
    }
  }

  setTheme(theme: import('@tradecanvas/commons').ThemeName | Theme): void {
    const isDark = this.resolveIsDark(theme);
    const resolved = this.resolveTheme(theme);
    this.state = { ...this.state, isDark };
    this.root.dataset.tcwTheme = isDark ? 'dark' : 'light';
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
    this.flushActiveLayout();
    this.commandPalette?.destroy();
    this.symbolSearch?.destroy();
    this.hotkeySheet?.destroy();
    if (this.replayPollInterval) clearInterval(this.replayPollInterval);
    this.replayBar?.destroy();
    this.dragDrop?.detach();
    this.alertsPanel?.destroy();
    this.objectTree?.destroy();
    this.indicatorSettings?.destroy();
    this.drawingStyle?.destroy();
    this.bracketBar?.destroy();
    if (this.watchlistInterval) clearInterval(this.watchlistInterval);
    this.watchlist?.destroy();
    this.toolbar?.destroy();
    this.sidebar?.destroy();
    this.settings?.destroy();
    this.statusBar?.destroy();
    this.chart.destroy();
    this.root.remove();
    removeWidgetStyles();
  }

  // --- Internal handlers ---

  private handleSymbolClick(): void {
    // Opens the fuzzy search modal. The cycle-through behaviour the toolbar
    // used to do is gone — a real search scales past 3-4 symbols and matches
    // user expectations from TradingView, Bloomberg, etc.
    this.symbolSearch?.open(this.symbols, this.state.symbol);
  }

  private handleTimeframe(tf: TimeFrame): void {
    this.state = { ...this.state, timeframe: tf };
    this.options.onTimeframeChange?.(tf);
    this.updateUI();
    if (this.adapter) {
      // Live adapter owns the data — refetch at the native resolution.
      this.connectStream();
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
    this.applyTimeframeData();
  }

  /**
   * Load the widget's base series. Prefer this over `getChart().setData()` so
   * client-side timeframe resampling has a finest-resolution source to
   * aggregate from. The data is rendered at the current timeframe (resampled
   * when that timeframe is coarser than the data's native spacing).
   */
  setData(data: DataSeries): void {
    this.baseSeries = data;
    this.baseTimeframeMs = inferTimeframeMs(data);
    this.applyTimeframeData();
  }

  /** Render the base series at the active timeframe, resampling when coarser. */
  private applyTimeframeData(): void {
    if (!this.baseSeries) return;
    const targetMs = timeframeToMs(this.state.timeframe);
    if (this.baseTimeframeMs > 0 && targetMs > this.baseTimeframeMs) {
      const weekStartsOn = this.options.weekStartsOn ?? 1;
      this.chart.setData(resampleOHLCV(this.baseSeries, this.state.timeframe, { weekStartsOn }));
    } else {
      this.chart.setData(this.baseSeries);
    }
  }

  private toggleAlerts(): void {
    if (!this.alertsPanel) return;
    this.alertsPanel.toggle();
    if (this.alertsPanel.isOpen()) this.refreshAlerts();
  }

  /** Begin a draggable bracket order at the latest price and show the action bar. */
  startBracket(side: 'buy' | 'sell'): void {
    if (this.chart.startBracket(side)) {
      this.bracketBar?.show(side);
    }
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
    this.alertsPanel.setAlerts(
      this.chart.getAlerts().map((a) => ({
        id: a.id,
        price: a.price,
        condition: a.condition,
        message: a.message,
        triggered: a.triggered,
      })),
    );
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

  private handleAddIndicator(indId: string): void {
    if (this.state.activeIndicators.has(indId)) {
      // Toggle off
      const instanceId = this.state.activeIndicators.get(indId)!;
      this.chart.removeIndicator(instanceId);
      const next = new Map(this.state.activeIndicators);
      next.delete(indId);
      this.state = { ...this.state, activeIndicators: next };
    } else {
      const instanceId = this.chart.addIndicator(indId);
      if (instanceId) {
        const next = new Map(this.state.activeIndicators);
        next.set(indId, instanceId);
        this.state = { ...this.state, activeIndicators: next };
      }
    }
    this.updateUI();
  }

  private handleRemoveIndicator(instanceId: string): void {
    this.chart.removeIndicator(instanceId);
    const next = new Map(this.state.activeIndicators);
    for (const [id, iid] of next.entries()) {
      if (iid === instanceId) {
        next.delete(id);
        break;
      }
    }
    this.state = { ...this.state, activeIndicators: next };
    this.updateUI();
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
        active: this.state.activeIndicators.has(ind.id),
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

    for (const tf of TIMEFRAMES) {
      items.push({
        id: tf.value,
        label: tf.label,
        category: 'timeframe',
        active: this.state.timeframe === tf.value,
      });
    }

    items.push(
      { id: 'screenshot', label: 'Screenshot', category: 'action', shortcut: '' },
      { id: 'toggleTheme', label: 'Toggle Theme', category: 'action' },
      { id: 'settings', label: 'Settings', category: 'action' },
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
      if (ok) this.rebuildActiveIndicatorsMapFromChart();
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

  /**
   * After loading a layout, the chart restores indicator instances but our
   * `state.activeIndicators` map (used to render the chip strip) is stale.
   * Rebuild it from the live `getActiveIndicators` list.
   */
  private rebuildActiveIndicatorsMapFromChart(): void {
    const next = new Map<string, string>();
    for (const a of this.chart.getActiveIndicators()) {
      next.set(a.id, a.instanceId);
    }
    this.state = { ...this.state, activeIndicators: next };
    this.updateUI();
  }

  // --- Replay ---

  private toggleReplay(): void {
    if (this.replayBar?.isMounted()) {
      this.exitReplay();
    } else {
      this.enterReplay();
    }
  }

  private enterReplay(): void {
    const data = this.chart.getData();
    if (data.length < 2) return;

    // Snapshot full series so we can restore it on exit. The chart's
    // dataManager gets mutated to slices during replay.
    this.replayOriginalData = data.slice();

    // Mount the scrubber bar inside the chart container so it floats above the
    // canvas. It owns its own absolute positioning via the .tcw-replay-bar CSS.
    this.replayBar = new WidgetReplayBar({
      onPlay: () => {
        if (this.chart.getReplayState() === 'paused') {
          this.chart.replayResume();
        } else {
          this.chart.replay({ speed: this.replaySpeed, interval: 200 });
        }
        this.replayBar?.setState('playing');
      },
      onPause: () => {
        this.chart.replayPause();
        this.replayBar?.setState('paused');
      },
      onStop: () => {
        this.chart.replayStop();
        this.replayBar?.setState('paused');
      },
      onStepBack: () => {
        const p = this.chart.getReplayProgress();
        if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
        this.chart.replaySeek(Math.max(0, p.current - 1));
        this.replayBar?.setState('paused');
      },
      onStepForward: () => {
        const p = this.chart.getReplayProgress();
        if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
        this.chart.replaySeek(Math.min(p.total - 1, p.current + 1));
        this.replayBar?.setState('paused');
      },
      onSeek: (idx) => {
        if (this.chart.getReplayState() === 'playing') this.chart.replayPause();
        this.chart.replaySeek(idx);
        this.replayBar?.setState('paused');
      },
      onSpeedChange: (s) => {
        this.replaySpeed = s;
        this.chart.setReplaySpeed(s);
      },
      onClose: () => this.exitReplay(),
    });
    this.replayBar.mount(this.chartContainer, { total: data.length, speed: this.replaySpeed });

    // Boot replay paused at bar 1 so the user sees a starting state. Then
    // start polling progress for the scrubber — cheap, runs at 200ms.
    this.chart.replay({ speed: this.replaySpeed, interval: 200, startIndex: 1 });
    this.chart.replayPause();
    this.replayBar.setState('paused');

    this.replayPollInterval = setInterval(() => {
      if (!this.replayBar?.isMounted()) return;
      const p = this.chart.getReplayProgress();
      this.replayBar.setProgress(p.current, p.total);
      const state = this.chart.getReplayState();
      if (state === 'stopped') {
        this.replayBar.setState('paused');
      } else {
        this.replayBar.setState(state);
      }
    }, 150);
  }

  private exitReplay(): void {
    if (this.replayPollInterval) {
      clearInterval(this.replayPollInterval);
      this.replayPollInterval = null;
    }
    this.chart.replayStop();
    this.replayBar?.unmount();
    this.replayBar = null;
    if (this.replayOriginalData) {
      this.chart.setData(this.replayOriginalData);
      this.replayOriginalData = null;
    }
  }

  private applySettings(patch: Partial<ChartSettingsState>): void {
    this.settingsState = { ...this.settingsState, ...patch };

    if (patch.gridVisible !== undefined) this.chart.setGridVisible(patch.gridVisible);
    if (patch.volumeVisible !== undefined) this.chart.setVolumeVisible(patch.volumeVisible);
    if (patch.volumeProfileVisible !== undefined) this.chart.setVolumeProfileVisible(patch.volumeProfileVisible);
    if (patch.marketProfileVisible !== undefined) this.chart.setMarketProfileVisible(patch.marketProfileVisible);
    if (patch.marketProfileSplit !== undefined) this.chart.setMarketProfileConfig({ splitBySession: patch.marketProfileSplit });
    if (patch.crosshairMode !== undefined) this.chart.setCrosshairMode(patch.crosshairMode);
    if (patch.autoScale !== undefined) this.chart.setAutoScale(patch.autoScale);
    if (patch.scaleMode !== undefined) {
      this.chart.setScaleMode(patch.scaleMode);
      // Keep the legacy logScale flag mirrored so persisted layouts stay valid.
      this.settingsState = { ...this.settingsState, logScale: patch.scaleMode === 'logarithmic' };
    } else if (patch.logScale !== undefined) {
      this.chart.setLogScale(patch.logScale);
      this.settingsState = { ...this.settingsState, scaleMode: patch.logScale ? 'logarithmic' : 'regular' };
    }
    if (patch.numberLocale !== undefined) this.chart.setNumberLocale(patch.numberLocale);

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

    this.state = {
      ...this.state,
      connectionState: 'connecting',
      connectionMessage: 'Connecting...',
    };
    this.updateUI();

    try {
      this.chart.disconnectStream();
      await this.chart.connect({
        adapter: this.adapter,
        symbol: this.state.symbol,
        timeframe: this.state.timeframe,
        historyLimit: this.options.historyLimit ?? 500,
      });

      this.chart.setWatermark(this.state.symbol.replace('USDT', ' / USDT'), {
        fontSize: 48,
        color: this.state.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
      });

      // Re-apply per-symbol layout (indicators, drawings, chart type) after
      // the new history is in. Doing this *after* connect ensures indicators
      // recalculate against the loaded data, not the previous symbol's data.
      this.applySymbolLayout(this.state.symbol);

      this.state = {
        ...this.state,
        connectionState: 'connected',
        connectionMessage: 'Live',
      };

      // Re-pull comparison overlays at the (possibly new) timeframe so they
      // stay aligned with the main series. Drop the active symbol if it ended
      // up in the compare set after a symbol switch.
      void this.refetchCompares();
    } catch (err: unknown) {
      this.state = {
        ...this.state,
        connectionState: 'error',
        connectionMessage: err instanceof Error ? err.message : 'Connection failed',
      };
    }

    this.updateUI();
  }

  private updateUI(): void {
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
