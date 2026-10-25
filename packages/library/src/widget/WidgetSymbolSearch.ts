import type { SymbolInfo } from '@tradecanvas/commons';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';
import { markPart } from './widgetFeatures.js';
import { cleanSymbolInfo, mergeSymbolInfo, readSymbolCatalog, readSymbolResults } from './symbolCatalog.js';
import { createSymbolBadge } from './symbolBadge.js';
import { createSymbolCell } from './symbolCell.js';
import { scoreSymbol } from './symbolMatch.js';
import { SymbolSearchFilters } from './symbolSearchFilters.js';

export interface SymbolSearchCallbacks {
  onPick: (symbol: string) => void;
  onClose: () => void;
}

/** Symbols matching a query, best first; aborted when a newer query replaces it. */
export type SymbolSearchFn = (query: string, signal: AbortSignal) => Promise<SymbolInfo[]>;

/** How long typing must pause before a search function is asked. */
export const SYMBOL_SEARCH_DEBOUNCE_MS = 150;

/** The key code a browser gives a key an input method takes. */
const IME_KEY_CODE = 229;

/** A symbol on offer: its ticker, or what is known of it (a name, kind, exchange, logo). */
export type SymbolEntry = string | SymbolInfo;

/** What the symbol search opens with. */
export interface SymbolSearchStart {
  /** Listed until something is typed; filtered, by ticker and name, when there is no `search`. */
  symbols: readonly SymbolEntry[];
  /** The chart's symbol, marked in the list. */
  current: string;
  /** What the chart knows of `current`: it fills only what the symbols given and the feed leave out. */
  currentInfo?: SymbolInfo | null;
  /** A feed's search, asked once typing pauses. */
  search?: SymbolSearchFn;
  /** Typed already: the letter that opened it. */
  query?: string;
  /** Where a pick goes, in place of `onPick`. */
  onPick?: (symbol: string) => void;
  /** A line at the foot. */
  hint?: string;
}

/** Something compared with the chart's symbol, as the compare dialog lists it. */
export interface CompareEntry {
  id: string;
  symbol: string;
  /** How it is compared, in words. */
  way: string;
  color?: string;
}

/** What the compare dialog opens with. */
export interface CompareStart {
  symbols: readonly SymbolEntry[];
  current: string;
  search?: SymbolSearchFn;
  /** The ways to add a symbol, and the one chosen to start with. */
  ways: readonly { id: string; label: string }[];
  way: string;
  compared: readonly CompareEntry[];
  onAdd: (symbol: string, way: string) => void;
  onRemove: (id: string) => void;
}

interface Row {
  symbol: string;
  score: number;
  info?: SymbolInfo;
}

type Mode = { kind: 'search'; start: SymbolSearchStart } | { kind: 'compare'; start: CompareStart };

let nextSearchId = 1;

/**
 * The symbol search, and the same dialog for adding a symbol to compare.
 *
 * - The symbols it is given are listed until something is typed, named
 *   where they came with a SymbolInfo (or the chart knows its own).
 * - Without a search function it filters them by ticker and name with a
 *   cheap match, good enough for lists in the low thousands.
 * - With one (a feed's `searchSymbols`) it asks once typing pauses, cancels a
 *   query a newer one replaced, and lists names, kinds and exchanges; what it
 *   hears is kept for the list it opens with next time.
 * - Whose words a row shows is one rule, wherever it is listed: the feed's,
 *   then the ones given for what it left out (a logo, say), then what the
 *   chart knows of its own symbol. Words that aren't text (a JSON feed's
 *   numeric code, a null) say nothing.
 * - The rows can be narrowed to a kind (stocks, crypto) and, when they come
 *   from two or more, to an exchange.
 * - Comparing, a pick adds the symbol the way chosen above the list and the
 *   dialog stays; what is compared already is listed first, each removable.
 *
 * The keys stay in the search field: up and down move through the list, Enter picks.
 */
