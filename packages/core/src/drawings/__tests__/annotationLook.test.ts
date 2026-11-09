import { describe, it, expect, afterEach } from 'vitest';
import type { DrawingState, ViewportState } from '@tradecanvas/commons';
import { TextAnnotationTool } from '../tools/TextAnnotation.js';
import { AnchoredTextTool, BalloonTool } from '../tools/markers.js';
import { ArrowMarkTool, CalloutTool, FlagTool, IconTool } from '../tools/annotations.js';
import { PriceLabelTool } from '../tools/PriceLabel.js';
import { drawingLook, labelInk, setDrawingLook, setDrawingPlot } from '../drawingLook.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

/** `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p; the plot is 1000 × 100. */
const x = (bar: number) => bar * 10 + 5;
const y = (price: number) => 100 - price;
/** A taller plot, 400 px: room for a balloon over its point. */
const tall: ViewportState = { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 400 } };

const style = { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' as const };

/** A context noting each call, the font and fill each text is drawn in, and every dash set. */
function noted() {
  const { ctx, calls, texts } = recordingCtx();
  const inked: { text: string; font: string; color: string; x: number }[] = [];
  const probe = new Proxy(ctx as unknown as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k === 'fillText') {
        return (text: string, tx: number, ty: number) => {
          inked.push({ text, font: String(t.font), color: String(t.fillStyle), x: tx });
          (t.fillText as (...a: unknown[]) => void)(text, tx, ty);
        };
      }
      return t[k];
    },
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx: probe, calls, texts, inked };
}

/** The dashes a render set that are not solid. */
const dashes = (calls: { name: string; args: unknown[] }[]) =>
  calls.filter((c) => c.name === 'setLineDash' && (c.args[0] as number[]).length > 0);
/** Rounded boxes laid out: [x, y, w, h, r]. */
const rounded = (calls: { name: string; args: unknown[] }[]) =>
  calls.filter((c) => c.name === 'roundRect').map((c) => c.args as number[]);

afterEach(() => {
  setDrawingPlot(null);
  setDrawingLook(null);
});

describe('one-point text tools, selected', () => {
  for (const [type, Tool, at] of [
    ['text', TextAnnotationTool, { time: 10, price: 50 }],
    ['anchoredText', AnchoredTextTool, { time: 0.3, price: 0.5 }],
  ] as const) {
    it(`a ${type} shows no handle ring on its letters, only a solid frame round its text`, () => {
      const tool = new Tool();
      const state = drawing(type, [at], { style: { ...style, text: 'Plan' } });
      const plain = recordingCtx();
      tool.render(plain.ctx, state, unitViewport, false);
      const box = tool.textBox(state)!;
      const { ctx, calls } = noted();
      tool.render(ctx, state, unitViewport, true);
      expect(calls.some((c) => c.name === 'arc')).toBe(false);
      expect(dashes(calls)).toHaveLength(0);
      // The frame: a rounded box just outside the text's box.
      const frames = rounded(calls);
      expect(frames).toHaveLength(1);
      const [fx, fy, fw, fh] = frames[0];
      expect(fx).toBeLessThan(box.x);
      expect(fy).toBeLessThan(box.y);
      expect(fx + fw).toBeGreaterThan(box.x + box.width);
      expect(fy + fh).toBeGreaterThan(box.y + box.height);
      // Nothing to grab at its point: a press there moves the whole text.
      const p = { x: box.x + 8, y: box.y + 6 };
      expect(tool.hitTestAnchor(p, state, unitViewport, 8)).toBe(-1);
      expect(tool.hitTest(p, state, unitViewport, 4)).toBe(true);
    });
  }

  it('a text stays where it was saved: its letters start at the same place selected or not', () => {
    const tool = new TextAnnotationTool();
    const state = drawing('text', [{ time: 10, price: 50 }], { style: { ...style, text: 'Plan' } });
    const a = noted();
    tool.render(a.ctx, state, unitViewport, false);
    const b = noted();
    tool.render(b.ctx, state, unitViewport, true);
    expect(b.inked[0].x).toBe(a.inked[0].x);
    expect(a.inked[0].x).toBe(x(10));
  });
});

describe('one-point marks, selected', () => {
  it('an icon shows no ring over its glyph, a frame round it instead', () => {
    const tool = new IconTool();
    const state = drawing('icon', [{ time: 10, price: 50 }], { options: { glyph: 'star', size: 20 } });
    const { ctx, calls } = noted();
    tool.render(ctx, state, unitViewport, true);
    expect(calls.some((c) => c.name === 'arc')).toBe(false);
    const [fx, fy, fw, fh] = rounded(calls)[0];
    expect(fx).toBeLessThan(x(10) - 10);
    expect(fy).toBeLessThan(y(50) - 10);
    expect(fx + fw).toBeGreaterThan(x(10) + 10);
    expect(fy + fh).toBeGreaterThan(y(50) + 10);
    expect(tool.hitTestAnchor({ x: x(10), y: y(50) }, state, unitViewport, 8)).toBe(-1);
  });

  it('an arrow mark shows no ring over its head, a frame round the arrow instead', () => {
    const tool = new ArrowMarkTool();
    const state = drawing('arrowMark', [{ time: 10, price: 50 }], { options: { direction: 'up', size: 20 } });
    const { ctx, calls } = noted();
    tool.render(ctx, state, unitViewport, true);
    expect(calls.some((c) => c.name === 'arc')).toBe(false);
    const [, fy, , fh] = rounded(calls)[0];
    // Round the arrow, its tip at the point and its tail 20 px under it.
    expect(fy).toBeLessThan(y(50));
    expect(fy + fh).toBeGreaterThan(y(50) + 20);
    expect(tool.hitTestAnchor({ x: x(10), y: y(50) }, state, unitViewport, 8)).toBe(-1);
  });

  it('a flag keeps its handle at the pole’s foot, under its cloth', () => {
    const tool = new FlagTool();
    const state = drawing('flag', [{ time: 10, price: 30 }]);
    expect(tool.hitTestAnchor({ x: x(10), y: y(30) }, state, unitViewport, 4)).toBe(0);
  });
});

