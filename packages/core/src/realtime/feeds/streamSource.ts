import type {
  BarsSubscription,
  ConnectionState,
  DataAdapter,
  DataAdapterEventType,
  DataAdapterListener,
  FeedSubscriber,
  OHLCBar,
  RawTick,
  StreamConfig,
  SymbolInfo,
} from '@tradecanvas/commons';
import { ResamplingAdapter, withResampling } from '../adapters/ResamplingAdapter.js';
import { withTickBars } from '../TickBars.js';
import { FeedAdapter, isFeedAdapter, streamAdapterOf } from './feedAdapter.js';

/** The message of an error a source sent without one. */
export const UNNAMED_SOURCE_ERROR = 'Adapter error';

/**
 * What a stream runs on, in a feed's terms: it asks for the newest bars,
 * subscribes to the live ones, and hears them through a `FeedSubscriber`.
 * It keeps one live series, the stream's: subscribing again takes the place
 * of the series before.
 */
export interface StreamSource {
  /** The wrapper that builds the timeframes the source lacks (null: it serves every one). */
  readonly resampler: ResamplingAdapter | null;
  /**
   * Whether silence means a dead connection. A feed's doesn't: it says when
   * its connection drops, and a quiet one (a daily chart, a closed market) is fine.
   */
  readonly watchSilence: boolean;
  /** Who hears the source from now on, until `release`. */
  listen(subscriber: FeedSubscriber): void;
  /** The newest `countBack` bars of `series`. */
  getBars(series: BarsSubscription, countBack: number): Promise<OHLCBar[]>;
  /** Live bars of `series`, in place of the series subscribed before. */
  subscribeBars(series: BarsSubscription): void;
  /** Stops the live bars; a feed's requests for their series are aborted. */
  unsubscribe(): void;
  /** Lets go of the source: the subscriber hears no more of it. */
  release(): void;
}

/**
 * The source a stream runs on: the config's feed, or its adapter as one.
 * Timeframes the source lacks (7m, 90m…) are built from one it has, and tick
 * timeframes (100T) from its trades; both wrap adapters, so a feed with
 * either is read through them, as an adapter is. Throws when the config has
 * neither an adapter nor a feed, or both.
 */
export function streamSourceOf(config: Pick<StreamConfig, 'adapter' | 'feed'>): StreamSource {
  const given = streamAdapterOf(config);
  const watchSilence = !isFeedAdapter(given);
  const resampled = withResampling(given);
  const resampler = resampled instanceof ResamplingAdapter ? resampled : null;
  const adapter = withTickBars(resampled);
  return adapter instanceof FeedAdapter
    ? new FeedSource(adapter, resampler, watchSilence)
    : new AdapterSource(adapter, resampler, watchSilence);
}

/** A feed, heard as it speaks. Its adapter keeps the requests a disconnect aborts, the chart's pages among them. */
class FeedSource implements StreamSource {
  private subscriber: FeedSubscriber | null = null;

  constructor(
    private readonly adapter: FeedAdapter,
    readonly resampler: ResamplingAdapter | null,
    readonly watchSilence: boolean,
  ) {}

  listen(subscriber: FeedSubscriber): void {
    this.subscriber = subscriber;
  }

  getBars(series: BarsSubscription, countBack: number): Promise<OHLCBar[]> {
    return this.adapter.fetchStreamHistory(series, countBack);
  }

  subscribeBars(series: BarsSubscription): void {
    this.adapter.subscribe(series, this.subscriber ?? undefined);
  }

  unsubscribe(): void {
    this.adapter.disconnect();
  }

  release(): void {
    this.subscriber = null;
  }
}

/**
 * An adapter as a feed. Its events are heard from `listen` to `release`,
 * not only while subscribed: an adapter may say what it learned about the
 * symbol while its history loads. Its `connect` replaces the stream it had,
 * so subscribing again disconnects nothing first.
 */
class AdapterSource implements StreamSource {
  private unlisten: (() => void)[] = [];

  constructor(
    private readonly adapter: DataAdapter,
    readonly resampler: ResamplingAdapter | null,
    readonly watchSilence: boolean,
  ) {}

  listen(subscriber: FeedSubscriber): void {
    this.hear('connectionChange', (e) => subscriber.connection(e.data as ConnectionState));
    this.hear('tick', (e) => subscriber.tick(e.data as RawTick));
    // Pre-formed bars (most adapters send these).
    this.hear('bar', (e) => {
      const { bar, closed } = e.data as { bar: OHLCBar; closed: boolean };
      subscriber.bar(bar, closed);
    });
    this.hear('error', (e) => subscriber.error((e.data as { message?: string } | undefined)?.message ?? UNNAMED_SOURCE_ERROR));
    try {
      this.hear('symbolInfo', (e) => subscriber.symbolInfo(e?.data as SymbolInfo));
    } catch {
      // An adapter with a fixed list of events: it sends none of this one either.
    }
  }

  getBars(series: BarsSubscription, countBack: number): Promise<OHLCBar[]> {
    return this.adapter.fetchHistory(series.symbol, series.timeframe, countBack);
  }

  subscribeBars(series: BarsSubscription): void {
    this.adapter.connect({ symbol: series.symbol, timeframe: series.timeframe });
  }

  unsubscribe(): void {
    this.adapter.disconnect();
  }

  release(): void {
    for (const off of this.unlisten) off();
    this.unlisten = [];
  }

  private hear(type: DataAdapterEventType, listener: DataAdapterListener): void {
    this.adapter.on(type, listener);
    this.unlisten.push(() => this.adapter.off(type, listener));
  }
}
