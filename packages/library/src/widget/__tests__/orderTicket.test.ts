// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OrderPlaceIntent } from '@tradecanvas/commons';
import { orderTicketIntent, orderTicketProblems, orderTicketRiskReward, type OrderTicketDraft } from '../orderTicket.js';
import { WidgetOrderTicket } from '../WidgetOrderTicket.js';

const draft = (over: Partial<OrderTicketDraft> = {}): OrderTicketDraft => ({
  side: 'buy', type: 'limit', quantity: 1, price: 95, stopLoss: null, takeProfit: null, timeInForce: 'gtc', ...over,
});

describe('order ticket rules', () => {
  it('passes a sound order', () => {
    expect(orderTicketProblems(draft({ stopLoss: 90, takeProfit: 105 }), 100)).toEqual([]);
  });

  it('wants a positive quantity and price, and stops and targets above 0', () => {
    expect(orderTicketProblems(draft({ quantity: 0, price: NaN, stopLoss: NaN, takeProfit: -1 }), 100))
      .toEqual(expect.arrayContaining(['quantity', 'price', 'stopLoss', 'takeProfit']));
  });

  it('puts a limit on the side of the market it waits on, a stop on the other', () => {
    expect(orderTicketProblems(draft({ price: 105 }), 100)).toContain('limitSide'); // a buy limit above the market
    expect(orderTicketProblems(draft({ side: 'sell', price: 95 }), 100)).toContain('limitSide');
    expect(orderTicketProblems(draft({ type: 'stop', price: 95 }), 100)).toContain('stopSide'); // a buy stop below it
    expect(orderTicketProblems(draft({ type: 'stop', price: 105 }), 100)).toEqual([]);
  });

  it('puts a stop-loss on the losing side of the entry and a take-profit on the winning side', () => {
    expect(orderTicketProblems(draft({ stopLoss: 96, takeProfit: 94 }), 100)).toEqual(['stopLossSide', 'takeProfitSide']);
    expect(orderTicketProblems(draft({ side: 'sell', type: 'market', stopLoss: 101, takeProfit: 99 }), 100)).toEqual([]);
  });

  it('asks for the order the draft describes', () => {
    expect(orderTicketIntent(draft({ type: 'stop', price: 105, stopLoss: 100 }), 100)).toEqual({
      side: 'buy', type: 'stop', price: 105, stopPrice: 105, quantity: 1, timeInForce: 'gtc', stopLoss: 100,
    });
    expect(orderTicketIntent(draft({ type: 'market', quantity: 2 }), 100)).toEqual({ side: 'buy', type: 'market', price: 100, quantity: 2 });
  });

  it('works out reward over risk', () => {
    expect(orderTicketRiskReward(draft({ stopLoss: 90, takeProfit: 105 }), 100)).toBe(2);
    expect(orderTicketRiskReward(draft(), 100)).toBeNull();
  });
});

describe('WidgetOrderTicket', () => {
  let host: HTMLDivElement;
  let ticket: WidgetOrderTicket;
  let sent: OrderPlaceIntent[];

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    sent = [];
    ticket = new WidgetOrderTicket(host, { onSubmit: (i) => sent.push(i), formatPrice: (p) => p.toFixed(2) });
  });

  afterEach(() => {
    ticket.destroy();
    host.remove();
  });

  const place = () => host.querySelector<HTMLButtonElement>('.tcw-done-btn')!;
  const type = (value: string) => {
    const input = host.querySelectorAll<HTMLInputElement>('input[type=number]')[0];
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('starts as a limit where the market would come down to it, and places it', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe('limit');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 95, quantity: 1 })]);
    expect(ticket.isOpen()).toBe(false);
  });

  it('won’t place an order with something wrong, and says what', () => {
    ticket.open({ lastPrice: 100 });
    type('0'); // the quantity
    expect(place().disabled).toBe(true);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toMatch(/quantity/i);
    place().click();
    expect(sent).toEqual([]);
  });

  it('switches to a sell and adds a stop-loss on the right side', () => {
    ticket.open({ lastPrice: 100 });
    host.querySelector<HTMLButtonElement>('.tcw-ticket-sell')!.click();
    const toggles = host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle');
    toggles[0].click(); // stop-loss on: 1% above the entry for a sell
    place().click();
    expect(sent[0]).toMatchObject({ side: 'sell', type: 'market', stopLoss: 101 });
  });

  it('closes on Escape without placing anything', () => {
    ticket.open({ lastPrice: 100 });
    host.querySelector('.tcw-modal')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ticket.isOpen()).toBe(false);
    expect(sent).toEqual([]);
  });
});

describe('WidgetOrderTicket focus', () => {
  it('gives focus back to where it was', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    const ticket = new WidgetOrderTicket(host, { onSubmit: vi.fn(), formatPrice: String });
    ticket.open({ lastPrice: 100 });
    expect(document.activeElement).not.toBe(button);
    ticket.close();
    expect(document.activeElement).toBe(button);
    ticket.destroy();
    host.remove();
    button.remove();
  });
});
