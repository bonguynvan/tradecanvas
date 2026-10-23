import type { IndicatorCategory } from '@tradecanvas/commons';
import { INDICATOR_CATEGORIES } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import { fill, type MessageKey, type Translator } from './i18n.js';
import { keepTabInside } from './focusTrap.js';
import { searchIndicators } from './indicatorSearch.js';
import { markPart } from './widgetFeatures.js';

/** An indicator as the dialog lists it. */
export interface IndicatorPickerItem {
  id: string;
  name: string;
  shortName: string;
  placement: 'overlay' | 'panel';
  category: IndicatorCategory;
}

export interface IndicatorPickerCallbacks {
  onAdd: (id: string) => void;
  onFavorite: (id: string, on: boolean) => void;
  /** The indicator templates; without them there is no Templates tab. */
  templates?: {
    onApply: (name: string) => void;
    onDelete: (name: string) => void;
    onSave: () => void;
  };
  onClose?: () => void;
}

export interface IndicatorPickerContent {
  items: readonly IndicatorPickerItem[];
  favorites: readonly string[];
  /** The templates' names; null where they are switched off. */
  templates: readonly string[] | null;
  /** How many of each indicator are on the chart. */
  counts?: ReadonlyMap<string, number>;
}

type View = 'favorites' | 'templates' | 'all' | IndicatorCategory;

let nextPickerId = 1;

const byName = (a: IndicatorPickerItem, b: IndicatorPickerItem) => a.name.localeCompare(b.name);

/**
 * The indicators dialog: a search, the groups down the side (favourites,
 * templates, all, then each kind) and the list. A row adds its indicator and
 * the dialog stays open for the next; the star beside it keeps it in the
 * favourites. Mounts in the widget's overlay layer.
 */
export class WidgetIndicatorPicker {
  private backdrop: HTMLDivElement | null = null;
  private listEl: HTMLDivElement | null = null;
  private navEl: HTMLDivElement | null = null;
  private searchEl: HTMLInputElement | null = null;
  private liveEl: HTMLDivElement | null = null;
  private content: IndicatorPickerContent = { items: [], favorites: [], templates: [] };
  private favorites = new Set<string>();
  private counts: ReadonlyMap<string, number> = new Map();
  private view: View = 'all';
  /** The tab picked last, for the next opening. */
  private lastView: View | null = null;
  private query = '';
  private returnFocus: HTMLElement | null = null;
  private readonly uid = nextPickerId++;

  constructor(
    private readonly layer: () => HTMLElement,
    private readonly callbacks: IndicatorPickerCallbacks,
    private readonly t: Translator,
  ) {}

  open(content: IndicatorPickerContent): void {
    if (this.backdrop) this.close(false);
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.content = content;
    this.favorites = new Set(content.favorites);
    this.counts = content.counts ?? new Map();
    this.query = '';
    this.view = this.startView();
    this.build();
    this.searchEl?.focus();
  }

