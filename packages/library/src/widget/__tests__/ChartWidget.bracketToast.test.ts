// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: anything not written here is a no-op; tests send its events. */
class FakeChart {
  static last: FakeChart;
  static places = false;
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
  placesBrackets(): boolean { return FakeChart.places; }
  /** The brackets started, and the sizes set while one is placed. */
  started: unknown[][] = [];
  sizes: unknown[] = [];
  market: { volumeUnit?: number } | null = null;
  startBracket(...args: unknown[]): boolean { this.started.push(args); return true; }
  setBracketSize(size: unknown): void { this.sizes.push(size); }
  getMarket(): { volumeUnit?: number } | null { return this.market; }
  getData(): unknown[] { return []; }
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
  FakeChart.places = false;
});

const toasts = () => [...host.querySelectorAll<HTMLElement>('.tcw-toast')].map((t) => t.textContent?.trim());
const bracket = { side: 'buy', entry: 99, stopLoss: 98, takeProfit: 101, riskReward: 2 };

describe('ChartWidget: what it says of a confirmed bracket', () => {
  it('says it is confirmed, not placed, when it goes no further than the event', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('bracketPlace', bracket);
    expect(toasts()).toEqual(['Long bracket confirmed · 2.00R']);
  });

  it('says it is placed once the adapter took it, and not before', () => {
    FakeChart.places = true;
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('bracketPlace', bracket);
    expect(toasts()).toEqual([]);
    FakeChart.last.emit('bracketOrder', { order: { id: 'o1' }, bracket });
    expect(toasts()).toEqual(['Long bracket placed · 2.00R']);
  });

  it('says a bracket with no quantity was not sent', () => {
    FakeChart.places = true;
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('bracketPlace', bracket);
    FakeChart.last.emit('executionError', { message: 'A bracket with no quantity is not sent to the adapter', command: 'bracketPlace', reason: 'noQuantity' });
    expect(toasts()).toEqual(['The bracket has no quantity, so it was not sent to the broker']);
  });

  it('says so when the adapter refused it', () => {
    FakeChart.places = true;
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('bracketPlace', { ...bracket, side: 'sell' });
    FakeChart.last.emit('executionError', { message: 'Execution command failed: bracketPlace', cause: new Error('margin'), command: 'bracketPlace' });
    // Another command's failure is not the bracket's.
    FakeChart.last.emit('executionError', { message: 'Execution command failed: orderCancel', command: 'orderCancel' });
    expect(toasts()).toEqual(['The broker refused the bracket: margin']);
  });
});

describe('ChartWidget: what it says of an order', () => {
  it('says so when the adapter refused it, in the adapter’s words', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('executionError', {
      message: 'Execution command failed: orderPlace',
      cause: new Error('The fok order was not filled at once: it is cancelled'),
      command: 'orderPlace',
    });
    expect(toasts()).toEqual(['The broker refused the order: The fok order was not filled at once: it is cancelled']);
  });

  it('says it of an order refused with no words of the adapter’s, and nothing of another command’s failure', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('executionError', { message: 'Execution command failed: orderModify', command: 'orderModify' });
    FakeChart.last.emit('executionError', { message: 'Execution connect failed' });
    expect(toasts()).toEqual([]);
    FakeChart.last.emit('executionError', { message: 'Execution command failed: orderPlace', cause: 'margin', command: 'orderPlace' });
    expect(toasts()).toEqual(['The broker refused the order: margin']);
  });

  it('says an order from the ticket was sent before it says what became of it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    // An account that fills a part at once, as the order is placed.
    const chart = FakeChart.last as unknown as { placeOrderIntent(intent: unknown): void; getData(): unknown[]; roundPrice(p: number): number };
    chart.getData = () => [{ time: 0, open: 100, high: 100, low: 100, close: 100, volume: 1 }];
    chart.roundPrice = (p) => p;
    chart.placeOrderIntent = () => FakeChart.last.emit('executionFill', { orderId: 'o1', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order', dropped: 3 });
    (widget as unknown as { trading: { openOrderTicket(price?: number): void } }).trading.openOrderTicket(100);
    host.querySelector<HTMLButtonElement>('.tcw-ticket-place')!.click();
    // The last thing said is what shows: what became of the order, not that it was sent.
    expect(toasts()).toEqual(['Filled 2 of 5: the rest was cancelled']);
  });

  it('shows one toast at a time: a new one takes the place of the one showing', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    widget.toast('first');
    widget.toast('second', 'error');
    expect(toasts()).toEqual(['second']);
    // Another widget's toast is not this one's to take away.
    const other = document.createElement('div');
    document.body.appendChild(other);
    const beside = new ChartWidget(other, { symbol: 'BBB' });
    beside.toast('theirs');
    widget.toast('third');
    expect([...document.querySelectorAll<HTMLElement>('.tcw-toast')].map((t) => t.textContent).sort()).toEqual(['theirs', 'third']);
    beside.destroy();
    other.remove();
  });

  it('says how much filled when the rest of an order was dropped, and nothing of a fill that dropped none', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('executionFill', { orderId: 'o1', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order' });
    FakeChart.last.emit('executionFill', { orderId: 'o2', side: 'buy', price: 100, quantity: 2, time: 1, reason: 'order', remaining: 3 });
    expect(toasts()).toEqual([]);
    // A tenth and two tenths: three tenths, with no sum's dust.
    FakeChart.last.emit('executionFill', { orderId: 'o3', side: 'buy', price: 100, quantity: 0.1, time: 2, reason: 'order', dropped: 0.2 });
    expect(toasts()).toEqual(['Filled 0.1 of 0.3: the rest was cancelled']);
  });
});

