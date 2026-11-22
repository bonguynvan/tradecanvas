import type { Trade } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type Translator } from './i18n.js';
import { TapeModel, type TapeRow } from './tapeRows.js';
import { markPart } from './widgetFeatures.js';

export interface TapeCallbacks {
  /** A trade's time (ms) as the tape writes it: the time of day, to the second. */
  formatTime: (time: number) => string;
  formatPrice: (price: number) => string;
  /** A size, to the decimals every size on the tape is written to. */
  formatSize: (size: number, decimals: number) => string;
  /** The tape opened or closed: the feed's trades are followed while it is open. */
  onToggle?: (open: boolean) => void;
  /** Its own × pressed: the dock that holds it shuts it. Unset, it closes itself. */
  onClose?: () => void;
}

/** How the tape starts: how many rows it shows, and the least size of a trade it lists. */
export interface TapeOptions {
  /** How many rows it shows at the most (200; a thousand at the most). */
  rows?: number;
  /** Trades smaller than this are not listed (0: all are). */
  minSize?: number;
}

/**
 * The tape (time and sales), a page of the dock: the trades of the chart's
 * symbol as they are made, newest on top, each with its time, its price and
 * its size, in the colour of who took it. A bar over the list says how much
 * of the rows the buyers took and how much the sellers; a trade several
 * times the usual size stands out; trades under a least size can be left
 * out. Fed by `push(trades)`; drawn only while open, a burst of trades once
 * a frame, the new rows put on top of the ones there. Every size is written
 * to the same decimals: when a finer one comes, or a trade that was missed
 * comes late, the rows are all written again.
 */
export class WidgetTape {
  private readonly el: HTMLElement;
  private readonly bodyEl: HTMLDivElement;
  private readonly splitEl: HTMLDivElement;
  private readonly minEl: HTMLInputElement;
  private readonly emptyEl: HTMLDivElement;
  private readonly model: TapeModel;
  private open = false;
  /** Rows taken in since the last frame, newest first: what the next frame puts on top. */
  private pending: TapeRow[] = [];
  /** The rows on the page are no longer the model's (a late trade, finer sizes): the next frame writes them all. */
  private stale = false;
  /** The decimals the sizes on the page are written to. */
  private decimals = 0;
  private frame = 0;

  constructor(
    host: HTMLElement,
    private readonly callbacks: TapeCallbacks,
    options: TapeOptions = {},
    private readonly t: Translator = EN_TRANSLATOR,
  ) {
    this.model = new TapeModel(options.rows);
    this.model.setMinSize(options.minSize ?? 0);

    this.el = document.createElement('section');
    this.el.className = 'tcw-tape';
    this.el.setAttribute('aria-label', this.t('tape.title'));
    markPart(this.el, 'tape');
    this.el.hidden = true;

    const header = document.createElement('div');
    header.className = 'tcw-tape-header';
    const title = document.createElement('h3');
    title.className = 'tcw-tape-title';
    title.textContent = this.t('tape.title');
    // A number field, as the widget's others: the browser reads what is typed in the reader's own digits and marks.
    this.minEl = document.createElement('input');
    this.minEl.type = 'number';
    this.minEl.min = '0';
    this.minEl.step = 'any';
    this.minEl.inputMode = 'decimal';
    this.minEl.className = 'tcw-tape-min';
    this.minEl.placeholder = this.t('tape.minSize');
    this.minEl.setAttribute('aria-label', this.t('tape.minSize'));
    this.minEl.autocomplete = 'off';
    if (this.model.getMinSize() > 0) this.minEl.value = String(this.model.getMinSize());
    this.minEl.addEventListener('input', () => this.readMinSize());
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tcw-tape-close';
    closeBtn.setAttribute('aria-label', this.t('common.close'));
    closeBtn.innerHTML = createIcon('x', 14);
    closeBtn.addEventListener('click', () => (this.callbacks.onClose ? this.callbacks.onClose() : this.close()));
    header.append(title, this.minEl, closeBtn);

    // Under the header, and staying there: the columns' names, and the split of the rows between the sides.
    const top = document.createElement('div');
    top.className = 'tcw-tape-top';
    const cols = document.createElement('div');
    cols.className = 'tcw-tape-cols';
    for (const key of ['account.time', 'ladder.price', 'tape.size'] as const) {
      const label = document.createElement('span');
      label.textContent = this.t(key);
      cols.appendChild(label);
    }
    this.splitEl = document.createElement('div');
    this.splitEl.className = 'tcw-tape-split';
    this.splitEl.setAttribute('role', 'img');
    this.splitEl.hidden = true;
    top.append(cols, this.splitEl);

    // A list, each trade an item: not a live region, which would read a busy tape out without end.
    this.bodyEl = document.createElement('div');
    this.bodyEl.className = 'tcw-tape-body';
    this.emptyEl = document.createElement('div');
    this.emptyEl.className = 'tcw-tape-empty';
    this.emptyEl.textContent = this.t('tape.empty');
    this.el.append(header, top, this.bodyEl);
    host.appendChild(this.el);
  }