export class WidgetSymbolSearch {
  private backdrop: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  /** What scrolls: what is compared, the list of symbols, a note when there are none. */
  private results: HTMLDivElement | null = null;
  /** Says "Searching…", "Search failed", "No symbols match" to a screen reader. */
  private live: HTMLDivElement | null = null;
  /** The heads of the columns, at the top of what scrolls. */
  private columns: HTMLDivElement | null = null;
  private filters: SymbolSearchFilters | null = null;
  private mode: Mode | null = null;
  /** The tickers given to it, cleaned. */
  private given: string[] = [];
  private rows: Row[] = [];
  /** Whether the rows are the symbols given (filtered or not), not a feed's results. */
  private rowsGiven = false;
  private shown: Row[] = [];
  private compared: readonly CompareEntry[] = [];
  private way = '';
  private selectedIndex = 0;
  private searchFn: SymbolSearchFn | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchAbort: AbortController | null = null;
  private status: 'idle' | 'searching' | 'failed' = 'idle';
  /** Enter came before the results for what was typed: take the top one when they land. */
  private pickOnResults = false;
  /** What the feed's searches told of each symbol, kept from one opening to the next: its words win. */
  private readonly heard = new Map<string, SymbolInfo>();
  /** What came with the symbols it opened with, over what the chart knows of its own. */
  private givenInfo = new Map<string, SymbolInfo>();
  private returnFocus: HTMLElement | null = null;
  private readonly uid = nextSearchId++;

  /** Where the dialog mounts (the widget's overlay layer: themed, and inside it when fullscreen). */
  constructor(
    private readonly callbacks: SymbolSearchCallbacks,
    private readonly host: () => HTMLElement = () => document.body,
    private readonly t: Translator = EN_TRANSLATOR,
  ) {}

  open(start: SymbolSearchStart): void {
    this.begin({ kind: 'search', start });
  }

  openCompare(start: CompareStart): void {
    this.compared = start.compared;
    this.way = start.ways.some((w) => w.id === start.way) ? start.way : start.ways[0]?.id ?? '';
    this.begin({ kind: 'compare', start });
  }

  /** What is compared now, after an add or a remove. */
  setCompared(entries: readonly CompareEntry[]): void {
    this.compared = entries;
    if (this.mode?.kind !== 'compare' || !this.results) return;
    // A remove button that had the keyboard is gone with its row: the search takes it.
    const hadFocus = this.results.contains(document.activeElement);
    this.renderList();
    if (hadFocus && !this.results.contains(document.activeElement)) this.input?.focus();
  }

  close(): void {
    if (!this.backdrop) return;
    this.cancelSearch();
    this.pickOnResults = false;
    this.searchFn = null;
    this.backdrop.remove();
    this.backdrop = this.input = this.list = this.results = this.live = this.columns = null;
    this.filters?.destroy();
    this.filters = null;
    this.mode = null;
    this.callbacks.onClose();
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected) back.focus();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  /** Whether it is open to add a symbol to compare. */
  isComparing(): boolean {
    return this.mode?.kind === 'compare';
  }

  destroy(): void {
    this.close();
  }

  private begin(mode: Mode): void {
    if (this.backdrop) this.close();
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.mode = mode;
    this.searchFn = mode.start.search ?? null;
    this.status = 'idle';
    this.learnGiven(mode);
    this.build(mode);
    const query = mode.kind === 'search' ? mode.start.query ?? '' : '';
    if (this.input) this.input.value = query;
    if (query) {
      this.filter();
      if (this.searchFn) this.searchNow();
    } else {
      this.listGiven();
    }
    this.input?.focus();
  }

  /**
   * The tickers given, and what came with them. What the chart knows of its
   * own symbol only fills gaps, as it may use other words for it (a kind in
   * English where the list's are translated).
   */
  private learnGiven(mode: Mode): void {
    const catalog = readSymbolCatalog(mode.start.symbols);
    this.given = catalog.names;
    this.givenInfo = catalog.info;
    const current = mode.start.current;
    const own = mode.kind === 'search' ? mode.start.currentInfo : null;
    if (own && typeof own === 'object' && current) {
      this.givenInfo.set(current, mergeSymbolInfo(cleanSymbolInfo(own, current), this.givenInfo.get(current))!);
    }
  }

  /** What a row of `symbol` shows: the feed's words, the ones given for the rest. */
  private infoOf(symbol: string): SymbolInfo | undefined {
    return mergeSymbolInfo(this.givenInfo.get(symbol), this.heard.get(symbol));
  }

  // --- Building ---

