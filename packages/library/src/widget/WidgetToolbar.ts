import type { ChartType } from '@tradecanvas/commons';
import type { ToolbarConfig, ToolbarCallbacks, WidgetState, ActiveIndicator } from './types.js';
import { createIcon } from './icons.js';
import { WidgetDropdown } from './WidgetDropdown.js';
import type { Translator } from './i18n.js';

export class WidgetToolbar {
  private config: ToolbarConfig;
  private callbacks: ToolbarCallbacks;
  private t: Translator;
  private el: HTMLDivElement;
  private chartTypeDropdown: WidgetDropdown | null = null;
  private indicatorDropdown: WidgetDropdown | null = null;
  private tfButtons: HTMLButtonElement[] = [];
  private chipsContainer: HTMLDivElement | null = null;
  private themeBtn: HTMLButtonElement | null = null;

  constructor(host: HTMLElement, config: ToolbarConfig, callbacks: ToolbarCallbacks, t: Translator) {
    this.config = config;
    this.callbacks = callbacks;
    this.t = t;
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
    if (callbacks.onToggleReplay) {
      const replayBtn = this.iconBtn('play', this.t('toolbar.replay'), callbacks.onToggleReplay);
      replayBtn.dataset.role = 'replay';
      el.appendChild(replayBtn);
    }

    if (callbacks.onBracket) {
      const onBracket = callbacks.onBracket;
      const longBtn = this.iconBtn('trendingUp', this.t('toolbar.longBracket'), () => onBracket('buy'));
      longBtn.dataset.role = 'long';
      longBtn.classList.add('tcw-btn-long');
      el.appendChild(longBtn);
      const shortBtn = this.iconBtn('trendingDown', this.t('toolbar.shortBracket'), () => onBracket('sell'));
      shortBtn.dataset.role = 'short';
      shortBtn.classList.add('tcw-btn-short');
      el.appendChild(shortBtn);
    }

    if (callbacks.onToggleLadder) {
      const ladderBtn = this.iconBtn('ladder', this.t('toolbar.depthLadder'), callbacks.onToggleLadder);
      ladderBtn.dataset.role = 'ladder';
      el.appendChild(ladderBtn);
    }

    if (callbacks.onToggleObjects) {
      const objectsBtn = this.iconBtn('layers', this.t('toolbar.objects'), callbacks.onToggleObjects);
      objectsBtn.dataset.role = 'objects';
      el.appendChild(objectsBtn);
    }

    if (callbacks.onToggleAlerts) {
      const alertsBtn = this.iconBtn('bell', this.t('toolbar.priceAlerts'), callbacks.onToggleAlerts);
      alertsBtn.dataset.role = 'alerts';
      el.appendChild(alertsBtn);
    }

    const screenshotBtn = this.iconBtn('camera', this.t('toolbar.screenshot'), callbacks.onScreenshot);
    el.appendChild(screenshotBtn);

    const settingsBtn = this.iconBtn('settings', this.t('toolbar.settings'), callbacks.onSettings);
    el.appendChild(settingsBtn);

    this.themeBtn = this.iconBtn('moon', this.t('toolbar.toggleTheme'), callbacks.onToggleTheme);
    this.themeBtn.dataset.role = 'theme';
    el.appendChild(this.themeBtn);
  }

  private chartTypeLabel(ct: { value: ChartType; label: string }): string {
    const key = `chartType.${ct.value}` as const;
    const translated = this.t(key as Parameters<Translator>[0]);
    return translated === key ? ct.label : translated;
  }

  private buildChartTypeMenu(): void {
    if (!this.chartTypeDropdown) return;
    const items = this.config.chartTypes.map(ct =>
      `<button class="tcw-dropdown-item" data-ct="${ct.value}">${this.chartTypeLabel(ct)}</button>`
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

    const typeLabel = (type: string) => this.t(`indicatorType.${type}` as Parameters<Translator>[0]);

    let html = `<div class="tcw-dropdown-label">${this.t('toolbar.indicators.popular')}</div>`;
    for (const ind of popular) {
      html += `<button class="tcw-dropdown-item" data-ind="${ind.id}"><span>${ind.name}</span><span class="tcw-tag">${typeLabel(ind.type)}</span></button>`;
    }
    html += '<div class="tcw-dropdown-divider"></div>';
    html += `<div class="tcw-dropdown-label">${this.t('toolbar.indicators.all')}</div>`;
    for (const ind of other) {
      html += `<button class="tcw-dropdown-item" data-ind="${ind.id}"><span>${ind.name}</span><span class="tcw-tag">${typeLabel(ind.type)}</span></button>`;
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
      const ct = this.config.chartTypes.find(ct => ct.value === state.chartType);
      const label = ct ? this.chartTypeLabel(ct) : state.chartType;
      ctTrigger.innerHTML = `${createIcon('barChart', 14)} ${label} ${createIcon('chevronDown', 12)}`;
    }

    // Indicator trigger + badge
    const indTrigger = this.el.querySelector('[data-role="indicators"]') as HTMLElement | null;
    if (indTrigger) {
      const count = state.activeIndicators.size;
      let inner = `${createIcon('trendingUp', 14)} ${this.t('toolbar.indicators')}`;
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
