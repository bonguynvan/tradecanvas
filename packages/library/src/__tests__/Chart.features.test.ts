// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FeaturesConfig, OHLCBar } from '@tradecanvas/commons';
import { DataExporter } from '@tradecanvas/core';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const bars: OHLCBar[] = Array.from({ length: 50 }, (_, i) => ({
  time: Date.UTC(2026, 0, 1) + i * 60_000, open: 100, high: 101, low: 99, close: 100, volume: 1,
}));

type Probe = {
  barCountdown: { isVisible(): boolean };
  compareRenderer: { getSymbols(): unknown[] };
  streamManager: { switchTo(symbol: string, timeframe: string): Promise<void> } | null;
};

let host: HTMLDivElement;
let charts: Chart[];

function make(features: FeaturesConfig, extra: Record<string, unknown> = {}): Chart & Probe {
  const chart = new Chart(host, { chartType: 'candlestick', crosshair: { mode: 'magnet' }, features, ...extra });
  chart.setData(bars);
  charts.push(chart);
  return chart as unknown as Chart & Probe;
}

beforeEach(() => {
  charts = [];
  installChartStubs();
  host = sizedHost();
});

afterEach(() => {
  for (const chart of charts) chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('feature flags', () => {
  it('drawingMagnet: false keeps the magnet off', () => {
    const off = make({ drawingMagnet: false });
    expect(off.getDrawingMagnet()).toBe(false);
    off.setDrawingMagnet(true);
    expect(off.getDrawingMagnet()).toBe(false);

    const on = make({});
    expect(on.getDrawingMagnet()).toBe(true);
  });

  it('barCountdown: false keeps the countdown hidden', () => {
    const off = make({ barCountdown: false });
    expect(off.barCountdown.isVisible()).toBe(false);
    off.setBarCountdownVisible(true);
    expect(off.barCountdown.isVisible()).toBe(false);
    expect(make({}).barCountdown.isVisible()).toBe(true);
  });

  it('compareSymbols: false ignores added comparisons', () => {
    const off = make({ compareSymbols: false });
    off.addCompareSymbol('eth', 'ETH', bars, '#4c8dff');
    expect(off.compareRenderer.getSymbols()).toHaveLength(0);
    const on = make({});
    on.addCompareSymbol('eth', 'ETH', bars, '#4c8dff');
    expect(on.compareRenderer.getSymbols()).toHaveLength(1);
  });

  it('dataExport: false exports nothing', () => {
    const download = vi.spyOn(DataExporter, 'download').mockImplementation(() => {});
    const off = make({ dataExport: false });
    off.exportAllData('csv');
    off.exportVisibleData('json');
    expect(download).not.toHaveBeenCalled();
    make({}).exportAllData('csv');
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('logScale: false refuses the logarithmic scale but keeps the others', () => {
    const off = make({ logScale: false }, { logScale: true });
    expect(off.getScaleMode()).toBe('regular');
    off.setScaleMode('percentage');
    off.setLogScale(true);
    off.setScaleMode('logarithmic');
    expect(off.getScaleMode()).toBe('percentage');
    off.setLogScale(false);
    expect(off.getScaleMode()).toBe('regular');
  });

  it('timeframes: only listed timeframes can be switched to', async () => {
    const chart = make({ timeframes: ['1m', '1h'] });
    const switchTo = vi.fn(async () => {});
    chart.streamManager = { switchTo };
    expect(chart.isTimeframeAllowed('1h')).toBe(true);
    expect(chart.isTimeframeAllowed('5m')).toBe(false);
    await chart.setTimeframe('5m');
    await chart.setTimeframe('1h');
    // A symbol switch on the stream's own timeframe is not a timeframe choice.
    await chart.switchStream('ETHUSDT', '5m');
    expect(switchTo.mock.calls.map((c) => c[1])).toEqual(['1h', '5m']);
    chart.streamManager = null;
    expect(make({}).isTimeframeAllowed('5m')).toBe(true);
  });
});
