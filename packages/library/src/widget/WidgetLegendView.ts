import { widgetIndicatorLabel } from './indicatorInputWords.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import { type IndicatorLegendPane, type IndicatorLegendRow, type PaneAction } from './WidgetIndicatorLegend.js';
import { indicatorPointAt, legendValues } from './legendValues.js';
import { compareLegendRows } from './compareLegend.js';
import { pickHostItem, withHostItems } from './hostMenus.js';
import { SYMBOL_INDICATOR_IDS } from '@tradecanvas/core';
import type { ChartWidget } from './ChartWidget.js';

/** A pane's row starts below the divider's grab zone (±6 px), so it never blocks a resize. */
const PANE_ROW_TOP = 7;

/** Rows of the indicators sharing a pane, one under the other (px). */
const PANE_ROW_STEP = 17;

/** Where a pane's buttons (move, fold, maximise) sit below its top edge. */
const PANE_CONTROLS_TOP = 3;

/** Gap between the on-chart indicator rows and the plot or pane edge, px. */
export const LEGEND_INSET = 4;

/** How far under the OHLCV legend's foot the indicator rows start (px). */
export const STACK_GAP = 1;

/**
 * Whether an indicator's lines are in the chart's own prices, written as it
 * writes them: not another symbol's (a compare, a spread, a ratio), nor one
 * on a scale of its own on the left.
 */
export function readsChartPrices(ind: { id: string; scale?: 'left' }): boolean {
  return !SYMBOL_INDICATOR_IDS.has(ind.id) && ind.scale !== 'left';
}

/** What the legend reads of the widget around it, and asks of it. */
export interface LegendHost {
  readonly chart: ChartWidget['chart'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly featureState: ChartWidget['featureState'];
  handleRemoveIndicator: ChartWidget['handleRemoveIndicator'];
  readonly indicatorLegend: ChartWidget['indicatorLegend'];
  indicatorValueText: ChartWidget['indicatorValueText'];
  readonly legendHoverIndex: ChartWidget['legendHoverIndex'];
  openIndicatorSettings: ChartWidget['openIndicatorSettings'];
  readonly options: ChartWidget['options'];
  readonly root: ChartWidget['root'];
  readonly settingsState: ChartWidget['chartSettings']['settingsState'];
  readonly t: ChartWidget['t'];
}

/**
 * The legend over the chart: drawn once a frame when something it shows changed, the
 * indicators' rows by pane with their buttons, a pane's actions, and an indicator's menu.
 */
export class WidgetLegendView {
  constructor(private readonly host: LegendHost) {}

  legendFrame = 0;

  /** The legend row's "more" menu: move the indicator to another pane. */
  legendMenu: WidgetContextMenu | null = null;

  /** Redraw the on-chart indicator list on the next frame (coalesced). */
  scheduleLegend(): void {
    if (!this.host.indicatorLegend || this.legendFrame || !this.host.featureState.indicatorLegend) return;
    this.legendFrame = requestAnimationFrame(() => {
      this.legendFrame = 0;
      this.renderLegend();
    });
  }

  private renderLegend(): void {
    if (!this.host.indicatorLegend || this.host.destroyed) return;
    const last = this.host.chart.getData().length - 1;
    // On Renko, Kagi and the like the hovered index is a brick's, and the
    // indicators are worked out on the bricks: each reads its own series there.
    const aligned = this.host.chart.isTimeAligned();
    const hover = this.host.legendHoverIndex;
    const idx = hover === null ? last : Math.min(Math.max(hover, 0), last);
    // Each pane's indicators, its own first, stacked down from its top.
    const panes = new Map<string, { x: number; y: number; width: number; height: number; row: number }>();
    for (const pane of this.host.chart.getIndicatorPanes()) {
      (pane.instanceIds ?? [pane.instanceId]).forEach((id, row) => panes.set(id, { ...pane.rect, row }));
    }
    const locale = this.host.settingsState.numberLocale || 'en-US';
    // The symbols compared in percent first: the lines on the price scale itself. With nothing
    // hovered, at the chart's own latest bar (no index: on Renko and the like it is not the data's).
    const compareValues = idx >= 0 ? this.host.chart.getCompareValues?.(hover === null || !aligned ? undefined : idx) ?? [] : [];
    const compares = compareLegendRows(compareValues, locale, aligned);
    const indicators: IndicatorLegendRow[] = this.host.chart.getActiveIndicators().map((ind) => {
      const pane = panes.get(ind.instanceId) ?? null;
      // The values drawn: a recompute in the indicator worker is not finished here on each move.
      const point = indicatorPointAt(this.host.chart.getIndicatorOutput(ind.instanceId, { drawn: true })?.series, hover);
      const style = this.host.chart.getIndicatorStyle(ind.instanceId);
      // Not drawn on this chart type (another symbol read by time, on bricks) or interval: no values to read off it.
      const offChartType = ind.visible && ind.offChartType === true;
      const offInterval = ind.visible && ind.shown === false && !offChartType;
      const values = offInterval || offChartType ? [] : legendValues(ind.descriptor, point, style?.colors ?? [], style?.plots);
      return {
        instanceId: ind.instanceId,
        label: widgetIndicatorLabel(ind, this.host.t),
        visible: ind.visible,
        offInterval,
        offChartType,
        values: values.map((v) => ({
          text: this.host.indicatorValueText(v.value, pane === null && readsChartPrices(ind), locale),
          color: v.color,
        })),
        pane: pane
          ? {
            x: pane.x + LEGEND_INSET,
            // A short pane with many indicators: the last rows overlap rather than spill out.
            y: pane.y + Math.min(PANE_ROW_TOP + pane.row * PANE_ROW_STEP, Math.max(PANE_ROW_TOP, pane.height - PANE_ROW_STEP)),
            width: pane.width - 2 * LEGEND_INSET,
          }
          : null,
      };
    });
    const rows = [...compares, ...indicators];
    const plot = this.host.chart.getPlotRect();
    const maximized = this.host.chart.getMaximizedPane();
    const labelOf = (id: string) => rows.find((r) => r.instanceId === id)?.label ?? '';
    // As the panes show: one maximised folds the others.
    const paneControls: IndicatorLegendPane[] = this.host.chart.getIndicatorPanes().map((pane) => ({
      instanceId: pane.instanceId,
      x: pane.rect.x + pane.rect.width - LEGEND_INSET,
      y: pane.rect.y + PANE_CONTROLS_TOP,
      label: labelOf(pane.instanceId),
      collapsed: this.host.chart.isPaneCollapsed(pane.instanceId),
      maximized: maximized === pane.instanceId,
      canMoveUp: this.host.chart.canMovePane(pane.instanceId, -1),
      canMoveDown: this.host.chart.canMovePane(pane.instanceId, 1),
    }));
    this.host.indicatorLegend.update(rows, { left: plot.x + LEGEND_INSET, top: this.host.chart.getLegendBottom() + STACK_GAP }, paneControls);
  }

