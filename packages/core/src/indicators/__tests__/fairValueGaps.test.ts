import { describe, it, expect } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { detectFairValueGaps } from '../overlay/detectFairValueGaps.js';
import { FairValueGapsIndicator } from '../overlay/FairValueGaps.js';

/** Bars from [high, low] pairs: the open and close sit inside, and say nothing here. */
const bars = (ranges: [number, number][]): OHLCBar[] =>
  ranges.map(([high, low], i) => ({ time: i * 60_000, open: (high + low) / 2, high, low, close: (high + low) / 2, volume: 1 }));

describe('detectFairValueGaps', () => {
  it('finds the room three bars leave between the first one’s high and the third one’s low', () => {
    // Bar 1 runs up so far that bar 2's low is over bar 0's high: 102 to 104 was traded by bar 1 alone.
    const gaps = detectFairValueGaps(bars([[102, 100], [108, 101], [110, 104]]));
    expect(gaps).toEqual([{ index: 1, formed: 2, direction: 'up', top: 104, bottom: 102, filledAt: null }]);
  });

  it('finds the same going down: the first bar’s low over the third one’s high', () => {
    const gaps = detectFairValueGaps(bars([[110, 108], [109, 101], [104, 100]]));
    expect(gaps).toEqual([{ index: 1, formed: 2, direction: 'down', top: 108, bottom: 104, filledAt: null }]);
  });

  it('finds none where the first and the third bar overlap or touch', () => {
    expect(detectFairValueGaps(bars([[102, 100], [108, 101], [110, 102]]))).toEqual([]);
    expect(detectFairValueGaps(bars([[102, 100], [108, 101], [110, 101.5]]))).toEqual([]);
    expect(detectFairValueGaps(bars([[102, 100], [103, 101]]))).toEqual([]);
    expect(detectFairValueGaps([])).toEqual([]);
  });

  it('says where a gap was filled: the first bar after it to trade through all of it', () => {
    // The gap 102–104 forms at bar 2. Bar 3 comes back into it (103) and leaves it open; bar 4 trades to 102.
    const gaps = detectFairValueGaps(bars([[102, 100], [108, 101], [110, 104], [109, 103], [106, 102], [107, 105]]));
    expect(gaps).toHaveLength(1);
    expect(gaps[0].filledAt).toBe(4);
    // Going down: filled by a high at its top.
    const down = detectFairValueGaps(bars([[110, 108], [109, 101], [104, 100], [107, 102], [108.5, 103]]));
    expect(down[0].filledAt).toBe(4);
  });

  it('leaves out the gaps smaller than a part of the price, where one is asked for', () => {
    const data = bars([[102, 100], [108, 101], [110, 104], [112, 105], [140, 106], [150, 120]]);
    // Two gaps going up: 102–104 (under 2% of its price) and 112–120 (about 7%).
    expect(detectFairValueGaps(data).map((g) => [g.bottom, g.top])).toEqual([[102, 104], [112, 120]]);
    expect(detectFairValueGaps(data, { minPercent: 5 }).map((g) => [g.bottom, g.top])).toEqual([[112, 120]]);
  });

  it('takes bars that are not numbers for no bars: no gap is made of them', () => {
    const data = bars([[102, 100], [108, 101], [110, 104]]);
    data[1] = { ...data[1], high: Number.NaN };
    expect(detectFairValueGaps(data)).toHaveLength(1);
    data[0] = { ...data[0], high: Number.NaN };
    expect(detectFairValueGaps(data)).toEqual([]);
  });
});

