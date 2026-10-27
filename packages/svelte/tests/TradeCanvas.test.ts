import { render, cleanup } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { chart, ChartCtor } = vi.hoisted(() => {
  // The bars it holds, as a chart keeps them: the component reads them back.
  const held: unknown[] = [];
  const chart = {
    connect: vi.fn(),
    setData: vi.fn((bars: unknown[]) => { held.splice(0, held.length, ...bars); }),
    updateLastBar: vi.fn((bar: unknown) => { held[held.length - 1] = bar; }),
    appendBar: vi.fn((bar: unknown) => { held.push(bar); }),
    appendBars: vi.fn((bars: unknown[]) => { held.push(...bars); }),
    // As the chart's: the loaded bar with that time, or false.
    updateBar: vi.fn((bar: { time: number }) => {
      const i = held.findIndex((h) => (h as { time: number }).time === bar.time);
      if (i < 0) return false;
      held[i] = bar;
      return true;
    }),
    getData: () => held,
    isExtendedHoursVisible: () => true,
    isReplayActive: () => false,
    setChartType: vi.fn(),
    setTheme: vi.fn(),
    addIndicator: vi.fn((id: string) => `iid-${id}`),
    removeIndicator: vi.fn(),
    setSignalMarkers: vi.fn(),
    setSignalMarkerStyle: vi.fn(),
    setTradeZones: vi.fn(),
    setTradeZoneStyle: vi.fn(),
    setOverrides: vi.fn(),
    setFeatures: vi.fn(),
    setWatermark: vi.fn(),
    on: vi.fn(),
    disconnectStream: vi.fn(),
    destroy: vi.fn(),
    screenshot: vi.fn(),
    screenshotDataURL: vi.fn(() => 'data:'),
  };
  return { chart, ChartCtor: vi.fn(() => chart) };
});

vi.mock('@tradecanvas/chart', async (importOriginal) => ({
  syncIndicators: (await importOriginal<typeof import('@tradecanvas/chart')>()).syncIndicators,
  feedBars: (await importOriginal<typeof import('@tradecanvas/chart')>()).feedBars,
  CORRECTABLE_BARS: (await importOriginal<typeof import('@tradecanvas/chart')>()).CORRECTABLE_BARS,
  Chart: ChartCtor,
  BinanceAdapter: vi.fn(),
  DARK_THEME: { name: 'dark' },
  LIGHT_THEME: { name: 'light' },
}));

import TradeCanvas from '../src/TradeCanvas.svelte';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const BAR = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };

