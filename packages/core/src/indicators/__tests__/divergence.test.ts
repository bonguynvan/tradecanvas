import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { detectDivergences } from '../panel/detectDivergences.js';
import { RSIDivergenceIndicator } from '../panel/RSIDivergence.js';

/** Bars whose lows and highs are given; the rest sits between and says nothing here. */
const bars = (lows: number[], highs: number[] = lows.map((l) => l + 10)): OHLCBar[] =>
  lows.map((low, i) => ({ time: i * 60_000, open: (low + highs[i]) / 2, high: highs[i], low, close: (low + highs[i]) / 2, volume: 1 }));

/** A line with a trough at each of `at`, as deep as given: 50 elsewhere, sloping to the trough two bars each way. */
function withTroughs(length: number, troughs: [number, number][]): number[] {
  const line = new Array<number>(length).fill(50);
  for (const [at, value] of troughs) {
    line[at] = value;
    for (const d of [1, 2]) {
      const part = value + ((50 - value) * d) / 3;
      if (at - d >= 0) line[at - d] = Math.min(line[at - d], part);
      if (at + d < length) line[at + d] = Math.min(line[at + d], part);
    }
  }
  return line;
}
const flip = (line: number[]): number[] => line.map((v) => 100 - v);

const OPTIONS = { left: 2, right: 2, minBars: 3, maxBars: 30 };

describe('detectDivergences', () => {
  it('finds a bullish one: the price makes a lower low where the line makes a higher one', () => {
    const osc = withTroughs(30, [[8, 20], [18, 30]]);
    const lows = withTroughs(30, [[8, 40], [18, 35]]);
    expect(detectDivergences(bars(lows), osc, OPTIONS)).toEqual([
      { kind: 'bullish', hidden: false, from: 8, to: 18, confirmed: 20, valueFrom: 20, valueTo: 30, priceFrom: 40, priceTo: 35 },
    ]);
  });

  it('finds a bearish one: the price makes a higher high where the line makes a lower one', () => {
    const osc = flip(withTroughs(30, [[8, 20], [18, 30]]));
    const highs = flip(withTroughs(30, [[8, 40], [18, 35]]));
    const found = detectDivergences(bars(highs.map((h) => h - 10), highs), osc, OPTIONS);
    expect(found).toEqual([
      { kind: 'bearish', hidden: false, from: 8, to: 18, confirmed: 20, valueFrom: 80, valueTo: 70, priceFrom: 60, priceTo: 65 },
    ]);
  });

  it('finds none where the two agree, or where the turns are too near or too far apart', () => {
    const osc = withTroughs(60, [[8, 20], [18, 30]]);
    // The price makes a higher low too: both rise, no divergence.
    expect(detectDivergences(bars(withTroughs(60, [[8, 35], [18, 40]])), osc, OPTIONS)).toEqual([]);
    const lower = bars(withTroughs(60, [[8, 40], [18, 35]]));
    expect(detectDivergences(lower, osc, { ...OPTIONS, minBars: 11 })).toEqual([]);
    expect(detectDivergences(lower, osc, { ...OPTIONS, maxBars: 9 })).toEqual([]);
    expect(detectDivergences([], [], OPTIONS)).toEqual([]);
  });

  it('finds the hidden ones only when asked: the price holds higher where the line goes lower', () => {
    const osc = withTroughs(30, [[8, 30], [18, 20]]);
    const data = bars(withTroughs(30, [[8, 35], [18, 40]]));
    expect(detectDivergences(data, osc, OPTIONS)).toEqual([]);
    expect(detectDivergences(data, osc, { ...OPTIONS, hidden: true })).toEqual([
      { kind: 'bullish', hidden: true, from: 8, to: 18, confirmed: 20, valueFrom: 30, valueTo: 20, priceFrom: 35, priceTo: 40 },
    ]);
  });

  it('knows a turn only once the bars to its right are in: not before', () => {
    const osc = withTroughs(30, [[8, 20], [18, 30]]);
    const data = bars(withTroughs(30, [[8, 40], [18, 35]]));
    // Up to bar 19 the second trough has one bar to its right: not yet a turn.
    expect(detectDivergences(data.slice(0, 20), osc.slice(0, 20), OPTIONS)).toEqual([]);
    expect(detectDivergences(data.slice(0, 21), osc.slice(0, 21), OPTIONS)).toHaveLength(1);
  });

  it('takes a line with gaps: a bar with no value is no turn and ends none', () => {
    const osc: (number | null)[] = withTroughs(30, [[8, 20], [18, 30]]);
    osc[0] = null;
    osc[1] = null;
    const data = bars(withTroughs(30, [[8, 40], [18, 35]]));
    expect(detectDivergences(data, osc, OPTIONS)).toHaveLength(1);
    osc[17] = null;
    expect(detectDivergences(data, osc, OPTIONS)).toEqual([]);
  });
});

describe('the RSI Divergence indicator', () => {
  /** A seeded walk: the same closes every run. */
  function walk(n: number): OHLCBar[] {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let close = 100;
    return Array.from({ length: n }, (_, i) => {
      const open = close;
      close = Math.max(1, open + (rand() - 0.5) * 4);
      return { time: i * 60_000, open, high: Math.max(open, close) + rand(), low: Math.min(open, close) - rand(), close, volume: 1 };
    });
  }
  const config = { id: 'rsidiv', params: {} } as never;

  it('is the RSI with its divergences: the line, a mark at each divergence’s second turn, and the list for drawing', () => {
    const indicator = new RSIDivergenceIndicator();
    expect(indicator.descriptor).toMatchObject({ id: 'rsidiv', placement: 'panel', levels: [30, 70] });
    expect(indicator.descriptor.plots!.map((p) => p.key)).toEqual(['value', 'bull', 'bear']);
    const data = walk(600);
    const out = indicator.calculate(data, config);
    const found = out.meta!.divergences as { kind: string; to: number; valueTo: number }[];
    expect(found.length).toBeGreaterThan(2);
    for (const d of found) {
      const point = out.series![d.to]!;
      expect(point[d.kind === 'bullish' ? 'bull' : 'bear']).toBe(d.valueTo);
      expect(point.value).toBe(d.valueTo);
    }
    // Every bar's mark is one of the list's.
    const marked = out.series!.filter((p) => p && (p.bull !== undefined || p.bear !== undefined)).length;
    expect(marked).toBe(new Set(found.map((d) => d.to)).size);
  });

  it('goes on from a tick to what a whole reckoning gives', () => {
    const indicator = new RSIDivergenceIndicator();
    const data = walk(400);
    const snapshot = (out: { meta?: Record<string, unknown>; series?: unknown; values: Map<number, unknown> }) =>
      ({ divergences: out.meta!.divergences, series: out.series, values: [...out.values].sort((a, b) => a[0] - b[0]) });
    let out = indicator.calculate(data.slice(0, 300), config);
    for (let n = 301; n <= 400; n++) {
      const series = data.slice(0, n);
      // A new bar (the bar before it back where it was, having been moved), then the new bar moved: its close pulled half way back.
      const moved = [...series.slice(0, -1), { ...series[n - 1], close: (series[n - 1].close + series[n - 2].close) / 2 }];
      for (const [step, from] of [[series, n - 2], [moved, n - 1]] as [OHLCBar[], number][]) {
        const next = indicator.update!(step, config, out, from);
        expect(next).not.toBeNull();
        out = next!;
        expect(snapshot(out)).toEqual(snapshot(new RSIDivergenceIndicator().calculate(step, config)));
      }
    }
  });
});
