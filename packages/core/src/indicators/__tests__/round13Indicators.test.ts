import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, IndicatorValue } from '@tradecanvas/commons';
import { AveragePriceIndicator, MedianPriceIndicator, TypicalPriceIndicator } from '../overlay/PriceAverages.js';
import { MAChannelIndicator } from '../overlay/MAChannel.js';
import { HammingMAIndicator } from '../overlay/HammingMA.js';
import { MADoubleIndicator, MATripleIndicator } from '../overlay/MovingAverageSets.js';
import { VolatilityIndexIndicator } from '../overlay/VolatilityIndex.js';
import { MACrossIndicator } from '../overlay/MACross.js';
import { AccumulativeSwingIndexIndicator } from '../panel/AccumulativeSwingIndex.js';
import { AdvanceDeclineIndicator } from '../panel/AdvanceDecline.js';
import { MajorityRuleIndicator } from '../panel/MajorityRule.js';
import { ChopZoneIndicator, chopZoneColor } from '../panel/ChopZone.js';
import { SMIErgodicIndicator } from '../panel/SMIErgodic.js';
import { PriceOscillatorIndicator } from '../panel/PriceOscillator.js';
import { VolatilityOHLCIndicator, VolatilityZeroTrendIndicator } from '../panel/VolatilityEstimators.js';
import { CorrelationCoefficientIndicator, CorrelationLogIndicator } from '../symbols/symbolIndicators.js';
import { SymbolSeriesStore } from '../symbols/SymbolSeriesStore.js';
import { closes, emaOf, smaOf } from '../math.js';

const cfg = (id: string, params: Record<string, number | string> = {}) => ({ id, instanceId: `${id}-1`, params, visible: true }) as IndicatorConfig;

/** Bars from closes: each bar opening at the last close, a point either side. */
const series = (values: number[]): DataSeries =>
  values.map((c, i) => ({ time: i * 60_000, open: values[i - 1] ?? c, high: c + 1, low: c - 1, close: c, volume: 100 }));
const up = (n: number, step = 1) => series(Array.from({ length: n }, (_, i) => 100 + i * step));
const down = (n: number, step = 1) => series(Array.from({ length: n }, (_, i) => 500 - i * step));
const wavy = (n: number) => series(Array.from({ length: n }, (_, i) => 100 + i * 0.5 + Math.sin(i) * 3));
const last = (points: (IndicatorValue | null)[]) => points.at(-1)!;

describe('price averages', () => {
  const bar = [{ time: 0, open: 10, high: 14, low: 8, close: 12, volume: 1 }];
  it('average (OHLC/4), median (HL/2) and typical (HLC/3) price of each bar', () => {
    expect(new AveragePriceIndicator().calculate(bar, cfg('avgprice')).series[0]?.value).toBe(11);
    expect(new MedianPriceIndicator().calculate(bar, cfg('medprice')).series[0]?.value).toBe(11);
    expect(new TypicalPriceIndicator().calculate(bar, cfg('typprice')).series[0]?.value).toBeCloseTo(34 / 3, 12);
  });
});

describe('Moving Average Channel', () => {
  const data = wavy(60);
  it('averages the highs and the lows, each shifted by its own offset', () => {
    const plain = new MAChannelIndicator().calculate(data, cfg('machannel', { upperLength: 5, lowerLength: 8 })).series;
    const highs = smaOf(data.map((b) => b.high), 5);
    const lows = smaOf(data.map((b) => b.low), 8);
    expect(plain[30]?.upper).toBeCloseTo(highs[30]!, 9);
    expect(plain[30]?.lower).toBeCloseTo(lows[30]!, 9);
    const shifted = new MAChannelIndicator().calculate(data, cfg('machannel', { upperLength: 5, lowerLength: 8, upperOffset: 3, lowerOffset: -2 })).series;
    expect(shifted[30]?.upper).toBeCloseTo(highs[27]!, 9);
    expect(shifted[30]?.lower).toBeCloseTo(lows[32]!, 9);
    // Shifted back, the last bars have no lower line.
    expect(last(shifted).lower).toBeUndefined();
  });
});

describe('Hamming Moving Average', () => {
  it('takes no more than 500 bars, however long a period is asked for', () => {
    const out = new HammingMAIndicator().calculate(up(20), cfg('hamming', { period: 1e9 })).series;
    expect(out.every((v) => v === null)).toBe(true);
  });

  it('weights the middle of its window most, evenly either side: on a straight line, the middle of the window', () => {
    const ind = new HammingMAIndicator();
    expect(last(ind.calculate(up(40, 2), cfg('hamming', { period: 9 })).series).value).toBeCloseTo(100 + 39 * 2 - 4 * 2, 9);
    expect(last(ind.calculate(series(Array(20).fill(7)), cfg('hamming')).series).value).toBeCloseTo(7, 12);
    expect(ind.calculate(up(5), cfg('hamming', { period: 10 })).series.every((v) => v === null)).toBe(true);
  });
});

