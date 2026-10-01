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

    sb.render(ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());

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

    sb.render(ctx, viewport(), DARK_THEME, hourlyBarsAcrossMonthBoundary());

    expect(fillTextCalls.some((t) => t.includes('Oct') || t.includes('Sep'))).toBe(false);
    expect(fillTextCalls.some((t) => t.includes('thg') || /\d{1,2}\/\d{4}/.test(t))).toBe(true);
  });
});
