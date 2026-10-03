import type { WatchlistList } from './WatchlistStore.js';
import { fill } from './i18n.js';

/**
 * Watchlist sidebar: the shown list's symbols, each with last price, % change
 * and a mini sparkline. A menu switches, creates, renames and deletes lists;
 * rows are added, removed and reordered (drag, or Alt+↑/↓). It only renders
 * and reports: the widget keeps the lists (see WatchlistStore).
 *
 * The widget tracks the chart's symbol from the live stream, and fills the
 * other rows from a quote source or what the host pushes (`setEntry`).
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
  /** "+": add a symbol to the shown list (the widget opens its symbol search). */
  onAdd?: () => void;
  onRemove?: (symbol: string) => void;
  /** Move a symbol to `index` in the shown list. */
  onMove?: (symbol: string, index: number) => void;
  onPickList?: (id: string) => void;
  onCreateList?: (name: string) => void;
  onRenameList?: (id: string, name: string) => void;
  onDeleteList?: (id: string) => void;
}

export interface WatchlistLabels {
  title: string;
  lists: string;
  newList: string;
  rename: string;
  deleteList: string;
  /** `{name}`: the list's name. */
  confirmDelete: string;
  add: string;
  /** `{symbol}`. */
  remove: string;
  empty: string;
  listName: string;
}

interface RowRef {
  row: HTMLDivElement;
  priceEl: HTMLSpanElement;
  changeEl: HTMLSpanElement;
  sparkCanvas: HTMLCanvasElement;
}

export class WidgetWatchlist {
  private el: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private nameBtn: HTMLButtonElement;
  private menuEl: HTMLDivElement;
  private listEl: HTMLDivElement;
  private rowMap = new Map<string, RowRef>();
  private entries = new Map<string, WatchlistEntry>();
  private lists: WatchlistList[] = [];
  private activeList = '';
  private active: string | null = null;
  private locale: string | undefined;
  private dragging: string | null = null;
  private readonly onOutside = (e: MouseEvent) => {
    if (!this.headerEl.contains(e.target as Node)) this.closeMenu();
  };

  constructor(
    host: HTMLElement,
    private readonly callbacks: WatchlistCallbacks,
    private readonly labels: WatchlistLabels,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-watchlist';
    this.el.setAttribute('aria-label', labels.title);

    this.headerEl = document.createElement('div');
    this.headerEl.className = 'tcw-watchlist-header';

    this.nameBtn = document.createElement('button');
    this.nameBtn.type = 'button';
    this.nameBtn.className = 'tcw-watchlist-name';
    this.nameBtn.setAttribute('aria-haspopup', 'menu');
    this.nameBtn.setAttribute('aria-expanded', 'false');
    this.nameBtn.title = labels.lists;
    this.nameBtn.addEventListener('click', () => (this.menuEl.hidden ? this.openMenu() : this.closeMenu()));

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tcw-watchlist-add';
    addBtn.textContent = '+';
    addBtn.title = labels.add;
    addBtn.setAttribute('aria-label', labels.add);
    addBtn.hidden = !callbacks.onAdd;
    addBtn.addEventListener('click', () => callbacks.onAdd?.());

    this.menuEl = document.createElement('div');
    this.menuEl.className = 'tcw-dropdown tcw-watchlist-menu';
    this.menuEl.setAttribute('role', 'menu');
    this.menuEl.hidden = true;

    this.headerEl.append(this.nameBtn, addBtn, this.menuEl);
    this.el.appendChild(this.headerEl);

    this.listEl = document.createElement('div');
    this.listEl.className = 'tcw-watchlist-list';
    this.listEl.setAttribute('role', 'list');
    this.el.appendChild(this.listEl);

    host.appendChild(this.el);
  }

  /** The lists, and which one shows. Rows are diffed so prices stay. */
  setLists(lists: WatchlistList[], activeId: string): void {
    this.lists = lists.map((l) => ({ ...l, symbols: [...l.symbols] }));
    this.activeList = lists.some((l) => l.id === activeId) ? activeId : lists[0]?.id ?? '';
    const shown = this.shownList();
    this.nameBtn.textContent = shown?.name ?? this.labels.title;
    this.renderRows(shown?.symbols ?? []);
    if (!this.menuEl.hidden) this.renderMenu();
  }

  /** Set the BCP 47 locale used for price/percent formatting. */
  setLocale(locale: string | undefined): void {
    this.locale = locale;
    for (const symbol of this.rowMap.keys()) this.renderRow(symbol);
  }

