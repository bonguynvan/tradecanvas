// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions, OrderPlaceIntent } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: anything not written here is a no-op; tests send its events. */
class FakeChart {
  static last: FakeChart;
  private listeners = new Map<string, ((e: { payload: unknown }) => void)[]>();
  constructor(_host: HTMLElement, public options: ChartOptions) {
    FakeChart.last = this;
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }
  on(event: string, cb: (e: { payload: unknown }) => void): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  emit(event: string, payload: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb({ payload });
  }
  /** The orders asked for, each as it was sent: with the id the chart gives it. */
  placed: OrderPlaceIntent[] = [];
  placeOrderIntent(intent: OrderPlaceIntent): OrderPlaceIntent {
    const sent = { ...intent, clientOrderId: `c${this.placed.length + 1}` };
    this.placed.push(sent);
    return sent;
  }
  market: { volumeUnit?: number } | null = null;
  quote: { bid?: number; ask?: number } | null = null;
  replay = false;
  broker: object | null = null;
  getMarket(): { volumeUnit?: number } | null { return this.market; }
  getBidAsk(): { bid?: number; ask?: number } | null { return this.quote; }
  isReplayActive(): boolean { return this.replay; }
  getExecutionAdapter(): object | null { return this.broker; }
  getData(): unknown[] { return [{ time: 1, open: 100, high: 100, low: 100, close: 100, volume: 1 }]; }
  getPriceLimits(): null { return null; }
  roundPrice(price: number): number { return price; }
  getPriceStep(): number { return 0.01; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  /** What the widget asks the chart to ask before a bracket or a draft is sent. */
  gate: (() => boolean) | null = null;
  setOrderGate(gate: (() => boolean) | null): void { this.gate = gate; }
  /** What the widget asks the chart to ask before a button on the chart closes or reverses a position. */
  guard: ((action: string, id: string, send: () => void) => void) | null = null;
  setPositionGuard(guard: (action: string, id: string, send: () => void) => void): void { this.guard = guard; }
  /** The symbols said for bars set by hand, and how often the fills were forgotten. */
  said: string[] = [];
  cleared = 0;
  setSymbol(symbol: string): void { this.said.push(symbol); }
  getSymbol(): string { return this.said.at(-1) ?? ''; }
  clearFills(): void { this.cleared += 1; }
  getPositions: () => unknown[] = () => [];
  getFills(): unknown[] { return []; }
  getRequiredSymbols(): string[] { return []; }
  getTradingTime(): number { return Date.UTC(2026, 10, 23); }
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  vi.useRealTimers();
});

type Trading = {
  trading: {
    placeOrderAt(kind: string, price: number): void;
    placeLadderOrder(side: 'buy' | 'sell', price: number): void;
    setFeed(health: 'live' | 'quiet' | 'down'): void;
    openOrderTicket(price?: number, start?: { side?: 'buy' | 'sell' }): void;
  };
};
const trading = () => (widget as unknown as Trading).trading;
const toasts = () => [...host.querySelectorAll<HTMLElement>('.tcw-toast')].map((t) => t.textContent?.trim());
const ticket = () => host.querySelector<HTMLElement>('.tcw-order-ticket')?.closest<HTMLElement>('.tcw-modal-backdrop') ?? null;
const ticketOpen = () => ticket() !== null && !ticket()!.hidden;
const place = () => host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!;
const market = () => host.querySelector('.tcw-ticket-market')?.textContent ?? '';
const problems = () => host.querySelector('.tcw-ticket-problems')?.textContent ?? '';

