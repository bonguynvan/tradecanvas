import { timezoneOptions } from './widgetTimezones.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import { drawingMenuEntries, type DrawingMenuAction } from './drawingMenu.js';
import { CHART_MENU_KEYS, TIMEZONE_ENTRY, scaleModeOf, type ChartMenuAction, type ChartMenuContext } from './chartMenu.js';
import { SYMBOL_INDICATOR_IDS } from '@tradecanvas/core';
import { fill } from './i18n.js';
import { pickHostItem, withHostItems } from './hostMenus.js';
import { DRAWING_MENU_FEATURES, filterMenuEntries } from './widgetFeatures.js';
import type { ChartWidget } from './ChartWidget.js';

/** What the context menus read of the widget around them, and ask of it. */
export interface MenusHost {
  readonly adapter: ChartWidget['adapter'];
  readonly alerting: ChartWidget['alerting'];
  readonly canExport: ChartWidget['canExport'];
  changeSettings: ChartWidget['changeSettings'];
  changeStyle: ChartWidget['changeStyle'];
  readonly chart: ChartWidget['chart'];
  readonly chartContainer: ChartWidget['chartContainer'];
  readonly drawingSettings: ChartWidget['drawingSettings'];
  effectiveScaleMode: ChartWidget['effectiveScaleMode'];
  readonly featureState: ChartWidget['featureState'];
  formatAlertPrice: ChartWidget['formatAlertPrice'];
  readonly objectTree: ChartWidget['objectTree'];
  openDrawingSettings: ChartWidget['openDrawingSettings'];
  openSettings: ChartWidget['openSettings'];
  readonly options: ChartWidget['options'];
  refreshDrawingsState: ChartWidget['refreshDrawingsState'];
  refreshObjects: ChartWidget['docking']['refreshObjects'];
  resetView: ChartWidget['resetView'];
  readonly root: ChartWidget['root'];
  say: ChartWidget['say'];
  readonly settingsState: ChartWidget['settingsState'];
  state: ChartWidget['state'];
  readonly t: ChartWidget['t'];
  toggleGoToDate: ChartWidget['toggleGoToDate'];
  readonly trading: ChartWidget['trading'];
  updateUI: ChartWidget['updateUI'];
}

/**
 * The widget's context menus: the chart's (what was under the pointer, its price, its pane),
 * a drawing's, and the clear menu, with what each of their entries does.
 */
export class WidgetMenus {
  constructor(private readonly host: MenusHost) {}

  drawingMenu: WidgetContextMenu | null = null;

  /** The trash button's menu, made the first time it opens. */
  clearMenu: WidgetContextMenu | null = null;

  chartMenu: WidgetContextMenu | null = null;

  /** The pane a chart menu was opened on (its scale switches act on it). */
  menuPane: string | null = null;

  /** The menu of a right-clicked drawing; the chart has selected it (and its group) by now. */
  openDrawingMenu(id: string, x: number, y: number): void {
    if (!this.drawingMenu || !this.host.featureState['menu.drawing']) return;
    const drawings = new Map(this.host.chart.getDrawings().map((d) => [d.id, d]));
    const selected = this.host.chart.getSelectedDrawingIds().flatMap((sid) => {
      const d = drawings.get(sid);
      return d ? [{ id: d.id, locked: d.locked, groupId: d.group?.id ?? null }] : [];
    });
    if (selected.length === 0) return;
    const entries = filterMenuEntries(drawingMenuEntries({
      selected,
      canConfigure: true,
      canAlert: this.host.chart.canAddDrawingAlert(id),
    }, this.host.t), DRAWING_MENU_FEATURES, this.host.featureState);
    const ids = selected.map((d) => d.id);
    const drawing = drawings.get(id);
    const extra = drawing ? this.host.options.drawingMenuItems?.({ id, type: drawing.type, selected: ids }) ?? [] : [];
    const all = withHostItems(entries, extra);
    if (all.length === 0) return;
    const chartRect = this.host.chartContainer.getBoundingClientRect();
    const rootRect = this.host.root.getBoundingClientRect();
    this.drawingMenu.open(all, chartRect.left - rootRect.left + x, chartRect.top - rootRect.top + y, (action) => {
      if (!pickHostItem(action, extra)) this.runDrawingMenuAction(id, ids, action as DrawingMenuAction);
    });
  }

  private runDrawingMenuAction(id: string, ids: readonly string[], action: DrawingMenuAction): void {
    switch (action) {
      case 'settings':
        this.host.openDrawingSettings(id);
        return;
      case 'alert':
        this.host.alerting.addDrawingAlert(id);
        return;
      case 'front':
      case 'forward':
      case 'backward':
      case 'back':
        this.host.chart.moveDrawing(id, action);
        break;
      case 'group':
        this.host.chart.groupDrawings(ids);
        break;
      case 'ungroup': {
        const groups = new Set(this.host.chart.getDrawings().filter((d) => ids.includes(d.id)).map((d) => d.group?.id));
        for (const group of groups) if (group) this.host.chart.ungroupDrawings(group);
        break;
      }
      case 'lock':
      case 'unlock':
        this.host.chart.setDrawingsLocked(ids, action === 'lock');
        break;
      case 'hide':
        this.host.chart.setDrawingsVisible(ids, false);
        break;
      case 'duplicate':
        this.host.chart.duplicateDrawing(id);
        break;
      case 'delete': {
        const editing = this.host.drawingSettings?.editing();
        if (editing && ids.includes(editing)) this.host.drawingSettings?.close(true);
        this.host.chart.removeDrawings(ids);
        break;
      }
    }
    if (this.host.objectTree?.isOpen()) this.host.refreshObjects();
  }

