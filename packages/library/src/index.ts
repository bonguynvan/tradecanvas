export { Chart } from './Chart.js';
export { syncIndicators } from './frameworks/syncIndicators.js';
export type { IndicatorSpec, IndicatorHost } from './frameworks/syncIndicators.js';
export { feedBars, CORRECTABLE_BARS } from './frameworks/feedBars.js';
export type { BarFeedHost, FedBars } from './frameworks/feedBars.js';
export { DataManager } from './DataManager.js';
export { HISTORY_RETRY_MS, DEFAULT_HISTORY_PAGE_SIZE } from './HistoryPager.js';
export type { HistoryLoader } from './HistoryPager.js';
export { ThemeManager } from './ThemeManager.js';
export * from './brand/index.js';
export { LayoutManager } from './layout/LayoutManager.js';
export * from './plugins/index.js';
export { parseOHLCV, DragDropImporter } from './io/index.js';
export type { ParseResult, DragDropImporterCallbacks } from './io/index.js';

// Re-export commonly used types from commons
export type {
  OHLCBar,
  DataSeries,
  FootprintBar,
  FootprintLevel,
  FootprintOptions,
  FootprintCells,
  TimeFrame,
  ChartOptions,
  BarLayout,
  ChartDensity,
  ChartSpacing,
  FontConfig,
  ChartType,
  Theme,
  ThemeName,
  ChartEventType,
  ChartEvent,
  ChartEventMap,
  IndicatorPlugin,
  IndicatorRenderContext,
  IndicatorLayer,
  IndicatorDescriptor,
  IndicatorConfig,
  IndicatorOutput,
  IndicatorValue,
  BuiltInIndicators,
  BuiltInIndicatorId,
  IndicatorId,
  IndicatorParamsFor,
  IndicatorParamValues,
  NumberParam,
  TauriBridgeOptions,
  ViewportState,
  CrosshairMovePayload,
  CrosshairSyncPayload,
  BarClickPayload,
  VisibleRangeChangePayload,
  OrderModifyPayload,
  OrderCancelPayload,
  PositionModifyPayload,
  PositionClosePayload,
  OrderPlacePayload,
  IndicatorChangePayload,
  ThemeChangePayload,
  StyleChangePayload,
  ResizePayload,
  ZoomChangePayload,
  PriceRangeChangePayload,
  DrawingCreatePayload,
  DrawingRemovePayload,
  SignalMarkerAddPayload,
  ChartContextArea,
  ChartContextMenuPayload,
  PriceAxisAddPayload,
  SignalMarkerRemovePayload,
  TradeZoneAddPayload,
  TradeZoneRemovePayload,
  DrawingToolType,
  BuiltInDrawingToolType,
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
  DepthOverlayConfig,
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
  PositionReverseIntent,
  TimeInForce,
  FillReason,
  MarginCall,
  ExecutionAdapter,
  OrderContext,
  ExecutionConfig,
  ExecutionEvent,
  ExecutionEventType,
  ExecutionListener,
  FillEvent,
  AccountSummary,
  TakeProfitLevel,
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
  DataFeed,
  BarsRequest,
  BarsSubscription,
  FeedSubscriber,
  StreamConfig,
  ConnectionState,
  ConnectionInfo,
  RawTick,
  AggregatedBar,
  ReconnectConfig,
  ResolvedIndicatorStyle,
  IndicatorStyleConfig,
  IndicatorPlotStyle,
  IndicatorIntervals,
  IntervalUnit,
  IndicatorCategory,
  IndicatorGroup,
  ChartStyleKey,
  ChartStyleOverrides,
  ChartStyleOverridesPatch,
  ResolvedChartStyle,
  ResolvedLineLook,
  StyleLayer,
  StyleValueKind,
  PaneStyle,
  WatermarkConfig,
  GridOptions,
  CrosshairOptions,
  SignalMarker,
  SignalDirection,
  SignalMarkerStyle,
  TradeZone,
  TradeZoneDirection,
  TradeZoneStyle,
  CandlePatternInfo,
  CandlePatternMatch,
  CandlePatternOptions,
  CandlePatternDirection,
  CandlePatternKind,
} from '@tradecanvas/commons';
export { detectCandlePatterns, CANDLE_PATTERNS } from '@tradecanvas/core';
export { detectFairValueGaps } from '@tradecanvas/core';
export type { FairValueGap, FairValueGapOptions } from '@tradecanvas/core';
export { detectDivergences } from '@tradecanvas/core';
export type { Divergence, DivergenceOptions } from '@tradecanvas/core';
export { sessionVolumeProfiles } from '@tradecanvas/core';
export type { SessionVolumeProfile, SessionVolumeProfileOptions } from '@tradecanvas/core';
export { detectOrderBlocks } from '@tradecanvas/core';
export type { OrderBlock, OrderBlockOptions } from '@tradecanvas/core';

