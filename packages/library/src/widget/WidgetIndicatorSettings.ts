import type { IndicatorInputSpec, IndicatorIntervals, IndicatorPlot, IndicatorPlotStyle, IndicatorStyleConfig } from '@tradecanvas/commons';
import { PRICE_SOURCES, parseIndicatorSource } from '@tradecanvas/commons';
import { isSeriesPalette } from '@tradecanvas/core';
import { FOCUSABLE, keepTabInside } from './focusTrap.js';
import { createIcon } from './icons.js';
import { EN_MESSAGES, type Translator } from './i18n.js';
import { WidgetContextMenu } from './WidgetContextMenu.js';
import { colorInput, numberInput, settingsRow, toggleSwitch } from './settingsControls.js';
import { renderStyleTab, renderVisibilityTab } from './indicatorSettingsTabs.js';

export type IndicatorParamValue = number | string | boolean;

export interface IndicatorSettingsTarget {
  instanceId: string;
  /** The kind of indicator (`'rsi'`): what "Save as default" is for. */
  indicatorId: string;
  name: string;
  /** Default config — defines the editable keys and their types. */
  defaults: Record<string, unknown>;
  /** Current values, overlaid on defaults. */
  params: Record<string, unknown>;
  /** How parameters are edited (the descriptor's `inputs`). */
  inputs?: Readonly<Record<string, IndicatorInputSpec>>;
  /** Other indicators' lines a source can be: value `ind:<instanceId>:<key>`. */
  lineSources?: readonly { value: string; label: string }[];
  /** What it draws; with `colors`, the lines of the Style tab. */
  plots?: readonly IndicatorPlot[];
  colors?: readonly string[];
  lineWidth?: number;
  /** Each line's own dash and visibility, by its key. */
  plotStyles?: Readonly<Record<string, IndicatorPlotStyle>>;
  /** Its levels and its indicator's defaults; with them, the levels under the lines. */
  levels?: readonly number[];
  defaultLevels?: readonly number[];
  /** Whether `levels` are the instance's own; not: its indicator's defaults, which Cancel leaves it on. */
  ownLevels?: boolean;
  /** The price scale an overlay is on; set only for price-pane overlays. */
  scale?: 'right' | 'left';
  /** The intervals it shows on; unset or null: all of them. */
  intervals?: IndicatorIntervals | null;
}

/** What "Save as default" keeps: new indicators of the kind start with it. */
export interface IndicatorDefault {
  params: Record<string, IndicatorParamValue>;
  style: IndicatorStyleConfig;
}

export interface IndicatorSettingsCallbacks {
  onApply: (instanceId: string, params: Record<string, IndicatorParamValue>) => void;
  onStyle?: (instanceId: string, style: IndicatorStyleConfig) => void;
  /** `null` restores the indicator's default levels. */
  onLevels?: (instanceId: string, levels: number[] | null) => void;
  /** Move an overlay to the left price scale or back to the price scale. */
  onScale?: (instanceId: string, scale: 'right' | 'left') => void;
  /** The intervals it shows on (`null`: all); with it, the Visibility tab. */
  onIntervals?: (instanceId: string, intervals: IndicatorIntervals | null) => void;
  /** "Save as default" in the Defaults menu. */
  onSaveDefault?: (indicatorId: string, saved: IndicatorDefault) => void;
  onClose: () => void;
}

type Tab = 'inputs' | 'style' | 'visibility';

/** What the dialog changes besides the inputs: as it was on opening, and as it is. */
interface Look {
  colors: string[];
  lineWidth: number;
  plots: Record<string, IndicatorPlotStyle>;
  levels: number[];
  scale?: 'right' | 'left';
  intervals: IndicatorIntervals | null;
}

