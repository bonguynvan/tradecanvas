// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MockAdapter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart: when the feed last told anything', () => {
  it('is unknown with bars set by hand', () => {
    chart.setData([{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
    expect(chart.getFeedTime()).toBeNull();
  });

  it('is the clock as a stream’s bars come, and unknown again once the stream is let go', async () => {
    const before = Date.now();
    await chart.connect({ adapter: new MockAdapter({ historySize: 50 }), symbol: 'AAA', timeframe: '1m' });
    expect(chart.getFeedTime()).toBeGreaterThanOrEqual(before);
    chart.disconnectStream();
    expect(chart.getFeedTime()).toBeNull();
  });
});

describe('Chart: asked before a bracket or a draft is sent', () => {
  it('sends neither while the gate says no, and leaves the bracket as it is', async () => {
    await chart.connect({ adapter: new MockAdapter({ historySize: 50 }), symbol: 'AAA', timeframe: '1m' });
    const sent: unknown[] = [];
    chart.on('bracketPlace', (e) => sent.push(e.payload));
    chart.startBracket('buy', undefined, { quantity: 1 });
    chart.setOrderGate(() => false);
    expect(chart.confirmBracket()).toBe(false);
    expect(chart.confirmOrderDraft()).toBe(false);
    expect(sent).toEqual([]);
    expect(chart.isBracketActive()).toBe(true);
    chart.setOrderGate(null);
    expect(chart.confirmBracket()).toBe(true);
    expect(sent).toHaveLength(1);
  });
});

describe('Chart: asked before a button on the chart closes or reverses a position', () => {
  type Engine = { tradingManager: { eventCallback(event: string, data: unknown): void } };
  const press = (event: string) => (chart as unknown as Engine).tradingManager.eventCallback(event, { positionId: 'p1' });

  it('gives the guard the press and sends it only when the guard says so', () => {
    const sent: string[] = [];
    chart.on('positionClose', (e) => sent.push(`close ${e.payload.positionId}`));
    chart.on('positionReverse', (e) => sent.push(`reverse ${e.payload.positionId}`));
    const held: (() => void)[] = [];
    const asked: string[] = [];
    chart.setPositionGuard((action, id, send) => { asked.push(`${action} ${id}`); held.push(send); });
    press('positionClose');
    press('positionReverse');
    expect(asked).toEqual(['positionClose p1', 'positionReverse p1']);
    expect(sent).toEqual([]);
    held[0]();
    expect(sent).toEqual(['close p1']);
  });

  it('does not ask about a close asked for in code, nor about anything with no guard', () => {
    const sent: string[] = [];
    chart.on('positionClose', (e) => sent.push(e.payload.positionId));
    chart.setPositionGuard(() => {});
    chart.closePositionIntent('p2');
    chart.setPositionGuard(null);
    press('positionClose');
    expect(sent).toEqual(['p2', 'p1']);
  });
});
