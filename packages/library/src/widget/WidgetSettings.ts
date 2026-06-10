import type { ChartSettingsState, SettingsCallbacks } from './types.js';
import { createIcon } from './icons.js';

type Tab = 'style' | 'display' | 'scale';
const TABS: Tab[] = ['style', 'display', 'scale'];

export class WidgetSettings {
  private callbacks: SettingsCallbacks;
  private backdrop: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private currentTab: Tab = 'style';
  private currentSettings: ChartSettingsState | null = null;
  private bodyEl: HTMLDivElement | null = null;
  private tabButtons: HTMLButtonElement[] = [];

  constructor(callbacks: SettingsCallbacks) {
    this.callbacks = callbacks;
  }

  open(currentSettings: ChartSettingsState): void {
    this.currentSettings = { ...currentSettings };
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
    document.body.appendChild(this.backdrop);

    // Modal
    this.modal = document.createElement('div');
    this.modal.className = 'tcw-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'tcw-modal-header';
    const h3 = document.createElement('h3');
    h3.textContent = 'Chart Settings';
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
      btn.textContent = tab;
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
    resetBtn.textContent = 'Reset to defaults';
    resetBtn.addEventListener('click', () => this.callbacks.onReset());
    footer.appendChild(resetBtn);
    const doneBtn = document.createElement('button');
    doneBtn.className = 'tcw-done-btn';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => {
      this.callbacks.onClose();
      this.close();
    });
    footer.appendChild(doneBtn);
    this.modal.appendChild(footer);

    document.body.appendChild(this.modal);

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

    // Candle Colors
    const candleSection = this.section('Candle Colors');
    candleSection.appendChild(this.colorRow('Up Body', s.candleUpColor, (v) => this.patch({ candleUpColor: v })));
    candleSection.appendChild(this.colorRow('Down Body', s.candleDownColor, (v) => this.patch({ candleDownColor: v })));
    candleSection.appendChild(this.colorRow('Up Wick', s.candleUpWick, (v) => this.patch({ candleUpWick: v })));
    candleSection.appendChild(this.colorRow('Down Wick', s.candleDownWick, (v) => this.patch({ candleDownWick: v })));
    this.bodyEl.appendChild(candleSection);

