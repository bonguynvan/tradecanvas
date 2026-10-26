import type { SymbolInfo } from '@tradecanvas/commons';

/** The longest ticker the widget keeps, in a watchlist or a list of symbols. */
export const MAX_SYMBOL_LENGTH = 64;
/** The longest logo address taken, and the longest image written in a `data:` one. */
const MAX_LOGO_URL = 2048;
const MAX_LOGO_DATA = 65_536;
/** The images a `data:` logo may be; a page written in `data:` is none of them. */
const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,]/i;
const LOGO_PROTOCOLS = new Set(['https:', 'http:', 'blob:']);
/** The fields a row writes as words, or loads (the logo): anything but text there says nothing. */
const TEXT_FIELDS: ReadonlySet<string> = new Set(['description', 'exchange', 'type', 'logo']);

/** A ticker trimmed, or null when it isn't one a list can keep. */
export function cleanSymbol(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const symbol = v.trim();
  return symbol && symbol.length <= MAX_SYMBOL_LENGTH ? symbol : null;
}

/** The symbols on offer: their tickers in order, and the info given with some. */
export interface SymbolCatalog {
  names: string[];
  info: Map<string, SymbolInfo>;
}

/**
 * Symbols from untrusted input (a host's `symbols`, plain JavaScript): a
 * ticker, or a SymbolInfo with one. Tickers are cleaned as a watchlist cleans
 * them, so both key a symbol alike; a repeat keeps the first; anything else is
 * skipped, and anything but a list is no symbols.
 */
export function readSymbolCatalog(raw: unknown): SymbolCatalog {
  const names: string[] = [];
  const info = new Map<string, SymbolInfo>();
  if (!Array.isArray(raw)) return { names, info };
  const seen = new Set<string>();
  for (const entry of raw) {
    const isInfo = typeof entry === 'object' && entry !== null;
    const symbol = cleanSymbol(isInfo ? (entry as { symbol?: unknown }).symbol : entry);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    names.push(symbol);
    if (isInfo) info.set(symbol, cleanSymbolInfo(entry, symbol));
  }
  return { names, info };
}

/**
 * A copy of `info` named `symbol`, its words kept only where they are text:
 * a JSON feed's numeric exchange code, a null or a blank says nothing, so it
 * neither shows nor erases what is known. A "__proto__" key, which JSON.parse
 * keeps as a field, is dropped: copied onto another object by assignment, it
 * would hand that object fields no one cleaned.
 */
export function cleanSymbolInfo(info: object, symbol: string): SymbolInfo {
  const isWords = ([key, value]: [string, unknown]) =>
    key !== '__proto__' && (!TEXT_FIELDS.has(key) || (typeof value === 'string' && value.trim() !== ''));
  return { ...Object.fromEntries(Object.entries(info).filter(isWords)), symbol } as SymbolInfo;
}

/**
 * A feed's search results, from untrusted input: those that name a symbol,
 * in order, their words cleaned as the symbols given are; anything but a list
 * is none.
 */
export function readSymbolResults(found: unknown): SymbolInfo[] {
  if (!Array.isArray(found)) return [];
  const named = (info: unknown): info is SymbolInfo =>
    typeof info === 'object' && info !== null && typeof (info as { symbol?: unknown }).symbol === 'string' && (info as SymbolInfo).symbol !== '';
  return found.filter(named).map((info) => cleanSymbolInfo(info, info.symbol));
}

/**
 * `over`'s fields where it has them, `base`'s for the rest: a field left
 * undefined or null (as a JSON feed writes one it has no value for) never
 * erases one. Neither is changed.
 */
export function mergeSymbolInfo(base: SymbolInfo | undefined, over: SymbolInfo | null | undefined): SymbolInfo | undefined {
  if (!over) return base;
  if (!base) return over;
  // Defined, not assigned: a "__proto__" field is copied as a field and never swaps the copy's prototype.
  const given = Object.entries(over).filter(([, value]) => value !== undefined && value !== null);
  return Object.fromEntries([...Object.entries(base), ...given]) as unknown as SymbolInfo;
}

/**
 * A symbol's venue, up to its last colon ("BINANCE:"), and the ticker after
 * it ("BTCUSDT"). No venue when there is no colon, or one at either end: the
 * ticker would be left with nothing.
 */
export function splitVenue(symbol: string): { venue: string; ticker: string } {
  const at = symbol.lastIndexOf(':');
  if (at <= 0 || at === symbol.length - 1) return { venue: '', ticker: symbol };
  return { venue: symbol.slice(0, at + 1), ticker: symbol.slice(at + 1) };
}

/** A ticker without its venue ("KBS:VCB" is VCB), in upper case. */
const bareTicker = (symbol: string): string => splitVenue(symbol).ticker.toUpperCase();

/**
 * What the chart knows (`getSymbolInfo()`), when it is of `symbol`: in any
 * case, or with a venue before one of the two and not the other. Null when it
 * is still another symbol's, as it stays with no feed to replace it.
 */
export function chartInfoFor(symbol: string, info: SymbolInfo | null | undefined): SymbolInfo | null {
  if (!info || typeof info.symbol !== 'string') return null;
  if (info.symbol.toUpperCase() === symbol.toUpperCase()) return info;
  const oneHasVenue = info.symbol.includes(':') !== symbol.includes(':');
  return oneHasVenue && bareTicker(info.symbol) === bareTicker(symbol) ? info : null;
}

/** A symbol's name and exchange on a line, for a tooltip ("Vinamilk · HOSE"); null when neither is known. */
export function symbolTitle(info: SymbolInfo | null | undefined): string | null {
  return [info?.description, info?.exchange].filter(Boolean).join(' · ') || null;
}

const pageBase = (): string | undefined => (typeof document === 'undefined' ? undefined : document.baseURI);

/**
 * The address to load a logo from, or null for one it must not load. It is
 * only ever an image's `src`, so markup in it is a path that finds nothing;
 * the scheme still has to be one for images, which keeps out `javascript:`
 * and pages written in `data:`.
 */
export function logoSrc(raw: unknown, base: string | undefined = pageBase()): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  // One longer than any taken is refused before it is parsed: a row's badge is made again on every keystroke.
  if (!text || text.length > MAX_LOGO_DATA) return null;
  let url: URL;
  try {
    url = new URL(text, base);
  } catch {
    return null;
  }
  if (url.protocol === 'data:') return DATA_IMAGE.test(url.href) && url.href.length <= MAX_LOGO_DATA ? url.href : null;
  return LOGO_PROTOCOLS.has(url.protocol) && url.href.length <= MAX_LOGO_URL ? url.href : null;
}