describe('fair value gaps on a long history', () => {
  /** A climb where every three bars leave a gap and none is filled: the open gaps grow with the series. */
  const climb = (n: number): OHLCBar[] => bars(Array.from({ length: n }, (_, i) => [100 + i * 3 + 1, 100 + i * 3] as [number, number]));

  it('finds the gaps of 50,000 climbing bars, all left open, in well under a second', () => {
    const data = climb(50_000);
    const started = performance.now();
    const gaps = detectFairValueGaps(data);
    const took = performance.now() - started;
    expect(gaps).toHaveLength(49_998);
    expect(gaps.every((g) => g.filledAt === null)).toBe(true);
    expect(took).toBeLessThan(1000);
  });

  it('fills the open gaps a fall passes, the nearest first, each at the bar that reached it', () => {
    // Five gaps up, then bars coming down through them one at a time.
    const data = bars([[101, 100], [104, 103], [107, 106], [110, 109], [113, 112], [116, 115], [119, 118], [118, 114], [117, 108], [116, 100]]);
    const gaps = detectFairValueGaps(data).filter((g) => g.direction === 'up');
    expect(gaps.map((g) => [g.bottom, g.filledAt])).toEqual([[101, 9], [104, 9], [107, 9], [110, 8], [113, 8]]);
  });

  it('goes on from a tick to the same gaps a whole reckoning gives, also when the tick un-fills one', () => {
    const fvg = new FairValueGapsIndicator();
    const config = { id: 'fvg', params: { showFilled: 1 } } as never;
    const data = bars([[102, 100], [108, 101], [110, 104], [109, 103], [106, 102], [107, 105], [112, 106], [118, 111]]);
    const whole = (series: OHLCBar[]) => { const out = fvg.calculate(series, config); return { gaps: out.meta!.gaps, series: out.series, values: [...out.values].sort((a, b) => a[0] - b[0]) }; };
    let out = fvg.calculate(data.slice(0, 5), config);
    // Bars arrive one at a time, then the last bar moves, then bar 4 is corrected so that it no longer fills the first gap.
    const steps: [OHLCBar[], number][] = [
      [data.slice(0, 6), 5], [data.slice(0, 7), 6], [data, 7],
      [[...data.slice(0, 7), { ...data[7], low: 108, high: 119 }], 7],
      [[...data.slice(0, 4), { ...data[4], low: 103 }, ...data.slice(5)], 4],
    ];
    for (const [series, from] of steps) {
      const next = fvg.update!(series, config, out, from);
      expect(next).not.toBeNull();
      out = next!;
      expect({ gaps: out.meta!.gaps, series: out.series, values: [...out.values].sort((a, b) => a[0] - b[0]) }).toEqual(whole(series));
    }
  });
});

