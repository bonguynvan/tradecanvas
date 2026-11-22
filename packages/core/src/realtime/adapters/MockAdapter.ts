import type {
  DataAdapter,
  DataAdapterConfig,
  DataAdapterEventType,
  DataAdapterListener,
  ConnectionState,
  OHLCBar,
  Quote,
  Trade,
  SymbolInfo,
  SymbolSearchOptions,
  TimeFrame,
} from '@tradecanvas/commons';
import { buyVolumeOf, rankSymbols, tickBarCount, timeframeToMs } from '@tradecanvas/commons';

export interface MockAdapterOptions {
  /** Base price to generate data around */
  basePrice?: number;
  /** Volatility as percentage (default: 1.5) */
  volatility?: number;
  /** Tick interval in ms (default: 2000) */
  tickInterval?: number;
  /** Number of historical bars to generate */
  historySize?: number;
  /** Custom history generator */
  historyGenerator?: (symbol: string, timeframe: TimeFrame, limit: number) => OHLCBar[];
  /** Symbols `searchSymbols` and `resolveSymbol` know. */
  symbols?: SymbolInfo[];
}

/** The least and the most of a made-up bar's volume that the buyers took. */
const LEAST_BOUGHT = 0.05;
const MOST_BOUGHT = 0.95;
/** How far the way a bar closed leans its split, and how far its wobble does. */
const CLOSE_LEAN = 0.35;
const WOBBLE = 0.2;
const WOBBLE_STEPS = 97;

/**
 * A made-up bar with a made-up split of its volume: more of it bought the
 * further up in its range the bar closed, with a wobble read off the volume
 * itself. No random number is drawn for it, so the bars a seed gives are
 * the bars it gave before.
 */
function split(bar: OHLCBar): OHLCBar {
  const range = bar.high - bar.low;
  const lean = range > 0 ? (bar.close - bar.open) / range : 0;
  const wobble = ((Math.floor(bar.volume) % WOBBLE_STEPS) / WOBBLE_STEPS - 0.5) * WOBBLE;
  const share = Math.min(MOST_BOUGHT, Math.max(LEAST_BOUGHT, 0.5 + lean * CLOSE_LEAN + wobble));
  return { ...bar, buyVolume: Math.round(bar.volume * share) };
}

/** How many of the bars it last gave it can tell the trades of, and how many trades a bar is told in. */
const BARS_WITH_TRADES = 40;
const TRADES_A_BAR = 40;
/** How many trades a live tick is sent as: steps from the last price to the new one. */
const TRADES_A_TICK = 3;

/**
 * Trades that tell a bar's own story, `count` of them from `from` to `to`:
 * along its open, low, high and close (the high first when it fell), adding
 * up to its volume, the buyers taking what its `buyVolume` says, more of it
 * traded in the middle of the way than at its ends. No random number is
 * drawn.
 */
function tradesOfBar(bar: OHLCBar, count: number, from: number, to: number): Trade[] {
  if (!(bar.volume > 0) || count < 1) return [];
  const path = bar.close >= bar.open ? [bar.open, bar.low, bar.high, bar.close] : [bar.open, bar.high, bar.low, bar.close];
  const legs = path.length - 1;
  const bought = buyVolumeOf(bar) ?? bar.volume / 2;
  const sold = bar.volume - bought;
  // At least one trade for a side that took anything at all.
  const most = count - (sold > 0 ? 1 : 0);
  const buys = Math.max(bought > 0 ? 1 : 0, Math.min(most, Math.round((count * bought) / bar.volume)));
  // The buys among the sells as evenly as they go.
  const isBuy = (j: number): boolean => Math.floor(((j + 1) * buys) / count) > Math.floor((j * buys) / count);
  // Each trade's share of its side's volume: the most in the middle of the way.
  const weight = (j: number): number => 1 + Math.sin((Math.PI * (j + 0.5)) / count);
  let buyWeight = 0;
  let sellWeight = 0;
  for (let j = 0; j < count; j++) {
    if (isBuy(j)) buyWeight += weight(j);
    else sellWeight += weight(j);
  }
  const trades: Trade[] = [];
  for (let j = 0; j < count; j++) {
    const along = ((j + 0.5) / count) * legs;
    const leg = Math.min(legs - 1, Math.floor(along));
    const buy = isBuy(j);
    trades.push({
      time: Math.floor(from + ((to - from) * (j + 0.5)) / count),
      price: path[leg] + (path[leg + 1] - path[leg]) * (along - leg),
      volume: buy ? (bought * weight(j)) / buyWeight : (sold * weight(j)) / sellWeight,
      side: buy ? 'buy' : 'sell',
    });
  }
  return trades;
}