describe('Moving Average Double and Triple', () => {
  const data = wavy(80);
  const src = closes(data);
  it('draws two or three averages of one kind', () => {
    const double = new MADoubleIndicator().calculate(data, cfg('madouble', { first: 5, second: 12, type: 'ema' })).series;
    expect(last(double).ma1).toBeCloseTo(emaOf(src, 5).at(-1)!, 9);
    expect(last(double).ma2).toBeCloseTo(emaOf(src, 12).at(-1)!, 9);
    const triple = new MATripleIndicator().calculate(data, cfg('matriple', { first: 3, second: 6, third: 9 })).series;
    expect(last(triple).ma1).toBeCloseTo(smaOf(src, 3).at(-1)!, 9);
    expect(last(triple).ma3).toBeCloseTo(smaOf(src, 9).at(-1)!, 9);
    const weighted = new MATripleIndicator().calculate(series([1, 2, 3, 4]), cfg('matriple', { first: 2, second: 3, third: 4, type: 'wma' })).series;
    // WMA of 3, 4 with weights 1, 2: (3 + 8) / 3.
    expect(last(weighted).ma1).toBeCloseTo(11 / 3, 12);
  });
});

describe('MA Cross, an SMA against an EMA', () => {
  it('takes the fast line as a simple average and the slow one as an exponential one', () => {
    const data = wavy(60);
    const out = new MACrossIndicator().calculate(data, cfg('macross', { fast: 5, slow: 10, type: 'sma-ema' })).series;
    expect(last(out).fast).toBeCloseTo(smaOf(closes(data), 5).at(-1)!, 9);
    expect(last(out).slow).toBeCloseTo(emaOf(closes(data), 10).at(-1)!, 9);
  });

  it('goes on bar by bar as it would compute from scratch', () => {
    const data = wavy(60);
    const ind = new MACrossIndicator();
    const config = cfg('macross', { fast: 5, slow: 10, type: 'sma-ema' });
    const prev = ind.calculate(data.slice(0, 55), config);
    const updated = ind.update(data, config, prev, 55)!;
    const fresh = ind.calculate(data, config);
    for (let i = 50; i < 60; i++) {
      expect(updated.series![i]?.fast).toBeCloseTo(fresh.series![i]!.fast!, 9);
      expect(updated.series![i]?.slow).toBeCloseTo(fresh.series![i]!.slow!, 9);
    }
  });
});

describe('Accumulative Swing Index', () => {
  const ind = new AccumulativeSwingIndexIndicator();
  it('climbs in an uptrend and falls in a downtrend', () => {
    const rising = ind.calculate(up(30), cfg('asi')).series;
    const falling = ind.calculate(down(30), cfg('asi')).series;
    expect(last(rising).value).toBeGreaterThan(rising[5]!.value as number);
    expect(last(falling).value).toBeLessThan(falling[5]!.value as number);
    expect(rising[0]).toBeNull();
  });
});

describe('Advance/Decline and Majority Rule', () => {
  it('advance/decline: up bars over down bars of the last `length` (all up: their count)', () => {
    const ind = new AdvanceDeclineIndicator();
    const alternating = series(Array.from({ length: 30 }, (_, i) => (i % 2 ? 101 : 100)));
    expect(last(ind.calculate(alternating, cfg('advdecline', { length: 10 })).series).value).toBeCloseTo(1, 12);
    expect(last(ind.calculate(up(30), cfg('advdecline', { length: 10 })).series).value).toBe(10);
  });

  it('majority rule: the share of closes above the one before, in percent', () => {
    const ind = new MajorityRuleIndicator();
    expect(last(ind.calculate(up(30), cfg('majority')).series).value).toBe(100);
    expect(last(ind.calculate(down(30), cfg('majority')).series).value).toBe(0);
  });
});

describe('Chop Zone', () => {
  const ind = new ChopZoneIndicator();
  it('reads the slope of the 34-bar EMA as an angle: positive rising, negative falling', () => {
    expect(last(ind.calculate(up(90, 2), cfg('chopzone')).series).angle).toBeGreaterThan(5);
    expect(last(ind.calculate(down(90, 2), cfg('chopzone')).series).angle).toBeLessThan(-5);
  });

  it('reads no angle off prices at or below zero', () => {
    const negative = series(Array.from({ length: 90 }, (_, i) => -100 + i));
    expect(ind.calculate(negative, cfg('chopzone')).series.every((v) => v === null)).toBe(true);
  });

  it('colours each angle by its zone, steep up to steep down', () => {
    expect(chopZoneColor(10)).not.toBe(chopZoneColor(-10));
    expect(chopZoneColor(0)).not.toBe(chopZoneColor(10));
    expect(chopZoneColor(4)).not.toBe(chopZoneColor(6));
  });
});

