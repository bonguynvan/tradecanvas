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

describe('the toolbar over a selected drawing', () => {
  it('has a grip to drag it out of the way', () => {
    bar.show(target(400, 300));
    const before = at();
    pointer(grip(), 'pointerdown', 10, 10);
    pointer(document, 'pointermove', 60, -40);
    pointer(document, 'pointerup', 60, -40);
    expect(at()).toEqual({ left: before.left + 50, top: before.top - 50 });
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