/**
 * Mock data adapter for testing, demos, and markets without free APIs.
 *
 * Generates realistic OHLCV data with configurable volatility.
 * Useful for:
 * - Unit/integration testing
 * - VN stock market simulation
 * - Offline development
 */
export class MockAdapter implements DataAdapter {
  readonly name = 'mock';

  private state: ConnectionState = 'disconnected';
  private listeners = new Map<DataAdapterEventType, Set<DataAdapterListener>>();
  private config: DataAdapterConfig | null = null;
  private options: MockAdapterOptions;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private currentPrice: number;
  /** Open of the oldest bar handed out per symbol, where its next older page ends. */
  private oldestOpen = new Map<string, number>();
  /** The bar the ticks build on, and its timeframe: the history's newest, then each new one. */
  private forming: OHLCBar | null = null;
  private formingTimeframe: TimeFrame | null = null;
  /** The newest bars it gave, kept up with the ticks: what its trades are told from. */
  private recent: { symbol: string; timeframe: TimeFrame; bars: OHLCBar[] } | null = null;
  /** Who listens for trades, each to a symbol's. */
  private tradeListeners = new Set<{ symbol: string; send: (trades: Trade[]) => void }>();

  constructor(options?: MockAdapterOptions) {
    this.options = {
      basePrice: 100,
      volatility: 1.5,
      tickInterval: 2000,
      historySize: 500,
      ...options,
    };
    this.currentPrice = this.options.basePrice!;
  }

  connect(config: DataAdapterConfig): void {
    this.config = config;
    this.state = 'connected';
    this.emitEvent('connectionChange', 'connected');
    this.startTicking();
  }

