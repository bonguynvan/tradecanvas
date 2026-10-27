import type { OHLCBar } from '@tradecanvas/commons';

/**
 * How one bar of the chart forms in a replay. The bar walks a path of
 * prices: from its finer bars when they are loaded, else from the bar itself
 * (open, the extreme its direction says came first, the other, close). The
 * replay's position is a bar and a fraction of it, so finer bars that land
 * late change how the next bars form, never which bar is which.
 */
export interface PathPoint {
  price: number;
  /** When it traded, as far as the bars tell: the finer bar's time. */
  time: number;
  /** How far into the bar (0..1) the replay is when it reaches this point. */
  at: number;
}

export interface IntrabarPath {
  bar: OHLCBar;
  points: PathPoint[];
  /** Volume traded by the end of each finer piece, scaled to the bar's own volume. */
  volumeAt: { at: number; volume: number }[];
}

/** Each of a piece's three legs takes this share of it when the piece doesn't move. */
const FLAT_LEG = 1 / 3;
/** How far outside the bar's range (as a share of it) a finer bar may close and still be the bar's. */
const PIECE_CLOSE_SLACK = 0.25;
/** The share of finer bars that may close outside it before they are taken for another series. */
const MAX_STRAY_PIECES = 0.5;

/**
 * Whether the finer bars trade where the bar does. A feed that makes up
 * each interval on its own (a demo feed, say) gives minutes far from the
 * hour; pulled onto the hour they would sit at its high or low for most of
 * it, and the bar would look whole a moment after it starts.
 */
function piecesFit(bar: OHLCBar, pieces: readonly OHLCBar[]): boolean {
  const slack = (bar.high - bar.low) * PIECE_CLOSE_SLACK;
  const stray = pieces.filter((p) => p.close > bar.high + slack || p.close < bar.low - slack).length;
  return stray <= pieces.length * MAX_STRAY_PIECES;
}

/** A bar's own path: down first when it rose (or stayed), up first when it fell (as paper fills decide). */
function ownPath(bar: OHLCBar): number[] {
  return bar.close >= bar.open ? [bar.open, bar.low, bar.high, bar.close] : [bar.open, bar.high, bar.low, bar.close];
}

/** The points of finer piece `j` of `n`: its legs take time in proportion to the price they cover. */
function piecePoints(piece: OHLCBar, j: number, n: number): PathPoint[] {
  const prices = ownPath(piece);
  const legs = [1, 2, 3].map((k) => Math.abs(prices[k] - prices[k - 1]));
  const total = legs[0] + legs[1] + legs[2];
  const out: PathPoint[] = [];
  let walked = 0;
  prices.forEach((price, k) => {
    if (k > 0) walked += total > 0 ? legs[k - 1] / total : FLAT_LEG;
    // A piece's open is the previous piece's close in time: skip it when they meet.
    if (k === 0 && j > 0) return;
    out.push({ price, time: piece.time, at: (j + walked) / n });
  });
  return out;
}

/**
 * The path bar `bar` takes, from `finer` (its finer bars, sorted, all inside
 * it) or from itself (also when they trade somewhere else). Each finer bar takes an equal share of the bar's time,
 * and inside it the price moves at an even pace. The path is made to agree
 * with `bar`: it starts at its open, ends at its close and reaches its high
 * and low, so the last frame is the bar as the series has it (venues differ
 * between intervals: auction closes, trades missing from the minutes).
 */
export function intrabarPath(bar: OHLCBar, finer: readonly OHLCBar[] = []): IntrabarPath {
  const pieces = finer.length > 0 && piecesFit(bar, finer) ? finer : [bar];
  const n = pieces.length;
  const points = reconcile(pieces.flatMap((piece, j) => piecePoints(piece, j, n)), bar);
  const sum = pieces.reduce((s, p) => s + (p.volume ?? 0), 0);
  let acc = 0;
  const volumeAt = pieces.map((p, j) => {
    acc += sum > 0 ? ((p.volume ?? 0) / sum) * (bar.volume ?? 0) : (bar.volume ?? 0) / n;
    return { at: (j + 1) / n, volume: acc };
  });
  return { bar, points, volumeAt };
}

/** The path pulled onto the bar: its open, its close, inside its range and touching both ends of it. */
function reconcile(raw: PathPoint[], bar: OHLCBar): PathPoint[] {
  const last = raw.length - 1;
  const points = raw.map((pt, i) => ({
    ...pt,
    price: i === 0 ? bar.open : i === last ? bar.close : Math.min(bar.high, Math.max(bar.low, pt.price)),
  }));
  // An extreme the open or close already is needs no point of its own; else the path's
  // highest (lowest) point inside the bar becomes it.
  const touch = (extreme: number, better: (a: number, b: number) => boolean): void => {
    if (points[0].price === extreme || points[last].price === extreme || last < 2) return;
    let at = 1;
    for (let i = 2; i < last; i++) if (better(points[i].price, points[at].price)) at = i;
    points[at] = { ...points[at], price: extreme };
  };
  touch(bar.high, (a, b) => a > b);
  touch(bar.low, (a, b) => a < b);
  return points;
}

/** The price `f` (0..1) of the way through the path. */
function priceAt(path: IntrabarPath, f: number): number {
  const p = path.points;
  if (f <= p[0].at) return p[0].price;
  for (let i = 1; i < p.length; i++) {
    if (f <= p[i].at) {
      const span = p[i].at - p[i - 1].at;
      return span > 0 ? p[i - 1].price + ((p[i].price - p[i - 1].price) * (f - p[i - 1].at)) / span : p[i].price;
    }
  }
  return p[p.length - 1].price;
}

/** `fraction` clamped to 0..1 (NaN is the start). */
const clampFraction = (fraction: number): number => (Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0);

/** The volume traded `f` of the way through the path. */
function volumeAt(path: IntrabarPath, f: number): number {
  let done = 0;
  let start = 0;
  for (const v of path.volumeAt) {
    if (f >= v.at) {
      done = v.volume;
      start = v.at;
      continue;
    }
    return done + ((v.volume - done) * (f - start)) / (v.at - start);
  }
  return done;
}

/** The bar as it stands `fraction` of the way through it (clamped; NaN is its start). */
export function formingAt(path: IntrabarPath, fraction: number): OHLCBar {
  const f = clampFraction(fraction);
  if (f >= 1) return { ...path.bar };
  const close = priceAt(path, f);
  let high = Math.max(path.points[0].price, close);
  let low = Math.min(path.points[0].price, close);
  for (const pt of path.points) {
    if (pt.at > f) break;
    high = Math.max(high, pt.price);
    low = Math.min(low, pt.price);
  }
  return { time: path.bar.time, open: path.points[0].price, high, low, close, volume: volumeAt(path, f) };
}

/**
 * Where reduced motion shows the bar `fraction` of the way through it: at
 * the last point of the path reached by then, so the price steps from one
 * point to the next without sliding between them.
 */
export function pathStop(path: IntrabarPath, fraction: number): number {
  const f = clampFraction(fraction);
  let at = 0;
  for (const pt of path.points) {
    if (pt.at > f) break;
    at = pt.at;
  }
  return at;
}

/** The prices passed after `from` up to `to`, with their times, then where it is at `to` (for a paper account). */
export function pathMarks(path: IntrabarPath, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  let lastTime = path.bar.time;
  for (const pt of path.points) {
    if (pt.at > to) break;
    lastTime = pt.time;
    if (pt.at > from) out.push([pt.price, pt.time]);
  }
  const here = priceAt(path, to);
  if (out.length === 0 || out[out.length - 1][0] !== here) out.push([here, lastTime]);
  return out;
}
