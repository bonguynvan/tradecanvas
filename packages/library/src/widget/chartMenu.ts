import type { ChartContextArea, PriceScaleMode } from '@tradecanvas/commons';
import type { ContextMenuEntry } from './WidgetContextMenu.js';
import { fill, type Translator } from './i18n.js';

/** What a menu on the chart (a right-click, or the "+" by the price axis) can do. */
export type ChartMenuAction =
  | 'alert' | 'buyLimit' | 'buyStop' | 'sellLimit' | 'sellStop' | 'orderTicket' | 'horizontalLine'
  | 'resetView' | 'hideDrawings' | 'showDrawings' | 'removeDrawings' | 'settings'
  | 'autoScale' | 'logScale' | 'percentScale' | 'invertScale'
  | 'goToDate'
  | 'paneLog'
  | 'paneInvert';

/** What the widget can do here, and how the chart is set now. */
export interface ChartMenuContext {
  /** The price at the click (the price pane, the price axis, the "+"). */
  price?: number;
  /** The latest price, to tell a limit from a stop. */
  lastPrice: number | null;
  formatPrice: (price: number) => string;
  canAlert: boolean;
  canTrade: boolean;
  /** An order ticket to open (the account panel is on). */
  canOrderTicket?: boolean;
  canDraw: boolean;
  hasDrawings: boolean;
  drawingsHidden: boolean;
  canGoToDate: boolean;
  autoScale: boolean;
  scaleMode: PriceScaleMode;
  inverted: boolean;
  /** For a pane's menu: its scale switches. */
  pane?: { log: boolean; invert: boolean };
}

/**
 * What to do at a price: an alert, a buy and a sell (a limit on the side of
 * the market it would wait on, else a stop), a horizontal line.
 */
export function priceEntries(ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  if (ctx.price === undefined || !Number.isFinite(ctx.price)) return [];
  const price = ctx.formatPrice(ctx.price);
  const entries: ContextMenuEntry[] = [];
  if (ctx.canAlert) entries.push({ id: 'alert', label: fill(t('chartMenu.addAlert'), { price }), icon: 'bell' });
  if (ctx.canTrade) {
    // Below the market a buy waits as a limit and a sell as a stop; above, the other way round.
    const below = ctx.lastPrice === null || ctx.price <= ctx.lastPrice;
    entries.push(
      below
        ? { id: 'buyLimit', label: fill(t('chartMenu.buyLimit'), { price }), icon: 'trendingUp' }
        : { id: 'buyStop', label: fill(t('chartMenu.buyStop'), { price }), icon: 'trendingUp' },
      below
        ? { id: 'sellStop', label: fill(t('chartMenu.sellStop'), { price }), icon: 'trendingDown' }
        : { id: 'sellLimit', label: fill(t('chartMenu.sellLimit'), { price }), icon: 'trendingDown' },
    );
    if (ctx.canOrderTicket) entries.push({ id: 'orderTicket', label: t('chartMenu.orderTicket'), icon: 'receipt' });
  }
  if (ctx.canDraw) entries.push({ id: 'horizontalLine', label: fill(t('chartMenu.horizontalLine'), { price }), icon: 'minus' });
  return entries;
}

/** The right-click menu for where it landed. */
export function chartMenuEntries(area: ChartContextArea, ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  const withPrice = (rest: ContextMenuEntry[]): ContextMenuEntry[] => {
    const atPrice = priceEntries(ctx, t);
    return atPrice.length > 0 ? [...atPrice, 'separator', ...rest] : rest;
  };
  const settings: ContextMenuEntry = { id: 'settings', label: t('chartMenu.settings'), icon: 'settings' };
  switch (area) {
    case 'priceAxis': {
      // On the axis, only an alert is offered at the price.
      const alert = priceEntries({ ...ctx, canTrade: false, canDraw: false }, t);
      return [
        { id: 'autoScale', label: t('settings.autoScale'), checked: ctx.autoScale },
        { id: 'logScale', label: t('settings.scale.logarithmic'), checked: ctx.scaleMode === 'logarithmic' },
        { id: 'percentScale', label: t('settings.scale.percentage'), checked: ctx.scaleMode === 'percentage' },
        { id: 'invertScale', label: t('chartMenu.invertScale'), checked: ctx.inverted },
        ...(alert.length > 0 ? ['separator' as const, ...alert] : []),
      ];
    }
    case 'timeAxis':
      return [
        { id: 'resetView', label: t('chartMenu.resetTimeScale') },
        ...(ctx.canGoToDate ? [{ id: 'goToDate', label: t('chartMenu.goToDate'), icon: 'calendar' }] : []),
      ];
    case 'pane':
      return [
        { id: 'resetView', label: t('chartMenu.resetView') },
        ...(ctx.pane
          ? ['separator' as const,
            { id: 'paneLog', label: t('chartMenu.paneLog'), checked: ctx.pane.log },
            { id: 'paneInvert', label: t('chartMenu.paneInvert'), checked: ctx.pane.invert }]
          : []),
        'separator',
        settings,
      ];
    default: {
      const drawings: ContextMenuEntry[] = ctx.hasDrawings
        ? [
          ctx.drawingsHidden
            ? { id: 'showDrawings', label: t('chartMenu.showDrawings'), icon: 'eye' }
            : { id: 'hideDrawings', label: t('chartMenu.hideDrawings'), icon: 'eyeOff' },
          { id: 'removeDrawings', label: t('chartMenu.removeDrawings'), icon: 'trash', danger: true },
        ]
        : [];
      return withPrice([{ id: 'resetView', label: t('chartMenu.resetView') }, ...drawings, 'separator', settings]);
    }
  }
}
