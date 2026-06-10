import { describe, it, expect } from 'vitest';
import { buildLadderRows } from '../ladderRows.js';

describe('buildLadderRows', () => {
  const data = {
    bids: [
      { price: 99, volume: 5 },
      { price: 98, volume: 3 },
      { price: 97, volume: 1 },
    ],
    asks: [
      { price: 101, volume: 4 },
      { price: 102, volume: 8 },
      { price: 103, volume: 2 },
    ],
  };

  it('orders rows high → low with asks above bids', () => {
    const m = buildLadderRows(data);
    expect(m.rows.map((r) => r.price)).toEqual([103, 102, 101, 99, 98, 97]);
    expect(m.rows[0].askVolume).toBe(2); // 103 ask
    expect(m.rows[5].bidVolume).toBe(1); // 97 bid
  });

  it('computes the mid and the max single-side volume', () => {
    const m = buildLadderRows(data);
    expect(m.mid).toBe(100); // (101 + 99) / 2
    expect(m.maxVolume).toBe(8); // 102 ask
  });

  it('caps each side at maxLevels (best prices kept)', () => {
    const m = buildLadderRows(data, 1);
    // best ask 101, best bid 99
    expect(m.rows.map((r) => r.price)).toEqual([101, 99]);
  });

  it('merges a price present on both sides into one row', () => {
    const m = buildLadderRows({
      bids: [{ price: 100, volume: 2 }],
      asks: [{ price: 100, volume: 3 }],
    });
    expect(m.rows).toHaveLength(1);
    expect(m.rows[0]).toEqual({ price: 100, bidVolume: 2, askVolume: 3 });
  });

  it('handles an empty side', () => {
    const m = buildLadderRows({ bids: [], asks: [{ price: 10, volume: 1 }] });
    expect(m.mid).toBeNull();
    expect(m.rows).toHaveLength(1);
  });
});