// A right-click "Buy limit" went out for one share on a market that trades in hundreds.
describe('ChartWidget: the quantity of an order asked for in one press', () => {
  it('is the market’s lot, from the chart’s menu and from the depth ladder', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, confirmOrders: false });
    FakeChart.last.market = { volumeUnit: 100 };
    trading().placeOrderAt('buyLimit', 95);
    trading().placeOrderAt('sellStop', 90);
    trading().placeLadderOrder('sell', 105);
    expect(FakeChart.last.placed.map((order) => [order.side, order.type, order.quantity])).toEqual([
      ['buy', 'limit', 100], ['sell', 'stop', 100], ['sell', 'limit', 100],
    ]);
  });

  it('is one on a market with no lot', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().placeOrderAt('buyLimit', 95);
    trading().placeLadderOrder('buy', 94);
    expect(FakeChart.last.placed.map((order) => order.quantity)).toEqual([1, 1]);
  });
});

describe('ChartWidget: the price the order ticket trades at', () => {
  it('is the ask for a Buy and the bid for a Sell where the feed gives both, and follows them', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.quote = { bid: 99.5, ask: 100.5 };
    trading().openOrderTicket();
    expect(market()).toContain('100.50');
    FakeChart.last.quote = { bid: 100.5, ask: 101.5 };
    FakeChart.last.emit('bidAskChange', {});
    return new Promise<void>((resolve) => requestAnimationFrame(() => {
      expect(market()).toContain('101.50');
      resolve();
    }));
  });

  it('is the last price with one side only, and on a replay', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.quote = { bid: 99.5 };
    trading().openOrderTicket(undefined, { side: 'sell' });
    expect(market()).toContain('100.00');
    host.querySelector<HTMLButtonElement>('.tcw-order-ticket .tcw-modal-close')!.click();
    FakeChart.last.quote = { bid: 99.5, ask: 100.5 };
    FakeChart.last.replay = true;
    trading().openOrderTicket();
    expect(market()).toContain('100.00');
  });
});

describe('ChartWidget: an order from the ticket, with a broker connected', () => {
  beforeEach(() => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.broker = {};
    trading().openOrderTicket();
  });

  it('keeps the ticket open until the broker took the order, and says it is sent only then', () => {
    place().click();
    expect(ticketOpen()).toBe(true);
    expect(place().disabled).toBe(true);
    // Not yet: the ticket itself says the order is on its way, and it may still be refused.
    expect(toasts()).toEqual([]);
    place().click();
    expect(FakeChart.last.placed).toHaveLength(1);
    FakeChart.last.emit('orderPlaced', { intent: FakeChart.last.placed[0], order: { id: 'o1' } });
    expect(ticketOpen()).toBe(false);
    expect(toasts()).toEqual(['Order sent: Buy 1 @ 100.00']);
  });

  it('leaves what was said of the order since it was sent: a fill is said, not that it was sent', () => {
    place().click();
    // The account filled a part and dropped the rest as it took the order.
    FakeChart.last.emit('executionFill', { orderId: 'o1', side: 'buy', price: 100, quantity: 0.4, time: 1, reason: 'order', dropped: 0.6 });
    FakeChart.last.emit('orderPlaced', { intent: FakeChart.last.placed[0], order: { id: 'o1' } });
    expect(toasts()).toEqual(['Filled 0.4 of 1: the rest was cancelled']);
  });

  it('says a refusal in the ticket, which stays with what was typed, and not as a note that goes', () => {
    place().click();
    FakeChart.last.emit('executionError', { message: 'Execution command failed: orderPlace', cause: new Error('Not enough margin'), command: 'orderPlace', clientOrderId: 'c1' });
    expect(ticketOpen()).toBe(true);
    expect(problems()).toContain('Not enough margin');
    // No note at all: not that it was refused, and not that it was sent.
    expect(toasts()).toEqual([]);
    expect(place().disabled).toBe(false);
  });
});

