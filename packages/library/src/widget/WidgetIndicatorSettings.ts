import type { IndicatorInputSpec, IndicatorPlot } from '@tradecanvas/commons';
import { PRICE_SOURCES } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_MESSAGES, type Translator } from './i18n.js';

export type IndicatorParamValue = number | string | boolean;

export interface IndicatorSettingsTarget {
  instanceId: string;
  name: string;
  /** Default config — defines the editable keys and their types. */
  defaults: Record<string, unknown>;
  /** Current values, overlaid on defaults. */
  params: Record<string, unknown>;
  /** How parameters are edited (the descriptor's `inputs`). */
  inputs?: Readonly<Record<string, IndicatorInputSpec>>;
  /** Other indicators' lines a source can be: value `ind:<instanceId>:<key>`. */
  lineSources?: readonly { value: string; label: string }[];
  /** What it draws; with `colors`, the Style tab. */
  plots?: readonly IndicatorPlot[];
  colors?: readonly string[];
  lineWidth?: number;
  /** Its levels and its indicator's defaults; with them, the Levels tab. */
  levels?: readonly number[];
  defaultLevels?: readonly number[];
}

export interface IndicatorSettingsCallbacks {
  onApply: (instanceId: string, params: Record<string, IndicatorParamValue>) => void;
  onStyle?: (instanceId: string, style: { colors?: string[]; lineWidths?: number[] }) => void;
  /** `null` restores the indicator's default levels. */
  onLevels?: (instanceId: string, levels: number[] | null) => void;
  onClose: () => void;
}

type Tab = 'inputs' | 'style' | 'levels';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LINE_WIDTHS = [1, 1.5, 2, 3, 4];

