// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';
import { PanHandler } from '../PanHandler.js';
import type { CrosshairHandler } from '../CrosshairHandler.js';
import type { ZoomHandler } from '../ZoomHandler.js';
import type { TradingManager } from '../../trading/TradingManager.js';
import type { DrawingManager } from '../../drawings/DrawingManager.js';
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

describe('InteractionManager — pointer position after the page moves', () => {
  const tracking = () => {
    const seen: { x: number; y: number }[] = [];
    im.setCrosshairHandler({ getMode: () => 'normal', onPointerMove: (p: { x: number; y: number }) => seen.push(p), onPointerLeave() {} } as unknown as CrosshairHandler);
    return seen;
  };
  const scrolledBy = (dy: number) => {
    el.getBoundingClientRect = () => ({ left: 0, top: -dy, right: 400, bottom: 300 - dy, width: 400, height: 300, x: 0, y: -dy, toJSON: () => ({}) });
  };

  it('maps the hover to the chart again after a scrolling ancestor scrolls', () => {
    const seen = tracking();
    const scroller = document.createElement('div');
    document.body.appendChild(scroller);
    el.dispatchEvent(at('mousemove', 100));
    scrolledBy(40);
    // `scroll` doesn't bubble: only a capture-phase listener sees it.
    scroller.dispatchEvent(new Event('scroll'));
    el.dispatchEvent(at('mousemove', 100));
    expect(seen.map((p) => p.y)).toEqual([50, 90]);
    scroller.remove();
  });

  it('re-reads the position when the pointer enters (layout may have shifted)', () => {
    const seen = tracking();
    el.dispatchEvent(at('mousemove', 100));
    scrolledBy(40);
    el.dispatchEvent(at('mouseenter', 100));
    el.dispatchEvent(at('mousemove', 100));
    expect(seen.map((p) => p.y)).toEqual([50, 90]);
  });

  it('removes the page-scroll listener on detach', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    im.detach();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), { capture: true });
    im.attach();
  });
});

describe('InteractionManager — what a pointer move repaints', () => {
  let dirty: (boolean | undefined)[];
  beforeEach(() => {
    dirty = [];
    im.setOverlayDirtyCallback((hoverOnly) => dirty.push(hoverOnly));
  });

  it('a plain hover repaints only pointer-tied visuals', () => {
    el.dispatchEvent(at('mousemove', 100));
    expect(dirty).toEqual([true]);
  });

  it('a pan repaints the scene', () => {
    el.dispatchEvent(at('mousedown', 200, { button: 0, buttons: 1 }));
    dirty.length = 0;
    document.dispatchEvent(at('mousemove', 150, { buttons: 1 }));
    expect(dirty).toEqual([false]);
  });

  it('a move the drawing tools consume (preview, drag) repaints the scene', () => {
    const drawings = {
      onPointerMove: () => true,
      hoverCursorAt: () => null,
    } as unknown as DrawingManager;
    const vp = { chartRect: { x: 0, y: 0, width: 400, height: 300 } } as ViewportState;
    im.setDrawingManager(drawings, () => vp);
    el.dispatchEvent(at('mousemove', 100));
    expect(dirty).toEqual([undefined]);
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

describe('InteractionManager — drawing shortcuts', () => {
  const withDrawings = () => {
    const keys: string[] = [];
    // Records keys; any other drawing call (hover, press) is a no-op.
    const fake = { onKeyDown: (key: string) => { keys.push(key); return true; } };
    const drawings = new Proxy(fake, {
      get: (target, prop) => (prop in target ? Reflect.get(target, prop) : () => null),
    });
    im.setDrawingManager(drawings as unknown as DrawingManager, () => ({}) as ViewportState);
    return keys;
  };
  const press = (key: string, target: EventTarget = document) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: key.length === 1, bubbles: true }));

  /** A second chart on the page. */
  const otherChart = () => {
    const other = document.createElement('div');
    other.tabIndex = 0;
    document.body.appendChild(other);
    const otherIm = new InteractionManager(other);
    otherIm.attach();
    return { other, done: () => { otherIm.detach(); other.remove(); } };
  };

  it('reach the chart pressed last, even after a button beside it took focus', () => {
    const keys = withDrawings();
    const { done } = otherChart();
    el.dispatchEvent(at('mousedown', 100, { button: 0 }));
    document.dispatchEvent(at('mouseup', 100, { button: 0 }));
    const toolbarButton = document.createElement('button');
    document.body.appendChild(toolbarButton);
    toolbarButton.focus();
    press('v', toolbarButton);
    press('Delete', toolbarButton);
    toolbarButton.remove();
    done();
    expect(keys).toEqual(['v', 'Delete']);
  });

  it('leave this chart alone once another chart is used, or while typing', () => {
    const keys = withDrawings();
    const { other, done } = otherChart();
    el.dispatchEvent(at('mousedown', 100, { button: 0 }));
    document.dispatchEvent(at('mouseup', 100, { button: 0 }));
    other.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
    press('v');
    other.focus();
    press('z', other);
    el.dispatchEvent(at('mousedown', 100, { button: 0 }));
    document.dispatchEvent(at('mouseup', 100, { button: 0 }));
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    press('Backspace', field);
    field.remove();
    done();
    expect(keys).toEqual([]);
  });

  it('still let Escape cancel a tool picked outside the chart', () => {
    const keys = withDrawings();
    press('Escape');
    expect(keys).toEqual(['Escape']);
  });
});

describe('InteractionManager — touch on HTML layered over the chart', () => {
  it('leaves the tap to the control, so its click still fires', () => {
    const control = document.createElement('button');
    el.appendChild(control);
    const start = new Event('touchstart', { bubbles: true, cancelable: true });
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    control.dispatchEvent(start);
    control.dispatchEvent(move);
    expect(start.defaultPrevented).toBe(false);
    expect(move.defaultPrevented).toBe(false);
  });

  /** A touch event carrying `points` as its current touches. */
  const touches = (type: string, points: [number, number][]) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'touches', { value: points.map(([clientX, clientY]) => ({ clientX, clientY })) });
    return e;
  };

  it('still pinches when the second finger lands on the control', () => {
    const control = document.createElement('button');
    el.appendChild(control);
    const zoom = vi.fn();
    im.setZoomHandler({ onPinch: zoom } as unknown as ZoomHandler);
    el.dispatchEvent(touches('touchstart', [[100, 50]]));
    const second = touches('touchstart', [[100, 50], [200, 50]]);
    control.dispatchEvent(second);
    control.dispatchEvent(touches('touchmove', [[80, 50], [220, 50]]));
    expect(second.defaultPrevented).toBe(true);
    expect(zoom).toHaveBeenCalledTimes(1);
  });
});

