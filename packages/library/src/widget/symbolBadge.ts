import type { SymbolInfo } from '@tradecanvas/commons';
import { logoSrc, splitVenue } from './symbolCatalog.js';

/** How many kind colours there are (`--tcw-kind-1` … `--tcw-kind-5`); 0 is a symbol of no kind. */
export const KIND_SLOTS = 5;
/** The size a logo is fetched for: the badge's in Print, the default look. */
const LOGO_PX = 20;

/**
 * The usual kinds as feeds write them, in English, Vietnamese, Japanese,
 * Chinese (both scripts) and Korean, each with its colour: a stock, a "cổ
 * phiếu" and a 株式 look the same. A perpetual is crypto's own kind of
 * futures and takes crypto's colour, so on a phone, where the kind's column
 * goes, it still looks apart from an exchange's futures. Kinds with no colour
 * of their own take the one of the kind they are like: a warrant is an option
 * on a share, a fund or an ETF holds a basket as an index does, and a bond is
 * fixed income, kept with the currencies. Vietnamese puts the tone mark of
 * "hoá" on either vowel.
 */
const KNOWN_KINDS: Record<string, number> = {
  stock: 1, stocks: 1, equity: 1, share: 1, shares: 1, 'cổ phiếu': 1, 株式: 1, 株: 1, 股票: 1, 주식: 1,
  futures: 2, future: 2, derivative: 2, derivatives: 2, option: 2, options: 2, 'phái sinh': 2, 先物: 2, 期货: 2, 期貨: 2, 선물: 2,
  warrant: 2, warrants: 2, 'covered warrant': 2, 'chứng quyền': 2,
  index: 3, indices: 3, 'chỉ số': 3, 指数: 3, 指數: 3, 지수: 3,
  fund: 3, funds: 3, etf: 3, etfs: 3, 'chứng chỉ quỹ': 3,
  crypto: 4, cryptocurrency: 4, perpetual: 4, perpetuals: 4, perp: 4, perps: 4, 'tiền mã hóa': 4, 'tiền mã hoá': 4, 'tiền điện tử': 4,
  暗号資産: 4, 仮想通貨: 4, 加密货币: 4, 加密貨幣: 4, 数字货币: 4, 數字貨幣: 4, 虚拟货币: 4, 虛擬貨幣: 4, 암호화폐: 4, 가상자산: 4, 가상화폐: 4,
  forex: 5, fx: 5, currency: 5, 'ngoại hối': 5, 為替: 5, 外国為替: 5, 外汇: 5, 外匯: 5, 외환: 5,
  bond: 5, bonds: 5, 'trái phiếu': 5,
};

/** A kind as the search keys it: its words trimmed, in lower case, with their marks composed. */
export function kindKey(type: unknown): string {
  return typeof type === 'string' ? type.trim().normalize('NFC').toLowerCase() : '';
}

/**
 * The colour of a kind of symbol, 1 to 5; 0 for none. The usual kinds have
 * their own; any other (a feed's word in another language) gets one from its
 * words, the same every time.
 */
export function kindSlot(type: unknown): number {
  const key = kindKey(type);
  if (!key) return 0;
  // Only the list's own words: a feed's "constructor" is a kind like any other, not the object's.
  return Object.prototype.hasOwnProperty.call(KNOWN_KINDS, key) ? KNOWN_KINDS[key] : 1 + (hashWords(key) % KIND_SLOTS);
}

/** FNV-1a over the code points: short words spread well, and it is the same in every browser. */
function hashWords(text: string): number {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** The first letter or figure of a ticker, after any venue before a colon ("KBS:VCB" gives V). */
export function symbolInitial(symbol: string): string {
  const { ticker } = splitVenue(symbol);
  const first = /[\p{L}\p{N}]/u.exec(ticker);
  return first ? first[0].toUpperCase() : '';
}

/**
 * A row's badge: the symbol's logo when it has one the widget takes, else its
 * initial in its kind's colour. A logo that fails to load (a blocked host, a
 * page's image policy) gives way to the initial. Either is decoration: the
 * ticker beside it says the same.
 */
export function createSymbolBadge(symbol: string, info: SymbolInfo | undefined): HTMLElement {
  const src = logoSrc(info?.logo);
  if (!src) return letterBadge(symbol, info);
  const img = document.createElement('img');
  img.className = 'tcw-ss-badge';
  img.alt = '';
  img.width = LOGO_PX;
  img.height = LOGO_PX;
  img.draggable = false;
  img.setAttribute('aria-hidden', 'true');
  img.setAttribute('loading', 'lazy');
  img.setAttribute('decoding', 'async');
  // The logo's host learns nothing of the page it is shown on.
  img.setAttribute('referrerpolicy', 'no-referrer');
  img.addEventListener('error', () => img.replaceWith(letterBadge(symbol, info)), { once: true });
  img.src = src;
  return img;
}

function letterBadge(symbol: string, info: SymbolInfo | undefined): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'tcw-ss-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.dataset.kind = String(kindSlot(info?.type));
  badge.textContent = symbolInitial(symbol);
  return badge;
}
