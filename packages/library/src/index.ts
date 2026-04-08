export { Chart } from './Chart.js';
export { DataManager } from './DataManager.js';
export { ThemeManager } from './ThemeManager.js';
export { LayoutManager } from './layout/LayoutManager.js';
export { PluginManager } from './plugins/PluginManager.js';

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
  IndicatorPlugin,
  IndicatorDescriptor,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  TauriBridgeOptions,
  ViewportState,
  CrosshairMovePayload,
  BarClickPayload,
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
} from '@chart-lib/commons';

// Re-export themes and defaults
export {
  DARK_THEME, LIGHT_THEME, DEFAULT_DRAWING_STYLE, DEFAULT_TRADING_CONFIG,
  TIMEFRAMES_CRYPTO, TIMEFRAMES_STOCK, TIMEFRAMES_FOREX, DEFAULT_TIMEFRAME_FAVORITES,
} from '@chart-lib/commons';

// Re-export i18n
export { setLocale, getLocale, t, registerLocale, formatNumber, formatVND, formatVolumeLoc } from '@chart-lib/commons';

// Re-export market presets
export {
  MARKET_HOSE, MARKET_HNX, MARKET_UPCOM, MARKET_CRYPTO, MARKET_NYSE,
  VN_COLORS, createVNTheme, computePriceLimits, getCurrentSession,
} from '@chart-lib/commons';

// Re-export base classes for custom indicators and drawing tools
export { IndicatorBase, DrawingBase } from '@chart-lib/core';

// Re-export realtime module
export { StreamManager, BinanceAdapter, MockAdapter, TickAggregator, CurrentPriceLine } from '@chart-lib/core';
export { DEFAULT_RECONNECT, DEFAULT_STREAM_CONFIG } from '@chart-lib/commons';

// Re-export UI
export { ChartLegend, Screenshot, Watermark, BarCountdown, SessionBreaks, DEFAULT_LEGEND_CONFIG } from '@chart-lib/core';
export type { LegendConfig, SessionBreakConfig } from '@chart-lib/core';

// Re-export chart renderers and transforms
export { VolumeRenderer, CompareRenderer } from '@chart-lib/core';
export type { CompareSymbol } from '@chart-lib/core';
export { toHeikinAshi, toRenko, toLineBreak, toKagi, toPointAndFigure } from '@chart-lib/core';

// Re-export data export
export { DataExporter } from '@chart-lib/core';

// Re-export features
export { AlertManager, ReplayManager, ChartStateManager, UndoRedoManager } from '@chart-lib/core';
export type { PriceAlert, AlertCondition, ReplayConfig, ChartSnapshot, UndoableAction } from '@chart-lib/core';

// Re-export animation
export { Animator, Easing } from '@chart-lib/core';
export type { EasingFn, AnimationOptions } from '@chart-lib/core';

// Re-export interaction
export { KeyboardHandler, CrosshairTooltip } from '@chart-lib/core';