    // Background
    const bgSection = this.section('Background');
    bgSection.appendChild(this.colorRow('Background', s.backgroundColor, (v) => this.patch({ backgroundColor: v })));
    bgSection.appendChild(this.colorRow('Grid', s.gridColor, (v) => this.patch({ gridColor: v })));
    this.bodyEl.appendChild(bgSection);
  }

  private renderDisplayTab(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    const s = this.currentSettings;

    const section = this.section();
    section.appendChild(this.toggleRow('Grid Lines', s.gridVisible, (v) => this.patch({ gridVisible: v })));
    section.appendChild(this.toggleRow('Volume', s.volumeVisible, (v) => this.patch({ volumeVisible: v })));
    section.appendChild(this.toggleRow('Volume Profile', s.volumeProfileVisible, (v) => this.patch({ volumeProfileVisible: v })));
    section.appendChild(this.toggleRow('Market Profile (TPO)', s.marketProfileVisible, (v) => this.patch({ marketProfileVisible: v })));
    section.appendChild(this.toggleRow('MP split by session', s.marketProfileSplit, (v) => this.patch({ marketProfileSplit: v })));
    section.appendChild(this.toggleRow('MP letters (TPO)', s.marketProfileLetters, (v) => this.patch({ marketProfileLetters: v })));
    section.appendChild(this.rangeRow('MP buckets', s.marketProfileBuckets, 8, 200, 1, (v) => this.patch({ marketProfileBuckets: v })));
    section.appendChild(this.rangeRow('MP opacity', s.marketProfileOpacity, 0.05, 1, 0.05, (v) => this.patch({ marketProfileOpacity: v }), (v) => `${Math.round(v * 100)}%`));
    section.appendChild(this.toggleRow('Liquidity heatmap', s.depthHeatmapVisible, (v) => this.patch({ depthHeatmapVisible: v })));
    section.appendChild(this.rangeRow('Heatmap opacity', s.depthHeatmapOpacity, 0.1, 1, 0.05, (v) => this.patch({ depthHeatmapOpacity: v }), (v) => `${Math.round(v * 100)}%`));
    section.appendChild(this.toggleRow('Swing markers', s.pivotMarkersVisible, (v) => this.patch({ pivotMarkersVisible: v })));
    section.appendChild(this.rangeRow('Swing strength', s.pivotStrength, 2, 20, 1, (v) => this.patch({ pivotStrength: v })));
    section.appendChild(this.toggleRow('Session shading (RTH)', s.sessionShadingVisible, (v) => this.patch({ sessionShadingVisible: v })));
    section.appendChild(this.toggleRow('Prior-period levels', s.periodLevelsVisible, (v) => this.patch({ periodLevelsVisible: v })));
    section.appendChild(this.selectRow('Period levels basis', s.periodLevelsPeriod, [
      { value: 'day', label: 'Prior Day (PDH/PDL)' },
      { value: 'week', label: 'Prior Week (PWH/PWL)' },
    ], (v) => this.patch({ periodLevelsPeriod: v as ChartSettingsState['periodLevelsPeriod'] })));
    section.appendChild(this.toggleRow('OHLC Legend', s.legendVisible, (v) => this.patch({ legendVisible: v })));
    section.appendChild(this.toggleRow('Bar Countdown', s.barCountdown, (v) => this.patch({ barCountdown: v })));

    // Crosshair mode
    section.appendChild(this.selectRow('Crosshair Mode', s.crosshairMode, [
      { label: 'Magnet', value: 'magnet' },
      { label: 'Normal', value: 'normal' },
      { label: 'Hidden', value: 'hidden' },
    ], (v) => this.patch({ crosshairMode: v as ChartSettingsState['crosshairMode'] })));

    // Number locale
    section.appendChild(this.selectRow('Timezone', s.timezone, [
      { value: 'local', label: 'Local' },
      { value: '0', label: 'UTC / London' },
      { value: '-300', label: 'New York (UTC-5)' },
      { value: '-360', label: 'Chicago (UTC-6)' },
      { value: '60', label: 'Frankfurt (UTC+1)' },
      { value: '480', label: 'Singapore/HK (UTC+8)' },
      { value: '540', label: 'Tokyo (UTC+9)' },
      { value: '330', label: 'Mumbai (UTC+5:30)' },
    ], (v) => this.patch({ timezone: v })));
    section.appendChild(this.selectRow('Number Locale', s.numberLocale, [
      { label: 'en-US (65,234.00)', value: 'en-US' },
      { label: 'de-DE (65.234,00)', value: 'de-DE' },
      { label: 'fr-FR (65 234,00)', value: 'fr-FR' },
      { label: 'vi-VN (65.234,00)', value: 'vi-VN' },
      { label: 'en-IN (65,234.00)', value: 'en-IN' },
      { label: 'ja-JP (65,234.00)', value: 'ja-JP' },
    ], (v) => this.patch({ numberLocale: v })));

    this.bodyEl.appendChild(section);
  }

  private renderScaleTab(): void {
    if (!this.bodyEl || !this.currentSettings) return;
    const s = this.currentSettings;

    const section = this.section();
    section.appendChild(this.toggleRow('Auto Scale', s.autoScale, (v) => this.patch({ autoScale: v })));
    section.appendChild(this.selectRow('Price Scale', s.scaleMode, [
      { value: 'regular', label: 'Regular' },
      { value: 'logarithmic', label: 'Logarithmic' },
      { value: 'percentage', label: 'Percentage' },
      { value: 'indexedTo100', label: 'Indexed to 100' },
    ], (v) => this.patch({ scaleMode: v as ChartSettingsState['scaleMode'] })));
    this.bodyEl.appendChild(section);
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
