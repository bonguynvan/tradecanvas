import { describe, it, expect, afterEach } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { HorizontalLineTool } from '../tools/HorizontalLine.js';
import { HorizontalRayTool } from '../tools/HorizontalRay.js';
import { RiskRewardTool } from '../tools/RiskReward.js';
import { setDrawingKeepOut } from '../tools/labels.js';
import { DrawingRenderer } from '../DrawingRenderer.js';
import { DrawingManager } from '../DrawingManager.js';
import { drawing, recordingCtx, textCtx, unitViewport, type DrawnText } from './fixtures.js';

// unitViewport: a plot 1000 × 100 at (0, 0); price p at y = 100 - p; bar N at x = N*10 + 5.
/** The OHLC rows: 300 px wide, 30 tall; the widget's indicator rows under them: 200 wide, 40 tall. */
const LEGEND = [{ x: 0, y: 0, width: 300, height: 30 }, { x: 0, y: 30, width: 200, height: 40 }];
/** A level label is 11 px tall (fillLevelLabel's size). */
const LABEL_SIZE = 11;

afterEach(() => setDrawingKeepOut([]));

/** The text's box, from its alignment and baseline as drawn. */
function box(t: DrawnText) {
  const top = t.baseline === 'bottom' ? t.y - LABEL_SIZE : t.baseline === 'top' ? t.y : t.y - LABEL_SIZE / 2;
  return { left: t.left, right: t.left + t.width, top, bottom: top + LABEL_SIZE };
}

function clearOfLegend(t: DrawnText): boolean {
  const b = box(t);
  return LEGEND.every((r) => b.right <= r.x || b.left >= r.x + r.width || b.bottom <= r.y || b.top >= r.y + r.height);
}

function lineLabel(price: number, viewport: ViewportState = unitViewport): DrawnText {
  const { ctx, drawn } = textCtx();
  new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price }]), viewport, false);
  return drawn[0];
}

