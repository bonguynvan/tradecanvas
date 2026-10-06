import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { chart, ChartCtor } = vi.hoisted(() => {
  const chart = {
    connect: vi.fn(),
    setData: vi.fn(),
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
  Chart: ChartCtor,
  BinanceAdapter: vi.fn(),
  DARK_THEME: { name: 'dark' },
  LIGHT_THEME: { name: 'light' },
}));

import TradeCanvas from './TradeCanvas.vue';

beforeEach(() => vi.clearAllMocks());

const BAR = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };

describe('<TradeCanvas> (vue)', () => {
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
});
