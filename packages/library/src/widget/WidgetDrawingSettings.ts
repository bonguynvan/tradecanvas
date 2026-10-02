import type {
  AnchorPoint,
  DrawingLevel,
  DrawingOptionDef,
  DrawingOptionDefs,
  DrawingOptions,
  DrawingStyle,
  DrawingToolType,
} from '@tradecanvas/commons';
import { sanitizeDrawingOptions } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';
import { EN_TRANSLATOR, fill, type MessageKey, type Translator } from './i18n.js';
import { colorAlpha, colorInput, numberInput, selectInput, settingsRow, toHex, toggleSwitch, withAlpha } from './settingsControls.js';
import type { DrawingStyleTemplate } from './DrawingTemplateStore.js';

/** The drawing a settings dialog edits. */
export interface DrawingSettingsTarget {
  id: string;
  type: DrawingToolType;
  /** The tool's name in the widget's language. */
  name: string;
  style: DrawingStyle;
  /** Every option, defaults filled in. */
  options: DrawingOptions;
  defs: DrawingOptionDefs;
  anchors: AnchorPoint[];
  /** Whether the tool fills an area and draws text (which style fields to offer). */
  fill: boolean;
  text: boolean;
  /** Whether an alert can watch it (it has lines the price can cross). */
  alertable?: boolean;
}

export interface DrawingSettingsPatch {
  anchors?: AnchorPoint[];
  style?: Partial<DrawingStyle>;
  options?: DrawingOptions;
}

export interface DrawingSettingsCallbacks {
  /** The dialog opened on a drawing: edits until `onEnd` are one undo step. */
  onBegin: (id: string) => void;
  /** An edit, shown on the chart at once. */
  onChange: (id: string, patch: DrawingSettingsPatch) => void;
  /** OK keeps the edits; Cancel, Escape or the close button put the drawing back. */
  onEnd: (id: string, cancel: boolean) => void;
  /** An anchor's time as the date and time fields show it (the chart's zone), and back. */
  toWallTime: (time: number) => { date: string; time: string };
  fromWallTime: (date: string, time: string) => number | null;
  /** Alert when the price crosses the drawing. */
  onAddAlert?: (id: string) => void;
  /** Make these the options new drawings of the tool start with. */
  onSaveDefault?: (type: DrawingToolType, options: DrawingOptions) => void;
  /** Saved templates: a style, and the tool's options for those saved from it. */
  templates?: {
    list: (type: DrawingToolType) => DrawingStyleTemplate[];
    save: (name: string, style: Partial<DrawingStyle>, tool: { type: DrawingToolType; options: DrawingOptions }) => void;
    remove: (name: string, type?: DrawingToolType) => void;
  };
}

type Tab = 'style' | 'options' | 'coordinates';

/** Most points the Coordinates tab lists. */
const MAX_COORDINATE_ROWS = 12;

const LINE_WIDTHS = [1, 2, 3, 4];
const LINE_STYLES: DrawingStyle['lineStyle'][] = ['solid', 'dashed', 'dotted'];
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32];
/** Most levels the editor offers to add, like the chart keeps. */
const MAX_LEVELS = 48;

let nextDialogId = 1;

/**
 * A drawing's settings: its style (colour, width, line, fill and text where
 * the tool has them, saved templates), the tool's own options (levels,
 * extend left/right…), and its anchors as dates and prices. Edits show on the
 * chart at once; OK keeps them as one undo step, Cancel puts it back.
 */
export class WidgetDrawingSettings {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private tabsEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private footerLeft: HTMLDivElement;
  private tabButtons: HTMLButtonElement[] = [];
  private target: DrawingSettingsTarget | null = null;
  private style!: DrawingStyle;
  private options: DrawingOptions = {};
  private anchors: AnchorPoint[] = [];
  private tab: Tab = 'style';
  private returnFocus: HTMLElement | null = null;
  private readonly uid = nextDialogId++;

