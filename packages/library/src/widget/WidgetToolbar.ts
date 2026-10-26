import type { ChartType, TimeFrame } from '@tradecanvas/commons';
import type { ToolbarButtonSpec, ToolbarConfig, ToolbarCallbacks, WidgetState } from './types.js';
import { createChartTypeIcon, createIcon } from './icons.js';
import { escapeHtml as esc } from './escapeHtml.js';
import { WidgetDropdown } from './WidgetDropdown.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import type { Translator } from './i18n.js';
import { chartTypeLabel } from './widgetLocales.js';
import { markPart, partAttr, tidyDividers } from './widgetFeatures.js';
import { timeframeSections } from './widgetTimeframes.js';
import { WidgetTradeMenu } from './WidgetTradeMenu.js';
import { splitVenue } from './symbolCatalog.js';

let toolbarCount = 0;

/** Marks a button folded under "more" (the stylesheet hides it). */
const FOLDED_ATTR = 'data-tcw-folded';
/** The browser lays boxes out in 64ths of a pixel: a difference this small is the same edge. */
const SUBPIXEL = 1 / 64;
/**
 * How far the symbol gives way when even everything folded has no room, a
 * step at a time (`data-tcw-squeeze` on the toolbar, which the stylesheet
 * reads): its venue cut short to an ellipsis, then the venue gone and the
 * ticker whole, then the ticker cut short.
 */
const SQUEEZE_STEPS = ['venue', 'ticker', 'cut'] as const;