describe('the Fair Value Gaps indicator', () => {
  const data = bars([[102, 100], [108, 101], [110, 104], [109, 103], [106, 102], [107, 105]]);

  it('gives each gap at the bar it formed on, its top and bottom by its direction, and all of them for drawing', () => {
    const fvg = new FairValueGapsIndicator();
    const out = fvg.calculate(data, { id: 'fvg', params: {} } as never);
    expect(out.series![2]).toEqual({ bull: 104, bullLow: 102 });
    expect(out.series!.filter(Boolean)).toHaveLength(1);
    expect(out.values.get(data[2].time)).toEqual({ bull: 104, bullLow: 102 });
    expect((out.meta!.gaps as unknown[])).toHaveLength(1);
  });

  it('is an overlay with a plot for each price of a bullish and of a bearish gap, in the patterns’ colours', () => {
    const { descriptor } = new FairValueGapsIndicator();
    expect(descriptor).toMatchObject({ id: 'fvg', placement: 'overlay', defaultConfig: { minPercent: 0, showFilled: 0 } });
    expect(descriptor.plots!.map((p) => p.key)).toEqual(['bull', 'bullLow', 'bear', 'bearLow']);
  });

  it('draws a gap still open to the plot’s right edge, a filled one to the bar that filled it, and no filled one unless asked', () => {
    const fvg = new FairValueGapsIndicator();
    const viewport = {
      visibleRange: { from: 0, to: 5 }, priceRange: { min: 90, max: 120 }, barWidth: 8, barSpacing: 2, offset: 0,
      chartRect: { x: 0, y: 0, width: 400, height: 300 },
    } as never;
    const style = { colors: ['#000', '#111', '#222', '#0a0', '#a00'], lineWidths: [1], opacity: 1, plots: {} } as never;
    const boxes = (params: Record<string, number>, series: OHLCBar[]) => {
      const rects: number[][] = [];
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) => (key in target ? target[key] : key === 'fillRect' ? (...a: number[]) => rects.push(a) : () => {}),
        set: (target, key: string, value) => { target[key] = value; return true; },
      }) as unknown as CanvasRenderingContext2D;
      fvg.render(ctx, fvg.calculate(series, { id: 'fvg', params } as never), viewport, style);
      return rects;
    };
    // Filled at bar 4: nothing by default, a box ending at bar 4 when filled ones are shown.
    expect(boxes({}, data)).toEqual([]);
    const filled = boxes({ showFilled: 1 }, data);
    expect(filled).toHaveLength(1);
    expect(filled[0][0] + filled[0][2]).toBeLessThan(400);
    // Still open (the bars after it stay over it): its box runs to the plot's right edge.
    const open = boxes({}, bars([[102, 100], [108, 101], [110, 104], [112, 105]]));
    expect(open).toHaveLength(1);
    expect(open[0][0] + open[0][2]).toBe(400);
    // Its height is the gap's: 102 to 104 on a 30-point, 300 px scale is 20 px.
    expect(Math.round(open[0][3])).toBe(20);
  });

  it('draws a gap cut by the pane’s edge on a scale turned over, and none of the bars out of view', () => {
    const fvg = new FairValueGapsIndicator();
    const style = { colors: ['#000', '#111', '#222', '#0a0', '#a00'], lineWidths: [1], opacity: 1, plots: {} } as never;
    const drawn = (viewport: unknown, series: OHLCBar[], params: Record<string, number> = {}) => {
      let rects = 0;
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) => (key in target ? target[key] : key === 'fillRect' ? () => { rects += 1; } : () => {}),
        set: (target, key: string, value) => { target[key] = value; return true; },
      }) as unknown as CanvasRenderingContext2D;
      fvg.render(ctx, fvg.calculate(series, { id: 'fvg', params } as never), viewport as never, style);
      return rects;
    };
    const open = bars([[102, 100], [108, 101], [110, 104], [112, 105]]);
    const base = { visibleRange: { from: 0, to: 3 }, barWidth: 8, barSpacing: 2, offset: 0, chartRect: { x: 0, y: 0, width: 400, height: 300 } };
    // The scale shows 103 to 133: the gap (102-104) is half under the pane the right way up, half over it turned over.
    expect(drawn({ ...base, priceRange: { min: 103, max: 133 } }, open)).toBe(1);
    expect(drawn({ ...base, priceRange: { min: 103, max: 133 }, invertScale: true }, open)).toBe(1);
    // All of it off the scale, either way up: not drawn.
    expect(drawn({ ...base, priceRange: { min: 110, max: 140 } }, open)).toBe(0);
    expect(drawn({ ...base, priceRange: { min: 110, max: 140 }, invertScale: true }, open)).toBe(0);
    // A gap filled before the first bar in view, and one left after the last, are not drawn.
    const filled = bars([[102, 100], [108, 101], [110, 104], [109, 103], [106, 102], [107, 105], [107, 105], [107, 105]]);
    expect(drawn({ ...base, priceRange: { min: 90, max: 120 }, visibleRange: { from: 6, to: 7 }, offset: 60 }, filled, { showFilled: 1 })).toBe(0);
    const later = bars([[102, 100], [102, 100], [102, 100], [102, 100], [108, 101], [110, 104], [112, 105]]);
    expect(drawn({ ...base, priceRange: { min: 90, max: 120 }, visibleRange: { from: 0, to: 2 }, chartRect: { x: 0, y: 0, width: 30, height: 300 } }, later)).toBe(0);
  });
});
