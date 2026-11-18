import { describe, it, expect } from 'vitest';
import type { DrawingOptions } from '@tradecanvas/commons';
import { RiskRewardTool, positionLevels } from '../tools/RiskReward.js';
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

  it('writes its prices in the market’s decimals, grouped as the axis does', () => {
    const near100k = { ...unitViewport, priceRange: { min: 99_000, max: 101_000 }, pricePrecision: 1 };
    const { ctx, texts: out } = recordingCtx();
    tool.render(ctx, drawing('riskReward', [{ time: 0, price: 100_000 }, { time: 10, price: 99_914.7 }]), near100k, false);
    expect(out[1]).toMatch(/^Target 100,170\.6 \(\+0\.17%\)/);
    expect(out[2]).toMatch(/^Stop 99,914\.7 \(−0\.09%\)/);
  });

  it('keeps the decimals that tell the stop from the target without a market precision', () => {
    // The axis would show 3 decimals over 1.05 to 1.15; the zone needs 4.
    const fx = { ...unitViewport, priceRange: { min: 1.05, max: 1.15 } };
    const { ctx, texts: out } = recordingCtx();
    tool.render(ctx, drawing('riskReward', [{ time: 0, price: 1.0862 }, { time: 10, price: 1.0847 }]), fx, false);
    expect(out[1]).toMatch(/^Target 1\.0892 \(/);
    expect(out[2]).toMatch(/^Stop 1\.0847 \(/);
  });

  it('groups the amounts and the quantity in the number locale, the amounts at two decimals', () => {
    const big = { accountSize: 1_000_000 };
    expect(texts(LONG, big)).toEqual([
      'Long · Qty 1,000.00 · R:R 2',
      'Target 70.00 (+40.00%) · 20,000.00',
      'Stop 40.00 (−20.00%) · 10,000.00',
    ]);
    const { ctx, texts: out } = recordingCtx();
    tool.render(ctx, drawing('riskReward', LONG, { options: big }), { ...unitViewport, numberLocale: 'de-DE' }, false);
    expect(out[2]).toBe('Stop 40,00 (−20,00%) · 10.000,00');
  });

  it('writes the R:R in the number locale too', () => {
    const { ctx, texts: out } = recordingCtx();
    tool.render(ctx, drawing('riskReward', LONG, { options: { rewardRatio: 1.5 } }), { ...unitViewport, numberLocale: 'de-DE' }, false);
    expect(out[0]).toBe('Long · Qty 1,00 · R:R 1,5');
    expect(texts(LONG, { rewardRatio: 1.5 })[0]).toBe('Long · Qty 1.00 · R:R 1.5');
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

  it('offers four handles: the entry, the stop and the target at its left edge, its right edge on the entry', () => {
    const state = drawing('riskReward', LONG);
    // Entry 50 at x 5, stop 40 at y 60, target 70 at y 30; the right edge at x 105.
    expect(tool.hitTestAnchor({ x: 5, y: 50 }, state, unitViewport, 4)).toBe(0);
    expect(tool.hitTestAnchor({ x: 5, y: 60 }, state, unitViewport, 4)).toBe(1);
    expect(tool.hitTestAnchor({ x: 5, y: 30 }, state, unitViewport, 4)).toBe(2);
    expect(tool.hitTestAnchor({ x: 105, y: 50 }, state, unitViewport, 4)).toBe(3);
    expect(tool.hitTestAnchor({ x: 105, y: 60 }, state, unitViewport, 4)).toBe(-1);
  });

  it('moves the stop’s price alone, and the right edge’s time alone', () => {
    const state = drawing('riskReward', LONG);
    expect(tool.moveHandle(state, 1, { time: 3, price: 45 }).anchors).toEqual([LONG[0], { time: 10, price: 45 }]);
    expect(tool.moveHandle(state, 3, { time: 30, price: 58 }).anchors).toEqual([LONG[0], { time: 30, price: 40 }]);
    expect(tool.moveHandle(state, 0, { time: 2, price: 52 }).anchors).toEqual([{ time: 2, price: 52 }, LONG[1]]);
  });

  it('turns a drag of the target into an R:R, never past the entry', () => {
    const state = drawing('riskReward', LONG);
    expect(tool.moveHandle(state, 2, { time: 0, price: 65 }).options).toEqual({ rewardRatio: 1.5 });
    expect(tool.moveHandle(state, 2, { time: 0, price: 45 }).options).toEqual({ rewardRatio: 0.1 });
  });

  it('hits inside the zones and misses outside', () => {
    const state = drawing('riskReward', LONG);
    expect(tool.hitTest({ x: 55, y: 45 }, state, unitViewport, 2)).toBe(true);
    expect(tool.hitTest({ x: 55, y: 35 }, state, unitViewport, 2)).toBe(true); // reward zone
    expect(tool.hitTest({ x: 500, y: 5 }, state, unitViewport, 2)).toBe(false);
    expect(tool.hitTest({ x: 5, y: 50 }, drawing('riskReward', [LONG[0]]), unitViewport, 2)).toBe(false);
  });
});

describe('the trade over the bars', () => {
  /** Bars at times 0, 1, 2… (the unit viewport's bar indexes), each [open, high, low, close]. */
  const bars = (...ohlc: [number, number, number, number][]) =>
    ohlc.map(([open, high, low, close], time) => ({ time, open, high, low, close, volume: 1 }));
  const QUIET: [number, number, number, number] = [50, 52, 48, 51];
  const played = (series: ReturnType<typeof bars>, options?: DrawingOptions, viewport = unitViewport) => {
    const withBars = new RiskRewardTool();
    withBars.setDataGetter(() => series);
    const { ctx, texts: out, calls } = recordingCtx();
    withBars.render(ctx, drawing('riskReward', LONG, { options }), viewport, false);
    return { texts: out, calls };
  };

  it('says where the trade closed and what it made: at the target', () => {
    expect(played(bars(QUIET, QUIET, [55, 71, 54, 69])).texts).toContain('Target hit · +20.00');
  });

  it('at the stop', () => {
    expect(played(bars(QUIET, [48, 49, 39, 41])).texts).toContain('Stop hit · −10.00');
  });

  it('still open at the last bar, with what it makes there', () => {
    expect(played(bars(QUIET, QUIET, [51, 58, 50, 57])).texts).toContain('Open · +7.00');
  });

  it('closed at its right edge when neither level was reached', () => {
    const series = bars(...Array.from({ length: 12 }, () => QUIET));
    expect(played(series).texts).toContain('Closed · +1.00');
  });

  it('draws the move from the entry to the close, dashed', () => {
    const { calls } = played(bars(QUIET, QUIET, [55, 71, 54, 69]));
    // From the entry (x 5, y 50) to the close at the target on bar 2 (x 25, y 30).
    const dashes = calls.filter((c) => c.name === 'setLineDash' && (c.args[0] as number[]).length > 0);
    expect(dashes.length).toBeGreaterThan(0);
    const at = (name: string, x: number, y: number) =>
      calls.some((c) => c.name === name && Math.abs((c.args[0] as number) - x) < 1e-9 && Math.abs((c.args[1] as number) - y) < 1e-9);
    expect(at('moveTo', 5, 50)).toBe(true);
    expect(at('lineTo', 25, 30)).toBe(true);
  });

  it('shows none of it on a chart whose bars are not the series’ (Renko and the like), and plays Heikin Ashi on the real prices', () => {
    const series = bars(QUIET, QUIET, [55, 71, 54, 69]);
    const bricks = { ...unitViewport, data: series.slice(0, 2) };
    expect(played(series, undefined, bricks).texts.some((t) => t.startsWith('Target hit'))).toBe(false);
    // Heikin Ashi: a bar for each bar, at its time, at other prices.
    const heikinAshi = { ...unitViewport, data: series.map((b) => ({ ...b, high: 60, low: 45 })) };
    expect(played(series, undefined, heikinAshi).texts).toContain('Target hit · +20.00');
  });

  it('shows none of it when turned off, or without bars after the entry', () => {
    const series = bars(QUIET, QUIET, [55, 71, 54, 69]);
    expect(played(series, { showOutcome: false }).texts.some((t) => t.startsWith('Target hit'))).toBe(false);
    expect(played(bars(QUIET)).texts).toHaveLength(3);
  });
});

describe('positionLevels', () => {
  it('gives a long position’s side, prices and quantity, as its tags say them', () => {
    // 1% of 1,000 = 10 at risk, 10 per unit → 1 unit; target 2R above → 70.
    expect(positionLevels(drawing('riskReward', LONG))).toEqual({
      side: 'buy', entry: 50, stopLoss: 40, takeProfit: 70,
      quantity: 1, quantityDecimals: 2, riskAmount: 10, rewardAmount: 20, riskReward: 2,
    });
  });

  it('sells for a short, its target below the entry', () => {
    expect(positionLevels(drawing('riskReward', SHORT))).toMatchObject({ side: 'sell', entry: 50, stopLoss: 60, takeProfit: 30 });
  });

  it('follows the R:R, the risk as a sum and the quantity decimals set on it', () => {
    const levels = positionLevels(drawing('riskReward', LONG, { options: { rewardRatio: 3, riskMode: 'amount', risk: 55, qtyDecimals: 1 } }));
    expect(levels).toMatchObject({ takeProfit: 80, quantity: 5.5, quantityDecimals: 1, riskAmount: 55, rewardAmount: 165, riskReward: 3 });
  });

  it('gives the quantity unrounded: the drawing only writes it at its decimals', () => {
    // 1% of 1,000 = 10 at risk, 3 per unit.
    const levels = positionLevels(drawing('riskReward', [{ time: 0, price: 50 }, { time: 10, price: 47 }]));
    expect(levels?.quantity).toBeCloseTo(10 / 3, 12);
  });

  it('gives no levels for a position still being placed, with its stop on the entry', () => {
    expect(positionLevels(drawing('riskReward', [{ time: 0, price: 50 }, { time: 10, price: 50 }]))).toBeNull();
    expect(positionLevels(drawing('riskReward', [{ time: 0, price: 50 }]))).toBeNull();
  });

  it('gives none for a drawing that is not a position', () => {
    expect(positionLevels(drawing('trendLine', LONG))).toBeNull();
  });

  it('gives none where no risk is set, so nothing would be bought', () => {
    expect(positionLevels(drawing('riskReward', LONG, { options: { accountSize: 0 } }))).toBeNull();
    expect(positionLevels(drawing('riskReward', LONG, { options: { risk: 0 } }))).toBeNull();
    expect(positionLevels(drawing('riskReward', LONG, { options: { riskMode: 'amount', risk: 0 } }))).toBeNull();
  });

  it('gives none for a price that is not a finite number', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(positionLevels(drawing('riskReward', [{ time: 0, price: bad }, { time: 10, price: 40 }])), `entry ${bad}`).toBeNull();
      expect(positionLevels(drawing('riskReward', [{ time: 0, price: 50 }, { time: 10, price: bad }])), `stop ${bad}`).toBeNull();
    }
  });

  it('reads an option of the wrong kind as its default, as the tags do', () => {
    const bad = { accountSize: 'lots', risk: Number.NaN, rewardRatio: 'two' } as unknown as DrawingOptions;
    expect(positionLevels(drawing('riskReward', LONG, { options: bad }))).toEqual(positionLevels(drawing('riskReward', LONG)));
    expect(texts(LONG, bad)[0]).toBe('Long · Qty 1.00 · R:R 2');
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
    manager.onPointerDown({ x: 5, y: 30 }, unitViewport); // the target handle
    manager.onPointerMove({ x: 5, y: 20 }, unitViewport); // price 80 → 3R
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
