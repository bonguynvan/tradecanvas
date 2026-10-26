// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RangePreset } from '@tradecanvas/core';
import { WidgetStatusBar, type StatusBarClock, type StatusBarRange } from '../WidgetStatusBar.js';

const PRESETS: readonly RangePreset[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'All'];
/** Each preset and go to date take 30px, the "more" button 26px while something is folded. */
const BUTTON_PX = 30;
const MORE_PX = 26;
/** The right group (the market, the connection, the clock): 150px, 100px with the market's short word. */
const RIGHT_PX = 150;
const RIGHT_SHORT_PX = 100;

let root: HTMLDivElement;
let bar: WidgetStatusBar;
let calls: string[];

function make(range: Partial<StatusBarRange> = {}): void {
  const clock: StatusBarClock = {
    label: 'Timezone',
    now: () => ({ time: '14:05:09', zone: 'UTC+7' }),
    options: () => ({ current: 'UTC', list: [{ value: 'UTC', label: 'UTC' }] }),
    onPick: () => {},
  };
  bar = new WidgetStatusBar(root, {
    presets: PRESETS,
    groupLabel: 'Range',
    goToLabel: 'Go to date',
    moreLabel: 'More',
    onPreset: (preset) => calls.push(preset),
    onGoTo: () => calls.push('goto'),
    ...range,
  }, { clock });
}

beforeEach(() => {
  root = document.createElement('div');
  root.className = 'tcw-root';
  document.body.appendChild(root);
  calls = [];
  make();
});

afterEach(() => {
  bar.destroy();
  root.remove();
  vi.unstubAllGlobals();
});

const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
const statusBar = () => q('.tcw-statusbar');
const rangeBar = () => q('.tcw-range-bar');
const isFolded = (el: Element) => el.hasAttribute('data-tcw-folded');
const isOff = (el: HTMLElement) => (el.dataset.tcwPart ?? '').split(' ').some((name) => (root.dataset.tcwOff ?? '').split(' ').includes(name));
/** The presets folded away, in their order. */
const foldedPresets = () => [...root.querySelectorAll<HTMLElement>('[data-range][data-tcw-folded]')].map((b) => b.dataset.range);
const has = (name: string) => statusBar().classList.contains(`tcw-statusbar--${name}`);
const menuItems = () => [...root.querySelectorAll<HTMLElement>('.tcw-context-menu:not([hidden]) [role^="menuitem"]')];

