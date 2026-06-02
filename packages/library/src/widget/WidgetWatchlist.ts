/**
 * Watchlist sidebar — vertical list of symbols, each with last price, %
 * change, and a mini sparkline. Clicking switches the chart's symbol.
 *
 * The widget tracks the *active* symbol's price/spark automatically from the
 * live stream. For non-active symbols, the host can push data via
 * `setEntry(symbol, …)` so the row reflects whatever the app already has.
 */
export interface WatchlistEntry {
  symbol: string;
  lastPrice?: number;
  /** Reference price for % calc (usually session open or 24h-ago close). */
  refPrice?: number;
  /** Recent close samples for the sparkline — last point is the live price. */
  sparkline?: number[];
}

export interface WatchlistCallbacks {
  onSelect: (symbol: string) => void;
}

export class WidgetWatchlist {
  private el: HTMLDivElement;
  private listEl: HTMLDivElement;
  private rowMap = new Map<string, {
    row: HTMLDivElement;
    priceEl: HTMLSpanElement;
    changeEl: HTMLSpanElement;
    sparkCanvas: HTMLCanvasElement;
  }>();
  private entries = new Map<string, WatchlistEntry>();
  private active: string | null = null;
  private callbacks: WatchlistCallbacks;

  constructor(host: HTMLElement, symbols: string[], callbacks: WatchlistCallbacks) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-watchlist';

    const header = document.createElement('div');
    header.className = 'tcw-watchlist-header';
    header.textContent = 'Watchlist';
    this.el.appendChild(header);

    this.listEl = document.createElement('div');
    this.listEl.className = 'tcw-watchlist-list';
    this.el.appendChild(this.listEl);

    for (const symbol of symbols) {
      this.entries.set(symbol, { symbol });
      this.appendRow(symbol);
    }

    host.appendChild(this.el);
  }

  /** Replace the symbol set. Rows are diff'd so DOM churn is minimal. */
  setSymbols(symbols: string[]): void {
    const next = new Set(symbols);
    for (const sym of this.rowMap.keys()) {
      if (!next.has(sym)) this.removeRow(sym);
    }
    for (const sym of symbols) {
      if (!this.rowMap.has(sym)) {
        this.entries.set(sym, this.entries.get(sym) ?? { symbol: sym });
        this.appendRow(sym);
      }
    }
  }

  setActive(symbol: string): void {
    if (this.active === symbol) return;
    if (this.active && this.rowMap.has(this.active)) {
      this.rowMap.get(this.active)!.row.classList.remove('tcw-watchlist-active');
    }
    this.active = symbol;
    const cur = this.rowMap.get(symbol);
    if (cur) cur.row.classList.add('tcw-watchlist-active');
  }

  /** Push a price tick into a row. The widget calls this automatically for
   *  the active symbol. Apps can call it for the rest. */
  setEntry(symbol: string, patch: Partial<WatchlistEntry>): void {
    const prev = this.entries.get(symbol) ?? { symbol };
    const next = { ...prev, ...patch };
    this.entries.set(symbol, next);
    this.renderRow(symbol);
  }

  destroy(): void {
    this.el.remove();
    this.rowMap.clear();
    this.entries.clear();
  }

  private appendRow(symbol: string): void {
    const row = document.createElement('div');
    row.className = 'tcw-watchlist-row';
    row.tabIndex = 0;

    const label = document.createElement('div');
    label.className = 'tcw-watchlist-symbol';
    label.textContent = formatSymbol(symbol);

    const spark = document.createElement('canvas');
    spark.className = 'tcw-watchlist-spark';
    spark.width = 64;
    spark.height = 22;

    const right = document.createElement('div');
    right.className = 'tcw-watchlist-stats';
    const priceEl = document.createElement('span');
    priceEl.className = 'tcw-watchlist-price';
    priceEl.textContent = '—';
    const changeEl = document.createElement('span');
    changeEl.className = 'tcw-watchlist-change';
    changeEl.textContent = '';
    right.appendChild(priceEl);
    right.appendChild(changeEl);

    row.appendChild(label);
    row.appendChild(spark);
    row.appendChild(right);

    row.addEventListener('click', () => this.callbacks.onSelect(symbol));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.callbacks.onSelect(symbol);
      }
    });

    this.listEl.appendChild(row);
    this.rowMap.set(symbol, { row, priceEl, changeEl, sparkCanvas: spark });
    if (symbol === this.active) row.classList.add('tcw-watchlist-active');
  }

  private removeRow(symbol: string): void {
    const ref = this.rowMap.get(symbol);
    if (!ref) return;
    ref.row.remove();
    this.rowMap.delete(symbol);
  }

  private renderRow(symbol: string): void {
    const ref = this.rowMap.get(symbol);
    const entry = this.entries.get(symbol);
    if (!ref || !entry) return;

    if (entry.lastPrice !== undefined) {
      ref.priceEl.textContent = formatPrice(entry.lastPrice);
    }

    if (entry.lastPrice !== undefined && entry.refPrice !== undefined && entry.refPrice !== 0) {
      const diff = entry.lastPrice - entry.refPrice;
      const pct = (diff / entry.refPrice) * 100;
      const sign = diff >= 0 ? '+' : '';
      ref.changeEl.textContent = `${sign}${pct.toFixed(2)}%`;
      ref.changeEl.className = `tcw-watchlist-change ${diff >= 0 ? 'tcw-up' : 'tcw-down'}`;
    } else {
      ref.changeEl.textContent = '';
    }

    if (entry.sparkline && entry.sparkline.length >= 2) {
      drawSparkline(ref.sparkCanvas, entry.sparkline, entry.refPrice ?? entry.sparkline[0]);
    }
  }
}

function formatSymbol(symbol: string): string {
  // Add a /  separator for typical crypto pair suffixes; leaves stock tickers
  // (AAPL, NVDA) alone.
  for (const quote of ['USDT', 'USD', 'BTC', 'ETH', 'EUR']) {
    if (symbol.length > quote.length && symbol.endsWith(quote)) {
      return symbol.slice(0, -quote.length) + '/' + quote;
    }
  }
  return symbol;
}

function formatPrice(v: number): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toFixed(2);
  if (abs >= 1) return v.toFixed(4);
  return v.toPrecision(4);
}

function drawSparkline(canvas: HTMLCanvasElement, samples: number[], ref: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== canvas.clientWidth * dpr) {
    canvas.width = (canvas.clientWidth || 64) * dpr;
    canvas.height = (canvas.clientHeight || 22) * dpr;
  }
  const w = canvas.width;
  const h = canvas.height;

  let lo = Infinity, hi = -Infinity;
  for (const v of samples) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = Math.max(hi - lo, 1e-9);
  const last = samples[samples.length - 1];
  const up = last >= ref;
  const color = up ? '#26a17b' : '#f23645';

  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = 1.4 * dpr;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const step = w / (samples.length - 1);
  for (let i = 0; i < samples.length; i++) {
    const x = i * step;
    const y = h - ((samples[i] - lo) / span) * (h - 4) - 2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
