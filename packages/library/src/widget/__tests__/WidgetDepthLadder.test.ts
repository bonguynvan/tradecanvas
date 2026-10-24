// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetDepthLadder } from '../WidgetDepthLadder.js';

let host: HTMLDivElement;
let ladder: WidgetDepthLadder;
const onTrade = vi.fn();
const onClose = vi.fn();

const book = {
  asks: [{ price: 101, volume: 3 }, { price: 102, volume: 1500 }],
  bids: [{ price: 99, volume: 2 }, { price: 98, volume: 0.5 }],
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  ladder = new WidgetDepthLadder(host, { onTrade, onClose, formatPrice: (p) => p.toFixed(2) });
  ladder.openPanel();
  ladder.setData(book);
});

afterEach(() => {
  ladder.destroy();
  host.remove();
  vi.clearAllMocks();
});

const prices = () => [...host.querySelectorAll('.tcw-ladder-row .tcw-ladder-figure')].map((el) => el.textContent);

describe('WidgetDepthLadder', () => {
  it('is a panel the dock holds, the asks over the bids, the spread between them', () => {
    expect(host.contains(ladder.element)).toBe(true);
    expect(prices()).toEqual(['102.00', '101.00', '99.00', '98.00']);
    const rows = [...host.querySelectorAll('.tcw-ladder-body > *')];
    expect(rows[2].classList.contains('tcw-ladder-spread')).toBe(true);
    expect(rows[2].textContent).toBe('Spread 2.00');
  });

  it('sells at a bid and buys at an ask, saying which on each', () => {
    const bid = host.querySelector<HTMLButtonElement>('.tcw-ladder-bid:not(:disabled)')!;
    const ask = host.querySelector<HTMLButtonElement>('.tcw-ladder-ask:not(:disabled)')!;
    // The size it shows first, then what a press does.
    expect(bid.getAttribute('aria-label')).toBe('2, Sell @ 99.00');
    bid.click();
    ask.click();
    expect(onTrade.mock.calls).toEqual([['sell', 99], ['buy', 102]]);
  });

  it('writes sizes short and in the mono figures: thousands as k', () => {
    const sizes = [...host.querySelectorAll('.tcw-ladder-cell:not(:disabled)')].map((el) => el.textContent);
    expect(sizes).toEqual(['1.5k', '3', '2', '0.5']);
  });

  it('marks the rows where orders of yours wait, with their quantity and side', () => {
    ladder.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 99, quantity: 2 }, { id: 'o2', side: 'sell', type: 'limit', price: 150, quantity: 1 }]);
    const marks = [...host.querySelectorAll<HTMLElement>('.tcw-ladder-own')];
    expect(marks.map((m) => [m.closest('.tcw-ladder-row')!.querySelector('.tcw-ladder-figure')!.textContent, m.textContent, m.dataset.side])).toEqual([['99.00', '2', 'buy']]);
    // Its side in words, and a buy before the price, a sell after it: not by colour alone.
    expect(marks[0].getAttribute('aria-label')).toBe('Buy 2');
    expect(marks[0].nextElementSibling?.classList.contains('tcw-ladder-figure')).toBe(true);
  });

  it('does no work while shut, and keeps its buttons when only the sizes change', () => {
    const ask = host.querySelector<HTMLButtonElement>('.tcw-ladder-ask:not(:disabled)')!;
    ladder.setData({ asks: [{ price: 101, volume: 9 }, { price: 102, volume: 1500 }], bids: book.bids });
    expect(host.querySelector('.tcw-ladder-ask:not(:disabled)')).toBe(ask);
    expect([...host.querySelectorAll('.tcw-ladder-ask:not(:disabled)')].map((el) => el.textContent)).toEqual(['1.5k', '9']);
    ladder.close();
    ladder.setData({ asks: [{ price: 201, volume: 1 }], bids: [{ price: 199, volume: 1 }] });
    expect(prices()).toEqual(['102.00', '101.00', '99.00', '98.00']);
    ladder.openPanel();
    expect(prices()).toEqual(['201.00', '199.00']);
  });

  it('scrolls only its own page to the spread, never the page around the widget', () => {
    const scrolled = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrolled;
    ladder.close();
    ladder.openPanel();
    HTMLElement.prototype.scrollIntoView = original;
    expect(scrolled).not.toHaveBeenCalled();
  });

  it('moves the spread when a price changes side, the prices the same', () => {
    // 101 was an ask; now it is the best bid.
    ladder.setData({ asks: [{ price: 102, volume: 1 }], bids: [{ price: 101, volume: 1 }, { price: 99, volume: 2 }, { price: 98, volume: 1 }] });
    let rows = [...host.querySelectorAll('.tcw-ladder-body > *')];
    expect(rows.findIndex((el) => el.classList.contains('tcw-ladder-spread'))).toBe(1);
    expect(rows[1].textContent).toBe('Spread 1.00');
    // One side only: no spread.
    ladder.setData({ asks: [], bids: [{ price: 102, volume: 1 }, { price: 101, volume: 1 }, { price: 99, volume: 2 }, { price: 98, volume: 1 }] });
    rows = [...host.querySelectorAll('.tcw-ladder-body > *')];
    expect(rows.some((el) => el.classList.contains('tcw-ladder-spread'))).toBe(false);
    expect(rows).toHaveLength(4);
  });

  it('marks an order only at its own price, however far apart the rows', () => {
    // Halfway between two rows is neither.
    ladder.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 101.5, quantity: 3 }]);
    expect(host.querySelectorAll('.tcw-ladder-own')).toHaveLength(0);
    // A top-of-book feed: two rows five apart, a tick of a cent.
    ladder.destroy();
    ladder = new WidgetDepthLadder(host, { onTrade, onClose, formatPrice: (p) => p.toFixed(2), priceStep: () => 0.01 });
    ladder.openPanel();
    ladder.setData({ asks: [{ price: 105, volume: 1 }], bids: [{ price: 100, volume: 1 }] });
    ladder.setOrders([
      { id: 'o1', side: 'buy', type: 'limit', price: 102, quantity: 1 },
      { id: 'o2', side: 'buy', type: 'limit', price: 100, quantity: 2 },
    ]);
    expect([...host.querySelectorAll('.tcw-ladder-own')].map((m) => m.textContent)).toEqual(['2']);
  });

  it('writes its prices again when the chart writes them otherwise', () => {
    let decimals = 2;
    ladder.destroy();
    ladder = new WidgetDepthLadder(host, { onTrade, onClose, formatPrice: (p) => p.toFixed(decimals) });
    ladder.openPanel();
    ladder.setData(book);
    decimals = 1;
    ladder.setData(book);
    expect(prices()).toEqual(['102.0', '101.0', '99.0', '98.0']);
  });

  it('brings the spread into view once it has a height to do it in', () => {
    let height = 0;
    const scrolled = vi.fn();
    Object.defineProperty(ladder.element, 'clientHeight', { configurable: true, get: () => height });
    Object.defineProperty(ladder.element, 'scrollTop', { configurable: true, get: () => 0, set: scrolled });
    ladder.close();
    ladder.openPanel();
    expect(scrolled).not.toHaveBeenCalled();
    height = 200;
    ladder.setData(book);
    expect(scrolled).toHaveBeenCalledTimes(1);
    // Once: what the user scrolls to then stays.
    ladder.setData(book);
    expect(scrolled).toHaveBeenCalledTimes(1);
  });

  it('tells rows apart however small the tick', () => {
    ladder.setData({ asks: [{ price: 3e-10, volume: 1 }, { price: 2e-10, volume: 1 }], bids: [{ price: 1e-10, volume: 1 }, { price: 0, volume: 1 }] });
    ladder.setOrders([{ id: 'o1', side: 'buy', type: 'limit', price: 1e-10, quantity: 5 }]);
    expect(host.querySelectorAll('.tcw-ladder-own')).toHaveLength(1);
    const rows = [...host.querySelectorAll('.tcw-ladder-body > *')];
    expect(rows.findIndex((el) => el.classList.contains('tcw-ladder-spread'))).toBe(2);
  });

  it('closes by its own ×, through the dock', () => {
    host.querySelector<HTMLButtonElement>('.tcw-ladder-close')!.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('says when there is no book', () => {
    ladder.setData(null);
    expect(host.querySelector('.tcw-ladder-empty')?.textContent).toBe('No order-book data');
  });
});
