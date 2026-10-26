import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SymbolInfo } from '@tradecanvas/commons';
import { chartInfoFor, cleanSymbol, logoSrc, mergeSymbolInfo, readSymbolCatalog, readSymbolResults, splitVenue, symbolTitle } from '../symbolCatalog.js';

describe('cleanSymbol', () => {
  it('trims a ticker and drops what is not one', () => {
    expect(cleanSymbol(' VNM ')).toBe('VNM');
    expect(cleanSymbol('')).toBeNull();
    expect(cleanSymbol('   ')).toBeNull();
    expect(cleanSymbol(42)).toBeNull();
    expect(cleanSymbol({ symbol: 'VNM' })).toBeNull();
    expect(cleanSymbol('X'.repeat(64))).toBe('X'.repeat(64));
    expect(cleanSymbol('X'.repeat(65))).toBeNull();
  });
});

describe('readSymbolCatalog', () => {
  it('keeps the tickers in order, once each, and the info given with them', () => {
    const bbb: SymbolInfo = { symbol: 'BBB', description: 'B' };
    const catalog = readSymbolCatalog([' ', '', null, 42, {}, { symbol: '' }, 'AAA', bbb, 'AAA', ' CCC ', { symbol: ' DDD ', exchange: 'HNX' }, 'BBB']);
    expect(catalog.names).toEqual(['AAA', 'BBB', 'CCC', 'DDD']);
    expect([...catalog.info.keys()]).toEqual(['BBB', 'DDD']);
    expect(catalog.info.get('BBB')).toEqual({ symbol: 'BBB', description: 'B' });
    // Keyed by the ticker as the watchlist keeps it.
    expect(catalog.info.get('DDD')).toEqual({ symbol: 'DDD', exchange: 'HNX' });
    // A copy: changing the host's object later changes nothing here.
    bbb.description = 'changed';
    expect(catalog.info.get('BBB')?.description).toBe('B');
  });

  it('keeps the first of a repeated symbol', () => {
    const catalog = readSymbolCatalog([{ symbol: 'A', description: 'one' }, { symbol: 'A', description: 'two' }]);
    expect(catalog.names).toEqual(['A']);
    expect(catalog.info.get('A')?.description).toBe('one');
  });

  it('takes a name, a kind, an exchange or a logo that is not text as none, keeping the rest', () => {
    const catalog = readSymbolCatalog([
      { symbol: 'A', description: 12, type: 5, exchange: null, logo: {}, currency: 'VND' },
      { symbol: 'B', description: '  ', exchange: 'HOSE' },
    ]);
    expect(catalog.names).toEqual(['A', 'B']);
    expect(catalog.info.get('A')).toEqual({ symbol: 'A', currency: 'VND' });
    expect(catalog.info.get('B')).toEqual({ symbol: 'B', exchange: 'HOSE' });
  });

  it('reads anything but a list as no symbols', () => {
    for (const raw of [undefined, null, 'AAA', 42, { symbol: 'AAA' }]) {
      const catalog = readSymbolCatalog(raw);
      expect(catalog.names).toEqual([]);
      expect(catalog.info.size).toBe(0);
    }
  });
});

