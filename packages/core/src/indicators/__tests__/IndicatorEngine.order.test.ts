import { describe, it, expect, beforeEach } from 'vitest';
import type { DataSeries } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';

const bars: DataSeries = Array.from({ length: 60 }, (_, i) => ({
  time: i * 3_600_000, open: 100 + i, high: 102 + i, low: 98 + i, close: 101 + (i % 5), volume: 1000,
}));

let engine: IndicatorEngine;

beforeEach(() => {
  engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
});

const ids = () => engine.getActiveIndicators().map((i) => i.instanceId);

describe('IndicatorEngine.orderIndicators', () => {
  it('puts the indicators in the order given', () => {
    const a = engine.addIndicator('sma', {}, bars);
    const b = engine.addIndicator('ema', {}, bars);
    const c = engine.addIndicator('rsi', {}, bars);
    engine.orderIndicators([c, a, b]);
    expect(ids()).toEqual([c, a, b]);
  });

  it('keeps those not given after the others, in their order, and skips unknown ids', () => {
    const a = engine.addIndicator('sma', {}, bars);
    const b = engine.addIndicator('ema', {}, bars);
    const c = engine.addIndicator('rsi', {}, bars);
    engine.orderIndicators(['nope', c, c]);
    expect(ids()).toEqual([c, a, b]);
  });

  it('orders the indicators drawn in a pane as listed', () => {
    const rsi = engine.addIndicator('rsi', {}, bars);
    const a = engine.addIndicator('sma', {}, bars, { pane: rsi });
    const b = engine.addIndicator('ema', {}, bars, { pane: rsi });
    engine.orderIndicators([rsi, b, a]);
    expect(engine.getPaneMembers(rsi)).toEqual([b, a]);
  });

  it('still computes a reader after the indicator it reads, whatever the order', () => {
    const rsi = engine.addIndicator('rsi', { period: 5 }, bars);
    const reader = engine.addIndicator('sma', { period: 3, source: `ind:${rsi}:value` }, bars);
    engine.orderIndicators([reader, rsi]);
    engine.updateIndicator(rsi, { period: 7 }, bars);
    const fresh = new IndicatorEngine();
    registerBuiltInIndicators(fresh);
    const r2 = fresh.addIndicator('rsi', { period: 7 }, bars);
    const s2 = fresh.addIndicator('sma', { period: 3, source: `ind:${r2}:value` }, bars);
    expect(engine.getOutput(reader)?.series).toEqual(fresh.getOutput(s2)?.series);
  });
});
