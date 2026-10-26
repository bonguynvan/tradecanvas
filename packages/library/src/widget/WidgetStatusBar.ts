import type { PriceScaleMode } from '@tradecanvas/commons';
import type { RangePreset } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import { markPart } from './widgetFeatures.js';
import { WidgetContextMenu, type ContextMenuEntry } from './WidgetContextMenu.js';
import type { StatusBarItemSpec } from './types.js';

export interface StatusBarRange {
  presets: readonly RangePreset[];
  /** Button text per preset; the preset itself when missing. */
  presetLabels?: Partial<Record<RangePreset, string>>;
  groupLabel: string;
  goToLabel: string;
  /** The name of the button that holds what the bar has folded away ("More"). */
  moreLabel: string;
  onPreset: (preset: RangePreset) => void;
  onGoTo: () => void;
  /**
   * The keys that go to a date now ("Alt+G"), shown beside it in the "more"
   * menu and its tooltip; undefined while they do nothing (switched off, or
   * taken by a key of the host's). Alt+G when not given.
   */
  goToKeys?: () => string | undefined;
}

/** Marks a button folded under "more" (the stylesheet hides it). */
const FOLDED_ATTR = 'data-tcw-folded';
/** On the bar while something is folded: "more" shows. */
const FOLDED_CLASS = 'tcw-statusbar--folded';
/** On the bar while the market's status shows its short word. */
const SHORT_MARKET_CLASS = 'tcw-statusbar--short-market';
/** Widths are fractional: a range bar this much over its room still fits. */
const FIT_SLACK_PX = 1;
const RANGE_ICON_PX = 13;
const GO_TO_ID = 'goto';
const GO_TO_KEYS = 'Alt+G';

/** The keys that go to a date now, as the widget says; Alt+G when it says nothing. */
const goToKeys = (range: StatusBarRange): string | undefined => (range.goToKeys ? range.goToKeys() : GO_TO_KEYS);

