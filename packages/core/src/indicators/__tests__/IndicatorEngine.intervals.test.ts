import { describe, it, expect, beforeEach } from 'vitest';
import type { DataSeries } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';

const bars: DataSeries = Array.from({ length: 60 }, (_, i) => ({
  time: i * 3_600_000, open: 100 + i, high: 102 + i, low: 98 + i, close: 101 + i, volume: 1000,
}));
const viewport = {
  width: 800, height: 400, chartRect: { x: 0, y: 0, width: 800, height: 400 },
  priceRange: { min: 50, max: 200 }, timeRange: { from: 0, to: 59 }, barWidth: 10, barSpacing: 12, offset: 0,
} as never;

let engine: IndicatorEngine;

beforeEach(() => {
  engine = new IndicatorEngine();
  registerBuiltInIndicators(engine);
});

describe('an indicator shown on some intervals only', () => {
  it('is left out of the drawing and the scale on the others', () => {
    const id = engine.addIndicator('sma', { period: 5 }, bars);
    engine.setTimeframe('1h');
    engine.setIntervals(id, { hours: [2, 4] });
    expect(engine.isShown(id)).toBe(false);
    expect(engine.overlayDraws(viewport)).toHaveLength(0);
    expect(engine.getOverlayPriceRange(0, 59)).toBeNull();
    expect(engine.getLatestOverlayValues()).toEqual([]);

    expect(engine.setTimeframe('4h')).toBe(true);
    expect(engine.isShown(id)).toBe(true);
    expect(engine.overlayDraws(viewport)).toHaveLength(1);
  });

  it('says whether a new timeframe changed what is shown', () => {
    const id = engine.addIndicator('rsi', {}, bars);
    engine.setIntervals(id, { minutes: false });
    expect(engine.setTimeframe('1h')).toBe(false);
    expect(engine.setTimeframe('5m')).toBe(true);
    expect(engine.setTimeframe('15m')).toBe(false);
  });

  it('stays hidden while switched off, whatever the interval', () => {
    const id = engine.addIndicator('sma', {}, bars);
    engine.setTimeframe('1h');
    engine.setVisible(id, false);
    expect(engine.isShown(id)).toBe(false);
    engine.setVisible(id, true);
    expect(engine.isShown(id)).toBe(true);
  });

  it('lists its rules and whether it shows now, and forgets the rules on null', () => {
    const id = engine.addIndicator('sma', {}, bars);
    engine.setTimeframe('1d');
    engine.setIntervals(id, { days: false, hours: [9, 1] });
    expect(engine.getIntervals(id)).toEqual({ days: false, hours: [1, 9] });
    expect(engine.getActiveIndicators()[0]).toMatchObject({ visible: true, shown: false, intervals: { days: false } });
    engine.setIntervals(id, null);
    expect(engine.getIntervals(id)).toBeNull();
    expect(engine.getActiveIndicators()[0].shown).toBe(true);
    expect(engine.getActiveIndicators()[0].intervals).toBeUndefined();
  });
});