  private build(mode: Mode): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'tcw-modal-backdrop';
    // A press that starts in the dialog and ends on the backdrop doesn't close it.
    let pressedBackdrop = false;
    backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === backdrop;
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    const modal = document.createElement('div');
    modal.className = `tcw-modal tcw-ss${mode.kind === 'compare' ? ' tcw-ss--compare' : ''}`;
    markPart(modal, mode.kind === 'compare' ? 'compare' : 'symbolSearch');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-ss-title-${this.uid}`);
    modal.tabIndex = -1;
    modal.addEventListener('keydown', (e) => this.onKeyDown(e, modal));

    modal.append(this.buildHeader(mode), this.buildSearch());
    if (mode.kind === 'compare') modal.appendChild(this.buildWay(mode.start));

    const filters = new SymbolSearchFilters(this.t, () => {
      this.afterResults(false);
      this.input?.focus();
    });

    const list = document.createElement('div');
    list.className = 'tcw-ss-list';
    list.id = `tcw-ss-list-${this.uid}`;
    list.setAttribute('role', 'listbox');
    const results = document.createElement('div');
    results.className = 'tcw-ss-results';
    const columns = this.buildColumns();
    results.append(columns, list);
    // A press on a heading or between the rows keeps the keyboard in the search (a remove button takes it).
    results.addEventListener('mousedown', (e) => {
      if (!(e.target as Element).closest('button')) e.preventDefault();
    });
    const live = document.createElement('div');
    live.className = 'tcw-ss-live tcw-visually-hidden';
    live.setAttribute('aria-live', 'polite');

    modal.append(filters.el, results, live);
    const hint = mode.kind === 'search' ? mode.start.hint : undefined;
    if (hint) {
      const foot = document.createElement('div');
      foot.className = 'tcw-ss-foot';
      foot.textContent = hint;
      modal.appendChild(foot);
    }
    backdrop.appendChild(modal);
    this.host().appendChild(backdrop);
    this.backdrop = backdrop;
    this.filters = filters;
    this.columns = columns;
    this.list = list;
    this.results = results;
    this.live = live;
  }

  /** The heads of the columns: none over the badges, then symbol, description, type, exchange. */
  private buildColumns(): HTMLDivElement {
    const columns = document.createElement('div');
    columns.className = 'tcw-ss-columns';
    columns.setAttribute('aria-hidden', 'true');
    const heads = ['', this.t('symbolSearch.symbol'), this.t('symbolSearch.description'), this.t('symbolSearch.type'), this.t('symbolSearch.exchange')];
    columns.append(...heads.map((text) => this.tag('tcw-ss-head', text)));
    return columns;
  }

  private buildHeader(mode: Mode): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-ss-title-${this.uid}`;
    title.textContent = this.t(mode.kind === 'compare' ? 'compare.title' : 'symbolSearch.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);
    return header;
  }

