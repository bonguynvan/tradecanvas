import type { ChartType, TimeFrame } from '@tradecanvas/commons';
import type { ToolbarButtonSpec, ToolbarConfig, ToolbarCallbacks, WidgetState } from './types.js';
import { createChartTypeIcon, createIcon } from './icons.js';
import { escapeHtml as esc } from './escapeHtml.js';
import { WidgetDropdown } from './WidgetDropdown.js';
import { fill, type Translator } from './i18n.js';
import { chartTypeLabel } from './widgetLocales.js';

let toolbarCount = 0;

/** A host button's name: its label, with the text it shows when that says more ("News: 3"). */
export function setHostButtonName(btn: HTMLButtonElement, label: string): void {
  const text = btn.querySelector('.tcw-host-btn-text')?.textContent ?? '';
  if (text === label) btn.removeAttribute('aria-label');
  else btn.setAttribute('aria-label', text ? `${label}: ${text}` : label);
}

export class WidgetToolbar {
  private config: ToolbarConfig;
  private callbacks: ToolbarCallbacks;
  private t: Translator;
  private el: HTMLDivElement;
  private chartTypeDropdown: WidgetDropdown | null = null;
  private indicatorDropdown: WidgetDropdown | null = null;
  private tfGroup: HTMLDivElement | null = null;
  private tfDropdown: WidgetDropdown | null = null;
  private tfFavorites: TimeFrame[] = [];
  /** Tells this toolbar's element ids apart from another widget's on the page. */
  private readonly uid = (toolbarCount++).toString(36);
  private tfRendered = '';
  private themeBtn: HTMLButtonElement | null = null;
  /** Indicator templates' names, listed atop the indicators menu. */
  private indicatorTemplates: string[] = [];
  private fullscreenBtn: HTMLButtonElement | null = null;
  /** Where hosts' own buttons go: after the chart controls, and before the panel buttons. */
  private hostLeft: HTMLDivElement | null = null;
  private hostRight: HTMLDivElement | null = null;

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
    if (callbacks.onSymbolInfo) {
      const infoBtn = this.iconBtn('info', this.t('symbolInfo.title'), callbacks.onSymbolInfo);
      infoBtn.dataset.role = 'symbolInfo';
      el.appendChild(infoBtn);
    }
    el.appendChild(this.sep());

    // Timeframes: the favourites as buttons (plus the current one if it isn't
    // pinned); the menu lists them all, with a star to pin or unpin.
    this.tfFavorites = [...(config.timeframeFavorites ?? config.timeframes.map((tf) => tf.value))];
    this.tfGroup = document.createElement('div');
    this.tfGroup.className = 'tcw-toolbar-group tcw-tf-group';
    el.appendChild(this.tfGroup);
    if (callbacks.onToggleTimeframeFavorite && config.timeframes.length > 0) {
      const tfWrap = document.createElement('div');
      tfWrap.style.position = 'relative';
      tfWrap.style.display = 'inline-flex';
      const tfTrigger = document.createElement('button');
      tfTrigger.className = 'tcw-btn tcw-tf-more';
      tfTrigger.dataset.role = 'timeframes';
      tfTrigger.title = this.t('toolbar.timeframes');
      tfTrigger.setAttribute('aria-label', this.t('toolbar.timeframes'));
      tfTrigger.innerHTML = createIcon('chevronDown', 12);
      tfWrap.appendChild(tfTrigger);
      el.appendChild(tfWrap);
      this.tfDropdown = new WidgetDropdown(tfWrap, { width: '150px' });
      this.buildTimeframeMenu();
    }
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

    this.hostLeft = this.hostGroup();
    el.appendChild(this.hostLeft);

    // Spacer
    el.appendChild(this.spacer());

    // Right side buttons
    if (callbacks.onLayouts) {
      const onLayouts = callbacks.onLayouts;
      const layoutsBtn = document.createElement('button');
      layoutsBtn.type = 'button';
      layoutsBtn.className = 'tcw-dropdown-trigger tcw-layouts-btn';
      layoutsBtn.dataset.role = 'layouts';
      layoutsBtn.setAttribute('aria-haspopup', 'menu');
      layoutsBtn.addEventListener('click', () => onLayouts(layoutsBtn));
      el.appendChild(layoutsBtn);
      this.setLayout(null, false);
    }

    this.hostRight = this.hostGroup();
    el.appendChild(this.hostRight);

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

