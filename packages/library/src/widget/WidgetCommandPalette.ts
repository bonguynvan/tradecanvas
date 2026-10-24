import type { ChartType, DrawingToolType, TimeFrame } from '@tradecanvas/commons';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';
import { searchForm } from './platformKeys.js';

export interface CommandItem {
  id: string;
  label: string;
  category: CommandCategory;
  /** Its keys, written at the row's end ("Alt+T"). */
  shortcut?: string;
  /** On now (an indicator on the chart, the chart type in use): ticked. */
  active?: boolean;
}

export type CommandCategory = 'indicator' | 'chartType' | 'drawing' | 'timeframe' | 'action';

export interface CommandPaletteCallbacks {
  onIndicator: (id: string) => void;
  onChartType: (type: ChartType) => void;
  onDrawingTool: (tool: DrawingToolType) => void;
  onTimeframe: (tf: TimeFrame) => void;
  onAction: (id: string) => void;
  onClose: () => void;
}

/** The commands used last, by `category:id`, newest first. */
export interface CommandRecents {
  list: () => readonly string[];
  add: (key: string) => void;
}

/** Commands used last, shown at the top before anything is typed. */
const RECENT_SHOWN = 5;
/** The key code a browser gives a key an input method takes. */
const IME_KEY_CODE = 229;

/** The widget's own commands first; the indicators, which have a dialog of their own, last. */
const CATEGORY_ORDER: readonly CommandCategory[] = ['action', 'drawing', 'chartType', 'timeframe', 'indicator'];
const CATEGORY_LABELS = {
  indicator: 'palette.group.indicator',
  chartType: 'palette.group.chartType',
  drawing: 'palette.group.drawing',
  timeframe: 'palette.group.timeframe',
  action: 'palette.group.action',
} as const satisfies Record<CommandCategory, string>;

const keyOf = (item: CommandItem) => `${item.category}:${item.id}`;

/**
 * How well `item` answers `query` (lower case, no spaces): its name or id
 * whole, then a name that starts with it, a word of the name that does, the
 * name holding it, its keys holding it ("alt+t"); 0 when nothing does.
 */
function score(item: CommandItem, query: string): number {
  const label = item.label.toLowerCase();
  const flat = searchForm(label);
  if (item.id.toLowerCase() === query || flat === query) return 5;
  if (flat.startsWith(query)) return 4;
  if (label.split(/[\s/()-]+/).some((word) => word.startsWith(query))) return 3;
  if (flat.includes(query) || item.id.toLowerCase().includes(query)) return 2;
  if (item.shortcut && searchForm(item.shortcut).includes(query)) return 1;
  return 0;
}

interface Group {
  key: string;
  label: string;
  items: CommandItem[];
}

let paletteSeq = 0;

/**
 * The command palette (Ctrl+K): indicators, chart types, drawing tools,
 * intervals and the widget's own actions, in groups, with their keys. Before
 * anything is typed the commands used last come first. The keys stay in its
 * search: up and down move through the list, Enter runs a command.
 */
export class WidgetCommandPalette {
  private backdrop: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private emptyEl: HTMLDivElement | null = null;
  /** Says "No results" to a screen reader. */
  private liveEl: HTMLDivElement | null = null;
  private items: CommandItem[] = [];
  /** The rows on show, in order, for the keys. */
  private shown: CommandItem[] = [];
  private selectedIndex = 0;
  private returnFocus: HTMLElement | null = null;
  private readonly uid = ++paletteSeq;

  /** Where the overlay mounts (the widget's portal: themed, and inside it when fullscreen). */
  constructor(
    private readonly callbacks: CommandPaletteCallbacks,
    private readonly host: () => HTMLElement = () => document.body,
    private readonly t: Translator = EN_TRANSLATOR,
    private readonly recents?: CommandRecents,
  ) {}

  open(items: CommandItem[]): void {
    if (this.backdrop) return;
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.items = items;
    this.build();
    this.render();
    this.input?.focus();
  }

