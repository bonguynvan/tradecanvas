import type { DataSeries, DrawingState, PanelPosition, PriceChartIndicator, PriceChartOptions, SignalMarker, ViewportState } from '@tradecanvas/commons';
import {
  CHART_SPACING,
  PRICE_AXIS_WIDTH,
  autoPricePrecision,
  formatPrice,
  fractionTick,
  priceFormatterFor,
  readChartStyleOverrides,
  readChartTypeOptions,
  readPaneStyle,
} from '@tradecanvas/commons';
import {
  ChartLegend,
  CompareSymbolIndicator,
  CompareSymbolPaneIndicator,
  CorrelationCoefficientIndicator,
  CorrelationLogIndicator,
  CrosshairHandler,
  CurrentPriceLine,
  DrawingManager,
  DrawingRenderer,
  FOOTPRINT_IMBALANCE,
  FOOTPRINT_MAX_SLOT,
  FootprintRenderer,
  FootprintStore,
  GridRenderer,
  HiLoRenderer,
  IndicatorEngine,
  PointAndFigureRenderer,
  PriceAxis,
  PriceLines,
  SessionBreaks,
  SignalMarkerManager,
  SpreadIndicator,
  SymbolSeriesStore,
  THEME_LOOK_KEYS,
  TimeAxis,
  Viewport,
  VolumeRenderer,
  Watermark,
  panelScale,
  panelScaleTexts,
  panelTagText,
  registerBuiltInDrawingTools,
  registerBuiltInIndicators,
  timestampToBarIndex,
  type ChartRendererInterface,
  type PanelRenderInfo,
  type RenderContext,
} from '@tradecanvas/core';
import { SeriesStore } from '../SeriesStore.js';
import { ThemeManager } from '../ThemeManager.js';
import { isReshapedChartType, resolveRenderer } from '../charts/ChartTypeStrategy.js';
import { LayoutManager } from '../layout/LayoutManager.js';
import { nextPriceAxisWidth, requiredPriceAxisWidth } from '../layout/priceAxisWidth.js';
import { DisplaySeries } from '../model/DisplaySeries.js';
import { footprintRowSize } from '../model/FootprintFeed.js';
import { drawingPaneViewport } from '../model/DrawingPanes.js';
import { IndicatorPanes } from '../model/IndicatorPanes.js';
import { dependencyOrder, renameSources, restorePanes } from '../model/IndicatorSetup.js';
import { PaneLayout } from '../model/PaneLayout.js';
import { PriceFit, hasVolume } from '../model/PriceFit.js';
import { overlaysForLayer, type ChartPlugin } from '../plugins/contracts.js';
import { PluginManager } from '../plugins/PluginManager.js';
import { readFont, readShapes, startOverrides } from '../style/styleOptions.js';
import { EXCHANGE_ZONE } from './checkOptions.js';

/** How far past its values the left scale's range goes, as a share of their span: the chart's own. */
const LEFT_SCALE_PADDING = 0.08;
/** Where a pane of its own may go. */
const PANE_POSITIONS: readonly PanelPosition[] = ['top', 'bottom', 'left', 'right'];
/**
 * How many times the bars are fitted to the plot and the scales sized to
 * their labels before the frame stands: each depends on the other, and they
 * settle in two rounds unless a label's length keeps changing with them.
 */
const MAX_FIT_ROUNDS = 4;
/** The most empty slots kept past the newest bar: more would be a chart of nothing, and a slot each costs time. */
const MAX_RIGHT_MARGIN = 1000;

/** How much room the chart leaves around its bars, for a density. */
type Spacing = (typeof CHART_SPACING)[keyof typeof CHART_SPACING];

/** The width of `text` in `font`, px: a frame is laid out by the context it is drawn on. */
export type MeasureText = (text: string, font: string) => number;

/** A price chart drawn with no page, with the indicators, chart types, drawing tools and overlays of your own it may use. */
export type PriceFrameOptions = PriceChartOptions & {
  /** Plugins, as `new Chart(el, { plugins })` takes them; those registered for every chart are here too. */
  plugins?: ChartPlugin[];
};

/**
 * One frame of a price chart, put together with no page: the bars, their
 * indicators and panes, the scales fitted and the axes sized, as `Chart`
 * puts its own together. What it gives is a `RenderContext` for a
 * `FrameRenderer` to draw. No DOM.
 */
