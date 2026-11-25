// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OrderPlaceIntent } from '@tradecanvas/commons';
import { WidgetOrderTicket, type OrderTicketCallbacks } from '../WidgetOrderTicket.js';

let host: HTMLDivElement;
let ticket: WidgetOrderTicket;
let sent: OrderPlaceIntent[];
let shut: ReturnType<typeof vi.fn>;

function build(onSubmit: OrderTicketCallbacks['onSubmit'] = (intent) => { sent.push(intent); }): void {
  shut = vi.fn();
  ticket = new WidgetOrderTicket(host, { onSubmit, formatPrice: (p) => p.toFixed(2), onDockClose: shut });
  // The dock's page, where the widget puts it.
  host.appendChild(ticket.dockElement);
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  sent = [];
});

afterEach(() => {
  ticket.destroy();
  host.remove();
});

const form = () => host.querySelector<HTMLElement>('.tcw-order-ticket')!;
const backdrop = () => host.querySelector<HTMLElement>('.tcw-modal-backdrop')!;
const place = () => host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!;
const numbers = () => [...host.querySelectorAll<HTMLInputElement>('input[type=number]')];
const type = (value: string, at = 0) => {
  const input = numbers()[at];
  input.value = value;
  input.dispatchEvent(new Event('input'));
};
const side = (value: 'buy' | 'sell') => host.querySelector<HTMLButtonElement>(`.tcw-ticket-side-btn.tcw-ticket-${value}`)!;

// The ticket was a dialog over the chart: it hid the price it was filled in for.
describe('the order ticket in the dock', () => {
  it('is a page beside the chart, not a dialog over it: no backdrop, no trap for the keyboard', () => {
    build();
    ticket.open({ lastPrice: 100 }, 'dock');
    expect(ticket.dockElement.contains(form())).toBe(true);
    expect(backdrop().hidden).toBe(true);
    expect(form().classList.contains('tcw-ticket-docked')).toBe(true);
    expect(form().getAttribute('aria-modal')).toBeNull();
    expect(form().getAttribute('role')).toBe('region');
    expect(ticket.isOpen()).toBe(true);
    expect(ticket.isDocked()).toBe(true);
    // Tab from its last control goes on to the page: it is not turned back to the first.
    const last = [...form().querySelectorAll<HTMLElement>('button:not(:disabled)')].at(-1)!;
    last.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('is the dialog again when it is opened as one (a phone, a host that asks for it)', () => {
    build();
    ticket.open({ lastPrice: 100 }, 'dock');
    ticket.close();
    ticket.open({ lastPrice: 100 });
    expect(backdrop().hidden).toBe(false);
    expect(backdrop().contains(form())).toBe(true);
    expect(form().getAttribute('aria-modal')).toBe('true');
    expect(form().getAttribute('role')).toBe('dialog');
    expect(form().classList.contains('tcw-ticket-docked')).toBe(false);
    expect(ticket.isDocked()).toBe(false);
  });

  it('stays for the next order once the broker took one, on the same side and quantity', () => {
    build((intent) => { sent.push(intent); return 'order-1'; });
    ticket.open({ lastPrice: 100, side: 'sell' }, 'dock');
    type('7');
    place().click();
    expect(sent).toHaveLength(1);
    expect(ticket.accepted('order-1')).toBe(true);
    expect(ticket.isOpen()).toBe(true);
    expect(shut).not.toHaveBeenCalled();
    expect(side('sell').getAttribute('aria-pressed')).toBe('true');
    expect(numbers()[0].value).toBe('7');
    // Nothing is held any more: the next order can be sent.
    expect(place().disabled).toBe(false);
    place().click();
    expect(sent).toHaveLength(2);
  });

  it('starts the next order as the one sent, less what was that order’s alone', () => {
    build((intent) => { sent.push(intent); return 'order-1'; });
    // A buy limit under the market, with a stop-loss.
    ticket.open({ lastPrice: 100, side: 'buy', price: 95, stopLoss: 90 }, 'dock');
    place().click();
    expect(sent[0]).toMatchObject({ type: 'limit', price: 95, stopLoss: 90 });
    ticket.accepted('order-1');
    place().click();
    // The price it waited at is kept (a limit at the market would be another order); the stop-loss is not.
    expect(sent[1]).toMatchObject({ type: 'limit', price: 95, side: 'buy' });
    expect(sent[1].stopLoss ?? null).toBeNull();
  });

  it('goes on as a dialog, with what was typed and what it waits for, when its page is taken from under it', () => {
    build((intent) => { sent.push(intent); return 'order-1'; });
    ticket.open({ lastPrice: 100, side: 'sell' }, 'dock');
    type('7');
    place().click();
    expect(ticket.isWaiting()).toBe(true);
    ticket.undock();
    expect(ticket.isOpen()).toBe(true);
    expect(ticket.isDocked()).toBe(false);
    expect(backdrop().hidden).toBe(false);
    expect(backdrop().contains(form())).toBe(true);
    expect(numbers()[0].value).toBe('7');
    // The broker's answer still finds it: a dialog shuts once its order is taken.
    expect(ticket.accepted('order-1')).toBe(true);
    expect(ticket.isOpen()).toBe(false);
  });

  it('stays too where nobody answers for an order (no broker connected)', () => {
    build();
    ticket.open({ lastPrice: 100 }, 'dock');
    place().click();
    expect(sent).toHaveLength(1);
    expect(ticket.isOpen()).toBe(true);
    expect(shut).not.toHaveBeenCalled();
  });

  it('asks the dock to shut its page when it is shut by its own Cancel, cross or Escape', () => {
    build();
    ticket.open({ lastPrice: 100 }, 'dock');
    host.querySelector<HTMLButtonElement>('.tcw-footer-cancel')!.click();
    expect(ticket.isOpen()).toBe(false);
    expect(shut).toHaveBeenCalledTimes(1);
    ticket.open({ lastPrice: 100 }, 'dock');
    form().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ticket.isOpen()).toBe(false);
    expect(shut).toHaveBeenCalledTimes(2);
  });

  it('shuts without asking when the dock shut the page itself', () => {
    build();
    ticket.open({ lastPrice: 100 }, 'dock');
    ticket.dismiss();
    expect(ticket.isOpen()).toBe(false);
    expect(shut).not.toHaveBeenCalled();
  });
});
