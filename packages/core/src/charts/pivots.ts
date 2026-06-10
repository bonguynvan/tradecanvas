import type { DataSeries } from '@tradecanvas/commons';

export interface Pivot {
  index: number;
  price: number;
  type: 'high' | 'low';
}

/** Market-structure label: higher/lower high, higher/lower low. */
export type StructureLabel = 'HH' | 'LH' | 'HL' | 'LL';

export interface ClassifiedPivot extends Pivot {
  label: StructureLabel;
}

/**
 * Label each pivot against the previous pivot of the same kind: a high is `HH`
 * when it exceeds the prior high else `LH`; a low is `HL` when it's above the
 * prior low else `LL`. The first high defaults to `HH` and the first low to
 * `LL` (no prior to compare). Input is assumed ordered by index.
 */
export function classifyPivots(pivots: ReadonlyArray<Pivot>): ClassifiedPivot[] {
  let lastHigh: number | undefined;
  let lastLow: number | undefined;
  return pivots.map((p) => {
    let label: StructureLabel;
    if (p.type === 'high') {
      label = lastHigh === undefined || p.price > lastHigh ? 'HH' : 'LH';
      lastHigh = p.price;
    } else {
      label = lastLow === undefined || p.price < lastLow ? 'LL' : 'HL';
      lastLow = p.price;
    }
    return { ...p, label };
  });
}

/**
 * Fractal pivot points: a bar is a pivot high when its high strictly exceeds
 * the highs of `left` bars before and `right` bars after (pivot low is the
 * mirror on lows). Ties disqualify, so flat plateaus aren't marked. Pivots
 * within `right` bars of the end aren't yet confirmed and are omitted.
 */
export function findPivots(data: DataSeries, left = 5, right = 5): Pivot[] {
  const l = Math.max(1, Math.floor(left));
  const r = Math.max(1, Math.floor(right));
  const out: Pivot[] = [];
  for (let i = l; i < data.length - r; i++) {
    const h = data[i].high;
    const lo = data[i].low;
    let isHigh = true;
    let isLow = true;
    for (let j = i - l; j <= i + r; j++) {
      if (j === i) continue;
      if (data[j].high >= h) isHigh = false;
      if (data[j].low <= lo) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) out.push({ index: i, price: h, type: 'high' });
    else if (isLow) out.push({ index: i, price: lo, type: 'low' });
  }
  return out;
}