export class PriceFrame {
  private readonly themes: ThemeManager;
  private readonly series = new SeriesStore(() => null);
  private readonly layout = new LayoutManager();
  private readonly indicators = new IndicatorEngine();
  /** Other symbols' bars, for the indicators that read them. */
  private readonly symbols = new SymbolSeriesStore();
  /** Each indicator's name in the options, and the instance it became. */
  private readonly instanceIds = new Map<string, string>();
  private readonly plugins: PluginManager;
  private readonly panes: PaneLayout;
  private readonly indicatorPanes: IndicatorPanes;
  private readonly priceFit: PriceFit;
  private readonly display: DisplaySeries;
  private readonly viewport: Viewport;
  private readonly chartType: string;
  private readonly chartRenderer: ChartRendererInterface;
  private readonly priceAxis = new PriceAxis();
  private readonly leftPriceAxis = new PriceAxis();
  private readonly timeAxis = new TimeAxis();
  private readonly legend = new ChartLegend();
  private readonly lastPrice = new CurrentPriceLine();
  private readonly priceLines = new PriceLines();
  private readonly volume = new VolumeRenderer();
  private readonly grid = new GridRenderer();
  private readonly watermark = new Watermark();
  private readonly sessionBreaks = new SessionBreaks();
  private readonly drawings = new DrawingManager();
  private readonly drawingRenderer: DrawingRenderer;
  private readonly markers = new SignalMarkerManager();
  /** Its only work here is to read a time as the chart's crosshair would, for the drawings' labels. */
  private readonly timeText = new CrosshairHandler();
  private readonly locale: string;
  private readonly priceFormatter: ((price: number) => string) | null;
  private readonly priceUnit: number | null;
  private readonly precision: number | null;
  private priceAxisWidth = PRICE_AXIS_WIDTH;
  private leftAxisWidth = PRICE_AXIS_WIDTH;
  private leftViewport: ViewportState | null = null;
  /** The bars the indicators were last worked out on, when they are not the data's own. */
  private indicatorsOnDrawn: DataSeries | null = null;

  constructor(
    private readonly options: PriceFrameOptions,
    size: { width: number; height: number },
    private readonly measure: MeasureText,
  ) {
    const spacing = CHART_SPACING[options.density === 'compact' ? 'compact' : 'comfortable'];
    this.chartType = options.chartType ?? 'candlestick';
    this.locale = options.numberLocale ?? 'en-US';
    this.precision = wholeDecimals(options.pricePrecision);
    this.priceFormatter = priceFormatterFor(options.priceFormat ?? null);
    this.priceUnit = options.priceFormat && typeof options.priceFormat !== 'function' ? fractionTick(options.priceFormat) : null;
    this.themes = this.makeThemes();
    this.priceFit = new PriceFit(true);
    this.priceFit.setSpacing(spacing);
    // Before the built-in indicators, as the chart has them: one of theirs under a built-in's id is the built-in.
    this.plugins = new PluginManager(this.indicators, { plugins: options.plugins });
    this.chartRenderer = this.makeRenderer();
    this.display = this.makeDisplay();
    this.viewport = this.makeViewport(size, spacing);
    this.layout.resize(size.width, size.height);
    this.indicators.setTheme(this.themes.getTheme());
    this.registerIndicators();
    this.panes = new PaneLayout(this.layout, this.indicators, () => undefined);
    this.indicatorPanes = new IndicatorPanes(this.indicators, this.layout, {
      passStyle: (from, heir) => this.panes.passStyle(from, heir),
      renamePane: (from, to) => this.layout.renamePanel(from, to),
      invalidateScales: () => this.panes.invalidateScales(),
    });
    this.drawingRenderer = new DrawingRenderer(this.drawings);
    this.setUpParts(spacing);
    this.load(options.data);
    this.addIndicators(options.indicators ?? []);
    this.setUpDrawings();
    this.fit();
  }

  /** The theme the frame is drawn in, with the options' font, shapes and style. */
  background(): string {
    return this.themes.getTheme().background;
  }