  constructor(
    host: HTMLElement,
    private readonly callbacks: DrawingSettingsCallbacks,
    private readonly t: Translator = EN_TRANSLATOR,
  ) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.hidden = true;
    // A press that starts in the dialog (selecting text, say) and ends on the
    // backdrop doesn't close it.
    let pressedBackdrop = false;
    this.backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === this.backdrop;
    });
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop && pressedBackdrop) this.close(true);
      pressedBackdrop = false;
    });

    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal tcw-modal-narrow tcw-drawing-settings';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', `tcw-draw-title-${this.uid}`);
    this.modal.tabIndex = -1;
    this.modal.addEventListener('keydown', (e) => this.onKeyDown(e));

    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    this.titleEl = document.createElement('h3');
    this.titleEl.id = `tcw-draw-title-${this.uid}`;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.close(true));
    header.append(this.titleEl, closeBtn);

    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'tcw-modal-tabs';
    this.tabsEl.setAttribute('role', 'tablist');
    this.tabsEl.addEventListener('keydown', (e) => this.onTabKey(e));

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-modal-body';
    this.bodyEl.id = `tcw-draw-panel-${this.uid}`;
    this.bodyEl.setAttribute('role', 'tabpanel');

    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    this.footerLeft = document.createElement('div');
    this.footerLeft.className = 'tcw-drawing-settings-tools';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'tcw-reset-link';
    cancel.textContent = this.t('common.cancel');
    cancel.addEventListener('click', () => this.close(true));
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'tcw-done-btn';
    ok.textContent = this.t('drawingSettings.ok');
    ok.addEventListener('click', () => this.close(false));
    footer.append(this.footerLeft, cancel, ok);

    this.modal.append(header, this.tabsEl, this.bodyEl, footer);
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  open(target: DrawingSettingsTarget): void {
    if (this.target) this.close(false);
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.target = target;
    this.style = { ...target.style };
    this.options = structuredClone(target.options);
    this.anchors = target.anchors.map((a) => ({ ...a }));
    this.titleEl.textContent = target.name;
    this.tab = 'style';
    this.callbacks.onBegin(target.id);
    try {
      this.renderTabs();
      this.renderBody();
    } catch (err) {
      // A drawing the dialog can't show: end the edit it began.
      this.target = null;
      this.callbacks.onEnd(target.id, true);
      throw err;
    }
    this.backdrop.hidden = false;
    (this.tabButtons[0] ?? this.modal).focus();
  }

  /** Close the dialog, keeping the edits or (with `cancel`) putting the drawing back. */
  close(cancel: boolean): void {
    const target = this.target;
    if (!target) return;
    // A value typed but not yet committed still applies on OK.
    const active = document.activeElement;
    if (!cancel && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) && this.modal.contains(active)) {
      active.dispatchEvent(new Event('change'));
    }
    this.target = null;
    this.backdrop.hidden = true;
    this.callbacks.onEnd(target.id, cancel);
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  isOpen(): boolean {
    return this.target !== null;
  }

  /** The drawing being edited, if any. */
  editing(): string | null {
    return this.target?.id ?? null;
  }

  destroy(): void {
    this.close(true);
    this.backdrop.remove();
  }

  // --- Tabs ---

  private tabs(): Tab[] {
    const out: Tab[] = ['style'];
    if (this.target && Object.keys(this.target.defs).length > 0) out.push('options');
    // A freehand stroke has hundreds of points: no table of them.
    if (this.target && this.target.anchors.length <= MAX_COORDINATE_ROWS) out.push('coordinates');
    return out;
  }

  private renderTabs(): void {
    this.tabButtons = this.tabs().map((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-modal-tab';
      btn.id = `tcw-draw-tab-${this.uid}-${tab}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', this.bodyEl.id);
      btn.dataset.tab = tab;
      btn.textContent = this.t(`drawingSettings.tab.${tab}`);
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

  private onTabKey(e: KeyboardEvent): void {
    const tabs = this.tabButtons.map((b) => b.dataset.tab as Tab);
    const at = tabs.indexOf(this.tab);
    const next = e.key === 'ArrowRight' ? (at + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (at - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    this.selectTab(tabs[next], true);
  }

  /** Escape cancels; Tab stays inside the dialog. */
  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close(true);
      return;
    }
    keepTabInside(e, this.modal);
  }

  private renderBody(): void {
    this.bodyEl.replaceChildren();
    this.footerLeft.replaceChildren();
    if (!this.target) return;
    if (this.target.alertable && this.callbacks.onAddAlert) {
      const alert = document.createElement('button');
      alert.type = 'button';
      alert.className = 'tcw-reset-link tcw-drawing-alert';
      alert.innerHTML = `${createIcon('bell', 13)}<span></span>`;
      alert.querySelector('span')!.textContent = this.t('drawingSettings.addAlert');
      alert.addEventListener('click', () => this.callbacks.onAddAlert?.(this.target!.id));
      this.footerLeft.appendChild(alert);
    }
    const section = document.createElement('div');
    section.className = 'tcw-settings-section';
    if (this.tab === 'options') this.renderOptions(section);
    else if (this.tab === 'coordinates') this.renderCoordinates(section);
    else this.renderStyle(section);
    this.bodyEl.appendChild(section);
  }

  private change(patch: DrawingSettingsPatch): void {
    if (this.target) this.callbacks.onChange(this.target.id, patch);
  }

  private setStyle(style: Partial<DrawingStyle>): void {
    this.style = { ...this.style, ...style };
    this.change({ style });
  }

  private setOptions(options: DrawingOptions): void {
    this.options = { ...this.options, ...structuredClone(options) };
    this.change({ options });
  }

  // --- Style ---

  private renderStyle(section: HTMLElement): void {
    const target = this.target!;
    section.appendChild(settingsRow(this.t('drawingSettings.color'), colorInput(this.style.color, (color) => this.setStyle({ color }))));
    section.appendChild(settingsRow(this.t('drawingSettings.lineWidth'), selectInput(
      LINE_WIDTHS.map((w) => ({ value: String(w), label: `${w} px` })),
      String(this.style.lineWidth),
      (v) => this.setStyle({ lineWidth: Number(v) }),
    )));
    section.appendChild(settingsRow(this.t('drawingSettings.lineStyle'), selectInput(
      LINE_STYLES.map((s) => ({ value: s, label: this.t(`drawingSettings.lineStyle.${s}`) })),
      this.style.lineStyle,
      (v) => this.setStyle({ lineStyle: v as DrawingStyle['lineStyle'] }),
    )));
    if (target.fill) this.renderFill(section);
    if (target.text) this.renderText(section);
    if (this.callbacks.templates) this.renderTemplates(section);
  }

  private renderFill(section: HTMLElement): void {
    const current = this.style.fillColor ?? withAlpha(this.style.color, 0.1);
    let hex = toHex(current);
    let alpha = colorAlpha(current);
    const apply = () => this.setStyle({ fillColor: withAlpha(hex, alpha), fillOpacity: alpha });
    section.appendChild(settingsRow(this.t('drawingSettings.fill'), colorInput(hex, (v) => {
      hex = v;
      apply();
    })));
    section.appendChild(settingsRow(this.t('drawingSettings.opacity'), numberInput(Math.round(alpha * 100), { min: 0, max: 100, step: 5 }, (v) => {
      alpha = v / 100;
      apply();
    })));
  }

  private renderText(section: HTMLElement): void {
    const text = document.createElement('textarea');
    text.className = 'tcw-indi-input tcw-drawing-text';
    text.rows = 3;
    text.value = this.style.text ?? '';
    text.addEventListener('input', () => this.setStyle({ text: text.value }));
    section.appendChild(settingsRow(this.t('drawingSettings.text'), text));
    section.appendChild(settingsRow(this.t('drawingSettings.fontSize'), selectInput(
      FONT_SIZES.map((s) => ({ value: String(s), label: `${s} px` })),
      String(this.style.fontSize ?? 12),
      (v) => this.setStyle({ fontSize: Number(v) }),
    )));
  }

  private renderTemplates(section: HTMLElement): void {
    const store = this.callbacks.templates!;
    const target = this.target!;
    const head = document.createElement('div');
    head.className = 'tcw-style-subhead';
    head.textContent = this.t('drawingStyle.templates');
    section.appendChild(head);

    const list = document.createElement('div');
    list.className = 'tcw-drawing-templates';
    const templates = store.list(target.type);
    if (templates.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-settings-label';
      empty.textContent = this.t('drawingStyle.noTemplates');
      list.appendChild(empty);
    }
    for (const template of templates) {
      const row = document.createElement('div');
      row.className = 'tcw-style-tmpl';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'tcw-style-tmpl-apply';
      apply.textContent = template.name;
      apply.addEventListener('click', () => {
        this.setStyle(template.style);
        // Templates come from storage: only options the tool takes apply.
        if (template.options) this.setOptions(sanitizeDrawingOptions(target.defs, template.options));
        this.renderBody();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tcw-style-tmpl-del';
      remove.setAttribute('aria-label', this.t('drawingStyle.deleteTemplate'));
      remove.innerHTML = createIcon('x', 12);
      remove.addEventListener('click', () => {
        store.remove(template.name, template.type);
        this.renderBody();
      });
      row.append(apply, remove);
      list.appendChild(row);
    }
    section.appendChild(list);

    const saveRow = document.createElement('div');
    saveRow.className = 'tcw-style-save';
    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'tcw-style-name';
    name.placeholder = this.t('drawingStyle.templateName');
    name.setAttribute('aria-label', this.t('drawingStyle.templateName'));
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'tcw-style-savebtn';
    save.textContent = this.t('common.save');
    save.addEventListener('click', () => {
      if (!name.value.trim()) return;
      store.save(name.value, this.style, { type: target.type, options: this.options });
      this.renderBody();
    });
    saveRow.append(name, save);
    section.appendChild(saveRow);
  }

  // --- Tool options ---

  /** A label from the widget's strings (`drawingOption.<key>`), else the tool's own. */
  private label(key: string, fallback: string): string {
    const messageKey = `drawingOption.${key}` as MessageKey;
    const text = this.t(messageKey);
    return text === messageKey ? fallback : text;
  }

  private renderOptions(section: HTMLElement): void {
    const target = this.target!;
    for (const [key, def] of Object.entries(target.defs)) {
      if (def.kind === 'levels') section.appendChild(this.levelsEditor(key, def));
      else section.appendChild(settingsRow(this.label(key, def.label), this.optionControl(key, def)));
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'tcw-reset-link';
    reset.textContent = this.t('settings.resetToDefaults');
    reset.addEventListener('click', () => {
      const defaults: DrawingOptions = {};
      for (const [key, def] of Object.entries(target.defs)) defaults[key] = structuredClone(def.default) as DrawingOptions[string];
      this.setOptions(defaults);
      this.renderBody();
    });
    this.footerLeft.appendChild(reset);
    if (this.callbacks.onSaveDefault) {
      const saveDefault = document.createElement('button');
      saveDefault.type = 'button';
      saveDefault.className = 'tcw-reset-link';
      saveDefault.textContent = this.t('drawingSettings.saveDefault');
      saveDefault.addEventListener('click', () => this.callbacks.onSaveDefault?.(target.type, structuredClone(this.options)));
      this.footerLeft.appendChild(saveDefault);
    }
  }

  private optionControl(key: string, def: Exclude<DrawingOptionDef, { kind: 'levels' }>): HTMLElement {
    const value = this.options[key];
    switch (def.kind) {
      case 'boolean':
        return toggleSwitch(Boolean(value), (v) => this.setOptions({ [key]: v }));
      case 'number':
        return numberInput(Number(value), { min: def.min, max: def.max, step: def.step }, (v) => this.setOptions({ [key]: v }));
      case 'choice':
        return selectInput(
          def.choices.map((c) => ({ value: c.value, label: this.label(`${key}.${c.value}`, c.label) })),
          String(value),
          (v) => this.setOptions({ [key]: v }),
        );
      case 'text': {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tcw-indi-input';
        input.value = String(value ?? '');
        input.addEventListener('change', () => this.setOptions({ [key]: input.value }));
        return input;
      }
    }
  }

  /** One row per level: shown or not, its ratio, its colour, remove; and a button to add one. */
  private levelsEditor(key: string, def: Extract<DrawingOptionDef, { kind: 'levels' }>): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'tcw-levels-editor';
    const head = document.createElement('div');
    head.className = 'tcw-style-subhead';
    head.textContent = this.label(key, def.label);
    wrap.appendChild(head);

    const levels = (): DrawingLevel[] => {
      const value = this.options[key];
      return Array.isArray(value) ? (value as DrawingLevel[]) : [];
    };
    const commit = (next: DrawingLevel[]) => this.setOptions({ [key]: next });
    const grid = document.createElement('div');
    grid.className = 'tcw-levels-grid';
    levels().forEach((level, index) => {
      const row = document.createElement('div');
      row.className = 'tcw-level-row';
      const visible = document.createElement('input');
      visible.type = 'checkbox';
      visible.checked = level.visible;
      const nth = ` ${index + 1}`; // rows share labels; the number tells them apart
      visible.setAttribute('aria-label', this.t('drawingSettings.levelVisible') + nth);
      visible.addEventListener('change', () => commit(levels().map((l, i) => (i === index ? { ...l, visible: visible.checked } : l))));
      const value = numberInput(level.value, { step: 0.001 }, (v) => commit(levels().map((l, i) => (i === index ? { ...l, value: v } : l))));
      value.setAttribute('aria-label', this.t('drawingSettings.levelValue') + nth);
      const color = colorInput(level.color ?? this.style.color, (v) => commit(levels().map((l, i) => (i === index ? { ...l, color: v } : l))));
      color.setAttribute('aria-label', this.t('drawingSettings.levelColor') + nth);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tcw-level-remove';
      remove.setAttribute('aria-label', this.t('drawingSettings.removeLevel') + nth);
      remove.innerHTML = createIcon('x', 12);
      remove.addEventListener('click', () => {
        commit(levels().filter((_, i) => i !== index));
        this.renderBody();
      });
      row.append(visible, value, color, remove);
      grid.appendChild(row);
    });
    wrap.appendChild(grid);

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'tcw-reset-link tcw-level-add';
    add.textContent = this.t('drawingSettings.addLevel');
    add.disabled = levels().length >= MAX_LEVELS;
    add.addEventListener('click', () => {
      const last = levels().at(-1)?.value ?? 0;
      commit([...levels(), { value: Math.round((last + 0.5) * 1000) / 1000, visible: true }]);
      this.renderBody();
    });
    wrap.appendChild(add);
    return wrap;
  }

  // --- Coordinates ---

  private renderCoordinates(section: HTMLElement): void {
    this.anchors.forEach((anchor, index) => {
      const head = document.createElement('div');
      head.className = 'tcw-style-subhead';
      head.textContent = fill(this.t('drawingSettings.point'), { n: index + 1 });
      section.appendChild(head);

      const wall = this.callbacks.toWallTime(anchor.time);
      const date = document.createElement('input');
      date.type = 'date';
      date.className = 'tcw-indi-input';
      date.value = wall.date;
      const time = document.createElement('input');
      time.type = 'time';
      time.className = 'tcw-indi-input';
      time.value = wall.time;
      const onTime = () => {
        const t = this.callbacks.fromWallTime(date.value, time.value);
        if (t === null) return;
        this.setAnchor(index, { time: t });
      };
      date.addEventListener('change', onTime);
      time.addEventListener('change', onTime);
      section.appendChild(settingsRow(this.t('drawingSettings.date'), date));
      section.appendChild(settingsRow(this.t('drawingSettings.time'), time));
      section.appendChild(settingsRow(this.t('drawingSettings.price'), numberInput(anchor.price, { step: 'any' }, (price) => this.setAnchor(index, { price }))));
    });
  }

  private setAnchor(index: number, patch: Partial<AnchorPoint>): void {
    this.anchors = this.anchors.map((a, i) => (i === index ? { ...a, ...patch } : a));
    this.change({ anchors: this.anchors.map((a) => ({ ...a })) });
  }
}
