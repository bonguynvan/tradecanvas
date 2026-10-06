import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    setWatermark: vi.fn(),
    setOverrides: vi.fn(),
    setFeatures: vi.fn(),
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

import { TradeCanvas } from './TradeCanvas.js';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const BAR = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };

describe('<TradeCanvas> (react)', () => {
  it('constructs a Chart and connects with the symbol/timeframe', () => {
    render(<TradeCanvas symbol="ETHUSDT" timeframe="1m" />);
    expect(ChartCtor).toHaveBeenCalledTimes(1);
    expect(chart.connect).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETHUSDT', timeframe: '1m' }),
    );
  });

  it('uses setData for static data and does not connect', () => {
    render(<TradeCanvas data={[BAR]} />);
    expect(chart.setData).toHaveBeenCalled();
    expect(chart.connect).not.toHaveBeenCalled();
  });

  it('adds the requested indicators on mount', () => {
    render(<TradeCanvas indicators={['rsi', 'macd']} />);
    expect(chart.addIndicator).toHaveBeenCalledWith('rsi');
    expect(chart.addIndicator).toHaveBeenCalledWith('macd');
  });

  it("leaves the chart's overrides alone without the prop", () => {
    render(<TradeCanvas />);
    expect(chart.setOverrides).not.toHaveBeenCalled();
  });

  it('puts the overrides prop on the chart, and changes them with it', () => {
    const { rerender } = render(<TradeCanvas overrides={{ 'grid.vertical.visible': false }} />);
    expect(chart.setOverrides).toHaveBeenLastCalledWith({ 'grid.vertical.visible': false });
    rerender(<TradeCanvas />);
    expect(chart.setOverrides).toHaveBeenLastCalledWith({});
  });

  it('reacts to a chartType prop change', () => {
    const { rerender } = render(<TradeCanvas chartType="candlestick" />);
    rerender(<TradeCanvas chartType="line" />);
    expect(chart.setChartType).toHaveBeenCalledWith('line');
  });

  it('adds indicators with their inputs, and puts one back when its inputs change', () => {
    const { rerender } = render(<TradeCanvas indicators={[{ id: 'ema', params: { period: 50 } }]} />);
    expect(chart.addIndicator).toHaveBeenCalledWith('ema', { period: 50 });
    rerender(<TradeCanvas indicators={[{ id: 'ema', params: { period: 100 } }]} />);
    expect(chart.removeIndicator).toHaveBeenCalledWith('iid-ema');
    expect(chart.addIndicator).toHaveBeenLastCalledWith('ema', { period: 100 });
  });

  it('opens no stream of its own with stream={false}', () => {
    render(<TradeCanvas stream={false} />);
    expect(chart.connect).not.toHaveBeenCalled();
  });

  it('keeps its stream when data comes later, and closes it when switched off', () => {
    const { rerender } = render(<TradeCanvas />);
    expect(chart.connect).toHaveBeenCalledTimes(1);
    rerender(<TradeCanvas data={[BAR]} />);
    expect(chart.setData).toHaveBeenCalledWith([BAR]);
    expect(chart.disconnectStream).not.toHaveBeenCalled();
    rerender(<TradeCanvas data={[BAR]} stream={false} />);
    expect(chart.disconnectStream).toHaveBeenCalledTimes(1);
  });

  it('applies features changed after mount', () => {
    const { rerender } = render(<TradeCanvas features={{ replay: true }} />);
    expect(chart.setFeatures).not.toHaveBeenCalled();
    rerender(<TradeCanvas features={{ replay: false }} />);
    expect(chart.setFeatures).toHaveBeenCalledWith({ replay: false });
  });

  it('destroys the chart on unmount', () => {
    const { unmount } = render(<TradeCanvas />);
    unmount();
    expect(chart.destroy).toHaveBeenCalled();
  });
});
