import type { SymbolInfo } from '@tradecanvas/commons';
import { logoSrc, splitVenue } from './symbolCatalog.js';

/** How many kind colours there are (`--tcw-kind-1` … `--tcw-kind-5`); 0 is a symbol of no kind. */
export const KIND_SLOTS = 5;
/** The size a logo is fetched for: the badge's in Print, the default look. */
const LOGO_PX = 20;

/**
 * The usual kinds in English and in Vietnamese, as feeds write them, each
 * with its colour: a stock and a "cổ phiếu" look the same in either language.
 * A perpetual is crypto's own kind of futures and takes crypto's colour, so
 * on a phone, where the kind's column goes, it still looks apart from an
 * exchange's futures. Vietnamese puts the tone mark of "hoá" on either vowel.
 */
const KNOWN_KINDS: Record<string, number> = {
  stock: 1, stocks: 1, equity: 1, share: 1, shares: 1, 'cổ phiếu': 1,
  futures: 2, future: 2, derivative: 2, derivatives: 2, option: 2, options: 2, 'phái sinh': 2,
  index: 3, indices: 3, 'chỉ số': 3,
  crypto: 4, cryptocurrency: 4, perpetual: 4, perpetuals: 4, perp: 4, perps: 4, 'tiền mã hóa': 4, 'tiền mã hoá': 4, 'tiền điện tử': 4,
  forex: 5, fx: 5, currency: 5, 'ngoại hối': 5,
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
  return KNOWN_KINDS[key] ?? 1 + (hashWords(key) % KIND_SLOTS);
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
