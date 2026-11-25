import type { DataSeries } from '@tradecanvas/commons';
import { FirstQueue } from './firstQueue.js';

/** A fair value gap: prices three bars left traded by the middle one alone. */
export interface FairValueGap {
  /** The middle bar, whose run left the gap: where its box starts. */
  index: number;
  /** The third bar, at whose close the gap is known. */
  formed: number;
  /** `'up'`: left by a rise (a bullish gap); `'down'`: by a fall. */
  direction: 'up' | 'down';
  top: number;
  bottom: number;
  /** The first bar after it to trade through all of it; null while it is open. */
  filledAt: number | null;
}

export interface FairValueGapOptions {
  /** The smallest gap kept, as a percent of its lower price; 0 keeps every one. */
  minPercent?: number;
}

/** The smallest gap kept, from what was asked for: no number and less than nothing are 0. */
export function fairValueGapFloor(minPercent: number | undefined): number {
  return Number.isFinite(minPercent) ? Math.max(0, minPercent as number) : 0;
}

/**
 * Brings `gaps`, found on bars that are unchanged before `from`, up to
 * `data`: the gaps formed at `from` or later are found again, and so is
 * where each gap open at `from` is filled. With no gaps and `from` 0 it
 * finds them all. `gaps` is changed in place and stays in the order the
 * gaps formed.
 */
export function resumeFairValueGaps(data: DataSeries, gaps: FairValueGap[], from: number, minPercent: number): void {
  const start = Math.max(0, from);
  while (gaps.length > 0 && gaps[gaps.length - 1].formed >= start) gaps.pop();
  // A gap going up is filled by a low at its bottom: the highest bottom goes first. Going down, the lowest top.
  const up = new FirstQueue<FairValueGap>((a, b) => a.bottom > b.bottom);
  const down = new FirstQueue<FairValueGap>((a, b) => a.top < b.top);
  for (const gap of gaps) {
    if (gap.filledAt !== null && gap.filledAt >= start) gap.filledAt = null;
    if (gap.filledAt === null) (gap.direction === 'up' ? up : down).add(gap);
  }
  for (let i = start; i < data.length; i++) {
    const { high, low } = data[i];
    if (Number.isFinite(high) && Number.isFinite(low)) {
      for (let gap = up.first; gap && gap.bottom >= low; gap = up.first) {
        gap.filledAt = i;
        up.removeFirst();
      }
      for (let gap = down.first; gap && gap.top <= high; gap = down.first) {
        gap.filledAt = i;
        down.removeFirst();
      }
    }
    if (i < 2) continue;
    const first = data[i - 2];
    let gap: FairValueGap | null = null;
    if (Number.isFinite(low) && Number.isFinite(first.high) && low > first.high) {
      gap = { index: i - 1, formed: i, direction: 'up', top: low, bottom: first.high, filledAt: null };
    } else if (Number.isFinite(high) && Number.isFinite(first.low) && high < first.low) {
      gap = { index: i - 1, formed: i, direction: 'down', top: first.low, bottom: high, filledAt: null };
    }
    if (!gap) continue;
    const size = gap.bottom !== 0 ? ((gap.top - gap.bottom) / Math.abs(gap.bottom)) * 100 : Infinity;
    if (size < minPercent) continue;
    gaps.push(gap);
    (gap.direction === 'up' ? up : down).add(gap);
  }
}

/**
 * The fair value gaps of `data`, in the order they formed. Three bars make
 * one going up where the third's low is over the first's high: between the
 * two, only the middle bar traded. Going down, where the third's high is
 * under the first's low. A gap is filled by the first later bar that trades
 * through all of it (down to its bottom for a gap going up, up to its top
 * for one going down). A bar whose high or low is no number makes no gap.
 */
export function detectFairValueGaps(data: DataSeries, options: FairValueGapOptions = {}): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  resumeFairValueGaps(data, gaps, 0, fairValueGapFloor(options.minPercent));
  return gaps;
}
