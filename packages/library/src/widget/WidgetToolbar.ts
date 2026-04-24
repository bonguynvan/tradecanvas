import type { ChartType } from '@tradecanvas/commons';
import type { ToolbarConfig, ToolbarCallbacks, WidgetState, ActiveIndicator } from './types.js';
import { createIcon } from './icons.js';
import { WidgetDropdown } from './WidgetDropdown.js';

export class WidgetToolbar {
  private config: ToolbarConfig;
  private callbacks: ToolbarCallbacks;
  private el: HTMLDivElement;
  private chartTypeDropdown: WidgetDropdown | null = null;
  private indicatorDropdown: WidgetDropdown | null = null;
  private tfButtons: HTMLButtonElement[] = [];
  private chipsContainer: HTMLDivElement | null = null;
  private themeBtn: HTMLButtonElement | null = null;

  constructor(host: HTMLElement, config: ToolbarConfig, callbacks: ToolbarCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.el = document.createElement('div');
    this.el.className = 'tcw-toolbar';
    this.build();
    host.appendChild(this.el);
  }

  private build(): void {
    const { config, callbacks, el } = this;

    // Symbol button
    const symbolBtn = document.createElement('button');
    symbolBtn.className = 'tcw-toolbar-symbol';
    symbolBtn.dataset.role = 'symbol';
    symbolBtn.addEventListener('click', callbacks.onSymbolClick);
    el.appendChild(symbolBtn);
    el.appendChild(this.sep());

    // Timeframes
    const tfGroup = document.createElement('div');
    tfGroup.className = 'tcw-toolbar-group';
    for (const tf of config.timeframes) {
      const btn = document.createElement('button');
      btn.className = 'tcw-btn';
      btn.textContent = tf.label;
      btn.dataset.tf = tf.value;
      btn.addEventListener('click', () => callbacks.onTimeframe(tf.value));
      tfGroup.appendChild(btn);
      this.tfButtons.push(btn);
    }
    el.appendChild(tfGroup);
    el.appendChild(this.sep());

    // Chart type dropdown
    const ctWrap = document.createElement('div');
    ctWrap.style.position = 'relative';
    ctWrap.style.display = 'inline-flex';

    const ctTrigger = document.createElement('button');
    ctTrigger.className = 'tcw-dropdown-trigger';
    ctTrigger.dataset.role = 'charttype';
    ctWrap.appendChild(ctTrigger);
    el.appendChild(ctWrap);

    this.chartTypeDropdown = new WidgetDropdown(ctWrap, { width: '160px' });
    this.buildChartTypeMenu();

    el.appendChild(this.sep());

    // Indicators dropdown
    const indWrap = document.createElement('div');
    indWrap.style.position = 'relative';
    indWrap.style.display = 'inline-flex';

    const indTrigger = document.createElement('button');
    indTrigger.className = 'tcw-dropdown-trigger';
    indTrigger.dataset.role = 'indicators';
    indWrap.appendChild(indTrigger);
    el.appendChild(indWrap);

    this.indicatorDropdown = new WidgetDropdown(indWrap, { width: '280px' });
    this.buildIndicatorMenu();

    // Indicator chips
    this.chipsContainer = document.createElement('div');
    this.chipsContainer.className = 'tcw-indicator-chips';
    el.appendChild(this.chipsContainer);

    // Spacer
    el.appendChild(this.spacer());

    // Right side buttons
    const screenshotBtn = this.iconBtn('camera', 'Screenshot', callbacks.onScreenshot);
    el.appendChild(screenshotBtn);

    const settingsBtn = this.iconBtn('settings', 'Chart Settings', callbacks.onSettings);
    el.appendChild(settingsBtn);

    this.themeBtn = this.iconBtn('moon', 'Toggle theme', callbacks.onToggleTheme);
    this.themeBtn.dataset.role = 'theme';
    el.appendChild(this.themeBtn);
  }

