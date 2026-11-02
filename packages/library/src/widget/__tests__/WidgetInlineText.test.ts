// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetInlineText, type InlineTextTarget } from '../WidgetInlineText.js';

let host: HTMLDivElement;
let editor: WidgetInlineText;
let calls: { input: string[]; commit: string[]; cancel: number };

const target = (over: Partial<InlineTextTarget> = {}): InlineTextTarget => ({
  rect: () => ({ x: 100, y: 50, width: 80, height: 30 }),
  text: 'Breakout',
  font: { size: 14, bold: true, italic: false, family: 'Inter' },
  color: '#f2a93b',
  label: 'Edit text',
  onInput: (t) => calls.input.push(t),
  onCommit: (t) => calls.commit.push(t),
  onCancel: () => { calls.cancel += 1; },
  ...over,
});
const area = () => host.querySelector<HTMLTextAreaElement>('textarea');
const key = (k: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  area()!.dispatchEvent(e);
  return e;
};

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div');
  document.body.appendChild(host);
  calls = { input: [], commit: [], cancel: 0 };
  editor = new WidgetInlineText(() => host);
});

afterEach(() => {
  editor.close();
  host.remove();
  vi.unstubAllGlobals();
});

describe('WidgetInlineText', () => {
  it('opens over the text, in its font and colour, its words selected to type over', () => {
    editor.open(target());
    const el = area()!;
    expect(el.value).toBe('Breakout');
    expect(document.activeElement).toBe(el);
    expect(el.selectionStart).toBe(0);
    expect(el.selectionEnd).toBe(8);
    expect(el.style.left).toBe('100px');
    expect(el.style.top).toBe('50px');
    expect(el.style.fontWeight).toBe('bold');
    expect(el.style.fontSize).toBe('14px');
    expect(el.getAttribute('aria-label')).toBe('Edit text');
  });

  it('shows the words on the chart as they are typed', () => {
    editor.open(target());
    area()!.value = 'Break';
    area()!.dispatchEvent(new Event('input'));
    expect(calls.input).toEqual(['Break']);
  });

  it('keeps the words on Enter, and starts a new line on Shift+Enter', () => {
    editor.open(target());
    expect(key('Enter', { shiftKey: true }).defaultPrevented).toBe(false);
    area()!.value = 'Two\nlines';
    key('Enter');
    expect(calls.commit).toEqual(['Two\nlines']);
    expect(area()).toBeNull();
  });

  it('puts the words back on Escape, and keeps the key from the chart', () => {
    editor.open(target());
    area()!.value = 'Oops';
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    key('Escape');
    document.removeEventListener('keydown', outside);
    expect(calls.cancel).toBe(1);
    expect(calls.commit).toEqual([]);
    expect(outside).not.toHaveBeenCalled();
  });

  it('keeps the words when it loses the focus (a click on the chart), once', () => {
    editor.open(target());
    area()!.value = 'Kept';
    area()!.dispatchEvent(new FocusEvent('blur'));
    key; // nothing left to press
    expect(calls.commit).toEqual(['Kept']);
    editor.close();
    expect(calls.commit).toEqual(['Kept']);
  });

  it('hands over to a new text: the one open keeps its words first', () => {
    editor.open(target());
    area()!.value = 'First';
    editor.open(target({ text: 'Second' }));
    expect(calls.commit).toEqual(['First']);
    expect(area()!.value).toBe('Second');
  });

  it('goes without a word when the drawing is gone', () => {
    editor.open(target({ rect: () => null }));
    expect(area()).toBeNull();
    expect(calls.cancel).toBe(0);
  });

  it('can be shut from outside without keeping or putting back anything', () => {
    editor.open(target());
    editor.close();
    expect(calls.commit).toEqual([]);
    expect(calls.cancel).toBe(0);
    expect(editor.isOpen()).toBe(false);
  });
});

describe('WidgetInlineText in real use', () => {
  it('leaves Enter and Escape to an IME picking a word', () => {
    editor.open(target());
    expect(key('Enter', { keyCode: 229 } as KeyboardEventInit).defaultPrevented).toBe(false);
    key('Escape', { isComposing: true });
    expect(calls.commit).toEqual([]);
    expect(calls.cancel).toBe(0);
    expect(area()).not.toBeNull();
  });

  it('keeps the words as a press lands anywhere else, before what is under it hears it', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    editor.open(target());
    now.mockReturnValue(2000);
    area()!.value = 'Kept first';
    const order: string[] = [];
    const other = document.createElement('div');
    host.appendChild(other);
    other.addEventListener('pointerdown', () => order.push(calls.commit.length ? 'press after commit' : 'press before commit'));
    other.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(order).toEqual(['press after commit']);
    expect(calls.commit).toEqual(['Kept first']);
  });

  it('hands the focus back to the chart after Enter or Escape', () => {
    const chart = document.createElement('div');
    chart.tabIndex = 0;
    host.appendChild(chart);
    editor.open(target({ returnFocus: () => chart }));
    key('Escape');
    expect(document.activeElement).toBe(chart);
  });

  it('keeps what was typed when the text goes out of sight', () => {
    let frame: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frame = cb; return 1; });
    let shown = true;
    editor.open(target({ rect: () => (shown ? { x: 1, y: 2, width: 50, height: 20 } : null) }));
    area()!.value = 'Typed';
    shown = false;
    frame!(0);
    expect(calls.commit).toEqual(['Typed']);
    expect(area()).toBeNull();
  });
});

describe('WidgetInlineText at the edges of real use', () => {
  it('lets the second press of a clumsy double-click by, the box staying open', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    editor.open(target());
    const chart = vi.fn();
    host.addEventListener('pointerdown', chart);
    now.mockReturnValue(1200);
    const press = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    host.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    expect(chart).not.toHaveBeenCalled();
    expect(area()).not.toBeNull();
    expect(calls.commit).toEqual([]);
  });

  it('stays inside the window by its right edge, and wraps a long line', () => {
    vi.stubGlobal('innerWidth', 390);
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(138);
    editor.open(target({ rect: () => ({ x: 350, y: 50, width: 60, height: 28 }) }));
    expect(parseFloat(area()!.style.left)).toBe(390 - 8 - 138);
    expect(area()!.style.maxWidth).toBe(`${390 - 16}px`);
    width.mockRestore();
  });

  it('keeps what was typed and closes once the text stays off the window', () => {
    let frame: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frame = cb; return 1; });
    let x = 100;
    editor.open(target({ rect: () => ({ x, y: 50, width: 60, height: 28 }) }));
    area()!.value = 'Off';
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    x = -5000;
    frame!(0);
    // A moment off the window (it is being resized): the box stays.
    expect(calls.commit).toEqual([]);
    now.mockReturnValue(1500);
    frame!(0);
    expect(calls.commit).toEqual(['Off']);
  });
});

describe('WidgetInlineText after typing', () => {
  it('keeps the words on a quick click away once something is typed', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    editor.open(target());
    area()!.value = 'Typed fast';
    area()!.dispatchEvent(new Event('input'));
    now.mockReturnValue(1100);
    host.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    expect(calls.commit).toEqual(['Typed fast']);
  });
});
