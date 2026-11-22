// The chart in the states a screenshot of a dialog never shows, for the
// browser audit (scripts/audit-scenes.mjs): the price at an order with a
// quote on, a linked grid under the pointer, a replay, compares, Renko, the
// day's limits. Picked by `?scene=` and `?theme=`; the market is made up from
// a fixed seed and stops once loaded, so every run draws the same bars.
import { Chart, MockAdapter, PaperExecutionAdapter, MARKET_HOSE, MARKET_KRX, renderPriceChart } from '@tradecanvas/chart';
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
// The widgets' language: `?locale=vi` (English without it).
const locale = params.get('locale') ?? undefined;
const host = document.getElementById('host');

const market = (symbol) => new MockAdapter({ basePrice: PRICES[symbol] ?? 100, volatility: 0.9, tickInterval: 60_000, historySize: HISTORY });

const loaded = (chart) => new Promise((resolve) => {
  const check = () => (chart.getData().length > 50 ? resolve() : setTimeout(check, 30));
  check();
});

/** A widget whose feed stops once its bars are in, so nothing moves while it is looked at. */
async function widget(options = {}) {
  const symbol = options.symbol ?? 'BTCUSDT';
  const w = new ChartWidget(host, { symbol, timeframe: '5m', theme, ui, locale, adapter: market(symbol), historyLimit: HISTORY, ...options });
  const chart = w.getChart();
  await loaded(chart);
  chart.disconnectStream();
  return { widget: w, chart };
}

const lastClose = (chart) => chart.getData().at(-1).close;

const DAY_MS = 86_400_000;

/** Daily bars from the seeded generator: the same every run. */
function dailyBars(count, first = 100) {
  let close = first;
  return Array.from({ length: count }, (_, i) => {
    const open = close;
    const step = first / 25;
    close = Math.max(first / 20, open + (Math.random() - 0.48) * step);
    const high = Math.max(open, close) + (Math.random() * step) / 2;
    const low = Math.min(open, close) - (Math.random() * step) / 2;
    return { time: Date.UTC(2026, 0, 5) + i * DAY_MS, open, high, low, close, volume: 800 + Math.round(Math.random() * 1600) };
  });
}