describe('ChartWidget: an order with nothing to wait for', () => {
  it('shuts the ticket as it places and says it is sent, with no broker connected', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().openOrderTicket();
    place().click();
    expect(FakeChart.last.placed).toHaveLength(1);
    expect(ticketOpen()).toBe(false);
    expect(toasts()).toEqual(['Order sent: Buy 1 @ 100.00']);
  });

  it('says the refusal of an order asked for in one press as a note, which stays long enough to be read', () => {
    vi.useFakeTimers();
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.broker = {};
    trading().placeOrderAt('buyLimit', 95);
    FakeChart.last.emit('executionError', { message: 'Execution command failed: orderPlace', cause: new Error('Market closed'), command: 'orderPlace', clientOrderId: 'c1' });
    expect(toasts()).toEqual(['The broker refused the order: Market closed']);
    // A note of what was done goes after three and a half seconds; this one was still to be read.
    vi.advanceTimersByTime(6000);
    expect(toasts()).toEqual(['The broker refused the order: Market closed']);
    vi.advanceTimersByTime(4000);
    expect(toasts()).toEqual([]);
  });
});

// A sell of BTC at 110 was marked on the row at 110 of ETH's book.
describe('ChartWidget: the depth ladder marks the orders of the symbol whose book it shows', () => {
  const BTC_SELL = { id: 'o1', side: 'sell', type: 'limit', price: 110, quantity: 1, symbol: 'BTCUSDT' };
  const ETH_BUY = { id: 'o2', side: 'buy', type: 'limit', price: 95, quantity: 2, symbol: 'ETHUSDT' };
  const UNNAMED = { id: 'o3', side: 'buy', type: 'limit', price: 94, quantity: 1 };

  it('gives it only those, and again when the chart shows another symbol', () => {
    widget = new ChartWidget(host, { symbol: 'ETHUSDT', trading: true, depthLadder: true, confirmOrders: false });
    const chart = FakeChart.last as FakeChart & { getSymbol(): string };
    let shown = 'ETHUSDT';
    chart.getSymbol = () => shown;
    chart.getOrders = () => [BTC_SELL, ETH_BUY, UNNAMED];
    const ladder = (widget as unknown as { trading: { depthLadder: { setOrders(orders: unknown[]): void } } }).trading.depthLadder;
    const given = vi.spyOn(ladder, 'setOrders');
    chart.emit('ordersChange', {});
    expect(given).toHaveBeenLastCalledWith([ETH_BUY, UNNAMED]);
    shown = 'BTCUSDT';
    chart.emit('symbolChange', { symbol: 'BTCUSDT', previous: 'ETHUSDT' });
    expect(given).toHaveBeenLastCalledWith([BTC_SELL, UNNAMED]);
  });
});

