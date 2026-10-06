import type { LineStyle } from './chart.js';

/** The kind of value a style key takes. */
export type StyleValueKind = 'color' | 'lineStyle' | 'width' | 'boolean';

/**
 * Every key `chart.applyOverrides()` takes, and the kind of its value.
 *
 * - `series.<chartType>.*` style the main series while it is drawn as that
 *   type. Up and down colours fall back to `series.candlestick.*`, line
 *   colours and widths to `series.line.*`, area fills to `series.area.*`,
 *   then to the theme.
 * - The rest style one part of the chart each, falling back to the theme's
 *   tokens: with no overrides the chart looks as its theme makes it.
 */
export const CHART_STYLE_KEYS = {
  'background.color': 'color',

  'panes.background': 'color',
  'panes.separatorColor': 'color',
  'panes.titleColor': 'color',

  'grid.horizontal.visible': 'boolean',
  'grid.horizontal.color': 'color',
  'grid.horizontal.style': 'lineStyle',
  'grid.horizontal.width': 'width',
  'grid.vertical.visible': 'boolean',
  'grid.vertical.color': 'color',
  'grid.vertical.style': 'lineStyle',
  'grid.vertical.width': 'width',

  'crosshair.horizontal.visible': 'boolean',
  'crosshair.horizontal.color': 'color',
  'crosshair.horizontal.style': 'lineStyle',
  'crosshair.horizontal.width': 'width',
  'crosshair.vertical.visible': 'boolean',
  'crosshair.vertical.color': 'color',
  'crosshair.vertical.style': 'lineStyle',
  'crosshair.vertical.width': 'width',
  'crosshair.labelBackground': 'color',
  'crosshair.labelTextColor': 'color',

  'axis.price.lineColor': 'color',
  'axis.price.textColor': 'color',
  'axis.time.lineColor': 'color',
  'axis.time.textColor': 'color',

  'legend.textColor': 'color',
  'legend.labelColor': 'color',

  'watermark.color': 'color',

  'lastPrice.visible': 'boolean',
  'lastPrice.upColor': 'color',
  'lastPrice.downColor': 'color',
  'lastPrice.style': 'lineStyle',
  'lastPrice.width': 'width',

  'volume.upColor': 'color',
  'volume.downColor': 'color',

  'sessionBreaks.color': 'color',
  'sessionBreaks.style': 'lineStyle',
  'sessionBreaks.width': 'width',

  'highLow.color': 'color',

  'trading.buyColor': 'color',
  'trading.sellColor': 'color',
  'trading.profitColor': 'color',
  'trading.lossColor': 'color',
  'trading.entryColor': 'color',

  'markers.longColor': 'color',
  'markers.shortColor': 'color',
  'markers.neutralColor': 'color',

  'tradeZones.profitColor': 'color',
  'tradeZones.lossColor': 'color',
  'tradeZones.activeColor': 'color',

  'drawings.handleColor': 'color',

  'series.candlestick.upColor': 'color',
  'series.candlestick.downColor': 'color',
  'series.candlestick.wickUpColor': 'color',
  'series.candlestick.wickDownColor': 'color',
  'series.heikinAshi.upColor': 'color',
  'series.heikinAshi.downColor': 'color',
  'series.heikinAshi.wickUpColor': 'color',
  'series.heikinAshi.wickDownColor': 'color',
  'series.hollowCandle.upColor': 'color',
  'series.hollowCandle.downColor': 'color',
  'series.volumeCandles.upColor': 'color',
  'series.volumeCandles.downColor': 'color',
  'series.volumeCandles.wickUpColor': 'color',
  'series.volumeCandles.wickDownColor': 'color',
  'series.equivolume.upColor': 'color',
  'series.equivolume.downColor': 'color',
  'series.equivolume.wickUpColor': 'color',
  'series.equivolume.wickDownColor': 'color',
  'series.bar.upColor': 'color',
  'series.bar.downColor': 'color',
  'series.hiLo.upColor': 'color',
  'series.hiLo.downColor': 'color',
  'series.renko.upColor': 'color',
  'series.renko.downColor': 'color',
  'series.lineBreak.upColor': 'color',
  'series.lineBreak.downColor': 'color',
  'series.rangeBars.upColor': 'color',
  'series.rangeBars.downColor': 'color',
  'series.kagi.upColor': 'color',
  'series.kagi.downColor': 'color',
  'series.pointAndFigure.upColor': 'color',
  'series.pointAndFigure.downColor': 'color',
  'series.baseline.upColor': 'color',
  'series.baseline.downColor': 'color',
  'series.baseline.lineWidth': 'width',
  'series.line.color': 'color',
  'series.line.lineWidth': 'width',
  'series.stepLine.color': 'color',
  'series.stepLine.lineWidth': 'width',
  'series.lineWithMarkers.color': 'color',
  'series.lineWithMarkers.lineWidth': 'width',
  'series.area.lineColor': 'color',
  'series.area.lineWidth': 'width',
  'series.area.topColor': 'color',
  'series.area.bottomColor': 'color',
  'series.hlcArea.lineColor': 'color',
  'series.hlcArea.lineWidth': 'width',
  'series.hlcArea.topColor': 'color',
  'series.hlcArea.bottomColor': 'color',
} as const satisfies Record<string, StyleValueKind>;

