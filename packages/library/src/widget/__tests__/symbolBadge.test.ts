// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createSymbolBadge, kindKey, kindSlot, symbolInitial } from '../symbolBadge.js';

describe('kindSlot', () => {
  it('gives the usual kinds their own colours, whatever their case', () => {
    expect(kindSlot('Stock')).toBe(1);
    expect(kindSlot(' stock ')).toBe(1);
    expect(kindSlot('equity')).toBe(1);
    expect(kindSlot('Futures')).toBe(2);
    expect(kindSlot('perpetual')).toBe(2);
    expect(kindSlot('Index')).toBe(3);
    expect(kindSlot('Crypto')).toBe(4);
    expect(kindSlot('Forex')).toBe(5);
  });

  it('knows the Vietnamese words for them, as a Vietnamese feed writes them', () => {
    expect(kindSlot('Cổ phiếu')).toBe(1);
    expect(kindSlot('Phái sinh')).toBe(2);
    expect(kindSlot('Chỉ số')).toBe(3);
    // The same word with its marks written apart.
    expect(kindSlot('Cổ phiếu'.normalize('NFD'))).toBe(1);
  });

  it('gives any other kind a colour of its own words, the same each time', () => {
    for (const kind of ['warrant', 'Chứng quyền', '株式', 'ETF']) {
      const slot = kindSlot(kind);
      expect(slot, kind).toBeGreaterThanOrEqual(1);
      expect(slot, kind).toBeLessThanOrEqual(5);
      expect(kindSlot(kind.toUpperCase()), kind).toBe(slot);
    }
  });

  it('has no colour for no kind', () => {
    expect(kindSlot(undefined)).toBe(0);
    expect(kindSlot('')).toBe(0);
    expect(kindSlot('   ')).toBe(0);
  });

  it('keys a kind by its trimmed lower-case words', () => {
    expect(kindKey(' Stock ')).toBe('stock');
    expect(kindKey(undefined)).toBe('');
  });
});

describe('symbolInitial', () => {
  it('is the first letter or figure of the ticker, after any venue before a colon', () => {
    expect(symbolInitial('VN30F2511')).toBe('V');
    expect(symbolInitial('^GSPC')).toBe('G');
    expect(symbolInitial('600519')).toBe('6');
    expect(symbolInitial('btcusdt')).toBe('B');
    expect(symbolInitial('KBS:VCB')).toBe('V');
    expect(symbolInitial('HYPERLIQUID:xyz:GOLD')).toBe('G');
    expect(symbolInitial('ölçü')).toBe('Ö');
    expect(symbolInitial('^^^')).toBe('');
  });
});

describe('createSymbolBadge', () => {
  it('is the initial in its kind’s colour, hidden from a screen reader', () => {
    const badge = createSymbolBadge('VCB', { symbol: 'VCB', type: 'Stock' });
    expect(badge.tagName).toBe('SPAN');
    expect(badge.className).toBe('tcw-ss-badge');
    expect(badge.textContent).toBe('V');
    expect(badge.dataset.kind).toBe('1');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(createSymbolBadge('ETH', undefined).dataset.kind).toBe('0');
  });

  it('is the logo when it is given one it takes, the initial when it fails to load', () => {
    const badge = createSymbolBadge('VCB', { symbol: 'VCB', type: 'Stock', logo: 'https://cdn.example/vcb.png' }) as HTMLImageElement;
    const host = document.createElement('div');
    host.appendChild(badge);
    expect(badge.tagName).toBe('IMG');
    expect(badge.className).toBe('tcw-ss-badge');
    expect(badge.getAttribute('src')).toBe('https://cdn.example/vcb.png');
    expect(badge.getAttribute('alt')).toBe('');
    expect(badge.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(badge.getAttribute('loading')).toBe('lazy');
    badge.dispatchEvent(new Event('error'));
    const letter = host.firstElementChild as HTMLElement;
    expect(letter.tagName).toBe('SPAN');
    expect(letter.textContent).toBe('V');
    expect(letter.dataset.kind).toBe('1');
  });

  it('never loads a logo it does not take', () => {
    expect(createSymbolBadge('VCB', { symbol: 'VCB', logo: 'javascript:alert(1)' }).tagName).toBe('SPAN');
    expect(createSymbolBadge('VCB', { symbol: 'VCB', logo: 'data:text/html,<b>x</b>' }).tagName).toBe('SPAN');
  });
});