describe('mergeSymbolInfo', () => {
  it('takes the second one’s fields where it has them, and never erases one with undefined', () => {
    const feed: SymbolInfo = { symbol: 'X', description: 'feed', exchange: 'HOSE' };
    const host: SymbolInfo = { symbol: 'X', description: 'host', exchange: undefined, logo: 'https://cdn.x/x.png' };
    expect(mergeSymbolInfo(feed, host)).toEqual({ symbol: 'X', description: 'host', exchange: 'HOSE', logo: 'https://cdn.x/x.png' });
    // Neither is changed.
    expect(feed).toEqual({ symbol: 'X', description: 'feed', exchange: 'HOSE' });
    expect(host.exchange).toBeUndefined();
  });

  it('never erases a field with null, as a JSON feed writes one it has no value for', () => {
    const host: SymbolInfo = { symbol: 'X', description: 'host', logo: 'https://cdn.x/x.png' };
    const feed = { symbol: 'X', description: null, logo: null, exchange: 'HOSE' } as unknown as SymbolInfo;
    expect(mergeSymbolInfo(host, feed)).toEqual({ symbol: 'X', description: 'host', logo: 'https://cdn.x/x.png', exchange: 'HOSE' });
  });

  it('gives the one there is when the other is missing', () => {
    const one: SymbolInfo = { symbol: 'X', type: 'stock' };
    expect(mergeSymbolInfo(undefined, one)).toEqual(one);
    expect(mergeSymbolInfo(one, null)).toEqual(one);
    expect(mergeSymbolInfo(undefined, undefined)).toBeUndefined();
  });

  it('copies a "__proto__" key of a JSON feed as no field, leaving the merged info a plain object', () => {
    const over = JSON.parse('{"symbol":"A","__proto__":{"type":5,"exchange":{"toString":0}}}') as SymbolInfo;
    const merged = mergeSymbolInfo({ symbol: 'A', description: 'Alpha' }, over)!;
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(merged.type).toBeUndefined();
    expect(merged.exchange).toBeUndefined();
    expect(merged.description).toBe('Alpha');
  });
});

describe('readSymbolResults', () => {
  it('keeps the results that name a symbol, in order, their words that are not text left out', () => {
    const found = [
      {}, null, 42, { symbol: '' }, { symbol: 7 },
      { symbol: 'VNM', description: 'Vinamilk', exchange: 10, type: null },
      { symbol: 'FPT', logo: 3, minTick: 100 },
    ];
    expect(readSymbolResults(found)).toEqual([
      { symbol: 'VNM', description: 'Vinamilk' },
      { symbol: 'FPT', minTick: 100 },
    ]);
  });

  it('reads anything but a list as no results', () => {
    for (const found of [undefined, null, 'VNM', { symbol: 'VNM' }]) expect(readSymbolResults(found)).toEqual([]);
  });

  it('keeps no "__proto__" key of a JSON feed, so nothing it holds reaches a row by a later merge', () => {
    const [info] = readSymbolResults(JSON.parse('[{"symbol":"A","description":"Alpha","__proto__":{"type":5}}]'));
    expect(Object.prototype.hasOwnProperty.call(info, '__proto__')).toBe(false);
    expect(info).toEqual({ symbol: 'A', description: 'Alpha' });
    const merged = mergeSymbolInfo({ symbol: 'A' }, info)!;
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(merged.type).toBeUndefined();
    const { info: given } = readSymbolCatalog(JSON.parse('[{"symbol":"B","__proto__":{"exchange":7}}]'));
    expect(Object.prototype.hasOwnProperty.call(given.get('B'), '__proto__')).toBe(false);
  });
});

describe('splitVenue', () => {
  it('parts the venue before the last colon from the ticker after it', () => {
    expect(splitVenue('BINANCE:BTCUSDT')).toEqual({ venue: 'BINANCE:', ticker: 'BTCUSDT' });
    expect(splitVenue('HYPERLIQUID:xyz:GOLD')).toEqual({ venue: 'HYPERLIQUID:xyz:', ticker: 'GOLD' });
    expect(splitVenue('VNM')).toEqual({ venue: '', ticker: 'VNM' });
  });

  it('keeps a colon at either end with the ticker, which would be left with nothing', () => {
    expect(splitVenue('KBS:')).toEqual({ venue: '', ticker: 'KBS:' });
    expect(splitVenue(':VNM')).toEqual({ venue: '', ticker: ':VNM' });
  });
});

describe('chartInfoFor', () => {
  it('is what the chart knows when it is of the symbol, in any case or with a venue before it', () => {
    const vcb: SymbolInfo = { symbol: 'VCB', description: 'Vietcombank' };
    expect(chartInfoFor('VCB', vcb)).toBe(vcb);
    expect(chartInfoFor('vcb', vcb)).toBe(vcb);
    expect(chartInfoFor('KBS:VCB', vcb)).toBe(vcb);
    expect(chartInfoFor('VCB', { symbol: 'KBS:VCB' })).not.toBeNull();
  });

  it('is null for another symbol’s, or none', () => {
    expect(chartInfoFor('FPT', { symbol: 'VCB' })).toBeNull();
    expect(chartInfoFor('HNX:ABC', { symbol: 'UPCOM:ABC' })).toBeNull();
    expect(chartInfoFor('VCB', null)).toBeNull();
    expect(chartInfoFor('VCB', undefined)).toBeNull();
  });
});

