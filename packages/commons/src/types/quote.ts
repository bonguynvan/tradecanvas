/**
 * A symbol's latest quote: its price and the day's move, for a watchlist row
 * or a symbol's details. Prices are in the symbol's quote currency.
 */
export interface Quote {
  symbol: string;
  /** The last traded price. */
  last: number;
  /** The move from the reference price (the prior close; 24 h ago for crypto). */
  change?: number;
  /** The same move, in percent. */
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  /** The prior session's close. */
  prevClose?: number;
  /** Volume over the same period, in the base unit. */
  volume?: number;
  bid?: number;
  ask?: number;
  /** When the quote was made, in ms since the epoch. */
  time?: number;
}

/** Live quotes for many symbols at once. */
export interface QuoteSource {
  /**
   * Send quotes for `symbols` to `onQuotes` as they change (any number per
   * call) until the function it returns is called.
   */
  subscribeQuotes(symbols: readonly string[], onQuotes: (quotes: Quote[]) => void): () => void;
}

const QUOTE_NUMBERS = ['change', 'changePercent', 'open', 'high', 'low', 'prevClose', 'volume', 'bid', 'ask', 'time'] as const;

/**
 * A quote from untrusted input (a host's push, a feed's frame): its symbol
 * and last price must be usable; any other field that isn't a finite number
 * is left out. The change is worked out from the prior close or the open when
 * the input has none. Null when it isn't a quote.
 */
export function readQuote(raw: unknown): Quote | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim() : '';
  if (!symbol || symbol.length > 64 || !isFiniteNumber(r.last)) return null;
  const quote: Quote = { symbol, last: r.last };
  for (const key of QUOTE_NUMBERS) {
    const v = r[key];
    if (isFiniteNumber(v)) quote[key] = v;
  }
  const ref = quote.prevClose ?? quote.open;
  if (quote.change === undefined && ref !== undefined) quote.change = quote.last - ref;
  if (quote.changePercent === undefined && quote.change !== undefined) {
    const base = quote.last - quote.change;
    if (base !== 0) quote.changePercent = (quote.change / base) * 100;
  }
  return quote;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
