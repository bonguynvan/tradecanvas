export type Locale = 'en' | 'vi' | 'zh' | 'ja' | 'ko' | 'th' | string;

export interface LocaleStrings {
  // Chart types
  candlestick: string;
  line: string;
  area: string;
  bar: string;

  // Axes
  price: string;
  volume: string;
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;

  // Indicators - overlays
  sma: string;
  ema: string;
  bollingerBands: string;
  vwap: string;
  ichimoku: string;
  parabolicSAR: string;
  supertrend: string;
  keltnerChannel: string;
  donchianChannel: string;

  // Indicators - panels
  rsi: string;
  macd: string;
  stochastic: string;
  atr: string;
  adx: string;
  obv: string;
  williamsR: string;
  cci: string;
  mfi: string;
  aroon: string;
  roc: string;
  tsi: string;
  cmf: string;
  stddev: string;
  volumeProfile: string;
  accumulationDistribution: string;
  vroc: string;

  // Drawing tools
  trendLine: string;
  horizontalLine: string;
  verticalLine: string;
  ray: string;
  extendedLine: string;
  parallelChannel: string;
  regressionChannel: string;
  fibRetracement: string;
  fibExtension: string;
  rectangle: string;
  ellipse: string;
  triangle: string;
  pitchfork: string;
  elliottWave: string;
  priceRange: string;
  dateRange: string;
  measure: string;
  textTool: string;
  arrow: string;
  clearAll: string;

  // Trading
  buy: string;
  sell: string;
  buyLimit: string;
  sellLimit: string;
  buyStop: string;
  sellStop: string;
  stopLoss: string;
  takeProfit: string;
  market: string;
  limit: string;
  stop: string;
  cancel: string;
  modify: string;
  quantity: string;
  pnl: string;
  activeOrders: string;
  positions: string;
  noOrders: string;
  noPositions: string;
  placeOrder: string;
  rightClickToTrade: string;

  // Market
  ceiling: string;
  floor: string;
  reference: string;
  session: string;
  preOpen: string;
  continuous: string;
  preClose: string;
  closed: string;

  // UI
  settings: string;
  theme: string;
  darkTheme: string;
  lightTheme: string;
  tools: string;
  indicators: string;
  overlays: string;
  panels: string;
  orders: string;
  autoScale: string;
  crosshair: string;
  grid: string;
  loading: string;
  error: string;

  // Number formatting
  numberDecimalSeparator: string;
  numberGroupSeparator: string;
}

export interface NumberFormatConfig {
  decimalSeparator: string;
  groupSeparator: string;
  groupSize: number;
}

export interface DateFormatConfig {
  locale: string;
  dateStyle?: 'short' | 'medium' | 'long';
  timeStyle?: 'short' | 'medium';
}