// Re-export themes and defaults
export {
  DARK_THEME, LIGHT_THEME, GRAPHITE_DARK_THEME, GRAPHITE_LIGHT_THEME, MODERN_DARK_THEME, MODERN_LIGHT_THEME, DARK_TERMINAL, DARK_PRICE_LIMITS, LIGHT_PRICE_LIMITS, TC_PALETTE, TC_SERIES_COLORS, volumeColor, VOLUME_ALPHA, CHART_STYLE_KEYS,
  MONO_FONT_FAMILY, FIGURES_FONT_FAMILY, SANS_FONT_FAMILY, CHART_SPACING,
  DEFAULT_DRAWING_STYLE, DEFAULT_TRADING_CONFIG,
  DEFAULT_SIGNAL_STYLE, DEFAULT_TRADE_ZONE_STYLE,
  TIMEFRAMES_CRYPTO, TIMEFRAMES_STOCK, TIMEFRAMES_FOREX, DEFAULT_TIMEFRAME_FAVORITES,
} from '@tradecanvas/commons';

// Re-export data utilities
export { normalizeBarTime, normalizeBar, barsAreDaily, barTimeUnit, MS_TIME_THRESHOLD, barDelta, buyVolumeOf } from '@tradecanvas/commons';
export { tradingDayStart } from '@tradecanvas/commons';
export type { BarTimeUnit } from '@tradecanvas/commons';

// The footprint chart's data: rows from trades, a bar's sums, and where one side outdid the other
export { autoFootprintRow, footprintImbalances, footprintOf, footprintStats } from '@tradecanvas/core';
export type { FootprintImbalance, FootprintStats } from '@tradecanvas/core';

// Timeframes of any length, resampling, and display time zones
export {
  parseTimeframe, isTimeFrame, timeframeToMs, timeframeBucketStart, resampleBars, pickBaseTimeframe,
  isValidTimeZone, zoneOffsetMinutes, offsetAt, wallToUtc,
} from '@tradecanvas/commons';
export type { KnownTimeFrame, TimeFrameUnit, BucketOptions, TimeZoneSetting, HistoryLoadPayload, ReplayStepsLoadPayload, DataUpdatePayload, OverlayScale } from '@tradecanvas/commons';

// Symbol search and what a feed knows about a symbol
export { rankSymbols, stepDecimals, tickerOf } from '@tradecanvas/commons';
export { formatFraction, fractionTick, priceFormatterFor, quantityText, orderQuantityText } from '@tradecanvas/commons';
export type { PriceFormatter, PriceFraction, TimeFormatter, TimeFormatContext } from '@tradecanvas/commons';
export type { SymbolInfo, SymbolSession, SymbolSearchOptions } from '@tradecanvas/commons';
export type { ShapeConfig, PriceLimitColors } from '@tradecanvas/commons';
// Colour contrast, for a theme of your own: how two colours read, and a shade that reads.
export { contrastRatio, readableOn, inkOn } from '@tradecanvas/commons';
export { readQuote, readNews, marketStatus, symbolTimeZone, tickBarCount } from '@tradecanvas/commons';
export type { Quote, QuoteSource, NewsItem, Trade, MarketStatus, ChartA11yLabels } from '@tradecanvas/commons';
// Marks: what happened at a time (chart.setMarks), and a feed's list read as untrusted input.
export { readChartMarks, MAX_CHART_MARKS } from '@tradecanvas/commons';
export type { ChartMark, ChartMarkKind } from '@tradecanvas/commons';
export { EXCHANGE_TIME_ZONE } from './Chart.js';

