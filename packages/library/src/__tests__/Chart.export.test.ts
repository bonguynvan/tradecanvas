// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 5);
const bars: OHLCBar[] = Array.from({ length: 80 }, (_, i) => {
  const p = 100 + Math.sin(i / 5) * 3;
  return { time: T0 + i * HOUR, open: p, high: p + 1, low: p - 1, close: p + 0.2, volume: 10 };
});

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, {});
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('exporting the chart’s data', () => {
  it('adds a column per indicator line, named as the legend names it', () => {
    chart.addIndicator('sma', { period: 20 });
    chart.addIndicator('macd');
    const [header, first, last] = (() => {
      const lines = chart.getExportText('csv').split('\n');
      return [lines[0], lines[1], lines[lines.length - 1]];
    })();
    expect(header).toBe('Time,Open,High,Low,Close,Volume,SMA 20,MACD 12 26 9 Histogram,MACD 12 26 9 MACD,MACD 12 26 9 Signal');
    expect(first.endsWith(',,,,')).toBe(true); // no average yet on the first bar
    expect(last.split(',').every((cell) => cell !== '')).toBe(true);
  });

  it('exports only the bars on screen, or no indicator lines, when asked', () => {
    chart.addIndicator('sma', { period: 20 });
    const { bars: shown, columns } = chart.getExportData({ range: 'visible', indicators: false });
    expect(columns).toEqual([]);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThanOrEqual(bars.length);
    const json = JSON.parse(chart.getExportText('json', { indicators: true }));
    expect(json).toHaveLength(80);
    expect(Object.keys(json[79])).toContain('SMA 20');
  });

  it('downloads the file with the indicator lines', () => {
    chart.addIndicator('sma', { period: 20 });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download); });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    chart.exportAllData('csv', 'aaa.csv');
    expect(clicked).toEqual(['aaa.csv']);
  });
});
