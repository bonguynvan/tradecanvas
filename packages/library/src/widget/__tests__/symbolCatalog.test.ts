import { describe, it, expect } from 'vitest';
import type { SymbolInfo } from '@tradecanvas/commons';
import { chartInfoFor, cleanSymbol, logoSrc, mergeSymbolInfo, readSymbolCatalog, symbolTitle } from '../symbolCatalog.js';

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

  it('gives the one there is when the other is missing', () => {
    const one: SymbolInfo = { symbol: 'X', type: 'stock' };
    expect(mergeSymbolInfo(undefined, one)).toEqual(one);
    expect(mergeSymbolInfo(one, null)).toEqual(one);
    expect(mergeSymbolInfo(undefined, undefined)).toBeUndefined();
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

  it('turns markup in the text into a harmless path', () => {
    const src = logoSrc('<img src=x onerror=alert(1)>', base);
    expect(src).not.toContain('<');
    expect(src?.startsWith('https://app.example/vn/')).toBe(true);
  });

  it('refuses a path when there is no page to place it on', () => {
    expect(logoSrc('/logos/vnm.svg', 'about:blank')).toBeNull();
  });
});
