import type { Quote, QuoteSource, SymbolInfo } from '@tradecanvas/commons';
import { readQuote } from '@tradecanvas/commons';
import { browserStorage, pageHidden } from './pageEnv.js';
import { WidgetWatchlist, type WatchlistEntry } from './WidgetWatchlist.js';
import { WatchlistStore, type WatchlistList } from './WatchlistStore.js';
import type { ChartWidget } from './ChartWidget.js';

/** What the watchlists read of the widget around them, and ask of it. */
export interface WatchlistsHost {
  readonly chart: ChartWidget['chart'];
  chartSymbolInfo: ChartWidget['chartSymbolInfo'];
  closePanelByHand: ChartWidget['docking']['closePanelByHand'];
  readonly destroyed: ChartWidget['destroyed'];
  readonly options: ChartWidget['options'];
  refreshSymbolInfo: ChartWidget['refreshSymbolInfo'];
  sessionRefPrice: ChartWidget['sessionRefPrice'];
  setSymbol: ChartWidget['setSymbol'];
  readonly settingsState: ChartWidget['chartSettings']['settingsState'];
  readonly state: ChartWidget['state'];
  symbolEntries: ChartWidget['symbolEntries'];
  symbolSearchFn: ChartWidget['symbolSearchFn'];
  readonly symbols: ChartWidget['symbols'];
  readonly t: ChartWidget['t'];
  withSymbolSearch: ChartWidget['withSymbolSearch'];
}

/**
 * The watchlists in the dock: the lists and their store, the quotes they show (from the host
 * or a quote source), the sparklines and the reference prices the change is read against.
 */
export class WidgetWatchlists {
  constructor(private readonly host: WatchlistsHost) {}

  watchlist: WidgetWatchlist | null = null;

  private watchlistSparkBuffer = new Map<string, number[]>();

  /** Per-symbol refPrice explicitly pushed by the host via `setWatchlistEntry` — takes precedence over `sessionRefPrice`. */
  private hostWatchlistRefPrice = new Map<string, number>();

  watchlistInterval: ReturnType<typeof setInterval> | null = null;

  watchlistStore: WatchlistStore | null = null;

  /** The list follows `setSymbols` (no lists given, none kept). */
  watchlistFromSymbols = false;

  private quoteSource: QuoteSource | null = null;

  stopQuotes: (() => void) | null = null;

  /** The symbols quotes are coming for, joined. */
  private quotedKey = '';

  /** The latest quote of each symbol. */
  quotes = new Map<string, Quote>();

  /** Every watchlist, in order. */
  getWatchlists(): WatchlistList[] {
    return this.watchlistStore?.getLists() ?? [];
  }

  /** The shown watchlist's id, or null without a watchlist. */
  getActiveWatchlist(): string | null {
    return this.watchlistStore?.getActive().id ?? null;
  }

  /** Replace every watchlist (and which one shows). */
  setWatchlists(lists: WatchlistList[], activeList?: string): void {
    this.watchlistFromSymbols = false;
    this.watchlistStore?.replace(lists, activeList);
  }

  setActiveWatchlist(id: string): void {
    this.watchlistStore?.setActive(id);
  }

  /** Add a symbol to a watchlist (the shown one by default). */
  addToWatchlist(symbol: string, listId?: string): void {
    this.watchlistStore?.add(symbol, listId);
  }

  removeFromWatchlist(symbol: string, listId?: string): void {
    this.watchlistStore?.removeSymbol(symbol, listId);
  }

  /**
   * Quotes for the watchlist's rows (and `getQuote`), from your own feed.
   * What isn't a quote (no symbol, no finite last price) is left out.
   */
  setQuotes(quotes: readonly Quote[]): void {
    const read = quotes.map(readQuote).filter((q): q is Quote => q !== null);
    if (read.length > 0) this.takeQuotes(read);
  }

  /** The latest quote of a symbol, from the quote source or `setQuotes`. */
  getQuote(symbol: string): Quote | null {
    const quote = this.quotes.get(symbol);
    return quote ? { ...quote } : null;
  }

