import type { ContextMenuEntry } from './WidgetContextMenu.js';
import type { ChartMenuAction } from './chartMenu.js';
import type { DrawingMenuAction } from './drawingMenu.js';

/**
 * The widget's switches, by name; every one is on until turned off. A name
 * without a dot is a whole capability, off wherever it shows (its button,
 * its menu entries, its command, its keys); a dotted name is one place.
 * The names are a contract: new ones are added, none is renamed.
 */
export const WIDGET_FEATURES = [
  // The bars.
  'toolbar', 'sidebar', 'statusBar',
  // Capabilities, wherever they show.
  'alerts', 'objectTree', 'symbolInfo', 'symbolSearch', 'settings', 'indicatorSettings', 'drawingSettings',
  'dataWindow', 'commandPalette', 'hotkeySheet', 'goToDate', 'replay', 'screenshot', 'copyImage', 'shareView',
  'autoFib', 'themeToggle', 'fullscreen', 'accountPanel', 'orderTicket', 'bracketOrders', 'depthLadder',
  'layouts', 'indicatorTemplates', 'compare', 'indicatorLegend', 'navigation', 'customTimeframes',
  'intervalTyping', 'dragDropImport', 'hotkeys', 'toasts',
  // The toolbar's buttons.
  'toolbar.symbol', 'toolbar.symbolInfo', 'toolbar.timeframes', 'toolbar.timeframeMenu', 'toolbar.chartType',
  'toolbar.indicators', 'toolbar.layouts', 'toolbar.replay', 'toolbar.bracketOrders', 'toolbar.depthLadder',
  'toolbar.accountPanel', 'toolbar.objectTree', 'toolbar.alerts', 'toolbar.screenshot', 'toolbar.settings',
  'toolbar.themeToggle', 'toolbar.fullscreen',
  // The drawing sidebar: its tools by section, then its buttons.
  'sidebar.cursor', 'sidebar.favorites', 'sidebar.lines', 'sidebar.fibonacci', 'sidebar.patterns',
  'sidebar.forecasting', 'sidebar.annotation', 'sidebar.style', 'sidebar.magnet', 'sidebar.eraser',
  'sidebar.zoomArea', 'sidebar.stayInDrawing', 'sidebar.undo', 'sidebar.redo', 'sidebar.clear',
  // The status bar.
  'statusBar.range', 'statusBar.goToDate', 'statusBar.market', 'statusBar.connection', 'statusBar.symbol',
  // On the chart: the indicators' rows, the panes' buttons, the navigation.
  'indicatorLegend.values', 'indicatorLegend.visibility', 'indicatorLegend.settings', 'indicatorLegend.remove',
  'indicatorLegend.more', 'pane.move', 'pane.collapse', 'pane.maximize',
  'navigation.zoom', 'navigation.scroll', 'navigation.reset',
  // Menus: a right-click on the chart (and the "+" by the price axis), and on a drawing.
  'menu.chart', 'menu.chart.alert', 'menu.chart.order', 'menu.chart.orderTicket', 'menu.chart.horizontalLine',
  'menu.chart.resetView', 'menu.chart.drawings', 'menu.chart.exportData', 'menu.chart.settings',
  'menu.chart.scale', 'menu.chart.goToDate', 'menu.chart.paneScale', 'menu.priceAxisAdd',
  'menu.drawing', 'menu.drawing.settings', 'menu.drawing.alert', 'menu.drawing.order', 'menu.drawing.group',
  'menu.drawing.lock', 'menu.drawing.hide', 'menu.drawing.duplicate', 'menu.drawing.delete',
  // Keys.
  'hotkeys.commandPalette', 'hotkeys.symbolSearch', 'hotkeys.save', 'hotkeys.tools', 'hotkeys.invertScale',
  'hotkeys.goToDate', 'hotkeys.help',
] as const;

export type WidgetFeature = (typeof WIDGET_FEATURES)[number];
/** Switches to turn on (`true`) or off (`false`), by name. */
export type WidgetFeatures = Partial<Record<WidgetFeature, boolean>>;
/** Every switch, on or off. */
export type WidgetFeatureState = Readonly<Record<WidgetFeature, boolean>>;

const KNOWN: ReadonlySet<string> = new Set(WIDGET_FEATURES);