    if (callbacks.onToggleAccount) {
      const accountBtn = this.iconBtn('receipt', this.t('toolbar.account'), callbacks.onToggleAccount);
      accountBtn.dataset.role = 'account';
      accountBtn.setAttribute('aria-pressed', 'false');
      el.appendChild(accountBtn);
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

    if (callbacks.onToggleFullscreen) {
      this.fullscreenBtn = this.iconBtn('maximize', this.t('toolbar.fullscreen'), callbacks.onToggleFullscreen);
      this.fullscreenBtn.dataset.role = 'fullscreen';
      this.fullscreenBtn.setAttribute('aria-pressed', 'false');
      el.appendChild(this.fullscreenBtn);
    }
  }

  /** A host's own button, on the left or the right of the toolbar. */
  addHostButton(spec: ToolbarButtonSpec): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = spec.text || !spec.icon ? 'tcw-btn tcw-host-btn' : 'tcw-btn-icon tcw-host-btn';
    btn.dataset.hostButton = spec.id;
    btn.title = spec.label;
    if (spec.toggle) btn.setAttribute('aria-pressed', 'false');
    if (typeof spec.icon === 'string') btn.innerHTML = createIcon(spec.icon, 14);
    else if (spec.icon) btn.appendChild(spec.icon);
    const text = spec.text ?? (spec.icon ? '' : spec.label);
    if (text) {
      const span = document.createElement('span');
      span.className = 'tcw-host-btn-text';
      span.textContent = text;
      btn.appendChild(span);
    }
    setHostButtonName(btn, spec.label);
    btn.addEventListener('click', () => spec.onClick(btn));
    (spec.side === 'left' ? this.hostLeft : this.hostRight)?.appendChild(btn);
    return btn;
  }

  private hostGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'tcw-toolbar-host';
    return group;
  }

  /** Show a panel button (by its role: 'account', 'objects'…) as on or off. */
  setActive(role: string, on: boolean): void {
    const btn = this.el.querySelector<HTMLButtonElement>(`[data-role="${role}"]`);
    if (!btn) return;
    btn.classList.toggle('tcw-active', on);
    btn.setAttribute('aria-pressed', String(on));
  }

  /** The layout open now on its button (`null`: none saved yet), with a dot while it has unsaved changes. */
  setLayout(name: string | null, dirty: boolean): void {
    const btn = this.el.querySelector<HTMLButtonElement>('[data-role="layouts"]');
    if (!btn) return;
    const shown = name ?? this.t('layouts.unnamed');
    const label = `${this.t('toolbar.layouts')}: ${shown}${dirty ? ` (${this.t('layouts.unsavedChanges')})` : ''}`;
    btn.innerHTML = `${createIcon('save', 14)}<span class="tcw-layouts-label">${esc(shown)}</span>`
      + (dirty ? '<span class="tcw-layouts-dirty" aria-hidden="true"></span>' : '')
      + createIcon('chevronDown', 12);
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  /** Swap the fullscreen button between enter and exit. */
  setFullscreen(on: boolean): void {
    if (!this.fullscreenBtn) return;
    const label = this.t(on ? 'toolbar.exitFullscreen' : 'toolbar.fullscreen');
    this.fullscreenBtn.innerHTML = createIcon(on ? 'minimize' : 'maximize', 14);
    this.fullscreenBtn.title = label;
    this.fullscreenBtn.setAttribute('aria-pressed', String(on));
  }

  private chartTypeLabel(ct: { value: ChartType; label: string }): string {
    return chartTypeLabel(ct, this.t);
  }

  private buildChartTypeMenu(): void {
    if (!this.chartTypeDropdown) return;
    const items = this.config.chartTypes.map(ct =>
      `<button class="tcw-dropdown-item tcw-dropdown-item--icon" data-ct="${esc(ct.value)}">${createChartTypeIcon(ct.value, 16)}<span>${esc(this.chartTypeLabel(ct))}</span></button>`
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

  /** The symbol's name on its button, as a tooltip ("Apple Inc. · NASDAQ"). */
  setSymbolDescription(text: string | null): void {
    const btn = this.el.querySelector<HTMLButtonElement>('[data-role="symbol"]');
    if (!btn) return;
    if (text) btn.title = text;
    else btn.removeAttribute('title');
  }

  /** A new list of timeframes (a custom one added or removed), with its pins. */
  setTimeframes(timeframes: ToolbarConfig['timeframes'], favorites: TimeFrame[]): void {
    this.config = { ...this.config, timeframes };
    this.setTimeframeFavorites(favorites);
  }

  /** Re-pin after the user starred or unstarred a timeframe. */
  setTimeframeFavorites(favorites: TimeFrame[]): void {
    this.tfFavorites = [...favorites];
    this.tfRendered = '';
    this.buildTimeframeMenu();
  }

  private buildTimeframeMenu(): void {
    if (!this.tfDropdown) return;
    const pin = esc(this.t('toolbar.timeframes.pin'));
    const remove = esc(this.t('toolbar.timeframes.remove'));
    let html = `<div class="tcw-dropdown-label">${esc(this.t('toolbar.timeframes'))}</div>`;
    for (const tf of this.config.timeframes) {
      const pinned = this.tfFavorites.includes(tf.value);
      const [value, label] = [esc(tf.value), esc(tf.label)];
      html += `<div class="tcw-tf-row">`
        + `<button class="tcw-dropdown-item" data-tf-pick="${value}">${label}</button>`
        + (tf.custom && this.callbacks.onRemoveTimeframe
          ? `<button class="tcw-tf-remove" data-tf-remove="${value}" title="${remove}" aria-label="${remove}: ${label}">${createIcon('x', 12)}</button>`
          : '')
        + `<button class="tcw-tf-star${pinned ? ' tcw-active' : ''}" data-tf-star="${value}" aria-pressed="${pinned}"`
        + ` title="${pin}" aria-label="${pin}: ${label}">${createIcon('star', 12)}</button>`
        + `</div>`;
    }
    if (this.callbacks.onAddTimeframe) {
      const custom = esc(this.t('toolbar.timeframes.custom'));
      const add = esc(this.t('toolbar.timeframes.add'));
      html += `<form class="tcw-tf-custom" novalidate>`
        + `<input class="tcw-tf-custom-input" type="text" autocomplete="off" spellcheck="false" maxlength="6"`
        + ` placeholder="7m, 90m, 2h…" aria-label="${custom}" aria-describedby="tcw-tf-hint-${this.uid}">`
        + `<button type="submit" class="tcw-tf-custom-add" title="${add}" aria-label="${add}">${createIcon('plus', 12)}</button>`
        + `<div class="tcw-tf-custom-hint" id="tcw-tf-hint-${this.uid}" role="status"></div>`
        + `</form>`;
    }
    this.tfDropdown.setContent(html);

    const panel = this.tfDropdown['panel'] as HTMLDivElement;
    panel.querySelectorAll<HTMLButtonElement>('[data-tf-pick]').forEach((btn) => {
      btn.addEventListener('click', () => this.callbacks.onTimeframe(btn.dataset.tfPick as TimeFrame));
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-tf-star]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // pinning keeps the menu open
        this.callbacks.onToggleTimeframeFavorite?.(btn.dataset.tfStar as TimeFrame);
      });
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-tf-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onRemoveTimeframe?.(btn.dataset.tfRemove as TimeFrame);
      });
    });
    const form = panel.querySelector<HTMLFormElement>('.tcw-tf-custom');
    if (form) this.wireCustomTimeframe(form);
  }

  /** The custom-interval field: Enter or + adds it; text that isn't an interval is marked and kept. */
  private wireCustomTimeframe(form: HTMLFormElement): void {
    const input = form.querySelector<HTMLInputElement>('.tcw-tf-custom-input')!;
    const hint = form.querySelector<HTMLDivElement>('.tcw-tf-custom-hint')!;
    // Typing and clicking here must not toggle the menu shut.
    form.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      hint.textContent = '';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.callbacks.onAddTimeframe?.(input.value)) {
        input.value = '';
        hint.textContent = '';
        this.tfDropdown?.close();
        // The field just went away: put focus back where the menu opened.
        this.el.querySelector<HTMLButtonElement>('[data-role="timeframes"]')?.focus();
      } else {
        input.setAttribute('aria-invalid', 'true');
        hint.textContent = this.t('toolbar.timeframes.invalid');
      }
    });
  }

  private renderTimeframes(current: TimeFrame): void {
    if (!this.tfGroup) return;
    const shown = this.config.timeframes.filter((tf) => this.tfFavorites.includes(tf.value) || tf.value === current);
    const key = `${shown.map((tf) => tf.value).join(',')}|${current}`;
    if (key === this.tfRendered) return;
    this.tfRendered = key;

    this.tfGroup.replaceChildren(...shown.map((tf) => {
      const btn = document.createElement('button');
      btn.className = 'tcw-btn';
      btn.textContent = tf.label;
      btn.dataset.tf = tf.value;
      btn.classList.toggle('tcw-active', tf.value === current);
      btn.addEventListener('click', () => this.callbacks.onTimeframe(tf.value));
      return btn;
    }));
    const panel = this.tfDropdown?.['panel'] as HTMLDivElement | undefined;
    panel?.querySelectorAll<HTMLButtonElement>('[data-tf-pick]').forEach((btn) => {
      btn.classList.toggle('tcw-active', btn.dataset.tfPick === current);
    });
  }

  /**
   * The indicator templates to list (names), after one is saved or deleted.
   * `keepFocus`: focus was in the menu (a delete), so it goes to "Save…".
   */
  setIndicatorTemplates(names: readonly string[], keepFocus = false): void {
    this.indicatorTemplates = [...names];
    this.buildIndicatorMenu();
    if (keepFocus) (this.indicatorDropdown?.['panel'] as HTMLDivElement | undefined)?.querySelector<HTMLButtonElement>('[data-tpl-save]')?.focus();
  }

  /** Templates atop the indicators menu: apply one, delete one, save the chart's. */
  private templatesMenuHtml(): string {
    if (!this.callbacks.onSaveIndicatorTemplate) return '';
    const remove = this.t('templates.delete');
    let html = `<div class="tcw-dropdown-label">${esc(this.t('toolbar.indicators.templates'))}</div>`;
    for (const name of this.indicatorTemplates) {
      const n = esc(name);
      html += `<div class="tcw-tf-row">`
        + `<button class="tcw-dropdown-item" data-tpl-apply="${n}">${createIcon('layers', 14)}<span>${n}</span></button>`
        + `<button class="tcw-tf-remove" data-tpl-delete="${n}" title="${esc(fill(remove, { name }))}" aria-label="${esc(fill(remove, { name }))}">${createIcon('x', 12)}</button>`
        + `</div>`;
    }
    html += `<button class="tcw-dropdown-item" data-tpl-save>${createIcon('save', 14)}<span>${esc(this.t('templates.save'))}</span></button>`;
    return html + '<div class="tcw-dropdown-divider"></div>';
  }

  private buildIndicatorMenu(): void {
    if (!this.indicatorDropdown) return;
    const { indicators, popularIndicatorIds } = this.config;

    const popular = indicators.filter(d => popularIndicatorIds.includes(d.id));
    const other = indicators.filter(d => !popularIndicatorIds.includes(d.id));

    const typeLabel = (type: string) => this.t(`indicatorType.${type}` as Parameters<Translator>[0]);

    const row = (ind: (typeof indicators)[number]) =>
      `<button class="tcw-dropdown-item" data-ind="${esc(ind.id)}"><span>${esc(ind.name)}</span><span class="tcw-tag">${esc(typeLabel(ind.type))}</span></button>`;
    let html = this.templatesMenuHtml();
    html += `<div class="tcw-dropdown-label">${esc(this.t('toolbar.indicators.popular'))}</div>`;
    for (const ind of popular) html += row(ind);
    html += '<div class="tcw-dropdown-divider"></div>';
    html += `<div class="tcw-dropdown-label">${esc(this.t('toolbar.indicators.all'))}</div>`;
    for (const ind of other) html += row(ind);

    this.indicatorDropdown.setContent(html);

    const panel = this.indicatorDropdown['panel'] as HTMLDivElement;
    panel.querySelectorAll('.tcw-dropdown-item[data-ind]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.ind!;
        this.callbacks.onAddIndicator(id);
      });
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-tpl-apply]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.indicatorDropdown?.close();
        this.callbacks.onApplyIndicatorTemplate?.(btn.dataset.tplApply!);
      });
    });
    panel.querySelectorAll<HTMLButtonElement>('[data-tpl-delete]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // deleting keeps the menu open
        this.callbacks.onDeleteIndicatorTemplate?.(btn.dataset.tplDelete!);
      });
    });
    panel.querySelector<HTMLButtonElement>('[data-tpl-save]')?.addEventListener('click', () => {
      this.indicatorDropdown?.close();
      this.callbacks.onSaveIndicatorTemplate?.();
    });
  }

  update(state: WidgetState): void {
    // Symbol
    const symbolBtn = this.el.querySelector('[data-role="symbol"]') as HTMLButtonElement | null;
    if (symbolBtn) symbolBtn.textContent = state.symbol;

    // Timeframe buttons
    this.renderTimeframes(state.timeframe);

    // Chart type trigger label
    const ctTrigger = this.el.querySelector('[data-role="charttype"]') as HTMLElement | null;
    if (ctTrigger) {
      const ct = this.config.chartTypes.find(ct => ct.value === state.chartType);
      const label = ct ? this.chartTypeLabel(ct) : state.chartType;
      ctTrigger.innerHTML = `${createChartTypeIcon(state.chartType, 14)} ${esc(label)} ${createIcon('chevronDown', 12)}`;
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

    // Theme toggle icon
    if (this.themeBtn) {
      this.themeBtn.innerHTML = state.isDark ? createIcon('moon', 14) : createIcon('sun', 14);
    }
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
