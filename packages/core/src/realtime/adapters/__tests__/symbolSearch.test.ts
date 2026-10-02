import { describe, it, expect, vi, afterEach } from 'vitest';
import { BinanceAdapter } from '../BinanceAdapter.js';
import { MockAdapter } from '../MockAdapter.js';
import { WebSocketAdapter } from '../WebSocketAdapter.js';
import { ResamplingAdapter } from '../ResamplingAdapter.js';

const exchangeInfo = {
  symbols: [
    {
      symbol: 'BTCUSDT', status: 'TRADING', baseAsset: 'BTC', quoteAsset: 'USDT',
      filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.01000000' }],
    },
    {
      symbol: 'PEPEUSDT', status: 'TRADING', baseAsset: 'PEPE', quoteAsset: 'USDT',
      filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.00000001' }],
    },
    {
      symbol: 'OLDUSDT', status: 'BREAK', baseAsset: 'OLD', quoteAsset: 'USDT',
      filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.01' }],
    },
  ],
};

function stubFetch(handler: (url: string) => unknown) {
  const fetch = vi.fn(async (url: string) => {
    const body = handler(url);
    if (body instanceof Error) throw body;
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BinanceAdapter symbol search', () => {
  it('searches the trading symbols, with names, precision and hours', async () => {
    stubFetch(() => exchangeInfo);
    const results = await new BinanceAdapter({ restBase: 'https://rest' }).searchSymbols('btc');
    expect(results).toEqual([{
      symbol: 'BTCUSDT',
      description: 'BTC / USDT',
      exchange: 'Binance',
      type: 'crypto',
      pricePrecision: 2,
      minTick: 0.01,
      timezone: 'UTC',
      currency: 'USDT',
    }]);
  });

  it('ranks pairs against the most traded quote currencies first', async () => {
    stubFetch(() => ({
      symbols: ['ETHU', 'ETHBTC', 'ETHUSDT'].map((symbol) => ({
        symbol, status: 'TRADING', baseAsset: 'ETH', quoteAsset: symbol.slice(3),
        filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.01' }],
      })),
    }));
    expect((await new BinanceAdapter().searchSymbols('eth')).map((s) => s.symbol)).toEqual(['ETHUSDT', 'ETHBTC', 'ETHU']);
  });

  it('leaves out symbols that are not trading', async () => {
    stubFetch(() => exchangeInfo);
    expect(await new BinanceAdapter().searchSymbols('old')).toEqual([]);
  });

  it('loads the symbol list once', async () => {
    const fetch = stubFetch(() => exchangeInfo);
    const adapter = new BinanceAdapter();
    await adapter.searchSymbols('btc');
    await adapter.searchSymbols('pepe');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed load', async () => {
    let fail = true;
    const fetch = stubFetch(() => (fail ? new Error('offline') : exchangeInfo));
    const adapter = new BinanceAdapter();
    await expect(adapter.searchSymbols('btc')).rejects.toThrow('offline');
    fail = false;
    expect(await adapter.searchSymbols('btc')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('resolves one symbol without loading the whole list', async () => {
    const fetch = stubFetch((url) => (url.includes('symbol=PEPEUSDT') ? { symbols: [exchangeInfo.symbols[1]] } : exchangeInfo));
    const info = await new BinanceAdapter({ restBase: 'https://rest' }).resolveSymbol('PEPEUSDT');
    expect(fetch).toHaveBeenCalledWith('https://rest/exchangeInfo?symbol=PEPEUSDT');
    expect(info).toMatchObject({ symbol: 'PEPEUSDT', pricePrecision: 8, minTick: 0.00000001 });
  });

  it('resolves an unknown symbol to null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ code: -1121 }) })));
    expect(await new BinanceAdapter().resolveSymbol('NOPE')).toBeNull();
  });
});

describe('MockAdapter symbol search', () => {
  it('searches and resolves the symbols it was given', async () => {
    const adapter = new MockAdapter({ symbols: [{ symbol: 'DEMO', description: 'Demo stock', pricePrecision: 2 }] });
    expect((await adapter.searchSymbols('dem')).map((s) => s.symbol)).toEqual(['DEMO']);
    expect(await adapter.resolveSymbol('DEMO')).toMatchObject({ pricePrecision: 2 });
    expect(await adapter.resolveSymbol('OTHER')).toBeNull();
  });
});

describe('symbol search through other adapters', () => {
  it('WebSocketAdapter passes the functions it was given', async () => {
    const searchSymbols = vi.fn(async () => [{ symbol: 'X' }]);
    const resolveSymbol = vi.fn(async () => ({ symbol: 'X', pricePrecision: 3 }));
    const adapter = new WebSocketAdapter({
      name: 'ws', wsUrl: () => 'wss://x', fetchHistory: async () => [], parseMessage: () => null,
      searchSymbols, resolveSymbol,
    });
    expect(await adapter.searchSymbols?.('x')).toEqual([{ symbol: 'X' }]);
    expect(await adapter.resolveSymbol?.('X')).toMatchObject({ pricePrecision: 3 });
    expect(new WebSocketAdapter({ name: 'ws', wsUrl: () => 'wss://x', fetchHistory: async () => [], parseMessage: () => null }).searchSymbols)
      .toBeUndefined();
  });

  it('ResamplingAdapter forwards them to the feed', async () => {
    const feed = new MockAdapter({ symbols: [{ symbol: 'DEMO' }] });
    const wrapped = new ResamplingAdapter(feed, ['1m']);
    expect((await wrapped.searchSymbols?.('de'))?.map((s) => s.symbol)).toEqual(['DEMO']);
    expect(await wrapped.resolveSymbol?.('DEMO')).toMatchObject({ symbol: 'DEMO' });
  });
});