  close(): void {
    if (!this.backdrop) return;
    this.backdrop.remove();
    this.backdrop = this.input = this.list = this.emptyEl = this.liveEl = null;
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

  private build(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'tcw-modal-backdrop';
    // A press that starts in the palette and ends on the backdrop doesn't close it.
    let pressedBackdrop = false;
    backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === backdrop;
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    const modal = document.createElement('div');
    modal.className = 'tcw-modal tcw-cp';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', this.t('hotkeys.commandPalette'));
    modal.tabIndex = -1;
    modal.addEventListener('keydown', (e) => this.onKeyDown(e, modal));

    const search = document.createElement('label');
    search.className = 'tcw-ss-search tcw-cp-search';
    search.innerHTML = createIcon('search', 16);
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'tcw-cp-input';
    input.placeholder = this.t('palette.placeholder');
    input.setAttribute('aria-label', this.t('palette.placeholder'));
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', `tcw-cp-list-${this.uid}`);
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.addEventListener('input', () => this.render());
    search.appendChild(input);

    const results = document.createElement('div');
    results.className = 'tcw-cp-results';
    const list = document.createElement('div');
    list.className = 'tcw-cp-list';
    list.id = `tcw-cp-list-${this.uid}`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', this.t('hotkeys.commandPalette'));
    const empty = document.createElement('div');
    empty.className = 'tcw-cp-empty';
    results.append(list, empty);
    // A press on a heading or between the rows keeps the keyboard in the search.
    results.addEventListener('mousedown', (e) => e.preventDefault());
    const live = document.createElement('div');
    live.className = 'tcw-cp-live tcw-visually-hidden';
    live.setAttribute('aria-live', 'polite');

    modal.append(search, results, live);
    backdrop.appendChild(modal);
    this.host().appendChild(backdrop);
    this.backdrop = backdrop;
    this.input = input;
    this.list = list;
    this.emptyEl = empty;
    this.liveEl = live;
  }

  /** The groups for what is typed: the commands used last first while nothing is, then each kind. */
  private groups(): Group[] {
    const query = searchForm((this.input?.value ?? '').trim());
    const groups: Group[] = [];
    if (!query) {
      const byKey = new Map(this.items.map((item) => [keyOf(item), item]));
      const recent = (this.recents?.list() ?? []).map((k) => byKey.get(k)).filter((i): i is CommandItem => !!i).slice(0, RECENT_SHOWN);
      if (recent.length > 0) groups.push({ key: 'recent', label: this.t('palette.group.recent'), items: recent });
    }
    for (const category of CATEGORY_ORDER) {
      let items = this.items.filter((item) => item.category === category);
      if (query) {
        items = items
          .map((item, at) => ({ item, at, s: score(item, query) }))
          .filter((r) => r.s > 0)
          .sort((a, b) => b.s - a.s || a.at - b.at)
          .map((r) => r.item);
      }
      if (items.length > 0) groups.push({ key: category, label: this.t(CATEGORY_LABELS[category]), items });
    }
    // Searching, the group with the best match comes first (the order above among equals).
    if (query) groups.sort((a, b) => score(b.items[0], query) - score(a.items[0], query));
    return groups;
  }

  private render(): void {
    const list = this.list;
    if (!list) return;
    const groups = this.groups();
    this.shown = groups.flatMap((g) => g.items);
    this.selectedIndex = 0;
    let index = 0;
    list.replaceChildren(...groups.map((group) => {
      const el = document.createElement('div');
      el.setAttribute('role', 'group');
      el.className = 'tcw-cp-group';
      const heading = document.createElement('div');
      heading.className = 'tcw-cp-heading';
      heading.id = `tcw-cp-${group.key}-${this.uid}`;
      heading.setAttribute('role', 'presentation');
      heading.textContent = group.label;
      el.setAttribute('aria-labelledby', heading.id);
      el.append(heading, ...group.items.map((item) => this.row(item, index++)));
      return el;
    }));
    const note = this.shown.length === 0 ? this.t('palette.empty') : '';
    if (this.emptyEl) this.emptyEl.textContent = note;
    this.emptyEl?.toggleAttribute('hidden', this.shown.length > 0);
    if (this.liveEl) this.liveEl.textContent = note;
    this.markSelection();
  }

  private row(item: CommandItem, index: number): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-cp-row';
    row.id = `tcw-cp-opt-${this.uid}-${index}`;
    row.dataset.id = item.id;
    row.setAttribute('role', 'option');
    row.classList.toggle('tcw-on', !!item.active);
    const label = document.createElement('span');
    label.className = 'tcw-cp-label';
    label.textContent = item.label;
    row.appendChild(label);
    if (item.shortcut) {
      const kbd = document.createElement('kbd');
      kbd.className = 'tcw-cp-key';
      // Keys read left to right in any widget: ⌘+P, never P+⌘.
      kbd.dir = 'ltr';
      kbd.textContent = item.shortcut;
      row.appendChild(kbd);
    }
    if (item.active) {
      const check = document.createElement('span');
      check.className = 'tcw-cp-check';
      check.innerHTML = createIcon('check', 14);
      row.appendChild(check);
    }
    row.addEventListener('click', () => this.run(index));
    row.addEventListener('mousemove', () => {
      if (this.selectedIndex === index) return;
      this.selectedIndex = index;
      this.markSelection();
    });
    return row;
  }

  private markSelection(): void {
    const rows = this.list?.querySelectorAll<HTMLElement>('.tcw-cp-row') ?? [];
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

  private run(index: number): void {
    const item = this.shown[index];
    if (!item) return;
    this.recents?.add(keyOf(item));
    this.close();
    switch (item.category) {
      case 'indicator': this.callbacks.onIndicator(item.id); break;
      case 'chartType': this.callbacks.onChartType(item.id as ChartType); break;
      case 'drawing': this.callbacks.onDrawingTool(item.id as DrawingToolType); break;
      case 'timeframe': this.callbacks.onTimeframe(item.id as TimeFrame); break;
      case 'action': this.callbacks.onAction(item.id); break;
    }
  }

  private onKeyDown(e: KeyboardEvent, modal: HTMLElement): void {
    e.stopPropagation(); // keys here must not drive chart shortcuts
    // Enter, Escape and the arrows pick and close among an input method's candidates while it composes.
    if (e.isComposing || e.keyCode === IME_KEY_CODE) return;
    // Escape, and the key that opened it, shut it (the browser's own Ctrl+K kept away).
    const toggle = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
    if (e.key === 'Escape' || toggle) {
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
      if (!e.repeat) this.run(this.selectedIndex);
    }
  }
}
