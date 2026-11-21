// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { OHLCBar } from '@tradecanvas/commons';
import { PaperExecutionAdapter } from '@tradecanvas/core';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { ChartWidget } from '../ChartWidget.js';
import { preloadDialogs } from '../widgetDialogs.js';

const BARS: OHLCBar[] = Array.from({ length: 60 }, (_, i) => ({
  time: i * 60_000, open: 100, high: 101, low: 99, close: 100 + (i % 5), volume: 10,
}));

let host: HTMLDivElement;
let widget: ChartWidget;

beforeAll(preloadDialogs);

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  host = sizedHost();
  widget = new ChartWidget(host, { symbol: 'AAA', trading: true });
  widget.getChart().setData(BARS);
});

afterEach(() => {
  widget.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const buttons = () => host.querySelector<HTMLElement>('.tcw-quote-buttons')!;
const text = (side: 'sell' | 'buy') => buttons().querySelector<HTMLElement>(`.tcw-quote-${side}`)!.textContent;
/** The frame the widget draws its account and legend on. */
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const connect = () => {
  const broker = new PaperExecutionAdapter({ markPrice: 104 });
  widget.getChart().connectExecution(broker);
  return broker;
};

describe('ChartWidget: Sell and Buy under the legend', () => {
  it('are away until a broker is connected, and go when it does', () => {
    expect(buttons().hidden).toBe(true);
    connect();
    expect(buttons().hidden).toBe(false);
    widget.getChart().disconnectExecution();
    expect(buttons().hidden).toBe(true);
  });

  it('quote the last price for both where the feed gives no bid and ask, and the two with their spread where it does', async () => {
    connect();
    expect(text('sell')).toBe('Sell104.00');
    expect(text('buy')).toBe('Buy104.00');
    widget.getChart().setBidAsk({ bid: 103.5, ask: 104.5 });
    widget.getChart().updateLastBar({ ...BARS[59], close: 104 });
    await frame();
    expect(text('sell')).toBe('Sell103.50');
    expect(text('buy')).toBe('Buy104.50');
    expect(buttons().querySelector('.tcw-quote-spread')!.textContent).toBe('1.00');
  });

  it('open the order ticket on the side pressed', () => {
    connect();
    buttons().querySelector<HTMLButtonElement>('.tcw-quote-sell')!.click();
    const ticket = host.querySelector<HTMLElement>('.tcw-order-ticket')!;
    expect(ticket).not.toBeNull();
    expect(host.querySelector('.tcw-ticket-side [aria-pressed="true"]')?.textContent).toBe('Sell');
  });

  it('are switched off with the buttons’ switch, or with the order ticket’s', () => {
    connect();
    widget.setFeatures({ tradeButtons: false });
    expect(buttons().hidden).toBe(true);
    widget.setFeatures({ tradeButtons: true, orderTicket: false });
    expect(buttons().hidden).toBe(true);
    widget.setFeatures({ orderTicket: true });
    expect(buttons().hidden).toBe(false);
  });

  it('put the indicators’ rows under them, and give the room back when they go', async () => {
    widget.getChart().addIndicator('sma', { period: 5 });
    await frame();
    const stack = () => host.querySelector<HTMLElement>('.tcw-ind-legend')!;
    const before = parseFloat(stack().style.top);
    connect();
    await frame();
    expect(parseFloat(stack().style.top)).toBeGreaterThan(before);
    expect(parseFloat(buttons().style.top)).toBe(before);
    widget.getChart().disconnectExecution();
    await frame();
    expect(parseFloat(stack().style.top)).toBe(before);
  });
});

describe('ChartWidget: the quote on Sell and Buy', () => {
  it('follows a quote that comes with no trade', async () => {
    connect();
    widget.getChart().setBidAsk({ bid: 103.5, ask: 104.5 });
    await frame();
    expect(text('sell')).toBe('Sell103.50');
    widget.getChart().setBidAsk({ bid: 103.75, ask: 104.25 });
    await frame();
    expect(text('sell')).toBe('Sell103.75');
    expect(text('buy')).toBe('Buy104.25');
  });

  it('quotes the last price on both when the feed gives one side only: a bid is no price to buy at', async () => {
    connect();
    widget.getChart().setBidAsk({ bid: 103.5 });
    await frame();
    expect(text('sell')).toBe('Sell104.00');
    expect(text('buy')).toBe('Buy104.00');
    expect(buttons().querySelector<HTMLElement>('.tcw-quote-spread')!.hidden).toBe(true);
  });
});
