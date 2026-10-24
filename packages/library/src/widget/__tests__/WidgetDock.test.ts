// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetDock, DOCK_WIDTH, DOCK_WIDTH_STEP, type DockPage } from '../WidgetDock.js';

let host: HTMLDivElement;
let dock: WidgetDock;
let saved: number[];
let changes: (string | null)[];

const labels = { rail: 'Panels', resize: 'Resize the panel' };
const rail = () => host.querySelector<HTMLElement>('.tcw-dock-rail')!;
const panel = () => host.querySelector<HTMLElement>('.tcw-dock-panel')!;
const button = (id: string) => host.querySelector<HTMLButtonElement>(`.tcw-dock-rail [data-page="${id}"]`)!;
const handle = () => host.querySelector<HTMLElement>('.tcw-dock-resize')!;
const width = () => parseFloat(host.querySelector<HTMLElement>('.tcw-dock')!.style.getPropertyValue('--tcw-dock-w'));
const pointer = (target: EventTarget, type: string, clientX: number) =>
  target.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true, cancelable: true, button: 0 }));

function page(id: string, events: string[] = []): DockPage & { element: HTMLDivElement } {
  const element = document.createElement('div');
  element.className = `page-${id}`;
  return {
    id,
    label: id.toUpperCase(),
    icon: 'bell',
    element,
    onShow: () => events.push(`show:${id}`),
    onHide: () => events.push(`hide:${id}`),
  };
}

function make(options: Partial<ConstructorParameters<typeof WidgetDock>[1]> = {}): void {
  dock = new WidgetDock(host, {
    labels,
    saveWidth: (w) => saved.push(w),
    onChange: (p) => changes.push(p),
    ...options,
  });
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  saved = [];
  changes = [];
});

afterEach(() => {
  dock.destroy();
  document.body.innerHTML = '';
});

