import type { ClosedTrade } from './types.js';

export interface MonteCarloOptions {
  /** Number of simulations to run. Default 1000. */
  simulations?: number;
  /** Deterministic seed (mulberry32). Default `Date.now() ^ 0`. */
  seed?: number;
  /** Percentiles to compute on the final-equity distribution. Default [5, 25, 50, 75, 95]. */
  percentiles?: number[];
}

export interface MonteCarloEquityBand {
  step: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MonteCarloResult {
  simulations: number;
  initialCash: number;
  /** Per-step equity percentiles (length = trades.length + 1). */
  equityBands: MonteCarloEquityBand[];
  /** Final-equity percentiles, keyed by the percentile values requested. */
  finalEquityPercentiles: Record<string, number>;
  /** Probability the final equity is above the initial cash. */
  probabilityProfitable: number;
  /** Worst single-simulation max drawdown (in % of running peak). */
  worstMaxDrawdownPct: number;
}

/**
 * Monte Carlo simulation that randomizes the *order* of realised trades and
 * replays them. This isolates path-dependence: a strategy that depends on
 * lucky sequencing will show a wide P5/P95 band, while a robust edge stays
 * tight. It does NOT bootstrap from per-bar returns — that's a different
 * (and noisier) flavor for a future addition.
 *
 * Implementation notes:
 *   - Each simulation is O(trades.length); total cost ≈ sims × trades.
 *   - Equity bands are computed at the trade-resolution timeline (one point
 *     per closed trade), so 1000 sims × 100 trades ≈ 100k float ops — fast.
 *   - Uses mulberry32 PRNG so results are reproducible with a fixed seed.
 */
export function runMonteCarlo(
  initialCash: number,
  trades: ReadonlyArray<ClosedTrade>,
  opts: MonteCarloOptions = {},
): MonteCarloResult {
  const simulations = opts.simulations ?? 1000;
  const percentiles = (opts.percentiles ?? [5, 25, 50, 75, 95]).slice().sort((a, b) => a - b);
  const rng = mulberry32(opts.seed ?? (Date.now() ^ 0x5a3c));

  if (trades.length === 0 || simulations <= 0) {
    return {
      simulations,
      initialCash,
      equityBands: [{ step: 0, p5: initialCash, p25: initialCash, p50: initialCash, p75: initialCash, p95: initialCash }],
      finalEquityPercentiles: Object.fromEntries(percentiles.map(p => [`p${p}`, initialCash])),
      probabilityProfitable: 0,
      worstMaxDrawdownPct: 0,
    };
  }

  const pnls = trades.map(t => t.pnl);
  const steps = trades.length + 1; // includes the starting point

  // Reuse arrays across simulations — avoid GC pressure for 1000+ runs.
  const shuffled = pnls.slice();
  const finals = new Float64Array(simulations);
  // equityMatrix[i][s] = equity at step s of simulation i. Allocated flat.
  const equityMatrix = new Float64Array(simulations * steps);
  let worstDrawdown = 0;
  let profitableCount = 0;

  for (let i = 0; i < simulations; i++) {
    fisherYates(shuffled, rng);

    let equity = initialCash;
    let peak = initialCash;
    let maxDd = 0;
    const base = i * steps;
    equityMatrix[base] = equity;

    for (let s = 0; s < shuffled.length; s++) {
      equity += shuffled[s];
      equityMatrix[base + s + 1] = equity;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? (peak - equity) / peak : 0;
      if (dd > maxDd) maxDd = dd;
    }

    finals[i] = equity;
    if (equity > initialCash) profitableCount++;
    if (maxDd > worstDrawdown) worstDrawdown = maxDd;
  }

  // Per-step bands: collect each step's column, sort, pick percentiles.
  const equityBands: MonteCarloEquityBand[] = [];
  const stepColumn = new Float64Array(simulations);
  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < simulations; i++) {
      stepColumn[i] = equityMatrix[i * steps + s];
    }
    // Float64Array supports sort in place, but doesn't accept a comparator —
    // it sorts numerically by default, which is exactly what we want.
    stepColumn.sort();
    equityBands.push({
      step: s,
      p5: percentileFromSorted(stepColumn, 5),
      p25: percentileFromSorted(stepColumn, 25),
      p50: percentileFromSorted(stepColumn, 50),
      p75: percentileFromSorted(stepColumn, 75),
      p95: percentileFromSorted(stepColumn, 95),
    });
  }

  // Final-equity percentiles
  const sortedFinals = new Float64Array(finals);
  sortedFinals.sort();
  const finalEquityPercentiles: Record<string, number> = {};
  for (const p of percentiles) {
    finalEquityPercentiles[`p${p}`] = percentileFromSorted(sortedFinals, p);
  }

  return {
    simulations,
    initialCash,
    equityBands,
    finalEquityPercentiles,
    probabilityProfitable: profitableCount / simulations,
    worstMaxDrawdownPct: worstDrawdown * 100,
  };
}

function fisherYates(arr: number[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function percentileFromSorted(sorted: ArrayLike<number>, p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  // Linear interpolation between adjacent ranks — same convention as numpy's
  // default. Index = (p/100) * (n - 1).
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

/**
 * Mulberry32 — small, fast, well-distributed PRNG. Deterministic given a
 * seed; collisions are negligible for sample sizes below 2^32.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
