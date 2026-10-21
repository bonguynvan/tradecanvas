// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Point, ViewportState } from '@tradecanvas/commons';
import { InteractionManager } from '../InteractionManager.js';
import { PanHandler } from '../PanHandler.js';
import { TOUCH_REACH } from '../pointerReach.js';
import type { TradingManager } from '../../trading/TradingManager.js';
import type { ZoomHandler } from '../ZoomHandler.js';
import type { AxisDragHandler } from '../AxisDragHandler.js';
import type { AlertDragHandler } from '../AlertDragHandler.js';
import type { PaneResizeHandler } from '../PaneResizeHandler.js';
import type { DrawingManager } from '../../drawings/DrawingManager.js';

let el: HTMLDivElement;
let im: InteractionManager;
let pan: ReturnType<typeof vi.fn>;
const vp = { chartRect: { x: 0, y: 0, width: 340, height: 260 } } as ViewportState;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  el = document.createElement('div');
  document.body.appendChild(el);
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
  pan = vi.fn();
  im = new InteractionManager(el);
  im.setPanHandler(new PanHandler(pan));
  im.setZoomHandler({ onWheel: vi.fn(), onPinch: vi.fn() } as unknown as ZoomHandler);
});

afterEach(() => {
  im.detach();
  el.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** A touch event with `points` down now (`changed`: the fingers it is about). */
function touch(type: string, points: [number, number][], changed: [number, number][] = points, target: Element = el): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  const list = (ps: [number, number][]) => ps.map(([clientX, clientY]) => ({ clientX, clientY }));
  Object.defineProperty(e, 'touches', { value: list(points) });
  Object.defineProperty(e, 'changedTouches', { value: list(changed) });
  target.dispatchEvent(e);
  return e;
}
/** The touch-action the chart set last (jsdom keeps no such property). */
function touchActionSet(): () => string | undefined {
  const set = vi.spyOn(el.style, 'setProperty');
  return () => set.mock.calls.filter(([name]) => name === 'touch-action').at(-1)?.[1] as string | undefined;
}
const down = (x: number, y = 100) => touch('touchstart', [[x, y]]);
const drag = (x: number, y = 100) => touch('touchmove', [[x, y]]);
const up = (x: number, y = 100) => touch('touchend', [], [[x, y]]);
const tap = (x: number, y = 100) => { down(x, y); up(x, y); };

/** A drawing manager that takes presses where `takes` says, and records what it was told. */
function drawings(takes: (pos: Point) => boolean = () => false, opts: { tool?: string; eraser?: boolean } = {}) {
  const calls: string[] = [];
  const dm = {
    onPointerDown: (pos: Point, _vp: ViewportState, reach?: { line: number; handle: number }) => {
      calls.push(`down ${pos.x} reach ${reach?.line ?? 'mouse'}`);
      return takes(pos);
    },
    onPointerMove: (pos: Point) => { calls.push(`move ${pos.x}`); return takes(pos); },
    onPointerUp: () => { calls.push('up'); return false; },
    placeAt: (pos: Point) => { calls.push(`place ${pos.x}`); return true; },
    isDragging: () => false,
    isEraser: () => opts.eraser ?? false,
    takeBackPoint: () => { calls.push('take back'); return true; },
    getActiveTool: () => opts.tool ?? null,
    hoverCursorAt: () => null,
    drawingAt: (pos: Point, _vp: ViewportState, tolerance?: number) => (Math.abs(pos.x - 120) <= (tolerance ?? 8) ? 'd1' : null),
    justFinished: () => false,
  } as unknown as DrawingManager;
  im.setDrawingManager(dm, () => vp);
  return calls;
}

describe('InteractionManager — taps', () => {
  it('a tap on the chart is a click; a drag is not', () => {
    const clicks: number[] = [];
    im.setClickHandler((pos) => clicks.push(pos.x));
    im.attach();
    tap(100);
    down(200); drag(150); up(150);
    expect(clicks).toEqual([100]);
  });

  it('a double tap on the price axis resets it, as a double-click does', () => {
    const axes: string[] = [];
    im.setAxisDragHandler(
      { begin() {}, move() {}, end() {}, isActive: () => false } as unknown as AxisDragHandler,
      () => vp,
      (axis) => axes.push(axis),
    );
    im.attach();
    tap(370, 100);
    vi.advanceTimersByTime(150);
    tap(372, 104);
    expect(axes).toEqual(['price']);
  });

  it('two taps far apart or slow are not a double tap', () => {
    const axes: string[] = [];
    im.setAxisDragHandler({ begin() {}, move() {}, end() {}, isActive: () => false } as unknown as AxisDragHandler, () => vp, (axis) => axes.push(axis));
    im.attach();
    tap(370, 40);
    vi.advanceTimersByTime(150);
    tap(370, 200);
    vi.advanceTimersByTime(600);
    tap(370, 200);
    expect(axes).toEqual([]);
  });

  it('a double tap on a drawing opens it, with a finger’s reach', () => {
    drawings();
    const opened: string[] = [];
    im.setDrawingDoubleClick((id) => opened.push(id));
    im.attach();
    // 14px off the line: beyond a mouse's reach, within a finger's.
    tap(134);
    tap(134);
    expect(opened).toEqual(['d1']);
  });

  it('a long press pins the tooltip and is no click', () => {
    const pinned: number[] = [];
    const clicks: number[] = [];
    im.setAltClickHandler((pos) => pinned.push(pos.x));
    im.setClickHandler((pos) => clicks.push(pos.x));
    im.attach();
    down(100);
    vi.advanceTimersByTime(600);
    up(100);
    expect(pinned).toEqual([100]);
    expect(clicks).toEqual([]);
  });
});

describe('InteractionManager — drawings by finger', () => {
  it('a long press on a drawing opens its menu, as a right-click does', () => {
    const calls = drawings((pos) => pos.x === 120);
    const menus: [string, number][] = [];
    const pinned: number[] = [];
    im.setDrawingContextMenu((id, pos) => menus.push([id, pos.x]));
    im.setAltClickHandler((pos) => pinned.push(pos.x));
    im.attach();
    down(120);
    vi.advanceTimersByTime(600);
    up(120);
    expect(menus).toEqual([['d1', 120]]);
    expect(pinned).toEqual([]);
    // The press that grabbed it is let go when the menu opens.
    expect(calls.filter((c) => c === 'up')).toHaveLength(1);
  });

  it('not once the drawing is being dragged', () => {
    drawings((pos) => pos.x >= 100);
    const menus: string[] = [];
    im.setDrawingContextMenu((id) => menus.push(id));
    im.attach();
    down(120); drag(140);
    vi.advanceTimersByTime(600);
    expect(menus).toEqual([]);
  });

  it('gives the press to the drawings with a finger’s reach, and the drag that follows', () => {
    const calls = drawings((pos) => pos.x >= 100);
    im.attach();
    down(120); drag(160); up(160);
    expect(calls).toEqual([`down 120 reach ${TOUCH_REACH.line}`, 'move 160', 'place 160', 'up']);
    expect(pan).not.toHaveBeenCalled();
  });

  it('a press off any drawing pans, as with the mouse', () => {
    const calls = drawings(() => false);
    im.attach();
    down(50); drag(20); up(20);
    expect(calls[0]).toBe(`down 50 reach ${TOUCH_REACH.line}`);
    expect(pan).toHaveBeenCalled();
  });

  it('a tap that places a point places nothing more on release', () => {
    const calls = drawings(() => true);
    im.attach();
    tap(120);
    expect(calls).toEqual([`down 120 reach ${TOUCH_REACH.line}`, 'up']);
  });

  it('the mouse keeps its own reach', () => {
    const calls = drawings();
    im.attach();
    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 100, button: 0, buttons: 1, bubbles: true }));
    expect(calls[0]).toBe('down 50 reach mouse');
  });

  it('a second finger ends a drawing drag before the pinch', () => {
    const calls = drawings(() => true);
    im.setZoomHandler({ onPinch: vi.fn(), onWheel: vi.fn() } as unknown as ZoomHandler);
    im.attach();
    down(120); drag(130);
    touch('touchstart', [[130, 100], [230, 100]]);
    expect(calls.at(-1)).toBe('up');
  });
});