// With the host's own bars no stream told the chart its symbol: it drew every symbol's positions on each.
describe('ChartWidget: the bars are the host’s', () => {
  it('tells the chart which symbol they are of, as it starts and as another is picked', async () => {
    widget = new ChartWidget(host, { symbol: 'BTCUSDT', trading: true, confirmOrders: false });
    expect(FakeChart.last.said).toEqual(['BTCUSDT']);
    await widget.setSymbol('ETHUSDT');
    expect(FakeChart.last.said).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('says none for the symbol it falls back on: the bars may not be its', () => {
    widget = new ChartWidget(host, { trading: true, confirmOrders: false });
    expect(FakeChart.last.said).toEqual([]);
  });

  it('forgets the fills that came while the chart knew no symbol, as the first is picked: they name none, and would be marked on every one', async () => {
    widget = new ChartWidget(host, { trading: true, confirmOrders: false });
    await widget.setSymbol('ETHUSDT');
    expect(FakeChart.last.cleared).toBe(1);
    expect(FakeChart.last.said).toEqual(['ETHUSDT']);
    await widget.setSymbol('BTCUSDT');
    expect(FakeChart.last.cleared).toBe(1);
  });

  it('keeps the account’s fills when another symbol is picked: the chart marks those of the one it shows', async () => {
    widget = new ChartWidget(host, { symbol: 'BTCUSDT', trading: true, confirmOrders: false });
    await widget.setSymbol('ETHUSDT');
    expect(FakeChart.last.cleared).toBe(0);
  });
});

// The feed had failed, or told nothing for two minutes under "Live", and orders went out at the price left standing.
describe('ChartWidget: a price that is no longer live', () => {
  type Feed = { adapter: object | null; state: { connectionState: string }; checkFeed(): void };
  const status = () => host.querySelector('.tcw-status-indicator')?.textContent ?? '';

  it('holds back an order asked for in one press while the feed is down, and says why', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().setFeed('down');
    trading().placeOrderAt('buyLimit', 95);
    trading().placeLadderOrder('sell', 105);
    expect(FakeChart.last.placed).toEqual([]);
    expect(toasts().at(-1)).toContain('No live price');
    trading().setFeed('live');
    trading().placeOrderAt('buyLimit', 95);
    expect(FakeChart.last.placed).toHaveLength(1);
  });

  it('lets one through on a feed that is only quiet: its price is the trader’s own, and a market after hours is quiet', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().setFeed('quiet');
    trading().placeOrderAt('buyLimit', 95);
    expect(FakeChart.last.placed).toHaveLength(1);
  });

  it('asks the chart to hold back a bracket or a draft confirmed while the feed is down', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    const gate = FakeChart.last.gate!;
    expect(gate()).toBe(true);
    trading().setFeed('quiet');
    expect(gate()).toBe(true);
    trading().setFeed('down');
    expect(gate()).toBe(false);
  });

  it.each(['quiet', 'down'] as const)('sends no market order from the ticket on a %s feed, and says so', (health) => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().openOrderTicket();
    expect(place().disabled).toBe(false);
    trading().setFeed(health);
    expect(place().disabled).toBe(true);
    expect(problems()).toContain('a market order cannot be sent');
    trading().setFeed('live');
    expect(place().disabled).toBe(false);
    expect(problems()).toBe('');
  });

  it('opens the ticket knowing the price is not live', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().setFeed('quiet');
    trading().openOrderTicket();
    expect(place().disabled).toBe(true);
  });

  it('follows the feed: quiet when it tells nothing, down when it is not connected, and says so in place of Live', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 10, 23, 10));
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    const feed = widget as unknown as Feed;
    const chart = FakeChart.last as FakeChart & { getFeedTime(): number | null };
    feed.adapter = {};
    feed.state = { ...feed.state, connectionState: 'connected' };
    const told = Date.now();
    chart.getFeedTime = () => told;
    feed.checkFeed();
    trading().openOrderTicket();
    expect(place().disabled).toBe(false);
    // Two minutes on, and not a word from it.
    vi.setSystemTime(told + 120_000);
    feed.checkFeed();
    expect(status()).toContain('No price updates');
    expect(place().disabled).toBe(true);
    // In a replay the prices are the replay's own.
    FakeChart.last.replay = true;
    feed.checkFeed();
    expect(place().disabled).toBe(false);
    FakeChart.last.replay = false;
    // It tells again.
    chart.getFeedTime = () => Date.now();
    feed.checkFeed();
    expect(place().disabled).toBe(false);
    feed.state = { ...feed.state, connectionState: 'error' };
    feed.checkFeed();
    trading().placeOrderAt('buyLimit', 95);
    expect(FakeChart.last.placed).toEqual([]);
  });

  it('judges no feed where the bars are the host’s own', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    (widget as unknown as Feed).checkFeed();
    trading().placeOrderAt('buyLimit', 95);
    expect(FakeChart.last.placed).toHaveLength(1);
  });
});

