// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AccountSummary } from '@tradecanvas/commons';
import { WidgetOrderTicket } from '../WidgetOrderTicket.js';

let host: HTMLDivElement;
let ticket: WidgetOrderTicket;

/** An account as an adapter that counts no margin gives it. */
const ACCOUNT = { balance: 10_000, equity: 10_000, unrealisedPnl: 0 } as AccountSummary;

function build(account?: () => AccountSummary | null): void {
  ticket = new WidgetOrderTicket(host, { onSubmit: () => {}, formatPrice: (p) => p.toFixed(2), account });
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  ticket.destroy();
  host.remove();
});

const row = (id: string) => host.querySelector<HTMLElement>(`.tcw-ticket-summary-row[data-row="${id}"]`);
const figure = (id: string) => row(id)?.querySelector('.tcw-ticket-figure')?.textContent ?? null;
const rows = () => [...host.querySelectorAll<HTMLElement>('.tcw-ticket-summary-row')].map((el) => el.dataset.row);

// The ticket said what an order was worth and not in what, nor what the account had to pay for it.
describe('the order ticket and the account', () => {
  it('says what the account has free to trade with, over the order’s value', () => {
    build(() => ({ ...ACCOUNT, freeMargin: 8_200.5 }));
    ticket.open({ lastPrice: 100 });
    expect(figure('available')).toBe('8200.50');
    expect(row('available')!.firstElementChild!.textContent).toBe('Available');
    // The order's value stays last, over the button that sends it.
    expect(rows().slice(-2)).toEqual(['available', 'value']);
  });

  it('writes the account’s currency after the account’s money, and not after the order’s value, which is the market’s', () => {
    build(() => ({ ...ACCOUNT, freeMargin: 8_200.5, currency: 'USD' }));
    ticket.open({ lastPrice: 100 });
    expect(figure('available')).toBe('8200.50 USD');
    // The currency is a unit beside the figure, said apart from it.
    expect(row('available')!.querySelector('.tcw-ticket-unit')!.textContent).toBe('USD');
    // A HOSE order in dong paid from an account in dollars: its value is no amount of dollars.
    expect(figure('value')).toBe('100.00');
    expect(row('value')!.querySelector('.tcw-ticket-unit')).toBeNull();
  });

  it('says nothing of the account where there is none, or where it does not count its free margin', () => {
    build();
    ticket.open({ lastPrice: 100 });
    expect(row('available')).toBeNull();
    expect(figure('value')).toBe('100.00');
    ticket.destroy();
    build(() => null);
    ticket.open({ lastPrice: 100 });
    expect(row('available')).toBeNull();
    ticket.destroy();
    build(() => ACCOUNT);
    ticket.open({ lastPrice: 100 });
    expect(row('available')).toBeNull();
    expect(figure('value')).toBe('100.00');
  });

  it('reads the account again when the order changes, and takes a free margin that is no number for none', () => {
    let free = 500;
    build(() => ({ ...ACCOUNT, freeMargin: free }));
    ticket.open({ lastPrice: 100 });
    expect(figure('available')).toBe('500.00');
    free = 420;
    const quantity = host.querySelector<HTMLInputElement>('input[type=number]')!;
    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    expect(figure('available')).toBe('420.00');
    // The account moved with the order as it was (a fill, margin given back): told, the receipt reads it again.
    free = 300;
    ticket.refreshAccount();
    expect(figure('available')).toBe('300.00');
    free = Number.NaN;
    quantity.value = '3';
    quantity.dispatchEvent(new Event('input'));
    expect(row('available')).toBeNull();
  });
});
