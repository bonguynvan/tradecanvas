import type { DrawingStyle } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { DrawingTemplateStore } from './DrawingTemplateStore.js';

export interface DrawingStyleCallbacks {
  /** Apply a style change to the active (next) drawing and the selected one. */
  onStyleChange: (style: Partial<DrawingStyle>) => void;
  /** Current active drawing style, for seeding controls and saving templates. */
  getStyle: () => DrawingStyle;
}

const SWATCHES = ['#2962ff', '#089981', '#f23645', '#ff9800', '#ab47bc', '#26c6da', '#ffffff', '#787b86'];
const WIDTHS = [1, 2, 3, 4];
const LINE_STYLES: DrawingStyle['lineStyle'][] = ['solid', 'dashed', 'dotted'];

/**
 * Drawing style popover — pick colour, line width, and line style for the next
 * drawing (and the selected one), plus save/apply named style templates
 * persisted via `DrawingTemplateStore`.
 */
export class WidgetDrawingStyle {
  private el: HTMLDivElement;
  private templatesEl: HTMLDivElement;
  private nameInput: HTMLInputElement;
  private callbacks: DrawingStyleCallbacks;
  private store: DrawingTemplateStore;
  private open = false;

  constructor(host: HTMLElement, callbacks: DrawingStyleCallbacks, store: DrawingTemplateStore) {
    this.callbacks = callbacks;
    this.store = store;

    this.el = document.createElement('div');
    this.el.className = 'tcw-style-panel';
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-style-header';
    const title = document.createElement('span');
    title.textContent = 'Drawing Style';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-style-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    this.el.appendChild(this.colorRow());
    this.el.appendChild(this.widthRow());
    this.el.appendChild(this.lineStyleRow());

    // Templates
    const tmplHead = document.createElement('div');
    tmplHead.className = 'tcw-style-subhead';
    tmplHead.textContent = 'Templates';
    this.el.appendChild(tmplHead);

    const saveRow = document.createElement('div');
    saveRow.className = 'tcw-style-save';
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.placeholder = 'Template name';
    this.nameInput.className = 'tcw-style-name';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'tcw-style-savebtn';
    saveBtn.innerHTML = `${createIcon('plus', 13)}<span>Save</span>`;
    saveBtn.addEventListener('click', () => this.saveTemplate());
    saveRow.appendChild(this.nameInput);
    saveRow.appendChild(saveBtn);
    this.el.appendChild(saveRow);

    this.templatesEl = document.createElement('div');
    this.templatesEl.className = 'tcw-style-templates';
    this.el.appendChild(this.templatesEl);

    host.appendChild(this.el);
    this.renderTemplates();
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open ? this.close() : this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.el.hidden = false;
    this.syncActiveControls();
    this.renderTemplates();
  }

  close(): void {
    this.open = false;
    this.el.hidden = true;
  }

  destroy(): void {
    this.el.remove();
  }

  private colorRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-style-row tcw-style-colors';
    for (const c of SWATCHES) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'tcw-style-swatch';
      sw.style.background = c;
      sw.dataset.color = c;
      sw.setAttribute('aria-label', c);
      sw.addEventListener('click', () => this.applyStyle({ color: c }));
      row.appendChild(sw);
    }
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'tcw-style-picker';
    picker.addEventListener('input', () => this.applyStyle({ color: picker.value }));
    row.appendChild(picker);
    return row;
  }

  private widthRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-style-row tcw-style-widths';
    for (const w of WIDTHS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-style-width';
      btn.dataset.width = String(w);
      const bar = document.createElement('span');
      bar.style.height = `${w}px`;
      btn.appendChild(bar);
      btn.addEventListener('click', () => this.applyStyle({ lineWidth: w }));
      row.appendChild(btn);
    }
    return row;
  }

  private lineStyleRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-style-row tcw-style-dashes';
    for (const ls of LINE_STYLES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-style-dash';
      btn.dataset.linestyle = ls;
      btn.textContent = ls === 'solid' ? '──' : ls === 'dashed' ? '╌╌' : '┄┄';
      btn.title = ls;
      btn.addEventListener('click', () => this.applyStyle({ lineStyle: ls }));
      row.appendChild(btn);
    }
    return row;
  }

  private applyStyle(patch: Partial<DrawingStyle>): void {
    this.callbacks.onStyleChange(patch);
    this.syncActiveControls();
  }

  /** Mark the controls matching the current active style. */
  private syncActiveControls(): void {
    const style = this.callbacks.getStyle();
    this.el.querySelectorAll<HTMLElement>('.tcw-style-swatch').forEach((sw) => {
      sw.classList.toggle('tcw-on', sw.dataset.color?.toLowerCase() === style.color?.toLowerCase());
    });
    this.el.querySelectorAll<HTMLElement>('.tcw-style-width').forEach((b) => {
      b.classList.toggle('tcw-on', Number(b.dataset.width) === style.lineWidth);
    });
    this.el.querySelectorAll<HTMLElement>('.tcw-style-dash').forEach((b) => {
      b.classList.toggle('tcw-on', b.dataset.linestyle === style.lineStyle);
    });
  }

  private saveTemplate(): void {
    const name = this.nameInput.value.trim();
    if (!name) return;
    this.store.save(name, this.callbacks.getStyle());
    this.nameInput.value = '';
    this.renderTemplates();
  }

  private renderTemplates(): void {
    this.templatesEl.replaceChildren();
    const templates = this.store.list();
    if (templates.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-style-empty';
      empty.textContent = 'No saved templates';
      this.templatesEl.appendChild(empty);
      return;
    }
    for (const t of templates) {
      const row = document.createElement('div');
      row.className = 'tcw-style-template';

      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'tcw-style-apply';
      const dot = document.createElement('span');
      dot.className = 'tcw-style-tdot';
      dot.style.background = (t.style.color as string) ?? 'var(--tcw-text-muted)';
      const label = document.createElement('span');
      label.textContent = t.name;
      apply.appendChild(dot);
      apply.appendChild(label);
      apply.addEventListener('click', () => {
        this.callbacks.onStyleChange({ ...t.style });
        this.syncActiveControls();
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'tcw-style-tdel';
      del.setAttribute('aria-label', 'Delete template');
      del.innerHTML = createIcon('trash', 13);
      del.addEventListener('click', () => {
        this.store.remove(t.name);
        this.renderTemplates();
      });

      row.appendChild(apply);
      row.appendChild(del);
      this.templatesEl.appendChild(row);
    }
  }
}