// A right-click "Buy limit", a ladder cell and the panel's Close each traded in one press, with nothing asked.
describe('ChartWidget: a trade that one press would make is confirmed first', () => {
  const dialog = () => host.querySelector<HTMLElement>('.tcw-confirm')?.closest<HTMLElement>('.tcw-modal-backdrop') ?? null;
  const asked = () => dialog() !== null && !dialog()!.hidden;
  const words = () => host.querySelector('.tcw-confirm-text')?.textContent ?? '';
  const yes = () => host.querySelector<HTMLButtonElement>('.tcw-confirm .tcw-done-btn')!;
  const no = () => host.querySelector<HTMLButtonElement>('.tcw-confirm .tcw-footer-cancel')!;
  type Closes = { trading: { closePosition(id: string): void; reversePosition(id: string): void } };

  it('asks before an order from the menu or the ladder, saying it in full, and places it once on a yes', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true });
    FakeChart.last.market = { volumeUnit: 100 };
    trading().placeOrderAt('buyLimit', 95);
    expect(FakeChart.last.placed).toEqual([]);
    expect(asked()).toBe(true);
    expect(words()).toBe('Buy limit @ 95.00, quantity 100, VNM');
    expect(document.activeElement).toBe(yes());
    yes().click();
    yes().click();
    expect(asked()).toBe(false);
    expect(FakeChart.last.placed.map((o) => [o.side, o.type, o.price, o.quantity])).toEqual([['buy', 'limit', 95, 100]]);
    trading().placeLadderOrder('sell', 105);
    expect(words()).toBe('Sell limit @ 105.00, quantity 100, VNM');
  });

  it('places nothing on a no, on Escape, or when another is asked for in its place', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().placeOrderAt('buyLimit', 95);
    no().click();
    expect(asked()).toBe(false);
    trading().placeOrderAt('sellStop', 90);
    host.querySelector('.tcw-confirm')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(asked()).toBe(false);
    trading().placeOrderAt('buyLimit', 95);
    trading().placeOrderAt('buyLimit', 96);
    yes().click();
    expect(FakeChart.last.placed.map((o) => o.price)).toEqual([96]);
  });

  it('asks before a position is closed or reversed, naming its side, what is open of it and its symbol', () => {
    widget = new ChartWidget(host, { symbol: 'ETHUSDT', trading: true });
    const chart = FakeChart.last as FakeChart & { closePositionIntent(id: string): void; reversePositionIntent(id: string): void };
    const closed: string[] = [];
    const reversed: string[] = [];
    chart.closePositionIntent = (id) => { closed.push(id); };
    chart.reversePositionIntent = (id) => { reversed.push(id); };
    chart.getPositions = () => [{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 3, closedQuantity: 1, symbol: 'BINANCE:BTCUSDT' }];
    const closes = (widget as unknown as Closes).trading;
    closes.closePosition('p1');
    expect(closed).toEqual([]);
    expect(words()).toBe('Close Long 2 BTCUSDT at the market?');
    yes().click();
    expect(closed).toEqual(['p1']);
    closes.reversePosition('p1');
    expect(words()).toContain('Reverse Long 2 BTCUSDT at the market?');
    no().click();
    expect(reversed).toEqual([]);
  });

  it('confirms a press on a position’s button on the chart the same way, and sends it on a yes', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    const sent: string[] = [];
    FakeChart.last.getPositions = () => [{ id: 'p1', side: 'sell', entryPrice: 100, quantity: 1 }];
    FakeChart.last.guard!('positionClose', 'p1', () => sent.push('close'));
    expect(asked()).toBe(true);
    expect(sent).toEqual([]);
    yes().click();
    expect(sent).toEqual(['close']);
  });

  it('puts the question aside when what it said is no longer so: another symbol, or the positions changed under a close', async () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().placeOrderAt('buyLimit', 95);
    await widget.setSymbol('BBB');
    expect(asked()).toBe(false);
    expect(FakeChart.last.placed).toEqual([]);
    FakeChart.last.getPositions = () => [{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 3 }];
    (widget as unknown as Closes).trading.closePosition('p1');
    expect(asked()).toBe(true);
    FakeChart.last.emit('positionsChange', {});
    expect(asked()).toBe(false);
    // An order's question does not go with the positions.
    trading().placeOrderAt('buyLimit', 95);
    FakeChart.last.emit('positionsChange', {});
    expect(asked()).toBe(true);
    FakeChart.last.emit('executionChange', {});
    expect(asked()).toBe(false);
  });

  it('asks nothing about a position the account no longer holds', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    (widget as unknown as Closes).trading.closePosition('gone');
    expect(asked()).toBe(false);
  });

  it('takes no answer from a key still held from the press that asked', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().placeOrderAt('buyLimit', 95);
    const held = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });
    yes().dispatchEvent(held);
    expect(held.defaultPrevented).toBe(true);
    expect(asked()).toBe(true);
  });

  it('asks nothing with confirmations off: one-click trading', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    trading().placeOrderAt('buyLimit', 95);
    expect(asked()).toBe(false);
    expect(FakeChart.last.placed).toHaveLength(1);
  });

  it('places nothing when the feed went down while it asked', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().placeOrderAt('buyLimit', 95);
    trading().setFeed('down');
    yes().click();
    expect(FakeChart.last.placed).toEqual([]);
  });
});

