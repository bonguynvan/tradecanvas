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
  root = document.createElement('div');
  document.body.appendChild(root);
  tooltip = new WidgetTooltip(root);
});

afterEach(() => {
  tooltip.destroy();
  root.remove();
  vi.useRealTimers();
});

describe('WidgetTooltip', () => {
  it('takes over the title so the browser tooltip never shows, naming icon-only controls', () => {
    const icon = button('Screenshot');
    const labelled = button('Close the panel', 'Close');
    over(icon);
    over(labelled);
    expect(icon.hasAttribute('title')).toBe(false);
    expect(icon.dataset.tip).toBe('Screenshot');
    expect(icon.getAttribute('aria-label')).toBe('Screenshot');
    expect(labelled.hasAttribute('aria-label')).toBe(false); // its text already names it
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
    over(a);
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS * 2);
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
    expect(magnet.getAttribute('aria-label')).toBe('Magnet ON');
  });

  it('ignores touch, which has no hover', () => {
    const a = button('Alerts');
    a.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'touch' }));
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS * 2);
    expect(visible()).toBe(false);
  });
});
