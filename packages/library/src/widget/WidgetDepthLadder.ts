import type { DepthData } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { buildLadderRows, type LadderModel } from './ladderRows.js';

export interface DepthLadderCallbacks {
  /** Buy at `price` (clicked an ask cell) or sell at `price` (clicked a bid cell). */
  onTrade: (side: 'buy' | 'sell', price: number) => void;
  formatPrice: (price: number) => string;
}

/**
 * Depth-of-market ladder (DOM). Renders the order book as price rows with bid
 * and ask size columns; clicking an ask cell buys at that price, a bid cell
 * sells. Fed by `setData(depth)`; the bar widths scale to the largest visible
 * size.
 */
export class WidgetDepthLadder {
  private el: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private callbacks: DepthLadderCallbacks;
  private open = false;
  private levels: number;

  constructor(host: HTMLElement, callbacks: DepthLadderCallbacks, levels = 12) {
    this.callbacks = callbacks;
    this.levels = levels;

    this.el = document.createElement('div');
    this.el.className = 'tcw-ladder';
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-ladder-header';
    const title = document.createElement('span');
    title.textContent = 'Depth Ladder';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-ladder-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    this.el.appendChild(header);

    const cols = document.createElement('div');
    cols.className = 'tcw-ladder-cols';
    cols.innerHTML = '<span>Bid</span><span>Price</span><span>Ask</span>';
    this.el.appendChild(cols);

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-ladder-body';
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

  setData(depth: DepthData | null): void {
    if (!depth) {
      this.renderEmpty();
      return;
    }
    this.render(buildLadderRows(depth, this.levels));
  }

  destroy(): void {
    this.el.remove();
  }

  private renderEmpty(): void {
    this.bodyEl.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'tcw-ladder-empty';
    empty.textContent = 'No order-book data';
    this.bodyEl.appendChild(empty);
  }

  private render(model: LadderModel): void {
    this.bodyEl.replaceChildren();
    if (model.rows.length === 0) {
      this.renderEmpty();
      return;
    }
    const inv = model.maxVolume > 0 ? 1 / model.maxVolume : 0;

    for (const row of model.rows) {
      const isAsk = row.askVolume > 0;
      const tr = document.createElement('div');
      tr.className = 'tcw-ladder-row';

      // Bid cell (click → sell at price)
      const bid = document.createElement('button');
      bid.type = 'button';
      bid.className = 'tcw-ladder-cell tcw-ladder-bid';
      if (row.bidVolume > 0) {
        bid.textContent = formatSize(row.bidVolume);
        bid.style.setProperty('--w', `${(row.bidVolume * inv * 100).toFixed(1)}%`);
        bid.title = `Sell @ ${this.callbacks.formatPrice(row.price)}`;
        bid.addEventListener('click', () => this.callbacks.onTrade('sell', row.price));
      } else {
        bid.disabled = true;
      }

      const price = document.createElement('div');
      price.className = `tcw-ladder-price ${isAsk ? 'tcw-ask' : 'tcw-bid'}`;
      price.textContent = this.callbacks.formatPrice(row.price);

      // Ask cell (click → buy at price)
      const ask = document.createElement('button');
      ask.type = 'button';
      ask.className = 'tcw-ladder-cell tcw-ladder-ask';
      if (row.askVolume > 0) {
        ask.textContent = formatSize(row.askVolume);
        ask.style.setProperty('--w', `${(row.askVolume * inv * 100).toFixed(1)}%`);
        ask.title = `Buy @ ${this.callbacks.formatPrice(row.price)}`;
        ask.addEventListener('click', () => this.callbacks.onTrade('buy', row.price));
      } else {
        ask.disabled = true;
      }

      tr.appendChild(bid);
      tr.appendChild(price);
      tr.appendChild(ask);
      this.bodyEl.appendChild(tr);
    }
  }
}

function formatSize(v: number): string {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
  if (v >= 1) return v.toFixed(2).replace(/\.00$/, '');
  return v.toPrecision(2);
}
