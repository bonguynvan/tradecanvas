// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OrderPlaceIntent } from '@tradecanvas/commons';
import { WidgetOrderTicket, type OrderTicketCallbacks } from '../WidgetOrderTicket.js';

let host: HTMLDivElement;
let ticket: WidgetOrderTicket;
let sent: OrderPlaceIntent[];

/** A ticket whose `onSubmit` answers as told: an id to wait on, or nothing. */
function build(onSubmit: OrderTicketCallbacks['onSubmit'] = (intent) => { sent.push(intent); }): void {
  ticket = new WidgetOrderTicket(host, { onSubmit, formatPrice: (p) => p.toFixed(2) });
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

const place = () => host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!;
const numbers = () => [...host.querySelectorAll<HTMLInputElement>('input[type=number]')];
const type = (value: string, at = 0) => {
  const input = numbers()[at];
  input.value = value;
  input.dispatchEvent(new Event('input'));
};
const side = (value: 'buy' | 'sell') => host.querySelector<HTMLButtonElement>(`.tcw-ticket-side-btn.tcw-ticket-${value}`)!;
const radios = (group: string) => [...host.querySelectorAll<HTMLElement>(`[data-ticket-field="${group}"] [role=radio]`)];
const checked = (group: string) => radios(group).find((r) => r.getAttribute('aria-checked') === 'true')?.dataset.value;
const figure = (row: string) => host.querySelector<HTMLElement>(`.tcw-ticket-summary-row[data-row="${row}"] .tcw-ticket-figure`)?.textContent;
const market = () => host.querySelector('.tcw-ticket-market')?.textContent ?? '';
const problems = () => host.querySelector('.tcw-ticket-problems')?.textContent ?? '';

/** The last trade at 100, the best bid half under it and the best ask half over. */
const QUOTE = { bid: 99.5, ask: 100.5 };

// A market Buy showed the ask on its button and was valued, checked and sent at the last price.
describe('a ticket on a market with a bid and an ask', () => {
  beforeEach(() => build());

  it('values a market Buy at the ask, and sends it so', () => {
    ticket.open({ lastPrice: 100, quote: QUOTE, quantity: 2 });
    expect(market()).toContain('100.50');
    expect(figure('value')).toBe('201.00');
    place().click();
    expect(sent).toEqual([{ side: 'buy', type: 'market', price: 100.5, quantity: 2 }]);
  });

  it('values a market Sell at the bid, and the other side again once the side is changed', () => {
    ticket.open({ side: 'sell', lastPrice: 100, quote: QUOTE, quantity: 2 });
    expect(market()).toContain('99.50');
    expect(figure('value')).toBe('199.00');
    side('buy').click();
    expect(market()).toContain('100.50');
    expect(figure('value')).toBe('201.00');
    side('sell').click();
    place().click();
    expect(sent[0]).toMatchObject({ side: 'sell', price: 99.5 });
  });

  it('tells a limit from a stop by the price its side trades at', () => {
    // Over the last price and under the ask: a Buy waits there, a limit.
    ticket.open({ side: 'buy', price: 100.2, lastPrice: 100, quote: QUOTE });
    expect(checked('type')).toBe('limit');
    expect(place().disabled).toBe(false);
    ticket.close();
    // Under the last price and over the bid: a Sell waits there.
    ticket.open({ side: 'sell', price: 99.8, lastPrice: 100, quote: QUOTE });
    expect(checked('type')).toBe('limit');
    expect(place().disabled).toBe(false);
  });

  it('checks a stop-loss against the price the order fills at', () => {
    ticket.open({ side: 'buy', lastPrice: 100, quote: QUOTE, stopLoss: 100.2 });
    // Under the ask it buys at: a loss, though over the last price.
    expect(place().disabled).toBe(false);
    ticket.close();
    ticket.open({ side: 'sell', lastPrice: 100, quote: QUOTE, stopLoss: 99.8 });
    expect(place().disabled).toBe(false);
  });

  it('follows the bid and the ask while it is open', () => {
    ticket.open({ lastPrice: 100, quote: QUOTE, quantity: 2 });
    ticket.setLastPrice(101, { bid: 100.5, ask: 101.5 });
    expect(market()).toContain('101.50');
    expect(figure('value')).toBe('203.00');
    // The quote gone (a feed with trades alone): the last price again.
    ticket.setLastPrice(101, null);
    expect(figure('value')).toBe('202.00');
  });

  it('is at the last price with a quote that is none: its bid over its ask, or a side that is no price', () => {
    ticket.open({ lastPrice: 100, quote: { bid: 100.5, ask: 99.5 }, quantity: 2 });
    expect(figure('value')).toBe('200.00');
    ticket.setLastPrice(100, { bid: 99.5, ask: 0 });
    expect(figure('value')).toBe('200.00');
    ticket.setLastPrice(100, { bid: Number.NaN, ask: 100.5 });
    expect(figure('value')).toBe('200.00');
  });

  it('is at the last price with no quote', () => {
    ticket.open({ lastPrice: 100, quantity: 2 });
    expect(figure('value')).toBe('200.00');
    place().click();
    expect(sent[0]).toMatchObject({ price: 100 });
  });
});

// A slow broker and a second press made two positions; a refusal came as a toast after the ticket had shut, what was typed gone.
describe('a ticket whose order waits on a broker', () => {
  beforeEach(() => build((intent) => {
    sent.push(intent);
    return 'c1';
  }));

  it('stays open with its Place off until the broker takes the order, and sends it once', () => {
    ticket.open({ lastPrice: 100 });
    place().click();
    expect(ticket.isOpen()).toBe(true);
    expect(place().disabled).toBe(true);
    expect(place().textContent).toBe('Sending…');
    place().click();
    place().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(sent).toHaveLength(1);
    expect(ticket.accepted('c1')).toBe(true);
    expect(ticket.isOpen()).toBe(false);
  });

  it('lets nothing be changed while the order is on its way', () => {
    ticket.open({ lastPrice: 100 });
    place().click();
    expect(numbers().every((input) => input.disabled)).toBe(true);
    expect(side('sell').disabled).toBe(true);
  });

  it('keeps what was typed when the broker refuses, and says why until it is changed', () => {
    ticket.open({ lastPrice: 100 });
    type('3');
    place().click();
    expect(ticket.refused('c1', 'Not enough margin')).toBe(true);
    expect(ticket.isOpen()).toBe(true);
    expect(numbers()[0].value).toBe('3');
    expect(numbers()[0].disabled).toBe(false);
    expect(problems()).toContain('Not enough margin');
    expect(place().disabled).toBe(false);
    expect(place().textContent).not.toBe('Sending…');
    // Changed, it is another order: the refusal was of the last one.
    type('2');
    expect(problems()).not.toContain('Not enough margin');
    place().click();
    expect(sent.map((intent) => intent.quantity)).toEqual([3, 2]);
  });

  // Place had the focus and is switched off: with the focus left on it, no key reached the ticket, Escape among them.
  it('keeps the keyboard: the focus goes to the button that shuts it while it waits, and back to Place when the order is refused', () => {
    ticket.open({ lastPrice: 100 });
    place().focus();
    place().click();
    const shut = host.querySelector<HTMLButtonElement>('.tcw-order-ticket .tcw-footer-cancel')!;
    expect(document.activeElement).toBe(shut);
    expect(shut.disabled).toBe(false);
    ticket.refused('c1', 'Not enough margin');
    expect(document.activeElement).toBe(place());
  });

  it('says so when no answer has come in ten seconds, and waits on', () => {
    vi.useFakeTimers();
    try {
      ticket.open({ lastPrice: 100 });
      place().click();
      vi.advanceTimersByTime(9_000);
      expect(problems()).toBe('');
      vi.advanceTimersByTime(2_000);
      expect(problems()).toContain('No answer from the broker yet');
      // Still on its way: not to be sent again from here.
      expect(place().disabled).toBe(true);
      expect(ticket.refused('c1', 'Not enough margin')).toBe(true);
      expect(problems()).not.toContain('No answer from the broker yet');
      expect(problems()).toContain('Not enough margin');
    } finally {
      vi.useRealTimers();
    }
  });

  it('takes no other order’s outcome for its own', () => {
    ticket.open({ lastPrice: 100 });
    place().click();
    expect(ticket.accepted('quick-7')).toBe(false);
    expect(ticket.refused('quick-7', 'Market closed')).toBe(false);
    expect(ticket.isOpen()).toBe(true);
    expect(place().disabled).toBe(true);
    expect(problems()).toBe('');
  });

  it('may be shut while it waits: the order is on its way all the same, and its outcome is no longer the ticket’s', () => {
    ticket.open({ lastPrice: 100 });
    place().click();
    ticket.close();
    expect(ticket.isOpen()).toBe(false);
    expect(ticket.refused('c1', 'Not enough margin')).toBe(false);
    // Opened again for another order, it does not wait on the old one.
    ticket.open({ lastPrice: 100 });
    expect(place().disabled).toBe(false);
    expect(ticket.accepted('c1')).toBe(false);
    expect(ticket.isOpen()).toBe(true);
  });
});

// A slip of the pointer beside the ticket shut it, and the order half typed was gone.
describe('a press outside the ticket', () => {
  it('leaves it open with what was typed: Escape, Cancel and the cross shut it', () => {
    build();
    ticket.open({ lastPrice: 100 });
    type('7');
    const backdrop = host.querySelector<HTMLElement>('.tcw-modal-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(ticket.isOpen()).toBe(true);
    expect(numbers()[0].value).toBe('7');
    host.querySelector<HTMLElement>('.tcw-order-ticket')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ticket.isOpen()).toBe(false);
  });
});

describe('a ticket whose order nothing answers for', () => {
  it('shuts as it places, as before', () => {
    build();
    ticket.open({ lastPrice: 100 });
    place().click();
    expect(sent).toHaveLength(1);
    expect(ticket.isOpen()).toBe(false);
  });
});
