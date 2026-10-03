import type { ChartType, ChartTypeOptions } from '@tradecanvas/commons';
import type { ChartSettingsState, SettingsCallbacks } from './types.js';
import { CHART_TYPES } from './widgetConfig.js';
import { chartTypeLabel } from './widgetLocales.js';
import { createIcon } from './icons.js';
import { timezoneOptions } from './widgetTimezones.js';
import { numberLocaleOptions } from './widgetLocales.js';
import type { Translator } from './i18n.js';

type Tab = 'style' | 'display' | 'scale';
const TABS: Tab[] = ['style', 'display', 'scale'];

export class WidgetSettings {
  private callbacks: SettingsCallbacks;
  private t: Translator;
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private currentTab: Tab = 'style';
  private currentSettings: ChartSettingsState | null = null;
  private bodyEl: HTMLDivElement | null = null;
  private tabButtons: HTMLButtonElement[] = [];
  /** The chart's type, whose settings the Style tab offers. */
  private chartType: ChartType | null = null;

  /**
   * `barCountdown` / `logScale` false leave out the controls for features the
   * chart has switched off.
   */
  constructor(
    callbacks: SettingsCallbacks,
    t: Translator,
    private readonly available: {
      barCountdown?: boolean;
      logScale?: boolean;
      /** Offer the exchange's time zone; returns it (null while unknown). */
      exchangeZone?: () => string | null;
    } = {},
    /** Where the panel mounts (the widget's portal: themed, and inside it when fullscreen). */
    private readonly host: () => HTMLElement = () => document.body,
  ) {
    this.callbacks = callbacks;
    this.t = t;
  }

  open(currentSettings: ChartSettingsState, chartType: ChartType | null = null): void {
    this.currentSettings = { ...currentSettings };
    this.chartType = chartType;
    this.currentTab = 'style';
    this.buildModal();
  }

  close(): void {
    this.backdrop?.remove();
    this.modal?.remove();
    this.backdrop = null;
    this.modal = null;
    this.bodyEl = null;
    this.tabButtons = [];
  }

  private buildModal(): void {
    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'tcw-modal-backdrop';
    this.backdrop.addEventListener('click', () => {
      this.callbacks.onClose();
      this.close();
    });
    this.host().appendChild(this.backdrop);

    // Modal
    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const h3 = document.createElement('h3');
    h3.textContent = this.t('settings.title');
    header.appendChild(h3);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tcw-modal-close';
    closeBtn.innerHTML = createIcon('x', 16);
    closeBtn.addEventListener('click', () => {
      this.callbacks.onClose();
      this.close();
    });
    header.appendChild(closeBtn);
    this.modal.appendChild(header);

    // Tabs
    const tabsEl = document.createElement('div');
    tabsEl.className = 'tcw-modal-tabs';
    this.tabButtons = [];
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.className = 'tcw-modal-tab';
      btn.textContent = this.t(`settings.tab.${tab}` as Parameters<Translator>[0]);
      btn.dataset.tab = tab;
      if (tab === this.currentTab) btn.classList.add('tcw-active');
      btn.addEventListener('click', () => {
        this.currentTab = tab;
        this.tabButtons.forEach(b => b.classList.toggle('tcw-active', b.dataset.tab === tab));
        this.renderTabContent();
      });
      tabsEl.appendChild(btn);
      this.tabButtons.push(btn);
    }
    this.modal.appendChild(tabsEl);

    // Body
    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-modal-body';
    this.modal.appendChild(this.bodyEl);
    this.renderTabContent();

    // Footer
    const footer = document.createElement('div');
    footer.className = 'tcw-modal-footer';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'tcw-reset-link';
    resetBtn.textContent = this.t('settings.resetToDefaults');
    resetBtn.addEventListener('click', () => this.callbacks.onReset());
    footer.appendChild(resetBtn);
    const doneBtn = document.createElement('button');
    doneBtn.className = 'tcw-done-btn';
    doneBtn.textContent = this.t('settings.done');
    doneBtn.addEventListener('click', () => {
      this.callbacks.onClose();
      this.close();
    });
    footer.appendChild(doneBtn);
    this.modal.appendChild(footer);

    this.host().appendChild(this.modal);