  /** A pane's button on the chart. */
  runPaneAction(instanceId: string, action: PaneAction): void {
    if (action === 'up' || action === 'down') this.host.chart.movePane(instanceId, action === 'up' ? -1 : 1);
    else if (action === 'collapse' || action === 'expand') this.host.chart.setPaneCollapsed(instanceId, action === 'collapse');
    else this.host.chart.setMaximizedPane(action === 'maximize' ? instanceId : null);
    this.scheduleLegend();
  }

  /**
   * An indicator's "more" menu: into the pane above or below it (the price
   * pane at the top), a pane of its own, back to the price pane; then its
   * settings and remove.
   */
  openLegendMenu(instanceId: string, anchor: HTMLElement): void {
    const menu = this.legendMenu;
    if (!menu) return;
    if (menu.isOpen()) {
      menu.close();
      return;
    }
    // The price pane, then each indicator pane top to bottom.
    const places = ['price', ...this.host.chart.getIndicatorPanes().map((p) => p.instanceId)];
    const at = 1 + this.host.chart.getIndicatorPanes().findIndex((p) => p.instanceIds.includes(instanceId));
    const above = places[at - 1];
    const below = places[at + 1];
    const can = (target: string | undefined) => target !== undefined && this.host.chart.canMoveIndicatorToPane(instanceId, target);
    const entries: ContextMenuEntry[] = [];
    if (can(above)) entries.push({ id: `move:${above}`, label: this.host.t(above === 'price' ? 'legend.movePrice' : 'legend.moveUp'), icon: 'arrowUp' });
    if (can(below)) entries.push({ id: `move:${below}`, label: this.host.t('legend.moveDown'), icon: 'arrowDown' });
    if (can('new')) entries.push({ id: 'move:new', label: this.host.t('legend.moveNew'), icon: 'plus' });
    if (above !== 'price' && can('price')) entries.push({ id: 'move:price', label: this.host.t('legend.movePrice'), icon: 'trendingUp' });
    // Settings and remove go with the row's own buttons.
    const row: ContextMenuEntry[] = [];
    if (this.host.featureState.indicatorSettings && this.host.featureState['indicatorLegend.settings']) {
      row.push({ id: 'settings', label: this.host.t('legend.settings'), icon: 'settings' });
    }
    if (this.host.featureState['indicatorLegend.remove']) row.push({ id: 'remove', label: this.host.t('legend.remove'), icon: 'trash', danger: true });
    if (entries.length > 0 && row.length > 0) entries.push('separator');
    entries.push(...row);
    const indicatorId = this.host.chart.getActiveIndicators().find((i) => i.instanceId === instanceId)?.id ?? '';
    const extra = this.host.options.indicatorMenuItems?.({ instanceId, indicatorId }) ?? [];
    const all = withHostItems(entries, extra);
    if (all.length === 0) return;
    const box = anchor.getBoundingClientRect();
    const root = this.host.root.getBoundingClientRect();
    menu.open(all, box.left - root.left, box.bottom - root.top + 2, (id) => {
      if (pickHostItem(id, extra)) return;
      if (id === 'settings') this.host.openIndicatorSettings(instanceId);
      else if (id === 'remove') this.host.handleRemoveIndicator(instanceId);
      else if (id.startsWith('move:')) this.host.chart.moveIndicatorToPane(instanceId, id.slice('move:'.length));
      this.scheduleLegend();
    }, anchor);
  }
}
