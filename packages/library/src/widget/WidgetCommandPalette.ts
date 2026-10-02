import type { ChartType, DrawingToolType, TimeFrame } from '@tradecanvas/commons';
import { EN_TRANSLATOR, type Translator } from './i18n.js';
import { escapeHtml } from './escapeHtml.js';

export interface CommandItem {
  id: string;
  label: string;
  category: 'indicator' | 'chartType' | 'drawing' | 'timeframe' | 'action';
  shortcut?: string;
  active?: boolean;
}

export interface CommandPaletteCallbacks {
  onIndicator: (id: string) => void;
  onChartType: (type: ChartType) => void;
  onDrawingTool: (tool: DrawingToolType) => void;
  onTimeframe: (tf: TimeFrame) => void;
  onAction: (id: string) => void;
  onClose: () => void;
}

export class WidgetCommandPalette {
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private items: CommandItem[] = [];
  private filtered: CommandItem[] = [];
  private selectedIndex = 0;
  private callbacks: CommandPaletteCallbacks;
  private boundKeydown: (e: KeyboardEvent) => void;

  /** Where the overlay mounts (the widget's portal: themed, and inside it when fullscreen). */
  constructor(
    callbacks: CommandPaletteCallbacks,
    private readonly host: () => HTMLElement = () => document.body,
    private readonly t: Translator = EN_TRANSLATOR,
  ) {
    this.callbacks = callbacks;
    this.boundKeydown = this.handleKeydown.bind(this);
  }

  open(items: CommandItem[]): void {
    if (this.backdrop) return;
    this.items = items;
    this.filtered = items;
    this.selectedIndex = 0;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-cmd-palette';

    const header = document.createElement('div');
    header.className = 'tcw-cmd-header';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'tcw-cmd-icon';
    searchIcon.textContent = '⌕';
    header.appendChild(searchIcon);

    this.input = document.createElement('input');
    this.input.className = 'tcw-cmd-input';
    this.input.type = 'text';
    this.input.placeholder = this.t('palette.placeholder');
    this.input.addEventListener('input', () => this.filter());
    header.appendChild(this.input);

    const hint = document.createElement('span');
    hint.className = 'tcw-cmd-hint';
    hint.textContent = 'ESC';
    header.appendChild(hint);

    this.modal.appendChild(header);

    this.list = document.createElement('div');
    this.list.className = 'tcw-cmd-list';
    this.modal.appendChild(this.list);

    const footer = document.createElement('div');
    footer.className = 'tcw-cmd-footer';
    footer.innerHTML = `<span>↑↓ ${escapeHtml(this.t('common.navigate'))}</span>`
      + `<span>⏎ ${escapeHtml(this.t('common.select'))}</span>`
      + `<span>Esc ${escapeHtml(this.t('common.close'))}</span>`;
    this.modal.appendChild(footer);

    this.host().append(this.backdrop, this.modal);

    this.renderList();
    this.input.focus();
    document.addEventListener('keydown', this.boundKeydown);
  }

  close(): void {
    document.removeEventListener('keydown', this.boundKeydown);
    this.backdrop?.remove();
    this.modal?.remove();
    this.backdrop = null;
    this.modal = null;
    this.input = null;
    this.list = null;
    this.callbacks.onClose();
  }

  isOpen(): boolean {
    return this.backdrop !== null;
  }

  private filter(): void {
    const query = this.input?.value.toLowerCase().trim() ?? '';
    if (!query) {
      this.filtered = this.items;
    } else {
      this.filtered = this.items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query),
      );
    }
    this.selectedIndex = 0;
    this.renderList();
  }

  private renderList(): void {
    if (!this.list) return;
    this.list.innerHTML = '';

    if (this.filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-cmd-empty';
      empty.textContent = this.t('palette.empty');
      this.list.appendChild(empty);
      return;
    }

    let currentCategory = '';
    for (let i = 0; i < this.filtered.length; i++) {
      const item = this.filtered[i];

      if (item.category !== currentCategory) {
        currentCategory = item.category;
        const label = document.createElement('div');
        label.className = 'tcw-cmd-category';
        label.textContent = this.categoryLabel(currentCategory);
        this.list.appendChild(label);
      }

      const row = document.createElement('button');
      row.className = 'tcw-cmd-item';
      if (i === this.selectedIndex) row.classList.add('tcw-selected');
      if (item.active) row.classList.add('tcw-active');
      row.dataset.index = String(i);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tcw-cmd-item-label';
      nameSpan.textContent = item.label;
      row.appendChild(nameSpan);

      if (item.active) {
        const check = document.createElement('span');
        check.className = 'tcw-cmd-check';
        check.textContent = '✓';
        row.appendChild(check);
      }

      if (item.shortcut) {
        const kbd = document.createElement('kbd');
        kbd.className = 'tcw-cmd-kbd';
        kbd.textContent = item.shortcut;
        row.appendChild(kbd);
      }

      row.addEventListener('click', () => this.select(i));
      row.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.updateSelection();
      });

      this.list.appendChild(row);
    }
  }

  private updateSelection(): void {
    if (!this.list) return;
    const items = this.list.querySelectorAll('.tcw-cmd-item');
    items.forEach((el, i) => {
      el.classList.toggle('tcw-selected', i === this.selectedIndex);
    });
    items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  private select(index: number): void {
    const item = this.filtered[index];
    if (!item) return;

    switch (item.category) {
      case 'indicator':
        this.callbacks.onIndicator(item.id);
        break;
      case 'chartType':
        this.callbacks.onChartType(item.id as ChartType);
        break;
      case 'drawing':
        this.callbacks.onDrawingTool(item.id as DrawingToolType);
        break;
      case 'timeframe':
        this.callbacks.onTimeframe(item.id as TimeFrame);
        break;
      case 'action':
        this.callbacks.onAction(item.id);
        break;
    }
    this.close();
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (this.filtered.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % this.filtered.length;
          this.updateSelection();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (this.filtered.length > 0) {
          this.selectedIndex = (this.selectedIndex - 1 + this.filtered.length) % this.filtered.length;
          this.updateSelection();
        }
        break;
      case 'Enter':
        e.preventDefault();
        this.select(this.selectedIndex);
        break;
    }
  }

  private categoryLabel(cat: string): string {
    switch (cat) {
      case 'indicator': return this.t('palette.group.indicator');
      case 'chartType': return this.t('palette.group.chartType');
      case 'drawing': return this.t('palette.group.drawing');
      case 'timeframe': return this.t('palette.group.timeframe');
      case 'action': return this.t('palette.group.action');
      default: return cat;
    }
  }

  destroy(): void {
    this.close();
  }
}