describe('SMI Ergodic', () => {
  const ind = new SMIErgodicIndicator();
  it('is above zero in an uptrend, within ±1, its oscillator the gap to its signal', () => {
    const out = ind.calculate(up(80), cfg('smiergodic')).series;
    const v = last(out);
    expect(v.indicator).toBeGreaterThan(0);
    expect(Math.abs(v.indicator as number)).toBeLessThanOrEqual(1);
    expect(v.oscillator).toBeCloseTo((v.indicator as number) - (v.signal as number), 12);
    expect(last(ind.calculate(down(80), cfg('smiergodic')).series).indicator).toBeLessThan(0);
  });
});

describe('Price Oscillator', () => {
  it('is the short average less the long one', () => {
    const data = up(40);
    const v = last(new PriceOscillatorIndicator().calculate(data, cfg('po', { short: 4, long: 10 })).series).value;
    expect(v).toBeCloseTo(smaOf(closes(data), 4).at(-1)! - smaOf(closes(data), 10).at(-1)!, 9);
    expect(v).toBeGreaterThan(0);
  });
});

describe('volatility estimators', () => {
  it('O-H-L-C: from the ranges of the bars, in percent a year', () => {
    const flat = Array.from({ length: 20 }, (_, i) => ({ time: i * 86_400_000, open: 100, high: 110, low: 100, close: 100, volume: 1 }));
    const v = last(new VolatilityOHLCIndicator().calculate(flat, cfg('volohlc', { period: 10, annual: 365 })).series).value;
    expect(v).toBeCloseTo(100 * Math.sqrt(365 * 0.5 * Math.log(1.1) ** 2), 9);
  });

  it('zero trend close to close: the steady growth rate, in percent a year', () => {
    const growth = series(Array.from({ length: 30 }, (_, i) => 100 * 1.01 ** i));
    const v = last(new VolatilityZeroTrendIndicator().calculate(growth, cfg('volzt', { period: 10, annual: 252 })).series).value;
    expect(v).toBeCloseTo(100 * Math.log(1.01) * Math.sqrt(252), 9);
  });
});

describe('Volatility Index (a stop and reverse on the average range)', () => {
  const ind = new VolatilityIndexIndicator();
  it('trails under the closes in an uptrend and over them in a downtrend', () => {
    const rising = up(40, 2);
    const r = last(ind.calculate(rising, cfg('volindex')).series);
    expect(r.long).toBe(1);
    expect(r.sar).toBeLessThan(rising.at(-1)!.close);
    const falling = down(40, 2);
    const f = last(ind.calculate(falling, cfg('volindex')).series);
    expect(f.long).toBe(0);
    expect(f.sar).toBeGreaterThan(falling.at(-1)!.close);
  });

  it('turns when a close crosses it', () => {
    const vee = series([...Array.from({ length: 30 }, (_, i) => 200 - i * 3), ...Array.from({ length: 30 }, (_, i) => 113 + i * 3)]);
    const out = ind.calculate(vee, cfg('volindex')).series;
    expect(out[29]?.long).toBe(0);
    expect(last(out).long).toBe(1);
  });
});

describe('correlation with another symbol', () => {
  const main = wavy(60);
  const store = new SymbolSeriesStore();
  store.set('TWICE', main.map((b) => ({ ...b, close: b.close * 2 })));
  store.set('MIRROR', main.map((b) => ({ ...b, close: 400 - b.close })));
  it('coefficient: 1 moving together, −1 moving against', () => {
    const ind = new CorrelationCoefficientIndicator(store);
    expect(last(ind.calculate(main, cfg('correlation', { symbol: 'TWICE', length: 20 })).series).value).toBeCloseTo(1, 9);
    expect(last(ind.calculate(main, cfg('correlation', { symbol: 'MIRROR', length: 20 })).series).value).toBeCloseTo(-1, 9);
    expect(ind.calculate(main, cfg('correlation', { symbol: 'NONE' })).series.every((v) => v === null)).toBe(true);
  });

  it('leaves a gap, not a zero, where the other symbol held still', () => {
    const flat = new SymbolSeriesStore();
    flat.set('FLAT', main.map((b) => ({ ...b, close: 0.1 })));
    const ind = new CorrelationCoefficientIndicator(flat);
    expect(last(ind.calculate(main, cfg('correlation', { symbol: 'FLAT', length: 20 })).series)).toBeNull();
  });

  it('log: of the bar-to-bar returns, 1 for a symbol at a fixed multiple', () => {
    const ind = new CorrelationLogIndicator(store);
    expect(last(ind.calculate(main, cfg('correlationlog', { symbol: 'TWICE', length: 20 })).series).value).toBeCloseTo(1, 9);
    expect(last(ind.calculate(main, cfg('correlationlog', { symbol: 'MIRROR', length: 20 })).series).value).toBeLessThan(0);
  });
});
