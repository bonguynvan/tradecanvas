// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { ChartGrid } from '../ChartGrid.js';
import type { Chart } from '../../Chart.js';
import { installChartStubs } from '../../__tests__/chartTestEnv.js';

const T0 = Date.UTC(2026, 0, 1);
const series = (n: number, stepMs: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * stepMs, open: 100, high: 101, low: 99, close: 100, volume: 1 }));

type Probe = {
  crosshairHandler: { getSyncedSlot(): number | null; getPosition(): unknown };
  viewport: { getState(): { chartRect: { x: number; width: number; y: number; height: number }; barWidth: number; barSpacing: number; offset: number } };
};
const probe = (chart: Chart) => chart as unknown as Probe;

/** Put the pointer over bar `index` and let the frame (and its deferred callback) run. */
async function hover(chart: Chart, index: number): Promise<void> {
  const vs = probe(chart).viewport.getState();
  const x = index * (vs.barWidth + vs.barSpacing) - vs.offset + vs.chartRect.x + vs.barWidth / 2;
  chart.setCrosshairPosition({ x, y: vs.chartRect.y + vs.chartRect.height / 2 });
  await vi.advanceTimersByTimeAsync(40);
}

let host: HTMLDivElement;
let grid: ChartGrid;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  grid.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChartGrid crosshair link', () => {
  it('links by time across timeframes, and clears when the pointer leaves', async () => {
    grid = new ChartGrid(host, { layout: '1x2', syncTimeAxis: false });
    const [m1, m5] = grid.getCharts();
    m1.setData(series(60, 60_000)); // 1-minute bars
    m5.setData(series(12, 300_000)); // 5-minute bars over the same hour
    await vi.advanceTimersByTimeAsync(40);

    await hover(m1, 23); // 00:23 lies in the 00:20 bar
    expect(probe(m5).crosshairHandler.getSyncedSlot()).toBe(4);
    expect(probe(m5).crosshairHandler.getPosition()).toBeNull(); // no pointer crosshair, no horizontal line

    m1.setCrosshairPosition(null);
    expect(probe(m5).crosshairHandler.getSyncedSlot()).toBeNull();
  });

  it('does not echo the mirrored crosshair back to the chart under the pointer', async () => {
    grid = new ChartGrid(host, { layout: '1x2', syncTimeAxis: false });
    const [m1, m5] = grid.getCharts();
    m1.setData(series(60, 60_000));
    m5.setData(series(12, 300_000));
    await vi.advanceTimersByTimeAsync(40);
    const moves = vi.fn();
    m5.on('crosshairMove', moves);

    await hover(m1, 23);
    await vi.advanceTimersByTimeAsync(100);
    expect(moves).not.toHaveBeenCalled();
    expect(probe(m1).crosshairHandler.getSyncedSlot()).toBeNull();
  });

  it('links cells added by a later layout change', async () => {
    grid = new ChartGrid(host, { layout: '1x1', syncTimeAxis: false });
    grid.setLayout('1x2');
    const [a, b] = grid.getCharts();
    a.setData(series(30, 60_000));
    b.setData(series(30, 60_000));
    await vi.advanceTimersByTimeAsync(40);

    await hover(b, 7);
    expect(probe(a).crosshairHandler.getSyncedSlot()).toBe(7);
  });
});

describe('ChartGrid connectAll', () => {
  it('gives each chart an adapter of its own when given a function', async () => {
    grid = new ChartGrid(host, { layout: '1x2' });
    const connects = grid.getCharts().map((chart) => vi.spyOn(chart, 'connect').mockResolvedValue());
    const made: string[] = [];
    await grid.connectAll((symbol, index) => {
      made.push(`${index}:${symbol}`);
      return { name: symbol } as never;
    }, ['AAA', 'BBB'], '5m');
    expect(made).toEqual(['0:AAA', '1:BBB']);
    expect(connects.map((c) => (c.mock.calls[0][0].adapter as unknown as { name: string }).name)).toEqual(['AAA', 'BBB']);
  });
});
