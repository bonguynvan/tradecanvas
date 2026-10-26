import { describe, it, expect } from 'vitest';
import type { IndicatorPlugin, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { indicatorSource } from '@tradecanvas/commons';
import { IndicatorEngine } from '../IndicatorEngine.js';
import { registerBuiltInIndicators } from '../registry.js';

function bars(n: number): OHLCBar[] {
  return Array.from({ length: n }, (_, i) => ({ time: i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 0 }));
}

/** A fake overlay plugin whose output.value at bar index i is just i — makes range assertions trivial. */
function fakeOverlayPlugin(id: string): IndicatorPlugin {
  return {
    descriptor: { id, name: id, placement: 'overlay', defaultConfig: {} },
    calculate(data) {
      const values = new Map<number, IndicatorValue>();
      const series: (IndicatorValue | null)[] = data.map((bar, i) => {
        const v = { value: i };
        values.set(bar.time, v);
        return v;
      });
      return { values, series };
    },
    render() {},
  };
}

/** A panel plugin (should be excluded from getOverlayPriceRange). */
function fakePanelPlugin(id: string): IndicatorPlugin {
  const overlay = fakeOverlayPlugin(id);
  return { ...overlay, descriptor: { ...overlay.descriptor, placement: 'panel' } };
}

describe('IndicatorEngine.getOverlayPriceRange', () => {
  it('only reflects values within [from, to], not the whole series', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('fake'));
    const data = bars(1000);
    engine.addIndicator('fake', {}, data);

    // Full series spans 0..999; windowing to [10, 20] should exclude 0 and 999.
    const range = engine.getOverlayPriceRange(10, 20);
    expect(range).toEqual({ min: 10, max: 20 });
  });

  it('ignores panel-placement indicators', () => {
    const engine = new IndicatorEngine();
    engine.register(fakePanelPlugin('panelOnly'));
    engine.addIndicator('panelOnly', {}, bars(50));

    expect(engine.getOverlayPriceRange(0, 49)).toBeNull();
  });

  it('ignores hidden indicators', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('fake'));
    const instanceId = engine.addIndicator('fake', {}, bars(50));
    engine.setVisible(instanceId, false);

    expect(engine.getOverlayPriceRange(0, 49)).toBeNull();
  });

  it('combines the min/max across multiple active overlays', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('a'));
    engine.register(fakeOverlayPlugin('b'));
    const data = bars(30);
    engine.addIndicator('a', {}, data);
    engine.addIndicator('b', {}, data);

    const range = engine.getOverlayPriceRange(5, 15);
    expect(range).toEqual({ min: 5, max: 15 });
  });

  it('returns null when nothing is registered', () => {
    const engine = new IndicatorEngine();
    expect(engine.getOverlayPriceRange(0, 10)).toBeNull();
  });
});

describe('IndicatorEngine colours', () => {
  it('gives each new line in the price pane a colour no line there has', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('ema'));
    engine.register(fakeOverlayPlugin('sma'));
    const first = engine.addIndicator('ema', {}, bars(5));
    const other = engine.addIndicator('sma', {}, bars(5));
    const second = engine.addIndicator('ema', {}, bars(5));
    const colour = (id: string) => engine.getIndicatorStyle(id)!.colors[0];
    expect(new Set([colour(first), colour(other), colour(second)]).size).toBe(3);
    expect(engine.getIndicatorStyle(second)!.colors).toHaveLength(engine.getIndicatorStyle(first)!.colors.length);
  });

  it('keeps the usual colour for a pane indicator in a pane of its own', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('ema'));
    engine.register(fakePanelPlugin('rsi'));
    const ema = engine.addIndicator('ema', {}, bars(5));
    const rsi = engine.addIndicator('rsi', {}, bars(5));
    expect(engine.getIndicatorStyle(rsi)!.colors[0]).toBe(engine.getIndicatorStyle(ema)!.colors[0]);
  });

  it('recolours a line moved into a pane where its colour is taken, unless it was chosen', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('sma'));
    engine.register(fakePanelPlugin('rsi'));
    const rsi = engine.addIndicator('rsi', {}, bars(5));
    const sma = engine.addIndicator('sma', {}, bars(5));
    const colour = (id: string) => engine.getIndicatorStyle(id)!.colors[0];
    expect(colour(sma)).toBe(colour(rsi)); // different panes
    engine.setPane(sma, rsi);
    expect(colour(sma)).not.toBe(colour(rsi));

    const chosen = engine.addIndicator('sma', {}, bars(5));
    engine.updateIndicatorStyle(chosen, { colors: [colour(rsi)] });
    engine.setPane(chosen, rsi);
    expect(colour(chosen)).toBe(colour(rsi)); // someone's choice stays
  });

  it('gives a new instance a colour no remaining instance uses', () => {
    const engine = new IndicatorEngine();
    engine.register(fakeOverlayPlugin('ema'));
    const first = engine.addIndicator('ema', {}, bars(5));
    const second = engine.addIndicator('ema', {}, bars(5));
    const colour = (id: string) => engine.getIndicatorStyle(id)!.colors[0];
    const usual = colour(first);
    engine.removeIndicator(first);
    const third = engine.addIndicator('ema', {}, bars(5));
    expect(colour(third)).not.toBe(colour(second)); // not two lines in one colour
    expect(colour(third)).toBe(usual); // the freed colour comes back
  });
});

