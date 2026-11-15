/**
 * The shape of a datafeed written for the callback-style JS API that
 * several charting libraries use (`onReady`, `resolveSymbol`, `getBars`,
 * `subscribeBars`…), as far as `feedFromJsApi` reads it. Only the fields it
 * reads are named, with no index signatures, so a datafeed typed with that
 * API's own, fuller interfaces fits them.
 */

/** What `onReady` hands back. */
export interface JsApiConfiguration {
  supported_resolutions?: readonly string[];
  supports_search?: boolean;
  supports_group_request?: boolean;
}

/** A symbol as `resolveSymbol` describes it. */
export interface JsApiSymbolInfo {
  /** The name the user sees. */
  name: string;
  /** The unique name the datafeed is asked with, when it differs from `name`. */
  ticker?: string;
  description?: string;
  type?: string;
  exchange?: string;
  listed_exchange?: string;
  /** IANA zone of the exchange, `'America/New_York'`. */
  timezone?: string;
  /** Trading hours: `'0930-1600'`, `'24x7'`, `'0930-1600:23456'`. */
  session?: string;
  /** Prices move by `minmov / pricescale`: 100 is two decimals. */
  pricescale?: number;
  minmov?: number;
  currency_code?: string;
  logo_urls?: readonly string[];
}

/** One row a symbol search hands back. */
export interface JsApiSearchResult {
  symbol: string;
  full_name?: string;
  description?: string;
  exchange?: string;
  ticker?: string;
  type?: string;
  logo_urls?: readonly string[];
}

/** A bar; `time` in milliseconds. */
export interface JsApiBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Which bars `getBars` is asked for; `from` and `to` in seconds, `to` not included. */
export interface JsApiPeriodParams {
  from: number;
  to: number;
  countBack: number;
  firstDataRequest: boolean;
}

/** What `getBars` says with its bars: `noData` when there are no more; `nextTime` (ms) the newest older bar. */
export interface JsApiHistoryMetadata {
  noData?: boolean;
  nextTime?: number | null;
}

/** A quote as `getQuotes` and `subscribeQuotes` send it. */
export interface JsApiQuoteData {
  s: string;
  n: string;
  v: {
    lp?: number;
    ch?: number;
    chp?: number;
    open_price?: number;
    high_price?: number;
    low_price?: number;
    prev_close_price?: number;
    volume?: number;
    bid?: number;
    ask?: number;
  };
}

/**
 * A datafeed for the JS API. Methods are written as methods so a datafeed
 * typed with that API's own, narrower parameter types still fits.
 */
export interface JsApiDatafeed {
  onReady(callback: (configuration: JsApiConfiguration) => void): void;
  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: JsApiSymbolInfo) => void,
    onError: (reason: string) => void,
    extension?: unknown,
  ): void;
  getBars(
    symbolInfo: JsApiSymbolInfo,
    resolution: string,
    periodParams: JsApiPeriodParams,
    onResult: (bars: JsApiBar[], meta?: JsApiHistoryMetadata) => void,
    onError: (reason: string) => void,
  ): void;
  subscribeBars(
    symbolInfo: JsApiSymbolInfo,
    resolution: string,
    onTick: (bar: JsApiBar) => void,
    listenerGuid: string,
    onResetCacheNeeded: () => void,
  ): void;
  unsubscribeBars(listenerGuid: string): void;
  searchSymbols?(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (items: JsApiSearchResult[]) => void,
  ): void;
  getQuotes?(symbols: string[], onData: (data: JsApiQuoteData[]) => void, onError: (reason: string) => void): void;
  subscribeQuotes?(
    symbols: string[],
    fastSymbols: string[],
    onRealtime: (data: JsApiQuoteData[]) => void,
    listenerGuid: string,
  ): void;
  unsubscribeQuotes?(listenerGuid: string): void;
}
