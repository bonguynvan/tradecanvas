// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartOptions, PriceChartOptions } from '@tradecanvas/commons';
import { CandlestickRenderer, defineIndicator, yToPrice } from '@tradecanvas/core';
import { Chart } from '../../Chart.js';
import type { ChartPlugin } from '../../plugins/contracts.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';
import { renderPriceChart } from '../renderPriceChart.js';
import { PaintPath, firstDifference, painted, someBars } from './paintKit.js';

const WIDTH = 800;
const HEIGHT = 400;
const bars = someBars(120);

/** What only a chart on a page draws: left off it, so the two frames are of the same things. */
const STILL: ChartOptions['features'] = { barCountdown: false, crosshair: false };

/** The frame a chart on a page draws for a picture of itself, as paints. */
async function chartFrame(options: ChartOptions & { plugins?: ChartPlugin[] }, setUp: (chart: Chart) => void): Promise<string[]> {
  const chart = new Chart(sizedHost(WIDTH, HEIGHT), { ...options, features: { ...STILL, ...options.features } });
  chart.setData(bars);
  chart.fitContent();
  setUp(chart);
  // Its first frames drawn: a legend drawn for the first time says how tall it is, and the frame after is the one that stands.
  await new Promise((resolve) => setTimeout(resolve, 80));
  const { ctx, paints } = painted(WIDTH, HEIGHT);
  ctx.fillStyle = chart.getTheme().background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  (chart as unknown as { engine: { renderTo(c: CanvasRenderingContext2D): void } }).engine.renderTo(ctx);
  chart.destroy();
  return paints;
}

function staticFrame(options: Omit<PriceChartOptions, 'data'> & { plugins?: ChartPlugin[] }): string[] {
  const { ctx, paints } = painted(WIDTH, HEIGHT);
  renderPriceChart(ctx, { ...options, data: bars }, { width: WIDTH, height: HEIGHT });
  return paints;
}

