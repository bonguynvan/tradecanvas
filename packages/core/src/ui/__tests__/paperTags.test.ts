import { describe, it, expect } from 'vitest';
import type { DataSeries, Theme, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME, resolveChartTheme } from '@tradecanvas/commons';
import { CurrentPriceLine } from '../../realtime/CurrentPriceLine.js';
import { MARK_WEIGHT, periodStarts, type TimeMark } from '../../axis/timeMarks.js';
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
function recorder() {
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
      if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
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

  it('is outlined with `axis.price.valueTagsOutlined`: the chart’s ground, an edge and its text in the line’s colour', () => {
    const theme = themed({ 'axis.price.valueTagsOutlined': true, 'background.color': '#fbfaf5' });
    const { ctx, fills, edges, texts } = recorder();
    drawAxisValueLabels(ctx, labels, 200, 70, theme);
    expect(fills.map((f) => f.color)).toEqual(['#fbfaf5', '#fbfaf5']);
    expect(edges.map((e) => [e.color, e.width])).toEqual([['#4c8dff', 1], ['#e0a030', 1]]);
    expect(texts).toEqual([{ color: '#4c8dff', text: '101.25' }, { color: '#e0a030', text: '98.10' }]);
    // The edge is inside the tag's box: an outlined tag is no wider or taller than a filled one.
    expect(edges[0].at[2]).toBeLessThan(fills[0].at[2]);
    expect(edges[0].at[3]).toBeLessThan(fills[0].at[3]);
  });
});

describe('the marks where a period begins', () => {
  const mark = (index: number, weight: number): TimeMark => ({ index, time: index * 86_400_000, weight });

  it('are the months and years among days, the years among months, the days among times', () => {
    const daily = [mark(3, MARK_WEIGHT.day), mark(8, MARK_WEIGHT.dayOfFive), mark(20, MARK_WEIGHT.month), mark(51, MARK_WEIGHT.quarter), mark(80, MARK_WEIGHT.year)];
    expect(periodStarts(daily).map((m) => m.index)).toEqual([20, 51, 80]);
    const weekly = [mark(4, MARK_WEIGHT.month), mark(9, MARK_WEIGHT.quarter), mark(30, MARK_WEIGHT.year)];
    expect(periodStarts(weekly).map((m) => m.index)).toEqual([30]);
    const intraday = [mark(2, MARK_WEIGHT.hour), mark(6, MARK_WEIGHT.hour12), mark(14, MARK_WEIGHT.day), mark(40, MARK_WEIGHT.dayOfFive)];
    expect(periodStarts(intraday).map((m) => m.index)).toEqual([14, 40]);
  });

  it('are none where every mark is of one kind: no period begins on view', () => {
    expect(periodStarts([mark(2, MARK_WEIGHT.hour), mark(6, MARK_WEIGHT.hour3)])).toEqual([]);
    expect(periodStarts([mark(2, MARK_WEIGHT.month)])).toEqual([]);
    expect(periodStarts([])).toEqual([]);
  });
});
