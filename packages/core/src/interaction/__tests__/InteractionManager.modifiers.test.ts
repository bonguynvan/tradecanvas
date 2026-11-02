// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionManager } from '../InteractionManager.js';
import { PanHandler } from '../PanHandler.js';
import type { DrawingManager, DrawingModifiers } from '../../drawings/DrawingManager.js';
import type { Point, ViewportState } from '@tradecanvas/commons';

let el: HTMLDivElement;
let im: InteractionManager;
let calls: string[];
let mods: DrawingModifiers[];

const at = (type: string, x: number, init: MouseEventInit = {}) =>
  new MouseEvent(type, { clientX: x, clientY: 50, bubbles: true, ...init });

/** A drawing lies at x = 120; `tool` is picked when given. */
function drawings(tool: string | null = null): void {
  const onDrawing = (pos: Point) => Math.abs(pos.x - 120) <= 8;
  const dm = {
    setModifiers: (m: DrawingModifiers) => mods.push({ ...m }),
    onPointerDown: (pos: Point) => { calls.push(`down ${pos.x}`); return tool !== null || onDrawing(pos); },
    onPointerMove: () => false,
    onPointerUp: () => false,
    onKeyDown: () => false,
    beginCopyDrag: (pos: Point) => { calls.push(`copy ${pos.x}`); return onDrawing(pos); },
    hoverCursorAt: (pos: Point) => (tool === null && onDrawing(pos) ? 'pointer' : null),
    getActiveTool: () => tool,
    isDragging: () => false,
    isEraser: () => false,
    drawingAt: () => null,
    justFinished: () => false,
  } as unknown as DrawingManager;
  const vp = { chartRect: { x: 0, y: 0, width: 400, height: 300 } } as ViewportState;
  im.setDrawingManager(dm, () => vp);
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  el = document.createElement('div');
  document.body.appendChild(el);
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) });
  calls = [];
  mods = [];
  im = new InteractionManager(el);
  im.setPanHandler(new PanHandler(() => {}));
  im.setMeasureHandlers({ begin: () => calls.push('measure'), move: () => {}, end: () => {} });
  im.setBoxSelectHandlers({ begin: () => calls.push('box'), move: () => {}, end: () => {}, cancel: () => {} });
  im.attach();
});

afterEach(() => {
  im.detach();
  el.remove();
  vi.unstubAllGlobals();
});

describe('InteractionManager — Shift and Ctrl/⌘ for the drawings', () => {
  it('tells the drawings which keys are held on a press and on each move', () => {
    drawings();
    el.dispatchEvent(at('mousedown', 300, { button: 0, buttons: 1, metaKey: true }));
    document.dispatchEvent(at('mousemove', 290, { buttons: 1, shiftKey: true }));
    expect(mods[0]).toEqual({ ctrl: true, shift: false });
    expect(mods[mods.length - 1]).toEqual({ ctrl: false, shift: true });
  });

  it('hears Shift let go without a move, and forgets the keys when the window loses focus', () => {
    drawings();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    expect(mods).toEqual([{ ctrl: false, shift: true }, { ctrl: false, shift: false }]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
    window.dispatchEvent(new Event('blur'));
    expect(mods[mods.length - 1]).toEqual({ ctrl: false, shift: false });
  });

  it('measures with Shift on empty chart only', () => {
    drawings();
    el.dispatchEvent(at('mousedown', 300, { button: 0, buttons: 1, shiftKey: true }));
    document.dispatchEvent(at('mouseup', 300, { button: 0 }));
    el.dispatchEvent(at('mousedown', 120, { button: 0, buttons: 1, shiftKey: true }));
    expect(calls).toEqual(['measure', 'down 120']);
  });

  it('gives a Shift-press to the tool while it places points', () => {
    drawings('trendLine');
    el.dispatchEvent(at('mousedown', 300, { button: 0, buttons: 1, shiftKey: true }));
    expect(calls).toEqual(['down 300']);
  });

  it('copies with Ctrl/⌘ on a drawing, and draws a selection box off one', () => {
    drawings();
    el.dispatchEvent(at('mousedown', 120, { button: 0, buttons: 1, ctrlKey: true }));
    document.dispatchEvent(at('mouseup', 120, { button: 0 }));
    el.dispatchEvent(at('mousedown', 300, { button: 0, buttons: 1, ctrlKey: true }));
    expect(calls).toEqual(['copy 120', 'copy 300', 'box']);
  });
});
