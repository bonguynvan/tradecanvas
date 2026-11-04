import { SYMBOL_INDICATOR_IDS, type IndicatorEngine } from '@tradecanvas/core';

/** What the requests read of the indicators. */
export type SymbolReaders = Pick<IndicatorEngine, 'getActiveIndicators' | 'getIndicatorConfig'>;

/** The other symbols' bars the chart holds. */
export interface HeldSymbols {
  has(symbol: string): boolean;
}

/** The other symbol an indicator reads ('compareSymbol', 'spread'…), trimmed; '' for none. */
function symbolOf(id: string, params: Readonly<Record<string, unknown>>): string {
  const symbol = params.symbol;
  return SYMBOL_INDICATOR_IDS.has(id) && typeof symbol === 'string' ? symbol.trim() : '';
}

/**
 * The other symbols the indicators read, and which of them the chart has
 * asked its app for (`symbolSeriesRequest`) and not been given yet: each
 * is asked for once. No DOM.
 */
export class SymbolRequests {
  private readonly asked = new Set<string>();

  constructor(
    private readonly readers: SymbolReaders,
    private readonly held: HeldSymbols,
  ) {}

  /** The symbols the indicators read, whether their bars are here or not. */
  required(): string[] {
    const out = new Set<string>();
    for (const ind of this.readers.getActiveIndicators()) {
      const symbol = symbolOf(ind.id, ind.params);
      if (symbol) out.add(symbol);
    }
    return [...out];
  }

  /** The indicators reading `symbol`. */
  readersOf(symbol: string): string[] {
    const wanted = symbol.trim();
    return this.readers.getActiveIndicators()
      .filter((ind) => SYMBOL_INDICATOR_IDS.has(ind.id) && String(ind.params.symbol ?? '').trim() === wanted)
      .map((ind) => ind.instanceId);
  }

  /** The bars of `symbol` came: it is no longer waited for. */
  given(symbol: string): void {
    this.asked.delete(symbol.trim());
  }

  /** A symbol no indicator reads any more may be asked for again later. */
  forgetUnread(): void {
    const required = new Set(this.required());
    for (const symbol of this.asked) if (!required.has(symbol)) this.asked.delete(symbol);
  }

  /**
   * The symbol to ask for once for the indicator just added or changed: the
   * one it reads, when the chart hasn't got it and hasn't asked (not those
   * other indicators read: one whose fetch failed is asked for again only
   * by an indicator on it). Null when there is nothing to ask.
   */
  toAsk(instanceId: string): string | null {
    this.forgetUnread();
    const config = this.readers.getIndicatorConfig(instanceId);
    const symbol = config ? symbolOf(config.id, config.params) : '';
    if (!symbol || this.held.has(symbol) || this.asked.has(symbol)) return null;
    this.asked.add(symbol);
    return symbol;
  }
}
