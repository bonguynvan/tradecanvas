import type { FillEvent, TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, type MessageKey, type Translator } from './i18n.js';
import { markPart } from './widgetFeatures.js';
import { signed, toneOf } from './signedFigure.js';

export interface AccountPanelCallbacks {
  onClosePosition: (id: string) => void;
  onReversePosition: (id: string) => void;
  onCancelOrder: (id: string) => void;
  onNewOrder: () => void;
  formatPrice: (price: number) => string;
  formatTime: (ms: number) => string;
  /** Money made or lost (a P&L); unset, to two decimals. */
  formatAmount?: (value: number) => string;
  /** A plain figure to `decimals` (a percent), in the number locale; unset, with a point. */
  formatNumber?: (value: number, decimals: number) => string;
  /** Called when the panel opens or closes (the chart above resizes). */
  onToggle?: (open: boolean) => void;
}

export interface AccountSnapshot {
  positions: readonly TradingPosition[];
  orders: readonly TradingOrder[];
  fills: readonly FillEvent[];
  /** The latest price, for the positions' profit and loss. */
  price: number | null;
  /** The P&L realised by every fill (the list may keep only the latest); else the listed fills' sum. */
  realisedPnl?: number;
}

type Tab = 'positions' | 'orders' | 'history';
const TABS: readonly Tab[] = ['positions', 'orders', 'history'];
const REASONS = ['order', 'close', 'reverse', 'stopLoss', 'takeProfit'] as const;
const ORDER_TYPES = ['market', 'limit', 'stop'] as const;
const TIME_IN_FORCE = ['gtc', 'day'] as const;
/** What a cell holds where there is nothing (no stop, no price yet). */
const NONE = '—';
/** Where the totals' words take their figure. */
const PNL_SLOT = '{pnl}';
/** The positions table's column of the latest price, rewritten on a tick. */
const PRICE_COLUMN = 3;

/** A table's column: its heading, and whether it holds figures (set right, in the mono type). */
interface Column {
  key: MessageKey | null;
  num?: boolean;
}

