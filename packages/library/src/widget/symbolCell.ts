import { splitVenue } from './symbolCatalog.js';
import { highlight } from './symbolMatch.js';

/**
 * A row's symbol as a trader says it: the ticker, without the venue before
 * it ("HYPERLIQUID:xyz:GOLD" reads GOLD), the whole symbol on hover; the
 * exchange column names the venue. The letters `query` (upper case) matched
 * are marked. It reads left to right in any widget ("^GSPC", "BRK.B").
 */
export function createSymbolCell(symbol: string, query: string): HTMLSpanElement {
  const cell = document.createElement('span');
  cell.className = 'tcw-ss-symbol';
  cell.dir = 'ltr';
  const { venue } = splitVenue(symbol);
  if (venue) cell.title = symbol;
  const ticker = document.createElement('span');
  ticker.className = 'tcw-ss-ticker';
  ticker.innerHTML = highlight(symbol, query, venue.length, symbol.length);
  cell.appendChild(ticker);
  return cell;
}

/** A venue's words, for the exchange column of a symbol whose feed names no exchange ("BINANCE:" is BINANCE). */
export function venueName(symbol: string): string {
  return splitVenue(symbol).venue.replace(/:$/, '').replace(/:/g, ' ');
}