  /**
   * What a chart on a page knows from the frame before, worked out on the
   * context this one is drawn on: the legend's size, which the drawings'
   * labels keep clear of.
   */
  prepare(ctx: CanvasRenderingContext2D): void {
    if (this.options.features?.legend === false) return;
    this.legend.measure(ctx, this.viewport.getState(), this.themes.getTheme(), this.display.get());
  }

  /** The frame, for a `FrameRenderer`: nothing follows a pointer in it. */
  context(): RenderContext {
    const features = this.options.features ?? {};
    const theme = this.themes.getTheme();
    const data = this.display.get();
    const shows = (key: keyof NonNullable<PriceChartOptions['features']>): boolean => features[key] !== false;
    return {
      leftViewport: this.leftViewport,
      leftPriceAxis: this.leftPriceAxis,
      leftAxisWidth: this.leftAxisWidth,
      chartRenderer: this.chartRenderer,
      priceLines: this.priceLines,
      gridRenderer: shows('grid') && this.options.grid?.visible !== false ? this.grid : null,
      priceAxis: shows('priceAxis') ? this.priceAxis : null,
      timeAxis: shows('timeAxis') ? this.timeAxis : null,
      crosshairHandler: null,
      indicatorEngine: this.indicators,
      drawingRenderer: this.drawingRenderer,
      tradingRenderer: null,
      currentPriceLine: this.lastPrice,
      chartLegend: shows('legend') ? this.legend : null,
      volumeRenderer: shows('volume') ? this.volume : null,
      volumeProfile: null,
      marketProfile: null,
      depthHeatmap: null,
      periodLevels: null,
      pivotMarkers: null,
      watermark: shows('watermark') ? this.watermark : null,
      barCountdown: null,
      sessionBreaks: this.sessionBreaks,
      sessionShading: null,
      compareRenderer: null,
      alertManager: null,
      measureOverlay: null,
      signalMarkerManager: this.markers,
      tradeZoneManager: null,
      panels: this.panels(),
      priceLimits: null,
      timeAxisY: this.panes.timeAxisTop(),
      viewport: { ...this.viewport.getState(), data },
      theme,
      data,
      numberLocale: this.locale,
      indicatorValueLabels: features.indicatorValueLabels ?? false,
      alignAxisLabels: features.alignAxisLabels ?? true,
      drawingAxisSpans: false,
      formatPrice: (price) => this.priceText(price),
      renderOverlayPlugins: (c, layer) => {
        for (const overlay of overlaysForLayer(this.plugins.getOverlays(), layer)) overlay.render(c, { viewport: this.viewport.getState(), data, theme });
      },
    };
  }

  /** The built-in indicators, and those that read another symbol's bars, as the chart has them. */
  private registerIndicators(): void {
    registerBuiltInIndicators(this.indicators);
    for (const [symbol, bars] of Object.entries(this.options.symbolSeries ?? {})) this.symbols.set(symbol.trim(), bars);
    for (const Reader of [CompareSymbolIndicator, CompareSymbolPaneIndicator, SpreadIndicator, CorrelationCoefficientIndicator, CorrelationLogIndicator]) {
      this.indicators.register(new Reader(this.symbols));
    }
  }

  private makeRenderer(): ChartRendererInterface {
    const renderer = resolveRenderer(this.chartType, (type) => this.plugins.getChartType(type));
    if (renderer instanceof HiLoRenderer) renderer.setPriceText((price) => this.priceText(price));
    if (renderer instanceof FootprintRenderer) this.giveFootprint(renderer);
    return renderer;
  }

  /** The rows given, in a store of their own, with the chart type's settings: what `Chart` hands its footprint renderer. */
  private giveFootprint(renderer: FootprintRenderer): void {
    const settings = readChartTypeOptions(this.options.chartTypeOptions ?? {}).footprint ?? {};
    const rows = this.options.footprint ?? [];
    const { data } = this.options;
    // As `Chart` works it out: the size set, the rows' own step, or one from the last price in steps of the price's unit.
    const rowSize = footprintRowSize(settings.rowSize ?? 'auto', rows, data[data.length - 1]?.close ?? 0, this.priceUnit ?? undefined);
    const store = new FootprintStore(Math.max(1, rows.length));
    store.setRowSize(rowSize);
    for (const bar of rows) store.set(bar);
    renderer.setStore(store);
    renderer.setCells(settings.cells ?? 'bidAsk');
    renderer.setImbalance(settings.imbalance ?? FOOTPRINT_IMBALANCE);
    renderer.setTotals(settings.totals !== false);
  }