describe('a callout by the plot’s edge', () => {
  const text = 'A rather long callout text';
  const width = text.length * 6;

  it('keeps its box on the plot, its leader running to where the box went', () => {
    setDrawingPlot(unitViewport.chartRect);
    const tool = new CalloutTool();
    const state = drawing('callout', [{ time: 80, price: 20 }, { time: 95, price: 80 }], { style: { ...style, text } });
    const { ctx, calls, inked } = noted();
    tool.render(ctx, state, unitViewport, true);
    expect(inked[0].x + width).toBeLessThanOrEqual(1000);
    const box = tool.textBox(state)!;
    expect(box.x + box.width).toBeLessThanOrEqual(1000);
    // The leader leaves the box's foot (the point is below it), where the box landed.
    const from = calls.find((c) => c.name === 'moveTo' && Math.abs(Number(c.args[0]) - (box.x + box.width / 2)) < 0.01);
    expect(from).toBeDefined();
    // Its handle sits on the box as drawn, so a drag from it does not jump.
    expect(tool.hitTestAnchor({ x: box.x, y: box.y }, state, unitViewport, 3)).toBe(1);
  });

  it('leaves with its bars when they scroll off, rather than sticking to the edge', () => {
    setDrawingPlot(unitViewport.chartRect);
    const tool = new CalloutTool();
    const state = drawing('callout', [{ time: -40, price: 20 }, { time: -30, price: 80 }], { style: { ...style, text } });
    tool.render(noted().ctx, state, unitViewport, false);
    expect(tool.textBox(state)!.x).toBe(x(-30));
  });
});

describe('a price label', () => {
  it('sets its words in the prose face at the label size, in ink that reads on its fill', () => {
    const { ctx, inked } = noted();
    const state = drawing('priceLabel', [{ time: 10, price: 50 }], { style: { ...style, color: '#f5d90a', text: 'Entry' } });
    new PriceLabelTool().render(ctx, state, unitViewport, false);
    const look = drawingLook();
    expect(inked[0].font).toContain(look.prose);
    expect(inked[0].font).toContain(`${look.sizes.label}px`);
    expect(inked[0].color).toBe(labelInk('#f5d90a'));
  });
});

describe('a balloon’s tail', () => {
  const render = (extra: Record<string, unknown> = {}) => {
    const { ctx, calls } = noted();
    const tool = new BalloonTool();
    const state: DrawingState = drawing('balloon', [{ time: 10, price: 50 }], { style: { ...style, text: 'Look here', ...extra } });
    tool.render(ctx, state, tall, false);
    return { calls, box: tool.textBox(state)! };
  };
  const tip = { x: x(10), y: tall.chartRect.height / 2 };

  it('is in proportion to its bubble, at least 8 px', () => {
    const { calls, box } = render();
    const at = calls.findIndex((c) => c.name === 'lineTo' && c.args[0] === tip.x && c.args[1] === tip.y);
    expect(at).toBeGreaterThan(0);
    const base = Number(calls[at - 1].args[1]);
    const height = tip.y - base;
    expect(height).toBeGreaterThanOrEqual(8);
    expect(height).toBeCloseTo(box.height * 0.4, 0);
    // Its base is on the bubble's foot.
    expect(Math.abs(base - (box.y + box.height))).toBeLessThanOrEqual(1);
  });

  it('is one shape with its bubble: filled and outlined once, no seam across its base', () => {
    const { calls } = render();
    expect(calls.filter((c) => c.name === 'fill')).toHaveLength(1);
    expect(calls.filter((c) => c.name === 'stroke')).toHaveLength(1);
    expect(calls.filter((c) => c.name === 'beginPath')).toHaveLength(1);
  });

  it('is still hit along its length', () => {
    const tool = new BalloonTool();
    const state = drawing('balloon', [{ time: 10, price: 50 }], { style: { ...style, text: 'Look here' } });
    tool.render(noted().ctx, state, tall, false);
    expect(tool.hitTest({ x: tip.x, y: tip.y - 4 }, state, tall, 1)).toBe(true);
  });
});

describe('what a one-point drawing covers, picked or not', () => {
  it('a text and an icon note their box even unselected, so a toolbar placed as they are picked keeps clear', async () => {
    const { beginExtent, endExtent } = await import('../drawingLook.js');
    const { TextAnnotationTool } = await import('../tools/TextAnnotation.js');
    const { IconTool } = await import('../tools/annotations.js');
    for (const [tool, type] of [[new TextAnnotationTool(), 'text'], [new IconTool(), 'icon']] as const) {
      const { ctx } = recordingCtx();
      beginExtent();
      tool.render(ctx, drawing(type, [{ time: 40, price: 50 }], { text: 'Breakout' }), unitViewport, false);
      const covered = endExtent();
      expect(covered, type).not.toBeNull();
      expect(covered!.width, type).toBeGreaterThan(8);
    }
  });
});
