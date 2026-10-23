import type {
  AnchorPoint,
  DrawingOptionDefs,
  DrawingOptions,
  DrawingStyle,
  DrawingToolType,
  IndicatorIntervals,
} from '@tradecanvas/commons';
import { sanitizeDrawingOptions } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { keepTabInside } from './focusTrap.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import type { DrawingStyleTemplate } from './DrawingTemplateStore.js';
import { renderCoordinatesTab, renderStyleTab, renderTextTab } from './drawingSettingsTabs.js';
import { renderVisibilityTab } from './indicatorSettingsTabs.js';

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
  /** Whether the tool fills an area and draws text (the Fill row, the Text tab). */
  fill: boolean;
  text: boolean;
  /** The intervals it shows on; unset or null: all of them. */
  intervals?: IndicatorIntervals | null;
}

export interface DrawingSettingsPatch {
  anchors?: AnchorPoint[];
  style?: Partial<DrawingStyle>;
  options?: DrawingOptions;
  /** Null: every interval. */
  intervals?: IndicatorIntervals | null;
}

/** A drawing's look as a template keeps it: its style, and its tool's options. */
export interface DrawingTemplateLook {
  type: DrawingToolType;
  style: Partial<DrawingStyle>;
  options: DrawingOptions;
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
  /** A price on the market's grid; the Coordinates tab shows and takes prices on it. */
  roundPrice?: (price: number) => number;
  /** The market's smallest price step, for the price fields' arrows. */
  priceStep?: () => number;
  /** Make these the options new drawings of the tool start with. */
  onSaveDefault?: (type: DrawingToolType, options: DrawingOptions) => void;
  /** Saved templates: listed and deleted in the Template menu, and "Save as template…" (which asks for a name). */
  templates?: {
    list: (type: DrawingToolType) => DrawingStyleTemplate[];
    save: (look: DrawingTemplateLook) => void;
    remove: (name: string, type?: DrawingToolType) => void;
  };
}

type Tab = 'style' | 'text' | 'coordinates' | 'visibility';

/** Most points the Coordinates tab lists. */
const MAX_COORDINATE_ROWS = 12;
/** A saved template's entry in the Template menu, by its place in the list. */
const TEMPLATE_ID = 't:';

let nextDialogId = 1;

/**
 * A drawing's settings, in tabs: Style (the line, its ends, the fill, the
 * tool's own switches and levels), Text, Coordinates (its points by price,
 * date and time) and Visibility (the intervals it shows on). Edits show on
 * the chart at once; OK keeps them as one undo step, Cancel puts it back.
 * The Template menu applies, saves and deletes templates, keeps the options
 * as the tool's default, or resets them.
 */
export class WidgetDrawingSettings {
  private backdrop: HTMLDivElement;
  private modal: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private tabsEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private templateBtn: HTMLButtonElement;
  private menu: WidgetContextMenu | null = null;
  private tabButtons: HTMLButtonElement[] = [];
  private target: DrawingSettingsTarget | null = null;
  private style!: DrawingStyle;
  private options: DrawingOptions = {};
  private anchors: AnchorPoint[] = [];
  private intervals: IndicatorIntervals | null = null;
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

