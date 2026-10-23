import type { ChartType, DrawingToolType } from '@tradecanvas/commons';
import type { DrawingToolGroupDef, ChartSettingsState } from './types.js';

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
  { label: 'High-Low', value: 'hiLo' },
  { label: 'Renko', value: 'renko' },
  { label: 'Line Break', value: 'lineBreak' },
  { label: 'Kagi', value: 'kagi' },
  { label: 'Point & Figure', value: 'pointAndFigure' },
  { label: 'Range Bars', value: 'rangeBars' },
];

/**
 * The drawing tools, grouped, in sections: lines, Fibonacci and Gann, patterns,
 * forecasting and measuring, shapes and notes.
 */
export const DRAWING_TOOL_GROUPS: DrawingToolGroupDef[] = [
  {
    label: 'Lines',
    section: 'lines',
    tools: [
      { label: 'Trend Line', value: 'trendLine' as DrawingToolType },
      { label: 'Ray', value: 'ray' as DrawingToolType },
      { label: 'Extended Line', value: 'extendedLine' as DrawingToolType },
      { label: 'Info Line', value: 'infoLine' as DrawingToolType },
      { label: 'Trend Angle', value: 'trendAngle' as DrawingToolType },
    ],
  },
  {
    label: 'Horizontal/Vertical',
    section: 'lines',
    tools: [
      { label: 'Horizontal Line', value: 'horizontalLine' as DrawingToolType },
      { label: 'Horizontal Ray', value: 'horizontalRay' as DrawingToolType },
      { label: 'Vertical Line', value: 'verticalLine' as DrawingToolType },
      { label: 'Cross Line', value: 'crossLine' as DrawingToolType },
    ],
  },
  {
    label: 'Channels',
    section: 'lines',
    tools: [
      { label: 'Parallel Channel', value: 'parallelChannel' as DrawingToolType },
      { label: 'Regression Channel', value: 'regressionChannel' as DrawingToolType },
    ],
  },
  {
    label: 'Fibonacci',
    section: 'fibonacci',
    tools: [
      { label: 'Fib Retracement', value: 'fibRetracement' as DrawingToolType },
      { label: 'Fib Extension', value: 'fibExtension' as DrawingToolType },
      { label: 'Fib Channel', value: 'fibChannel' as DrawingToolType },
      { label: 'Fib Time Zones', value: 'fibTimeZones' as DrawingToolType },
      { label: 'Fib Speed Resistance Fan', value: 'fibSpeedResistanceFan' as DrawingToolType },
      { label: 'Fib Speed Resistance Arcs', value: 'fibArcs' as DrawingToolType },
      { label: 'Fib Circles', value: 'fibCircles' as DrawingToolType },
      { label: 'Fib Spiral', value: 'fibSpiral' as DrawingToolType },
      { label: 'Fib Wedge', value: 'fibWedge' as DrawingToolType },
    ],
  },
  {
    label: 'Gann & Pitchforks',
    section: 'fibonacci',
    tools: [
      { label: 'Pitchfork', value: 'pitchfork' as DrawingToolType },
      { label: 'Schiff Pitchfork', value: 'schiffPitchfork' as DrawingToolType },
      { label: 'Modified Schiff Pitchfork', value: 'modifiedSchiffPitchfork' as DrawingToolType },
      { label: 'Gann Fan', value: 'gannFan' as DrawingToolType },
      { label: 'Gann Box', value: 'gannBox' as DrawingToolType },
      { label: 'Gann Square', value: 'gannSquare' as DrawingToolType },
      { label: 'Pitchfan', value: 'pitchfan' as DrawingToolType },
    ],
  },
  {
    label: 'Cycles',
    section: 'fibonacci',
    tools: [
      { label: 'Cyclic Lines', value: 'cyclicLines' as DrawingToolType },
      { label: 'Time Cycles', value: 'timeCycles' as DrawingToolType },
      { label: 'Sine Line', value: 'sineLine' as DrawingToolType },
    ],
  },
  {
    label: 'Patterns',
    section: 'patterns',
    tools: [
      { label: 'XABCD Pattern', value: 'xabcdPattern' as DrawingToolType },
      { label: 'ABCD Pattern', value: 'abcdPattern' as DrawingToolType },
      { label: 'Head and Shoulders', value: 'headAndShoulders' as DrawingToolType },
      { label: 'Cypher Pattern', value: 'cypherPattern' as DrawingToolType },
      { label: 'Three Drives Pattern', value: 'threeDrives' as DrawingToolType },
    ],
  },
  {
    label: 'Elliott Waves',
    section: 'patterns',
    tools: [
      { label: 'Elliott Wave', value: 'elliottWave' as DrawingToolType },
      { label: 'Elliott Impulse Wave', value: 'elliottImpulse' as DrawingToolType },
      { label: 'Elliott Correction Wave', value: 'elliottCorrection' as DrawingToolType },
      { label: 'Elliott Triangle Wave', value: 'elliottTriangle' as DrawingToolType },
      { label: 'Elliott Double Combo Wave', value: 'elliottDoubleCombo' as DrawingToolType },
      { label: 'Elliott Triple Combo Wave', value: 'elliottTripleCombo' as DrawingToolType },
    ],
  },
  {
    label: 'Forecasting',
    section: 'forecasting',
    tools: [
      { label: 'Long/Short Position', value: 'riskReward' as DrawingToolType },
      { label: 'Anchored VWAP', value: 'anchoredVWAP' as DrawingToolType },
      { label: 'Fixed Range Volume Profile', value: 'volumeProfileRange' as DrawingToolType },
      { label: 'Forecast', value: 'forecast' as DrawingToolType },
      { label: 'Projection', value: 'projection' as DrawingToolType },
      { label: 'Bars Pattern', value: 'barsPattern' as DrawingToolType },
    ],
  },
  {
    label: 'Measure',
    section: 'forecasting',
    tools: [
      { label: 'Price Range', value: 'priceRange' as DrawingToolType },
      { label: 'Date Range', value: 'dateRange' as DrawingToolType },
      { label: 'Date and Price Range', value: 'dateAndPriceRange' as DrawingToolType },
      { label: 'Measure', value: 'measure' as DrawingToolType },
    ],
  },
  {
    label: 'Shapes',
    section: 'annotation',
    tools: [
      { label: 'Rectangle', value: 'rectangle' as DrawingToolType },
      { label: 'Circle', value: 'circle' as DrawingToolType },
      { label: 'Ellipse', value: 'ellipse' as DrawingToolType },
      { label: 'Triangle', value: 'triangle' as DrawingToolType },
      { label: 'Polyline', value: 'polyline' as DrawingToolType },
      { label: 'Curve', value: 'curve' as DrawingToolType },
      { label: 'Arc', value: 'arc' as DrawingToolType },
    ],
  },
  {
    label: 'Brushes',
    section: 'annotation',
    tools: [
      { label: 'Brush', value: 'brush' as DrawingToolType },
      { label: 'Highlighter', value: 'highlighter' as DrawingToolType },
      { label: 'Path', value: 'path' as DrawingToolType },
    ],
  },
  {
    label: 'Annotation',
    section: 'annotation',
    tools: [
      { label: 'Text', value: 'text' as DrawingToolType },
      { label: 'Price Label', value: 'priceLabel' as DrawingToolType },
      { label: 'Arrow', value: 'arrow' as DrawingToolType },
      { label: 'Note', value: 'note' as DrawingToolType },
      { label: 'Callout', value: 'callout' as DrawingToolType },
      { label: 'Flag Mark', value: 'flag' as DrawingToolType },
      { label: 'Arrow Mark', value: 'arrowMark' as DrawingToolType },
      { label: 'Icon', value: 'icon' as DrawingToolType },
    ],
  },
];

export const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
];

export const DEFAULT_SETTINGS: ChartSettingsState = {
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
  indicatorValueLabels: false,
  logScale: false,
  scaleMode: 'regular',
  autoScale: true,
  invertScale: false,
  leftPriceScale: false,
  crosshairMode: 'magnet',
  numberLocale: 'en-US',
  timezone: 'local',
  highLowLines: false,
  mainSeriesVisible: true,
  extendedHours: true,
  chartTypeOptions: {},
};
