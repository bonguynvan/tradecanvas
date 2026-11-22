// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartOptions, DataSeries, PriceChartOptions } from '@tradecanvas/commons';
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

/** What a chart on a page is told to show once all is on it: every bar, unless a test names a range. */
const fitted = (chart: Chart): void => chart.fitContent();

/**
 * The frame a chart on a page draws for a picture of itself, as paints. It
 * is told what to show last, as a still chart is fitted last: a pane or a
 * scale added after would leave the bars fitted to a plot that is gone.
 */
async function chartFrame(
  options: ChartOptions & { plugins?: ChartPlugin[] },
  setUp: (chart: Chart) => void,
  data: DataSeries = bars,
  view: (chart: Chart) => void = fitted,
): Promise<string[]> {
  const chart = new Chart(sizedHost(WIDTH, HEIGHT), { ...options, features: { ...STILL, ...options.features } });
  chart.setData(data);
  setUp(chart);
  view(chart);
  // Its first frames drawn: a legend drawn for the first time says how tall it is, and the frame after is the one that stands.
  await new Promise((resolve) => setTimeout(resolve, 80));
  const { ctx, paints } = painted(WIDTH, HEIGHT);
  ctx.fillStyle = chart.getTheme().background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  (chart as unknown as { engine: { renderTo(c: CanvasRenderingContext2D): void } }).engine.renderTo(ctx);
  chart.destroy();
  return paints;
}

function staticFrame(options: Omit<PriceChartOptions, 'data'>, data: DataSeries = bars): string[] {
  const { ctx, paints } = painted(WIDTH, HEIGHT);
  renderPriceChart(ctx, { ...options, data }, { width: WIDTH, height: HEIGHT });
  return paints;
}

