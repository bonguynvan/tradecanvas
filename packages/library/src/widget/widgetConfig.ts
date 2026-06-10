import type { ChartType, DrawingToolType, TimeFrame } from '@tradecanvas/commons';
import type { IndicatorDef, DrawingToolGroupDef, ChartSettingsState } from './types.js';

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
  { label: 'Volume Candles', value: 'volumeCandles' },
  { label: 'Equivolume', value: 'equivolume' },
  { label: 'HLC Area', value: 'hlcArea' },
  { label: 'Step Line', value: 'stepLine' },
  { label: 'Line + Markers', value: 'lineWithMarkers' },
];

export const DRAWING_TOOL_GROUPS: DrawingToolGroupDef[] = [
  {
    label: 'Lines',
    tools: [
      { label: 'Trend Line', value: 'trendLine' as DrawingToolType },
      { label: 'Ray', value: 'ray' as DrawingToolType },
      { label: 'Extended Line', value: 'extendedLine' as DrawingToolType },
    ],
  },
  {
    label: 'Horizontal/Vertical',
    tools: [
      { label: 'Horizontal Line', value: 'horizontalLine' as DrawingToolType },
      { label: 'Vertical Line', value: 'verticalLine' as DrawingToolType },
    ],
  },
  {
    label: 'Channels',
    tools: [
      { label: 'Parallel Channel', value: 'parallelChannel' as DrawingToolType },
      { label: 'Regression Channel', value: 'regressionChannel' as DrawingToolType },
    ],
  },
  {
    label: 'Fibonacci',
    tools: [
      { label: 'Fib Retracement', value: 'fibRetracement' as DrawingToolType },
      { label: 'Fib Extension', value: 'fibExtension' as DrawingToolType },
    ],
  },
  {
    label: 'Shapes',
    tools: [
      { label: 'Rectangle', value: 'rectangle' as DrawingToolType },
      { label: 'Ellipse', value: 'ellipse' as DrawingToolType },
      { label: 'Triangle', value: 'triangle' as DrawingToolType },
    ],
  },
  {
    label: 'Gann & Advanced',
    tools: [
      { label: 'Pitchfork', value: 'pitchfork' as DrawingToolType },
      { label: 'Gann Fan', value: 'gannFan' as DrawingToolType },
      { label: 'Gann Box', value: 'gannBox' as DrawingToolType },
      { label: 'Elliott Wave', value: 'elliottWave' as DrawingToolType },
    ],
  },
  {
    label: 'Measure',
    tools: [
      { label: 'Price Range', value: 'priceRange' as DrawingToolType },
      { label: 'Date Range', value: 'dateRange' as DrawingToolType },
      { label: 'Measure', value: 'measure' as DrawingToolType },
    ],
  },
  {
    label: 'Annotation',
    tools: [
      { label: 'Text', value: 'text' as DrawingToolType },
      { label: 'Arrow', value: 'arrow' as DrawingToolType },
    ],
  },
];

export const INDICATORS: IndicatorDef[] = [
  { id: 'sma', name: 'SMA', type: 'overlay' },
  { id: 'ema', name: 'EMA', type: 'overlay' },
  { id: 'hma', name: 'Hull MA', type: 'overlay' },
  { id: 'mtfma', name: 'MTF Moving Average', type: 'overlay' },
  { id: 'bb', name: 'Bollinger Bands', type: 'overlay' },
  { id: 'vwap', name: 'VWAP', type: 'overlay' },
  { id: 'avwap', name: 'Anchored VWAP', type: 'overlay' },
  { id: 'svwap', name: 'Session VWAP', type: 'overlay' },
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
  { id: 'voldelta', name: 'Volume Delta', type: 'panel' },
  { id: 'vortex', name: 'Vortex Indicator', type: 'panel' },
  { id: 'chop', name: 'Choppiness Index', type: 'panel' },
  { id: 'uo', name: 'Ultimate Oscillator', type: 'panel' },
  { id: 'fi', name: 'Force Index', type: 'panel' },
  { id: 'volumeProfile', name: 'Volume Profile', type: 'panel' },
];

export const POPULAR_INDICATORS = [
  'sma', 'ema', 'bb', 'rsi', 'macd', 'stochastic',
  'vwap', 'atr', 'obv', 'ichimoku',
];

export const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
];

export const DEFAULT_SETTINGS: ChartSettingsState = {
  candleUpColor: '#26A69A',
  candleDownColor: '#EF5350',
  candleUpWick: '#26A69A',
  candleDownWick: '#EF5350',
  backgroundColor: '#131722',
  gridColor: '#1E222D',
  gridVisible: true,
  volumeVisible: true,
  volumeProfileVisible: false,
  marketProfileVisible: false,
  marketProfileSplit: false,
  marketProfileLetters: false,
  marketProfileBuckets: 48,
  marketProfileOpacity: 0.32,
  depthHeatmapVisible: false,
  depthHeatmapOpacity: 0.7,
  sessionShadingVisible: false,
  pivotMarkersVisible: false,
  pivotStrength: 5,
  pivotStructureLabels: false,
  periodLevelsVisible: false,
  periodLevelsPeriod: 'day',
  legendVisible: true,
  barCountdown: true,
  logScale: false,
  scaleMode: 'regular',
  autoScale: true,
  crosshairMode: 'magnet',
  numberLocale: 'en-US',
  timezone: 'local',
};
