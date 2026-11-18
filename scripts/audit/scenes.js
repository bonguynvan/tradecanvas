// The chart in the states a screenshot of a dialog never shows, for the
// browser audit (scripts/audit-scenes.mjs): the price at an order with a
// quote on, a linked grid under the pointer, a replay, compares, Renko, the
// day's limits. Picked by `?scene=` and `?theme=`; the market is made up from
// a fixed seed and stops once loaded, so every run draws the same bars.
import { MockAdapter, PaperExecutionAdapter, MARKET_HOSE, MARKET_KRX } from '@tradecanvas/chart';
import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget';

/** A small seeded generator in place of Math.random: the same bars every time. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Math.random = seeded(20261101);

const PRICES = { BTCUSDT: 64200, ETHUSDT: 3150, SOLUSDT: 148, BNBUSDT: 585, VNM: 25.35, '005930': 72300 };
const HISTORY = 300;

const params = new URLSearchParams(location.search);
const scene = params.get('scene') ?? 'orderAtPrice';
const theme = params.get('theme') ?? 'dark';
// The widgets' look: `?ui=desk` (Print without it).
const ui = params.get('ui') ?? undefined;
const host = document.getElementById('host');

const market = (symbol) => new MockAdapter({ basePrice: PRICES[symbol] ?? 100, volatility: 0.9, tickInterval: 60_000, historySize: HISTORY });

const loaded = (chart) => new Promise((resolve) => {
  const check = () => (chart.getData().length > 50 ? resolve() : setTimeout(check, 30));
  check();
});

/** A widget whose feed stops once its bars are in, so nothing moves while it is looked at. */
async function widget(options = {}) {
  const symbol = options.symbol ?? 'BTCUSDT';
  const w = new ChartWidget(host, { symbol, timeframe: '5m', theme, ui, adapter: market(symbol), historyLimit: HISTORY, ...options });
  const chart = w.getChart();
  await loaded(chart);
  chart.disconnectStream();
  return { widget: w, chart };
}

const lastClose = (chart) => chart.getData().at(-1).close;