/** Bars whose prices need a price scale wider than the one a chart starts with. */
const dear = bars.map((bar) => ({ ...bar, open: bar.open * 650, high: bar.high * 650, low: bar.low * 650, close: bar.close * 650, volume: bar.volume * 1e6 }));

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
    const onPage = await chartFrame(options, () => undefined, bars, (chart) => chart.setVisibleRange(range.from, range.to));
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
      chart.addIndicator('wma', { period: 12 }, 'bottom', { scale: 'left' });
      chart.applyIndicatorSetup([
        ...chart.getIndicatorSetup(),
        { id: 'sma', instanceId: 'hourly', params: { period: 5 }, intervals: { minutes: [1, 59], hours: [1, 24], days: false, weeks: false, months: false } },
      ]);
    });
    const drawn = staticFrame({
      timeframe: '1d',
      indicators: [
        { id: 'wma', params: { period: 12 }, scale: 'left' },
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

  it('in a look of paper and ink: the last price’s tag in its own colours, the indicators’ values outlined, the grid ruled where the bars’ periods begin', async () => {
    const overrides = {
      'lastPrice.labelBackground': '#fffdf5',
      'lastPrice.labelTextColor': '#1a1a1a',
      'axis.price.valueTagsOutlined': true,
      'grid.vertical.periodsOnly': true,
    } as const;
    // The values' tags are on: one on the price pane, one on a pane of its own, outlined on that pane's ground.
    const features = { indicatorValueLabels: true } as const;
    const onPage = await chartFrame({ overrides, features }, (chart) => {
      chart.addIndicator('sma', { period: 10 });
      chart.addIndicator('rsi');
    });
    const indicators = [{ id: 'sma', params: { period: 10 } }, { id: 'rsi' }];
    expect(firstDifference(staticFrame({ overrides, features, indicators }), onPage)).toBeNull();
    // Each key is seen in the frame: without it the frame is another.
    for (const key of Object.keys(overrides) as (keyof typeof overrides)[]) {
      const { [key]: _left, ...rest } = overrides;
      expect(firstDifference(staticFrame({ overrides: rest, features, indicators }), onPage), key).not.toBeNull();
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

  it('with prices that widen the price scale: the bars are fitted to the plot that is left', async () => {
    const onPage = await chartFrame({}, () => undefined, dear);
    expect(firstDifference(staticFrame({}, dear), onPage)).toBeNull();
    // The scale is wider than a chart's first: the two would be alike without it.
    expect(onPage.join(' ')).toMatch(/rect\(0,0,7[0-2]\d,/);
    const german = await chartFrame({ numberLocale: 'de-DE' }, () => undefined, dear);
    expect(firstDifference(staticFrame({ numberLocale: 'de-DE' }, dear), german)).toBeNull();
    const left = await chartFrame({}, (chart) => void chart.addIndicator('ema', { period: 8 }, 'bottom', { scale: 'left' }), dear);
    const onLeft = staticFrame({ indicators: [{ id: 'ema', params: { period: 8 }, scale: 'left' }] }, dear);
    expect(firstDifference(onLeft, left)).toBeNull();
    // A scale of its own at the left: the plot starts past it.
    expect(firstDifference(staticFrame({ indicators: [{ id: 'ema', params: { period: 8 } }] }, dear), left)).not.toBeNull();
    const range = { from: dear[30].time, to: dear[89].time };
    const part = await chartFrame({}, () => undefined, dear, (chart) => chart.setVisibleRange(range.from, range.to));
    expect(firstDifference(staticFrame({ visibleRange: range }, dear), part)).toBeNull();
  });

  it('from what a chart on a page gives of itself: its indicators and its drawings, one on a pane, go in as they are', async () => {
    let setup: PriceChartOptions['indicators'] = [];
    let drawings: PriceChartOptions['drawings'] = [];
    const onPage = await chartFrame({}, (chart) => {
      chart.addIndicator('ema', { period: 9 });
      const rsi = chart.addIndicator('rsi');
      chart.addIndicator('sma', { period: 5, source: `ind:${rsi}:rsi` });
      chart.addDrawing({ type: 'trendLine', anchors: [{ time: bars[20].time, price: 100 }, { time: bars[90].time, price: 128 }] });
      chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: bars[60].time, price: 60 }], paneId: rsi ?? undefined });
      setup = chart.getIndicatorSetup();
      drawings = chart.getDrawings();
    });
    expect(drawings).toHaveLength(2);
    const drawn = staticFrame({ indicators: setup, drawings });
    expect(firstDifference(drawn, onPage)).toBeNull();
    // The line on the pane is among them: without it the frame is another.
    expect(firstDifference(staticFrame({ indicators: setup, drawings: drawings.slice(0, 1) }), onPage)).not.toBeNull();
  });

  it('with drawings and marks written by hand, as `addDrawing` and `addSignalMarker` take them', async () => {
    const line = { type: 'trendLine' as const, anchors: [{ time: bars[20].time, price: 100 }, { time: bars[90].time, price: 128 }], style: { color: '#ff8800' } };
    const mark = { time: bars[40].time, price: bars[40].low, direction: 'long' as const, confidence: 0.8, source: 'test' };
    const onPage = await chartFrame({}, (chart) => {
      chart.addDrawing(line);
      chart.addSignalMarker(mark);
    });
    expect(firstDifference(staticFrame({ drawings: [line], markers: [mark] }), onPage)).toBeNull();
  });

  it('with another symbol’s bars, for the indicators that read them', async () => {
    const other = bars.map((bar) => ({ ...bar, open: bar.open * 0.5 + 20, high: bar.high * 0.5 + 21, low: bar.low * 0.5 + 19, close: bar.close * 0.5 + 20 }));
    const onPage = await chartFrame({}, (chart) => {
      chart.setSymbolSeries('OTHER', other);
      chart.addIndicator('compareSymbol', { symbol: 'OTHER' });
      chart.addIndicator('correlation', { symbol: 'OTHER' });
    });
    const indicators = [{ id: 'compareSymbol', params: { symbol: 'OTHER' } }, { id: 'correlation', params: { symbol: 'OTHER' } }];
    expect(firstDifference(staticFrame({ indicators, symbolSeries: { OTHER: other } }), onPage)).toBeNull();
    expect(firstDifference(staticFrame({ indicators }), onPage)).not.toBeNull();
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