/** Ids for the dialog's labelling (several widgets may share a page). */
let nextDialogId = 1;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DEFAULT_LINE_WIDTH = 1.5;
/** A line as it is with no style of its own. */
const PLAIN_PLOT: IndicatorPlotStyle = { visible: true, lineStyle: 'solid' };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** A copy of plain values (numbers, strings, flags, lists of them). */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function titleCase(key: string): string {
  // camelCase / snake_case → "Title Case"
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/** Each line put back as `to` has it; one `to` has no style for goes back to plain. */
function plotsBack(from: Record<string, IndicatorPlotStyle>, to: Record<string, IndicatorPlotStyle>): Record<string, IndicatorPlotStyle> {
  return Object.fromEntries([...new Set([...Object.keys(from), ...Object.keys(to)])].map((key) => [key, { ...PLAIN_PLOT, ...to[key] }]));
}

/**
 * Per-indicator settings: its inputs; its style (each line shown or not, its
 * colours and dash, the line width, the scale, the levels); and the
 * intervals it shows on. Every edit shows at once; Cancel (or Escape) puts
 * it all back as it was, Ok keeps it. The Defaults menu resets it, or keeps
 * it for the next ones of its kind.
 */
export class WidgetIndicatorSettings {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private tabsEl: HTMLDivElement;
  private defaultsBtn: HTMLButtonElement;
  private menu: WidgetContextMenu | null = null;
  private callbacks: IndicatorSettingsCallbacks;
  private target: IndicatorSettingsTarget | null = null;
  private draft: Record<string, IndicatorParamValue> = {};
  private initial: { params: Record<string, IndicatorParamValue>; look: Look } | null = null;
  private look: Look = { colors: [], lineWidth: DEFAULT_LINE_WIDTH, plots: {}, levels: [], intervals: null };
  private tab: Tab = 'inputs';
  private tabButtons: HTMLButtonElement[] = [];
  private returnFocus: HTMLElement | null = null;
  private readonly uid = nextDialogId++;
  private readonly t: Translator;

  constructor(host: HTMLElement, callbacks: IndicatorSettingsCallbacks, t?: Translator) {
    this.callbacks = callbacks;
    this.t = t ?? ((key) => EN_MESSAGES[key]);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    // A press that starts in the dialog (a slider dragged, text selected) and ends on the backdrop doesn't cancel it.
    let pressedBackdrop = false;
    this.backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === this.backdrop;
    });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && pressedBackdrop) this.finish(false);
      pressedBackdrop = false;
    });

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-modal-narrow tcw-indi';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', `tcw-indi-title-${this.uid}`);
    // Focusable, so keys still reach it after a click on its blank parts.
    this.modal.tabIndex = -1;
    this.modal.addEventListener('keydown', (e) => this.onKeyDown(e));

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    this.titleEl = document.createElement('h3');
    this.titleEl.id = `tcw-indi-title-${this.uid}`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('indicatorSettings.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.finish(false));
    header.append(this.titleEl, closeBtn);

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'tcw-modal-tabs';
    this.tabsEl.setAttribute('role', 'tablist');
    this.tabsEl.addEventListener('keydown', (e) => this.onTabKey(e));

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-modal-body';
    this.bodyEl.id = `tcw-indi-panel-${this.uid}`;
    this.bodyEl.setAttribute('role', 'tabpanel');

    this.defaultsBtn = this.footerButton('defaults', 'tcw-footer-menu', () => this.openDefaults());
    this.modal.append(header, this.tabsEl, this.bodyEl, this.buildFooter());
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  /** The Defaults menu on the left; Cancel and OK on the right. */
  private buildFooter(): HTMLDivElement {
    this.defaultsBtn.setAttribute('aria-haspopup', 'menu');
    this.defaultsBtn.setAttribute('aria-expanded', 'false');
    this.defaultsBtn.innerHTML = `<span></span>${createIcon('chevronDown', 12)}`;
    this.defaultsBtn.querySelector('span')!.textContent = this.t('indicatorSettings.defaults');
    const end = document.createElement('div');
    end.className = 'tcw-footer-end';
    end.append(
      this.footerButton('cancel', 'tcw-footer-cancel', () => this.finish(false), this.t('common.cancel')),
      this.footerButton('ok', 'tcw-done-btn', () => this.finish(true), this.t('drawingSettings.ok')),
    );
    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    footer.append(this.defaultsBtn, end);
    return footer;
  }

  open(target: IndicatorSettingsTarget): void {
    if (this.target) this.finish(true);
    if (this.backdrop.hidden) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.target = target;
    this.titleEl.textContent = this.t('indicatorSettings.title').replace('{name}', target.name);
    this.draft = {};
    this.look = {
      colors: [...(target.colors ?? [])],
      lineWidth: target.lineWidth ?? DEFAULT_LINE_WIDTH,
      plots: Object.fromEntries(Object.entries(target.plotStyles ?? {}).map(([key, plot]) => [key, { ...plot }])),
      levels: [...(target.levels ?? [])],
      scale: target.scale,
      intervals: target.intervals ?? null,
    };
    this.initial = { params: this.currentParams(), look: copy(this.look) };
    this.tab = 'inputs';
    this.renderTabs();
    this.renderBody();
    this.backdrop.hidden = false;
    // Start on the first input, else the tabs, else the dialog itself.
    const firstTab = this.tabsEl.hidden ? null : this.tabButtons[0] ?? null;
    (this.bodyEl.querySelector<HTMLElement>(FOCUSABLE) ?? firstTab ?? this.modal).focus();
  }

  /** Close, keeping what was changed (as Ok does). */
  close(): void {
    this.finish(true);
  }

  isOpen(): boolean {
    return !this.backdrop.hidden;
  }

  destroy(): void {
    this.menu?.destroy();
    this.backdrop.remove();
  }

  /** Close with Ok (`keep`: a value still being typed applies) or Cancel (everything goes back). */
  private finish(keep: boolean): void {
    if (!this.target) return;
    if (keep) {
      const active = document.activeElement;
      if ((active instanceof HTMLInputElement || active instanceof HTMLSelectElement) && this.modal.contains(active)) {
        active.dispatchEvent(new Event('change'));
      }
    } else {
      this.revert();
    }
    // No target: a field's change on its way out (its blur) no longer applies.
    this.target = null;
    this.menu?.close();
    this.backdrop.hidden = true;
    this.callbacks.onClose();
    // Back to where the dialog was opened from (a legend row, the object tree).
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  /** Everything as it was on opening: only what changed is sent back. */
  private revert(): void {
    const target = this.target;
    const initial = this.initial;
    if (!target || !initial) return;
    const id = target.instanceId;
    if (!same(this.currentParams(), initial.params)) this.callbacks.onApply(id, { ...initial.params });
    const was = initial.look;
    const style: IndicatorStyleConfig = {};
    if (!same(this.look.colors, was.colors)) style.colors = [...was.colors];
    if (this.look.lineWidth !== was.lineWidth) style.lineWidths = [was.lineWidth];
    if (!same(this.look.plots, was.plots)) style.plots = plotsBack(this.look.plots, was.plots);
    if (Object.keys(style).length > 0) this.callbacks.onStyle?.(id, style);
    if (!same(this.look.levels, was.levels)) this.callbacks.onLevels?.(id, target.ownLevels ? [...was.levels] : null);
    if (this.look.scale !== was.scale && was.scale) this.callbacks.onScale?.(id, was.scale);
    if (!same(this.look.intervals, was.intervals)) this.callbacks.onIntervals?.(id, was.intervals);
  }

  private currentParams(): Record<string, IndicatorParamValue> {
    const target = this.target;
    if (!target) return {};
    return { ...target.defaults, ...target.params, ...this.draft } as Record<string, IndicatorParamValue>;
  }

  // --- Tabs ---

  private tabs(): Tab[] {
    const target = this.target;
    if (!target) return [];
    const lines = !!(target.plots?.length && target.colors && this.callbacks.onStyle);
    const levels = !!(target.levels && this.callbacks.onLevels);
    return [
      'inputs',
      ...(lines || levels ? ['style' as const] : []),
      ...(this.callbacks.onIntervals ? ['visibility' as const] : []),
    ];
  }

  /** The tab buttons for this indicator; built on open, then only marked (focus stays put). */
  private renderTabs(): void {
    const tabs = this.tabs();
    this.tabsEl.hidden = tabs.length < 2;
    this.tabButtons = tabs.map((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-modal-tab';
      btn.id = `tcw-indi-tab-${this.uid}-${tab}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', this.bodyEl.id);
      btn.dataset.tab = tab;
      btn.textContent = this.t(`indicatorSettings.tab.${tab}`);
      btn.addEventListener('click', () => this.selectTab(tab));
      return btn;
    });
    this.tabsEl.replaceChildren(...this.tabButtons);
    this.markTabs();
  }

  private markTabs(): void {
    for (const btn of this.tabButtons) {
      const selected = btn.dataset.tab === this.tab;
      btn.classList.toggle('tcw-active', selected);
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
      if (selected) this.bodyEl.setAttribute('aria-labelledby', btn.id);
    }
  }

  private selectTab(tab: Tab, focus = false): void {
    this.tab = tab;
    this.markTabs();
    this.renderBody();
    if (focus) this.tabButtons.find((b) => b.dataset.tab === tab)?.focus();
  }

  /** Arrow keys (the other way right to left), Home and End move between tabs. */
  private onTabKey(e: KeyboardEvent): void {
    const tabs = this.tabButtons.map((b) => b.dataset.tab as Tab);
    const at = tabs.indexOf(this.tab);
    const rtl = this.modal.closest('[dir]')?.getAttribute('dir') === 'rtl';
    const [forward, back] = rtl ? ['ArrowLeft', 'ArrowRight'] : ['ArrowRight', 'ArrowLeft'];
    const next = e.key === forward ? (at + 1) % tabs.length
      : e.key === back ? (at - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : -1;
    if (next < 0 || tabs.length === 0) return;
    e.preventDefault();
    this.selectTab(tabs[next], true);
  }

  /** Escape cancels; Tab stays inside the dialog. */
  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.finish(false);
      return;
    }
    keepTabInside(e, this.modal);
  }

  private renderBody(): void {
    this.bodyEl.replaceChildren();
    const target = this.target;
    if (!target) return;
    if (this.tab === 'style') this.renderStyle(target);
    else if (this.tab === 'visibility') renderVisibilityTab(this.bodyEl, this.look.intervals, (next) => this.setIntervals(next), this.t);
    else this.renderInputs();
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

  private renderInputs(): void {
    const section = document.createElement('div');
    section.className = 'tcw-settings-section';
    const keys = Object.keys(this.target!.defaults);
    if (keys.length === 0) section.appendChild(this.note(this.t('indicatorSettings.noInputs')));
    for (const key of keys) section.appendChild(this.fieldRow(key));
    this.bodyEl.appendChild(section);
  }

  private fieldRow(key: string): HTMLLabelElement {
    const spec = this.target?.inputs?.[key];
    const value = this.currentValue(key);
    const defType = typeof (this.target?.defaults[key] ?? value);
    let control: HTMLElement;
    if (spec?.source) control = this.sourceControl(key, String(value ?? 'close'));
    else if (spec?.options) control = this.choiceControl(key, spec.options, value);
    else if (defType === 'boolean') control = toggleSwitch(Boolean(value), (v) => this.setValue(key, v));
    else if (defType === 'number') {
      const n = Number(value);
      // Integer-looking defaults step by 1; fractional defaults step by 0.1.
      control = numberInput(n, { min: spec?.min, max: spec?.max, step: spec?.step ?? (Number.isInteger(n) ? 1 : 0.1) }, (v) => this.setValue(key, v));
    } else if (typeof value === 'string' && HEX_RE.test(value)) control = colorInput(value, (v) => this.setValue(key, v));
    else control = this.textControl(key, String(value ?? ''));
    return settingsRow(spec?.label ?? titleCase(key), control);
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

  private textControl(key: string, value: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tcw-indi-input';
    input.value = value;
    input.addEventListener('change', () => this.setValue(key, input.value));
    return input;
  }

  // --- Style and visibility ---

  private renderStyle(target: IndicatorSettingsTarget): void {
    const id = target.instanceId;
    // Once closed, nothing: a field's change on its way out (its blur after a Cancel) no longer applies.
    const open = () => this.target === target;
    const onStyle = (style: IndicatorStyleConfig) => open() && this.callbacks.onStyle?.(id, style);
    const onLevels = (levels: number[]) => open() && this.callbacks.onLevels?.(id, levels);
    const onScale = (scale: 'right' | 'left') => open() && this.callbacks.onScale?.(id, scale);
    renderStyleTab(this.bodyEl, {
      plots: target.colors && this.callbacks.onStyle ? target.plots ?? [] : [],
      colors: this.look.colors,
      plotStyles: this.look.plots,
      lineWidth: this.look.lineWidth,
      scale: target.scale && this.callbacks.onScale ? this.look.scale : undefined,
      levels: target.levels && this.callbacks.onLevels ? this.look.levels : undefined,
    }, {
      color: (index, value) => {
        if (!open()) return;
        const next = [...this.look.colors];
        while (next.length <= index) next.push(next[0] ?? value);
        next[index] = value;
        this.look.colors = next;
        onStyle({ colors: [...next] });
      },
      plot: (key, patch) => {
        if (!open()) return;
        this.look.plots = { ...this.look.plots, [key]: { ...this.look.plots[key], ...patch } };
        onStyle({ plots: { [key]: patch } });
      },
      lineWidth: (width) => {
        if (!open()) return;
        this.look.lineWidth = width;
        onStyle({ lineWidths: [width] });
      },
      scale: (scale) => {
        if (!open()) return;
        this.look.scale = scale;
        onScale(scale);
      },
      levels: (levels) => {
        if (!open()) return;
        this.look.levels = levels;
        onLevels([...levels]);
      },
    }, this.t, this.uid);
  }

  private setIntervals(intervals: IndicatorIntervals | null): void {
    if (!this.target) return;
    this.look.intervals = intervals;
    this.callbacks.onIntervals?.(this.target.instanceId, intervals);
  }

  // --- Defaults ---

  private openDefaults(): void {
    if (this.menu?.isOpen()) {
      this.menu.close();
      return;
    }
    this.menu ??= new WidgetContextMenu(this.modal, this.t('indicatorSettings.defaults'));
    const at = this.defaultsBtn.getBoundingClientRect();
    const box = this.modal.getBoundingClientRect();
    const entries = [
      { id: 'reset', label: this.t('indicatorSettings.resetSettings'), icon: 'reset' },
      ...(this.callbacks.onSaveDefault ? [{ id: 'save', label: this.t('indicatorSettings.saveAsDefault'), icon: 'save' }] : []),
    ];
    // From the button's top: in the footer there is no room below, so it opens above the button.
    this.menu.open(entries, at.left - box.left, at.top - box.top, (pick) => {
      if (pick === 'reset') this.resetAll();
      else this.saveDefault();
    }, this.defaultsBtn);
  }

  /** The inputs, the lines' own styles, the levels and the intervals back to the indicator's own. */
  private resetAll(): void {
    const target = this.target;
    if (!target) return;
    const id = target.instanceId;
    const params = { ...target.defaults } as Record<string, IndicatorParamValue>;
    this.draft = { ...params };
    this.callbacks.onApply(id, { ...params });
    if (Object.keys(this.look.plots).length > 0) {
      this.callbacks.onStyle?.(id, { plots: plotsBack(this.look.plots, {}) });
      this.look.plots = {};
    }
    if (target.levels && this.callbacks.onLevels) {
      this.callbacks.onLevels(id, null);
      this.look.levels = [...(target.defaultLevels ?? [])];
    }
    if (this.look.intervals) this.setIntervals(null);
    this.renderBody();
  }

  /**
   * Keep what was chosen for the next ones of the kind: the inputs that differ
   * from the indicator's own (not a line of another indicator, which the next
   * one won't have), and of the look only what someone picked. Colours the
   * chart gave stay its to give, so a second one still gets a colour of its own.
   */
  private saveDefault(): void {
    const target = this.target;
    if (!target) return;
    const params = Object.fromEntries(Object.entries(this.currentParams()).filter(([key, value]) =>
      !same(value, target.defaults[key]) && !(typeof value === 'string' && parseIndicatorSource(value)))) as Record<string, IndicatorParamValue>;
    const style: IndicatorStyleConfig = {};
    if (!isSeriesPalette(this.look.colors)) style.colors = [...this.look.colors];
    if (this.look.lineWidth !== DEFAULT_LINE_WIDTH) style.lineWidths = [this.look.lineWidth];
    if (Object.keys(this.look.plots).length > 0) style.plots = copy(this.look.plots);
    this.callbacks.onSaveDefault?.(target.indicatorId, { params, style });
  }

  // --- Pieces ---

  private footerButton(act: string, className: string, onClick: () => void, text?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.dataset.act = act;
    if (text) btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
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
}
