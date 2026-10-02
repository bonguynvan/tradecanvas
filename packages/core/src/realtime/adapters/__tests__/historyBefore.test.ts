import { describe, it, expect, vi, afterEach } from 'vitest';
import { BinanceAdapter } from '../BinanceAdapter.js';
import { BybitAdapter } from '../BybitAdapter.js';
import { MockAdapter } from '../MockAdapter.js';

function stubFetch(body: unknown) {
  const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BinanceAdapter.fetchHistoryBefore', () => {
  it('asks for klines that close before the oldest loaded bar', async () => {
    const fetch = stubFetch([[1000, '1', '2', '0.5', '1.5', '10', 1999]]);
    const bars = await new BinanceAdapter({ restBase: 'https://rest' }).fetchHistoryBefore('BTCUSDT', '1h', 3_600_000, 300);
    expect(fetch).toHaveBeenCalledWith('https://rest/klines?symbol=BTCUSDT&interval=1h&limit=300&endTime=3599999');
    expect(bars).toHaveLength(1);
    expect(bars[0].time).toBe(1000);
  });

  it('caps the page at the 1000 klines one request can return', async () => {
    const fetch = stubFetch([]);
    await new BinanceAdapter({ restBase: 'https://rest' }).fetchHistoryBefore('BTCUSDT', '1m', 60_000, 5000);
    expect(fetch.mock.calls[0][0]).toContain('limit=1000');
  });
});

describe('BybitAdapter.fetchHistoryBefore', () => {
  it('asks for klines that start before the oldest loaded bar', async () => {
    const fetch = stubFetch({ result: { list: [['2000', '1', '2', '0.5', '1.5', '10'], ['1000', '1', '2', '0.5', '1.5', '10']] } });
    const adapter = new BybitAdapter({ restBase: 'https://rest' });
    const bars = await adapter.fetchHistoryBefore?.('BTCUSDT', '1m', 60_000, 200);
    expect(fetch).toHaveBeenCalledWith('https://rest/v5/market/kline?category=spot&symbol=BTCUSDT&interval=1&limit=200&end=59999');
    expect(bars?.map((b) => b.time)).toEqual([1000, 2000]);
  });
});

describe('MockAdapter.fetchHistoryBefore', () => {
  it('makes up a page of older bars, spaced by the timeframe, oldest first', async () => {
    const adapter = new MockAdapter({ basePrice: 100 });
    const history = await adapter.fetchHistory('X', '1m', 50);
    const before = history[0].time;
    const page = await adapter.fetchHistoryBefore('X', '1m', before, 20);
    expect(page).toHaveLength(20);
    expect(page[19].time).toBe(before - 60_000);
    expect(page[0].time).toBe(before - 20 * 60_000);
    // The page joins the loaded bars: its last close is the first loaded open.
    expect(page[19].close).toBeCloseTo(history[0].open, 9);
  });
});
