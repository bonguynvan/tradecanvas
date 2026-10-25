// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RangePreset } from '@tradecanvas/core';
import { WidgetStatusBar, type StatusBarClock } from '../WidgetStatusBar.js';

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

function make(): void {
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

/**
 * Lay the bar out `width` px wide, as a browser would: the right group keeps
 * its width, and the range bar gets what is left, never more than its buttons
 * need. Only the range bar's widths are read.
 */
function layout(width: number): void {
  const range = rangeBar();
  const content = () => [...range.querySelectorAll<HTMLElement>('button')]
    .filter((b) => !isFolded(b) && !isOff(b))
    .reduce((sum, b) => sum + (!b.classList.contains('tcw-range-more') ? BUTTON_PX : has('folded') ? MORE_PX : 0), 0);
  const room = () => Math.max(0, width - (has('short-market') ? RIGHT_SHORT_PX : RIGHT_PX));
  Object.defineProperty(statusBar(), 'clientWidth', { configurable: true, get: () => width });
  Object.defineProperty(range, 'scrollWidth', { configurable: true, get: content });
  Object.defineProperty(range, 'clientWidth', { configurable: true, get: () => Math.min(content(), room()) });
}

function fitAt(width: number): void {
  layout(width);
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