  /** The series the chart type draws, made from the bars: Heikin-Ashi candles, Renko bricks, a plugin's own. */
  private makeDisplay(): DisplaySeries {
    const typeOptions = readChartTypeOptions(this.options.chartTypeOptions ?? {});
    return new DisplaySeries({
      bars: () => this.series.bars(),
      version: () => this.series.version(),
      chartType: () => this.chartType,
      chartTypeOptions: () => typeOptions,
      lookup: (type) => this.plugins.getChartType(type),
      stepAt: () => this.priceUnit ?? undefined,
      onBoxSize: (box) => {
        if (this.chartRenderer instanceof PointAndFigureRenderer) this.chartRenderer.setBoxSize(box);
      },
    });
  }

  private makeViewport(size: { width: number; height: number }, spacing: Spacing): Viewport {
    const { options } = this;
    const viewport = new Viewport(size.width, size.height, undefined, undefined, Math.min(options.rightMargin ?? spacing.rightMargin, MAX_RIGHT_MARGIN));
    // A footprint's bars carry numbers: as wide as `Chart` lets them get.
    viewport.setBarLayout(options.barLayout ?? spacing.barLayout);
    viewport.setMaxBarSlot(this.chartType === 'footprint' ? FOOTPRINT_MAX_SLOT : null);
    viewport.setScaleMargins({ top: spacing.priceMargin, bottom: spacing.priceMargin });
    viewport.setNumberLocale(this.locale);
    viewport.setPriceFormat(this.priceFormatter, this.priceUnit);
    if (this.precision !== null) viewport.setPricePrecision(this.precision);
    if (options.logScale) viewport.setLogScale(true);
    return viewport;
  }

  private makeThemes(): ThemeManager {
    const { options } = this;
    const themes = new ThemeManager(options.theme);
    themes.setChartType(this.chartType as never);
    const { overrides, rejected } = readChartStyleOverrides(startOverrides(options));
    // Said as the chart says it: a key left out is a look the picture does not have.
    if (rejected.length > 0) console.warn(`Style overrides left out (unknown key or value): ${rejected.join(', ')}`);
    themes.applyOverrides(overrides, 'host');
    if (options.shapes) themes.setShape(readShapes(options.shapes));
    if (options.font) themes.setFont(readFont(options.font));
    return themes;
  }

  /** The parts that draw, each told the locale, the zone and the format the chart tells its own. */
  private setUpParts(spacing: Spacing): void {
    const { options, locale } = this;
    const features = options.features ?? {};
    const zone = timeZoneOf(options.timeZone);
    const evenTimes = !isReshapedChartType(this.chartType as never);
    for (const axis of [this.priceAxis, this.leftPriceAxis]) axis.setLocale(locale);
    this.priceAxis.setReservedPriceProvider(() => (this.lastPrice.isVisible() ? this.lastPrice.getPrice() : null));
    this.timeAxis.setLocale(locale);
    this.timeAxis.setTimezoneOffset(zone);
    this.timeAxis.setTimesPastData(evenTimes);
    this.timeText.setLocale(locale);
    this.timeText.setTimezoneOffset(zone);
    this.timeText.setTimesPastData(evenTimes);
    if (options.timeFormatter) {
      this.timeAxis.setTimeFormatter(options.timeFormatter);
      this.timeText.setTimeFormatter(options.timeFormatter);
    }
    this.legend.setChartType(this.chartType);
    this.legend.setLocale(locale);
    this.legend.setSpacing({ inset: spacing.legendInset, top: spacing.legendTop, lineGap: spacing.legendLineGap });
    if (options.symbol) this.legend.setSymbol(options.symbol);
    this.legend.setTimeframe(options.timeframe ?? '');
    this.lastPrice.setLocale(locale);
    if (options.lastPriceLine === false) this.lastPrice.setVisible(false);
    this.priceLines.setPriceText((price) => this.priceText(price));
    if (options.highLowLines) this.priceLines.setHighLow(true);
    if (options.watermark) this.watermark.setConfig(options.watermark);
    this.sessionBreaks.setTimezone(zone);
    if (options.sessionBreaks) {
      const { visible = true, color, lineStyle, lineWidth } = options.sessionBreaks;
      this.sessionBreaks.setConfig({ visible, color, lineStyle, lineWidth });
    } else if (features.sessionBreaks !== false) {
      this.sessionBreaks.setVisible(true);
    }
    if (this.precision !== null) {
      this.priceAxis.setPricePrecision(this.precision);
      this.lastPrice.setPricePrecision(this.precision);
      this.legend.setPricePrecision(this.precision);
    }
    this.indicators.setTimeframe(options.timeframe ?? null);
  }