describe('ChartWidget: an order asked for past the day’s limits', () => {
  type Trading = { trading: { placeOrderAt(kind: string, price: number): void; allowedToday(price: number): boolean } };

  it('is not placed, and the widget says what today’s prices are', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    const chart = FakeChart.last as unknown as { getPriceLimits(): unknown; placeOrderIntent(intent: unknown): void };
    const placed: unknown[] = [];
    chart.placeOrderIntent = (intent) => { placed.push(intent); };
    chart.getPriceLimits = () => ({ floor: 93, ceiling: 107, reference: 100 });
    const trading = (widget as unknown as Trading).trading;
    trading.placeOrderAt('sellLimit', 110);
    expect(placed).toEqual([]);
    expect(toasts()).toEqual(['Today’s prices run from 93.00 to 107.00.']);
    expect(trading.allowedToday(92)).toBe(false);
    // At a limit, and between them, it goes out as before.
    trading.placeOrderAt('sellLimit', 107);
    expect(placed).toEqual([expect.objectContaining({ side: 'sell', type: 'limit', price: 107 })]);
    expect(toasts()).toEqual(['Sell limit @ 107.00']);
  });

  it('is placed anywhere on a market with no limits for the day', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    const chart = FakeChart.last as unknown as { placeOrderIntent(intent: unknown): void };
    const placed: unknown[] = [];
    chart.placeOrderIntent = (intent) => { placed.push(intent); };
    (widget as unknown as Trading).trading.placeOrderAt('buyStop', 110);
    expect(placed).toHaveLength(1);
  });
});

describe('ChartWidget: the quantity of a bracket it starts', () => {
  const field = () => host.querySelector<HTMLInputElement>('.tcw-bracket-quantity input')!;
  const type = (text: string) => {
    field().value = text;
    field().dispatchEvent(new Event('input'));
  };

  it('starts at one, in a field on the bar, and the bracket has it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    widget.startBracket('buy');
    expect(FakeChart.last.started).toEqual([['buy', undefined, { quantity: 1 }]]);
    expect(field().value).toBe('1');
  });

  it('starts at the market’s lot, and steps by it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.market = { volumeUnit: 100 };
    widget.startBracket('sell');
    expect(FakeChart.last.started[0][2]).toEqual({ quantity: 100 });
    host.querySelector<HTMLButtonElement>('.tcw-bracket-quantity .tcw-stepper-btn:last-of-type')!.click();
    expect(FakeChart.last.sizes).toEqual([{ quantity: 200 }]);
  });

  it('gives the bracket the quantity typed, and starts the next one with it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    widget.startBracket('buy');
    type('2.5');
    expect(FakeChart.last.sizes).toEqual([{ quantity: 2.5 }]);
    widget.startBracket('sell');
    expect(FakeChart.last.started[1]).toEqual(['sell', undefined, { quantity: 2.5 }]);
  });

  it('leaves the bracket with no quantity while the field has none', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    widget.startBracket('buy');
    type('');
    expect(FakeChart.last.sizes).toEqual([undefined]);
  });

  it('starts at the quantity it is asked for', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    widget.startBracket('buy', { quantity: 7 });
    expect(FakeChart.last.started[0][2]).toEqual({ quantity: 7 });
    expect(field().value).toBe('7');
  });

  it('has no field for a bracket sized by its risk: the quantity follows its lines', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    widget.startBracket('buy', { risk: 50, quantityStep: 0.1 });
    expect(FakeChart.last.started[0][2]).toEqual({ risk: 50, quantityStep: 0.1 });
    expect(host.querySelector<HTMLElement>('.tcw-bracket-quantity')!.hidden).toBe(true);
  });
});

describe('ChartWidget: what it says of a margin call', () => {
  it('says how the equity stands to the margin held, as a warning that shows with the toasts off', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, features: { toasts: false } });
    FakeChart.last.emit('marginCall', { marginLevel: 0.9, level: 1, equity: 450, marginUsed: 500 });
    // The figure is kept left to right, as a mark of its own: read without them here.
    expect(toasts().map((text) => text?.replace(/[\u2066\u2069]/g, ''))).toEqual(['Margin call: the equity is 90.0% of the margin held']);
  });

  it('keeps the figure, its sign and its percent as one thing left to right, for a sentence written the other way', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true, confirmOrders: false });
    FakeChart.last.emit('marginCall', { marginLevel: -0.25, level: 1, equity: -125, marginUsed: 500 });
    expect(toasts()[0]).toMatch(/\u2066-[^\u2069]*%\u2069/);
  });
});
