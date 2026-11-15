import { resolutionToTimeframe, timeframeToMs } from '@tradecanvas/commons';
import type { TimeFrame } from '@tradecanvas/commons';
import { feedFromJsApi, type JsApiFeed } from './jsApiFeed.js';
import type { JsApiBar, JsApiConfiguration, JsApiDatafeed, JsApiQuoteData, JsApiSearchResult, JsApiSymbolInfo } from './jsApiTypes.js';

export interface UdfFeedOptions {
  /** The server's address; the endpoints (`/config`, `/history`…) are read below it. */
  url: string;
  /** The feed's name (default `'udf'`). */
  name?: string;
  /** Headers sent with every request (a key, a token of your own). */
  headers?: Record<string, string>;
  /** How often live bars and quotes are asked for, in ms (default 10 000). */
  updateFrequency?: number;
  /** The timeframes the server serves. Default: its `/config`'s `supported_resolutions`. */
  supportedTimeframes?: readonly TimeFrame[];
  /** Results a symbol search asks for (default 50). */
  searchLimit?: number;
  /** The `fetch` to call (default the global one). */
  fetch?: typeof fetch;
}

const DEFAULT_UPDATE_MS = 10_000;
const DEFAULT_SEARCH_LIMIT = 50;
const MS_PER_SECOND = 1000;
/** Bars each poll asks for: the forming one and the one before, so a bar that just closed is sent final. */
const POLL_BARS = 2;

/** What a UDF server is taken to offer when it has no `/config`. */
const DEFAULT_CONFIG: JsApiConfiguration = {
  supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'],
  supports_group_request: true,
  supports_search: false,
};

type Column = number | number[] | undefined;
const at = (column: Column, i: number): number | undefined => (Array.isArray(column) ? column[i] : column);

/** A `/history` answer's columns as bars; `t` in seconds becomes ms. */
function barsFromColumns(answer: Record<string, unknown>): JsApiBar[] {
  const times = Array.isArray(answer.t) ? (answer.t as number[]) : [];
  const [o, h, l, c, v] = (['o', 'h', 'l', 'c', 'v'] as const).map((k) => answer[k] as Column);
  return times.map((t, i) => {
    const close = at(c, i) as number;
    return { time: t * MS_PER_SECOND, open: at(o, i) ?? close, high: at(h, i) ?? close, low: at(l, i) ?? close, close, volume: at(v, i) };
  });
}

/** A request the server answered with an HTTP error, as against one that never reached it. */
class HttpError extends Error {
  constructor(
    path: string,
    readonly status: number,
  ) {
    super(`${path}: HTTP ${status}`);
  }
}

const errorOf = (answer: unknown, fallback: string): string => {
  const message = (answer as { errmsg?: unknown } | null)?.errmsg;
  return typeof message === 'string' && message ? message : fallback;
};

