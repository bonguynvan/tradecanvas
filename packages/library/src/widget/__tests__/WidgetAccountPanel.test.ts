// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetAccountPanel, positionPnl, type AccountPanelCallbacks } from '../WidgetAccountPanel.js';

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
  panel.update({
    positions: [{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, stopLoss: 95 }],
    orders: [{ id: 'o1', side: 'sell', type: 'limit', price: 110, quantity: 1, timeInForce: 'day' }],
    fills: [
      { orderId: 'a', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order' },
      { orderId: 'b', side: 'sell', price: 104, quantity: 1, time: 2, reason: 'close', pnl: 4 },
    ],
    price: 103,
  });
});

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
    expect([...host.querySelectorAll('[role=tab]')].map((b) => b.textContent)).toEqual(['Positions (1)', 'Orders (1)', 'History (2)']);
    expect(cells()[0].slice(0, 7)).toEqual(['Long', '2', '100.00', '103.00', '+6.00 (+3.00%)', '95.00', '—']);
    expect(callbacks.onToggle).toHaveBeenCalledWith(true);
  });

  it('closes, reverses and cancels from the rows', () => {
    panel.openPanel();
    host.querySelector<HTMLButtonElement>('[aria-label="Reverse position"]')!.click();
    host.querySelector<HTMLButtonElement>('[aria-label="Close position"]')!.click();
    tab(/Orders/).click();
    host.querySelector<HTMLButtonElement>('[aria-label="Cancel order"]')!.click();
    expect(callbacks.onReversePosition).toHaveBeenCalledWith('p1');
    expect(callbacks.onClosePosition).toHaveBeenCalledWith('p1');
    expect(callbacks.onCancelOrder).toHaveBeenCalledWith('o1');
  });

  it('lists the fills newest first with the P&L realised', () => {
    panel.openPanel();
    tab(/History/).click();
    expect(cells().map((row) => row[4])).toEqual(['Closed', 'Order']);
    expect(host.querySelector('.tcw-account-summary')!.textContent).toBe('Realised P&L: +4.00');
  });

  it('moves between tabs with the arrow keys, and opens a new order', () => {
    panel.openPanel();
    tab(/Positions/).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tab(/Orders/).getAttribute('aria-selected')).toBe('true');
    host.querySelector<HTMLButtonElement>('.tcw-account-new')!.click();
    expect(callbacks.onNewOrder).toHaveBeenCalled();
  });

  it('says when there is nothing to show', () => {
    panel.update({ positions: [], orders: [], fills: [], price: null });
    panel.openPanel();
    expect(host.querySelector('.tcw-account-empty')!.textContent).toBe('No open positions');
  });
});