  disconnect(): void {
    this.stopTicking();
    // The bars it gave are of a series no longer shown: trades asked for now are not theirs.
    this.recent = null;
    this.state = 'disconnected';
    this.emitEvent('connectionChange', 'disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Made-up quotes: a random walk per symbol around `basePrice` (each symbol
   * starting at a price of its own), every symbol quoted at once and then each
   * `tickInterval`.
   */
  subscribeQuotes(symbols: readonly string[], onQuotes: (quotes: Quote[]) => void): () => void {
    const walks = [...new Set(symbols)].map((symbol) => {
      const open = this.options.basePrice! * (0.5 + (symbolHash(symbol) % 1000) / 1000);
      return { symbol, open, last: open, high: open, low: open, volume: 0 };
    });
    if (walks.length === 0) return () => {};
    const step = this.options.volatility! / 100;
    const emit = (): void => onQuotes(walks.map((w) => ({
      symbol: w.symbol,
      last: w.last,
      open: w.open,
      high: w.high,
      low: w.low,
      volume: w.volume,
      change: w.last - w.open,
      changePercent: ((w.last - w.open) / w.open) * 100,
      time: Date.now(),
    })));
    emit();
    const timer = setInterval(() => {
      for (const w of walks) {
        w.last = Math.max(w.open * 0.01, w.last * (1 + (Math.random() - 0.5) * step));
        w.high = Math.max(w.high, w.last);
        w.low = Math.min(w.low, w.last);
        w.volume += Math.random() * 100;
      }
      emit();
    }, this.options.tickInterval);
    return () => clearInterval(timer);
  }

  /**
   * Made-up recent trades, oldest first. After bars of `symbol` were given
   * (a time timeframe's), the trades of the newest of them: inside each
   * bar, adding up to its volume and its split, so a footprint of them is
   * the bars' own. Else a walk around `basePrice`, a second apart.
   */
  async fetchTrades(symbol: string, limit = 1000): Promise<Trade[]> {
    const count = Math.max(1, Math.min(1000, Math.floor(limit)));
    const told = this.tradesOfRecentBars(symbol, count);
    if (told) return told;
    const now = Date.now();
    const step = this.options.volatility! / 1000;
    let price = this.options.basePrice! * (0.5 + (symbolHash(symbol) % 1000) / 1000);
    const trades: Trade[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const from = price;
      price = Math.max(price * 0.5, price * (1 + (Math.random() - 0.5) * step));
      // Taken by the buyer when the price went up to it, by the seller when it went down: the tick rule.
      trades.push({ time: now - i * 1000, price, volume: Math.random() * 5, side: price >= from ? 'buy' : 'sell' });
    }
    return trades;
  }

  /**
   * Made-up live trades, a few each `tickInterval`. While the bars of
   * `symbol` tick, the trades are those ticks: at the forming bar's prices,
   * adding up to what it gains. Else a walk of their own.
   */
  subscribeTrades(symbol: string, onTrades: (trades: Trade[]) => void): () => void {
    const step = this.options.volatility! / 1000;
    let price = this.options.basePrice! * (0.5 + (symbolHash(symbol) % 1000) / 1000);
    const listener = { symbol, send: onTrades };
    this.tradeListeners.add(listener);
    const timer = setInterval(() => {
      // The bars' own ticks are the trades while they tick.
      if (this.ticksBarsOf(symbol)) return;
      const trades: Trade[] = [];
      for (let i = 0; i < 3; i++) {
        const from = price;
        price = Math.max(price * 0.5, price * (1 + (Math.random() - 0.5) * step));
        trades.push({ time: Date.now(), price, volume: Math.random() * 5, side: price >= from ? 'buy' : 'sell' });
      }
      onTrades(trades);
    }, this.options.tickInterval);
    return () => {
      clearInterval(timer);
      this.tradeListeners.delete(listener);
    };
  }

  /** Whether the live bars are `symbol`'s, of a timeframe of time. */
  private ticksBarsOf(symbol: string): boolean {
    return this.tickTimer !== null && this.state === 'connected' && this.config?.symbol === symbol && tickBarCount(this.config.timeframe) === null;
  }

  /** The trades of the newest bars given for `symbol`, at most `limit`; null when it gave none to tell them from. */
  private tradesOfRecentBars(symbol: string, limit: number): Trade[] | null {
    const recent = this.recent;
    if (!recent || recent.symbol !== symbol || recent.bars.length === 0) return null;
    const span = timeframeToMs(recent.timeframe);
    // One trade under the limit at most: who asked can tell these are all the trades there are.
    const bars = recent.bars.slice(-Math.max(1, Math.floor((limit - 1) / TRADES_A_BAR)));
    const each = Math.min(TRADES_A_BAR, Math.max(1, Math.floor((limit - 1) / bars.length)));
    const now = Date.now();
    // The bar still forming has traded up to now, not to its end.
    return bars.flatMap((bar) => tradesOfBar(bar, each, bar.time, Math.max(bar.time, Math.min(bar.time + span, now))));
  }

  async fetchHistory(symbol: string, timeframe: TimeFrame, limit?: number): Promise<OHLCBar[]> {
    const bars = this.options.historyGenerator
      ? this.options.historyGenerator(symbol, timeframe, limit ?? this.options.historySize!)
      : this.generateHistory(timeframe, limit ?? this.options.historySize!);
    if (bars.length > 0) this.oldestOpen.set(symbol, bars[0].open);
    this.forming = bars.length > 0 ? { ...bars[bars.length - 1] } : null;
    this.formingTimeframe = timeframe;
    // Bars of trades (a tick timeframe) are made of trades, not the other way round.
    this.recent = tickBarCount(timeframe) === null ? { symbol, timeframe, bars: bars.slice(-BARS_WITH_TRADES).map((bar) => ({ ...bar })) } : null;
    return bars;
  }

  /** Make up `limit` bars before `before` (ms) that lead into the oldest bar handed out. */
  async fetchHistoryBefore(symbol: string, timeframe: TimeFrame, before: number, limit: number): Promise<OHLCBar[]> {
    const intervalMs = timeframeToMs(timeframe);
    const vol = this.options.volatility! / 100;
    const bars: OHLCBar[] = new Array(Math.max(0, limit));
    let close = this.oldestOpen.get(symbol) ?? this.options.basePrice!;
    // Walk back in time: each bar's close is the next one's open.
    for (let k = 0; k < limit; k++) {
      const open = close / (1 + (Math.random() - 0.52) * vol);
      const high = Math.max(open, close) + Math.random() * close * vol * 0.3;
      const low = Math.max(0, Math.min(open, close) - Math.random() * close * vol * 0.3);
      const volume = Math.floor(10000 + Math.random() * 100000);
      bars[limit - 1 - k] = split({ time: before - (k + 1) * intervalMs, open, high, low, close, volume });
      close = open;
    }
    this.oldestOpen.set(symbol, close);
    return bars;
  }

  async searchSymbols(query: string, options?: SymbolSearchOptions): Promise<SymbolInfo[]> {
    return rankSymbols(this.options.symbols ?? [], query, options?.limit ?? 50);
  }

  async resolveSymbol(symbol: string): Promise<SymbolInfo | null> {
    return this.options.symbols?.find((s) => s.symbol === symbol) ?? null;
  }

  on<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    let set = this.listeners.get(event);
    if (!set) { set = new Set(); this.listeners.set(event, set); }
    set.add(listener as DataAdapterListener);
  }

  off<T = unknown>(event: DataAdapterEventType, listener: DataAdapterListener<T>): void {
    this.listeners.get(event)?.delete(listener as DataAdapterListener);
  }

  dispose(): void {
    this.disconnect();
    this.listeners.clear();
  }

  // --- Internal ---