  /** What the chart's menus can offer here, and how the chart is set now. */
  chartMenuContext(price: number | undefined): ChartMenuContext {
    const drawings = this.host.chart.getDrawings();
    const data = this.host.chart.getData();
    const s = this.host.settingsState;
    const features = this.host.chart.getFeatures();
    return {
      price,
      lastPrice: data.length > 0 ? data[data.length - 1].close : null,
      formatPrice: (p) => this.host.formatAlertPrice(p),
      canAlert: this.host.alerting.alertsPanel !== null,
      canTrade: this.host.options.trading !== false,
      canOrderTicket: this.host.trading.orderTicket !== null,
      canDraw: true,
      hasDrawings: drawings.length > 0,
      drawingsHidden: drawings.length > 0 && drawings.every((d) => !d.visible),
      canPaste: this.host.chart.canPasteDrawings(),
      hasIndicators: features.indicators !== false && this.removableIndicators().length > 0,
      canGoToDate: true,
      canExport: this.host.canExport,
      autoScale: this.host.chart.isAutoScale(),
      scaleMode: this.host.effectiveScaleMode(),
      canLog: features.logScale !== false,
      inverted: this.host.chart.isInvertScale(),
      leftScale: s.leftPriceScale,
      labels: { values: s.indicatorValueLabels, aligned: s.alignAxisLabels, ...(features.barCountdown !== false ? { countdown: s.barCountdown } : {}) },
      lines: { highLow: s.highLowLines, lastPrice: this.host.chart.getStyleValue('lastPrice.visible') !== false },
      timezone: { current: s.timezone, options: this.timezoneChoices() },
      keys: Object.fromEntries(CHART_MENU_KEYS
        .filter((k) => this.host.featureState.hotkeys && this.host.featureState[k.feature])
        .map((k) => [k.action, k.keys])),
    };
  }

  /** The indicators "Remove indicators" takes away: a comparison with another symbol stays, as it has a dialog of its own. */
  private removableIndicators(): string[] {
    return this.host.chart.getActiveIndicators().filter((ind) => !SYMBOL_INDICATOR_IDS.has(ind.id)).map((ind) => ind.instanceId);
  }

  /**
   * The exchange's zone, offered when the chart knows one (the symbol's, or
   * its market's) or the adapter can name the symbol's; its zone is null
   * while unknown.
   */
  exchangeChoice(): { label: string; zone: string | null } | undefined {
    const zone = this.host.chart.getExchangeTimeZone() ?? null;
    if (zone === null && !this.host.adapter?.resolveSymbol) return undefined;
    return { label: this.host.t('settings.timezone.exchange'), zone };
  }

  /** The time zones on offer, the exchange's among them when there is one. */
  private timezoneChoices(): { value: string; label: string }[] {
    return timezoneOptions(this.host.settingsState.timezone, Date.now(), this.host.t('settings.timezone.local'), this.exchangeChoice())
      .map(({ value, label }) => ({ value, label }));
  }

  /**
   * Open a chart menu at (x, y) in the chart's pixels, the host's own entries
   * last; nothing when it has no entries.
   */
  openChartMenu(
    entries: import('./WidgetContextMenu.js').ContextMenuEntry[],
    x: number,
    y: number,
    context: import('./types.js').ChartMenuItemsContext,
  ): void {
    if (!this.chartMenu) return;
    const extra = this.host.options.chartMenuItems?.(context) ?? [];
    const all = withHostItems(entries, extra);
    if (all.length === 0) return;
    const chartRect = this.host.chartContainer.getBoundingClientRect();
    const rootRect = this.host.root.getBoundingClientRect();
    this.chartMenu.open(all, chartRect.left - rootRect.left + x, chartRect.top - rootRect.top + y, (action) => {
      if (pickHostItem(action, extra)) return;
      if (action.startsWith(TIMEZONE_ENTRY)) this.host.changeSettings({ timezone: action.slice(TIMEZONE_ENTRY.length) });
      else this.runChartMenuAction(action as ChartMenuAction, context);
    });
  }

