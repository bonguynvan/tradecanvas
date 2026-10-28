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

/** The time axis labels the chart draws now, left to right. */
function axisLabels(chart: Chart): string[] {
  const inside = chart as unknown as Inside;
  const drawn: { text: string; align: string; x: number }[] = [];
  const state: Record<string, unknown> = { textAlign: 'start' };
  const ctx = new Proxy(state, {
    get: (t, p) => {
      if (p === 'fillText') return (text: string, x: number) => drawn.push({ text, align: String(t.textAlign), x });
      if (p === 'measureText') return (text: string) => ({ width: text.length * 6 });
      return p in t ? t[p as string] : () => {};
    },
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  inside.timeAxis.render(ctx, inside.viewport.getState(), DARK_THEME, inside.getDisplayData());
  return drawn.filter((d) => d.align === 'center').sort((a, b) => a.x - b.x).map((d) => d.text);
}

/** The years among the labels. */
const years = (labels: string[]) => labels.filter((l) => /^\d{4}$/.test(l)).map(Number);

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
      const recent = years(axisLabels(chart));
      expect(recent.length, axisLabels(chart).join(' ')).toBeGreaterThanOrEqual(3);
      expect(recent.every((y) => y >= 2021 && y <= 2026), recent.join(' ')).toBe(true);
      chart.scrollBars(-6000);
      const labels = axisLabels(chart);
      expect(labels.length).toBeGreaterThan(0);
      // Years, months and days only: no five-digit year.
      for (const label of labels) expect(label, labels.join(' ')).toMatch(/^(\d{1,2}|[A-Z][a-z]{2}|(19|20)\d\d)$/);
      expect(years(labels).some((y) => y <= 2002), labels.join(' ')).toBe(true);
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
    expect(years(labels)).toEqual(expect.arrayContaining([1999, 2000, 2001]));
    for (const label of labels) expect(label, labels.join(' ')).toMatch(/^(\d{1,2}|[A-Z][a-z]{2}|(19|20)\d\d)$/);
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

describe('Chart with fewer bricks than the view holds', () => {
  const SMALL_COUNT = {
    renko: { boxSize: 10 },
    kagi: { reversal: 10 },
    rangeBars: { range: 10 },
  } as const;
  for (const type of ['renko', 'kagi', 'rangeBars'] as const) {
    it(`fits ${type} to the view rather than leaving its left side empty`, () => {
      chart.setData(weekdays(Date.UTC(2025, 0, 6), Date.UTC(2026, 9, 21)));
      chart.setChartType(type);
      // A box twice the default's: fewer bricks than the plot has room for at the width of a bar.
      chart.setChartTypeOptions({ [type]: SMALL_COUNT[type] });
      const n = (chart as unknown as Inside).getDisplayData().length;
      const { chartRect, barWidth, barSpacing } = (chart as unknown as Inside).viewport.getState();
      expect(n, type).toBeLessThan(100);
      // The bars widened until the bricks span the plot, not drawn at a bar's width in its right part.
      expect(chartRect.width / (barWidth + barSpacing), `${type}: ${n} bricks`).toBeLessThan(n + 20);
    });
  }
});

describe('Chart time axis on bricks, lines and columns', () => {
  for (const type of ['renko', 'kagi', 'rangeBars', 'lineBreak', 'pointAndFigure'] as const) {
    it(`dates ${type} by the bars they were made from, each label once`, () => {
      chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
      chart.setChartType(type);
      chart.fitContent();
      const labels = axisLabels(chart);
      const found = years(labels);
      expect(found.length, `${type}: ${labels.join(' ')}`).toBeGreaterThanOrEqual(3);
      expect(found.every((y) => y >= 2016 && y <= 2026), labels.join(' ')).toBe(true);
      // Later to the right, and no label beside the same one.
      expect([...found].sort((a, b) => a - b), labels.join(' ')).toEqual(found);
      expect(labels.some((l, i) => i > 0 && l === labels[i - 1]), labels.join(' ')).toBe(false);
    });
  }
});

describe('Chart crosshair over bricks', () => {
  type Crosshair = {
    crosshairHandler: { callback: (barIndex: number | null, point: { x: number; y: number } | null) => void };
    crosshairTooltip: { show(point: unknown, bar: OHLCBar, theme: unknown, size: unknown, ctx: { prevClose?: number; barStepMs?: number }): void };
  };

  it('dates the tooltip and the crosshairMove payload as the axis dates the brick', () => {
    chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
    chart.setChartType('renko');
    chart.fitContent();
    const inside = chart as unknown as Inside & Crosshair;
    const bricks = inside.getDisplayData();
    const shown = vi.spyOn(inside.crosshairTooltip, 'show');
    const moves: { time?: number; prevClose?: number; bar?: OHLCBar }[] = [];
    chart.on('crosshairMove', (e) => moves.push(e.payload));
    const last = bricks.length - 1;
    inside.crosshairHandler.callback(last, { x: 500, y: 200 });
    const tooltipBar = shown.mock.calls[0][1];
    // The brick's own time only counts bricks from the first bar's; the tooltip dates it in 2026, as the axis does.
    expect(new Date(tooltipBar.time).getUTCFullYear()).toBe(2026);
    expect(tooltipBar.close).toBe(bricks[last].close);
    expect(new Date(moves[0].time!).getUTCFullYear()).toBe(2026);
    expect(moves[0].bar?.time).toBe(bricks[last].time);
    expect(moves[0].prevClose).toBe(bricks[last - 1].close);
  });
});

describe('Chart indicators on bricks', () => {
  it('works out an indicator from the bricks drawn, not the bars under them', () => {
    chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
    const sma = chart.addIndicator('sma', { period: 3 })!;
    chart.setChartType('renko');
    const bricks = (chart as unknown as Inside).getDisplayData();
    const series = chart.getIndicatorOutput(sma)!.series!;
    expect(series).toHaveLength(bricks.length);
    const last = bricks.length - 1;
    const mean = (bricks[last].close + bricks[last - 1].close + bricks[last - 2].close) / 3;
    expect(series[last]!.value).toBeCloseTo(mean, 6);
    // Back on candles, the bars again.
    chart.setChartType('candlestick');
    expect(chart.getIndicatorOutput(sma)!.series).toHaveLength(chart.getData().length);
  });

  it('exports the bricks drawn beside their indicator values, dated as the axis dates them', () => {
    chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
    chart.addIndicator('sma', { period: 3 });
    chart.setChartType('renko');
    const bricks = (chart as unknown as Inside).getDisplayData();
    const { bars, columns } = chart.getExportData();
    expect(bars).toHaveLength(bricks.length);
    expect(bars[bars.length - 1].close).toBe(bricks[bricks.length - 1].close);
    expect(new Date(bars[bars.length - 1].time).getUTCFullYear()).toBe(2026);
    expect(columns[0].values).toHaveLength(bricks.length);
    expect(columns[0].values[bricks.length - 1]).toBeCloseTo(
      (bricks[bricks.length - 1].close + bricks[bricks.length - 2].close + bricks[bricks.length - 3].close) / 3, 6);
  });

  it('fires an alert on an indicator line from its last brick', () => {
    chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
    const sma = chart.addIndicator('sma', { period: 3 })!;
    chart.setChartType('renko');
    const values = new Map<string, number>();
    (chart as unknown as { collectIndicatorValues(into: Map<string, number>): void; alertManager: { getAlerts(): unknown[] } })
      .alertManager.getAlerts = () => [{ channel: `${sma}:value` }];
    (chart as unknown as { collectIndicatorValues(into: Map<string, number>): void }).collectIndicatorValues(values);
    const series = chart.getIndicatorOutput(sma)!.series!;
    expect(values.get(`${sma}:value`)).toBe(series[series.length - 1]!.value);
  });

  it('leaves the indicators that count days off the bricks, whose times only count them', () => {
    chart.setData(weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21)));
    const vwap = chart.addIndicator('vwap')!;
    const sma = chart.addIndicator('sma', { period: 3 })!;
    chart.setChartType('renko');
    const active = chart.getActiveIndicators();
    expect(active.find((i) => i.instanceId === vwap)).toMatchObject({ shown: false, offChartType: true });
    expect(active.find((i) => i.instanceId === sma)?.offChartType).toBeUndefined();
    chart.setChartType('candlestick');
    expect(chart.getActiveIndicators().find((i) => i.instanceId === vwap)?.offChartType).toBeUndefined();
  });

  it('follows a new bar on bricks', () => {
    const bars = weekdays(Date.UTC(2016, 0, 4), Date.UTC(2026, 9, 21));
    chart.setData(bars);
    const sma = chart.addIndicator('sma', { period: 3 })!;
    chart.setChartType('renko');
    const last = bars[bars.length - 1];
    chart.appendBar({ ...last, time: last.time + DAY, open: last.close, high: last.close * 1.4, low: last.close, close: last.close * 1.4 });
    const bricks = (chart as unknown as Inside).getDisplayData();
    expect(chart.getIndicatorOutput(sma)!.series).toHaveLength(bricks.length);
  });
});
