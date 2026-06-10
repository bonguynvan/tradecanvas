import type { OHLCBar } from '@tradecanvas/commons';
import { timeframeBucketStart } from '@tradecanvas/commons';

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

/** TPO letter for a bracket index: A–Z then a–z, wrapping every 52. */
export function tpoLetter(index: number): string {
  const a = ((index % 52) + 52) % 52;
  return a < 26 ? String.fromCharCode(65 + a) : String.fromCharCode(97 + a - 26);
}

/**
 * For a single session's bars, the bracket (letter) indices that touched each
 * price bucket. `result[b]` is the ascending list of bar indices whose
 * [low, high] range overlapped bucket `b`. Bucket count matches
 * `computeMarketProfile` so letters and histogram line up.
 */
export function assignSessionLetters(
  bars: ReadonlyArray<OHLCBar>,
  priceMin: number,
  priceMax: number,
  buckets = 48,
): number[][] {
  const n = Math.max(4, Math.min(500, Math.floor(buckets)));
  const span = priceMax - priceMin;
  const out: number[][] = Array.from({ length: n }, () => []);
  if (span <= 0) return out;
  const bucketH = span / n;
  bars.forEach((bar, i) => {
    const lo = Math.min(bar.low, bar.high);
    const hi = Math.max(bar.low, bar.high);
    if (hi < priceMin || lo > priceMax) return;
    const loIdx = Math.max(0, Math.min(n - 1, Math.floor((lo - priceMin) / bucketH)));
    const hiIdx = Math.max(0, Math.min(n - 1, Math.floor((hi - priceMin) / bucketH)));
    for (let b = loIdx; b <= hiIdx; b++) out[b].push(i);
  });
  return out;
}

export interface SessionProfile {
  /** Index of the session's first bar within the input array. */
  startIndex: number;
  /** Index of the session's last bar within the input array (inclusive). */
  endIndex: number;
  /** UTC start-of-session timestamp (calendar-day bucket). */
  startTime: number;
  /** TPO profile for this session, against the shared price window. */
  profile: MarketProfile;
}

/**
 * Split a contiguous bar array into calendar-day sessions and compute a TPO
 * profile for each, all against the same shared price window so they line up
 * on a common y-axis. Sessions with no profile (e.g. a single flat bar) are
 * skipped. Input bars are assumed ascending by time.
 */
export function computeSessionProfiles(
  bars: ReadonlyArray<OHLCBar>,
  priceMin: number,
  priceMax: number,
  opts: MarketProfileOptions = {},
): SessionProfile[] {
  if (bars.length === 0 || priceMax - priceMin <= 0) return [];

  const out: SessionProfile[] = [];
  let groupStart = 0;
  let groupKey = timeframeBucketStart(bars[0].time, '1d');

  const flush = (start: number, end: number, key: number): void => {
    const profile = computeMarketProfile(bars.slice(start, end + 1), priceMin, priceMax, opts);
    if (profile) out.push({ startIndex: start, endIndex: end, startTime: key, profile });
  };

  for (let i = 1; i < bars.length; i++) {
    const key = timeframeBucketStart(bars[i].time, '1d');
    if (key !== groupKey) {
      flush(groupStart, i - 1, groupKey);
      groupStart = i;
      groupKey = key;
    }
  }
  flush(groupStart, bars.length - 1, groupKey);
  return out;
}
