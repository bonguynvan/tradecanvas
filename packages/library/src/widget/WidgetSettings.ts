import { CHART_STYLE_KEYS, type ChartType, type ChartTypeOptions, type LineStyle } from '@tradecanvas/commons';
import type { ChartSettingsState, SettingsCallbacks, SettingsStylePatch } from './types.js';
import { CHART_TYPES } from './widgetConfig.js';
import {
  APPEARANCE_SECTIONS, HIGH_LOW_SECTION, LAST_PRICE_SECTION, LEGEND_ROWS, SCALE_ROWS, STATUS_LINE_ROWS, TRADING_SECTIONS, VOLUME_SECTION,
  seriesRows, type LookRow, type LookSection,
} from './widgetSettingsLook.js';
import { chartTypeLabel, numberLocaleOptions } from './widgetLocales.js';
import { createChartTypeIcon, createIcon } from './icons.js';
import { timezoneOptions } from './widgetTimezones.js';
import { keepTabInside } from './focusTrap.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import { colorRow, numberRow, rangeRow, selectRow, settingsSection, toggleRow, type NumberLimits } from './settingsRows.js';
import { fill, type MessageKey, type Translator } from './i18n.js';

export type SettingsTab = 'symbol' | 'statusLine' | 'scales' | 'appearance' | 'layers' | 'trading';
type Tab = SettingsTab;

/** The tabs down the side, in the order a trader looks: the symbol first, the trading colours last. */
const TABS: readonly { id: Tab; icon: string }[] = [
  { id: 'symbol', icon: 'chartType:candlestick' },
  { id: 'statusLine', icon: 'type' },
  { id: 'scales', icon: 'ruler' },
  { id: 'appearance', icon: 'palette' },
  { id: 'layers', icon: 'layers' },
  { id: 'trading', icon: 'trendingUp' },
];
/** The widths a line takes in the settings, in pixels. */
const LINE_WIDTHS = [1, 2, 3, 4];
/** A template's entry in the Template menu, by its name. */
const TEMPLATE_ID = 't:';
/**
 * The smallest box, reversal or range the chart type's settings take: a
 * hundred-millionth, the finest price step markets commonly quote. A size
 * far under the prices is no use; the chart raises one that would make too
 * many bars anyway, but a slip like 1e-9 is turned away here.
 */
const MIN_TYPE_SIZE = 1e-8;
/** A box, reversal or range: any number from MIN_TYPE_SIZE up. */
const SIZE_LIMITS: NumberLimits = { step: 'any', max: Infinity, min: MIN_TYPE_SIZE };

let nextSettingsId = 1;

/**
 * The chart's settings: tabs down the side (Symbol, Status line, Scales,
 * Appearance, Layers, Trading), each change shown at once. Cancel (Escape,
 * the close button, a click outside) puts it all back, OK keeps it; the
 * Template menu applies, saves and deletes templates, and resets.
 */
export class WidgetSettings {
  private callbacks: SettingsCallbacks;
  private t: Translator;
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private bodyEl: HTMLDivElement | null = null;
  private tabButtons: HTMLButtonElement[] = [];
  private templateBtn: HTMLButtonElement | null = null;
  private menu: WidgetContextMenu | null = null;
  private currentTab: Tab = 'symbol';
  private currentSettings: ChartSettingsState | null = null;
  /** The chart's type, whose settings the Symbol tab offers. */
  private chartType: ChartType | null = null;
  /** The look's rows on view, each showing the chart's value again (a change to one moves others: a wick with its body). */
  private lookRows: { el: HTMLElement; sync: () => void }[] = [];
  private returnFocus: HTMLElement | null = null;
  private readonly uid = nextSettingsId++;

