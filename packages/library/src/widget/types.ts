import type {
  Theme,
  ThemeName,
  ChartType,
  TimeFrame,
  DrawingToolType,
  DataAdapter,
  ChartOptions,
  PriceScaleMode,
} from '@tradecanvas/commons';
import type { Chart } from '../Chart.js';

export interface ChartWidgetOptions {
  symbol?: string;
  timeframe?: TimeFrame;
  theme?: ThemeName | Theme;

  // UI toggles (default true)
  toolbar?: boolean;
  drawingTools?: boolean;
  settings?: boolean;
  trading?: boolean;
  statusBar?: boolean;
  /**
   * Price-alerts UI — a bell button in the toolbar that opens a floating panel
   * to add / list / delete price alerts, plus a toast when one triggers.
   * Default `true`.
   */
  alerts?: boolean;

  /**
   * Sound and/or desktop notification when a price alert triggers. Both off by
   * default. `sound: true` plays a built-in beep; pass a URL for a custom one.
   * `desktop: true` uses the Notification API (asks permission on first use).
   */
  alertNotifications?: import('./AlertNotifier.js').AlertNotifyOptions;

  /**
   * Object-tree panel — a layers button in the toolbar that opens a manager
   * listing active indicators and drawings, with per-item show/hide, lock, and
   * delete. Default `true`.
   */
  objectTree?: boolean;

  /**
   * Depth-of-market ladder — a ladder button in the toolbar that opens a
   * click-to-trade order-book panel. Off by default (needs trading + an
   * order-book feed via `widget.setDepth`). Clicks emit `orderPlace` intents.
   */
  depthLadder?: boolean;

  // Config
  symbols?: string[];
  timeframes?: TimeFrame[];
  chartTypes?: ChartType[];

  // Data
  adapter?: DataAdapter;
  historyLimit?: number;

  // Chart pass-through
  chartOptions?: Partial<ChartOptions>;

  /**
   * Render a watchlist sidebar on the right showing all configured symbols
   * with last price, % change, and a mini sparkline. Default `false`.
   */
  watchlist?: boolean;

  /**
   * Drag-and-drop CSV / JSON file import onto the chart. Default `true`.
   * Set to `false` to disable (e.g. if the chart sits inside a larger
   * surface that already handles drops).
   */
  dragDropImport?: boolean;

  /**
   * Client-side timeframe resampling. When enabled (default `true`) and no
   * live adapter is attached, switching to a coarser timeframe aggregates the
   * loaded base series instead of refetching — one dataset drives every
   * resolution. Disable to keep the timeframe buttons purely as a
   * `onTimeframeChange` signal for the host app to refetch.
   */
  resampleTimeframes?: boolean;

  /** Anchor day for weekly resample buckets. `0` = Sunday, `1` = Monday (default). */
  weekStartsOn?: 0 | 1;

  /**
   * Deep-linking. When `true`, the widget restores a `#tcw=<encoded>` view from
   * the URL hash on load, and the "Share View" command writes one back. Use
   * `exportState()` / `importState()` for manual control.
   */
  shareUrl?: boolean;

  /**
   * Drawing tools to pre-pin to the favorites strip at the top of the drawing
   * sidebar on first run. Users pin/unpin any tool by right-clicking it; the
   * set persists to localStorage. The strip is always available (hidden while
   * empty) — this option only seeds the initial pins.
   */
  drawingFavorites?: DrawingToolType[];

  // Layout persistence (per-symbol indicators + drawings + chart type)
  persistLayouts?: boolean | {
    /** localStorage key prefix. The active symbol is appended. Default `tcw:layout:`. */
    keyPrefix?: string;
    /** Debounce window before flushing to storage. Default 1500 ms. */
    debounceMs?: number;
  };

  // Callbacks
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (tf: TimeFrame) => void;
  onReady?: (chart: Chart) => void;
}

export interface WidgetState {
  symbol: string;
  timeframe: TimeFrame;
  chartType: ChartType;
  isDark: boolean;
  activeIndicators: Map<string, string>; // indicatorId -> instanceId
  activeTool: DrawingToolType | null;
  magnetEnabled: boolean;
  connectionState: string;
  connectionMessage: string;
}

export interface ToolbarConfig {
  symbols: string[];
  timeframes: { label: string; value: TimeFrame }[];
  chartTypes: { label: string; value: ChartType }[];
  indicators: IndicatorDef[];
  popularIndicatorIds: string[];
}

export interface ToolbarCallbacks {
  onSymbolClick: () => void;
  onTimeframe: (tf: TimeFrame) => void;
  onChartType: (type: ChartType) => void;
  onAddIndicator: (id: string) => void;
  onRemoveIndicator: (instanceId: string) => void;
  onScreenshot: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
  onToggleReplay?: () => void;
  onToggleAlerts?: () => void;
  onToggleObjects?: () => void;
  onBracket?: (side: 'buy' | 'sell') => void;
  onToggleLadder?: () => void;
}

export interface SidebarConfig {
  drawingToolGroups: DrawingToolGroupDef[];
  /** Initially pinned tools shown in the favorites strip. */
  favorites?: DrawingToolType[];
}

export interface SidebarCallbacks {
  onDrawingTool: (tool: DrawingToolType) => void;
  onCancelDrawing: () => void;
  onToggleMagnet: () => void;
  onToggleFavorite?: (tool: DrawingToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearDrawings: () => void;
  onToggleStyle?: () => void;
}

export interface SettingsCallbacks {
  onChange: (patch: Partial<ChartSettingsState>) => void;
  onReset: () => void;
  onClose: () => void;
}

export interface ChartSettingsState {
  candleUpColor: string;
  candleDownColor: string;
  candleUpWick: string;
  candleDownWick: string;
  backgroundColor: string;
  gridColor: string;
  gridVisible: boolean;
  volumeVisible: boolean;
  volumeProfileVisible: boolean;
  marketProfileVisible: boolean;
  marketProfileSplit: boolean;
  marketProfileLetters: boolean;
  marketProfileBuckets: number;
  marketProfileOpacity: number;
  depthHeatmapVisible: boolean;
  depthHeatmapOpacity: number;
  sessionShadingVisible: boolean;
  pivotMarkersVisible: boolean;
  pivotStrength: number;
  periodLevelsVisible: boolean;
  periodLevelsPeriod: 'day' | 'week';
  legendVisible: boolean;
  barCountdown: boolean;
  logScale: boolean;
  scaleMode: PriceScaleMode;
  autoScale: boolean;
  crosshairMode: 'normal' | 'magnet' | 'hidden';
  numberLocale: string;
  /** 'local' = browser timezone, otherwise a fixed UTC offset in minutes (as a string). */
  timezone: string;
}

export interface IndicatorDef {
  id: string;
  name: string;
  type: 'overlay' | 'panel';
}

export interface DrawingToolGroupDef {
  label: string;
  tools: { label: string; value: DrawingToolType }[];
}

export interface ActiveIndicator {
  instanceId: string;
  id: string;
  label: string;
}
