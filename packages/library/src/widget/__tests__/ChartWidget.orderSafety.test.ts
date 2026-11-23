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
  getPositions(): unknown[] { return []; }
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
    widget = new ChartWidget(host, { symbol: 'VNM', trading: true });
    FakeChart.last.market = { volumeUnit: 100 };
    trading().placeOrderAt('buyLimit', 95);
    trading().placeOrderAt('sellStop', 90);
    trading().placeLadderOrder('sell', 105);
    expect(FakeChart.last.placed.map((order) => [order.side, order.type, order.quantity])).toEqual([
      ['buy', 'limit', 100], ['sell', 'stop', 100], ['sell', 'limit', 100],
    ]);
  });

  it('is one on a market with no lot', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().placeOrderAt('buyLimit', 95);
    trading().placeLadderOrder('buy', 94);
    expect(FakeChart.last.placed.map((order) => order.quantity)).toEqual([1, 1]);
  });
});

describe('ChartWidget: the price the order ticket trades at', () => {
  it('is the ask for a Buy and the bid for a Sell where the feed gives both, and follows them', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
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
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
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
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
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
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    trading().openOrderTicket();
    place().click();
    expect(FakeChart.last.placed).toHaveLength(1);
    expect(ticketOpen()).toBe(false);
    expect(toasts()).toEqual(['Order sent: Buy 1 @ 100.00']);
  });

  it('says the refusal of an order asked for in one press as a note, which stays long enough to be read', () => {
    vi.useFakeTimers();
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
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