/** How many of two same-sized canvases' pixels are apart by more than a shade. */
function pixelsApart(a, b) {
  const one = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  const other = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
  let apart = 0;
  for (let i = 0; i < one.length; i += 4) {
    if (Math.abs(one[i] - other[i]) > 2 || Math.abs(one[i + 1] - other[i + 1]) > 2 || Math.abs(one[i + 2] - other[i + 2]) > 2) apart++;
  }
  return apart;
}

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

  /** A grid with its picture menu open: the charts together as an image, a copy, a print or a PDF. */
  async gridPicture() {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    const grid = new ChartWidgetGrid(host, {
      layout: '1+2',
      adapter: (cell) => market(symbols[cell] ?? 'BTCUSDT'),
      widget: { theme, ui, locale, historyLimit: HISTORY },
      cells: symbols.map((symbol) => ({ symbol, timeframe: '5m' })),
    });
    await new Promise((r) => setTimeout(r, 300));
    const charts = grid.getWidgets().map((w) => w.getChart());
    await Promise.all(charts.map(loaded));
    for (const c of charts) c.disconnectStream();
    const button = host.querySelector('.tcw-grid-picture');
    // On a phone the bar scrolls: the button is at its end.
    button.scrollIntoView({ block: 'nearest', inline: 'end' });
    button.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const checks = () => {
      const menu = host.querySelector('.tcw-context-menu:not([hidden])');
      if (!menu) return ['the picture menu did not open'];
      const problems = [];
      const entries = [...menu.querySelectorAll('[role=menuitem]')];
      if (entries.length !== 4) problems.push(`the picture menu has ${entries.length} entries, 4 are`);
      if (entries.some((entry) => !entry.querySelector('svg'))) problems.push('an entry of the picture menu has no icon');
      const box = menu.getBoundingClientRect();
      if (box.left < 0 || box.top < 0 || box.right > window.innerWidth + 1 || box.bottom > window.innerHeight + 1) problems.push('the picture menu runs off the screen');
      // The picture is the charts' cells, a pixel for a pixel.
      const cells = host.querySelector('.tcw-grid-cells').getBoundingClientRect();
      const picture = grid.toCanvas({ pixelRatio: 1 });
      if (!picture) problems.push('the grid gave no picture');
      else if (Math.abs(picture.width - cells.width) > 1 || Math.abs(picture.height - cells.height) > 1) {
        problems.push(`the picture is ${picture.width}x${picture.height}, the charts ${Math.round(cells.width)}x${Math.round(cells.height)}`);
      }
      return problems;
    };
    return { grid, chart: charts[0], charts, checks };
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

  /**
   * A look with no blocks of colour: the last price's tag in the ink with the ground's colour for its text, the
   * indicators' value tags outlined, the grid ruled where a day begins.
   */
  async paperLook() {
    const s = await widget();
    for (const period of [9, 21, 55]) s.chart.addIndicator('ema', { period });
    s.chart.addIndicator('macd');
    s.chart.addIndicator('rsi');
    s.chart.setIndicatorValueLabelsVisible(true);
    const { background, text } = s.chart.getTheme();
    s.chart.applyOverrides({
      'lastPrice.labelBackground': text,
      'lastPrice.labelTextColor': background,
      'axis.price.valueTagsOutlined': true,
      'grid.vertical.periodsOnly': true,
    });
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

  /**
   * A long with three take-profit levels on an account held against its
   * margin: the second level pressed on its line and dragged up, not yet let
   * go (the line where it is dragged to, faint where it was), and the margin
   * level in the account panel's totals.
   */
  async levelDrag() {
    const s = await widget({ trading: true });
    const last = lastClose(s.chart);
    const broker = new PaperExecutionAdapter({ markPrice: last, balance: 10_000, leverage: 20, marginCallLevel: 1, stopOutLevel: 0.5 });
    s.chart.connectExecution(broker);
    const levels = [1.002, 1.004, 1.006].map((by) => ({ price: last * by, quantity: 1 }));
    await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 3, stopLoss: last * 0.996, takeProfits: levels });
    s.widget.toggleAccountPanel(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Where the second level's line is on the page: the plot's own scale, read as the chart drew it.
    const view = s.chart.viewport.getState();
    // The chart's own box takes the press: on a phone the Sell and Buy buttons lie over these lines' left end.
    const plot = host.querySelector('canvas').parentElement;
    const box = plot.getBoundingClientRect();
    const yOf = (price) => box.top + view.chartRect.y + ((view.priceRange.max - price) / (view.priceRange.max - view.priceRange.min)) * view.chartRect.height;
    const x = box.left + view.chartRect.x + view.chartRect.width * 0.3;
    const from = yOf(levels[1].price);
    const to = yOf(last * 1.005);
    const send = (type, y) => plot.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: 1, bubbles: true, cancelable: true }));
    send('mousedown', from);
    send('mousemove', (from + to) / 2);
    send('mousemove', to);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const checks = () => {
      const problems = [];
      const drag = s.chart.tradingManager.dragHandler.getDragState();
      if (!drag || drag.sourceType !== 'level' || drag.level !== 1) problems.push('the press on the second take-profit level did not take its line');
      // Nothing is sent before the line is let go.
      const held = broker.getPositions()[0]?.takeProfits?.map((level) => level.price);
      if (JSON.stringify(held) !== JSON.stringify(levels.map((level) => level.price))) problems.push('a level moved in the account before it was let go');
      if (!/Margin level/.test(host.textContent) && !locale) problems.push('the account panel does not write the margin level');
      return problems;
    };
    // The account too, for whoever looks further by hand: a price that calls its margin, a stop-out.
    return { ...s, broker, checks };
  },

  /**
   * A limit order that the paper account fills in parts, two of its five
   * filled: its tag reads 2/5, the position it is building beside it, and
   * its row in the account panel's orders.
   */
  async partFill() {
    const s = await widget({ trading: true });
    const last = lastClose(s.chart);
    const broker = new PaperExecutionAdapter({ markPrice: last, fillSize: 2 });
    s.chart.connectExecution(broker);
    const limit = last * 0.997;
    await broker.placeOrder({ side: 'buy', type: 'limit', price: limit, quantity: 5, stopLoss: last * 0.992 });
    // The price comes to its limit once, and goes back: one part fills, the rest waits.
    broker.setMarkPrice(limit);
    broker.setMarkPrice(last);
    s.widget.toggleAccountPanel(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // The panel's second tab is its orders, in any language.
    host.querySelectorAll('[role=tab]')[1]?.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const checks = () => {
      const problems = [];
      const order = s.chart.getOrders()[0];
      if (!order || order.filledQuantity !== 2 || order.quantity !== 5) problems.push('the chart does not hold the order with two of its five filled');
      if (s.chart.getPositions()[0]?.quantity !== 2) problems.push('the part that filled is not a position of two');
      if (!locale && ![...host.querySelectorAll('tbody td')].some((cell) => cell.textContent === '2 / 5')) problems.push('the account panel does not write 2 / 5 in the order\'s row');
      return problems;
    };
    return { ...s, broker, checks };
  },

  /**
   * The volume delta of bars that say who took their trades: each bar's
   * delta as a histogram, and its running sum from each session's start.
   */
  async orderFlowDelta() {
    const s = await widget();
    const each = s.chart.addIndicator('voldelta', { mode: 0 });
    const sum = s.chart.addIndicator('voldelta', { mode: 1, anchor: 'session' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const checks = () => {
      const problems = [];
      const bars = s.chart.getData();
      const delta = s.chart.getIndicatorOutput(each)?.series ?? [];
      if (!bars.every((bar) => typeof bar.buyVolume === 'number')) problems.push('the bars of the mock feed do not all say what the buyers took');
      // The true delta, bought less sold: not the whole volume signed by the close.
      const off = bars.findIndex((bar, i) => Math.abs((delta[i]?.value ?? NaN) - (2 * bar.buyVolume - bar.volume)) > 1e-6);
      if (off >= 0) problems.push(`bar ${off}: the delta drawn is not what was bought less what was sold`);
      if (!bars.some((bar, i) => (bar.close >= bar.open) !== ((delta[i]?.value ?? 0) >= 0))) problems.push('no delta goes against the close of its bar: the estimate, not the count, may be drawn');
      if (!(s.chart.getIndicatorOutput(sum)?.series?.length > 0)) problems.push('the cumulative delta has no values');
      return problems;
    };
    return { ...s, checks };
  },

  /**
   * A footprint chart from the feed's own trades: by each of the newest
   * bars, what the sellers took at the bid on the left and what the buyers
   * took at the ask on the right, the rows where one side outdid the other
   * marked, the row most traded at outlined. The older bars, whose trades
   * the feed no longer has, are slim candles.
   */
  async footprint() {
    const s = await widget({ chartOptions: { chartType: 'footprint' } });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const checks = () => {
      const problems = [];
      const bars = s.chart.getData();
      const prints = s.chart.getFootprint();
      if (s.chart.getChartType() !== 'footprint') problems.push('the chart is not a footprint');
      if (prints.length < 10) problems.push(`only ${prints.length} bars have a footprint: the feed's trades did not come in`);
      const byTime = new Map(bars.map((bar) => [bar.time, bar]));
      const rowSize = prints[0]?.levels.length > 1 ? prints[0].levels[1].price - prints[0].levels[0].price : 0;
      for (const print of prints) {
        const bar = byTime.get(print.time);
        if (!bar) {
          problems.push(`a footprint at ${print.time} has no bar`);
          continue;
        }
        const bought = print.levels.reduce((sum, level) => sum + level.buy, 0);
        const sold = print.levels.reduce((sum, level) => sum + level.sell, 0);
        // The trades are the bar's own: they add up to its volume and its split, inside its range.
        if (Math.abs(bought + sold - bar.volume) > 1e-6 * bar.volume) problems.push(`bar ${print.time}: its footprint adds up to ${bought + sold}, its volume is ${bar.volume}`);
        if (Math.abs(bought - bar.buyVolume) > 1e-6 * bar.volume) problems.push(`bar ${print.time}: its footprint says ${bought} bought, the bar ${bar.buyVolume}`);
        const lowest = print.levels[0].price;
        const highest = print.levels[print.levels.length - 1].price;
        // A row starts at or under its lowest trade, by less than a row.
        if (lowest < bar.low - rowSize || highest > bar.high) {
          problems.push(`bar ${print.time}: its rows run ${lowest} to ${highest}, the bar ${bar.low} to ${bar.high}`);
        }
      }
      // The newest bars are the ones with a footprint, with no bar between them left out.
      const newest = bars.slice(-prints.length).map((bar) => bar.time);
      if (prints.some((print, i) => print.time !== newest[i])) problems.push('the footprints are not those of the newest bars, one each');
      return problems;
    };
    return { ...s, checks };
  },

  /**
   * The tape (time and sales) open in the dock: the trades of the chart's
   * symbol newest on top, each with its time, its price and its size in the
   * colour of who took it, a large one on its tint, and over them how the
   * rows split between buyers and sellers.
   */
  async tape() {
    const s = await widget({ tape: true });
    s.widget.openPanel('tape');
    // The feed stopped once its bars were in: the trades are given by hand, the same every run.
    const last = s.chart.getData().at(-1);
    const trades = [];
    let price = last.open;
    for (let i = 0; i < 120; i++) {
      const up = Math.random() < 0.5;
      price = Math.min(last.high, Math.max(last.low, price + (up ? 1 : -1) * last.close * 0.0002 * Math.random()));
      const volume = i % 37 === 20 ? 14 : 0.05 + Math.random() * 1.6;
      trades.push({ time: last.time + i * 2000, price, volume, side: up ? 'buy' : 'sell' });
    }
    s.chart.addTrades(trades);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const checks = () => {
      const problems = [];
      const rows = [...document.querySelectorAll('.tcw-tape-row')];
      if (rows.length !== trades.length) problems.push(`the tape lists ${rows.length} trades of ${trades.length}`);
      // Newest on top, each in the colour of who took it.
      const sides = rows.map((row) => row.dataset.side);
      const given = trades.map((trade) => trade.side).reverse();
      if (sides.some((side, i) => side !== given[i])) problems.push('the rows are not the trades newest first, each with its side');
      const large = document.querySelectorAll('.tcw-tape-row[data-large]').length;
      if (large !== 3) problems.push(`${large} trades stand out as large, 3 are`);
      const split = document.querySelector('.tcw-tape-split');
      const bought = trades.filter((trade) => trade.side === 'buy').reduce((sum, trade) => sum + trade.volume, 0);
      const all = trades.reduce((sum, trade) => sum + trade.volume, 0);
      const shown = parseFloat(split?.style.getPropertyValue('--tcw-tape-bought') ?? '');
      if (!split || split.hidden || Math.abs(shown - (bought / all) * 100) > 0.01) problems.push(`the split says ${shown}% bought, the trades ${(bought / all) * 100}%`);
      // A row's three figures stay in their cells.
      const cut = rows.flatMap((row) => [...row.children]).filter((cell) => cell.scrollWidth > cell.clientWidth + 1).length;
      if (cut > 0) problems.push(`${cut} figures do not fit their cell`);
      // The header holds its name, its least size, its menu's button and its ×, none of them pushed out of it.
      const header = document.querySelector('.tcw-tape-header');
      const room = header.getBoundingClientRect();
      const out = [...header.children].filter((part) => {
        const box = part.getBoundingClientRect();
        return box.width === 0 || box.left < room.left - 0.5 || box.right > room.right + 0.5;
      }).length;
      if (!header.querySelector('.tcw-tape-more')) problems.push('the tape has no button for its menu');
      if (out > 0) problems.push(`${out} parts of the tape's header do not fit in it`);
      return problems;
    };
    return { ...s, checks };
  },

  /** A long bracket being placed with a paper account connected: its quantity in the bar's field and on the entry's tag. */
  async bracketQuantity() {
    const s = await widget({ trading: true });
    s.broker = new PaperExecutionAdapter({ markPrice: lastClose(s.chart) });
    s.chart.connectExecution(s.broker);
    s.widget.startBracket('buy', { quantity: 2 });
    await new Promise((resolve) => setTimeout(resolve, 100));
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

  /** The hide button's menu open on the drawing sidebar, an indicator hidden from it, a position on the chart. */
  async sidebarMenus() {
    const s = await widget({ trading: true });
    const last = lastClose(s.chart);
    const broker = new PaperExecutionAdapter({ markPrice: last });
    s.chart.connectExecution(broker, { brackets: 'event' });
    await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 1, stopLoss: last * 0.996 });
    s.chart.addIndicator('ema', { period: 20 });
    document.querySelector('[data-menu-for="hideAll"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    return s;
  },

  /**
   * Panes of millions under prices of tens of thousands (A/D and OBV, as a CVD pane): their tags share
   * the price axis, which was sized to the prices alone and cut them ("-1,766,028.").
   */
  async paneMillions() {
    const s = await widget();
    for (const id of ['ad', 'obv']) s.chart.addIndicator(id);
    s.chart.setIndicatorValueLabelsVisible(true);
    return s;
  },

  /**
   * The symbol search open on symbols with their last price and day's change, two venues listing the
   * same ticker and exchanges of ten letters: on a phone the exchange was cut ("SIMULA…").
   */
  async symbolSearch() {
    const s = await widget({
      symbols: [
        { symbol: 'BINANCE:BTCUSDT', description: 'Bitcoin / Tether', exchange: 'Binance', type: 'crypto', last: 61668.46, changePercent: 0.37 },
        { symbol: 'SIM:BTCUSDT', description: 'Bitcoin / Tether', exchange: 'SIMULATED', type: 'crypto', last: 61670.1, changePercent: 0.4 },
        { symbol: 'SIM:ETHUSDT', description: 'Ether / Tether', exchange: 'ALL VENUES', type: 'crypto', last: 3021.55, changePercent: -1.84 },
        { symbol: 'SOLUSDT', description: 'Solana / Tether', exchange: 'Binance', type: 'crypto', last: 142.318, changePercent: 0 },
        { symbol: 'VCB', description: 'Ngân hàng TMCP Ngoại thương Việt Nam', exchange: 'HOSE', type: 'stock', last: 61.2, pricePrecision: 2, changePercent: -0.65 },
        { symbol: 'XAUUSD', description: 'Gold spot', exchange: 'OANDA', type: 'forex' },
      ],
    });
    document.querySelector('.tcw-toolbar-symbol')?.click();
    await new Promise((resolve) => setTimeout(resolve, 400));
    return s;
  },

  /**
   * The candles hidden (transparent) under an overlay that draws its own, the legend's up and down set
   * apart: the legend's close and change went with the candles before `legend.upColor`/`downColor`.
   */
  async hiddenCandles() {
    const s = await widget();
    const hidden = 'rgba(0, 0, 0, 0)';
    s.chart.applyOverrides({
      'series.candlestick.upColor': hidden,
      'series.candlestick.downColor': hidden,
      'legend.upColor': '#3fbd9c',
      'legend.downColor': '#fa686a',
    });
    return s;
  },

  /** Williams Fractals: its marks were dots lost in the wicks; now triangles clear of the bars. */
  async fractals() {
    const s = await widget();
    s.chart.addIndicator('fractals', { period: 2 });
    return s;
  },

  /**
   * The price chart drawn with no page (`renderPriceChart`), under the same chart on the page: the
   * two are one picture, pixel for pixel, at the screen's size and at twice the pixels.
   */
  async noPage() {
    host.style.display = 'grid';
    host.style.gridTemplateRows = '1fr 1fr';
    const [top, bottom] = [document.createElement('div'), document.createElement('canvas')];
    top.style.minHeight = '0';
    bottom.style.cssText = 'width:100%;height:100%;min-height:0;display:block';
    host.append(top, bottom);
    // Prices long enough to widen the price scale: the bars are fitted to the plot that is left.
    const data = dailyBars(160, 64_200);
    const drawings = [
      { id: 'trend', type: 'trendLine', anchors: [{ time: data[40].time, price: data[40].low }, { time: data[130].time, price: data[130].low }], style: { color: '#e07b00', lineWidth: 2 }, visible: true, locked: false },
      { id: 'level', type: 'horizontalLine', anchors: [{ time: data[90].time, price: data[90].high }], style: { color: '#2266ff', lineWidth: 1 }, visible: true, locked: false },
    ];
    const markers = [
      { id: 'in', time: data[60].time, price: data[60].low, direction: 'long', confidence: 0.8, source: 'audit', label: 'Buy' },
      { id: 'out', time: data[120].time, price: data[120].high, direction: 'short', confidence: 0.7, source: 'audit', label: 'Sell' },
    ];
    const look = { theme, watermark: { text: 'NO PAGE' }, features: { indicatorValueLabels: true } };
    // Nothing that follows a pointer or a clock: a still frame has neither.
    const chart = new Chart(top, { ...look, features: { ...look.features, crosshair: false, barCountdown: false } });
    chart.setData(data);
    chart.setSymbolName('DEMO');
    chart.setDataTimeframe('1d');
    chart.addIndicator('ema', { period: 21 });
    chart.addIndicator('wma', { period: 34 }, 'bottom', { scale: 'left' });
    chart.addIndicator('bb');
    const rsi = chart.addIndicator('rsi');
    chart.addIndicator('macd');
    chart.setDrawings(drawings);
    chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: data[80].time, price: 55 }], paneId: rsi });
    chart.setSignalMarkers(markers);
    // Told what to show last, as a still chart is fitted last.
    chart.fitContent();
    // What the chart gives of itself goes in as it is.
    const still = { ...look, data, symbol: 'DEMO', timeframe: '1d', indicators: chart.getIndicatorSetup(), drawings: chart.getDrawings(), markers };
    /** The still chart on a canvas of `width` × `height` CSS pixels, `ratio` pixels to each. */
    const draw = (canvas, width, height, ratio) => {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      renderPriceChart(ctx, still, { width, height });
    };
    // On the page for the screenshot, once the chart above has its size and its fonts.
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 300));
    const size = () => ({ width: top.clientWidth, height: top.clientHeight });
    draw(bottom, bottom.clientWidth, bottom.clientHeight, devicePixelRatio);
    const checks = () => {
      const problems = [];
      for (const ratio of [1, 2]) {
        const onPage = chart.toCanvas({ pixelRatio: ratio });
        const drawn = document.createElement('canvas');
        draw(drawn, size().width, size().height, ratio);
        if (!onPage || onPage.width !== drawn.width || onPage.height !== drawn.height) {
          problems.push(`no page, ×${ratio}: the picture is ${drawn.width}×${drawn.height}, the chart's ${onPage?.width}×${onPage?.height}`);
          continue;
        }
        const apart = pixelsApart(onPage, drawn);
        if (apart > 0) problems.push(`no page, ×${ratio}: ${apart} of ${drawn.width * drawn.height} pixels are not the chart's own`);
      }
      // Pictures at sizes of their own leave the chart on the page as it was.
      const before = chart.toCanvas({ pixelRatio: 1 });
      const large = chart.toCanvas({ width: 1920, height: 1080, pixelRatio: 1 });
      const small = chart.toCanvas({ width: 360, height: 280, theme: theme === 'dark' ? 'light' : 'dark' });
      if (!large || large.width !== 1920 || large.height !== 1080) problems.push(`a picture asked for at 1920×1080 is ${large?.width}×${large?.height}`);
      if (!small) problems.push('a picture asked for at 360×280 is none');
      const moved = pixelsApart(before, chart.toCanvas({ pixelRatio: 1 }));
      if (moved > 0) problems.push(`after pictures at other sizes, ${moved} pixels of the chart on the page are not as they were`);
      return problems;
    };
    return { chart, checks, drawStill: draw };
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