const box = (left: number, right: number) => ({ left, right, width: right - left, top: 0, bottom: 0, height: 0, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;

interface LayoutOptions {
  /** The bar's padding at each end (the stylesheet gives 16px); none unless asked. */
  pad?: number;
  /** A container's transform or zoom: boxes on screen are this times their layout size, the padding is not. */
  scale?: number;
}

/**
 * Lay the bar out `width` px wide, as a browser would: the right group keeps
 * its width, and the range bar gets what is left, never more than its buttons
 * need. With less room than the right group's width even an empty range bar
 * leaves it too little, and it runs past the bar's end: the right edge, or
 * the left one right to left. Offsets and widths are layout pixels; only the
 * boxes on screen take `scale`.
 */
function layout(width: number, { pad = 0, scale = 1 }: LayoutOptions = {}): void {
  const sb = statusBar();
  const right = q('.tcw-status-right');
  const range = root.querySelector<HTMLElement>('.tcw-range-bar');
  sb.style.paddingLeft = sb.style.paddingRight = `${pad}px`;
  const rightPx = () => (has('short-market') ? RIGHT_SHORT_PX : RIGHT_PX);
  if (range) {
    const content = () => [...range.querySelectorAll<HTMLElement>('button')]
      .filter((b) => !isFolded(b) && !isOff(b))
      .reduce((sum, b) => sum + (!b.classList.contains('tcw-range-more') ? BUTTON_PX : has('folded') ? MORE_PX : 0), 0);
    const room = () => Math.max(0, width - 2 * pad - rightPx());
    Object.defineProperty(range, 'scrollWidth', { configurable: true, get: content });
    Object.defineProperty(range, 'clientWidth', { configurable: true, get: () => Math.min(content(), room()) });
  }
  Object.defineProperty(sb, 'clientWidth', { configurable: true, get: () => width });
  const rtl = sb.style.direction === 'rtl';
  // From the bar's padding edge: at the content's end while it has room, past it when not.
  const rightStart = () => (rtl ? Math.min(pad, width - pad - rightPx()) : Math.max(pad, width - pad - rightPx()));
  Object.defineProperty(right, 'offsetParent', { configurable: true, get: () => sb });
  Object.defineProperty(right, 'offsetLeft', { configurable: true, get: rightStart });
  Object.defineProperty(right, 'offsetWidth', { configurable: true, get: rightPx });
  sb.getBoundingClientRect = () => box(0, width * scale);
  right.getBoundingClientRect = () => box(rightStart() * scale, (rightStart() + rightPx()) * scale);
}

function fitAt(width: number, options?: LayoutOptions): void {
  layout(width, options);
  bar.fit();
}

describe('the status bar, fitting its width', () => {
  it('keeps every preset when they fit, with no "more"', () => {
    fitAt(800);
    expect(root.querySelectorAll('[data-tcw-folded]')).toHaveLength(0);
    expect(has('folded')).toBe(false);
  });

  it('folds presets from the long end, only as many as it must, and "more" lists just those', () => {
    // 240px of room: three presets go, and "more" comes.
    fitAt(RIGHT_PX + 240);
    expect(foldedPresets()).toEqual(['1Y', '5Y', 'All']);
    expect(has('folded')).toBe(true);
    expect(isFolded(q('[data-role="goto"]'))).toBe(false);
    const more = q<HTMLButtonElement>('[data-role="rangeMore"]');
    expect(more.getAttribute('aria-label')).toBe('More');
    expect(more.dataset.tcwPart).toBe('statusBar.range');
    more.click();
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(menuItems().map((b) => b.textContent)).toEqual(['1Y', '5Y', 'All']);
    menuItems()[1].click();
    expect(calls).toEqual(['5Y']);
  });

  it('folds go to date after every preset, last in the menu after a separator, with Alt+G', () => {
    fitAt(RIGHT_PX + MORE_PX);
    expect(foldedPresets()).toEqual([...PRESETS]);
    expect(isFolded(q('[data-role="goto"]'))).toBe(true);
    q<HTMLButtonElement>('[data-role="rangeMore"]').click();
    const menu = q('.tcw-context-menu:not([hidden])');
    const last = menuItems().at(-1)!;
    expect(menuItems()).toHaveLength(PRESETS.length + 1);
    expect(last.querySelector('.tcw-context-label')!.textContent).toBe('Go to date');
    expect(last.getAttribute('aria-keyshortcuts')).toBe('Alt+G');
    expect(last.previousElementSibling!.getAttribute('role')).toBe('separator');
    expect(menu.querySelectorAll('[role="separator"]')).toHaveLength(1);
    last.click();
    expect(calls).toEqual(['goto']);
  });

  it('shows go to date\'s keys, in the menu and its tooltip, only while the widget says they work', () => {
    let keys: string | undefined;
    bar.destroy();
    make({ goToKeys: () => keys });
    const goTo = q<HTMLButtonElement>('[data-role="goto"]');
    const more = q<HTMLButtonElement>('[data-role="rangeMore"]');
    const tooltip = () => {
      goTo.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
      return goTo.title;
    };
    // Switched off, or taken by a key of yours.
    expect(tooltip()).toBe('Go to date');
    fitAt(RIGHT_PX + MORE_PX);
    more.click();
    let last = menuItems().at(-1)!;
    expect(last.hasAttribute('aria-keyshortcuts')).toBe(false);
    expect(last.querySelector('kbd')).toBeNull();
    more.click();
    keys = 'Alt+G';
    more.click();
    last = menuItems().at(-1)!;
    expect(last.getAttribute('aria-keyshortcuts')).toBe('Alt+G');
    expect(tooltip()).toBe('Go to date (Alt+G)');
  });

  it('keeps the market word whole while anything can still fold', () => {
    bar.setMarket('closed', 'Market closed', 'Closed');
    fitAt(RIGHT_PX + 240);
    expect(has('short-market')).toBe(false);
    fitAt(RIGHT_PX + MORE_PX);
    expect(has('short-market')).toBe(false);
  });

  it('shortens the market word last, once everything has folded, and brings back what then fits', () => {
    bar.setMarket('closed', 'Market closed', 'Closed');
    // Not even "more" fits; with the short word, 70px: "more" and go to date.
    fitAt(RIGHT_PX + 20);
    expect(has('short-market')).toBe(true);
    expect(foldedPresets()).toEqual([...PRESETS]);
    expect(isFolded(q('[data-role="goto"]'))).toBe(false);
    const market = q('.tcw-status-market');
    expect(market.title).toBe('Market closed');
    expect(market.querySelector('.tcw-status-market-text')!.textContent).toBe('Market closed');
    const short = market.querySelector('.tcw-status-market-short')!;
    expect(short.textContent).toBe('Closed');
    expect(short.getAttribute('aria-hidden')).toBe('true');
  });

  it('brings everything back when there is room again', () => {
    bar.setMarket('open', 'Market open', 'Open');
    fitAt(RIGHT_PX + 20);
    fitAt(800);
    expect(root.querySelectorAll('[data-tcw-folded]')).toHaveLength(0);
    expect(has('folded')).toBe(false);
    expect(has('short-market')).toBe(false);
  });

  it('never folds or hides the clock', () => {
    bar.setMarket('closed', 'Market closed', 'Closed');
    fitAt(100);
    const clock = q('[data-role="clock"]');
    expect(isFolded(clock)).toBe(false);
    expect(clock.hidden).toBe(false);
    expect(clock.textContent).toBe('14:05:09 UTC+7');
  });

  it('leaves go to date out of the menu while it is switched off', () => {
    root.dataset.tcwOff = 'statusBar.goToDate';
    fitAt(RIGHT_PX + MORE_PX);
    q<HTMLButtonElement>('[data-role="rangeMore"]').click();
    expect(menuItems().map((b) => b.textContent)).toEqual([...PRESETS]);
    expect(root.querySelector('.tcw-context-menu:not([hidden]) [role="separator"]')).toBeNull();
  });

  it('never folds go to date while the presets, and "more" with them, are switched off', () => {
    root.dataset.tcwOff = 'statusBar.range';
    fitAt(RIGHT_PX + 20);
    expect(isFolded(q('[data-role="goto"]'))).toBe(false);
    expect(has('folded')).toBe(false);
  });

  it('brings back a folded go to date when the presets are switched off after it folded', () => {
    fitAt(RIGHT_PX + MORE_PX);
    expect(isFolded(q('[data-role="goto"]'))).toBe(true);
    root.dataset.tcwOff = 'statusBar.range';
    fitAt(RIGHT_PX + MORE_PX);
    expect(root.querySelectorAll('[data-tcw-folded]')).toHaveLength(0);
    expect(has('folded')).toBe(false);
  });

  describe('with the presets and go to date switched off (`rangeBar: false`)', () => {
    beforeEach(() => {
      root.dataset.tcwOff = 'statusBar.range statusBar.rangeTimeframe goToDate';
      bar.setMarket('closed', 'Market closed', 'Closed');
    });

    it('shortens the market word when the right group still has no room', () => {
      fitAt(RIGHT_PX - 20);
      expect(has('short-market')).toBe(true);
      expect(has('folded')).toBe(false);
    });

    it('keeps the market word whole while the right group has room', () => {
      fitAt(RIGHT_PX + 10);
      expect(has('short-market')).toBe(false);
    });

    it('shortens it right to left too, where the right group runs past the left edge', () => {
      statusBar().style.direction = 'rtl';
      fitAt(RIGHT_PX - 20);
      expect(has('short-market')).toBe(true);
      fitAt(RIGHT_PX + 10);
      expect(has('short-market')).toBe(false);
    });

    it('keeps the market word whole when a stylesheet of yours makes the bar no longer the group’s offset parent', () => {
      // Your `.tcw-statusbar { position: static }`: the group is measured from the root, 200px in.
      const BAR_LEFT_PX = 200;
      layout(RIGHT_PX + 10);
      const right = q('.tcw-status-right');
      Object.defineProperty(right, 'offsetParent', { configurable: true, get: () => root });
      Object.defineProperty(right, 'offsetLeft', { configurable: true, get: () => BAR_LEFT_PX + 10 });
      bar.fit();
      expect(has('short-market')).toBe(false);
    });
  });

  it('shortens the market word with no range bar at all, when the right group has no room', () => {
    bar.destroy();
    bar = new WidgetStatusBar(root);
    bar.setMarket('closed', 'Market closed', 'Closed');
    fitAt(RIGHT_PX - 20);
    expect(has('short-market')).toBe(true);
  });

  it('does nothing while the bar is hidden', () => {
    fitAt(0);
    expect(root.querySelectorAll('[data-tcw-folded]')).toHaveLength(0);
  });

  it('has nothing to fold without range presets', () => {
    bar.destroy();
    bar = new WidgetStatusBar(root);
    Object.defineProperty(q('.tcw-statusbar'), 'clientWidth', { configurable: true, get: () => 100 });
    expect(() => bar.fit()).not.toThrow();
    expect(root.querySelector('[data-role="rangeMore"]')).toBeNull();
  });
});

describe('the status bar, in a scaled or zoomed container', () => {
  // As the stylesheet pads the bar; a dialog's scale-in starts at 0.9.
  const PAD_PX = 16;
  const SHRUNK = { pad: PAD_PX, scale: 0.75 };
  const GROWN = { pad: PAD_PX, scale: 1.25 };

  it('folds nothing, and keeps the market word whole, while there is room', () => {
    bar.setMarket('closed', 'Market closed', 'Closed');
    fitAt(800, SHRUNK);
    expect(root.querySelectorAll('[data-tcw-folded]')).toHaveLength(0);
    expect(has('folded')).toBe(false);
    expect(has('short-market')).toBe(false);
  });

  it('folds nothing right to left either', () => {
    statusBar().style.direction = 'rtl';
    bar.setMarket('closed', 'Market closed', 'Closed');
    fitAt(800, SHRUNK);
    expect(root.querySelectorAll('[data-tcw-folded]')).toHaveLength(0);
    expect(has('short-market')).toBe(false);
  });

  it('folds just what it would unscaled when there is no room', () => {
    fitAt(RIGHT_PX + 240 + 2 * PAD_PX, SHRUNK);
    expect(foldedPresets()).toEqual(['1Y', '5Y', 'All']);
  });

  describe('with the presets and go to date switched off', () => {
    beforeEach(() => {
      root.dataset.tcwOff = 'statusBar.range goToDate';
      bar.setMarket('closed', 'Market closed', 'Closed');
    });

    it('keeps the market word whole while the right group has room', () => {
      fitAt(RIGHT_PX + 2 * PAD_PX + 10, SHRUNK);
      expect(has('short-market')).toBe(false);
    });

    it('shortens it, grown as by a zoom, when the right group runs into the padding', () => {
      fitAt(RIGHT_PX + 2 * PAD_PX - 3, GROWN);
      expect(has('short-market')).toBe(true);
    });

    it('shortens it right to left too, grown, when the right group runs into the padding', () => {
      statusBar().style.direction = 'rtl';
      fitAt(RIGHT_PX + 2 * PAD_PX - 3, GROWN);
      expect(has('short-market')).toBe(true);
    });
  });
});

describe('the status bar, refitting under the keyboard and the "more" menu', () => {
  const more = () => q<HTMLButtonElement>('[data-role="rangeMore"]');
  const preset = (name: string) => q<HTMLButtonElement>(`[data-range="${name}"]`);
  const goTo = () => q<HTMLButtonElement>('[data-role="goto"]');
  const menuOpen = () => root.querySelector('.tcw-context-menu:not([hidden])') !== null;

  it('hands the keyboard to "more" when the preset it is on folds', () => {
    fitAt(800);
    preset('All').focus();
    fitAt(RIGHT_PX + 240);
    expect(isFolded(preset('All'))).toBe(true);
    expect(document.activeElement).toBe(more());
  });

  it('hands it to go to date\'s neighbour, "more", when go to date folds', () => {
    fitAt(800);
    q<HTMLButtonElement>('[data-role="goto"]').focus();
    fitAt(RIGHT_PX + MORE_PX);
    expect(document.activeElement).toBe(more());
  });

  it('leaves the keyboard on a preset that still shows', () => {
    fitAt(800);
    preset('1D').focus();
    fitAt(RIGHT_PX + 240);
    expect(document.activeElement).toBe(preset('1D'));
  });

  it('hands the keyboard to go to date when "more" goes', () => {
    fitAt(RIGHT_PX + 240);
    more().focus();
    fitAt(800);
    expect(has('folded')).toBe(false);
    expect(document.activeElement).toBe(goTo());
  });

  it('hands it to the last preset that shows when "more" goes and go to date is switched off', () => {
    root.dataset.tcwOff = 'statusBar.goToDate';
    fitAt(RIGHT_PX + 240);
    more().focus();
    fitAt(800);
    expect(document.activeElement).toBe(preset('All'));
  });

  it('hands it to go to date when the presets, and "more" with them, are switched off under it', () => {
    fitAt(RIGHT_PX + 240);
    more().focus();
    root.dataset.tcwOff = 'statusBar.range';
    fitAt(RIGHT_PX + 240);
    expect(document.activeElement).toBe(goTo());
  });

  describe('when nothing on the range bar shows', () => {
    // jsdom lays nothing out: what isn't hidden or switched off gets a box, as it would on screen.
    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
        const part = this.closest<HTMLElement>('[data-tcw-part]');
        return (this.closest('[hidden]') || (part && isOff(part)) ? [] : [{}]) as unknown as DOMRectList;
      });
    });
    afterEach(() => vi.restoreAllMocks());

    it('hands the keyboard to the first control the bar still shows: yours, then the clock', () => {
      const yours = bar.addHostItem({ id: 'acc', text: 'Demo', side: 'left', onClick: () => {} });
      fitAt(RIGHT_PX + 240);
      more().focus();
      root.dataset.tcwOff = 'statusBar.range goToDate';
      fitAt(RIGHT_PX + 240);
      expect(document.activeElement).toBe(yours);
    });

    it('skips a control that does not show, the clock taking the keyboard then', () => {
      const yours = bar.addHostItem({ id: 'acc', text: 'Demo', side: 'left', onClick: () => {} });
      yours.hidden = true;
      fitAt(RIGHT_PX + 240);
      more().focus();
      root.dataset.tcwOff = 'statusBar.range goToDate';
      fitAt(RIGHT_PX + 240);
      expect(document.activeElement).toBe(q('[data-role="clock"]'));
    });
  });

  it('names the bar, for the keyboard it may hold when nothing in it shows', () => {
    bar.destroy();
    bar = new WidgetStatusBar(root, undefined, { label: 'Status bar' });
    expect(statusBar().getAttribute('role')).toBe('group');
    expect(statusBar().getAttribute('aria-label')).toBe('Status bar');
  });

  it('hands it to the bar itself when nothing in it shows, for as long as it stays there', () => {
    root.dataset.tcwOff = 'statusBar.clock';
    fitAt(RIGHT_PX + 240);
    more().focus();
    root.dataset.tcwOff = 'statusBar.range goToDate statusBar.clock';
    fitAt(RIGHT_PX + 240);
    expect(document.activeElement).toBe(statusBar());
    // Focusable only to hold the keyboard: a click on the bar later doesn't take it.
    statusBar().blur();
    expect(statusBar().hasAttribute('tabindex')).toBe(false);
  });

  it('leaves the bar unfocusable when it cannot take the keyboard', () => {
    fitAt(RIGHT_PX + 240);
    more().focus();
    // As a browser does for a bar in an inert part of the page: no focus, so no blur will follow.
    vi.spyOn(statusBar(), 'focus').mockImplementation(() => {});
    root.dataset.tcwOff = 'statusBar.range goToDate statusBar.clock';
    fitAt(RIGHT_PX + 240);
    expect(document.activeElement).not.toBe(statusBar());
    expect(statusBar().hasAttribute('tabindex')).toBe(false);
  });

  it('leaves the keyboard alone when it is not on the range bar', () => {
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    outside.focus();
    fitAt(RIGHT_PX + 240);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('keeps the menu open while what is folded stays the same', () => {
    fitAt(RIGHT_PX + 240);
    more().click();
    fitAt(RIGHT_PX + 240);
    expect(menuOpen()).toBe(true);
    expect(root.contains(document.activeElement) && document.activeElement!.closest('.tcw-context-menu')).toBeTruthy();
  });

  it('closes the menu when what is folded changes, its entries gone stale, the keyboard back on "more"', () => {
    fitAt(RIGHT_PX + 240);
    more().click();
    fitAt(RIGHT_PX + 180);
    expect(menuOpen()).toBe(false);
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(more());
  });

  it('closes the menu when nothing is folded any more, the keyboard on go to date', () => {
    fitAt(RIGHT_PX + 240);
    more().click();
    fitAt(800);
    expect(menuOpen()).toBe(false);
    expect(document.activeElement).toBe(goTo());
  });
});