// Indicator sources: a price, or another indicator's line (`ind:<instanceId>:<key>`)
export { PRICE_SOURCES, isPriceSource, sourcePrice, indicatorSource, parseIndicatorSource } from '@tradecanvas/commons';
export type {
  PriceSource,
  IndicatorPlot,
  IndicatorPlotKind,
  IndicatorMarkerShape,
  IndicatorMarkerPosition,
  IndicatorFill,
  IndicatorScale,
  IndicatorInputSpec,
  IndicatorInputOption,
  IndicatorInputKind,
  IndicatorSettingsChangePayload,
} from '@tradecanvas/commons';

// Re-export i18n
export { setLocale, getLocale, t, registerLocale, formatNumber, formatVND, formatVolumeLoc, usesKoreanUnits } from '@tradecanvas/commons';

// Re-export market presets
export {
  MARKET_HOSE, MARKET_HOSE_ETF, MARKET_HNX, MARKET_UPCOM, MARKET_VN30F, MARKET_CRYPTO, MARKET_NYSE,
  MARKET_KRX, MARKET_NXT, MARKET_UPBIT_KRW,
  HOSE_SESSIONS, HNX_SESSIONS, UPCOM_SESSIONS, VN30F_SESSIONS, KRX_SESSIONS, NXT_SESSIONS,
  VN_COLORS, KR_COLORS, createVNTheme, createMarketTheme, computePriceLimits, getCurrentSession,
  priceStepAt, roundToPriceStep, scaleMarketPrices, vn30fLastTradingDay, vn30fContracts,
} from '@tradecanvas/commons';
export type { PriceStepBand, VN30FContract } from '@tradecanvas/commons';

// Re-export base classes for custom indicators and drawing tools
export { IndicatorBase, IndicatorValueMap, DrawingBase, indicatorCategory, indicatorGroup, INDICATOR_CATEGORIES, describeInputs } from '@tradecanvas/core';
// An indicator from its inputs and one function of the bars, and the sums it is made of.
export { defineIndicator, ta } from '@tradecanvas/core';
export type { DefinedIndicatorInput, IndicatorBars, IndicatorCalculation, IndicatorDefinition, IndicatorInputValue, IndicatorLine, InputsOf, Ta, TaBars, TaInput, TaSeries } from '@tradecanvas/core';
export type { IndicatorInputInfo } from '@tradecanvas/core';
// The trade a Long/Short Position drawing stands for, for an app that places an order from it.
export { positionLevels } from '@tradecanvas/core';
// The trading activity log's lines (`chart.getActivityLog()`).
export type { ActivityEntry, ActivityKind } from './model/ActivityLog.js';
// A bracket being placed (`chart.getBracket()`), what sizes it, and the quantity a size gives it.
export { bracketQuantity } from '@tradecanvas/core';
export type { BracketDraft, BracketSize } from '@tradecanvas/core';
export type { PositionLevels } from '@tradecanvas/core';
// Screen geometry of a frame, for plugins that draw (indicators, overlays, chart types).
export { barIndexToX, xToBarIndex, priceToY, priceToYMapper, yToPrice, timeToX, xToTime, timestampToBarIndex } from '@tradecanvas/core';

