import type { OrderSide } from '@tradecanvas/commons';
import { EN_TRANSLATOR, type Translator } from './i18n.js';

export interface QuoteButtonsCallbacks {
  /** Sell or Buy was pressed: the order ticket opens on that side. */
  onTrade: (side: OrderSide) => void;
  formatPrice: (price: number) => string;
}

/** What the buttons quote: the best bid and ask, or the last price for both where the feed gives none. */
export interface TradeQuote {
  /** What a sell gets. */
  bid: number | null;
  /** What a buy pays. */
  ask: number | null;
}

/** The room the buttons leave under them before what comes next on the chart. */
const GAP_BELOW = 4;

/**
 * Sell and Buy on the chart, under its legend, each with the price it would
 * trade at now and the spread between them. A press opens the order ticket
 * on that side.
 */
export class WidgetQuoteButtons {
  private readonly el: HTMLDivElement;
  private readonly sell: HTMLButtonElement;
  private readonly buy: HTMLButtonElement;
  private readonly sellPrice: HTMLSpanElement;
  private readonly buyPrice: HTMLSpanElement;
  private readonly spread: HTMLSpanElement;
  private shown = false;
  private placed = '';

  constructor(host: HTMLElement, private readonly callbacks: QuoteButtonsCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.el = document.createElement('div');
    this.el.className = 'tcw-quote-buttons';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', this.t('account.newOrder'));
    // Prices read left to right in any widget.
    this.el.dir = 'ltr';
    this.el.hidden = true;
    [this.sell, this.sellPrice] = this.button('sell');
    [this.buy, this.buyPrice] = this.button('buy');
    this.spread = document.createElement('span');
    this.spread.className = 'tcw-quote-spread';
    this.el.append(this.sell, this.spread, this.buy);
    host.appendChild(this.el);
  }

  private button(side: OrderSide): [HTMLButtonElement, HTMLSpanElement] {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tcw-quote-btn tcw-quote-${side}`;
    btn.dataset.side = side;
    const name = document.createElement('span');
    name.className = 'tcw-quote-name';
    name.textContent = this.t(side === 'buy' ? 'ticket.buy' : 'ticket.sell');
    const price = document.createElement('span');
    price.className = 'tcw-quote-price';
    btn.append(name, price);
    btn.addEventListener('click', () => this.callbacks.onTrade(side));
    return [btn, price];
  }

  /** Show the buttons, or take them away (no trading, or the buttons switched off). */
  setShown(shown: boolean): void {
    this.shown = shown;
    this.el.hidden = !shown;
  }

  isShown(): boolean {
    return this.shown;
  }

  /** The prices to quote. With none there is nothing to trade at: the buttons wait, off. */
  update(quote: TradeQuote): void {
    const write = (btn: HTMLButtonElement, price: HTMLSpanElement, value: number | null) => {
      const text = value !== null && Number.isFinite(value) ? this.callbacks.formatPrice(value) : '';
      if (price.textContent !== text) price.textContent = text;
      btn.disabled = text === '';
    };
    write(this.sell, this.sellPrice, quote.bid);
    write(this.buy, this.buyPrice, quote.ask);
    const { bid, ask } = quote;
    const gap = bid !== null && ask !== null && Number.isFinite(bid) && Number.isFinite(ask) && ask > bid ? this.callbacks.formatPrice(ask - bid) : '';
    if (this.spread.textContent !== gap) this.spread.textContent = gap;
    this.spread.hidden = gap === '';
  }

  /**
   * Put the buttons at a place on the chart (its legend's foot). Returns the
   * height they take with the room under them, for what is stacked below; 0
   * when they are not shown.
   */
  place(left: number, top: number): number {
    if (!this.shown) return 0;
    const at = `${Math.round(left)},${Math.round(top)}`;
    if (at !== this.placed) {
      this.placed = at;
      this.el.style.left = `${Math.round(left)}px`;
      this.el.style.top = `${Math.round(top)}px`;
    }
    return (this.el.offsetHeight || QUOTE_BUTTON_HEIGHT) + GAP_BELOW;
  }

  destroy(): void {
    this.el.remove();
  }
}

/** The buttons' height where the layout cannot be measured (before the first paint): the styles' own. */
export const QUOTE_BUTTON_HEIGHT = 24;
