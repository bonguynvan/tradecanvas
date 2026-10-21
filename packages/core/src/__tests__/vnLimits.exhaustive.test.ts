import { describe, it, expect } from 'vitest';
import {
  MARKET_HOSE,
  MARKET_HNX,
  MARKET_UPCOM,
  MARKET_VN30F,
  computePriceLimits,
  scaleMarketPrices,
  type MarketConfig,
} from '@tradecanvas/commons';

/**
 * Every reference price on the grid against integer arithmetic: a band of
 * `pct` percent is `ref × (100 ± pct) / 100` exactly, so the ceiling is the
 * highest tick at or under that and the floor the lowest at or over it. The
 * products in floating point land a hair off (12 × 1.15 = 13.799999…), which
 * must not move a limit that falls exactly on a tick.
 */
type Grid = { name: string; config: MarketConfig; unit: number; step: (units: number) => number; from: number; to: number };

/** Prices in whole units of the grid (dong; tenths of a point for the futures). */
const GRIDS: Grid[] = [
  { name: 'HOSE', config: MARKET_HOSE, unit: 1000, step: (d) => (d < 10_000 ? 10 : d < 50_000 ? 50 : 100), from: 1_000, to: 300_000 },
  { name: 'HNX', config: MARKET_HNX, unit: 1000, step: () => 100, from: 1_000, to: 300_000 },
  { name: 'UPCOM', config: MARKET_UPCOM, unit: 1000, step: () => 100, from: 1_000, to: 300_000 },
  { name: 'VN30F', config: MARKET_VN30F, unit: 10, step: () => 1, from: 5_000, to: 30_000 },
];

const onGrid = (g: Grid, units: number) => units % g.step(units) === 0;

/** Highest tick at or under `num / 100` units, and lowest at or over it. */
function expected(g: Grid, num: number): { down: number; up: number } {
  let down = Math.floor(num / 100);
  while (!onGrid(g, down)) down--;
  let up = Math.ceil(num / 100);
  while (!onGrid(g, up)) up++;
  return { down, up };
}

describe('VN price limits against integer arithmetic', () => {
  for (const g of GRIDS) {
    it(`${g.name}: every reference's ceiling and floor`, () => {
      const pct = g.config.priceLimits!.ceilingPercent!;
      const scaled = g.unit === 1000 ? scaleMarketPrices(g.config, 1000) : null;
      const wrong: string[] = [];
      for (let ref = g.from; ref <= g.to; ref += 1) {
        if (!onGrid(g, ref)) continue;
        const ceil = expected(g, ref * (100 + pct)).down;
        const floor = expected(g, ref * (100 - pct)).up;
        // The exchanges' special cases (a band under one tick) are tested elsewhere.
        if (ceil <= ref || floor >= ref) continue;
        const limits = computePriceLimits(ref / g.unit, g.config)!;
        const got = { ceiling: Math.round(limits.ceiling * g.unit), floor: Math.round(limits.floor * g.unit) };
        if (got.ceiling !== ceil || got.floor !== floor) wrong.push(`${ref}: ${got.ceiling}/${got.floor} vs ${ceil}/${floor}`);
        if (scaled) {
          const dong = computePriceLimits(ref, scaled)!;
          if (dong.ceiling !== ceil || dong.floor !== floor) wrong.push(`${ref} (dong): ${dong.ceiling}/${dong.floor} vs ${ceil}/${floor}`);
        }
        if (wrong.length > 10) break;
      }
      expect(wrong).toEqual([]);
    });
  }
});