  /**
   * `barCountdown` / `logScale` / `legend` / `volume` false leave out the
   * controls for features the chart has switched off: there they would do
   * nothing.
   */
  constructor(
    callbacks: SettingsCallbacks,
    t: Translator,
    private readonly available: {
      barCountdown?: boolean;
      logScale?: boolean;
      legend?: boolean;
      volume?: boolean;
      /** The exchange's time zone to offer (null while unknown), or undefined when there is none to offer. */
      exchangeZone?: () => string | null | undefined;
      /** false: the chart doesn't trade, so the orders' colours aren't offered. */
      trading?: boolean;
    } = {},
    /** Where the panel mounts (the widget's portal: themed, and inside it when fullscreen). */
    private readonly host: () => HTMLElement = () => document.body,
  ) {
    this.callbacks = callbacks;
    this.t = t;
  }

  /** Open on `tab` (the Symbol tab unless asked: the price axis's menu asks for Scales). */
  open(currentSettings: ChartSettingsState, chartType: ChartType | null = null, tab: SettingsTab = 'symbol'): void {
    if (this.modal) this.remove();
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.currentSettings = { ...currentSettings };
    this.chartType = chartType;
    this.currentTab = tab;
    this.buildModal();
    this.tabButtons.find((b) => b.dataset.tab === tab)?.focus();
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  /** The settings as they are now (after an undo, a template), on the tab that's open; `chartType` when it changed. */
  refresh(settings: ChartSettingsState, chartType?: ChartType | null): void {
    if (!this.modal) return;
    this.currentSettings = { ...settings };
    if (chartType !== undefined) this.chartType = chartType;
    this.renderTabContent();
  }

  /** Close, keeping what was changed (as OK does). */
  close(): void {
    this.finish(true);
  }

  destroy(): void {
    this.remove();
  }

  /** OK (`keep`) or Cancel, then closed, focus back where the dialog was opened from. */
  private finish(keep: boolean): void {
    if (!this.modal) return;
    if (keep) this.callbacks.onClose();
    else this.callbacks.onCancel?.();
    this.remove();
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  private remove(): void {
    this.menu?.destroy();
    this.menu = null;
    this.backdrop?.remove();
    this.backdrop = this.modal = this.bodyEl = this.templateBtn = null;
    this.tabButtons = [];
  }

  private buildModal(): void {
    const backdrop = document.createElement('div');
    backdrop.className = 'tcw-modal-backdrop';
    // A press that starts in the dialog (a slider dragged, text selected) and ends on the backdrop doesn't cancel it.
    let pressedBackdrop = false;
    backdrop.addEventListener('pointerdown', (e) => {
      pressedBackdrop = e.target === backdrop;
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && pressedBackdrop) this.finish(false);
      pressedBackdrop = false;
    });
    const modal = document.createElement('div');
    modal.className = 'tcw-modal tcw-set';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `tcw-set-title-${this.uid}`);
    modal.tabIndex = -1;
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.finish(false);
        return;
      }
      keepTabInside(e, modal);
    });
    this.backdrop = backdrop;
    this.modal = modal;
    modal.append(this.buildHeader(), this.buildBody(), this.buildFooter());
    backdrop.appendChild(modal);
    this.host().appendChild(backdrop);
    this.markTabs();
    this.renderTabContent();
  }

  private buildHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const title = document.createElement('h3');
    title.id = `tcw-set-title-${this.uid}`;
    title.textContent = this.t('settings.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-modal-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => this.finish(false));
    header.append(title, closeBtn);
    return header;
  }

  /** The tabs down the side, and the open one's settings beside them. */
  private buildBody(): HTMLDivElement {
    const body = document.createElement('div');
    body.className = 'tcw-set-body';
    const nav = document.createElement('div');
    nav.className = 'tcw-set-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-orientation', 'vertical');
    nav.setAttribute('aria-label', this.t('settings.title'));
    nav.addEventListener('keydown', (e) => this.onTabKey(e));
    this.tabButtons = TABS.map(({ id, icon }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-set-tab';
      btn.id = `tcw-set-tab-${this.uid}-${id}`;
      btn.dataset.tab = id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-controls', `tcw-set-panel-${this.uid}`);
      const svg = icon.startsWith('chartType:') ? createChartTypeIcon(icon.slice('chartType:'.length) as ChartType, 16) : createIcon(icon, 16);
      btn.innerHTML = `${svg}<span></span>`;
      btn.querySelector('span')!.textContent = this.t(`settings.tab.${id}` as MessageKey);
      btn.addEventListener('click', () => this.selectTab(id));
      return btn;
    });
    nav.append(...this.tabButtons);
    const panel = document.createElement('div');
    panel.className = 'tcw-modal-body tcw-set-panel';
    panel.id = `tcw-set-panel-${this.uid}`;
    panel.setAttribute('role', 'tabpanel');
    this.bodyEl = panel;
    body.append(nav, panel);
    return body;
  }

  /** Template on the left; Cancel and OK on the right. */
  private buildFooter(): HTMLDivElement {
    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const template = this.footerButton('template', 'tcw-footer-menu', () => this.openTemplates());
    template.setAttribute('aria-haspopup', 'menu');
    template.setAttribute('aria-expanded', 'false');
    template.innerHTML = `<span></span>${createIcon('chevronDown', 12)}`;
    template.querySelector('span')!.textContent = this.t('settings.template');
    this.templateBtn = template;
    const end = document.createElement('div');
    end.className = 'tcw-footer-end';
    end.append(
      this.footerButton('cancel', 'tcw-footer-cancel', () => this.finish(false), this.t('common.cancel')),
      this.footerButton('ok', 'tcw-done-btn', () => this.finish(true), this.t('drawingSettings.ok')),
    );
    footer.append(template, end);
    return footer;
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

  private markTabs(): void {
    for (const btn of this.tabButtons) {
      const on = btn.dataset.tab === this.currentTab;
      btn.classList.toggle('tcw-active', on);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      if (on) this.bodyEl?.setAttribute('aria-labelledby', btn.id);
    }
  }

  private selectTab(tab: Tab, focus = false): void {
    this.currentTab = tab;
    this.markTabs();
    this.renderTabContent();
    if (focus) this.tabButtons.find((b) => b.dataset.tab === tab)?.focus();
  }

  /** Through the tabs (Home, End), picking as they go: up and down, or along the row of chips on a phone. */
  private onTabKey(e: KeyboardEvent): void {
    const at = TABS.findIndex((tab) => tab.id === this.currentTab);
    const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (at + 1) % TABS.length
      : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? (at - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    this.selectTab(TABS[next].id, true);
  }

  /** The Template menu: the saved templates (each removable), Save as template, Reset to defaults. */
  private openTemplates(): void {
    const btn = this.templateBtn;
    if (!this.modal || !btn) return;
    if (this.menu?.isOpen()) {
      this.menu.close();
      return;
    }
    const templates = this.callbacks.templates;
    const saved: ContextMenuEntry[] = (templates?.list() ?? []).map((name) => ({
      id: `${TEMPLATE_ID}${name}`, label: name, icon: 'layers', remove: fill(this.t('templates.delete'), { name }),
    }));
    const entries: ContextMenuEntry[] = [
      ...saved,
      ...(saved.length > 0 ? ['separator' as const] : []),
      ...(templates ? [{ id: 'save', label: this.t('settings.saveTemplate'), icon: 'save' }] : []),
      { id: 'reset', label: this.t('settings.resetToDefaults'), icon: 'reset' },
    ];
    this.menu ??= new WidgetContextMenu(this.modal, this.t('settings.template'));
    const at = btn.getBoundingClientRect();
    const box = this.modal.getBoundingClientRect();
    // From the button's top: in the footer there is no room below, so it opens above the button.
    this.menu.open(entries, at.left - box.left, at.top - box.top, (id) => {
      if (id === 'reset') this.callbacks.onReset();
      else if (id === 'save') templates?.save();
      else if (id.startsWith(TEMPLATE_ID)) templates?.apply(id.slice(TEMPLATE_ID.length));
    }, btn, (id) => templates?.remove(id.slice(TEMPLATE_ID.length)));
  }

  private renderTabContent(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    this.bodyEl.replaceChildren();
    this.lookRows = [];
    switch (this.currentTab) {
      case 'symbol': this.renderSymbolTab(this.currentSettings); break;
      case 'statusLine': this.renderStatusLineTab(this.currentSettings); break;
      case 'scales': this.renderScalesTab(this.currentSettings); break;
      case 'appearance': this.renderAppearanceTab(this.currentSettings); break;
      case 'layers': this.renderLayersTab(this.currentSettings); break;
      case 'trading':
        for (const section of TRADING_SECTIONS) {
          if (!section.trading || this.available.trading !== false) this.renderLookSection(section);
        }
        break;
    }
  }

  /** The chart type's own settings and colours, the main series, the last price, the volume, the high and low. */
  private renderSymbolTab(s: ChartSettingsState): void {
    this.renderChartTypeSection();
    this.addSection(undefined, [
      toggleRow(this.t('settings.mainSeries'), s.mainSeriesVisible, (v) => this.patch({ mainSeriesVisible: v })),
      toggleRow(this.t('settings.extendedHours'), s.extendedHours, (v) => this.patch({ extendedHours: v })),
    ]);
    // A section's own switch says "Show": its title names what it shows.
    const show = this.t('common.show');
    this.renderLookSection(LAST_PRICE_SECTION);
    if (this.available.volume !== false) {
      this.renderLookSection(VOLUME_SECTION, [toggleRow(show, s.volumeVisible, (v) => this.patch({ volumeVisible: v }))]);
    }
    this.renderLookSection(HIGH_LOW_SECTION, [toggleRow(show, s.highLowLines, (v) => this.patch({ highLowLines: v }))]);
  }

  /** The legend over the chart: shown or not, its colours; the panes' titles. */
  private renderStatusLineTab(s: ChartSettingsState): void {
    const legend = this.available.legend !== false;
    const rows = legend ? STATUS_LINE_ROWS : STATUS_LINE_ROWS.filter((row) => !LEGEND_ROWS.includes(row));
    this.addSection(undefined, [
      ...(legend ? [toggleRow(this.t('settings.ohlcLegend'), s.legendVisible, (v) => this.patch({ legendVisible: v }))] : []),
      ...rows.map((row) => this.lookRow(row)),
    ]);
  }

  /** The price scale's mode and behaviour, its labels, the time zone, how numbers are written, the axes' colours. */
  private renderScalesTab(s: ChartSettingsState): void {
    const scales = [
      { value: 'regular', label: this.t('settings.scale.regular') },
      { value: 'logarithmic', label: this.t('settings.scale.logarithmic') },
      { value: 'percentage', label: this.t('settings.scale.percentage') },
      { value: 'indexedTo100', label: this.t('settings.scale.indexedTo100') },
    ].filter((o) => o.value !== 'logarithmic' || this.available.logScale !== false);
    const exchangeZone = this.available.exchangeZone?.();
    const zones = timezoneOptions(s.timezone, Date.now(), this.t('settings.timezone.local'),
      exchangeZone !== undefined ? { label: this.t('settings.timezone.exchange'), zone: exchangeZone } : undefined);
    this.addSection(undefined, [
      selectRow(this.t('settings.priceScale'), s.scaleMode, scales, (v) => this.patch({ scaleMode: v as ChartSettingsState['scaleMode'] })),
      toggleRow(this.t('settings.autoScale'), s.autoScale, (v) => this.patch({ autoScale: v })),
      toggleRow(this.t('settings.invertScale'), s.invertScale, (v) => this.patch({ invertScale: v })),
      toggleRow(this.t('settings.leftScale'), s.leftPriceScale, (v) => this.patch({ leftPriceScale: v })),
      toggleRow(this.t('settings.indicatorValues'), s.indicatorValueLabels, (v) => this.patch({ indicatorValueLabels: v })),
      ...(this.available.barCountdown !== false
        ? [toggleRow(this.t('settings.barCountdown'), s.barCountdown, (v) => this.patch({ barCountdown: v }))]
        : []),
      selectRow(this.t('settings.timezone'), s.timezone, zones, (v) => this.patch({ timezone: v })),
      selectRow(this.t('settings.numberLocale'), s.numberLocale, numberLocaleOptions(s.numberLocale), (v) => this.patch({ numberLocale: v })),
    ]);
    this.addSection(this.t('settings.section.axes'), SCALE_ROWS.map((row) => this.lookRow(row)));
  }

  /** The background, the grid, the crosshair, the session breaks, the drawings' handles. */
  private renderAppearanceTab(s: ChartSettingsState): void {
    const [background, grid, crosshair, ...rest] = APPEARANCE_SECTIONS;
    this.renderLookSection(background);
    this.renderLookSection(grid, [toggleRow(this.t('common.show'), s.gridVisible, (v) => this.patch({ gridVisible: v }))]);
    this.renderLookSection(crosshair, [selectRow(this.t('settings.crosshairMode'), s.crosshairMode, [
      { label: this.t('settings.crosshair.magnet'), value: 'magnet' },
      { label: this.t('settings.crosshair.normal'), value: 'normal' },
      { label: this.t('settings.crosshair.hidden'), value: 'hidden' },
    ], (v) => this.patch({ crosshairMode: v as ChartSettingsState['crosshairMode'] }))]);
    for (const section of rest) this.renderLookSection(section);
  }

  /** What the chart can draw over the bars: the profiles, the depth, the swings, the sessions, the prior levels. */
  private renderLayersTab(s: ChartSettingsState): void {
    const percent = (v: number) => `${Math.round(v * 100)}%`;
    const t = (key: MessageKey) => this.t(key);
    this.addSection(undefined, [toggleRow(t('settings.volumeProfile'), s.volumeProfileVisible, (v) => this.patch({ volumeProfileVisible: v }))]);
    this.addSection(undefined, [
      toggleRow(t('settings.marketProfile'), s.marketProfileVisible, (v) => this.patch({ marketProfileVisible: v })),
      toggleRow(t('settings.marketProfileSplit'), s.marketProfileSplit, (v) => this.patch({ marketProfileSplit: v })),
      toggleRow(t('settings.marketProfileLetters'), s.marketProfileLetters, (v) => this.patch({ marketProfileLetters: v })),
      rangeRow(t('settings.marketProfileBuckets'), s.marketProfileBuckets, { min: 8, max: 200, step: 1 }, (v) => this.patch({ marketProfileBuckets: v })),
      rangeRow(t('settings.marketProfileOpacity'), s.marketProfileOpacity, { min: 0.05, max: 1, step: 0.05 }, (v) => this.patch({ marketProfileOpacity: v }), percent),
    ]);
    this.addSection(undefined, [
      toggleRow(t('settings.depthHeatmap'), s.depthHeatmapVisible, (v) => this.patch({ depthHeatmapVisible: v })),
      rangeRow(t('settings.depthHeatmapOpacity'), s.depthHeatmapOpacity, { min: 0.1, max: 1, step: 0.05 }, (v) => this.patch({ depthHeatmapOpacity: v }), percent),
    ]);
    this.addSection(undefined, [
      toggleRow(t('settings.swingMarkers'), s.pivotMarkersVisible, (v) => this.patch({ pivotMarkersVisible: v })),
      rangeRow(t('settings.swingStrength'), s.pivotStrength, { min: 2, max: 20, step: 1 }, (v) => this.patch({ pivotStrength: v })),
      toggleRow(t('settings.swingStructure'), s.pivotStructureLabels, (v) => this.patch({ pivotStructureLabels: v })),
    ]);
    this.addSection(undefined, [
      toggleRow(t('settings.sessionShading'), s.sessionShadingVisible, (v) => this.patch({ sessionShadingVisible: v })),
      toggleRow(t('settings.periodLevels'), s.periodLevelsVisible, (v) => this.patch({ periodLevelsVisible: v })),
      selectRow(t('settings.periodLevelsBasis'), s.periodLevelsPeriod, [
        { value: 'day', label: t('settings.priorDay') },
        { value: 'week', label: t('settings.priorWeek') },
      ], (v) => this.patch({ periodLevelsPeriod: v as ChartSettingsState['periodLevelsPeriod'] })),
    ]);
  }

  private addSection(title: string | undefined, rows: readonly HTMLElement[]): HTMLDivElement {
    const section = settingsSection(title);
    section.append(...rows);
    this.bodyEl?.appendChild(section);
    return section;
  }

  /** A section of the look, after `lead` (the switch it goes with, say). */
  private renderLookSection(section: LookSection, lead: readonly HTMLElement[] = []): void {
    this.addSection(this.t(section.title), [...lead, ...section.rows.map((row) => this.lookRow(row))]);
  }

  /** A row of the look: a colour, a switch, a dash or a width, as its key takes it, on the user's layer. */
  private lookRow(row: LookRow): HTMLDivElement {
    const label = this.t(row.label);
    const read = () => this.callbacks.styleValue(row.keys[0]);
    /** The keys' value, or '' when they differ (the host set each way apart): any pick then sets them all. */
    const shared = (): string => {
      const values = row.keys.map((key) => this.callbacks.styleValue(key));
      return values.every((v) => v === values[0]) && values[0] !== null ? String(values[0]) : '';
    };
    let el: HTMLDivElement;
    const set = (v: string | number | boolean | null) => {
      this.callbacks.onStyleChange(Object.fromEntries(row.keys.map((key) => [key, v])) as SettingsStylePatch);
      for (const other of this.lookRows) if (other.el !== el) other.sync();
    };
    const auto = row.auto ? [{ value: '', label: this.t('settings.auto') }] : [];
    let sync: () => void;
    switch (CHART_STYLE_KEYS[row.keys[0]]) {
      case 'boolean': {
        el = toggleRow(label, read() === true, set);
        const toggle = el.querySelector('button')!;
        sync = () => {
          const on = read() === true;
          toggle.classList.toggle('tcw-on', on);
          toggle.setAttribute('aria-checked', String(on));
        };
        break;
      }
      case 'lineStyle':
        el = selectRow(label, shared(), [...auto, ...this.lineStyles()], (v) => set(v === '' ? null : asLineStyle(v)));
        sync = () => { el.querySelector('select')!.value = shared(); };
        break;
      case 'width': {
        const value = read();
        const widths = typeof value === 'number' && !LINE_WIDTHS.includes(value) ? [...LINE_WIDTHS, value].sort((a, b) => a - b) : LINE_WIDTHS;
        el = selectRow(label, shared(), [...auto, ...widths.map((w) => ({ value: String(w), label: `${w}px` }))],
          (v) => set(v === '' ? null : Number(v)));
        sync = () => { el.querySelector('select')!.value = shared(); };
        break;
      }
      default: {
        const value = read();
        const colour = colorRow(label, typeof value === 'string' ? value : null, set, {
          read: () => { const v = read(); return typeof v === 'string' ? v : null; },
          start: row.auto ? () => (row.auto?.from ? this.callbacks.styleValue(row.auto.from) : row.auto?.hint) ?? null : undefined,
        }, this.t);
        el = colour.row;
        sync = colour.sync;
      }
    }
    this.lookRows.push({ el, sync });
    return el;
  }

  private lineStyles(): { value: string; label: string }[] {
    return [
      { value: 'solid', label: this.t('drawingSettings.lineStyle.solid') },
      { value: 'dashed', label: this.t('drawingSettings.lineStyle.dashed') },
      { value: 'dotted', label: this.t('drawingSettings.lineStyle.dotted') },
    ];
  }

  /** The chart's type: its settings (Renko's box, Kagi's reversal…) and its colours and widths. */
  private renderChartTypeSection(): void {
    if (!this.bodyEl || !this.currentSettings || !this.chartType) return;
    const type = this.chartType;
    const all = this.currentSettings.chartTypeOptions ?? {};
    const def = CHART_TYPES.find((c) => c.value === type);
    const section = settingsSection(def ? chartTypeLabel(def, this.t) : type);
    const own = () => this.currentSettings?.chartTypeOptions ?? {};
    /** Change one type's settings: the rest of its own stay. */
    const set = <K extends keyof ChartTypeOptions>(key: K, value: NonNullable<ChartTypeOptions[K]>) =>
      this.patch({ chartTypeOptions: { ...own(), [key]: value } });
    const number = (label: MessageKey, value: number | null, limits: NumberLimits, onChange: (v: number | null) => void) =>
      section.appendChild(numberRow(this.t(label), value, limits, onChange, this.t));
    switch (type) {
      case 'renko': {
        const o = all.renko ?? {};
        number('settings.boxSize', typeof o.boxSize === 'number' ? o.boxSize : null, SIZE_LIMITS,
          (v) => set('renko', { ...(own().renko ?? {}), boxSize: v ?? 'atr' }));
        number('settings.atrPeriod', o.atrPeriod ?? null, { step: '1', max: 500 }, (v) => set('renko', withValue(own().renko, 'atrPeriod', v)));
        break;
      }
      case 'lineBreak':
        number('settings.lineBreakLines', all.lineBreak?.lines ?? null, { step: '1', max: 10 }, (v) => set('lineBreak', withValue(own().lineBreak, 'lines', v)));
        break;
      case 'kagi':
        number('settings.reversal', all.kagi?.reversal ?? null, SIZE_LIMITS, (v) => set('kagi', withValue(own().kagi, 'reversal', v)));
        section.appendChild(selectRow(this.t('settings.reversalType'), all.kagi?.reversalType ?? 'percent', [
          { value: 'percent', label: this.t('settings.reversalType.percent') },
          { value: 'price', label: this.t('settings.reversalType.price') },
        ], (v) => set('kagi', { ...(own().kagi ?? {}), reversalType: v === 'price' ? 'price' : 'percent' })));
        break;
      case 'pointAndFigure':
        number('settings.boxSize', typeof all.pointAndFigure?.boxSize === 'number' ? all.pointAndFigure.boxSize : null, SIZE_LIMITS,
          (v) => set('pointAndFigure', { ...(own().pointAndFigure ?? {}), boxSize: v ?? 'auto' }));
        number('settings.reversalBoxes', all.pointAndFigure?.reversal ?? null, { step: '1', max: 10 },
          (v) => set('pointAndFigure', withValue(own().pointAndFigure, 'reversal', v)));
        break;
      case 'rangeBars':
        number('settings.barRange', typeof all.rangeBars?.range === 'number' ? all.rangeBars.range : null, SIZE_LIMITS,
          (v) => set('rangeBars', { range: v ?? 'auto' }));
        break;
      default:
        break;
    }
    for (const row of seriesRows(type)) section.appendChild(this.lookRow(row));
    this.bodyEl.appendChild(section);
  }

  private patch(partial: Partial<ChartSettingsState>): void {
    if (this.currentSettings) Object.assign(this.currentSettings, partial);
    this.callbacks.onChange(partial);
  }
}

/** `settings` with `key` set to `value`, or without it (back to its default) for null. */
function withValue<T extends object, K extends string>(settings: T | undefined, key: K, value: number | null): T {
  const next = { ...(settings ?? {}) } as Record<string, unknown>;
  if (value === null) delete next[key];
  else next[key] = value;
  return next as T;
}

function asLineStyle(v: string): LineStyle {
  return v === 'dashed' || v === 'dotted' ? v : 'solid';
}
