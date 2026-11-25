import { describe, it, expect, vi } from 'vitest';
import type { ViewportState } from '@tradecanvas/commons';
import { AlertDragHandler } from '../AlertDragHandler.js';
import type { AlertManager } from '../../features/AlertManager.js';

/** Prices 0–100 over a 100 px plot: y is 100 less the price. */
const viewport = {
  visibleRange: { from: 0, to: 100 },
  priceRange: { min: 0, max: 100 },
  barWidth: 10,
  barSpacing: 0,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 1000, height: 100 },
} as ViewportState;

function dragged(): { handler: AlertDragHandler; moved: ReturnType<typeof vi.fn> } {
  const moved = vi.fn();
  const alerts = { getAlertAtPoint: () => ({ id: 'a1' }), updateAlertPrice: moved } as unknown as AlertManager;
  const handler = new AlertDragHandler(alerts, () => viewport);
  handler.tryBegin({ x: 40, y: 50 });
  return { handler, moved };
}

describe('an alert dragged on the chart', () => {
  it('goes to the pointer’s price with no grid told', () => {
    const { handler, moved } = dragged();
    handler.move({ x: 40, y: 39.7 });
    expect(moved.mock.calls[0][0]).toBe('a1');
    expect(moved.mock.calls[0][1]).toBeCloseTo(60.3, 9);
  });

  it('keeps to the market’s grid when told one: an alert set by hand is at a price the market has', () => {
    const { handler, moved } = dragged();
    handler.setPriceRounding((price) => Math.round(price * 2) / 2);
    handler.move({ x: 40, y: 39.7 });
    expect(moved).toHaveBeenLastCalledWith('a1', 60.5);
    handler.move({ x: 40, y: 39.9 });
    expect(moved).toHaveBeenLastCalledWith('a1', 60);
    // A rounding that gives no price leaves the pointer's.
    handler.setPriceRounding(() => Number.NaN);
    handler.move({ x: 40, y: 39.7 });
    expect(moved.mock.calls.at(-1)![1]).toBeCloseTo(60.3, 9);
  });
});
