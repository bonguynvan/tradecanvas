import { describe, it, expect, afterEach } from 'vitest';
import { CalloutTool } from '../tools/annotations.js';
import { labelInk, setDrawingLook, setDrawingPlot } from '../drawingLook.js';
import { tailedBox, textLook } from '../tools/textBox.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

const style = { color: '#4c8dff', lineWidth: 1, lineStyle: 'solid' as const };
const bubble = { box: true, border: true, width: 240, fill: true, solid: true };

/** The alpha of an `rgba(…)` colour. */
const alphaOf = (color: string | undefined) => Number(/,\s*([\d.]+)\)$/.exec(color ?? '')?.[1] ?? 1);

afterEach(() => {
  setDrawingPlot(null);
  setDrawingLook(null);
});

describe('a bubble of text (a note, a callout, a signpost, a balloon)', () => {
  it('is filled with its colour, strong enough that the bars under it do not show through its words', () => {
    const look = textLook(style, bubble);
    expect(alphaOf(look.fill)).toBeGreaterThanOrEqual(0.85);
    // Its words in the ink that reads on that colour, not in the colour itself.
    expect(look.color).toBe(labelInk(style.color));
  });

  it('keeps a text colour and a fill set by hand', () => {
    expect(textLook({ ...style, textColor: '#ff0000' }, bubble).color).toBe('#ff0000');
    const own = textLook({ ...style, fillColor: 'rgba(10, 200, 30, 0.3)' }, bubble);
    expect(own.fill).toBe('rgba(10, 200, 30, 0.3)');
    // On a fill of its own the words stay in the drawing's colour, as they were.
    expect(own.color).not.toBe(labelInk(style.color));
  });

  it('writes in its colour once its background is turned off', () => {
    const look = textLook({ ...style, textBackground: false }, bubble);
    expect(look.fill).toBeUndefined();
    expect(look.color).not.toBe(labelInk(style.color));
  });

  it('leaves a plain text as it was: no fill, its own colour', () => {
    const look = textLook(style, { box: false, border: false, width: Infinity });
    expect(look.fill).toBeUndefined();
  });
});

/** The points a traced outline goes through with straight lines. */
function corners(tip: { x: number; y: number }): { x: number; y: number }[] {
  const { ctx, calls } = recordingCtx();
  tailedBox(tip, 8)(ctx, 100, 100, 200, 40, 6);
  return calls.filter((c) => c.name === 'lineTo').map((c) => ({ x: c.args[0] as number, y: c.args[1] as number }));
}

describe('a bubble’s tail', () => {
  it('leaves the side facing its point, 16 px wide, and ends on the point', () => {
    const under = corners({ x: 180, y: 220 });
    expect(under).toEqual([{ x: 188, y: 140 }, { x: 180, y: 220 }, { x: 172, y: 140 }]);
    const left = corners({ x: 20, y: 125 });
    expect(left.map((p) => p.x)).toEqual([100, 20, 100]);
    expect(Math.abs(left[0].y - left[2].y)).toBe(16);
    const right = corners({ x: 400, y: 110 });
    expect(right.map((p) => p.x)).toEqual([300, 400, 300]);
    const over = corners({ x: 250, y: 0 });
    expect(over.map((p) => p.y)).toEqual([100, 0, 100]);
  });

  it('keeps its foot off the round corners when its point is far to one side', () => {
    const far = corners({ x: 900, y: 400 });
    // The right-hand foot stops short of the corner: 300 − 6.
    expect(Math.max(far[0].x, far[2].x)).toBeLessThanOrEqual(294);
    expect(far[1]).toEqual({ x: 900, y: 400 });
  });

  it('is not drawn while its point is inside the bubble', () => {
    expect(corners({ x: 150, y: 120 })).toEqual([]);
  });
});

describe('a callout', () => {
  const callout = drawing('callout', [{ time: 10, price: 20 }, { time: 40, price: 80 }], { style: { ...style, text: 'Breakout' } });

  it('draws its pointer as a tail of its bubble, not as a line', () => {
    const { ctx, calls } = recordingCtx();
    new CalloutTool().render(ctx, callout, unitViewport, false);
    // One outline through the target, filled once: no stroke from the box to the point on its own.
    const target = { x: 105, y: 80 };
    expect(calls.some((c) => c.name === 'lineTo' && c.args[0] === target.x && c.args[1] === target.y)).toBe(true);
    expect(calls.filter((c) => c.name === 'moveTo')).toHaveLength(1);
  });

  it('is picked by its bubble and by its tail', () => {
    const tool = new CalloutTool();
    const { ctx } = recordingCtx();
    tool.render(ctx, callout, unitViewport, false);
    const box = tool.textBox(callout)!;
    expect(tool.hitTest({ x: box.x + 5, y: box.y + 5 }, callout, unitViewport, 4)).toBe(true);
    // Halfway along the tail, which leaves the side facing the point (the left).
    const foot = { x: box.x, y: box.y + box.height / 2 };
    const mid = { x: (foot.x + 105) / 2, y: (foot.y + 80) / 2 };
    expect(tool.hitTest(mid, callout, unitViewport, 4)).toBe(true);
    expect(tool.hitTest({ x: 700, y: 50 }, callout, unitViewport, 4)).toBe(false);
  });

  it('is picked on its tail where the tail is drawn, with its point far along the bubble’s side', () => {
    const tool = new CalloutTool();
    // A tall plot, the bubble at its top, its point far below and under the bubble's right end: the tail's foot is there, not mid-side.
    const tall = { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 400 } };
    const state = drawing('callout', [{ time: 30, price: 5 }, { time: 10, price: 95 }], { style: { ...style, text: 'A long line of words in the bubble, wide enough to matter' } });
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, state, tall, false);
    const box = tool.textBox(state)!;
    const lines = calls.filter((c) => c.name === 'lineTo').map((c) => ({ x: Number(c.args[0]), y: Number(c.args[1]) }));
    expect(lines).toHaveLength(3);
    const [first, tip, second] = lines;
    expect(Math.abs(first.y - (box.y + box.height))).toBeLessThan(1.5);
    const foot = { x: (first.x + second.x) / 2, y: first.y };
    // Well off the middle of the side.
    expect(foot.x - (box.x + box.width / 2)).toBeGreaterThan(50);
    expect(tool.hitTest({ x: (foot.x + tip.x) / 2, y: (foot.y + tip.y) / 2 }, state, tall, 3)).toBe(true);
    // Under the middle of the side, where the tail is not.
    expect(tool.hitTest({ x: box.x + box.width / 2, y: (foot.y + tip.y) / 2 }, state, tall, 3)).toBe(false);
  });
});