describe('InteractionManager — lines by finger', () => {
  it('drags an alert line with a finger’s reach', () => {
    const begun: number[] = [];
    const moved: number[] = [];
    let active = false;
    im.setAlertDragHandler({
      tryBegin: (_pos: Point, reach?: number) => { begun.push(reach ?? 0); active = true; return true; },
      move: (pos: Point) => moved.push(pos.y),
      end: () => { active = false; },
      isActive: () => active,
      isOverAlert: () => false,
    } as unknown as AlertDragHandler);
    im.attach();
    down(100, 100); drag(100, 140); up(100, 140);
    expect(begun).toEqual([TOUCH_REACH.alert]);
    expect(moved).toEqual([140]);
    expect(active).toBe(false);
    expect(pan).not.toHaveBeenCalled();
  });

  it('grabs a pane divider with a finger’s reach', () => {
    const reach: number[] = [];
    im.setPaneResizeHandler({
      tryBegin: (_pos: Point, r?: number) => { reach.push(r ?? 0); return false; },
      isActive: () => false,
      end() {},
      cursorAt: () => null,
    } as unknown as PaneResizeHandler);
    im.attach();
    down(100);
    expect(reach).toEqual([TOUCH_REACH.divider]);
  });
});

describe('InteractionManager — a touch the browser takes back', () => {
  it('ends the gesture without a click or a coast', () => {
    const clicks: number[] = [];
    im.setClickHandler((pos) => clicks.push(pos.x));
    im.attach();
    down(200);
    touch('touchcancel', [], [[200, 100]]);
    up(200);
    expect(clicks).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(pan).not.toHaveBeenCalled();
  });
});

