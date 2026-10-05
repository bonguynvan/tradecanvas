import type { Chart, DataAdapter, OHLCBar } from '@tradecanvas/chart';
import type { ChartWidget, ChartWidgetGrid, ChartWidgetGridOptions, ChartWidgetOptions, WidgetMessages, WidgetUIPreset } from '@tradecanvas/chart/widget';
import type { SiteMessages } from './i18n/messages';
import { generateBars } from './sampleData';

/** What the Feature Lab hands each scene. */
export interface SceneEnv {
  /** A fresh live Binance adapter. */
  binance: () => DataAdapter;
  /** A Binance adapter whose history requests take `latencyMs` longer. */
  slowBinance: (latencyMs: number) => DataAdapter;
  /** Classes from `@tradecanvas/chart`, loaded on demand. */
  lib: typeof import('@tradecanvas/chart');
  /** The language picked above the chart, for scenes with `languages`. */
  language?: { code: string; numberLocale: string; messages: WidgetMessages };
  /** The look picked above the chart, for scenes with `looks`. */
  look?: WidgetUIPreset;
}

/** A scene's title, figure ("40 tools"), blurb and tips live in the site's strings under this id. */
export type SceneId = keyof SiteMessages['scenes'];

export interface FeatureScene {
  id: SceneId;
  code: string;
  options: (env: SceneEnv) => ChartWidgetOptions;
  /** Static base series (no adapter); regenerated per symbol on switches. */
  data?: (symbol: string) => OHLCBar[];
  /** Shows a language picker above the chart; the scene reads `env.language`. */
  languages?: boolean;
  /** Shows a look picker above the chart (it calls `setUI`); the scene reads `env.look`. */
  looks?: boolean;
  /** Shows a Canvas 2D / WebGL picker above the chart (it calls `setRenderer` and times a pan). */
  renderers?: boolean;
  /** Runs once the first bars are on the chart. */
  setup?: (widget: ChartWidget, chart: Chart, env: SceneEnv) => void | Promise<void>;
  /** Several charts at once (ChartWidgetGrid) instead of one widget; `options` go to every chart. */
  grid?: (env: SceneEnv) => Omit<ChartWidgetGridOptions, 'widget' | 'onChartAdd'>;
  /** For a grid: runs once the charts have their bars. */
  gridSetup?: (grid: ChartWidgetGrid, env: SceneEnv) => void | Promise<void>;
}

const HOUR = 3_600_000;

/** Order books in the heatmap scene: one per 1-minute bar, 40 levels a side. */
const HEATMAP_BOOKS = 240;
const HEATMAP_LEVELS = 40;
/** Every this many price steps, a wall of resting size that stays put over time. */
const WALL_EVERY = 23;

/** Order books around a price, on a fixed grid of `step`, with walls that stay at their prices. */
function bookRecorder(step: number) {
  let state = 7;
  const rand = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const side = (mid: number, dir: 1 | -1) =>
    Array.from({ length: HEATMAP_LEVELS }, (_, i) => {
      const tick = Math.round(mid / step) + dir * (i + 1);
      return { price: tick * step, volume: 5 + rand() * 40 + (tick % WALL_EVERY === 0 ? 260 : 0) };
    });
  return (mid: number) => ({ bids: side(mid, -1), asks: side(mid, 1) });
}

/** Extreme bar in `[from, to)`: the highest high or the lowest low, as an anchor. */
export function swing(data: OHLCBar[], from: number, to: number, kind: 'high' | 'low'): { time: number; price: number } {
  let best = data[from];
  for (let i = from; i < to; i++) {
    const b = data[i];
    if (kind === 'high' ? b.high > best.high : b.low < best.low) best = b;
  }
  return { time: best.time, price: kind === 'high' ? best.high : best.low };
}

