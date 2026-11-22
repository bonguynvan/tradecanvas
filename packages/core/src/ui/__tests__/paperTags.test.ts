import { describe, it, expect } from 'vitest';
import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME, resolveChartTheme } from '@tradecanvas/commons';
import { CurrentPriceLine } from '../../realtime/CurrentPriceLine.js';
import { TimeAxis } from '../../axis/TimeAxis.js';
import { BarCountdown } from '../BarCountdown.js';
import { drawAxisValueLabels, labelTextColor } from '../axisValueLabels.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 90, max: 110 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 200, height: 100 },
  priceAxisWidth: 70,
};

const themed = (overrides: Record<string, unknown> = {}): Theme => resolveChartTheme(DARK_THEME, 'candlestick', overrides as never);

/** A context that keeps each fill, edge and text with the colour it was painted in. */
function recorder(pixelRatio = 1) {
  const fills: { color: string; at: number[] }[] = [];
  const edges: { color: string; width: number; at: number[] }[] = [];
  const texts: { color: string; text: string }[] = [];
  const state: Record<string | symbol, unknown> = { lineWidth: 1 };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 7 });
      if (prop === 'fillRect') return (...at: number[]) => void fills.push({ color: String(target.fillStyle), at });
      if (prop === 'strokeRect') return (...at: number[]) => void edges.push({ color: String(target.strokeStyle), width: Number(target.lineWidth), at });
      if (prop === 'fillText') return (text: string) => void texts.push({ color: String(target.fillStyle), text });
      if (prop === 'getTransform') return () => ({ a: pixelRatio, b: 0, c: 0, d: pixelRatio, e: 0, f: 0 });
      return prop in target ? target[prop] : () => undefined;
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, fills, edges, texts };
}

describe('the last price’s tag in colours of its own', () => {
  const up = (theme: Theme) => theme.style!.lastPrice.up;

  it('is the day’s colour with the text that reads on it, when none is set', () => {
    const theme = themed();
    const line = new CurrentPriceLine();
    line.setPrice(105, 100);
    const { ctx, fills, texts } = recorder();
    line.renderTag(ctx, viewport, theme);
    expect(fills[0].color).toBe(up(theme));
    expect(texts[0]).toEqual({ color: labelTextColor(up(theme)), text: '105.00' });
    expect(line.getTag()).toMatchObject({ color: up(theme), textColor: labelTextColor(up(theme)) });
  });

  it('is one colour whatever the day’s direction with `lastPrice.labelBackground`, its text `lastPrice.labelTextColor`', () => {
    const theme = themed({ 'lastPrice.labelBackground': '#111111', 'lastPrice.labelTextColor': '#fafaf0' });
    for (const [price, before] of [[105, 100], [95, 100]]) {
      const line = new CurrentPriceLine();
      line.setPrice(price, before);
      const { ctx, fills, texts } = recorder();
      line.renderTag(ctx, viewport, theme);
      expect(fills[0].color).toBe('#111111');
      expect(texts[0].color).toBe('#fafaf0');
      expect(line.getTag()).toMatchObject({ color: '#111111', textColor: '#fafaf0' });
    }
  });

  it('takes one without the other: a fill of its own under the text that reads on it, a text of its own on the day’s colour', () => {
    const filled = themed({ 'lastPrice.labelBackground': '#f4f1e8' });
    const line = new CurrentPriceLine();
    line.setPrice(105, 100);
    const one = recorder();
    line.renderTag(one.ctx, viewport, filled);
    expect(one.fills[0].color).toBe('#f4f1e8');
    expect(one.texts[0].color).toBe(labelTextColor('#f4f1e8'));
    const lettered = themed({ 'lastPrice.labelTextColor': '#000000' });
    const other = recorder();
    line.renderTag(other.ctx, viewport, lettered);
    expect(other.fills[0].color).toBe(up(lettered));
    expect(other.texts[0].color).toBe('#000000');
  });

  it('gives the countdown under it the same fill and text', () => {
    const theme = themed({ 'lastPrice.labelBackground': '#111111', 'lastPrice.labelTextColor': '#fafaf0' });
    const line = new CurrentPriceLine();
    line.setPrice(105, 100);
    line.renderTag(recorder().ctx, viewport, theme);
    const countdown = new BarCountdown();
    countdown.setTimeframeMs(3_600_000);
    const now = Date.now();
    const data: DataSeries = [{ time: now - (now % 3_600_000), open: 1, high: 1, low: 1, close: 1, volume: 1 }];
    const { ctx, fills, texts } = recorder();
    countdown.render(ctx, viewport, theme, data, line.getTag());
    expect(fills[0].color).toBe('#111111');
    expect(texts[0].color).toBe('#fafaf0');
  });
});

