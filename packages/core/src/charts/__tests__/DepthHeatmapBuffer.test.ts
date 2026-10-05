import { describe, it, expect } from 'vitest';
import { DepthHeatmapBuffer } from '../DepthHeatmapBuffer.js';

function depth(bid: number, ask: number) {
  return { bids: [{ price: 100, volume: bid }], asks: [{ price: 101, volume: ask }] };
}

describe('DepthHeatmapBuffer', () => {
  it('appends snapshots in order', () => {
    const b = new DepthHeatmapBuffer(10);
    b.push(1, depth(5, 4));
    b.push(2, depth(6, 3));
    expect(b.size).toBe(2);
    expect(b.snapshots().map((s) => s.time)).toEqual([1, 2]);
  });

  it('replaces the last snapshot when the timestamp repeats', () => {
    const b = new DepthHeatmapBuffer(10);
    b.push(1, depth(5, 4));
    b.push(1, depth(9, 2)); // same bar, book updated
    expect(b.size).toBe(1);
    expect(b.snapshots()[0].bids[0].volume).toBe(9);
  });

  it('drops the oldest beyond capacity', () => {
    const b = new DepthHeatmapBuffer(2);
    b.push(1, depth(1, 1));
    b.push(2, depth(2, 2));
    b.push(3, depth(3, 3));
    expect(b.size).toBe(2);
    expect(b.snapshots().map((s) => s.time)).toEqual([2, 3]);
  });

  it('puts a book recorded earlier in its place in time, and drops the oldest beyond capacity', () => {
    const b = new DepthHeatmapBuffer(4);
    b.push(10, depth(1, 1));
    b.push(30, depth(3, 3));
    b.push(20, depth(2, 2));
    b.push(5, depth(0, 0));
    b.push(20, depth(9, 9)); // the book for that bar again
    expect(b.snapshots().map((s) => s.time)).toEqual([5, 10, 20, 30]);
    expect(b.snapshots()[2].bids[0].volume).toBe(9);
    b.push(15, depth(4, 4));
    expect(b.snapshots().map((s) => s.time)).toEqual([10, 15, 20, 30]);
  });

  it('reports the max single-level volume', () => {
    const b = new DepthHeatmapBuffer();
    b.push(1, depth(5, 4));
    b.push(2, depth(3, 12));
    expect(b.maxVolume()).toBe(12);
  });

  it('does not alias the source depth arrays', () => {
    const b = new DepthHeatmapBuffer();
    const d = depth(5, 4);
    b.push(1, d);
    d.bids[0].volume = 999;
    expect(b.snapshots()[0].bids[0].volume).toBe(5);
  });

  it('trims on capacity shrink and clears', () => {
    const b = new DepthHeatmapBuffer(5);
    for (let i = 0; i < 5; i++) b.push(i, depth(i, i));
    b.setCapacity(2);
    expect(b.size).toBe(2);
    expect(b.snapshots().map((s) => s.time)).toEqual([3, 4]);
    b.clear();
    expect(b.size).toBe(0);
    expect(b.maxVolume()).toBe(0);
  });
});
