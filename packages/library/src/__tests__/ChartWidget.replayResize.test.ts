// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';
import { ChartWidget } from '../widget/ChartWidget.js';
import { WidgetReplayBar } from '../widget/WidgetReplayBar.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const BAR_COUNT = 300;
const START_BAR = 150;
const LOAD_MS = 50;
const FRAME_MS = 20;
const WIDE = 1200;
const PHONE = 390;

const bars: OHLCBar[] = Array.from({ length: BAR_COUNT }, (_, i) => ({
  time: Date.UTC(2026, 8, 1) + i * HOUR, open: 100, high: 101, low: 99, close: 100.5, volume: 10,
}));

const adapter: DataAdapter = {
  name: 'fixed',
  supportedTimeframes: ['1h'],
  connect: () => {},
  disconnect: () => {},
  getConnectionState: () => 'connected',
  fetchHistory: async () => bars,
  on: () => {},
  off: () => {},
  dispose: () => {},
};

let observers: ((entries: unknown[]) => void)[] = [];
let host: HTMLDivElement;
let widget: ChartWidget;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  observers = [];
  // Every ResizeObserver the widget and its chart make, called as a browser would.
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: (entries: unknown[]) => void) { observers.push(cb); }
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  host = sizedHost(WIDE, 700);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ChartWidget replay bar after the chart container changes size', () => {
  it('fits itself to the new plot when a window resize narrows the chart, without a call to resize()', async () => {
    const box = { width: WIDE };
    const room = vi.spyOn(WidgetReplayBar.prototype, 'setRoom');
    widget = new ChartWidget(host, { adapter, symbol: 'BTCUSDT', timeframe: '1h', watchlist: false });
    const container = host.querySelector<HTMLElement>('.tcw-chart-container')!;
    Object.defineProperty(container, 'clientWidth', { get: () => box.width, configurable: true });
    Object.defineProperty(container, 'clientHeight', { get: () => 600, configurable: true });
    await vi.advanceTimersByTimeAsync(LOAD_MS);
    widget.toggleReplay();
    widget.replayFrom(START_BAR);
    room.mockClear();

    box.width = PHONE;
    for (const cb of observers) cb([]);
    await vi.advanceTimersByTimeAsync(FRAME_MS * 2);

    expect(room).toHaveBeenCalled();
    expect(room.mock.calls.at(-1)![0]).toBeLessThan(PHONE);
  });
});