  private buildChartTypeMenu(): void {
    if (!this.chartTypeDropdown) return;
    const items = this.config.chartTypes.map(ct =>
      `<button class="tcw-dropdown-item" data-ct="${ct.value}">${ct.label}</button>`
    ).join('');
    this.chartTypeDropdown.setContent(items);

    // Attach events to items after content set
    const panel = this.chartTypeDropdown['panel'] as HTMLDivElement;
    panel.querySelectorAll('.tcw-dropdown-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const value = (e.currentTarget as HTMLElement).dataset.ct as ChartType;
        this.callbacks.onChartType(value);
        this.chartTypeDropdown?.close();
      });
    });
  }

  private buildIndicatorMenu(): void {
    if (!this.indicatorDropdown) return;
    const { indicators, popularIndicatorIds } = this.config;

    const popular = indicators.filter(d => popularIndicatorIds.includes(d.id));
    const other = indicators.filter(d => !popularIndicatorIds.includes(d.id));

    let html = '<div class="tcw-dropdown-label">Popular</div>';
    for (const ind of popular) {
      html += `<button class="tcw-dropdown-item" data-ind="${ind.id}"><span>${ind.name}</span><span class="tcw-tag">${ind.type}</span></button>`;
    }
    html += '<div class="tcw-dropdown-divider"></div>';
    html += '<div class="tcw-dropdown-label">All</div>';
    for (const ind of other) {
      html += `<button class="tcw-dropdown-item" data-ind="${ind.id}"><span>${ind.name}</span><span class="tcw-tag">${ind.type}</span></button>`;
    }

    this.indicatorDropdown.setContent(html);

    const panel = this.indicatorDropdown['panel'] as HTMLDivElement;
    panel.querySelectorAll('.tcw-dropdown-item[data-ind]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.ind!;
        this.callbacks.onAddIndicator(id);
      });
    });
  }

  update(state: WidgetState): void {
    // Symbol
    const symbolBtn = this.el.querySelector('[data-role="symbol"]') as HTMLButtonElement | null;
    if (symbolBtn) symbolBtn.textContent = state.symbol;

    // Timeframe buttons
    for (const btn of this.tfButtons) {
      btn.classList.toggle('tcw-active', btn.dataset.tf === state.timeframe);
    }

    // Chart type trigger label
    const ctTrigger = this.el.querySelector('[data-role="charttype"]') as HTMLElement | null;
    if (ctTrigger) {
      const label = this.config.chartTypes.find(t => t.value === state.chartType)?.label ?? 'Candles';
      ctTrigger.innerHTML = `${createIcon('barChart', 14)} ${label} ${createIcon('chevronDown', 12)}`;
    }

    // Indicator trigger + badge
    const indTrigger = this.el.querySelector('[data-role="indicators"]') as HTMLElement | null;
    if (indTrigger) {
      const count = state.activeIndicators.size;
      let inner = `${createIcon('trendingUp', 14)} Indicators`;
      if (count > 0) {
        inner += ` <span class="tcw-badge-count">${count}</span>`;
      }
      indTrigger.innerHTML = inner;
    }

    // Chips
    if (this.chipsContainer) {
      const activeList = this.getActiveIndicatorList(state);
      this.chipsContainer.innerHTML = '';
      for (const ind of activeList) {
        const chip = document.createElement('div');
        chip.className = 'tcw-indicator-chip';

        const label = document.createElement('span');
        label.textContent = ind.label;
        chip.appendChild(label);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'tcw-chip-remove';
        removeBtn.innerHTML = createIcon('x', 10);
        removeBtn.addEventListener('click', () => this.callbacks.onRemoveIndicator(ind.instanceId));
        chip.appendChild(removeBtn);

        this.chipsContainer.appendChild(chip);
      }
    }

    // Theme toggle icon
    if (this.themeBtn) {
      this.themeBtn.innerHTML = state.isDark ? createIcon('moon', 14) : createIcon('sun', 14);
    }
  }

  private getActiveIndicatorList(state: WidgetState): ActiveIndicator[] {
    const result: ActiveIndicator[] = [];
    for (const [id, instanceId] of state.activeIndicators.entries()) {
      result.push({ instanceId, id, label: id.toUpperCase() });
    }
    return result;
  }

  private sep(): HTMLSpanElement {
    const s = document.createElement('span');
    s.className = 'tcw-toolbar-sep';
    return s;
  }

  private spacer(): HTMLSpanElement {
    const s = document.createElement('span');
    s.className = 'tcw-toolbar-spacer';
    return s;
  }

  private iconBtn(icon: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'tcw-btn-icon';
    btn.title = title;
    btn.innerHTML = createIcon(icon, 14);
    btn.addEventListener('click', onClick);
    return btn;
  }

  destroy(): void {
    this.chartTypeDropdown?.destroy();
    this.indicatorDropdown?.destroy();
    this.el.remove();
  }
}
