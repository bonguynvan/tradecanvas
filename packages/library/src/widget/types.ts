import type {
  ChartTypeOptions,
  Theme,
  ThemeName,
  ChartType,
  TimeFrame,
  DrawingToolType,
  DataAdapter,
  ChartOptions,
  NewsItem,
  PriceScaleMode,
  QuoteSource,
  SymbolInfo,
} from '@tradecanvas/commons';
import type { Chart } from '../Chart.js';
import type { WatchlistList } from './WatchlistStore.js';

/** The watchlist's lists and where its rows' quotes come from. */
export interface WatchlistOptions {
  /** The lists to start with; default one list of `symbols`. */
  lists?: WatchlistList[];
  /** The list shown first, by id. */
  activeList?: string;
  /** Keep the lists in this browser (localStorage) between visits. Default `false`. */
  persist?: boolean;
  /** The localStorage key when `persist` is on. Default `'tcw:watchlists'`. */
  storageKey?: string;
  /**
   * Where the rows' quotes come from: default the adapter's `subscribeQuotes`
   * when it has one (Binance does); `false` for only what you push with
   * `setQuotes` / `setWatchlistEntry`.
   */
  quotes?: QuoteSource | false;
  /** After every change to the lists (to keep them yourself). */
  onChange?: (lists: WatchlistList[], activeList: string) => void;
}

export interface ChartWidgetOptions {
  symbol?: string;
  timeframe?: TimeFrame;
  theme?: ThemeName | Theme;
  /**
   * The widget's look: its corners, sizes, type, lines, shadows and bars.
   * A preset (`'studio'`, the default; `'terminal'`; `'capsule'`) or your
   * theme over one. Colours stay with `theme`.
   */
  ui?: import('./widgetUI.js').WidgetUIPreset | import('./widgetUI.js').WidgetUITheme;

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

  /**
   * The widget's switches, by name (`WIDGET_FEATURES`): every one is on
   * unless set `false` here. A name without a dot turns a whole capability
   * off wherever it shows (`alerts`, `settings`, `hotkeys`); a dotted name,
   * one place (`toolbar.screenshot`, `menu.chart.order`, `sidebar.magnet`).
   * Change them while running with `setFeatures`. They win over the older
   * on/off options below, which stand for switches of their own.
   */
  features?: import('./widgetFeatures.js').WidgetFeatures;

  // UI toggles (default true). Each stands for a switch (see `features`): `toolbar: false` is `features: { toolbar: false }`.
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
  /**
   * In a replay, show the signal markers and trade zones only as it reaches
   * them (a trade open until its exit). Default `true`; `false` shows them
   * all through the replay.
   */
  replayRevealMarks?: boolean;
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

  /**
   * The account panel at the bottom: open positions with their profit and
   * loss, working orders and the fills so far, with close, reverse and cancel,
   * and an order ticket. A toolbar button opens it. Default `true` when
   * trading is on.
   */
  accountPanel?: boolean;

  /**
   * Named layouts: a toolbar button to save the chart (symbol, interval,
   * scale, chart type, indicators, drawings, alerts) under a name, open,
   * rename and delete layouts, and auto-save the one open; Ctrl/Cmd+S saves.
   * Kept in this browser's `localStorage` unless `storage` says otherwise.
   * Default `true`.
   */
  layouts?: boolean | WidgetLayoutsOptions;

  /**
   * Indicator templates: the indicators menu saves the chart's indicators
   * (inputs, style, levels, panes) under a name and applies them in one go.
   * Kept in this browser's `localStorage`. Default `true`.
   */
  indicatorTemplates?: boolean;

  /**
   * Type a number on the chart (after using it) to change the interval:
   * `5`, `15m`, `1h`, `1D`, then Enter. Default `true`.
   */
  intervalTyping?: boolean;

  /**
   * Your own entries at the end of the chart's right-click menus (and of the
   * "+" by the price axis), after the widget's. Called each time a menu opens.
   */
  chartMenuItems?: (context: ChartMenuItemsContext) => readonly WidgetMenuItem[];

  /** Your own entries at the end of a drawing's right-click menu. Called each time it opens. */
  drawingMenuItems?: (context: DrawingMenuItemsContext) => readonly WidgetMenuItem[];

  /** Your own entries at the end of an indicator's "more" menu (on its row on the chart). */
  indicatorMenuItems?: (context: IndicatorMenuItemsContext) => readonly WidgetMenuItem[];

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
   * A watchlist sidebar on the right: lists of symbols with last price,
   * % change and a mini sparkline; lists can be added, renamed, deleted and
   * reordered. `true` starts with one list of `symbols`. Default `false`.
   */
  watchlist?: boolean | WatchlistOptions;

