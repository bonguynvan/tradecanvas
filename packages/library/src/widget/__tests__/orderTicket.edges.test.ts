// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { OrderPlaceIntent } from '@tradecanvas/commons';
import { WidgetOrderTicket, type OrderTicketCallbacks } from '../WidgetOrderTicket.js';
import { segmentedControl, stepValue } from '../settingsControls.js';

describe('stepValue', () => {
  it('moves to the next price on the step’s grid, a value between steps to the nearest that way', () => {
    expect(stepValue(95, 1, 0.03125)).toBe(95.03125);
    expect(stepValue(100, 1, 0.125)).toBe(100.125);
    expect(stepValue(100, 1, 12.5)).toBe(112.5);
    expect(stepValue(25.37, 1, 0.05)).toBe(25.4);
    expect(stepValue(25.37, -1, 0.05)).toBe(25.35);
    expect(stepValue(0.5, 1, 0.1)).toBe(0.6);
    expect(stepValue(0.0000015, 1, 1.5e-7)).toBe(0.00000165);
  });

  it('stops at the smallest step above nothing', () => {
    expect(stepValue(0.05, -1, 0.05)).toBe(0.05);
    expect(stepValue(40, -1, 100)).toBe(40);
  });
});

describe('segmentedControl', () => {
  const make = (value = 'a') => segmentedControl([{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }], value, () => {}, 'Pick');
  const key = (el: Element, init: KeyboardEventInit) => el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  const checked = (group: HTMLElement) => group.querySelector<HTMLElement>('[aria-checked="true"]')?.dataset.value;

  it('runs the arrows the way the choices read: right to left in a right-to-left widget', () => {
    const wrap = document.createElement('div');
    wrap.dir = 'rtl';
    const group = make();
    wrap.appendChild(group);
    document.body.appendChild(wrap);
    key(group.children[0], { key: 'ArrowLeft' });
    expect(checked(group)).toBe('b');
    wrap.remove();
  });

  it('leaves Alt and the arrows to the browser, and Home and End to the ends', () => {
    const group = make('b');
    document.body.appendChild(group);
    key(group.children[1], { key: 'ArrowRight', altKey: true });
    expect(checked(group)).toBe('b');
    key(group.children[1], { key: 'End' });
    expect(checked(group)).toBe('c');
    key(group.children[2], { key: 'ArrowRight' });
    expect(checked(group)).toBe('a');
    group.remove();
  });

  it('keeps a Tab stop when none of its choices is the value', () => {
    const group = make('nope');
    expect([...group.children].map((b) => (b as HTMLElement).tabIndex)).toEqual([0, -1, -1]);
  });
});

