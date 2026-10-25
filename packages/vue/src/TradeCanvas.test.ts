import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { chart, ChartCtor } = vi.hoisted(() => {
  // The bars it holds, as a chart keeps them: the component reads them back.
  const held: unknown[] = [];
  const chart = {
    connect: vi.fn(),
    setData: vi.fn((bars: unknown[]) => { held.splice(0, held.length, ...bars); }),
    updateLastBar: vi.fn((bar: unknown) => { held[held.length - 1] = bar; }),
    appendBar: vi.fn((bar: unknown) => { held.push(bar); }),
    appendBars: vi.fn((bars: unknown[]) => { held.push(...bars); }),
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
  Chart: ChartCtor,
  BinanceAdapter: vi.fn(),
  DARK_THEME: { name: 'dark' },
  LIGHT_THEME: { name: 'light' },
}));

import TradeCanvas from './TradeCanvas.vue';

beforeEach(() => vi.clearAllMocks());

const BAR = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };

describe('<TradeCanvas> (vue)', () => {
  it('passes options through to the Chart, under its own props', () => {
    mount(TradeCanvas, {
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
    mount(TradeCanvas, { props: { options: { watermark: { text: 'VN30F1M' } } } });
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts.watermark).toEqual({ text: 'VN30F1M' });
  });

  it('keeps its own defaults without options', () => {
    mount(TradeCanvas);
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts).toMatchObject({ rightMargin: 5, crosshair: { mode: 'magnet' } });
  });

  it('constructs a Chart and connects with the symbol/timeframe', () => {
    mount(TradeCanvas, { props: { symbol: 'ETHUSDT', timeframe: '1m' } });
    expect(ChartCtor).toHaveBeenCalledTimes(1);
    expect(chart.connect).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETHUSDT', timeframe: '1m' }),
    );
  });

  it('uses setData for static data and does not connect', () => {
    mount(TradeCanvas, { props: { data: [BAR] } });
    expect(chart.setData).toHaveBeenCalled();
    expect(chart.connect).not.toHaveBeenCalled();
  });

  it('adds the requested indicators on mount', () => {
    mount(TradeCanvas, { props: { indicators: ['rsi', 'macd'] } });
    expect(chart.addIndicator).toHaveBeenCalledWith('rsi');
    expect(chart.addIndicator).toHaveBeenCalledWith('macd');
  });

  it('puts the overrides prop on the chart, and changes them with it', async () => {
    const wrapper = mount(TradeCanvas, { props: { overrides: { 'grid.vertical.visible': false } } });
    expect(chart.setOverrides).toHaveBeenLastCalledWith({ 'grid.vertical.visible': false });
    await wrapper.setProps({ overrides: { 'legend.textColor': '#fff' } });
    expect(chart.setOverrides).toHaveBeenLastCalledWith({ 'legend.textColor': '#fff' });
  });

  it('reacts to a chartType prop change', async () => {
    const wrapper = mount(TradeCanvas, { props: { chartType: 'candlestick' } });
    await wrapper.setProps({ chartType: 'line' });
    expect(chart.setChartType).toHaveBeenCalledWith('line');
  });

  it('adds indicators with their inputs, and puts one back when its inputs change', async () => {
    const wrapper = mount(TradeCanvas, { props: { indicators: [{ id: 'ema', params: { period: 50 } }] } });
    expect(chart.addIndicator).toHaveBeenCalledWith('ema', { period: 50 });
    await wrapper.setProps({ indicators: [{ id: 'ema', params: { period: 100 } }] });
    expect(chart.removeIndicator).toHaveBeenCalledWith('iid-ema');
    expect(chart.addIndicator).toHaveBeenLastCalledWith('ema', { period: 100 });
  });

  it('opens no stream of its own with stream: false', () => {
    mount(TradeCanvas, { props: { stream: false } });
    expect(chart.connect).not.toHaveBeenCalled();
  });

  it('keeps its stream when data comes later, and closes it when switched off', async () => {
    const wrapper = mount(TradeCanvas);
    expect(chart.connect).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ data: [BAR] });
    expect(chart.setData).toHaveBeenCalledWith([BAR]);
    expect(chart.disconnectStream).not.toHaveBeenCalled();
    await wrapper.setProps({ stream: false });
    expect(chart.disconnectStream).toHaveBeenCalledTimes(1);
  });

  it('applies features only when they change', async () => {
    const wrapper = mount(TradeCanvas, { props: { features: { replay: true } } });
    await wrapper.setProps({ features: { replay: true } });
    expect(chart.setFeatures).not.toHaveBeenCalled();
  });

  it('applies features changed after mount', async () => {
    const wrapper = mount(TradeCanvas, { props: { features: { replay: true } } });
    expect(chart.setFeatures).not.toHaveBeenCalled();
    await wrapper.setProps({ features: { replay: false } });
    expect(chart.setFeatures).toHaveBeenCalledWith({ replay: false });
  });

  it('destroys the chart on unmount', () => {
    const wrapper = mount(TradeCanvas);
    wrapper.unmount();
    expect(chart.destroy).toHaveBeenCalled();
  });

  it('feeds bars pushed onto reactive data as ticks, as plain bars, not proxies', async () => {
    const { reactive, isProxy, nextTick } = await import('vue');
    const data = reactive([{ ...BAR }]);
    mount(TradeCanvas, { props: { data, stream: false } });
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(isProxy(chart.setData.mock.calls[0][0])).toBe(false);
    // A bar pushed goes on the end; the one before it is as it was.
    data.push({ ...BAR, time: 2 });
    await nextTick();
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    expect(chart.appendBar).toHaveBeenCalledWith({ ...BAR, time: 2 });
    expect(isProxy(chart.appendBar.mock.calls[0][0])).toBe(false);
    // The forming bar changed in place, or replaced: an update of the last bar.
    data[1].close = 3;
    await nextTick();
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...BAR, time: 2, close: 3 });
    data[1] = { ...BAR, time: 2, close: 4 };
    await nextTick();
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...BAR, time: 2, close: 4 });
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('feeds several bars pushed between two renders together', async () => {
    const { reactive, nextTick } = await import('vue');
    const data = reactive([{ ...BAR }]);
    mount(TradeCanvas, { props: { data, stream: false } });
    data.push({ ...BAR, time: 2 });
    data.push({ ...BAR, time: 3 });
    await nextTick();
    expect(chart.appendBars).toHaveBeenCalledWith([{ ...BAR, time: 2 }, { ...BAR, time: 3 }]);
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('starts a new series after the data was taken away', async () => {
    const wrapper = mount(TradeCanvas, { props: { data: [BAR], stream: false } });
    await wrapper.setProps({ data: undefined });
    await wrapper.setProps({ data: [BAR, { ...BAR, time: 2 }] });
    expect(chart.setData).toHaveBeenCalledTimes(2);
    expect(chart.appendBar).not.toHaveBeenCalled();
  });

  it('feeds a new array that goes on from the last as ticks, and takes any other as a new series', async () => {
    const wrapper = mount(TradeCanvas, { props: { data: [BAR], stream: false } });
    await wrapper.setProps({ data: [BAR, { ...BAR, time: 2 }] });
    expect(chart.setData).toHaveBeenCalledTimes(1);
    expect(chart.appendBar).toHaveBeenCalledWith({ ...BAR, time: 2 });
    await wrapper.setProps({ data: [BAR, { ...BAR, time: 2, close: 3 }] });
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...BAR, time: 2, close: 3 });
    await wrapper.setProps({ data: [{ ...BAR, time: 5 }] });
    expect(chart.setData).toHaveBeenCalledTimes(2);
  });
});

