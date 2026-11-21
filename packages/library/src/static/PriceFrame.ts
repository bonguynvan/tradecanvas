import type { DataSeries, PanelPosition, PriceChartIndicator, PriceChartOptions, ViewportState } from '@tradecanvas/commons';
import {
  CHART_SPACING,
  PRICE_AXIS_WIDTH,
  autoPricePrecision,
  formatPrice,
  fractionTick,
  isValidTimeZone,
  priceFormatterFor,
  readChartStyleOverrides,
  readChartTypeOptions,
  readPaneStyle,
} from '@tradecanvas/commons';
import {
  ChartLegend,
  CrosshairHandler,
  CurrentPriceLine,
  DrawingManager,
  DrawingRenderer,
  GridRenderer,
  HiLoRenderer,
  IndicatorEngine,
  PointAndFigureRenderer,
  PriceAxis,
  PriceLines,
  SessionBreaks,
  SignalMarkerManager,
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
import { drawingPaneViewport } from '../model/DrawingPanes.js';
import { IndicatorPanes } from '../model/IndicatorPanes.js';
import { dependencyOrder, renameSources, restorePanes } from '../model/IndicatorSetup.js';
import { PaneLayout } from '../model/PaneLayout.js';
import { PriceFit, hasVolume } from '../model/PriceFit.js';
import { overlaysForLayer, type ChartPlugin } from '../plugins/contracts.js';
import { PluginManager } from '../plugins/PluginManager.js';
import { readFont, readShapes, startOverrides } from '../style/styleOptions.js';

/** How far past its values the left scale's range goes, as a share of their span: the chart's own. */
const LEFT_SCALE_PADDING = 0.08;
/** Where a pane of its own may go. */
const PANE_POSITIONS: readonly PanelPosition[] = ['top', 'bottom', 'left', 'right'];

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
    registerBuiltInIndicators(this.indicators);
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

  private makeRenderer(): ChartRendererInterface {
    const renderer = resolveRenderer(this.chartType, (type) => this.plugins.getChartType(type));
    if (renderer instanceof HiLoRenderer) renderer.setPriceText((price) => this.priceText(price));
    return renderer;
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
    const viewport = new Viewport(size.width, size.height, undefined, undefined, options.rightMargin ?? spacing.rightMargin);
    viewport.setBarLayout(options.barLayout ?? spacing.barLayout);
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
    themes.applyOverrides(readChartStyleOverrides(startOverrides(options)).overrides, 'host');
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
    // An indicator with no name of its own is called by its place in the list.
    const named = list.map((ind, i) => ({ ...ind, instanceId: ind.instanceId ?? `#${i}`, params: { ...ind.params } }));
    const ids = new Map<string, string>();
    const added: [(typeof named)[number], string][] = [];
    for (const ind of dependencyOrder(named)) {
      if (!known.has(ind.id)) throw new RangeError(`renderPriceChart: no indicator is called '${ind.id}'`);
      const params = renameSources(ind.params, ids) as Record<string, number | string | boolean>;
      const descriptor = this.indicators.getAvailableIndicators().find((d) => d.id === ind.id);
      const requested = ind.pane ? ids.get(ind.pane) : undefined;
      const pane = descriptor ? this.indicatorPanes.paneFor(descriptor, params, requested) : null;
      const instanceId = this.indicators.addIndicator(ind.id, params, this.indicatorBars(), {
        ...(pane ? { pane } : {}),
        ...(ind.scale === 'left' ? { scale: 'left' as const } : {}),
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
    if (options.drawings?.length) this.drawings.setDrawings(options.drawings.map((drawing) => ({ ...drawing })));
    if (options.markers?.length) this.markers.setMarkers(options.markers.map((marker) => ({ ...marker })));
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

  /** The layout, the bars on view, both scales fitted and sized: the chart's own order. */
  private fit(): void {
    this.indicators.setBarsTimed(this.timeAligned());
    this.layout.setPanelsAside(this.panes.offChartType());
    this.panes.invalidate();
    this.layout.setLeftAxisWidth(this.leftScaleShown() ? this.leftAxisWidth : 0);
    this.viewport.setChartRect(this.panes.resolved().mainChartRect);
    this.showBars();
    this.panes.invalidate();
    this.viewport.setChartRect(this.panes.resolved().mainChartRect);
    this.fitDataAndAxes();
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

  private fitDataAndAxes(): void {
    const shown = this.applyData();
    const priceResized = this.fitPriceAxisWidth();
    this.leftViewport = this.computeLeftViewport();
    if (this.fitLeftAxisWidth() || priceResized) this.applyData();
    this.priceFit.settle(this.viewport.getState(), shown.length);
    this.leftViewport = this.computeLeftViewport();
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

/** The zone times are read in: a name the runtime knows or minutes from UTC; null is the machine's own. */
function timeZoneOf(zone: string | number | null | undefined): string | number | null {
  if (typeof zone === 'number') {
    if (!Number.isFinite(zone)) throw new RangeError(`renderPriceChart: invalid UTC offset: ${zone}`);
    return zone;
  }
  if (typeof zone === 'string') {
    if (!isValidTimeZone(zone)) throw new RangeError(`renderPriceChart: unknown time zone: ${zone}`);
    return zone;
  }
  return null;
}
