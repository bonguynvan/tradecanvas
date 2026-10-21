// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeBarLayout, computeDonutLayout, computeCalendarLayout, computeMatrixLayout, layoutGroupedTreemap, GROUP_HEADER } from '@tradecanvas/core';
import { DARK_THEME } from '@tradecanvas/commons';
import { BarChart } from '../BarChart.js';
import { DonutChart } from '../DonutChart.js';
import { ScatterChart } from '../ScatterChart.js';
import { HistogramChart } from '../HistogramChart.js';
import { CalendarChart } from '../CalendarChart.js';
import { MatrixChart } from '../MatrixChart.js';
import { HeatmapChart } from '../HeatmapChart.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

let host: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  host = sizedHost(400, 300);
  // jsdom has no layout: the canvas sits at the page's top left.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
});

afterEach(() => {
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The measure the fake context uses: 6 px a character. */
const measure = (text: string) => text.length * 6;
const click = (canvas: HTMLCanvasElement, x: number, y: number) =>
  canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));

describe('the newer finance charts', () => {
  it('tell a bar chart’s click which bar it was', () => {
    const onBarClick = vi.fn();
    const options = { categories: ['Mon', 'Tue'], series: [{ name: 'Foreign', values: [120, -80] }], onBarClick };
    const chart = new BarChart(host, options);
    vi.advanceTimersByTime(20);
    const canvas = host.querySelector('canvas')!;
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Bar chart of Foreign, 2 categories');
    const bar = computeBarLayout(options, 400, 300, DARK_THEME, measure).bars[1];
    click(canvas, bar.x + bar.width / 2, bar.y + bar.height / 2);
    expect(onBarClick).toHaveBeenCalledWith({ category: 'Tue', series: 'Foreign', value: -80, index: 1 });
    chart.destroy();
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('tell a donut’s click which slice it was, and take new data', () => {
    const onSliceClick = vi.fn();
    const chart = new DonutChart(host, { data: [{ label: 'Cash', value: 1 }, { label: 'Stocks', value: 3 }], onSliceClick, ariaLabel: 'Portfolio' });
    vi.advanceTimersByTime(20);
    const canvas = host.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-label')).toBe('Portfolio');
    const layout = computeDonutLayout({ data: [{ label: 'Cash', value: 1 }, { label: 'Stocks', value: 3 }] }, 400, 300, DARK_THEME, measure);
    const s = layout.slices[1];
    const mid = (s.start + s.end) / 2;
    const r = (layout.radius + layout.inner) / 2;
    click(canvas, layout.cx + Math.cos(mid) * r, layout.cy + Math.sin(mid) * r);
    expect(onSliceClick).toHaveBeenCalledWith({ label: 'Stocks', value: 3 });
    chart.update([{ label: 'Bonds', value: 2 }]);
    chart.setOptions({ ariaLabel: undefined });
    expect(canvas.getAttribute('aria-label')).toBe('Donut chart of Bonds');
    chart.destroy();
  });

  it('describe a scatter and a histogram for screen readers', () => {
    const scatter = new ScatterChart(host, { series: [{ name: 'Banks', points: [{ x: 1, y: 2 }, { x: 2, y: 3 }] }], xLabel: 'Risk', yLabel: 'Return' });
    const histogram = new HistogramChart(host, { values: [1, 2, 3] });
    vi.advanceTimersByTime(20);
    const [a, b] = host.querySelectorAll('canvas');
    expect(a.getAttribute('aria-label')).toBe('Scatter chart of Return against Risk, 2 points');
    expect(b.getAttribute('aria-label')).toBe('Histogram of 3 values');
    scatter.destroy();
    histogram.destroy();
  });

  it('tell a calendar’s click which day it was, and not for an empty one', () => {
    const onDayClick = vi.fn();
    const data = [{ date: '2025-03-03', value: 1.5 }];
    const options = { data, from: '2025-03-01', to: '2025-03-31', onDayClick };
    const chart = new CalendarChart(host, options);
    vi.advanceTimersByTime(20);
    const canvas = host.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-label')).toBe('Calendar of daily values from 2025-03-01 to 2025-03-31');
    const layout = computeCalendarLayout(options, 400, 300, DARK_THEME, measure);
    const day = layout.cells.find((c) => c.date === '2025-03-03')!;
    const empty = layout.cells.find((c) => c.date === '2025-03-04')!;
    click(canvas, empty.x + 1, empty.y + 1);
    expect(onDayClick).not.toHaveBeenCalled();
    click(canvas, day.x + 1, day.y + 1);
    expect(onDayClick).toHaveBeenCalledWith(data[0]);
    chart.destroy();
  });

  it('tell a matrix’s click which cell it was', () => {
    const onCellClick = vi.fn();
    const options = { rows: ['VCB', 'BID'], values: [[1, 0.6], [0.6, 1]], onCellClick };
    const chart = new MatrixChart(host, options);
    vi.advanceTimersByTime(20);
    const canvas = host.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-label')).toBe('Matrix of VCB, BID');
    const cell = computeMatrixLayout(options, 400, 300, DARK_THEME, measure).cells[2];
    click(canvas, cell.x + 2, cell.y + 2);
    expect(onCellClick).toHaveBeenCalledWith({ row: 'BID', column: 'VCB', value: 0.6, rowIndex: 1, columnIndex: 0 });
    chart.destroy();
  });

  it('lay a grouped heatmap out by group, and click its cells', () => {
    const onCellClick = vi.fn();
    const data = [
      { id: 'vcb', label: 'VCB', value: 1, weight: 5, group: 'Banks' },
      { id: 'hpg', label: 'HPG', value: -2, weight: 3, group: 'Steel' },
    ];
    const chart = new HeatmapChart(host, { data, grouped: true, onCellClick });
    vi.advanceTimersByTime(20);
    const canvas = host.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-label')).toBe('Market map of 2 cells in 2 groups');
    const { cells } = layoutGroupedTreemap(data, { x: 0, y: 0, width: 400, height: 300 }, 2, GROUP_HEADER);
    const hpg = cells.find((c) => c.id === 'hpg')!.rect;
    click(canvas, hpg.x + hpg.width / 2, hpg.y + hpg.height / 2);
    expect(onCellClick).toHaveBeenCalledWith(data[1]);
    chart.destroy();
  });
});
