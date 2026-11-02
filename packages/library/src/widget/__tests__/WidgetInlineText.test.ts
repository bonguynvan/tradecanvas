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
    expect(el.closest('[role="dialog"]')?.getAttribute('aria-label')).toBe('Edit text');
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
