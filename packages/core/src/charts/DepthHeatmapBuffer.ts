import type { DepthData, DepthLevel } from '@tradecanvas/commons';

export interface DepthSnapshot {
  time: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
}

/**
 * A fixed-capacity ring of order-book snapshots, the data behind the liquidity
 * heatmap. Snapshots are appended in time order; the oldest are dropped once
 * `capacity` is exceeded. A repeated timestamp replaces the last snapshot
 * (the book updating within the same bar) rather than growing the buffer.
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
    const last = this.buffer[this.buffer.length - 1];
    if (last && last.time === time) {
      this.buffer[this.buffer.length - 1] = snapshot;
    } else {
      this.buffer.push(snapshot);
      if (this.buffer.length > this.capacity) {
        this.buffer = this.buffer.slice(this.buffer.length - this.capacity);
      }
    }
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
