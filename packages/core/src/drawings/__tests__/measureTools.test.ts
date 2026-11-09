import { describe, it, expect, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { PriceRangeTool } from '../tools/PriceRange.js';
import { DateRangeTool } from '../tools/DateRange.js';
import { DateAndPriceRangeTool } from '../tools/DateAndPriceRange.js';
import { MeasureTool } from '../tools/Measure.js';
import { RiskRewardTool } from '../tools/RiskReward.js';
import { ForecastTool, BarsPatternTool } from '../tools/forecast.js';
import { VolumeProfileRangeTool } from '../tools/VolumeProfileRange.js';
import { AnchoredVWAPTool } from '../tools/AnchoredVWAP.js';
import { drawingLook, setDrawingLook } from '../drawingLook.js';
import { drawing, recordingCtx, unitViewport } from './fixtures.js';

// `unitViewport`: bar i at x = i·10 + 5, price p at y = 100 − p (a 1000 × 100 plot); `tall` 4 px a unit.
const tall: ViewportState = { ...unitViewport, chartRect: { x: 0, y: 0, width: 1000, height: 400 } };
const y = (p: number) => tall.chartRect.height * (1 - p / 100);

/** A context noting each stroke's and fill's colour, each text and each rectangle filled. */
function noted() {
  const { ctx, calls, texts } = recordingCtx();
  const strokes: unknown[] = [];
  const fills: unknown[] = [];
  const rects: number[][] = [];
  const probe = new Proxy(ctx as unknown as Record<string, unknown>, {
    get: (t, k: string) => {
      if (k === 'stroke') return () => strokes.push(t.strokeStyle);
      if (k === 'fill') return () => fills.push(t.fillStyle);
      if (k === 'fillRect') return (...r: number[]) => { rects.push(r); fills.push(t.fillStyle); };
      return t[k];
    },
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx: probe, calls, texts, strokes, fills, rects };
}

const bars: OHLCBar[] = Array.from({ length: 60 }, (_, i) => {
  const close = 40 + i * 0.5;
  return { time: i, open: close - 0.2, high: close + 1, low: close - 1, close, volume: 100 + (i % 7) * 50 };
});

afterEach(() => setDrawingLook(null));

describe('measuring tools', () => {
  it('a price range draws its box, its arrow and its change in the rise colour, the change on a tag outside the box', () => {
    const { ctx, strokes, texts, calls } = noted();
    new PriceRangeTool().render(ctx, drawing('priceRange', [{ time: 10, price: 40 }, { time: 30, price: 60 }]), tall, false);
    const rise = drawingLook().rise;
    expect(strokes).toContain(rise);
    expect(texts.some((t) => t.startsWith('+20'))).toBe(true);
    // The tag above the box (a rise), not in it: its rounded box's bottom over the box's top at y(60).
    const tag = calls.find((c) => c.name === 'roundRect')!.args as number[];
    expect(tag[1] + tag[3]).toBeLessThanOrEqual(y(60));
  });

  it('a date range writes its bars and its time on a tag, with handles halfway up the plot', () => {
    const tool = new DateRangeTool();
    const { ctx, texts } = noted();
    const state = drawing('dateRange', [{ time: 0, price: 50 }, { time: 10, price: 50 }]);
    tool.render(ctx, state, tall, false);
    expect(texts.some((t) => /^10 bars/.test(t))).toBe(true);
    const middle = tall.chartRect.y + tall.chartRect.height / 2;
    expect(tool.hitTestAnchor({ x: 5, y: middle }, state, tall, 3)).toBe(0);
  });

  it('a date and price range draws an arrow head at the end of each of its two measures', () => {
    const { ctx, fills } = noted();
    const before = fills.length;
    new DateAndPriceRangeTool().render(ctx, drawing('dateAndPriceRange', [{ time: 10, price: 40 }, { time: 30, price: 60 }]), tall, false);
    // Its box and two heads at least (the stats box is a fill too).
    expect(fills.length - before).toBeGreaterThanOrEqual(3);
  });

  it('a measure writes its figures without “Price:” and “Bars:”', () => {
    const { ctx, texts } = noted();
    new MeasureTool().render(ctx, drawing('measure', [{ time: 10, price: 40 }, { time: 30, price: 60 }]), tall, false);
    expect(texts.some((t) => t.startsWith('Price'))).toBe(false);
    expect(texts.some((t) => t.startsWith('Bars'))).toBe(false);
    expect(texts.some((t) => /20 bars/.test(t))).toBe(true);
  });
});

describe('positions and forecasts', () => {
  it('a long/short position takes the theme’s profit and loss colours, and edges its zones', () => {
    setDrawingLook({ ...DARK_THEME, style: { trading: { profit: '#00aa00', loss: '#aa0000' } } as never });
    const { ctx, fills, strokes } = noted();
    new RiskRewardTool().render(ctx, drawing('riskReward', [{ time: 10, price: 50 }, { time: 30, price: 45 }]), tall, false);
    expect(fills.some((f) => String(f).includes('170, 0') || String(f) === '#00aa00')).toBe(true);
    expect(strokes.filter((s) => s === '#00aa00' || s === '#aa0000').length).toBeGreaterThanOrEqual(2);
  });

  it('a forecast draws in the chart’s rise colour when its target was reached', () => {
    const tool = new ForecastTool();
    tool.setDataGetter(() => bars);
    const { ctx, strokes } = noted();
    tool.render(ctx, drawing('forecast', [{ time: 5, price: 42 }, { time: 40, price: 50 }]), tall, false);
    expect(strokes).toContain(drawingLook().rise);
  });

  it('a bars pattern marks the bars it copies with a band, not a line across the price', () => {
    const tool = new BarsPatternTool();
    tool.setDataGetter(() => bars);
    const state = drawing('barsPattern', [{ time: 5, price: 10 }, { time: 15, price: 90 }, { time: 30, price: 60 }]);
    const { ctx, calls } = noted();
    tool.render(ctx, state, tall, false);
    // No segment from the first point (bar 5 at 10) to the second (bar 15 at 90).
    const moves = calls.filter((c) => c.name === 'moveTo').map((c) => c.args as number[]);
    expect(moves.some(([x, yy]) => Math.abs(x - 55) < 0.6 && Math.abs(yy - y(10)) < 0.6)).toBe(false);
    // The band takes a click over the copied bars.
    expect(tool.hitTest({ x: 105, y: y(45) }, state, tall, 2)).toBe(true);
  });
});

describe('profiles and VWAP', () => {
  it('a volume profile keeps its histogram inside the range it measures, and outlines it', () => {
    const tool = new VolumeProfileRangeTool();
    tool.setDataGetter(() => bars);
    const state = drawing('volumeProfileRange', [{ time: 10, price: 50 }, { time: 30, price: 50 }]);
    const { ctx, rects, calls } = noted();
    tool.render(ctx, state, tall, false);
    const left = 10 * 10 + 5 - unitViewport.barWidth / 2;
    const right = 30 * 10 + 5 + unitViewport.barWidth / 2;
    expect(rects.length).toBeGreaterThan(0);
    for (const [x, , w] of rects) {
      expect(x).toBeGreaterThanOrEqual(left - 0.5);
      expect(x + w).toBeLessThanOrEqual(right + 0.5);
    }
    expect(calls.some((c) => c.name === 'lineTo')).toBe(true);
    // Its handles at the range's top and foot, over its end bars: its first at the top over bar 10.
    const top = y(Math.max(...bars.slice(10, 31).map((b) => b.high)));
    expect(tool.hitTestAnchor({ x: 105, y: top }, state, tall, 1)).toBe(0);
  });

  it('an anchored VWAP has its handle on the VWAP line where it starts', () => {
    const tool = new AnchoredVWAPTool();
    tool.setDataGetter(() => bars);
    const state = drawing('anchoredVWAP', [{ time: 10, price: 95 }]);
    // The first bar's VWAP is its typical price.
    const first = bars[10];
    const vwap0 = (first.high + first.low + first.close) / 3;
    expect(tool.hitTestAnchor({ x: 105, y: y(vwap0) }, state, tall, 3)).toBe(0);
    expect(tool.hitTestAnchor({ x: 105, y: y(95) }, state, tall, 3)).toBe(-1);
  });
});

describe('after review', () => {
  it('a volume profile’s and a bars pattern’s handles sit on their end bars, so a drag doesn’t slip a bar', () => {
    const vp = new VolumeProfileRangeTool();
    vp.setDataGetter(() => bars);
    const vpState = drawing('volumeProfileRange', [{ time: 10, price: 50 }, { time: 30, price: 50 }]);
    const bottom = y(Math.min(...bars.slice(10, 31).map((b) => b.low)));
    // Bar 30's centre is at x 305.
    expect(vp.hitTestAnchor({ x: 305, y: bottom }, vpState, tall, 1)).toBe(1);

    const pattern = new BarsPatternTool();
    pattern.setDataGetter(() => bars);
    const pState = drawing('barsPattern', [{ time: 5, price: 10 }, { time: 15, price: 90 }, { time: 30, price: 60 }]);
    const top = y(Math.max(...bars.slice(5, 16).map((b) => b.high)));
    expect(pattern.hitTestAnchor({ x: 155, y: top }, pState, tall, 1)).toBe(1);
    expect(pattern.hitTestAnchor({ x: 55, y: top }, pState, tall, 1)).toBe(0);
  });

  it('a volume profile works its rows out once for the same bars, not on every hover', () => {
    const tool = new VolumeProfileRangeTool();
    let reads = 0;
    const counted = bars.map((b) => new Proxy(b, { get: (t, k) => { if (k === 'volume') reads++; return t[k as keyof OHLCBar]; } }));
    tool.setDataGetter(() => counted as OHLCBar[]);
    const state = drawing('volumeProfileRange', [{ time: 10, price: 50 }, { time: 30, price: 50 }]);
    tool.hitTest({ x: 150, y: 150 }, state, tall, 2);
    const first = reads;
    for (let i = 0; i < 5; i++) {
      tool.hitTest({ x: 150 + i, y: 150 }, state, tall, 2);
      tool.hitTestAnchor({ x: 0, y: 0 }, state, tall, 2);
    }
    expect(first).toBeGreaterThan(0);
    expect(reads).toBe(first);
  });
});

describe('measuring tools, small and coloured by hand', () => {
  it('a measure too short for its arrow head draws its arrow without one', async () => {
    const { fillMeasureHead } = await import('../tools/lineDecor.js');
    const { ctx, fills } = noted();
    fillMeasureHead(ctx, { x: 10, y: 10 }, { x: 10, y: 14 }, '#fff', 1);
    expect(fills).toHaveLength(0);
    fillMeasureHead(ctx, { x: 10, y: 10 }, { x: 10, y: 60 }, '#fff', 1);
    expect(fills).toHaveLength(1);
  });

  it('a price range given a colour of its own draws in it, not in the rise or fall colour', () => {
    const { ctx, strokes } = noted();
    const own = drawing('priceRange', [{ time: 10, price: 40 }, { time: 30, price: 60 }], { style: { color: '#ff00ff', lineWidth: 1, lineStyle: 'solid' } });
    new PriceRangeTool().render(ctx, own, tall, false);
    expect(strokes).toContain('#ff00ff');
    expect(strokes).not.toContain(drawingLook().rise);
  });
});

describe('a position’s tags and its handles', () => {
  it('the entry’s tag starts past the entry’s handle, not over it', async () => {
    const { handleRadius } = await import('../drawingLook.js');
    const { ctx, calls } = noted();
    const state = drawing('riskReward', [{ time: 10, price: 50 }, { time: 30, price: 40 }]);
    new RiskRewardTool().render(ctx, state, tall, true);
    const entryX = 10 * 10 + 5;
    const entryTag = calls.find((c) => c.name === 'roundRect')!.args as number[];
    expect(entryTag[0]).toBeGreaterThan(entryX + handleRadius(1));
  });
});
