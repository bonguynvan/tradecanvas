import type { RangePreset } from '@tradecanvas/core';
import { createIcon } from './icons.js';

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
 * given), connection state and symbol on the right.
 */
export class WidgetStatusBar {
  private el: HTMLDivElement;
  private dotEl: HTMLSpanElement;
  private messageEl: HTMLSpanElement;
  private infoEl: HTMLSpanElement;
  private marketEl: HTMLSpanElement;

  constructor(host: HTMLElement, range?: StatusBarRange) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-statusbar';

    if (range) this.el.appendChild(this.buildRange(range));

    const right = document.createElement('div');
    right.className = 'tcw-status-right';

    const indicator = document.createElement('div');
    indicator.className = 'tcw-status-indicator';

    this.dotEl = document.createElement('span');
    this.dotEl.className = 'tcw-status-dot';
    indicator.appendChild(this.dotEl);

    this.messageEl = document.createElement('span');
    indicator.appendChild(this.messageEl);

    this.marketEl = document.createElement('span');
    this.marketEl.className = 'tcw-status-market';
    this.marketEl.hidden = true;
    right.appendChild(this.marketEl);

    right.appendChild(indicator);

    this.infoEl = document.createElement('span');
    this.infoEl.className = 'tcw-status-info';
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

  destroy(): void {
    this.el.remove();
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
      btn.textContent = range.presetLabels?.[preset] ?? preset;
      btn.addEventListener('click', () => range.onPreset(preset));
      group.appendChild(btn);
    }

    const goTo = document.createElement('button');
    goTo.type = 'button';
    goTo.className = 'tcw-range-btn tcw-range-goto';
    goTo.dataset.role = 'goto';
    goTo.title = `${range.goToLabel} (Alt+G)`;
    goTo.setAttribute('aria-label', range.goToLabel);
    goTo.innerHTML = createIcon('calendar', 13);
    goTo.addEventListener('click', range.onGoTo);
    group.appendChild(goTo);
    return group;
  }
}