    this.templateBtn = this.footerButton('template', 'tcw-footer-menu', () => this.openTemplates());
    this.modal.append(header, this.tabsEl, this.bodyEl, this.buildFooter());
    this.backdrop.appendChild(this.modal);
    host.appendChild(this.backdrop);
  }

  /** Template on the left; Cancel and OK on the right. */
  private buildFooter(): HTMLDivElement {
    this.templateBtn.setAttribute('aria-haspopup', 'menu');
    this.templateBtn.setAttribute('aria-expanded', 'false');
    this.templateBtn.innerHTML = `<span></span>${createIcon('chevronDown', 12)}`;
    this.templateBtn.querySelector('span')!.textContent = this.t('settings.template');
    const end = document.createElement('div');
    end.className = 'tcw-footer-end';
    end.append(
      this.footerButton('cancel', 'tcw-footer-cancel', () => this.close(true), this.t('common.cancel')),
      this.footerButton('ok', 'tcw-done-btn', () => this.close(false), this.t('drawingSettings.ok')),
    );
    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    footer.append(this.templateBtn, end);
    return footer;
  }

  open(target: DrawingSettingsTarget): void {
    if (this.target) this.close(false);
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.target = target;
    this.style = { ...target.style };
    this.options = structuredClone(target.options);
    this.anchors = target.anchors.map((a) => ({ ...a }));
    this.intervals = target.intervals ?? null;
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
    this.menu?.close();
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
    this.menu?.destroy();
    this.backdrop.remove();
  }

  // --- Tabs ---

  private tabs(): Tab[] {
    const target = this.target;
    if (!target) return [];
    return [
      'style',
      ...(target.text ? ['text' as const] : []),
      // A freehand stroke has hundreds of points: no table of them.
      ...(target.anchors.length <= MAX_COORDINATE_ROWS ? ['coordinates' as const] : []),
      'visibility',
    ];
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
    const target = this.target;
    if (!target) return;
    switch (this.tab) {
      case 'text':
        renderTextTab(this.bodyEl, this.style, (patch) => this.setStyle(patch), this.t);
        break;
      case 'coordinates':
        renderCoordinatesTab(this.bodyEl, this.anchors, {
          toWallTime: this.callbacks.toWallTime,
          fromWallTime: this.callbacks.fromWallTime,
          roundPrice: this.callbacks.roundPrice,
          priceStep: this.callbacks.priceStep,
          move: (index, patch) => this.setAnchor(index, patch),
        }, this.t);
        break;
      case 'visibility':
        renderVisibilityTab(this.bodyEl, this.intervals, (next) => this.setIntervals(next), this.t);
        break;
      default:
        renderStyleTab(this.bodyEl, { style: () => this.style, options: () => this.options, defs: target.defs, fill: target.fill }, {
          style: (patch) => this.setStyle(patch),
          options: (patch) => this.setOptions(patch),
          redraw: (focus = []) => {
            this.renderBody();
            for (const selector of focus) {
              const el = this.bodyEl.querySelector<HTMLElement>(selector);
              if (el) {
                el.focus();
                break;
              }
            }
          },
        }, this.t);
    }
  }

  // --- Edits ---

  private change(patch: DrawingSettingsPatch): void {
    if (this.target) this.callbacks.onChange(this.target.id, patch);
  }

  private setStyle(style: Partial<DrawingStyle>): void {
    if (!this.target) return;
    this.style = { ...this.style, ...style };
    this.change({ style });
  }

  private setOptions(options: DrawingOptions): void {
    if (!this.target) return;
    this.options = { ...this.options, ...structuredClone(options) };
    this.change({ options });
  }

  private setAnchor(index: number, patch: Partial<AnchorPoint>): void {
    if (!this.target) return;
    this.anchors = this.anchors.map((a, i) => (i === index ? { ...a, ...patch } : a));
    this.change({ anchors: this.anchors.map((a) => ({ ...a })) });
  }

  private setIntervals(intervals: IndicatorIntervals | null): void {
    if (!this.target) return;
    this.intervals = intervals;
    this.change({ intervals });
  }

  // --- Template ---

  /** The Template menu: the saved templates (each removable), Save as template, Save as default, Reset to defaults. */
  private openTemplates(): void {
    const target = this.target;
    if (!target) return;
    if (this.menu?.isOpen()) {
      this.menu.close();
      return;
    }
    const store = this.callbacks.templates;
    const saved = store?.list(target.type) ?? [];
    const entries: ContextMenuEntry[] = [
      ...saved.map((template, i): ContextMenuEntry => ({
        id: `${TEMPLATE_ID}${i}`, label: template.name, icon: 'layers', remove: fill(this.t('templates.delete'), { name: template.name }),
      })),
      ...(saved.length > 0 ? ['separator' as const] : []),
      ...(store ? [{ id: 'save', label: this.t('settings.saveTemplate'), icon: 'save' }] : []),
      ...(this.callbacks.onSaveDefault ? [{ id: 'default', label: this.t('drawingSettings.saveDefault'), icon: 'pin' }] : []),
      { id: 'reset', label: this.t('settings.resetToDefaults'), icon: 'reset' },
    ];
    const savedAt = (id: string) => saved[Number(id.slice(TEMPLATE_ID.length))];
    this.menu ??= new WidgetContextMenu(this.modal, this.t('settings.template'));
    const at = this.templateBtn.getBoundingClientRect();
    const box = this.modal.getBoundingClientRect();
    // From the button's top: in the footer there is no room below, so it opens above the button.
    this.menu.open(entries, at.left - box.left, at.top - box.top, (id) => {
      if (id === 'save') store?.save({ type: target.type, style: { ...this.style }, options: structuredClone(this.options) });
      else if (id === 'default') this.callbacks.onSaveDefault?.(target.type, structuredClone(this.options));
      else if (id === 'reset') this.resetOptions();
      else if (id.startsWith(TEMPLATE_ID)) this.applyTemplate(savedAt(id));
    }, this.templateBtn, (id) => {
      const template = savedAt(id);
      if (template) store?.remove(template.name, template.type);
    });
  }

  private applyTemplate(template: DrawingStyleTemplate | undefined): void {
    const target = this.target;
    if (!template || !target) return;
    if (Object.keys(template.style).length > 0) this.setStyle(template.style);
    // Templates come from storage: only options the tool takes apply.
    if (template.options) this.setOptions(sanitizeDrawingOptions(target.defs, template.options));
    this.renderBody();
  }

  /** The tool's options back to its defaults. */
  private resetOptions(): void {
    const target = this.target;
    if (!target) return;
    const defaults: DrawingOptions = {};
    for (const [key, def] of Object.entries(target.defs)) defaults[key] = structuredClone(def.default) as DrawingOptions[string];
    this.setOptions(defaults);
    this.renderBody();
  }

  private footerButton(act: string, className: string, onClick: () => void, text?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.dataset.act = act;
    if (text) btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }
}
