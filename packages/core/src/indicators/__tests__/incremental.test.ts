import { describe, it, expect } from 'vitest';
import type { IndicatorOutput, IndicatorPlugin, OHLCBar } from '@tradecanvas/commons';
import { indicatorConfig } from './fixtures.js';
import { SMAIndicator } from '../overlay/SMA.js';
import { EMAIndicator } from '../overlay/EMA.js';
import { BollingerBandsIndicator } from '../overlay/BollingerBands.js';
import { WMAIndicator } from '../overlay/WMA.js';
import { VWMAIndicator } from '../overlay/VWMA.js';
import { EnvelopeIndicator } from '../overlay/Envelope.js';
import { RSIIndicator } from '../panel/RSI.js';
import { MACDIndicator } from '../panel/MACD.js';
import { ATRIndicator } from '../panel/ATR.js';
import { OBVIndicator } from '../panel/OBV.js';
import { StochasticIndicator } from '../panel/Stochastic.js';
import { IndicatorEngine } from '../IndicatorEngine.js';

/** Deterministic random walk so failures are reproducible. */
function makeBars(n: number, seed = 7): OHLCBar[] {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const bars: OHLCBar[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const open = price;
    const close = open * (1 + (rnd() - 0.5) * 0.02);
    bars.push({
      time: 1_700_000_000_000 + i * 60_000,
      open,
      close,
      high: Math.max(open, close) * (1 + rnd() * 0.005),
      low: Math.min(open, close) * (1 - rnd() * 0.005),
      volume: 10 + rnd() * 1000,
    });
    price = close;
  }
  return bars;
}

/** A forming bar's next tick: same time, new close/high/low/volume. */
function tick(bar: OHLCBar, factor: number): OHLCBar {
  const close = bar.close * factor;
  return {
    ...bar,
    close,
    high: Math.max(bar.high, close),
    low: Math.min(bar.low, close),
    volume: bar.volume + 25,
  };
}

