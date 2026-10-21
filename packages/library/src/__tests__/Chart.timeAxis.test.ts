// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const DAY = 86_400_000;

/** Weekday bars from `from` to `to` (UTC), times divided by `div` (1000 for seconds). */
function weekdays(from: number, to: number, div = 1): OHLCBar[] {
  const out: OHLCBar[] = [];
  let p = 100;
  for (let t = from; t <= to; t += DAY) {
    const dow = new Date(t).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    p = Math.max(1, p + Math.sin(t / 9e8) * 2);
    out.push({ time: t / div, open: p, high: p + 1, low: p - 1, close: p + 0.5, volume: 1 });
  }
  return out;
}

/** The chart's internals the axis draws from. */
type Inside = {
  viewport: { getState(): ViewportState };
  timeAxis: { render(ctx: CanvasRenderingContext2D, vs: ViewportState, theme: typeof DARK_THEME, data: OHLCBar[]): void };
  getDisplayData(): OHLCBar[];
};

/** The time axis labels the chart draws now. */
function axisLabels(chart: Chart): string[] {
  const inside = chart as unknown as Inside;
  const drawn: { text: string; align: string }[] = [];
  const state: Record<string, unknown> = { textAlign: 'start' };
  const ctx = new Proxy(state, {
    get: (t, p) => {
      if (p === 'fillText') return (text: string) => drawn.push({ text, align: String(t.textAlign) });
      if (p === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return p in t ? t[p as string] : () => {};
    },
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  inside.timeAxis.render(ctx, inside.viewport.getState(), DARK_THEME, inside.getDisplayData());
  return drawn.filter((d) => d.align === 'center').map((d) => d.text);
}

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost(1000, 500);
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart time axis over decades of daily bars', () => {
  for (const [unit, div] of [['milliseconds', 1], ['seconds', 1000]] as const) {
    it(`dates bars from 2000 right after 5Y and a scroll back, in ${unit}`, () => {
      chart.setData(weekdays(Date.UTC(2000, 6, 28), Date.UTC(2026, 9, 21), div));
      chart.setVisibleRangePreset('5Y');
      expect(axisLabels(chart).every((l) => /\/20(2[1-6])$/.test(l)), axisLabels(chart).join(' ')).toBe(true);
      chart.scrollBars(-6000);
      const labels = axisLabels(chart);
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) expect(label, labels.join(' ')).toMatch(/\/(19|20)\d\d$/);
      expect(labels.some((l) => /\/200[01]$/.test(l)), labels.join(' ')).toBe(true);
    });
  }

  it('dates history paged in from before 2001 right', async () => {
    const all = weekdays(Date.UTC(1998, 0, 5), Date.UTC(2026, 9, 21));
    chart.setData(all.slice(-1500));
    chart.setHistoryLoader(async (before, limit) => all.filter((b) => b.time < before).slice(-limit), { pageSize: 2000 });
    chart.setVisibleRangePreset('5Y');
    for (let k = 0; k < 6; k++) await chart.loadMoreHistory();
    expect((chart as unknown as Inside).getDisplayData()[0].time).toBe(all[0].time);
    chart.setVisibleRange(all[0].time, all[2000].time);
    const labels = axisLabels(chart);
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(label, labels.join(' ')).toMatch(/\/(199[89]|20\d\d)$/);
  });
});

describe('Chart visible range on bricks', () => {
  const visible = () => (chart as unknown as Inside).viewport.getState().visibleRange;

  it('setVisibleRange finds the times among the bricks shown, not the bars under them', () => {
    chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
    chart.setChartType('renko');
    const bricks = (chart as unknown as Inside).getDisplayData();
    const a = Math.floor(bricks.length / 3);
    const b = Math.floor(bricks.length / 2);
    chart.setVisibleRange(bricks[a].time, bricks[b].time);
    const range = visible();
    expect(Math.abs(range.from - a)).toBeLessThanOrEqual(2);
    expect(Math.abs(range.to - b)).toBeLessThanOrEqual(2);
  });

  it('fitContent fits the bricks', () => {
    const bars = weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21));
    chart.setData(bars);
    chart.setChartType('renko');
    const bricks = (chart as unknown as Inside).getDisplayData();
    expect(bricks.length).toBeLessThan(bars.length);
    chart.fitContent();
    const range = visible();
    expect(range.from).toBeLessThanOrEqual(1);
    expect(range.to).toBeGreaterThanOrEqual(bricks.length - 2);
    // Fitted, not squeezed down as if there were as many bricks as bars.
    expect(range.to - range.from).toBeLessThan(bricks.length + 20);
  });
});