/** The heading of each unit's section in the interval menu. */
const UNIT_HEADINGS = {
  T: 'toolbar.timeframes.ticks',
  s: 'toolbar.timeframes.seconds',
  m: 'toolbar.timeframes.minutes',
  h: 'toolbar.timeframes.hours',
  d: 'toolbar.timeframes.days',
  w: 'toolbar.timeframes.weeks',
  M: 'toolbar.timeframes.months',
} as const;

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
  private tfGroup: HTMLDivElement | null = null;
  private tfDropdown: WidgetDropdown | null = null;
  private tfFavorites: TimeFrame[] = [];
  /** Tells this toolbar's element ids apart from another widget's on the page. */
  private readonly uid = (toolbarCount++).toString(36);
  private tfRendered = '';
  private themeBtn: HTMLButtonElement | null = null;
  private fullscreenBtn: HTMLButtonElement | null = null;
  /** Where hosts' own buttons go: after the chart controls, and before the panel buttons. */
  private hostLeft: HTMLDivElement | null = null;
  private hostRight: HTMLDivElement | null = null;
  /** The "more" menu of a narrow toolbar: the buttons it hides. */
  private moreMenu: WidgetContextMenu | null = null;
  private tfCurrent: HTMLSpanElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  /** Tells of a host's group of buttons resized: a count in a button that grew or shrank. */
  private hostObserver: ResizeObserver | null = null;
  private moreBtn: HTMLButtonElement | null = null;
  private fitFrame = 0;
  /** Gone: a late font or a frame asked for before then fits nothing. */
  private destroyed = false;
  private undoBtn: HTMLButtonElement | null = null;
  private redoBtn: HTMLButtonElement | null = null;
  private trade: WidgetTradeMenu | null = null;
  /** What the layouts button shows now, its state and name: the same again changes nothing. */
  private layoutShown = '';
  /** The symbol its button shows now: the same again builds nothing. */
  private symbolShown: string | null = null;

  /**
   * `layer`: where the toolbar's menus open, over the page (the widget's
   * overlay layer), so no box around the widget clips them. Without one they
   * open inside their buttons.
   */
  constructor(
    private readonly host: HTMLElement,
    config: ToolbarConfig,
    callbacks: ToolbarCallbacks,
    t: Translator,
    private readonly layer?: () => HTMLElement,
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.t = t;
    this.el = document.createElement('div');
    this.el.className = 'tcw-toolbar';
    markPart(this.el, 'toolbar');
    this.build();
    host.appendChild(this.el);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.fit());
      this.resizeObserver.observe(this.el);
      // A host's button whose text grows widens its group, not the toolbar: a refit, only when its width changes.
      this.hostObserver = new ResizeObserver(() => this.scheduleFit());
      for (const group of [this.hostLeft, this.hostRight]) if (group) this.hostObserver.observe(group);
    }
    // A web font arriving late changes the labels' widths.
    void document.fonts?.ready.then(() => this.scheduleFit());
  }

  /** Fit once before the next frame, however many changes came first; never once the toolbar is gone. */
  private scheduleFit(): void {
    if (this.destroyed || this.fitFrame || typeof requestAnimationFrame === 'undefined') return;
    this.fitFrame = requestAnimationFrame(() => {
      this.fitFrame = 0;
      if (!this.destroyed) this.fit();
    });
  }

  /**
   * What a menu opened from `btn` hangs from: the button, or "more" while the
   * button is folded under it. A folded button has no box, so a menu placed
   * from it would open at the widget's corner.
   */
  menuAnchor(btn: HTMLElement): HTMLElement {
    const folded = btn.hasAttribute(FOLDED_ATTR) || this.el.closest('[data-tcw-narrow]') !== null;
    return folded && this.moreBtn ? this.moreBtn : btn;
  }

  /**
   * Fit the toolbar to its width. When everything doesn't fit, the buttons
   * on the right fold under "more" one at a time, from the right, until the
   * rest does; a host's buttons on the left come before them all, so they
   * fold last. When even that isn't enough, the menus show their icons only
   * and the interval buttons give way to the interval menu, and as many
   * buttons as then fit come back, from the left. Last of all, with nothing
   * left to fold (a long symbol on a phone), the symbol gives way, in
   * `SQUEEZE_STEPS`: its venue ("HYPERLIQUID:xyz:") is cut short to an
   * ellipsis before anything else shrinks, its ticker kept whole while the
   * buttons beside it can give. Each fit measures it whole, so it takes its
   * room back as soon as there is room.
   *
   * A refit that changes what is folded closes the menus hanging from "more"
   * or from a button that folded, whose place is gone, and the keyboard stays
   * on the toolbar when the button it was on hides (see `keepFocus`).
   */
  fit(): void {
    const focused = this.toolbarFocus();
    const folded = this.foldedState();
    this.refit();
    if (this.foldedState() !== folded) this.closeStaleMenus();
    if (focused) this.keepFocus(focused);
  }

  /** The folding, as `fit` says; the menus and the keyboard are `fit`'s. */
  private refit(): void {
    const { el } = this;
    const fits = () => this.fits();
    const items = [...el.querySelectorAll<HTMLElement>('.tcw-toolbar-overflow')];
    for (const item of items) item.removeAttribute(FOLDED_ATTR);
    el.classList.remove('tcw-toolbar--collapsed', 'tcw-toolbar--icons');
    delete el.dataset.tcwSqueeze;
    if (el.clientWidth === 0 || fits()) return;
    el.classList.add('tcw-toolbar--collapsed');
    for (let i = items.length - 1; i >= 0; i--) {
      items[i].setAttribute(FOLDED_ATTR, '');
      if (fits()) return;
    }
    el.classList.add('tcw-toolbar--icons');
    for (const item of items) {
      item.removeAttribute(FOLDED_ATTR);
      if (fits()) continue;
      item.setAttribute(FOLDED_ATTR, '');
      break;
    }
    for (const step of SQUEEZE_STEPS) {
      if (fits()) return;
      el.dataset.tcwSqueeze = step;
    }
  }

  /**
   * Whether the toolbar's controls end inside its content box: the padding
   * at its end clear (its left right to left), in its own layout px, as a
   * container's transform or zoom leaves them. Widths are fractional ("more"
   * ending at 1366.19 in a bar 1365 wide): the reach is rounded up to a
   * whole px and the room down, so no share of a pixel hangs past the edge.
   */
  private fits(): boolean {
    const { el } = this;
    const box = el.getBoundingClientRect();
    // The width on screen differs from the layout's by its rounding, unless something scales it.
    const scale = el.offsetWidth > 0 && Math.abs(box.width - el.offsetWidth) >= 1 ? box.width / el.offsetWidth : 1;
    const style = getComputedStyle(el);
    const rtl = style.direction === 'rtl';
    const px = (value: string) => parseFloat(value) || 0;
    const room = box.width / scale - (rtl
      ? px(style.borderLeftWidth) + px(style.paddingLeft)
      : px(style.borderRightWidth) + px(style.paddingRight));
    let reach = 0;
    for (const child of el.children) {
      // What the stylesheet hides (a folded button, "more" with nothing under it) has no box.
      if (child.getClientRects().length === 0) continue;
      const at = child.getBoundingClientRect();
      reach = Math.max(reach, (rtl ? box.right - at.left : at.right - box.left) / scale);
    }
    return Math.ceil(reach - SUBPIXEL) <= Math.floor(room + SUBPIXEL);
  }

  /** What is folded, and whether "more" shows, as one word to tell a refit that changed them. */
  private foldedState(): string {
    const items = [...this.el.querySelectorAll('.tcw-toolbar-overflow')];
    return `${this.el.classList.contains('tcw-toolbar--collapsed')}:${items.map((i) => Number(i.hasAttribute(FOLDED_ATTR))).join('')}`;
  }

  /** Close the menus that hang from "more", or from a button now folded: their entries or their place are stale. */
  private closeStaleMenus(): void {
    if (this.moreBtn) WidgetContextMenu.closeAnchoredTo(this.moreBtn);
    for (const btn of this.el.querySelectorAll<HTMLElement>(`[${FOLDED_ATTR}], [${FOLDED_ATTR}] button`)) {
      WidgetContextMenu.closeAnchoredTo(btn);
    }
  }

  /** The toolbar's button the keyboard is on: the one a menu hangs from while the keyboard is in the menu. */
  private toolbarFocus(): HTMLElement | null {
    const anchor = WidgetContextMenu.focusedAnchor();
    if (anchor && this.el.contains(anchor)) return anchor;
    const active = document.activeElement;
    return active instanceof HTMLElement && this.el.contains(active) ? active : null;
  }

  /**
   * Keep the keyboard on the toolbar after a refit: on `focused` while it
   * shows; on "more" when it folded; when "more" itself went (everything is
   * back), on the last button that came back, beside where "more" was. A
   * menu still open that holds it keeps it.
   */
  private keepFocus(focused: HTMLElement): void {
    if (WidgetContextMenu.focusedAnchor()) return;
    let target: HTMLElement | undefined = focused;
    if (!this.shows(focused)) {
      const more = this.moreBtn && focused !== this.moreBtn && this.shows(this.moreBtn) ? this.moreBtn : null;
      target = more ?? this.overflowButtons().filter((btn) => this.shows(btn)).at(-1);
    }
    if (target && document.activeElement !== target) target.focus({ preventScroll: true });
  }

  /** The buttons that can fold, in their order: those that fold whole, and those inside what folds (the Trade menu). */
  private overflowButtons(): HTMLButtonElement[] {
    return [...this.el.querySelectorAll<HTMLButtonElement>('button.tcw-toolbar-overflow, .tcw-toolbar-overflow button')];
  }

  /** Whether a toolbar button shows: not hidden, folded or switched off, and "more" only while the toolbar is collapsed or narrow. */
  private shows(btn: HTMLElement): boolean {
    if (btn.closest('[hidden]') || btn.closest(`[${FOLDED_ATTR}]`) || this.isOff(btn)) return false;
    const narrow = this.el.closest('[data-tcw-narrow]') !== null;
    if (btn === this.moreBtn) return narrow || this.el.classList.contains('tcw-toolbar--collapsed');
    return !(narrow && btn.closest('.tcw-toolbar-overflow'));
  }

  /** Whether `el`, or what holds it on the toolbar, is part of a switch that is off. */
  private isOff(el: HTMLElement): boolean {
    const off = new Set((this.rootEl().getAttribute('data-tcw-off') ?? '').split(/\s+/).filter(Boolean));
    for (let at: HTMLElement | null = el; at && at !== this.el; at = at.parentElement) {
      if ((at.dataset.tcwPart ?? '').split(/\s+/).some((name) => off.has(name))) return true;
    }
    return false;
  }

  private build(): void {
    const { config, callbacks, el } = this;

    // Symbol button: its venue and ticker in their own spans, read left to right in any widget.
    const symbolBtn = document.createElement('button');
    symbolBtn.className = 'tcw-toolbar-symbol';
    symbolBtn.dataset.role = 'symbol';
    symbolBtn.dir = 'ltr';
    markPart(symbolBtn, 'toolbar.symbol');
    symbolBtn.addEventListener('click', callbacks.onSymbolClick);
    el.appendChild(symbolBtn);
    if (callbacks.onSymbolInfo) {
      const infoBtn = this.iconBtn('info', this.t('symbolInfo.title'), callbacks.onSymbolInfo);
      infoBtn.classList.remove('tcw-toolbar-overflow');
      infoBtn.dataset.role = 'symbolInfo';
      markPart(infoBtn, 'symbolInfo', 'toolbar.symbolInfo');
      el.appendChild(infoBtn);
    }
    el.appendChild(this.sep());

    // Timeframes: the favourites as buttons (plus the current one if it isn't
    // pinned); the menu lists them all, with a star to pin or unpin.
    this.tfFavorites = [...(config.timeframeFavorites ?? config.timeframes.map((tf) => tf.value))];
    this.tfGroup = document.createElement('div');
    this.tfGroup.className = 'tcw-toolbar-group tcw-tf-group';
    markPart(this.tfGroup, 'toolbar.timeframes');
    el.appendChild(this.tfGroup);
    if (callbacks.onToggleTimeframeFavorite && config.timeframes.length > 0) {
      const tfWrap = document.createElement('div');
      tfWrap.style.position = 'relative';
      tfWrap.style.display = 'inline-flex';
      markPart(tfWrap, 'toolbar.timeframeMenu');
      const tfTrigger = document.createElement('button');
      tfTrigger.className = 'tcw-btn tcw-tf-more';
      tfTrigger.dataset.role = 'timeframes';
      tfTrigger.title = this.t('toolbar.timeframes');
      tfTrigger.setAttribute('aria-label', this.t('toolbar.timeframes'));
      // A narrow toolbar hides the timeframe buttons: this one then names the current one.
      this.tfCurrent = document.createElement('span');
      this.tfCurrent.className = 'tcw-tf-current';
      tfTrigger.appendChild(this.tfCurrent);
      tfTrigger.insertAdjacentHTML('beforeend', createIcon('chevronDown', 12));
      tfWrap.appendChild(tfTrigger);
      el.appendChild(tfWrap);
      this.tfDropdown = new WidgetDropdown(tfWrap, { width: '150px', layer: this.layer });
      // Fitting, the interval buttons may give way to this menu.
      el.classList.add('tcw-toolbar--tf-menu');
      this.buildTimeframeMenu();
    }
    el.appendChild(this.sep());

    // Chart type dropdown
    const ctWrap = document.createElement('div');
    ctWrap.style.position = 'relative';
    ctWrap.style.display = 'inline-flex';
    markPart(ctWrap, 'toolbar.chartType');

    const ctTrigger = document.createElement('button');
    ctTrigger.className = 'tcw-dropdown-trigger';
    ctTrigger.dataset.role = 'charttype';
    ctWrap.appendChild(ctTrigger);
    el.appendChild(ctWrap);

    this.chartTypeDropdown = new WidgetDropdown(ctWrap, { width: '160px', layer: this.layer });
    this.buildChartTypeMenu();

    el.appendChild(this.sep());

    // Indicators: the dialog that lists them all.
    const indTrigger = document.createElement('button');
    indTrigger.type = 'button';
    indTrigger.className = 'tcw-dropdown-trigger';
    indTrigger.dataset.role = 'indicators';
    indTrigger.setAttribute('aria-haspopup', 'dialog');
    indTrigger.setAttribute('aria-expanded', 'false');
    markPart(indTrigger, 'toolbar.indicators');
    indTrigger.addEventListener('click', () => callbacks.onIndicators());
    el.appendChild(indTrigger);

    if (callbacks.onCompare) {
      const compareBtn = document.createElement('button');
      compareBtn.type = 'button';
      compareBtn.className = 'tcw-dropdown-trigger';
      compareBtn.dataset.role = 'compare';
      markPart(compareBtn, 'compare', 'toolbar.compare');
      const label = this.t('objects.compare');
      compareBtn.setAttribute('aria-label', label);
      compareBtn.title = label;
      compareBtn.innerHTML = `${createIcon('plus', 14)} <span class="tcw-trigger-label">${esc(label)}</span>`;
      compareBtn.addEventListener('click', callbacks.onCompare);
      el.appendChild(compareBtn);
    }

    this.hostLeft = this.hostGroup();
    el.appendChild(this.hostLeft);

    // History: what the chart can undo and redo (drawings, indicators, settings).
    if (callbacks.onUndo && callbacks.onRedo) {
      el.appendChild(this.sep());
      this.undoBtn = this.iconBtn('undo', this.t('drawing.undo'), callbacks.onUndo);
      this.undoBtn.dataset.role = 'undo';
      markPart(this.undoBtn, 'toolbar.undo', 'sidebar.undo');
      this.redoBtn = this.iconBtn('redo', this.t('drawing.redo'), callbacks.onRedo);
      this.redoBtn.dataset.role = 'redo';
      markPart(this.redoBtn, 'toolbar.redo', 'sidebar.redo');
      el.append(this.undoBtn, this.redoBtn);
      this.setHistory(false, false);
    }

    // Spacer
    el.appendChild(this.spacer());

    // Right side buttons
    if (callbacks.onLayouts) {
      const onLayouts = callbacks.onLayouts;
      const layoutsBtn = document.createElement('button');
      layoutsBtn.type = 'button';
      layoutsBtn.className = 'tcw-dropdown-trigger tcw-layouts-btn tcw-toolbar-overflow';
      layoutsBtn.dataset.role = 'layouts';
      layoutsBtn.dataset.icon = 'save';
      markPart(layoutsBtn, 'layouts', 'toolbar.layouts');
      layoutsBtn.setAttribute('aria-haspopup', 'menu');
      layoutsBtn.addEventListener('click', () => onLayouts(this.menuAnchor(layoutsBtn)));
      el.appendChild(layoutsBtn);
      this.setLayout(null, false);
    }

    this.hostRight = this.hostGroup();
    el.appendChild(this.hostRight);
    el.appendChild(this.sep());

    if (callbacks.onToggleReplay) {
      const replayBtn = this.iconBtn('play', this.t('toolbar.replay'), callbacks.onToggleReplay);
      replayBtn.dataset.role = 'replay';
      markPart(replayBtn, 'replay', 'toolbar.replay');
      el.appendChild(replayBtn);
    }

    // The panels' buttons are switches from the start (`setActive`), so "more" lists them as such when off too.
    if (callbacks.onToggleObjects) {
      const objectsBtn = this.iconBtn('layers', this.t('toolbar.objects'), callbacks.onToggleObjects);
      objectsBtn.dataset.role = 'objects';
      objectsBtn.setAttribute('aria-pressed', 'false');
      markPart(objectsBtn, 'objectTree', 'toolbar.objectTree');
      el.appendChild(objectsBtn);
    }

    if (callbacks.onToggleAlerts) {
      const alertsBtn = this.iconBtn('bell', this.t('toolbar.priceAlerts'), callbacks.onToggleAlerts);
      alertsBtn.dataset.role = 'alerts';
      alertsBtn.setAttribute('aria-pressed', 'false');
      markPart(alertsBtn, 'alerts', 'toolbar.alerts');
      el.appendChild(alertsBtn);
    }

    // The trading tools in one menu: a new order, brackets, the ladder and the account.
    this.trade = WidgetTradeMenu.create(callbacks, this.t, () => this.rootEl(), (btn) => this.menuAnchor(btn));
    if (this.trade) el.appendChild(this.trade.button);
    el.appendChild(this.sep());

    const screenshotBtn = this.iconBtn('camera', this.t('toolbar.screenshot'), callbacks.onScreenshot);
    markPart(screenshotBtn, 'screenshot', 'toolbar.screenshot');
    el.appendChild(screenshotBtn);

    const settingsBtn = this.iconBtn('settings', this.t('toolbar.settings'), callbacks.onSettings);
    markPart(settingsBtn, 'settings', 'toolbar.settings');
    el.appendChild(settingsBtn);

    this.themeBtn = this.iconBtn('moon', this.t('toolbar.toggleTheme'), callbacks.onToggleTheme);
    this.themeBtn.dataset.role = 'theme';
    markPart(this.themeBtn, 'themeToggle', 'toolbar.themeToggle');
    el.appendChild(this.themeBtn);

    if (callbacks.onToggleFullscreen) {
      this.fullscreenBtn = this.iconBtn('maximize', this.t('toolbar.fullscreen'), callbacks.onToggleFullscreen);
      this.fullscreenBtn.dataset.role = 'fullscreen';
      markPart(this.fullscreenBtn, 'fullscreen', 'toolbar.fullscreen');
      this.fullscreenBtn.setAttribute('aria-pressed', 'false');
      el.appendChild(this.fullscreenBtn);
    }

    // A narrow toolbar keeps the chart's own controls and puts the rest here.
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'tcw-btn-icon tcw-toolbar-more';
    moreBtn.title = this.t('toolbar.more');
    moreBtn.setAttribute('aria-haspopup', 'menu');
    moreBtn.setAttribute('aria-expanded', 'false');
    moreBtn.innerHTML = createIcon('more', 16);
    moreBtn.addEventListener('click', () => this.toggleMore(moreBtn));
    el.appendChild(moreBtn);
    this.moreBtn = moreBtn;
  }

  /** The buttons a narrow toolbar hides, as a menu under `anchor`: those switched off left out. */
  private toggleMore(anchor: HTMLButtonElement): void {
    // This menu, or one picked from it (a host's, Trade, Layouts), hangs from
    // "more": a press closes it, so two menus are never open at once.
    if (WidgetContextMenu.closeAnchoredTo(anchor)) return;
    const root = this.rootEl();
    // Narrow, every button that can fold is under "more"; else those folded to fit.
    const narrow = this.el.closest('[data-tcw-narrow]') !== null;
    const buttons: HTMLButtonElement[] = [];
    for (const item of this.el.querySelectorAll<HTMLElement>('.tcw-toolbar-overflow')) {
      if (this.isOff(item) || (!narrow && !item.hasAttribute(FOLDED_ATTR))) continue;
      const found = item instanceof HTMLButtonElement ? [item] : [...item.querySelectorAll<HTMLButtonElement>('button')];
      // Not what can't be done now (undo with nothing to undo).
      buttons.push(...found.filter((btn) => !btn.hidden && !btn.disabled && !this.isOff(btn)));
    }
    if (buttons.length === 0) return;
    const entries: ContextMenuEntry[] = buttons.map((btn, i) => {
      // Its name before its tooltip: a host's button with a count is "News: 3", not "News".
      const label = btn.getAttribute('aria-label') || btn.title || btn.textContent?.trim() || '';
      // A switch stays one, on or off: its tick while on, its icon while off.
      const pressed = btn.getAttribute('aria-pressed');
      return pressed === null
        ? { id: String(i), label, icon: btn.dataset.icon }
        : { id: String(i), label, icon: btn.dataset.icon, checked: pressed === 'true' };
    });
    this.moreMenu ??= new WidgetContextMenu(root, this.t('toolbar.more'));
    // "More" is at the toolbar's end: the menu ends where it ends (its left edge, right to left).
    this.moreMenu.openUnder(entries, anchor, (id) => buttons[Number(id)]?.click(), 'end');
  }

  /** A host's own button, on the left or the right of the toolbar. */
  addHostButton(spec: ToolbarButtonSpec): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    // A host's button folds under "more" like the toolbar's own, on either side.
    // One on the left comes before them all, so it folds last and comes back first.
    btn.className = `${spec.text || !spec.icon ? 'tcw-btn' : 'tcw-btn-icon'} tcw-host-btn tcw-toolbar-overflow`;
    btn.dataset.hostButton = spec.id;
    if (typeof spec.icon === 'string') btn.dataset.icon = spec.icon;
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
    this.scheduleFit();
    return btn;
  }

  /** The holder of hosts' own buttons (and anything else of theirs) on one side. */
  hostSlot(side: 'left' | 'right'): HTMLDivElement | null {
    return side === 'left' ? this.hostLeft : this.hostRight;
  }

  private hostGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'tcw-toolbar-host';
    return group;
  }

  /** The symbol button opens the symbol search, unless it is switched off: then it only names the symbol. */
  setSymbolSearch(on: boolean): void {
    const btn = this.el.querySelector<HTMLButtonElement>('[data-role="symbol"]');
    if (!btn) return;
    if (on) btn.removeAttribute('aria-disabled');
    else btn.setAttribute('aria-disabled', 'true');
  }

  /** No separator left at an edge or next to another once buttons are switched off. */
  tidy(): void {
    this.trade?.tidy();
    tidyDividers(this.el, 'tcw-toolbar-sep', 'tcw-toolbar-spacer');
    this.scheduleFit();
  }

  /** What undo and redo can do now: each button is off while there is nothing for it. */
  setHistory(canUndo: boolean, canRedo: boolean): void {
    if (this.undoBtn) this.undoBtn.disabled = !canUndo;
    if (this.redoBtn) this.redoBtn.disabled = !canRedo;
  }

  /** The widget this toolbar is in, where its switches and menus live. */
  private rootEl(): HTMLElement {
    return this.el.closest<HTMLElement>('.tcw-root') ?? this.host;
  }

  /** Show a panel button (by its role: 'account', 'objects'…) as on or off. */
  setActive(role: string, on: boolean): void {
    this.trade?.setOpen(role, on);
    const btn = this.el.querySelector<HTMLButtonElement>(`[data-role="${role}"]`);
    if (!btn) return;
    btn.classList.toggle('tcw-active', on);
    btn.setAttribute('aria-pressed', String(on));
  }

  /** Hide the button of `role` while the dock's rail has its own for it (and leave it out of "more"). */
  setRailed(role: string, railed: boolean): void {
    const btn = this.el.querySelector<HTMLButtonElement>(`[data-role="${role}"]`);
    if (btn) btn.hidden = railed;
  }

  /**
   * The layout open now on its button (`null`: none saved yet), with a dot
   * while it has unsaved changes. A new name changes the button's width, not
   * the toolbar's, so no resize tells of it: the toolbar refits, lest "more"
   * be pushed past its end.
   */
  setLayout(name: string | null, dirty: boolean): void {
    const btn = this.el.querySelector<HTMLButtonElement>('[data-role="layouts"]');
    if (!btn) return;
    const shown = name ?? this.t('layouts.unnamed');
    if (this.layoutShown === `${dirty}:${shown}`) return;
    this.layoutShown = `${dirty}:${shown}`;
    const label = `${this.t('toolbar.layouts')}: ${shown}${dirty ? ` (${this.t('layouts.unsavedChanges')})` : ''}`;
    btn.innerHTML = `${createIcon('save', 14)}<span class="tcw-layouts-label">${esc(shown)}</span>`
      + (dirty ? '<span class="tcw-layouts-dirty" aria-hidden="true"></span>' : '')
      + createIcon('chevronDown', 12);
    btn.title = label;
    btn.setAttribute('aria-label', label);
    this.scheduleFit();
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
    // A section for each unit, ticks to months, under its heading.
    let html = '';
    for (const { unit, timeframes } of timeframeSections(this.config.timeframes)) {
      html += `<div class="tcw-tf-section" data-tf-section="${unit}" role="group" aria-label="${esc(this.t(UNIT_HEADINGS[unit]))}">`
        + `<div class="tcw-dropdown-label">${esc(this.t(UNIT_HEADINGS[unit]))}</div>`;
      for (const tf of timeframes) {
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
      html += '</div>';
    }
    if (this.callbacks.onAddTimeframe) {
      const custom = esc(this.t('toolbar.timeframes.custom'));
      const add = esc(this.t('toolbar.timeframes.add'));
      html += `<form class="tcw-tf-custom" ${partAttr('customTimeframes')} novalidate>`
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

    if (this.tfCurrent) this.tfCurrent.textContent = this.config.timeframes.find((tf) => tf.value === current)?.label ?? current;
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

  /** Whether the indicators dialog is open, on its button. */
  setIndicatorsOpen(open: boolean): void {
    this.el.querySelector('[data-role="indicators"]')?.setAttribute('aria-expanded', String(open));
  }

  /**
   * The symbol on its button, its venue ("BINANCE:") apart from its ticker,
   * the button marked when it has one: a toolbar with no room left cuts the
   * venue short first (`refit`).
   */
  private renderSymbol(symbol: string): void {
    const btn = this.el.querySelector<HTMLButtonElement>('[data-role="symbol"]');
    if (!btn || this.symbolShown === symbol) return;
    this.symbolShown = symbol;
    const { venue, ticker } = splitVenue(symbol);
    const part = (className: string, text: string) => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      return span;
    };
    btn.replaceChildren(...(venue ? [part('tcw-toolbar-venue', venue)] : []), part('tcw-toolbar-ticker', ticker));
    btn.classList.toggle('tcw-toolbar-symbol--venue', venue !== '');
    // A flex box reads its two parts apart, and a full bar hides the venue: the label keeps it whole.
    btn.setAttribute('aria-label', symbol);
  }

  update(state: WidgetState): void {
    this.renderSymbol(state.symbol);

    // Timeframe buttons
    this.renderTimeframes(state.timeframe);

    // Chart type trigger label
    const ctTrigger = this.el.querySelector('[data-role="charttype"]') as HTMLElement | null;
    if (ctTrigger) {
      const ct = this.config.chartTypes.find(ct => ct.value === state.chartType);
      const label = ct ? this.chartTypeLabel(ct) : state.chartType;
      // The icon alone: it says which type at a glance, its name in the tooltip.
      ctTrigger.innerHTML = createChartTypeIcon(state.chartType, 16);
      ctTrigger.title = label;
      ctTrigger.setAttribute('aria-label', label);
    }

    // Indicator trigger + badge
    const indTrigger = this.el.querySelector('[data-role="indicators"]') as HTMLElement | null;
    if (indTrigger) {
      const count = state.activeIndicators.size;
      let inner = `${createIcon('trendingUp', 14)} <span class="tcw-trigger-label">${esc(this.t('toolbar.indicators'))}</span>`;
      indTrigger.setAttribute('aria-label', this.t('toolbar.indicators'));
      if (count > 0) {
        inner += ` <span class="tcw-badge-count">${count}</span>`;
      }
      indTrigger.innerHTML = inner;
    }

    // Theme toggle icon
    if (this.themeBtn) {
      const icon = state.isDark ? 'moon' : 'sun';
      this.themeBtn.innerHTML = createIcon(icon, 14);
      this.themeBtn.dataset.icon = icon;
    }
    // Labels change width (another symbol, a longer chart type's name).
    this.scheduleFit();
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

  /** A button on the right: a narrow toolbar shows it in the "more" menu instead. */
  private iconBtn(icon: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'tcw-btn-icon tcw-toolbar-overflow';
    btn.dataset.icon = icon;
    btn.title = title;
    btn.innerHTML = createIcon(icon, 14);
    btn.addEventListener('click', onClick);
    return btn;
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.hostObserver?.disconnect();
    if (this.fitFrame) cancelAnimationFrame(this.fitFrame);
    this.chartTypeDropdown?.destroy();
    this.tfDropdown?.destroy();
    this.moreMenu?.destroy();
    this.trade?.destroy();
    this.el.remove();
  }
}
