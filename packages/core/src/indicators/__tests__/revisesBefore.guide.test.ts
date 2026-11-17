import { describe, it, expect } from 'vitest';
import type { DataSeries, IndicatorConfig, IndicatorDescriptor, IndicatorOutput, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import { IndicatorBase } from '../IndicatorBase.js';
import { IndicatorValueMap } from '../IndicatorValueMap.js';
import { IndicatorEngine } from '../IndicatorEngine.js';

// The pattern the custom-indicator guide teaches (skills/tradecanvas/references/recipes.md,
// "Live ticks"): `from` is the first bar that changed, and an update that can change bars
// before it rewrites them itself; `revisesBefore` only tells the readers of its line.

const STRENGTH = 2;

/** A swing high, as the guide writes it; `rewindsItself` false updates from `from` alone. */
class SwingHighs extends IndicatorBase {
  descriptor: IndicatorDescriptor = {
    id: 'swingHighs', name: 'Swing Highs', placement: 'overlay', defaultConfig: { strength: STRENGTH },
    plots: [{ key: 'high', title: 'Swing high', color: 0, kind: 'markers', position: 'aboveBar' }],
  };

  constructor(private readonly rewindsItself: boolean) { super(); }

  private point(data: DataSeries, i: number, n: number): IndicatorValue | null {
    if (i < n || i + n >= data.length) return null;
    for (let k = 1; k <= n; k++) {
      if (data[i - k].high >= data[i].high || data[i + k].high > data[i].high) return null;
    }
    return { high: data[i].high };
  }

  calculate(data: DataSeries, config: IndicatorConfig): IndicatorOutput {
    const n = Number(config.params.strength);
    const out: IndicatorOutput = { values: new IndicatorValueMap(), series: new Array(data.length).fill(null) };
    for (let i = 0; i < data.length; i++) this.writePoint(out, data, i, this.point(data, i, n));
    return out;
  }

  revisesBefore(config: IndicatorConfig): number {
    return Number(config.params.strength);
  }

  update(data: DataSeries, config: IndicatorConfig, prev: IndicatorOutput, from: number): IndicatorOutput | null {
    if (!this.canResume(data, prev, from)) return null;
    const n = Number(config.params.strength);
    const start = this.rewindsItself ? Math.max(0, from - n) : from;
    for (let i = start; i < data.length; i++) this.writePoint(prev, data, i, this.point(data, i, n));
    return prev;
  }
}

// Highs that rise to a peak at bar 5 and fall away after it.
const HIGHS = [10, 11, 12, 13, 14, 20, 14, 13, 12, 11];
const bars: OHLCBar[] = HIGHS.map((high, i) => ({ time: i * 60_000, open: high - 1, high, low: high - 2, close: high - 1, volume: 1 }));

/** The swing highs found when the bars come one at a time, as live ticks bring them. */
function liveHighs(plugin: SwingHighs): number[] {
  const engine = new IndicatorEngine();
  engine.register(plugin);
  const start = 4;
  const id = engine.addIndicator('swingHighs', {}, bars.slice(0, start));
  for (let n = start + 1; n <= bars.length; n++) engine.recalculateFrom(bars.slice(0, n), n - 1);
  const series = engine.getOutput(id)?.series ?? [];
  return series.flatMap((v, i) => (v?.high !== undefined ? [i] : []));
}

describe('an update that a new bar decides earlier bars for', () => {
  it('gives what calculate gives when it rewrites back from `from - revisesBefore` itself', () => {
    const full = new SwingHighs(true).calculate(bars, { id: 'swingHighs', instanceId: 'x', params: { strength: STRENGTH } });
    expect(full.series!.flatMap((v, i) => (v ? [i] : []))).toEqual([5]);
    expect(liveHighs(new SwingHighs(true))).toEqual([5]);
  });

  it('misses the swing when it updates from `from` alone: the chart does not move `from` back for it', () => {
    expect(liveHighs(new SwingHighs(false))).toEqual([]);
  });
});
