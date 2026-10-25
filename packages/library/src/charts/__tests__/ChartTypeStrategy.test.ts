import { describe, it, expect } from 'vitest';
import type { ChartType, OHLCBar } from '@tradecanvas/commons';
import { MARKET_HOSE, priceStepAt } from '@tradecanvas/commons';
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
  rangeBarsSize,
  rangeBarsStep,
  transformDisplayData,
} from '../ChartTypeStrategy.js';
import { secondBars } from '../../__tests__/secondBars.js';

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

  it('sizes automatic range bars from the bars’ true range and ends on the bar still forming', () => {
    // One-second bars near 100,000 move about $150 in all: 0.5% of the price ($500) closed no bar.
    const raw = secondBars(145);
    const out = transformDisplayData('rangeBars', raw);
    expect(out.length).toBeGreaterThan(10);
    const range = rangeBarsSize(raw);
    for (const b of out.slice(0, -1)) expect(b.high - b.low).toBeCloseTo(range, 9);
    expect(out.at(-1)!.close).toBe(raw.at(-1)!.close);
  });

  it('keeps the closed range bars when one more bar closes', () => {
    const raw = secondBars(300);
    for (let n = 145; n < raw.length; n++) {
      const before = transformDisplayData('rangeBars', raw.slice(0, n)).slice(0, -1);
      const after = transformDisplayData('rangeBars', raw.slice(0, n + 1));
      expect(before.length).toBeGreaterThan(10);
      expect(after.slice(0, before.length)).toEqual(before);
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

describe('rangeBarsSize', () => {
  it('uses a range that is set as it is', () => {
    expect(rangeBarsSize(secondBars(145), { rangeBars: { range: 33 } }, 50)).toBe(33);
  });

  it('keeps the automatic range when one more bar closes', () => {
    const raw = secondBars(600);
    for (let n = 145; n < raw.length; n++) {
      expect(rangeBarsSize(raw.slice(0, n + 1))).toBe(rangeBarsSize(raw.slice(0, n)));
    }
  });

  it('rounds the automatic range to a 1-2-5 number and leaves out the bar still forming', () => {
    const raw = secondBars(145);
    expect(rangeBarsSize(raw)).toBe(10);
    // A forming bar that runs $5,000 changes nothing until it closes.
    const forming = { ...raw.at(-1)!, high: raw.at(-1)!.high + 5_000 };
    expect(rangeBarsSize([...raw.slice(0, -1), forming])).toBe(10);
    expect(rangeBarsSize(raw, { rangeBars: { range: 'auto' } })).toBe(10);
  });

  it('puts the automatic range on the price step, one step at least', () => {
    const raw = secondBars(145, { start: 25_000, move: 16 });
    expect(rangeBarsSize(raw)).toBe(20);
    expect(rangeBarsSize(raw, {}, 50)).toBe(50);
    expect(rangeBarsSize(raw, {}, 0.25) % 0.25).toBe(0);
    const wide = secondBars(145, { start: 25_000, move: 160 });
    expect(rangeBarsSize(wide, {}, 50) % 50).toBe(0);
    expect(rangeBarsSize(wide, {}, 50)).toBeGreaterThan(50);
  });

  it('takes a hundredth of the last close with too few bars for a true range', () => {
    expect(rangeBarsSize(bars([100_000, 100_500]))).toBe(1_000);
    expect(rangeBarsSize(bars([100_000, 100_500]), {}, 0.5)).toBe(1_000);
  });
});

describe('rangeBarsStep', () => {
  // HOSE steps 0.05 a price from 10 and 0.1 from 50.
  const hose = (price: number): number | undefined => priceStepAt(price, MARKET_HOSE);

  it('takes the coarsest step the closed bars of the automatic range traded at', () => {
    // Closed bars on both sides of 50 and a last price below it: the range goes on 0.1, not 0.05.
    expect(rangeBarsStep(bars([49.8, 49.9, 50.1, 50.2, 49.9, 49.7], 0.05), hose)).toBe(0.1);
    expect(rangeBarsStep(bars([49.8, 49.9, 49.7], 0.05), hose)).toBe(0.05);
  });

  it('leaves out the bar still forming, so a tick over a band edge changes nothing', () => {
    expect(rangeBarsStep(bars([49.6, 49.7, 49.8, 50.4], 0.05), hose)).toBe(0.05);
  });

  it('looks only at the bars the automatic range is measured on', () => {
    // A price past 50 more than 100 closed bars back no longer sets the step.
    const quiet = Array.from({ length: 99 }, () => 49.5);
    expect(rangeBarsStep(bars([50.5, ...quiet, 49.5, 49.6], 0.05), hose)).toBe(0.05);
    expect(rangeBarsStep(bars([50.5, ...quiet, 49.6], 0.05), hose)).toBe(0.1);
  });

  it('takes the step at the last close with one bar, and none without a step', () => {
    expect(rangeBarsStep(bars([50.2], 0.05), hose)).toBe(0.1);
    expect(rangeBarsStep(bars([100, 101, 102]), () => undefined)).toBeUndefined();
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
