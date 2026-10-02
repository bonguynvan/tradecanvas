import type {
  Theme,
  ThemeName,
  ChartType,
  TimeFrame,
  DrawingToolType,
  DataAdapter,
  ChartOptions,
  PriceScaleMode,
  SymbolInfo,
} from '@tradecanvas/commons';
import type { Chart } from '../Chart.js';

export interface ChartWidgetOptions {
  symbol?: string;
  timeframe?: TimeFrame;
  theme?: ThemeName | Theme;

  /**
   * UI chrome language (toolbar, watchlist, indicator picker, status bar,
   * settings panel, hotkey sheet). A built-in table ('en', the default, or
   * 'vi'), layered under `messages` for host overrides/additions. Does not
   * translate the data-driven indicator/drawing-tool names from
   * `widgetConfig.ts` — see README "Widget i18n".
   */
  locale?: string;
  /** Override or add individual UI strings, on top of `locale`'s built-in table. */
  messages?: Partial<Record<import('./i18n.js').MessageKey, string>>;

  // UI toggles (default true)
  toolbar?: boolean;
  drawingTools?: boolean;
  settings?: boolean;
  trading?: boolean;
  statusBar?: boolean;
  /**
   * Range presets (1D, 5D, 1M … All) and "go to date" (also Alt+G) on the
   * status bar. Default `true`; needs the status bar.
   */
  rangeBar?: boolean;
  /**
   * The indicators on the chart, under the OHLCV legend and at the top of
   * their panes, with show / settings / remove. Default `true`; `false`
   * leaves only the toolbar's indicator count.
   */
  indicatorLegend?: boolean;
  /** Fullscreen button in the toolbar, where the browser allows it. Default `true`. */
  fullscreen?: boolean;
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
  /** Let users type their own intervals (7m, 90m, 2h…) in the timeframe menu. Default `true`. */
  customTimeframes?: boolean;
  chartTypes?: ChartType[];

  // Data
  adapter?: DataAdapter;
  /**
   * Search symbols as the user types in the symbol search (names, exchanges).
   * Defaults to the adapter's `searchSymbols`; without either, the search
   * filters `symbols`.
   */
  searchSymbols?: (query: string, signal: AbortSignal) => Promise<SymbolInfo[]>;
  historyLimit?: number;
  /** Bars per request when scrolling back for older bars (adapters with `fetchHistoryBefore`). Default 500. */
  historyPageSize?: number;

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

export interface ActiveIndicatorInfo {
  id: string;
  /** Chip label: short name plus the main parameters, e.g. "EMA 20". */
  label: string;
}

export interface WidgetState {
  symbol: string;
  timeframe: TimeFrame;
  chartType: ChartType;
  isDark: boolean;
  /** One entry per indicator instance (several EMAs can be on at once). */
  activeIndicators: Map<string, ActiveIndicatorInfo>; // instanceId -> indicator id + chip label
  activeTool: DrawingToolType | null;
  magnetEnabled: boolean;
  /** The magnet snaps always, not only near a price (with `magnetEnabled`). */
  magnetStrong: boolean;
  /** The eraser is on: a click on a drawing removes it. */
  eraser: boolean;
  /** The zoom tool waits for a box to zoom into. */
  zoomArea: boolean;
  /** Keep the drawing tool after each drawing. */
  stayInDrawing: boolean;
  connectionState: string;
  connectionMessage: string;
}

export interface ToolbarConfig {
  symbols: string[];
  /** Every timeframe on offer, shortest first; the menu lists them all. */
  timeframes: { label: string; value: TimeFrame; custom?: boolean }[];
  /** The ones shown as buttons. Defaults to all of `timeframes`. */
  timeframeFavorites?: TimeFrame[];
  chartTypes: { label: string; value: ChartType }[];
  indicators: IndicatorDef[];
  popularIndicatorIds: string[];
}

export interface ToolbarCallbacks {
  onSymbolClick: () => void;
  onTimeframe: (tf: TimeFrame) => void;
  /** Pin or unpin a timeframe; enables the timeframe menu. */
  onToggleTimeframeFavorite?: (tf: TimeFrame) => void;
  /** Add a typed interval ("7m", "90", "2h"); false when it isn't one. Shows the custom-interval field. */
  onAddTimeframe?: (text: string) => boolean;
  /** Remove a custom interval from the menu. */
  onRemoveTimeframe?: (tf: TimeFrame) => void;
  onChartType: (type: ChartType) => void;
  onAddIndicator: (id: string) => void;
  onScreenshot: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
  onToggleReplay?: () => void;
  onToggleAlerts?: () => void;
  onToggleObjects?: () => void;
  onBracket?: (side: 'buy' | 'sell') => void;
  onToggleLadder?: () => void;
  /** Shown only when given (and the browser allows fullscreen). */
  onToggleFullscreen?: () => void;
}

export interface SidebarConfig {
  drawingToolGroups: DrawingToolGroupDef[];
  /** Initially pinned tools shown in the favorites strip. */
  favorites?: DrawingToolType[];
}

export interface SidebarCallbacks {
  onDrawingTool: (tool: DrawingToolType) => void;
  onCancelDrawing: () => void;
  /** Omitted when the magnet is switched off (`features.drawingMagnet: false`). Cycles off, weak, strong. */
  onToggleMagnet?: () => void;
  onToggleEraser?: () => void;
  onToggleZoomArea?: () => void;
  onToggleFavorite?: (tool: DrawingToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearDrawings: () => void;
  onToggleStyle?: () => void;
  onToggleStayInDrawing?: () => void;
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
  pivotStructureLabels: boolean;
  periodLevelsVisible: boolean;
  periodLevelsPeriod: 'day' | 'week';
  legendVisible: boolean;
  barCountdown: boolean;
  /** Tag each indicator line's latest value on its scale. */
  indicatorValueLabels: boolean;
  logScale: boolean;
  scaleMode: PriceScaleMode;
  autoScale: boolean;
  /** Price scale upside down. */
  invertScale: boolean;
  /** A price scale on the left too (it carries overlays put on it, else mirrors the price scale). */
  leftPriceScale: boolean;
  crosshairMode: 'normal' | 'magnet' | 'hidden';
  numberLocale: string;
  /** 'local' = browser timezone; an IANA zone ('America/New_York'); or a fixed UTC offset in minutes (as a string, from older settings). */
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