describe('WidgetDock', () => {
  it('has a rail with a button for each page, and a panel shut to start with', () => {
    make();
    dock.addPage(page('watchlist'));
    dock.addPage(page('alerts'));
    expect(rail().getAttribute('role')).toBe('toolbar');
    expect(rail().getAttribute('aria-orientation')).toBe('vertical');
    expect(rail().getAttribute('aria-label')).toBe('Panels');
    expect([...rail().querySelectorAll<HTMLElement>('[data-page]')].map((b) => b.dataset.page)).toEqual(['watchlist', 'alerts']);
    expect(button('alerts').getAttribute('aria-label')).toBe('ALERTS');
    expect(button('alerts').getAttribute('aria-pressed')).toBe('false');
    expect(button('alerts').querySelector('svg')).not.toBeNull();
    expect(panel().hidden).toBe(true);
    expect(dock.current()).toBeNull();
  });

  it('opens a page in the panel, the others hidden, and says so', () => {
    make();
    const events: string[] = [];
    const a = page('watchlist', events);
    const b = page('alerts', events);
    dock.addPage(a);
    dock.addPage(b);
    dock.open('alerts');
    expect(panel().hidden).toBe(false);
    expect(panel().contains(b.element)).toBe(true);
    expect([a.element.hidden, b.element.hidden]).toEqual([true, false]);
    expect(button('alerts').getAttribute('aria-pressed')).toBe('true');
    expect(dock.current()).toBe('alerts');
    expect(dock.isOpen('alerts')).toBe(true);
    expect(events).toEqual(['show:alerts']);
    expect(changes).toEqual(['alerts']);
    dock.open('watchlist');
    expect(events).toEqual(['show:alerts', 'hide:alerts', 'show:watchlist']);
    expect(button('alerts').getAttribute('aria-pressed')).toBe('false');
  });

  it('a rail button opens its page, and closes the dock when its page is the one open', () => {
    make();
    const events: string[] = [];
    dock.addPage(page('alerts', events));
    button('alerts').click();
    expect(dock.current()).toBe('alerts');
    button('alerts').click();
    expect(dock.current()).toBeNull();
    expect(panel().hidden).toBe(true);
    expect(events).toEqual(['show:alerts', 'hide:alerts']);
    expect(changes).toEqual(['alerts', null]);
  });

  it('closes a page only while it is the one open, the keyboard going back to its button', () => {
    make();
    dock.addPage(page('watchlist'));
    const alerts = page('alerts');
    const input = alerts.element.appendChild(document.createElement('input'));
    dock.addPage(alerts);
    dock.open('watchlist');
    dock.closePage('alerts');
    expect(dock.current()).toBe('watchlist');
    dock.open('alerts');
    input.focus();
    dock.closePage('alerts');
    expect(dock.current()).toBeNull();
    expect(document.activeElement).toBe(button('alerts'));
  });

  it('moves along the rail with the arrow keys, one button taking Tab', () => {
    make();
    dock.addPage(page('watchlist'));
    dock.addPage(page('alerts'));
    dock.addPage(page('objects'));
    expect([...rail().querySelectorAll<HTMLElement>('[data-page]')].map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    button('watchlist').focus();
    button('watchlist').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(button('alerts'));
    button('alerts').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(button('objects'));
    button('objects').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(button('watchlist'));
    expect(button('watchlist').tabIndex).toBe(0);
  });

  it('opens 296 wide, or as wide as kept last within 233 to 377', () => {
    make();
    expect(DOCK_WIDTH).toEqual({ min: 233, default: 296, max: 377 });
    expect(width()).toBe(296);
    dock.destroy();
    host.replaceChildren();
    make({ savedWidth: () => 999 });
    expect(width()).toBe(377);
  });

  it('is made wider by dragging its edge towards the chart, kept when let go', () => {
    make();
    dock.addPage(page('alerts'));
    dock.open('alerts');
    pointer(handle(), 'pointerdown', 500);
    pointer(document, 'pointermove', 460);
    expect(width()).toBe(336);
    pointer(document, 'pointermove', 100);
    expect(width()).toBe(377);
    pointer(document, 'pointerup', 100);
    expect(saved).toEqual([377]);
    pointer(document, 'pointermove', 900);
    expect(width()).toBe(377);
  });

  it('takes the drag the other way in a right-to-left widget, where it sits on the left', () => {
    host.dir = 'rtl';
    make();
    pointer(handle(), 'pointerdown', 500);
    pointer(document, 'pointermove', 520);
    expect(width()).toBe(316);
    pointer(document, 'pointerup', 520);
  });

  it('resizes from the keyboard on its edge, which says how wide it is', () => {
    make();
    const h = handle();
    expect(h.getAttribute('role')).toBe('separator');
    expect(h.getAttribute('aria-label')).toBe('Resize the panel');
    expect(h.tabIndex).toBe(0);
    expect([h.getAttribute('aria-valuemin'), h.getAttribute('aria-valuemax'), h.getAttribute('aria-valuenow')]).toEqual(['233', '377', '296']);
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(width()).toBe(296 + DOCK_WIDTH_STEP);
    expect(h.getAttribute('aria-valuenow')).toBe(String(296 + DOCK_WIDTH_STEP));
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(width()).toBe(233);
    h.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(width()).toBe(377);
    expect(saved).toEqual([296 + DOCK_WIDTH_STEP, 233, 377]);
  });

  it('marks its rail and each button with their switches', () => {
    make();
    dock.addPage({ ...page('alerts'), parts: ['dock.alerts', 'alerts'] });
    expect(rail().dataset.tcwPart).toBe('dock');
    expect(button('alerts').dataset.tcwPart).toBe('dock.alerts alerts');
  });

  it('goes away with the widget', () => {
    make();
    const move = vi.fn();
    dock.addPage(page('alerts'));
    pointer(handle(), 'pointerdown', 500);
    dock.destroy();
    document.addEventListener('pointermove', move);
    pointer(document, 'pointermove', 400);
    expect(host.querySelector('.tcw-dock')).toBeNull();
    dock = new WidgetDock(host, { labels });
  });
});
