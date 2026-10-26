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
      measureText: (text: string) => ({ width: text.length * 6 }),
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

// The time axis names the days, months and years at every zoom, so the breaks
// are lines only: a date along the top repeated the axis and ran under the legend.
describe('SessionBreaks — lines only, the dates are on the time axis', () => {
  it('draws the lines of a month boundary and writes no text', () => {
    const sb = new SessionBreaks();
    sb.setVisible(true);
    const { ctx, fillTextCalls } = mockCtx();

    sb.render(ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());

    expect(ctx.stroke).toHaveBeenCalled();
    expect(fillTextCalls).toEqual([]);
  });

  it('keeps renderLabels, which draws nothing in any locale', () => {
    const sb = new SessionBreaks();
    sb.setVisible(true);
    sb.setLocale('vi-VN');
    const { ctx, fillTextCalls } = mockCtx();

    sb.renderLabels(ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());

    expect(fillTextCalls).toEqual([]);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it('writes no row of dates over 4h bars zoomed out to the whole series', () => {
    // A downstream app's case: "All" on daily bars, then 4h, kept the zoom out
    // and printed every Monday and month along the top of the plot.
    const end = Date.UTC(2026, 9, 25, 8);
    const bars: DataSeries = Array.from({ length: 5000 }, (_, i) => ({
      time: end - (4999 - i) * 4 * 3_600_000, open: 1, high: 1, low: 1, close: 1, volume: 1,
    }));
    const width = 1270;
    const vp: ViewportState = {
      visibleRange: { from: 0, to: bars.length - 1 },
      priceRange: { min: 0, max: 2 },
      barWidth: 0.632,
      barSpacing: 0.632,
      offset: bars.length * 1.264 - width,
      chartRect: { x: 0, y: 0, width, height: 700 },
    };
    const sb = new SessionBreaks();
    sb.setVisible(true);
    sb.setTimezone(0);
    const { ctx, fillTextCalls } = mockCtx();

    sb.render(ctx, vp, DARK_THEME, bars);

    expect(ctx.moveTo).toHaveBeenCalled();
    expect(fillTextCalls).toEqual([]);
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


describe('SessionBreaks — lines under the bars', () => {
  const breaks = () => {
    const sb = new SessionBreaks();
    sb.setVisible(true);
    sb.setTimezone(0);
    return sb;
  };

  it('draws the same lines in render as in renderLines, and no text in either', () => {
    const sb = breaks();
    const data = hourlyBarsAcrossMonthBoundary();
    const lines = mockCtx();
    sb.renderLines(lines.ctx, viewport(), DARK_THEME, data);
    expect(lines.fillTextCalls).toEqual([]);
    expect(lines.ctx.stroke).toHaveBeenCalled();

    const both = mockCtx();
    sb.render(both.ctx, viewport(), DARK_THEME, data);
    expect(vi.mocked(both.ctx.moveTo).mock.calls).toEqual(vi.mocked(lines.ctx.moveTo).mock.calls);
    expect(both.fillTextCalls).toEqual([]);
  });

  it('gives a rectangle per line, dashed, heavier for bigger breaks', () => {
    const rects = breaks().lineRects(viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());
    // A day break at bar 24 (x 287.5) and a month break at bar 48 (x 575.5),
    // down the 100 px plot, 6 on and 4 off.
    expect(rects.find((r) => r.x === 287)).toEqual({ x: 287, y: 0, width: 1, height: 100, color: DARK_THEME.axisLine, alpha: 0.22, dash: [6, 4] });
    expect(rects.find((r) => r.x === 574.75)).toMatchObject({ width: 1.5, height: 100, alpha: 0.5, dash: [6, 4] });
  });

  it('dots a dotted line', () => {
    const sb = breaks();
    sb.setConfig({ lineStyle: 'dotted' });
    const day = sb.lineRects(viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary()).find((r) => r.x === 287);
    expect(day?.dash).toEqual([2, 3]);
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

describe('SessionBreaks — zoomed far out', () => {
  // Hourly bars, seven a day on weekdays, for three years, at a quarter pixel a bar.
  const bars: DataSeries = [];
  for (let t = Date.UTC(2023, 0, 2); t < Date.UTC(2026, 0, 1); t += 3_600_000) {
    const d = new Date(t);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6 || d.getUTCHours() < 2 || d.getUTCHours() > 8) continue;
    bars.push({ time: t, open: 1, high: 1, low: 1, close: 1, volume: 1 });
  }
  const vp: ViewportState = {
    visibleRange: { from: 0, to: bars.length - 1 },
    priceRange: { min: 0, max: 2 },
    barWidth: 0.2,
    barSpacing: 0.05,
    offset: 0,
    chartRect: { x: 0, y: 0, width: bars.length * 0.25, height: 300 },
  };

  function drawn() {
    const texts: { text: string; x: number }[] = [];
    const lines: number[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key) => {
        if (key === 'fillText') return (text: string, x: number) => texts.push({ text, x });
        if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
        if (key === 'moveTo') return (x: number) => lines.push(x);
        return vi.fn();
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const breaks = new SessionBreaks();
    breaks.setVisible(true);
    breaks.setTimezone(0);
    breaks.render(ctx, vp, DARK_THEME, bars);
    return { texts, lines };
  }

  it('draws lines but no dates', () => {
    const { texts, lines } = drawn();
    expect(lines.length).toBeGreaterThan(0);
    expect(texts).toEqual([]);
  });

  it('draws no lines closer than a few pixels', () => {
    const xs = [...new Set(drawn().lines)].sort((a, b) => a - b);
    expect(xs.length).toBeGreaterThan(10);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(6);
  });
});

describe('SessionBreaks on daily bars', () => {
  // Weekdays of September to November 2026 in Ho Chi Minh City, each built at
  // its midnight there: 17:00 UTC the day before. Read in UTC or New York,
  // each is dated a day early, which would put a week or month line one bar
  // off; the time axis dates them by the exchange's zone instead.
  const days: DataSeries = [];
  for (let t = Date.UTC(2026, 8, 1); t < Date.UTC(2026, 10, 30); t += 86_400_000) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push({ time: t - 7 * 3_600_000, open: 1, high: 1, low: 1, close: 1, volume: 1 });
  }

  it('draws no lines in any zone shown, so a day read in another zone moves none', () => {
    const vp: ViewportState = { ...viewport(), visibleRange: { from: 0, to: days.length } };
    for (const zone of [0, 'America/New_York', 'Asia/Ho_Chi_Minh']) {
      const sb = new SessionBreaks();
      sb.setVisible(true);
      sb.setTimezone(zone);
      expect(sb.lineRects(vp, DARK_THEME, days)).toEqual([]);
    }
  });
});
