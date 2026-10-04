import { describe, it, expect, vi } from 'vitest';
import type { DataSeries, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { SessionShading } from '../SessionShading.js';

function viewport(): ViewportState {
  return {
    visibleRange: { from: 0, to: 23 },
    priceRange: { min: 0, max: 100 },
    barWidth: 10,
    barSpacing: 2,
    offset: 0,
    chartRect: { x: 0, y: 0, width: 400, height: 100 },
  };
}

// 24 hourly bars through one day, UTC; the session 09:00–17:00 UTC.
function day(): DataSeries {
  const start = Date.UTC(2026, 6, 1);
  return Array.from({ length: 24 }, (_, i) => ({ time: start + i * 3_600_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
}

function shading() {
  const s = new SessionShading();
  s.setVisible(true);
  s.replaceConfig({ startMinute: 9 * 60, endMinute: 17 * 60, tzOffsetMinutes: 0 });
  return s;
}

describe('SessionShading', () => {
  it('gives a rectangle per run of bars outside the session', () => {
    const rects = shading().rects(day(), viewport(), DARK_THEME);
    // Bars 0–8 before the session, 17–23 after it, each a 12 px slot
    // centred on the bar (bar 0 at x 5).
    expect(rects).toEqual([
      { x: -1, y: 0, width: 108, height: 100, color: 'rgba(0,0,0,0.28)', alpha: 1 },
      { x: 203, y: 0, width: 84, height: 100, color: 'rgba(0,0,0,0.28)', alpha: 1 },
    ]);
  });

  it('shades lighter on a light theme', () => {
    expect(shading().rects(day(), viewport(), LIGHT_THEME)[0].color).toBe('rgba(0,0,0,0.045)');
  });

  it('fills the same rectangles in 2D', () => {
    const fillRect = vi.fn();
    const ctx = { save: vi.fn(), restore: vi.fn(), fillRect, set fillStyle(_v: string) {} } as unknown as CanvasRenderingContext2D;
    shading().render(ctx, day(), viewport(), DARK_THEME);
    expect(fillRect.mock.calls).toEqual([[-1, 0, 108, 100], [203, 0, 84, 100]]);
  });

  it('gives nothing while hidden', () => {
    const s = shading();
    s.setVisible(false);
    expect(s.rects(day(), viewport(), DARK_THEME)).toEqual([]);
  });
});