  createWatchlist(body: HTMLElement, opts: import('./types.js').WatchlistOptions): void {
    const storage = opts.persist ? browserStorage() : null;
    const store = new WatchlistStore({
      lists: opts.lists,
      activeList: opts.activeList,
      symbols: this.host.symbols,
      defaultName: this.host.t('watchlist.title'),
      storage,
      storageKey: opts.storageKey,
    });
    this.watchlistStore = store;
    this.watchlistFromSymbols = !opts.lists && !opts.persist;
    this.quoteSource = opts.quotes === false ? null : opts.quotes ?? (this.host.options.adapter?.subscribeQuotes ? this.host.options.adapter as QuoteSource : null);

    const t = (key: Parameters<typeof this.host.t>[0]) => this.host.t(key);
    this.watchlist = new WidgetWatchlist(body, {
      onSelect: (sym) => { void this.host.setSymbol(sym); },
      onAdd: () => this.host.withSymbolSearch(() => true, (search) => search.open({
        symbols: this.host.symbolEntries(), current: this.host.state.symbol, currentInfo: this.host.chartSymbolInfo(),
        onPick: (sym) => store.add(sym), search: this.host.symbolSearchFn(),
      })),
      onRemove: (sym) => store.removeSymbol(sym),
      onMove: (sym, index) => store.move(sym, index),
      onPickList: (id) => store.setActive(id),
      onCreateList: (name) => store.create(name),
      onRenameList: (id, name) => store.rename(id, name),
      onDeleteList: (id) => store.remove(id),
      onClose: () => this.host.closePanelByHand('watchlist'),
    }, {
      close: t('common.close'),
      title: t('watchlist.title'),
      lists: t('watchlist.lists'),
      newList: t('watchlist.newList'),
      rename: t('watchlist.rename'),
      deleteList: t('watchlist.deleteList'),
      confirmDelete: t('watchlist.confirmDelete'),
      add: t('watchlist.add'),
      remove: t('watchlist.remove'),
      empty: t('watchlist.empty'),
      listName: t('watchlist.listName'),
      columns: {
        symbol: t('watchlist.columnSymbol'),
        price: t('watchlist.columnPrice'),
        move: t('watchlist.columnMove'),
        change: t('watchlist.columnChange'),
      },
    }, {
      sparkline: opts.sparkline === true,
      // The logos given with the symbols (`symbols` as SymbolInfo), as the symbol search shows them.
      infoOf: (sym) => this.host.symbolEntries().find((e): e is SymbolInfo => typeof e !== 'string' && e.symbol === sym),
    });
    this.watchlist.setActive(this.host.state.symbol);
    this.watchlist.setLocale(this.host.settingsState.numberLocale || undefined);
    const show = () => {
      this.watchlist?.setLists(store.getLists(), store.getActive().id);
      this.followQuotes();
    };
    store.subscribe(() => {
      show();
      opts.onChange?.(store.getLists(), store.getActive().id);
    });
    show();
  }

  /** Quotes for the shown list's symbols: a new subscription when they change. */
  private followQuotes(): void {
    if (!this.quoteSource || !this.watchlistStore || this.host.destroyed) return;
    const symbols = this.watchlistStore.getActive().symbols;
    // The same symbols in another order (a row moved) keep their subscription.
    const key = [...symbols].sort().join('\u0000');
    if (key === this.quotedKey) return;
    this.quotedKey = key;
    this.stopQuotes?.();
    this.stopQuotes = null;
    if (symbols.length === 0) return;
    try {
      this.stopQuotes = this.quoteSource.subscribeQuotes(symbols, (quotes) => {
        if (this.host.destroyed || !Array.isArray(quotes)) return;
        // A source of the host's is untrusted: what isn't a quote is left out.
        const read = quotes.map(readQuote).filter((q): q is Quote => q !== null);
        if (read.length > 0) this.takeQuotes(read);
      });
    } catch {
      this.stopQuotes = null;
    }
  }

  private takeQuotes(quotes: readonly Quote[]): void {
    for (const update of quotes) {
      // A stream frame carries less than a snapshot: what it leaves out stays.
      const quote = { ...this.quotes.get(update.symbol), ...update };
      this.quotes.set(quote.symbol, quote);
      const buf = this.watchlistSparkBuffer.get(quote.symbol) ?? [];
      buf.push(quote.last);
      if (buf.length > 40) buf.shift();
      this.watchlistSparkBuffer.set(quote.symbol, buf);
      const hostRef = this.hostWatchlistRefPrice.get(quote.symbol);
      this.watchlist?.setEntry(quote.symbol, {
        lastPrice: quote.last,
        refPrice: hostRef ?? (quote.change !== undefined ? quote.last - quote.change : undefined),
        sparkline: buf.slice(),
      });
    }
    if (quotes.some((q) => q.symbol === this.host.state.symbol)) this.host.refreshSymbolInfo();
  }

  /**
   * Push an entry into the watchlist (e.g., from your own WebSocket).
   * Call with the symbols you care about; the active symbol is updated
   * automatically from the chart's live data.
   *
   * A host-supplied `refPrice` takes precedence over the widget's own
   * session-open guess for that symbol — including the active one, so the
   * auto-tick loop stops clobbering it (see `tickWatchlist`).
   */
  setWatchlistEntry(symbol: string, entry: Partial<WatchlistEntry>): void {
    if (entry.refPrice !== undefined) {
      this.hostWatchlistRefPrice.set(symbol, entry.refPrice);
    }
    this.watchlist?.setEntry(symbol, entry);
  }

  tickWatchlist(): void {
    // A symbol with quotes shows them (the day's move), not the loaded bars'.
    if (!this.watchlist || this.quotes.has(this.host.state.symbol)) return;
    // No one sees it: a hidden page, the app in the background.
    if (pageHidden()) return;
    const data = this.host.chart.getData();
    if (data.length === 0) return;
    const last = data[data.length - 1];
    const hostRef = this.hostWatchlistRefPrice.get(this.host.state.symbol);
    // Reference price: first bar of the loaded slice — that's the closest
    // approximation of "session open" without timezone bookkeeping. Only
    // used as a fallback; a refPrice the host already pushed via
    // `setWatchlistEntry` (even for the active symbol) always wins.
    if (hostRef === undefined && this.host.sessionRefPrice === null) {
      this.host.sessionRefPrice = data[0].open;
    }

    const buf = this.watchlistSparkBuffer.get(this.host.state.symbol) ?? [];
    buf.push(last.close);
    if (buf.length > 40) buf.shift();
    this.watchlistSparkBuffer.set(this.host.state.symbol, buf);

    this.watchlist.setEntry(this.host.state.symbol, {
      lastPrice: last.close,
      refPrice: hostRef ?? this.host.sessionRefPrice ?? data[0].open,
      sparkline: buf.slice(),
    });
  }
}
