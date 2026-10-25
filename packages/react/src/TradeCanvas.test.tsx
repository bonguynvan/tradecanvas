import { render, cleanup } from '@testing-library/react';
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
    setWatermark: vi.fn(),
    setOverrides: vi.fn(),
    setFeatures: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
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

import { TradeCanvas } from './TradeCanvas.js';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

const BAR = { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 };

describe('<TradeCanvas> (react)', () => {
  it('passes options through to the Chart, under its own props', () => {
    render(
      <TradeCanvas
        chartType="line"
        features={{ trading: false }}
        options={{ maxBarSpacing: 160, rightMargin: 1, chartType: 'bar', features: { alerts: false, trading: true } }}
      />,
    );
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts).toMatchObject({ maxBarSpacing: 160, rightMargin: 1, chartType: 'line' });
    expect(opts.features).toMatchObject({ alerts: false, trading: false, drawings: true });
  });

  it('keeps a watermark from options when there is no watermarkText', () => {
    render(<TradeCanvas options={{ watermark: { text: 'VN30F1M' } }} />);
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts.watermark).toEqual({ text: 'VN30F1M' });
  });

  it('keeps its own defaults without options', () => {
    render(<TradeCanvas />);
    const opts = (ChartCtor.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(opts).toMatchObject({ rightMargin: 5, crosshair: { mode: 'magnet' } });
  });

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

  it('gives the chart its bars once at mount', () => {
    render(<TradeCanvas data={[BAR]} />);
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('feeds a new array that adds a bar or changes the last one as ticks, so the view stays', () => {
    const a = { ...BAR };
    const b = { ...BAR, time: 2 };
    const c = { ...BAR, time: 3 };
    const { rerender } = render(<TradeCanvas data={[a]} />);
    rerender(<TradeCanvas data={[a, b]} />);
    expect(chart.appendBar).toHaveBeenLastCalledWith(b);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
    rerender(<TradeCanvas data={[a, { ...b, close: 3 }]} />);
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...b, close: 3 });
    // The forming bar's last tick, then the next bar.
    rerender(<TradeCanvas data={[a, { ...b, close: 4 }, c]} />);
    expect(chart.updateLastBar).toHaveBeenLastCalledWith({ ...b, close: 4 });
    expect(chart.appendBar).toHaveBeenLastCalledWith(c);
    // The same bars again, in a new array: nothing to do.
    rerender(<TradeCanvas data={[{ ...a }, { ...b, close: 4 }, { ...c }]} />);
    expect(chart.updateLastBar).toHaveBeenCalledTimes(2);
    expect(chart.appendBar).toHaveBeenCalledTimes(2);
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('feeds bars added together, as a batched render gives them, in one go', () => {
    const a = { ...BAR };
    const { rerender } = render(<TradeCanvas data={[a]} />);
    rerender(<TradeCanvas data={[a, { ...BAR, time: 2 }, { ...BAR, time: 3 }]} />);
    expect(chart.appendBars).toHaveBeenCalledWith([{ ...BAR, time: 2 }, { ...BAR, time: 3 }]);
    expect(chart.setData).toHaveBeenCalledTimes(1);
  });

  it('gives its bars again when something else gave the chart bars since', () => {
    const a = { ...BAR };
    const b = { ...BAR, time: 2 };
    const { rerender } = render(<TradeCanvas data={[a, b]} />);
    chart.appendBar({ ...BAR, time: 3, close: 9 }); // a stream's bar, or one through the ref
    chart.appendBar.mockClear();
    rerender(<TradeCanvas data={[a, { ...b, close: 5 }]} />);
    expect(chart.setData).toHaveBeenLastCalledWith([a, { ...b, close: 5 }]);
    expect(chart.updateLastBar).not.toHaveBeenCalled();
  });

  it('takes any other new array as a new series', () => {
    const bars = [1, 2, 3].map((time) => ({ ...BAR, time }));
    const series = [
      [{ ...bars[0], close: 9 }, bars[1], bars[2]], // a bar before the last changed
      [bars[0], bars[1], { ...bars[2], time: 4 }], // the last bar, another time
      [bars[0], bars[1]], // a bar taken away
      [...bars, { ...BAR, time: 2 }], // a bar added before the last
    ];
    for (const data of series) {
      const { rerender, unmount } = render(<TradeCanvas data={bars} />);
      vi.clearAllMocks();
      rerender(<TradeCanvas data={data} />);
      expect(chart.setData).toHaveBeenCalledWith(data);
      expect(chart.appendBar).not.toHaveBeenCalled();
      expect(chart.updateLastBar).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('starts a new series after the data was taken away', () => {
    const { rerender } = render(<TradeCanvas data={[BAR]} />);
    rerender(<TradeCanvas />);
    rerender(<TradeCanvas data={[BAR, { ...BAR, time: 2 }]} />);
    expect(chart.setData).toHaveBeenCalledTimes(2);
    expect(chart.appendBar).not.toHaveBeenCalled();
  });

  it('gives the chart copies of the bars, so frozen state stays as it is', () => {
    const a = Object.freeze({ ...BAR });
    const b = Object.freeze({ ...BAR, time: 2 });
    const { rerender } = render(<TradeCanvas data={Object.freeze([a]) as typeof BAR[]} />);
    rerender(<TradeCanvas data={Object.freeze([a, b]) as typeof BAR[]} />);
    expect(chart.appendBar.mock.calls[0][0]).toEqual(b);
    expect(chart.appendBar.mock.calls[0][0]).not.toBe(b);
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

  it('swaps its crosshair listener when the handler changes, instead of adding one each render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = render(<TradeCanvas onCrosshairMove={first} />);
    rerender(<TradeCanvas onCrosshairMove={second} />);
    const onCalls = chart.on.mock.calls.filter(([e]) => e === 'crosshairMove').map(([, h]) => h);
    const offCalls = chart.off.mock.calls.filter(([e]) => e === 'crosshairMove').map(([, h]) => h);
    expect(onCalls).toEqual([first, second]);
    expect(offCalls).toEqual([first]);
    unmount();
    expect(chart.off.mock.calls.filter(([e]) => e === 'crosshairMove').map(([, h]) => h)).toEqual([first, second]);
  });
});