// Re-export realtime module
export { StreamManager, ReconnectManager, ReplayController, BinanceAdapter, MockAdapter, TickAggregator, CurrentPriceLine, PaperExecutionAdapter, WebSocketAdapter, PollingAdapter, CoinbaseAdapter, BybitAdapter, KrakenAdapter, UpbitAdapter, ResamplingAdapter, ManualFeed, adapterFromFeed, feedFromAdapter, isDataFeed, withResampling, servesTimeframe, KEPT_BUCKETS, TickBarBuilder, TickBarAdapter, withTickBars } from '@tradecanvas/core';
export type { ReplayBarEvent, ReplayEventMap, ReplayOptions, ReplayStateChangeEvent, ReplayStatus } from '@tradecanvas/core';
export type { PaperExecutionOptions, PaperCommission, WebSocketAdapterOptions, WsParseResult, PollingAdapterOptions, CoinbaseAdapterOptions, BybitAdapterOptions, KrakenAdapterOptions, UpbitAdapterOptions } from '@tradecanvas/core';
export { DEFAULT_RECONNECT, DEFAULT_STREAM_CONFIG } from '@tradecanvas/commons';
// Datafeeds written for the callback-style JS API, and UDF servers, as a DataFeed
export { feedFromJsApi, udfFeed, sessionsFromJsApi, symbolInfoFromJsApi } from '@tradecanvas/core';
export type {
  JsApiFeed,
  JsApiFeedOptions,
  UdfFeedOptions,
  JsApiDatafeed,
  JsApiConfiguration,
  JsApiSymbolInfo,
  JsApiSearchResult,
  JsApiBar,
  JsApiPeriodParams,
  JsApiHistoryMetadata,
  JsApiQuoteData,
} from '@tradecanvas/core';
export { resolutionToTimeframe, timeframeToResolution } from '@tradecanvas/commons';

// Re-export UI
export { ChartLegend, Screenshot, Watermark, BarCountdown, SessionBreaks, SessionShading, DEFAULT_LEGEND_CONFIG, DEFAULT_SESSION_HOURS } from '@tradecanvas/core';
export type { LegendConfig, SessionBreakConfig, SessionHoursConfig, SessionWindow } from '@tradecanvas/core';

// Re-export chart renderers and transforms
export { VolumeRenderer, CompareRenderer } from '@tradecanvas/core';
// How many charts on the page draw with WebGL at once.
export { setMaxWebGLCharts, DEFAULT_MAX_WEBGL_CHARTS } from '@tradecanvas/core';
export { lttbDownsample, lttbVisibleIndices } from '@tradecanvas/core';
export type { CompareSymbol, CompareValue, DepthHeatmapConfig, MarketProfileConfig, PivotMarkersConfig } from '@tradecanvas/core';
export { toHeikinAshi, toRenko, toLineBreak, toKagi, toPointAndFigure, toRangeBars, ReshapeMemo, axisTimes } from '@tradecanvas/core';

// Re-export data export
export { DataExporter } from '@tradecanvas/core';
export { RANGE_PRESETS, rangePresetStart } from '@tradecanvas/core';
export type { RangePreset } from '@tradecanvas/core';

// Re-export features
export { AlertManager, ReplayManager, ChartStateManager, UndoRedoManager, SignalMarkerManager, TradeZoneManager } from '@tradecanvas/core';
export type { PriceAlert, AlertCondition, AlertOptions, ReplayConfig, ChartSnapshot, UndoableAction } from '@tradecanvas/core';
export { isPriceLevelAlert, MAX_ALERT_BARS, MIN_ALERT_BARS } from '@tradecanvas/core';

// Re-export animation
export { Animator, Easing } from '@tradecanvas/core';
export type { EasingFn, AnimationOptions } from '@tradecanvas/core';

// Re-export interaction
export { KeyboardHandler, CrosshairTooltip, formatTooltipTime } from '@tradecanvas/core';
export type { CrosshairTooltipContext } from '@tradecanvas/core';

