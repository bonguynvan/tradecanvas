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
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    FakeChart.last.emit('bracketPlace', bracket);
    expect(toasts()).toEqual(['Long bracket confirmed · 2.00R']);
  });

  it('says it is placed once the adapter took it, and not before', () => {
    FakeChart.places = true;
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    FakeChart.last.emit('bracketPlace', bracket);
    expect(toasts()).toEqual([]);
    FakeChart.last.emit('bracketOrder', { order: { id: 'o1' }, bracket });
    expect(toasts()).toEqual(['Long bracket placed · 2.00R']);
  });

  it('says a bracket with no quantity was not sent', () => {
    FakeChart.places = true;
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    FakeChart.last.emit('bracketPlace', bracket);
    FakeChart.last.emit('executionError', { message: 'A bracket with no quantity is not sent to the adapter', command: 'bracketPlace', reason: 'noQuantity' });
    expect(toasts()).toEqual(['The bracket has no quantity, so it was not sent to the broker']);
  });

  it('says so when the adapter refused it', () => {
    FakeChart.places = true;
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    FakeChart.last.emit('bracketPlace', { ...bracket, side: 'sell' });
    FakeChart.last.emit('executionError', { message: 'Execution command failed: bracketPlace', cause: new Error('margin'), command: 'bracketPlace' });
    // Another command's failure is not the bracket's.
    FakeChart.last.emit('executionError', { message: 'Execution command failed: orderCancel', command: 'orderCancel' });
    expect(toasts()).toEqual(['The broker refused the bracket: margin']);
  });
});

describe('ChartWidget: the quantity of a bracket it starts', () => {
  const field = () => host.querySelector<HTMLInputElement>('.tcw-bracket-quantity input')!;
  const type = (text: string) => {
    field().value = text;
    field().dispatchEvent(new Event('input'));
  };

  it('starts at one, in a field on the bar, and the bracket has it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    widget.startBracket('buy');
    expect(FakeChart.last.started).toEqual([['buy', undefined, { quantity: 1 }]]);
    expect(field().value).toBe('1');
  });

  it('starts at the market’s lot, and steps by it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    FakeChart.last.market = { volumeUnit: 100 };
    widget.startBracket('sell');
    expect(FakeChart.last.started[0][2]).toEqual({ quantity: 100 });
    host.querySelector<HTMLButtonElement>('.tcw-bracket-quantity .tcw-stepper-btn:last-of-type')!.click();
    expect(FakeChart.last.sizes).toEqual([{ quantity: 200 }]);
  });

  it('gives the bracket the quantity typed, and starts the next one with it', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    widget.startBracket('buy');
    type('2.5');
    expect(FakeChart.last.sizes).toEqual([{ quantity: 2.5 }]);
    widget.startBracket('sell');
    expect(FakeChart.last.started[1]).toEqual(['sell', undefined, { quantity: 2.5 }]);
  });

  it('leaves the bracket with no quantity while the field has none', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    widget.startBracket('buy');
    type('');
    expect(FakeChart.last.sizes).toEqual([undefined]);
  });

  it('starts at the quantity it is asked for', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    widget.startBracket('buy', { quantity: 7 });
    expect(FakeChart.last.started[0][2]).toEqual({ quantity: 7 });
    expect(field().value).toBe('7');
  });

  it('has no field for a bracket sized by its risk: the quantity follows its lines', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
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
    widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
    FakeChart.last.emit('marginCall', { marginLevel: -0.25, level: 1, equity: -125, marginUsed: 500 });
    expect(toasts()[0]).toMatch(/\u2066-[^\u2069]*%\u2069/);
  });
});
