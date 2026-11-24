// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WidgetAccountPanel, positionPnl, type AccountPanelCallbacks } from '../WidgetAccountPanel.js';
import { EN_TRANSLATOR } from '../i18n.js';

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
  current = {
    positions: [{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, stopLoss: 95 }],
    orders: [{ id: 'o1', side: 'sell', type: 'limit', price: 110, quantity: 1, timeInForce: 'day' }],
    fills: [
      { orderId: 'a', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order' },
      { orderId: 'b', side: 'sell', price: 104, quantity: 1, time: 2, reason: 'close', pnl: 4 },
    ],
    price: 103,
  };
  panel.update(current);
});

let current: Parameters<WidgetAccountPanel['update']>[0];
const snapshotOf = () => current;

afterEach(() => {
  panel.destroy();
  host.remove();
});

const tab = (name: RegExp) => [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((b) => name.test(b.textContent!))!;
const cells = () => [...host.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));

describe('WidgetAccountPanel', () => {
  it('writes the nearest take-profit level and how many more there are, where a position or an order has levels', () => {
    if (!panel.isOpen()) panel.toggle();
    panel.update({
      ...current,
      positions: [{ id: 'p', side: 'buy', entryPrice: 100, quantity: 3, takeProfits: [{ price: 110, quantity: 1 }, { price: 120, quantity: 1 }, { price: 130, quantity: 1 }] }],
      orders: [{ id: 'o', side: 'buy', type: 'limit', price: 90, quantity: 2, takeProfits: [{ price: 105, quantity: 1 }] }],
    });
    expect(cells()[0]).toContain('110.00 +2');
    tab(/Orders/).click();
    expect(cells()[0]).toContain('105.00');
    // The take-profit that closes the rest is a target too: counted after the levels.
    panel.update({ ...current, positions: [{ id: 'p', side: 'buy', entryPrice: 100, quantity: 3, takeProfit: 130, takeProfits: [{ price: 110, quantity: 1 }] }] });
    tab(/Positions/).click();
    expect(cells()[0]).toContain('110.00 +1');
  });

  it('says which orders are of a group where one cancels the others, and when a dated order ends', () => {
    panel.update({ ...current, orders: [
      { id: 'a', side: 'sell', type: 'limit', price: 110, quantity: 1, ocoGroup: 'exit' },
      { id: 'b', side: 'buy', type: 'limit', price: 90, quantity: 1, timeInForce: 'gtd', expireTime: 5 },
      { id: 'c', side: 'buy', type: 'limit', price: 90, quantity: 1, timeInForce: 'gtd' },
      { id: 'd', side: 'buy', type: 'limit', price: 90, quantity: 1, timeInForce: 'gtd', expireTime: Number.NaN },
    ] });
    tab(/Orders/).click();
    expect(cells().map((row) => [row[1], row[6]])).toEqual([['Limit · OCO', '—'], ['Limit', 'GTD · 2026-10-03 10:00'], ['Limit', 'GTD'], ['Limit', 'GTD']]);
    expect(callbacks.formatTime).toHaveBeenCalledWith(5);
  });

  it('names a stop-limit order, and writes its stop before its limit', () => {
    panel.update({ ...current, orders: [
      { id: 'a', side: 'buy', type: 'stopLimit', price: 106, stopPrice: 105, quantity: 1 },
      { id: 'b', side: 'sell', type: 'stop', price: 95, stopPrice: 95, quantity: 1 },
      // Told with no stop of its own: the one price it has.
      { id: 'c', side: 'buy', type: 'stopLimit', price: 106, quantity: 1 },
    ] });
    tab(/Orders/).click();
    expect(cells().map((row) => [row[1], row[3]])).toEqual([['Stop-limit', '105.00 / 106.00'], ['Stop', '95.00'], ['Stop-limit', '106.00']]);
  });

  it('names how long each order works, the kinds past good-till-cancelled and day by the market’s letters', () => {
    panel.update({ ...current, orders: (['gtd', 'ioc', 'fok'] as const).map((timeInForce, i) => ({ id: `t${i}`, side: 'buy' as const, type: 'limit' as const, price: 90, quantity: 1, timeInForce })) });
    tab(/Orders/).click();
    expect(cells().map((row) => row[6])).toEqual(['GTD', 'IOC', 'FOK']);
  });

  it('works out a position’s profit and loss, long or short', () => {
    expect(positionPnl({ id: 'x', side: 'buy', entryPrice: 100, quantity: 2 }, 103)).toEqual({ pnl: 6, pct: 3 });
    expect(positionPnl({ id: 'x', side: 'sell', entryPrice: 100, quantity: 2, closedQuantity: 1 }, 103)).toEqual({ pnl: -3, pct: -3 });
    expect(positionPnl({ id: 'x', side: 'buy', entryPrice: 100, quantity: 1 }, null)).toBeNull();
  });

  it('counts each tab and lists the positions with their P&L', () => {
    panel.openPanel();
    const tabs = [...host.querySelectorAll('[role=tab]')].map((b) => [b.querySelector('.tcw-account-tab-label')!.textContent, b.querySelector('.tcw-account-count')!.textContent]);
    expect(tabs).toEqual([['Positions', '1'], ['Orders', '1'], ['History', '2'], ['Log', '0']]);
    // Its figures stand together, its profit last, its buttons right after it.
    expect(cells()[0].slice(0, 7)).toEqual(['Long', '2', '100.00', '103.00', '95.00', '—', '+6.00 · +3.00%']);
    // A profit is marked as one, for a look that sets it strong: the row's, and after a price moves it.
    const profit = () => host.querySelector('tbody tr')!.querySelectorAll('td')[6].querySelector('span')!;
    expect([...profit().classList]).toEqual(['tcw-account-pnl', 'tcw-account-up']);
    expect(callbacks.onToggle).toHaveBeenCalledWith(true);
  });

  it('sets its figures as numbers, each cell named for a phone’s card', () => {
    panel.openPanel();
    const row = host.querySelector('tbody tr')!;
    const named = [...row.querySelectorAll('td')].map((td) => [td.dataset.label, td.classList.contains('tcw-num')]);
    expect(named).toEqual([
      ['Side', false], ['Qty', true], ['Entry', true], ['Price', true], ['SL', true], ['TP', true], ['P&L', true], ['', false],
    ]);
  });

  it('sums the account up in its head, on every tab: the open P&L and what is realised', () => {
    panel.openPanel();
    const totals = () => [...host.querySelectorAll('.tcw-account-total')].map((el) => el.textContent);
    expect(totals()).toEqual(['Open P&L: +6.00', 'Realised P&L: +4.00']);
    tab(/Orders/).click();
    expect(totals()).toEqual(['Open P&L: +6.00', 'Realised P&L: +4.00']);
    panel.update({ ...snapshotOf(), price: 104 });
    expect(totals()[0]).toBe('Open P&L: +8.00');
  });

  it('writes signed figures left to right in any widget, the totals’ too', () => {
    panel.openPanel();
    expect(host.querySelector<HTMLElement>('tbody td:nth-child(7) span')!.dir).toBe('ltr');
    expect([...host.querySelectorAll<HTMLElement>('.tcw-account-total [dir="ltr"]')].map((el) => el.textContent)).toEqual(['+6.00', '+4.00']);
  });

  it('keeps a loss’s sign in any digits, and none on nothing (Persian figures)', () => {
    const fa = (v: number, d = 2) => v.toLocaleString('fa-IR', { minimumFractionDigits: d, maximumFractionDigits: d });
    panel.destroy();
    panel = new WidgetAccountPanel(host, { ...(callbacks as unknown as AccountPanelCallbacks), formatAmount: (v) => fa(v), formatNumber: (v, d) => fa(v, d) });
    panel.update({ ...snapshotOf(), price: 97 });
    panel.openPanel();
    // Two long from 100 at 97 lose 6: three percent.
    expect(cells()[0][6]).toBe('-۶٫۰۰ · -۳٫۰۰%');
    panel.update({ ...snapshotOf(), price: 100 });
    expect(cells()[0][6]).toBe('۰٫۰۰ · ۰٫۰۰%');
  });

  it('colours a figure by the sign it shows, none on what reads as nothing', () => {
    // Two long from 100 at 100.001 make 0.002: "0.00", neither gain nor loss.
    panel.update({ ...snapshotOf(), price: 100.001 });
    panel.openPanel();
    expect(cells()[0][6]).toBe('0.00 · 0.00%');
    expect(host.querySelector('tbody tr')!.querySelectorAll('td')[6].firstElementChild!.className).toBe('tcw-account-pnl');
    expect(host.querySelector('.tcw-account-total')!.className).toBe('tcw-account-total');
  });

  it('shows the realised P&L only once something is realised', () => {
    panel.update({ positions: [], orders: [], fills: [], price: null, realisedPnl: 0 });
    expect(host.querySelectorAll('.tcw-account-total')).toHaveLength(0);
    panel.update({ positions: [], orders: [], fills: [], price: null, realisedPnl: -2 });
    expect(host.querySelector('.tcw-account-total')!.textContent).toBe('Realised P&L: -2.00');
  });

  it('puts the figure after words that have no place for it', () => {
    panel.destroy();
    const words = (key: string, vars?: Record<string, string | number>) => (key === 'account.openPnl' ? 'Open' : EN_TRANSLATOR(key as never, vars));
    panel = new WidgetAccountPanel(host, callbacks as unknown as AccountPanelCallbacks, words as never);
    panel.update(snapshotOf());
    expect(host.querySelector('.tcw-account-total')!.textContent).toBe('Open +6.00');
  });

  it('names each tab with its count, and keeps a table’s roles for a phone’s cards', () => {
    panel.openPanel();
    expect(tab(/Positions/).getAttribute('aria-label')).toBe('Positions (1)');
    expect(host.querySelector('table')!.getAttribute('role')).toBe('table');
    expect(host.querySelector('thead th')!.getAttribute('role')).toBe('columnheader');
    expect(host.querySelector('tbody tr')!.getAttribute('role')).toBe('row');
    expect(host.querySelector('tbody td')!.getAttribute('role')).toBe('cell');
  });

  it('writes money and percents in the host’s formats', () => {
    panel.destroy();
    panel = new WidgetAccountPanel(host, { ...(callbacks as unknown as AccountPanelCallbacks), formatAmount: (v) => v.toFixed(1), formatNumber: (v, d) => v.toFixed(d).replace('.', ',') });
    panel.update(snapshotOf());
    panel.openPanel();
    expect(cells()[0][6]).toBe('+6.0 · +3,00%');
  });

  it('closes, reverses and cancels from the rows', () => {
    panel.openPanel();
    // Each row's buttons say which position or order they act on.
    host.querySelector<HTMLButtonElement>('[aria-label="Reverse position: Long 2 @ 100.00"]')!.click();
    host.querySelector<HTMLButtonElement>('[aria-label="Close position: Long 2 @ 100.00"]')!.click();
    tab(/Orders/).click();
    host.querySelector<HTMLButtonElement>('[aria-label="Cancel order: Sell 1 @ 110.00"]')!.click();
    expect(callbacks.onReversePosition).toHaveBeenCalledWith('p1');
    expect(callbacks.onClosePosition).toHaveBeenCalledWith('p1');
    expect(callbacks.onCancelOrder).toHaveBeenCalledWith('o1');
  });

  it('lists the fills newest first with the P&L realised', () => {
    panel.openPanel();
    tab(/History/).click();
    expect(cells().map((row) => row[4])).toEqual(['Closed', 'Order']);
    // A fill is a buy or a sell (closing a long sells), not a long or a short.
    expect(cells().map((row) => row[1])).toEqual(['Sell', 'Buy']);
    expect(cells().map((row) => row[5])).toEqual(['+4.00', '—']);
  });

  it('moves between tabs with the arrow keys, and opens a new order', () => {
    panel.openPanel();
    tab(/Positions/).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tab(/Orders/).getAttribute('aria-selected')).toBe('true');
    host.querySelector<HTMLButtonElement>('.tcw-account-new')!.click();
    expect(callbacks.onNewOrder).toHaveBeenCalled();
  });

  it('rewrites only the price and P&L on a tick, keeping the focused button', () => {
    panel.openPanel();
    const close = host.querySelector<HTMLButtonElement>('[aria-label^="Close position"]')!;
    close.focus();
    panel.update({ ...snapshotOf(), price: 104 });
    expect(host.querySelector('[aria-label^="Close position"]')).toBe(close);
    expect(document.activeElement).toBe(close);
    expect([cells()[0][3], cells()[0][6]]).toEqual(['104.00', '+8.00 · +4.00%']);
  });

  it('keeps focus on the same button when the rows change', () => {
    panel.openPanel();
    host.querySelector<HTMLButtonElement>('[aria-label^="Close position"]')!.focus();
    const s = snapshotOf();
    panel.update({ ...s, positions: [{ ...s.positions[0] }] });
    expect((document.activeElement as HTMLElement).getAttribute('aria-label')).toMatch(/^Close position/);
  });

  it('says when there is nothing to show', () => {
    panel.update({ positions: [], orders: [], fills: [], price: null });
    panel.openPanel();
    expect(host.querySelector('.tcw-account-empty')!.textContent).toBe('No open positions');
  });
});

