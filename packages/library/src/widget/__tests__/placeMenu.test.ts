// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { placeMenu } from '../placeMenu.js';

function rect(top: number, height: number, left = 100, width = 120): DOMRect {
  return { top, bottom: top + height, left, right: left + width, width, height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('placeMenu', () => {
  it('opens above a button low in the window, overriding a stylesheet top', () => {
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    const anchor = document.createElement('button');
    anchor.getBoundingClientRect = () => rect(500, 30);
    const panel = document.createElement('div');
    Object.defineProperty(panel, 'scrollHeight', { value: 300 });
    document.body.append(anchor, panel);
    placeMenu(panel, anchor);
    expect(panel.style.top).toBe('auto');
    expect(panel.style.bottom).toBe(`${600 - 500 + 6}px`);
  });

  it('opens below with room there, its bottom left free', () => {
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    const anchor = document.createElement('button');
    anchor.getBoundingClientRect = () => rect(40, 30);
    const panel = document.createElement('div');
    Object.defineProperty(panel, 'scrollHeight', { value: 300 });
    document.body.append(anchor, panel);
    placeMenu(panel, anchor);
    expect(panel.style.top).toBe('76px');
    expect(panel.style.bottom).toBe('auto');
  });
});