// The ticket knew the day's ceiling and floor and showed neither until a price was refused for being past them.
describe('ChartWidget: the day’s ceiling, reference and floor in the ticket', () => {
  type Limits = { ceiling: number; floor: number; reference: number };
  const open = (limits: Limits | null, options: object = {}) => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, ...options });
    (FakeChart.last as unknown as { getPriceLimits(): Limits | null }).getPriceLimits = () => limits;
    FakeChart.last.market = { volumeUnit: 100 };
    // Under the market: a limit, with a price of its own.
    trading().openOrderTicket(25);
  };
  const row = () => host.querySelector<HTMLElement>('.tcw-ticket-limits');
  const cells = () => [...host.querySelectorAll<HTMLButtonElement>('.tcw-ticket-limits button')];
  const price = () => host.querySelector<HTMLInputElement>('.tcw-order-ticket input[data-ticket-field="price"]')!.value;

  it('shows the three over the price, the ceiling first, each named', () => {
    open({ ceiling: 27.1, floor: 23.6, reference: 25.35 });
    expect(cells().map((cell) => cell.textContent)).toEqual(['Ceiling 27.10', 'Ref 25.35', 'Floor 23.60']);
    expect(cells().map((cell) => cell.dataset.limit)).toEqual(['ceiling', 'reference', 'floor']);
  });

  it('puts a price in the field at a press on it', () => {
    open({ ceiling: 27.1, floor: 23.6, reference: 25.35 });
    cells()[2].click();
    expect(Number(price())).toBe(23.6);
    cells()[0].click();
    expect(Number(price())).toBe(27.1);
  });

  it('keeps the order a broker asks for', () => {
    open({ ceiling: 27.1, floor: 23.6, reference: 25.35 }, { priceLimitOrder: ['reference', 'ceiling', 'floor'] });
    expect(cells().map((cell) => cell.dataset.limit)).toEqual(['reference', 'ceiling', 'floor']);
  });

  it('shows each once, and only the three there are, whatever order is asked for', () => {
    open({ ceiling: 27.1, floor: 23.6, reference: 25.35 }, { priceLimitOrder: ['floor', 'floor', 'ceiling'] });
    expect(cells().map((cell) => cell.dataset.limit)).toEqual(['floor', 'ceiling']);
  });

  it('keeps the focus on the price pressed, through the ticket drawn anew', () => {
    open({ ceiling: 27.1, floor: 23.6, reference: 25.35 });
    cells()[2].focus();
    cells()[2].click();
    expect((document.activeElement as HTMLElement | null)?.dataset.limit).toBe('floor');
  });

  it('shows none on a market with no limits for the day', () => {
    open(null);
    expect(row()).toBeNull();
  });
});

