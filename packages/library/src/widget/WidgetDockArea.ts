import type { OHLCBar } from '@tradecanvas/commons';
import type { WidgetPanel } from './types.js';
import { widgetIndicatorLabel } from './indicatorInputWords.js';
import { drawingTypeLabel } from './WidgetObjectTree.js';
import { NARROW_WIDGET_PX } from './narrowMode.js';
import { WidgetDock } from './WidgetDock.js';
import { type DataWindowModel } from './WidgetDataWindow.js';
import { readsChartPrices } from './WidgetLegendView.js';
import { type WidgetFeature } from './widgetFeatures.js';
import type { ChartWidget } from './ChartWidget.js';

/** The switch each of the dock's panels, but the watchlist (an option), goes with. */
const PANEL_FEATURES = {
  alerts: 'alerts',
  objectTree: 'objectTree',
  dataWindow: 'dataWindow',
  symbolInfo: 'symbolInfo',
  depthLadder: 'depthLadder',
} as const satisfies Record<Exclude<WidgetPanel, 'watchlist'>, WidgetFeature>;

/** The toolbar's button for a panel, where it has one. */
const PANEL_TOOLBAR_ROLES: Partial<Record<WidgetPanel, string>> = { alerts: 'alerts', objectTree: 'objects', symbolInfo: 'symbolInfo', depthLadder: 'trade' };

/** What the dock reads of the widget around it, and asks of it. */
export interface DockHost {
  readonly alerting: ChartWidget['alerting'];
  readonly chart: ChartWidget['chart'];
  readonly chartContainer: ChartWidget['chartContainer'];
  readonly comparing: ChartWidget['comparing'];
  readonly dataWindow: ChartWidget['dataWindow'];
  readonly featureState: ChartWidget['featureState'];
  formatAlertPrice: ChartWidget['formatAlertPrice'];
  indicatorValueText: ChartWidget['indicatorValueText'];
  readonly lastHoverBar: ChartWidget['lastHoverBar'];
  readonly lastHoverIndex: ChartWidget['lastHoverIndex'];
  readonly lastHoverPrevClose: ChartWidget['lastHoverPrevClose'];
  readonly objectTree: ChartWidget['objectTree'];
  refreshDrawingsState: ChartWidget['refreshDrawingsState'];
  readonly root: ChartWidget['root'];
  readonly settingsState: ChartWidget['settingsState'];
  readonly symbolInfoPanel: ChartWidget['symbolInfoPanel'];
  readonly t: ChartWidget['t'];
  readonly toolbar: ChartWidget['toolbar'];
  readonly trading: ChartWidget['trading'];
  readonly watching: ChartWidget['watching'];
}

/**
 * The dock by the chart: its panels (watchlist, alerts, objects, data window, symbol info and
 * the trading ones), the rail of their buttons, its width as the widget's changes, the object
 * tree's list and the data window's values at the bar under the pointer.
 */
export class WidgetDockArea {
  constructor(private readonly host: DockHost) {}

  /** The panels by the chart (watchlist, alerts, objects, data window, symbol info) and their rail. */
  dock: WidgetDock | null = null;

  /** Whether the widget was narrow when the dock last looked (null: not yet). */
  private dockNarrow: boolean | null = null;

  /** Follows the widget's width for the dock. */
  dockObserver: ResizeObserver | null = null;

  /**
   * Open a panel of the dock beside the chart (in a sheet on a phone), in
   * place of the one open. False when the widget hasn't it: no watchlist, no
   * depth ladder (the `depthLadder` option), or its switch off.
   */
  openPanel(panel: WidgetPanel): boolean {
    if (!this.hasPanel(panel) || !this.dock) return false;
    this.dock.open(panel);
    return this.dock.current() === panel;
  }

  /** Whether the widget has `panel`: the watchlist and the ladder only when made with them, every one with its switch on. */
  private hasPanel(panel: WidgetPanel): boolean {
    if (panel === 'watchlist') return this.host.watching.watchlist !== null;
    if (panel === 'depthLadder' && this.host.trading.depthLadder === null) return false;
    return this.host.featureState[PANEL_FEATURES[panel]];
  }

  /** Shut the dock. */
  closePanel(): void {
    this.dock?.close();
  }

  /** The panel open in the dock, or null. */
  getOpenPanel(): WidgetPanel | null {
    return (this.dock?.current() as WidgetPanel | null | undefined) ?? null;
  }

