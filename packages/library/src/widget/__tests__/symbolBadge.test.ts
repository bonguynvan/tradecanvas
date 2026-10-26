// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createSymbolBadge, kindKey, kindSlot, symbolInitial } from '../symbolBadge.js';

describe('kindSlot', () => {
  it('gives the usual kinds their own colours, whatever their case', () => {
    expect(kindSlot('Stock')).toBe(1);
    expect(kindSlot(' stock ')).toBe(1);
    expect(kindSlot('equity')).toBe(1);
    expect(kindSlot('Futures')).toBe(2);
    expect(kindSlot('Index')).toBe(3);
    expect(kindSlot('Crypto')).toBe(4);
    expect(kindSlot('Forex')).toBe(5);
  });

  it('colours a perpetual as crypto, apart from an exchange’s futures, as a phone shows no kind column', () => {
    expect(kindSlot('perpetual')).toBe(4);
    expect(kindSlot('Perp')).toBe(4);
    expect(kindSlot('Perpetual')).not.toBe(kindSlot('Phái sinh'));
  });

  it('knows the Vietnamese words for them, as a Vietnamese feed writes them', () => {
    expect(kindSlot('Cổ phiếu')).toBe(1);
    expect(kindSlot('Phái sinh')).toBe(2);
    expect(kindSlot('Chỉ số')).toBe(3);
    // The same word with its marks written apart.
    expect(kindSlot('Cổ phiếu'.normalize('NFD'))).toBe(1);
    // Crypto with the tone mark on either vowel, as both are written.
    expect(kindSlot('Tiền mã hoá')).toBe(4);
    expect(kindSlot('Tiền mã hóa')).toBe(4);
    expect(new Set(['Cổ phiếu', 'Phái sinh', 'Chỉ số', 'Tiền mã hoá'].map(kindSlot)).size).toBe(4);
  });

  it('gives Vietnamese warrants, funds and bonds the colour of the kind they are like', () => {
    // A covered warrant is an option on a share; a fund holds a basket, as an index does; a bond is fixed
    // income, kept with the currencies.
    for (const warrant of ['Chứng quyền', 'warrant', 'Covered warrant']) expect(kindSlot(warrant), warrant).toBe(kindSlot('futures'));
    for (const fund of ['Chứng chỉ quỹ', 'ETF', 'fund']) expect(kindSlot(fund), fund).toBe(kindSlot('index'));
    for (const bond of ['Trái phiếu', 'bond', 'Bonds']) expect(kindSlot(bond), bond).toBe(kindSlot('forex'));
    // A Vietnamese list's stock still looks apart from all three.
    expect(new Set(['Cổ phiếu', 'Chứng quyền', 'Chứng chỉ quỹ', 'Trái phiếu'].map(kindSlot)).size).toBe(4);
  });

  it('knows the usual Japanese, Chinese and Korean words for the five kinds', () => {
    const words: Record<number, string[]> = {
      1: ['株式', '株', '股票', '주식'],
      2: ['先物', '期货', '期貨', '선물'],
      3: ['指数', '指數', '지수'],
      4: ['暗号資産', '仮想通貨', '加密货币', '加密貨幣', '数字货币', '암호화폐', '가상자산'],
      5: ['為替', '外国為替', '外汇', '外匯', '외환'],
    };
    for (const [slot, list] of Object.entries(words)) {
      for (const word of list) expect(kindSlot(word), word).toBe(Number(slot));
    }
  });

  it('gives any other kind a colour of its own words, the same each time', () => {
    for (const kind of ['Aktie', 'Rohstoff', 'CFD', 'Optionsschein']) {
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

  it('keys Turkish capitals as their lower case, dotted or dotless', () => {
    // Lower-casing İ leaves a combining dot after the i, and ı stays dotless while I becomes i.
    expect(kindKey('HİSSE')).toBe(kindKey('Hisse'));
    expect(kindKey('VADELİ')).toBe(kindKey('Vadeli'));
    expect(kindKey('ALTIN')).toBe(kindKey('Altın'));
    expect(kindSlot('HİSSE')).toBe(kindSlot('Hisse'));
  });

  it('gives a kind named like a built-in of every object a colour from its words', () => {
    for (const kind of ['constructor', 'Constructor', '__proto__', 'toString', 'hasownproperty']) {
      const slot = kindSlot(kind);
      expect(typeof slot, kind).toBe('number');
      expect(slot, kind).toBeGreaterThanOrEqual(1);
      expect(slot, kind).toBeLessThanOrEqual(5);
    }
    expect(createSymbolBadge('ABC', { symbol: 'ABC', type: 'constructor' }).dataset.kind).toMatch(/^[1-5]$/);
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

  it('asks no more for a logo that failed to load: the next row shows the initial straight away', () => {
    const info = { symbol: 'FPT', type: 'Stock', logo: 'https://cdn.example/missing-fpt.png' };
    const host = document.createElement('div');
    const first = createSymbolBadge('FPT', info);
    host.appendChild(first);
    expect(first.tagName).toBe('IMG');
    first.dispatchEvent(new Event('error'));
    // A keystroke builds the row again with the same logo.
    const again = createSymbolBadge('FPT', info);
    expect(again.tagName).toBe('SPAN');
    expect(again.textContent).toBe('F');
    expect(again.dataset.kind).toBe('1');
    // Another logo still loads.
    expect(createSymbolBadge('FPT', { ...info, logo: 'https://cdn.example/fpt.png' }).tagName).toBe('IMG');
  });

  it('never loads a logo it does not take', () => {
    expect(createSymbolBadge('VCB', { symbol: 'VCB', logo: 'javascript:alert(1)' }).tagName).toBe('SPAN');
    expect(createSymbolBadge('VCB', { symbol: 'VCB', logo: 'data:text/html,<b>x</b>' }).tagName).toBe('SPAN');
  });
});
