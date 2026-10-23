import { describe, it, expect, vi, afterEach } from 'vitest';
import type { OHLCBar, ViewportState } from '@tradecanvas/commons';
import { LIGHT_THEME } from '@tradecanvas/commons';
import { BarCountdown, COUNTDOWN_HEIGHT } from '../BarCountdown.js';
import { CurrentPriceLine } from '../../realtime/CurrentPriceLine.js';

const viewport: ViewportState = {
  visibleRange: { from: 0, to: 10 },
  priceRange: { min: 90, max: 110 },
  barWidth: 6,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 200, height: 100 },
  priceAxisWidth: 70,
};

function recorder() {
  const texts: { text: string; x: number; y: number }[] = [];
  const fills: string[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key === 'measureText') return (t: string) => ({ width: t.length * 7 });
      if (key === 'fillText') return (text: string, x: number, y: number) => texts.push({ text, x, y });
      if (key === 'fill' || key === 'fillRect' || key === 'roundRect' || key === 'rect') {
        return () => fills.push(String(target.fillStyle));
      }
      if (key in target) return target[key];
      return vi.fn();
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, fills };
}

afterEach(() => vi.useRealTimers());

describe('the bar countdown', () => {
  it('hangs under the last-price tag, in its colour, at its left edge', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, 10));
    const data: OHLCBar[] = [{ time: Date.UTC(2026, 0, 1), open: 99, high: 101, low: 98, close: 100, volume: 1 }];
    const line = new CurrentPriceLine();
    line.setPrice(100, 99);
    line.render(recorder().ctx, viewport, LIGHT_THEME);
    const tag = line.getTag()!;
    expect(tag).toMatchObject({ x: 201, color: LIGHT_THEME.candleUp });

    const countdown = new BarCountdown();
    countdown.setTimeframeMs(60_000);
    expect(countdown.isShown(data)).toBe(true);
    const { ctx, texts, fills } = recorder();
    countdown.render(ctx, viewport, LIGHT_THEME, data, tag);
    expect(texts).toEqual([{ text: '0:50', x: tag.x + 5, y: tag.y + tag.height + COUNTDOWN_HEIGHT / 2 }]);
    expect(fills).toContain(tag.color);
  });

  it('shows only with the tag, a clock-bound bar and time left', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 2));
    const data: OHLCBar[] = [{ time: Date.UTC(2026, 0, 1), open: 99, high: 101, low: 98, close: 100, volume: 1 }];
    const countdown = new BarCountdown();
    countdown.setTimeframeMs(60_000);
    // The bar closed a minute ago and no new one came: nothing to count.
    expect(countdown.isShown(data)).toBe(false);
    countdown.setTimeframeMs(0);
    expect(countdown.isShown(data)).toBe(false);

    vi.setSystemTime(Date.UTC(2026, 0, 1, 0, 0, 10));
    countdown.setTimeframeMs(60_000);
    const { ctx, texts } = recorder();
    countdown.render(ctx, viewport, LIGHT_THEME, data, null);
    expect(texts).toEqual([]);
  });

  it('forgets the tag when the last price is off the plot', () => {
    const line = new CurrentPriceLine();
    line.setPrice(500);
    line.render(recorder().ctx, viewport, LIGHT_THEME);
    expect(line.getTag()).toBeNull();
  });
});
