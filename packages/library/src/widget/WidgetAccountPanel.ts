import type { FillEvent, TradingOrder, TradingPosition } from '@tradecanvas/commons';
import { createIcon } from './icons.js';
import { EN_TRANSLATOR, fill, type MessageKey, type Translator } from './i18n.js';

export interface AccountPanelCallbacks {
  onClosePosition: (id: string) => void;
  onReversePosition: (id: string) => void;
  onCancelOrder: (id: string) => void;
  onNewOrder: () => void;
  formatPrice: (price: number) => string;
  formatTime: (ms: number) => string;
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

function signed(value: number, decimals = 2): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}`;
}

/**
 * The account at the bottom of the widget: open positions with their profit
 * and loss, working orders, and the fills so far, each with its actions
 * (close, reverse, cancel), and a button for a new order.
 */
export class WidgetAccountPanel {
  private el: HTMLElement;
  private tabButtons = new Map<Tab, HTMLButtonElement>();
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
      btn.addEventListener('click', () => this.selectTab(tab));
      this.tabButtons.set(tab, btn);
      tabs.appendChild(btn);
    }
    const newOrder = document.createElement('button');
    newOrder.type = 'button';
    newOrder.className = 'tcw-account-new';
    newOrder.innerHTML = createIcon('plus', 13);
    newOrder.append(this.t('account.newOrder'));
    newOrder.addEventListener('click', () => this.callbacks.onNewOrder());
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'tcw-tree-close';
    close.setAttribute('aria-label', this.t('account.close'));
    close.innerHTML = createIcon('x', 14);
    close.addEventListener('click', () => this.closePanel());
    head.append(tabs, newOrder, close);

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
   * New positions, orders, fills or price; the tabs' counts follow, the open
   * tab redraws. A new price alone only rewrites the price and P&L cells, so
   * a tick never takes a button from under the pointer or the focus.
   */
  update(snapshot: AccountSnapshot): void {
    const before = this.snapshot;
    this.snapshot = snapshot;
    const rowsSame = sameRows(before.positions, snapshot.positions)
      && sameRows(before.orders, snapshot.orders)
      && sameRows(before.fills, snapshot.fills)
      && before.realisedPnl === snapshot.realisedPnl;
    if (rowsSame) {
      if (this.open && this.tab === 'positions' && before.price !== snapshot.price) this.patchPrices();
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
      btn.textContent = `${this.t(`account.${tab}` as MessageKey)} (${counts[tab]})`;
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
      if (selected) this.content.setAttribute('aria-labelledby', btn.id);
    }
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
      cells.price.textContent = price === null ? '—' : this.callbacks.formatPrice(price);
      this.writePnl(cells.pnl, positionPnl(cells.position, price));
    }
  }

  private writePnl(span: HTMLSpanElement, result: { pnl: number; pct: number } | null): void {
    span.className = result === null ? '' : result.pnl >= 0 ? 'tcw-account-up' : 'tcw-account-down';
    span.textContent = result === null ? '—' : `${signed(result.pnl)} (${signed(result.pct)}%)`;
  }

  private table(columns: readonly MessageKey[], rows: HTMLTableRowElement[], empty: MessageKey): void {
    if (rows.length === 0) {
      const p = document.createElement('p');
      p.className = 'tcw-account-empty';
      p.textContent = this.t(empty);
      this.content.replaceChildren(p);
      return;
    }
    const table = document.createElement('table');
    table.className = 'tcw-account-table';
    const head = table.createTHead().insertRow();
    for (const key of columns) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = key ? this.t(key) : '';
      head.appendChild(th);
    }
    table.createTBody().append(...rows);
    this.content.replaceChildren(table);
  }

  private row(cells: readonly (string | HTMLElement)[], className = ''): HTMLTableRowElement {
    const tr = document.createElement('tr');
    if (className) tr.className = className;
    for (const cell of cells) {
      const td = tr.insertCell();
      if (typeof cell === 'string') td.textContent = cell;
      else td.appendChild(cell);
    }
    return tr;
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

  private renderPositions(): void {
    const { formatPrice } = this.callbacks;
    const { price } = this.snapshot;
    const rows = this.snapshot.positions.map((p) => {
      const open = p.quantity - (p.closedQuantity ?? 0);
      const pnl = document.createElement('span');
      this.writePnl(pnl, positionPnl(p, price));
      // "Close position: Long 2 @ 100.00", so each row's buttons say which.
      const which = `${this.sideText(p.side, 'position')} ${open} @ ${formatPrice(p.entryPrice)}`;
      const tr = this.row([
        this.sideCell(p.side),
        String(open),
        formatPrice(p.entryPrice),
        price === null ? '—' : formatPrice(price),
        pnl,
        p.stopLoss === undefined ? '—' : formatPrice(p.stopLoss),
        p.takeProfit === undefined ? '—' : formatPrice(p.takeProfit),
        this.actions(
          { icon: 'repeat', label: `${this.t('account.reverse')}: ${which}`, key: `reverse:${p.id}`, run: () => this.callbacks.onReversePosition(p.id) },
          { icon: 'x', label: `${this.t('account.closePosition')}: ${which}`, key: `close:${p.id}`, run: () => this.callbacks.onClosePosition(p.id), danger: true },
        ),
      ]);
      this.live.push({ position: p, price: tr.cells[3], pnl });
      return tr;
    });
    this.table(
      ['account.side', 'account.quantity', 'account.entry', 'account.price', 'account.pnl', 'account.stopLoss', 'account.takeProfit', 'account.actions'],
      rows,
      'account.noPositions',
    );
  }

  private renderOrders(): void {
    const { formatPrice } = this.callbacks;
    const rows = this.snapshot.orders.map((o) => {
      const type = known(ORDER_TYPES, o.type === 'stopLimit' ? 'stop' : o.type, 'limit');
      const which = `${this.sideText(o.side, 'trade')} ${o.quantity} @ ${formatPrice(o.price)}`;
      return this.row([
        this.sideCell(o.side, 'trade'),
        this.t(`ticket.type.${type}` as MessageKey),
        String(o.quantity),
        formatPrice(o.price),
        o.stopLoss === undefined ? '—' : formatPrice(o.stopLoss),
        o.takeProfit === undefined ? '—' : formatPrice(o.takeProfit),
        o.timeInForce ? this.t(`ticket.tif.${known(TIME_IN_FORCE, o.timeInForce, 'gtc')}` as MessageKey) : '—',
        this.actions({ icon: 'x', label: `${this.t('account.cancelOrder')}: ${which}`, key: `cancel:${o.id}`, run: () => this.callbacks.onCancelOrder(o.id), danger: true }),
      ]);
    });
    this.table(
      ['account.side', 'ticket.type', 'account.quantity', 'account.price', 'account.stopLoss', 'account.takeProfit', 'ticket.timeInForce', 'account.actions'],
      rows,
      'account.noOrders',
    );
  }

  private renderHistory(): void {
    const { formatPrice, formatTime } = this.callbacks;
    // The newest first.
    const rows = [...this.snapshot.fills].reverse().map((f) => {
      const pnl = document.createElement('span');
      if (f.pnl !== undefined) {
        pnl.className = f.pnl >= 0 ? 'tcw-account-up' : 'tcw-account-down';
        pnl.textContent = signed(f.pnl);
      } else {
        pnl.textContent = '—';
      }
      return this.row([
        formatTime(f.time),
        this.sideCell(f.side, 'trade'),
        String(f.quantity),
        formatPrice(f.price),
        this.t(`account.reason.${known(REASONS, f.reason, 'order')}` as MessageKey),
        pnl,
      ]);
    });
    this.table(['account.time', 'account.side', 'account.quantity', 'account.price', 'account.reason', 'account.pnl'], rows, 'account.noFills');
    const total = this.snapshot.realisedPnl ?? this.snapshot.fills.reduce((sum, f) => sum + (f.pnl ?? 0), 0);
    if (rows.length > 0) {
      const summary = document.createElement('p');
      summary.className = 'tcw-account-summary';
      summary.textContent = fill(this.t('account.realised'), { pnl: signed(total) });
      this.content.appendChild(summary);
    }
  }
}