describe('IndicatorEngine.deferRecalculateFrom', () => {
  /** A plugin that counts its calculations; its value is the close. */
  function counting() {
    const counts = { calculate: 0 };
    const plugin: IndicatorPlugin = {
      descriptor: { id: 'close', name: 'close', placement: 'panel', defaultConfig: {} },
      calculate(data) {
        counts.calculate++;
        const values = new Map<number, IndicatorValue>();
        const series = data.map((bar) => {
          const v = { value: bar.close };
          values.set(bar.time, v);
          return v;
        });
        return { values, series };
      },
      render() {},
    };
    return { plugin, counts };
  }

  it('makes many ticks before a read one calculation, and the read sees the last tick', () => {
    const { plugin, counts } = counting();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    const data = bars(50);
    const id = engine.addIndicator('close', {}, data);
    counts.calculate = 0;
    for (let tick = 1; tick <= 5; tick++) {
      data[49] = { ...data[49], close: tick };
      engine.deferRecalculateFrom(data, 49);
    }
    expect(counts.calculate).toBe(0);
    expect(engine.getOutput(id)!.series[49]?.value).toBe(5);
    expect(counts.calculate).toBe(1);
    // Read again: nothing left to do.
    engine.getOutput(id);
    expect(counts.calculate).toBe(1);
  });

  it('takes the earliest bar of the ticks that came, and a full recalculation drops what was waiting', () => {
    const { plugin, counts } = counting();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    const data = bars(50);
    const id = engine.addIndicator('close', {}, data);
    data[48] = { ...data[48], close: 7 };
    engine.deferRecalculateFrom(data, 49);
    engine.deferRecalculateFrom(data, 48);
    expect(engine.getOutput(id)!.series[48]?.value).toBe(7);
    counts.calculate = 0;
    engine.deferRecalculateFrom(data, 49);
    engine.recalculateAll(data);
    engine.getOutput(id);
    expect(counts.calculate).toBe(1);
  });
});

