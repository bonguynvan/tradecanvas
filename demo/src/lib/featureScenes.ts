import type { Chart, DataAdapter, OHLCBar } from '@tradecanvas/chart';
import type { ChartWidget, ChartWidgetOptions, WidgetMessages } from '@tradecanvas/chart/widget';
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
  /** Runs once the first bars are on the chart. */
  setup?: (widget: ChartWidget, chart: Chart, env: SceneEnv) => void | Promise<void>;
}

const HOUR = 3_600_000;

/** Extreme bar in `[from, to)`: the highest high or the lowest low, as an anchor. */
function swing(data: OHLCBar[], from: number, to: number, kind: 'high' | 'low'): { time: number; price: number } {
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
  type: 'xabcdPattern',
  anchors: [x, a, b, c, d], // { time, price } each
})
chart.setDrawingTool('headAndShoulders') // or let the user draw`,
    options: () => ({ symbol: 'DEMO', symbols: ['DEMO', 'ALPHA', 'BETA'], timeframe: '1h' }),
    data: (symbol) => generateBars(600, symbol, HOUR, 240),
    setup: (_widget, chart) => {
      const data = chart.getData();
      if (data.length < 120) return;
      const [x, a, b, c, d] = swings(data, 50, 58, 5, 'low');
      chart.addDrawing({ type: 'xabcdPattern', anchors: [x, a, b, c, d] });
      chart.addDrawing({ type: 'headAndShoulders', anchors: swings(data, 49, 4, 7, 'low') });
      const last = data[data.length - 1];
      chart.addDrawing({ type: 'priceLabel', anchors: [{ time: last.time, price: last.close }] });
      chart.addDrawing({ type: 'infoLine', anchors: [x, d] });
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
chart.placeOrderIntent({ side: 'buy', type: 'limit', price, quantity: 1 })`,
    options: () => ({ symbol: 'DEMO', symbols: ['DEMO', 'ALPHA'], timeframe: '15m', trading: true }),
    data: (symbol) => generateBars(500, symbol, 15 * 60_000, 2500),
    setup: async (_widget, chart, env) => {
      const data = chart.getData();
      const last = data[data.length - 1]?.close;
      if (!last) return;
      const broker = new env.lib.PaperExecutionAdapter({ markPrice: last });
      chart.connectExecution(broker);
      await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 2 });
      const pos = broker.getPositions()[0];
      if (pos) await broker.modifyPosition({ positionId: pos.id, stopLoss: last * 0.975, takeProfit: last * 1.04 });
      chart.placeOrderIntent({ side: 'buy', type: 'limit', price: last * 0.985, quantity: 1 });
      chart.placeOrderIntent({ side: 'sell', type: 'limit', price: last * 1.02, quantity: 1 });
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
chart.replayStop()                // back to the live series`,
    options: () => ({
      symbol: 'DEMO',
      symbols: ['DEMO'],
      timeframe: '1h',
      onReady: (chart) => chart.addIndicator('ema', {}),
    }),
    data: (symbol) => generateBars(400, symbol, HOUR, 120),
    setup: (widget, chart) => {
      widget.replayFrom(Math.floor(chart.getData().length * 0.55));
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
    id: 'bigdata',
    code: `widget.setData(bars)          // the finest series you have
widget.setTimeframe('1h')     // resampled locally, no refetch`,
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
