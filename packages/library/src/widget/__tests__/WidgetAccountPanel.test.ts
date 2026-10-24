// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetAccountPanel, positionPnl, type AccountPanelCallbacks } from '../WidgetAccountPanel.js';
import { EN_TRANSLATOR } from '../i18n.js';

let host: HTMLDivElement;
let panel: WidgetAccountPanel;
let callbacks: { [K in keyof AccountPanelCallbacks]-?: ReturnType<typeof vi.fn> };

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  callbacks = {
    onClosePosition: vi.fn(),
    onReversePosition: vi.fn(),
    onCancelOrder: vi.fn(),
    onNewOrder: vi.fn(),
    formatPrice: vi.fn((p: number) => p.toFixed(2)),
    formatTime: vi.fn(() => '2026-10-03 10:00'),
    onToggle: vi.fn(),
  };
  panel = new WidgetAccountPanel(host, callbacks as unknown as AccountPanelCallbacks);
  current = {
    positions: [{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, stopLoss: 95 }],
    orders: [{ id: 'o1', side: 'sell', type: 'limit', price: 110, quantity: 1, timeInForce: 'day' }],
    fills: [
      { orderId: 'a', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order' },
      { orderId: 'b', side: 'sell', price: 104, quantity: 1, time: 2, reason: 'close', pnl: 4 },
    ],
    price: 103,
  };
  panel.update(current);
});

let current: Parameters<WidgetAccountPanel['update']>[0];
const snapshotOf = () => current;

afterEach(() => {
  panel.destroy();
  host.remove();
});

const tab = (name: RegExp) => [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => name.test(b.textContent!))!;
const cells = () => [...host.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));

