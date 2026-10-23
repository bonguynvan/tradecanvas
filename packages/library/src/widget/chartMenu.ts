import type { ChartContextArea, PriceScaleMode } from '@tradecanvas/commons';
import type { ContextMenuEntry } from './WidgetContextMenu.js';
import type { MessageKey } from './locales/en.js';
import type { WidgetFeature } from './widgetFeatures.js';
import { fill, type Translator } from './i18n.js';

/** What a menu on the chart (a right-click, or the "+" by the price axis) can do. */
export type ChartMenuAction =
  | 'alert' | 'buyLimit' | 'buyStop' | 'sellLimit' | 'sellStop' | 'orderTicket' | 'horizontalLine'
  | 'resetView' | 'paste' | 'hideDrawings' | 'showDrawings' | 'removeDrawings' | 'removeIndicators'
  | 'settings' | 'exportData'
  | 'resetPriceScale' | 'autoScale' | 'invertScale' | 'leftScale'
  | 'regularScale' | 'logScale' | 'percentScale' | 'indexedScale'
  | 'indicatorValueLabels' | 'barCountdown' | 'highLowLines' | 'lastPriceLine'
  | 'goToDate'
  | 'paneLog'
  | 'paneInvert'
  | 'panePercent'
  // Submenus: they open, and do nothing themselves.
  | 'labels' | 'lines' | 'timezone';

/** A time zone's entry is this before its setting ('tz:UTC'). */
export const TIMEZONE_ENTRY = 'tz:';

/** The price scale's modes, one of which is on, in the order the menu offers them. */
const SCALE_MODES: readonly { id: ChartMenuAction; mode: PriceScaleMode; label: MessageKey }[] = [
  { id: 'regularScale', mode: 'regular', label: 'settings.scale.regular' },
  { id: 'logScale', mode: 'logarithmic', label: 'settings.scale.logarithmic' },
  { id: 'percentScale', mode: 'percentage', label: 'settings.scale.percentage' },
  { id: 'indexedScale', mode: 'indexedTo100', label: 'settings.scale.indexedTo100' },
];

/** The widget's own keys for what the chart menus do, written beside the entries while their switches are on. */
export const CHART_MENU_KEYS: readonly { action: ChartMenuAction; keys: string; feature: WidgetFeature }[] = [
  { action: 'resetView', keys: 'Alt+R', feature: 'hotkeys.resetView' },
  { action: 'invertScale', keys: 'Alt+I', feature: 'hotkeys.invertScale' },
  { action: 'goToDate', keys: 'Alt+G', feature: 'hotkeys.goToDate' },
];

/** The scale mode an entry chooses, if it is one of them. */
export function scaleModeOf(action: string): PriceScaleMode | undefined {
  return SCALE_MODES.find((m) => m.id === action)?.mode;
}

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
  /** Drawings copied, here or on another chart of the page, to paste. */
  canPaste: boolean;
  /** Indicators on the chart; a comparison with another symbol has its own dialog and isn't counted. */
  hasIndicators: boolean;
  canGoToDate: boolean;
  /** A download of the bars and indicator lines (`features.dataExport`). */
  canExport?: boolean;
  autoScale: boolean;
  scaleMode: PriceScaleMode;
  /** A logarithmic scale is on offer (`features.logScale`). */
  canLog: boolean;
  inverted: boolean;
  /** The price scale is on the left. */
  leftScale: boolean;
  /** The labels on the price scale; no `countdown` when the chart has none. */
  labels: { values: boolean; countdown?: boolean };
  /** The lines across the chart. */
  lines: { highLow: boolean; lastPrice: boolean };
  /** The time zone now, and those on offer (none: no entry for it). */
  timezone: { current: string; options: readonly { value: string; label: string }[] };
  /** The widget's shortcuts that are on, by what they do ("Alt+R"). */
  keys: Partial<Record<ChartMenuAction, string>>;
  /** For a pane's menu: its scale switches. */
  pane?: { log: boolean; invert: boolean; percent: boolean };
}

type MenuItem = Exclude<ContextMenuEntry, 'separator'>;

/** The groups that have entries, a separator between each two. */
function groups(...parts: readonly (readonly ContextMenuEntry[])[]): ContextMenuEntry[] {
  return parts.filter((part) => part.length > 0).flatMap((part, i) => (i === 0 ? [...part] : ['separator' as const, ...part]));
}

