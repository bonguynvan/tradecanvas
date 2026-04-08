import type {
  ChartOptions,
  ChartType,
  OHLCBar,
  DataSeries,
  Theme,
  ThemeName,
  ChartEventType,
  ChartEvent,
  TauriBridgeOptions,
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorOutput,
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
  DataAdapter,
  ConnectionState,
  ConnectionInfo,
  TimeFrame,
  FeaturesConfig,
} from '@chart-lib/commons';
import { LayerType, setLocale as setGlobalLocale, createVNTheme, computePriceLimits } from '@chart-lib/commons';
import {
  RenderEngine,
  Viewport,
  CandlestickRenderer,
  LineRenderer,
  AreaRenderer,
  BarRenderer,
  GridRenderer,
  PriceAxis,
  TimeAxis,
  InteractionManager,
  PanHandler,
  ZoomHandler,
  CrosshairHandler,
  IndicatorEngine,
  registerBuiltInIndicators,
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
  AlertManager,
  ReplayManager,
  ChartStateManager,
  UndoRedoManager,
  Animator,
  Easing,
  KeyboardHandler,
  CrosshairTooltip,
  HollowCandleRenderer,
  BaselineRenderer,
  RenkoRenderer,
  KagiRenderer,
  PointAndFigureRenderer,
  toHeikinAshi,
  toRenko,
  toLineBreak,
  toKagi,
  toPointAndFigure,
  DataExporter,
  SessionBreaks,
  CompareRenderer,
  CurrentPriceLine,
} from '@chart-lib/core';
import type { ChartRendererInterface } from '@chart-lib/core';
import { DataManager } from './DataManager.js';
import { ThemeManager } from './ThemeManager.js';
import { LayoutManager } from './layout/LayoutManager.js';
import { PluginManager } from './plugins/PluginManager.js';

export class Chart {
  static version = '0.3.0';

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
  private autoScrollOnNewBar = true;
  private displayDataCache: DataSeries | null = null;
  private resolvedLayoutCache: import('@chart-lib/commons').ResolvedLayout | null = null;
  private panelInfoCache: import('@chart-lib/core').PanelRenderInfo[] | null = null;
  private renderScheduled = false;
  private containerSizeCache: { width: number; height: number } | null = null;
  private containerSizeCacheTime = 0;
  private chartLegend: ChartLegend;
  private watermark: Watermark;
  private barCountdown: BarCountdown;
  private sessionBreaks: SessionBreaks;
  private compareRenderer: CompareRenderer;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private volumeRenderer: VolumeRenderer;
  private alertManager: AlertManager;
  private replayManager: ReplayManager;
  private undoRedoManager: UndoRedoManager;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSaveDelay = 0; // 0 = disabled
  private autoSaveKey: string | null = null;
  private animator: Animator;
  private keyboardHandler: KeyboardHandler;
  private crosshairTooltip: CrosshairTooltip;
  private interactionManager: InteractionManager;
  private crosshairHandler: CrosshairHandler;
  private chartRenderer: ChartRendererInterface;
  private gridRenderer: GridRenderer;
  private priceAxis: PriceAxis;
  private timeAxis: TimeAxis;
  private options: ChartOptions;
  private features: Required<FeaturesConfig>;
  private marketConfig: MarketConfig | null = null;
  private container: HTMLElement;
  private currentPriceLine: import('@chart-lib/core').CurrentPriceLine;

