// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { watchKeyboardInset } from '../keyboardInset.js';

afterEach(() => vi.unstubAllGlobals());

function viewport(height: number, offsetTop = 0) {
  const listeners = new Map<string, () => void>();
  const vv = {
    height, offsetTop, scale: 1,
    addEventListener: (type: string, cb: () => void) => listeners.set(type, cb),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  vi.stubGlobal('visualViewport', vv);
  return { vv, fire: (type = 'resize') => listeners.get(type)?.(), listeners };
}

describe('watchKeyboardInset', () => {
  it('lifts the sheets by the keyboard’s height, and back down when it goes', () => {
    vi.stubGlobal('innerHeight', 844);
    const { vv, fire, listeners } = viewport(844);
    const el = document.createElement('div');
    const stop = watchKeyboardInset([el]);
    expect(el.style.getPropertyValue('--tcw-keyboard-inset')).toBe('0px');
    vv.height = 508;
    fire();
    expect(el.style.getPropertyValue('--tcw-keyboard-inset')).toBe('336px');
    vv.height = 844;
    fire('scroll');
    expect(el.style.getPropertyValue('--tcw-keyboard-inset')).toBe('0px');
    stop();
    expect(listeners.size).toBe(0);
  });

  it('leaves the sheets at the bottom while the page is pinch-zoomed', () => {
    vi.stubGlobal('innerHeight', 844);
    const { vv, fire } = viewport(844);
    const el = document.createElement('div');
    watchKeyboardInset([el]);
    // Zoomed in 2x and panned down: the visual viewport is half the height, no keyboard in sight.
    vv.scale = 2;
    vv.height = 422;
    vv.offsetTop = 100;
    fire();
    expect(el.style.getPropertyValue('--tcw-keyboard-inset')).toBe('0px');
  });

  it('writes the inset only when it changes', () => {
    vi.stubGlobal('innerHeight', 844);
    const { fire } = viewport(844);
    const el = document.createElement('div');
    watchKeyboardInset([el]);
    const set = vi.spyOn(el.style, 'setProperty');
    fire('scroll');
    fire('scroll');
    expect(set).not.toHaveBeenCalled();
  });

  it('does nothing where there is no visual viewport', () => {
    vi.stubGlobal('visualViewport', undefined);
    const el = document.createElement('div');
    const stop = watchKeyboardInset([el]);
    expect(el.style.getPropertyValue('--tcw-keyboard-inset')).toBe('');
    stop();
  });
});
