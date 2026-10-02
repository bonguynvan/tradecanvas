import type { Chart, DataAdapter, OHLCBar } from '@tradecanvas/chart';
import type { ChartWidget, ChartWidgetOptions } from '@tradecanvas/chart/widget';
import { generateBars } from './sampleData';

/** What the Feature Lab hands each scene. */
export interface SceneEnv {
  /** A fresh live Binance adapter. */
  binance: () => DataAdapter;
  /** A Binance adapter whose history requests take `latencyMs` longer. */
  slowBinance: (latencyMs: number) => DataAdapter;
  /** Classes from `@tradecanvas/chart`, loaded on demand. */
  lib: typeof import('@tradecanvas/chart');
}

export interface FeatureScene {
  id: string;
  title: string;
  /** Short figure shown next to the title, e.g. "40 tools". */
  stat: string;
  blurb: string;
  tryThis: string[];
  code: string;
  options: (env: SceneEnv) => ChartWidgetOptions;
  /** Static base series (no adapter); regenerated per symbol on switches. */
  data?: (symbol: string) => OHLCBar[];
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
    title: 'Drawing tools',
    stat: '40 tools',
    blurb:
      'Trend, info and angle lines, Fibonacci channels and fans, Andrews and Schiff pitchforks, harmonic XABCD, head-and-shoulders, cycles, measuring boxes. Magnet snapping, undo/redo, JSON save/restore.',
    tryThis: [
      'Open the zigzag (Patterns) group in the left toolbar and place an ABCD',
      'Click a drawing, drag its handles, then Ctrl+Z',
      'Drawings stay anchored to time, so they survive timeframe switches',
    ],
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
    title: 'Indicators',
    stat: '85 built-in',
    blurb:
      'Overlays and panes computed in-house, zero math dependencies. Live ticks recompute only the forming bar — 0.001 ms per tick with four indicators on 100k bars.',
    tryThis: [
      'Press the Indicators button (or Ctrl+K) and search any of the 85',
      'Click an indicator name in the legend: inputs, colours and levels',
      'Set a moving average’s Source to another indicator’s line',
      'Drag the line between panes to resize them',
    ],
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
    title: 'Trading',
    stat: 'paper broker',
    blurb:
      'Positions with draggable stop-loss and take-profit, working orders, brackets and Long/Short tools, routed through an ExecutionAdapter — here the bundled paper broker.',
    tryThis: [
      'Drag the SL / TP lines of the open long — the broker updates them',
      'Drag a working order to a new price',
      'Use the Buy/Sell bracket buttons in the top toolbar',
    ],
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
    title: 'Ranges & layouts',
    stat: '1D … All',
    blurb:
      'Jump to a span or a date, flip the price scale, pin the timeframes you use, run the same indicator several times — and get it all back from a saved layout.',
    tryThis: [
      'Click 1M, 3M or 6M under the chart; Alt+G goes to a date',
      'Alt+I turns the price scale upside down; the log scale is in Settings',
      'Star a timeframe in the ▾ menu next to the timeframe buttons',
      'Turn on the ↻ button in the left toolbar to draw several lines in a row; Ctrl+C / Ctrl+V copies them',
    ],
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
    title: 'Scroll back in time',
    stat: 'paged history',
    blurb:
      'Older bars load as you drag toward the oldest one, a page at a time, and what is on screen stays put. Zoom out until every loaded bar fits: below a pixel per bar the candles merge per pixel column, so thousands of bars stay readable.',
    tryThis: [
      'Drag the chart to the right: a pill on the left shows older bars loading',
      'Scroll to zoom out, past a few hundred bars down to a quarter pixel per bar',
      'Click All under the chart to fit everything loaded so far',
      'Type 7 or 90 in the ▾ timeframe menu: Binance has neither, so the chart builds them from 1m and 30m bars',
    ],
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
    title: 'Bar replay',
    stat: 'scrubber',
    blurb:
      'Step through history bar by bar to practice reads without hindsight. Live data is held aside while you replay; the price scale fits every step.',
    tryThis: [
      'Press play, or step one bar at a time with Shift+→ / Shift+←',
      'Click any revealed bar to jump the cursor there',
      '“Back to realtime” returns to the live series',
    ],
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
    title: 'Sub-cent + Vietnamese',
    stat: 'i18n',
    blurb:
      'PEPE trades around 0.000004. Every label follows the price scale’s precision and the number locale, and the axis widens to fit — here with the Vietnamese UI.',
    tryThis: [
      'Hover: the crosshair pill shows full precision with a decimal comma',
      'Switch to SHIB or BONK in the watchlist on the right',
      'Pin an exact precision with chart.setMarket({ pricePrecision: 9 })',
    ],
    code: `new ChartWidget(host, {
  symbol: 'PEPEUSDT',
  locale: 'vi',
  chartOptions: { numberLocale: 'vi-VN' },
})`,
    options: (env) => ({
      symbol: 'PEPEUSDT',
      symbols: ['PEPEUSDT', 'SHIBUSDT', 'BONKUSDT', 'FLOKIUSDT'],
      timeframe: '5m',
      adapter: env.binance(),
      locale: 'vi',
      watchlist: true,
      chartOptions: { numberLocale: 'vi-VN' },
    }),
  },
  {
    id: 'bigdata',
    title: '200,000 bars',
    stat: 'performance',
    blurb:
      'Two hundred thousand 1-minute bars with four indicators. Rendering touches only the visible bars; coarser timeframes are resampled locally, behind a loading veil when that takes more than a few frames.',
    tryThis: [
      'Switch to 1H, 4H and back to 1m — timings appear under the chart',
      'Zoom all the way out and pan: frame cost stays flat',
      'Add another indicator and watch the switch time',
    ],
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
    title: 'Slow-network switching',
    stat: '+1.2 s latency',
    blurb:
      'Each history request here is delayed by 1.2 s. The previous chart stays on screen and is veiled only once a switch takes longer than 200 ms; rapid clicks never let a stale response win.',
    tryThis: [
      'Click several symbols quickly — only the last one lands',
      'Switch timeframe and watch the veil fade in, then out',
      'Compare with the Indicators scene: fast switches never flash',
    ],
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
