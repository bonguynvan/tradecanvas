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

  it('wants a market price for a market order', () => {
    expect(orderTicketProblems(draft({ type: 'market', price: 0 }), null)).toEqual(['market']);
    expect(orderTicketProblems(draft({ type: 'market', price: 0 }), 100)).toEqual([]);
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

  it('keeps prices on the market’s step, inside the day’s limits, and lots whole', () => {
    // HOSE in thousands of dong: 0.05 a step from 10 to 50, ceiling 27.1, floor 23.6.
    const rules = {
      roundPrice: (p: number) => Number((Math.round(p / 0.05) * 0.05).toFixed(2)),
      limits: { ceiling: 27.1, floor: 23.6 },
      lot: 100,
    };
    const hose = (over: Partial<OrderTicketDraft>) => draft({ price: 25.35, quantity: 100, ...over });
    expect(orderTicketProblems(hose({ stopLoss: 24.5, takeProfit: 26 }), 25.5, rules)).toEqual([]);
    expect(orderTicketProblems(hose({ price: 25.37 }), 25.5, rules)).toEqual(['priceStep']);
    expect(orderTicketProblems(hose({ stopLoss: 24.52 }), 25.5, rules)).toEqual(['priceStep']);
    expect(orderTicketProblems(hose({ price: 23.5 }), 25.5, rules)).toEqual(['priceLimits']);
    expect(orderTicketProblems(hose({ type: 'stop', price: 27.15 }), 25.5, rules)).toEqual(['priceLimits']);
    // Odd lots (under 100) are orders of their own; above a lot, whole lots only.
    expect(orderTicketProblems(hose({ quantity: 40 }), 25.5, rules)).toEqual([]);
    expect(orderTicketProblems(hose({ quantity: 250 }), 25.5, rules)).toEqual(['lot']);
    // A market order's price is the market's.
    expect(orderTicketProblems(hose({ type: 'market', price: 0 }), 25.5, rules)).toEqual([]);
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

  const place = () => host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!;
  const numbers = () => [...host.querySelectorAll<HTMLInputElement>('input[type=number]')];
  const type = (value: string, at = 0) => {
    const input = numbers()[at];
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const radios = (group: string) => [...host.querySelectorAll<HTMLElement>(`[data-ticket-field="${group}"] [role=radio]`)];
  const checked = (group: string) => radios(group).find((r) => r.getAttribute('aria-checked') === 'true')?.dataset.value;
  const summary = () => Object.fromEntries([...host.querySelectorAll<HTMLElement>('.tcw-ticket-summary-row')].map((row) => [row.dataset.row, row.querySelector('.tcw-ticket-figure')!.textContent]));

  it('starts as a limit where the market would come down to it, and places it', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    expect(checked('type')).toBe('limit');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 95, quantity: 1 })]);
    expect(ticket.isOpen()).toBe(false);
  });

  it('names the symbol it is for, and rounds a price from the chart as the chart does', () => {
    ticket.open({ symbol: 'BTCUSDT', price: 75997.2844890925, lastPrice: 76100, round: (p) => Number(p.toFixed(2)) });
    expect(host.querySelector('.tcw-ticket-symbol')?.textContent).toBe('BTCUSDT');
    expect(numbers()[1].value).toBe('75997.28');
  });

  it('takes the type and the time in force as choices in a row, moved through with the arrows', () => {
    ticket.open({ lastPrice: 100 });
    expect(host.querySelector('[data-ticket-field="type"]')!.getAttribute('role')).toBe('radiogroup');
    expect(radios('type').map((r) => r.dataset.value)).toEqual(['market', 'limit', 'stop']);
    expect(radios('timeInForce')).toEqual([]);
    radios('type')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(checked('type')).toBe('limit');
    expect(document.activeElement).toBe(radios('type')[1]);
    expect(checked('timeInForce')).toBe('gtc');
    radios('timeInForce')[1].click();
    expect(checked('timeInForce')).toBe('day');
  });

  it('steps the quantity by a lot and a price by the market’s step', () => {
    ticket.open({ price: 95, lastPrice: 100, step: () => 0.5, rules: { lot: 100 } });
    host.querySelector<HTMLButtonElement>('[data-ticket-field="quantity-up"]')!.click();
    expect(numbers()[0].value).toBe('200');
    host.querySelector<HTMLButtonElement>('[data-ticket-field="price-down"]')!.click();
    expect(numbers()[1].value).toBe('94.5');
    place().click();
    expect(sent[0]).toMatchObject({ quantity: 200, price: 94.5 });
  });

  it('says how far a stop-loss and a take-profit are, and what they would make', () => {
    ticket.open({ lastPrice: 100 });
    const toggles = host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle');
    toggles[0].click(); // the stop 1% under a buy
    host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[1].click(); // the target 2% over
    const away = [...host.querySelectorAll('.tcw-ticket-away')].map((el) => el.textContent);
    expect(away).toEqual(['-1.00% · -1.00', '+2.00% · +2.00']);
  });

  it('sums the order up: its value, its risk and reward, and the one over the other', () => {
    ticket.open({ lastPrice: 100 });
    type('3');
    expect(summary()).toEqual({ value: '300.00' });
    host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[0].click();
    host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[1].click();
    expect(summary()).toEqual({ value: '300.00', risk: '-3.00', reward: '+6.00', ratio: '2.00' });
  });

  it('writes a price to the decimals of the market’s step', () => {
    ticket.open({ price: 77915.1, lastPrice: 78000, step: () => 0.01 });
    expect(numbers()[1].value).toBe('77915.10');
    host.querySelector<HTMLButtonElement>('[data-ticket-field="price-up"]')!.click();
    expect(numbers()[1].value).toBe('77915.11');
  });

  it('writes money with the host’s own format when it gives one', () => {
    ticket.destroy();
    ticket = new WidgetOrderTicket(host, { onSubmit: (i) => sent.push(i), formatPrice: (p) => p.toFixed(4), formatAmount: (v) => v.toFixed(1) });
    ticket.open({ lastPrice: 100 });
    host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[0].click();
    expect(host.querySelector('.tcw-ticket-away')!.textContent).toBe('-1.00% · -1.0');
    expect(summary()).toMatchObject({ value: '100.0', risk: '-1.0' });
  });

  it('turns a stop into a limit when the side changes, so the order still waits where it was put', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    expect(checked('type')).toBe('stop');
    host.querySelector<HTMLButtonElement>('.tcw-ticket-sell')!.click();
    expect(checked('type')).toBe('limit');
    place().click();
    expect(sent[0]).toMatchObject({ side: 'sell', type: 'limit', price: 105 });
  });

  it('writes its figures left to right in any widget: a sign stays before its number', () => {
    ticket.open({ lastPrice: 100 });
    host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[0].click();
    const figures = [...host.querySelectorAll<HTMLElement>('.tcw-ticket-away, .tcw-ticket-figure')];
    expect(figures.length).toBeGreaterThan(2);
    expect(figures.every((el) => el.dir === 'ltr')).toBe(true);
  });

  it('won’t place an order with something wrong, and says what', () => {
    ticket.open({ lastPrice: 100 });
    type('0'); // the quantity
    expect(place().disabled).toBe(true);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toMatch(/quantity/i);
    place().click();
    expect(sent).toEqual([]);
  });

  it('switches to a sell, Place in the sell’s colour, and adds a stop-loss on the right side', () => {
    ticket.open({ lastPrice: 100 });
    host.querySelector<HTMLButtonElement>('.tcw-ticket-sell')!.click();
    expect(host.querySelector('.tcw-order-ticket')!.getAttribute('data-side')).toBe('sell');
    expect(place().textContent).toBe('Place sell order');
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
