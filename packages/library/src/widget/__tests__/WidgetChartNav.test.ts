// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetChartNav, type ChartNavActions } from '../WidgetChartNav.js';
import { EN_TRANSLATOR } from '../i18n.js';

let host: HTMLDivElement;
let actions: ChartNavActions;
let nav: WidgetChartNav;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  actions = { zoomIn: vi.fn(), zoomOut: vi.fn(), scroll: vi.fn(), reset: vi.fn(), plotRect: () => ({ x: 0, y: 0, width: 600, height: 300 }) };
  nav = new WidgetChartNav(host, actions, EN_TRANSLATOR);
});

afterEach(() => {
  nav.destroy();
  host.remove();
  vi.useRealTimers();
});

const el = () => host.querySelector<HTMLElement>('.tcw-nav')!;
const button = (action: string) => el().querySelector<HTMLButtonElement>(`[data-nav="${action}"]`)!;
/** jsdom has no PointerEvent: a mouse event with a pointer type. */
const pointer = (type: string, pointerType = 'mouse', bubbles = true) => {
  const e = new MouseEvent(type, { bubbles, button: 0 });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  return e;
};
const press = (b: HTMLElement) => b.dispatchEvent(pointer('pointerdown'));
const release = (b: HTMLElement) => b.dispatchEvent(pointer('pointerup'));

describe('WidgetChartNav', () => {
  it('shows over the chart while the pointer is on it, centred on the plot’s bottom', () => {
    expect(el().classList.contains('tcw-nav-shown')).toBe(false);
    host.dispatchEvent(pointer('pointermove'));
    expect(el().classList.contains('tcw-nav-shown')).toBe(true);
    expect(el().style.left).toBe('300px');
    expect(el().style.top).toBe('300px');
    host.dispatchEvent(pointer('pointerleave', 'mouse', false));
    expect(el().classList.contains('tcw-nav-shown')).toBe(false);
  });

  it('stays hidden for a touch', () => {
    host.dispatchEvent(pointer('pointermove', 'touch'));
    expect(el().classList.contains('tcw-nav-shown')).toBe(false);
  });

  it('zooms, resets, and labels its buttons', () => {
    button('zoomIn').click();
    button('zoomOut').click();
    button('reset').click();
    expect(actions.zoomIn).toHaveBeenCalledTimes(1);
    expect(actions.zoomOut).toHaveBeenCalledTimes(1);
    expect(actions.reset).toHaveBeenCalledTimes(1);
    expect(button('zoomIn').getAttribute('aria-label')).toBe('Zoom in');
    expect(button('scrollLeft').getAttribute('aria-label')).toBe('Scroll left');
  });

  it('scrolls on a press, and keeps scrolling while held', () => {
    press(button('scrollRight'));
    expect(actions.scroll).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(300 + 4 * 80);
    const held = (actions.scroll as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(held).toBeGreaterThan(3);
    release(button('scrollRight'));
    vi.advanceTimersByTime(1000);
    expect((actions.scroll as ReturnType<typeof vi.fn>).mock.calls.length).toBe(held);
    press(button('scrollLeft'));
    expect(actions.scroll).toHaveBeenLastCalledWith(-1);
    release(button('scrollLeft'));
  });
});