  close(giveFocusBack = true): void {
    if (!this.backdrop) return;
    this.backdrop.remove();
    this.backdrop = this.listEl = this.navEl = this.searchEl = this.liveEl = null;
    this.callbacks.onClose?.();
    if (giveFocusBack && this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  /** The templates after one is saved or deleted; focus left on a deleted one goes to "Save…". */
  setTemplates(names: readonly string[]): void {
    this.content = { ...this.content, templates: [...names] };
    if (!this.listEl || this.view !== 'templates' || this.query) return;
    const hadFocus = this.listEl.contains(document.activeElement);
    this.renderList();
    if (hadFocus && !this.listEl.contains(document.activeElement)) {
      this.listEl.querySelector<HTMLButtonElement>('[data-tpl-save]')?.focus();
    }
  }

  /** How many of each indicator are on the chart, shown on their rows. */
  setCounts(counts: ReadonlyMap<string, number>): void {
    this.counts = counts;
    this.listEl?.querySelectorAll<HTMLElement>('.tcw-ip-row[data-ind]').forEach((row) => this.markCount(row));
  }

  destroy(): void {
    this.close(false);
  }

  private startView(): View {
    const views = this.views();
    if (this.lastView && views.includes(this.lastView) && !(this.lastView === 'favorites' && this.favorites.size === 0)) return this.lastView;
    return this.favorites.size > 0 ? 'favorites' : 'all';
  }

  /** The tabs down the side: favourites, templates, all, and each kind that has indicators. */
  private views(): View[] {
    const kinds = new Set(this.content.items.map((item) => item.category));
    return [
      'favorites',
      ...(this.callbacks.templates && this.content.templates ? ['templates' as const] : []),
      'all',
      ...INDICATOR_CATEGORIES.filter((category) => kinds.has(category)),
    ];
  }

  private viewLabel(view: View): string {
    if (view === 'favorites') return this.t('indicatorPicker.favorites');
    if (view === 'templates') return this.t('toolbar.indicators.templates');
    if (view === 'all') return this.t('toolbar.indicators.all');
    return this.t(`indicatorCategory.${view}` as MessageKey);
  }

  private build(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'tcw-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });
    const modal = document.createElement('div');
    modal.className = 'tcw-modal tcw-ip';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-ip-title-${this.uid}`);
    modal.tabIndex = -1;
    modal.addEventListener('keydown', (e) => this.onKeyDown(e, modal));

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-ip-title-${this.uid}`;
    title.textContent = this.t('toolbar.indicators');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('indicatorSettings.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    const searchRow = document.createElement('label');
    searchRow.className = 'tcw-ip-search';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = this.t('indicatorPicker.search');
    search.setAttribute('aria-label', this.t('indicatorPicker.search'));
    search.autocomplete = 'off';
    search.spellcheck = false;
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderList();
    });
    search.addEventListener('keydown', (e) => this.onSearchKey(e));
    searchRow.innerHTML = createIcon('search', 16);
    searchRow.appendChild(search);

    const body = document.createElement('div');
    body.className = 'tcw-ip-body';
    const nav = document.createElement('div');
    nav.className = 'tcw-ip-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-orientation', 'vertical');
    nav.setAttribute('aria-label', this.t('indicatorPicker.groups'));
    nav.addEventListener('keydown', (e) => this.onNavKey(e));
    const list = document.createElement('div');
    list.className = 'tcw-ip-list';
    list.id = `tcw-ip-list-${this.uid}`;
    list.setAttribute('role', 'tabpanel');
    list.addEventListener('keydown', (e) => this.onListKey(e));
    list.addEventListener('focusin', (e) => this.rove(e.target));
    body.append(nav, list);

    const live = document.createElement('div');
    live.className = 'tcw-visually-hidden';
    live.setAttribute('aria-live', 'polite');

    modal.append(header, searchRow, body, live);
    backdrop.appendChild(modal);
    this.layer().appendChild(backdrop);
    this.backdrop = backdrop;
    this.listEl = list;
    this.navEl = nav;
    this.searchEl = search;
    this.liveEl = live;
    this.renderNav();
    this.renderList();
  }