/** The widget's older on/off options, each the switches it stands for. */
export const LEGACY_FEATURE_OPTIONS = {
  toolbar: ['toolbar'],
  drawingTools: ['sidebar', 'drawingSettings', 'hotkeys.tools', 'menu.chart.horizontalLine'],
  settings: ['settings'],
  statusBar: ['statusBar', 'goToDate'],
  rangeBar: ['statusBar.range', 'goToDate'],
  indicatorLegend: ['indicatorLegend'],
  fullscreen: ['fullscreen'],
  alerts: ['alerts'],
  objectTree: ['objectTree'],
  accountPanel: ['accountPanel', 'orderTicket'],
  indicatorTemplates: ['indicatorTemplates'],
  intervalTyping: ['intervalTyping'],
  symbolInfo: ['symbolInfo'],
  navigation: ['navigation'],
  dragDropImport: ['dragDropImport'],
  customTimeframes: ['customTimeframes'],
} as const satisfies Record<string, readonly WidgetFeature[]>;

type LegacyOptions = { readonly [K in keyof typeof LEGACY_FEATURE_OPTIONS]?: unknown };

/** The switches each chart menu entry needs on (the right-click menu and the "+" by the price axis). */
export const CHART_MENU_FEATURES: Readonly<Record<ChartMenuAction, readonly WidgetFeature[]>> = {
  alert: ['alerts', 'menu.chart.alert'],
  buyLimit: ['menu.chart.order'],
  buyStop: ['menu.chart.order'],
  sellLimit: ['menu.chart.order'],
  sellStop: ['menu.chart.order'],
  orderTicket: ['orderTicket', 'menu.chart.orderTicket'],
  horizontalLine: ['menu.chart.horizontalLine'],
  resetView: ['menu.chart.resetView'],
  hideDrawings: ['menu.chart.drawings'],
  showDrawings: ['menu.chart.drawings'],
  removeDrawings: ['menu.chart.drawings'],
  settings: ['settings', 'menu.chart.settings'],
  exportData: ['menu.chart.exportData'],
  autoScale: ['menu.chart.scale'],
  logScale: ['menu.chart.scale'],
  percentScale: ['menu.chart.scale'],
  invertScale: ['menu.chart.scale'],
  goToDate: ['goToDate', 'menu.chart.goToDate'],
  paneLog: ['menu.chart.paneScale'],
  paneInvert: ['menu.chart.paneScale'],
  panePercent: ['menu.chart.paneScale'],
};

/** The switches each entry of a drawing's menu needs on. */
export const DRAWING_MENU_FEATURES: Readonly<Record<DrawingMenuAction, readonly WidgetFeature[]>> = {
  settings: ['drawingSettings', 'menu.drawing.settings'],
  alert: ['alerts', 'menu.drawing.alert'],
  front: ['menu.drawing.order'],
  forward: ['menu.drawing.order'],
  backward: ['menu.drawing.order'],
  back: ['menu.drawing.order'],
  group: ['menu.drawing.group'],
  ungroup: ['menu.drawing.group'],
  lock: ['menu.drawing.lock'],
  unlock: ['menu.drawing.lock'],
  hide: ['menu.drawing.hide'],
  duplicate: ['menu.drawing.duplicate'],
  delete: ['menu.drawing.delete'],
};

/** The switch each command of the command palette needs on (by its action id). */
export const COMMAND_FEATURES: Readonly<Record<string, WidgetFeature>> = {
  screenshot: 'screenshot',
  copyImage: 'copyImage',
  toggleTheme: 'themeToggle',
  settings: 'settings',
  shareView: 'shareView',
  autoFib: 'autoFib',
  dataWindow: 'dataWindow',
  symbolInfo: 'symbolInfo',
};

/**
 * Switches as given (an option, a `setFeatures` call): known names set to
 * `true` or `false`. Anything else is dropped, with a warning.
 */
export function readWidgetFeatures(value: unknown): WidgetFeatures {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: WidgetFeatures = {};
  const dropped: string[] = [];
  for (const [name, on] of Object.entries(value)) {
    if (KNOWN.has(name) && typeof on === 'boolean') out[name as WidgetFeature] = on;
    else dropped.push(name);
  }
  if (dropped.length > 0) {
    console.warn(`[ChartWidget] Unknown or non-boolean feature switches left out: ${dropped.join(', ')}.`);
  }
  return out;
}

/** Every switch at the start: on, then off where an older option says `false`, then as `features` says. */
export function resolveWidgetFeatures(options: LegacyOptions & { readonly features?: unknown }): WidgetFeatureState {
  const state = Object.fromEntries(WIDGET_FEATURES.map((name) => [name, true])) as Record<WidgetFeature, boolean>;
  for (const [option, names] of Object.entries(LEGACY_FEATURE_OPTIONS)) {
    if (options[option as keyof LegacyOptions] !== false) continue;
    for (const name of names) state[name] = false;
  }
  return { ...state, ...readWidgetFeatures(options.features) };
}