describe('the status bar\'s menus, placed under their buttons', () => {
  const rect = (left: number, right: number, top: number, bottom: number) =>
    ({ left, right, top, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
  const MENU_W = 200;
  const MENU_H = 120;

  beforeEach(() => {
    root.dir = 'rtl';
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 420 });
    Object.defineProperty(root, 'clientHeight', { configurable: true, value: 300 });
    root.getBoundingClientRect = () => rect(0, 420, 0, 300);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('tcw-context-menu') ? MENU_W : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('tcw-context-menu') ? MENU_H : 0;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const menuRightEdge = () => parseFloat(q('.tcw-context-menu:not([hidden])').style.left) + MENU_W;

  it('ends the "more" menu where "more" ends when there is no room after its start, right to left', () => {
    fitAt(RIGHT_PX + MORE_PX);
    const more = q<HTMLButtonElement>('[data-role="rangeMore"]');
    // Right to left the range bar sits against the right edge.
    more.getBoundingClientRect = () => rect(380, 406, 270, 294);
    more.click();
    expect(menuRightEdge()).toBe(406);
  });

  it('ends the zones menu where the clock ends too', () => {
    const clock = q<HTMLButtonElement>('[data-role="clock"]');
    clock.getBoundingClientRect = () => rect(330, 410, 270, 294);
    clock.click();
    expect(menuRightEdge()).toBe(410);
  });
});

describe('the status bar, right to left', () => {
  // A bare "42 ms" in a right-to-left bar reads "ms 42"; each reads in its own text's direction instead.
  it('reads the clock in its own direction, apart from the bar\'s', () => {
    expect(q('[data-role="clock"]').dir).toBe('auto');
  });

  it('reads your items in their own direction, text and buttons, on either side', () => {
    const latency = bar.addHostItem({ id: 'lat', text: '42 ms', label: 'Latency' });
    const account = bar.addHostItem({ id: 'acc', text: 'Demo', side: 'left', onClick: () => {} });
    expect(latency.dir).toBe('auto');
    expect(account.dir).toBe('auto');
  });
});

describe('the status bar, watching its width', () => {
  let observers: { callback: () => void; watched: Element[]; disconnect: ReturnType<typeof vi.fn> }[];
  let frames: (() => void)[];

  beforeEach(() => {
    observers = [];
    frames = [];
    vi.stubGlobal('ResizeObserver', class {
      watched: Element[] = [];
      disconnect = vi.fn();
      constructor(public callback: () => void) { observers.push(this); }
      observe(el: Element) { this.watched.push(el); }
    });
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    bar.destroy();
    make();
  });

  it('watches the bar, its right group and the left slot, and fits once a frame however many changes come', () => {
    const watched = observers.flatMap((o) => o.watched);
    expect(watched).toEqual(expect.arrayContaining([statusBar(), q('.tcw-status-right'), bar.hostSlot('left')]));
    const fit = vi.spyOn(bar, 'fit');
    frames.length = 0;
    observers[0].callback();
    observers[0].callback();
    expect(frames).toHaveLength(1);
    frames[0]();
    expect(fit).toHaveBeenCalledTimes(1);
  });

  it('fits no more once gone, though the page\'s fonts arrive after', async () => {
    let fontsReady!: () => void;
    const ready = new Promise<void>((resolve) => { fontsReady = resolve; });
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
    try {
      bar.destroy();
      make();
      const fit = vi.spyOn(bar, 'fit');
      frames.length = 0;
      bar.destroy();
      fontsReady();
      await ready;
      await Promise.resolve();
      observers.at(-1)!.callback();
      expect(frames).toHaveLength(0);
      expect(fit).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(document, 'fonts');
      make();
    }
  });

  it('stops watching when it goes', () => {
    observers[0].callback();
    bar.destroy();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    make();
  });
});

describe('the market status', () => {
  it('rewrites its words only when they change: the widget asks every 30 seconds', () => {
    bar.setMarket('closed', 'Market closed', 'Closed');
    const text = q('.tcw-status-market-text');
    bar.setMarket('closed', 'Market closed', 'Closed');
    expect(q('.tcw-status-market-text')).toBe(text);
    bar.setMarket('open', 'Market open', 'Open');
    expect(q('.tcw-status-market').dataset.state).toBe('open');
    expect(q('.tcw-status-market-text').textContent).toBe('Market open');
    expect(q('.tcw-status-market-short').textContent).toBe('Open');
  });

  it('hides for a market around the clock', () => {
    bar.setMarket('always', '', '');
    expect(q('.tcw-status-market').hidden).toBe(true);
  });
});
