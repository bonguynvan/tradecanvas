import type { DataAdapter, OHLCBar, TimeFrame } from '@tradecanvas/commons';
import { timeframeLabel } from './widgetTimeframes.js';
import { barsBefore, comparedEntries, compareWayOptions, isCompareWay, withOlderBars, type CompareWay, type PercentCompare } from './widgetCompare.js';
import { withResampling } from '@tradecanvas/core';
import { fill } from './i18n.js';
import type { ChartWidget } from './ChartWidget.js';

/**
 * Distinct line colours for comparison overlays, cycled by add order. Each
 * keeps 3:1 on both the dark ink and the light paper, as the palette's marks
 * do, and the first is none of the indicators' first colours (the blue of a
 * first EMA, a drawing and an alert).
 */
const COMPARE_COLORS = ['#b552c9', '#1398a8', '#d4622b', '#e25592', '#6f7a8c', '#3e9a4f'];

/** What the compares read of the widget around them, and ask of it. */
export interface ComparesHost {
  readonly adapter: ChartWidget['adapter'];
  readonly chart: ChartWidget['chart'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly featureState: ChartWidget['featureState'];
  readonly options: ChartWidget['options'];
  refreshObjects: ChartWidget['refreshObjects'];
  refreshScaleSwitches: ChartWidget['refreshScaleSwitches'];
  say: ChartWidget['say'];
  scheduleLegend: ChartWidget['scheduleLegend'];
  readonly settings: ChartWidget['settings'];
  readonly settingsState: ChartWidget['settingsState'];
  showScaleMode: ChartWidget['showScaleMode'];
  shownSettings: ChartWidget['shownSettings'];
  readonly state: ChartWidget['state'];
  symbolEntries: ChartWidget['symbolEntries'];
  readonly symbolLoads: ChartWidget['symbolLoads'];
  readonly symbolSearch: ChartWidget['symbolSearch'];
  symbolSearchFn: ChartWidget['symbolSearchFn'];
  readonly t: ChartWidget['t'];
  withSymbolSearch: ChartWidget['withSymbolSearch'];
}

/**
 * The symbols compared with the chart's: the compare dialog, their bars fetched at the chart's
 * interval and deepened as the chart pages back, the indicators drawing them, the percent scale
 * they hold, and the symbols the chart's indicators read.
 */
export class WidgetCompares {
  constructor(private readonly host: ComparesHost) {}

  compares: PercentCompare[] = [];

  /** How the compare dialog adds a symbol: the way picked last. */
  private compareWay: CompareWay = 'percent';

  /** Symbols whose bars are on the way to be compared in percent. */
  private readonly comparesLoading = new Set<string>();

  /**
   * Set by the first percent compare, cleared when the last one goes or the
   * user picks a scale meanwhile: while set, a regular price scale reads in
   * percent, as the compare lines do (`effectiveScaleMode`). Never saved.
   */
  compareScaleHeld = false;

  /** The latest round of percent compare fetches: an older round's answers are dropped. */
  private compareFetchSeq = 0;

  /** The percent compares' older stretches are on their way; `compareOlderAgain`: more pages came meanwhile. */
  private compareOlderBusy = false;

  private compareOlderAgain = false;

  /** Older bars asked no stretch of a compare whose bars were still at another interval: a round once they come. */
  private compareOlderPassed = false;

