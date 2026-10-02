import { describe, it, expect } from 'vitest';
import type { IndicatorPlugin, OHLCBar } from '@tradecanvas/commons';
import { bars, ohlcBars, indicatorConfig } from './fixtures.js';
import { DEMAIndicator } from '../overlay/DEMA.js';
import { SMMAIndicator } from '../overlay/SMMA.js';
import { ALMAIndicator } from '../overlay/ALMA.js';
import { KAMAIndicator } from '../overlay/KAMA.js';
import { LSMAIndicator } from '../overlay/LSMA.js';
import { McGinleyDynamicIndicator } from '../overlay/McGinleyDynamic.js';
import { MACrossIndicator } from '../overlay/MACross.js';
import { WilliamsFractalsIndicator } from '../overlay/WilliamsFractals.js';
import { ChandeKrollStopIndicator } from '../overlay/ChandeKrollStop.js';
import { BollingerPercentBIndicator } from '../panel/BollingerPercentB.js';
import { BollingerBandWidthIndicator } from '../panel/BollingerBandWidth.js';
import { MomentumIndicator } from '../panel/Momentum.js';
import { HistoricalVolatilityIndicator } from '../panel/HistoricalVolatility.js';
import { VolumeOscillatorIndicator } from '../panel/VolumeOscillator.js';
import { UlcerIndexIndicator } from '../panel/UlcerIndex.js';

/** The `key` values of `plugin` on `data`, undefined where there is none. */
const run = (plugin: IndicatorPlugin, data: OHLCBar[], params: Record<string, number | string | boolean> = {}, key = 'value') =>
  plugin.calculate(data, indicatorConfig(plugin.descriptor.id, { ...plugin.descriptor.defaultConfig, ...params } as Record<string, number | string | boolean>)).series!.map((v) => v?.[key]);

const ramp = (n: number, start = 10, step = 1) => bars(Array.from({ length: n }, (_, i) => start + i * step));
const flat = (n: number, price = 50) => bars(new Array(n).fill(price));

describe('moving averages', () => {
  it('DEMA is 2·EMA − EMA(EMA), and follows a straight line without lag', () => {
    const out = run(new DEMAIndicator(), ramp(40), { period: 5 });
    expect(out[7]).toBeUndefined(); // EMA of EMA needs 2·5 − 1 bars
    expect(out[8]).toBeDefined();
    expect(out[39]).toBeCloseTo(49, 6); // the ramp's own value at bar 39
  });

  it('SMMA starts as a simple average and moves 1/period towards each close', () => {
    const out = run(new SMMAIndicator(), bars([2, 4, 6, 8]), { period: 3 });
    expect(out.slice(0, 3)).toEqual([undefined, undefined, 4]);
    expect(out[3]).toBeCloseTo(4 + (8 - 4) / 3, 9);
  });

  it('ALMA of a constant is the constant, and weights recent bars more with a high offset', () => {
    expect(run(new ALMAIndicator(), flat(20))[19]).toBeCloseTo(50, 9);
    const up = run(new ALMAIndicator(), ramp(20), { period: 9, offset: 0.85 })[19]!;
    const centred = run(new ALMAIndicator(), ramp(20), { period: 9, offset: 0.5 })[19]!;
    expect(up).toBeGreaterThan(centred);
    expect(centred).toBeCloseTo(25, 6); // the window's middle bar
  });

  it('KAMA moves at the fast rate in a straight line and barely in a flat one', () => {
    const trend = run(new KAMAIndicator(), ramp(15), { period: 10, fast: 2, slow: 30 });
    // Efficiency 1: smoothing (2/3)² of the gap to the close.
    expect(trend[10]).toBeCloseTo(19 + (4 / 9) * (20 - 19), 9);
    expect(run(new KAMAIndicator(), flat(15))[14]).toBe(50);
  });

  it('LSMA lies on a straight line', () => {
    expect(run(new LSMAIndicator(), ramp(30, 10, 2), { period: 10 })[29]).toBeCloseTo(68, 9);
    expect(run(new LSMAIndicator(), ramp(30, 10, 2), { period: 10, offset: 2 })[29]).toBeCloseTo(64, 9);
  });

  it('McGinley Dynamic holds a constant and follows a rise from below', () => {
    expect(run(new McGinleyDynamicIndicator(), flat(30), { period: 5 })[29]).toBeCloseTo(50, 9);
    const out = run(new McGinleyDynamicIndicator(), ramp(30), { period: 5 });
    expect(out[3]).toBeUndefined();
    expect(out[29]!).toBeLessThan(39);
    expect(out[29]!).toBeGreaterThan(out[28]!);
  });

  it('MA Cross gives a fast and a slow average, simple or exponential', () => {
    const data = ramp(30);
    const plugin = new MACrossIndicator();
    expect(run(plugin, data, { fast: 3, slow: 5 }, 'fast')[29]).toBeCloseTo(38, 9);
    expect(run(plugin, data, { fast: 3, slow: 5 }, 'slow')[29]).toBeCloseTo(37, 9);
    expect(run(plugin, data, { fast: 3, slow: 5, type: 'ema' }, 'fast')[29]).toBeCloseTo(38, 6);
    expect(run(plugin, data, { fast: 3, slow: 5 }, 'slow')[3]).toBeUndefined();
  });
});

