// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OrderPlaceIntent } from '@tradecanvas/commons';
import { orderTicketIntent, orderTicketProblems, orderTicketRiskReward, orderTicketSummary, ticketEntry, ticketFillRange, ticketTakeProfitLevels, ticketTimesInForce, type OrderTicketDraft } from '../orderTicket.js';
import { utcToWallTime, wallTimeToUtc } from '../wallTime.js';
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
    // A market traded in lots trades whole shares: a part of one (a risk that buys 0.01) is no order.
    expect(orderTicketProblems(hose({ quantity: 0.01 }), 25.5, rules)).toEqual(['lot']);
    expect(orderTicketProblems(hose({ quantity: 50 }), 25.5, rules)).toEqual([]);
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

/** The moment the ticket's clock stands at in these tests: 23 November 2026, nine in the morning, UTC. */
const NOW = Date.UTC(2026, 10, 23, 9, 0);

describe('a stop-limit order', () => {
  /** A buy that begins to work at 105 and takes no more than 106, over a market at 100. */
  const stopLimit = (over: Partial<OrderTicketDraft> = {}) => draft({ type: 'stopLimit', price: 106, stopPrice: 105, ...over });

  it('waits, as a stop does: good till cancelled, for the day or till a date', () => {
    expect(ticketTimesInForce('stopLimit')).toEqual(['gtc', 'day', 'gtd']);
    expect(orderTicketIntent(stopLimit({ timeInForce: 'ioc' }), 100).timeInForce).toBe('gtc');
  });

  it('needs a stop above 0, on the side of the market a stop waits on', () => {
    expect(orderTicketProblems(stopLimit(), 100)).toEqual([]);
    expect(orderTicketProblems(stopLimit({ stopPrice: undefined }), 100)).toEqual(['stopPrice']);
    expect(orderTicketProblems(stopLimit({ stopPrice: Number.NaN }), 100)).toEqual(['stopPrice']);
    expect(orderTicketProblems(stopLimit({ stopPrice: 0 }), 100)).toEqual(['stopPrice']);
    // A buy's stop under the market, a sell's over it: it would begin to work at once.
    expect(orderTicketProblems(stopLimit({ stopPrice: 95 }), 100)).toEqual(['stopSide']);
    expect(orderTicketProblems(stopLimit({ side: 'sell' }), 100)).toEqual(['stopSide']);
    expect(orderTicketProblems(stopLimit({ side: 'sell', stopPrice: 95, price: 94 }), 100)).toEqual([]);
    // With no market to tell by, its side is not judged.
    expect(orderTicketProblems(stopLimit({ stopPrice: 95 }), null)).toEqual([]);
  });

  it('needs a limit above 0, which may stand on either side of its stop and of the market', () => {
    expect(orderTicketProblems(stopLimit({ price: Number.NaN }), 100)).toEqual(['price']);
    expect(orderTicketProblems(stopLimit({ price: 104 }), 100)).toEqual([]);
    expect(orderTicketProblems(stopLimit({ price: 95 }), 100)).toEqual([]);
  });

  it('keeps both its prices on the market’s step and inside the day’s limits', () => {
    const rules = {
      roundPrice: (p: number) => Number((Math.round(p / 0.05) * 0.05).toFixed(2)),
      limits: { ceiling: 27.1, floor: 23.6 },
      lot: 100,
    };
    const hose = (over: Partial<OrderTicketDraft>) => draft({ type: 'stopLimit', quantity: 100, price: 26, stopPrice: 25.8, ...over });
    expect(orderTicketProblems(hose({}), 25.5, rules)).toEqual([]);
    expect(orderTicketProblems(hose({ stopPrice: 25.82 }), 25.5, rules)).toEqual(['priceStep']);
    expect(orderTicketProblems(hose({ price: 26.02 }), 25.5, rules)).toEqual(['priceStep']);
    // A stop past the ceiling is never reached; a limit past it is no price to take.
    expect(orderTicketProblems(hose({ stopPrice: 27.5, price: 27 }), 25.5, rules)).toEqual(['priceLimits']);
    expect(orderTicketProblems(hose({ price: 27.5 }), 25.5, rules)).toEqual(['priceLimits']);
  });

  it('sends its stop and its limit, and a stop of its own with no other kind of order', () => {
    expect(orderTicketIntent(stopLimit({ quantity: 2 }), 100)).toMatchObject({ type: 'stopLimit', price: 106, stopPrice: 105, quantity: 2, timeInForce: 'gtc' });
    // What the draft still holds from a kind chosen before is not sent.
    expect(orderTicketIntent(draft({ price: 95, stopPrice: 105 }), 100)).not.toHaveProperty('stopPrice');
    expect(orderTicketIntent(draft({ type: 'market', stopPrice: 105 }), 100)).not.toHaveProperty('stopPrice');
    expect(orderTicketIntent(draft({ type: 'stop', price: 104, stopPrice: 105 }), 100)).toMatchObject({ type: 'stop', price: 104, stopPrice: 104 });
  });

  it('is summed up at its limit, the worst price it takes: what the account sizes it at', () => {
    const order = stopLimit({ quantity: 2, stopLoss: 100, takeProfit: 118 });
    expect(ticketEntry(order, 100)).toBe(106);
    expect(orderTicketSummary(order, 100)).toMatchObject({ value: 212, risk: -12, reward: 24 });
  });

  it('may fill anywhere from its stop to its limit: its stop-loss goes beyond the one, its take-profit beyond the other', () => {
    const order = stopLimit({ stopLoss: 100, takeProfit: 118 });
    expect(ticketFillRange(order, 100)).toEqual({ low: 105, high: 106 });
    expect(orderTicketProblems(order, 100)).toEqual([]);
    // Filled at its stop's 105, a stop-loss at 105.5 is hit as the position opens.
    expect(orderTicketProblems({ ...order, stopLoss: 105.5 }, 100)).toEqual(['stopLossSide']);
    expect(orderTicketProblems({ ...order, stopLoss: 105 }, 100)).toEqual(['stopLossSide']);
    expect(orderTicketProblems({ ...order, stopLoss: 104.5 }, 100)).toEqual([]);
    // Filled at its limit's 106, a take-profit at 105.5 is hit at once too.
    expect(orderTicketProblems({ ...order, takeProfit: 105.5 }, 100)).toEqual(['takeProfitSide']);
    expect(orderTicketProblems({ ...order, takeProfit: 106 }, 100)).toEqual(['takeProfitSide']);
    expect(orderTicketProblems({ ...order, takeProfit: 106.5 }, 100)).toEqual([]);
    // A sell, the other way: from its stop's 95 down to its limit's 94.
    const sell = stopLimit({ side: 'sell', stopPrice: 95, price: 94, stopLoss: 100, takeProfit: 90 });
    expect(ticketFillRange(sell, 100)).toEqual({ low: 94, high: 95 });
    expect(orderTicketProblems(sell, 100)).toEqual([]);
    expect(orderTicketProblems({ ...sell, stopLoss: 94.5 }, 100)).toEqual(['stopLossSide']);
    expect(orderTicketProblems({ ...sell, takeProfit: 94.5 }, 100)).toEqual(['takeProfitSide']);
  });

  it('fills at its limit when that waits on the near side of its stop: the market has to come back to it', () => {
    const back = stopLimit({ price: 104, stopLoss: 103.5, takeProfit: 104.5 });
    expect(ticketFillRange(back, 100)).toEqual({ low: 104, high: 104 });
    expect(orderTicketProblems(back, 100)).toEqual([]);
    expect(orderTicketProblems({ ...back, stopLoss: 104.5 }, 100)).toEqual(['stopLossSide']);
  });

  it('fills at one price for every other kind of order: where its position starts', () => {
    expect(ticketFillRange(draft({ price: 95 }), 100)).toEqual({ low: 95, high: 95 });
    expect(ticketFillRange(draft({ type: 'market', price: 0 }), 100)).toEqual({ low: 100, high: 100 });
    expect(ticketFillRange(draft({ type: 'market', price: 0 }), null)).toBeNull();
    expect(ticketFillRange(draft({ price: 105, timeInForce: 'ioc' }), 100)).toEqual({ low: 100, high: 100 });
    // A stop-limit with no stop yet is taken at its limit.
    expect(ticketFillRange(stopLimit({ stopPrice: undefined }), 100)).toEqual({ low: 106, high: 106 });
  });
});

