import type { DepthData, TradingOrder } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { buildLadderRows, type LadderModel, type LadderRow } from './ladderRows.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import { markPart } from './widgetFeatures.js';

export interface DepthLadderCallbacks {
  /** Buy at `price` (clicked an ask cell) or sell at `price` (clicked a bid cell). */
  onTrade: (side: 'buy' | 'sell', price: number) => void;
  formatPrice: (price: number) => string;
  /** The market's price step at a price: an order marks the row within half of it. Unset, half the nearest rows' gap. */
  priceStep?: (price: number) => number;
  /** The ladder opened or closed. */
  onToggle?: (open: boolean) => void;
  /** Its own × pressed: the dock that holds it shuts it. Unset, it closes itself. */
  onClose?: () => void;
}

/** Without two rows to measure a tick by, prices nearer than this are one price. */
const DEFAULT_EPSILON = 1e-9;

/** A row as drawn: its cells, kept while the book's prices stay, so a press never loses its button. */
interface DrawnRow {
  price: number;
  row: HTMLDivElement;
  bid: HTMLButtonElement;
  ask: HTMLButtonElement;
  cell: HTMLDivElement;
  figure: HTMLSpanElement;
}

/**
 * Depth-of-market ladder (DOM), a page of the dock: the order book as price
 * rows, asks over bids with the spread between, a bar for each side's size.
 * A press on an ask buys at its price, on a bid sells; the rows where your
 * orders wait carry their quantity. Fed by `setData(depth)` and `setOrders`;
 * drawn only while open.
 */
export class WidgetDepthLadder {
  private el: HTMLElement;
  private colsEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private callbacks: DepthLadderCallbacks;
  private open = false;
  private levels: number;
  private model: LadderModel | null = null;
  private orders: readonly TradingOrder[] = [];
  private drawn: DrawnRow[] = [];
  private spreadEl: HTMLDivElement;
  /** The spread was brought into view since the ladder opened: a scroll of the user's stays. */
  private placed = false;

  constructor(host: HTMLElement, callbacks: DepthLadderCallbacks, levels = 12, private readonly t: Translator = EN_TRANSLATOR) {
    this.callbacks = callbacks;
    this.levels = levels;

    this.el = document.createElement('section');
    this.el.className = 'tcw-ladder';
    this.el.setAttribute('aria-label', this.t('ladder.title'));
    markPart(this.el, 'depthLadder');
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-ladder-header';
    const title = document.createElement('h3');
    title.className = 'tcw-ladder-title';
    title.textContent = this.t('ladder.title');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-ladder-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => (this.callbacks.onClose ? this.callbacks.onClose() : this.close()));
    header.append(title, closeBtn);

