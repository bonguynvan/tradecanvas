// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WidgetSelectionToolbar, type SelectionToolbarTarget } from '../WidgetSelectionToolbar.js';
import { EN_TRANSLATOR } from '../i18n.js';

let host: HTMLDivElement;
let bar: WidgetSelectionToolbar;

const target = (x: number, y: number): SelectionToolbarTarget => ({
  rect: { x, y, width: 100, height: 40 },
  bounds: { x: 0, y: 0, width: 1000, height: 600 },
  style: { color: '#2348c4', lineWidth: 1, lineStyle: 'solid' },
  locked: false,
  canDelete: true,
  canSettings: true,
  canAlert: false,
});

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  bar = new WidgetSelectionToolbar(host, {
    onStyle: () => {}, onSettings: () => {}, onAlert: () => {}, onLock: () => {}, onMore: () => {}, onDelete: () => {},
  }, EN_TRANSLATOR);
});

afterEach(() => {
  bar.destroy();
  host.remove();
});

const el = () => host.querySelector<HTMLElement>('.tcw-sel-toolbar')!;
const grip = () => host.querySelector<HTMLElement>('.tcw-sel-grip')!;
const pointer = (target: EventTarget, type: string, x: number, y: number, pointerId = 1) => {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, 'pointerId', { value: pointerId });
  return target.dispatchEvent(e);
};
const at = () => ({ left: parseFloat(el().style.left), top: parseFloat(el().style.top) });

describe('where the toolbar of a selected drawing waits', () => {
  /** jsdom lays nothing out: the toolbar's own size, as a browser would give it. */
  const sized = (w: number, h: number) => {
    Object.defineProperty(el(), 'offsetWidth', { value: w, configurable: true });
    Object.defineProperty(el(), 'offsetHeight', { value: h, configurable: true });
  };

  it('is one place, wherever the drawing is: it never sits on what was just drawn', () => {
    sized(300, 36);
    bar.show(target(400, 300));
    const first = at();
    // Centred, a little under the pane's top.
    expect(first).toEqual({ left: 350, top: 32 });
    bar.show(target(20, 500));
    expect(at()).toEqual(first);
    bar.show(target(900, 10));
    expect(at()).toEqual(first);
  });

  it('keeps to the bounds it is given, wherever on the page they are', () => {
    sized(300, 36);
    bar.show({ ...target(400, 300), bounds: { x: 60, y: 400, width: 800, height: 150 } });
    expect(at()).toEqual({ left: 60 + 250, top: 400 + 32 });
    // A pane too low for it under the top keeps it inside all the same.
    bar.show({ ...target(400, 300), bounds: { x: 60, y: 400, width: 800, height: 50 } });
    expect(at().top).toBe(400 + 50 - 36 - 4);
  });

  it('waits at the foot of a pane too narrow to hold it beside the legend', () => {
    sized(300, 36);
    bar.show({ ...target(100, 100), bounds: { x: 0, y: 0, width: 390, height: 600 } });
    expect(at()).toEqual({ left: 45, top: 600 - 36 - 4 });
  });

  it('goes back there, not onto the drawing, when the grip is double-clicked', () => {
    sized(300, 36);
    bar.show(target(400, 300));
    const home = at();
    pointer(grip(), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 200, 200);
    pointer(document, 'pointerup', 200, 200);
    expect(at()).not.toEqual(home);
    grip().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(at()).toEqual(home);
  });
});

describe('the toolbar over a selected drawing', () => {
  it('has a grip to drag it out of the way', () => {
    bar.show(target(400, 300));
    const before = at();
    pointer(grip(), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 60, 60);
    pointer(document, 'pointerup', 60, 60);
    expect(at()).toEqual({ left: before.left + 50, top: before.top + 50 });
  });

  it('stays where it was dropped for the next drawing, until the grip is double-clicked', () => {
    bar.show(target(400, 300));
    pointer(grip(), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 60, 10);
    pointer(document, 'pointerup', 60, 10);
    const dropped = at();
    bar.show(target(100, 100));
    expect(at()).toEqual(dropped);
    grip().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(at()).not.toEqual(dropped);
  });

  it('ends a drag the system cancels, and follows only the pointer that took the grip', () => {
    bar.show(target(400, 300));
    const before = at();
    pointer(grip(), 'pointerdown', 10, 10, 7);
    pointer(document, 'pointermove', 30, 10, 8);
    expect(at()).toEqual(before);
    pointer(document, 'pointercancel', 30, 10, 7);
    pointer(document, 'pointermove', 90, 10, 7);
    expect(at()).toEqual(before);
  });

  it('keeps the grip out of the buttons the keys move through', () => {
    bar.show(target(400, 300));
    expect(grip().tagName).not.toBe('BUTTON');
    expect(grip().getAttribute('aria-hidden')).toBe('true');
  });
});