describe('WidgetAccountPanel: an account with money', () => {
  const totals = () => [...host.querySelectorAll('.tcw-account-total')].map((el) => el.textContent);
  const account = { balance: 10_000, equity: 10_006, unrealisedPnl: 6, realisedPnl: 4, marginUsed: 200, freeMargin: 9_806, commission: 0 };

  it('heads the totals with the balance, the equity and the free margin, in no profit’s or loss’s colour', () => {
    panel.update({ ...current, account });
    expect(totals()).toEqual(['Balance: 10000.00', 'Equity: 10006.00', 'Free margin: 9806.00', 'Open P&L: +6.00', 'Realised P&L: +4.00']);
    const balance = host.querySelector('.tcw-account-total')!;
    expect(balance.className).toBe('tcw-account-total tcw-account-sum');
  });

  it('takes the open P&L from the account, which counts a contract’s multiplier, and counts it in each row', () => {
    if (!panel.isOpen()) panel.toggle();
    panel.update({ ...current, account: { ...account, unrealisedPnl: 600 }, multiplier: 100 });
    expect(totals()[3]).toBe('Open P&L: +600.00');
    expect(positionPnl({ id: 'x', side: 'buy', entryPrice: 100, quantity: 2 }, 103, 100)).toEqual({ pnl: 600, pct: 3 });
    expect(cells()[0].some((cell) => cell?.includes('+600.00'))).toBe(true);
  });

  it('follows the account when nothing else changed', () => {
    panel.update({ ...current, account });
    panel.update({ ...current, account: { ...account, equity: 9_990, freeMargin: 9_790 } });
    expect(totals().slice(0, 3)).toEqual(['Balance: 10000.00', 'Equity: 9990.00', 'Free margin: 9790.00']);
  });

  it('writes a debt with its minus, and shows no money once the broker keeps none', () => {
    panel.update({ ...current, account: { ...account, freeMargin: -12.5 } });
    expect(totals()[2]).toBe('Free margin: -12.50');
    panel.update({ ...current, account: null });
    expect(totals()).toEqual(['Open P&L: +6.00', 'Realised P&L: +4.00']);
  });
});

