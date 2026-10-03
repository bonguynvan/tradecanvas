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
  autoScale: true,
  scaleMode: 'regular',
  inverted: false,
  ...over,
});
const ids = (entries: ContextMenuEntry[]) => entries.flatMap((e) => (e === 'separator' ? ['|'] : [e.id]));

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

  it('builds the plot’s menu: the price, the view, the drawings, the settings', () => {
    expect(ids(chartMenuEntries('plot', ctx(), EN_TRANSLATOR))).toEqual([
      'alert', 'buyLimit', 'sellStop', 'horizontalLine', '|', 'resetView', 'hideDrawings', 'removeDrawings', '|', 'settings',
    ]);
    expect(ids(chartMenuEntries('plot', ctx({ hasDrawings: false, canAlert: false, canTrade: false, canDraw: false }), EN_TRANSLATOR)))
      .toEqual(['resetView', '|', 'settings']);
    expect(ids(chartMenuEntries('plot', ctx({ drawingsHidden: true }), EN_TRANSLATOR))).toContain('showDrawings');
  });

  it('ticks the price axis’s scale switches as they are', () => {
    const entries = chartMenuEntries('priceAxis', ctx({ scaleMode: 'logarithmic', inverted: true, autoScale: false }), EN_TRANSLATOR);
    const checked = Object.fromEntries(entries.flatMap((e) => (e === 'separator' ? [] : [[e.id, e.checked]])));
    expect(checked).toEqual({ autoScale: false, logScale: true, percentScale: false, invertScale: true, alert: undefined });
  });

  it('gives a pane its scale switches', () => {
    const entries = chartMenuEntries('pane', ctx({ pane: { log: true, invert: false } }), EN_TRANSLATOR);
    expect(ids(entries)).toEqual(['resetView', '|', 'paneLog', 'paneInvert', '|', 'settings']);
    expect(entries.filter((e) => e !== 'separator').map((e) => (e as { checked?: boolean }).checked)).toEqual([undefined, true, false, undefined]);
  });

  it('offers the time axis a reset and go-to-date', () => {
    expect(ids(chartMenuEntries('timeAxis', ctx(), EN_TRANSLATOR))).toEqual(['resetView', 'goToDate']);
    expect(ids(chartMenuEntries('timeAxis', ctx({ canGoToDate: false }), EN_TRANSLATOR))).toEqual(['resetView']);
  });
});
