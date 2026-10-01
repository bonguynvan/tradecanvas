import { describe, it, expect, vi } from 'vitest';
import type { ViewportState, OHLCBar } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { TradeZoneManager } from '../TradeZoneManager.js';

const MIN = 60_000;
const data: OHLCBar[] = Array.from({ length: 50 }, (_, i) => ({ time: i * MIN, open: 10, high: 11, low: 9, close: 10, volume: 1 }));
const viewport: ViewportState = {
  visibleRange: { from: 0, to: 49 },
  priceRange: { min: 0, max: 20 },
  barWidth: 8,
  barSpacing: 2,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 1000, height: 200 },
};

describe('TradeZoneManager — zones past the last bar', () => {
  it('still draws a zone opened inside the forming bar', () => {
    const mgr = new TradeZoneManager();
    mgr.setDataGetter(() => data);
    // Entry 20 s into the last (forming) 1-minute bar: maps to index 49.33.
    mgr.setZones([{ id: 'z', entryTime: 49 * MIN + 20_000, entryPrice: 10, direction: 'long' }]);
    const fillRect = vi.fn();
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key) => (key === 'fillRect' ? fillRect : key === 'measureText' ? () => ({ width: 10 }) : vi.fn()),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    mgr.render(ctx, viewport, DARK_THEME);
    expect(fillRect).toHaveBeenCalled();
  });
});