const SCENES = {
  /** A position and orders around the last price, with the bid and ask on: lines and tags meet there. */
  async orderAtPrice() {
    const s = await widget({ trading: true });
    const last = lastClose(s.chart);
    const broker = new PaperExecutionAdapter({ markPrice: last });
    s.chart.connectExecution(broker);
    await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 2 });
    const pos = broker.getPositions()[0];
    await broker.modifyPosition({ positionId: pos.id, stopLoss: last * 0.994, takeProfit: last * 1.006 });
    await broker.placeOrder({ side: 'sell', type: 'limit', price: last * 1.0006, quantity: 1 });
    s.chart.setBidAsk({ bid: last * 0.9998, ask: last * 1.0003 });
    s.chart.setHighLowLines(true);
    return s;
  },

  /** Four linked charts; the audit puts the pointer on the first. */
  async linkedGrid() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    const grid = new ChartWidgetGrid(host, {
      layout: '2x2',
      sync: { crosshair: true, interval: false, symbol: false },
      adapter: (cell) => market(symbols[cell] ?? 'BTCUSDT'),
      widget: { theme, historyLimit: HISTORY },
      cells: symbols.map((symbol) => ({ symbol, timeframe: '5m' })),
    });
    await new Promise((r) => setTimeout(r, 300));
    const charts = grid.getWidgets().map((w) => w.getChart());
    await Promise.all(charts.map(loaded));
    for (const c of charts) c.disconnectStream();
    return { grid, chart: charts[0], charts };
  },

  /** A replay paused part of the way, its bar showing. */
  async replay() {
    const s = await widget();
    s.chart.addIndicator('bb');
    const length = s.chart.getData().length;
    s.widget.replayFrom(length - 120, false);
    s.chart.replaySeekToBar(length - 80);
    s.chart.replayPause();
    return s;
  },

  /**
   * A replay over a chart with a live order book and its heatmap: books
   * recorded for the last bars, and a live book coming in while the replay
   * steps. The replayed bars carry none of today's book, and the book at the
   * plot's edge waits for the replay to end.
   */
  async replayDepth() {
    const s = await widget({ features: { depth: true } });
    const bars = s.chart.getData();
    const bookAt = (mid) => ({
      bids: Array.from({ length: 30 }, (_, i) => ({ price: mid - (i + 1) * mid * 0.0004, volume: 2 + ((i * 7) % 11) })),
      asks: Array.from({ length: 30 }, (_, i) => ({ price: mid + (i + 1) * mid * 0.0004, volume: 2 + ((i * 5) % 13) })),
    });
    s.chart.setDepthHeatmapVisible(true);
    s.chart.setDepthOverlay({ markBest: true });
    for (const b of bars.slice(-40)) s.chart.pushDepthSnapshot(bookAt(b.close), b.time);
    const length = bars.length;
    s.widget.replayFrom(length - 120, false);
    s.chart.replaySeekToBar(length - 100);
    s.chart.replayPause();
    for (let i = 0; i < 20; i++) {
      s.chart.replaySeekToBar(length - 100 + i);
      s.widget.setDepth(bookAt(bars.at(-1).close));
    }
    return s;
  },

  /**
   * A symbol compared in percent on the price pane, and one in a pane of its own.
   * The made-up feed prices every symbol near the chart's own, so the pane's
   * values are BTC-like: the layout is what is looked at, not the prices.
   */
  async compare() {
    const s = await widget();
    const bars = s.chart.getData();
    const other = bars.map((b) => ({ ...b, open: b.open / 20, high: b.high / 20, low: b.low / 20, close: (b.close / 20) * (1 + Math.sin(b.time / 3e6) * 0.01) }));
    s.chart.addCompareSymbol('ETH', 'ETHUSDT', other, '#f59e0b');
    s.chart.addIndicator('compareSymbolPane', { symbol: 'SOLUSDT' });
    return s;
  },

  /** Renko bricks, with indicators worked out on them and their values on the axis. */
  async renko() {
    const s = await widget();
    s.chart.setChartType('renko');
    s.chart.addIndicator('ema', { period: 21 });
    s.chart.addIndicator('rsi');
    s.chart.setIndicatorValueLabelsVisible(true);
    return s;
  },

  /** A Vietnamese stock with the day's ceiling, floor and reference, an order near the reference. */
  async priceLimits() {
    const s = await widget({ symbol: 'VNM', trading: true });
    s.chart.setMarket(MARKET_HOSE);
    const last = lastClose(s.chart);
    s.chart.setPriceLimits(last);
    const broker = new PaperExecutionAdapter({ markPrice: last });
    s.chart.connectExecution(broker);
    await broker.placeOrder({ side: 'buy', type: 'limit', price: last * 0.999, quantity: 100 });
    return s;
  },

  /** Ichimoku, its cloud the displacement ahead of the latest bar. */
  async ichimoku() {
    const s = await widget();
    s.chart.addIndicator('ichimoku');
    return s;
  },

  /** A Korean share: KRX's steps and limits, red up and blue down, an order near the reference. */
  async krx() {
    const s = await widget({ symbol: '005930', trading: true });
    s.chart.setMarket(MARKET_KRX);
    const last = lastClose(s.chart);
    s.chart.setPriceLimits(last);
    const broker = new PaperExecutionAdapter({ markPrice: last });
    s.chart.connectExecution(broker);
    await broker.placeOrder({ side: 'buy', type: 'limit', price: s.chart.roundPrice(last * 0.995), quantity: 10 });
    return s;
  },

  /** Drawings on indicator panes: a trend line and a box on RSI, a level on MACD, a line on the price pane. */
  async paneDrawings() {
    const s = await widget();
    const rsi = s.chart.addIndicator('rsi');
    const macd = s.chart.addIndicator('macd');
    const bars = s.chart.getData();
    const t = (back) => bars[bars.length - back].time;
    s.chart.addDrawing({ type: 'trendLine', anchors: [{ time: t(90), price: 25 }, { time: t(10), price: 75 }], paneId: rsi });
    s.chart.addDrawing({ type: 'rectangle', anchors: [{ time: t(60), price: 80 }, { time: t(30), price: 60 }], paneId: rsi });
    s.chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t(40), price: 0 }], paneId: macd });
    s.chart.addDrawing({ type: 'trendLine', anchors: [{ time: t(80), price: bars[bars.length - 80].low }, { time: t(5), price: bars[bars.length - 5].high }] });
    return s;
  },

  /** A trend line selected, its end at the last price: its span's labels meet the last price's tag. */
  async selectedDrawing() {
    const s = await widget();
    const bars = s.chart.getData();
    const back = (n) => bars[bars.length - n];
    const id = s.chart.addDrawing({ type: 'trendLine', anchors: [{ time: back(70).time, price: back(70).low }, { time: back(1).time, price: back(1).close }] });
    s.chart.selectDrawing(id);
    return s;
  },

  /** Long/Short Positions played over the bars: a long selected (its four handles), a short, one running past the last bar. */
  async positions() {
    const s = await widget();
    const bars = s.chart.getData();
    const back = (n) => bars[bars.length - n];
    const position = (from, to, stopBy) => s.chart.addDrawing({
      type: 'riskReward',
      anchors: [{ time: back(from).time, price: back(from).close }, { time: to > 0 ? back(to).time : back(1).time + -to * 60_000, price: back(from).close * stopBy }],
    });
    const long = position(150, 90, 0.997);
    position(80, 30, 1.003);
    position(20, -15, 0.998);
    s.chart.selectDrawing(long);
    return s;
  },

  /** A trend line selected in the RSI pane: its span on the pane's own axis. */
  async selectedPaneDrawing() {
    const s = await widget();
    const rsi = s.chart.addIndicator('rsi');
    const bars = s.chart.getData();
    const t = (back) => bars[bars.length - back].time;
    const id = s.chart.addDrawing({ type: 'trendLine', anchors: [{ time: t(80), price: 30 }, { time: t(20), price: 70 }], paneId: rsi });
    s.chart.selectDrawing(id);
    return s;
  },

  /** Overlays and panes, their values tagged on the axes. */
  async indicators() {
    const s = await widget();
    for (const period of [9, 21, 55]) s.chart.addIndicator('ema', { period });
    s.chart.addIndicator('vwap');
    s.chart.addIndicator('macd');
    s.chart.addIndicator('rsi');
    s.chart.setIndicatorValueLabelsVisible(true);
    return s;
  },

  /** Marks along the foot of the price pane: the host's own, and the widget's headlines, some sharing a badge. */
  async marks() {
    // The headlines are asked for before the bars are in: they wait for them.
    let barsIn;
    const bars = new Promise((resolve) => { barsIn = resolve; });
    const s = await widget({
      news: async () => {
        const data = await bars;
        return [0, 0, 1, 14, 15, 40].map((back, i) => ({ id: `h${i}`, title: `Headline ${i + 1} about the price of this thing`, time: data[data.length - 1 - back].time + i * 1000, source: 'Wire', url: `https://example.com/${i}` }));
      },
    });
    const data = s.chart.getData();
    const at = (back) => data[data.length - 1 - back].time;
    barsIn(data);
    // The headlines are on the chart before the scene is shot.
    await new Promise((resolve) => setTimeout(resolve, 50));
    s.chart.setMarks([
      { id: 'e', time: at(60), kind: 'earnings', title: 'Q3 earnings', text: 'EPS 1.42 vs 1.31 expected' },
      { id: 'd', time: at(30), kind: 'dividend', title: 'Dividend 0.24 a share' },
      { id: 'x', time: at(8), title: 'Trading halted', label: 'H', color: '#e5484d' },
    ]);
    s.chart.addIndicator('rsi');
    return s;
  },

  /** The order book on the plot with trading off: per-level bars and the best bid and ask marked. */
  async depth() {
    const s = await widget({ chartOptions: { features: { trading: false, depth: true }, depthOverlay: { mode: 'level', markBest: true, maxWidth: 140 }, rightMargin: 14 } });
    const last = lastClose(s.chart);
    const step = last * 0.0004;
    // Rows two levels tall, starting half a level below a multiple: the way a footprint's cells are.
    s.chart.setDepthOverlay({ rowSize: step * 2, rowOrigin: -step / 2 });
    const level = (i, side) => ({ price: last + side * (i + 1) * step, volume: 1 + ((i * 7) % 5) + (i === 6 ? 14 : 0) });
    const levels = Array.from({ length: 24 }, (_, i) => i);
    s.chart.setDepthData({ bids: levels.map((i) => level(i, -1)), asks: levels.map((i) => level(i, 1)) });
    return s;
  },

  /** Daily bars panned back to a spring three years ago: months on view and no January, so the year is the date tag's. */
  async historyDaily() {
    const s = await widget({ timeframe: '1d', adapter: new MockAdapter({ basePrice: 100, volatility: 0.9, tickInterval: 86_400_000, historySize: 1500 }), historyLimit: 1500 });
    const year = new Date(s.chart.getData().at(-1).time).getUTCFullYear() - 3;
    s.chart.setVisibleRange(Date.UTC(year, 2, 1), Date.UTC(year, 6, 1));
    return s;
  },

  /** Hourly bars panned back a few days into an earlier month: days on view and no month, so the tag gives month and year. */
  async historyHourly() {
    const s = await widget({ timeframe: '1h', adapter: new MockAdapter({ basePrice: 100, volatility: 0.9, tickInterval: 3_600_000, historySize: 1500 }), historyLimit: 1500 });
    const data = s.chart.getData();
    s.chart.setVisibleRange(data[200].time, data[300].time);
    return s;
  },

  /** A page of the host's own open in the dock, after the built-in ones: the dock's header over the host's element. */
  async dockPage() {
    const s = await widget({ watchlist: true, symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] });
    const figures = document.createElement('dl');
    figures.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px 16px;margin:0;padding:12px 16px;font-variant-numeric:tabular-nums';
    for (const [label, value] of [['P/E', '12.4'], ['EPS', '5,180'], ['ROE', '18.2%'], ['Dividend yield', '2.1%'], ['Market cap', '1.2T']]) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      dt.style.color = 'var(--tcw-text-muted)';
      const dd = document.createElement('dd');
      dd.textContent = value;
      dd.style.margin = '0';
      figures.append(dt, dd);
    }
    s.widget.addDockPage({ id: 'figures', label: 'Key figures', icon: 'table', element: figures });
    s.widget.openPanel('figures');
    return s;
  },

  /** The watchlist open on daily bars with no quotes: the chart's own row shows the day's move, not the move since its first bar. */
  async watchlistOwnRow() {
    const s = await widget({
      timeframe: '1d',
      adapter: new MockAdapter({ basePrice: 100, volatility: 0.9, tickInterval: 86_400_000, historySize: 150 }),
      historyLimit: 150,
      symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
      watchlist: { quotes: false },
    });
    s.widget.openPanel('watchlist');
    // The row is filled on the watchlist's tick, once a second.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return s;
  },

  /** A position with no stop-loss or take-profit, and one with only a stop: SL and TP buttons on the entries' tags. */
  async positionAddStops() {
    const s = await widget({ trading: true });
    const last = lastClose(s.chart);
    const broker = new PaperExecutionAdapter({ markPrice: last });
    s.chart.connectExecution(broker, { brackets: 'event' });
    await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 1 });
    await broker.placeOrder({ side: 'sell', type: 'market', price: last, quantity: 2, stopLoss: last * 1.004 });
    return s;
  },

  /** The favorites toolbar shown over the chart, with four pinned tools and one of them in use. */
  async favoritesBar() {
    localStorage.removeItem('tcw:favoritesBar');
    const s = await widget({ drawingFavorites: ['trendLine', 'horizontalLine', 'fibRetracement', 'rectangle'] });
    document.querySelector('[data-role="favoritesBar"]')?.click();
    document.querySelector('.tcw-favorites-bar [data-tool-value="fibRetracement"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return s;
  },

  /** More panes than the chart has room for: the price pane keeps its part, the panes share the rest. */
  async manyPanes() {
    const s = await widget();
    for (const id of ['rsi', 'macd', 'atr', 'cci', 'stochastic', 'obv', 'mfi', 'adx']) s.chart.addIndicator(id);
    return s;
  },
};

const stage = { scene, theme, ready: false, errors: [] };
window.stage = stage;
addEventListener('error', (e) => stage.errors.push(String(e.message)));
addEventListener('unhandledrejection', (e) => stage.errors.push(String(e.reason)));
try {
  Object.assign(stage, await SCENES[scene]());
} catch (e) {
  stage.errors.push(String(e));
}
stage.ready = true;