  private load(data: DataSeries): void {
    this.series.load(data);
    this.priceFit.newSeries(this.series.length() === 0);
    const bars = this.series.bars();
    const last = bars[bars.length - 1];
    if (last) this.lastPrice.setPrice(last.close);
    this.markers.setDataGetter(() => this.series.bars());
  }

  /** Whether each bar drawn is one of the data's: indicators that read other bars by time are drawn only then. */
  private timeAligned(): boolean {
    return !isReshapedChartType(this.chartType as never) && this.display.get().length === this.series.length();
  }

  /** The bars the indicators are worked out on: the data's, or the bricks drawn on Renko and the like. */
  private indicatorBars(): DataSeries {
    return this.timeAligned() ? this.series.bars() : this.display.get();
  }

  /** The indicators, hosts and sources first so a member finds its pane and a reader its line, then in the order given. */
  private addIndicators(list: readonly PriceChartIndicator[]): void {
    const known = new Set(this.indicators.getAvailableIndicators().map((d) => d.id));
    const given = new Set(list.flatMap((ind) => ind.instanceId ?? []));
    // An indicator with no name of its own is called by its place in the list, under a name none of the others has.
    const placeName = (i: number): string => {
      let name = `#${i}`;
      while (given.has(name)) name = `#${name}`;
      return name;
    };
    const named = list.map((ind, i) => ({ ...ind, instanceId: ind.instanceId ?? placeName(i), params: { ...ind.params } }));
    const ids = this.instanceIds;
    const added: [(typeof named)[number], string][] = [];
    for (const ind of dependencyOrder(named)) {
      if (!known.has(ind.id)) throw new RangeError(`renderPriceChart: no indicator is called '${ind.id}'`);
      const params = renameSources(ind.params, ids) as Record<string, number | string | boolean>;
      const descriptor = this.indicators.getAvailableIndicators().find((d) => d.id === ind.id);
      const requested = ind.pane ? ids.get(ind.pane) : undefined;
      const pane = descriptor ? this.indicatorPanes.paneFor(descriptor, params, requested) : null;
      // Under the name it was given, where it was given one: a drawing on its pane is found by it.
      const instanceId = this.indicators.addIndicator(ind.id, params, this.indicatorBars(), {
        ...(pane ? { pane } : {}),
        ...(ind.scale === 'left' ? { scale: 'left' as const } : {}),
        ...(given.has(ind.instanceId) ? { instanceId: ind.instanceId } : {}),
      });
      if (descriptor?.placement === 'panel' && !pane) this.layout.addPanel(instanceId, PANE_POSITIONS.find((p) => p === ind.position) ?? 'bottom');
      ids.set(ind.instanceId, instanceId);
      added.push([ind, instanceId]);
      this.dress(instanceId, ind);
    }
    this.indicators.orderIndicators(named.flatMap((ind) => ids.get(ind.instanceId) ?? []));
    restorePanes(this.layout, added);
    // A setup written by hand names a pane's scale without its size, which a saved one always has.
    for (const [ind, instanceId] of added) {
      if (ind.paneSize !== undefined || !(ind.paneLog || ind.paneInvert || ind.panePercent)) continue;
      this.layout.setPanelScale(instanceId, { log: !!ind.paneLog, invert: !!ind.paneInvert, percent: !!ind.panePercent });
    }
    this.indicatorsOnDrawn = this.timeAligned() ? null : this.display.get();
  }