// HOSE's ticket offered Market, Limit, Stop and Stop-limit, good till cancelled: the exchange takes LO, ATO, ATC and MP, for the day.
describe('ChartWidget: the broker’s order rules', () => {
  const HOSE = {
    orderKinds: [
      { code: 'LO', type: 'limit' as const },
      { code: 'ATO', type: 'market' as const },
      { code: 'ATC', type: 'market' as const },
      { code: 'MP', label: 'MP (market)', type: 'market' as const },
    ],
    timesInForce: ['day' as const],
    lot: 100,
  };
  const kinds = () => [...host.querySelectorAll<HTMLElement>('.tcw-order-ticket [data-ticket-field="type"] [role=radio]')];
  const times = () => [...host.querySelectorAll<HTMLElement>('.tcw-order-ticket [data-ticket-field="timeInForce"] [role=radio]')].map((r) => r.textContent);
  const quantity = () => host.querySelector<HTMLInputElement>('.tcw-order-ticket [data-ticket-field="quantity"]')!.value;
  type Rules = { setOrderRules(rules: object | null): void };

  it('offers the kinds the broker gives, by their own names, and the times in force it takes', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, orderRules: HOSE });
    trading().openOrderTicket(95);
    expect(kinds().map((k) => k.textContent)).toEqual(['LO', 'ATO', 'ATC', 'MP (market)']);
    // A price under the market starts as the kind that waits there.
    expect(kinds().find((k) => k.getAttribute('aria-checked') === 'true')?.textContent).toBe('LO');
    expect(times()).toEqual(['Day']);
    expect(quantity()).toBe('100');
  });

  it('sends the exchange’s own name with the order, on the kind the chart knows', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, orderRules: HOSE });
    trading().openOrderTicket(95);
    place().click();
    // The first is on its way: another ticket for the next.
    trading().openOrderTicket(95);
    kinds().find((k) => k.textContent === 'ATO')!.click();
    expect(host.querySelector('.tcw-order-ticket [data-ticket-field="price"]')).toBeNull();
    place().click();
    expect(FakeChart.last.placed.map((o) => [o.type, o.exchangeType, o.timeInForce, o.quantity])).toEqual([
      ['limit', 'LO', 'day', 100],
      ['market', 'ATO', undefined, 100],
    ]);
  });

  it('starts on the first kind for an order at the market where the broker has none of that name', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, orderRules: { orderKinds: [{ code: 'LO', type: 'limit' }, { code: 'PLO', type: 'limit', timesInForce: ['day'] }] } });
    trading().openOrderTicket();
    expect(kinds().find((k) => k.getAttribute('aria-checked') === 'true')?.textContent).toBe('LO');
    // A kind's own times in force stand over the rules'.
    kinds()[1].click();
    expect(times()).toEqual(['Day']);
  });

  it('takes other rules while the ticket is open: another session, another list', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, orderRules: HOSE });
    trading().openOrderTicket(95);
    (widget as unknown as Rules).setOrderRules({ orderKinds: [{ code: 'ATC', type: 'market' }, { code: 'LO', type: 'limit' }], timesInForce: ['day'] });
    expect(kinds().map((k) => k.textContent)).toEqual(['ATC', 'LO']);
    // The kind it was on is still there: it stays on it.
    expect(kinds().find((k) => k.getAttribute('aria-checked') === 'true')?.textContent).toBe('LO');
    (widget as unknown as Rules).setOrderRules(null);
    expect(kinds().map((k) => k.textContent)).toEqual(['Market', 'Limit', 'Stop', 'Stop-limit']);
  });

  it('sends an order asked for in one press as one of the broker’s kinds, for its lot and a time in force it takes', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, confirmOrders: false, orderRules: HOSE });
    trading().placeOrderAt('buyLimit', 95);
    trading().placeLadderOrder('sell', 105);
    expect(FakeChart.last.placed.map((o) => [o.side, o.type, o.exchangeType, o.timeInForce, o.quantity])).toEqual([
      ['buy', 'limit', 'LO', 'day', 100],
      ['sell', 'limit', 'LO', 'day', 100],
    ]);
  });

  it('sends none of a kind the broker does not take, and says so: a stop on HOSE', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, confirmOrders: false, orderRules: HOSE });
    trading().placeOrderAt('buyStop', 105);
    expect(FakeChart.last.placed).toEqual([]);
    expect(toasts().at(-1)).toContain('takes no order of this kind');
  });

  it('keeps no time in force the broker does not take: what is checked is what is sent', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true });
    trading().openOrderTicket(95);
    [...host.querySelectorAll<HTMLElement>('.tcw-order-ticket [data-ticket-field="timeInForce"] [role=radio]')].find((r) => r.textContent === 'IOC')!.click();
    (widget as unknown as Rules).setOrderRules({ timesInForce: ['day'] });
    expect(times()).toEqual(['Day']);
    place().click();
    expect(FakeChart.last.placed[0].timeInForce).toBe('day');
  });

  it('leaves an order on its way as it was sent, and takes the new rules once it is answered', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, orderRules: HOSE });
    // A broker to answer for it: the ticket waits.
    FakeChart.last.broker = {};
    trading().openOrderTicket(95);
    place().click();
    (widget as unknown as Rules).setOrderRules({ orderKinds: [{ code: 'ATC', type: 'market' }], timesInForce: ['day'] });
    expect(kinds().map((k) => k.textContent)).toEqual(['LO', 'ATO', 'ATC', 'MP (market)']);
    FakeChart.last.emit('executionError', { message: 'no', command: 'orderPlace', clientOrderId: FakeChart.last.placed[0].clientOrderId, cause: 'no' });
    expect(kinds().map((k) => k.textContent)).toEqual(['ATC']);
  });

  it('starts an order at a price on a kind that has a price, and sends an auction’s order with no live price', () => {
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true, orderRules: { orderKinds: [{ code: 'ATO', type: 'market' }, { code: 'LO', type: 'limit' }] } });
    // Over the market, where a stop would wait: the broker has none, and the price is kept.
    trading().openOrderTicket(105, { side: 'buy' });
    expect(kinds().find((k) => k.getAttribute('aria-checked') === 'true')?.textContent).toBe('LO');
    trading().setFeed('quiet');
    kinds()[0].click();
    expect(place().disabled).toBe(false);
  });

  it('is the chart’s own four kinds and every time in force with no rules given', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().openOrderTicket(95);
    expect(kinds().map((k) => k.textContent)).toEqual(['Market', 'Limit', 'Stop', 'Stop-limit']);
    place().click();
    expect(FakeChart.last.placed[0]).not.toHaveProperty('exchangeType');
  });
});

