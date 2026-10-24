import type { SymbolInfo } from '@tradecanvas/commons';
import { escapeHtml } from './escapeHtml.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';
import { markPart } from './widgetFeatures.js';

export interface SymbolSearchCallbacks {
  onPick: (symbol: string) => void;
  onClose: () => void;
}

/** Symbols matching a query, best first; aborted when a newer query replaces it. */
export type SymbolSearchFn = (query: string, signal: AbortSignal) => Promise<SymbolInfo[]>;

/** How long typing must pause before a search function is asked. */
export const SYMBOL_SEARCH_DEBOUNCE_MS = 150;

/** What the symbol search opens with. */
export interface SymbolSearchStart {
  /** Listed until something is typed; filtered as it is when there is no `search`. */
  symbols: readonly string[];
  /** The chart's symbol, marked in the list. */
  current: string;
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
  symbols: readonly string[];
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
 * - Without a search function it filters the symbols it was given with a
 *   cheap subsequence match, good enough for lists in the low thousands.
 * - With one (a feed's `searchSymbols`) it asks once typing pauses, cancels a
 *   query a newer one replaced, and lists names, kinds and exchanges; the
 *   names it hears of are kept for the list it opens with next time.
 * - Results of more than one kind (stocks and crypto, say) can be narrowed to one.
 * - Comparing, a pick adds the symbol the way chosen above the list and the
 *   dialog stays; what is compared already is listed first, each removable.
 *
 * The keys stay in the search field: up and down move through the list, Enter picks.
 */
export class WidgetSymbolSearch {
  private backdrop: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private kindsEl: HTMLDivElement | null = null;
  private mode: Mode | null = null;
  private rows: Row[] = [];
  private shown: Row[] = [];
  /** The kind of symbol the list keeps to; null for all. */
  private kind: string | null = null;
  private compared: readonly CompareEntry[] = [];
  private way = '';
  private selectedIndex = 0;
  private searchFn: SymbolSearchFn | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private searchAbort: AbortController | null = null;
  private status: 'idle' | 'searching' | 'failed' = 'idle';
  /** Enter came before the results for what was typed: take the top one when they land. */
  private pickOnResults = false;
  /** Names, kinds and exchanges the search told of, by symbol. */
  private readonly known = new Map<string, SymbolInfo>();
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
    if (this.mode?.kind !== 'compare' || !this.list) return;
    const hadFocus = this.list.contains(document.activeElement);
    this.renderList();
    if (hadFocus && !this.list.contains(document.activeElement)) this.input?.focus();
  }

  close(): void {
    if (!this.backdrop) return;
    this.cancelSearch();
    this.pickOnResults = false;
    this.searchFn = null;
    this.backdrop.remove();
    this.backdrop = this.input = this.list = this.kindsEl = null;
    this.mode = null;
    this.callbacks.onClose();
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected) back.focus();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
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
    this.kind = null;
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

    const kinds = document.createElement('div');
    kinds.className = 'tcw-ss-kinds';
    kinds.setAttribute('role', 'group');
    kinds.setAttribute('aria-label', this.t('symbolSearch.kinds'));
    kinds.hidden = true;

    const columns = document.createElement('div');
    columns.className = 'tcw-ss-columns';
    columns.setAttribute('aria-hidden', 'true');
    for (const text of [this.t('symbolSearch.symbol'), this.t('symbolSearch.description')]) {
      const cell = document.createElement('span');
      cell.textContent = text;
      columns.appendChild(cell);
    }

    const list = document.createElement('div');
    list.className = 'tcw-ss-list';
    list.id = `tcw-ss-list-${this.uid}`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-labelledby', `tcw-ss-title-${this.uid}`);

    modal.append(kinds, columns, list);
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
    this.kindsEl = kinds;
    this.list = list;
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

  /** The symbols it was given, named where a search told of them. */
  private listGiven(): void {
    this.rows = this.given().map((symbol) => ({ symbol, score: 0, info: this.known.get(symbol) }));
    this.afterResults(true);
  }

  private given(): readonly string[] {
    return this.mode?.start.symbols ?? [];
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
    this.rows = this.given()
      .map((symbol) => ({ symbol, score: scoreMatch(symbol.toUpperCase(), q), info: this.known.get(symbol) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
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
    this.status = 'searching';
    this.rows = [];
    this.afterResults(false);
    try {
      const results = await search(query, controller.signal);
      if (controller.signal.aborted) return;
      for (const info of results) this.known.set(info.symbol, info);
      this.rows = results.map((info) => ({ symbol: info.symbol, score: 0, info }));
      this.status = 'idle';
    } catch {
      if (controller.signal.aborted) return;
      this.rows = [];
      this.status = 'failed';
    }
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

  /** New rows: the kinds on offer, the list, the keys on the chart's symbol (`atCurrent`) or the top. */
  private afterResults(atCurrent: boolean): void {
    this.renderKinds();
    this.shown = this.visibleRows();
    const current = atCurrent ? this.shown.findIndex((r) => r.symbol === this.mode?.start.current) : -1;
    this.selectedIndex = Math.max(0, current);
    this.renderList();
  }

  /** The rows on show: of the kind picked, and comparing, not the chart's own symbol. */
  private visibleRows(): Row[] {
    const comparing = this.mode?.kind === 'compare';
    const current = this.mode?.start.current;
    return this.rows.filter((r) => (!comparing || r.symbol !== current) && (this.kind === null || r.info?.type === this.kind));
  }

  // --- Drawing ---

  /** Chips for the kinds the results come in, when there are two or more. */
  private renderKinds(): void {
    const el = this.kindsEl;
    if (!el) return;
    const kinds = [...new Set(this.rows.map((r) => r.info?.type).filter((k): k is string => !!k))];
    if (this.kind !== null && !kinds.includes(this.kind)) this.kind = null;
    el.hidden = kinds.length < 2;
    if (el.hidden) {
      el.replaceChildren();
      return;
    }
    const chip = (value: string | null, text: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcw-ss-type';
      b.textContent = text;
      b.setAttribute('aria-pressed', String(this.kind === value));
      b.addEventListener('click', () => {
        this.kind = value;
        this.afterResults(false);
        this.input?.focus();
      });
      return b;
    };
    el.replaceChildren(chip(null, this.t('symbolSearch.allKinds')), ...kinds.map((k) => chip(k, k)));
  }

  private renderList(): void {
    const list = this.list;
    if (!list) return;
    list.replaceChildren();
    const typed = (this.input?.value ?? '').trim();
    const comparing = this.mode?.kind === 'compare';
    if (comparing && !typed && this.compared.length > 0) {
      list.appendChild(this.heading(this.t('compare.onChart')));
      list.append(...this.compared.map((entry) => this.addedRow(entry)));
      if (this.shown.length > 0) list.appendChild(this.heading(this.t('compare.symbols')));
    }
    if (this.shown.length === 0) {
      const note = this.emptyNote(typed, comparing);
      if (note) list.appendChild(note);
    }
    const query = typed.toUpperCase();
    const onChart = new Set(this.compared.map((c) => c.symbol));
    this.shown.forEach((row, i) => list.appendChild(this.row(row, i, query, comparing && onChart.has(row.symbol))));
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
    note.setAttribute('role', 'status');
    note.textContent = text;
    return note;
  }

  private heading(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-ss-heading';
    el.setAttribute('role', 'presentation');
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

    const symbol = document.createElement('span');
    symbol.className = 'tcw-ss-symbol';
    symbol.innerHTML = highlight(row.symbol, query);
    const desc = row.info?.description && row.info.description !== row.symbol ? row.info.description : '';
    const description = document.createElement('span');
    description.className = 'tcw-ss-desc-cell';
    if (desc) {
      const text = document.createElement('span');
      text.className = 'tcw-ss-desc';
      text.textContent = desc;
      description.appendChild(text);
    }
    const meta = document.createElement('span');
    meta.className = 'tcw-ss-meta';
    if (row.info?.type) meta.appendChild(this.tag('tcw-ss-kind', row.info.type));
    if (row.info?.exchange) meta.appendChild(this.tag('tcw-ss-exchange', row.info.exchange));
    el.append(symbol, description, meta);
    if (isCurrent || onChart) {
      const check = document.createElement('span');
      check.className = 'tcw-ss-check';
      check.innerHTML = createIcon('check', 14);
      el.appendChild(check);
    }
    el.addEventListener('click', () => this.pick(index));
    el.addEventListener('mousemove', () => {
      if (this.selectedIndex === index) return;
      this.selectedIndex = index;
      this.markSelection();
    });
    return el;
  }

  /** A symbol compared already: its name, its colour and way under Description, and a button to take it off. */
  private addedRow(entry: CompareEntry): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-ss-added-row';
    el.setAttribute('role', 'presentation');
    const way = document.createElement('span');
    way.className = 'tcw-ss-way-cell';
    if (entry.color) {
      const swatch = document.createElement('span');
      swatch.className = 'tcw-ss-swatch';
      swatch.style.background = entry.color;
      way.appendChild(swatch);
    }
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
    el.append(this.tag('tcw-ss-symbol', entry.symbol), way, remove);
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

/**
 * Cheap fuzzy score:
 *   exact match              → 1000
 *   starts-with              → 500 + tighter-prefix bonus
 *   subsequence match        → 100 − gap penalty
 *   no match                 → 0
 */
function scoreMatch(symbol: string, query: string): number {
  if (symbol === query) return 1000;
  if (symbol.startsWith(query)) return 500 + (50 - Math.min(50, symbol.length - query.length));
  if (symbol.includes(query)) return 200 + (50 - Math.min(50, symbol.length - query.length));

  let qi = 0;
  let lastIdx = -1;
  let gapPenalty = 0;
  for (let i = 0; i < symbol.length && qi < query.length; i++) {
    if (symbol[i] === query[qi]) {
      if (lastIdx >= 0) gapPenalty += i - lastIdx - 1;
      lastIdx = i;
      qi++;
    }
  }
  if (qi < query.length) return 0;
  return 100 - Math.min(99, gapPenalty);
}

/** The symbol with the letters the query matched marked. */
function highlight(symbol: string, query: string): string {
  if (!query) return escapeHtml(symbol);
  const upper = symbol.toUpperCase();
  let out = '';
  let qi = 0;
  for (let i = 0; i < symbol.length; i++) {
    if (qi < query.length && upper[i] === query[qi]) {
      out += `<mark>${escapeHtml(symbol[i])}</mark>`;
      qi++;
    } else {
      out += escapeHtml(symbol[i]);
    }
  }
  return out;
}
