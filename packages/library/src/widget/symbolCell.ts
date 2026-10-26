import { splitVenue } from './symbolCatalog.js';
import { highlight } from './symbolMatch.js';

/**
 * A row's symbol: its venue ("BINANCE:"), where it has one, apart from its
 * ticker, so a narrow column cuts the venue short and keeps the ticker whole;
 * the letters `query` (upper case) matched are marked in either part. It
 * reads left to right in any widget ("^GSPC", "BRK.B").
 */
export function createSymbolCell(symbol: string, query: string): HTMLSpanElement {
  const cell = document.createElement('span');
  cell.className = 'tcw-ss-symbol';
  cell.dir = 'ltr';
  const { venue } = splitVenue(symbol);
  const part = (className: string, from: number, to: number) => {
    const span = document.createElement('span');
    span.className = className;
    span.innerHTML = highlight(symbol, query, from, to);
    return span;
  };
  if (venue) cell.appendChild(part('tcw-ss-venue', 0, venue.length));
  cell.appendChild(part('tcw-ss-ticker', venue.length, symbol.length));
  return cell;
}