// The button read "Place buy order" for any order, and the order's value was the smallest line of the ticket.
describe('ChartWidget: the ticket says what its button does', () => {
  it('names the side, the quantity and the symbol on the button, as they change', () => {
    widget = new ChartWidget(host, { symbol: 'BINANCE:HPG', trading: true });
    FakeChart.last.market = { volumeUnit: 100 };
    trading().openOrderTicket();
    expect(place().textContent).toBe('Buy 100 HPG');
    host.querySelector<HTMLButtonElement>('.tcw-order-ticket [data-ticket-field="side-sell"], .tcw-order-ticket .tcw-ticket-side-sell')?.click();
    const quantity = host.querySelector<HTMLInputElement>('.tcw-order-ticket [data-ticket-field="quantity"]')!;
    quantity.value = '300';
    quantity.dispatchEvent(new Event('input'));
    expect(place().textContent).toMatch(/ 300 HPG$/);
  });

  it('writes the order’s value last, over the button', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().openOrderTicket();
    const rows = [...host.querySelectorAll<HTMLElement>('.tcw-ticket-summary-row')].map((row) => row.dataset.row);
    expect(rows.at(-1)).toBe('value');
  });
});

describe('ChartWidget: the quantity on the ticket’s button', () => {
  it('is written without a float’s noise', () => {
    widget = new ChartWidget(host, { symbol: 'BTC', trading: true });
    trading().openOrderTicket();
    const quantity = host.querySelector<HTMLInputElement>('.tcw-order-ticket [data-ticket-field="quantity"]')!;
    quantity.value = String(0.1 + 0.2);
    quantity.dispatchEvent(new Event('input'));
    expect(place().textContent).toBe('Buy 0.3 BTC');
  });
});
