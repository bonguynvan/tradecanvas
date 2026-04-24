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

export class ChartWidget {
  private chart: Chart;
  private state: WidgetState;
  private toolbar: WidgetToolbar | null = null;
  private sidebar: WidgetDrawingSidebar | null = null;
  private settings: WidgetSettings | null = null;
  private statusBar: WidgetStatusBar | null = null;
  private root: HTMLDivElement;
  private chartContainer: HTMLDivElement;
  private destroyed = false;
  private options: ChartWidgetOptions;
  private symbolIndex = 0;
  private symbols: string[];
  private settingsState: ChartSettingsState;
  private adapter: import('@tradecanvas/commons').DataAdapter | null = null;

  constructor(container: HTMLElement, options: ChartWidgetOptions = {}) {
    this.options = options;
    this.symbols = options.symbols ?? DEFAULT_SYMBOLS;
    this.settingsState = { ...DEFAULT_SETTINGS };

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

    // Set symbol index
    const sIdx = this.symbols.indexOf(this.state.symbol);
    if (sIdx >= 0) this.symbolIndex = sIdx;

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
        },
      );
    }

    this.chartContainer = document.createElement('div');
    this.chartContainer.className = 'tcw-chart-container';
    body.appendChild(this.chartContainer);
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

    // 8. Connect stream
    if (options.adapter) {
      this.adapter = options.adapter;
      this.connectStream();
    }

    // Initial UI update
    this.updateUI();

    // 9. Fire onReady
    options.onReady?.(this.chart);
  }

  // --- Public API ---

  async setSymbol(symbol: string): Promise<void> {
    this.state = { ...this.state, symbol };
    const idx = this.symbols.indexOf(symbol);
    if (idx >= 0) this.symbolIndex = idx;
    this.options.onSymbolChange?.(symbol);
    this.updateUI();
    if (this.adapter) {
      await this.connectStream();
    }
  }

  async setTimeframe(tf: TimeFrame): Promise<void> {
    this.state = { ...this.state, timeframe: tf };
    this.options.onTimeframeChange?.(tf);
    this.updateUI();
    if (this.adapter) {
      await this.connectStream();
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
    this.symbolIndex = (this.symbolIndex + 1) % this.symbols.length;
    const symbol = this.symbols[this.symbolIndex];
    this.state = { ...this.state, symbol };
    this.options.onSymbolChange?.(symbol);
    this.updateUI();
    if (this.adapter) {
      this.connectStream();
    }
  }

  private handleTimeframe(tf: TimeFrame): void {
    this.state = { ...this.state, timeframe: tf };
    this.options.onTimeframeChange?.(tf);
    this.updateUI();
    if (this.adapter) {
      this.connectStream();
    }
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

  private applySettings(patch: Partial<ChartSettingsState>): void {
    this.settingsState = { ...this.settingsState, ...patch };

    if (patch.gridVisible !== undefined) this.chart.setGridVisible(patch.gridVisible);
    if (patch.volumeVisible !== undefined) this.chart.setVolumeVisible(patch.volumeVisible);
    if (patch.crosshairMode !== undefined) this.chart.setCrosshairMode(patch.crosshairMode);
    if (patch.autoScale !== undefined) this.chart.setAutoScale(patch.autoScale);
    if (patch.logScale !== undefined) this.chart.setLogScale(patch.logScale);
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

      this.state = {
        ...this.state,
        connectionState: 'connected',
        connectionMessage: 'Live',
      };
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