describe('WidgetAccountPanel', () => {
  it('works out a position’s profit and loss, long or short', () => {
    expect(positionPnl({ id: 'x', side: 'buy', entryPrice: 100, quantity: 2 }, 103)).toEqual({ pnl: 6, pct: 3 });
    expect(positionPnl({ id: 'x', side: 'sell', entryPrice: 100, quantity: 2, closedQuantity: 1 }, 103)).toEqual({ pnl: -3, pct: -3 });
    expect(positionPnl({ id: 'x', side: 'buy', entryPrice: 100, quantity: 1 }, null)).toBeNull();
  });

  it('counts each tab and lists the positions with their P&L', () => {
    panel.openPanel();
    const tabs = [...host.querySelectorAll('[role=tab]')].map((b) => [b.querySelector('.tcw-account-tab-label')!.textContent, b.querySelector('.tcw-account-count')!.textContent]);
    expect(tabs).toEqual([['Positions', '1'], ['Orders', '1'], ['History', '2']]);
    expect(cells()[0].slice(0, 7)).toEqual(['Long', '2', '100.00', '103.00', '+6.00 · +3.00%', '95.00', '—']);
    expect(callbacks.onToggle).toHaveBeenCalledWith(true);
  });

  it('sets its figures as numbers, each cell named for a phone’s card', () => {
    panel.openPanel();
    const row = host.querySelector('tbody tr')!;
    const named = [...row.querySelectorAll('td')].map((td) => [td.dataset.label, td.classList.contains('tcw-num')]);
    expect(named).toEqual([
      ['Side', false], ['Qty', true], ['Entry', true], ['Price', true], ['P&L', true], ['SL', true], ['TP', true], ['', false],
    ]);
  });

  it('sums the account up in its head, on every tab: the open P&L and what is realised', () => {
    panel.openPanel();
    const totals = () => [...host.querySelectorAll('.tcw-account-total')].map((el) => el.textContent);
    expect(totals()).toEqual(['Open P&L: +6.00', 'Realised P&L: +4.00']);
    tab(/Orders/).click();
    expect(totals()).toEqual(['Open P&L: +6.00', 'Realised P&L: +4.00']);
    panel.update({ ...snapshotOf(), price: 104 });
    expect(totals()[0]).toBe('Open P&L: +8.00');
  });

  it('writes signed figures left to right in any widget, the totals’ too', () => {
    panel.openPanel();
    expect(host.querySelector<HTMLElement>('tbody td:nth-child(5) span')!.dir).toBe('ltr');
    expect([...host.querySelectorAll<HTMLElement>('.tcw-account-total [dir="ltr"]')].map((el) => el.textContent)).toEqual(['+6.00', '+4.00']);
  });

  it('keeps a loss’s sign in any digits, and none on nothing (Persian figures)', () => {
    const fa = (v: number, d = 2) => v.toLocaleString('fa-IR', { minimumFractionDigits: d, maximumFractionDigits: d });
    panel.destroy();
    panel = new WidgetAccountPanel(host, { ...(callbacks as unknown as AccountPanelCallbacks), formatAmount: (v) => fa(v), formatNumber: (v, d) => fa(v, d) });
    panel.update({ ...snapshotOf(), price: 97 });
    panel.openPanel();
    // Two long from 100 at 97 lose 6: three percent.
    expect(cells()[0][4]).toBe('-۶٫۰۰ · -۳٫۰۰%');
    panel.update({ ...snapshotOf(), price: 100 });
    expect(cells()[0][4]).toBe('۰٫۰۰ · ۰٫۰۰%');
  });

  it('colours a figure by the sign it shows, none on what reads as nothing', () => {
    // Two long from 100 at 100.001 make 0.002: "0.00", neither gain nor loss.
    panel.update({ ...snapshotOf(), price: 100.001 });
    panel.openPanel();
    expect(cells()[0][4]).toBe('0.00 · 0.00%');
    expect(host.querySelector('tbody tr')!.querySelectorAll('td')[4].firstElementChild!.className).toBe('');
    expect(host.querySelector('.tcw-account-total')!.className).toBe('tcw-account-total');
  });

  it('shows the realised P&L only once something is realised', () => {
    panel.update({ positions: [], orders: [], fills: [], price: null, realisedPnl: 0 });
    expect(host.querySelectorAll('.tcw-account-total')).toHaveLength(0);
    panel.update({ positions: [], orders: [], fills: [], price: null, realisedPnl: -2 });
    expect(host.querySelector('.tcw-account-total')!.textContent).toBe('Realised P&L: -2.00');
  });

  it('puts the figure after words that have no place for it', () => {
    panel.destroy();
    const words = (key: string, vars?: Record<string, string | number>) => (key === 'account.openPnl' ? 'Open' : EN_TRANSLATOR(key as never, vars));
    panel = new WidgetAccountPanel(host, callbacks as unknown as AccountPanelCallbacks, words as never);
    panel.update(snapshotOf());
    expect(host.querySelector('.tcw-account-total')!.textContent).toBe('Open +6.00');
  });

  it('names each tab with its count, and keeps a table’s roles for a phone’s cards', () => {
    panel.openPanel();
    expect(tab(/Positions/).getAttribute('aria-label')).toBe('Positions (1)');
    expect(host.querySelector('table')!.getAttribute('role')).toBe('table');
    expect(host.querySelector('thead th')!.getAttribute('role')).toBe('columnheader');
    expect(host.querySelector('tbody tr')!.getAttribute('role')).toBe('row');
    expect(host.querySelector('tbody td')!.getAttribute('role')).toBe('cell');
  });

  it('writes money and percents in the host’s formats', () => {
    panel.destroy();
    panel = new WidgetAccountPanel(host, { ...(callbacks as unknown as AccountPanelCallbacks), formatAmount: (v) => v.toFixed(1), formatNumber: (v, d) => v.toFixed(d).replace('.', ',') });
    panel.update(snapshotOf());
    panel.openPanel();
    expect(cells()[0][4]).toBe('+6.0 · +3,00%');
  });

  it('closes, reverses and cancels from the rows', () => {
    panel.openPanel();
    // Each row's buttons say which position or order they act on.
    host.querySelector<HTMLButtonElement>('[aria-label="Reverse position: Long 2 @ 100.00"]')!.click();
    host.querySelector<HTMLButtonElement>('[aria-label="Close position: Long 2 @ 100.00"]')!.click();
    tab(/Orders/).click();
    host.querySelector<HTMLButtonElement>('[aria-label="Cancel order: Sell 1 @ 110.00"]')!.click();
    expect(callbacks.onReversePosition).toHaveBeenCalledWith('p1');
    expect(callbacks.onClosePosition).toHaveBeenCalledWith('p1');
    expect(callbacks.onCancelOrder).toHaveBeenCalledWith('o1');
  });

  it('lists the fills newest first with the P&L realised', () => {
    panel.openPanel();
    tab(/History/).click();
    expect(cells().map((row) => row[4])).toEqual(['Closed', 'Order']);
    // A fill is a buy or a sell (closing a long sells), not a long or a short.
    expect(cells().map((row) => row[1])).toEqual(['Sell', 'Buy']);
    expect(cells().map((row) => row[5])).toEqual(['+4.00', '—']);
  });

  it('moves between tabs with the arrow keys, and opens a new order', () => {
    panel.openPanel();
    tab(/Positions/).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tab(/Orders/).getAttribute('aria-selected')).toBe('true');
    host.querySelector<HTMLButtonElement>('.tcw-account-new')!.click();
    expect(callbacks.onNewOrder).toHaveBeenCalled();
  });

  it('rewrites only the price and P&L on a tick, keeping the focused button', () => {
    panel.openPanel();
    const close = host.querySelector<HTMLButtonElement>('[aria-label^="Close position"]')!;
    close.focus();
    panel.update({ ...snapshotOf(), price: 104 });
    expect(host.querySelector('[aria-label^="Close position"]')).toBe(close);
    expect(document.activeElement).toBe(close);
    expect(cells()[0].slice(3, 5)).toEqual(['104.00', '+8.00 · +4.00%']);
  });

  it('keeps focus on the same button when the rows change', () => {
    panel.openPanel();
    host.querySelector<HTMLButtonElement>('[aria-label^="Close position"]')!.focus();
    const s = snapshotOf();
    panel.update({ ...s, positions: [{ ...s.positions[0] }] });
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toMatch(/^Close position/);
  });

  it('says when there is nothing to show', () => {
    panel.update({ positions: [], orders: [], fills: [], price: null });
    panel.openPanel();
    expect(host.querySelector('.tcw-account-empty')!.textContent).toBe('No open positions');
  });
});