  /** The chart's symbol, marked in the list. */
  setActive(symbol: string): void {
    this.active = symbol;
    for (const [sym, ref] of this.rowMap) {
      const on = sym === symbol;
      ref.row.classList.toggle('tcw-watchlist-active', on);
      if (on) ref.row.setAttribute('aria-current', 'true');
      else ref.row.removeAttribute('aria-current');
    }
  }

  /** A row's price, move and sparkline. Kept for symbols not shown yet. */
  setEntry(symbol: string, patch: Partial<WatchlistEntry>): void {
    const prev = this.entries.get(symbol) ?? { symbol };
    this.entries.set(symbol, { ...prev, ...patch, symbol });
    this.renderRow(symbol);
  }

  destroy(): void {
    this.closeMenu();
    this.el.remove();
    this.rowMap.clear();
    this.entries.clear();
  }

  private shownList(): WatchlistList | undefined {
    return this.lists.find((l) => l.id === this.activeList);
  }

  // --- Rows ---

  private renderRows(symbols: string[]): void {
    for (const sym of [...this.rowMap.keys()]) {
      if (!symbols.includes(sym)) {
        this.rowMap.get(sym)!.row.remove();
        this.rowMap.delete(sym);
      }
    }
    for (const sym of symbols) if (!this.rowMap.has(sym)) this.makeRow(sym);
    // In list order; nodes already in place stay.
    this.listEl.replaceChildren(...symbols.map((sym) => this.rowMap.get(sym)!.row));
    if (symbols.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-watchlist-empty';
      empty.textContent = this.labels.empty;
      this.listEl.appendChild(empty);
    }
    if (this.active) this.setActive(this.active);
  }

