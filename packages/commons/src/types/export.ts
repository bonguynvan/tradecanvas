import type { Theme, ThemeName } from './theme.js';
import type { ChartOptions, FeaturesConfig } from './chart.js';
import type { DrawingState, DrawingStyle } from './drawing.js';
import type { IndicatorIntervals, IndicatorStyleConfig } from './indicator.js';
import type { DataSeries, TimeFrame } from './ohlc.js';
import type { SignalMarker } from './signal.js';
import type { PaneStyle } from './style.js';

/** How a chart is made into a picture. */
export interface ChartImageOptions {
  /** The picture's format. Default `'png'`: `'jpeg'` and `'webp'` make a smaller file and lose a little. */
  type?: 'png' | 'jpeg' | 'webp';
  /** How much of the picture `'jpeg'` and `'webp'` keep, 0 to 1. Default `0.92`. */
  quality?: number;
  /**
   * The picture's pixels to one of the chart's own (CSS) pixels: 2 for a
   * picture twice as sharp as a plain screen shows, 3 for paper. Default:
   * the screen's own ratio, and 2 for paper (`print`, `toPdf`). It is held to
   * what a browser can draw: no side past 16,384 pixels, no more than some 16
   * million pixels in all.
   */
  pixelRatio?: number;
  /**
   * The theme the picture is drawn in, when not the one the chart has:
   * `'light'` for paper, which `print` and `toPdf` take when this is left out.
   */
  theme?: ThemeName | Theme;
  /**
   * The picture's size in CSS pixels, when not the chart's own: the chart is
   * laid out again for it, and the one on the page is left as it is. A side
   * left out is the chart's own. The price chart keeps the bars it has on
   * view, as wide as the size makes them (within what a bar can be), and
   * leaves out what follows the pointer; a grid of charts gives each chart
   * its share. A size with no room for a plot gives no picture.
   */
  width?: number;
  height?: number;
}

/** What `print` takes: how the chart is made into a picture (a PNG, always), and the printed page's title. */
export interface ChartPrintOptions extends Omit<ChartImageOptions, 'type' | 'quality'> {
  /** The title of the page that is printed: browsers write it in the page's header, and offer it as a file name. */
  title?: string;
}

/** The paper a PDF's pages are, and how a picture lies on one. */
export interface PdfPageOptions {
  /** The paper by its name, or its two sides in millimetres. Default `'a4'`. */
  pageSize?: 'a3' | 'a4' | 'letter' | 'legal' | { width: number; height: number };
  /** `'landscape'` (default): the longer side across, as a chart is wider than it is high. */
  orientation?: 'landscape' | 'portrait';
  /** The room left round the picture, mm. Default `12`. */
  margin?: number;
  /** The document's title, as a reader shows it in its window and its properties. */
  title?: string;
}

/** What `toPdf` takes: how the chart is made into a picture, and the page it goes on. */
export interface ChartPdfOptions extends Omit<ChartImageOptions, 'type' | 'quality'>, PdfPageOptions {}

/**
 * An indicator on a price chart drawn with no page (`renderPriceChart`). It
 * reads as a saved layout's does: what `chart.getIndicatorSetup()` gives for
 * one goes in as it is.
 */
export interface PriceChartIndicator {
  /** Which indicator: `'sma'`, `'rsi'`, `'bb'`, `'macd'`… */
  id: string;
  /** A name for this one, for another to refer to: `pane`, or a `source` of `'ind:<instanceId>:<line>'`. */
  instanceId?: string;
  /** Its inputs; the indicator's own defaults for those left out. */
  params?: Record<string, unknown>;
  /** For one with a pane of its own: `'bottom'` (the default), under the price pane, or `'top'`, over it. */
  position?: string;
  /** The `instanceId` of the indicator whose pane it is drawn in, on that pane's scale. */
  pane?: string;
  /** `'left'`: an overlay on a price scale of its own, at the left. */
  scale?: 'left';
  /** `false`: worked out, for the others that read its lines, and not drawn. */
  visible?: boolean;
  /** Its reference levels; the indicator's own with none. */
  levels?: number[];
  /** Its lines' colours, widths and look. */
  style?: IndicatorStyleConfig;
  /** The intervals it shows on (`timeframe` says the chart's); all of them with none. */
  intervals?: IndicatorIntervals;
  /** Its pane's own background and separator. */
  paneStyle?: PaneStyle;
  /** Its pane's share of the height, to the price pane's 1. */
  paneSize?: number;
  /** Its pane's place among the panes, from the top. */
  paneOrder?: number;
  /** Its pane folded to its title. */
  paneCollapsed?: boolean;
  /** Its pane over the whole chart, the price pane kept to a strip. */
  paneMaximized?: boolean;
  /** Its pane's scale logarithmic. */
  paneLog?: boolean;
  /** Its pane's scale upside down. */
  paneInvert?: boolean;
  /** Its pane's scale in percent of the first value on view. */
  panePercent?: boolean;
}