/** A span of text with a class, built without markup. */
function textSpan(className: string, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

/** The clock: the time in the display zone, and the zones to pick from. */
export interface StatusBarClock {
  /** Its tooltip, and its menu's name. */
  label: string;
  /** The time now ("14:05:09") and the zone it is in ("UTC+7"). */
  now: () => { time: string; zone: string };
  /** The zones to offer, and the one in use. */
  options: () => { current: string; list: readonly { value: string; label: string }[] };
  onPick: (value: string) => void;
}

/** The price scale's switches: percent, log (when the chart offers it), auto. */
export interface StatusBarScale {
  /** Their names (the group's, and each switch's). */
  labels: { group?: string; percent: string; log: string; auto: string };
  /** What the log and auto switches show ('log', 'auto'); the percent sign shows itself. */
  texts?: { log: string; auto: string };
  onPercent: () => void;
  onLog?: () => void;
  onAuto: () => void;
}

/**
 * Bottom bar: range presets and "go to date" on the left (when `range` is
 * given); the market's status, the connection, the clock and the price
 * scale's switches on the right; hosts' own items after the presets and
 * before the market's status. What the bar has no room for folds under
 * "more" (see `fit`).
 */
export class WidgetStatusBar {
  private el: HTMLDivElement;
  private dotEl: HTMLSpanElement;
  private messageEl: HTMLSpanElement;
  private marketEl: HTMLSpanElement;
  private readonly hostLeft: HTMLDivElement;
  private readonly hostRight: HTMLDivElement;
  private clockBtn: HTMLButtonElement | null = null;
  private clockMenu: WidgetContextMenu | null = null;
  private scaleBtns: Partial<Record<'percent' | 'log' | 'auto', HTMLButtonElement>> | null = null;
  /** The scale as last shown: nothing to rewrite when it is the same. */
  private scaleShown = '';
  /** The market's status as last shown: the widget asks every 30 seconds. */
  private marketShown = '';
  /** The market's status, the connection, the clock and the scale: it keeps its width. */
  private readonly rightEl: HTMLDivElement;
  private rangeEl: HTMLDivElement | null = null;
  private presetBtns: HTMLButtonElement[] = [];
  private moreBtn: HTMLButtonElement | null = null;
  private goToBtn: HTMLButtonElement | null = null;
  private rangeMenu: WidgetContextMenu | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private fitFrame = 0;
  /** Gone: a late font or a frame asked for before then fits nothing. */
  private destroyed = false;

  /** `extras.label` names the bar, which holds the keyboard itself when nothing in it shows. */
  constructor(
    private readonly host: HTMLElement,
    range?: StatusBarRange,
    private readonly extras: { clock?: StatusBarClock; scale?: StatusBarScale; label?: string } = {},
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-statusbar';
    markPart(this.el, 'statusBar');
    if (extras.label) {
      this.el.setAttribute('role', 'group');
      this.el.setAttribute('aria-label', extras.label);
    }

    if (range) this.el.appendChild(this.buildRange(range));
    this.hostLeft = this.hostGroup();
    this.el.appendChild(this.hostLeft);

    const right = document.createElement('div');
    right.className = 'tcw-status-right';
    this.rightEl = right;
    this.hostRight = this.hostGroup();
    right.appendChild(this.hostRight);

    const indicator = document.createElement('div');
    indicator.className = 'tcw-status-indicator';
    markPart(indicator, 'statusBar.connection');

    this.dotEl = document.createElement('span');
    this.dotEl.className = 'tcw-status-dot';
    indicator.appendChild(this.dotEl);

    this.messageEl = document.createElement('span');
    indicator.appendChild(this.messageEl);

    this.marketEl = document.createElement('span');
    this.marketEl.className = 'tcw-status-market';
    this.marketEl.hidden = true;
    markPart(this.marketEl, 'statusBar.market');
    right.appendChild(this.marketEl);

    right.appendChild(indicator);
    if (extras.clock) right.appendChild(this.buildClock(extras.clock));
    if (extras.scale) right.appendChild(this.buildScale(extras.scale));

    this.el.appendChild(right);
    host.appendChild(this.el);
    this.watchWidths(right);
  }

  /**
   * Fit again whenever the room for the range bar changes: the bar's own
   * width, or what the groups beside it hold (the market's word, a host's
   * item, the scale switches a narrow widget hides). They keep their width,
   * so the range bar alone takes up the difference.
   */
  private watchWidths(right: HTMLElement): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
      for (const el of [this.el, right, this.hostLeft]) this.resizeObserver.observe(el);
    }
    // A web font arriving late changes the words' widths.
    void document.fonts?.ready.then(() => this.scheduleFit());
  }

  /** Fit once before the next frame, however many changes came first; never once the bar is gone. */
  private scheduleFit(): void {
    if (this.destroyed || this.fitFrame || typeof requestAnimationFrame === 'undefined') return;
    this.fitFrame = requestAnimationFrame(() => {
      this.fitFrame = 0;
      if (!this.destroyed) this.fit();
    });
  }

  /**
   * Fit the bar to its width. The clock and the rest of the right group keep
   * their width; when the range bar then has too little room, its presets
   * fold under "more" one at a time, from the longest range, and go to date
   * after them (not while the presets, and "more" with them, are switched
   * off). Only when everything has folded and it still doesn't fit does the
   * market's status shorten to its word ("Closed"), and what fits in the
   * room that gives comes back.
   *
   * A refit that changes what is folded closes the "more" menu, whose
   * entries would be stale, and the keyboard stays on the bar when the
   * button it was on hides (see `keepFocus`).
   */
  fit(): void {
    const folded = this.foldedCount();
    const focused = this.rangeFocus();
    this.refit();
    if (this.foldedCount() !== folded) this.rangeMenu?.close();
    this.keepFocus(focused);
  }

  /** The folding and the market's word, as `fit` says; the menu and the keyboard are `fit`'s. */
  private refit(): void {
    const steps = this.foldSteps();
    const foldable = this.goToBtn ? [...this.presetBtns, this.goToBtn] : this.presetBtns;
    // Every button, not just the steps: one folded before its presets were switched off comes back.
    const fold = (count: number) => {
      const gone = new Set(steps.slice(0, count));
      for (const btn of foldable) btn.toggleAttribute(FOLDED_ATTR, gone.has(btn));
      this.el.classList.toggle(FOLDED_CLASS, count > 0);
    };
    fold(0);
    this.el.classList.remove(SHORT_MARKET_CLASS);
    if (this.el.clientWidth === 0 || this.fits()) return;
    let count = 0;
    while (count < steps.length) {
      fold(++count);
      if (this.fits()) return;
    }
    if (this.marketEl.hidden || this.isOff(this.marketEl)) return;
    this.el.classList.add(SHORT_MARKET_CLASS);
    // Back in the order they went, while they fit.
    for (; count > 0; count--) {
      fold(count - 1);
      if (this.fits()) continue;
      fold(count);
      return;
    }
  }

  /** Whether the bar shows all it holds: the range bar all its buttons, and the right group all of itself. */
  private fits(): boolean {
    return this.rangeFits() && this.rightFits();
  }

  /** Whether the range bar shows all it holds: it clips, so what's past its edge is its overflow. */
  private rangeFits(): boolean {
    const range = this.rangeEl;
    return !range || range.scrollWidth <= range.clientWidth + FIT_SLACK_PX;
  }

  /**
   * Whether the right group ends inside the bar's content edge. It keeps its
   * width, so when the range bar has nothing left to give (its presets and
   * go to date switched off, as `rangeBar: false` does, or no range bar at
   * all) and the bar is still too narrow, it runs past the bar's end: the
   * right edge, the left one right to left.
   *
   * Measured in layout pixels, as `rangeFits` is: the bar is position:
   * relative, so it is the group's offset parent. Boxes on screen are scaled
   * by a container's transform or zoom while the padding is not, so they
   * would put the group past an edge it is inside, and a dialog's scale-in
   * would leave the bar folded with room to spare. A stylesheet of yours
   * that takes the bar's position away measures the group from somewhere
   * else, so it counts as fitting then, rather than shorten the market's word
   * for room the bar has.
   */
  private rightFits(): boolean {
    if (this.rightEl.offsetParent !== this.el) return true;
    const style = getComputedStyle(this.el);
    const start = this.rightEl.offsetLeft;
    const past = style.direction === 'rtl'
      ? (parseFloat(style.paddingLeft) || 0) - start
      : start + this.rightEl.offsetWidth - (this.el.clientWidth - (parseFloat(style.paddingRight) || 0));
    return past <= FIT_SLACK_PX;
  }

  private foldedCount(): number {
    return this.rangeEl?.querySelectorAll(`[${FOLDED_ATTR}]`).length ?? 0;
  }

  /** The range bar's button the keyboard is on: "more" while it is in the menu "more" opened. */
  private rangeFocus(): HTMLElement | null {
    if (this.rangeMenu?.hasFocus()) return this.moreBtn;
    const active = document.activeElement;
    return active instanceof HTMLElement && this.rangeEl?.contains(active) ? active : null;
  }

  /**
   * Keep the keyboard on the range bar after a refit, when it was on
   * `focused` (or in the menu "more" opened, which the refit closed): see
   * `focusAfterRefit`. Another control of the bar, or the bar itself, takes
   * it when nothing there shows, so it never drops to the page.
   */
  private keepFocus(focused: HTMLElement | null): void {
    if (!focused || this.rangeMenu?.isOpen()) return;
    const target = this.focusAfterRefit(focused);
    if (target === this.el) this.focusBar();
    else if (document.activeElement !== target) target.focus({ preventScroll: true });
  }

  /**
   * Where the keyboard goes from `focused` after a refit: it stays on a
   * button that still shows; a preset or go to date that folded hands it to
   * "more"; "more" gone (nothing folded any more, or the presets switched
   * off) hands it to go to date, else to the last preset that shows, else to
   * the first control the rest of the bar shows (a button of yours, the
   * clock, a scale switch), else to the bar.
   */
  private focusAfterRefit(focused: HTMLElement): HTMLElement {
    if (this.shows(focused)) return focused;
    const lastPreset = this.presetBtns.filter((btn) => this.shows(btn)).at(-1);
    const next = [focused === this.moreBtn ? null : this.moreBtn, this.goToBtn, lastPreset]
      .find((btn): btn is HTMLButtonElement => btn != null && this.shows(btn));
    return next ?? this.firstOtherControl() ?? this.el;
  }

  /** The first button the bar shows outside the range bar, in its order; null when none does. */
  private firstOtherControl(): HTMLButtonElement | null {
    const others = [...this.el.querySelectorAll<HTMLButtonElement>('button')].filter((btn) => !this.rangeEl?.contains(btn));
    return others.find((btn) => !btn.disabled && btn.getClientRects().length > 0) ?? null;
  }

  /** The bar holds the keyboard: focusable only until it leaves, so a click on the bar later doesn't take it. */
  private focusBar(): void {
    if (document.activeElement === this.el) return;
    const unfocusable = () => this.el.removeAttribute('tabindex');
    this.el.tabIndex = -1;
    this.el.addEventListener('blur', unfocusable, { once: true });
    this.el.focus({ preventScroll: true });
    // Refused (the bar in an inert part of the page), it gets no blur to undo that.
    if (document.activeElement === this.el) return;
    this.el.removeEventListener('blur', unfocusable);
    unfocusable();
  }

  /** Whether a button of the range bar shows: not folded, not switched off, and "more" only while something is folded. */
  private shows(btn: HTMLElement): boolean {
    if (btn === this.moreBtn && !this.el.classList.contains(FOLDED_CLASS)) return false;
    return !btn.hasAttribute(FOLDED_ATTR) && !this.isOff(btn);
  }

  /** What folds, in the order it folds: the presets from the longest range, then go to date. */
  private foldSteps(): HTMLButtonElement[] {
    // With the presets switched off "more" is too: a folded go to date would be nowhere.
    if (this.presetBtns.length === 0 || this.isOff(this.presetBtns[0])) return [];
    const steps = [...this.presetBtns].reverse();
    if (this.goToBtn) steps.push(this.goToBtn);
    return steps;
  }

  /** Whether `el` is a part of a switch that is off. */
  private isOff(el: HTMLElement): boolean {
    const root = this.el.closest<HTMLElement>('.tcw-root') ?? this.host;
    const off = (root.getAttribute('data-tcw-off') ?? '').split(/\s+/).filter(Boolean);
    return (el.dataset.tcwPart ?? '').split(/\s+/).some((name) => off.includes(name));
  }

  update(state: { connectionState: string; message: string; symbol: string; timeframe: string }): void {
    this.dotEl.className = 'tcw-status-dot';
    if (state.connectionState === 'connected') {
      this.dotEl.classList.add('tcw-connected');
    } else if (state.connectionState === 'error') {
      this.dotEl.classList.add('tcw-error');
    }

    this.messageEl.textContent = state.message;
  }

  /** The clock to the time now: the widget calls it each second. */
  tick(): void {
    if (!this.clockBtn || !this.extras.clock) return;
    const { time, zone } = this.extras.clock.now();
    const text = `${time} ${zone}`;
    if (this.clockBtn.textContent !== text) this.clockBtn.textContent = text;
  }

  /** The price scale's switches as the chart is now: its mode, and whether it fits itself. */
  setScale(state: { mode: PriceScaleMode; auto: boolean }): void {
    const key = `${state.mode}|${state.auto}`;
    if (!this.scaleBtns || key === this.scaleShown) return;
    this.scaleShown = key;
    this.scaleBtns.percent?.setAttribute('aria-pressed', String(state.mode === 'percentage'));
    this.scaleBtns.log?.setAttribute('aria-pressed', String(state.mode === 'logarithmic'));
    this.scaleBtns.auto?.setAttribute('aria-pressed', String(state.auto));
  }

  /**
   * The market's status (open or closed); hidden for a market around the
   * clock. `short` ("Closed") shows instead of `text` ("Market closed") on a
   * bar out of room, which leaves `text` to screen readers and the tooltip.
   */
  setMarket(state: 'open' | 'closed' | 'always', text: string, short = text): void {
    const shown = `${state}|${text}|${short}`;
    if (shown === this.marketShown) return;
    this.marketShown = shown;
    this.marketEl.hidden = state === 'always';
    this.marketEl.dataset.state = state;
    if (state === 'always') {
      this.marketEl.replaceChildren();
      this.marketEl.removeAttribute('title');
      return;
    }
    this.marketEl.title = text;
    const shortEl = textSpan('tcw-status-market-short', short);
    shortEl.setAttribute('aria-hidden', 'true');
    this.marketEl.replaceChildren(textSpan('tcw-status-market-text', text), shortEl);
  }

  /** A host's own item: text, or a button when it has `onClick`. */
  addHostItem(spec: StatusBarItemSpec): HTMLElement {
    const onClick = spec.onClick;
    const item = onClick ? document.createElement('button') : document.createElement('span');
    item.className = onClick ? 'tcw-status-host-item tcw-status-host-btn' : 'tcw-status-host-item';
    item.dataset.hostItem = spec.id;
    // In its own text's direction, apart from the bar's: right to left a bare "42 ms" reads "ms 42".
    item.dir = 'auto';
    item.textContent = spec.text;
    if (spec.label) {
      item.title = spec.label;
      // A plain span's aria-label is ignored: as a labelled group it is read with its name.
      if (!onClick) item.setAttribute('role', 'group');
      if (spec.label !== spec.text) item.setAttribute('aria-label', `${spec.label}: ${spec.text}`);
    }
    if (item instanceof HTMLButtonElement && onClick) {
      item.type = 'button';
      item.addEventListener('click', () => onClick(item));
    }
    (spec.side === 'left' ? this.hostLeft : this.hostRight).appendChild(item);
    return item;
  }

  /** The holder of hosts' own items on the left or the right. */
  hostSlot(side: 'left' | 'right'): HTMLDivElement {
    return side === 'left' ? this.hostLeft : this.hostRight;
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.fitFrame) cancelAnimationFrame(this.fitFrame);
    this.clockMenu?.destroy();
    this.rangeMenu?.destroy();
    this.el.remove();
  }

  private buildClock(clock: StatusBarClock): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-status-clock';
    btn.dataset.role = 'clock';
    // "14:05:09 UTC+7" reads as one, in its own direction: right to left the time and the zone would swap.
    btn.dir = 'auto';
    btn.title = clock.label;
    btn.setAttribute('aria-haspopup', 'menu');
    markPart(btn, 'statusBar.clock');
    btn.addEventListener('click', () => this.toggleZones(btn, clock));
    this.clockBtn = btn;
    this.tick();
    return btn;
  }

  /** What the range bar has folded, as a menu over "more": the presets, then go to date; those switched off left out. */
  private toggleRangeMenu(anchor: HTMLButtonElement, range: StatusBarRange): void {
    if (this.rangeMenu?.isOpen()) {
      this.rangeMenu.close();
      return;
    }
    const listed = (btn: HTMLButtonElement) => btn.hasAttribute(FOLDED_ATTR) && !this.isOff(btn);
    const entries: ContextMenuEntry[] = range.presets
      .filter((_, i) => listed(this.presetBtns[i]))
      .map((preset) => ({ id: preset, label: range.presetLabels?.[preset] ?? preset }));
    if (this.goToBtn && listed(this.goToBtn)) {
      if (entries.length > 0) entries.push('separator');
      entries.push({ id: GO_TO_ID, label: range.goToLabel, icon: 'calendar', shortcut: goToKeys(range) });
    }
    if (entries.length === 0) return;
    this.rangeMenu ??= new WidgetContextMenu(this.host, range.groupLabel);
    const at = anchor.getBoundingClientRect();
    const box = this.host.getBoundingClientRect();
    // With no room after its start (right to left, the range bar is at the right edge) it ends where "more" does.
    this.rangeMenu.open(
      entries,
      at.left - box.left,
      at.top - box.top,
      (id) => (id === GO_TO_ID ? range.onGoTo() : range.onPreset(id as RangePreset)),
      anchor,
      undefined,
      at.right - box.left,
    );
  }

  /** The zones over the clock, the one in use ticked. */
  private toggleZones(anchor: HTMLButtonElement, clock: StatusBarClock): void {
    if (this.clockMenu?.isOpen()) {
      this.clockMenu.close();
      return;
    }
    const { current, list } = clock.options();
    this.clockMenu ??= new WidgetContextMenu(this.host, clock.label);
    const at = anchor.getBoundingClientRect();
    const box = this.host.getBoundingClientRect();
    this.clockMenu.open(
      list.map((zone) => ({ id: zone.value, label: zone.label, checked: zone.value === current })),
      at.left - box.left,
      at.top - box.top,
      (value) => clock.onPick(value),
      anchor,
      undefined,
      at.right - box.left,
    );
  }

  private buildScale(scale: StatusBarScale): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'tcw-status-scale';
    group.setAttribute('role', 'group');
    if (scale.labels.group) group.setAttribute('aria-label', scale.labels.group);
    markPart(group, 'statusBar.scale');
    const make = (name: 'percent' | 'log' | 'auto', text: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-status-scale-btn';
      btn.dataset.scale = name;
      btn.textContent = text;
      btn.title = scale.labels[name];
      btn.setAttribute('aria-label', scale.labels[name]);
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', onClick);
      group.appendChild(btn);
      return btn;
    };
    this.scaleBtns = {
      percent: make('percent', '%', scale.onPercent),
      ...(scale.onLog ? { log: make('log', scale.texts?.log ?? 'log', scale.onLog) } : {}),
      auto: make('auto', scale.texts?.auto ?? 'auto', scale.onAuto),
    };
    return group;
  }

  private hostGroup(): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'tcw-status-host';
    return group;
  }

  private buildRange(range: StatusBarRange): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'tcw-range-bar';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', range.groupLabel);

    for (const preset of range.presets) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-range-btn';
      btn.dataset.range = preset;
      markPart(btn, 'statusBar.range');
      btn.textContent = range.presetLabels?.[preset] ?? preset;
      btn.addEventListener('click', () => range.onPreset(preset));
      group.appendChild(btn);
      this.presetBtns.push(btn);
    }

    // After the presets still shown, while any are folded; switched off with them.
    const more = this.rangeIconBtn('tcw-range-more', 'rangeMore', 'more', range.moreLabel);
    markPart(more, 'statusBar.range');
    more.setAttribute('aria-haspopup', 'menu');
    more.setAttribute('aria-expanded', 'false');
    more.addEventListener('click', () => this.toggleRangeMenu(more, range));
    group.appendChild(more);
    this.moreBtn = more;

    const goTo = this.rangeIconBtn('tcw-range-goto', 'goto', 'calendar', range.goToLabel);
    markPart(goTo, 'goToDate', 'statusBar.goToDate');
    // Named with its keys as they are when the pointer or the keyboard comes, before its tooltip reads the title.
    const nameGoTo = () => {
      const keys = goToKeys(range);
      goTo.title = keys ? `${range.goToLabel} (${keys})` : range.goToLabel;
    };
    nameGoTo();
    goTo.addEventListener('pointerover', nameGoTo);
    goTo.addEventListener('focusin', nameGoTo);
    goTo.addEventListener('click', range.onGoTo);
    group.appendChild(goTo);
    this.goToBtn = goTo;
    this.rangeEl = group;
    return group;
  }

  /** A button of the range bar that shows an icon, named `label`. */
  private rangeIconBtn(className: string, role: string, icon: string, label: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tcw-range-btn ${className}`;
    btn.dataset.role = role;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = createIcon(icon, RANGE_ICON_PX);
    return btn;
  }
}