describe('a limit order that fills at once or not at all', () => {
  it('may go through the market, which is what it is for; one that waits may not', () => {
    // A buy limit over the market would fill at once: a slip for an order that waits, the point of one that does not.
    expect(orderTicketProblems(draft({ price: 105 }), 100)).toContain('limitSide');
    expect(orderTicketProblems(draft({ price: 105, timeInForce: 'ioc' }), 100)).toEqual([]);
    expect(orderTicketProblems(draft({ side: 'sell', price: 95, timeInForce: 'fok' }), 100)).toEqual([]);
    expect(orderTicketProblems(draft({ price: 105, timeInForce: 'day' }), 100)).toContain('limitSide');
    expect(orderTicketProblems(draft({ price: 105, timeInForce: 'gtd', expireTime: NOW + 1 }), 100, { now: NOW })).toContain('limitSide');
  });

  it('starts its position at the market when it is through it: its price is the worst it takes', () => {
    const through = draft({ price: 105, timeInForce: 'ioc', quantity: 2, stopLoss: 98, takeProfit: 110 });
    expect(ticketEntry(through, 100)).toBe(100);
    expect(ticketEntry({ ...through, side: 'sell', price: 95 }, 100)).toBe(100);
    // Two at the market's 100, not at the limit's 105: a stop 2 away loses 4, a target 10 away makes 20.
    expect(orderTicketSummary(through, 100)).toMatchObject({ value: 200, risk: -4, reward: 20 });
    expect(orderTicketRiskReward(through, 100)).toBe(5);
    // A stop between the market and the limit is on the wrong side of where it fills.
    expect(orderTicketProblems({ ...through, stopLoss: 102 }, 100)).toEqual(['stopLossSide']);
    // The limit is still what is sent: the worst price the order takes.
    expect(orderTicketIntent(through, 100)).toMatchObject({ type: 'limit', price: 105, timeInForce: 'ioc' });
  });

  it('is taken at its price where it is not through the market, and with no market to tell by', () => {
    // On the waiting side the account will refuse it; the sums are a limit's.
    expect(ticketEntry(draft({ price: 95, timeInForce: 'ioc' }), 100)).toBe(95);
    expect(ticketEntry(draft({ price: 105, timeInForce: 'fok' }), null)).toBe(105);
    // An order that waits is taken at its price wherever the market is.
    expect(ticketEntry(draft({ price: 105 }), 100)).toBe(105);
    expect(ticketEntry(draft({ type: 'stop', price: 105, timeInForce: 'ioc' }), 100)).toBe(105);
    expect(ticketEntry(draft({ type: 'market', price: 0 }), 100)).toBe(100);
    expect(ticketEntry(draft({ type: 'market', price: 0 }), null)).toBeNull();
  });

  it('parts its take-profit from the market it fills at, and trails its stop from there', () => {
    const through = draft({ price: 105, timeInForce: 'ioc', quantity: 2, stopLoss: 98, takeProfit: 110, targets: 2, trailing: true });
    // Half way from 100 to 110, not from 105.
    expect(orderTicketIntent(through, 100)).toMatchObject({ takeProfits: [{ price: 105, quantity: 1 }], trailingStop: 2 });
  });

  it('leaves a stop order its side: it waits, whatever its draft still holds', () => {
    expect(orderTicketProblems(draft({ type: 'stop', price: 95, timeInForce: 'ioc' }), 100)).toContain('stopSide');
  });
});