  /** The panel, for the dock to hold. */
  get element(): HTMLElement {
    return this.el;
  }

  isOpen(): boolean {
    return this.open;
  }

  openPanel(): void {
    if (this.open) return;
    this.open = true;
    this.el.hidden = false;
    this.redraw();
    this.callbacks.onToggle?.(true);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.cancelFrame();
    this.callbacks.onToggle?.(false);
  }

  /** Trades as they are made. Shut, it keeps them for when it opens. */
  push(trades: readonly Trade[]): void {
    const added = this.model.push(trades);
    if (!this.open) return;
    // A trade that went in among the rows, or sizes finer than the ones written: every row again.
    if (added === null || this.model.sizeDecimals() !== this.decimals) this.stale = true;
    else if (added.length === 0) return;
    else this.pending = [...added, ...this.pending].slice(0, this.model.getCapacity());
    if (!this.frame) this.frame = requestAnimationFrame(() => this.drawFrame());
  }

  /** Forget every trade: another symbol's are another tape. */
  clear(): void {
    this.model.clear();
    this.redraw();
  }

  destroy(): void {
    this.cancelFrame();
    this.el.remove();
  }

  private cancelFrame(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pending = [];
    this.stale = false;
  }

  /** The least size as typed: a number of 0 or more, or empty for none; anything else is refused and marked. */
  private readMinSize(): void {
    const text = this.minEl.value.trim();
    const size = text === '' ? 0 : Number(text);
    if (this.minEl.validity?.badInput === true || !Number.isFinite(size) || size < 0) {
      this.minEl.setAttribute('aria-invalid', 'true');
      return;
    }
    this.minEl.removeAttribute('aria-invalid');
    this.model.setMinSize(size);
    this.redraw();
  }

  /** Every row again, from the trades kept: on opening, on another least size, once cleared, and when the rows went stale. */
  private redraw(): void {
    this.cancelFrame();
    if (!this.open) return;
    this.decimals = this.model.sizeDecimals();
    const rows = this.model.rows();
    this.showRows(rows.length > 0);
    this.bodyEl.replaceChildren(...(rows.length > 0 ? rows.map((row) => this.newRow(row)) : [this.emptyEl]));
    this.drawSplit();
  }

  /** The body as a list of trades, or as the word that there are none yet. */
  private showRows(any: boolean): void {
    if (any) this.bodyEl.setAttribute('role', 'list');
    else this.bodyEl.removeAttribute('role');
  }

  /** A frame's work: every row again when they went stale, else the rows taken in since the last frame on top. */
  private drawFrame(): void {
    this.frame = 0;
    if (this.stale) {
      this.redraw();
      return;
    }
    const added = this.pending;
    this.pending = [];
    if (!this.open || added.length === 0) return;
    this.emptyEl.remove();
    this.showRows(true);
    const fresh = added.map((row) => this.newRow(row));
    this.bodyEl.prepend(...fresh);
    while (this.bodyEl.childElementCount > this.model.getCapacity()) this.bodyEl.lastElementChild?.remove();
    // A reader down the list keeps the rows they were on: the page moves by what came in on top.
    if (this.el.scrollTop > 0) this.el.scrollTop += fresh.length * fresh[0].offsetHeight;
    this.drawSplit();
  }

  private newRow(row: TapeRow): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'tcw-tape-row';
    el.setAttribute('role', 'listitem');
    if (row.side) el.dataset.side = row.side;
    if (row.large) el.setAttribute('data-large', '');
    for (const [name, text] of [
      ['time', this.callbacks.formatTime(row.time)],
      ['price', this.callbacks.formatPrice(row.price)],
      ['size', this.callbacks.formatSize(row.volume, this.decimals)],
    ] as const) {
      const cell = document.createElement('span');
      cell.className = `tcw-tape-${name}`;
      cell.textContent = text;
      el.appendChild(cell);
    }
    return el;
  }

  /** How much of the rows shown the buyers took, and how much the sellers: a bar in their two colours, said in words. */
  private drawSplit(): void {
    const { buy, sell } = this.model.totals();
    const all = buy + sell;
    this.splitEl.hidden = !(all > 0);
    if (!(all > 0)) return;
    this.splitEl.style.setProperty('--tcw-tape-bought', `${Number(((buy / all) * 100).toFixed(2))}%`);
    const size = (amount: number): string => this.callbacks.formatSize(amount, this.decimals);
    this.splitEl.setAttribute('aria-label', fill(this.t('tape.split'), { buy: size(buy), sell: size(sell) }));
  }
}
