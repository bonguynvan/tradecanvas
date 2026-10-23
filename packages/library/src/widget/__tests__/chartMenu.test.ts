import { describe, it, expect } from 'vitest';
import { chartMenuEntries, priceEntries, type ChartMenuContext } from '../chartMenu.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { ContextMenuEntry } from '../WidgetContextMenu.js';

const ctx = (over: Partial<ChartMenuContext> = {}): ChartMenuContext => ({
  price: 95,
  lastPrice: 100,
  formatPrice: (p) => p.toFixed(2),
  canAlert: true,
  canTrade: true,
  canDraw: true,
  hasDrawings: true,
  drawingsHidden: false,
  canGoToDate: true,
  canPaste: false,
  hasIndicators: false,
  autoScale: true,
  scaleMode: 'regular',
  canLog: true,
  inverted: false,
  leftScale: false,
  labels: { values: false, countdown: true },
  lines: { highLow: false, lastPrice: true },
  timezone: { current: 'local', options: [{ value: 'local', label: 'Local' }, { value: 'UTC', label: 'UTC' }] },
  keys: {},
  ...over,
});
type Item = Exclude<ContextMenuEntry, 'separator'>;
const ids = (entries: readonly ContextMenuEntry[]) => entries.flatMap((e) => (e === 'separator' ? ['|'] : [e.id]));
const find = (entries: readonly ContextMenuEntry[], id: string) => entries.find((e): e is Item => e !== 'separator' && e.id === id);