describe('InteractionManager — pageScroll', () => {
  it('leaves vertical swipes to the page and pans the chart sideways only', () => {
    const touchAction = touchActionSet();
    im.setPageScroll(true);
    im.attach();
    expect(touchAction()).toBe('pan-y');
    const start = down(200, 100);
    expect(start.defaultPrevented).toBe(false);
    // Mostly down: the page's.
    drag(203, 130); drag(205, 180); up(205, 180);
    expect(pan).not.toHaveBeenCalled();
    // Mostly sideways: the chart's, without moving the price scale.
    down(200, 100); drag(160, 104); drag(120, 110);
    expect(pan.mock.calls.length).toBeGreaterThan(0);
    expect(pan.mock.calls.every(([, dy]) => dy === 0)).toBe(true);
  });

  it('still takes a press on a drawing, so the page doesn’t scroll under it', () => {
    drawings((pos) => pos.x === 120);
    im.setPageScroll(true);
    im.attach();
    expect(down(120).defaultPrevented).toBe(true);
  });

  it('keeps the tap from turning into mouse events', () => {
    im.setPageScroll(true);
    im.attach();
    down(100);
    expect(up(100).defaultPrevented).toBe(true);
  });

  it('scrolls the page with the wheel; Ctrl + wheel (a trackpad pinch) zooms', () => {
    const onWheel = vi.fn();
    im.setZoomHandler({ onWheel, onPinch: vi.fn() } as unknown as ZoomHandler);
    im.setPageScroll(true);
    im.attach();
    const plain = new WheelEvent('wheel', { deltaY: 40, clientX: 100, clientY: 100, cancelable: true });
    el.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(false);
    expect(onWheel).not.toHaveBeenCalled();
    const pinch = new WheelEvent('wheel', { deltaY: 40, ctrlKey: true, clientX: 100, clientY: 100, cancelable: true });
    el.dispatchEvent(pinch);
    expect(pinch.defaultPrevented).toBe(true);
    expect(onWheel).toHaveBeenCalledTimes(1);
  });

  it('can be switched while attached', () => {
    const touchAction = touchActionSet();
    im.attach();
    expect(touchAction()).toBe('none');
    im.setPageScroll(true);
    expect(touchAction()).toBe('pan-y');
  });
});

