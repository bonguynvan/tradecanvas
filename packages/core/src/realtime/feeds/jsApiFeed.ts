import { resolutionToTimeframe, timeframeToMs, timeframeToResolution } from '@tradecanvas/commons';
import type {
  BarsRequest,
  BarsSubscription,
  DataFeed,
  FeedSubscriber,
  OHLCBar,
  Quote,
  SymbolInfo,
  SymbolSearchOptions,
  TimeFrame,
} from '@tradecanvas/commons';
import { quotesFromJsApi, symbolFromSearchResult, symbolInfoFromJsApi } from './jsApiSymbols.js';
import type { JsApiBar, JsApiConfiguration, JsApiDatafeed, JsApiSymbolInfo } from './jsApiTypes.js';

export interface JsApiFeedOptions {
  /** The feed's name (default `'jsapi'`). */
  name?: string;
  /**
   * The timeframes the datafeed serves; the chart builds the others from
   * them. Default: the datafeed's `supported_resolutions` once `onReady`
   * has answered, and every timeframe until then.
   */
  supportedTimeframes?: readonly TimeFrame[];
  /** Results a symbol search keeps (default 50). */
  searchLimit?: number;
}

/** A `DataFeed` over a JS API datafeed, and the moment the datafeed has said what it serves. */
export type JsApiFeed = DataFeed & {
  /**
   * Resolves once `onReady` has answered, with the timeframes the datafeed
   * serves (none: every one). Await it before handing the feed to a chart
   * when `supportedTimeframes` isn't given: a chart reads them when it connects.
   */
  ready(): Promise<readonly TimeFrame[] | undefined>;
};

const DEFAULT_SEARCH_LIMIT = 50;
const MS_PER_SECOND = 1000;
/** Below this a time is in seconds, not milliseconds (it would be 1973 in ms). */
const MS_TIME_FLOOR = 1e11;
/**
 * How much wider each try at an empty range looks, for a datafeed that reads
 * only `from` and `to`: a weekend or a holiday leaves the first range empty.
 */
const WIDER_RANGES = [1, 8, 64];

/** The error a request the chart gave up on rejects with. */
const abortError = (): Error => Object.assign(new Error('Aborted'), { name: 'AbortError' });

