import { describe, it, expect } from 'vitest';
import { PaneResizeHandler } from '../PaneResizeHandler.js';
import type { ResolvedLayout } from '@tradecanvas/commons';

// Main chart 0..400, one bottom panel 400..520 with its divider at the top edge.
const bottomLayout: ResolvedLayout = {
  mainChartRect: { x: 0, y: 0, width: 800, height: 400 },
  panels: [
    {
      config: {
        id: 'rsi',
        position: 'bottom',
        size: 120,
        minSize: 40,
        content: { type: 'indicator', indicatorInstanceId: 'rsi' },
      },
      rect: { x: 0, y: 400, width: 800, height: 120 },
    },
  ],
  dividers: [{ panelId: 'rsi', rect: { x: 0, y: 398, width: 800, height: 4 }, orientation: 'horizontal' }],
};

// A left panel 0..200 with its divider at the right edge.
const leftLayout: ResolvedLayout = {
  mainChartRect: { x: 200, y: 0, width: 600, height: 520 },
  panels: [
    {
      config: { id: 'side', position: 'left', size: 200, minSize: 80, content: { type: 'custom' } },
      rect: { x: 0, y: 0, width: 200, height: 520 },
    },
  ],
  dividers: [{ panelId: 'side', rect: { x: 198, y: 0, width: 4, height: 520 }, orientation: 'vertical' }],
};

describe('PaneResizeHandler', () => {
  it('hit-tests the divider under the pointer', () => {
    const h = new PaneResizeHandler();
    expect(h.hitTest({ x: 400, y: 400 }, bottomLayout)?.panelId).toBe('rsi');
    expect(h.hitTest({ x: 400, y: 200 }, bottomLayout)).toBeNull();
  });

  it('grows a bottom panel when dragging the divider up, shrinks when down', () => {
    const h = new PaneResizeHandler();
    h.configure(() => bottomLayout, () => {});
    expect(h.tryBegin({ x: 400, y: 400 })).toBe(true);
    expect(h.computeSize({ x: 400, y: 370 })).toEqual({ panelId: 'rsi', size: 150 }); // up 30
    expect(h.computeSize({ x: 400, y: 420 })).toEqual({ panelId: 'rsi', size: 100 }); // down 20
  });

  it('move() reports the new size and end() clears the drag', () => {
    const calls: Array<[string, number]> = [];
    const h = new PaneResizeHandler();
    h.configure(() => bottomLayout, (id, size) => calls.push([id, size]));
    h.tryBegin({ x: 400, y: 400 });
    h.move({ x: 400, y: 380 });
    expect(calls).toEqual([['rsi', 140]]);
    expect(h.isActive()).toBe(true);
    h.end();
    expect(h.isActive()).toBe(false);
    expect(h.computeSize({ x: 400, y: 380 })).toBeNull();
  });

  it('does not begin when the pointer misses every divider', () => {
    const h = new PaneResizeHandler();
    h.configure(() => bottomLayout, () => {});
    expect(h.tryBegin({ x: 400, y: 200 })).toBe(false);
  });

  it('hovers ns-resize over a horizontal divider, null elsewhere', () => {
    const h = new PaneResizeHandler();
    h.configure(() => bottomLayout, () => {});
    expect(h.cursorAt({ x: 400, y: 400 })).toBe('ns-resize');
    expect(h.cursorAt({ x: 400, y: 200 })).toBeNull();
  });

  it('handles a vertical (left) divider — ew-resize, drag right grows', () => {
    const h = new PaneResizeHandler();
    h.configure(() => leftLayout, () => {});
    expect(h.cursorAt({ x: 200, y: 260 })).toBe('ew-resize');
    h.tryBegin({ x: 200, y: 260 });
    expect(h.computeSize({ x: 230, y: 260 })).toEqual({ panelId: 'side', size: 230 }); // right 30
  });
});
