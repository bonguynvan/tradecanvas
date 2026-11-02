import { describe, it, expect } from 'vitest';
import type { DrawingPlugin, DrawingState } from '@tradecanvas/commons';
import { DrawingManager } from '../DrawingManager.js';
import { registerBuiltInDrawingTools } from '../tools/index.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

const style = { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' as const, text: 'Two words' };

/** Every tool that writes in a box, at a point it can be drawn at. */
const BOXED: [string, DrawingState['anchors']][] = [
  ['text', [{ time: 10, price: 50 }]],
  ['note', [{ time: 10, price: 50 }]],
  ['callout', [{ time: 10, price: 50 }, { time: 20, price: 70 }]],
  ['signpost', [{ time: 10, price: 30 }]],
  ['balloon', [{ time: 10, price: 30 }]],
  ['anchoredText', [{ time: 0.3, price: 0.5 }]],
  ['anchoredNote', [{ time: 0.3, price: 0.5 }]],
];

describe('where a drawing’s text box is', () => {
  it('is told by each tool that writes in a box, as last drawn, where its words start', () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    for (const [type, anchors] of BOXED) {
      const plugin = manager.getPlugin(type) as DrawingPlugin;
      const state = drawing(type as never, anchors, { id: type, style });
      const rec = recordingCtx();
      plugin.render(rec.ctx, state, unitViewport, false);
      const box = plugin.textBox?.(state, unitViewport);
      expect(box, type).toBeTruthy();
      // The first line's first letter sits inside the box, at its padding.
      const first = rec.calls.find((c) => c.name === 'fillText' && c.args[0] === 'Two words')!;
      expect(Number(first.args[1]), type).toBeGreaterThan(box!.x);
      expect(Number(first.args[1]), type).toBeLessThan(box!.x + box!.width);
      expect(Number(first.args[2]), type).toBeGreaterThanOrEqual(box!.y);
    }
  });

  it('is none for a note whose text is hidden', () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    const state = drawing('note', [{ time: 10, price: 50 }], { id: 'n', style, options: { showText: false } });
    manager.getPlugin('note')!.render(recordingCtx().ctx, state, unitViewport, false);
    expect(manager.getPlugin('note')!.textBox?.(state, unitViewport)).toBeNull();
  });

  it('is found by id through the manager, on the drawing’s own pane', () => {
    const manager = new DrawingManager();
    registerBuiltInDrawingTools(manager);
    manager.setDrawings([drawing('text', [{ time: 10, price: 50 }], { id: 't', style })]);
    manager.render(recordingCtx().ctx, unitViewport);
    expect(manager.textBoxOf('t', unitViewport)).toMatchObject({ x: expect.any(Number), width: expect.any(Number) });
    expect(manager.textBoxOf('nope', unitViewport)).toBeNull();
  });
});
