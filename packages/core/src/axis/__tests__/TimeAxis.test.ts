import { describe, it, expect } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TimeAxis, TZ_LABEL_GAP_PX } from '../TimeAxis.js';

/** Records each fillText with the font it was drawn in; text is 6 px a character. */
function recordingCtx(): { ctx: CanvasRenderingContext2D; drawn: { text: string; x: number; align: string }[] } {
  const drawn: { text: string; x: number; align: string }[] = [];
  const state: Record<string, unknown> = { font: '', textAlign: 'start' };
  const ctx = new Proxy(state, {
    get: (t, p) => {
      if (p === 'fillText') return (text: string, x: number) => drawn.push({ text, x, align: String(t.textAlign) });
      if (p === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (p in t) return t[p as string];
      return () => {};
    },
    set: (t, p, v) => { t[p as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

const HOUR = 3_600_000;
const data = Array.from({ length: 100 }, (_, i) => ({
  time: Date.UTC(2026, 9, 1) + i * HOUR, open: 1, high: 1, low: 1, close: 1, volume: 1,
}));

function viewport(offset: number): ViewportState {
  return {
    chartRect: { x: 0, y: 0, width: 400, height: 300 },
    barWidth: 8,
    barSpacing: 2,
    offset,
    priceRange: { min: 0, max: 2 },
    visibleRange: { from: 0, to: 99 },
  } as unknown as ViewportState;
}

describe('TimeAxis', () => {
  it('never draws a tick label over the timezone tag', () => {
    const axis = new TimeAxis();
    axis.setTimezoneOffset(420); // "UTC+7"
    // Scan offsets so a tick lands at every distance from the right edge.
    for (let offset = 560; offset < 640; offset += 1) {
      const { ctx, drawn } = recordingCtx();
      axis.render(ctx, viewport(offset), DARK_THEME, data);
      const tz = drawn.find((d) => d.align === 'right');
      expect(tz?.text).toBe('UTC+7');
      const tzLeft = 400 - 4 - tz!.text.length * 6;
      for (const tick of drawn.filter((d) => d.align === 'center')) {
        expect(tick.x + (tick.text.length * 6) / 2, `offset ${offset}: "${tick.text}"`).toBeLessThanOrEqual(tzLeft - TZ_LABEL_GAP_PX + 0.001);
      }
    }
  });

  it('still labels the rest of the axis', () => {
    const { ctx, drawn } = recordingCtx();
    new TimeAxis().render(ctx, viewport(600), DARK_THEME, data);
    expect(drawn.filter((d) => d.align === 'center').length).toBeGreaterThanOrEqual(3);
  });
});