  /** An indicator's own look, levels, intervals and pane style, where the options give them. */
  private dress(instanceId: string, ind: PriceChartIndicator): void {
    if (ind.style) {
      const { plots, ...style } = ind.style;
      this.indicators.updateIndicatorStyle(instanceId, style);
      this.indicators.followThemeLook(instanceId, THEME_LOOK_KEYS.filter((key) => ind.style![key] === undefined));
      if (plots) this.indicators.setPlotStyles(instanceId, plots);
    }
    if (ind.visible === false) this.indicators.setVisible(instanceId, false);
    if (ind.levels) this.indicators.setLevels(instanceId, ind.levels);
    if (ind.intervals) this.indicators.setIntervals(instanceId, ind.intervals);
    if (ind.paneStyle) this.panes.setStyle(instanceId, readPaneStyle(ind.paneStyle));
  }

  private setUpDrawings(): void {
    const { options } = this;
    registerBuiltInDrawingTools(this.drawings);
    for (const plugin of this.plugins.list()) if (plugin.kind === 'drawing') this.drawings.register(plugin.plugin);
    this.drawings.setDataGetter(() => this.series.bars(), () => this.series.revision());
    this.drawings.setDisplayDataGetter(() => this.display.get());
    this.drawings.setTimeframe(options.timeframe ?? null);
    this.drawings.setPanes({
      paneAt: () => null,
      viewportOf: (id) => this.drawingPaneViewport(id),
      hasPane: (id) => this.layout.getPanels().some((panel) => panel.id === id),
      valuesAt: (id, barIndex) => this.indicators.getPaneValuesAt(id, barIndex),
    });
    this.drawingRenderer.setKeepOut(() => this.legendKeepOut());
    this.drawingRenderer.setTimeFormat((time) => this.timeText.formatTime(time, this.display.get()));
    if (options.drawings?.length) this.drawings.setDrawings(options.drawings.map((drawing, i) => this.wholeDrawing(drawing, i)));
    if (options.markers?.length) this.markers.setMarkers(options.markers.map((marker, i): SignalMarker => ({ ...marker, id: marker.id ?? `marker-${i}` })));
  }

  /** A drawing with what a hand-written one may leave out, as `addDrawing` fills it in, on the pane its indicator has here. */
  private wholeDrawing(drawing: NonNullable<PriceChartOptions['drawings']>[number], place: number): DrawingState {
    const paneId = typeof drawing.paneId === 'string' ? this.instanceIds.get(drawing.paneId) ?? drawing.paneId : undefined;
    return {
      ...drawing,
      id: drawing.id ?? `drawing-${place}`,
      anchors: drawing.anchors.map((anchor) => ({ ...anchor })),
      style: { ...this.drawings.getActiveStyle(), ...drawing.style },
      visible: drawing.visible ?? true,
      locked: drawing.locked ?? false,
      ...(paneId !== undefined ? { paneId } : {}),
    };
  }

  /** A pane's scale for a drawing on it: the panes stacked over and under the price pane take one. */
  private drawingPaneViewport(paneId: string): ViewportState | null {
    const panel = this.layout.getPanels().find((p) => p.id === paneId);
    return drawingPaneViewport(
      panel,
      !!panel && this.layout.isPanelShownCollapsed(paneId),
      () => this.panels().find((p) => p.instanceId === paneId)?.viewport,
      () => this.display.get(),
    );
  }

  /** The legend's rows as drawn: the drawings' labels keep clear of them. */
  private legendKeepOut(): { x: number; y: number; width: number; height: number }[] {
    if (this.options.features?.legend === false) return [];
    const plot = this.viewport.getState().chartRect;
    const width = this.legend.getWidth();
    const height = this.legend.getHeight();
    return width > 0 && height > 0 ? [{ x: plot.x, y: plot.y, width, height }] : [];
  }

