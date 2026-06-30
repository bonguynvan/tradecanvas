export { Chart } from './Chart.js';
export { DataManager } from './DataManager.js';
export { ThemeManager } from './ThemeManager.js';
export { LayoutManager } from './layout/LayoutManager.js';
export * from './plugins/index.js';
export { parseOHLCV, DragDropImporter } from './io/index.js';
export type { ParseResult, DragDropImporterCallbacks } from './io/index.js';

// Re-export commonly used types from commons
export type {
  OHLCBar,
  DataSeries,
  TimeFrame,
  ChartOptions,
  ChartType,
  Theme,
  ThemeName,
  ChartEventType,
  ChartEvent,
  ChartEventMap,
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  TauriBridgeOptions,
  ViewportState,
  CrosshairMovePayload,
  BarClickPayload,
  VisibleRangeChangePayload,
  OrderModifyPayload,
  OrderCancelPayload,
  PositionModifyPayload,
  PositionClosePayload,
  OrderPlacePayload,
  IndicatorChangePayload,
  ThemeChangePayload,
  ResizePayload,
  ZoomChangePayload,
  PriceRangeChangePayload,
  DrawingCreatePayload,
  DrawingRemovePayload,
  SignalMarkerAddPayload,
  SignalMarkerRemovePayload,
  TradeZoneAddPayload,
  TradeZoneRemovePayload,
  DrawingToolType,
  DrawingState,
  DrawingStyle,
  DrawingPlugin,
  DrawingDescriptor,
  FeaturesConfig,
  SessionBreakOptions,
  PriceAxisOptions,
  TimeAxisOptions,
  AnchorPoint,
  PanelPosition,
  PanelConfig,
  ResolvedLayout,
  TradingOrder,
  TradingPosition,
  DepthData,
  DepthLevel,
  TradingConfig,
  OrderSide,
  OrderType,
  OrderStatus,
  OrderLabel,
  OrderPlaceIntent,
  OrderModifyIntent,
  OrderCancelIntent,
  PositionModifyIntent,
  PositionCloseIntent,
  ExecutionAdapter,
  ExecutionConfig,
  ExecutionEvent,
  ExecutionEventType,
  ExecutionListener,
  FillEvent,
  ExecutionError,
  Locale,
  LocaleStrings,
  MarketConfig,
  MarketType,
  StockExchange,
  MarketColorScheme,
  TradingSession,
  PriceLimitInfo,
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  StreamConfig,
  ConnectionState,
  ConnectionInfo,
  RawTick,
  AggregatedBar,
  ReconnectConfig,
  ResolvedIndicatorStyle,
  WatermarkConfig,
  GridOptions,
  CrosshairOptions,
  SignalMarker,
  SignalDirection,
  SignalMarkerStyle,
  TradeZone,
  TradeZoneDirection,
  TradeZoneStyle,
} from '@tradecanvas/commons';

// Re-export themes and defaults
export {
  DARK_THEME, LIGHT_THEME, DARK_TERMINAL, DEFAULT_DRAWING_STYLE, DEFAULT_TRADING_CONFIG,
  DEFAULT_SIGNAL_STYLE, DEFAULT_TRADE_ZONE_STYLE,
  TIMEFRAMES_CRYPTO, TIMEFRAMES_STOCK, TIMEFRAMES_FOREX, DEFAULT_TIMEFRAME_FAVORITES,
} from '@tradecanvas/commons';

// Re-export data utilities
export { normalizeBarTime, normalizeBar } from '@tradecanvas/commons';

// Re-export i18n
export { setLocale, getLocale, t, registerLocale, formatNumber, formatVND, formatVolumeLoc } from '@tradecanvas/commons';

// Re-export market presets
export {
  MARKET_HOSE, MARKET_HNX, MARKET_UPCOM, MARKET_CRYPTO, MARKET_NYSE,
  VN_COLORS, createVNTheme, computePriceLimits, getCurrentSession,
} from '@tradecanvas/commons';

// Re-export base classes for custom indicators and drawing tools
export { IndicatorBase, DrawingBase } from '@tradecanvas/core';

// Re-export realtime module
export { StreamManager, BinanceAdapter, MockAdapter, TickAggregator, CurrentPriceLine, PaperExecutionAdapter, WebSocketAdapter, PollingAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter } from '@tradecanvas/core';
export type { PaperExecutionOptions, WebSocketAdapterOptions, WsParseResult, PollingAdapterOptions, CoinbaseAdapterOptions, BybitAdapterOptions, KrakenAdapterOptions } from '@tradecanvas/core';
export { DEFAULT_RECONNECT, DEFAULT_STREAM_CONFIG } from '@tradecanvas/commons';

// Re-export UI
export { ChartLegend, Screenshot, Watermark, BarCountdown, SessionBreaks, DEFAULT_LEGEND_CONFIG } from '@tradecanvas/core';
export type { LegendConfig, SessionBreakConfig } from '@tradecanvas/core';

// Re-export chart renderers and transforms
export { VolumeRenderer, CompareRenderer } from '@tradecanvas/core';
export { lttbDownsample, lttbVisibleIndices } from '@tradecanvas/core';
export type { CompareSymbol } from '@tradecanvas/core';
export { toHeikinAshi, toRenko, toLineBreak, toKagi, toPointAndFigure, toRangeBars } from '@tradecanvas/core';

// Re-export data export
export { DataExporter } from '@tradecanvas/core';

// Re-export features
export { AlertManager, ReplayManager, ChartStateManager, UndoRedoManager, SignalMarkerManager, TradeZoneManager } from '@tradecanvas/core';
export type { PriceAlert, AlertCondition, ReplayConfig, ChartSnapshot, UndoableAction } from '@tradecanvas/core';

// Re-export animation
export { Animator, Easing } from '@tradecanvas/core';
export type { EasingFn, AnimationOptions } from '@tradecanvas/core';

// Re-export interaction
export { KeyboardHandler, CrosshairTooltip } from '@tradecanvas/core';

// Multi-chart grid
export { ChartGrid } from './grid/ChartGrid.js';
export type { GridLayout, GridCellConfig, ChartGridOptions } from './grid/ChartGrid.js';

// Finance charts
export { SparklineChart, DepthChart, EquityCurveChart, HeatmapChart, WaterfallChart, GaugeChart, PerformanceDashboard } from './finance/index.js';
export {
  toEquityPoints,
  computeDrawdownCurve,
  computeMonthlyReturns,
  selectKeyStats,
} from './finance/index.js';
export type {
  PerformanceDashboardOptions,
  PerformanceResult,
  EquitySample,
  RiskMetricsLike,
  DashboardStat,
} from './finance/index.js';
export type {
  BaseFinanceChartOptions,
  SparklineOptions,
  DepthChartOptions,
  EquityPoint,
  EquityCurveOptions,
  HeatmapCell,
  HeatmapOptions,
  WaterfallBar,
  WaterfallOptions,
  GaugeZone,
  GaugeOptions,
} from '@tradecanvas/commons';