  /**
   * The symbol info panel (names, price and move, market status, the day's
   * numbers, hours, news) and its toolbar button. Default `true`.
   */
  symbolInfo?: boolean;

  /**
   * Buttons over the chart, shown while the pointer is on it: zoom out and
   * in, scroll earlier and later, reset the view. Default `true`.
   */
  navigation?: boolean;

  /**
   * Writing direction of the widget's chrome: `'rtl'` mirrors the toolbar,
   * drawing tools, menus and dialogs (the chart keeps time running left to
   * right). Default `'auto'`: right to left for Arabic, Hebrew, Persian, Urdu.
   */
  dir?: 'ltr' | 'rtl' | 'auto';

  /**
   * Headlines for the symbol info panel, newest first; default the adapter's
   * `fetchNews` when it has one. Links that aren't web pages are dropped.
   */
  news?: (symbol: string, limit: number) => Promise<NewsItem[]>;

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

/** Where a chart menu opened, for `chartMenuItems`. */
export interface ChartMenuItemsContext {
  /** The part of the chart right-clicked, or `'priceAxisAdd'` for the "+" by the price axis. */
  area: import('@tradecanvas/commons').ChartContextArea | 'priceAxisAdd';
  /** The price there, on the price pane and the price axis. */
  price?: number;
  /** The time there, on the plot and the time axis (ms). */
  time?: number;
}

/** The drawing a menu opened on, for `drawingMenuItems`. */
export interface DrawingMenuItemsContext {
  /** The drawing right-clicked. */
  id: string;
  type: DrawingToolType;
  /** The selection it is part of (itself, its group or a wider selection). */
  selected: readonly string[];
}

/** The indicator a menu opened on, for `indicatorMenuItems`. */
export interface IndicatorMenuItemsContext {
  /** The instance on the chart (`'tc_rsi_1'`, say). */
  instanceId: string;
  /** Its kind (`'rsi'`). */
  indicatorId: string;
}

/** An entry of yours in a widget menu. */
export interface WidgetMenuItem {
  label: string;
  /** A built-in icon's name (see the docs' icon list). */
  icon?: string;
  /** Shown in red, for something that removes. */
  danger?: boolean;
  /** Makes it a switch, ticked when `true`. */
  checked?: boolean;
  onSelect: () => void;
}

/** A button of yours on the widget's toolbar; see `ChartWidget.addToolbarButton`. */
export interface ToolbarButtonSpec {
  /** Tells your buttons apart (`data-host-button` on the element). */
  id: string;
  /** Its accessible name and tooltip. */
  label: string;
  /** A built-in icon's name, or an element of your own (an `<svg>`, say). */
  icon?: string | Element;
  /** Text after the icon. Without an icon or text the label shows. */
  text?: string;
  /** With the chart controls on the left, or the panel buttons on the right. Default `'right'`. */
  side?: 'left' | 'right';
  /** A switch that shows pressed while on (see `setActive`). */
  toggle?: boolean;
  onClick: (button: HTMLButtonElement) => void;
}

export interface ToolbarButtonHandle {
  readonly element: HTMLButtonElement;
  /** Show a `toggle` button as on or off. */
  setActive(on: boolean): void;
  setText(text: string): void;
  remove(): void;
}

/** A keyboard shortcut of yours; see `ChartWidget.addHotkey`. */
export interface HotkeySpec {
  /** `'Alt+N'`, `'Shift+R'`, `'Ctrl+Shift+K'` (Ctrl is Cmd on a Mac) or one key (`'F2'`). */
  keys: string;
  /** What it does, in the shortcut sheet (`?`). */
  label: string;
  onPress: (event: KeyboardEvent) => void;
}

export interface HotkeyHandle {
  remove(): void;
}

/** A menu button of yours on the widget's toolbar; see `ChartWidget.addToolbarDropdown`. */
export interface ToolbarDropdownSpec {
  /** Tells your buttons apart (`data-host-button` on the element). */
  id: string;
  /** Its accessible name and tooltip, and its text without an icon or `text`. */
  label: string;
  /** A built-in icon's name, or an element of your own. */
  icon?: string | Element;
  /** Text after the icon. */
  text?: string;
  /** With the chart controls on the left, or the panel buttons on the right. Default `'right'`. */
  side?: 'left' | 'right';
  /** The menu's entries, asked for each time it opens. */
  items: () => readonly WidgetMenuItem[];
}

export interface ToolbarDropdownHandle {
  readonly element: HTMLButtonElement;
  setText(text: string): void;
  remove(): void;
}

/** A button of yours on the drawing sidebar; see `ChartWidget.addSidebarButton`. */
export interface SidebarButtonSpec {
  /** Tells your buttons apart (`data-host-button` on the element). */
  id: string;
  /** Its accessible name and tooltip. */
  label: string;
  /** A built-in icon's name, or an element of your own (an `<svg>`, say). */
  icon: string | Element;
  /** A switch that shows pressed while on (see `setActive`). */
  toggle?: boolean;
  onClick: (button: HTMLButtonElement) => void;
}

export interface SidebarButtonHandle {
  readonly element: HTMLButtonElement;
  /** Show a `toggle` button as on or off. */
  setActive(on: boolean): void;
  remove(): void;
}

/** An item of yours on the status bar; see `ChartWidget.addStatusBarItem`. */
export interface StatusBarItemSpec {
  /** Tells your items apart (`data-host-item` on the element). */
  id: string;
  text: string;
  /** Its tooltip, and its accessible name with the text. */
  label?: string;
  /** After the range presets on the left, or before the market's status on the right. Default `'right'`. */
  side?: 'left' | 'right';
  /** Makes it a button. */
  onClick?: (item: HTMLButtonElement) => void;
}

export interface StatusBarItemHandle {
  readonly element: HTMLElement;
  setText(text: string): void;
  remove(): void;
}

/**
 * Places for anything of yours (`ChartWidget.getSlot`): beside the toolbar's
 * chart controls or its panel buttons, under the drawing sidebar's switches,
 * on the status bar's left or right, or over the chart (a layer that lets
 * the pointer through; give your elements `pointer-events: auto`).
 */
export type WidgetSlot = 'toolbar.left' | 'toolbar.right' | 'sidebar' | 'statusBar.left' | 'statusBar.right' | 'chart';

export interface WidgetLayoutsOptions {
  /** Where the layouts are kept: your server, say. Default: `localStorageLayouts()`. */
  storage?: import('../state/layoutStorage.js').LayoutStorage;
  /** Save the open layout by itself as it changes. Default `true`. */
  autoSave?: boolean;
  /** How long changes settle before an auto-save. Default 1500 ms. */
  debounceMs?: number;
  /** Open the layout saved last when the widget starts. Default `false`. */
  openLast?: boolean;
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
  /** The symbol info button: shown only when given. */
  onSymbolInfo?: () => void;
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
  onToggleAccount?: () => void;
  /** The layouts button was pressed: open its menu under it. */
  onLayouts?: (anchor: HTMLElement) => void;
  /** Indicator templates in the indicators menu: apply, save the chart's, delete. */
  onApplyIndicatorTemplate?: (name: string) => void;
  onSaveIndicatorTemplate?: () => void;
  onDeleteIndicatorTemplate?: (name: string) => void;
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

/** Style keys to set on the user's layer; null takes one away (back to the theme's, or the part's own). */
export type SettingsStylePatch = import('@tradecanvas/commons').ChartStyleOverridesPatch;

export interface SettingsCallbacks {
  onChange: (patch: Partial<ChartSettingsState>) => void;
  /** What a style key reads back now (null: not set, left to the part itself). */
  styleValue: (key: import('@tradecanvas/commons').ChartStyleKey) => string | number | boolean | null;
  onStyleChange: (patch: SettingsStylePatch) => void;
  onReset: () => void;
  onClose: () => void;
}

/** The settings that aren't the look: the look (colours, lines, dashes) is the chart's style keys, on the user's layer. */
export interface ChartSettingsState {
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
  /** Lines at the highest high and lowest low on screen. */
  highLowLines: boolean;
  /** The main series (bars, candles, line) shown. */
  mainSeriesVisible: boolean;
  /** Bars outside the symbol's regular hours shown (pre- and post-market). */
  extendedHours: boolean;
  /** Renko box, Line Break lines, Kagi reversal, Point & Figure box and reversal, range. */
  chartTypeOptions: ChartTypeOptions;
}

export interface IndicatorDef {
  id: string;
  name: string;
  type: 'overlay' | 'panel';
}

export interface DrawingToolGroupDef {
  label: string;
  tools: { label: string; value: DrawingToolType }[];
  /**
   * Groups with the same section sit together in the sidebar, with a divider
   * between one section and the next. Groups without one get no divider.
   */
  section?: string;
}


