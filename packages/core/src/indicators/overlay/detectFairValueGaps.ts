import type { DataSeries } from '@tradecanvas/commons';

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

/**
 * The fair value gaps of `data`, in the order they formed. Three bars make
 * one going up where the third's low is over the first's high: between the
 * two, only the middle bar traded. Going down, where the third's high is
 * under the first's low. A gap is filled by the first later bar that trades
 * through all of it (down to its bottom for a gap going up, up to its top
 * for one going down). A bar whose high or low is no number makes no gap.
 */
export function detectFairValueGaps(data: DataSeries, options: FairValueGapOptions = {}): FairValueGap[] {
  const minPercent = Number.isFinite(options.minPercent) ? Math.max(0, options.minPercent as number) : 0;
  const gaps: FairValueGap[] = [];
  // The gaps still open, each watched until a bar fills it.
  let open: FairValueGap[] = [];
  for (let i = 0; i < data.length; i++) {
    const { high, low } = data[i];
    if (open.length > 0 && Number.isFinite(high) && Number.isFinite(low)) {
      const still: FairValueGap[] = [];
      for (const gap of open) {
        const filled = gap.direction === 'up' ? low <= gap.bottom : high >= gap.top;
        if (filled) gap.filledAt = i;
        else still.push(gap);
      }
      open = still;
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
    open.push(gap);
  }
  return gaps;
}
