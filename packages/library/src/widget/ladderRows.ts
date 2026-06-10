import type { DepthData } from '@tradecanvas/commons';

export interface LadderRow {
  price: number;
  bidVolume: number;
  askVolume: number;
}

export interface LadderModel {
  /** Rows ordered high → low price (asks on top, bids below). */
  rows: LadderRow[];
  /** Largest single-side volume across the shown rows (for bar scaling). */
  maxVolume: number;
  /** Midpoint between best bid and best ask, or null if a side is empty. */
  mid: number | null;
}

/**
 * Build a depth-of-market ladder from an order book: the best `maxLevels` asks
 * (lowest prices) and best `maxLevels` bids (highest prices), merged into rows
 * ordered high→low. A price present on both sides is merged into one row.
 */
export function buildLadderRows(data: DepthData, maxLevels = 12): LadderModel {
  const asks = [...data.asks].sort((a, b) => a.price - b.price).slice(0, maxLevels);
  const bids = [...data.bids].sort((a, b) => b.price - a.price).slice(0, maxLevels);

  const bestAsk = asks.length > 0 ? asks[0].price : null;
  const bestBid = bids.length > 0 ? bids[0].price : null;
  const mid = bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2 : null;

  const byPrice = new Map<number, LadderRow>();
  const rowAt = (price: number): LadderRow => {
    let row = byPrice.get(price);
    if (!row) {
      row = { price, bidVolume: 0, askVolume: 0 };
      byPrice.set(price, row);
    }
    return row;
  };
  for (const a of asks) rowAt(a.price).askVolume += a.volume;
  for (const b of bids) rowAt(b.price).bidVolume += b.volume;

  const rows = [...byPrice.values()].sort((a, b) => b.price - a.price);
  let maxVolume = 0;
  for (const r of rows) maxVolume = Math.max(maxVolume, r.bidVolume, r.askVolume);

  return { rows, maxVolume, mid };
}