describe('chart menus', () => {
  it('offers a buy limit and a sell stop below the market, the other way above it', () => {
    expect(ids(priceEntries(ctx(), EN_TRANSLATOR))).toEqual(['alert', 'buyLimit', 'sellStop', 'horizontalLine']);
    expect(ids(priceEntries(ctx({ price: 105 }), EN_TRANSLATOR))).toEqual(['alert', 'buyStop', 'sellLimit', 'horizontalLine']);
    expect(ids(priceEntries(ctx({ canOrderTicket: true }), EN_TRANSLATOR))).toEqual(['alert', 'buyLimit', 'sellStop', 'orderTicket', 'horizontalLine']);
    const [alert] = priceEntries(ctx(), EN_TRANSLATOR) as { label: string }[];
    expect(alert.label).toBe('Add alert at 95.00');
  });

  it('leaves out what the widget can’t do', () => {
    expect(ids(priceEntries(ctx({ canTrade: false, canDraw: false }), EN_TRANSLATOR))).toEqual(['alert']);
    expect(priceEntries(ctx({ price: undefined }), EN_TRANSLATOR)).toEqual([]);
  });

  it('builds the plot’s menu: the price, the view, the drawings and indicators, the settings', () => {
    expect(ids(chartMenuEntries('plot', ctx(), EN_TRANSLATOR))).toEqual([
      'alert', 'buyLimit', 'sellStop', 'horizontalLine', '|', 'resetView', '|', 'hideDrawings', 'removeDrawings', '|', 'settings',
    ]);
    expect(ids(chartMenuEntries('plot', ctx({ canPaste: true, hasIndicators: true, canExport: true }), EN_TRANSLATOR))).toEqual([
      'alert', 'buyLimit', 'sellStop', 'horizontalLine', '|', 'resetView', 'paste', '|',
      'hideDrawings', 'removeDrawings', 'removeIndicators', '|', 'exportData', 'settings',
    ]);
    expect(ids(chartMenuEntries('plot', ctx({ hasDrawings: false, canAlert: false, canTrade: false, canDraw: false }), EN_TRANSLATOR)))
      .toEqual(['resetView', '|', 'settings']);
    expect(ids(chartMenuEntries('plot', ctx({ drawingsHidden: true }), EN_TRANSLATOR))).toContain('showDrawings');
    expect(find(chartMenuEntries('plot', ctx({ hasIndicators: true }), EN_TRANSLATOR), 'removeIndicators')?.danger).toBe(true);
  });

  it('writes the widget’s shortcuts beside what they do, only those that are on', () => {
    const keys = { resetView: 'Alt+R', invertScale: 'Alt+I', goToDate: 'Alt+G' };
    expect(find(chartMenuEntries('plot', ctx({ keys }), EN_TRANSLATOR), 'resetView')?.shortcut).toBe('Alt+R');
    expect(find(chartMenuEntries('priceAxis', ctx({ keys }), EN_TRANSLATOR), 'invertScale')?.shortcut).toBe('Alt+I');
    expect(find(chartMenuEntries('timeAxis', ctx({ keys }), EN_TRANSLATOR), 'goToDate')?.shortcut).toBe('Alt+G');
    expect(find(chartMenuEntries('plot', ctx(), EN_TRANSLATOR), 'resetView')?.shortcut).toBeUndefined();
  });

  it('builds the price axis’s menu: the scale’s switches, its mode, its labels and lines', () => {
    const entries = chartMenuEntries('priceAxis', ctx(), EN_TRANSLATOR);
    expect(ids(entries)).toEqual([
      'resetPriceScale', 'autoScale', 'invertScale', 'leftScale', '|',
      'regularScale', 'logScale', 'percentScale', 'indexedScale', '|',
      'labels', 'lines', '|', 'alert', '|', 'settings',
    ]);
    expect(ids(find(entries, 'labels')!.submenu!)).toEqual(['indicatorValueLabels', 'barCountdown']);
    expect(ids(find(entries, 'lines')!.submenu!)).toEqual(['highLowLines', 'lastPriceLine']);
  });

  it('ticks the price axis’s switches, and its mode among the four, as they are', () => {
    const entries = chartMenuEntries('priceAxis', ctx({
      scaleMode: 'logarithmic', inverted: true, autoScale: false, leftScale: true,
      labels: { values: true, countdown: false }, lines: { highLow: true, lastPrice: false },
    }), EN_TRANSLATOR);
    const checked = (list: readonly ContextMenuEntry[]) =>
      Object.fromEntries(list.flatMap((e) => (e === 'separator' || e.checked === undefined ? [] : [[e.id, e.checked]])));
    expect(checked(entries)).toEqual({
      autoScale: false, invertScale: true, leftScale: true,
      regularScale: false, logScale: true, percentScale: false, indexedScale: false,
    });
    expect(entries.filter((e): e is Item => e !== 'separator' && e.radio === true).map((e) => e.id))
      .toEqual(['regularScale', 'logScale', 'percentScale', 'indexedScale']);
    expect(checked(find(entries, 'labels')!.submenu!)).toEqual({ indicatorValueLabels: true, barCountdown: false });
    expect(checked(find(entries, 'lines')!.submenu!)).toEqual({ highLowLines: true, lastPriceLine: false });
  });

  it('leaves out of the price axis what the chart can’t do', () => {
    const entries = chartMenuEntries('priceAxis', ctx({ canLog: false, labels: { values: false }, price: undefined }), EN_TRANSLATOR);
    expect(ids(entries)).not.toContain('logScale');
    expect(ids(entries)).not.toContain('alert');
    expect(ids(find(entries, 'labels')!.submenu!)).toEqual(['indicatorValueLabels']);
  });

  it('gives a pane its scale switches', () => {
    const entries = chartMenuEntries('pane', ctx({ pane: { log: true, invert: false, percent: true } }), EN_TRANSLATOR);
    expect(ids(entries)).toEqual(['resetView', '|', 'paneLog', 'paneInvert', 'panePercent', '|', 'settings']);
    expect(entries.filter((e) => e !== 'separator').map((e) => (e as { checked?: boolean }).checked)).toEqual([undefined, true, false, true, undefined]);
  });

  it('offers the time axis a reset, go-to-date and the time zone', () => {
    const entries = chartMenuEntries('timeAxis', ctx({ timezone: { current: 'UTC', options: ctx().timezone.options } }), EN_TRANSLATOR);
    expect(ids(entries)).toEqual(['resetView', 'goToDate', '|', 'timezone']);
    const zones = find(entries, 'timezone')!.submenu!;
    expect(zones).toEqual([
      { id: 'tz:local', label: 'Local', radio: true, checked: false },
      { id: 'tz:UTC', label: 'UTC', radio: true, checked: true },
    ]);
    expect(ids(chartMenuEntries('timeAxis', ctx({ canGoToDate: false, timezone: { current: 'local', options: [] } }), EN_TRANSLATOR)))
      .toEqual(['resetView']);
  });

  it('offers a download of the data where the chart allows it', () => {
    expect(ids(chartMenuEntries('plot', ctx({ canExport: true }), EN_TRANSLATOR))).toContain('exportData');
    expect(ids(chartMenuEntries('plot', ctx({ canExport: false }), EN_TRANSLATOR))).not.toContain('exportData');
  });
});
