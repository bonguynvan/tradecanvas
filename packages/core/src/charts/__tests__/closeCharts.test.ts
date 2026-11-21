import { describe, it, expect } from 'vitest';
import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { ColumnsRenderer, DotsRenderer, HLCBarRenderer, SplineRenderer, StepAreaRenderer, monotoneSlopes } from '../closeCharts.js';
import { toHeikinAshi, toSmoothedHeikinAshi } from '../transforms/heikinAshi.js';
import { recordingCtx, unitViewport } from '../../drawings/__tests__/fixtures.js';

const theme = DARK_THEME as Theme;
/** Closes 20, 40, 30, 60: up, up, down, up. In the unit viewport bar i is centred on x = 10i + 5 and a price p is at y = 100 - p. */
const bars: DataSeries = [20, 40, 30, 60].map((close, i) => ({ time: i * 60_000, open: close - 5, high: close + 10, low: close - 10, close, volume: 1 }));
const view = (over: Partial<ViewportState> = {}): ViewportState => ({ ...unitViewport, visibleRange: { from: 0, to: 3 }, ...over });

/** What a renderer drew, with the fill colour each rectangle was filled in. */
function draw(renderer: { render: (...args: never[]) => void }, data: DataSeries = bars, viewport = view()) {
  const { ctx, calls } = recordingCtx();
  const fills: string[] = [];
  const recorded = new Proxy(ctx, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      // The stand-in has no gradients: one that takes its stops and does nothing.
      if (key === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
      if (key !== 'fillRect' || typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        fills.push(String((target as unknown as { fillStyle: unknown }).fillStyle));
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
  (renderer.render as (...args: unknown[]) => void)(recorded, data, viewport, theme);
  const named = (name: string) => calls.filter((call) => call.name === name).map((call) => call.args as number[]);
  return { calls, fills, named };
}

const RENDERERS = [new ColumnsRenderer(), new HLCBarRenderer(), new DotsRenderer(), new StepAreaRenderer(), new SplineRenderer()];

describe('the chart types drawn from the closes', () => {
  it('draw nothing with no bars, none in view, or a price range with no height', () => {
    for (const renderer of RENDERERS) {
      expect(draw(renderer, []).calls).toEqual([]);
      expect(draw(renderer, bars, view({ visibleRange: { from: 3, to: 2 } })).calls).toEqual([]);
      expect(draw(renderer, bars, view({ priceRange: { min: 50, max: 50 } })).calls).toEqual([]);
    }
  });

  it('draw only the bars there are when the view runs past them', () => {
    for (const renderer of RENDERERS) {
      expect(() => draw(renderer, bars, view({ visibleRange: { from: -5, to: 50 } }))).not.toThrow();
    }
    expect(draw(new ColumnsRenderer(), bars, view({ visibleRange: { from: -5, to: 50 } })).named('fillRect')).toHaveLength(4);
  });
});

describe('ColumnsRenderer', () => {
  it('stands the columns a little under the lowest close in view, each up to its close and as wide as its bar', () => {
    // The lowest close, 20, is at y 80: the columns stand 8 px under it.
    expect(draw(new ColumnsRenderer()).named('fillRect')).toEqual([[0, 80, 10, 8], [10, 60, 10, 28], [20, 70, 10, 18], [30, 40, 10, 48]]);
  });

  it('leaves the room under the lowest close alone: the volume’s, when the chart shows it', () => {
    // Prices 0 to 100 in view, closes from 60: the 40 px under them are another's.
    const high = bars.map((bar) => ({ ...bar, close: bar.close + 40 }));
    const bottoms = draw(new ColumnsRenderer(), high).named('fillRect').map(([, y, , height]) => y + height);
    expect(new Set(bottoms)).toEqual(new Set([48]));
  });

  it('stands on the plot’s edge when the lowest close is at it, and hangs from the low edge upside down', () => {
    const low = bars.map((bar, i) => ({ ...bar, close: i === 0 ? 2 : bar.close }));
    expect(draw(new ColumnsRenderer(), low).named('fillRect')[1]).toEqual([10, 60, 10, 40]);
    const flipped = draw(new ColumnsRenderer(), bars, view({ invertScale: true })).named('fillRect');
    // Upside down a price p is at y = p: the lowest close is at 20, and the columns start 8 px above it.
    expect(flipped[0]).toEqual([0, 12, 10, 8]);
    expect(flipped[3]).toEqual([30, 12, 10, 48]);
  });

  it('colours each by its close against the one before, the first against its open', () => {
    expect(draw(new ColumnsRenderer()).fills).toEqual([theme.candleUp, theme.candleUp, theme.candleDown, theme.candleUp]);
  });

  it('draws a pixel column for the bars that keep the shape when there are more bars than pixels', () => {
    const many: DataSeries = Array.from({ length: 5000 }, (_, i) => ({ time: i, open: 50, high: 60, low: 40, close: 50 + Math.sin(i / 40) * 30, volume: 1 }));
    const dense = view({ visibleRange: { from: 0, to: 4999 }, barWidth: 0.15, barSpacing: 0.05, chartRect: { x: 0, y: 0, width: 1000, height: 100 } });
    const rects = draw(new ColumnsRenderer(), many, dense).named('fillRect');
    expect(rects.length).toBeLessThan(5000);
    expect(rects.length).toBeGreaterThan(100);
    expect(rects.every(([, , width]) => width === 1)).toBe(true);
  });
});

describe('HLCBarRenderer', () => {
  it('draws a stem from the low to the high and a tick at the close, with no open', () => {
    const rects = draw(new HLCBarRenderer()).named('fillRect');
    expect(rects).toHaveLength(8);
    // The first bar: high 30, low 10, close 20. A 2 px stem at x 4, a tick to its right at the close.
    expect(rects[0]).toEqual([4, 70, 2, 20]);
    expect(rects[1]).toEqual([4, 79, 7, 2]);
  });

  it('colours a bar by its close against the one before', () => {
    const { fills } = draw(new HLCBarRenderer());
    expect([fills[0], fills[2], fills[4], fills[6]]).toEqual([theme.candleUp, theme.candleUp, theme.candleDown, theme.candleUp]);
  });
});

describe('DotsRenderer', () => {
  it('puts a dot at each close', () => {
    expect(draw(new DotsRenderer()).named('arc').map(([x, y]) => [x, y])).toEqual([[5, 80], [15, 60], [25, 70], [35, 40]]);
  });

  it('keeps a dot within its bar, and no smaller than a pixel across', () => {
    const radius = (viewport: ViewportState) => draw(new DotsRenderer(), bars, viewport).named('arc')[0][2];
    expect(radius(view())).toBeCloseTo(10 / 3, 9);
    expect(radius(view({ barWidth: 40 }))).toBe(4);
    expect(radius(view({ barWidth: 0.5 }))).toBe(1);
  });
});

describe('StepAreaRenderer', () => {
  it('holds each close until the next bar, and fills down to the scale’s low edge', () => {
    const { named, calls } = draw(new StepAreaRenderer());
    const fillPath = named('lineTo').slice(0, 8);
    expect(fillPath).toEqual([[5, 80], [15, 80], [15, 60], [25, 60], [25, 70], [35, 70], [35, 40], [35, 100]]);
    expect(named('moveTo')[0]).toEqual([5, 100]);
    expect(calls.filter((call) => call.name === 'fill')).toHaveLength(1);
    expect(calls.filter((call) => call.name === 'stroke')).toHaveLength(1);
  });
});

describe('the lines, zoomed far out', () => {
  const many: DataSeries = Array.from({ length: 20_000 }, (_, i) => ({ time: i, open: 50, high: 60, low: 40, close: 50 + Math.sin(i / 90) * 30, volume: 1 }));
  const dense = view({ visibleRange: { from: 0, to: 19_999 }, barWidth: 0.04, barSpacing: 0.01, chartRect: { x: 0, y: 0, width: 1000, height: 100 } });

  it('draw the bars that keep the shape, not every bar', () => {
    for (const renderer of [new StepAreaRenderer(), new SplineRenderer(), new DotsRenderer()]) {
      const { calls } = draw(renderer, many, dense);
      expect(calls.length, renderer.constructor.name).toBeLessThan(20_000);
      expect(calls.length, renderer.constructor.name).toBeGreaterThan(200);
    }
  });
});

describe('SplineRenderer', () => {
  it('draws one curve through every close', () => {
    const { named } = draw(new SplineRenderer());
    expect(named('moveTo')).toEqual([[5, 80]]);
    expect(named('bezierCurveTo').map((args) => args.slice(4))).toEqual([[15, 60], [25, 70], [35, 40]]);
  });

  it('is flat where the closes turn, so the curve passes no high or low close', () => {
    expect(monotoneSlopes([80, 60, 70, 40])).toEqual([-20, 0, 0, -30]);
    // Control points at a turn sit level with it: nothing bulges past.
    const curves = draw(new SplineRenderer()).named('bezierCurveTo');
    expect(curves[0][3]).toBe(60);
    expect(curves[1][1]).toBe(60);
  });

  it('follows a steady rise on its slope, and gives nothing to slope for one point', () => {
    expect(monotoneSlopes([10, 20, 30])).toEqual([10, 10, 10]);
    expect(monotoneSlopes([5])).toEqual([0]);
    expect(monotoneSlopes([])).toEqual([]);
    expect(monotoneSlopes([1, 1, 5])).toEqual([0, 0, 4]);
  });
});

describe('toSmoothedHeikinAshi', () => {
  const wavy: DataSeries = Array.from({ length: 60 }, (_, i) => {
    // A rise with a jolt each bar: Heikin-Ashi turns on the jolts, the smoothed kind rides over them.
    const close = 100 + i * 0.4 + (((i * 7919) % 5) - 2) * 1.5;
    return { time: i * 60_000, open: close - 1, high: close + 2, low: close - 2, close, volume: 3 };
  });
  const turns = (series: DataSeries) => series.filter((bar, i) => i > 0 && (bar.close >= bar.open) !== (series[i - 1].close >= series[i - 1].open)).length;

  it('keeps a bar for each bar, on its time and with its volume', () => {
    const smoothed = toSmoothedHeikinAshi(wavy, 10);
    expect(smoothed).toHaveLength(60);
    expect(smoothed.map((bar) => bar.time)).toEqual(wavy.map((bar) => bar.time));
    expect(smoothed[7].volume).toBe(3);
    expect(smoothed.every((bar) => bar.high >= Math.max(bar.open, bar.close) && bar.low <= Math.min(bar.open, bar.close))).toBe(true);
  });

  it('turns colour less often than Heikin-Ashi does on the same bars', () => {
    expect(turns(toSmoothedHeikinAshi(wavy, 10))).toBeLessThan(turns(toHeikinAshi(wavy)));
  });

  it('is Heikin-Ashi itself over one bar, and takes a period that is none as its ten', () => {
    expect(toSmoothedHeikinAshi(wavy, 1)).toEqual(toHeikinAshi(wavy));
    expect(toSmoothedHeikinAshi(wavy, Number.NaN)).toEqual(toSmoothedHeikinAshi(wavy, 10));
    expect(toSmoothedHeikinAshi(wavy)).toEqual(toSmoothedHeikinAshi(wavy, 10));
    expect(toSmoothedHeikinAshi([])).toEqual([]);
  });
});
