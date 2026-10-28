// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

/** Long enough for a few frames of the timer-driven requestAnimationFrame. */
const FRAMES_MS = 100;
const HOUR = 3_600_000;
const bars = (n: number): OHLCBar[] => Array.from({ length: n }, (_, i) => ({
  time: Date.UTC(2026, 0, 1) + i * HOUR, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 1000,
}));

interface LegendSpy { render: (...args: unknown[]) => void; hoverBar: OHLCBar | null }
interface CrosshairSpy { onPointerMove(pos: { x: number; y: number }): void }

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  host = sizedHost(800, 400);
  chart = new Chart(host, {});
  chart.setData(bars(200));
  vi.advanceTimersByTime(FRAMES_MS);
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart — the legend under the pointer', () => {
  it('is drawn again with the hovered bar after one pointer move, not left on the latest bar', async () => {
    const internals = chart as unknown as { chartLegend: LegendSpy; crosshairHandler: CrosshairSpy; engine: { requestRender(layer?: number): void } };
    const legend = internals.chartLegend;
    const drawnWith: (OHLCBar | null)[] = [];
    const render = legend.render.bind(legend);
    legend.render = (...args: unknown[]) => { drawnWith.push(legend.hoverBar); render(...args); };
    const plot = chart.getPlotRect();
    // One move, as a pointer that comes to rest: the frame it draws finds the bar after it is painted.
    internals.crosshairHandler.onPointerMove({ x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 });
    internals.engine.requestRender();
    vi.advanceTimersByTime(FRAMES_MS);
    await Promise.resolve();
    vi.advanceTimersByTime(FRAMES_MS);
    const hovered = legend.hoverBar;
    expect(hovered).not.toBeNull();
    expect(hovered).not.toBe(chart.getData().at(-1));
    expect(drawnWith.at(-1)).toBe(hovered);
  });
});