describe('price markers and stops', () => {
  it('Williams Fractals marks a high above both neighbours and a low below them', () => {
    const data = ohlcBars([
      { o: 5, h: 6, l: 4, c: 5 }, { o: 5, h: 7, l: 3, c: 5 }, { o: 5, h: 9, l: 1, c: 5 },
      { o: 5, h: 7, l: 3, c: 5 }, { o: 5, h: 6, l: 4, c: 5 },
    ]);
    const plugin = new WilliamsFractalsIndicator();
    expect(run(plugin, data, {}, 'up')).toEqual([undefined, undefined, 9, undefined, undefined]);
    expect(run(plugin, data, {}, 'down')).toEqual([undefined, undefined, 1, undefined, undefined]);
  });

  it('Chande Kroll Stop sits x ATRs inside the recent range', () => {
    const data = ohlcBars(Array.from({ length: 30 }, () => ({ o: 10, h: 11, l: 9, c: 10 })));
    const plugin = new ChandeKrollStopIndicator();
    // Range 2 every bar: ATR 2, so the stops are 11 − 2 and 9 + 2.
    expect(run(plugin, data, { p: 5, x: 1, q: 3 }, 'short')[29]).toBeCloseTo(9, 9);
    expect(run(plugin, data, { p: 5, x: 1, q: 3 }, 'long')[29]).toBeCloseTo(11, 9);
  });
});

describe('oscillators', () => {
  it('Bollinger %B is 0.5 on the middle band and undefined for a flat series', () => {
    const zigzag = bars(Array.from({ length: 21 }, (_, i) => (i % 2 ? 11 : 9)).concat([10]));
    const out = run(new BollingerPercentBIndicator(), zigzag, { period: 20 });
    expect(out[21]).toBeCloseTo(0.5, 1);
    expect(run(new BollingerPercentBIndicator(), flat(25))[24]).toBeUndefined();
  });

  it('Bollinger BandWidth is the band width over the middle', () => {
    const zigzag = bars(Array.from({ length: 20 }, (_, i) => (i % 2 ? 11 : 9)));
    // Mean 10, population deviation 1: (2·2·1) / 10.
    expect(run(new BollingerBandWidthIndicator(), zigzag, { period: 20 })[19]).toBeCloseTo(0.4, 9);
  });

  it('Momentum is the change over the period', () => {
    expect(run(new MomentumIndicator(), ramp(20, 10, 3), { period: 4 })[19]).toBe(12);
  });

  it('Historical Volatility is zero for steady growth and grows with swings', () => {
    const steady = bars(Array.from({ length: 30 }, (_, i) => 100 * 1.01 ** i));
    expect(run(new HistoricalVolatilityIndicator(), steady)[29]).toBeCloseTo(0, 6);
    const swinging = bars(Array.from({ length: 30 }, (_, i) => (i % 2 ? 110 : 100)));
    expect(run(new HistoricalVolatilityIndicator(), swinging)[29]!).toBeGreaterThan(100);
  });

  it('Volume Oscillator is zero for steady volume and positive when it picks up', () => {
    const steady = ohlcBars(Array.from({ length: 30 }, () => ({ o: 1, h: 1, l: 1, c: 1, v: 100 })));
    expect(run(new VolumeOscillatorIndicator(), steady)[29]).toBeCloseTo(0, 9);
    const rising = ohlcBars(Array.from({ length: 30 }, (_, i) => ({ o: 1, h: 1, l: 1, c: 1, v: 100 + i * 10 })));
    expect(run(new VolumeOscillatorIndicator(), rising)[29]!).toBeGreaterThan(0);
  });

  it('Ulcer Index is zero without drawdowns and positive after a fall', () => {
    expect(run(new UlcerIndexIndicator(), ramp(40))[39]).toBe(0);
    const fall = bars([...Array.from({ length: 20 }, () => 100), ...Array.from({ length: 20 }, () => 90)]);
    const out = run(new UlcerIndexIndicator(), fall, { period: 14 });
    expect(out[25]).toBeUndefined(); // needs 2·14 − 1 closes
    expect(out[30]!).toBeGreaterThan(0);
  });
});