  constructor(container: HTMLElement, options: ChartOptions) {
    this.container = container;
    this.options = options;

    // Resolve feature flags (all default to true)
    const f = options.features ?? {};
    this.features = {
      drawings: f.drawings ?? true,
      drawingTools: f.drawingTools ?? [],
      drawingMagnet: f.drawingMagnet ?? true,
      drawingUndoRedo: f.drawingUndoRedo ?? true,
      trading: f.trading ?? true,
      tradingContextMenu: f.tradingContextMenu ?? true,
      indicators: f.indicators ?? true,
      indicatorIds: f.indicatorIds ?? [],
      panning: f.panning ?? true,
      zooming: f.zooming ?? true,
      crosshair: f.crosshair ?? true,
      keyboard: f.keyboard ?? true,
      priceAxis: f.priceAxis ?? true,
      timeAxis: f.timeAxis ?? true,
      grid: f.grid ?? (options.grid?.visible ?? true),
      legend: f.legend ?? true,
      volume: f.volume ?? true,
      watermark: f.watermark ?? true,
      saveLoad: f.saveLoad ?? true,
      screenshot: f.screenshot ?? true,
      alerts: f.alerts ?? true,
      replay: f.replay ?? true,
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
    this.pluginManager = new PluginManager(this.indicatorEngine);
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
    // Undo/redo
    this.undoRedoManager = new UndoRedoManager();
    this.drawingManager.setUndoRedoManager(this.undoRedoManager);
    this.drawingManager.setDataGetter(() => this.dataManager.getData());
    this.drawingManager.setDisplayDataGetter(() => this.getDisplayData());
    // Magnet mode
    if (options.crosshair?.mode === 'magnet') {
      this.drawingManager.setMagnetMode('magnet');
    }

    // Trading
    this.tradingManager = new TradingManager();
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
    this.layoutManager.resize(size.width, size.height);

    // Chart renderer
    this.chartRenderer = this.createChartRenderer(options.chartType);
    this.gridRenderer = new GridRenderer();
    if (options.grid?.visible === false) this.gridRenderer.setVisible(false);
    this.priceAxis = new PriceAxis();
    this.timeAxis = new TimeAxis();

    // Crosshair
    this.crosshairHandler = new CrosshairHandler();
    if (options.crosshair?.mode) {
      this.crosshairHandler.setMode(options.crosshair.mode);
    }
    // Crosshair callback — fired via microtask AFTER render, only when bar changes.
    // No DOM writes, no layout reads, no extra render requests.
    this.crosshairHandler.setCallback((barIndex, point) => {
      if (barIndex !== null && point) {
        const data = this.dataManager.getData();
        const bar = barIndex < data.length ? data[barIndex] : undefined;

        // Update legend (canvas-rendered, will show on next UI paint)
        this.chartLegend.setHoverBar(bar ?? null);

        // Update tooltip (DOM, lightweight update only when bar changes)
        if (bar) {
          this.crosshairTooltip.show(point, bar, this.themeManager.getTheme(), this.cachedContainerSize());
        }

        // Emit for external consumers
        this.eventBus.emit('crosshairMove', { point, bar, barIndex });
      } else {
        this.crosshairTooltip.hide();
        this.chartLegend.setHoverBar(null);
      }
    });

    // Chart legend (OHLCV overlay)
    this.chartLegend = new ChartLegend();
    this.chartLegend.setChartType(options.chartType);

    // Watermark + Volume
    this.watermark = new Watermark();
    if (options.watermark) this.watermark.setConfig(options.watermark);
    this.volumeRenderer = new VolumeRenderer();

    // Bar countdown timer
    this.barCountdown = new BarCountdown();
    this.sessionBreaks = new SessionBreaks();
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
    if (options.logScale) {
      this.viewport.setLogScale(true);
    }

    // Animation
    this.animator = new Animator();

    // Crosshair tooltip (DOM)
    this.crosshairTooltip = new CrosshairTooltip();
    this.crosshairTooltip.create(container);

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

    // Current price line (standalone, works without StreamManager)
    this.currentPriceLine = new CurrentPriceLine();

    // Alerts
    this.alertManager = new AlertManager();
    this.alertManager.setRequestRender(() => this.engine.requestRender(LayerType.Overlay));
    this.alertManager.on('triggered', (alert) => {
      this.eventBus.emit('dataUpdate', { alert: 'triggered', alertId: alert.id, price: alert.price, message: alert.message });
    });

    // Replay
    this.replayManager = new ReplayManager();

    // Interaction
    this.interactionManager = new InteractionManager(container);
    if (this.features.panning) {
      this.interactionManager.setPanHandler(
        new PanHandler((deltaX) => {
          this.viewport.scrollBy(deltaX);
          this.updateViewportAndRender();
        }),
      );
    }
    if (this.features.zooming) {
      this.interactionManager.setZoomHandler(
        new ZoomHandler((delta, centerX) => {
          this.viewport.zoom(delta, centerX);
          this.updateViewportAndRender();
        }),
      );
    }
    if (this.features.crosshair) {
      this.interactionManager.setCrosshairHandler(this.crosshairHandler);
    }
    if (this.features.drawings) {
      this.interactionManager.setDrawingManager(
        this.drawingManager,
        () => this.viewport.getState(),
      );
    }
    if (this.features.trading) {
      this.interactionManager.setTradingManager(
        this.tradingManager,
        () => this.viewport.getState(),
      );
    }
    this.interactionManager.setOverlayDirtyCallback(() => {
      this.engine.requestRender(LayerType.Overlay);
      // Also refresh UI layer for panel crosshair value labels
      if (this.layoutManager.getPanels().length > 0) {
        this.engine.requestRender(LayerType.UI);
      }
    });
    this.interactionManager.attach();

    // Set render context
    this.syncRenderContext();
    this.engine.start();
  }

  // --- Data ---

  setData(data: DataSeries): void {
    this.dataManager.setData(data);
    this.crosshairHandler.setData(this.dataManager.getData());
    this.displayDataCache = null;
    this.sessionBreaks.invalidateCache();
    this.indicatorEngine.recalculateAll(this.dataManager.getData());
    // Auto-set current price line from last bar's close
    if (data.length > 0) {
      this.currentPriceLine.setPrice(data[data.length - 1].close);
    }
    this.updateViewportAndRender(true);
    this.eventBus.emit('dataUpdate', { length: data.length });
  }

  appendBar(bar: OHLCBar): void {
    this.dataManager.appendBar(bar);
    this.crosshairHandler.setData(this.dataManager.getData());
    this.displayDataCache = null;
    if (this.autoScrollOnNewBar) this.viewport.scrollToEnd();
    this.indicatorEngine.recalculateAll(this.dataManager.getData());
    this.updateViewportAndRender();
  }

  updateLastBar(bar: OHLCBar): void {
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
    this.scheduleRender();
  }

  /** Merge a price tick into the current last bar (convenience for live feeds) */
  updateLastBarFromTick(tick: { price: number; volume?: number; time: number }): void {
    this.dataManager.updateLastBarFromTick(tick);
    this.currentPriceLine.setPrice(tick.price);
    if (this.options.chartType !== 'candlestick' && this.options.chartType !== 'line'
        && this.options.chartType !== 'area' && this.options.chartType !== 'bar'
        && this.options.chartType !== 'hollowCandle') {
      this.displayDataCache = null;
    }
    this.scheduleRender();
  }

  // --- Chart type ---

  setChartType(type: ChartType): void {
    this.options.chartType = type;
    this.chartRenderer = this.createChartRenderer(type);
    this.chartLegend.setChartType(type);
    this.displayDataCache = null;
    this.updateViewportAndRender(true);
  }

  // --- Indicators ---

  addIndicator(id: string, params: Record<string, number | string | boolean> = {}, position: PanelPosition = 'bottom'): string | null {
    if (!this.features.indicators) return null;
    if (this.features.indicatorIds.length > 0 && !this.features.indicatorIds.includes(id)) return null;
    const instanceId = this.indicatorEngine.addIndicator(id, params, this.dataManager.getData());
    const descriptor = this.indicatorEngine.getAvailableIndicators().find((d) => d.id === id);
    if (descriptor?.placement === 'panel') {
      this.layoutManager.addPanel(instanceId, position);
    }
    this.eventBus.emit('indicatorAdd', { instanceId, id });
    this.engine.requestRender();
    return instanceId;
  }

  updateIndicator(instanceId: string, params: Record<string, number | string | boolean>): void {
    this.indicatorEngine.updateIndicator(instanceId, params, this.dataManager.getData());
    this.engine.requestRender();
  }

  removeIndicator(instanceId: string): void {
    this.indicatorEngine.removeIndicator(instanceId);
    this.layoutManager.removePanel(instanceId);
    this.eventBus.emit('indicatorRemove', { instanceId });
    this.engine.requestRender();
  }

  getIndicatorOutput(instanceId: string): IndicatorOutput | null {
    return this.indicatorEngine.getOutput(instanceId);
  }

  registerIndicator(plugin: IndicatorPlugin): void {
    this.pluginManager.registerIndicator(plugin);
  }

  static indicators(): IndicatorDescriptor[] {
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    return engine.getAvailableIndicators();
  }

  // --- Panel layout ---

  setPanelPosition(instanceId: string, position: PanelPosition): void {
    this.layoutManager.setPanelPosition(instanceId, position);
    this.engine.requestRender();
  }

  setPanelSize(instanceId: string, size: number): void {
    this.layoutManager.setPanelSize(instanceId, size);
    this.engine.requestRender();
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

  setDrawingStyle(style: Partial<DrawingStyle>): void {
    this.drawingManager.setStyle(style);
  }

  getDrawings(): DrawingState[] {
    return this.drawingManager.getDrawings();
  }

  setDrawings(drawings: DrawingState[]): void {
    this.drawingManager.setDrawings(drawings);
  }

  removeDrawing(id: string): void {
    this.drawingManager.removeDrawing(id);
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

  setDrawingMagnet(enabled: boolean): void {
    this.drawingManager.setMagnetMode(enabled ? 'magnet' : 'none');
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

  exportVisibleData(format: 'csv' | 'json' = 'csv', filename?: string): void {
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

  exportAllData(format: 'csv' | 'json' = 'csv', filename?: string): void {
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
    this.autoSaveKey = key;
    this.autoSaveDelay = delayMs;
  }

  disableAutoSave(): void {
    this.autoSaveDelay = 0;
    this.autoSaveKey = null;
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private scheduleAutoSave(): void {
    if (this.autoSaveDelay <= 0 || !this.autoSaveKey) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.autoSaveTimer = null;
      if (this.autoSaveKey) {
        this.saveState(this.autoSaveKey);
      }
    }, this.autoSaveDelay);
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
  getActiveIndicators(): { instanceId: string; id: string; params: Record<string, unknown>; descriptor: IndicatorDescriptor }[] {
    return this.indicatorEngine.getActiveIndicators();
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
  }

  // --- Trading ---

  setOrders(orders: TradingOrder[]): void {
    if (!this.features.trading) return;
    this.tradingManager.setOrders(orders);
  }

  setPositions(positions: TradingPosition[]): void {
    if (!this.features.trading) return;
    this.tradingManager.setPositions(positions);
  }

  setDepthData(depth: DepthData | null): void {
    if (!this.features.trading) return;
    this.tradingManager.setDepthData(depth);
  }

  setCurrentPrice(price: number): void {
    this.tradingManager.setCurrentPrice(price);
    // Also update standalone price line (visible even without trading feature)
    this.currentPriceLine.setPrice(price);
    this.scheduleRender();
    if (this.features.alerts) this.alertManager.checkPrice(price);
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
   * import { BinanceAdapter } from '@chart-lib/core';
   * chart.connect({
   *   adapter: new BinanceAdapter(),
   *   symbol: 'BTCUSDT',
   *   timeframe: '1m',
   * });
   */
  async connect(config: StreamConfig): Promise<void> {
    this.disconnectStream();

    this.streamManager = new StreamManager();

    this.streamManager.on('snapshot', (bars) => {
      this.setData(bars);
    });

    this.streamManager.on('barClose', (bar) => {
      this.dataManager.appendBar(bar);
      this.crosshairHandler.setData(this.dataManager.getData());
      if (this.autoScrollOnNewBar) this.viewport.scrollToEnd();
      this.indicatorEngine.recalculateAll(this.dataManager.getData());
      this.updateViewportAndRender();
    });

    this.streamManager.on('barUpdate', (bar) => {
      this.dataManager.updateLastBar(bar);
      this.currentPriceLine.setPrice(bar.close);
      this.scheduleRender();
    });

    this.streamManager.on('priceChange', ({ price }) => {
      this.tradingManager.setCurrentPrice(price);
      this.currentPriceLine.setPrice(price);
      this.engine.requestRender(LayerType.Overlay);
      this.engine.requestRender(LayerType.UI);
    });

    this.streamManager.on('connectionChange', (info) => {
      this.eventBus.emit('dataUpdate', { connection: info });
    });

    this.streamManager.on('error', (err) => {
      this.eventBus.emit('dataUpdate', { error: err.message });
    });

    this.autoScrollOnNewBar = config.autoScroll !== false;

    await this.streamManager.connect(config);

    // Set up bar countdown timer based on timeframe
    const tfMs = this.timeframeToMs(config.timeframe);
    this.barCountdown.setTimeframeMs(tfMs);

    // Start countdown refresh interval
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      if (this.barCountdown.isVisible()) {
        this.engine.requestRender(LayerType.UI);
      }
    }, 1000);
  }

  /**
   * Switch symbol or timeframe on an active stream without full reconnect.
   */
  async switchStream(symbol: string, timeframe: TimeFrame): Promise<void> {
    if (!this.streamManager) return;
    await this.streamManager.switchTo(symbol, timeframe);
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

  setBarCountdownVisible(visible: boolean): void {
    this.barCountdown.setVisible(visible);
    this.engine.requestRender(LayerType.UI);
  }

  setSessionBreaksVisible(visible: boolean): void {
    this.sessionBreaks.setVisible(visible);
    this.engine.requestRender(LayerType.Background);
  }

  // --- Compare symbols ---

  addCompareSymbol(id: string, label: string, data: DataSeries, color: string): void {
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

  // --- Log scale ---

  setLogScale(enabled: boolean): void {
    this.viewport.setLogScale(enabled);
    this.updateViewportAndRender();
  }

  isLogScale(): boolean {
    return this.viewport.isLogScale();
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

  scrollToEnd(): void {
    this.viewport.scrollToEnd();
    this.updateViewportAndRender();
  }

  setVisibleRange(fromTimestamp: number, toTimestamp: number): void {
    const data = this.dataManager.getData();
    let fromIdx = 0;
    let toIdx = data.length - 1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].time >= fromTimestamp) { fromIdx = i; break; }
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].time <= toTimestamp) { toIdx = i; break; }
    }
    const barCount = toIdx - fromIdx + 1;
    if (barCount > 0) {
      const chartWidth = this.viewport.getState().chartRect.width;
      const targetBarUnit = chartWidth / barCount;
      const newBarWidth = Math.max(2, targetBarUnit - this.viewport.getState().barSpacing);
      this.viewport.zoom(
        (newBarWidth - this.viewport.getState().barWidth) / this.viewport.getState().barWidth,
        chartWidth / 2,
      );
    }
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

  fitContent(): void {
    const data = this.dataManager.getData();
    if (data.length === 0) return;
    this.setVisibleRange(data[0].time, data[data.length - 1].time);
  }

  // --- Events ---

  on(type: ChartEventType, handler: (event: ChartEvent) => void): void {
    this.eventBus.on(type, handler);
  }

  off(type: ChartEventType, handler: (event: ChartEvent) => void): void {
    this.eventBus.off(type, handler);
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
    this.updateViewportAndRender();
  }

  isAutoScale(): boolean {
    return this.options.autoScale !== false;
  }

  // --- Crosshair ---

  setCrosshairMode(mode: 'normal' | 'magnet' | 'hidden'): void {
    this.crosshairHandler.setMode(mode);
    this.engine.requestRender(LayerType.Overlay);
  }

  getCrosshairMode(): string {
    return this.crosshairHandler.getMode();
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

  // --- Tooltip ---

  setTooltipVisible(visible: boolean): void {
    if (!visible) this.crosshairTooltip.hide();
  }

  // --- Legend ---

  setLegend(config: Partial<import('@chart-lib/core').LegendConfig>): void {
    this.chartLegend.setConfig(config);
    this.engine.requestRender(LayerType.UI);
  }

  setSymbolName(symbol: string): void {
    this.chartLegend.setSymbol(symbol);
    this.engine.requestRender(LayerType.UI);
  }

  // --- Screenshot ---

  screenshot(filename?: string): void {
    if (!this.features.screenshot) return;
    Screenshot.download(this.container, filename, this.themeManager.getTheme().background);
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

  addAlert(price: number, condition: import('@chart-lib/core').AlertCondition = 'crossing', message?: string): string | null {
    if (!this.features.alerts) return null;
    const id = this.alertManager.addAlert(price, condition, message);
    this.scheduleAutoSave();
    return id;
  }

  removeAlert(id: string): void {
    this.alertManager.removeAlert(id);
    this.scheduleAutoSave();
  }

  getAlerts(): import('@chart-lib/core').PriceAlert[] {
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

  // --- Replay ---

  replay(config?: Partial<import('@chart-lib/core').ReplayConfig>): void {
    if (!this.features.replay) return;
    const data = this.dataManager.getData();
    this.replayManager.load(data);
    this.replayManager.on('bar', ({ bar, index }) => {
      const slice = data.slice(0, index + 1);
      this.dataManager.setData(slice);
      this.crosshairHandler.setData(slice);
      this.indicatorEngine.recalculateAll(slice);
      this.updateViewportAndRender();
    });
    this.replayManager.play(config);
  }

  replayPause(): void { this.replayManager.pause(); }
  replayResume(): void { this.replayManager.resume(); }
  replayStop(): void { this.replayManager.stop(); }
  replaySeek(index: number): void { this.replayManager.seekTo(index); }
  setReplaySpeed(speed: number): void { this.replayManager.setSpeed(speed); }
  getReplayState(): 'playing' | 'paused' | 'stopped' { return this.replayManager.getState(); }
  getReplayProgress(): { current: number; total: number; percent: number } { return this.replayManager.getProgress(); }

  // --- Save / Load ---

  saveState(key?: string): string | null {
    if (!this.features.saveLoad) return null;
    const snapshot = ChartStateManager.capture(
      {
        getDrawings: () => this.getDrawings(),
        getTheme: () => this.getTheme(),
        getAlerts: () => this.getAlerts(),
      },
      { chartType: this.options.chartType },
    );
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
    if (snapshot.alerts) {
      this.clearAlerts();
      for (const a of snapshot.alerts) {
        this.addAlert(a.price, a.condition, a.message);
      }
    }
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
    const snapshot = ChartStateManager.capture(
      { getDrawings: () => this.getDrawings(), getTheme: () => this.getTheme(), getAlerts: () => this.getAlerts() },
      { chartType: this.options.chartType },
    );
    ChartStateManager.downloadFile(snapshot, filename);
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
      this.tradingManager.setConfig({ pricePrecision: config.pricePrecision });
      this.alertManager.setPricePrecision(config.pricePrecision);
      this.streamManager?.priceLine.setPricePrecision(config.pricePrecision);
      this.crosshairHandler.setPricePrecision(config.pricePrecision);
    }

    this.syncRenderContext();
    this.engine.requestRender();
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
    if (patch.crosshair === false) {
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
    this.interactionManager.detach();
    this.tradingManager.destroy();
    this.animator.dispose();
    this.crosshairTooltip.destroy();
    this.replayManager.dispose();
    this.undoRedoManager.clear();
    this.engine.destroy();
    this.eventBus.destroy();
    this.container.innerHTML = '';
  }

  // --- Internal ---

  private createChartRenderer(type: ChartType): ChartRendererInterface {
    switch (type) {
      case 'candlestick': return new CandlestickRenderer();
      case 'heikinAshi': return new CandlestickRenderer(); // Same renderer, different data
      case 'line': return new LineRenderer();
      case 'area': return new AreaRenderer();
      case 'bar': return new BarRenderer();
      case 'hollowCandle': return new HollowCandleRenderer();
      case 'baseline': return new BaselineRenderer();
      case 'renko': return new RenkoRenderer();
      case 'lineBreak': return new CandlestickRenderer(); // Candle renderer on transformed data
      case 'kagi': return new KagiRenderer();
      case 'pointAndFigure': return new PointAndFigureRenderer();
      default: return new CandlestickRenderer();
    }
  }

  /** Cached display data. Invalidated when raw data or chart type changes. */
  private getDisplayData(): DataSeries {
    if (this.displayDataCache) return this.displayDataCache;

    const raw = this.dataManager.getData();
    if (raw.length === 0) return raw;

    let result: DataSeries;
    switch (this.options.chartType) {
      case 'heikinAshi': result = toHeikinAshi(raw); break;
      case 'renko': result = toRenko(raw, { brickSize: 0, useATR: true, atrPeriod: 14 }); break;
      case 'lineBreak': result = toLineBreak(raw, 3); break;
      case 'kagi': result = toKagi(raw, 4); break;
      case 'pointAndFigure': {
        const avgPrice = raw.reduce((s, b) => s + b.close, 0) / raw.length;
        result = toPointAndFigure(raw, avgPrice * 0.01, 3);
        break;
      }
      default: result = raw;
    }
    this.displayDataCache = result;
    return result;
  }

  /** Lightweight render for streaming updates. No layout resolve, no indicator recalc. */
  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      const displayData = this.getDisplayData();
      this.viewport.updateData(displayData, this.options.autoScale !== false);
      this.syncRenderContext();
      this.engine.requestRender();
    });
  }

  /** Full update: resolve layout, update viewport, sync context, request render. */
  private updateViewportAndRender(scrollToEnd = false): void {
    // Invalidate layout cache
    this.resolvedLayoutCache = null;
    this.panelInfoCache = null;

    const resolved = this.getResolvedLayout();
    this.viewport.setChartRect(resolved.mainChartRect);

    const displayData = this.getDisplayData();
    this.viewport.updateData(displayData, this.options.autoScale !== false);

    // Scroll to end AFTER updateData so dataLength is current
    if (scrollToEnd) this.viewport.scrollToEnd();

    this.syncRenderContext();
    this.engine.requestRender();
  }

  private getResolvedLayout() {
    if (!this.resolvedLayoutCache) {
      this.resolvedLayoutCache = this.layoutManager.resolve();
    }
    return this.resolvedLayoutCache;
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

  private buildPanelRenderInfos(): import('@chart-lib/core').PanelRenderInfo[] {
    if (this.panelInfoCache) return this.panelInfoCache;

    const resolved = this.getResolvedLayout();
    const mainVP = this.viewport.getState();

    const panels = resolved.panels.map((panel) => {
      const output = this.indicatorEngine.getOutput(panel.config.id);
      let min = 0, max = 100;

      if (output) {
        let vMin = Infinity, vMax = -Infinity;
        const { from, to } = mainVP.visibleRange;
        let idx = 0;
        for (const [, val] of output.values) {
          if (idx >= from && idx <= to) {
            for (const key in val) {
              const v = val[key];
              if (v !== undefined) {
                if (v < vMin) vMin = v;
                if (v > vMax) vMax = v;
              }
            }
          }
          idx++;
        }
        if (vMin !== Infinity) {
          const range = vMax - vMin || 1;
          min = vMin - range * 0.1;
          max = vMax + range * 0.1;
        }
      }

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
        rect: panel.rect,
        viewport: {
          ...mainVP,
          chartRect: insetRect,
          priceRange: { min, max },
        },
      };
    });

    this.panelInfoCache = panels;
    return panels;
  }

  private syncRenderContext(): void {
    const resolved = this.getResolvedLayout();
    const panels = this.features.indicators ? this.buildPanelRenderInfos() : [];

    // Compute where the time axis should render: below main chart + all bottom panels
    const bottomPanelHeight = resolved.panels
      .filter(p => p.config.position === 'bottom')
      .reduce((sum, p) => sum + p.rect.height, 0);
    const timeAxisY = resolved.mainChartRect.y + resolved.mainChartRect.height + bottomPanelHeight;

    this.engine.setRenderContext({
      chartRenderer: this.chartRenderer,
      gridRenderer: this.features.grid ? this.gridRenderer : null,
      priceAxis: this.features.priceAxis ? this.priceAxis : null,
      timeAxis: this.features.timeAxis ? this.timeAxis : null,
      crosshairHandler: this.features.crosshair ? this.crosshairHandler : null,
      indicatorEngine: this.features.indicators ? this.indicatorEngine : null,
      drawingRenderer: this.features.drawings ? this.drawingRenderer : null,
      tradingRenderer: this.features.trading ? this.tradingRenderer : null,
      currentPriceLine: this.streamManager?.priceLine ?? this.currentPriceLine,
      chartLegend: this.features.legend ? this.chartLegend : null,
      volumeRenderer: this.features.volume ? this.volumeRenderer : null,
      watermark: this.features.watermark ? this.watermark : null,
      barCountdown: this.barCountdown,
      sessionBreaks: this.sessionBreaks,
      compareRenderer: this.compareRenderer,
      panels,
      priceLimits: this.buildPriceLimits(),
      timeAxisY,
      viewport: this.viewport.getState(),
      theme: this.themeManager.getTheme(),
      data: this.getDisplayData(),
    });
  }

  private timeframeToMs(tf: string): number {
    const match = tf.match(/^(\d+)([smhdwMy])$/);
    if (!match) return 0;
    const n = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60_000;
      case 'h': return n * 3_600_000;
      case 'd': return n * 86_400_000;
      case 'w': return n * 604_800_000;
      case 'M': return n * 2_592_000_000;
      default: return 0;
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