  private generateHistory(timeframe: TimeFrame, count: number): OHLCBar[] {
    const bars: OHLCBar[] = [];
    const intervalMs = timeframeToMs(timeframe);
    // On the timeframe's grid, as a feed's bars are: the newest is the one now forming.
    const newest = Math.floor(Date.now() / intervalMs) * intervalMs;
    let price = this.options.basePrice!;
    const vol = this.options.volatility! / 100;

    for (let i = count - 1; i >= 0; i--) {
      const time = newest - i * intervalMs;
      const change = (Math.random() - 0.48) * price * vol;
      const open = price;
      price += change;
      const high = Math.max(open, price) + Math.random() * price * vol * 0.3;
      const low = Math.min(open, price) - Math.random() * price * vol * 0.3;
      const volume = Math.floor(10000 + Math.random() * 100000);
      bars.push(split({ time, open, high, low, close: price, volume }));
    }

    this.currentPrice = price;
    return bars;
  }

  private startTicking(): void {
    this.stopTicking();
    const interval = this.options.tickInterval ?? 2000;

    this.tickTimer = setInterval(() => {
      if (this.state !== 'connected' || !this.config) return;

      const vol = this.options.volatility! / 100;
      const change = (Math.random() - 0.48) * this.currentPrice * vol * 0.3;
      this.currentPrice += change;

      const now = Date.now();
      const volume = Math.floor(100 + Math.random() * 5000);
      const bar = this.tickBar(now, change, volume);
      // A forming bar each tick; the next bar's time starts the next one.
      this.emitEvent('bar', { bar, closed: false });
      this.emitEvent('tick', { time: now, price: this.currentPrice, volume: bar.volume });
      this.sendTickTrades(now, change, volume);
    }, interval);
  }

  /**
   * The forming bar after a tick moved the price by `change`: the bar of this
   * moment carried on (its open kept, its range widened, its volume added),
   * or a new one opening at the last close once its time has come.
   */
  private tickBar(now: number, change: number, volume: number): OHLCBar {
    const timeframe = this.config!.timeframe;
    const intervalMs = timeframeToMs(timeframe);
    const time = Math.floor(now / intervalMs) * intervalMs;
    const price = this.currentPrice;
    const last = this.formingTimeframe === timeframe ? this.forming : null;
    const wick = Math.abs(change) * 0.2;
    let bar: OHLCBar;
    // Taken by the buyers when the price went up to it, by the sellers when it went down: the tick rule, as its trades say.
    const bought = change >= 0 ? volume : 0;
    if (last && last.time === time) {
      bar = {
        time, open: last.open, high: Math.max(last.high, price + wick), low: Math.min(last.low, price - wick), close: price,
        volume: last.volume + volume, buyVolume: (buyVolumeOf(last) ?? 0) + bought,
      };
    } else {
      const open = last?.close ?? price - change;
      bar = { time, open, high: Math.max(open, price) + wick, low: Math.min(open, price) - wick, close: price, volume, buyVolume: bought };
    }
    this.forming = bar;
    this.formingTimeframe = timeframe;
    this.keepRecent(bar);
    return { ...bar };
  }

  /** The bar the ticks build on among the newest bars: in place of itself, or after them once it is a new one. */
  private keepRecent(bar: OHLCBar): void {
    const recent = this.recent;
    if (!recent || recent.timeframe !== this.config?.timeframe || recent.symbol !== this.config.symbol) return;
    const last = recent.bars[recent.bars.length - 1];
    if (last && last.time === bar.time) recent.bars[recent.bars.length - 1] = { ...bar };
    else recent.bars = [...recent.bars.slice(-(BARS_WITH_TRADES - 1)), { ...bar }];
  }

  /** A tick as trades, to those who listen for the symbol's: steps from the price before it to the price after, the tick's volume between them. */
  private sendTickTrades(now: number, change: number, volume: number): void {
    const symbol = this.config?.symbol;
    if (symbol === undefined || !this.ticksBarsOf(symbol) || this.tradeListeners.size === 0) return;
    const from = this.currentPrice - change;
    const part = Math.floor(volume / TRADES_A_TICK);
    const side = change >= 0 ? 'buy' : 'sell';
    const trades: Trade[] = [];
    for (let k = 1; k <= TRADES_A_TICK; k++) {
      // What does not divide goes with the last step.
      const size = k === TRADES_A_TICK ? volume - part * (TRADES_A_TICK - 1) : part;
      if (size > 0) trades.push({ time: now, price: from + (change * k) / TRADES_A_TICK, volume: size, side });
    }
    for (const listener of this.tradeListeners) {
      if (listener.symbol === symbol) listener.send(trades);
    }
  }

  private stopTicking(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private emitEvent(type: DataAdapterEventType, data: unknown): void {
    const set = this.listeners.get(type);
    if (set) {
      const event = { type, data, timestamp: Date.now() };
      for (const listener of set) listener(event);
    }
  }
}

/** A steady number for a symbol, so each one's made-up price is its own. */
function symbolHash(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return h;
}
