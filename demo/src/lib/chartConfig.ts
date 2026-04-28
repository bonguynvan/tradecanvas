import type { ChartType, DrawingToolType, TimeFrame } from '@tradecanvas/chart';

export const TIMEFRAMES: { label: string; value: TimeFrame }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
];

export const CHART_TYPES: { label: string; value: ChartType }[] = [
  { label: 'Candlestick', value: 'candlestick' },
  { label: 'Line', value: 'line' },
  { label: 'Area', value: 'area' },
  { label: 'Bar', value: 'bar' },
  { label: 'Heikin-Ashi', value: 'heikinAshi' },
  { label: 'Hollow Candle', value: 'hollowCandle' },
  { label: 'Baseline', value: 'baseline' },
  { label: 'Renko', value: 'renko' },
  { label: 'Kagi', value: 'kagi' },
  { label: 'Line Break', value: 'lineBreak' },
  { label: 'Point & Figure', value: 'pointAndFigure' },
  { label: 'Range Bars', value: 'rangeBars' },
];

export interface DrawingToolGroupDef {
  label: string;
  tools: { label: string; value: DrawingToolType }[];
}

export const DRAWING_TOOL_GROUPS: DrawingToolGroupDef[] = [
  {
    label: 'Lines',
    tools: [
      { label: 'Trend Line', value: 'trendLine' },
      { label: 'Ray', value: 'ray' },
      { label: 'Extended Line', value: 'extendedLine' },
    ],
  },
  {
    label: 'Horizontal/Vertical',
    tools: [
      { label: 'Horizontal Line', value: 'horizontalLine' },
      { label: 'Vertical Line', value: 'verticalLine' },
    ],
  },
  {
    label: 'Channels',
    tools: [
      { label: 'Parallel Channel', value: 'parallelChannel' },
      { label: 'Regression Channel', value: 'regressionChannel' },
    ],
  },
  {
    label: 'Fibonacci',
    tools: [
      { label: 'Fib Retracement', value: 'fibRetracement' },
      { label: 'Fib Extension', value: 'fibExtension' },
    ],
  },
  {
    label: 'Shapes',
    tools: [
      { label: 'Rectangle', value: 'rectangle' },
      { label: 'Ellipse', value: 'ellipse' },
      { label: 'Triangle', value: 'triangle' },
    ],
  },
  {
    label: 'Gann & Advanced',
    tools: [
      { label: 'Pitchfork', value: 'pitchfork' },
      { label: 'Gann Fan', value: 'gannFan' },
      { label: 'Gann Box', value: 'gannBox' },
      { label: 'Elliott Wave', value: 'elliottWave' },
    ],
  },
  {
    label: 'Measure',
    tools: [
      { label: 'Price Range', value: 'priceRange' },
      { label: 'Date Range', value: 'dateRange' },
      { label: 'Measure', value: 'measure' },
    ],
  },
  {
    label: 'Annotation',
    tools: [
      { label: 'Text', value: 'text' },
      { label: 'Arrow', value: 'arrow' },
    ],
  },
];

export interface IndicatorDef {
  id: string;
  name: string;
  type: 'overlay' | 'panel';
}

export const INDICATORS: IndicatorDef[] = [
  { id: 'sma', name: 'SMA', type: 'overlay' },
  { id: 'ema', name: 'EMA', type: 'overlay' },
  { id: 'hma', name: 'Hull MA', type: 'overlay' },
  { id: 'bb', name: 'Bollinger Bands', type: 'overlay' },
  { id: 'vwap', name: 'VWAP', type: 'overlay' },
  { id: 'avwap', name: 'Anchored VWAP', type: 'overlay' },
  { id: 'ichimoku', name: 'Ichimoku Cloud', type: 'overlay' },
  { id: 'psar', name: 'Parabolic SAR', type: 'overlay' },
  { id: 'supertrend', name: 'Supertrend', type: 'overlay' },
  { id: 'keltner', name: 'Keltner Channel', type: 'overlay' },
  { id: 'donchian', name: 'Donchian Channel', type: 'overlay' },
  { id: 'pivots', name: 'Pivot Points', type: 'overlay' },
  { id: 'zigzag', name: 'ZigZag', type: 'overlay' },
  { id: 'lrc', name: 'Linear Regression Channel', type: 'overlay' },
  { id: 'rsi', name: 'RSI', type: 'panel' },
  { id: 'macd', name: 'MACD', type: 'panel' },
  { id: 'stochastic', name: 'Stochastic', type: 'panel' },
  { id: 'atr', name: 'ATR', type: 'panel' },
  { id: 'adx', name: 'ADX', type: 'panel' },
  { id: 'obv', name: 'OBV', type: 'panel' },
  { id: 'williamsR', name: 'Williams %R', type: 'panel' },
  { id: 'cci', name: 'CCI', type: 'panel' },
  { id: 'mfi', name: 'MFI', type: 'panel' },
  { id: 'roc', name: 'ROC', type: 'panel' },
  { id: 'tsi', name: 'TSI', type: 'panel' },
  { id: 'cmf', name: 'CMF', type: 'panel' },
  { id: 'aroon', name: 'Aroon', type: 'panel' },
  { id: 'stddev', name: 'Std Deviation', type: 'panel' },
  { id: 'vroc', name: 'Volume ROC', type: 'panel' },
  { id: 'ad', name: 'Acc/Dist', type: 'panel' },
  { id: 'ao', name: 'Awesome Oscillator', type: 'panel' },
  { id: 'chaikinOsc', name: 'Chaikin Oscillator', type: 'panel' },
  { id: 'volumeProfile', name: 'Volume Profile', type: 'panel' },
];

export const POPULAR_INDICATORS = [
  'sma', 'ema', 'bb', 'rsi', 'macd', 'stochastic',
  'vwap', 'atr', 'obv', 'ichimoku',
];

export const SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTCUSDT' },
  { value: 'ETHUSDT', label: 'ETHUSDT' },
  { value: 'SOLUSDT', label: 'SOLUSDT' },
  { value: 'BNBUSDT', label: 'BNBUSDT' },
];
