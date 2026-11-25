// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const WIDTH = 390;
const HEIGHT = 380;
const DAY = 86_400_000;
const bars = Array.from({ length: 160 }, (_, i) => {
  const close = 64_000 + Math.sin(i / 9) * 4000 + i * 60;
  return { time: Date.UTC(2026, 0, 5) + i * DAY, open: close - 300, high: close + 500, low: close - 700, close, volume: 1000 + i };
});

interface Inside {
  viewport: { getState(): { barWidth: number; barSpacing: number; visibleRange: { from: number; to: number }; chartRect: { x: number; width: number } } };
  engine: { onContainerResize: ((size: { width: number; height: number }) => void) | null };
}

describe('a chart whose container reports its size', () => {
  beforeEach(() => installChartStubs());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('keeps every bar on view where they were fitted beside a left scale: the plot is what both scales leave', () => {
    const chart = new Chart(sizedHost(WIDTH, HEIGHT), {});
    const inside = chart as unknown as Inside;
    chart.setData(bars);
    chart.addIndicator('ema', { period: 8 }, 'bottom', { scale: 'left' });
    chart.fitContent();
    const fitted = inside.viewport.getState();
    const slot = fitted.barWidth + fitted.barSpacing;
    // Narrower than a slot usually gets: every bar is on view only because the slot was let go under it.
    expect(fitted.visibleRange.from).toBe(0);
    expect(fitted.chartRect.x).toBeGreaterThan(0);
    expect(slot).toBeLessThan(2);

    // The page says the container's size, as it does once after the chart is made and whenever it changes.
    inside.engine.onContainerResize?.({ width: WIDTH, height: HEIGHT });
    const after = inside.viewport.getState();
    expect(after.barWidth + after.barSpacing).toBeCloseTo(slot, 9);
    expect(after.visibleRange.from).toBe(0);
    expect(after.chartRect.width).toBe(fitted.chartRect.width);
    chart.destroy();
  });
});
