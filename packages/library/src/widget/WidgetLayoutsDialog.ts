import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import type { SavedLayoutSummary } from '../state/layoutStorage.js';

export interface LayoutsDialogCallbacks {
  list: () => Promise<SavedLayoutSummary[]>;
  /** The id of the layout showing now. */
  currentId: () => string | null;
  onOpen: (id: string) => void;
  onRename: (layout: SavedLayoutSummary) => void;
  onDelete: (id: string) => Promise<void>;
  formatTime: (ms: number) => string;
}

let dialogSeq = 0;

/** Every saved layout, searchable: open one, rename it or delete it (asked twice). */
export class WidgetLayoutsDialog {
  private backdrop: HTMLDivElement;
  private search: HTMLInputElement;
  private listEl: HTMLDivElement;
  private layouts: SavedLayoutSummary[] = [];
  private confirming: string | null = null;
  private returnFocus: HTMLElement | null = null;
  private loadSeq = 0;
  private readonly uid = ++dialogSeq;

  constructor(host: HTMLElement, private readonly callbacks: LayoutsDialogCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    let pressedBackdrop = false;
    this.backdrop.addEventListener('pointerdown', (e) => { pressedBackdrop = e.target === this.backdrop; });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && pressedBackdrop) this.close();
      pressedBackdrop = false;
    });

    const modal = document.createElement('div');
    modal.className = 'tcw-modal tcw-modal-narrow tcw-layouts-dialog';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-layouts-title-${this.uid}`);
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (this.confirming) this.setConfirming(null);
      else this.close();
    });

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-layouts-title-${this.uid}`;
    title.textContent = this.t('layouts.dialogTitle');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    this.search = document.createElement('input');
    this.search.type = 'search';
    this.search.className = 'tcw-indi-input tcw-layouts-search';
    this.search.placeholder = this.t('layouts.search');
    this.search.setAttribute('aria-label', this.t('layouts.search'));
    this.search.addEventListener('input', () => this.render());

    this.listEl = document.createElement('div');
    this.listEl.className = 'tcw-layouts-list';
    this.listEl.setAttribute('role', 'list');

    const body = document.createElement('div');
    body.className = 'tcw-modal-body tcw-layouts-body';
    body.append(this.search, this.listEl);
    modal.append(header, body);
    this.backdrop.appendChild(modal);
    host.appendChild(this.backdrop);
  }

  async open(): Promise<void> {
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.search.value = '';
    this.confirming = null;
    this.backdrop.hidden = false;
    this.search.focus();
    await this.refresh();
  }

  /** Read the list again (after a rename, say). */
  async refresh(): Promise<void> {
    const seq = ++this.loadSeq;
    let layouts: SavedLayoutSummary[];
    try {
      layouts = await this.callbacks.list();
    } catch {
      layouts = [];
    }
    if (seq !== this.loadSeq) return;
    this.layouts = layouts;
    this.render();
  }

  close(): void {
    if (this.backdrop.hidden) return;
    this.backdrop.hidden = true;
    this.confirming = null;
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  isOpen(): boolean {
    return !this.backdrop.hidden;
  }

  destroy(): void {
    this.close();
    this.backdrop.remove();
  }

  private shown(): SavedLayoutSummary[] {
    const query = this.search.value.trim().toLowerCase();
    if (!query) return this.layouts;
    return this.layouts.filter((l) => l.name.toLowerCase().includes(query) || (l.symbol ?? '').toLowerCase().includes(query));
  }

  private render(): void {
    const shown = this.shown();
    if (shown.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tcw-account-empty';
      empty.textContent = this.t(this.layouts.length === 0 ? 'layouts.empty' : 'layouts.noMatch');
      this.listEl.replaceChildren(empty);
      return;
    }
    const currentId = this.callbacks.currentId();
    this.listEl.replaceChildren(...shown.map((layout) => this.row(layout, layout.id === currentId)));
  }

  private row(layout: SavedLayoutSummary, current: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = 'tcw-layouts-row';
    row.setAttribute('role', 'listitem');
    row.dataset.id = layout.id;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'tcw-layouts-open';
    if (current) open.setAttribute('aria-current', 'true');
    const name = document.createElement('span');
    name.className = 'tcw-layouts-name';
    name.textContent = layout.name;
    const meta = document.createElement('span');
    meta.className = 'tcw-layouts-meta';
    meta.textContent = [
      [layout.symbol, layout.timeframe].filter(Boolean).join(' · '),
      fill(this.t('layouts.updated'), { time: this.callbacks.formatTime(layout.updatedAt) }),
    ].filter(Boolean).join(' — ');
    open.append(name, meta);
    if (current) {
      const badge = document.createElement('span');
      badge.className = 'tcw-tag';
      badge.textContent = this.t('layouts.current');
      name.appendChild(badge);
    }
    open.addEventListener('click', () => {
      this.callbacks.onOpen(layout.id);
      this.close();
    });

    const actions = document.createElement('div');
    actions.className = 'tcw-account-actions';
    if (this.confirming === layout.id) {
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'tcw-layouts-confirm';
      confirm.textContent = this.t('layouts.deleteConfirm');
      confirm.setAttribute('aria-label', fill(this.t('layouts.deleteNamed'), { name: layout.name }));
      confirm.addEventListener('click', () => void this.remove(layout.id));
      const keep = this.iconButton('x', this.t('common.cancel'), () => this.setConfirming(null));
      actions.append(confirm, keep);
    } else {
      actions.append(
        this.iconButton('penLine', fill(this.t('layouts.renameNamed'), { name: layout.name }), () => this.callbacks.onRename(layout)),
        this.iconButton('trash', fill(this.t('layouts.deleteNamed'), { name: layout.name }), () => this.setConfirming(layout.id), true),
      );
    }
    row.append(open, actions);
    return row;
  }

  private iconButton(icon: string, label: string, run: () => void, danger = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tcw-tree-btn${danger ? ' tcw-tree-del' : ''}`;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = createIcon(icon, 14);
    btn.addEventListener('click', run);
    return btn;
  }

  /** Ask before deleting; focus follows to the button that asks (or back). */
  private setConfirming(id: string | null): void {
    const was = this.confirming;
    this.confirming = id;
    this.render();
    const target = id ?? was;
    if (!target) return;
    const row = [...this.listEl.querySelectorAll<HTMLElement>('.tcw-layouts-row')].find((r) => r.dataset.id === target);
    row?.querySelector<HTMLButtonElement>(id ? '.tcw-layouts-confirm' : '.tcw-tree-del')?.focus();
  }

  private async remove(id: string): Promise<void> {
    try {
      await this.callbacks.onDelete(id);
    } finally {
      this.confirming = null;
      await this.refresh();
      if (this.isOpen()) this.search.focus();
    }
  }
}