describe('WidgetOrderTicket at the edges', () => {
  let host: HTMLDivElement;
  let ticket: WidgetOrderTicket;
  let sent: OrderPlaceIntent[];

  const build = (more: Partial<OrderTicketCallbacks> = {}) => {
    ticket?.destroy();
    ticket = new WidgetOrderTicket(host, { onSubmit: (i) => sent.push(i), formatPrice: (p) => p.toFixed(2), ...more });
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    sent = [];
    build();
  });

  afterEach(() => {
    ticket.destroy();
    host.remove();
  });

  const input = (name: string) => host.querySelector<HTMLInputElement>(`input[data-ticket-field="${name}"]`)!;
  const type = (name: string, value: string) => {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input'));
  };
  const press = (field: string) => host.querySelector<HTMLButtonElement>(`[data-ticket-field="${field}"]`)!.click();
  const checkedType = () => host.querySelector<HTMLElement>('[data-ticket-field="type"] [aria-checked="true"]')?.dataset.value;
  const summary = () => Object.fromEntries([...host.querySelectorAll<HTMLElement>('.tcw-ticket-summary-row')].map((row) => [row.dataset.row, row.querySelector('.tcw-ticket-figure')!.textContent]));
  const toggle = (which: 'stopLoss' | 'takeProfit') => press(`${which}-switch`);

  it('steps a quantity by its own last digit, and keeps it on that grid', () => {
    ticket.open({ lastPrice: 100 });
    type('quantity', '0.5');
    press('quantity-up');
    expect(input('quantity').value).toBe('0.6');
    type('quantity', '1.5');
    press('quantity-down');
    expect(input('quantity').value).toBe('1.4');
  });

  it('steps a fraction of a point exactly, and up to the next whole lot', () => {
    ticket.open({ price: 95, lastPrice: 100, step: () => 0.03125, rules: { lot: 100 } });
    press('price-up');
    expect(input('price').value).toBe('95.03125');
    type('quantity', '40');
    press('quantity-up');
    expect(input('quantity').value).toBe('100');
  });

  it('steps down across a band’s edge by the band below', () => {
    ticket.open({ price: 10, lastPrice: 12, step: (p) => (p < 10 ? 0.01 : 0.05) });
    press('price-down');
    expect(input('price').value).toBe('9.99');
  });

  it('keeps what was typed through a rebuild, and places what it shows', () => {
    ticket.open({ price: 95, lastPrice: 100, step: () => 0.01 });
    type('price', '95.123');
    host.querySelector<HTMLButtonElement>('.tcw-ticket-sell')!.click();
    expect(input('price').value).toBe('95.123');
    host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!.click();
    expect(sent[0]).toMatchObject({ price: 95.123 });
  });

  it('starts a stop and a target from the price now, rounded as the chart rounds', () => {
    ticket.open({ price: 95, lastPrice: 100, round: (p) => Math.round(p) });
    type('price', '80');
    toggle('stopLoss');
    toggle('takeProfit');
    // 1% under and 2% over 80, to whole prices.
    expect(input('stopLoss').value).toBe('79');
    expect(input('takeProfit').value).toBe('82');
  });

  it('keeps the type on a press of the side already chosen, and with no price', () => {
    ticket.open({ price: 105, lastPrice: 100 });
    press('type-limit');
    expect(checkedType()).toBe('limit');
    host.querySelector<HTMLButtonElement>('.tcw-ticket-buy')!.click();
    expect(checkedType()).toBe('limit');
    type('price', '');
    host.querySelector<HTMLButtonElement>('.tcw-ticket-sell')!.click();
    expect(checkedType()).toBe('limit');
  });

  it('sums up no risk for a stop on the wrong side, and counts a contract’s multiplier', () => {
    ticket.open({ lastPrice: 100, rules: { multiplier: 1000 } });
    toggle('stopLoss');
    type('stopLoss', '105');
    expect(summary()).toEqual({ value: '100000.00' });
    type('stopLoss', '99');
    expect(summary()).toEqual({ value: '100000.00', risk: '-1000.00' });
  });

  it('keeps its live region in place, and names its sides', () => {
    ticket.open({ lastPrice: 100 });
    const live = host.querySelector<HTMLElement>('.tcw-ticket-problems')!;
    expect(live.hidden).toBe(false);
    expect(live.textContent).toBe('');
    type('quantity', '0');
    expect(host.querySelector('.tcw-ticket-problems')).toBe(live);
    expect(live.textContent).toMatch(/quantity/i);
    expect(host.querySelector('.tcw-ticket-side')!.getAttribute('aria-label')).toBe('Buy / Sell');
  });

  it('steps with the arrow keys in a field as with − and +', () => {
    ticket.open({ price: 95, lastPrice: 100, step: () => 0.5 });
    input('price').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(input('price').value).toBe('95.5');
  });

  it('starts an empty price from the market', () => {
    ticket.open({ price: 95, lastPrice: 100, step: () => 1 });
    type('price', '');
    press('price-up');
    expect(input('price').value).toBe('101');
  });

  it('colours a risk by the sign it shows, none on what reads as nothing', () => {
    ticket.open({ lastPrice: 100 });
    type('quantity', '1');
    toggle('stopLoss');
    type('stopLoss', '99.999');
    const risk = host.querySelector<HTMLElement>('.tcw-ticket-summary-row[data-row="risk"] .tcw-ticket-figure')!;
    expect(risk.textContent).toBe('0.00');
    expect(risk.className).toBe('tcw-ticket-figure');
  });

  it('keeps a loss’s sign in any digits (Persian figures)', () => {
    const fa = (v: number, d = 2) => v.toLocaleString('fa-IR', { minimumFractionDigits: d, maximumFractionDigits: d });
    build({ formatAmount: (v) => fa(v), formatNumber: (v, d) => fa(v, d) });
    ticket.open({ lastPrice: 100 });
    toggle('stopLoss');
    expect(host.querySelector('.tcw-ticket-away')!.textContent).toBe('-۱٫۰۰% · -۱٫۰۰');
  });

  it('writes figures in the host’s number format, and nothing with no sign', () => {
    build({ formatNumber: (v, d) => v.toFixed(d).replace('.', ',') });
    ticket.open({ lastPrice: 100 });
    toggle('stopLoss');
    expect(host.querySelector('.tcw-ticket-away')!.textContent).toBe('-1,00% · -1.00');
    type('stopLoss', '99.9999');
    expect(host.querySelector('.tcw-ticket-away')!.textContent).toBe('0,00% · 0.00');
  });
});