/** The switches that are off, space apart (the root's `data-tcw-off`). */
export function offFeatures(state: WidgetFeatureState): string {
  return WIDGET_FEATURES.filter((name) => !state[name]).join(' ');
}

/** A divider with nothing shown on one side of it. */
const DIVIDER_OFF = 'tcw-divider-off';

/** Holders whose every part can be switched off: they go too, rather than show empty. */
const GROUPED_PARTS: readonly { names: readonly WidgetFeature[]; selector: string }[] = [
  { names: ['navigation.zoom', 'navigation.scroll', 'navigation.reset'], selector: '.tcw-nav' },
  { names: ['pane.move', 'pane.collapse', 'pane.maximize'], selector: '.tcw-pane-controls' },
  {
    names: ['indicatorLegend.visibility', 'indicatorLegend.settings', 'indicatorLegend.more', 'indicatorLegend.remove'],
    selector: '.tcw-ind-legend-actions',
  },
];

/** Hides every part (`data-tcw-part`) whose switch is off on its widget, and the dividers left with nothing to divide. */
export function widgetFeatureCss(): string {
  return [
    ...WIDGET_FEATURES.map((name) => `.tcw-root[data-tcw-off~="${name}"] [data-tcw-part~="${name}"]{display:none!important}`),
    ...GROUPED_PARTS.map(({ names, selector }) =>
      `.tcw-root${names.map((name) => `[data-tcw-off~="${name}"]`).join('')} ${selector}{display:none!important}`),
    `.${DIVIDER_OFF}{display:none!important}`,
  ].join('\n');
}

/** Marks an element as a part of the switches named: it is hidden while any of them is off. */
export function markPart(el: HTMLElement, ...names: WidgetFeature[]): void {
  el.dataset.tcwPart = names.join(' ');
}

/** The same mark as an attribute, for markup built as text. */
export function partAttr(...names: WidgetFeature[]): string {
  return `data-tcw-part="${names.join(' ')}"`;
}

/** The switch a command of the command palette needs on, if it has one. */
export function commandFeature(id: string): WidgetFeature | undefined {
  return Object.prototype.hasOwnProperty.call(COMMAND_FEATURES, id) ? COMMAND_FEATURES[id] : undefined;
}

/**
 * Hides each divider among `container`'s children with nothing shown between
 * it and the edge, a boundary (a spacer) or the divider before it.
 */
export function tidyDividers(container: HTMLElement, dividerClass: string, boundaryClass?: string): void {
  const children = [...container.children] as HTMLElement[];
  const isDivider = (el: HTMLElement) => el.classList.contains(dividerClass);
  for (const el of children) if (isDivider(el)) el.classList.remove(DIVIDER_OFF);
  const shown = (el: HTMLElement) => !el.hidden && getComputedStyle(el).display !== 'none';
  // An empty holder (for a host's buttons, say) shows nothing.
  const isItem = (el: HTMLElement) => shown(el) && (el instanceof HTMLButtonElement || el.childElementCount > 0 || el.textContent !== '');
  let itemSince = false;
  let pending: HTMLElement | null = null;
  for (const el of children) {
    if (boundaryClass !== undefined && el.classList.contains(boundaryClass)) {
      pending?.classList.add(DIVIDER_OFF);
      pending = null;
      itemSince = false;
    } else if (isDivider(el)) {
      if (!shown(el)) continue;
      if (!itemSince) {
        el.classList.add(DIVIDER_OFF);
      } else {
        pending = el;
        itemSince = false;
      }
    } else if (isItem(el)) {
      itemSince = true;
      pending = null;
    }
  }
  pending?.classList.add(DIVIDER_OFF);
}

/**
 * A menu's entries with those whose switches are off left out, and no
 * separator at either end or next to another.
 */
export function filterMenuEntries<Id extends string>(
  entries: readonly ContextMenuEntry[],
  featuresOf: Readonly<Record<Id, readonly WidgetFeature[]>>,
  state: WidgetFeatureState,
): ContextMenuEntry[] {
  const kept = entries.filter((entry) => {
    if (entry === 'separator') return true;
    const names = (featuresOf as Readonly<Record<string, readonly WidgetFeature[]>>)[entry.id] ?? [];
    return names.every((name) => state[name]);
  });
  return kept.filter((entry, i) => {
    if (entry !== 'separator') return true;
    const before = kept.slice(0, i).some((e) => e !== 'separator');
    const next = kept[i + 1];
    return before && next !== undefined && next !== 'separator';
  });
}