describe('symbolTitle', () => {
  it('is the name and the exchange, as either is known', () => {
    expect(symbolTitle({ symbol: 'VNM', description: 'Vinamilk', exchange: 'HOSE' })).toBe('Vinamilk · HOSE');
    expect(symbolTitle({ symbol: 'VNM', exchange: 'HOSE' })).toBe('HOSE');
    expect(symbolTitle({ symbol: 'VNM' })).toBeNull();
    expect(symbolTitle(null)).toBeNull();
  });
});

describe('logoSrc', () => {
  const base = 'https://app.example/vn/';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes web addresses, paths on the site, blobs and images written in data', () => {
    expect(logoSrc('https://cdn.x/a.png', base)).toBe('https://cdn.x/a.png');
    expect(logoSrc('  http://cdn.x/a.png ', base)).toBe('http://cdn.x/a.png');
    expect(logoSrc('/logos/vnm.svg', base)).toBe('https://app.example/logos/vnm.svg');
    expect(logoSrc('logos/vnm.svg', base)).toBe('https://app.example/vn/logos/vnm.svg');
    expect(logoSrc('blob:https://app.example/1', base)).toBe('blob:https://app.example/1');
    expect(logoSrc('data:image/svg+xml;base64,PHN2Zy8+', base)).toBe('data:image/svg+xml;base64,PHN2Zy8+');
    expect(logoSrc('data:image/png;base64,AAAA', base)).toBe('data:image/png;base64,AAAA');
    expect(logoSrc('data:image/webp,AAAA', base)).toBe('data:image/webp,AAAA');
  });

  it('refuses scripts, files, pages written in data and what is not an address', () => {
    for (const raw of [
      ' javascript:alert(1)', 'JaVaScRiPt:x', '\tjavascript:x', 'java\nscript:x', 'vbscript:x',
      'file:///c:/a.png', 'data:text/html,<script>alert(1)</script>', 'data:image/svg', 'data:,x',
      'chrome-extension://a/x.png', 'ftp://cdn.x/a.png', 42, '', '   ', null, undefined, {},
    ]) {
      expect(logoSrc(raw, base), String(raw)).toBeNull();
    }
  });

  it('refuses an address too long to be a logo', () => {
    expect(logoSrc(`https://cdn.x/${'a'.repeat(2048)}.png`, base)).toBeNull();
    expect(logoSrc(`data:image/png;base64,${'A'.repeat(65_536)}`, base)).toBeNull();
    expect(logoSrc(`data:image/png;base64,${'A'.repeat(60_000)}`, base)).not.toBeNull();
  });

  it('does not read an address longer than any it takes', () => {
    const parsed = vi.fn();
    const RealURL = URL;
    vi.stubGlobal('URL', class extends RealURL {
      constructor(url: string | URL, base?: string | URL) {
        parsed();
        super(url, base);
      }
    });
    // A logo is drawn again with every row; a long one must not be parsed each time to be refused.
    expect(logoSrc(`data:image/png;base64,${'A'.repeat(5_000_000)}`, base)).toBeNull();
    expect(logoSrc(` https://cdn.x/${'a'.repeat(70_000)}`, base)).toBeNull();
    expect(parsed).not.toHaveBeenCalled();
    expect(logoSrc('https://cdn.x/a.png', base)).toBe('https://cdn.x/a.png');
    expect(parsed).toHaveBeenCalled();
  });

  it('turns markup in the text into a harmless path', () => {
    const src = logoSrc('<img src=x onerror=alert(1)>', base);
    expect(src).not.toContain('<');
    expect(src?.startsWith('https://app.example/vn/')).toBe(true);
  });

  it('refuses a path when there is no page to place it on', () => {
    expect(logoSrc('/logos/vnm.svg', 'about:blank')).toBeNull();
  });
});
