// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, DataAdapterListener, OHLCBar, SymbolInfo } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const VN = 'Asia/Ho_Chi_Minh';
/** Day `d` of October 2026 in Ho Chi Minh City starts at 17:00 UTC the day before. */
const vnMidnight = (d: number) => Date.UTC(2026, 9, d) - 7 * HOUR;
const days = (): OHLCBar[] => [22, 23, 24, 25, 26].map((d) => ({ time: vnMidnight(d), open: 100, high: 101, low: 99, close: 100, volume: 1 }));

let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A feed of Ho Chi Minh City's days whose answers about a symbol come when the test says, and whose trades the test sends. */
function feed() {
  const listeners = new Map<string, Set<DataAdapterListener>>();
  const answers = new Map<string, (info: SymbolInfo) => void>();
  const adapter: DataAdapter = {
    name: 'vn',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: async () => days(),
    resolveSymbol: (symbol) => new Promise((resolve) => answers.set(symbol, resolve)),
    on: (event, listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener as DataAdapterListener);
    },
    off: (event, listener) => { listeners.get(event)?.delete(listener as DataAdapterListener); },
    dispose: () => {},
  };
  const trade = (time: number, price: number) => {
    for (const l of listeners.get('tick') ?? []) l({ type: 'tick', data: { time, price, volume: 1 }, timestamp: 0 });
  };
  const answer = async (symbol: string) => {
    await vi.waitFor(() => expect(answers.has(symbol)).toBe(true));
    answers.get(symbol)!({ symbol, timeZone: VN });
    await vi.waitFor(() => expect(chart.getSymbolInfo()?.symbol).toBe(symbol));
  };
  return { adapter, trade, answer };
}

const priceLine = () => (chart as unknown as { currentPriceLine: { getPrice(): number | null } }).currentPriceLine.getPrice();

describe('Chart: days built from trades', () => {
  it("follow the trades when the symbol's zone comes after the first", async () => {
    const vn = feed();
    await chart.connect({ adapter: vn.adapter, symbol: 'VCB', timeframe: '1d', aggregateTicks: true });
    vn.trade(Date.UTC(2026, 9, 26, 2), 101); // 09:00 on the 26th there
    await vn.answer('VCB');
    vn.trade(Date.UTC(2026, 9, 26, 3), 105);
    vn.trade(Date.UTC(2026, 9, 26, 7), 110);
    expect(priceLine()).toBe(110);
    expect(chart.getData().at(-1)?.close).toBe(110);
  });

  it("go on building the history's last day after a switch to a symbol on the same exchange, before its answer", async () => {
    const vn = feed();
    await chart.connect({ adapter: vn.adapter, symbol: 'VCB', timeframe: '1d', aggregateTicks: true });
    await vn.answer('VCB');
    await chart.switchStream('VNM', '1d');
    vn.trade(Date.UTC(2026, 9, 26, 2), 101);
    await vn.answer('VNM');
    vn.trade(Date.UTC(2026, 9, 26, 7), 110);
    expect(priceLine()).toBe(110);
    expect(chart.getData().map((bar) => bar.time)).toEqual(days().map((bar) => bar.time));
    expect(chart.getData().at(-1)).toMatchObject({ open: 100, high: 110, close: 110 });
  });
});