describe('WidgetAccountPanel: the Log tab', () => {
  const log = [
    { time: 1, kind: 'placed' as const, orderId: 'a', side: 'buy' as const, type: 'limit' as const, quantity: 2, price: 95 },
    { time: 2, kind: 'filled' as const, orderId: 'a', side: 'buy' as const, quantity: 2, price: 95, reason: 'order' as const },
    { time: 3, kind: 'rejected' as const, message: 'Not enough free margin' },
  ];

  it('is a tab counting what happened, listing it the newest first', () => {
    if (!panel.isOpen()) panel.toggle();
    panel.update({ ...current, log });
    expect(tab(/Log/).textContent).toContain('3');
    tab(/Log/).click();
    expect(cells()).toEqual([
      ['2026-10-03 10:00', 'Rejected', '—', '—', '—', 'Not enough free margin'],
      ['2026-10-03 10:00', 'Filled', 'Buy', '2', '95.00', 'Order'],
      ['2026-10-03 10:00', 'Order placed', 'Buy', '2', '95.00', '—'],
    ]);
    expect(callbacks.formatTime.mock.calls.map(([time]) => time)).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it('follows the log as it grows, and when a line takes another’s place', () => {
    if (!panel.isOpen()) panel.toggle();
    panel.update({ ...current, log: log.slice(0, 1) });
    tab(/Log/).click();
    expect(cells()).toHaveLength(1);
    panel.update({ ...current, log: log.slice(0, 2) });
    expect(cells()).toHaveLength(2);
    panel.update({ ...current, log: [log[0], { ...log[1], kind: 'cancelled' as const }] });
    expect(cells()[0][1]).toBe('Order cancelled');
  });

  it('says so when nothing has happened, and names every kind of event', () => {
    if (!panel.isOpen()) panel.toggle();
    panel.update({ ...current, log: [] });
    tab(/Log/).click();
    expect(host.textContent).toContain('Nothing has happened yet');
    panel.update({ ...current, log: (['placed', 'moved', 'cancelled', 'filled', 'rejected'] as const).map((kind, i) => ({ time: i, kind })) });
    expect(cells().map((row) => row[1])).toEqual(['Rejected', 'Filled', 'Order cancelled', 'Order moved', 'Order placed']);
  });
});

describe('WidgetAccountPanel: an account against its margin', () => {
  const totals = () => [...host.querySelectorAll('.tcw-account-total')].map((el) => el.textContent);
  const account = { balance: 1000, equity: 750, unrealisedPnl: -250, realisedPnl: 0, marginUsed: 500, freeMargin: 250, commission: 0, marginLevel: 1.5 };

  it('writes the margin level after the free margin while a position holds margin, and not without one', () => {
    panel.update({ ...current, account });
    expect(totals().slice(0, 4)).toEqual(['Balance: 1000.00', 'Equity: 750.00', 'Free margin: 250.00', 'Margin level: 150.0%']);
    const { marginLevel: _level, ...flat } = account;
    panel.update({ ...current, account: flat });
    expect(totals().some((text) => text?.startsWith('Margin level'))).toBe(false);
  });

  it('follows the level when it alone changed, in the host’s figures', () => {
    panel.destroy();
    panel = new WidgetAccountPanel(host, { ...(callbacks as unknown as AccountPanelCallbacks), formatNumber: (value, decimals) => value.toFixed(decimals).replace('.', ',') });
    panel.update({ ...current, account });
    panel.update({ ...current, account: { ...account, marginLevel: 0.874 } });
    expect(totals()[3]).toBe('Margin level: 87,4%');
  });

  it('names a fill that closed a position out', () => {
    panel.openPanel();
    panel.update({ ...current, fills: [...current.fills, { orderId: 'c', side: 'sell', price: 84, quantity: 50, time: 3, reason: 'liquidation', pnl: -800 }] });
    tab(/History/).click();
    expect(cells()[0][4]).toBe('Liquidation');
  });
});

describe('WidgetAccountPanel: an order that fills in parts', () => {
  it('writes how much of it has filled beside its quantity, and a plain quantity where nothing has', () => {
    panel.openPanel();
    panel.update({
      ...current,
      orders: [
        { id: 'a', side: 'buy', type: 'limit', price: 90, quantity: 5, filledQuantity: 2 },
        { id: 'b', side: 'buy', type: 'limit', price: 89, quantity: 3 },
        { id: 'c', side: 'buy', type: 'limit', price: 88, quantity: 0.3, filledQuantity: 0.1 + 0.1 },
      ],
    });
    tab(/Orders/).click();
    expect(cells().map((row) => row[2])).toEqual(['2 / 5', '3', '0.2 / 0.3']);
  });

  it('follows an order as another part of it fills', () => {
    panel.openPanel();
    const order = { id: 'a', side: 'buy' as const, type: 'limit' as const, price: 90, quantity: 5 };
    panel.update({ ...current, orders: [{ ...order, filledQuantity: 2 }] });
    tab(/Orders/).click();
    panel.update({ ...current, orders: [{ ...order, filledQuantity: 4 }] });
    expect(cells()[0][2]).toBe('4 / 5');
  });
});

describe('WidgetAccountPanel: a part-filled order in a row written right to left', () => {
  it('keeps what has filled before the whole: the two are one figure, left to right', () => {
    panel.openPanel();
    panel.update({ ...current, orders: [{ id: 'a', side: 'buy', type: 'limit', price: 90, quantity: 5, filledQuantity: 2 }, { id: 'b', side: 'buy', type: 'limit', price: 89, quantity: 3 }] });
    tab(/Orders/).click();
    const cellsOf = (row: number) => [...host.querySelectorAll('tbody tr')][row].querySelectorAll('td');
    expect(cellsOf(0)[2].querySelector('[dir=ltr]')?.textContent).toBe('2 / 5');
    // A plain quantity is one number: nothing to keep in order.
    expect(cellsOf(1)[2].querySelector('[dir]')).toBeNull();
  });
});

// A long of BTC stood in the panel of a chart showing ETHUSDT, its price and its profit worked out from ETH's.
describe('WidgetAccountPanel: an account of more than the symbol shown', () => {
  const head = () => [...host.querySelectorAll('thead th')].map((th) => th.textContent);
  const totals = () => [...host.querySelectorAll('.tcw-account-total')].map((el) => el.textContent);
  const BTC_LONG = { id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, symbol: 'BINANCE:BTCUSDT' } as const;
  const ETH_SHORT = { id: 'p2', side: 'sell', entryPrice: 50, quantity: 1, symbol: 'ETHUSDT' } as const;

  beforeEach(() => {
    if (!panel.isOpen()) panel.toggle();
  });

  it('names no symbol while everything is of the symbol shown, or of none known', () => {
    panel.update({ ...current, symbol: 'ETHUSDT', positions: [ETH_SHORT, { id: 'p3', side: 'buy', entryPrice: 40, quantity: 1 }] });
    expect(head()[0]).toBe('Side');
  });

  it('takes a row for the chart’s when its symbol is the chart’s under another name: its ticker, or with its venue', () => {
    panel.update({ ...current, symbol: 'BINANCE:ETHUSDT', price: 48, positions: [ETH_SHORT], fills: [] });
    expect(head()[0]).toBe('Side');
    expect([cells()[0][2], cells()[0][3], cells()[0][6]]).toEqual(['50.00', '48.00', '+2.00 · +4.00%']);
  });

  it('names each row’s symbol once a row is of another', () => {
    panel.update({ ...current, symbol: 'ETHUSDT', positions: [BTC_LONG, ETH_SHORT] });
    expect(head().slice(0, 2)).toEqual(['Symbol', 'Side']);
    // The ticker, without the venue before it.
    expect(cells().map((row) => row.slice(0, 2))).toEqual([['BTCUSDT', 'Long'], ['ETHUSDT', 'Short']]);
  });

  it('gives a position of another symbol no price and no profit: the price the chart has is not its own', () => {
    panel.update({ ...current, symbol: 'ETHUSDT', price: 48, positions: [BTC_LONG, ETH_SHORT], fills: [] });
    const [btc, eth] = cells();
    expect([btc[3], btc[4], btc[7]]).toEqual(['100.00', '—', '—']);
    expect([eth[3], eth[4], eth[7]]).toEqual(['50.00', '48.00', '+2.00 · +4.00%']);
    // The total is of what has a price.
    expect(totals()).toEqual(['Open P&L: +2.00']);
  });

  // A broker values a position at its mark, which is not always the chart's last trade: the row
  // read +6.00 at the chart's price under a total of +10.00 from the broker.
  it('values a position of the chart’s own symbol at the adapter’s price for it too, so the row agrees with the account’s total', () => {
    const account = { balance: 1000, equity: 1010, marginUsed: 200, freeMargin: 810, unrealisedPnl: 10 };
    panel.update({ ...current, price: 103, positions: [{ ...current.positions[0], markPrice: 105 }], fills: [], account });
    panel.openPanel();
    expect([cells()[0][3], cells()[0][6]]).toEqual(['105.00', '+10.00 · +5.00%']);
    expect(totals()).toContain('Open P&L: +10.00');
    // A price that is none leaves the chart's.
    for (const bad of [Number.NaN, 0, -1]) {
      panel.update({ ...current, price: 103, positions: [{ ...current.positions[0], markPrice: bad }], fills: [], account });
      expect(cells()[0][3], String(bad)).toBe('103.00');
    }
  });

  it('works its profit out from the adapter’s own price for it, where it gives one', () => {
    panel.update({ ...current, symbol: 'ETHUSDT', price: 48, positions: [{ ...BTC_LONG, markPrice: 104 }, ETH_SHORT], fills: [] });
    expect([cells()[0][3], cells()[0][4], cells()[0][7]]).toEqual(['100.00', '104.00', '+8.00 · +4.00%']);
    expect(totals()).toEqual(['Open P&L: +10.00']);
  });

  it('gives it no part of a contract’s multiplier, which is the chart’s market’s', () => {
    panel.update({ ...current, symbol: 'VN30F1M', price: 48, multiplier: 100_000, positions: [{ ...BTC_LONG, markPrice: 104 }], fills: [] });
    expect(cells()[0][7]).toBe('+8.00 · +4.00%');
  });

  it('keeps each row to its own price as the chart’s price moves', () => {
    const positions = [{ ...BTC_LONG, markPrice: 104 }, ETH_SHORT];
    panel.update({ ...current, symbol: 'ETHUSDT', price: 48, positions, fills: [] });
    panel.update({ ...current, symbol: 'ETHUSDT', price: 47, positions, fills: [] });
    const [btc, eth] = cells();
    expect([btc[4], btc[7]]).toEqual(['104.00', '+8.00 · +4.00%']);
    expect([eth[4], eth[7]]).toEqual(['47.00', '+3.00 · +6.00%']);
  });

  it('names the symbol of an order and of a fill too', () => {
    panel.update({
      ...current,
      symbol: 'ETHUSDT',
      positions: [],
      orders: [{ id: 'o1', side: 'sell', type: 'limit', price: 110, quantity: 1, symbol: 'BTCUSDT' }],
      fills: [{ orderId: 'a', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order', symbol: 'BTCUSDT' }],
    });
    tab(/Orders/).click();
    expect(head()[0]).toBe('Symbol');
    expect(cells()[0][0]).toBe('BTCUSDT');
    tab(/History/).click();
    expect(head()[0]).toBe('Symbol');
    expect(cells()[0][0]).toBe('BTCUSDT');
  });

  it('draws again when the chart shows another symbol: the rows’ prices are others', () => {
    const positions = [BTC_LONG];
    panel.update({ ...current, symbol: 'BINANCE:BTCUSDT', price: 103, positions, fills: [] });
    expect(head()[0]).toBe('Side');
    expect(cells()[0][3]).toBe('103.00');
    panel.update({ ...current, symbol: 'ETHUSDT', price: 48, positions, fills: [] });
    expect(head()[0]).toBe('Symbol');
    expect(cells()[0][4]).toBe('—');
  });

  it('counts a position by its own multiplier, the chart’s or not, and by the chart’s where it has none', () => {
    const own = { ...current.positions[0], multiplier: 1000 };
    // On the chart's symbol, with a market that says another: its own.
    panel.update({ ...current, multiplier: 100_000, positions: [own] });
    expect(cells()[0][6]).toBe('+6000.00 · +3.00%');
    // None of its own: the chart's market's.
    panel.update({ ...current, multiplier: 10, positions: [current.positions[0]] });
    expect(cells()[0][6]).toBe('+60.00 · +3.00%');
  });
});
