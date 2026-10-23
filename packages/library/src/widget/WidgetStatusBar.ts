import type { PriceScaleMode } from '@tradecanvas/commons';
import type { RangePreset } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import { markPart } from './widgetFeatures.js';
import { WidgetContextMenu } from './WidgetContextMenu.js';
import type { StatusBarItemSpec } from './types.js';

export interface StatusBarRange {
  presets: readonly RangePreset[];
  /** Button text per preset; the preset itself when missing. */
  presetLabels?: Partial<Record<RangePreset, string>>;
  groupLabel: string;
  goToLabel: string;
  onPreset: (preset: RangePreset) => void;
  onGoTo: () => void;
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
 * before the market's status.
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

  constructor(
    private readonly host: HTMLElement,
    range?: StatusBarRange,
    private readonly extras: { clock?: StatusBarClock; scale?: StatusBarScale } = {},
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-statusbar';
    markPart(this.el, 'statusBar');

    if (range) this.el.appendChild(this.buildRange(range));
    this.hostLeft = this.hostGroup();
    this.el.appendChild(this.hostLeft);

    const right = document.createElement('div');
    right.className = 'tcw-status-right';
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

  /** The market's status (open or closed); hidden for a market around the clock. */
  setMarket(state: 'open' | 'closed' | 'always', text: string): void {
    this.marketEl.hidden = state === 'always';
    this.marketEl.dataset.state = state;
    this.marketEl.textContent = state === 'always' ? '' : text;
  }

  /** A host's own item: text, or a button when it has `onClick`. */
  addHostItem(spec: StatusBarItemSpec): HTMLElement {
    const onClick = spec.onClick;
    const item = onClick ? document.createElement('button') : document.createElement('span');
    item.className = onClick ? 'tcw-status-host-item tcw-status-host-btn' : 'tcw-status-host-item';
    item.dataset.hostItem = spec.id;
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
    this.clockMenu?.destroy();
    this.el.remove();
  }

  private buildClock(clock: StatusBarClock): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tcw-status-clock';
    btn.dataset.role = 'clock';
    btn.title = clock.label;
    btn.setAttribute('aria-haspopup', 'menu');
    markPart(btn, 'statusBar.clock');
    btn.addEventListener('click', () => this.toggleZones(btn, clock));
    this.clockBtn = btn;
    this.tick();
    return btn;
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
    }

    const goTo = document.createElement('button');
    goTo.type = 'button';
    goTo.className = 'tcw-range-btn tcw-range-goto';
    goTo.dataset.role = 'goto';
    markPart(goTo, 'goToDate', 'statusBar.goToDate');
    goTo.title = `${range.goToLabel} (Alt+G)`;
    goTo.setAttribute('aria-label', range.goToLabel);
    goTo.innerHTML = createIcon('calendar', 13);
    goTo.addEventListener('click', range.onGoTo);
    group.appendChild(goTo);
    return group;
  }
}
