import type { RangePreset } from '@tradecanvas/core';
import { createIcon } from './icons.js';
import { markPart } from './widgetFeatures.js';
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

/**
 * Bottom bar: range presets and "go to date" on the left (when `range` is
 * given), connection state and symbol on the right; hosts' own items after
 * the presets and before the market's status.
 */
export class WidgetStatusBar {
  private el: HTMLDivElement;
  private dotEl: HTMLSpanElement;
  private messageEl: HTMLSpanElement;
  private infoEl: HTMLSpanElement;
  private marketEl: HTMLSpanElement;
  private readonly hostLeft: HTMLDivElement;
  private readonly hostRight: HTMLDivElement;

  constructor(host: HTMLElement, range?: StatusBarRange) {
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

    this.infoEl = document.createElement('span');
    this.infoEl.className = 'tcw-status-info';
    markPart(this.infoEl, 'statusBar.symbol');
    right.appendChild(this.infoEl);

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
    this.infoEl.textContent = `${state.symbol} ${state.timeframe}`;
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
    this.el.remove();
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
