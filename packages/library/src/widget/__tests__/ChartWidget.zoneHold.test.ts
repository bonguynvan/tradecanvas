// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar, SymbolInfo } from '@tradecanvas/commons';
import { SYMBOL_ZONE_WAIT_MS, VWAPIndicator } from '@tradecanvas/core';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { ChartWidget } from '../ChartWidget.js';

const HOUR = 3_600_000;
const NEW_YORK = 'America/New_York';
/** Monday 5 January 2026, 00:00 in New York (05:00 UTC). */
const NY_MIDNIGHT = Date.UTC(2026, 0, 5, 5);
const BARS = 48;
/** Each symbol's bars are priced by their number from here. */
const BASE: Record<string, number> = { AAA: 100, BBB: 200, CCC: 300 };

const flat = (time: number, price: number): OHLCBar => ({ time, open: price, high: price, low: price, close: price, volume: 100 });
const history = (symbol: string): OHLCBar[] => Array.from({ length: BARS }, (_, i) => flat(NY_MIDNIGHT + i * HOUR, BASE[symbol] + i));

type Answer = { promise: Promise<SymbolInfo | null>; resolve: (info: SymbolInfo | null) => void };

function later(): Answer {
  const answer = {} as Answer;
  answer.promise = new Promise((resolve) => Object.assign(answer, { resolve }));
  return answer;
}

/** A feed whose answers about each symbol come when the test says. */
function feed(answers: Record<string, () => Promise<SymbolInfo | null>>): DataAdapter {
  return {
    name: 'fake',
    connect: () => {},
    disconnect: () => {},
    getConnectionState: () => 'connected',
    fetchHistory: async (symbol: string) => history(symbol),
    resolveSymbol: (symbol: string) => answers[symbol](),
    on: () => {},
    off: () => {},
    dispose: () => {},
  };
}

let host: HTMLDivElement;
let widget: ChartWidget;

beforeEach(() => {
  localStorage.clear();
  installChartStubs();
  host = sizedHost();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  widget.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChartWidget keeps the indicators’ zone through a chain of symbol switches', () => {
  it('as long from each symbol’s question, when the one before it never answered', async () => {
    const answerC = later();
    // The feed answers about AAA at once, never about BBB, and about CCC after a while.
    const answers = { AAA: async () => ({ symbol: 'AAA', timeZone: NEW_YORK }), BBB: () => later().promise, CCC: () => answerC.promise };
    widget = new ChartWidget(host, { symbol: 'AAA', watchlist: false, timeframe: '1h', historyLimit: BARS, adapter: feed(answers) });
    const chart = widget.getChart();
    await vi.waitFor(() => expect(chart.getSymbolInfo()?.symbol).toBe('AAA'));
    const id = chart.addIndicator('vwap')!;
    const vwapAt = (i: number) => chart.getIndicatorOutput(id)!.series![i]?.value;

    await widget.setSymbol('BBB');
    await vi.waitFor(() => expect(chart.getData()[0]?.close).toBe(BASE.BBB));
    await vi.advanceTimersByTimeAsync(SYMBOL_ZONE_WAIT_MS * 0.6);
    const calculate = vi.spyOn(VWAPIndicator.prototype, 'calculate');
    await widget.setSymbol('CCC');
    await vi.waitFor(() => expect(chart.getData()[0]?.close).toBe(BASE.CCC));
    // Past the wait from BBB's question, within the one from CCC's.
    await vi.advanceTimersByTimeAsync(SYMBOL_ZONE_WAIT_MS / 2);
    expect(vwapAt(19)).toBeCloseTo(BASE.CCC + 9.5, 9); // New York's day still: bars 0 to 19
    answerC.resolve({ symbol: 'CCC', timeZone: NEW_YORK });
    await vi.waitFor(() => expect(chart.getSymbolInfo()?.symbol).toBe('CCC'));
    expect(calculate).toHaveBeenCalledTimes(1); // CCC's bars, once
  });
});