describe('drawing labels keep clear of the legend', () => {
  it('leave a horizontal line’s label where it was with no legend', () => {
    const label = lineLabel(85);
    expect(label.align).toBe('left');
    expect(label.left).toBe(4);
  });

  it('move a horizontal line’s label to the plot’s right end when the legend covers its start', () => {
    setDrawingKeepOut(LEGEND);
    const label = lineLabel(85); // the line at y = 15, under the OHLC rows
    expect(clearOfLegend(label)).toBe(true);
    expect(label.left + label.width).toBeLessThanOrEqual(1000);
    expect(label.left).toBeGreaterThan(300);
    // Still on its line: just above it.
    expect(box(label).bottom).toBeLessThanOrEqual(15);
    expect(box(label).bottom).toBeGreaterThan(15 - 6);
  });

  it('put the label under the legend when the legend spans the plot, as on a phone', () => {
    setDrawingKeepOut([{ x: 0, y: 0, width: 1000, height: 30 }, LEGEND[1]]);
    const label = lineLabel(85);
    expect(clearOfLegend({ ...label })).toBe(true);
    expect(box(label).top).toBeGreaterThanOrEqual(30);
  });

  it('keep a label at the line’s start where it is clear of the legend', () => {
    setDrawingKeepOut(LEGEND);
    const label = lineLabel(10); // y = 90: the label above it starts at 76, under the rows' foot (70)
    expect(label.left).toBe(4);
  });

  it('move a horizontal ray’s label off the legend too', () => {
    setDrawingKeepOut(LEGEND);
    const { ctx, drawn } = textCtx();
    new HorizontalRayTool().render(ctx, drawing('horizontalRay', [{ time: 2, price: 50 }]), unitViewport, false);
    expect(clearOfLegend(drawn[0])).toBe(true);
  });

  it('move a long position’s target tag below the legend', () => {
    setDrawingKeepOut(LEGEND);
    // Entry 50, stop 40: the target at 70 (y = 30) has its tag above it, by the rows.
    const { ctx, calls } = recordingCtx();
    new RiskRewardTool().render(ctx, drawing('riskReward', [{ time: 1, price: 50 }, { time: 10, price: 40 }]), unitViewport, false);
    // drawPill: a roundRect (x, top, width, 18) per tag, in the order entry, target, stop.
    const pills = calls.filter((c) => c.name === 'roundRect').map((c) => c.args as number[]);
    expect(pills).toHaveLength(3);
    for (const [x, top, w, h] of pills) {
      const clear = LEGEND.every((r) => x + w <= r.x || x >= r.x + r.width || top + h <= r.y || top >= r.y + r.height);
      expect(clear, `tag at ${x},${top}`).toBe(true);
    }
    // Moved under the legend, they don't land on one another.
    const tops = pills.map(([, top]) => top).sort((a, b) => a - b);
    for (let i = 1; i < tops.length; i++) expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(18);
  });

  it('are set for each pass by the drawing renderer, from what it is given', () => {
    const manager = new DrawingManager();
    manager.register(new HorizontalLineTool());
    manager.addDrawing(drawing('horizontalLine', [{ time: 0, price: 85 }], { id: 'h' }));
    const renderer = new DrawingRenderer(manager);
    renderer.setKeepOut(() => LEGEND);
    const { ctx, drawn } = textCtx();
    renderer.render(ctx, unitViewport);
    expect(clearOfLegend(drawn[0])).toBe(true);
  });

  /** A plot 400 px tall, price p at y = 400 - p; `width` wide (a phone's is about 306). */
  const tall = (width: number): ViewportState => ({
    ...unitViewport,
    priceRange: { min: 0, max: 400 },
    chartRect: { x: 0, y: 0, width, height: 400 },
  });
  /** The legend and four indicator rows on a phone: 250 px wide, to y = 148. */
  const STACK = [{ x: 4, y: 0, width: 250, height: 148 }];
  /** The pills drawn, as (left, top, width, height), in the order entry, target, stop. */
  function positionPills(viewport: ViewportState, entry: number, stop: number, ctx = recordingCtx()): number[][] {
    new RiskRewardTool().render(ctx.ctx, drawing('riskReward', [{ time: 1, price: entry }, { time: 10, price: stop }]), viewport, false);
    return ctx.calls.filter((c) => c.name === 'roundRect').map((c) => c.args as number[]);
  }
  const centre = ([, top, , h]: number[]) => top + h / 2;
  const clearOf = (boxes: typeof STACK) => ([x, top, w, h]: number[]) =>
    boxes.every((r) => x + w <= r.x || x >= r.x + r.width || top + h <= r.y || top >= r.y + r.height);

  it('slide a long position’s tags right of the legend on their own rows where there is room', () => {
    setDrawingKeepOut(STACK);
    // Entry at y = 107, stop at y = 147, the target 40 px above the entry.
    const [entry, target, stop] = positionPills(tall(1000), 293, 253);
    for (const pill of [entry, target, stop]) expect(clearOf(STACK)(pill), `tag at ${pill}`).toBe(true);
    expect(target[0]).toBeGreaterThanOrEqual(254);
    // The target's tag stays above the entry line, the stop's below it.
    expect(centre(target)).toBeLessThan(107);
    expect(centre(stop)).toBeGreaterThan(107);
  });

  it('keep the tags in the order of their prices when they must go under the legend, as on a phone', () => {
    setDrawingKeepOut([{ x: 0, y: 0, width: 306, height: 148 }]);
    const [entry, target, stop] = positionPills(tall(306), 293, 253);
    // Top to bottom: Target, Long, Stop, as the zones read.
    expect(centre(target)).toBeLessThan(centre(entry));
    expect(centre(entry)).toBeLessThan(centre(stop));
  });

  it('keep two positions’ tags under the legend off each other', () => {
    setDrawingKeepOut([{ x: 0, y: 0, width: 306, height: 148 }]);
    const rec = recordingCtx();
    const tool = new RiskRewardTool();
    tool.render(rec.ctx, drawing('riskReward', [{ time: 1, price: 293 }, { time: 10, price: 253 }]), tall(306), false);
    tool.render(rec.ctx, drawing('riskReward', [{ time: 3, price: 300 }, { time: 12, price: 260 }]), tall(306), false);
    const pills = rec.calls.filter((c) => c.name === 'roundRect').map((c) => c.args as number[]);
    const moved = pills.filter(([, top]) => top >= 148);
    for (let i = 0; i < moved.length; i++) {
      for (let j = i + 1; j < moved.length; j++) {
        const [ax, at, aw, ah] = moved[i];
        const [bx, bt, bw, bh] = moved[j];
        const overlap = ax < bx + bw && bx < ax + aw && at < bt + bh && bt < at + ah;
        expect(overlap, `tags at ${moved[i]} and ${moved[j]}`).toBe(false);
      }
    }
  });

  it('draw a horizontal line’s label on its line at the right end rather than far below it', () => {
    setDrawingKeepOut([{ x: 0, y: 0, width: 254, height: 148 }]);
    const { ctx, drawn } = textCtx();
    // 300 px: the spots above and below the line's end touch the rows; on the line, by the axis, is clear.
    setDrawingKeepOut([{ x: 0, y: 0, width: 254, height: 148 }, { x: 0, y: 0, width: 300, height: 33 }]);
    new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price: 359 }]), tall(300), false); // y = 41
    const label = box(drawn[0]);
    expect(Math.abs(label.top - 41)).toBeLessThanOrEqual(2 * LABEL_SIZE);
    expect(label.right).toBeLessThanOrEqual(300);
  });

  it('never writes a horizontal line’s label over the legend’s rows, under them where they span the plot', () => {
    const rows = [{ x: 0, y: 0, width: 300, height: 47 }, { x: 0, y: 47, width: 254, height: 101 }];
    setDrawingKeepOut(rows);
    const { ctx, drawn } = textCtx();
    new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price: 388 }]), tall(300), false); // y = 12
    const label = box(drawn[0]);
    // Under the OHLC rows, beside the indicator rows: the nearest clear spot.
    expect(rows.every((r) => label.right <= r.x || label.left >= r.x + r.width || label.bottom <= r.y || label.top >= r.y + r.height)).toBe(true);
    expect(label.top).toBeGreaterThanOrEqual(47);
  });

  it('give two horizontal lines in the legend’s band labels of their own', () => {
    setDrawingKeepOut([{ x: 0, y: 0, width: 254, height: 148 }]);
    const { ctx, drawn } = textCtx();
    new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price: 388 }]), tall(306), false); // y = 12
    new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price: 378 }]), tall(306), false); // y = 22
    const [a, b] = drawn.map(box);
    expect(a.bottom <= b.top || b.bottom <= a.top || a.right <= b.left || b.right <= a.left, `${JSON.stringify(a)} ${JSON.stringify(b)}`).toBe(true);
  });

  it('keep a horizontal line’s label inside the plot’s top', () => {
    const { ctx, drawn } = textCtx();
    new HorizontalLineTool().render(ctx, drawing('horizontalLine', [{ time: 0, price: 395 }]), tall(1000), false); // y = 5
    expect(box(drawn[0]).top).toBeGreaterThanOrEqual(0);
  });
});