/**
 * A drawing on a price chart drawn with no page: as `chart.getDrawings()`
 * gives one, or as `chart.addDrawing()` takes one, where the id, the style
 * it leaves out, `visible` and `locked` are filled in.
 */
export type PriceChartDrawing = Omit<DrawingState, 'id' | 'style' | 'visible' | 'locked'> & {
  id?: string;
  style?: Partial<DrawingStyle>;
  visible?: boolean;
  locked?: boolean;
};

/** A buy or sell mark on a price chart drawn with no page: a signal marker, with or without an id. */
export type PriceChartMarker = Omit<SignalMarker, 'id'> & { id?: string };

/** What a price chart drawn with no page shows or leaves out; each is shown unless it is `false`. */
export type PriceChartFeatures = Pick<
  FeaturesConfig,
  'volume' | 'grid' | 'priceAxis' | 'timeAxis' | 'legend' | 'watermark' | 'sessionBreaks' | 'indicatorValueLabels' | 'alignAxisLabels'
>;

/**
 * A price chart drawn with no page (`renderPriceChart`): the bars, and what
 * `Chart` takes of how they look. It is one frame: nothing follows a pointer
 * and nothing moves.
 */
export interface PriceChartOptions
  extends Pick<
    ChartOptions,
    | 'chartType'
    | 'chartTypeOptions'
    | 'theme'
    | 'font'
    | 'shapes'
    | 'overrides'
    | 'grid'
    | 'density'
    | 'rightMargin'
    | 'barLayout'
    | 'logScale'
    | 'numberLocale'
    | 'priceFormat'
    | 'timeFormatter'
    | 'watermark'
    | 'sessionBreaks'
    | 'highLowLines'
  > {
  /** The bars, oldest first. One that is no bar (a price missing, a high under its low) is left out. */
  data: DataSeries;
  /** The symbol's name, for the legend. */
  symbol?: string;
  /** The bars' interval (`'1d'`, `'15m'`): the legend names it, and indicators kept to some intervals follow it. */
  timeframe?: TimeFrame;
  /** The indicators, in the order they are listed and drawn. */
  indicators?: PriceChartIndicator[];
  /**
   * Drawings on the chart, as `chart.getDrawings()` gives them or as
   * `chart.addDrawing()` takes one. One with a `paneId` is on the pane of
   * the indicator of that `instanceId`.
   */
  drawings?: PriceChartDrawing[];
  /** Buy and sell marks on the bars, as `chart.addSignalMarker()` takes one. */
  markers?: PriceChartMarker[];
  /**
   * Other symbols' bars, by symbol, for the indicators that read them
   * (`'compareSymbol'`, `'compareSymbolPane'`, `'spread'`, `'correlation'`,
   * `'correlationlog'`): what `chart.setSymbolSeries()` gives a chart on a
   * page. An indicator whose symbol is not here draws nothing.
   */
  symbolSeries?: Record<string, DataSeries>;
  /**
   * The times (ms) of the first and the last bar on view, as
   * `chart.setVisibleRange()` takes them. With none, every bar is on view
   * when they fit and the newest ones when they do not, as
   * `chart.fitContent()` shows them.
   */
  visibleRange?: { from: number; to: number };
  /**
   * The zone times are read in: an IANA name (`'Asia/Ho_Chi_Minh'`) or
   * minutes east of UTC. With none it is the machine's own, which on a
   * server is seldom your readers': name theirs. `'exchange'` reads as UTC:
   * a still chart has no exchange to ask.
   */
  timeZone?: string | number | null;
  /** The decimals prices show, a whole number from 0 to 20; fitted to the prices on view with none. */
  pricePrecision?: number;
  /** A line and a tag at the last close. Default `true`. */
  lastPriceLine?: boolean;
  /** What is shown or left out. */
  features?: PriceChartFeatures;
  /**
   * The `Path2D` of your canvas library, where there is no global one: Node
   * has none, and `@napi-rs/canvas` and `skia-canvas` each export theirs. A
   * browser and a worker need none.
   */
  path2D?: typeof Path2D;
}

