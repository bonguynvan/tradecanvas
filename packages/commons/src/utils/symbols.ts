import type { SymbolInfo } from '../types/symbol.js';

/** How well `query` (upper case) matches `text` (upper case): 0 when it doesn't. */
function score(text: string, query: string): number {
  if (!text) return 0;
  if (text === query) return 1000;
  if (text.startsWith(query)) return 600 - Math.min(100, text.length - query.length);
  const at = text.indexOf(query);
  return at >= 0 ? 300 - Math.min(100, at) : 0;
}

/**
 * Symbols matching `query`, best first: an exact ticker, then tickers that
 * start with it, then names that contain it. `boost` adds to a match's score
 * (say, for the quote currencies most traded). An empty query keeps the order
 * given. At most `limit` results.
 */
export function rankSymbols(
  symbols: readonly SymbolInfo[],
  query: string,
  limit = 50,
  boost?: (info: SymbolInfo) => number,
): SymbolInfo[] {
  const q = query.trim().toUpperCase();
  if (!q) return symbols.slice(0, limit);
  const scored: { info: SymbolInfo; score: number }[] = [];
  for (const info of symbols) {
    const s = Math.max(
      score(info.symbol.toUpperCase(), q),
      score((info.description ?? '').toUpperCase(), q) * 0.8,
    );
    if (s > 0) scored.push({ info, score: s + (boost?.(info) ?? 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.info.symbol.localeCompare(b.info.symbol));
  return scored.slice(0, limit).map((s) => s.info);
}

/** Decimals in a price step: `'0.01000000'` → 2, `'1'` → 0, `1e-8` → 8. */
export function stepDecimals(step: number | string): number {
  const value = typeof step === 'number' ? step : Number(step);
  if (!Number.isFinite(value) || value <= 0) return 0;
  for (let decimals = 0; decimals <= 12; decimals++) {
    const scaled = value * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9 * Math.max(1, scaled)) return decimals;
  }
  return 12;
}

/** `'09:30'` → 570 (`'24:00'`, a day's end, → 1440), or null for anything that isn't a time of day. */
export function sessionMinute(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === 24 && minutes === 0) return 1440;
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}
