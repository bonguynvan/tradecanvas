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
    on: vi.fn(),
    disconnectStream: vi.fn(),
    destroy: vi.fn(),
    screenshot: vi.fn(),
    screenshotDataURL: vi.fn(() => 'data:'),
  };
  return { chart, ChartCtor: vi.fn(() => chart) };
});

vi.mock('@tradecanvas/chart', () => ({
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

  it('destroys the chart on unmount', () => {
    const { unmount } = render(<TradeCanvas />);
    unmount();
    expect(chart.destroy).toHaveBeenCalled();
  });
});
