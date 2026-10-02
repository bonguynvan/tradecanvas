// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TOOLTIP_DELAY_MS, TOOLTIP_WARM_MS, WidgetTooltip } from '../WidgetTooltip.js';

// jsdom has no PointerEvent.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    readonly pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  (globalThis as { PointerEvent?: unknown }).PointerEvent = PointerEventShim;
}

let root: HTMLDivElement;
let tooltip: WidgetTooltip;

const button = (title: string, text = '') => {
  const b = document.createElement('button');
  b.title = title;
  b.textContent = text;
  // jsdom has no layout: count every attached element as on screen.
  b.getClientRects = () => (b.isConnected && !b.hidden ? [{} as DOMRect] : []) as unknown as DOMRectList;
  root.appendChild(b);
  return b;
};
const tip = () => root.querySelector<HTMLElement>('.tcw-tooltip')!;
const visible = () => tip().classList.contains('tcw-tooltip--visible');
const over = (el: Element) => el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
const out = (el: Element, to: Element | null = null) =>
  el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: to }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  root = document.createElement('div');
  document.body.appendChild(root);
  tooltip = new WidgetTooltip(root);
});

afterEach(() => {
  tooltip.destroy();
  root.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('WidgetTooltip', () => {
  it('lifts the title only while the pointer is on the control', () => {
    const icon = button('Screenshot');
    over(icon);
    expect(icon.hasAttribute('title')).toBe(false); // the browser's tooltip can't show
    expect(icon.dataset.tip).toBe('Screenshot');
    out(icon, root);
    expect(icon.getAttribute('title')).toBe('Screenshot');
    expect(icon.dataset.tip).toBeUndefined();
  });

  it('shows after a short pause, then at once for the next control', () => {
    const a = button('Undo');
    const b = button('Redo');
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS - 50);
    expect(visible()).toBe(false);
    vi.advanceTimersByTime(60);
    expect(visible()).toBe(true);
    expect(tip().textContent).toBe('Undo');

    out(a, b);
    over(b);
    expect(visible()).toBe(true);
    expect(tip().textContent).toBe('Redo');
    expect(a.getAttribute('title')).toBe('Undo');

    out(b, root);
    vi.advanceTimersByTime(TOOLTIP_WARM_MS + 10);
    over(a);
    expect(visible()).toBe(false); // cold again
  });

  it('hides when the control is pressed and stays hidden until the pointer leaves', () => {
    const a = button('Settings');
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(visible()).toBe(false);
    expect(a.hasAttribute('title')).toBe(false); // still lifted while hovered
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS * 2);
    expect(visible()).toBe(false);
    out(a, root);
    expect(a.getAttribute('title')).toBe('Settings');
  });

  it('hides on a key press', () => {
    const a = button('Alerts');
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(visible()).toBe(false);
  });

  it('goes when its control is removed or hidden while it shows', () => {
    const a = button('Bid 101.5');
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    expect(visible()).toBe(true);
    a.remove(); // e.g. a live depth ladder redrawing its rows
    vi.advanceTimersByTime(20);
    expect(visible()).toBe(false);

    const b = button('Play');
    over(b);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    b.hidden = true;
    vi.advanceTimersByTime(20);
    expect(visible()).toBe(false);
  });

  it('follows a title the code changes while it shows', async () => {
    const magnet = button('Magnet OFF');
    over(magnet);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    magnet.title = 'Magnet ON';
    await Promise.resolve(); // mutation observer
    expect(magnet.hasAttribute('title')).toBe(false);
    expect(tip().textContent).toBe('Magnet ON');
    out(magnet, root);
    expect(magnet.getAttribute('title')).toBe('Magnet ON');
  });

  it('ignores touch, which has no hover', () => {
    const a = button('Alerts');
    a.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }));
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS * 2);
    expect(visible()).toBe(false);
    expect(a.getAttribute('title')).toBe('Alerts');
  });

  it('puts every lifted title back when destroyed', () => {
    const a = button('Fullscreen');
    over(a);
    tooltip.destroy();
    expect(a.getAttribute('title')).toBe('Fullscreen');
    tooltip = new WidgetTooltip(root); // for afterEach
  });
});
