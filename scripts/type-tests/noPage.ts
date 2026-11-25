// The price chart drawn with no page takes what a chart on a page gives: compiled with the
// skill's examples (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { Chart, defineIndicator, renderPriceChart, type OHLCBar, type PriceChartIndicator, type PriceChartOptions } from '@tradecanvas/chart';

declare const chart: Chart;
declare const bars: OHLCBar[];
declare const ctx: CanvasRenderingContext2D;
declare const offscreen: OffscreenCanvasRenderingContext2D;
const size = { width: 800, height: 400 };

// A chart set up in the browser goes in as it is: its indicators, its drawings.
const setup: PriceChartIndicator[] = chart.getIndicatorSetup();
const still: PriceChartOptions = { data: chart.getData(), indicators: chart.getIndicatorSetup(), drawings: chart.getDrawings() };
renderPriceChart(ctx, still, size);
renderPriceChart(offscreen, { data: bars, chartType: 'heikinAshi', theme: 'light', features: { volume: false, legend: false } }, size);

// By hand, a drawing and a mark are what `addDrawing` and `addSignalMarker` take; other symbols' bars go with the indicators that read them.
renderPriceChart(
  ctx,
  {
    data: bars,
    indicators: [{ id: 'rsi', instanceId: 'momentum' }, { id: 'compareSymbol', params: { symbol: 'ETHUSDT' } }],
    drawings: [{ type: 'horizontalLine', anchors: [{ time: 0, price: 70 }], paneId: 'momentum', style: { color: '#2266ff' } }],
    markers: [{ time: 0, price: 1, direction: 'long', confidence: 1, source: 'strategy' }],
    symbolSeries: { ETHUSDT: bars },
    timeZone: 'exchange',
  },
  size,
);

// An indicator of your own, as a plugin.
const mid = defineIndicator({
  id: 'mid',
  name: 'Mid',
  placement: 'overlay',
  plots: [{ key: 'mid', title: 'Mid', color: 0 }],
  calculate: ({ bars: series, ta }) => ({ mid: ta.sma(series.close, 5) }),
});
renderPriceChart(ctx, { data: bars, indicators: [{ id: 'mid' }], plugins: [{ kind: 'indicator', plugin: mid }] }, size);

// @ts-expect-error The bars are not left out.
renderPriceChart(ctx, { symbol: 'BTCUSDT' }, size);
// @ts-expect-error What only a chart on a page has is not an option of a still one.
renderPriceChart(ctx, { data: bars, crosshair: { mode: 'magnet' } }, size);
// @ts-expect-error An indicator is named by its id.
renderPriceChart(ctx, { data: bars, indicators: [{ params: { period: 5 } }] }, size);
// @ts-expect-error A drawing is of a tool, by its type.
renderPriceChart(ctx, { data: bars, drawings: [{ anchors: [{ time: 0, price: 1 }] }] }, size);
// @ts-expect-error A feature of a chart on a page is none of a still one's.
renderPriceChart(ctx, { data: bars, features: { panning: false } }, size);
export { setup };
