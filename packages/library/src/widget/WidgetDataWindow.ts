import { createIcon } from './icons.js';

export interface DataWindowIndicator {
  name: string;
  values: { key: string; value: number }[];
}

export interface DataWindowModel {
  ohlc: { open: number; high: number; low: number; close: number; volume: number } | null;
  change: number;
  changePct: number;
  indicators: DataWindowIndicator[];
}

export interface DataWindowCallbacks {
  formatPrice: (price: number) => string;
}

/**
 * Data Window — a floating readout of the exact O/H/L/C/V, change, and every
 * active indicator value at the hovered bar. Updated from `crosshairMove`.
 */
export class WidgetDataWindow {
  private el: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private callbacks: DataWindowCallbacks;
  private open = false;

  constructor(host: HTMLElement, callbacks: DataWindowCallbacks) {
    this.callbacks = callbacks;

    this.el = document.createElement('div');
    this.el.className = 'tcw-datawin';
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-datawin-header';
    const title = document.createElement('span');
    title.textContent = 'Data Window';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-datawin-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-datawin-body';
    this.el.appendChild(this.bodyEl);

    host.appendChild(this.el);
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open ? this.close() : this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.el.hidden = false;
  }

  close(): void {
    this.open = false;
    this.el.hidden = true;
  }

  destroy(): void {
    this.el.remove();
  }

  render(model: DataWindowModel): void {
    if (!this.open) return;
    this.bodyEl.replaceChildren();

    if (!model.ohlc) {
      const empty = document.createElement('div');
      empty.className = 'tcw-datawin-empty';
      empty.textContent = 'Hover the chart';
      this.bodyEl.appendChild(empty);
      return;
    }

    const fp = this.callbacks.formatPrice;
    const o = model.ohlc;
    this.bodyEl.appendChild(this.row('Open', fp(o.open)));
    this.bodyEl.appendChild(this.row('High', fp(o.high)));
    this.bodyEl.appendChild(this.row('Low', fp(o.low)));
    this.bodyEl.appendChild(this.row('Close', fp(o.close)));
    const tone = model.change > 0 ? 'up' : model.change < 0 ? 'down' : '';
    const sign = model.change > 0 ? '+' : '';
    this.bodyEl.appendChild(this.row('Change', `${sign}${fp(model.change)} (${sign}${model.changePct.toFixed(2)}%)`, tone));
    this.bodyEl.appendChild(this.row('Volume', formatVolume(o.volume)));

    for (const ind of model.indicators) {
      const head = document.createElement('div');
      head.className = 'tcw-datawin-sub';
      head.textContent = ind.name;
      this.bodyEl.appendChild(head);
      for (const v of ind.values) {
        this.bodyEl.appendChild(this.row(v.key, formatNumber(v.value)));
      }
    }
  }

  private row(label: string, value: string, tone = ''): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'tcw-datawin-row';
    const l = document.createElement('span');
    l.className = 'tcw-datawin-label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = `tcw-datawin-value${tone ? ` tcw-${tone}` : ''}`;
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) return v.toFixed(2);
  if (abs >= 1) return v.toFixed(4);
  return v.toPrecision(4);
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(2) + 'K';
  return v.toFixed(0);
}
