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
