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
    section.appendChild(this.toggleRow('OHLC Legend', s.legendVisible, (v) => this.patch({ legendVisible: v })));
    section.appendChild(this.toggleRow('Bar Countdown', s.barCountdown, (v) => this.patch({ barCountdown: v })));

    // Crosshair mode
    section.appendChild(this.selectRow('Crosshair Mode', s.crosshairMode, [
      { label: 'Magnet', value: 'magnet' },
      { label: 'Normal', value: 'normal' },
      { label: 'Hidden', value: 'hidden' },
    ], (v) => this.patch({ crosshairMode: v as ChartSettingsState['crosshairMode'] })));

    // Number locale
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
    section.appendChild(this.toggleRow('Log Scale', s.logScale, (v) => this.patch({ logScale: v })));
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

  destroy(): void {
    this.close();
  }
}