/** The entry with its shortcut written beside it, when the widget's key for it is on. */
function keyed(item: MenuItem, ctx: ChartMenuContext): MenuItem {
  const shortcut = ctx.keys[item.id as ChartMenuAction];
  return shortcut ? { ...item, shortcut } : item;
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

const settingsEntry = (t: Translator): MenuItem => ({ id: 'settings', label: t('chartMenu.settings'), icon: 'settings' });

/** The plot's: what to do at the price, the view, what is on the chart, the settings. */
function plotEntries(ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  const view: MenuItem[] = [keyed({ id: 'resetView', label: t('chartMenu.resetView') }, ctx)];
  if (ctx.canPaste) view.push({ id: 'paste', label: t('chartMenu.paste') });
  const objects: MenuItem[] = [];
  if (ctx.hasDrawings) {
    objects.push(
      ctx.drawingsHidden
        ? { id: 'showDrawings', label: t('chartMenu.showDrawings'), icon: 'eye' }
        : { id: 'hideDrawings', label: t('chartMenu.hideDrawings'), icon: 'eyeOff' },
      { id: 'removeDrawings', label: t('chartMenu.removeDrawings'), icon: 'trash', danger: true },
    );
  }
  if (ctx.hasIndicators) objects.push({ id: 'removeIndicators', label: t('chartMenu.removeIndicators'), icon: 'trash', danger: true });
  const exportData: MenuItem[] = ctx.canExport ? [{ id: 'exportData', label: t('chartMenu.exportData'), icon: 'save' }] : [];
  return groups(priceEntries(ctx, t), view, objects, [...exportData, settingsEntry(t)]);
}

/** The price axis's: its switches, its mode, its labels and lines, an alert at the price, the settings. */
function priceAxisEntries(ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  const scale: MenuItem[] = [
    { id: 'resetPriceScale', label: t('chartMenu.resetPriceScale') },
    { id: 'autoScale', label: t('settings.autoScale'), checked: ctx.autoScale },
    keyed({ id: 'invertScale', label: t('chartMenu.invertScale'), checked: ctx.inverted }, ctx),
    { id: 'leftScale', label: t('settings.leftScale'), checked: ctx.leftScale },
  ];
  const modes: MenuItem[] = SCALE_MODES
    .filter((m) => m.mode !== 'logarithmic' || ctx.canLog)
    .map((m) => ({ id: m.id, label: t(m.label), radio: true, checked: ctx.scaleMode === m.mode }));
  const labels: MenuItem[] = [{ id: 'indicatorValueLabels', label: t('settings.indicatorValues'), checked: ctx.labels.values }];
  if (ctx.labels.countdown !== undefined) labels.push({ id: 'barCountdown', label: t('settings.barCountdown'), checked: ctx.labels.countdown });
  const lines: MenuItem[] = [
    { id: 'highLowLines', label: t('settings.highLowLines'), checked: ctx.lines.highLow },
    { id: 'lastPriceLine', label: t('chartMenu.lastPriceLine'), checked: ctx.lines.lastPrice },
  ];
  const more: MenuItem[] = [
    { id: 'labels', label: t('chartMenu.labels'), submenu: labels },
    { id: 'lines', label: t('chartMenu.lines'), submenu: lines },
  ];
  // On the axis, only an alert is offered at the price.
  const alert = priceEntries({ ...ctx, canTrade: false, canDraw: false }, t);
  return groups(scale, modes, more, alert, [settingsEntry(t)]);
}

/** The time axis's: its reset, go to a date, the time zone. */
function timeAxisEntries(ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  const view: MenuItem[] = [keyed({ id: 'resetView', label: t('chartMenu.resetTimeScale') }, ctx)];
  if (ctx.canGoToDate) view.push(keyed({ id: 'goToDate', label: t('chartMenu.goToDate'), icon: 'calendar' }, ctx));
  const zones: MenuItem[] = ctx.timezone.options.map((zone) => ({
    id: `${TIMEZONE_ENTRY}${zone.value}`,
    label: zone.label,
    radio: true,
    checked: zone.value === ctx.timezone.current,
  }));
  return groups(view, zones.length > 0 ? [{ id: 'timezone', label: t('settings.timezone'), submenu: zones }] : []);
}

/** A pane's: the view, its own scale's switches, the settings. */
function paneEntries(ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  const scale: MenuItem[] = ctx.pane
    ? [
      { id: 'paneLog', label: t('chartMenu.paneLog'), checked: ctx.pane.log },
      { id: 'paneInvert', label: t('chartMenu.paneInvert'), checked: ctx.pane.invert },
      { id: 'panePercent', label: t('chartMenu.panePercent'), checked: ctx.pane.percent },
    ]
    : [];
  return groups([keyed({ id: 'resetView', label: t('chartMenu.resetView') }, ctx)], scale, [settingsEntry(t)]);
}

/** The right-click menu for where it landed. */
export function chartMenuEntries(area: ChartContextArea, ctx: ChartMenuContext, t: Translator): ContextMenuEntry[] {
  switch (area) {
    case 'priceAxis': return priceAxisEntries(ctx, t);
    case 'timeAxis': return timeAxisEntries(ctx, t);
    case 'pane': return paneEntries(ctx, t);
    default: return plotEntries(ctx, t);
  }
}