describe('InteractionManager — mouse over HTML layered over the chart', () => {
  it('leaves the crosshair where it was', () => {
    const moves: number[] = [];
    im.setCrosshairHandler({ getMode: () => 'normal', onPointerMove: (p: { x: number }) => moves.push(p.x), onPointerLeave() {} } as unknown as CrosshairHandler);
    const control = document.createElement('button');
    el.appendChild(control);
    el.dispatchEvent(at('mousemove', 100));
    control.dispatchEvent(at('mousemove', 20)); // also the mousemove a browser sends after a tap
    expect(moves).toEqual([100]);
  });
});

describe('InteractionManager — pinch', () => {
  const touches = (...xs: number[]) => xs.map((x) => ({ clientX: x, clientY: 100 }));
  const touch = (type: string, ...xs: number[]) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'touches', { value: touches(...xs) });
    el.dispatchEvent(e);
  };

  it('zooms by as much as the fingers spread', () => {
    const onWheel = vi.fn();
    const onPinch = vi.fn();
    im.setZoomHandler({ onWheel, onPinch } as unknown as ZoomHandler);
    touch('touchstart', 150, 250); // 100px apart
    for (let x = 0; x <= 50; x += 10) touch('touchmove', 150 - x, 250 + x); // to 200px apart
    const total = onPinch.mock.calls.reduce((product, [scale]) => product * scale, 1);
    expect(total).toBeCloseTo(2);
    expect(onWheel).not.toHaveBeenCalled();
  });
});

describe('InteractionManager — double-click on a drawing', () => {
  it('reports the drawing under the pointer', () => {
    const opened: string[] = [];
    im.setDrawingManager(
      { drawingAt: (pos: { x: number }) => (pos.x === 120 ? 'd1' : null), justFinished: () => false } as unknown as DrawingManager,
      () => ({ chartRect: { x: 0, y: 0, width: 400, height: 300 } }) as ViewportState,
    );
    im.setDrawingDoubleClick((id) => opened.push(id));
    el.dispatchEvent(at('dblclick', 120));
    el.dispatchEvent(at('dblclick', 300));
    expect(opened).toEqual(['d1']);
  });
});

describe('InteractionManager — right-click on a drawing', () => {
  it('opens the drawing’s menu instead of the browser’s', () => {
    const opened: [string, number][] = [];
    im.setDrawingManager(
      { drawingAt: (pos: { x: number }) => (pos.x === 120 ? 'd1' : null), getActiveTool: () => null } as unknown as DrawingManager,
      () => ({ chartRect: { x: 0, y: 0, width: 400, height: 300 } }) as ViewportState,
    );
    im.setDrawingContextMenu((id, pos) => opened.push([id, pos.x]));
    const onDrawing = at('contextmenu', 120, { cancelable: true });
    el.dispatchEvent(onDrawing);
    const elsewhere = at('contextmenu', 300, { cancelable: true });
    el.dispatchEvent(elsewhere);
    expect(opened).toEqual([['d1', 120]]);
    expect(onDrawing.defaultPrevented).toBe(true);
    expect(elsewhere.defaultPrevented).toBe(false);
  });
});

describe('InteractionManager — signal markers', () => {
  it('says when the pointer leaves a marker, and shows a hand only where a click does something', () => {
    const hovers: (string | null)[] = [];
    let clickable = false;
    im.setSignalMarkerHitTest((p) => (p.x > 100 && p.x < 120 ? 'm1' : null), (m) => hovers.push(m as string | null), () => clickable);
    el.dispatchEvent(at('mousemove', 110));
    expect(hovers).toEqual(['m1']);
    expect(el.style.cursor).not.toBe('pointer');
    el.dispatchEvent(at('mouseleave', 110));
    expect(hovers).toEqual(['m1', null]);
    clickable = true;
    el.dispatchEvent(at('mousemove', 110));
    expect(el.style.cursor).toBe('pointer');
    // A press leaves it too: its note shouldn't sit over a drag.
    el.dispatchEvent(at('mousedown', 110, { button: 0, buttons: 1 }));
    expect(hovers).toEqual(['m1', null, 'm1', null]);
  });
});

