// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';
import { PanHandler } from '../PanHandler.js';
import type { CrosshairHandler } from '../CrosshairHandler.js';
import type { TradingManager } from '../../trading/TradingManager.js';
import type { ViewportState } from '@tradecanvas/commons';

let el: HTMLDivElement;
let im: InteractionManager;
let pan: ReturnType<typeof vi.fn>;

const at = (type: string, x: number, init: MouseEventInit = {}) =>
  new MouseEvent(type, { clientX: x, clientY: 50, bubbles: true, ...init });

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  el = document.createElement('div');
  document.body.appendChild(el);
  // jsdom has no layout: give the chart a 400×300 box at the origin.
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
  pan = vi.fn();
  im = new InteractionManager(el);
  im.setPanHandler(new PanHandler(pan));
  im.attach();
});

afterEach(() => {
  im.detach();
  el.remove();
  vi.unstubAllGlobals();
});

describe('InteractionManager — dragging', () => {
  it('keeps panning when the pointer leaves the chart mid-drag', () => {
    el.dispatchEvent(at('mousedown', 200, { button: 0, buttons: 1 }));
    el.dispatchEvent(at('mousemove', 150, { buttons: 1 }));
    el.dispatchEvent(at('mouseleave', -5, { buttons: 1 }));
    // Outside the chart, the move reaches only the document.
    document.dispatchEvent(at('mousemove', -60, { buttons: 1 }));
    expect(pan.mock.calls.map((c) => c[0])).toEqual([50, 210]);
  });

  it('handles each in-chart move once during a drag', () => {
    el.dispatchEvent(at('mousedown', 200, { button: 0, buttons: 1 }));
    el.dispatchEvent(at('mousemove', 190, { buttons: 1 })); // bubbles to document too
    expect(pan).toHaveBeenCalledTimes(1);
  });

  it('stops following the pointer after release, even released outside', () => {
    el.dispatchEvent(at('mousedown', 200, { button: 0, buttons: 1 }));
    document.dispatchEvent(at('mousemove', 100, { buttons: 1 }));
    document.dispatchEvent(at('mouseup', 100, { button: 0 }));
    document.dispatchEvent(at('mousemove', 50, { buttons: 0 }));
    el.dispatchEvent(at('mousemove', 20, { buttons: 0 }));
    expect(pan).toHaveBeenCalledTimes(1);
  });

  it('ends the drag when the button was released outside the window', () => {
    el.dispatchEvent(at('mousedown', 200, { button: 0, buttons: 1 }));
    // No mouseup ever arrives; the next move reports no buttons held.
    document.dispatchEvent(at('mousemove', 120, { buttons: 0 }));
    el.dispatchEvent(at('mousemove', 100, { buttons: 0 }));
    expect(pan).not.toHaveBeenCalled();
  });

  it('a right-button press does not pan', () => {
    el.dispatchEvent(at('mousedown', 200, { button: 2, buttons: 2 }));
    el.dispatchEvent(at('mousemove', 150, { buttons: 2 }));
    expect(pan).not.toHaveBeenCalled();
  });
});

describe('InteractionManager — cursors', () => {
  const crosshair = (mode: string) => ({ getMode: () => mode, onPointerMove() {}, onPointerLeave() {} }) as unknown as CrosshairHandler;

  it('shows a crosshair over the chart and a grabbing hand while panning', () => {
    im.setCrosshairHandler(crosshair('normal'));
    el.dispatchEvent(at('mousemove', 100));
    expect(el.style.cursor).toBe('crosshair');
    el.dispatchEvent(at('mousedown', 100, { button: 0, buttons: 1 }));
    expect(el.style.cursor).toBe('grabbing');
    document.dispatchEvent(at('mousemove', 80, { buttons: 1 }));
    expect(el.style.cursor).toBe('grabbing');
    document.dispatchEvent(at('mouseup', 80, { button: 0 }));
    expect(el.style.cursor).toBe('crosshair');
  });

  it('keeps the default cursor when the crosshair is hidden', () => {
    im.setCrosshairHandler(crosshair('hidden'));
    el.dispatchEvent(at('mousemove', 100));
    expect(el.style.cursor).toBe('');
  });
});

describe('InteractionManager — price-based drags outside the chart', () => {
  it('pins a trading-line drag to the plot edge instead of an off-scale price', () => {
    const seen: { x: number; y: number }[] = [];
    const trading = {
      onPointerDown: () => true,
      onPointerMove: (pos: { x: number; y: number }) => { seen.push(pos); return true; },
      onPointerUp: () => true,
      isOverDraggableLine: () => false,
      isBracketActive: () => false,
      isOrderDraftActive: () => false,
    } as unknown as TradingManager;
    const vp = { chartRect: { x: 0, y: 0, width: 400, height: 300 } } as ViewportState;
    im.setTradingManager(trading, () => vp);
    el.dispatchEvent(at('mousedown', 200, { button: 0, buttons: 1 }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 900, bubbles: true, buttons: 1 }));
    expect(seen.at(-1)).toEqual({ x: 200, y: 300 });
  });
});

describe('InteractionManager — Ctrl-drag selection box', () => {
  function withBoxSelect() {
    const calls: string[] = [];
    im.setBoxSelectHandlers({
      begin: () => calls.push('begin'),
      move: () => calls.push('move'),
      end: () => calls.push('end'),
      cancel: () => calls.push('cancel'),
    });
    return calls;
  }

  it('draws a selection box instead of panning, and applies it on release', () => {
    const calls = withBoxSelect();
    el.dispatchEvent(at('mousedown', 100, { button: 0, buttons: 1, ctrlKey: true }));
    document.dispatchEvent(at('mousemove', 180, { buttons: 1, ctrlKey: true }));
    document.dispatchEvent(at('mouseup', 180, { button: 0 }));
    expect(calls).toEqual(['begin', 'move', 'end']);
    expect(pan).not.toHaveBeenCalled();
  });

  it('works with ⌘ on macOS too', () => {
    const calls = withBoxSelect();
    el.dispatchEvent(at('mousedown', 100, { button: 0, buttons: 1, metaKey: true }));
    expect(calls).toEqual(['begin']);
  });

  it('Escape drops the box', () => {
    const calls = withBoxSelect();
    el.dispatchEvent(at('mousedown', 100, { button: 0, buttons: 1, ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(at('mouseup', 150, { button: 0 }));
    expect(calls).toEqual(['begin', 'cancel']);
  });
});