  /**
   * The layout, the bars on view, both scales fitted and sized. The bars
   * are fitted to the plot, the plot is what the scales leave, and a scale
   * is as wide as the labels of the bars on view. A chart on a page has its
   * scales sized for the view it opens at by the time it is told what to
   * show, and a scale grows at once but gives room back only when much is
   * spare: so the frame opens as a chart does, then shows its bars, and
   * goes round until the scales stand.
   */
  private fit(): void {
    this.indicators.setBarsTimed(this.timeAligned());
    this.layout.setPanelsAside(this.panes.offChartType());
    this.layout.setLeftAxisWidth(this.leftScaleShown() ? this.leftAxisWidth : 0);
    this.openView();
    for (let round = 0; round < MAX_FIT_ROUNDS; round++) {
      this.panes.invalidate();
      this.viewport.setChartRect(this.panes.resolved().mainChartRect);
      this.showBars();
      // The plot again once the bars are placed, as the chart takes it after a fit: the same sums, to the last digit.
      this.viewport.setChartRect(this.panes.resolved().mainChartRect);
      if (!this.fitDataAndAxes()) break;
    }
  }

  /** The view a chart opens at when it is given its bars: the newest of them at its opening zoom, the scales sized for those. */
  private openView(): void {
    this.panes.invalidate();
    this.viewport.setChartRect(this.panes.resolved().mainChartRect);
    this.viewport.updateData(this.display.get(), false);
    this.viewport.scrollToEnd();
    // A scale that changed width changed the plot: the newest bars are at its edge again.
    if (this.fitDataAndAxes()) this.viewport.scrollToEnd();
  }

  /** The bars on view: the range asked for, or all of them (the newest where they do not fit). */
  private showBars(): void {
    const data = this.display.get();
    this.viewport.updateData(data, false);
    if (data.length === 0) return;
    const range = this.options.visibleRange;
    if (range && Number.isFinite(range.from) && Number.isFinite(range.to)) {
      this.viewport.zoomToBarRange(timestampToBarIndex(Math.min(range.from, range.to), data), timestampToBarIndex(Math.max(range.from, range.to), data));
      return;
    }
    this.viewport.zoomToBarRange(0, data.length - 1 + this.viewport.getRightMargin());
    this.viewport.scrollToEnd();
  }

  /** The price scales fitted to the bars on view and sized to their labels; true when a scale changed width, and so the plot. */
  private fitDataAndAxes(): boolean {
    const shown = this.applyData();
    const priceResized = this.fitPriceAxisWidth();
    this.leftViewport = this.computeLeftViewport();
    const resized = this.fitLeftAxisWidth() || priceResized;
    if (resized) this.applyData();
    this.priceFit.settle(this.viewport.getState(), shown.length);
    this.leftViewport = this.computeLeftViewport();
    return resized;
  }

  private applyData(): DataSeries {
    const data = this.display.get();
    this.syncIndicatorBars(data);
    this.viewport.updateData(data, false);
    const state = this.viewport.getState();
    if (data.length > 0) {
      const base = Math.max(0, Math.min(state.visibleRange.from, data.length - 1));
      this.viewport.setScaleBaseline(data[base]?.close);
    }
    if (this.priceFit.shouldFit()) {
      this.priceFit.fit(this.viewport, data, this.viewport.getState(), {
        overlayRange: (from, to) => this.indicators.getOverlayPriceRange(from, to),
        compareRange: () => null,
        volumeRatio: (bars, from, to) => (this.volumeShown() && hasVolume(bars, from, to) ? this.volume.getHeightRatio() : null),
        // As `Chart`: a footprint's totals stand under its bars.
        footRoom: (bars, vs) => (this.chartRenderer instanceof FootprintRenderer ? this.chartRenderer.totalsRoom(vs, this.themes.getTheme(), bars) : 0),
      });
    }
    return data;
  }

  /** A box worked out from the bars makes other bricks: the indicators follow the bars drawn. */
  private syncIndicatorBars(data: DataSeries): void {
    const aligned = this.timeAligned();
    if (aligned ? this.indicatorsOnDrawn === null : this.indicatorsOnDrawn === data) return;
    const bars = aligned ? this.series.bars() : data;
    this.indicators.recalculateAll(bars);
    this.indicatorsOnDrawn = aligned ? null : bars;
  }

  private volumeShown(): boolean {
    return this.options.features?.volume !== false && this.volume.isVisible();
  }

  private leftScaleShown(): boolean {
    return this.options.features?.priceAxis !== false && this.indicators.hasLeftScaleOverlays();
  }

  private panels(): PanelRenderInfo[] {
    return this.panes.panels(() => this.viewport.getState());
  }