function titleCase(key: string): string {
  // camelCase / snake_case → "Title Case"
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Per-indicator settings: its inputs (a stepper, toggle, colour, choice or
 * source for each parameter), its style (a colour per line, the line width)
 * and its levels. Every edit applies at once.
 */
export class WidgetIndicatorSettings {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private tabsEl: HTMLDivElement;
  private resetBtn: HTMLButtonElement;
  private callbacks: IndicatorSettingsCallbacks;
  private target: IndicatorSettingsTarget | null = null;
  private draft: Record<string, IndicatorParamValue> = {};
  private colors: string[] = [];
  private levels: number[] = [];
  private tab: Tab = 'inputs';
  private readonly t: Translator;

  constructor(host: HTMLElement, callbacks: IndicatorSettingsCallbacks, t?: Translator) {
    this.callbacks = callbacks;
    this.t = t ?? ((key) => EN_MESSAGES[key]);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-modal-narrow';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    this.titleEl = document.createElement('h3');
    this.titleEl.textContent = 'Indicator';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close());
    header.append(this.titleEl, closeBtn);

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'tcw-modal-tabs';
    this.tabsEl.setAttribute('role', 'tablist');

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-modal-body';
    this.bodyEl.setAttribute('role', 'tabpanel');

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    this.resetBtn = document.createElement('button');
    this.resetBtn.type = 'button';
    this.resetBtn.className = 'tcw-reset-link';
    this.resetBtn.textContent = this.t('settings.resetToDefaults');
    this.resetBtn.addEventListener('click', () => this.resetTab());
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'tcw-done-btn';
    doneBtn.textContent = this.t('settings.done');
    doneBtn.addEventListener('click', () => this.close());
    footer.append(this.resetBtn, doneBtn);

    this.modal.append(header, this.tabsEl, this.bodyEl, footer);
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  open(target: IndicatorSettingsTarget): void {
    this.target = target;
    this.titleEl.textContent = this.t('indicatorSettings.title').replace('{name}', target.name);
    this.draft = {};
    this.colors = [...(target.colors ?? [])];
    this.levels = [...(target.levels ?? [])];
    this.tab = 'inputs';
    this.renderTabs();
    this.renderBody();
    this.backdrop.hidden = false;
  }

  close(): void {
    this.backdrop.hidden = true;
    this.target = null;
    this.callbacks.onClose();
  }

  isOpen(): boolean {
    return !this.backdrop.hidden;
  }

  destroy(): void {
    this.backdrop.remove();
  }

  private tabs(): Tab[] {
    const target = this.target;
    if (!target) return [];
    const out: Tab[] = ['inputs'];
    if (target.plots?.length && target.colors && this.callbacks.onStyle) out.push('style');
    if (target.levels && this.callbacks.onLevels) out.push('levels');
    return out;
  }

  private renderTabs(): void {
    const tabs = this.tabs();
    this.tabsEl.hidden = tabs.length < 2;
    this.tabsEl.replaceChildren(...tabs.map((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-modal-tab';
      btn.setAttribute('role', 'tab');
      btn.dataset.tab = tab;
      btn.textContent = this.t(`indicatorSettings.tab.${tab}`);
      const selected = tab === this.tab;
      btn.classList.toggle('tcw-active', selected);
      btn.setAttribute('aria-selected', String(selected));
      btn.addEventListener('click', () => {
        this.tab = tab;
        this.renderTabs();
        this.renderBody();
      });
      return btn;
    }));
  }

  private renderBody(): void {
    this.bodyEl.replaceChildren();
    if (!this.target) return;
    const section = document.createElement('div');
    section.className = 'tcw-settings-section';
    if (this.tab === 'style') this.renderStyle(section);
    else if (this.tab === 'levels') this.renderLevels(section);
    else this.renderInputs(section);
    this.resetBtn.hidden = this.tab === 'style';
    this.bodyEl.appendChild(section);
  }

  // --- Inputs ---

  private currentValue(key: string): IndicatorParamValue {
    if (key in this.draft) return this.draft[key];
    const cur = this.target?.params[key];
    const def = this.target?.defaults[key];
    return (cur ?? def) as IndicatorParamValue;
  }

  private setValue(key: string, value: IndicatorParamValue): void {
    if (!this.target) return;
    this.draft[key] = value;
    this.callbacks.onApply(this.target.instanceId, { ...this.draft });
  }

  private renderInputs(section: HTMLElement): void {
    const keys = Object.keys(this.target!.defaults);
    if (keys.length === 0) {
      section.appendChild(this.note(this.t('indicatorSettings.noInputs')));
      return;
    }
    for (const key of keys) section.appendChild(this.fieldRow(key));
  }

  private fieldRow(key: string): HTMLLabelElement {
    const spec = this.target?.inputs?.[key];
    const value = this.currentValue(key);
    const defType = typeof (this.target?.defaults[key] ?? value);
    let control: HTMLElement;
    if (spec?.source) control = this.sourceControl(key, String(value ?? 'close'));
    else if (spec?.options) control = this.choiceControl(key, spec.options, value);
    else if (defType === 'boolean') control = this.toggleControl(key, Boolean(value));
    else if (defType === 'number') control = this.numberControl(key, Number(value), spec);
    else if (typeof value === 'string' && HEX_RE.test(value)) control = this.colorInput(value, (v) => this.setValue(key, v));
    else control = this.textControl(key, String(value ?? ''));
    return this.row(spec?.label ?? titleCase(key), control);
  }

  private sourceControl(key: string, value: string): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'tcw-indi-input tcw-indi-select';
    const prices = document.createElement('optgroup');
    prices.label = this.t('indicatorSettings.source.prices');
    for (const source of PRICE_SOURCES) prices.appendChild(this.option(source, source));
    select.appendChild(prices);
    const lines = this.target?.lineSources ?? [];
    if (lines.length) {
      const group = document.createElement('optgroup');
      group.label = this.t('indicatorSettings.source.indicators');
      for (const line of lines) group.appendChild(this.option(line.value, line.label));
      select.appendChild(group);
    }
    select.value = value;
    if (select.value !== value) select.value = 'close'; // a line that is gone
    select.addEventListener('change', () => this.setValue(key, select.value));
    return select;
  }

  private choiceControl(key: string, options: readonly (string | number)[], value: IndicatorParamValue): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'tcw-indi-input tcw-indi-select';
    for (const opt of options) select.appendChild(this.option(String(opt), String(opt)));
    select.value = String(value);
    select.addEventListener('change', () => {
      const picked = options.find((o) => String(o) === select.value);
      if (picked !== undefined) this.setValue(key, picked);
    });
    return select;
  }

  private toggleControl(key: string, value: boolean): HTMLButtonElement {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `tcw-toggle${value ? ' tcw-on' : ''}`;
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(value));
    toggle.addEventListener('click', () => {
      const next = !toggle.classList.contains('tcw-on');
      toggle.classList.toggle('tcw-on', next);
      toggle.setAttribute('aria-checked', String(next));
      this.setValue(key, next);
    });
    return toggle;
  }

  private numberControl(key: string, value: number, spec?: IndicatorInputSpec): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'tcw-indi-input';
    input.value = String(value);
    // Integer-looking defaults step by 1; fractional defaults step by 0.1.
    input.step = String(spec?.step ?? (Number.isInteger(value) ? 1 : 0.1));
    if (spec?.min !== undefined) input.min = String(spec.min);
    if (spec?.max !== undefined) input.max = String(spec.max);
    input.addEventListener('change', () => {
      let n = Number(input.value);
      if (!Number.isFinite(n)) return;
      if (spec?.min !== undefined) n = Math.max(spec.min, n);
      if (spec?.max !== undefined) n = Math.min(spec.max, n);
      input.value = String(n);
      this.setValue(key, n);
    });
    return input;
  }

  private textControl(key: string, value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tcw-indi-input';
    input.value = value;
    input.addEventListener('change', () => this.setValue(key, input.value));
    return input;
  }

  // --- Style ---

  /** One row per colour the indicator uses: the lines drawn in it, and "up" / "down" for two-tone ones. */
  private renderStyle(section: HTMLElement): void {
    const target = this.target!;
    const names = new Map<number, string[]>();
    const add = (index: number, name: string) => {
      const list = names.get(index) ?? [];
      if (!list.includes(name)) list.push(name);
      names.set(index, list);
    };
    for (const plot of target.plots ?? []) {
      const twoTone = plot.tone !== undefined && plot.downColor !== undefined;
      add(plot.color, twoTone ? `${plot.title} ${this.t('indicatorSettings.up')}` : plot.title);
      if (twoTone) add(plot.downColor!, `${plot.title} ${this.t('indicatorSettings.down')}`);
    }
    for (const [index, labels] of [...names].sort((a, b) => a[0] - b[0])) {
      const color = this.colors[index] ?? this.colors[0] ?? '#4c8dff';
      section.appendChild(this.row(labels.join(' · '), this.colorInput(color, (v) => {
        const next = [...this.colors];
        while (next.length <= index) next.push(next[0] ?? v);
        next[index] = v;
        this.colors = next;
        this.callbacks.onStyle?.(target.instanceId, { colors: [...next] });
      })));
    }
    const width = document.createElement('select');
    width.className = 'tcw-indi-input tcw-indi-select';
    for (const w of LINE_WIDTHS) width.appendChild(this.option(String(w), `${w} px`));
    width.value = String(target.lineWidth ?? 1.5);
    width.addEventListener('change', () => this.callbacks.onStyle?.(target.instanceId, { lineWidths: [Number(width.value)] }));
    section.appendChild(this.row(this.t('indicatorSettings.lineWidth'), width));
  }

  // --- Levels ---

  private renderLevels(section: HTMLElement): void {
    if (this.levels.length === 0) section.appendChild(this.note(this.t('indicatorSettings.noLevels')));
    this.levels.forEach((level, i) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'tcw-indi-input';
      input.value = String(level);
      input.step = 'any';
      input.setAttribute('aria-label', `${this.t('indicatorSettings.tab.levels')} ${i + 1}`);
      input.addEventListener('change', () => {
        const n = Number(input.value);
        if (!Number.isFinite(n) || input.value.trim() === '') return;
        this.levels = this.levels.map((v, j) => (j === i ? n : v));
        this.applyLevels();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tcw-indi-remove';
      remove.innerHTML = createIcon('x', 12);
      const label = this.t('indicatorSettings.removeLevel');
      remove.title = label;
      remove.setAttribute('aria-label', `${label} ${level}`);
      remove.addEventListener('click', () => {
        this.levels = this.levels.filter((_, j) => j !== i);
        this.applyLevels();
        this.renderBody();
      });
      const controls = document.createElement('span');
      controls.className = 'tcw-indi-level';
      controls.append(input, remove);
      section.appendChild(this.row(`#${i + 1}`, controls));
    });
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tcw-reset-link tcw-indi-add';
    addBtn.textContent = `+ ${this.t('indicatorSettings.addLevel')}`;
    addBtn.addEventListener('click', () => {
      const last = this.levels[this.levels.length - 1];
      this.levels = [...this.levels, last === undefined ? 0 : last + 10];
      this.applyLevels();
      this.renderBody();
    });
    section.appendChild(addBtn);
  }

  private applyLevels(): void {
    if (this.target) this.callbacks.onLevels?.(this.target.instanceId, [...this.levels]);
  }

  // --- Reset ---

  private resetTab(): void {
    const target = this.target;
    if (!target) return;
    if (this.tab === 'levels') {
      this.levels = [...(target.defaultLevels ?? [])];
      this.callbacks.onLevels?.(target.instanceId, null);
    } else {
      const reset: Record<string, IndicatorParamValue> = {};
      for (const [key, def] of Object.entries(target.defaults)) reset[key] = def as IndicatorParamValue;
      this.draft = reset;
      this.callbacks.onApply(target.instanceId, { ...reset });
    }
    this.renderBody();
  }

  // --- Pieces ---

  /** A labelled control: clicking the label reaches the control. */
  private row(label: string, control: HTMLElement): HTMLLabelElement {
    const row = document.createElement('label');
    row.className = 'tcw-settings-row';
    const text = document.createElement('span');
    text.className = 'tcw-settings-label';
    text.textContent = label;
    row.append(text, control);
    return row;
  }

  private note(text: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-settings-label';
    el.textContent = text;
    return el;
  }

  private option(value: string, label: string): HTMLOptionElement {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    return opt;
  }

  private colorInput(value: string, onInput: (v: string) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'tcw-indi-color';
    input.value = toHex(value);
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }
}

/** A colour as `#rrggbb` (what a colour input takes); black if unreadable. */
function toHex(color: string): string {
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toLowerCase();
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (!m) return '#000000';
  return `#${[m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)).toString(16).padStart(2, '0')).join('')}`;
}
