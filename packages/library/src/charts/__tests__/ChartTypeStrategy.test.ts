import { describe, it, expect } from 'vitest';
import type { ChartType, OHLCBar } from '@tradecanvas/commons';
import {
  CandlestickRenderer,
  LineRenderer,
  AreaRenderer,
  BarRenderer,
  HollowCandleRenderer,
  BaselineRenderer,
  RenkoRenderer,
  KagiRenderer,
  PointAndFigureRenderer,
} from '@tradecanvas/core';
import {
  createRendererFor,
  isTransformedChartType,
  transformDisplayData,
} from '../ChartTypeStrategy.js';

function bars(closes: number[], hl = 0.5): OHLCBar[] {
  return closes.map((c, i) => ({
    time: i * 60_000,
    open: c,
    high: c + hl,
    low: c - hl,
    close: c,
    volume: 1,
  }));
}

describe('createRendererFor', () => {
  const cases: { type: ChartType; ctor: new () => unknown }[] = [
    { type: 'candlestick', ctor: CandlestickRenderer },
    { type: 'heikinAshi', ctor: CandlestickRenderer },
    { type: 'lineBreak', ctor: CandlestickRenderer },
    { type: 'rangeBars', ctor: CandlestickRenderer },
    { type: 'line', ctor: LineRenderer },
    { type: 'area', ctor: AreaRenderer },
    { type: 'bar', ctor: BarRenderer },
    { type: 'hollowCandle', ctor: HollowCandleRenderer },
    { type: 'baseline', ctor: BaselineRenderer },
    { type: 'renko', ctor: RenkoRenderer },
    { type: 'kagi', ctor: KagiRenderer },
    { type: 'pointAndFigure', ctor: PointAndFigureRenderer },
  ];

  for (const { type, ctor } of cases) {
    it(`returns a ${ctor.name} for "${type}"`, () => {
      expect(createRendererFor(type)).toBeInstanceOf(ctor);
    });
  }

  it('falls back to CandlestickRenderer for unknown chart types', () => {
    expect(createRendererFor('mystery' as ChartType)).toBeInstanceOf(CandlestickRenderer);
  });
});

describe('transformDisplayData', () => {
  it('returns the same array reference for identity chart types', () => {
    const raw = bars([100, 101, 102]);
    expect(transformDisplayData('candlestick', raw)).toBe(raw);
    expect(transformDisplayData('line', raw)).toBe(raw);
    expect(transformDisplayData('bar', raw)).toBe(raw);
  });

  it('returns the input unchanged when raw is empty', () => {
    const raw: OHLCBar[] = [];
    expect(transformDisplayData('heikinAshi', raw)).toBe(raw);
    expect(transformDisplayData('renko', raw)).toBe(raw);
  });

  it('transforms heikinAshi into a synthetic series of equal length', () => {
    const raw = bars([100, 101, 99, 102, 103]);
    const out = transformDisplayData('heikinAshi', raw);
    expect(out).not.toBe(raw);
    expect(out).toHaveLength(raw.length);
  });

  it('emits range bars whose high − low equals the auto-derived range size', () => {
    // avgPrice * 0.005 ≈ 0.5, so a 100 → 110 ramp emits ~20 bars of size 0.5.
    const raw = bars(Array.from({ length: 50 }, (_, i) => 100 + i * 0.2), 0.05);
    const out = transformDisplayData('rangeBars', raw);
    expect(out.length).toBeGreaterThan(5);
    const expectedSize = (raw.reduce((s, b) => s + b.close, 0) / raw.length) * 0.005;
    for (const b of out) {
      expect(b.high - b.low).toBeCloseTo(expectedSize, 6);
    }
  });

  it('produces an empty series when renko brick size cannot be derived', () => {
    // ATR is computed from period 14, but we have 5 bars → useATR fallback gives brickSize=0 → clamped to 1.
    // With clamped brickSize=1, monotone increase by 0.2 won't move a brick → 0 output.
    const raw = bars(Array.from({ length: 5 }, (_, i) => 100 + i * 0.2));
    const out = transformDisplayData('renko', raw);
    expect(out).toEqual([]);
  });
});

describe('isTransformedChartType', () => {
  it('returns true for chart types that materially reshape data', () => {
    for (const t of ['heikinAshi', 'renko', 'lineBreak', 'kagi', 'pointAndFigure', 'rangeBars'] as ChartType[]) {
      expect(isTransformedChartType(t)).toBe(true);
    }
  });

  it('returns false for raw-OHLC chart types', () => {
    for (const t of ['candlestick', 'line', 'area', 'bar', 'hollowCandle', 'baseline'] as ChartType[]) {
      expect(isTransformedChartType(t)).toBe(false);
    }
  });
});