/** Alternating swing anchors over `count` equal segments ending `endOffset` bars from the end. */
function swings(data: OHLCBar[], span: number, endOffset: number, count: number, first: 'high' | 'low') {
  const end = data.length - endOffset;
  const start = end - span;
  const seg = span / count;
  return Array.from({ length: count }, (_, i) => {
    const kind = (i % 2 === 0) === (first === 'low') ? 'low' : 'high';
    return swing(data, Math.round(start + i * seg), Math.round(start + (i + 1) * seg), kind);
  });
}

export const FEATURE_SCENES: FeatureScene[] = [
  {
    id: 'drawings',
    code: `chart.addDrawing({
  type: 'riskReward',               // Long/Short Position
  anchors: [entry, stop],           // { time, price } each
  options: { accountSize: 10_000, risk: 1, rewardRatio: 2 },
})
chart.addDrawingAlert(trendLine, { condition: 'crossing' })
chart.groupDrawings([fib, note], 'Swing')`,
    options: () => ({ symbol: 'DEMO', symbols: ['DEMO', 'ALPHA', 'BETA'], timeframe: '1h' }),
    data: (symbol) => generateBars(600, symbol, HOUR, 240),
    setup: (_widget, chart) => {
      const data = chart.getData();
      if (data.length < 120) return;
      const n = data.length;
      // A retracement of a swing in the middle of the view, its high noted.
      const [low, high] = swings(data, 22, 44, 2, 'low');
      const fib = chart.addDrawing({
        type: 'fibRetracement',
        anchors: [low, high],
        options: { extendLeft: false, extendRight: false, labelPosition: 'right' },
      });
      const note = chart.addDrawing({ type: 'note', anchors: [high], style: { text: 'Swing high: watch the 0.618' } });
      if (fib && note) chart.groupDrawings([fib, note], 'Swing');
      // A trend line under the lows, with an alert on it.
      const line = chart.addDrawing({
        type: 'trendLine',
        anchors: [swing(data, n - 80, n - 55, 'low'), swing(data, n - 30, n - 8, 'low')],
        options: { extendRight: true },
      });
      if (line) chart.addDrawingAlert(line, { condition: 'crossing', message: 'Trend line crossed' });
      // A long position, sized for a 10 000 account risking 1%.
      const entry = data[n - 22];
      chart.addDrawing({
        type: 'riskReward',
        anchors: [
          { time: entry.time, price: entry.close },
          { time: data[n - 3].time, price: entry.close - (high.price - low.price) * 0.2 },
        ],
        options: { accountSize: 10_000, risk: 1, rewardRatio: 2 },
      });
    },
  },
  {
    id: 'indicators',
    code: `chart.addIndicator('bb', { period: 20, stdDev: 2 })
const rsi = chart.addIndicator('rsi')
chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') })
chart.addIndicator('macd')`,
    options: (env) => ({
      symbol: 'BTCUSDT',
      timeframe: '15m',
      adapter: env.binance(),
      onReady: (chart) => {
        chart.addIndicator('bb', {});
        chart.addIndicator('ema', {});
        const rsi = chart.addIndicator('rsi', {});
        // RSI's own moving average, drawn in RSI's pane.
        if (rsi) chart.addIndicator('sma', { period: 9, source: `ind:${rsi}:value` });
        chart.addIndicator('macd', {});
      },
    }),
  },
  {
    id: 'trading',
    code: `const broker = new PaperExecutionAdapter({ markPrice })
chart.connectExecution(broker)
chart.placeOrderIntent({ side: 'buy', type: 'limit', price, quantity: 1,
  stopLoss, takeProfit, timeInForce: 'gtc' })
chart.reversePositionIntent(position.id)     // or ⇅ on the line
chart.on('executionFill', (e) => e.payload.pnl)
widget.toggleAccountPanel(true)`,
    options: () => ({ symbol: 'DEMO', symbols: ['DEMO', 'ALPHA'], timeframe: '15m', trading: true }),
    data: (symbol) => generateBars(500, symbol, 15 * 60_000, 2500),
    setup: async (widget, chart, env) => {
      const data = chart.getData();
      const last = data[data.length - 1]?.close;
      if (!last) return;
      const broker = new env.lib.PaperExecutionAdapter({ markPrice: last });
      chart.connectExecution(broker);
      // A short closed at a profit, for the history tab and the fill marks.
      broker.setMarkPrice(last * 1.012);
      await broker.placeOrder({ side: 'sell', type: 'market', price: last * 1.012, quantity: 1 });
      const short = broker.getPositions()[0];
      broker.setMarkPrice(last);
      if (short) await broker.closePosition({ positionId: short.id });
      await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 2 });
      const pos = broker.getPositions()[0];
      if (pos) await broker.modifyPosition({ positionId: pos.id, stopLoss: last * 0.975, takeProfit: last * 1.04 });
      chart.placeOrderIntent({ side: 'buy', type: 'limit', price: last * 0.985, quantity: 1 });
      chart.placeOrderIntent({ side: 'sell', type: 'limit', price: last * 1.02, quantity: 1 });
      widget.toggleAccountPanel(true);
    },
  },
  {
    id: 'workspace',
    code: `const workspace = new ChartWidgetGrid(host, {
  layout: '1x2',
  cells: [{ symbol: 'DEMO' }, { symbol: 'ALPHA', timeframe: '1h' }],
  sync: { crosshair: true, interval: false, symbol: false },
})
workspace.setSync({ time: true })
await workspace.getLayoutSession()?.saveAs('Pair')`,
    options: () => ({ symbols: ['DEMO', 'ALPHA', 'BETA', 'GAMMA'], timeframe: '15m', statusBar: false }),
    data: (symbol) => generateBars(500, symbol, 15 * 60_000, 2500),
    grid: () => ({
      layout: '1x2',
      layoutChoices: ['1x1', '1x2', '2x1', '2x2'],
      cells: [{ symbol: 'DEMO' }, { symbol: 'ALPHA', timeframe: '1h' }, { symbol: 'BETA' }, { symbol: 'GAMMA', timeframe: '4h' }],
      sync: { crosshair: true },
    }),
    gridSetup: (grid) => {
      grid.getWidget(0)?.getChart().addIndicator('ema', { period: 21 });
      grid.getWidget(1)?.getChart().addIndicator('rsi', { period: 14 });
    },
  },
  {
    id: 'navigation',
    code: `chart.setVisibleRangePreset('6M')    // 1D 5D 1M 3M 6M YTD 1Y 5Y All
chart.goToTime(Date.UTC(2025, 0, 1))
chart.setInvertScale(true)
chart.addIndicator('ema', { period: 50 })
chart.addIndicator('ema', { period: 200 })   // as many as you like
const layout = chart.saveState()             // indicators, styles, alerts, drawings`,
    options: () => ({
      symbol: 'DEMO',
      symbols: ['DEMO', 'ALPHA'],
      timeframe: '1d',
      onReady: (chart) => {
        chart.addIndicator('ema', { period: 50 });
        chart.addIndicator('ema', { period: 200 });
      },
    }),
    data: (symbol) => generateBars(1500, symbol, 24 * HOUR, 140),
    setup: (_widget, chart) => {
      chart.setVisibleRangePreset('6M');
    },
  },
  {
    id: 'history',
    code: `// Adapters with fetchHistoryBefore page by themselves
chart.connect({ adapter: new BinanceAdapter(), symbol: 'BTCUSDT', timeframe: '1m', historyPageSize: 500 })

// Or page your own source
chart.setHistoryLoader((before, limit) => api.bars({ end: before, limit }))
chart.on('historyLoad', (e) => console.log(e.payload.state, e.payload.count))

// Any interval: the feed's closest timeframe is resampled
await chart.setTimeframe('7m')`,
    options: (env) => ({
      symbol: 'BTCUSDT',
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      timeframe: '1m',
      adapter: env.binance(),
      historyLimit: 300,
      historyPageSize: 500,
    }),
    setup: (_widget, chart) => {
      // Everything loaded fits on screen, so the next page starts loading at once.
      chart.fitContent();
    },
  },
  {
    id: 'replay',
    code: `widget.toggleReplay()             // pick a start bar on the chart
widget.replayFrom(220)            // or start at a bar directly
chart.replayStart({ startIndex: 220, paused: true, interval: 1000, speed: 5 })
chart.replayStart({ steps: bars15m, startIndex: 220 })  // each hour forms in 15m steps
chart.replayStop()                // back to the live series`,
    options: () => ({
      symbol: 'DEMO',
      symbols: ['DEMO'],
      timeframe: '1h',
      onReady: (chart) => chart.addIndicator('ema', {}),
    }),
    // 15-minute bars shown as hours: the replay bar can step through them.
    data: (symbol) => generateBars(1600, symbol, HOUR / 4, 120),
    setup: (widget, chart) => {
      widget.replayFrom(Math.floor(chart.getData().length * 0.55));
    },
  },
  {
    id: 'compare',
    code: `widget.addCompareSymbol('ETHUSDT', 'scale')   // its price, on a scale of its own
widget.addCompareSymbol('ETHUSDT', 'ratio')   // BTC ÷ ETH, in a pane

// On a bare Chart: the indicators ask for the bars they need
chart.addIndicator('spread', { symbol: 'ETHUSDT', mode: 'ratio' })
chart.on('symbolSeriesRequest', async ({ payload }) =>
  chart.setSymbolSeries(payload.symbol, await adapter.fetchHistory(payload.symbol, '1h', 1000)))`,
    options: (env) => ({
      symbol: 'BTCUSDT',
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
      timeframe: '1h',
      adapter: env.binance(),
      chartOptions: { highLowLines: true },
    }),
    setup: async (widget) => {
      await widget.addCompareSymbol('ETHUSDT', 'scale');
      await widget.addCompareSymbol('ETHUSDT', 'ratio');
    },
  },
  {
    id: 'bonds',
    code: `new ChartWidget(host, {
  chartOptions: {
    chartType: 'hiLo',
    priceFormat: { denominator: 32, subDenominator: 2 },  // 110'165 = 110 and 16½ 32nds
  },
})
chart.setSymbolInfo({ symbol: 'TNOTE', timezone: 'America/Chicago', sessions: [{ start: '07:20', end: '14:00' }] })
chart.setExtendedHours(false)   // the regular session only`,
    options: () => ({
      symbol: 'TNOTE',
      symbols: ['TNOTE'],
      timeframe: '30m',
      chartOptions: { chartType: 'hiLo', priceFormat: { denominator: 32, subDenominator: 2 } },
    }),
    data: (symbol) => generateBars(1500, symbol, HOUR / 2, 110),
    setup: (_widget, chart) => {
      chart.setSymbolInfo({ symbol: 'TNOTE', description: '10-year note', timezone: 'America/Chicago', sessions: [{ start: '07:20', end: '14:00' }] });
    },
  },
  {
    id: 'subcent',
    code: `import { ChartWidget } from '@tradecanvas/chart/widget'
import { ja } from '@tradecanvas/chart/widget/locales'

new ChartWidget(host, {
  symbol: 'PEPEUSDT',
  locale: 'ja',
  messages: ja,                          // only the languages you import ship
  chartOptions: { numberLocale: 'ja-JP' },
})`,
    languages: true,
    options: (env) => ({
      symbol: 'PEPEUSDT',
      symbols: ['PEPEUSDT', 'SHIBUSDT', 'BONKUSDT', 'FLOKIUSDT'],
      timeframe: '5m',
      adapter: env.binance(),
      locale: env.language?.code ?? 'vi',
      messages: env.language?.messages,
      watchlist: true,
      chartOptions: { numberLocale: env.language?.numberLocale ?? 'vi-VN' },
    }),
  },
  {
    id: 'looks',
    code: `new ChartWidget(host, { ui: 'terminal' })   // 'studio' (default) · 'terminal' · 'capsule'

widget.setUI({
  preset: 'studio',
  radius: { md: 10 },              // buttons and fields follow the scale
  components: { dialog: 20 },
  density: 'compact',
  font: { family: "'Manrope', sans-serif", labelCase: 'uppercase' },
  toolbar: 'floating',             // the toolbar as an island
  active: 'solid',                 // tint · solid · underline
  tagRadius: 999,                  // pill price tags on the chart
})`,
    looks: true,
    options: (env) => ({
      symbol: 'DEMO',
      symbols: ['DEMO', 'ALPHA', 'BETA'],
      timeframe: '1h',
      ui: env.look ?? 'studio',
      chartOptions: { highLowLines: true },
      onReady: (chart) => {
        chart.addIndicator('ema', { period: 21 });
        chart.addIndicator('rsi', { period: 14 });
      },
    }),
    data: (symbol) => generateBars(900, symbol, HOUR, 120),
  },
  {
    id: 'markets',
    code: `new ChartWidget(host, {
  adapter: new BinanceAdapter(),        // quotes for every row
  watchlist: {
    lists: [
      { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'] },
      { id: 'memes', name: 'Memes', symbols: ['DOGEUSDT', 'PEPEUSDT', 'SHIBUSDT'] },
    ],
  },
})
widget.toggleSymbolInfo(true)           // price, market status, the day, hours
await widget.setTimeframe('100T')       // a bar per 100 trades`,
    options: (env) => ({
      symbol: 'BTCUSDT',
      symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'SHIBUSDT'],
      timeframe: '1m',
      adapter: env.binance(),
      watchlist: {
        lists: [
          { id: 'majors', name: 'Majors', symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'] },
          { id: 'memes', name: 'Memes', symbols: ['DOGEUSDT', 'PEPEUSDT', 'SHIBUSDT'] },
        ],
      },
    }),
    setup: (widget) => {
      widget.toggleSymbolInfo(true);
    },
  },
  {
    id: 'bigdata',
    code: `widget.setData(bars)          // the finest series you have
widget.setTimeframe('1h')     // resampled locally, no refetch
await chart.setRenderer('webgl')  // drawn on the GPU`,
    renderers: true,
    options: () => ({
      symbol: 'DEMO',
      symbols: ['DEMO'],
      timeframe: '1m',
      onReady: (chart) => {
        for (const id of ['bb', 'ema', 'rsi', 'macd']) chart.addIndicator(id, {});
      },
    }),
    data: (symbol) => generateBars(200_000, symbol, 60_000, 30_000),
  },
  {
    id: 'heatmap',
    code: `chart.setDepthHeatmapVisible(true)
for (const { time, book } of recordedBooks) {
  chart.pushDepthSnapshot(book, time)
}
await chart.setRenderer('webgl')  // cells on the GPU`,
    renderers: true,
    options: () => ({
      symbol: 'DEMO',
      symbols: ['DEMO'],
      timeframe: '1m',
      // The books are stamped at 1-minute bars.
      timeframes: ['1m'],
      customTimeframes: false,
    }),
    data: (symbol) => generateBars(2_000, symbol, 60_000, 30_000),
    setup: (_widget, chart) => {
      const bars = chart.getData().slice(-HEATMAP_BOOKS);
      if (bars.length === 0) return;
      const book = bookRecorder(bars[0].close * 0.0004);
      chart.setDepthHeatmapConfig({ capacity: HEATMAP_BOOKS });
      for (const bar of bars) chart.pushDepthSnapshot(book(bar.close), bar.time);
      chart.setDepthHeatmapVisible(true);
    },
  },
  {
    id: 'switching',
    code: `// built in: a 200 ms grace period before the loading veil,
// superseded requests dropped, stale sockets detached
await widget.setSymbol('ETHUSDT')`,
    options: (env) => ({
      symbol: 'ETHUSDT',
      symbols: ['ETHUSDT', 'BTCUSDT', 'SOLUSDT', 'BNBUSDT'],
      timeframe: '15m',
      adapter: env.slowBinance(1200),
      watchlist: true,
    }),
  },
];
