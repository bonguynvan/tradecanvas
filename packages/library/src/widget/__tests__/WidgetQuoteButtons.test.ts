// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WidgetQuoteButtons, QUOTE_BUTTON_HEIGHT } from '../WidgetQuoteButtons.js';

let host: HTMLDivElement;
let buttons: WidgetQuoteButtons;
const onTrade = vi.fn();

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  buttons = new WidgetQuoteButtons(host, { onTrade, formatPrice: (p) => p.toFixed(2) });
});

afterEach(() => {
  buttons.destroy();
  host.remove();
  vi.clearAllMocks();
});

const el = () => host.querySelector<HTMLElement>('.tcw-quote-buttons')!;
const sell = () => el().querySelector<HTMLButtonElement>('.tcw-quote-sell')!;
const buy = () => el().querySelector<HTMLButtonElement>('.tcw-quote-buy')!;
const spread = () => el().querySelector<HTMLElement>('.tcw-quote-spread')!;

describe('WidgetQuoteButtons', () => {
  it('is a named group, away until it is shown', () => {
    expect(el().hidden).toBe(true);
    expect(el().getAttribute('role')).toBe('group');
    expect(el().getAttribute('aria-label')).toBe('New order');
    expect(buttons.place(10, 20)).toBe(0);
    buttons.setShown(true);
    expect(el().hidden).toBe(false);
    expect(buttons.isShown()).toBe(true);
  });

  it('quotes the bid on Sell and the ask on Buy, with the spread between them', () => {
    buttons.setShown(true);
    buttons.update({ bid: 99.5, ask: 100.25 });
    expect(sell().textContent).toBe('Sell99.50');
    expect(buy().textContent).toBe('Buy100.25');
    expect(spread().textContent).toBe('0.75');
    expect(spread().hidden).toBe(false);
  });

  it('shows no spread where both are the last price', () => {
    buttons.update({ bid: 100, ask: 100 });
    expect(spread().hidden).toBe(true);
    expect(sell().textContent).toBe('Sell100.00');
  });

  it('is off with no price to trade at', () => {
    buttons.update({ bid: null, ask: Number.NaN });
    expect(sell().disabled).toBe(true);
    expect(buy().disabled).toBe(true);
    expect(sell().textContent).toBe('Sell');
    buttons.update({ bid: 5, ask: 6 });
    expect(sell().disabled).toBe(false);
  });

  it('asks for a trade on the side pressed', () => {
    buttons.update({ bid: 99, ask: 100 });
    sell().click();
    buy().click();
    expect(onTrade.mock.calls).toEqual([['sell'], ['buy']]);
  });

  it('goes where it is put, and says how much room it takes', () => {
    buttons.setShown(true);
    expect(buttons.place(12.4, 40.6)).toBe(QUOTE_BUTTON_HEIGHT + 4);
    expect(el().style.left).toBe('12px');
    expect(el().style.top).toBe('41px');
  });

  it('reads left to right in any widget, as prices do', () => {
    expect(el().dir).toBe('ltr');
  });
});
