import type { DepthData, DepthLevel } from '@tradecanvas/commons';

export interface DepthSnapshot {
  time: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

/**
 * A fixed-capacity ring of order-book snapshots, the data behind the liquidity
 * heatmap, kept in time order; the oldest are dropped once `capacity` is
 * exceeded. A repeated timestamp replaces its snapshot (the book updating
 * within the same bar) rather than growing the buffer, and an older one
 * (a book recorded earlier) goes in its place in time.
 */
export class DepthHeatmapBuffer {
  private buffer: DepthSnapshot[] = [];

  constructor(private capacity = 240) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  push(time: number, depth: DepthData): void {
    const snapshot: DepthSnapshot = {
      time,
      bids: depth.bids.map((l) => ({ ...l })),
      asks: depth.asks.map((l) => ({ ...l })),
    };
    const at = this.indexAfter(time);
    if (at > 0 && this.buffer[at - 1].time === time) {
      this.buffer[at - 1] = snapshot;
      return;
    }
    this.buffer.splice(at, 0, snapshot);
    if (this.buffer.length > this.capacity) {
      this.buffer = this.buffer.slice(this.buffer.length - this.capacity);
    }
  }

  /** Where a snapshot at `time` goes: after every snapshot at or before it. */
  private indexAfter(time: number): number {
    const b = this.buffer;
    // Live books come last: check the end before searching.
    if (b.length === 0 || b[b.length - 1].time <= time) return b.length;
    let lo = 0, hi = b.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (b[mid].time <= time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  snapshots(): ReadonlyArray<DepthSnapshot> {
    return this.buffer;
  }

  /** Largest single level volume across all snapshots (for colour scaling). */
  maxVolume(): number {
    let max = 0;
    for (const snap of this.buffer) {
      for (const l of snap.bids) if (l.volume > max) max = l.volume;
      for (const l of snap.asks) if (l.volume > max) max = l.volume;
    }
    return max;
  }

  setCapacity(capacity: number): void {
    this.capacity = Math.max(1, Math.floor(capacity));
    if (this.buffer.length > this.capacity) {
      this.buffer = this.buffer.slice(this.buffer.length - this.capacity);
    }
  }

  clear(): void {
    this.buffer = [];
  }

  get size(): number {
    return this.buffer.length;
  }
}