// Multi-chart grid
export { ChartGrid } from './grid/ChartGrid.js';
export { LayoutSession, cleanLayoutName, MAX_LAYOUT_NAME } from './state/LayoutSession.js';
export type { LayoutSessionHost, LayoutSessionOptions } from './state/LayoutSession.js';
export { localStorageLayouts, memoryLayouts } from './state/layoutStorage.js';
export type { LayoutStorage, SavedLayout, SavedLayoutSummary } from './state/layoutStorage.js';
export type { GridLayout, GridArea, GridShape, GridCellConfig, ChartGridOptions } from './grid/ChartGrid.js';

// Finance charts
export { SparklineChart, DepthChart, EquityCurveChart, HeatmapChart, WaterfallChart, GaugeChart, PerformanceDashboard, BarChart, DonutChart, ScatterChart, HistogramChart, CalendarChart, MatrixChart, CounterClockChart, PayoffChart, CurveChart, BoxPlotChart, RadarChart, SunburstChart, StackedAreaChart, SurfaceChart, Bar3DChart } from './finance/index.js';
export { histogramBins, niceScale, correlationMatrix, counterClockPoints, counterClockPhase, optionPayoff, payoffStats, optionPrice, positionValue, curveValueAt, boxPlotStats, depthSurface, renderFinanceChart, FINANCE_CHART_KINDS, imagesToPdf } from '@tradecanvas/core';
export type { PdfImage } from '@tradecanvas/core';
export { chartsToPdf } from './chartsToPdf.js';
export type { PdfPageSource } from './chartsToPdf.js';
export { renderPriceChart } from './static/renderPriceChart.js';
export type { PayoffStats, OptionTerms } from '@tradecanvas/core';
export {
  toEquityPoints,
  computeDrawdownCurve,
  computeMonthlyReturns,
  selectKeyStats,
  DEFAULT_DASHBOARD_LABELS,
} from './finance/index.js';
export type {
  PerformanceDashboardOptions,
  PerformanceResult,
  EquitySample,
  RiskMetricsLike,
  DashboardStat,
  DashboardLabels,
} from './finance/index.js';
export type {
  BaseFinanceChartOptions,
  OptionLeg,
  PayoffModel,
  PayoffOptions,
  RadarAxisHit,
  CurvePoint,
  CurveSeries,
  CurveMarker,
  CurveChartOptions,
  BoxPlotStats,
  BoxPlotGroup,
  BoxPlotLabels,
  BoxPlotOptions,
  RadarAxis,
  RadarChartOptions,
  SunburstNode,
  SunburstOptions,
  StackedAreaOptions,
  View3D,
  ColorRamp,
  Chart3DOptions,
  SurfacePoint,
  SurfaceChartOptions,
  Bar3DChartOptions,
  DepthSnapshot,
  DepthSurface,
  FinanceChartKind,
  FinanceChartOptionsMap,
  ChartImageOptions,
  PriceChartOptions,
  PriceChartIndicator,
  PriceChartFeatures,
  ChartPrintOptions,
  ChartPdfOptions,
  PdfPageOptions,
  SparklineOptions,
  DepthChartOptions,
  EquityPoint,
  EquityCurveOptions,
  EquityLevel,
  EquityBand,
  HeatmapCell,
  HeatmapOptions,
  WaterfallBar,
  WaterfallOptions,
  GaugeZone,
  GaugeOptions,
  ChartSeries,
  BarHit,
  BarChartOptions,
  DonutSlice,
  DonutChartOptions,
  ScatterPoint,
  ScatterSeries,
  ScatterChartOptions,
  HistogramMarker,
  HistogramBin,
  HistogramOptions,
  ColorScale,
  CalendarDay,
  CalendarChartOptions,
  MatrixCell,
  MatrixChartOptions,
  CounterClockPoint,
  CounterClockOptions,
} from '@tradecanvas/commons';
