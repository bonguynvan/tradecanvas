// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetToolbar } from '../WidgetToolbar.js';
import { WidgetDropdown } from '../WidgetDropdown.js';
import { EN_TRANSLATOR } from '../i18n.js';
import type { ToolbarCallbacks, WidgetState } from '../types.js';

let root: HTMLDivElement;
let toolbar: WidgetToolbar;
let calls: string[];

const state = {
  symbol: 'BTCUSDT', timeframe: '1h', chartType: 'candlestick', activeIndicators: new Map(), isDark: true,
} as unknown as WidgetState;

beforeEach(() => {
  root = document.createElement('div');
  root.className = 'tcw-root';
  document.body.appendChild(root);
  calls = [];
  const cb = (name: string) => () => { calls.push(name); };
  toolbar = new WidgetToolbar(root, {
    symbols: ['BTCUSDT'],
    timeframes: [{ label: '1m', value: '1m' }, { label: '1h', value: '1h' }, { label: '1D', value: '1d' }],
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
    onToggleAlerts: cb('alerts'),
    onToggleReplay: cb('replay'),
  } as ToolbarCallbacks, EN_TRANSLATOR);
  toolbar.update(state);
});

afterEach(() => {
  toolbar.destroy();
  root.remove();
});

const more = () => root.querySelector<HTMLButtonElement>('.tcw-toolbar-more')!;
const menuItems = () => [...root.querySelectorAll<HTMLButtonElement>('.tcw-context-menu [role="menuitem"], .tcw-context-menu [role="menuitemcheckbox"]')];

describe('WidgetToolbar — narrow', () => {
  it('has a “more” button whose menu lists the buttons a narrow toolbar hides, in order', () => {
    root.setAttribute('data-tcw-narrow', '');
    expect(more()).not.toBeNull();
    more().click();
    const labels = menuItems().map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Bar replay', 'Price alerts', 'Screenshot', 'Chart Settings', 'Toggle theme']);
  });

  it('a pick does what the button does', () => {
    root.setAttribute('data-tcw-narrow', '');
    more().click();
    menuItems().find((b) => b.textContent?.includes('Settings'))!.click();
    expect(calls).toEqual(['settings']);
  });

  it('leaves out what is switched off', () => {
    root.setAttribute('data-tcw-narrow', '');
    root.setAttribute('data-tcw-off', 'alerts');
    more().click();
    expect(menuItems().map((b) => b.textContent?.trim())).not.toContain('Price alerts');
  });

  it('names the current timeframe on the timeframe menu’s button', () => {
    expect(root.querySelector('.tcw-tf-current')?.textContent).toBe('1h');
    toolbar.update({ ...state, timeframe: '1d' } as WidgetState);
    expect(root.querySelector('.tcw-tf-current')?.textContent).toBe('1D');
  });

  it('keeps the chart type and indicators labels apart from their icons (a narrow toolbar shows the icons)', () => {
    expect(root.querySelector('[data-role="charttype"] .tcw-trigger-label')?.textContent).toBe('Candlestick');
    expect(root.querySelector('[data-role="indicators"] .tcw-trigger-label')?.textContent).toBe('Indicators');
  });
});

describe('WidgetDropdown — over the page (a layer)', () => {
  function setup(rect: Partial<DOMRect>) {
    const trigger = document.createElement('div');
    const layer = document.createElement('div');
    document.body.append(trigger, layer);
    trigger.getBoundingClientRect = () => ({ left: 100, right: 160, top: 40, bottom: 70, width: 60, height: 30, x: 100, y: 40, toJSON: () => ({}), ...rect }) as DOMRect;
    const dd = new WidgetDropdown(trigger, { layer: () => layer });
    dd.setContent('<button class="tcw-dropdown-item" id="pick">A</button><button id="keep">B</button>');
    const panel = () => (dd as unknown as { panel: HTMLElement }).panel;
    return { trigger, layer, dd, panel, done: () => { dd.destroy(); trigger.remove(); layer.remove(); } };
  }

  it('opens in the layer, fixed under its button, so nothing around the widget clips it', () => {
    const { layer, dd, panel, done } = setup({});
    dd.open();
    expect(panel().parentElement).toBe(layer);
    expect(panel().style.position).toBe('fixed');
    expect(panel().style.top).toBe('76px');
    expect(panel().style.left).toBe('100px');
    done();
  });

  it('opens above its button when there is more room there', () => {
    vi.stubGlobal('innerHeight', 600);
    const { dd, panel, done } = setup({ top: 500, bottom: 530 });
    // Taller than the room below.
    Object.defineProperty((dd as unknown as { panel: HTMLElement }).panel, 'scrollHeight', { value: 300 });
    dd.open();
    expect(panel().style.top).toBe('');
    expect(panel().style.bottom).toBe('106px');
    done();
    vi.unstubAllGlobals();
  });

  it('closes on a pick, but not on a press inside it or a click its item keeps', () => {
    const { dd, panel, done } = setup({});
    dd.open();
    panel().querySelector('#keep')!.addEventListener('click', (e) => e.stopPropagation());
    panel().dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(dd.isOpen()).toBe(true);
    panel().querySelector<HTMLButtonElement>('#keep')!.click();
    expect(dd.isOpen()).toBe(true);
    panel().querySelector<HTMLButtonElement>('#pick')!.click();
    expect(dd.isOpen()).toBe(false);
    done();
  });

  it('closes when the page scrolls under it', () => {
    const { dd, done } = setup({});
    dd.open();
    document.dispatchEvent(new Event('scroll'));
    expect(dd.isOpen()).toBe(false);
    done();
  });
});