/** `value` when it is one of `known`, else `fallback` (a host may send what the panel has no words for). */
function known<T extends string>(known: readonly T[], value: string | undefined, fallback: T): T {
  return (known as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}

/** Same rows: the same objects in the same order (a tick changes only the price). */
function sameRows(a: readonly object[], b: readonly object[]): boolean {
  return a.length === b.length && a.every((row, i) => row === b[i]);
}

/** The cells a tick changes on an open position's row. */
interface LiveCells {
  position: TradingPosition;
  price: HTMLTableCellElement;
  pnl: HTMLSpanElement;
}

/** A position's open profit or loss at `price`, and as a percent of what went in. */
export function positionPnl(position: TradingPosition, price: number | null): { pnl: number; pct: number } | null {
  if (price === null) return null;
  const open = position.quantity - (position.closedQuantity ?? 0);
  const direction = position.side === 'buy' ? 1 : -1;
  const pnl = (price - position.entryPrice) * open * direction;
  const pct = position.entryPrice !== 0 ? ((price - position.entryPrice) / position.entryPrice) * 100 * direction : 0;
  return { pnl, pct };
}

/** A figure that reads left to right in any widget: its sign stays before it. */
function ltr(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.dir = 'ltr';
  span.textContent = text;
  return span;
}

/** A signed figure's colour: a gain up, a loss down, what reads as nothing neither. */
function toneClass(figure: string): string {
  const tone = toneOf(figure);
  return tone ? `tcw-account-${tone}` : '';
}

/**
 * The account at the bottom of the widget: open positions with their profit
 * and loss, working orders, and the fills so far, each with its actions
 * (close, reverse, cancel), a button for a new order, and the open and
 * realised P&L in its head on every tab. On a phone each row is a card.
 */
export class WidgetAccountPanel {
  private el: HTMLElement;
  private tabButtons = new Map<Tab, HTMLButtonElement>();
  private tabLabels = new Map<Tab, string>();
  private tabCounts = new Map<Tab, HTMLSpanElement>();
  private totalsEl: HTMLDivElement;
  private content: HTMLDivElement;
  private tab: Tab = 'positions';
  private snapshot: AccountSnapshot = { positions: [], orders: [], fills: [], price: null };
  private open = false;
  private live: LiveCells[] = [];

  constructor(host: HTMLElement, private readonly callbacks: AccountPanelCallbacks, private readonly t: Translator = EN_TRANSLATOR) {
    this.el = document.createElement('section');
    this.el.className = 'tcw-account';
    this.el.hidden = true;
    this.el.setAttribute('aria-label', this.t('account.title'));

    const head = document.createElement('div');
    head.className = 'tcw-account-head';
    const tabs = document.createElement('div');
    tabs.className = 'tcw-account-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.addEventListener('keydown', (e) => this.onTabKey(e));
    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tcw-account-tab';
      btn.setAttribute('role', 'tab');
      btn.id = `tcw-account-tab-${tab}`;
      const label = document.createElement('span');
      label.className = 'tcw-account-tab-label';
      label.textContent = this.t(`account.${tab}` as MessageKey);
      const count = document.createElement('span');
      count.className = 'tcw-account-count';
      btn.append(label, count);
      btn.addEventListener('click', () => this.selectTab(tab));
      this.tabButtons.set(tab, btn);
      this.tabLabels.set(tab, label.textContent);
      this.tabCounts.set(tab, count);
      tabs.appendChild(btn);
    }
    this.totalsEl = document.createElement('div');
    this.totalsEl.className = 'tcw-account-totals';
    const newOrder = document.createElement('button');
    newOrder.type = 'button';
    newOrder.className = 'tcw-account-new';
    markPart(newOrder, 'orderTicket');
    newOrder.innerHTML = createIcon('plus', 13);
    newOrder.append(this.t('account.newOrder'));
    newOrder.addEventListener('click', () => this.callbacks.onNewOrder());
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tcw-tree-close';
    close.setAttribute('aria-label', this.t('account.close'));
    close.innerHTML = createIcon('x', 14);
    close.addEventListener('click', () => this.closePanel());
    head.append(tabs, this.totalsEl, newOrder, close);

    this.content = document.createElement('div');
    this.content.className = 'tcw-account-body';
    this.content.setAttribute('role', 'tabpanel');
    this.el.append(head, this.content);
    host.appendChild(this.el);
    this.renderTabs();
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.closePanel();
    else this.openPanel();
  }

  openPanel(): void {
    this.open = true;
    this.el.hidden = false;
    this.render();
    this.callbacks.onToggle?.(true);
  }

  closePanel(): void {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.callbacks.onToggle?.(false);
  }

  /**
   * New positions, orders, fills or price; the tabs' counts and the totals
   * follow, the open tab redraws. A new price alone only rewrites the price
   * and P&L cells and the open total, so a tick never takes a button from
   * under the pointer or the focus.
   */
  update(snapshot: AccountSnapshot): void {
    const before = this.snapshot;
    this.snapshot = snapshot;
    const rowsSame = sameRows(before.positions, snapshot.positions)
      && sameRows(before.orders, snapshot.orders)
      && sameRows(before.fills, snapshot.fills)
      && before.realisedPnl === snapshot.realisedPnl;
    if (rowsSame) {
      if (before.price !== snapshot.price) {
        this.renderTotals();
        if (this.open && this.tab === 'positions') this.patchPrices();
      }
      return;
    }
    this.renderTabs();
    if (this.open) this.render();
  }

  destroy(): void {
    this.el.remove();
  }

  private selectTab(tab: Tab): void {
    this.tab = tab;
    this.renderTabs();
    this.render();
  }

  /** Left and Right move between the tabs. */
  private onTabKey(e: KeyboardEvent): void {
    const at = TABS.indexOf(this.tab);
    const next = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : -2;
    if (next === -2) return;
    e.preventDefault();
    const tab = TABS[(next + TABS.length) % TABS.length];
    this.selectTab(tab);
    this.tabButtons.get(tab)?.focus();
  }

  private renderTabs(): void {
    const counts: Record<Tab, number> = {
      positions: this.snapshot.positions.length,
      orders: this.snapshot.orders.length,
      history: this.snapshot.fills.length,
    };
    for (const [tab, btn] of this.tabButtons) {
      const selected = tab === this.tab;
      this.tabCounts.get(tab)!.textContent = String(counts[tab]);
      // "Positions (1)": a reader hears the count as part of the name, not run into it.
      btn.setAttribute('aria-label', `${this.tabLabels.get(tab)} (${counts[tab]})`);
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
      if (selected) this.content.setAttribute('aria-labelledby', btn.id);
    }
    this.renderTotals();
  }

  /** The open P&L (with positions and a price) and the realised (once there are fills or a figure), on every tab. */
  private renderTotals(): void {
    const { positions, price, fills, realisedPnl } = this.snapshot;
    const totals: HTMLElement[] = [];
    const open = positions.reduce<number | null>((sum, p) => {
      const pnl = positionPnl(p, price);
      return pnl === null ? sum : (sum ?? 0) + pnl.pnl;
    }, null);
    if (open !== null) totals.push(this.total('account.openPnl', open));
    if (fills.length > 0 || (realisedPnl !== undefined && realisedPnl !== 0)) {
      totals.push(this.total('account.realised', realisedPnl ?? fills.reduce((sum, f) => sum + (f.pnl ?? 0), 0)));
    }
    this.totalsEl.replaceChildren(...totals);
  }

  /** A total: its words, the figure in them read left to right ("+6.00", never "6.00+"); after them, if they have no place for it. */
  private total(key: MessageKey, value: number): HTMLElement {
    const el = document.createElement('span');
    const amount = this.amount(value);
    el.className = `tcw-account-total ${toneClass(amount)}`.trim();
    const words = this.t(key);
    const at = words.indexOf(PNL_SLOT);
    const figure = ltr(amount);
    if (at < 0) el.append(`${words} `, figure);
    else el.append(words.slice(0, at), figure, words.slice(at + PNL_SLOT.length));
    return el;
  }

  private render(): void {
    // The button in use keeps focus through the rebuild (the same action on the same row).
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && this.content.contains(active) ? active.dataset.focusKey : undefined;
    this.live = [];
    if (this.tab === 'positions') this.renderPositions();
    else if (this.tab === 'orders') this.renderOrders();
    else this.renderHistory();
    if (focused) [...this.content.querySelectorAll<HTMLElement>('[data-focus-key]')].find((el) => el.dataset.focusKey === focused)?.focus();
  }

  /** The price and P&L cells, rewritten in place. */
  private patchPrices(): void {
    const { price } = this.snapshot;
    for (const cells of this.live) {
      cells.price.textContent = price === null ? NONE : this.callbacks.formatPrice(price);
      this.writePnl(cells.pnl, positionPnl(cells.position, price));
    }
  }

  private amount(value: number): string {
    return signed(this.money(Math.abs(value)), value, this.money(0));
  }

  private money(value: number): string {
    return this.callbacks.formatAmount ? this.callbacks.formatAmount(value) : value.toFixed(2);
  }

  private percent(value: number): string {
    const figure = (v: number) => (this.callbacks.formatNumber ? this.callbacks.formatNumber(v, 2) : v.toFixed(2));
    return `${signed(figure(Math.abs(value)), value, figure(0))}%`;
  }

  private writePnl(span: HTMLSpanElement, result: { pnl: number; pct: number } | null): void {
    if (result === null) {
      span.className = '';
      span.textContent = NONE;
      return;
    }
    const amount = this.amount(result.pnl);
    span.className = toneClass(amount);
    span.textContent = `${amount} · ${this.percent(result.pct)}`;
  }

  /**
   * A table of `rows` under `columns`, each cell named by its column (a phone
   * shows rows as cards); else what is empty. Its roles are set, not left to
   * the elements: a card's `display` takes a table's away in some browsers.
   */
  private table(columns: readonly Column[], rows: readonly (readonly (string | HTMLElement)[])[], empty: MessageKey): HTMLTableElement | null {
    if (rows.length === 0) {
      const p = document.createElement('p');
      p.className = 'tcw-account-empty';
      p.textContent = this.t(empty);
      this.content.replaceChildren(p);
      return null;
    }
    const labels = columns.map((c) => (c.key ? this.t(c.key) : ''));
    const table = document.createElement('table');
    table.className = 'tcw-account-table';
    table.setAttribute('role', 'table');
    const head = table.createTHead().insertRow();
    head.setAttribute('role', 'row');
    columns.forEach((column, i) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.setAttribute('role', 'columnheader');
      th.textContent = labels[i];
      if (column.num) th.className = 'tcw-num';
      head.appendChild(th);
    });
    const body = table.createTBody();
    for (const cells of rows) {
      const tr = body.insertRow();
      tr.setAttribute('role', 'row');
      cells.forEach((cell, i) => {
        const td = tr.insertCell();
        td.setAttribute('role', 'cell');
        td.dataset.label = labels[i];
        if (columns[i].num) td.className = 'tcw-num';
        if (typeof cell === 'string') td.textContent = cell;
        else td.appendChild(cell);
      });
    }
    this.content.replaceChildren(table);
    return table;
  }

  /** Long or Short for a position; Buy or Sell for an order or a fill (closing a long is a sell). */
  private sideCell(side: 'buy' | 'sell', kind: 'position' | 'trade' = 'position'): HTMLElement {
    const span = document.createElement('span');
    span.className = `tcw-account-side tcw-account-${side}`;
    span.textContent = this.sideText(side, kind);
    return span;
  }

  private sideText(side: 'buy' | 'sell', kind: 'position' | 'trade'): string {
    if (kind === 'trade') return this.t(side === 'buy' ? 'ticket.buy' : 'ticket.sell');
    return this.t(side === 'buy' ? 'account.long' : 'account.short');
  }

  private actions(...buttons: { icon: string; label: string; key: string; run: () => void; danger?: boolean }[]): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'tcw-account-actions';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tcw-tree-btn${b.danger ? ' tcw-tree-del' : ''}`;
      btn.setAttribute('aria-label', b.label);
      btn.title = b.label;
      btn.dataset.focusKey = b.key;
      btn.innerHTML = createIcon(b.icon, 14);
      btn.addEventListener('click', b.run);
      wrap.appendChild(btn);
    }
    return wrap;
  }

  private price(value: number | undefined): string {
    return value === undefined ? NONE : this.callbacks.formatPrice(value);
  }

  private renderPositions(): void {
    const { formatPrice } = this.callbacks;
    const { price } = this.snapshot;
    const pnls: HTMLSpanElement[] = [];
    const rows = this.snapshot.positions.map((p) => {
      const open = p.quantity - (p.closedQuantity ?? 0);
      const pnl = ltr('');
      this.writePnl(pnl, positionPnl(p, price));
      pnls.push(pnl);
      // "Close position: Long 2 @ 100.00", so each row's buttons say which.
      const which = `${this.sideText(p.side, 'position')} ${open} @ ${formatPrice(p.entryPrice)}`;
      return [
        this.sideCell(p.side),
        String(open),
        formatPrice(p.entryPrice),
        price === null ? NONE : formatPrice(price),
        pnl,
        this.price(p.stopLoss),
        this.price(p.takeProfit),
        this.actions(
          { icon: 'arrowUpDown', label: `${this.t('account.reverse')}: ${which}`, key: `reverse:${p.id}`, run: () => this.callbacks.onReversePosition(p.id) },
          { icon: 'x', label: `${this.t('account.closePosition')}: ${which}`, key: `close:${p.id}`, run: () => this.callbacks.onClosePosition(p.id), danger: true },
        ),
      ];
    });
    const table = this.table(
      [
        { key: 'account.side' }, { key: 'account.quantity', num: true }, { key: 'account.entry', num: true },
        { key: 'account.price', num: true }, { key: 'account.pnl', num: true }, { key: 'account.stopLoss', num: true },
        { key: 'account.takeProfit', num: true }, { key: null },
      ],
      rows,
      'account.noPositions',
    );
    if (!table) return;
    const trs = [...table.tBodies[0].rows];
    this.snapshot.positions.forEach((position, i) => this.live.push({ position, price: trs[i].cells[PRICE_COLUMN], pnl: pnls[i] }));
  }

  private renderOrders(): void {
    const { formatPrice } = this.callbacks;
    const rows = this.snapshot.orders.map((o) => {
      const type = known(ORDER_TYPES, o.type === 'stopLimit' ? 'stop' : o.type, 'limit');
      const which = `${this.sideText(o.side, 'trade')} ${o.quantity} @ ${formatPrice(o.price)}`;
      return [
        this.sideCell(o.side, 'trade'),
        this.t(`ticket.type.${type}` as MessageKey),
        String(o.quantity),
        formatPrice(o.price),
        this.price(o.stopLoss),
        this.price(o.takeProfit),
        o.timeInForce ? this.t(`ticket.tif.${known(TIME_IN_FORCE, o.timeInForce, 'gtc')}` as MessageKey) : NONE,
        this.actions({ icon: 'x', label: `${this.t('account.cancelOrder')}: ${which}`, key: `cancel:${o.id}`, run: () => this.callbacks.onCancelOrder(o.id), danger: true }),
      ];
    });
    this.table(
      [
        { key: 'account.side' }, { key: 'ticket.type' }, { key: 'account.quantity', num: true }, { key: 'account.price', num: true },
        { key: 'account.stopLoss', num: true }, { key: 'account.takeProfit', num: true }, { key: 'ticket.timeInForce' }, { key: null },
      ],
      rows,
      'account.noOrders',
    );
  }

  private renderHistory(): void {
    const { formatPrice, formatTime } = this.callbacks;
    // The newest first.
    const rows = [...this.snapshot.fills].reverse().map((f) => {
      const pnl = ltr('');
      if (f.pnl !== undefined) {
        pnl.textContent = this.amount(f.pnl);
        pnl.className = toneClass(pnl.textContent);
      } else {
        pnl.textContent = NONE;
      }
      return [
        formatTime(f.time),
        this.sideCell(f.side, 'trade'),
        String(f.quantity),
        formatPrice(f.price),
        this.t(`account.reason.${known(REASONS, f.reason, 'order')}` as MessageKey),
        pnl,
      ];
    });
    this.table(
      [
        { key: 'account.time' }, { key: 'account.side' }, { key: 'account.quantity', num: true },
        { key: 'account.price', num: true }, { key: 'account.reason' }, { key: 'account.pnl', num: true },
      ],
      rows,
      'account.noFills',
    );
  }
}
