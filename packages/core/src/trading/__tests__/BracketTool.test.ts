import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { computeBracketDefaults, bracketRiskReward, BracketTool } from '../BracketTool.js';

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