describe('an indicator’s value tag on the price axis', () => {
  const labels = [{ y: 40, text: '101.25', color: '#4c8dff' }, { y: 70, text: '98.10', color: '#e0a030' }];

  it('is filled with the line’s colour, as it was, when nothing says otherwise', () => {
    const theme = themed();
    const { ctx, fills, edges, texts } = recorder();
    drawAxisValueLabels(ctx, labels, 200, 70, theme);
    expect(fills.map((f) => f.color)).toEqual(['#4c8dff', '#e0a030']);
    expect(edges).toEqual([]);
    expect(texts.map((t) => t.color)).toEqual([labelTextColor('#4c8dff'), labelTextColor('#e0a030')]);
  });

  it('is outlined with `axis.price.valueTagsOutlined`: the chart’s ground inside an edge of the line’s colour, its text in that colour', () => {
    const theme = themed({ 'axis.price.valueTagsOutlined': true, 'background.color': '#fbfaf5' });
    const { ctx, fills, edges, texts } = recorder();
    drawAxisValueLabels(ctx, labels, 200, 70, theme);
    // The edge is the tag's own box in the line's colour, the ground a box a pixel inside it: no stroke, so it is sharp at any zoom of the page.
    expect(edges).toEqual([]);
    expect(fills.map((f) => f.color)).toEqual(['#4c8dff', '#fbfaf5', '#e0a030', '#fbfaf5']);
    const [outer, inner] = fills;
    expect(inner.at).toEqual([outer.at[0] + 1, outer.at[1] + 1, outer.at[2] - 2, outer.at[3] - 2]);
    expect(texts).toEqual([{ color: '#4c8dff', text: '101.25' }, { color: '#e0a030', text: '98.10' }]);
    // An outlined tag is the size of a filled one.
    const filled = recorder();
    drawAxisValueLabels(filled.ctx, labels, 200, 70, themed());
    expect(outer.at).toEqual(filled.fills[0].at);
  });

  it('has an edge of two device pixels where a CSS pixel is one and a half', () => {
    const theme = themed({ 'axis.price.valueTagsOutlined': true });
    const { ctx, fills } = recorder(1.5);
    drawAxisValueLabels(ctx, labels, 200, 70, theme);
    const [outer, inner] = fills;
    expect(inner.at[0] - outer.at[0]).toBeCloseTo(2 / 1.5, 6);
    expect(outer.at[2] - inner.at[2]).toBeCloseTo(4 / 1.5, 6);
  });

  it('is on the ground it is given: a pane’s own, where the pane has one', () => {
    const theme = themed({ 'axis.price.valueTagsOutlined': true, 'background.color': '#fbfaf5' });
    const { ctx, fills } = recorder();
    drawAxisValueLabels(ctx, labels, 200, 70, theme, '#eeeae0');
    expect(fills.map((f) => f.color)).toEqual(['#4c8dff', '#eeeae0', '#e0a030', '#eeeae0']);
  });

  it('writes in the scale’s own text colour where the line’s would not read on the ground', () => {
    const theme = themed({ 'axis.price.valueTagsOutlined': true, 'background.color': '#fbfaf5', 'axis.price.textColor': '#222222' });
    const { ctx, texts, fills } = recorder();
    drawAxisValueLabels(ctx, [{ y: 40, text: '1.00', color: '#f4f2ea' }, { y: 70, text: '2.00', color: '#1f6feb' }], 200, 70, theme);
    // A pale line on a pale page: its edge is still its own, its value is read in the scale's ink.
    expect(fills[0].color).toBe('#f4f2ea');
    expect(texts).toEqual([{ color: '#222222', text: '1.00' }, { color: '#1f6feb', text: '2.00' }]);
  });
});

