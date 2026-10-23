// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WidgetToolbar } from '../WidgetToolbar.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { ToolbarCallbacks, WidgetState } from '../types.js';

let root: HTMLDivElement;
let toolbar: WidgetToolbar;
let calls: string[];

const state = {
  symbol: 'BTCUSDT', timeframe: '5m', chartType: 'candlestick', activeIndicators: new Map(), isDark: true,
} as unknown as WidgetState;

function make(extra: Partial<ToolbarCallbacks> = {}): void {
  const cb = (name: string) => () => { calls.push(name); };
  toolbar = new WidgetToolbar(root, {
    symbols: ['BTCUSDT'],
    timeframes: [
      { label: '100T', value: '100T' }, { label: '1m', value: '1m' }, { label: '5m', value: '5m' },
      { label: '1H', value: '1h' }, { label: '4H', value: '4h' }, { label: '1D', value: '1d' }, { label: '1W', value: '1w' },
    ],
    chartTypes: [{ label: 'Candles', value: 'candlestick' }],
    indicators: [],
    popularIndicatorIds: [],
  }, {
    onSymbolClick: cb('symbol'),
    onTimeframe: (tf) => calls.push(`tf ${tf}`),
    onToggleTimeframeFavorite: () => {},
    onChartType: () => {},
    onAddIndicator: () => {},
    onScreenshot: cb('screenshot'),
    onSettings: cb('settings'),
    onToggleTheme: cb('theme'),
    onCompare: cb('compare'),
    onUndo: cb('undo'),
    onRedo: cb('redo'),
    onBracket: (side) => calls.push(`bracket ${side}`),
    onToggleLadder: cb('ladder'),
    onToggleAccount: cb('account'),
    onOrderTicket: cb('ticket'),
    ...extra,
  } as ToolbarCallbacks, EN_TRANSLATOR);
  toolbar.update(state);
}

beforeEach(() => {
  root = document.createElement('div');
  root.className = 'tcw-root';
  document.body.appendChild(root);
  calls = [];
});

afterEach(() => {
  toolbar.destroy();
  root.remove();
});

const role = (name: string) => root.querySelector<HTMLButtonElement>(`[data-role="${name}"]`);
const menuItems = () => [...document.querySelectorAll<HTMLButtonElement>('.tcw-context-menu [role^="menuitem"]')];

describe('the interval menu', () => {
  it('lists the intervals under a heading for each unit, in order of length', () => {
    make();
    const panel = role('timeframes')!.closest('div')!.querySelector('.tcw-dropdown')!;
    const headings = [...panel.querySelectorAll('.tcw-dropdown-label')].map((h) => h.textContent);
    expect(headings).toEqual(['Ticks', 'Minutes', 'Hours', 'Days', 'Weeks']);
    const underHours = [...panel.querySelectorAll('[data-tf-section="h"] [data-tf-pick]')].map((b) => b.textContent);
    expect(underHours).toEqual(['1H', '4H']);
  });
});

describe('the chart controls', () => {
  it('show the chart type as its icon, named in its tooltip', () => {
    make();
    const trigger = role('charttype')!;
    expect(trigger.querySelector('svg')).not.toBeNull();
    expect(trigger.textContent?.trim()).toBe('');
    expect(trigger.title).toBe('Candlestick');
  });

  it('have Compare beside Indicators', () => {
    make();
    const compare = role('compare')!;
    expect(compare.textContent).toContain('Compare');
    const order = [...root.querySelectorAll<HTMLElement>('[data-role]')].map((b) => b.dataset.role);
    expect(order.indexOf('compare')).toBe(order.indexOf('indicators') + 1);
    compare.click();
    expect(calls).toEqual(['compare']);
  });

  it('put undo and redo in the bar, each off while there is nothing to do', () => {
    make();
    expect(role('undo')!.disabled).toBe(true);
    expect(role('redo')!.disabled).toBe(true);
    toolbar.setHistory(true, false);
    expect(role('undo')!.disabled).toBe(false);
    expect(role('redo')!.disabled).toBe(true);
    role('undo')!.click();
    expect(calls).toEqual(['undo']);
  });
});

describe('the Trade menu', () => {
  it('gathers the trading tools in one menu', () => {
    make();
    for (const name of ['long', 'short', 'ladder', 'account']) expect(role(name), name).toBeNull();
    role('trade')!.click();
    expect(menuItems().map((b) => b.textContent?.trim())).toEqual([
      'New order…', 'Long bracket', 'Short bracket', 'Depth ladder', 'Account: positions, orders, history',
    ]);
    menuItems()[1].click();
    expect(calls).toEqual(['bracket buy']);
  });

  it('ticks the panels that are open', () => {
    make();
    toolbar.setActive('ladder', true);
    role('trade')!.click();
    const ladder = menuItems().find((b) => b.textContent?.includes('Depth ladder'))!;
    expect(ladder.getAttribute('aria-checked')).toBe('true');
  });

  it('leaves out the tools switched off, and goes when all are', () => {
    make();
    root.dataset.tcwOff = 'bracketOrders';
    toolbar.tidy();
    role('trade')!.click();
    expect(menuItems().map((b) => b.textContent?.trim())).not.toContain('Long bracket');
    document.body.click();
    root.dataset.tcwOff = 'bracketOrders depthLadder accountPanel orderTicket';
    toolbar.tidy();
    expect(role('trade')!.hidden).toBe(true);
  });

  it('isn’t there without trading', () => {
    make({ onBracket: undefined, onToggleLadder: undefined, onToggleAccount: undefined, onOrderTicket: undefined });
    expect(role('trade')).toBeNull();
  });
});