describe('InteractionManager — a chart that neither pans nor zooms', () => {
  it('leaves page scrolling and zooming be', () => {
    const still = new InteractionManager(el);
    im.detach();
    const touchAction = touchActionSet();
    still.attach();
    expect(touchAction()).toBe('manipulation');
    const wheel = new WheelEvent('wheel', { deltaY: 40, cancelable: true });
    el.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    expect(down(100).defaultPrevented).toBe(false);
    still.detach();
  });
});

describe('InteractionManager — a press called off', () => {
  it('a second finger takes back the point its first finger just placed', () => {
    const calls = drawings(() => true, { tool: 'trendLine' });
    im.attach();
    down(120);
    touch('touchstart', [[120, 100], [220, 100]]);
    expect(calls).toContain('take back');
  });

  it('a trading drag the browser takes back is put back, not reported', () => {
    const seen: string[] = [];
    im.setTradingManager({
      onPointerDown: () => true,
      onPointerMove: () => true,
      onPointerUp: () => { seen.push('up'); return true; },
      cancelPointer: () => { seen.push('cancel'); return true; },
      isBracketActive: () => false,
      isOrderDraftActive: () => false,
      isOverButton: () => false,
      isOverDraggableLine: () => false,
    } as unknown as TradingManager, () => vp);
    im.attach();
    down(100); drag(100, 140);
    touch('touchcancel', [], [[100, 140]]);
    expect(seen).toEqual(['cancel']);
  });

  it('the eraser’s press opens no menu when held', () => {
    drawings(() => true, { eraser: true });
    const menus: string[] = [];
    im.setDrawingContextMenu((id) => menus.push(id));
    im.attach();
    down(120);
    vi.advanceTimersByTime(600);
    expect(menus).toEqual([]);
  });
});

describe('InteractionManager — touch details', () => {
  it('keeps the browser’s own menu shut after a long press', () => {
    im.attach();
    down(100);
    vi.advanceTimersByTime(600);
    const menu = new MouseEvent('contextmenu', { clientX: 100, clientY: 100, bubbles: true, cancelable: true });
    el.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
  });

  it('leaves touchend alone where touchstart was already the chart’s', () => {
    im.attach();
    down(100);
    expect(up(100).defaultPrevented).toBe(false);
  });

  it('the finger left after a pinch pans sideways only with pageScroll', () => {
    im.setPageScroll(true);
    im.attach();
    touch('touchstart', [[100, 100]]);
    touch('touchstart', [[100, 100], [200, 100]]);
    touch('touchend', [[100, 100]], [[200, 100]]);
    pan.mockClear();
    touch('touchmove', [[60, 160]]);
    expect(pan).toHaveBeenCalled();
    expect(pan.mock.calls.every(([, dy]) => dy === 0)).toBe(true);
  });

  it('a third finger lifting doesn’t make the pinch jump', () => {
    const onPinch = vi.fn();
    im.setZoomHandler({ onWheel: vi.fn(), onPinch } as unknown as ZoomHandler);
    im.attach();
    touch('touchstart', [[100, 100]]);
    touch('touchstart', [[100, 100], [200, 100]]);
    touch('touchmove', [[100, 100], [300, 100]]);
    // A third finger comes and goes; the two left are 100 apart again.
    touch('touchend', [[100, 100], [200, 100]], [[300, 100]]);
    onPinch.mockClear();
    touch('touchmove', [[100, 100], [200, 100]]);
    expect(onPinch.mock.calls[0]?.[0] ?? 1).toBeCloseTo(1);
  });
});