/** A bar with every price finite, as TradeCanvas takes it; null otherwise. */
function barFromJsApi(bar: JsApiBar): OHLCBar | null {
  const { time, open, high, low, close } = bar;
  if (![time, open, high, low, close].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  const volume = typeof bar.volume === 'number' && Number.isFinite(bar.volume) ? bar.volume : 0;
  return { time, open, high, low, close, volume };
}

/** The bars of an answer, oldest first, before `before` when it is given. */
function barsFromJsApi(bars: readonly JsApiBar[], before: number | undefined): OHLCBar[] {
  const out: OHLCBar[] = [];
  for (const raw of bars) {
    const bar = barFromJsApi(raw);
    if (bar && (before === undefined || bar.time < before)) out.push(bar);
  }
  return out.sort((a, b) => a.time - b.time);
}

/**
 * Sends a subscription's bars on: each as the forming bar, and the one
 * before as closed when a newer one starts.
 */
function barRelay(subscriber: FeedSubscriber): (bar: OHLCBar) => void {
  let forming: OHLCBar | null = null;
  return (bar) => {
    if (forming && bar.time > forming.time) subscriber.bar(forming, true);
    if (!forming || bar.time >= forming.time) forming = bar;
    subscriber.bar(bar, false);
  };
}

/**
 * A `DataFeed` over a datafeed written for the callback-style JS API that
 * several charting libraries use: `onReady`, `resolveSymbol`, `getBars`,
 * `subscribeBars`/`unsubscribeBars`, and `searchSymbols`, `getQuotes`,
 * `subscribeQuotes` when it has them. The datafeed stays as it is: this
 * resolves each symbol once and hands its symbol info back to `getBars`,
 * turns timeframes into resolutions (`'1h'` → `'60'`), the chart's
 * `countBack`/`before` into `from`/`to` in seconds, callbacks into promises,
 * and a guid to unsubscribe with into the function `subscribeBars` returns.
 * A datafeed's `onResetCacheNeeded` makes the chart load the series again.
 *
 * The timeframes it serves come from `onReady`, which answers later: give
 * them as `supportedTimeframes`, or await `feed.ready()` before the chart
 * connects, so the chart builds the others from them.
 *
 * ```ts
 * const feed = feedFromJsApi(myDatafeed);
 * await feed.ready();
 * new ChartWidget(el, { feed, symbol: 'AAPL', timeframe: '1d' })
 * ```
 */
export function feedFromJsApi(datafeed: JsApiDatafeed, options: JsApiFeedOptions = {}): JsApiFeed {
  let ready: Promise<JsApiConfiguration> | null = null;
  let served: readonly TimeFrame[] | undefined = options.supportedTimeframes;
  const configuration = (): Promise<JsApiConfiguration> => {
    ready ??= new Promise<JsApiConfiguration>((resolve) => datafeed.onReady((config) => resolve(config ?? {}))).then((config) => {
      if (!options.supportedTimeframes && Array.isArray(config.supported_resolutions)) {
        const timeframes = config.supported_resolutions.map(resolutionToTimeframe).filter((tf): tf is TimeFrame => tf !== null);
        if (timeframes.length) served = timeframes;
      }
      return config;
    });
    return ready;
  };
  // Asking early lets the timeframes the datafeed serves be known before the chart asks for bars.
  void configuration();

  const symbols = new Map<string, Promise<JsApiSymbolInfo>>();
  const resolve = (symbol: string): Promise<JsApiSymbolInfo> => {
    let found = symbols.get(symbol);
    if (!found) {
      found = configuration().then(
        () => new Promise<JsApiSymbolInfo>((ok, fail) => datafeed.resolveSymbol(symbol, ok, (reason) => fail(new Error(String(reason))))),
      );
      // A symbol that failed to resolve is asked again next time.
      found.catch(() => symbols.delete(symbol));
      symbols.set(symbol, found);
    }
    return found;
  };

  const resolutionOf = (timeframe: TimeFrame): string => {
    const resolution = timeframeToResolution(timeframe);
    if (resolution === null) throw new TypeError(`No resolution for the timeframe '${timeframe}'`);
    return resolution;
  };

  /** Seconds `countBack` bars of `timeframe` span; a bar a minute where its length is unknown. */
  const spanOf = (request: BarsRequest): number => {
    const ms = timeframeToMs(request.timeframe);
    const seconds = Number.isFinite(ms) && ms > 0 ? Math.round(ms / MS_PER_SECOND) : 60;
    return Math.max(1, seconds) * request.countBack;
  };

  /**
   * One `getBars` call over the `span` seconds before `to`: its bars, the
   * time (ms) to ask from again when it had none there, and whether the
   * datafeed said there are no more.
   */
  const askBars = (info: JsApiSymbolInfo, resolution: string, to: number, span: number, request: BarsRequest, first: boolean) =>
    new Promise<{ bars: OHLCBar[]; nextTime: number | null; noData: boolean }>((ok, fail) => {
      const onAbort = (): void => fail(abortError());
      if (request.signal.aborted) return onAbort();
      request.signal.addEventListener('abort', onAbort, { once: true });
      datafeed.getBars(
        info,
        resolution,
        { from: to - span, to, countBack: request.countBack, firstDataRequest: first },
        (bars, meta) => {
          request.signal.removeEventListener('abort', onAbort);
          const raw = meta?.noData && typeof meta.nextTime === 'number' && Number.isFinite(meta.nextTime) && meta.nextTime > 0 ? meta.nextTime : null;
          // Milliseconds, as bar times are; a datafeed that gives seconds is read as such.
          const nextTime = raw === null ? null : raw < MS_TIME_FLOOR ? raw * MS_PER_SECOND : raw;
          ok({ bars: barsFromJsApi(Array.isArray(bars) ? bars : [], request.before), nextTime, noData: meta?.noData === true });
        },
        (reason) => {
          request.signal.removeEventListener('abort', onAbort);
          fail(new Error(String(reason)));
        },
      );
    });

  let guids = 0;
  const nextGuid = (kind: string): string => `tradecanvas-${kind}-${++guids}`;

  const feed: JsApiFeed = {
    name: options.name ?? 'jsapi',
    get supportedTimeframes() {
      return served;
    },

    ready: () => configuration().then(() => served),

    async getBars(request: BarsRequest): Promise<OHLCBar[]> {
      const info = await resolve(request.symbol);
      if (request.signal.aborted) throw abortError();
      const resolution = resolutionOf(request.timeframe);
      const first = request.before === undefined;
      const to = first ? Math.floor(Date.now() / MS_PER_SECOND) + 1 : Math.floor(request.before! / MS_PER_SECOND);
      const span = spanOf(request);
      for (const [i, wider] of WIDER_RANGES.entries()) {
        const answer = await askBars(info, resolution, to, span * wider, request, first && i === 0);
        if (answer.bars.length) return answer.bars;
        // No bars here but some further back (a holiday, a gap): ask once more from just after them.
        if (answer.nextTime !== null && answer.nextTime < (request.before ?? Infinity)) {
          return (await askBars(info, resolution, Math.floor(answer.nextTime / MS_PER_SECOND) + 1, span, request, false)).bars;
        }
        // The datafeed says there are no more.
        if (answer.noData) return [];
      }
      return [];
    },

    subscribeBars(request: BarsSubscription, subscriber: FeedSubscriber): () => void {
      const guid = nextGuid('bars');
      let live = true;
      let subscribed = false;
      const relay = barRelay(subscriber);
      resolve(request.symbol)
        .then((info) => {
          if (!live) return;
          const resolution = resolutionOf(request.timeframe);
          // Marked first: a stop from inside the datafeed's own call still unsubscribes.
          subscribed = true;
          datafeed.subscribeBars(
            info,
            resolution,
            (raw) => {
              const bar = live ? barFromJsApi(raw) : null;
              if (bar) relay(bar);
            },
            guid,
            // The datafeed's bars changed: the chart loads them again and subscribes anew.
            () => {
              if (live) subscriber.connection('disconnected');
            },
          );
          if (live) subscriber.symbolInfo(symbolInfoFromJsApi(info));
        })
        .catch((err: unknown) => {
          if (!live) return;
          subscriber.error(err instanceof Error ? err.message : String(err));
          // The chart's reconnect asks again, with its backoff: a symbol that failed to resolve is not kept.
          subscriber.connection('error');
        });
      return () => {
        live = false;
        if (subscribed) datafeed.unsubscribeBars(guid);
      };
    },

    async resolveSymbol(symbol: string): Promise<SymbolInfo | null> {
      try {
        return symbolInfoFromJsApi(await resolve(symbol));
      } catch {
        return null;
      }
    },
  };

  if (typeof datafeed.searchSymbols === 'function') {
    const search = datafeed.searchSymbols.bind(datafeed);
    feed.searchSymbols = async (query: string, opts?: SymbolSearchOptions): Promise<SymbolInfo[]> => {
      await configuration();
      const limit = opts?.limit ?? options.searchLimit ?? DEFAULT_SEARCH_LIMIT;
      return new Promise<SymbolInfo[]>((ok, fail) => {
        const signal = opts?.signal;
        if (signal?.aborted) return fail(abortError());
        const onAbort = (): void => fail(abortError());
        signal?.addEventListener('abort', onAbort, { once: true });
        search(query, '', '', (items) => {
          signal?.removeEventListener('abort', onAbort);
          ok((Array.isArray(items) ? items : []).slice(0, limit).map(symbolFromSearchResult));
        });
      });
    };
  }

  if (typeof datafeed.subscribeQuotes === 'function' && typeof datafeed.unsubscribeQuotes === 'function') {
    feed.subscribeQuotes = (list: readonly string[], onQuotes: (quotes: Quote[]) => void): (() => void) => {
      const guid = nextGuid('quotes');
      let live = true;
      const send = (data: Parameters<typeof quotesFromJsApi>[0]): void => {
        if (!live || !Array.isArray(data)) return;
        const quotes = quotesFromJsApi(data);
        if (quotes.length) onQuotes(quotes);
      };
      // The latest quotes first, then their changes.
      datafeed.getQuotes?.([...list], send, () => {});
      datafeed.subscribeQuotes!([...list], [], send, guid);
      return () => {
        live = false;
        datafeed.unsubscribeQuotes!(guid);
      };
    };
  }

  return feed;
}
