// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { defineIndicator, ta } from '../index.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const MINUTE = 60_000;
const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => {
    const close = 100 + Math.sin(i / 4) * 6;
    return { time: i * MINUTE, open: close - 1, high: close + 2, low: close - 2, close, volume: 5 };
  });

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(800, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars(80));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.unstubAllGlobals();
});

const smoothRsi = () => defineIndicator({
  id: 'smoothRsi',
  name: 'Smoothed RSI',
  inputs: { period: { default: 14, kind: 'int', min: 2 }, smooth: { default: 5, kind: 'int', min: 1 } },
  scale: { min: 0, max: 100 },
  calculate: ({ bars: b, inputs, ta: sums }) => ({ value: sums.ema(sums.rsi(b.close, inputs.period), inputs.smooth) }),
});

describe('Chart: an indicator made with defineIndicator', () => {
  it('is registered, added with its inputs, and computed on the chart’s bars', () => {
    chart.registerIndicator(smoothRsi());
    const id = chart.addIndicator('smoothRsi', { period: 10 })!;
    expect(id).toBeTruthy();
    const closes = chart.getData().map((bar) => bar.close);
    const expected = ta.ema(ta.rsi(closes, 10), 5);
    const drawn = chart.getIndicatorOutput(id)!.series!.map((point) => point?.value);
    expect(drawn).toHaveLength(80);
    drawn.forEach((value, i) => (expected[i] === undefined ? expect(value).toBeUndefined() : expect(value).toBeCloseTo(expected[i]!, 9)));
    expect(chart.getActiveIndicators().map((active) => active.id)).toContain('smoothRsi');
  });

  it('follows the bars as they come: a tick and a new bar', () => {
    chart.registerIndicator(smoothRsi());
    const id = chart.addIndicator('smoothRsi')!;
    const last = chart.getData().at(-1)!;
    chart.updateLastBar({ ...last, close: last.close + 9, high: last.high + 9 });
    chart.appendBar({ time: last.time + MINUTE, open: 110, high: 113, low: 109, close: 112, volume: 5 });
    const closes = chart.getData().map((bar) => bar.close);
    const expected = ta.ema(ta.rsi(closes, 14), 5);
    const series = chart.getIndicatorOutput(id)!.series!;
    expect(series).toHaveLength(81);
    expect(series.at(-1)!.value).toBeCloseTo(expected.at(-1)!, 9);
    expect(series.at(-2)!.value).toBeCloseTo(expected.at(-2)!, 9);
  });
});
