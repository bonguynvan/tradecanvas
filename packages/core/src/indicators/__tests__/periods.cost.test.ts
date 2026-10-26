import { describe, it, expect, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';

// The keyer's own lookups of the zone's offset, counted: those inside commons
// call it directly and are not.
const offsets = vi.hoisted(() => ({ calls: 0 }));
vi.mock('@tradecanvas/commons', async (actual) => {
  const commons = await actual<typeof import('@tradecanvas/commons')>();
  return {
    ...commons,
    zoneOffsetMinutes: (zone: string, timeMs: number) => {
      offsets.calls++;
      return commons.zoneOffsetMinutes(zone, timeMs);
    },
  };
});

const { periodKeyer } = await import('../periods.js');

describe('periodKeyer on the exchange’s clock', () => {
  it('works a period out once, not each bar in it', () => {
    // Ten New York days of minute bars, from midnight there.
    const days = 10;
    const data: OHLCBar[] = Array.from({ length: days * 24 * 60 }, (_, i) => ({ time: Date.UTC(2026, 9, 19, 4) + i * 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
    const key = periodKeyer(data, 'session', 'America/New_York');
    offsets.calls = 0;
    const keys = new Set(data.map((b) => key(b.time)));
    expect(keys.size).toBe(days);
    expect(offsets.calls).toBeLessThanOrEqual(days);
  });
});