describe('IndicatorEngine.setExchangeTimeZone', () => {
  /** A plugin that keeps the zone each computation was given. */
  function zoneProbe() {
    const zones: (string | undefined)[] = [];
    const plugin: IndicatorPlugin = {
      descriptor: { id: 'zone', name: 'zone', placement: 'overlay', defaultConfig: {} },
      calculate(data, config) {
        zones.push(config.exchangeTimeZone);
        return { values: new Map(), series: data.map(() => null) };
      },
      render() {},
    };
    return { plugin, zones };
  }

  it('gives every instance, and every new one, config.exchangeTimeZone', () => {
    const { plugin, zones } = zoneProbe();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    const data = bars(10);
    engine.addIndicator('zone', {}, data);
    expect(engine.setExchangeTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    engine.recalculateAll(data);
    engine.addIndicator('zone', {}, data);
    expect(zones).toEqual([undefined, 'Asia/Ho_Chi_Minh', 'Asia/Ho_Chi_Minh']);
  });

  it('says whether the zone changed, and null takes it away', () => {
    const { plugin, zones } = zoneProbe();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    const data = bars(10);
    engine.addIndicator('zone', {}, data);
    expect(engine.setExchangeTimeZone('America/New_York')).toBe(true);
    expect(engine.setExchangeTimeZone('America/New_York')).toBe(false);
    expect(engine.setExchangeTimeZone(null)).toBe(true);
    engine.recalculateAll(data);
    expect(zones.at(-1)).toBeUndefined();
  });

  it('takes a zone the browser does not know as none', () => {
    const { plugin, zones } = zoneProbe();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    expect(engine.setExchangeTimeZone('Mars/Olympus_Mons')).toBe(false);
    engine.addIndicator('zone', {}, bars(10));
    expect(zones).toEqual([undefined]);
  });

  it('takes UTC as none, so a UTC symbol after none or after another computes nothing again', () => {
    // Every crypto feed names UTC, and a symbol switch passes through none on its way back to it.
    const { plugin, zones } = zoneProbe();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    expect(engine.setExchangeTimeZone('UTC')).toBe(false);
    expect(engine.setExchangeTimeZone('Etc/UTC')).toBe(false);
    engine.addIndicator('zone', {}, bars(10));
    expect(zones).toEqual([undefined]);
    expect(engine.setExchangeTimeZone('Asia/Tokyo')).toBe(true);
    expect(engine.setExchangeTimeZone('UTC')).toBe(true);
    expect(engine.setExchangeTimeZone(null)).toBe(false);
  });

  it('keeps the zone out of the parameters a layout saves', () => {
    const { plugin } = zoneProbe();
    const engine = new IndicatorEngine();
    engine.register(plugin);
    engine.setExchangeTimeZone('Asia/Tokyo');
    engine.addIndicator('zone', { length: 3 }, bars(10));
    expect(engine.getActiveIndicators()[0].params).toEqual({ length: 3 });
  });
});

/**
 * A correction replaces a bar in the middle of the series, and the chart
 * computes the indicators again from it on (`recalculateFrom`), each one
 * resuming from its state at the bar before, or computing in full.
 */
describe('IndicatorEngine.recalculateFrom a corrected bar in the middle', () => {
  const HOUR = 3_600_000;
  const T0 = Date.UTC(2026, 0, 5, 13);
  const wave = (n: number): OHLCBar[] => Array.from({ length: n }, (_, i) => {
    const close = 100 + Math.sin(i / 5) * 8 + (i % 11) / 3;
    return { time: T0 + i * HOUR, open: 100, high: Math.max(100, close) + 1, low: Math.min(100, close) - 1, close, volume: 5 + (i % 13) };
  });
  /** The bars with bar `k` corrected: a lower close, a wider range, more volume. */
  const corrected = (bars: OHLCBar[], k: number): OHLCBar[] => {
    const out = bars.slice();
    out[k] = { ...bars[k], close: bars[k].close - 6, low: bars[k].low - 6, high: bars[k].high + 3, volume: bars[k].volume + 9 };
    return out;
  };
  /** Outputs to compare: floats to 9 digits, as two orders of the same sums differ further down. */
  const same = (engine: IndicatorEngine, id: string) =>
    JSON.stringify(engine.getOutput(id)?.series ?? null, (_, v) => (typeof v === 'number' ? Number(v.toPrecision(9)) : v));
  const builtIns = (() => {
    const engine = new IndicatorEngine();
    registerBuiltInIndicators(engine);
    return engine.getAvailableIndicators().map((d) => d.id);
  })();

  it.each([0.5, 0.98])('matches a full recalculation for every built-in (bar at %f of the series)', (where) => {
    const bars = wave(400);
    const k = Math.floor(bars.length * where);
    const live = new IndicatorEngine();
    registerBuiltInIndicators(live);
    const ids = builtIns.map((id) => [id, live.addIndicator(id, {}, bars)] as const);
    const data = corrected(bars, k);
    live.recalculateFrom(data, k);
    const oracle = new IndicatorEngine();
    registerBuiltInIndicators(oracle);
    for (const [id, instance] of ids) {
      const fresh = oracle.addIndicator(id, {}, data);
      expect(same(live, instance), id).toBe(same(oracle, fresh));
    }
    expect(ids.length).toBeGreaterThan(60);
  });

  it.each([0.2, 0.5, 0.9, 0.98])('matches a full recalculation for line-source chains and price sources (bar at %f)', (where) => {
    const build = (engine: IndicatorEngine, data: OHLCBar[]) => {
      const rsi = engine.addIndicator('rsi', { period: 14 }, data);
      const zigzag = engine.addIndicator('zigzag', {}, data);
      const fractals = engine.addIndicator('fractals', {}, data);
      const emaOnRsi = engine.addIndicator('ema', { period: 9, source: indicatorSource(rsi, 'value') }, data);
      const smaOnPivots = engine.addIndicator('sma', { period: 5, source: indicatorSource(zigzag, 'pivot') }, data);
      const emaHl2 = engine.addIndicator('ema', { period: 7, source: 'hl2' }, data);
      const bandsOnEma = engine.addIndicator('bb', { period: 10, source: indicatorSource(emaHl2, 'value') }, data);
      return { rsi, zigzag, fractals, emaOnRsi, smaOnPivots, emaHl2, bandsOnEma };
    };
    const bars = wave(400);
    const k = Math.floor(bars.length * where);
    const live = new IndicatorEngine();
    registerBuiltInIndicators(live);
    const ids = build(live, bars);
    const data = corrected(bars, k);
    live.recalculateFrom(data, k);
    const oracle = new IndicatorEngine();
    registerBuiltInIndicators(oracle);
    const fresh = build(oracle, data);
    // A wrong line key would compare two empty lines.
    expect(live.getOutput(ids.emaOnRsi)?.series.some((v) => v && Number.isFinite(v.value))).toBe(true);
    expect(live.getOutput(ids.smaOnPivots)?.series.some((v) => v && Number.isFinite(v.value))).toBe(true);
    for (const key of Object.keys(ids) as (keyof typeof ids)[]) {
      expect(same(live, ids[key]), key).toBe(same(oracle, fresh[key]));
    }
  });
});