export type ChartStyleKey = keyof typeof CHART_STYLE_KEYS;

/** The value a key of `kind` takes. */
export type StyleValue<K extends StyleValueKind> = K extends 'color'
  ? string
  : K extends 'lineStyle'
    ? LineStyle
    : K extends 'width'
      ? number
      : boolean;

/** Style overrides, by key. */
export type ChartStyleOverrides = {
  [K in ChartStyleKey]?: StyleValue<(typeof CHART_STYLE_KEYS)[K]>;
};

/** A change to overrides: a value sets a key, `null` takes it away. */
export type ChartStyleOverridesPatch = {
  [K in ChartStyleKey]?: StyleValue<(typeof CHART_STYLE_KEYS)[K]> | null;
};

/**
 * Where an override goes. `'host'`: your app's, kept through theme changes
 * and never saved. `'user'`: what the person using the chart chose (the
 * widget's Settings write here), kept per theme and saved with `saveState`.
 */
export type StyleLayer = 'host' | 'user';

/** One indicator pane's own look, over the panes' (`chart.setPaneStyle`). */
export interface PaneStyle {
  background?: string;
  separator?: string;
}

/** A line's look, as resolved. */
export interface ResolvedLineLook {
  visible: boolean;
  color: string;
  style: LineStyle;
  width: number;
}

/**
 * The chart's finer looks, worked out from the theme and its overrides once
 * per change. Renderers read it from `theme.style`; a theme without one (a
 * plugin's own) draws as before.
 */
export interface ResolvedChartStyle {
  panes: { background: string; separator: string; title: string };
  grid: { horizontal: ResolvedLineLook; vertical: ResolvedLineLook };
  crosshair: {
    horizontal: ResolvedLineLook;
    vertical: ResolvedLineLook;
    labelBackground: string;
    labelText: string;
  };
  axis: { price: { line: string; text: string }; time: { line: string; text: string } };
  legend: { text: string; label: string };
  /** Null: the watermark's own colour, or the theme's. */
  watermark: { color: string | null };
  lastPrice: { visible: boolean; up: string; down: string; style: LineStyle; width: number };
  /** Null: the session breaks' own settings, or the theme's. */
  sessionBreaks: { color: string | null; style: LineStyle | null; width: number | null };
  /** Null: the high and low lines' own colour. */
  highLow: { color: string | null };
  /** Orders (buy, sell) and positions (profit, loss, entry). Null: the trading config's colours. */
  trading: { buy: string | null; sell: string | null; profit: string | null; loss: string | null; entry: string | null };
  /** Signal markers. Null: their own style's colours. */
  markers: { long: string | null; short: string | null; neutral: string | null };
  /** Trade zones. Null: their own style's colours. */
  tradeZones: { profit: string | null; loss: string | null; active: string | null };
  /** A selected drawing's handles. Null: white. */
  drawings: { handle: string | null };
  /** The main series' line width, for the chart types drawn as a line. */
  series: { lineWidth: number };
}