  private renderNav(): void {
    const nav = this.navEl;
    if (!nav) return;
    nav.replaceChildren(...this.views().map((view) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tcw-ip-tab';
      tab.dataset.view = view;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `tcw-ip-list-${this.uid}`);
      const icon = view === 'favorites' ? createIcon('star', 14) : view === 'templates' ? createIcon('layers', 14) : '';
      tab.innerHTML = `${icon}<span></span>`;
      tab.querySelector('span')!.textContent = this.viewLabel(view);
      if (view === 'templates') markPart(tab, 'indicatorTemplates');
      tab.addEventListener('click', () => this.select(view));
      return tab;
    }));
    this.markNav();
  }

  private markNav(): void {
    this.navEl?.querySelectorAll<HTMLButtonElement>('.tcw-ip-tab').forEach((tab) => {
      const on = tab.dataset.view === this.view;
      tab.setAttribute('aria-selected', String(on));
      tab.classList.toggle('tcw-active', on);
      tab.tabIndex = on ? 0 : -1;
    });
  }

  private select(view: View, focusTab = false): void {
    this.view = this.lastView = view;
    if (this.searchEl && this.query) this.searchEl.value = this.query = '';
    this.markNav();
    this.renderList();
    if (focusTab) this.navEl?.querySelector<HTMLButtonElement>(`[data-view="${view}"]`)?.focus();
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.replaceChildren();
    const items = this.content.items;
    if (this.query.trim()) {
      const hits = searchIndicators(items, this.query);
      if (hits.length === 0) list.appendChild(this.note(fill(this.t('indicatorPicker.noMatch'), { query: this.query.trim() })));
      else list.append(...hits.map((item) => this.row(item)));
    } else if (this.view === 'templates') {
      this.renderTemplates(list);
    } else if (this.view === 'favorites') {
      const favorites = items.filter((item) => this.favorites.has(item.id)).sort(byName);
      if (favorites.length === 0) list.appendChild(this.note(this.t('indicatorPicker.noFavorites')));
      else list.append(...favorites.map((item) => this.row(item)));
    } else if (this.view === 'all') {
      for (const category of INDICATOR_CATEGORIES) {
        const group = items.filter((item) => item.category === category).sort(byName);
        if (group.length === 0) continue;
        const heading = document.createElement('div');
        heading.className = 'tcw-ip-heading';
        heading.textContent = this.viewLabel(category);
        list.append(heading, ...group.map((item) => this.row(item)));
      }
    } else {
      list.append(...items.filter((item) => item.category === this.view).sort(byName).map((item) => this.row(item)));
    }
    list.querySelector<HTMLButtonElement>('.tcw-ip-add')?.setAttribute('tabindex', '0');
  }

  private row(item: IndicatorPickerItem): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-ip-row';
    row.dataset.ind = item.id;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'tcw-ip-add';
    add.dataset.ind = item.id;
    add.tabIndex = -1;
    const name = document.createElement('span');
    name.className = 'tcw-ip-name';
    name.textContent = item.name;
    add.appendChild(name);
    if (item.shortName && item.shortName !== item.name) add.appendChild(this.tag('tcw-ip-short', item.shortName));
    add.appendChild(this.tag('tcw-ip-kind', this.t(`indicatorType.${item.placement}`)));
    add.addEventListener('click', () => this.add(item));
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'tcw-ip-aside tcw-ip-star';
    star.tabIndex = -1;
    star.title = this.t('indicatorPicker.favorite');
    star.setAttribute('aria-label', `${this.t('indicatorPicker.favorite')}: ${item.name}`);
    star.setAttribute('aria-pressed', String(this.favorites.has(item.id)));
    star.innerHTML = createIcon('star', 14);
    star.addEventListener('click', () => this.toggleFavorite(item.id, star));
    row.append(add, star);
    this.markCount(row);
    return row;
  }

  private renderTemplates(list: HTMLElement): void {
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'tcw-ip-add tcw-ip-save';
    save.dataset.tplSave = '';
    save.innerHTML = `${createIcon('save', 14)}<span class="tcw-ip-name"></span>`;
    save.querySelector('span')!.textContent = this.t('templates.save');
    save.addEventListener('click', () => {
      this.close();
      this.callbacks.templates?.onSave();
    });
    list.appendChild(save);
    const names = this.content.templates ?? [];
    if (names.length === 0) list.appendChild(this.note(this.t('indicatorPicker.noTemplates')));
    for (const name of names) {
      const row = document.createElement('div');
      row.className = 'tcw-ip-row';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'tcw-ip-add';
      apply.tabIndex = -1;
      apply.dataset.tplApply = name;
      apply.innerHTML = `${createIcon('layers', 14)}<span class="tcw-ip-name"></span>`;
      apply.querySelector('span')!.textContent = name;
      apply.addEventListener('click', () => {
        this.close();
        this.callbacks.templates?.onApply(name);
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tcw-ip-aside tcw-ip-remove';
      remove.tabIndex = -1;
      remove.dataset.tplDelete = name;
      const label = fill(this.t('templates.delete'), { name });
      remove.title = label;
      remove.setAttribute('aria-label', label);
      remove.innerHTML = createIcon('x', 12);
      remove.addEventListener('click', () => this.callbacks.templates?.onDelete(name));
      row.append(apply, remove);
      list.appendChild(row);
    }
  }

  private add(item: IndicatorPickerItem): void {
    this.callbacks.onAdd(item.id);
    if (this.liveEl) this.liveEl.textContent = fill(this.t('indicatorPicker.added'), { name: item.name });
  }

  private toggleFavorite(id: string, star: HTMLButtonElement): void {
    const on = !this.favorites.has(id);
    if (on) this.favorites.add(id);
    else this.favorites.delete(id);
    this.callbacks.onFavorite(id, on);
    star.setAttribute('aria-pressed', String(on));
    if (this.view !== 'favorites' || this.query || on) return;
    // Gone from the favourites: the keyboard moves to the next row's star.
    const stars = [...(this.listEl?.querySelectorAll<HTMLButtonElement>('.tcw-ip-star') ?? [])];
    const at = stars.indexOf(star);
    const hadFocus = document.activeElement === star;
    this.renderList();
    if (!hadFocus) return;
    const left = [...(this.listEl?.querySelectorAll<HTMLButtonElement>('.tcw-ip-star') ?? [])];
    (left[at] ?? left[left.length - 1] ?? this.searchEl)?.focus();
  }

  private markCount(row: HTMLElement): void {
    const n = this.counts.get(row.dataset.ind ?? '') ?? 0;
    const add = row.querySelector('.tcw-ip-add');
    let badge = row.querySelector<HTMLElement>('.tcw-ip-count');
    if (n === 0) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = this.tag('tcw-ip-count', '');
      add?.appendChild(badge);
    }
    badge.textContent = String(n);
    badge.title = fill(this.t('indicatorPicker.onChart'), { count: String(n) });
  }

  private tag(className: string, text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }

  private note(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-ip-empty';
    el.textContent = text;
    return el;
  }

  /** One row in the list takes Tab: the one focused last. */
  private rove(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement) || !target.classList.contains('tcw-ip-add')) return;
    this.listEl?.querySelectorAll<HTMLElement>('.tcw-ip-add[tabindex="0"]').forEach((el) => {
      if (el !== target) el.tabIndex = -1;
    });
    target.tabIndex = 0;
  }

  private onKeyDown(e: KeyboardEvent, modal: HTMLElement): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }
    keepTabInside(e, modal);
  }

  /** Down goes into the list; Enter adds the best match. */
  private onSearchKey(e: KeyboardEvent): void {
    const first = this.listEl?.querySelector<HTMLButtonElement>('.tcw-ip-add');
    if (e.key === 'ArrowDown' && first) {
      e.preventDefault();
      first.focus();
    } else if (e.key === 'Enter' && this.query.trim() && first) {
      e.preventDefault();
      first.click();
    }
  }

  /** Up and down through the tabs (Home, End), picking as they go. */
  private onNavKey(e: KeyboardEvent): void {
    const views = this.views();
    const at = views.indexOf(this.view);
    const next = e.key === 'ArrowDown' ? Math.min(views.length - 1, at + 1)
      : e.key === 'ArrowUp' ? Math.max(0, at - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? views.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    this.select(views[next], true);
  }

  /** Up and down through the rows (from the top, back to the search); right to a row's star, left back. */
  private onListKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const row = target.closest('.tcw-ip-row, .tcw-ip-save');
    const adds = [...(this.listEl?.querySelectorAll<HTMLButtonElement>('.tcw-ip-add') ?? [])];
    const main = row?.classList.contains('tcw-ip-save') ? row as HTMLButtonElement : row?.querySelector<HTMLButtonElement>('.tcw-ip-add');
    const at = main ? adds.indexOf(main) : -1;
    let to: HTMLElement | null | undefined = null;
    if (e.key === 'ArrowDown') to = adds[at + 1];
    else if (e.key === 'ArrowUp') to = at > 0 ? adds[at - 1] : this.searchEl;
    else if (e.key === 'Home') to = adds[0];
    else if (e.key === 'End') to = adds[adds.length - 1];
    else if (e.key === 'ArrowRight' && target === main) to = row?.querySelector<HTMLButtonElement>('.tcw-ip-aside');
    else if (e.key === 'ArrowLeft' && target !== main) to = main;
    if (!to) return;
    e.preventDefault();
    to.focus();
  }
}
