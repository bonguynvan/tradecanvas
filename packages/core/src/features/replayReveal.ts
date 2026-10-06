import type { SignalMarker, TradeZone } from '@tradecanvas/commons';

/**
 * The markers a replay has reached: those before `until` (everything shown
 * so far is before it), from `from` on (a replay without the history before
 * its start). `null`, without a replay: all of them.
 */
export function revealMarkers(markers: readonly SignalMarker[], until: number | null, from = -Infinity): readonly SignalMarker[] {
  return until === null ? markers : markers.filter((m) => m.time >= from && m.time < until);
}

/**
 * The trades a replay has reached: those entered before `until` (and from
 * `from` on), each drawn open (no exit, no result) until its exit is
 * reached. `null`: all of them.
 */
export function revealZones(zones: readonly TradeZone[], until: number | null, from = -Infinity): readonly TradeZone[] {
  if (until === null) return zones;
  return zones
    .filter((z) => z.entryTime >= from && z.entryTime < until)
    .map((z) => {
      if (z.exitTime === undefined || z.exitTime < until) return z;
      const { exitTime: _exitTime, exitPrice: _exitPrice, pnl: _pnl, pnlPercent: _pnlPercent, ...open } = z;
      return open;
    });
}
