// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { isKeyTarget, registerKeyRoot } from '../keyTarget.js';

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.innerHTML = '';
});

const box = () => document.body.appendChild(document.createElement('div'));
const press = (el: Element) => el.dispatchEvent(new Event('pointerdown', { bubbles: true }));

describe('keyTarget', () => {
  it('a press elsewhere on the page leaves the keys to the page; one in the widget’s own layer keeps them', () => {
    const root = box();
    const layer = box();
    const page = box();
    stops.push(registerKeyRoot(root, [layer]));
    press(root);
    expect(isKeyTarget(root, true)).toBe(true);
    press(page);
    expect(isKeyTarget(root, true)).toBe(false);
    press(layer);
    expect(isKeyTarget(root, true)).toBe(true);
  });

  it('a press in one widget sends the keys to it, not to the other', () => {
    const a = box();
    const b = box();
    stops.push(registerKeyRoot(a), registerKeyRoot(b));
    press(a);
    expect([isKeyTarget(a, true), isKeyTarget(b, true)]).toEqual([true, false]);
    press(b);
    expect([isKeyTarget(a, true), isKeyTarget(b, true)]).toEqual([false, true]);
  });
});
