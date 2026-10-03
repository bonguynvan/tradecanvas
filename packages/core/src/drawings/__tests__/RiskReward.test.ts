import { describe, it, expect } from 'vitest';
import type { DrawingOptions } from '@tradecanvas/commons';
import { RiskRewardTool } from '../tools/RiskReward.js';
import { DrawingManager } from '../DrawingManager.js';
import { UndoRedoManager } from '../../features/UndoRedoManager.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

// unitViewport: bar N at x = N*10 + 5, price p at y = 100 - p.
const LONG = [{ time: 0, price: 50 }, { time: 10, price: 40 }]; // entry 50, stop 40
const SHORT = [{ time: 0, price: 50 }, { time: 10, price: 60 }];

const tool = new RiskRewardTool();
const texts = (anchors = LONG, options?: DrawingOptions) => {
  const { ctx, texts: out } = recordingCtx();
  tool.render(ctx, drawing('riskReward', anchors, { options }), unitViewport, false);
  return out;
};

describe('RiskRewardTool', () => {
  it('labels side, quantity and R:R, then target and stop, for a long', () => {
    // 1% of 1,000 = 10 at risk, 10 per unit → qty 1; target 2R above → 70.
    expect(texts()).toEqual([
      'Long · Qty 1.00 · R:R 2',
      'Target 70.00 (+40.00%) · 20.00',
      'Stop 40.00 (−20.00%) · 10.00',
    ]);
  });

  it('puts the target below the entry for a short', () => {
    expect(texts(SHORT)[0]).toBe('Short · Qty 1.00 · R:R 2');
    expect(texts(SHORT)[1]).toBe('Target 30.00 (−40.00%) · 20.00');
  });

  it('follows the R:R, the risk as a sum, and the quantity decimals', () => {
    expect(texts(LONG, { rewardRatio: 3 })[1]).toBe('Target 80.00 (+60.00%) · 30.00');
    const bySum = texts(LONG, { riskMode: 'amount', risk: 55, qtyDecimals: 1 });
    expect(bySum[0]).toBe('Long · Qty 5.5 · R:R 2');
    expect(bySum[1]).toBe('Target 70.00 (+40.00%) · 110.00');
  });

  it('keeps the tags apart when the stop is close to the entry', () => {
    const { ctx, calls } = recordingCtx();
    tool.render(ctx, drawing('riskReward', [LONG[0], { ...LONG[1], price: 49.5 }]), unitViewport, false);
    const tops = calls.filter((c) => c.name === 'roundRect' || c.name === 'rect').map((c) => c.args[1] as number).sort((a, b) => a - b);
    for (let i = 1; i < tops.length; i++) expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(18);
  });

  it('takes its tags with it when the position scrolls off the plot', () => {
    // unitViewport's plot is 1000 px wide: bars 200 and 210 sit far right of it.
    const away = [{ time: 200, price: 50 }, { time: 210, price: 40 }];
    expect(texts(away)).toEqual([]);
  });

  it('shows only the entry tag while the stop sits on the entry', () => {
    const shown = texts([LONG[0], { ...LONG[1], price: 50 }]);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatch(/· Qty 0\.00 · R:R 2$/);
  });

  it('keeps the target tag on the plot when the target is near its top', () => {
    const { ctx, calls } = recordingCtx();
    // Entry 80, stop 70: the target (100) sits on the top edge of the 0..100 plot.
    tool.render(ctx, drawing('riskReward', [{ time: 0, price: 80 }, { time: 10, price: 70 }]), unitViewport, false);
    const tops = calls.filter((c) => c.name === 'roundRect' || c.name === 'rect').map((c) => c.args[1] as number);
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(0);
  });

  it('draws no labels when they are off', () => {
    expect(texts(LONG, { showLabels: false })).toEqual([]);
  });

  it('offers a handle on the target, beside the stop', () => {
    const state = drawing('riskReward', LONG);
    // stop at x 105, target 70 at y 30
    expect(tool.hitTestAnchor({ x: 105, y: 30 }, state, unitViewport, 4)).toBe(2);
    expect(tool.hitTestAnchor({ x: 105, y: 60 }, state, unitViewport, 4)).toBe(1);
    expect(tool.hitTestAnchor({ x: 5, y: 50 }, state, unitViewport, 4)).toBe(0);
  });

  it('turns a drag of the target into an R:R, never past the entry', () => {
    const state = drawing('riskReward', LONG);
    expect(tool.moveHandle(state, 2, { time: 10, price: 65 }).options).toEqual({ rewardRatio: 1.5 });
    expect(tool.moveHandle(state, 2, { time: 10, price: 45 }).options).toEqual({ rewardRatio: 0.1 });
    expect(tool.moveHandle(state, 1, { time: 12, price: 45 }).anchors).toEqual([LONG[0], { time: 12, price: 45 }]);
  });

  it('hits inside the zones and misses outside', () => {
    const state = drawing('riskReward', LONG);
    expect(tool.hitTest({ x: 55, y: 45 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 55, y: 35 }, state, unitViewport, 2)).toBe(true); // reward zone
    expect(tool.hitTest({ x: 500, y: 5 }, state, unitViewport, 2)).toBe(false);
    expect(tool.hitTest({ x: 5, y: 50 }, drawing('riskReward', [LONG[0]]), unitViewport, 2)).toBe(false);
  });
});

describe('dragging a handle a tool moves itself', () => {
  it('lets the target handle change the R:R, as one undo step', () => {
    const manager = new DrawingManager();
    manager.register(new RiskRewardTool());
    const undo = new UndoRedoManager();
    manager.setUndoRedoManager(undo);
    const id = manager.addDrawing({ type: 'riskReward', anchors: LONG });
    manager.onPointerDown({ x: 55, y: 45 }, unitViewport); // select
    manager.onPointerUp();
    manager.onPointerDown({ x: 105, y: 30 }, unitViewport); // the target handle
    manager.onPointerMove({ x: 105, y: 20 }, unitViewport); // price 80 → 3R
    manager.onPointerUp();
    expect(manager.getDrawingOptions(id).rewardRatio).toBe(3);
    expect(manager.getDrawings()[0].anchors).toEqual(LONG);
    manager.undo();
    expect(manager.getDrawingOptions(id).rewardRatio).toBe(2);
  });
});

describe('Fibonacci level colours', () => {
  it('gives each default ratio its own colour, the ends the same neutral', async () => {
    const { fibLevelList, FIB_LEVEL_COLORS } = await import('../tools/options.js');
    const levels = fibLevelList([0, 0.382, 0.618, 1], [1.618]);
    expect(levels.map((l) => l.color)).toEqual([FIB_LEVEL_COLORS[0], FIB_LEVEL_COLORS[0.382], FIB_LEVEL_COLORS[0.618], FIB_LEVEL_COLORS[1], FIB_LEVEL_COLORS[1.618]]);
    expect(FIB_LEVEL_COLORS[0]).toBe(FIB_LEVEL_COLORS[1]);
    // A ratio without a colour takes the drawing's.
    expect(fibLevelList([0.333])[0].color).toBeUndefined();
  });
});
