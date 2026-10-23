// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { keepTabInside } from '../focusTrap.js';

let box: HTMLDivElement;

beforeEach(() => {
  // jsdom lays nothing out: every element gets a box, as it would on screen.
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  box = document.createElement('div');
  box.innerHTML = '<button id="a">a</button><input id="b"><div><button id="row" tabindex="-1">row</button><button id="star" tabindex="-1">star</button></div>';
  document.body.appendChild(box);
});

afterEach(() => {
  box.remove();
  vi.restoreAllMocks();
});

const tab = (shift = false) => {
  const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, cancelable: true });
  keepTabInside(e, box);
  return e.defaultPrevented;
};
const el = (id: string) => box.querySelector<HTMLElement>(`#${id}`)!;

describe('keeping Tab inside a dialog', () => {
  it('wraps from the last stop to the first, and back with Shift', () => {
    el('b').focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(el('a'));
    expect(tab(true)).toBe(true);
    expect(document.activeElement).toBe(el('b'));
  });

  it('wraps from a control after the last stop that Tab skips over (a row’s star)', () => {
    el('star').focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(el('a'));
  });

  it('lets Tab move on between the stops', () => {
    el('a').focus();
    expect(tab()).toBe(false);
  });

  it('brings focus back in from outside', () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    expect(tab()).toBe(true);
    expect(document.activeElement).toBe(el('a'));
    outside.remove();
  });
});