describe('WidgetDropdown — closing', () => {
  it('closes on a tap elsewhere (a pointer, not only a mouse)', () => {
    const trigger = document.createElement('div');
    document.body.appendChild(trigger);
    const dd = new WidgetDropdown(trigger);
    dd.open();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(dd.isOpen()).toBe(false);
    dd.destroy();
    trigger.remove();
  });
});

describe('watchNarrow', () => {
  it('marks the element narrow below 641px wide, and stops on its word', async () => {
    const { watchNarrow } = await import('../narrowMode.js');
    let fire: (() => void) | null = null;
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { fire = cb; } observe() {} disconnect() {} });
    const el = document.createElement('div');
    let width = 390;
    Object.defineProperty(el, 'clientWidth', { get: () => width });
    const changes: boolean[] = [];
    const stop = watchNarrow(el, (narrow) => changes.push(narrow));
    expect(el.hasAttribute('data-tcw-narrow')).toBe(true);
    width = 900;
    fire!();
    expect(el.hasAttribute('data-tcw-narrow')).toBe(false);
    fire!();
    expect(changes).toEqual([true, false]);
    stop();
    vi.unstubAllGlobals();
  });
});

describe('WidgetToolbar — fitting its width', () => {
  /** Lay the toolbar out `width` px wide, needing `need(toolbar)` px. */
  function layout(width: number, need: (el: HTMLElement) => number) {
    const el = root.querySelector<HTMLElement>('.tcw-toolbar')!;
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => width });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, get: () => need(el) });
    return el;
  }
  /** 500px for the chart's own controls, 60 for each button on the right still shown. */
  const shown = (el: HTMLElement) => [...el.querySelectorAll('.tcw-toolbar-overflow')].filter((b) => !b.hasAttribute('data-tcw-folded')).length;
  const need = (el: HTMLElement) => (el.classList.contains('tcw-toolbar--icons') ? 300 : 500) + 60 * shown(el);
  const folded = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-tcw-folded]')].map((b) => b.title);
  const collapsed = (el: HTMLElement) => el.classList.contains('tcw-toolbar--collapsed');
  const iconsOnly = (el: HTMLElement) => el.classList.contains('tcw-toolbar--icons');

  it('keeps everything when it fits, with no “more”', () => {
    const el = layout(1200, need);
    toolbar.fit();
    expect(folded(el)).toEqual([]);
    expect(collapsed(el)).toBe(false);
  });

  it('folds only as many buttons as it must, from the right, and “more” lists just those', () => {
    const el = layout(700, need); // 5 buttons need 800: two go
    toolbar.fit();
    expect(folded(el)).toEqual(['Chart Settings', 'Toggle theme']);
    expect(collapsed(el)).toBe(true);
    expect(iconsOnly(el)).toBe(false);
    more().click();
    expect(menuItems().map((b) => b.textContent?.trim())).toEqual(['Chart Settings', 'Toggle theme']);
  });

  it('then drops the labels and the interval buttons; wider again, everything is back', () => {
    const el = layout(400, need);
    toolbar.fit();
    expect(shown(el)).toBe(1);
    expect(iconsOnly(el)).toBe(true);
    layout(1200, need);
    toolbar.fit();
    expect(folded(el)).toEqual([]);
    expect(iconsOnly(el)).toBe(false);
  });
});
