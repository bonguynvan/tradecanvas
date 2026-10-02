/**
 * The TradeCanvas icon set, as in the "TradeCanvas Icons" Figma file: a 24 px
 * grid with 2 px padding, 1.75 px strokes with round caps and joins. Drawing
 * tools mark their anchor points (where you click to draw) with filled dots.
 */
export interface IconDef {
  /** Stroked path data. */
  d?: string;
  /** Dashed stroke, for guides. */
  dash?: string;
  /** Solid shapes, such as filled candle bodies. */
  fills?: readonly string[];
  /** An area filled at 22%. */
  soft?: string;
  /** Filled dots: [cx, cy, r = 1.75]. */
  dots?: readonly (readonly number[])[];
}

/** Toolbar, sidebar and panel glyphs. */
export const UI_ICONS: Readonly<Record<string, IconDef>> = {
  cursor: { d: 'M6 3.5L18.5 12.5L12.6 13.6L9.7 19.4z' }, // Cursor
  trendingUp: { d: 'M3 17L9 11L13 14.5L21 6.5M15 6.5H21V12.5' }, // Indicators / Long
  trendingDown: { d: 'M3 7L9 13L13 9.5L21 17.5M15 17.5H21V11.5' }, // Short
  minus: { d: 'M5 12H19' }, // Minus
  plus: { d: 'M12 5V19M5 12H19' }, // Plus
  penLine: { d: 'M14.5 5.5L18.5 9.5M4 20L5 15.5L15.8 4.7a2 2 0 0 1 2.83 0l.67.67a2 2 0 0 1 0 2.83L8.5 19z' }, // Draw
  zigzag: { d: 'M3 17L8 9L13 15L21 6' }, // Patterns
  hash: { d: 'M5 9H19M5 15H19M10 4L8.5 20M15.5 4L14 20' }, // Grid
  square: { d: 'M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z' }, // Shape
  gitBranch: { d: 'M6 3V15M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9' }, // Branch
  ruler: { d: 'M3.5 16.5L16.5 3.5L20.5 7.5L7.5 20.5zM6.5 13.5L8 15M9.5 10.5L11.5 12.5M12.5 7.5L14 9' }, // Measure
  type: { d: 'M6 6V4.5H18V6M12 4.5V19.5M9.5 19.5H14.5' }, // Text
  magnet: { d: 'M6 4V11a6 6 0 0 0 12 0V4M6 4h3.5v7a2.5 2.5 0 0 0 5 0V4H18M6 8h3.5M14.5 8H18' }, // Magnet
  magnetStrong: { d: 'M6 4V11a6 6 0 0 0 12 0V4M6 4h3.5v7a2.5 2.5 0 0 0 5 0V4H18', fills: ['M6 4h3.5v4H6z', 'M14.5 4H18v4h-3.5z'] }, // Strong magnet
  eraser: { d: 'M8.5 19.5L3.9 14.9a1.5 1.5 0 0 1 0-2.1l8.5-8.5a1.5 1.5 0 0 1 2.1 0l5.2 5.2a1.5 1.5 0 0 1 0 2.1L12 19.5zM8 9l7 7M12 19.5H20' }, // Eraser
  zoomIn: { d: 'M16.5 10.5a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM15 15L20.5 20.5M10.5 7.5V13.5M7.5 10.5H13.5' }, // Zoom area
  undo: { d: 'M9 14L4 9L9 4M4 9H14.5a5.5 5.5 0 0 1 0 11H11' }, // Undo
  redo: { d: 'M15 14L20 9L15 4M20 9H9.5a5.5 5.5 0 0 0 0 11H13' }, // Redo
  trash: { d: 'M4 7H20M9.5 7V4.5h5V7M6.5 7l.8 12.2A1.5 1.5 0 0 0 8.8 20.6h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v6M14 11v6' }, // Delete
  camera: { d: 'M4.5 7.5h3L9 5h6l1.5 2.5h3A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V9a1.5 1.5 0 0 1 1.5-1.5zM15.5 13.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z' }, // Screenshot
  settings: { d: 'M4 7H14M18 7H20M4 17H8M12 17H20M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z' }, // Settings
  moon: { d: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' }, // Dark theme
  sun: { d: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4' }, // Light theme
  chevronDown: { d: 'M6 9L12 15L18 9' }, // Expand
  chevronUp: { d: 'M6 15L12 9L18 15' }, // Collapse
  barChart: { d: 'M5 20V13M12 20V5M19 20V10' }, // Chart type
  x: { d: 'M6 6L18 18M18 6L6 18' }, // Close
  play: { d: 'M7 4.5v15L19.5 12z' }, // Play
  pause: { d: 'M8 5V19M16 5V19' }, // Pause
  stop: { d: 'M7.5 6h9A1.5 1.5 0 0 1 18 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 16.5v-9A1.5 1.5 0 0 1 7.5 6z' }, // Stop
  receipt: { d: 'M6 3.5h12v17l-2-1.25-2 1.25-2-1.25-2 1.25-2-1.25-2 1.25zM9 8h6M9 12h6M9 16h3' }, // Orders
  bell: { d: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5zM10 20.5a2.2 2.2 0 0 0 4 0' }, // Alerts
  layers: { d: 'M12 3.5L21 8.5L12 13.5L3 8.5zM3 12.5L12 17.5L21 12.5M3 16.5L12 21.5L21 16.5' }, // Objects
  eye: { d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' }, // Show
  eyeOff: { d: 'M4 4L20 20M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.3 3.1M6.6 7.1C3.9 8.9 2.5 12 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.7-1.3M10 10.1a3 3 0 0 0 4 4' }, // Hide
  lock: { d: 'M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10.5V7.5a4 4 0 0 1 8 0v3' }, // Lock
  unlock: { d: 'M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10.5V7.5a4 4 0 0 1 7.7-1.5' }, // Unlock
  palette: { d: 'M12 3.5a8.5 8.5 0 0 0 0 17c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2a1.6 1.6 0 0 1 1.2-2.7h1.9a4.3 4.3 0 0 0 4.3-4.3C20.5 6.9 16.7 3.5 12 3.5z', dots: [[7.5, 11.5, 1.25], [9.5, 7.75, 1.25], [14, 7.25, 1.25]] }, // Style
  check: { d: 'M5 12.5L10 17.5L19 7' }, // Done
  maximize: { d: 'M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3' }, // Fullscreen
  minimize: { d: 'M4 8h3a1 1 0 0 0 1-1V4M16 4v3a1 1 0 0 0 1 1h3M20 16h-3a1 1 0 0 0-1 1v3M8 20v-3a1 1 0 0 0-1-1H4' }, // Exit fullscreen
  repeat: { d: 'M17 3.5L20.5 7L17 10.5M3.5 11.5V10a3 3 0 0 1 3-3h14M7 20.5L3.5 17L7 13.5M20.5 12.5V14a3 3 0 0 1-3 3h-14' }, // Stay in drawing mode
  calendar: { d: 'M5.5 5h13a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3.5 10H20.5M8 3V7M16 3V7' }, // Go to date
  star: { d: 'M12 3.5L14.6 9L20.5 9.6L16 13.6L17.3 19.5L12 16.5L6.7 19.5L8 13.6L3.5 9.6L9.4 9z' }, // Favourite
  ladder: { d: 'M4 6H11M13 6H17M6 10H11M13 10H20M8 14H11M13 14H15M5 18H11M13 18H19' }, // Depth ladder
  save: { d: 'M5.5 3.5h10.5l4.5 4.5v10.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2zM8 3.5v5h7v-5M7.5 20.5v-6h9v6' }, // Save layout
  folder: { d: 'M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z' }, // Open layout
  link: { d: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2' }, // Sync
  layoutGrid: { d: 'M5 4.5h4.5a.5.5 0 0 1 .5.5v4.5a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5zM14.5 4.5H19a.5.5 0 0 1 .5.5v4.5a.5.5 0 0 1-.5.5h-4.5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5zM5 14h4.5a.5.5 0 0 1 .5.5V19a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5v-4.5A.5.5 0 0 1 5 14zM14.5 14H19a.5.5 0 0 1 .5.5V19a.5.5 0 0 1-.5.5h-4.5a.5.5 0 0 1-.5-.5v-4.5a.5.5 0 0 1 .5-.5z' }, // Chart layout
};

/** One per drawing tool, keyed by tool type. */
export const DRAWING_TOOL_ICONS: Readonly<Record<string, IconDef>> = {
  trendLine: { d: 'M5 18L19 6', dots: [[5, 18], [19, 6]] }, // Trend Line
  ray: { d: 'M5 17L21 5M17.5 4.81L21 5L20.2 8.41', dots: [[5, 17], [11, 12.5]] }, // Ray
  extendedLine: { d: 'M3 18.5L21 5M17.5 4.81L21 5L20.2 8.41M6.5 18.69L3 18.5L3.8 15.09', dots: [[9, 14], [15, 9.5]] }, // Extended Line
  infoLine: { d: 'M5 20L19 10M4.5 3.5h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM6.5 6.5h5', dots: [[5, 20], [19, 10]] }, // Info Line
  trendAngle: { d: 'M5 18L19 7M5 18H20M11 18A6 6 0 0 0 9.71 14.29', dots: [[5, 18], [19, 7]] }, // Trend Angle
  horizontalLine: { d: 'M3 12H21', dots: [[12, 12]] }, // Horizontal Line
  horizontalRay: { d: 'M7 12H21M18.5 9.5L21 12L18.5 14.5', dots: [[7, 12]] }, // Horizontal Ray
  verticalLine: { d: 'M12 3V21', dots: [[12, 12]] }, // Vertical Line
  crossLine: { d: 'M3 12H21M12 3V21', dots: [[12, 12]] }, // Cross Line
  parallelChannel: { d: 'M3 15L15 5M9 19L21 9', dots: [[3, 15], [15, 5], [9, 19]] }, // Parallel Channel
  regressionChannel: { d: 'M3 12L21 4M3 20L21 12', dash: 'M3 16L21 8', dots: [[3, 16], [21, 8]] }, // Regression Channel
  fibRetracement: { d: 'M3 4H21M3 9H21M3 13H21M3 20H21', dots: [[5, 20], [19, 4]] }, // Fib Retracement
  fibExtension: { d: 'M3 20L8 10L12 16M14 4H21M14 8H21M14 12H21', dots: [[3, 20], [8, 10], [12, 16]] }, // Fib Extension
  fibChannel: { d: 'M3 9L21 3M3 13L21 7M3 16L21 10M3 21L21 15', dots: [[3, 21], [21, 15], [3, 9]] }, // Fib Channel
  fibTimeZones: { d: 'M3 4V20M6 4V20M9.5 4V20M14 4V20M20.5 4V20', dots: [[3, 20], [6, 20]] }, // Fib Time Zones
  fibSpeedResistanceFan: { d: 'M4 20L20 4M4 20L20 11M4 20L20 16M4 20L11 4', dash: 'M4 4H20V20', dots: [[4, 20], [20, 4]] }, // Fib Speed Resistance Fan
  rectangle: { d: 'M5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9A1.5 1.5 0 0 1 5.5 6z', dots: [[4, 6], [20, 18]] }, // Rectangle
  circle: { d: 'M19.5 12a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z', dots: [[12, 12], [19.5, 12]] }, // Circle
  ellipse: { d: 'M20.5 12c0 3-3.8 5.5-8.5 5.5S3.5 15 3.5 12 7.3 6.5 12 6.5s8.5 2.5 8.5 5.5z', dots: [[3.5, 12], [20.5, 12]] }, // Ellipse
  triangle: { d: 'M12 4.5L20 19H4z', dots: [[12, 4.5], [20, 19], [4, 19]] }, // Triangle
  pitchfork: { d: 'M4 20L16.75 3M7 9L11.5 3M13 15L21 4.33M7 9L13 15', dots: [[4, 20], [7, 9], [13, 15]] }, // Pitchfork
  schiffPitchfork: { d: 'M4 14.5L21 7.42M7 9L21 3.17M13 15L21 11.67M7 9L13 15', dash: 'M4 20V14.5', dots: [[4, 14.5], [7, 9], [13, 15]] }, // Schiff Pitchfork
  modifiedSchiffPitchfork: { d: 'M5.5 14.5L21 5.89M7 9L17.8 3M13 15L21 10.56M7 9L13 15', dash: 'M4 20L5.5 14.5', dots: [[5.5, 14.5], [7, 9], [13, 15]] }, // Modified Schiff Pitchfork
  gannFan: { d: 'M4 20L20 4M4 20L20 12M4 20L12 4M4 20L20 16.5M4 20L7.5 4', dots: [[4, 20], [20, 4]] }, // Gann Fan
  gannBox: { d: 'M4 4H20V20H4zM4 20L20 4M4 4L20 20M12 4V20', dots: [[4, 20], [20, 4]] }, // Gann Box
  cyclicLines: { d: 'M4 4V20M9 4V20M14 4V20M19 4V20', dots: [[4, 20], [9, 20]] }, // Cyclic Lines
  xabcdPattern: { d: 'M3 18L7 6L11 13L15 8L21 19', dash: 'M3 18L11 13L21 19', dots: [[3, 18], [7, 6], [11, 13], [15, 8], [21, 19]] }, // XABCD Pattern
  abcdPattern: { d: 'M4 19L9 8L13 14L20 4', dots: [[4, 19], [9, 8], [13, 14], [20, 4]] }, // ABCD Pattern
  headAndShoulders: { d: 'M3 19L6 11L8.5 15L12 5L15.5 15L18 11L21 19', dash: 'M4.5 15H19.5', dots: [[6, 11], [12, 5], [18, 11]] }, // Head and Shoulders
  elliottWave: { d: 'M3 19L6 13L8.5 16L14 6L16 10L21 4', dots: [[3, 19], [21, 4]] }, // Elliott Wave
  priceRange: { d: 'M5 4H19M5 20H19M12 6.5V17.5M9 9.5L12 6.5L15 9.5M9 14.5L12 17.5L15 14.5' }, // Price Range
  dateRange: { d: 'M4 5V19M20 5V19M6.5 12H17.5M9.5 9L6.5 12L9.5 15M14.5 9L17.5 12L14.5 15' }, // Date Range
  dateAndPriceRange: { d: 'M6 18V4M3 7L6 4L9 7M6 18H20M17 15L20 18L17 21', dash: 'M6 4H20V18' }, // Date and Price Range
  measure: { d: 'M3.5 16.5L16.5 3.5L20.5 7.5L7.5 20.5zM6.5 13.5L8 15M9.5 10.5L11.5 12.5M12.5 7.5L14 9' }, // Measure
  text: { d: 'M6 6V4.5H18V6M12 4.5V19.5M9.5 19.5H14.5' }, // Text
  priceLabel: { d: 'M9 5H19a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H9L3.5 12zM11 12H17' }, // Price Label
  arrow: { d: 'M5 19L19 5M10 5H19V14' }, // Arrow
  riskReward: { d: 'M5 12V4H19V12M3 12H21', dash: 'M5 12V18H19V12', dots: [[5, 12]] }, // Long/Short Position
  anchoredVWAP: { d: 'M4 18C9 17 12 10 20 7M4 20.5V18', dots: [[4, 18]] }, // Anchored VWAP
  volumeProfileRange: { d: 'M6 7H12M6 10.5H17M6 14H15M6 17.5H10', dash: 'M3.5 4V20M20.5 4V20', dots: [[3.5, 20], [20.5, 20]] }, // Fixed Range Volume Profile
  note: { d: 'M5.5 4.5h13v9l-5 5h-8zM13.5 18.5v-5h5M8.5 8.5h7M8.5 11.5h4' }, // Note
  callout: { d: 'M10.5 4h9a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 12L5 19M12.5 8h5', dots: [[5, 19]] }, // Callout
  flag: { d: 'M6 21V4M6 4.5h11l-2.5 3.75L17 12H6', soft: 'M6 4.5h11l-2.5 3.75L17 12H6z', dots: [[6, 21]] }, // Flag Mark
  arrowMark: { d: 'M12 4L18 11H14.5V20H9.5V11H6z' }, // Arrow Mark
  icon: { d: 'M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z' }, // Icon
  brush: { d: 'M3.5 17c2.5 0 3-5 6-5s2.5 5 5.5 5 3.5-6 5.5-9' }, // Brush
  highlighter: { d: 'M14.5 4.5l5 5L11 18H6v-5zM12 7l5 5M4 21h8' }, // Highlighter
  path: { d: 'M4 18L9 10L14 14L20 6M16.2 6.6L20 6L19.6 9.8', dots: [[4, 18], [9, 10], [14, 14]] }, // Path
  polyline: { d: 'M5 17L8 6L16 4L20 14L12 20z', soft: 'M5 17L8 6L16 4L20 14L12 20z', dots: [[5, 17], [8, 6], [16, 4], [20, 14], [12, 20]] }, // Polyline
  curve: { d: 'M4 18C8 4 16 4 20 18', dots: [[4, 18], [20, 18], [12, 7.5]] }, // Curve
  arc: { d: 'M4 17a8 8 0 0 1 16 0', dots: [[4, 17], [20, 17], [12, 9]] }, // Arc
  fibCircles: { d: 'M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z', dots: [[12, 12], [20, 12]] }, // Fib Circles
  fibSpiral: { d: 'M12 12a1.5 1.5 0 0 1 1.5 1.5 3 3 0 0 1-3 3A4.5 4.5 0 0 1 6 12a6 6 0 0 1 6-6 8 8 0 0 1 8 8', dots: [[12, 12]] }, // Fib Spiral
  fibArcs: { d: 'M10 20a6 6 0 0 0-6-6M14 20a10 10 0 0 0-10-10M18 20a14 14 0 0 0-14-14', dash: 'M4 20L18 6', dots: [[4, 20], [18, 6]] }, // Fib Speed Resistance Arcs
  fibWedge: { d: 'M4 19L20 7M4 19L20 16M10.4 14.2A8 8 0 0 1 11.86 17.53M14.4 11.2A13 13 0 0 1 16.78 16.6', dots: [[4, 19], [20, 7], [20, 16]] }, // Fib Wedge
  pitchfan: { d: 'M4 20L14 4M4 20L20 14M4 20L17 9', dash: 'M14 4L20 14', dots: [[4, 20], [14, 4], [20, 14]] }, // Pitchfan
  gannSquare: { d: 'M4 4H20V20H4zM4 20L20 4M4 12H20M12 4V20M4 12a8 8 0 0 1 8 8', dots: [[4, 20], [20, 4]] }, // Gann Square
  elliottImpulse: { d: 'M3 19L7 12L10 15L15 5L17.5 9L21 3', dots: [[3, 19], [21, 3]] }, // Elliott Impulse Wave
  elliottCorrection: { d: 'M4 5L10 17L14 11L20 20', dots: [[4, 5], [20, 20]] }, // Elliott Correction Wave
  elliottTriangle: { d: 'M3 6L7 17L11 9L15 15L18 11L21 13', dots: [[3, 6], [21, 13]] }, // Elliott Triangle Wave
  elliottDoubleCombo: { d: 'M4 5L9 14L13 9L20 19', dots: [[4, 5], [9, 14], [13, 9], [20, 19]] }, // Elliott Double Combo Wave
  elliottTripleCombo: { d: 'M3 5L7 13L10 9L14 16L17 12L21 20', dots: [[3, 5], [21, 20]] }, // Elliott Triple Combo Wave
  threeDrives: { d: 'M3 20L7 12L9.5 15L14 7L16.5 10L21 3', dash: 'M7 12L14 7L21 3', dots: [[7, 12], [14, 7], [21, 3]] }, // Three Drives Pattern
  cypherPattern: { d: 'M3 19L7 9L10 14L15 5L20 16', dash: 'M3 19L10 14L20 16', dots: [[3, 19], [7, 9], [10, 14], [15, 5], [20, 16]] }, // Cypher Pattern
  timeCycles: { d: 'M3 18a4.5 4.5 0 0 1 9 0a4.5 4.5 0 0 1 9 0', dots: [[3, 18], [12, 18]] }, // Time Cycles
  sineLine: { d: 'M3 12C5 5 7.5 5 9 12S13 19 15 12 19.5 5 21 12', dots: [[6, 6.75], [12, 17.25]] }, // Sine Line
  forecast: { d: 'M4 18L15.2 7.8M19.5 6a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z', dots: [[4, 18]] }, // Forecast
  projection: { d: 'M12 19L18 11M15.2 11.3L18 11L17.8 13.8', dash: 'M3 17L9 9', dots: [[3, 17], [9, 9], [12, 19]] }, // Projection
  barsPattern: { d: 'M5 6V14M9 9V18M15 4V12M19 7V16', fills: ['M4 8h2v4H4z', 'M8 11h2v5H8z', 'M14 6h2v4h-2z', 'M18 9h2v5h-2z'], dash: 'M12 3V21' }, // Bars Pattern
};

/** One per chart type, keyed by chart type. */
export const CHART_TYPE_ICONS: Readonly<Record<string, IconDef>> = {
  candlestick: { d: 'M8 3.5V7M8 16V20.5M16 5V8.5M16 15.5V19', fills: ['M6.5 7h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z', 'M14.5 8.5h3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z'] }, // Candlestick
  hollowCandle: { d: 'M8 3.5V7M8 16V20.5M16 5V8.5M16 15.5V19M6.5 7h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM14.5 8.5h3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z' }, // Hollow Candle
  heikinAshi: { d: 'M5.5 9.5V12M5.5 18V20M12 5.5V8M12 14V16M18.5 3V4.5M18.5 10.5V12.5', fills: ['M4 12h3a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-5A.5.5 0 0 1 4 12z', 'M10.5 8h3a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-5a.5.5 0 0 1 .5-.5z', 'M17 4.5h3a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5z'] }, // Heikin-Ashi
  bar: { d: 'M8 4V20M5 8H8M8 16H11M16 6V18M13 15H16M16 9H19' }, // Bar (OHLC)
  volumeCandles: { d: 'M6.5 5V8M6.5 16V19M15.5 3.5V6M15.5 16V20', fills: ['M5.5 8h2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z', 'M11.5 6h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5z'] }, // Volume Candles
  equivolume: { d: 'M4.5 10h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1zM10 6h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM18.5 4h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z' }, // Equivolume
  line: { d: 'M3 17L8 11L12 14L21 5' }, // Line
  area: { d: 'M3 17L8 11L12 14L21 5', soft: 'M3 17L8 11L12 14L21 5V20H3z' }, // Area
  baseline: { d: 'M3 16L7 9L11 14L15 7L21 15', dash: 'M3 12H21' }, // Baseline
  hlcArea: { d: 'M3 9L8 6L13 9L21 4M3 15L8 13L13 16L21 11', dash: 'M3 12L8 9.5L13 12.5L21 7.5', soft: 'M3 9L8 6L13 9L21 4V11L13 16L8 13L3 15z' }, // HLC Area
  stepLine: { d: 'M3 18H8V12H12V15H16V7H21' }, // Step Line
  lineWithMarkers: { d: 'M4 17L9 10L14 14L20 6', dots: [[4, 17], [9, 10], [14, 14], [20, 6]] }, // Line with Markers
};

const DOT_RADIUS = 1.75;
const SOFT_OPACITY = 0.22;
const markupCache = new WeakMap<IconDef, string>();

/** The icon's SVG elements, drawn in `currentColor`. */
function markup(icon: IconDef): string {
  const cached = markupCache.get(icon);
  if (cached) return cached;
  let s = '';
  if (icon.soft) s += `<path d="${icon.soft}" fill="currentColor" fill-opacity="${SOFT_OPACITY}" stroke="none"/>`;
  for (const f of icon.fills ?? []) s += `<path d="${f}" fill="currentColor" stroke="none"/>`;
  if (icon.d) s += `<path d="${icon.d}"/>`;
  if (icon.dash) s += `<path d="${icon.dash}" stroke-dasharray="2 2.5"/>`;
  for (const [cx, cy, r = DOT_RADIUS] of icon.dots ?? []) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;
  markupCache.set(icon, s);
  return s;
}

/** The icon as an inline SVG string at `size` px, coloured by `currentColor`. */
export function iconSvg(icon: IconDef, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${markup(icon)}</svg>`;
}
