import { describe, it, expect, vi } from 'vitest';
import type { ViewportState, DataSeries } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { SessionBreaks } from '../SessionBreaks.js';

// Wide enough to show all 72 bars: SessionBreaks finds boundaries in *local*
// time, so the month break moves with the machine's timezone (bar 34 at
// UTC+14 … bar 60 at UTC-12) and must be on screen wherever the tests run.
function viewport(): ViewportState {
  return {
    visibleRange: { from: 0, to: 80 },
    priceRange: { min: 0, max: 100 },
    barWidth: 10,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 1000, height: 100 },
  };
}

function mockCtx() {
  const fillTextCalls: string[] = [];
  return {
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn((text: string) => fillTextCalls.push(text)),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      set font(_v: string) {},
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
      set globalAlpha(_v: number) {},
      set lineWidth(_v: number) {},
    } as unknown as CanvasRenderingContext2D,
    fillTextCalls,
  };
}

// 1h bars crossing a month boundary (Sep 30 -> Oct 1, 2026, UTC).
function hourlyBarsAcrossMonthBoundary(): DataSeries {
  const start = Date.UTC(2026, 8, 29, 0, 0, 0) / 1000; // Sep 29 2026, seconds
  const bars: DataSeries = [];
  for (let i = 0; i < 72; i++) {
    bars.push({ time: start + i * 3600, open: 1, high: 1, low: 1, close: 1, volume: 1 });
  }
  return bars;
}

describe('SessionBreaks — month-boundary label', () => {
  it('labels a month boundary with the full year, not an ambiguous 2-digit one', () => {
    const sb = new SessionBreaks();
    sb.setVisible(true);
    const { ctx, fillTextCalls } = mockCtx();

    sb.renderLabels(ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());

    // "Oct 26" (2-digit year) reads like a day-of-month and was mistaken for
    // the wrong date; the fix always renders the 4-digit year.
    expect(fillTextCalls.some((t) => /^Oct \d{2}$/.test(t))).toBe(false);
    expect(fillTextCalls.some((t) => t.includes('2026'))).toBe(true);
  });

  it('formats the label using the configured locale instead of hardcoded English', () => {
    const sb = new SessionBreaks();
    sb.setVisible(true);
    sb.setLocale('vi-VN');
    const { ctx, fillTextCalls } = mockCtx();

    sb.renderLabels(ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());

    expect(fillTextCalls.some((t) => t.includes('Oct') || t.includes('Sep'))).toBe(false);
    expect(fillTextCalls.some((t) => t.includes('thg') || /\d{1,2}\/\d{4}/.test(t))).toBe(true);
  });
});

describe('SessionBreaks in the display timezone', () => {
  it('breaks the day at midnight in the chart’s timezone, not the browser’s', () => {
    // 1h bars from 2026-07-01 00:00 UTC: midnight in New York (EDT) is 04:00 UTC.
    const start = Date.UTC(2026, 6, 1);
    const data: DataSeries = Array.from({ length: 30 }, (_, i) => ({
      time: start + i * 3_600_000, open: 1, high: 1, low: 1, close: 1, volume: 1,
    }));
    const breaks = new SessionBreaks();
    breaks.setConfig({ visible: true });
    breaks.setTimezone('America/New_York');
    const found = (breaks as unknown as { computeBreaksTyped(d: DataSeries): { idx: number }[] }).computeBreaksTyped(data);
    expect(found.map((b) => b.idx)).toEqual([4, 28]);

    breaks.setTimezone(0);
    const utcBreaks = (breaks as unknown as { computeBreaksTyped(d: DataSeries): { idx: number }[] }).computeBreaksTyped(data);
    expect(utcBreaks.map((b) => b.idx)).toEqual([24]);
  });
});


describe('SessionBreaks — lines under the bars, labels over them', () => {
  const breaks = () => {
    const sb = new SessionBreaks();
    sb.setVisible(true);
    sb.setTimezone(0);
    return sb;
  };

  it('draws only the lines in render, and only the labels in renderLabels', () => {
    const sb = breaks();
    const lines = mockCtx();
    sb.render(lines.ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());
    expect(lines.fillTextCalls).toEqual([]);
    expect(lines.ctx.stroke).toHaveBeenCalled();

    const labels = mockCtx();
    sb.renderLabels(labels.ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());
    expect(labels.fillTextCalls.length).toBeGreaterThan(0);
    expect(labels.ctx.stroke).not.toHaveBeenCalled();
  });

  it('gives the lines as rectangles, a dash each, heavier for bigger breaks', () => {
    const rects = breaks().lineRects(viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());
    // A day break at bar 24 (x 287.5) and a month break at bar 48 (x 575.5),
    // each dashed 6 on, 4 off down the 100 px plot.
    const day = rects.filter((r) => r.x === 287);
    expect(day).toHaveLength(10);
    expect(day[0]).toEqual({ x: 287, y: 0, width: 1, height: 6, color: DARK_THEME.axisLine, alpha: 0.22 });
    expect(day[1].y).toBe(10);
    const month = rects.filter((r) => r.x === 574.75);
    expect(month).toHaveLength(10);
    expect(month[0]).toMatchObject({ width: 1.5, height: 6, alpha: 0.5 });
  });

  it('cuts the last dash at the bottom of the plot', () => {
    const vp = { ...viewport(), chartRect: { x: 0, y: 0, width: 1000, height: 93 } };
    const day = breaks().lineRects(vp, DARK_THEME, hourlyBarsAcrossMonthBoundary()).filter((r) => r.x === 287);
    expect(day.at(-1)).toMatchObject({ y: 90, height: 3 });
  });

  it('gives a solid line as one rectangle', () => {
    const sb = breaks();
    sb.setConfig({ lineStyle: 'solid' });
    const day = sb.lineRects(viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary()).filter((r) => r.x === 287);
    expect(day).toEqual([{ x: 287, y: 0, width: 1, height: 100, color: DARK_THEME.axisLine, alpha: 0.22 }]);
  });

  it('gives nothing while hidden', () => {
    const sb = breaks();
    sb.setVisible(false);
    expect(sb.lineRects(viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary())).toEqual([]);
  });
});
