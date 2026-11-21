import { describe, it, expect } from 'vitest';
import type { Theme, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { computeBracketDefaults, bracketQuantity, bracketRiskReward, BracketTool } from '../BracketTool.js';

function viewport(): ViewportState {
  // Linear: price 0 → y 100 (bottom), price 100 → y 0 (top).
  return {
    visibleRange: { from: 0, to: 10 },
    priceRange: { min: 0, max: 100 },
    barWidth: 6,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 200, height: 100 },
  };
}

describe('computeBracketDefaults', () => {
  it('places SL below and TP above entry for a long, at the RR ratio', () => {
    const d = computeBracketDefaults('buy', 100, { riskFraction: 0.01, riskReward: 2 });
    expect(d.entry).toBe(100);
    expect(d.stopLoss).toBeCloseTo(99, 6);   // 1% below
    expect(d.takeProfit).toBeCloseTo(102, 6); // 2× risk above
    expect(bracketRiskReward(d)).toBeCloseTo(2, 6);
  });

  it('mirrors the sides for a short', () => {
    const d = computeBracketDefaults('sell', 100, { riskFraction: 0.01, riskReward: 3 });
    expect(d.stopLoss).toBeCloseTo(101, 6);
    expect(d.takeProfit).toBeCloseTo(97, 6);
    expect(bracketRiskReward(d)).toBeCloseTo(3, 6);
  });
});

describe('bracketRiskReward', () => {
  it('is zero when the stop sits on the entry', () => {
    expect(bracketRiskReward({ side: 'buy', entry: 100, stopLoss: 100, takeProfit: 110 })).toBe(0);
  });
});

describe('BracketTool', () => {
  it('starts inactive and activates on start()', () => {
    const t = new BracketTool();
    expect(t.isActive()).toBe(false);
    t.start('buy', 100);
    expect(t.isActive()).toBe(true);
    expect(t.getDraft()?.entry).toBe(100);
  });

  it('hit-tests handles by pixel proximity', () => {
    const t = new BracketTool({ riskFraction: 0.1, riskReward: 1 }); // SL 90, TP 110→clamped within range? TP=110 outside; use smaller
    t.start('buy', 50); // SL 45, TP 55 with rf .1 rr 1
    const vp = viewport();
    // price 50 → y 50 (entry)
    expect(t.hitTest({ x: 10, y: 50 }, vp)).toBe('entry');
    // price 45 → y 55 (sl)
    expect(t.hitTest({ x: 10, y: 55 }, vp)).toBe('sl');
    // price 55 → y 45 (tp)
    expect(t.hitTest({ x: 10, y: 45 }, vp)).toBe('tp');
    expect(t.hitTest({ x: 10, y: 10 }, vp)).toBeNull();
  });

  it('dragging the entry translates the whole bracket', () => {
    const t = new BracketTool({ riskFraction: 0.1, riskReward: 1 });
    t.start('buy', 50); // entry 50, sl 45, tp 55
    const vp = viewport();
    t.beginDrag({ x: 10, y: 50 }, vp); // grab entry
    t.drag({ x: 10, y: 40 }, vp); // y40 → price 60
    const d = t.getDraft()!;
    expect(d.entry).toBeCloseTo(60, 6);
    expect(d.stopLoss).toBeCloseTo(55, 6); // shifted +10
    expect(d.takeProfit).toBeCloseTo(65, 6);
  });

  it('keeps the stop on the losing side when dragged across entry', () => {
    const t = new BracketTool({ riskFraction: 0.1, riskReward: 1 });
    t.start('buy', 50); // long: SL must stay <= entry
    const vp = viewport();
    t.beginDrag({ x: 10, y: 55 }, vp); // grab SL (price 45)
    t.drag({ x: 10, y: 20 }, vp); // y20 → price 80, above entry → clamp to 50
    expect(t.getDraft()!.stopLoss).toBeLessThanOrEqual(50);
  });

  it('cancel() clears the draft', () => {
    const t = new BracketTool();
    t.start('sell', 100);
    t.cancel();
    expect(t.isActive()).toBe(false);
    expect(t.getDraft()).toBeNull();
  });
});

describe('BracketTool — a finger’s reach', () => {
  it('grabs a handle farther off when given a wider reach', () => {
    const t = new BracketTool({ riskFraction: 0.1, riskReward: 1 });
    t.start('buy', 50); // entry at y 50
    // The take-profit line is at y 45: 10px off is beyond the mouse's 6.
    expect(t.beginDrag({ x: 10, y: 35 }, viewport())).toBe(false);
    expect(t.beginDrag({ x: 10, y: 28 }, viewport(), 16)).toBe(false); // 17 off
    expect(t.beginDrag({ x: 10, y: 35 }, viewport(), 16)).toBe(true);
    expect(t.isDragging()).toBe(true);
  });
});