  private buildSearch(): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'tcw-ss-search';
    row.innerHTML = createIcon('search', 16);
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'tcw-ss-input';
    input.placeholder = this.t('symbolSearch.placeholder');
    input.setAttribute('aria-label', this.t('symbolSearch.placeholder'));
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', `tcw-ss-list-${this.uid}`);
    input.setAttribute('aria-autocomplete', 'list');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('input', () => this.filter());
    row.appendChild(input);
    this.input = input;
    return row;
  }

  /** Comparing: how the next symbol is added. */
  private buildWay(start: CompareStart): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'tcw-ss-way';
    const text = document.createElement('span');
    text.textContent = this.t('compare.addAs');
    const select = document.createElement('select');
    select.className = 'tcw-settings-select tcw-ss-way-select';
    for (const way of start.ways) {
      const option = document.createElement('option');
      option.value = way.id;
      option.textContent = way.label;
      select.appendChild(option);
    }
    select.value = this.way;
    select.addEventListener('change', () => {
      this.way = select.value;
    });
    row.append(text, select);
    return row;
  }

  // --- Searching ---

  /** The symbols it was given, named where they came with a name or a search told of one. */
  private listGiven(): void {
    this.rows = this.given.map((symbol) => ({ symbol, score: 0, info: this.infoOf(symbol) }));
    this.rowsGiven = true;
    this.afterResults(true);
  }

  private filter(): void {
    this.pickOnResults = false;
    const typed = this.input?.value.trim() ?? '';
    if (this.searchFn && typed) {
      this.scheduleSearch(typed);
      return;
    }
    this.cancelSearch();
    this.status = 'idle';
    if (!typed) {
      this.listGiven();
      return;
    }
    const q = typed.toUpperCase();
    this.rows = this.given
      .map((symbol) => {
        const info = this.infoOf(symbol);
        return { symbol, score: scoreSymbol(symbol, info?.description, q), info };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
    this.rowsGiven = true;
    this.afterResults(false);
  }

  private scheduleSearch(query: string): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.runSearch(query);
    }, SYMBOL_SEARCH_DEBOUNCE_MS);
  }

  /** Run the search the pause would have started, now. */
  private searchNow(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    void this.runSearch(this.input?.value.trim() ?? '');
  }

  private async runSearch(query: string): Promise<void> {
    const search = this.searchFn;
    if (!search) return;
    this.searchAbort?.abort();
    const controller = new AbortController();
    this.searchAbort = controller;
    // The rows of the last search stay while this one runs: no flicker as typing goes on.
    this.status = 'searching';
    this.renderList();
    try {
      const found = await search(query, controller.signal);
      if (controller.signal.aborted) return;
      const results = readSymbolResults(found);
      // What a later search leaves out, an earlier one may have told of.
      for (const info of results) this.heard.set(info.symbol, mergeSymbolInfo(this.heard.get(info.symbol), info)!);
      this.rows = results.map((info) => ({ symbol: info.symbol, score: 0, info: this.infoOf(info.symbol) }));
      this.status = 'idle';
    } catch {
      if (controller.signal.aborted) return;
      this.rows = [];
      this.status = 'failed';
    }
    this.rowsGiven = false;
    this.afterResults(false);
    if (this.pickOnResults) {
      this.pickOnResults = false;
      this.pick(0);
    }
  }

  private cancelSearch(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.searchAbort?.abort();
    this.searchAbort = null;
  }

  /** New rows: the kinds and exchanges on offer, the list, the keys on the chart's symbol (`atCurrent`) or the top. */
  private afterResults(atCurrent: boolean): void {
    this.filters?.see(this.rows.map((r) => r.info));
    this.shown = this.visibleRows();
    const current = atCurrent ? this.shown.findIndex((r) => r.symbol === this.mode?.start.current) : -1;
    this.selectedIndex = Math.max(0, current);
    this.renderList();
  }

  /**
   * The rows on show: of the kind and exchange picked, and comparing, not the
   * chart's own symbol. A symbol given that says nothing of its kind or
   * exchange stays: it may be of either.
   */
  private visibleRows(): Row[] {
    const comparing = this.mode?.kind === 'compare';
    const current = this.mode?.start.current;
    const filters = this.filters;
    return this.rows.filter((r) => (!comparing || r.symbol !== current) && (!filters || filters.passes(r.info, this.rowsGiven)));
  }

  // --- Drawing ---

  /**
   * What is compared (comparing, before anything is typed) as a group under
   * its heading, then the symbols, a listbox of options only, under theirs;
   * a note when there are none, told to a screen reader too.
   */
  private renderList(): void {
    const list = this.list;
    const results = this.results;
    if (!list || !results) return;
    const typed = (this.input?.value ?? '').trim();
    const comparing = this.mode?.kind === 'compare';
    const before: HTMLElement[] = [];
    if (comparing && !typed && this.compared.length > 0) {
      const heading = this.heading(this.t('compare.onChart'), 'added');
      const group = document.createElement('div');
      group.className = 'tcw-ss-added';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', heading.id);
      group.append(...this.compared.map((entry) => this.addedRow(entry)));
      const symbols = this.heading(this.t('compare.symbols'), 'symbols');
      symbols.hidden = this.shown.length === 0;
      before.push(heading, group, symbols);
      list.setAttribute('aria-labelledby', symbols.id);
    } else {
      list.setAttribute('aria-labelledby', `tcw-ss-title-${this.uid}`);
    }
    const query = typed.toUpperCase();
    const onChart = new Set(this.compared.map((c) => c.symbol));
    list.replaceChildren(...this.shown.map((row, i) => this.row(row, i, query, comparing && onChart.has(row.symbol))));
    const note = this.shown.length === 0 ? this.emptyNote(typed, comparing) : null;
    results.replaceChildren(...(this.columns ? [this.columns] : []), ...before, list, ...(note ? [note] : []));
    if (this.live) this.live.textContent = note?.textContent ?? '';
    this.markSelection();
  }

  private emptyNote(typed: string, comparing: boolean): HTMLDivElement | null {
    let text: string;
    if (this.status === 'searching') text = this.t('symbolSearch.searching');
    else if (this.status === 'failed') text = this.t('symbolSearch.failed');
    else if (comparing && !typed) {
      if (this.compared.length > 0) return null;
      text = this.t('compare.empty');
    } else text = this.t('symbolSearch.empty');
    const note = document.createElement('div');
    note.className = 'tcw-ss-empty';
    note.textContent = text;
    return note;
  }

  private heading(text: string, name: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-ss-heading';
    el.id = `tcw-ss-${name}-${this.uid}`;
    el.textContent = text;
    return el;
  }

  private row(row: Row, index: number, query: string, onChart: boolean): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-ss-row';
    el.id = `tcw-ss-opt-${this.uid}-${index}`;
    el.dataset.symbol = row.symbol;
    el.setAttribute('role', 'option');
    const isCurrent = this.mode?.kind === 'search' && row.symbol === this.mode.start.current;
    el.classList.toggle('tcw-current', isCurrent);
    el.classList.toggle('tcw-on-chart', onChart);
    if (isCurrent) el.setAttribute('aria-current', 'true');

    // Every row has the same cells, empty where nothing was said, so the columns line up.
    const kind = this.tag('tcw-ss-kind', row.info?.type?.trim() ?? '');
    const exchange = this.tag('tcw-ss-exchange', row.info?.exchange?.trim() ?? '');
    kind.dir = exchange.dir = 'auto';
    el.append(createSymbolBadge(row.symbol, row.info), createSymbolCell(row.symbol, query), this.descriptionCell(row), kind, exchange);
    if (isCurrent || onChart) {
      const check = document.createElement('span');
      check.className = 'tcw-ss-check';
      check.innerHTML = createIcon('check', 14);
      el.appendChild(check);
    }
    // The check says it to the eye; a screen reader hears it.
    if (onChart) el.appendChild(this.tag('tcw-visually-hidden', this.t('compare.onChart')));
    el.addEventListener('click', () => this.pick(index));
    el.addEventListener('mousemove', () => {
      if (this.selectedIndex === index) return;
      this.selectedIndex = index;
      this.markSelection();
    });
    return el;
  }

  private descriptionCell(row: Row): HTMLSpanElement {
    const cell = document.createElement('span');
    cell.className = 'tcw-ss-desc-cell';
    const desc = row.info?.description && row.info.description !== row.symbol ? row.info.description : '';
    if (desc) {
      const text = this.tag('tcw-ss-desc', desc);
      // A feed's words read in their own direction ("Apple Inc." in a right-to-left widget).
      text.dir = 'auto';
      cell.appendChild(text);
    }
    return cell;
  }

  /** A symbol compared already: its colour where the badges are, its way across the rest, and a button to take it off. */
  private addedRow(entry: CompareEntry): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-ss-added-row';
    el.setAttribute('role', 'presentation');
    if (entry.color) {
      const swatch = document.createElement('span');
      swatch.className = 'tcw-ss-swatch';
      swatch.style.background = entry.color;
      el.appendChild(swatch);
    }
    const way = document.createElement('span');
    way.className = 'tcw-ss-way-cell';
    way.appendChild(this.tag('tcw-ss-way-label', entry.way));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tcw-ss-remove';
    const label = fill(this.t('compare.remove'), { symbol: entry.symbol });
    remove.title = label;
    remove.setAttribute('aria-label', label);
    remove.innerHTML = createIcon('x', 12);
    remove.addEventListener('click', () => {
      if (this.mode?.kind === 'compare') this.mode.start.onRemove(entry.id);
    });
    el.append(createSymbolCell(entry.symbol, ''), way, remove);
    return el;
  }

  private tag(className: string, text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }

  private markSelection(): void {
    const rows = this.list?.querySelectorAll<HTMLElement>('.tcw-ss-row') ?? [];
    let active: HTMLElement | null = null;
    rows.forEach((el, i) => {
      const on = i === this.selectedIndex;
      el.setAttribute('aria-selected', String(on));
      el.classList.toggle('tcw-selected', on);
      if (on) active = el;
    });
    const row = active as HTMLElement | null;
    if (row) {
      this.input?.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView?.({ block: 'nearest' });
    } else {
      this.input?.removeAttribute('aria-activedescendant');
    }
  }

  // --- Picking ---

  private pick(index: number): void {
    const entry = this.shown[index];
    const mode = this.mode;
    if (!entry || !mode) return;
    if (mode.kind === 'compare') {
      this.selectedIndex = index;
      this.markSelection();
      mode.start.onAdd(entry.symbol, this.way);
      return;
    }
    const pick = mode.start.onPick ?? this.callbacks.onPick;
    this.close();
    pick(entry.symbol);
  }

  private onKeyDown(e: KeyboardEvent, modal: HTMLElement): void {
    e.stopPropagation(); // keys here must not drive chart shortcuts
    // Enter, Escape and the arrows pick and close among an input method's candidates while it composes.
    if (e.isComposing || e.keyCode === IME_KEY_CODE) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    keepTabInside(e, modal);
    if (e.target !== this.input) return;
    const count = this.shown.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (count === 0) return;
      this.selectedIndex = (this.selectedIndex + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
      this.markSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Comparing, the dialog stays: a held Enter would add the symbol again and again.
      if (e.repeat && this.mode?.kind === 'compare') return;
      if (this.searchTimer !== null || this.status === 'searching') {
        // The list on screen is for an older query.
        this.pickOnResults = true;
        if (this.searchTimer !== null) this.searchNow();
        return;
      }
      this.pick(this.selectedIndex);
    }
  }
}