    this.colsEl = document.createElement('div');
    this.colsEl.className = 'tcw-ladder-cols';
    for (const key of ['ladder.bid', 'ladder.price', 'ladder.ask'] as const) {
      const label = document.createElement('span');
      label.textContent = this.t(key);
      this.colsEl.appendChild(label);
    }

    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-ladder-body';
    this.spreadEl = document.createElement('div');
    this.spreadEl.className = 'tcw-ladder-spread';
    this.el.append(header, this.colsEl, this.bodyEl);
    host.appendChild(this.el);
  }

  /** The panel, for the dock to hold. */
  get element(): HTMLElement {
    return this.el;
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.placed = false;
    this.el.hidden = false;
    this.render();
    this.callbacks.onToggle?.(true);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.callbacks.onToggle?.(false);
  }

  setData(depth: DepthData | null): void {
    this.model = depth ? buildLadderRows(depth, this.levels) : null;
    this.render();
  }

  /** The working orders, marked on the rows at their prices. */
  setOrders(orders: readonly TradingOrder[]): void {
    this.orders = orders;
    this.render();
  }

  destroy(): void {
    this.el.remove();
  }

  /**
   * The rows, while open. With the same prices as drawn, the cells are
   * rewritten in place: a feed's many updates of sizes never take a button
   * from under a press or the focus.
   */
  private render(): void {
    if (!this.open) return;
    const model = this.model;
    if (!model || model.rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tcw-ladder-empty';
      empty.textContent = this.t('ladder.empty');
      this.bodyEl.replaceChildren(empty);
      this.drawn = [];
      return;
    }
    const gap = halfTick(model.rows);
    const samePrices = model.rows.length === this.drawn.length && model.rows.every((row, i) => row.price === this.drawn[i].price);
    if (!samePrices) {
      this.drawn = model.rows.map((row) => this.newRow(row.price));
      this.bodyEl.replaceChildren(...this.drawn.map((drawn) => drawn.row));
    }
    const scale = model.maxVolume > 0 ? 100 / model.maxVolume : 0;
    model.rows.forEach((row, i) => this.fillRow(this.drawn[i], row, scale, this.nearness(row.price, gap)));
    this.putSpread(model, gap);
    this.placeSpread();
  }

  /**
   * The spread over the best bid, asks above it and bids below; none with a
   * side empty. Placed on every draw: a price can change side while the
   * book's prices stay the same.
   */
  private putSpread(model: LadderModel, gap: number): void {
    const { spread, bestBid } = model;
    const at = spread === null || bestBid === null ? -1 : model.rows.findIndex((row) => row.price < bestBid + gap);
    if (spread === null || at < 0) {
      this.spreadEl.remove();
      return;
    }
    this.spreadEl.textContent = fill(this.t('ladder.spread'), { spread: this.callbacks.formatPrice(spread) });
    const before = this.drawn[at].row;
    if (this.spreadEl.nextElementSibling !== before) this.bodyEl.insertBefore(this.spreadEl, before);
  }

  /** How near an order's price must be to `price` to wait there: half a step, never more than half the rows' gap. */
  private nearness(price: number, gap: number): number {
    const step = this.callbacks.priceStep?.(price) ?? 0;
    return step > 0 ? Math.min(step / 2, gap) : gap;
  }

  private newRow(price: number): DrawnRow {
    const row = document.createElement('div');
    row.className = 'tcw-ladder-row';
    const cell = document.createElement('div');
    cell.className = 'tcw-ladder-price';
    const figure = document.createElement('span');
    figure.className = 'tcw-ladder-figure';
    cell.appendChild(figure);
    const bid = this.newCell('sell', price);
    const ask = this.newCell('buy', price);
    row.append(bid, cell, ask);
    return { price, row, bid, ask, cell, figure };
  }

  private newCell(side: 'buy' | 'sell', price: number): HTMLButtonElement {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `tcw-ladder-cell ${side === 'sell' ? 'tcw-ladder-bid' : 'tcw-ladder-ask'}`;
    cell.addEventListener('click', () => this.callbacks.onTrade(side, price));
    return cell;
  }

  /** A row's price and sizes, its colour by side, and your orders at its price (a buy before the price, a sell after). */
  private fillRow(drawn: DrawnRow, row: LadderRow, scale: number, tolerance: number): void {
    drawn.cell.className = `tcw-ladder-price ${row.askVolume > 0 ? 'tcw-ask' : 'tcw-bid'}`;
    drawn.figure.textContent = this.callbacks.formatPrice(row.price);
    this.fillCell(drawn.bid, 'sell', row.bidVolume, row.price, scale);
    this.fillCell(drawn.ask, 'buy', row.askVolume, row.price, scale);
    for (const old of drawn.cell.querySelectorAll('.tcw-ladder-own')) old.remove();
    for (const side of ['buy', 'sell'] as const) {
      const quantity = this.orders
        .filter((o) => o.side === side && Math.abs(o.price - row.price) < tolerance)
        .reduce((sum, o) => sum + o.quantity, 0);
      if (quantity <= 0) continue;
      const mark = document.createElement('span');
      mark.className = 'tcw-ladder-own';
      mark.dataset.side = side;
      mark.textContent = String(quantity);
      // Its side in words, not by colour alone.
      const name = `${this.t(side === 'buy' ? 'ticket.buy' : 'ticket.sell')} ${quantity}`;
      mark.setAttribute('aria-label', name);
      mark.title = name;
      if (side === 'buy') drawn.cell.insertBefore(mark, drawn.figure);
      else drawn.cell.appendChild(mark);
    }
  }

  /** A side's size at a price, a bar as long as its share of the largest; named by the size it shows, then what a press does. */
  private fillCell(cell: HTMLButtonElement, side: 'buy' | 'sell', volume: number, price: number, scale: number): void {
    if (!(volume > 0)) {
      cell.disabled = true;
      cell.textContent = '';
      cell.removeAttribute('aria-label');
      cell.title = '';
      cell.style.removeProperty('--w');
      return;
    }
    cell.disabled = false;
    const size = formatSize(volume);
    cell.textContent = size;
    cell.style.setProperty('--w', `${(volume * scale).toFixed(1)}%`);
    const action = fill(this.t(side === 'sell' ? 'ladder.sellAt' : 'ladder.buyAt'), { price: this.callbacks.formatPrice(price) });
    cell.setAttribute('aria-label', `${size}, ${action}`);
    cell.title = action;
  }

  /**
   * The spread at the middle of the ladder's own page, under its sticky
   * heading, once after it opens: its page scrolls, not the host page around
   * the widget (as `scrollIntoView` would). Not before the page has a height
   * (its host hidden): the one try is kept for when it has.
   */
  private placeSpread(): void {
    const page = this.el;
    if (this.placed || !this.spreadEl.isConnected || page.clientHeight === 0) return;
    const top = page.getBoundingClientRect().top;
    const covered = this.colsEl.getBoundingClientRect().bottom - top;
    const offset = this.spreadEl.getBoundingClientRect().top - top;
    page.scrollTop += offset - covered - (page.clientHeight - covered - this.spreadEl.offsetHeight) / 2;
    this.placed = true;
  }
}

/** Half the smallest gap between the rows' prices: nearer than this is the same price, however small the tick. */
function halfTick(rows: readonly LadderRow[]): number {
  let gap = Infinity;
  for (let i = 1; i < rows.length; i++) gap = Math.min(gap, Math.abs(rows[i - 1].price - rows[i].price));
  return Number.isFinite(gap) && gap > 0 ? gap / 2 : DEFAULT_EPSILON;
}

/** A size short: thousands as "1.5k", two decimals at most, small sizes to two figures. */
function formatSize(v: number): string {
  if (v >= 1000) return `${Number((v / 1000).toFixed(1))}k`;
  if (v >= 1) return String(Number(v.toFixed(2)));
  return String(Number(v.toPrecision(2)));
}