function expectSameOutput(actual: IndicatorOutput, expected: IndicatorOutput): void {
  const a = actual.series!;
  const e = expected.series!;
  expect(a.length).toBe(e.length);
  for (let i = 0; i < e.length; i++) {
    const ev = e[i];
    const av = a[i];
    if (!ev) {
      expect(av ?? null, `bar ${i} should be empty`).toBeNull();
      continue;
    }
    expect(av, `bar ${i} should have a value`).toBeTruthy();
    expect(Object.keys(av!).sort()).toEqual(Object.keys(ev).sort());
    for (const key of Object.keys(ev)) {
      const x = av![key]!;
      const y = ev[key]!;
      expect(Math.abs(x - y), `bar ${i} key ${key}: ${x} vs ${y}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(y)));
    }
  }
  expect(actual.values.size).toBe(expected.values.size);
  for (const t of expected.values.keys()) expect(actual.values.has(t)).toBe(true);
}

/** What the engine does: incremental when the plugin can, full otherwise. */
function updateOrRecalc(
  plugin: IndicatorPlugin,
  data: OHLCBar[],
  config: ReturnType<typeof indicatorConfig>,
  prev: IndicatorOutput,
  from: number,
): IndicatorOutput {
  return plugin.update?.(data, config, prev, from) ?? plugin.calculate(data, config);
}

const CASES: [string, IndicatorPlugin, Record<string, number>][] = [
  ['sma', new SMAIndicator(), { period: 20 }],
  ['ema', new EMAIndicator(), { period: 20 }],
  ['bb', new BollingerBandsIndicator(), { period: 20, stdDev: 2 }],
  ['wma', new WMAIndicator(), { period: 15 }],
  ['vwma', new VWMAIndicator(), { period: 15 }],
  ['envelope', new EnvelopeIndicator(), { period: 20, percent: 2.5 }],
  ['rsi', new RSIIndicator(), { period: 14 }],
  ['macd', new MACDIndicator(), { fast: 12, slow: 26, signal: 9 }],
  ['atr', new ATRIndicator(), { period: 14 }],
  ['obv', new OBVIndicator(), {}],
  ['stochastic', new StochasticIndicator(), { kPeriod: 14, dPeriod: 3, smooth: 3 }],
];

describe.each(CASES)('%s incremental update', (id, plugin, params) => {
  const config = indicatorConfig(id, params);

  it('implements update()', () => {
    expect(typeof plugin.update).toBe('function');
  });

  it('a live tick on the last bar matches a full recalculation', () => {
    const bars = makeBars(300);
    const prev = plugin.calculate(bars, config);
    const ticked = [...bars];
    ticked[ticked.length - 1] = tick(bars[bars.length - 1], 1.013);

    const out = plugin.update!(ticked, config, prev, ticked.length - 1);
    expect(out, 'should resume incrementally, not decline').not.toBeNull();
    expectSameOutput(out!, plugin.calculate(ticked, config));
  });

  it('many successive ticks stay in sync with a full recalculation', () => {
    let bars = makeBars(300);
    let out = plugin.calculate(bars, config);
    for (const f of [1.002, 0.995, 1.01, 0.98, 1.004, 1.0]) {
      bars = [...bars];
      bars[bars.length - 1] = tick(bars[bars.length - 1], f);
      out = updateOrRecalc(plugin, bars, config, out, bars.length - 1);
    }
    expectSameOutput(out, plugin.calculate(bars, config));
  });

  it('a bar close (re-finalised last bar + one new bar) matches a full recalculation', () => {
    const all = makeBars(301);
    const before = all.slice(0, 300);
    const prev = plugin.calculate(before, config);
    // The bar that just closed finalises at a slightly different close than its last tick.
    const after = [...all];
    after[299] = tick(all[299], 0.997);

    const out = plugin.update!(after, config, prev, after.length - 2);
    expect(out).not.toBeNull();
    expectSameOutput(out!, plugin.calculate(after, config));
  });

  it('appending several bars at once (reconnect catch-up) matches a full recalculation', () => {
    const all = makeBars(320);
    const before = all.slice(0, 300);
    const prev = plugin.calculate(before, config);
    const out = updateOrRecalc(plugin, all, config, prev, before.length - 1);
    expectSameOutput(out, plugin.calculate(all, config));
  });

  it('declines (falls back) when the replaced last bar has a different time', () => {
    const bars = makeBars(300);
    const prev = plugin.calculate(bars, config);
    const moved = [...bars];
    moved[moved.length - 1] = { ...bars[bars.length - 1], time: bars[bars.length - 1].time + 1 };
    expect(plugin.update!(moved, config, prev, moved.length - 1)).toBeNull();
  });

  it('declines when asked to resume past the end of its previous output', () => {
    const bars = makeBars(300);
    const prev = plugin.calculate(bars.slice(0, 100), config);
    expect(plugin.update!(bars, config, prev, 250)).toBeNull();
  });

  it('stays correct on short series still inside the warm-up window', () => {
    const bars = makeBars(12);
    const prev = plugin.calculate(bars, config);
    const ticked = [...bars];
    ticked[ticked.length - 1] = tick(bars[bars.length - 1], 1.02);
    const out = updateOrRecalc(plugin, ticked, config, prev, ticked.length - 1);
    expectSameOutput(out, plugin.calculate(ticked, config));
  });
});

describe('IndicatorEngine.recalculateFrom', () => {
  it('uses update() when available and keeps outputs equal to a full recalculation', () => {
    const engine = new IndicatorEngine();
    engine.register(new EMAIndicator());
    engine.register(new RSIIndicator());
    const bars = makeBars(400);
    const ema = engine.addIndicator('ema', { period: 20 }, bars);
    const rsi = engine.addIndicator('rsi', { period: 14 }, bars);
    const emaBefore = engine.getOutput(ema);

    const ticked = [...bars];
    ticked[ticked.length - 1] = tick(bars[bars.length - 1], 1.01);
    engine.recalculateFrom(ticked, ticked.length - 1);

    // Updated in place rather than rebuilt from scratch.
    expect(engine.getOutput(ema)).toBe(emaBefore);
    expectSameOutput(engine.getOutput(ema)!, new EMAIndicator().calculate(ticked, indicatorConfig('ema', { period: 20 })));
    expectSameOutput(engine.getOutput(rsi)!, new RSIIndicator().calculate(ticked, indicatorConfig('rsi', { period: 14 })));
  });

  it('falls back to calculate() for plugins without update()', () => {
    const engine = new IndicatorEngine();
    let calls = 0;
    engine.register({
      descriptor: { id: 'plain', name: 'plain', placement: 'overlay', defaultConfig: {} },
      calculate(data) {
        calls++;
        return { values: new Map(), series: data.map(() => null) };
      },
      render() {},
    });
    const bars = makeBars(50);
    engine.addIndicator('plain', {}, bars);
    calls = 0;
    engine.recalculateFrom(bars, bars.length - 1);
    expect(calls).toBe(1);
  });

  it('does a full recalculation when from <= 0', () => {
    const engine = new IndicatorEngine();
    engine.register(new EMAIndicator());
    const bars = makeBars(100);
    const id = engine.addIndicator('ema', { period: 10 }, bars);
    const before = engine.getOutput(id);
    engine.recalculateFrom(bars, 0);
    expect(engine.getOutput(id)).not.toBe(before);
  });
});