describe('the grid’s lines where a period begins', () => {
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;
  const bar = (time: number) => ({ time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1 });
  /** Daily bars, Monday to Friday, from Monday 5 January 2026. */
  const dailyBars = (count: number): DataSeries => {
    const out: DataSeries = [];
    for (let day = 0; out.length < count; day++) {
      const time = Date.UTC(2026, 0, 5) + day * DAY;
      if (![0, 6].includes(new Date(time).getUTCDay())) out.push(bar(time));
    }
    return out;
  };
  const every = (count: number, step: number, start = Date.UTC(2026, 0, 5)): DataSeries => Array.from({ length: count }, (_, i) => bar(start + i * step));
  const monthlyBars = (count: number): DataSeries => Array.from({ length: count }, (_, i) => bar(Date.UTC(2016, i, 1)));
  /** A plot `width` wide whose bars are `unit` apart, the newest at its right edge. */
  const view = (data: DataSeries, unit: number, width = 1000): ViewportState => ({
    visibleRange: { from: Math.max(0, data.length - Math.ceil(width / unit)), to: data.length - 1 },
    priceRange: { min: 0, max: 3 },
    barWidth: unit * 0.7,
    barSpacing: unit * 0.3,
    offset: data.length * unit - width,
    chartRect: { x: 0, y: 0, width, height: 300 },
  });
  const axis = (): TimeAxis => {
    const made = new TimeAxis();
    made.setTimezoneOffset('UTC');
    return made;
  };
  /** The bars on view (but the first, which begins nothing seen) where `changed` says a period began. */
  const starts = (data: DataSeries, viewport: ViewportState, changed: (now: Date, before: Date) => boolean): number[] => {
    const out: number[] = [];
    for (let i = Math.max(1, viewport.visibleRange.from); i <= viewport.visibleRange.to; i++) {
      if (changed(new Date(data[i].time), new Date(data[i - 1].time))) out.push(i);
    }
    return out;
  };
  const newMonth = (now: Date, before: Date): boolean => now.getUTCMonth() !== before.getUTCMonth() || now.getUTCFullYear() !== before.getUTCFullYear();
  const newYear = (now: Date, before: Date): boolean => now.getUTCFullYear() !== before.getUTCFullYear();
  const newDay = (now: Date, before: Date): boolean => now.getUTCDate() !== before.getUTCDate() || newMonth(now, before);
  const lines = (data: DataSeries, viewport: ViewportState, on = axis()): number[] => on.periodMarks(viewport, data).map((mark) => mark.index).filter((i) => i < data.length);

  it('are at each month’s first bar on a chart of days, however wide its bars', () => {
    const data = dailyBars(126);
    for (const unit of [3, 4, 8]) {
      const viewport = view(data, unit);
      expect(lines(data, viewport), `${unit} px a bar`).toEqual(starts(data, viewport, newMonth));
    }
    expect(lines(data, view(data, 8)).length).toBeGreaterThanOrEqual(5);
  });

  it('are at each year’s first bar where a month’s starts would crowd, and at the months again once they have room', () => {
    const data = dailyBars(800);
    // 21 bars to a month: at 1.25 px a bar the months are 26 px apart, at 2.5 px they are 52.
    expect(lines(data, view(data, 1.25))).toEqual(starts(data, view(data, 1.25), newYear));
    expect(lines(data, view(data, 1.25)).length).toBe(3);
    expect(lines(data, view(data, 2.5))).toEqual(starts(data, view(data, 2.5), newMonth));
  });

  it('are at each year’s first bar on a chart of months and one of weeks', () => {
    const months = monthlyBars(120);
    expect(lines(months, view(months, 8))).toEqual(starts(months, view(months, 8), newYear));
    expect(lines(months, view(months, 8)).length).toBeGreaterThanOrEqual(9);
    const weeks = every(260, 7 * DAY);
    expect(lines(weeks, view(weeks, 3.8))).toEqual(starts(weeks, view(weeks, 3.8), newYear));
    // 260 weeks from January 2026: the years 2027 to 2030 begin among them.
    expect(lines(weeks, view(weeks, 3.8)).length).toBe(4);
  });

  it('are at each day’s first bar on an intraday chart, in the zone the axis shows', () => {
    const hours = every(168, HOUR);
    expect(lines(hours, view(hours, 6))).toEqual(starts(hours, view(hours, 6), newDay));
    expect(lines(hours, view(hours, 6)).length).toBe(6);
    const quarters = every(192, HOUR / 4);
    expect(lines(quarters, view(quarters, 6))).toEqual(starts(quarters, view(quarters, 6), newDay));
    // In Ho Chi Minh City the day begins at 17:00 UTC.
    const there = axis();
    there.setTimezoneOffset('Asia/Ho_Chi_Minh');
    const local = lines(hours, view(hours, 6), there);
    expect(local.length).toBeGreaterThanOrEqual(6);
    expect(local.every((i) => new Date(hours[i].time).getUTCHours() === 17)).toBe(true);
  });

  it('are none where no period begins on view', () => {
    const seconds = every(300, 1000);
    expect(lines(seconds, view(seconds, 4))).toEqual([]);
    const morning = every(40, 5 * 60_000, Date.UTC(2026, 0, 5, 2));
    expect(lines(morning, view(morning, 20))).toEqual([]);
    expect(axis().periodMarks(view([], 8), [])).toEqual([]);
  });

  it('stay with their bars as the chart is moved, and do not hang on which labels the axis has room for', () => {
    const data = dailyBars(400);
    const unit = 6;
    const newest = view(data, unit);
    const earlier: ViewportState = { ...newest, offset: newest.offset - 37 * unit, visibleRange: { from: newest.visibleRange.from - 37, to: newest.visibleRange.to - 37 } };
    const shared = (indices: number[]): number[] => indices.filter((i) => i > newest.visibleRange.from && i <= earlier.visibleRange.to);
    const on = axis();
    expect(shared(lines(data, newest, on))).toEqual(shared(lines(data, earlier, on)));
    expect(shared(lines(data, newest, on)).length).toBeGreaterThan(3);
  });
});
