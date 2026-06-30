/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling. Returns the indices (into
 * a series of `length` points, where x = index) that best preserve the visual
 * shape of the data when reduced to `threshold` points. Always keeps the first
 * and last index. Runs in O(length). Reference: Sveinn Steinarsson, 2013.
 */
export function lttbDownsample(
  length: number,
  threshold: number,
  getY: (index: number) => number,
): number[] {
  if (threshold >= length) {
    const all = new Array<number>(Math.max(0, length));
    for (let i = 0; i < length; i++) all[i] = i;
    return all;
  }
  if (threshold <= 2) {
    if (length >= 2) return [0, length - 1];
    return length === 1 ? [0] : [];
  }

  const sampled: number[] = [0]; // always keep the first point
  const bucketSize = (length - 2) / (threshold - 2);
  let a = 0; // index of the previously selected point

  for (let i = 0; i < threshold - 2; i++) {
    // Average point of the *next* bucket — the triangle's far vertex.
    const avgStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgEnd = Math.floor((i + 2) * bucketSize) + 1;
    if (avgEnd > length) avgEnd = length;
    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;
    for (let j = avgStart; j < avgEnd; j++) {
      avgX += j;
      avgY += getY(j);
      avgCount++;
    }
    if (avgCount > 0) {
      avgX /= avgCount;
      avgY /= avgCount;
    } else {
      const idx = Math.min(avgStart, length - 1);
      avgX = idx;
      avgY = getY(idx);
    }

    // Pick the point in the *current* bucket forming the largest triangle with
    // `a` and the next bucket's average.
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    const ay = getY(a);
    let maxArea = -1;
    let maxIndex = rangeStart;
    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs((a - avgX) * (getY(j) - ay) - (a - j) * (avgY - ay));
      if (area > maxArea) {
        maxArea = area;
        maxIndex = j;
      }
    }
    sampled.push(maxIndex);
    a = maxIndex;
  }

  sampled.push(length - 1); // always keep the last point
  return sampled;
}

/** Threshold below which a visible range isn't worth downsampling. */
const MIN_THRESHOLD = 64;

/**
 * Indices to draw for a line/area chart over the visible range `[from, to]`.
 * When the visible point count far exceeds the pixel width, the range is
 * LTTB-downsampled to ~2 points per pixel (preserving the shape); otherwise the
 * full visible range is returned. Keeps line charts smooth over 100k+ bars.
 */
export function lttbVisibleIndices(
  from: number,
  to: number,
  dataLength: number,
  width: number,
  getY: (index: number) => number,
): number[] {
  const lo = Math.max(0, from);
  const hi = Math.min(to, dataLength - 1);
  if (hi < lo) return [];

  const count = hi - lo + 1;
  const threshold = Math.max(MIN_THRESHOLD, Math.ceil(width * 2));

  if (count <= threshold) {
    const out = new Array<number>(count);
    for (let k = 0; k < count; k++) out[k] = lo + k;
    return out;
  }

  const local = lttbDownsample(count, threshold, (k) => getY(lo + k));
  for (let i = 0; i < local.length; i++) local[i] += lo;
  return local;
}