  private makeRow(symbol: string): void {
    const row = document.createElement('div');
    row.className = 'tcw-watchlist-row';
    row.setAttribute('role', 'listitem');
    row.dataset.symbol = symbol;
    row.tabIndex = 0;
    row.draggable = !!this.callbacks.onMove;

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
    right.append(priceEl, changeEl);
    row.append(label, spark, right);

    if (this.callbacks.onRemove) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tcw-watchlist-remove';
      remove.textContent = '×';
      remove.tabIndex = -1;
      const text = fill(this.labels.remove, { symbol });
      remove.title = text;
      remove.setAttribute('aria-label', text);
      remove.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onRemove?.(symbol);
      });
      row.appendChild(remove);
    }

    row.addEventListener('click', () => this.callbacks.onSelect(symbol));
    row.addEventListener('keydown', (e) => this.onRowKey(e, symbol));
    row.addEventListener('dragstart', (e) => {
      this.dragging = symbol;
      e.dataTransfer?.setData('text/plain', symbol);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      row.classList.add('tcw-watchlist-dragging');
    });
    row.addEventListener('dragend', () => {
      this.dragging = null;
      row.classList.remove('tcw-watchlist-dragging');
    });
    row.addEventListener('dragover', (e) => {
      if (this.dragging && this.dragging !== symbol) e.preventDefault();
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = this.dragging;
      this.dragging = null;
      if (!from || from === symbol) return;
      const order = this.shownList()?.symbols ?? [];
      this.callbacks.onMove?.(from, order.indexOf(symbol));
    });

    this.rowMap.set(symbol, { row, priceEl, changeEl, sparkCanvas: spark });
    this.renderRow(symbol);
  }

  private onRowKey(e: KeyboardEvent, symbol: string): void {
    const order = this.shownList()?.symbols ?? [];
    const index = order.indexOf(symbol);
    // Keys handled here stay here (Delete would also remove a selected drawing).
    if (['Enter', ' ', 'Delete', 'Backspace', 'ArrowDown', 'ArrowUp'].includes(e.key)) e.stopPropagation();
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.callbacks.onSelect(symbol);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.callbacks.onRemove) {
      e.preventDefault();
      const next = order[index + 1] ?? order[index - 1];
      this.callbacks.onRemove(symbol);
      if (next) this.rowMap.get(next)?.row.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const to = index + (e.key === 'ArrowDown' ? 1 : -1);
      if (to < 0 || to >= order.length) return;
      if (e.altKey) {
        this.callbacks.onMove?.(symbol, to);
        this.rowMap.get(symbol)?.row.focus();
      } else {
        this.rowMap.get(order[to])?.row.focus();
      }
    }
  }

  private renderRow(symbol: string): void {
    const ref = this.rowMap.get(symbol);
    const entry = this.entries.get(symbol);
    if (!ref || !entry) return;

    if (entry.lastPrice !== undefined) {
      ref.priceEl.textContent = formatPrice(entry.lastPrice, this.locale);
    }

    if (entry.lastPrice !== undefined && entry.refPrice !== undefined && entry.refPrice !== 0) {
      const diff = entry.lastPrice - entry.refPrice;
      const pct = (diff / entry.refPrice) * 100;
      const sign = diff >= 0 ? '+' : '-';
      const pctText = Math.abs(pct).toLocaleString(this.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      ref.changeEl.textContent = `${sign}${pctText}%`;
      ref.changeEl.className = `tcw-watchlist-change ${diff >= 0 ? 'tcw-up' : 'tcw-down'}`;
    } else {
      ref.changeEl.textContent = '';
    }

    if (entry.sparkline && entry.sparkline.length >= 2) {
      drawSparkline(ref.sparkCanvas, entry.sparkline, entry.refPrice ?? entry.sparkline[0]);
    }
  }

  // --- The lists menu ---

  private openMenu(): void {
    this.renderMenu();
    this.menuEl.hidden = false;
    this.nameBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', this.onOutside);
  }

  private closeMenu(): void {
    this.menuEl.hidden = true;
    this.nameBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', this.onOutside);
  }

  private renderMenu(): void {
    const item = (text: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-dropdown-item';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = text;
      btn.addEventListener('click', onClick);
      return btn;
    };
    const items: HTMLElement[] = this.lists.map((list) => {
      const btn = item('', () => {
        this.closeMenu();
        this.callbacks.onPickList?.(list.id);
      });
      btn.dataset.list = list.id;
      btn.classList.toggle('tcw-active', list.id === this.activeList);
      const name = document.createElement('span');
      name.textContent = list.name;
      const count = document.createElement('span');
      count.className = 'tcw-watchlist-count';
      count.textContent = String(list.symbols.length);
      btn.append(name, count);
      return btn;
    });
    const sep = document.createElement('div');
    sep.className = 'tcw-dropdown-divider';
    items.push(sep);
    if (this.callbacks.onCreateList) {
      const create = item(this.labels.newList, () => this.editName('', (name) => this.callbacks.onCreateList?.(name)));
      create.dataset.action = 'new';
      items.push(create);
    }
    const shown = this.shownList();
    if (shown && this.callbacks.onRenameList) {
      const rename = item(this.labels.rename, () => this.editName(shown.name, (name) => this.callbacks.onRenameList?.(shown.id, name)));
      rename.dataset.action = 'rename';
      items.push(rename);
    }
    if (shown && this.callbacks.onDeleteList && this.lists.length > 1) {
      let armed = false;
      const del = item(this.labels.deleteList, () => {
        if (!armed) {
          armed = true;
          del.textContent = fill(this.labels.confirmDelete, { name: shown.name });
          del.classList.add('tcw-danger');
          return;
        }
        this.closeMenu();
        this.callbacks.onDeleteList?.(shown.id);
      });
      del.dataset.action = 'delete';
      items.push(del);
    }
    this.menuEl.replaceChildren(...items);
  }

  /** A name typed in place of the list's: Enter keeps it, Escape or leaving drops it. */
  private editName(initial: string, done: (name: string) => void): void {
    this.closeMenu();
    const input = document.createElement('input');
    input.className = 'tcw-watchlist-input';
    input.type = 'text';
    input.maxLength = 60;
    input.value = initial;
    input.placeholder = this.labels.listName;
    input.setAttribute('aria-label', this.labels.listName);
    this.nameBtn.hidden = true;
    this.headerEl.insertBefore(input, this.nameBtn);
    let finished = false;
    const finish = (keep: boolean) => {
      if (finished) return;
      finished = true;
      const name = input.value.trim();
      input.remove();
      this.nameBtn.hidden = false;
      if (keep && name && name !== initial) done(name);
      this.nameBtn.focus();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(false));
    input.focus();
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

function formatPrice(v: number, locale: string | undefined): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 1) return v.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  // toPrecision(4) has no locale-aware equivalent via toLocaleString (it
  // targets significant digits, not decimal places) — reformat its raw
  // fixed-notation output through Number.toLocaleString for the separator.
  const precise = Number(v.toPrecision(4));
  return precise.toLocaleString(locale, { maximumFractionDigits: 10 });
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
  const color = up ? '#1fa874' : '#e8505b';

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