    // Escape key
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKeyDown);
        this.callbacks.onClose();
        this.close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
  }

  private renderTabContent(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    this.bodyEl.innerHTML = '';

    switch (this.currentTab) {
      case 'style':
        this.renderStyleTab();
        break;
      case 'display':
        this.renderDisplayTab();
        break;
      case 'scale':
        this.renderScaleTab();
        break;
    }
  }

  private renderStyleTab(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    const s = this.currentSettings;

    this.renderChartTypeSection();

    // Candle Colors
    const candleSection = this.section(this.t('settings.section.candleColors'));
    candleSection.appendChild(this.colorRow(this.t('settings.upBody'), s.candleUpColor, (v) => this.patch({ candleUpColor: v })));
    candleSection.appendChild(this.colorRow(this.t('settings.downBody'), s.candleDownColor, (v) => this.patch({ candleDownColor: v })));
    candleSection.appendChild(this.colorRow(this.t('settings.upWick'), s.candleUpWick, (v) => this.patch({ candleUpWick: v })));
    candleSection.appendChild(this.colorRow(this.t('settings.downWick'), s.candleDownWick, (v) => this.patch({ candleDownWick: v })));
    this.bodyEl.appendChild(candleSection);

    // Background
    const bgSection = this.section(this.t('settings.section.background'));
    bgSection.appendChild(this.colorRow(this.t('settings.background'), s.backgroundColor, (v) => this.patch({ backgroundColor: v })));
    bgSection.appendChild(this.colorRow(this.t('settings.grid'), s.gridColor, (v) => this.patch({ gridColor: v })));
    this.bodyEl.appendChild(bgSection);
  }

  private renderDisplayTab(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    const s = this.currentSettings;

    const section = this.section();
    section.appendChild(this.toggleRow(this.t('settings.mainSeries'), s.mainSeriesVisible, (v) => this.patch({ mainSeriesVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.highLowLines'), s.highLowLines, (v) => this.patch({ highLowLines: v })));
    section.appendChild(this.toggleRow(this.t('settings.gridLines'), s.gridVisible, (v) => this.patch({ gridVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.volume'), s.volumeVisible, (v) => this.patch({ volumeVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.volumeProfile'), s.volumeProfileVisible, (v) => this.patch({ volumeProfileVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.marketProfile'), s.marketProfileVisible, (v) => this.patch({ marketProfileVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.marketProfileSplit'), s.marketProfileSplit, (v) => this.patch({ marketProfileSplit: v })));
    section.appendChild(this.toggleRow(this.t('settings.marketProfileLetters'), s.marketProfileLetters, (v) => this.patch({ marketProfileLetters: v })));
    section.appendChild(this.rangeRow(this.t('settings.marketProfileBuckets'), s.marketProfileBuckets, 8, 200, 1, (v) => this.patch({ marketProfileBuckets: v })));
    section.appendChild(this.rangeRow(this.t('settings.marketProfileOpacity'), s.marketProfileOpacity, 0.05, 1, 0.05, (v) => this.patch({ marketProfileOpacity: v }), (v) => `${Math.round(v * 100)}%`));
    section.appendChild(this.toggleRow(this.t('settings.depthHeatmap'), s.depthHeatmapVisible, (v) => this.patch({ depthHeatmapVisible: v })));
    section.appendChild(this.rangeRow(this.t('settings.depthHeatmapOpacity'), s.depthHeatmapOpacity, 0.1, 1, 0.05, (v) => this.patch({ depthHeatmapOpacity: v }), (v) => `${Math.round(v * 100)}%`));
    section.appendChild(this.toggleRow(this.t('settings.swingMarkers'), s.pivotMarkersVisible, (v) => this.patch({ pivotMarkersVisible: v })));
    section.appendChild(this.rangeRow(this.t('settings.swingStrength'), s.pivotStrength, 2, 20, 1, (v) => this.patch({ pivotStrength: v })));
    section.appendChild(this.toggleRow(this.t('settings.swingStructure'), s.pivotStructureLabels, (v) => this.patch({ pivotStructureLabels: v })));
    section.appendChild(this.toggleRow(this.t('settings.sessionShading'), s.sessionShadingVisible, (v) => this.patch({ sessionShadingVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.periodLevels'), s.periodLevelsVisible, (v) => this.patch({ periodLevelsVisible: v })));
    section.appendChild(this.selectRow(this.t('settings.periodLevelsBasis'), s.periodLevelsPeriod, [
      { value: 'day', label: this.t('settings.priorDay') },
      { value: 'week', label: this.t('settings.priorWeek') },
    ], (v) => this.patch({ periodLevelsPeriod: v as ChartSettingsState['periodLevelsPeriod'] })));
    section.appendChild(this.toggleRow(this.t('settings.ohlcLegend'), s.legendVisible, (v) => this.patch({ legendVisible: v })));
    section.appendChild(this.toggleRow(this.t('settings.indicatorValues'), s.indicatorValueLabels, (v) => this.patch({ indicatorValueLabels: v })));
    if (this.available.barCountdown !== false) {
      section.appendChild(this.toggleRow(this.t('settings.barCountdown'), s.barCountdown, (v) => this.patch({ barCountdown: v })));
    }

    // Crosshair mode
    section.appendChild(this.selectRow(this.t('settings.crosshairMode'), s.crosshairMode, [
      { label: this.t('settings.crosshair.magnet'), value: 'magnet' },
      { label: this.t('settings.crosshair.normal'), value: 'normal' },
      { label: this.t('settings.crosshair.hidden'), value: 'hidden' },
    ], (v) => this.patch({ crosshairMode: v as ChartSettingsState['crosshairMode'] })));

    section.appendChild(this.selectRow(this.t('settings.timezone'), s.timezone,
      timezoneOptions(s.timezone, Date.now(), this.t('settings.timezone.local'),
        this.available.exchangeZone
          ? { label: this.t('settings.timezone.exchange'), zone: this.available.exchangeZone() }
          : undefined),
      (v) => this.patch({ timezone: v })));
    section.appendChild(this.selectRow(this.t('settings.numberLocale'), s.numberLocale,
      numberLocaleOptions(s.numberLocale),
      (v) => this.patch({ numberLocale: v })));

    this.bodyEl.appendChild(section);
  }

  private renderScaleTab(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    const s = this.currentSettings;

    const section = this.section();
    section.appendChild(this.toggleRow(this.t('settings.autoScale'), s.autoScale, (v) => this.patch({ autoScale: v })));
    section.appendChild(this.toggleRow(this.t('settings.invertScale'), s.invertScale, (v) => this.patch({ invertScale: v })));
    section.appendChild(this.toggleRow(this.t('settings.leftScale'), s.leftPriceScale, (v) => this.patch({ leftPriceScale: v })));
    const scales = [
      { value: 'regular', label: this.t('settings.scale.regular') },
      { value: 'logarithmic', label: this.t('settings.scale.logarithmic') },
      { value: 'percentage', label: this.t('settings.scale.percentage') },
      { value: 'indexedTo100', label: this.t('settings.scale.indexedTo100') },
    ].filter((o) => o.value !== 'logarithmic' || this.available.logScale !== false);
    section.appendChild(this.selectRow(this.t('settings.priceScale'), s.scaleMode, scales,
      (v) => this.patch({ scaleMode: v as ChartSettingsState['scaleMode'] })));
    this.bodyEl.appendChild(section);
  }

  /** The settings of the chart's type, when it has any (Renko's box, Kagi's reversal…). */
  private renderChartTypeSection(): void {
    if (!this.bodyEl || !this.currentSettings || !this.chartType) return;
    const type = this.chartType;
    const all = this.currentSettings.chartTypeOptions ?? {};
    const def = CHART_TYPES.find((c) => c.value === type);
    const section = this.section(def ? chartTypeLabel(def, this.t) : type);
    /** Change one type's settings: the rest of its own stay. */
    const set = <K extends keyof ChartTypeOptions>(key: K, value: NonNullable<ChartTypeOptions[K]>) =>
      this.patch({ chartTypeOptions: { ...(this.currentSettings?.chartTypeOptions ?? {}), [key]: value } });
    switch (type) {
      case 'renko': {
        const o = all.renko ?? {};
        section.appendChild(this.numberRow(this.t('settings.boxSize'), typeof o.boxSize === 'number' ? o.boxSize : null, 'any',
          (v) => set('renko', { ...(this.currentSettings?.chartTypeOptions?.renko ?? {}), boxSize: v ?? 'atr' })));
        section.appendChild(this.numberRow(this.t('settings.atrPeriod'), o.atrPeriod ?? null, '1',
          (v) => set('renko', withValue(this.currentSettings?.chartTypeOptions?.renko, 'atrPeriod', v))));
        break;
      }
      case 'lineBreak':
        section.appendChild(this.numberRow(this.t('settings.lineBreakLines'), all.lineBreak?.lines ?? null, '1',
          (v) => set('lineBreak', withValue(this.currentSettings?.chartTypeOptions?.lineBreak, 'lines', v))));
        break;
      case 'kagi':
        section.appendChild(this.numberRow(this.t('settings.reversal'), all.kagi?.reversal ?? null, 'any',
          (v) => set('kagi', withValue(this.currentSettings?.chartTypeOptions?.kagi, 'reversal', v))));
        section.appendChild(this.selectRow(this.t('settings.reversalType'), all.kagi?.reversalType ?? 'percent', [
          { value: 'percent', label: this.t('settings.reversalType.percent') },
          { value: 'price', label: this.t('settings.reversalType.price') },
        ], (v) => set('kagi', { ...(this.currentSettings?.chartTypeOptions?.kagi ?? {}), reversalType: v === 'price' ? 'price' : 'percent' })));
        break;
      case 'pointAndFigure':
        section.appendChild(this.numberRow(this.t('settings.boxSize'), typeof all.pointAndFigure?.boxSize === 'number' ? all.pointAndFigure.boxSize : null, 'any',
          (v) => set('pointAndFigure', { ...(this.currentSettings?.chartTypeOptions?.pointAndFigure ?? {}), boxSize: v ?? 'auto' })));
        section.appendChild(this.numberRow(this.t('settings.reversalBoxes'), all.pointAndFigure?.reversal ?? null, '1',
          (v) => set('pointAndFigure', withValue(this.currentSettings?.chartTypeOptions?.pointAndFigure, 'reversal', v))));
        break;
      case 'rangeBars':
        section.appendChild(this.numberRow(this.t('settings.barRange'), typeof all.rangeBars?.range === 'number' ? all.rangeBars.range : null, 'any',
          (v) => set('rangeBars', { range: v ?? 'auto' })));
        break;
      default:
        return;
    }
    this.bodyEl.appendChild(section);
  }

  /** A number field; empty means "worked out from the data" (shown as Auto). Only numbers above 0 are taken. */
  private numberRow(label: string, value: number | null, step: string, onChange: (v: number | null) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';
    const lbl = document.createElement('label');
    lbl.className = 'tcw-settings-label';
    lbl.textContent = label;
    row.appendChild(lbl);
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'tcw-settings-number';
    input.min = '0';
    input.step = step;
    input.placeholder = this.t('settings.auto');
    input.value = value === null ? '' : String(value);
    input.setAttribute('aria-label', label);
    input.addEventListener('change', () => {
      if (input.value.trim() === '') {
        input.removeAttribute('aria-invalid');
        onChange(null);
        return;
      }
      const v = Number(input.value);
      const ok = Number.isFinite(v) && v > 0 && (step !== '1' || Number.isInteger(v));
      input.toggleAttribute('aria-invalid', !ok);
      if (ok) onChange(v);
    });
    row.appendChild(input);
    return row;
  }

  private patch(partial: Partial<ChartSettingsState>): void {
    if (this.currentSettings) {
      Object.assign(this.currentSettings, partial);
    }
    this.callbacks.onChange(partial);
  }

  private section(title?: string): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'tcw-settings-section';
    if (title) {
      const t = document.createElement('div');
      t.className = 'tcw-settings-section-title';
      t.textContent = title;
      div.appendChild(t);
    }
    return div;
  }

  private colorRow(label: string, value: string, onChange: (v: string) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';

    const lbl = document.createElement('span');
    lbl.className = 'tcw-settings-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const wrap = document.createElement('div');
    wrap.className = 'tcw-color-picker-wrap';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;

    const hex = document.createElement('span');
    hex.className = 'tcw-color-hex';
    hex.textContent = value;

    input.addEventListener('input', () => {
      hex.textContent = input.value;
      onChange(input.value);
    });

    wrap.appendChild(input);
    wrap.appendChild(hex);
    row.appendChild(wrap);
    return row;
  }

  private toggleRow(label: string, value: boolean, onChange: (v: boolean) => void): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';

    const lbl = document.createElement('span');
    lbl.className = 'tcw-settings-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const toggle = document.createElement('button');
    toggle.className = `tcw-toggle${value ? ' tcw-on' : ''}`;
    toggle.addEventListener('click', () => {
      const newVal = !toggle.classList.contains('tcw-on');
      toggle.classList.toggle('tcw-on', newVal);
      onChange(newVal);
    });
    row.appendChild(toggle);
    return row;
  }

  private selectRow(
    label: string,
    value: string,
    options: { label: string; value: string }[],
    onChange: (v: string) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';

    const lbl = document.createElement('span');
    lbl.className = 'tcw-settings-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const select = document.createElement('select');
    select.className = 'tcw-settings-select';
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === value) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => onChange(select.value));
    row.appendChild(select);
    return row;
  }

  private rangeRow(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    format: (v: number) => string = (v) => String(v),
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-settings-row';

    const lbl = document.createElement('span');
    lbl.className = 'tcw-settings-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const wrap = document.createElement('div');
    wrap.className = 'tcw-settings-range';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);

    const out = document.createElement('span');
    out.className = 'tcw-settings-range-val';
    out.textContent = format(value);

    input.addEventListener('input', () => {
      const v = Number(input.value);
      out.textContent = format(v);
      onChange(v);
    });

    wrap.appendChild(input);
    wrap.appendChild(out);
    row.appendChild(wrap);
    return row;
  }

  destroy(): void {
    this.close();
  }
}

/** `settings` with `key` set to `value`, or without it (back to its default) for null. */
function withValue<T extends object, K extends string>(settings: T | undefined, key: K, value: number | null): T {
  const next = { ...(settings ?? {}) } as Record<string, unknown>;
  if (value === null) delete next[key];
  else next[key] = value;
  return next as T;
}