  /**
   * The bar under the pointer and the close before it. On candles the data
   * bar at the index, as it is now (a live tick moves it); on Renko and the
   * like the brick the crosshair reported, whose index is not the data's.
   */
  private hoveredBar(): { bar: OHLCBar; prevClose: number } | null {
    const idx = this.host.lastHoverIndex;
    if (idx === null || idx < 0) return null;
    if (!this.host.chart.isTimeAligned()) {
      const bar = this.host.lastHoverBar;
      return bar ? { bar, prevClose: this.host.lastHoverPrevClose ?? bar.open } : null;
    }
    const data = this.host.chart.getData();
    if (idx >= data.length) return null;
    return { bar: data[idx], prevClose: idx > 0 ? data[idx - 1].close : data[idx].open };
  }

  buildDataWindowModel(): DataWindowModel {
    const idx = this.host.lastHoverIndex;
    const hovered = this.hoveredBar();
    if (idx === null || !hovered) {
      return { ohlc: null, change: 0, changePct: 0, indicators: [] };
    }
    const { bar, prevClose } = hovered;
    const change = bar.close - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    const inOwnPane = new Set(this.host.chart.getIndicatorPanes().flatMap((pane) => pane.instanceIds ?? [pane.instanceId]));
    const locale = this.host.settingsState.numberLocale || 'en-US';

    const indicators = this.host.chart.getActiveIndicators().map((ind) => {
      const series = this.host.chart.getIndicatorOutput(ind.instanceId)?.series;
      const point = series?.[idx] ?? null;
      const inPriceUnits = !inOwnPane.has(ind.instanceId) && readsChartPrices(ind);
      // The drawn lines by their titles ("Signal"), else every field by its key.
      const fields = ind.descriptor.plots?.map((p) => [p.key, p.title] as const)
        ?? Object.keys(point ?? {}).map((k) => [k, k] as const);
      const values = point
        ? fields
            .filter(([key]) => typeof point[key] === 'number' && Number.isFinite(point[key]))
            .map(([key, title]) => {
              const value = point[key] as number;
              return { key: title, value, text: this.host.indicatorValueText(value, inPriceUnits, locale) };
            })
        : [];
      return { name: ind.descriptor.name, values };
    }).filter((i) => i.values.length > 0);

    return {
      ohlc: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume },
      change,
      // In the decimals the bar's prices show: a change of 18.7494 on 100,000 reads 18.75.
      changeText: this.host.formatAlertPrice(change, bar.close),
      changePct,
      indicators,
    };
  }

  toggleDataWindow(): void {
    if (!this.host.dataWindow || !this.host.featureState.dataWindow) return;
    this.dock?.toggle('dataWindow');
  }

  toggleObjects(): void {
    if (!this.host.objectTree || !this.host.featureState.objectTree) return;
    this.dock?.toggle('objectTree');
  }

  /**
   * The dock's pages, in the rail's order: the watchlist, alerts, objects,
   * the data window, the symbol info and the depth ladder, all shut to start
   * with. Each draws itself as it shows, and says so on the toolbar's button.
   */
  setupDock(): void {
    const dock = this.dock;
    if (!dock) return;
    if (this.host.watching.watchlist) {
      const list = this.host.watching.watchlist;
      // Hidden, its sparklines were drawn at no size: drawn again as it shows.
      dock.addPage({ id: 'watchlist', label: this.host.t('watchlist.title'), icon: 'list', element: list.element, parts: ['dock.watchlist'], onShow: () => list.redraw() });
    }
    const alerts = this.host.alerting.alertsPanel;
    if (alerts) {
      dock.addPage({
        id: 'alerts', label: this.host.t('alerts.title'), icon: 'bell', element: alerts.element, parts: ['dock.alerts', 'alerts'],
        onShow: () => {
          alerts.openPanel();
          this.host.alerting.refreshAlerts();
          this.host.toolbar?.setActive('alerts', true);
        },
        onHide: () => {
          alerts.close();
          this.host.toolbar?.setActive('alerts', false);
        },
      });
    }
    const tree = this.host.objectTree;
    if (tree) {
      dock.addPage({
        id: 'objectTree', label: this.host.t('objects.title'), icon: 'layers', element: tree.element, parts: ['dock.objectTree', 'objectTree'],
        onShow: () => {
          tree.openPanel();
          this.refreshObjects();
          this.host.toolbar?.setActive('objects', true);
        },
        onHide: () => {
          tree.close();
          this.host.toolbar?.setActive('objects', false);
        },
      });
    }
    const data = this.host.dataWindow;
    if (data) {
      dock.addPage({
        id: 'dataWindow', label: this.host.t('dataWindow.title'), icon: 'table', element: data.element, parts: ['dock.dataWindow', 'dataWindow'],
        onShow: () => {
          data.openPanel();
          data.render(this.buildDataWindowModel());
        },
        onHide: () => data.close(),
      });
    }
    const info = this.host.symbolInfoPanel;
    if (info) {
      dock.addPage({
        id: 'symbolInfo', label: this.host.t('symbolInfo.title'), icon: 'info', element: info.element, parts: ['dock.symbolInfo', 'symbolInfo'],
        onShow: () => info.open(),
        onHide: () => info.close(),
      });
    }
    const ladder = this.host.trading.depthLadder;
    if (ladder) {
      dock.addPage({
        id: 'depthLadder', label: this.host.t('ladder.title'), icon: 'ladder', element: ladder.element, parts: ['dock.depthLadder', 'depthLadder'],
        onShow: () => ladder.openPanel(),
        onHide: () => ladder.close(),
      });
    }
    this.syncRail();
    this.fitDockToWidth();
    if (typeof ResizeObserver !== 'undefined') {
      this.dockObserver = new ResizeObserver(() => this.fitDockToWidth());
      this.dockObserver.observe(this.host.root);
    }
  }

  /**
   * The dock and the widget's width. Going narrow (a phone, a rotated
   * tablet) shuts any panel: it would be a sheet over the chart. No panel
   * opens by itself: the chart has the room until one is asked for.
   */
  private fitDockToWidth(): void {
    const dock = this.dock;
    const width = this.host.root.clientWidth;
    if (!dock || width === 0) return;
    const narrow = width < NARROW_WIDGET_PX;
    const was = this.dockNarrow;
    this.dockNarrow = narrow;
    if (narrow && was !== true) dock.close();
  }

  /** Whether the rail shows now: on, and the widget not narrow. */
  railShown(): boolean {
    return this.host.featureState.dock && !this.host.root.hasAttribute('data-tcw-narrow');
  }

  /**
   * The rail's Tab stop on a button that shows, and the toolbar's alerts and
   * objects buttons hidden while the rail has its own for them (so the
   * "more" menu leaves them out too).
   */
  syncRail(): void {
    this.dock?.syncRail();
    const rail = this.railShown();
    this.host.toolbar?.setRailed('alerts', rail && this.host.featureState['dock.alerts']);
    this.host.toolbar?.setRailed('objects', rail && this.host.featureState['dock.objectTree']);
    this.host.toolbar?.fit();
  }

  /** Where the keyboard goes when a panel shuts and the rail can't take it: its toolbar button, or "more" on a phone. */
  panelFocusTarget(page: WidgetPanel): HTMLElement | null {
    const role = PANEL_TOOLBAR_ROLES[page];
    const own = role ? this.host.root.querySelector<HTMLElement>(`.tcw-toolbar [data-role="${role}"]`) : null;
    const narrow = this.host.root.hasAttribute('data-tcw-narrow');
    if (own && !own.hidden && !(narrow && own.classList.contains('tcw-toolbar-overflow'))) return own;
    return this.host.root.querySelector<HTMLElement>('.tcw-toolbar-more') ?? this.host.chartContainer;
  }

  /** A panel shut by its own close button: by hand. */
  closePanelByHand(page: WidgetPanel): void {
    this.dock?.closePage(page);
  }

  refreshObjects(): void {
    this.host.refreshDrawingsState();
    if (!this.host.objectTree) return;
    // Named as the chips and the legend name them: a compare by its symbol, two EMAs by their periods;
    // the full name in the tooltip.
    const indicators = this.host.chart.getActiveIndicators().map((i) => ({
      instanceId: i.instanceId,
      name: widgetIndicatorLabel(i, this.host.t),
      title: i.descriptor.name,
      visible: i.visible,
    }));
    const drawings = this.host.chart.getDrawings().map((d) => ({
      id: d.id,
      label: d.name || drawingTypeLabel(d.type, this.host.t),
      visible: d.visible,
      offInterval: d.visible && !this.host.chart.isDrawingShown(d.id),
      locked: d.locked,
      group: d.group,
    }));
    // Every compare, as the compare dialog lists it: the percent lines and the indicators on another symbol.
    const compares = this.host.comparing.comparedNow().map((c) => ({ id: c.id, label: c.symbol, color: c.color, way: c.way }));
    this.host.objectTree.setObjects(indicators, drawings, compares);
  }
}
