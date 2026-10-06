import { describe, it, expect } from 'vitest';
import type { SignalMarker, TradeZone } from '@tradecanvas/commons';
import { revealMarkers, revealZones } from '../replayReveal.js';
import { SignalMarkerManager } from '../SignalMarkerManager.js';
import { TradeZoneManager } from '../TradeZoneManager.js';

const marker = (id: string, time: number): SignalMarker =>
  ({ id, time, price: 100, direction: 'long', confidence: 1 }) as SignalMarker;
const zone = (id: string, entryTime: number, exitTime?: number): TradeZone => ({
  id,
  entryTime,
  entryPrice: 100,
  direction: 'long',
  ...(exitTime !== undefined ? { exitTime, exitPrice: 110, pnl: 10, pnlPercent: 10 } : {}),
});

describe('what a replay has reached', () => {
  it('shows the markers before the time reached, and every one without a replay', () => {
    const markers = [marker('a', 10), marker('b', 20), marker('c', 30)];
    expect(revealMarkers(markers, 25).map((m) => m.id)).toEqual(['a', 'b']);
    expect(revealMarkers(markers, null)).toBe(markers);
  });

  it('shows the trades entered before the time reached, open until their exit is reached', () => {
    const zones = [zone('done', 5, 15), zone('open', 10, 40), zone('later', 30, 50), zone('live', 12)];
    const shown = revealZones(zones, 25);
    expect(shown.map((z) => z.id)).toEqual(['done', 'open', 'live']);
    expect(shown[0]).toEqual(zones[0]);
    expect(shown[1]).toEqual({ id: 'open', entryTime: 10, entryPrice: 100, direction: 'long' });
    expect(zones[1].exitTime).toBe(40); // the caller's zones stay as they were
    expect(revealZones(zones, null)).toBe(zones);
  });
});

describe('managers drawing what a replay has reached', () => {
  it('keeps every marker, and reveals only those reached', () => {
    const markers = new SignalMarkerManager();
    markers.setMarkers([marker('a', 10), marker('b', 30)]);
    markers.setRevealUntil(20);
    expect(markers.shownMarkers().map((m) => m.id)).toEqual(['a']);
    expect(markers.getMarkers()).toHaveLength(2);
    markers.setRevealUntil(null);
    expect(markers.shownMarkers()).toHaveLength(2);
  });

  it('reveals the trade zones the same way', () => {
    const zones = new TradeZoneManager();
    zones.setZones([zone('a', 10, 40), zone('b', 30)]);
    zones.setRevealUntil(20);
    expect(zones.shownZones()).toEqual([{ id: 'a', entryTime: 10, entryPrice: 100, direction: 'long' }]);
    expect(zones.getZones()).toHaveLength(2);
  });
});