describe('an order good till a date', () => {
  it('is offered for an order that waits: a limit or a stop', () => {
    expect(ticketTimesInForce('limit')).toEqual(['gtc', 'day', 'gtd', 'ioc', 'fok']);
    expect(ticketTimesInForce('stop')).toEqual(['gtc', 'day', 'gtd']);
  });

  it('needs a time to come to end at', () => {
    const till = (expireTime?: number | null) => orderTicketProblems(draft({ timeInForce: 'gtd', expireTime }), 100, { now: NOW });
    expect(till()).toEqual(['expireTime']);
    expect(till(null)).toEqual(['expireTime']);
    expect(till(Number.NaN)).toEqual(['expireTime']);
    expect(till(NOW)).toEqual(['expireTime']);
    expect(till(NOW - 60_000)).toEqual(['expireTime']);
    expect(till(NOW + 60_000)).toEqual([]);
  });

  it('asks nothing of the time of an order that is not good till a date', () => {
    expect(orderTicketProblems(draft({ timeInForce: 'gtc', expireTime: NOW - 1 }), 100, { now: NOW })).toEqual([]);
    expect(orderTicketProblems(draft({ type: 'market', timeInForce: 'gtd' }), 100, { now: NOW })).toEqual([]);
  });

  it('sends its time with the order, and no time with an order of another kind', () => {
    const at = NOW + 3_600_000;
    expect(orderTicketIntent(draft({ timeInForce: 'gtd', expireTime: at }), 100)).toMatchObject({ timeInForce: 'gtd', expireTime: at });
    expect(orderTicketIntent(draft({ timeInForce: 'day', expireTime: at }), 100)).not.toHaveProperty('expireTime');
    expect(orderTicketIntent(draft({ type: 'market', timeInForce: 'gtd', expireTime: at }), 100)).not.toHaveProperty('expireTime');
    expect(orderTicketIntent(draft({ type: 'stop', price: 105, timeInForce: 'gtd', expireTime: at }), 100)).toMatchObject({ timeInForce: 'gtd', expireTime: at });
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
    ticket = new WidgetOrderTicket(host, {
      onSubmit: (i) => sent.push(i),
      formatPrice: (p) => p.toFixed(2),
      // The date and time fields in UTC, and a clock that stands still.
      toWallTime: (time) => utcToWallTime(time, 0),
      fromWallTime: (date, time) => wallTimeToUtc(date, time, 0),
      now: () => NOW,
    });
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
  const pickTif = (value: string) => radios('timeInForce').find((r) => r.dataset.value === value)!.click();
  const expiry = () => ({
    date: host.querySelector<HTMLInputElement>('[data-ticket-field="expireDate"]'),
    time: host.querySelector<HTMLInputElement>('[data-ticket-field="expireTime"]'),
  });
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
    expect(radios('type').map((r) => r.dataset.value)).toEqual(['market', 'limit', 'stop', 'stopLimit']);
    expect(radios('timeInForce')).toEqual([]);
    radios('type')[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(checked('type')).toBe('limit');
    expect(document.activeElement).toBe(radios('type')[1]);
    expect(checked('timeInForce')).toBe('gtc');
    radios('timeInForce')[1].click();
    expect(checked('timeInForce')).toBe('day');
  });

  it('offers a limit order the kinds that fill at once or not at all, and a stop order only those that wait', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    expect(radios('timeInForce').map((r) => r.dataset.value)).toEqual(['gtc', 'day', 'gtd', 'ioc', 'fok']);
    pickTif('ioc');
    expect(checked('timeInForce')).toBe('ioc');
    radios('type')[2].click();
    expect(radios('timeInForce').map((r) => r.dataset.value)).toEqual(['gtc', 'day', 'gtd']);
    expect(checked('timeInForce')).toBe('gtc');
  });

  it('asks a good-till-date order when it ends: a date and a time, a day from now to start with', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    expect(expiry().date).toBeNull();
    pickTif('gtd');
    expect(checked('timeInForce')).toBe('gtd');
    const { date, time } = expiry();
    expect(date!.type).toBe('date');
    expect(time!.type).toBe('time');
    expect([date!.value, time!.value]).toEqual(['2026-11-24', '09:00']);
    expect(date!.getAttribute('aria-label')).toBe('Expires: Date');
    expect(time!.getAttribute('aria-label')).toBe('Expires: Time');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ type: 'limit', timeInForce: 'gtd', expireTime: Date.UTC(2026, 10, 24, 9, 0) })]);
  });

  it('sends the time picked, and will not place an order that ends in the past or at no time', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    pickTif('gtd');
    const set = (field: 'date' | 'time', value: string) => {
      const input = expiry()[field]!;
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    set('date', '2026-11-22');
    expect(place().disabled).toBe(true);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toBe('The order has to end at a time to come.');
    set('date', '');
    expect(place().disabled).toBe(true);
    set('date', '2026-12-01');
    // The time emptied: no time is not midnight, and the field does not say one thing while the order holds another.
    set('time', '');
    expect(place().disabled).toBe(true);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toBe('The order has to end at a time to come.');
    set('time', '15:30');
    expect(place().disabled).toBe(false);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toBe('');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ timeInForce: 'gtd', expireTime: Date.UTC(2026, 11, 1, 15, 30) })]);
  });

  it('reads and writes the date on the clock it is given: a chart seven hours east of UTC', () => {
    const east = 7 * 60;
    const local = new WidgetOrderTicket(host, {
      onSubmit: (i) => sent.push(i),
      formatPrice: (p) => p.toFixed(2),
      toWallTime: (time) => utcToWallTime(time, east),
      fromWallTime: (date, time) => wallTimeToUtc(date, time, east),
      now: () => NOW,
    });
    local.open({ price: 95, lastPrice: 100 });
    const field = (name: string) => [...host.querySelectorAll<HTMLInputElement>(`[data-ticket-field="${name}"]`)].at(-1)!;
    [...host.querySelectorAll<HTMLElement>('[data-ticket-field="timeInForce-gtd"]')].at(-1)!.click();
    // Nine in the morning UTC is four in the afternoon there; a day on.
    expect([field('expireDate').value, field('expireTime').value]).toEqual(['2026-11-24', '16:00']);
    field('expireTime').value = '00:30';
    field('expireTime').dispatchEvent(new Event('change', { bubbles: true }));
    [...host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-place')].at(-1)!.click();
    // Half past midnight there on the 24th is half past five in the evening of the 23rd, UTC.
    expect(sent).toEqual([expect.objectContaining({ timeInForce: 'gtd', expireTime: Date.UTC(2026, 10, 23, 17, 30) })]);
    local.destroy();
  });

  it('takes the date away with another kind, and has the time that was picked when the kind comes back', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    pickTif('gtd');
    const date = expiry().date!;
    date.value = '2026-12-05';
    date.dispatchEvent(new Event('change', { bubbles: true }));
    pickTif('day');
    expect(expiry().date).toBeNull();
    place().click();
    expect(sent[0]).not.toHaveProperty('expireTime');
    ticket.open({ price: 95, lastPrice: 100 });
    pickTif('gtd');
    // A new ticket starts a day from now again.
    expect(expiry().date!.value).toBe('2026-11-24');
    const again = expiry().date!;
    again.value = '2026-12-05';
    again.dispatchEvent(new Event('change', { bubbles: true }));
    pickTif('gtc');
    pickTif('gtd');
    expect(expiry().date!.value).toBe('2026-12-05');
  });

  it('keeps a stop order good till its date, and a market order has none', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    pickTif('gtd');
    radios('type')[2].click();
    expect(checked('timeInForce')).toBe('gtd');
    expect(expiry().date).not.toBeNull();
    radios('type')[0].click();
    expect(expiry().date).toBeNull();
  });

  it('takes a stop-limit: a stop price and a limit price, each named, both where the order was to start with', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    expect(host.querySelector('[data-ticket-field="stopPrice"]')).toBeNull();
    radios('type')[3].click();
    expect(checked('type')).toBe('stopLimit');
    const stop = host.querySelector<HTMLInputElement>('input[data-ticket-field="stopPrice"]')!;
    const limit = host.querySelector<HTMLInputElement>('input[data-ticket-field="price"]')!;
    expect([stop.value, limit.value]).toEqual(['105', '105']);
    expect([stop.getAttribute('aria-label'), limit.getAttribute('aria-label')]).toEqual(['Stop price', 'Limit price']);
    // The rows say which price is which, the stop first.
    const names = [...host.querySelectorAll<HTMLElement>('.tcw-ticket-row > .tcw-settings-label')].map((label) => label.textContent);
    expect(names.slice(names.indexOf('Stop price'), names.indexOf('Stop price') + 2)).toEqual(['Stop price', 'Limit price']);
    expect(names).not.toContain('Price');
    expect(radios('timeInForce').map((r) => r.dataset.value)).toEqual(['gtc', 'day', 'gtd']);
    limit.value = '106';
    limit.dispatchEvent(new Event('input'));
    place().click();
    expect(sent).toEqual([expect.objectContaining({ side: 'buy', type: 'stopLimit', price: 106, stopPrice: 105, timeInForce: 'gtc' })]);
  });

  it('steps a stop-limit’s stop by the market’s step, and says when it is on the wrong side of the market', () => {
    ticket.open({ price: 95, lastPrice: 100, step: () => 0.5 });
    radios('type')[3].click();
    // A buy's stop under the market: it would begin to work at once.
    expect(place().disabled).toBe(true);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toBe('A buy stop goes above the market and a sell stop below it.');
    const stop = host.querySelector<HTMLInputElement>('input[data-ticket-field="stopPrice"]')!;
    stop.value = '104.5';
    stop.dispatchEvent(new Event('input'));
    host.querySelector<HTMLButtonElement>('[data-ticket-field="stopPrice-up"]')!.click();
    expect(stop.value).toBe('105.0');
    expect(place().disabled).toBe(false);
    stop.value = '';
    stop.dispatchEvent(new Event('input'));
    expect(place().disabled).toBe(true);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toBe('Enter a stop price above 0.');
  });

  it('starts a stop-limit’s stop-loss from its stop and its take-profit from its limit: the prices it may fill at', () => {
    ticket.open({ price: 200, lastPrice: 100 });
    radios('type')[3].click();
    const field = (name: string) => host.querySelector<HTMLInputElement>(`input[data-ticket-field="${name}"]`)!;
    field('price').value = '220';
    field('price').dispatchEvent(new Event('input'));
    const switches = () => [...host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')];
    switches()[0].click();
    // One percent under the stop's 200, not under the limit's 220, which would be over the stop.
    expect(field('stopLoss').value).toBe('198');
    switches()[1].click();
    // Two percent over the limit's 220.
    expect(field('takeProfit').value).toBe('224.4');
    expect(place().disabled).toBe(false);
  });

  it('makes a stop-limit’s stop the price of the stop order it is changed to', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    radios('type')[3].click();
    const field = (name: string) => host.querySelector<HTMLInputElement>(`input[data-ticket-field="${name}"]`)!;
    field('price').value = '106';
    field('price').dispatchEvent(new Event('input'));
    radios('type')[2].click();
    // A stop order's one price is where it begins to work: the stop that was set, not the limit.
    expect(field('price').value).toBe('105');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ type: 'stop', price: 105, stopPrice: 105 })]);
  });

  it('keeps a stop-limit a stop-limit when the side changes, and its stop when another kind is tried', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    radios('type')[3].click();
    const field = (name: string) => host.querySelector<HTMLInputElement>(`input[data-ticket-field="${name}"]`)!;
    field('stopPrice').value = '104';
    field('stopPrice').dispatchEvent(new Event('input'));
    host.querySelector<HTMLButtonElement>('[data-ticket-field="side-sell"]')!.click();
    expect(checked('type')).toBe('stopLimit');
    // A sell's stop over the market is on the wrong side: said, not changed for the trader.
    expect(place().disabled).toBe(true);
    host.querySelector<HTMLButtonElement>('[data-ticket-field="side-buy"]')!.click();
    radios('type')[1].click();
    expect(host.querySelector('[data-ticket-field="stopPrice"]')).toBeNull();
    radios('type')[3].click();
    expect(field('stopPrice').value).toBe('104');
  });

  it('places a limit through the market once it is one that fills at once', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    // Over the market a buy starts as a stop; as a limit that waits it would fill at once.
    expect(checked('type')).toBe('stop');
    radios('type')[1].click();
    expect(place().disabled).toBe(true);
    pickTif('ioc');
    expect(place().disabled).toBe(false);
    expect(host.querySelector('.tcw-ticket-problems')!.textContent).toBe('');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ side: 'buy', type: 'limit', price: 105, timeInForce: 'ioc' })]);
  });

  it('starts the stop of a limit through the market from the market, where it fills', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    radios('type')[1].click();
    pickTif('ioc');
    host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[0].click();
    // One percent under the market's 100, not under the limit's 105.
    expect(host.querySelector<HTMLInputElement>('input[data-ticket-field="stopLoss"]')!.value).toBe('99');
    expect(place().disabled).toBe(false);
  });

  it('asks for a stop order good till cancelled when its draft still holds a kind it cannot be', () => {
    expect(orderTicketIntent({ side: 'buy', type: 'stop', quantity: 1, price: 105, stopLoss: null, takeProfit: null, timeInForce: 'ioc', trailing: false }, 100).timeInForce).toBe('gtc');
    expect(orderTicketIntent({ side: 'buy', type: 'limit', quantity: 1, price: 95, stopLoss: null, takeProfit: null, timeInForce: 'ioc', trailing: false }, 100).timeInForce).toBe('ioc');
  });

  it('sends the kind chosen for a limit order', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    pickTif('fok');
    place().click();
    expect(sent).toEqual([expect.objectContaining({ type: 'limit', timeInForce: 'fok' })]);
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

  it('offers one, two or three targets once there is a take-profit, and lists what each takes off', () => {
    ticket.open({ price: 95, lastPrice: 100, quantity: 3 });
    expect(host.querySelector('[data-ticket-field="targets"]')).toBeNull();
    host.querySelector<HTMLElement>('[data-ticket-field="takeProfit-switch"]')!.click();
    expect(radios('targets').map((r) => r.dataset.value)).toEqual(['1', '2', '3']);
    expect(checked('targets')).toBe('1');
    expect(host.querySelector('.tcw-ticket-levels')?.textContent).toBe('');
    radios('targets')[2].click();
    expect(checked('targets')).toBe('3');
    const listed = host.querySelector('.tcw-ticket-levels')!.textContent!;
    expect(listed.split(' · ')).toHaveLength(3);
    expect(listed).toMatch(/^TP1 .* × 1 · TP2 .* × 1 · TP3 .* × 1$/);
    place().click();
    expect(sent[0].takeProfits).toHaveLength(2);
    expect(sent[0].takeProfits![0].quantity).toBe(1);
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

describe('order ticket: a trailing stop', () => {
  it('asks for the stop to trail at its distance from the entry', () => {
    expect(orderTicketIntent(draft({ price: 95, stopLoss: 92, trailing: true }), 100)).toMatchObject({ stopLoss: 92, trailingStop: 3 });
    // A market order's entry is the market's price.
    expect(orderTicketIntent(draft({ type: 'market', side: 'sell', stopLoss: 104, trailing: true }), 100)).toMatchObject({ stopLoss: 104, trailingStop: 4 });
  });

  it('asks for none without a stop, without the switch, or with no distance between them', () => {
    expect(orderTicketIntent(draft({ price: 95, trailing: true }), 100)).not.toHaveProperty('trailingStop');
    expect(orderTicketIntent(draft({ price: 95, stopLoss: 92 }), 100)).not.toHaveProperty('trailingStop');
    expect(orderTicketIntent(draft({ price: 95, stopLoss: 95, trailing: true }), 100)).not.toHaveProperty('trailingStop');
  });

  it('writes the distance to the price\u2019s own decimals, not a float\u2019s tail', () => {
    expect(orderTicketIntent(draft({ price: 0.3, stopLoss: 0.1, trailing: true }), 1).trailingStop).toBe(0.2);
  });
});

describe('WidgetOrderTicket: the trailing switch', () => {
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
  const stopSwitch = () => host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-optional .tcw-toggle')[0];
  const trailSwitch = () => host.querySelector<HTMLButtonElement>('.tcw-ticket-trail .tcw-toggle');

  it('is offered only with a stop-loss, and places an order whose stop trails', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    expect(trailSwitch()).toBeNull();
    stopSwitch().click(); // the stop 1% under the entry: 94.05
    expect(trailSwitch()).not.toBeNull();
    trailSwitch()!.click();
    expect(trailSwitch()!.getAttribute('aria-checked')).toBe('true');
    host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!.click();
    expect(sent).toHaveLength(1);
    expect(sent[0].stopLoss).toBeCloseTo(94.05);
    expect(sent[0].trailingStop).toBeCloseTo(0.95);
  });

  it('goes with the stop-loss when that is switched off, and starts off the next time', () => {
    ticket.open({ price: 95, lastPrice: 100 });
    stopSwitch().click();
    trailSwitch()!.click();
    stopSwitch().click();
    expect(trailSwitch()).toBeNull();
    stopSwitch().click();
    expect(trailSwitch()!.getAttribute('aria-checked')).toBe('false');
  });
});

describe('a ticket’s take-profit in several targets', () => {
  const base = { side: 'buy' as const, type: 'limit' as const, quantity: 3, price: 100, stopLoss: null, takeProfit: 130, timeInForce: 'gtc' as const };

  it('splits the way to the take-profit evenly, a part of the quantity at each target before the last', () => {
    expect(ticketTakeProfitLevels({ ...base, targets: 3 }, 100)).toEqual([{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }]);
    expect(ticketTakeProfitLevels({ ...base, targets: 2 }, 100)).toEqual([{ price: 115, quantity: 1 }]);
    expect(ticketTakeProfitLevels({ ...base, side: 'sell', takeProfit: 70, targets: 3 }, 100)).toEqual([{ price: 90, quantity: 1 }, { price: 80, quantity: 1 }]);
  });

  it('has no levels with one target, no take-profit, or no entry to measure from', () => {
    expect(ticketTakeProfitLevels({ ...base, targets: 1 }, 100)).toEqual([]);
    expect(ticketTakeProfitLevels(base, 100)).toEqual([]);
    expect(ticketTakeProfitLevels({ ...base, takeProfit: null, targets: 3 }, 100)).toEqual([]);
    expect(ticketTakeProfitLevels({ ...base, targets: 3 }, null)).toEqual([]);
  });

  it('takes a part down to the quantity’s own step, or to the lot', () => {
    expect(ticketTakeProfitLevels({ ...base, quantity: 0.5, targets: 2 }, 100)).toEqual([{ price: 115, quantity: 0.2 }]);
    expect(ticketTakeProfitLevels({ ...base, quantity: 500, targets: 3 }, 100, { lot: 100 })).toEqual([{ price: 110, quantity: 100 }, { price: 120, quantity: 100 }]);
  });

  it('has no levels when the quantity is too small to part', () => {
    expect(ticketTakeProfitLevels({ ...base, quantity: 1, targets: 3 }, 100)).toEqual([]);
    expect(ticketTakeProfitLevels({ ...base, quantity: 100, targets: 3 }, 100, { lot: 100 })).toEqual([]);
  });

  it('has no levels while the take-profit is on the wrong side of the entry', () => {
    expect(ticketTakeProfitLevels({ ...base, takeProfit: 90, targets: 3 }, 100)).toEqual([]);
    expect(ticketTakeProfitLevels({ ...base, side: 'sell', takeProfit: 130, targets: 3 }, 100)).toEqual([]);
  });

  it('keeps only the targets that are prices of their own between the entry and the take-profit, as the market rounds them', () => {
    // A coarse step: both would round to the entry.
    expect(ticketTakeProfitLevels({ ...base, takeProfit: 100.2, targets: 3 }, 100, { roundPrice: (p) => Math.round(p * 2) / 2 })).toEqual([]);
    // Two that round to one price are one target.
    expect(ticketTakeProfitLevels({ ...base, takeProfit: 101, targets: 3 }, 100, { roundPrice: (p) => Math.round(p * 2) / 2 })).toEqual([{ price: 100.5, quantity: 1 }]);
  });

  it('takes a number of targets that is none as one', () => {
    expect(ticketTakeProfitLevels({ ...base, targets: Number.NaN }, 100)).toEqual([]);
    expect(ticketTakeProfitLevels({ ...base, targets: 9 }, 100)).toHaveLength(2);
  });

  it('rounds the targets as the market rounds its prices', () => {
    const levels = ticketTakeProfitLevels({ ...base, takeProfit: 110, targets: 3 }, 100, { roundPrice: (p) => Math.round(p * 2) / 2 });
    expect(levels.map((level) => level.price)).toEqual([103.5, 106.5]);
  });

  it('sums the reward as what each part makes where it comes off, and its ratio to the risk', () => {
    const whole = orderTicketSummary({ ...base, stopLoss: 90 }, 105);
    expect(whole.reward).toBe(90);
    expect(whole.ratio).toBe(3);
    // One at 110, one at 120, one at 130: 10 + 20 + 30.
    const parted = orderTicketSummary({ ...base, stopLoss: 90, targets: 3 }, 105);
    expect(parted.reward).toBe(60);
    expect(parted.risk).toBe(-30);
    expect(parted.ratio).toBe(2);
  });

  it('asks for the levels with the order, the take-profit closing what they leave', () => {
    expect(orderTicketIntent({ ...base, targets: 3 }, 105)).toEqual(expect.objectContaining({ takeProfit: 130, takeProfits: [{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }] }));
    expect(orderTicketIntent(base, 105)).not.toHaveProperty('takeProfits');
    // A market order is measured from the price now.
    expect(orderTicketIntent({ ...base, type: 'market', targets: 2 }, 110).takeProfits).toEqual([{ price: 120, quantity: 1 }]);
  });
});