/** A JS API datafeed reading a UDF server: the bars from `/history`, live ones by asking again every `updateFrequency`. */
function udfDatafeed(options: UdfFeedOptions): JsApiDatafeed {
  const base = options.url.replace(/\/+$/, '');
  // Read when a request is made, so a feed made where there is no fetch (a server render) is harmless.
  const doFetch = (url: string, init: RequestInit): Promise<Response> => (options.fetch ?? globalThis.fetch)(url, init);
  const every = options.updateFrequency ?? DEFAULT_UPDATE_MS;
  const timers = new Map<string, ReturnType<typeof setInterval>>();

  const get = async (path: string, params: Record<string, string | number | undefined> = {}): Promise<unknown> => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
    const search = query.toString();
    const response = await doFetch(`${base}${path}${search ? `?${search}` : ''}`, { headers: options.headers });
    if (!response.ok) throw new HttpError(path, response.status);
    return response.json();
  };

  let config: Promise<JsApiConfiguration> | null = null;
  const configuration = (): Promise<JsApiConfiguration> => {
    config ??= get('/config').then(
      (answer) => ({ ...DEFAULT_CONFIG, ...(answer && typeof answer === 'object' ? (answer as JsApiConfiguration) : {}) }),
      () => DEFAULT_CONFIG,
    );
    return config;
  };

  const history = async (symbol: JsApiSymbolInfo, resolution: string, from: number, to: number, countback: number) => {
    const answer = (await get('/history', { symbol: symbol.ticker ?? symbol.name, resolution, from, to, countback })) as Record<string, unknown>;
    if (answer?.s === 'ok') return { bars: barsFromColumns(answer), nextTime: null };
    if (answer?.s === 'no_data') {
      const next = typeof answer.nextTime === 'number' ? answer.nextTime * MS_PER_SECOND : null;
      return { bars: [], nextTime: next };
    }
    throw new Error(errorOf(answer, '/history failed'));
  };

  const stop = (guid: string): void => {
    const timer = timers.get(guid);
    if (timer !== undefined) clearInterval(timer);
    timers.delete(guid);
  };

  const getQuotes = (symbols: string[], onData: (data: JsApiQuoteData[]) => void, onError: (reason: string) => void): void => {
    get('/quotes', { symbols: symbols.join(',') }).then(
      (answer) => {
        const a = answer as { s?: unknown; d?: unknown } | null;
        if (a?.s === 'ok' && Array.isArray(a.d)) onData(a.d as JsApiQuoteData[]);
        else onError(errorOf(answer, '/quotes failed'));
      },
      (err: unknown) => onError(err instanceof Error ? err.message : String(err)),
    );
  };

  return {
    onReady(callback) {
      void configuration().then(callback);
    },

    resolveSymbol(symbolName, onResolve, onError) {
      get('/symbols', { symbol: symbolName }).then(
        (answer) => {
          const info = answer as JsApiSymbolInfo & { s?: unknown };
          if (info && typeof info === 'object' && info.s === 'error') onError(errorOf(answer, 'unknown_symbol'));
          else if (info && typeof info === 'object' && typeof info.name === 'string') onResolve(info);
          else onResolve({ name: symbolName, ticker: symbolName });
        },
        // A server without `/symbols` (one that serves symbols in groups) still charts the name it was given;
        // one that can't be reached is an error.
        (err: unknown) => (err instanceof HttpError ? onResolve({ name: symbolName, ticker: symbolName }) : onError(err instanceof Error ? err.message : String(err))),
      );
    },

    searchSymbols(userInput, exchange, symbolType, onResult) {
      void configuration().then((c) => {
        if (c.supports_search === false) return onResult([]);
        get('/search', { query: userInput, type: symbolType, exchange, limit: options.searchLimit ?? DEFAULT_SEARCH_LIMIT }).then(
          (answer) => onResult(Array.isArray(answer) ? (answer as JsApiSearchResult[]) : []),
          () => onResult([]),
        );
      });
    },

    getBars(symbolInfo, resolution, { from, to, countBack }, onResult, onError) {
      history(symbolInfo, resolution, from, to, countBack).then(
        ({ bars, nextTime }) => onResult(bars, bars.length ? {} : { noData: true, nextTime }),
        (err: unknown) => onError(err instanceof Error ? err.message : String(err)),
      );
    },

    subscribeBars(symbolInfo, resolution, onTick, listenerGuid) {
      stop(listenerGuid);
      const timeframe = resolutionToTimeframe(resolution);
      const barMs = timeframe ? timeframeToMs(timeframe) : Number.NaN;
      const span = Math.max(1, Math.round((Number.isFinite(barMs) ? barMs : 60_000) / MS_PER_SECOND)) * POLL_BARS;
      let newest = 0;
      let asking = false;
      const poll = (): void => {
        // A slow answer is waited for: an older one landing after a newer would set the bar back.
        if (asking) return;
        asking = true;
        const to = Math.floor(Date.now() / MS_PER_SECOND) + 1;
        history(symbolInfo, resolution, to - span, to, POLL_BARS)
          .then(({ bars }) => {
            if (!timers.has(listenerGuid)) return;
            for (const bar of bars) {
              if (bar.time < newest) continue;
              newest = bar.time;
              onTick(bar);
            }
          })
          // A failed poll is asked again at the next one.
          .catch(() => {})
          .finally(() => {
            asking = false;
          });
      };
      timers.set(listenerGuid, setInterval(poll, every));
    },

    unsubscribeBars: stop,

    getQuotes,

    subscribeQuotes(symbols, _fastSymbols, onRealtime, listenerGuid) {
      stop(listenerGuid);
      timers.set(listenerGuid, setInterval(() => getQuotes(symbols, onRealtime, () => {}), every));
    },

    unsubscribeQuotes: stop,
  };
}

/**
 * A `DataFeed` reading a UDF server: `/config`, `/symbols`, `/search`,
 * `/history` and `/quotes`, times in seconds. UDF has no push, so live bars
 * and quotes are asked for again every `updateFrequency` ms.
 *
 * Await `feed.ready()` before the chart connects to have the timeframes of
 * the server's `/config` (or give `supportedTimeframes`).
 *
 * ```ts
 * const feed = udfFeed({ url: 'https://example.com/udf' });
 * await feed.ready();
 * new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })
 * ```
 */
export function udfFeed(options: UdfFeedOptions): JsApiFeed {
  return feedFromJsApi(udfDatafeed(options), {
    name: options.name ?? 'udf',
    supportedTimeframes: options.supportedTimeframes,
    searchLimit: options.searchLimit,
  });
}
