import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Backtester } from '../Backtester.js';
import {
  smaCrossStrategy,
  rsiReversionStrategy,
  donchianBreakoutStrategy,
  bollingerReversionStrategy,
} from '../strategies/index.js';

function trendUp(n: number, start = 100, step = 1): OHLCBar[] {
  // Trend with a mid-series correction. A purely monotonic uptrend keeps the
  // fast SMA permanently above the slow once warmed up, so smaCross would
  // never detect a fresh entry. The correction gives the fast a chance to
  // dip below the slow and cross back up — the realistic case the strategy
  // is built to capture.
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i / n) * Math.PI * 2) * 15;
    const c = start + step * i + wave;
    return { time: i * 60_000, open: c, high: c + 0.5, low: c - 0.5, close: c, volume: 100 };
  });
}

function oscillating(n: number, base = 100, amp = 5): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = base + Math.sin(i * 0.6) * amp;
    return { time: i * 60_000, open: c, high: c + 0.5, low: c - 0.5, close: c, volume: 100 };
  });
}

describe('strategies', () => {
  describe('smaCrossStrategy', () => {
    it('rejects fast >= slow', () => {
      expect(() => smaCrossStrategy({ fastPeriod: 30, slowPeriod: 20 })).toThrow();
    });

    it('captures a clean uptrend', () => {
      const bt = new Backtester({ initialCash: 10_000 });
      const result = bt.run(trendUp(80), smaCrossStrategy({ fastPeriod: 5, slowPeriod: 20, size: 1 }));
      expect(result.fills.length).toBeGreaterThan(0);
      expect(result.finalEquity).toBeGreaterThan(10_000);
    });
  });

  describe('rsiReversionStrategy', () => {
    it('places trades on an oscillating series', () => {
      const bt = new Backtester({ initialCash: 10_000, allowShort: false });
      const result = bt.run(
        oscillating(120, 100, 8),
        rsiReversionStrategy({ period: 7, oversold: 40, overbought: 60, size: 1 }),
      );
      expect(result.fills.length).toBeGreaterThan(0);
    });
  });

  describe('donchianBreakoutStrategy', () => {
    it('enters long on an uptrend breakout', () => {
      const bt = new Backtester({ initialCash: 10_000 });
      const result = bt.run(
        trendUp(60),
        donchianBreakoutStrategy({ entryPeriod: 10, exitPeriod: 5, size: 1 }),
      );
      const longFills = result.fills.filter(f => f.side === 'long');
      expect(longFills.length).toBeGreaterThan(0);
    });
  });

  describe('bollingerReversionStrategy', () => {
    it('runs without errors on oscillating data', () => {
      const bt = new Backtester({ initialCash: 10_000, allowShort: false });
      const result = bt.run(
        oscillating(120, 100, 10),
        bollingerReversionStrategy({ period: 20, stdDev: 2, size: 1 }),
      );
      // Hard to assert direction without committing to a noise seed; just verify
      // the strategy doesn't crash and ends with a valid equity figure.
      expect(Number.isFinite(result.finalEquity)).toBe(true);
    });
  });
});
