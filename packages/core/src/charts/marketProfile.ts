import type { OHLCBar } from '@tradecanvas/commons';

export interface MarketProfileBucket {
  /** Lower price bound of the bucket. */
  low: number;
  /** Upper price bound of the bucket. */
  high: number;
  /** Bucket midpoint price. */
  mid: number;
  /** TPO count — number of bars whose [low, high] range touched this bucket. */
  count: number;
}

export interface MarketProfile {
  /** Buckets ordered low → high price. */
  buckets: MarketProfileBucket[];
  /** Index of the Point of Control (highest-count bucket). */
  pocIndex: number;
  /** Highest bucket count. */
  maxCount: number;
  /** Sum of all bucket counts. */
  totalCount: number;
  /** Lower price bound of the value area. */
  valueAreaLow: number;
  /** Upper price bound of the value area. */
  valueAreaHigh: number;
}

export interface MarketProfileOptions {
  /** Number of price buckets (4–500). Default 48. */
  buckets?: number;
  /** Fraction of TPOs that define the value area (0–1). Default 0.7. */
  valueAreaPct?: number;
}

function clampIndex(i: number, max: number): number {
  return i < 0 ? 0 : i > max ? max : i;
}

/**
 * Time-Price-Opportunity (Market Profile) over a set of bars within a price
 * window. Each bar is one TPO bracket; a bucket's count is the number of bars
 * whose [low, high] range overlapped it. Returns the Point of Control (busiest
 * price) and a value area (the smallest price range, grown out from the POC by
 * the heavier adjacent bucket, that holds `valueAreaPct` of all TPOs).
 *
 * Returns null when there's nothing to profile (empty input or non-positive
 * price span).
 */
export function computeMarketProfile(
  bars: ReadonlyArray<OHLCBar>,
  priceMin: number,
  priceMax: number,
  opts: MarketProfileOptions = {},
): MarketProfile | null {
  const n = Math.max(4, Math.min(500, Math.floor(opts.buckets ?? 48)));
  const span = priceMax - priceMin;
  if (span <= 0 || bars.length === 0) return null;

  const bucketH = span / n;
  const counts = new Float64Array(n);

  for (const bar of bars) {
    const lo = Math.min(bar.low, bar.high);
    const hi = Math.max(bar.low, bar.high);
    if (hi < priceMin || lo > priceMax) continue;
    const loIdx = clampIndex(Math.floor((lo - priceMin) / bucketH), n - 1);
    const hiIdx = clampIndex(Math.floor((hi - priceMin) / bucketH), n - 1);
    for (let b = loIdx; b <= hiIdx; b++) counts[b] += 1;
  }

  let pocIndex = 0;
  let maxCount = 0;
  let totalCount = 0;
  for (let b = 0; b < n; b++) {
    totalCount += counts[b];
    if (counts[b] > maxCount) {
      maxCount = counts[b];
      pocIndex = b;
    }
  }
  if (totalCount === 0) return null;

  // Grow the value area out from the POC, always taking the heavier neighbour.
  const target = totalCount * (opts.valueAreaPct ?? 0.7);
  let lowI = pocIndex;
  let highI = pocIndex;
  let acc = counts[pocIndex];
  while (acc < target && (lowI > 0 || highI < n - 1)) {
    const below = lowI > 0 ? counts[lowI - 1] : -1;
    const above = highI < n - 1 ? counts[highI + 1] : -1;
    if (above >= below) {
      highI += 1;
      acc += counts[highI];
    } else {
      lowI -= 1;
      acc += counts[lowI];
    }
  }

  const buckets: MarketProfileBucket[] = [];
  for (let b = 0; b < n; b++) {
    const low = priceMin + b * bucketH;
    buckets.push({ low, high: low + bucketH, mid: low + bucketH / 2, count: counts[b] });
  }

  return {
    buckets,
    pocIndex,
    maxCount,
    totalCount,
    valueAreaLow: priceMin + lowI * bucketH,
    valueAreaHigh: priceMin + (highI + 1) * bucketH,
  };
}