  async handleAddCompare(): Promise<void> {
    if (!this.host.featureState.compare) return;
    if (!this.host.adapter) {
      this.host.say(this.host.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    this.host.withSymbolSearch(() => this.host.featureState.compare, (search) => search.openCompare({
      symbols: this.host.symbolEntries(),
      current: this.host.state.symbol,
      search: this.host.symbolSearchFn(),
      ways: compareWayOptions(this.host.t),
      way: this.compareWay,
      compared: this.comparedNow(),
      onAdd: (symbol, way) => {
        if (!isCompareWay(way)) return;
        this.compareWay = way;
        void this.addCompareSymbol(symbol, way);
      },
      onRemove: (id) => this.removeCompared(id),
    }));
  }

  /** What is compared with the chart's symbol now, as the compare dialog lists it. */
  comparedNow(): ReturnType<typeof comparedEntries> {
    const ownPanes = new Set(this.host.chart.getIndicatorPanes().flatMap((p) => p.instanceIds));
    return comparedEntries(this.compares, this.host.chart.getActiveIndicators(), ownPanes, this.host.t);
  }

  /** The compare dialog's list, after something was compared or taken off. */
  refreshCompareDialog(): void {
    if (this.host.symbolSearch?.isComparing()) this.host.symbolSearch.setCompared(this.comparedNow());
  }

  /**
   * Compare with another symbol: its percent change on the price scale
   * (`'percent'`, the default), its price on a scale of its own (`'scale'`)
   * or in a pane of its own (`'pane'`), the spread or ratio of this symbol
   * to it (`'spread'`, `'ratio'`), or how they correlate, by price or by
   * bar-to-bar returns (`'correlation'`, `'correlationLog'`). Its bars come
   * through the adapter, first, in every way: when the fetch fails or finds
   * no bars at the chart's interval, nothing is added and a toast says why.
   */
  async addCompareSymbol(symbol: string, way: CompareWay = 'percent'): Promise<void> {
    if (!this.host.adapter) {
      this.host.say(this.host.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    if (way !== 'percent') {
      await this.addCompareIndicator(this.host.adapter, symbol, way);
      return;
    }
    // The chart takes no compare lines: none to list, nor a scale to hold for them.
    if (this.host.chart.getFeatures()?.compareSymbols === false) return;
    // On the chart already, or its bars on the way (picked twice in a row).
    if (this.compares.some((c) => c.symbol === symbol) || this.comparesLoading.has(symbol)) return;
    const id = `cmp_${symbol}`;
    this.comparesLoading.add(symbol);
    try {
      const bars = await this.fetchCompareBars(this.host.adapter, symbol);
      if (!bars || this.compares.some((c) => c.symbol === symbol)) return;
      // They come at the interval on screen.
      const timeframe = this.host.state.timeframe;
      const color = COMPARE_COLORS[this.compares.length % COMPARE_COLORS.length];
      // Each line is its symbol's change from the first bar on screen, so
      // symbols of any price (BTC beside a $2 coin) read on one percent scale.
      if (this.compares.length === 0) this.host.chart.setCompareMode('percent');
      this.host.chart.addCompareSymbol(id, symbol, bars, color);
      this.compares = [...this.compares, { id, symbol, color, bars, timeframe }];
      if (this.compares.length === 1) this.holdCompareScale(true);
      this.host.scheduleLegend();
      this.host.refreshObjects();
      this.refreshCompareDialog();
      this.host.say(fill(this.host.t('toast.comparing'), { symbol }));
    } finally {
      this.comparesLoading.delete(symbol);
    }
  }

  /**
   * A compare that is an indicator (on its own scale or pane, a spread, a
   * correlation), its bars first, as the percent way does. A symbol the feed
   * can't serve at this interval then adds nothing, rather than an empty
   * line that stays in the chart's saves. The bars go to the chart before
   * the indicator, so it finds them there and asks for none.
   */
  private async addCompareIndicator(adapter: DataAdapter, symbol: string, way: Exclude<CompareWay, 'percent'>): Promise<void> {
    const bars = await this.fetchCompareBars(adapter, symbol);
    if (!bars) return;
    this.host.chart.setSymbolSeries(symbol, bars);
    // The pane way is an indicator of its own: a price-pane line can't open a pane.
    if (way === 'scale') this.host.chart.addIndicator('compareSymbol', { symbol }, 'bottom', { scale: 'left' });
    else if (way === 'pane') this.host.chart.addIndicator('compareSymbolPane', { symbol });
    else if (way === 'correlation') this.host.chart.addIndicator('correlation', { symbol });
    else if (way === 'correlationLog') this.host.chart.addIndicator('correlationlog', { symbol });
    else this.host.chart.addIndicator('spread', { symbol, mode: way });
  }

  /**
   * The other symbol's bars at the chart's interval, for a compare about to
   * be added: fetched again when the interval changed while they loaded, so
   * they are checked, and added, at the one on screen. Null, with a toast,
   * when they fail or there are none.
   */
  private async fetchCompareBars(adapter: DataAdapter, symbol: string): Promise<OHLCBar[] | null> {
    for (;;) {
      const timeframe = this.host.state.timeframe;
      let bars: OHLCBar[] | null = null;
      let failure: unknown = null;
      try {
        bars = await withResampling(adapter).fetchHistory(symbol, timeframe, this.compareDepth());
      } catch (err: unknown) {
        failure = err;
      }
      if (this.host.destroyed) return null;
      // Another interval picked meanwhile: its bars instead. Only a pick made during a fetch asks again.
      if (timeframe !== this.host.state.timeframe) continue;
      if (bars && bars.length > 0) return bars;
      // An empty answer is no failure: the feed has no bars of it at this interval, and another may have some.
      if (failure === null) this.host.say(fill(this.host.t('toast.compareNoBars'), { symbol, interval: timeframeLabel(timeframe) }), 'error');
      else this.sayCompareFailed(symbol, failure);
      return null;
    }
  }

  /** The other symbol's bars didn't come: the adapter's reason, or that they failed. */
  private sayCompareFailed(symbol: string, err?: unknown): void {
    this.host.say(`${symbol}: ${err instanceof Error ? err.message : this.host.t('toast.loadFailed')}`, 'error');
  }

  /** Take a compare off, an overlay or an indicator, as the compare dialog and Objects do. */
  removeCompared(id: string): void {
    if (this.compares.some((c) => c.id === id)) this.handleRemoveCompare(id);
    else this.host.chart.removeIndicator(id);
  }

  handleRemoveCompare(id: string): void {
    this.host.chart.removeCompareSymbol(id);
    this.compares = this.compares.filter((c) => c.id !== id);
    if (this.compares.length === 0) this.holdCompareScale(false);
    this.host.scheduleLegend();
    this.host.refreshObjects();
    this.refreshCompareDialog();
  }

  /** A compare line the host added on the chart itself: the widget holds no scale nor list for it. */
  removeHostCompare(id: string): void {
    this.host.chart.removeCompareSymbol(id);
    this.host.scheduleLegend();
  }

  /** `id` is a symbol compared in percent (a line, not an indicator). */
  isPercentCompare(id: string): boolean {
    return this.compares.some((c) => c.id === id);
  }

  /**
   * How many bars of another symbol to fetch: as many as the chart has (it
   * may have paged older ones in), so a compare starts where the chart does.
   */
  private compareDepth(): number {
    return Math.max(this.host.chart.getData().length, this.host.options.historyLimit ?? 500);
  }

  /**
   * Percent compares hold a regular price scale in percent: the user's has
   * not been picked meanwhile, and the chart draws their lines (Renko, Kagi
   * and the like draw none).
   */
  holdsPercentScale(): boolean {
    return this.compareScaleHeld && this.compares.length > 0 && this.host.settingsState.scaleMode === 'regular'
      && this.host.chart.isTimeAligned();
  }

  /** The first percent compare holds the scale in percent; the last one gone lets it go. */
  private holdCompareScale(held: boolean): void {
    if (held === this.compareScaleHeld) return;
    this.compareScaleHeld = held;
    this.showHeldScale();
  }

  /** The scale a hold of percent compares puts on screen, in the status bar and in the settings. */
  showHeldScale(): void {
    this.host.showScaleMode();
    this.host.refreshScaleSwitches();
    this.host.settings?.refresh(this.host.shownSettings());
  }

  /**
   * Bars of a symbol the chart's indicators read (a compare on its own
   * scale, a spread), at the chart's interval. A later interval wins.
   */
  async loadSymbolSeries(symbol: string): Promise<void> {
    if (!this.host.adapter) {
      this.host.say(this.host.t('toast.compareNeedsAdapter'), 'error');
      return;
    }
    const timeframe = this.host.state.timeframe;
    const seq = (this.host.symbolLoads.get(symbol) ?? 0) + 1;
    this.host.symbolLoads.set(symbol, seq);
    // Only the latest fetch of a symbol, at the interval on screen, answers.
    const stale = () => this.host.destroyed || timeframe !== this.host.state.timeframe || this.host.symbolLoads.get(symbol) !== seq;
    try {
      const bars = await withResampling(this.host.adapter).fetchHistory(symbol, timeframe, this.compareDepth());
      if (stale()) return;
      this.host.chart.setSymbolSeries(symbol, bars);
    } catch (err: unknown) {
      if (stale()) return;
      // Keep what the chart had; an indicator on the symbol may ask again.
      this.host.chart.setSymbolSeries(symbol, this.host.chart.getSymbolSeries(symbol));
      this.sayCompareFailed(symbol, err);
    }
  }

  /** Refetch every comparison overlay at the current symbol/timeframe. */
  async refetchCompares(): Promise<void> {
    // The symbols indicators read, at the new interval.
    for (const symbol of this.host.chart.getRequiredSymbols?.() ?? []) void this.loadSymbolSeries(symbol);
    if (!this.host.adapter || this.compares.length === 0) return;
    // A comparison against the now-active symbol is redundant — drop it.
    const stale = this.compares.filter((c) => c.symbol === this.host.state.symbol);
    for (const c of stale) this.handleRemoveCompare(c.id);
    await this.refetchPercentCompares();
  }

  /** Each percent compare's bars again, as deep as the chart's, at its interval. The latest round wins. */
  private async refetchPercentCompares(): Promise<void> {
    if (!this.host.adapter || this.compares.length === 0) return;
    const seq = ++this.compareFetchSeq;
    const adapter = withResampling(this.host.adapter);
    // Each one's bars are on their way again.
    this.compares = this.compares.map((x) => ({ ...x, failedAt: undefined }));
    for (const c of this.compares) {
      const timeframe = this.host.state.timeframe;
      try {
        const bars = await adapter.fetchHistory(c.symbol, timeframe, this.compareDepth());
        if (this.host.destroyed || seq !== this.compareFetchSeq) return;
        if (this.isPercentCompare(c.id)) this.setCompareBars(c.id, bars, timeframe);
      } catch {
        // The stale overlay stays, and no older stretch waits for bars that aren't coming.
        if (!this.host.destroyed && seq === this.compareFetchSeq) this.compareFailedAt(c.id, timeframe);
      }
    }
    // Older bars that loaded meanwhile were fetched only as deep as the chart was before them.
    if (this.compareOlderPassed) {
      this.compareOlderPassed = false;
      void this.extendPercentCompares();
    }
  }

  /**
   * Older bars in: each percent compare's older stretch, so its line starts
   * where the chart does. One round at a time: pages that load meanwhile
   * get one more round, for what is missing by then.
   */
  async extendPercentCompares(): Promise<void> {
    if (this.compareOlderBusy) {
      this.compareOlderAgain = true;
      return;
    }
    this.compareOlderBusy = true;
    try {
      do {
        this.compareOlderAgain = false;
        await this.fetchOlderCompares();
      } while (this.compareOlderAgain && !this.host.destroyed);
    } finally {
      this.compareOlderBusy = false;
    }
  }

  /**
   * Each percent compare's bars before its first, as many as the chart has
   * before it; from a feed that can't page back, its bars again, as deep as
   * the chart's. A round of full fetches meanwhile (a new interval) drops them.
   */
  private async fetchOlderCompares(): Promise<void> {
    if (!this.host.adapter || this.compares.length === 0) return;
    const adapter = withResampling(this.host.adapter);
    const seq = this.compareFetchSeq;
    const timeframe = this.host.state.timeframe;
    for (const c of this.compares) {
      // Its bars still at the interval before: older ones at this interval would mix two in one line.
      // A round follows once they come, unless they failed to.
      if (c.timeframe !== timeframe) {
        if (c.failedAt !== timeframe) this.compareOlderPassed = true;
        continue;
      }
      const first = c.bars[0]?.time;
      if (first === undefined || c.atStart) continue;
      const missing = barsBefore(this.host.chart.getData(), first);
      if (missing === 0) continue;
      try {
        if (adapter.fetchHistoryBefore) {
          const older = await adapter.fetchHistoryBefore(c.symbol, timeframe, first, missing);
          if (this.host.destroyed || seq !== this.compareFetchSeq) return;
          this.prependCompareBars(c.id, older, timeframe);
        } else {
          const depth = this.compareDepth();
          const bars = await adapter.fetchHistory(c.symbol, timeframe, depth);
          if (this.host.destroyed || seq !== this.compareFetchSeq) return;
          this.deepenCompareBars(c.id, bars, depth, first, timeframe);
        }
      } catch { /* the line keeps the bars it has; the next page asks again */ }
    }
  }

  /**
   * A percent compare's bars fetched again `depth` deep, from a feed that
   * can't page back. Fewer than asked, or none older than `first`: the
   * feed's history starts there, and no page asks again.
   */
  private deepenCompareBars(id: string, bars: OHLCBar[], depth: number, first: number, timeframe: TimeFrame): void {
    if (!this.isPercentCompare(id)) return;
    this.setCompareBars(id, bars, timeframe);
    const atStart = bars.length < depth || !(bars[0].time < first);
    if (atStart) this.compares = this.compares.map((x) => (x.id === id ? { ...x, atStart: true } : x));
  }

  /** A percent compare's older bars in front of its own; none older: the feed's history starts there. */
  private prependCompareBars(id: string, older: readonly OHLCBar[], timeframe: TimeFrame): void {
    const c = this.compares.find((x) => x.id === id);
    if (!c) return;
    const bars = withOlderBars(c.bars, older);
    if (bars) this.setCompareBars(id, bars, timeframe);
    else this.compares = this.compares.map((x) => (x.id === id ? { ...x, atStart: true } : x));
  }

  /** A percent compare's line on new bars at `timeframe`, which may reach further back again. */
  private setCompareBars(id: string, bars: OHLCBar[], timeframe: TimeFrame): void {
    this.host.chart.updateCompareData(id, bars);
    this.compares = this.compares.map((x) => (x.id === id ? { ...x, bars, timeframe, atStart: false, failedAt: undefined } : x));
  }

  /** A percent compare's bars at `timeframe` didn't come: it keeps the ones it has. */
  private compareFailedAt(id: string, timeframe: TimeFrame): void {
    this.compares = this.compares.map((x) => (x.id === id ? { ...x, failedAt: timeframe } : x));
  }
}