describe('<TradeCanvas> (svelte)', () => {
  it('passes options through to the Chart, under its own props', () => {
    render(TradeCanvas, {
      props: {
        chartType: 'line',
        features: { trading: false },
        options: { maxBarSpacing: 160, rightMargin: 1, chartType: 'bar', features: { alerts: false, trading: true } },
      },
    });
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts).toMatchObject({ maxBarSpacing: 160, rightMargin: 1, chartType: 'line' });
    expect(opts.features).toMatchObject({ alerts: false, trading: false, drawings: true });
  });

  it('keeps a watermark from options when there is no watermarkText', () => {
    render(TradeCanvas, { props: { options: { watermark: { text: 'VN30F1M' } } } });
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts.watermark).toEqual({ text: 'VN30F1M' });
  });

  it('keeps its own defaults without options', () => {
    render(TradeCanvas);
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts).toMatchObject({ rightMargin: 5, crosshair: { mode: 'magnet' } });
  });

  it('constructs a Chart and connects with the symbol/timeframe', () => {
    render(TradeCanvas, { props: { symbol: 'ETHUSDT', timeframe: '1m' } });
    expect(ChartCtor).toHaveBeenCalledTimes(1);
    expect(chart.connect).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETHUSDT', timeframe: '1m' }),
    );
  });

  it('uses setData for static data and does not connect', () => {
    render(TradeCanvas, { props: { data: [BAR] } });
    expect(chart.setData).toHaveBeenCalled();
    expect(chart.connect).not.toHaveBeenCalled();
  });

  it('adds the requested indicators on mount', () => {
    render(TradeCanvas, { props: { indicators: ['rsi', 'macd'] } });
    flushSync();
    expect(chart.addIndicator).toHaveBeenCalledWith('rsi');
    expect(chart.addIndicator).toHaveBeenCalledWith('macd');
  });

  it("leaves the chart's overrides alone without the prop", () => {
    render(TradeCanvas);
    flushSync();
    expect(chart.setOverrides).not.toHaveBeenCalled();
  });

  it('puts the overrides prop on the chart', () => {
    render(TradeCanvas, { props: { overrides: { 'grid.vertical.visible': false } } });
    flushSync();
    expect(chart.setOverrides).toHaveBeenLastCalledWith({ 'grid.vertical.visible': false });
  });

  it('adds indicators with their inputs, and puts one back when its inputs change', async () => {
    const { rerender } = render(TradeCanvas, { props: { indicators: [{ id: 'ema', params: { period: 50 } }] } });
    flushSync();
    expect(chart.addIndicator).toHaveBeenCalledWith('ema', { period: 50 });
    await rerender({ indicators: [{ id: 'ema', params: { period: 100 } }] });
    flushSync();
    expect(chart.removeIndicator).toHaveBeenCalledWith('iid-ema');
    expect(chart.addIndicator).toHaveBeenLastCalledWith('ema', { period: 100 });
  });

  it('opens no stream of its own with stream={false}', () => {
    render(TradeCanvas, { props: { stream: false } });
    flushSync();
    expect(chart.connect).not.toHaveBeenCalled();
  });

  it('keeps its stream when data comes later, and closes it when switched off', async () => {
    const { rerender } = render(TradeCanvas);
    flushSync();
    expect(chart.connect).toHaveBeenCalledTimes(1);
    await rerender({ data: [BAR] });
    flushSync();
    expect(chart.setData).toHaveBeenCalledWith([BAR]);
    expect(chart.disconnectStream).not.toHaveBeenCalled();
    await rerender({ data: [BAR], stream: false });
    flushSync();
    expect(chart.disconnectStream).toHaveBeenCalledTimes(1);
  });

  it('applies features changed after mount', async () => {
    const { rerender } = render(TradeCanvas, { props: { features: { replay: true } } });
    flushSync();
    expect(chart.setFeatures).not.toHaveBeenCalled();
    await rerender({ features: { replay: false } });
    flushSync();
    expect(chart.setFeatures).toHaveBeenCalledWith({ replay: false });
  });

  it('destroys the chart on unmount', () => {
    const { unmount } = render(TradeCanvas);
    unmount();
    expect(chart.destroy).toHaveBeenCalled();
  });

  it('feeds bars pushed onto $state data as ticks, as plain copies, not the state', async () => {
    const { default: DataHost } = await import('./DataHost.svelte');
    type Host = { push: (bar: typeof BAR) => void; setClose: (close: number) => void };
    let host: Host | null = null;
    render(DataHost, { props: { onHost: (h: Host) => { host = h; } } });
    flushSync();
    expect(chart.setData).toHaveBeenCalledTimes(1);
    const given = chart.setData.mock.calls[0][0] as unknown[];
    // A bar pushed goes on the end; the one before it is as it was.
    host!.push({ ...BAR, time: 2 });
    flushSync();
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(chart.appendBar).toHaveBeenCalledWith({ ...BAR, time: 2 });
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    // A copy: what the chart was given doesn't change with the state.
    expect(given).toHaveLength(1);
    // The forming bar changed in place: an update of the last bar.
    host!.setClose(3);
    flushSync();
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...BAR, time: 2, close: 3 });
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('feeds several bars pushed between two renders together', async () => {
    const { default: DataHost } = await import('./DataHost.svelte');
    type Host = { push: (bar: typeof BAR) => void; setClose: (close: number) => void };
    let host: Host | null = null;
    render(DataHost, { props: { onHost: (h: Host) => { host = h; } } });
    flushSync();
    host!.push({ ...BAR, time: 2 });
    host!.push({ ...BAR, time: 3 });
    flushSync();
    expect(chart.appendBars).toHaveBeenCalledWith([{ ...BAR, time: 2 }, { ...BAR, time: 3 }]);
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('starts a new series after the data was taken away', async () => {
    const { rerender } = render(TradeCanvas, { props: { data: [BAR], stream: false } });
    flushSync();
    await rerender({ data: undefined, stream: false });
    flushSync();
    await rerender({ data: [BAR, { ...BAR, time: 2 }], stream: false });
    flushSync();
    expect(chart.setData).toHaveBeenCalledTimes(2);
    expect(chart.appendBar).not.toHaveBeenCalled();
  });

  it('feeds a bar before the forming one changed in place in $state data as updateBar, without setData', async () => {
    const { default: DataHost } = await import('./DataHost.svelte');
    type Host = { push: (bar: typeof BAR) => void; setClose: (close: number, back?: number) => void };
    let host: Host | null = null;
    render(DataHost, { props: { onHost: (h: Host) => { host = h; } } });
    flushSync();
    for (const time of [2, 3, 4, 5]) host!.push({ ...BAR, time });
    flushSync();
    expect(chart.setData).toHaveBeenCalledTimes(1);
    // The venue's final for bar 4, the one before the forming bar.
    host!.setClose(3, 1);
    flushSync();
    expect(chart.updateBar).toHaveBeenCalledWith({ ...BAR, time: 4, close: 3, high: 3 });
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
  });

  it('feeds a new array with a bar before the forming one changed as updateBar', async () => {
    const bars = [1, 2, 3, 4, 5].map((time) => ({ ...BAR, time }));
    const { rerender } = render(TradeCanvas, { props: { data: bars, stream: false } });
    flushSync();
    await rerender({ data: [...bars.slice(0, 3), { ...bars[3], close: 3, high: 3 }, bars[4]], stream: false });
    flushSync();
    expect(chart.updateBar).toHaveBeenCalledWith({ ...BAR, time: 4, close: 3, high: 3 });
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('feeds a new array that goes on from the last as ticks, and takes any other as a new series', async () => {
    const { rerender } = render(TradeCanvas, { props: { data: [BAR], stream: false } });
    flushSync();
    await rerender({ data: [BAR, { ...BAR, time: 2 }], stream: false });
    flushSync();
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(chart.appendBar).toHaveBeenCalledWith({ ...BAR, time: 2 });
    await rerender({ data: [BAR, { ...BAR, time: 2, close: 3 }], stream: false });
    flushSync();
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...BAR, time: 2, close: 3 });
    await rerender({ data: [{ ...BAR, time: 5 }], stream: false });
    flushSync();
    expect(chart.setData).toHaveBeenCalledTimes(2);
  });
});

