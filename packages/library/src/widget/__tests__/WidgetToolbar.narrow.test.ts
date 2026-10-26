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
  }, {
    onSymbolClick: cb('symbol'),
    onTimeframe: (tf) => calls.push(`tf ${tf}`),
    onToggleTimeframeFavorite: () => {},
    onChartType: () => {},
    onIndicators: () => {},
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

  it('folds a host’s buttons under “more” like its own, those on the left listed first', () => {
    toolbar.addHostButton({ id: 'scan', label: 'Scanner', side: 'left', onClick: () => {} });
    toolbar.addHostButton({ id: 'dom', label: 'DOM', side: 'right', onClick: () => {} });
    root.setAttribute('data-tcw-narrow', '');
    more().click();
    expect(menuItems().map((b) => b.textContent?.trim()))
      .toEqual(['Scanner', 'DOM', 'Bar replay', 'Price alerts', 'Screenshot', 'Chart Settings', 'Toggle theme']);
  });

  it('a pick from “more” clicks a host’s left button, and its switch shows a tick while on', () => {
    let pressed: HTMLButtonElement | null = null;
    const btn = toolbar.addHostButton({
      id: 'flow', label: 'Order flow', icon: 'layers', toggle: true, side: 'left', onClick: (b) => { pressed = b; },
    });
    root.setAttribute('data-tcw-narrow', '');
    const entry = () => menuItems().find((b) => b.textContent?.trim() === 'Order flow');
    more().click();
    entry()!.click();
    expect(pressed).toBe(btn);
    btn.setAttribute('aria-pressed', 'true'); // what handle.setActive(true) does to a switch
    more().click();
    expect(entry()?.getAttribute('aria-checked')).toBe('true');
  });

  it('lists a switch as one whether it is on or off: ticked while on, its icon while off', () => {
    toolbar.addHostButton({ id: 'flow', label: 'Order flow', icon: 'layers', toggle: true, side: 'left', onClick: () => {} });
    root.setAttribute('data-tcw-narrow', '');
    const entry = (label: string) => menuItems().find((b) => b.textContent?.trim() === label)!;
    more().click();
    for (const label of ['Order flow', 'Price alerts']) {
      expect(entry(label).getAttribute('role'), label).toBe('menuitemcheckbox');
      expect(entry(label).getAttribute('aria-checked'), label).toBe('false');
      expect(entry(label).querySelector('svg'), label).not.toBeNull();
    }
    more().click();
    toolbar.setActive('alerts', true);
    more().click();
    expect(entry('Price alerts').getAttribute('role')).toBe('menuitemcheckbox');
    expect(entry('Price alerts').getAttribute('aria-checked')).toBe('true');
    // Not a switch: an action, listed as one.
    expect(entry('Screenshot').getAttribute('role')).toBe('menuitem');
  });

  it('names a host’s button in “more” with its count, as assistive tech hears it', () => {
    toolbar.addHostButton({ id: 'news', label: 'News', icon: 'bell', text: '3', side: 'left', onClick: () => {} });
    root.setAttribute('data-tcw-narrow', '');
    more().click();
    expect(menuItems().map((b) => b.textContent?.trim())).toContain('News: 3');
  });

  it('names the current timeframe on the timeframe menu’s button', () => {
    expect(root.querySelector('.tcw-tf-current')?.textContent).toBe('1h');
    toolbar.update({ ...state, timeframe: '1d' } as WidgetState);
    expect(root.querySelector('.tcw-tf-current')?.textContent).toBe('1D');
  });

  it('keeps the indicators label apart from its icon (a narrow toolbar shows the icon), and names the chart type in its tooltip', () => {
    expect(root.querySelector<HTMLElement>('[data-role="charttype"]')?.title).toBe('Candlestick');
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
    expect(panel().style.top).toBe('auto'); // outright: the stylesheet's top (under the button) must not win
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

  describe('under the keyboard and the "more" menu', () => {
    const button = (title: string) => root.querySelector<HTMLButtonElement>(`.tcw-toolbar button[title="${title}"]`)!;
    const menuOpen = () => root.querySelector('.tcw-context-menu:not([hidden])') !== null;

    it('hands the keyboard to "more" when the button it is on folds', () => {
      layout(1200, need);
      toolbar.fit();
      button('Toggle theme').focus();
      layout(700, need);
      toolbar.fit();
      expect(document.activeElement).toBe(more());
    });

    it('leaves the keyboard on a button that still shows', () => {
      layout(1200, need);
      toolbar.fit();
      button('Bar replay').focus();
      layout(700, need);
      toolbar.fit();
      expect(document.activeElement).toBe(button('Bar replay'));
    });

    it('hands the keyboard from "more", when it goes, to the last button that came back', () => {
      layout(700, need);
      toolbar.fit();
      more().focus();
      layout(1200, need);
      toolbar.fit();
      expect(document.activeElement).toBe(button('Toggle theme'));
    });

    it('keeps the menu open while what is folded stays the same', () => {
      layout(700, need);
      toolbar.fit();
      more().click();
      toolbar.fit();
      expect(menuOpen()).toBe(true);
    });

    it('closes the menu when what is folded changes, its entries gone stale, the keyboard back on "more"', () => {
      layout(700, need);
      toolbar.fit();
      more().click();
      expect(root.querySelector('.tcw-context-menu')?.contains(document.activeElement)).toBe(true);
      layout(600, need);
      toolbar.fit();
      expect(menuOpen()).toBe(false);
      expect(more().getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(more());
    });

    it('closes the menu when nothing is folded any more, the keyboard on the last button', () => {
      layout(700, need);
      toolbar.fit();
      more().click();
      layout(1200, need);
      toolbar.fit();
      expect(menuOpen()).toBe(false);
      expect(document.activeElement).toBe(button('Toggle theme'));
    });

    it('leaves the keyboard alone when it is not on the toolbar', () => {
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();
      layout(700, need);
      toolbar.fit();
      expect(document.activeElement).toBe(outside);
      outside.remove();
    });
  });

  it('folds a host’s buttons on the left last of all, and brings them back first', () => {
    toolbar.addHostButton({ id: 'scan', label: 'Scanner', side: 'left', onClick: () => {} });
    toolbar.addHostButton({ id: 'dom', label: 'DOM', side: 'right', onClick: () => {} });
    // Counted whether it can fold or not: a button that never folds still takes its room.
    const hostShown = (el: HTMLElement) => [...el.querySelectorAll('.tcw-toolbar-overflow, [data-host-button]')]
      .filter((b) => !b.hasAttribute('data-tcw-folded')).length;
    const needAll = (el: HTMLElement) => (iconsOnly(el) ? 300 : 500) + 60 * hostShown(el);
    const el = layout(560, needAll); // room for one button: the host's on the left
    toolbar.fit();
    expect(folded(el)).toEqual(['DOM', 'Bar replay', 'Price alerts', 'Screenshot', 'Chart Settings', 'Toggle theme']);
    layout(500, needAll); // room for none: it goes too, before the labels do
    toolbar.fit();
    expect(folded(el)).toContain('Scanner');
    expect(iconsOnly(el)).toBe(false);
    more().click();
    expect(menuItems()[0].textContent?.trim()).toBe('Scanner');
    layout(400, needAll); // icons only, room for one again
    toolbar.fit();
    expect(iconsOnly(el)).toBe(true);
    expect(folded(el)).not.toContain('Scanner');
    expect(folded(el)).toContain('DOM');
  });
});

describe('WidgetToolbar — the "more" menu under its button', () => {
  const MENU_W = 200;
  const menuLeft = () => parseFloat(root.querySelector<HTMLElement>('.tcw-context-menu:not([hidden])')!.style.left);
  const place = (l: number, r: number) => {
    more().getBoundingClientRect = () => ({ left: l, right: r, top: 0, bottom: 36, width: r - l, height: 36, x: l, y: 0, toJSON: () => ({}) }) as DOMRect;
  };
  beforeEach(() => {
    root.setAttribute('data-tcw-narrow', '');
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 600 });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('tcw-context-menu') ? MENU_W : 0;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('ends where "more" ends, at the toolbar’s end', () => {
    place(764, 792);
    more().click();
    expect(menuLeft() + MENU_W).toBe(792);
  });

  it('right to left, where "more" is at the left end, ends where it ends too: under it, not beside it', () => {
    root.dir = 'rtl';
    place(8, 36);
    more().click();
    expect(menuLeft()).toBe(8);
  });
});

describe('WidgetToolbar — a name that changes width', () => {
  it('refits when the layout open now is named, or changes, and only then', () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const host = document.createElement('div');
    document.body.appendChild(host);
    const bar = new WidgetToolbar(host, { symbols: ['A'], timeframes: [], chartTypes: [] }, {
      onLayouts: () => {},
    } as unknown as ToolbarCallbacks, EN_TRANSLATOR);
    try {
      const fit = vi.spyOn(bar, 'fit');
      const run = () => frames.splice(0).forEach((frame) => frame());
      run();
      fit.mockClear();
      // The toolbar's own width stays the same: no resize tells of the longer name.
      bar.setLayout('Earnings watch', false);
      run();
      expect(fit).toHaveBeenCalledTimes(1);
      bar.setLayout('Earnings watch', true);
      run();
      expect(fit).toHaveBeenCalledTimes(2);
      // The same name and state again change nothing on the bar: no refit.
      bar.setLayout('Earnings watch', true);
      run();
      expect(fit).toHaveBeenCalledTimes(2);
    } finally {
      bar.destroy();
      host.remove();
      vi.unstubAllGlobals();
    }
  });
});

describe('WidgetToolbar — once gone', () => {
  it('fits no more, though the page’s fonts arrive after', async () => {
    let fontsReady!: () => void;
    const ready = new Promise<void>((resolve) => { fontsReady = resolve; });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
    const frames: (() => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    try {
      const gone = new WidgetToolbar(root, { symbols: ['A'], timeframes: [], chartTypes: [] }, {} as ToolbarCallbacks, EN_TRANSLATOR);
      const fit = vi.spyOn(gone, 'fit');
      gone.destroy();
      fontsReady();
      await ready;
      await Promise.resolve();
      frames.forEach((frame) => frame());
      expect(frames).toHaveLength(0);
      expect(fit).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(document, 'fonts');
      vi.unstubAllGlobals();
    }
  });
});