describe('bracketQuantity', () => {
  const draft = { side: 'buy' as const, entry: 100, stopLoss: 98, takeProfit: 104 };

  it('is the quantity it is given', () => {
    expect(bracketQuantity(draft, { quantity: 3 })).toBe(3);
  });

  it('is the money at risk over the stop’s distance when sized by risk, whatever quantity is beside it', () => {
    expect(bracketQuantity(draft, { risk: 50 })).toBe(25);
    expect(bracketQuantity(draft, { risk: 50, quantity: 3 })).toBe(25);
    expect(bracketQuantity({ side: 'sell', entry: 100, stopLoss: 104, takeProfit: 90 }, { risk: 50 })).toBe(12.5);
  });

  it('counts what a point is worth for one unit: a contract’s multiplier', () => {
    expect(bracketQuantity(draft, { risk: 1000, multiplier: 100 })).toBe(5);
  });

  it('is rounded down to the step, never up past the risk', () => {
    expect(bracketQuantity(draft, { risk: 55, quantityStep: 10 })).toBe(20);
    expect(bracketQuantity(draft, { risk: 0.7, quantityStep: 0.1 })).toBe(0.3);
    // 0.6 / 2 is a hair under 0.3 in floating point: it is still three steps.
    expect(bracketQuantity(draft, { risk: 0.6, quantityStep: 0.1 })).toBe(0.3);
  });

  it('is none with nothing to size by: no size, a stop on the entry, less than a step', () => {
    expect(bracketQuantity(draft, undefined)).toBeUndefined();
    expect(bracketQuantity(draft, {})).toBeUndefined();
    expect(bracketQuantity(draft, { quantity: 0 })).toBeUndefined();
    expect(bracketQuantity(draft, { quantity: Number.NaN })).toBeUndefined();
    expect(bracketQuantity(draft, { risk: -5 })).toBeUndefined();
    expect(bracketQuantity({ ...draft, stopLoss: 100 }, { risk: 50 })).toBeUndefined();
    expect(bracketQuantity(draft, { risk: 5, quantityStep: 10 })).toBeUndefined();
  });
});

describe('BracketTool with a size', () => {
  const theme = DARK_THEME as Theme;
  const entryTag = (t: BracketTool) => t.tags(viewport(), theme)[0].cells.map((c) => ('text' in c ? c.text : ''));

  it('has no quantity unless it is given a size', () => {
    const t = new BracketTool();
    t.start('buy', 50);
    expect(t.getDraft()?.quantity).toBeUndefined();
    expect(entryTag(t)).toEqual(['Long', '2.00R']);
  });

  it('keeps the quantity it starts with, and writes it on the entry’s tag', () => {
    const t = new BracketTool();
    t.start('buy', 50, { quantity: 3 });
    expect(t.getDraft()?.quantity).toBe(3);
    expect(entryTag(t)).toEqual(['Long', '3', '2.00R']);
  });

  it('follows the stop as it is dragged, when sized by risk', () => {
    const t = new BracketTool({ riskFraction: 0.1, riskReward: 1 });
    t.start('buy', 50, { risk: 10 }); // stop 45: 10 over 5
    expect(t.getDraft()?.quantity).toBe(2);
    t.beginDragOn('sl');
    t.drag({ x: 10, y: 60 }, viewport()); // the stop to 40: 10 over 10
    expect(t.getDraft()?.quantity).toBe(1);
    expect(entryTag(t)[1]).toBe('1');
  });

  it('takes a new size while it is placed, and none once it is not', () => {
    const t = new BracketTool();
    t.start('sell', 50, { quantity: 3 });
    t.setSize({ quantity: 7 });
    expect(t.getDraft()?.quantity).toBe(7);
    t.setSize(undefined);
    expect(t.getDraft()?.quantity).toBeUndefined();
    t.cancel();
    t.setSize({ quantity: 9 });
    t.start('sell', 50);
    expect(t.getDraft()?.quantity).toBeUndefined();
  });

  it('writes a long quantity short: four decimals of it', () => {
    const t = new BracketTool({ riskFraction: 0.1, riskReward: 1 });
    t.start('buy', 30, { risk: 10 }); // stop 27: 10 over 3
    expect(entryTag(t)[1]).toBe('3.3333');
  });
});