  /** The left scale's own range: the values of the overlays on it, with room around them. */
  private computeLeftViewport(): ViewportState | null {
    if (!this.leftScaleShown()) return null;
    const state = this.viewport.getState();
    const range = this.indicators.getOverlayPriceRange(state.visibleRange.from, state.visibleRange.to, 'left');
    if (!range) return state;
    const span = range.max - range.min || Math.abs(range.max) || 1;
    return {
      ...state,
      priceRange: { min: range.min - span * LEFT_SCALE_PADDING, max: range.max + span * LEFT_SCALE_PADDING },
      logScale: false,
      scaleMode: 'regular',
      invertScale: false,
      formatPrice: undefined,
      pricePrecision: undefined,
      priceUnit: undefined,
    };
  }

  /** The price scale as wide as its widest label; true when the width, and so the plot, changed. */
  private fitPriceAxisWidth(): boolean {
    if (this.options.features?.priceAxis === false) return false;
    const { priceRange } = this.viewport.getState();
    const theme = this.themes.getTheme();
    const required = requiredPriceAxisWidth({
      min: priceRange.min,
      max: priceRange.max,
      lastPrice: this.lastPrice.getPrice(),
      tagPrecision: this.precision,
      locale: this.locale,
      format: this.priceFormatter,
      scaleLabel: (price) => this.priceAxis.labelText(price, this.viewport.getState()),
      ...this.paneAxisTexts(),
      crosshairChange: theme.style?.crosshair.labelChange ?? false,
      fontFamily: theme.font.family,
      fontSizeSmall: theme.font.sizeSmall,
      measure: this.measure,
    });
    const next = nextPriceAxisWidth(this.priceAxisWidth, required);
    if (next === this.priceAxisWidth) return false;
    this.priceAxisWidth = next;
    this.layout.setPriceAxisWidth(next);
    this.viewport.setPriceAxisWidth(next);
    this.panes.invalidate();
    this.viewport.setChartRect(this.panes.resolved().mainChartRect);
    return true;
  }

  private fitLeftAxisWidth(): boolean {
    const left = this.leftViewport;
    if (!left) return false;
    const theme = this.themes.getTheme();
    const required = requiredPriceAxisWidth({
      min: left.priceRange.min,
      max: left.priceRange.max,
      lastPrice: null,
      tagPrecision: null,
      locale: this.locale,
      fontFamily: theme.font.family,
      fontSizeSmall: theme.font.sizeSmall,
      measure: this.measure,
    });
    const next = nextPriceAxisWidth(this.leftAxisWidth, required);
    if (next === this.leftAxisWidth) return false;
    this.leftAxisWidth = next;
    this.layout.setLeftAxisWidth(next);
    this.panes.invalidate();
    this.viewport.setChartRect(this.panes.resolved().mainChartRect);
    return true;
  }

  /** What the indicator panes write on the price axis: the strip they share is as wide as the widest of them. */
  private paneAxisTexts(): { paneLabels: string[]; paneTags: string[] } {
    const panes = this.panels().filter((p) => p.rect.height > 0 && panelScale(p.viewport) !== null);
    const paneLabels = panes.flatMap((p) => panelScaleTexts(p.viewport, this.locale));
    const paneTags = this.options.features?.indicatorValueLabels
      ? panes.flatMap((p) => [p.instanceId, ...(p.members ?? [])].flatMap((id) => this.indicators.getLatestValues(id)).map((v) => panelTagText(v.value, p.viewport, this.locale)))
      : [];
    return { paneLabels, paneTags };
  }

  private priceText(price: number): string {
    if (this.priceFormatter) return this.priceFormatter(price);
    const { min, max } = this.viewport.getState().priceRange;
    return formatPrice(price, this.precision ?? autoPricePrecision(min, max), this.locale);
  }
}

/** Decimals a price can show: a whole number from 0 up, or none given. */
function wholeDecimals(precision: number | undefined): number | null {
  return typeof precision === 'number' && Number.isInteger(precision) && precision >= 0 && precision <= 20 ? precision : null;
}

/** The zone times are read in: a name or minutes from UTC (checked before the frame is made); null is the machine's own. */
function timeZoneOf(zone: string | number | null | undefined): string | number | null {
  if (zone === EXCHANGE_ZONE) return 'UTC';
  return zone ?? null;
}