describe('the price chart drawn with no page is the chart’s own frame', () => {
  beforeEach(() => {
    installChartStubs();
    vi.stubGlobal('Path2D', PaintPath);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('with nothing but its bars', async () => {
    const onPage = await chartFrame({}, () => undefined);
    expect(onPage.length).toBeGreaterThan(20);
    expect(firstDifference(staticFrame({}), onPage)).toBeNull();
  });

  it('with indicators on the price pane, in panes of their own, and in one another’s', async () => {
    const onPage = await chartFrame({}, (chart) => {
      chart.addIndicator('sma', { period: 10 });
      chart.addIndicator('bb');
      const rsi = chart.addIndicator('rsi');
      chart.addIndicator('macd');
      chart.addIndicator('stochastic', {}, 'bottom', { pane: rsi ?? undefined });
    });
    const drawn = staticFrame({
      indicators: [
        { id: 'sma', params: { period: 10 } },
        { id: 'bb' },
        { id: 'rsi', instanceId: 'momentum' },
        { id: 'macd' },
        { id: 'stochastic', pane: 'momentum' },
      ],
    });
    expect(firstDifference(drawn, onPage)).toBeNull();
    // The comparison would tell: the frame without them is another, and so is one with a pane the other way up.
    expect(firstDifference(staticFrame({}), onPage)).not.toBeNull();
    expect(firstDifference(staticFrame({ indicators: [{ id: 'sma', params: { period: 10 } }, { id: 'bb' }, { id: 'rsi', instanceId: 'momentum', paneInvert: true }, { id: 'macd' }, { id: 'stochastic', pane: 'momentum' }] }), onPage)).not.toBeNull();
  });

  it('as a line on a log scale in the light theme, with no volume and no grid', async () => {
    const options = { chartType: 'line', theme: 'light', logScale: true, features: { volume: false, grid: false } } as const;
    expect(firstDifference(staticFrame(options), await chartFrame(options, () => undefined))).toBeNull();
  });

  it('as Heikin-Ashi candles and as Renko bricks, an average on each', async () => {
    for (const chartType of ['heikinAshi', 'renko'] as const) {
      const onPage = await chartFrame({ chartType }, (chart) => void chart.addIndicator('ema', { period: 8 }));
      expect(firstDifference(staticFrame({ chartType, indicators: [{ id: 'ema', params: { period: 8 } }] }), onPage), chartType).toBeNull();
    }
  });

  it('over a range of its bars, packed close, in another locale and zone', async () => {
    const range = { from: bars[30].time, to: bars[89].time };
    const options = { density: 'compact', numberLocale: 'de-DE', timeZone: 'Asia/Ho_Chi_Minh' } as const;
    const onPage = await chartFrame(options, (chart) => chart.setVisibleRange(range.from, range.to));
    expect(firstDifference(staticFrame({ ...options, visibleRange: range }), onPage)).toBeNull();
  });

  it('named, with its interval, a watermark and prices in fractions', async () => {
    const options = { watermark: { text: 'TRADECANVAS' }, priceFormat: { denominator: 32 } } as const;
    const onPage = await chartFrame(options, (chart) => {
      chart.setSymbolName('ZN');
      chart.setDataTimeframe('1d');
    });
    expect(firstDifference(staticFrame({ ...options, symbol: 'ZN', timeframe: '1d' }), onPage)).toBeNull();
  });

  it('with an indicator on the left scale and one kept to other intervals', async () => {
    const onPage = await chartFrame({}, (chart) => {
      chart.setDataTimeframe('1d');
      chart.addIndicator('obv', {}, 'bottom', { scale: 'left' });
      chart.applyIndicatorSetup([
        ...chart.getIndicatorSetup(),
        { id: 'sma', instanceId: 'hourly', params: { period: 5 }, intervals: { minutes: [1, 59], hours: [1, 24], days: false, weeks: false, months: false } },
      ]);
    });
    const drawn = staticFrame({
      timeframe: '1d',
      indicators: [
        { id: 'obv', scale: 'left' },
        { id: 'sma', params: { period: 5 }, intervals: { minutes: [1, 59], hours: [1, 24], days: false, weeks: false, months: false } },
      ],
    });
    expect(firstDifference(drawn, onPage)).toBeNull();
  });

  it('with drawings and signal markers on it', async () => {
    const drawings = [
      { id: 'd1', type: 'trendLine' as const, anchors: [{ time: bars[20].time, price: 100 }, { time: bars[90].time, price: 128 }], style: { color: '#ff8800', lineWidth: 2 }, visible: true, locked: false },
      { id: 'd2', type: 'horizontalLine' as const, anchors: [{ time: bars[60].time, price: 112 }], style: { color: '#2266ff', lineWidth: 1 }, visible: true, locked: false },
    ];
    const markers = [
      { id: 'm1', time: bars[40].time, price: bars[40].low, direction: 'long' as const, confidence: 0.8, source: 'test', label: 'Buy' },
      { id: 'm2', time: bars[80].time, price: bars[80].high, direction: 'short' as const, confidence: 0.6, source: 'test', label: 'Sell' },
    ];
    const onPage = await chartFrame({}, (chart) => {
      chart.setDrawings(drawings as never);
      chart.setSignalMarkers(markers);
    });
    expect(firstDifference(staticFrame({ drawings: drawings as never, markers }), onPage)).toBeNull();
    expect(firstDifference(staticFrame({ drawings: drawings as never }), onPage)).not.toBeNull();
    expect(firstDifference(staticFrame({ markers }), onPage)).not.toBeNull();
  });

  it('in a look of the caller’s: style keys, square tags, a time format, the high and the low marked', async () => {
    const options = {
      overrides: { 'grid.vertical.visible': false, 'series.candlestick.upColor': '#00aa00' },
      grid: { hLineColor: '#334455' },
      shapes: { tagRadius: 9 },
      highLowLines: true,
      sessionBreaks: { visible: true, color: '#aa0000' },
      timeFormatter: (time: number) => `t${Math.round(time / 86_400_000)}`,
    } as const;
    const onPage = await chartFrame(options, () => undefined);
    const drawn = staticFrame(options);
    expect(firstDifference(drawn, onPage)).toBeNull();
    expect(firstDifference(staticFrame({}), onPage)).not.toBeNull();
    for (const key of ['overrides', 'shapes', 'highLowLines', 'timeFormatter'] as const) {
      const { [key]: _left, ...rest } = options;
      expect(firstDifference(staticFrame(rest), onPage), key).not.toBeNull();
    }
  });

  it('with a drawing whose label would lie under the legend: it keeps clear of it on the only frame there is', async () => {
    // The price at the legend's second row, read off a chart of the same bars.
    const probe = new Chart(sizedHost(WIDTH, HEIGHT), { features: STILL });
    probe.setData(bars);
    probe.fitContent();
    const price = yToPrice(24, (probe as unknown as { viewport: { getState(): Parameters<typeof yToPrice>[1] } }).viewport.getState());
    probe.destroy();
    const drawings = [
      { id: 'top', type: 'horizontalLine' as const, anchors: [{ time: bars[60].time, price }], style: { color: '#2266ff', lineWidth: 1 }, visible: true, locked: false },
    ];
    const onPage = await chartFrame({}, (chart) => chart.setDrawings(drawings as never));
    expect(firstDifference(staticFrame({ drawings: drawings as never }), onPage)).toBeNull();
  });

  it('with an indicator, a chart type and an overlay of the caller’s own', async () => {
    const midpoint = defineIndicator({
      id: 'midpoint',
      name: 'Midpoint',
      placement: 'overlay',
      inputs: { period: { default: 5, kind: 'int', min: 1 } },
      plots: [{ key: 'mid', title: 'Mid', color: 0 }],
      calculate: ({ bars: series, inputs, ta }) => ({ mid: ta.sma(series.close, inputs.period) }),
    });
    const plugins: ChartPlugin[] = [
      { kind: 'indicator', plugin: midpoint },
      // Every other bar, drawn as candles.
      { kind: 'chartType', plugin: { descriptor: { type: 'everyOther', name: 'Every other' }, createRenderer: () => new CandlestickRenderer(), transform: (data) => data.filter((_, i) => i % 2 === 0) } },
      {
        kind: 'overlay',
        plugin: {
          descriptor: { id: 'stamp', name: 'Stamp', layer: 'main' },
          render: (c, { viewport }) => {
            c.fillStyle = '#123456';
            c.fillRect(viewport.chartRect.x + 10, viewport.chartRect.y + 10, 30, 12);
          },
        },
      },
    ];
    const chartType = 'everyOther' as never;
    const onPage = await chartFrame({ plugins, chartType }, (chart) => void chart.addIndicator('midpoint' as never, { period: 4 } as never));
    const drawn = staticFrame({ plugins, chartType, indicators: [{ id: 'midpoint', params: { period: 4 } }] });
    expect(firstDifference(drawn, onPage)).toBeNull();
    expect(drawn.some((paint) => paint.includes('fillStyle=#123456'))).toBe(true);
    expect(firstDifference(staticFrame({ plugins, indicators: [{ id: 'midpoint', params: { period: 4 } }] }), onPage)).not.toBeNull();
  });
});