  private runChartMenuAction(action: ChartMenuAction, context: import('./types.js').ChartMenuItemsContext): void {
    const { price } = context;
    const at = price ?? NaN;
    const s = this.host.settingsState;
    const mode = scaleModeOf(action);
    if (mode) {
      this.host.changeSettings({ scaleMode: mode });
      return;
    }
    switch (action) {
      case 'alert':
        this.host.chart.addAlert(at, 'crossing');
        this.host.say(fill(this.host.t('chartMenu.alertAdded'), { price: this.host.formatAlertPrice(at) }));
        break;
      case 'buyLimit':
      case 'sellLimit':
      case 'buyStop':
      case 'sellStop':
        this.host.trading.placeOrderAt(action, at);
        break;
      case 'orderTicket':
        this.host.trading.openOrderTicket(price);
        break;
      case 'exportData':
        // Every bar loaded, with the indicator lines, named after the symbol and interval.
        this.host.chart.exportAllData('csv', `${this.host.state.symbol}-${this.host.state.timeframe}.csv`.replace(/[^\w.-]+/g, '_'));
        break;
      case 'paneLog':
      case 'paneInvert':
      case 'panePercent': {
        const pane = this.menuPane;
        if (!pane) break;
        const scale = this.host.chart.getPaneScale(pane);
        this.host.chart.setPaneScale(pane, action === 'paneLog' ? { log: !scale.log }
          : action === 'paneInvert' ? { invert: !scale.invert } : { percent: !scale.percent });
        break;
      }
      case 'horizontalLine': {
        const data = this.host.chart.getData();
        if (data.length > 0) this.host.chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: data[data.length - 1].time, price: at }] });
        break;
      }
      case 'resetView':
        this.host.resetView();
        break;
      case 'resetPriceScale':
        this.host.changeSettings({ autoScale: true });
        break;
      case 'paste':
        this.host.chart.pasteDrawings();
        break;
      case 'removeIndicators':
        this.host.chart.removeIndicators(this.removableIndicators());
        break;
      case 'hideDrawings':
        this.host.chart.setDrawingsVisible(this.host.chart.getDrawings().map((d) => d.id), false);
        break;
      case 'showDrawings':
        this.host.chart.setDrawingsVisible(this.host.chart.getDrawings().map((d) => d.id), true);
        break;
      case 'removeDrawings':
        // One undo step; locked drawings stay.
        this.host.chart.removeDrawings(this.host.chart.getDrawings().map((d) => d.id));
        break;
      case 'settings':
        // From the price axis, its tab.
        this.host.openSettings(context.area === 'priceAxis' ? 'scales' : undefined);
        break;
      case 'autoScale':
        this.host.changeSettings({ autoScale: !this.host.chart.isAutoScale() });
        break;
      case 'invertScale':
        this.host.changeSettings({ invertScale: !this.host.chart.isInvertScale() });
        break;
      case 'leftScale':
        this.host.changeSettings({ leftPriceScale: !s.leftPriceScale });
        break;
      case 'indicatorValueLabels':
        this.host.changeSettings({ indicatorValueLabels: !s.indicatorValueLabels });
        break;
      case 'alignAxisLabels':
        this.host.changeSettings({ alignAxisLabels: !s.alignAxisLabels });
        break;
      case 'barCountdown':
        this.host.changeSettings({ barCountdown: !s.barCountdown });
        break;
      case 'highLowLines':
        this.host.changeSettings({ highLowLines: !s.highLowLines });
        break;
      case 'lastPriceLine':
        this.host.changeStyle({ 'lastPrice.visible': this.host.chart.getStyleValue('lastPrice.visible') === false });
        break;
      case 'goToDate':
        this.host.toggleGoToDate();
        break;
    }
    if (this.host.objectTree?.isOpen()) this.host.refreshObjects();
  }

  /**
   * The trash button's menu: the drawings, the indicators, or both, each with
   * how many would go (locked drawings stay). Nothing to remove, no menu; a
   * second press closes it.
   */
  openClearMenu(anchor: HTMLElement): void {
    if (WidgetContextMenu.closeAnchoredTo(anchor)) return;
    const drawings = this.host.chart.getDrawings().filter((d) => !d.locked).length;
    const indicators = this.host.chart.getActiveIndicators().length;
    const entries: ContextMenuEntry[] = [];
    if (drawings > 0) entries.push({ id: 'drawings', label: this.host.t('clear.drawings'), icon: 'penLine', count: drawings });
    if (indicators > 0) entries.push({ id: 'indicators', label: this.host.t('clear.indicators'), icon: 'trendingUp', count: indicators });
    if (drawings > 0 && indicators > 0) entries.push('separator', { id: 'all', label: this.host.t('clear.all'), icon: 'trash', danger: true });
    if (entries.length === 0) return;
    this.clearMenu ??= new WidgetContextMenu(this.host.root, this.host.t('drawing.clearAll'));
    this.clearMenu.openBeside(entries, anchor, (id) => this.removeAll(id as 'drawings' | 'indicators' | 'all'));
  }

  /** Remove the drawings, the indicators or both, as one undo step, and leave any drawing tool. */
  removeAll(what: 'drawings' | 'indicators' | 'all'): void {
    this.host.chart.removeAll(what);
    this.host.state = { ...this.host.state, activeTool: null };
    this.host.updateUI();
    this.host.refreshDrawingsState();
    this.host.refreshObjects();
  }
}
