import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../MonteCarlo.js';
import type { ClosedTrade } from '../types.js';

function trades(pnls: number[]): ClosedTrade[] {
  return pnls.map((pnl, i) => ({
    entryTime: i * 1000,
    exitTime: i * 1000 + 500,
    side: 'long' as const,
    quantity: 1,
    entryPrice: 100,
    exitPrice: 100 + pnl,
    pnl,
    pnlPct: pnl / 100,
    commission: 0,
  }));
}

describe('runMonteCarlo', () => {
  it('returns a flat band when there are no trades', () => {
    const r = runMonteCarlo(10_000, [], { simulations: 100 });
    expect(r.equityBands).toHaveLength(1);
    expect(r.equityBands[0].p50).toBe(10_000);
    expect(r.probabilityProfitable).toBe(0);
  });

  it('final equity is identical regardless of order (commutativity check)', () => {
    // Sum of P&L is invariant under shuffling, so every percentile of final
    // equity equals initial + sum.
    const t = trades([100, -50, 30, 20]);
    const r = runMonteCarlo(1_000, t, { simulations: 200, seed: 42 });
    const expectedFinal = 1_000 + 100 - 50 + 30 + 20;
    for (const key of Object.keys(r.finalEquityPercentiles)) {
      expect(r.finalEquityPercentiles[key]).toBeCloseTo(expectedFinal, 6);
    }
  });

  it('intermediate bands fan out when trades are heterogeneous', () => {
    const t = trades([-500, 500, -300, 300, -100, 100]);
    const r = runMonteCarlo(10_000, t, { simulations: 500, seed: 7 });
    // Midpoint step should show meaningful dispersion between P5 and P95
    // because order matters for the equity path, even though the sum is 0.
    const mid = r.equityBands[Math.floor(r.equityBands.length / 2)];
    expect(mid.p95 - mid.p5).toBeGreaterThan(0);
  });

  it('same seed reproduces same percentile bands', () => {
    const t = trades([50, -20, 40, -30, 60, -10]);
    const a = runMonteCarlo(1_000, t, { simulations: 200, seed: 123 });
    const b = runMonteCarlo(1_000, t, { simulations: 200, seed: 123 });
    expect(a.equityBands).toEqual(b.equityBands);
    expect(a.finalEquityPercentiles).toEqual(b.finalEquityPercentiles);
  });

  it('reports probabilityProfitable in [0,1]', () => {
    const t = trades([100, 50, -200, 80, 60]); // net positive
    const r = runMonteCarlo(1_000, t, { simulations: 500, seed: 1 });
    expect(r.probabilityProfitable).toBeGreaterThanOrEqual(0);
    expect(r.probabilityProfitable).toBeLessThanOrEqual(1);
  });
});
