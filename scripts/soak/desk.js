// A live trading desk under load, for the soak test (scripts/soak.mjs) and for
// filming it: the full widget on a long history, trades streaming in from a
// worker that stands in for the socket, a position and working orders that
// follow the price, the bid and ask, a depth heatmap and four indicators.
// A strip at the bottom shows what it costs while it runs.
//
//   ?rate=30000     trades a second the feed sends
//   ?bars=1000000   bars of history (one a second, ending now)
//   ?renderer=webgl canvas | webgl | auto
//   ?hud=0          hide the strip
import { PaperExecutionAdapter } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

const params = new URLSearchParams(location.search);
const RATE = Number(params.get('rate') ?? 30_000);
const BARS = Number(params.get('bars') ?? 1_000_000);
const RENDERER = params.get('renderer') ?? 'webgl';
const SHOW_HUD = params.get('hud') !== '0';
const SYMBOL = 'BTCUSDT';
const START_PRICE = 64_200;
const TICK_SIZE = 0.5;
const SECOND = 1000;
/** How often the feed worker sends what it has, ms: a busy socket's message rate. */
const FEED_INTERVAL_MS = 4;
/** How far the price wanders in a second, in price units (one standard deviation). */
const PRICE_SIGMA_PER_S = 2.5;
/** How often a depth snapshot lands, ms. */
const DEPTH_INTERVAL_MS = 250;
const DEPTH_LEVELS = 24;
/** How far apart the book's levels are, in ticks. */
const DEPTH_STEP_TICKS = 2;
/** How often working orders far from the price are moved back near it, ms, as a trader would. */
const RECENTRE_MS = 15_000;
const HUD_INTERVAL_MS = 500;
/** The frames the strip's fps and p95 are read over. */
const FRAME_WINDOW = 120;

/** A small seeded generator in place of Math.random: the same market every run. */
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

/** `n` one-second bars ending at `end`, walking from START_PRICE; the last close is where the feed starts. */
function history(n, end) {
  const rand = seeded(20261103);
  const out = new Array(n);
  let p = START_PRICE * 0.82;
  const t0 = Math.floor(end / SECOND) * SECOND - (n - 1) * SECOND;
  for (let i = 0; i < n; i++) {
    const o = p;
    p = Math.max(1000, p * (1 + (rand() - 0.5) * 0.00012 + 0.0000002));
    out[i] = { time: t0 + i * SECOND, open: o, high: Math.max(o, p) * (1 + rand() * 0.00004), low: Math.min(o, p) * (1 - rand() * 0.00004), close: p, volume: 1 + rand() * 20 };
  }
  return out;
}

// The socket stand-in: trades at RATE a second, sent every FEED_INTERVAL_MS as
// one packed message [time, price, size, side, ...], as a binary feed would.
const FEED_WORKER = `
let s = 7, move = 1, price = 0, rate = 0, tick = 0, timer = 0, owed = 0, last = 0;
const rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
onmessage = (e) => {
  ({ price, rate, tick } = e.data);
  // A tick's chance to move the price: about ${PRICE_SIGMA_PER_S} a second whatever the rate, as a real book moves.
  move = Math.min(1, ${PRICE_SIGMA_PER_S} ** 2 / (rate * tick * tick));
  last = performance.now();
  timer = setInterval(() => {
    const now = performance.now();
    owed += (now - last) * rate / 1000; last = now;
    const n = Math.floor(owed); owed -= n;
    if (!n) return;
    const msg = new Float64Array(n * 4), t = Date.now();
    for (let i = 0; i < n; i++) {
      if (rand() < move) price = Math.max(tick, price + (rand() < 0.5 ? -tick : tick));
      msg[i * 4] = t; msg[i * 4 + 1] = price; msg[i * 4 + 2] = 0.001 + rand() * 0.2; msg[i * 4 + 3] = rand() < 0.5 ? 1 : -1;
    }
    postMessage(msg, [msg.buffer]);
  }, ${FEED_INTERVAL_MS});
};`;

/** A feed whose trades come from the worker: each one reaches the chart as a tick. */
class WorkerFeed {
  name = 'worker-feed';
  listeners = new Map();
  state = 'disconnected';
  ticks = 0;
  lastPrice = 0;
  constructor(bars) { this.bars = bars; this.lastClose = bars.at(-1).close; }
  connect() {
    const last = this.lastClose;
    this.worker = new Worker(URL.createObjectURL(new Blob([FEED_WORKER], { type: 'text/javascript' })));
    this.worker.onmessage = (e) => this.deliver(e.data);
    this.worker.postMessage({ price: Math.round(last / TICK_SIZE) * TICK_SIZE, rate: RATE, tick: TICK_SIZE });
    this.state = 'connected';
    this.emit('connectionChange', 'connected');
  }
  deliver(msg) {
    for (let i = 0; i < msg.length; i += 4) {
      const price = msg[i + 1];
      this.emit('tick', { time: msg[i], price, volume: msg[i + 2], side: msg[i + 3] > 0 ? 'buy' : 'sell', bid: price - TICK_SIZE, ask: price + TICK_SIZE });
    }
    this.ticks += msg.length / 4;
    this.lastPrice = msg[msg.length - 3];
  }
  disconnect() {
    this.worker?.terminate();
    this.worker = null;
    this.state = 'disconnected';
  }
  getConnectionState() { return this.state; }
  async fetchHistory() {
    // Handed over once: the chart keeps its own copy, and the page shouldn't hold a second.
    const bars = this.bars;
    this.bars = null;
    return bars;
  }
  on(type, fn) { (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)).add(fn); }
  off(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, data) {
    const set = this.listeners.get(type);
    if (!set) return;
    const event = { type, data, timestamp: Date.now() };
    for (const fn of set) fn(event);
  }
  dispose() { this.disconnect(); this.listeners.clear(); }
}

/** An order book around `price`, with a few walls. */
function depthAround(price, rand) {
  const side = (dir) => Array.from({ length: DEPTH_LEVELS }, (_, i) => ({
    price: price + dir * (i + 1) * TICK_SIZE * DEPTH_STEP_TICKS,
    // Mostly thin, with a wall here and there.
    volume: 1 + rand() ** 3 * 25 + (i % 9 === 4 ? 120 * rand() : 0),
  }));
  return { bids: side(-1), asks: side(1) };
}

// What the page costs, read by the strip and by the soak runner (window.__soak).
const frames = [];
let lastFrame = 0, frameCount = 0, longTasks = 0, longTaskMs = 0;
const startedAt = performance.now();
function onFrame(ts) {
  if (lastFrame) {
    frames.push(ts - lastFrame);
    if (frames.length > FRAME_WINDOW) frames.shift();
    frameCount++;
  }
  lastFrame = ts;
  requestAnimationFrame(onFrame);
}
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) { longTasks++; longTaskMs += e.duration; }
  }).observe({ type: 'longtask' });
} catch { /* not in this browser */ }

const pct = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

const host = document.getElementById('host');
const feed = new WorkerFeed(history(BARS, Date.now()));
const widget = new ChartWidget(host, { symbol: SYMBOL, timeframe: '1s', theme: 'dark', trading: true, chartOptions: { renderer: RENDERER } });
const chart = widget.getChart();
await chart.connect({ adapter: feed, symbol: SYMBOL, timeframe: '1s', historyLimit: BARS, aggregateTicks: true });
for (const [id, opts] of [['ema', { period: 21 }], ['bb', { period: 20 }], ['rsi', { period: 14 }], ['macd', {}]]) chart.addIndicator(id, opts);
const loaded = chart.getData();
chart.setVisibleRange(loaded[loaded.length - 180].time, loaded[loaded.length - 1].time + 30 * SECOND);

// A paper broker: a long position with its stop and target, and working orders either side.
const mark = loaded[loaded.length - 1].close;
const broker = new PaperExecutionAdapter({ markPrice: mark });
chart.connectExecution(broker);
await broker.placeOrder({ side: 'buy', type: 'market', price: mark, quantity: 2 });
const position = broker.getPositions()[0];
await broker.modifyPosition({ positionId: position.id, stopLoss: mark - 25, takeProfit: mark + 40 });
// Working orders a few ticks either side; each is moved back near the price when it drifts away.
const working = [
  { side: 'buy', type: 'limit', offset: -12, quantity: 1 },
  { side: 'sell', type: 'limit', offset: 16, quantity: 1 },
  { side: 'sell', type: 'stop', offset: -30, quantity: 3 },
];
for (const w of working) w.id = (await broker.placeOrder({ side: w.side, type: w.type, price: mark + w.offset, quantity: w.quantity })).id;
/** Positions kept open: past this the oldest is closed, so lines come and go without piling up. */
const MAX_POSITIONS = 2;
const near = (price, offset) => Math.round((price + offset) / TICK_SIZE) * TICK_SIZE;
setInterval(async () => {
  const price = feed.lastPrice;
  if (!price) return;
  const open = broker.getPositions();
  if (open.length > MAX_POSITIONS) await broker.closePosition({ positionId: open[0].id }).catch(() => {});
  for (const w of working) {
    const order = broker.getOrders().find((o) => o.id === w.id);
    // A filled order is placed again, as a trader working the book would.
    if (!order) {
      w.id = (await broker.placeOrder({ side: w.side, type: w.type, price: near(price, w.offset), quantity: w.quantity })).id;
    } else if (Math.abs(order.price - price) > Math.abs(w.offset) * 2.5) {
      broker.modifyOrder({ orderId: w.id, previousPrice: order.price, newPrice: near(price, w.offset) }).catch(() => {});
    }
  }
}, RECENTRE_MS);

chart.setDepthHeatmapVisible(true);
chart.setDepthHeatmapConfig({ capacity: 240, opacity: 0.35 });
const depthRand = seeded(99);
setInterval(() => {
  if (!feed.lastPrice) return;
  broker.setMarkPrice(feed.lastPrice);
  chart.pushDepthSnapshot(depthAround(feed.lastPrice, depthRand), Date.now());
}, DEPTH_INTERVAL_MS);

requestAnimationFrame(onFrame);

// The strip: numbers only, written into the same few nodes each time.
const hud = document.getElementById('hud');
const cells = ['fps', 'frame p95', 'ticks/s', 'bars', 'JS heap', 'DOM nodes', 'running'].map((label) => {
  const cell = document.createElement('div');
  const value = document.createElement('b');
  cell.append(value, label);
  hud.append(cell);
  return value;
});
hud.hidden = !SHOW_HUD;
let ticksBefore = 0, hudAt = performance.now();
const fmt = (n) => n.toLocaleString('en-US');
setInterval(() => {
  const now = performance.now();
  const rate = ((feed.ticks - ticksBefore) * SECOND) / (now - hudAt);
  ticksBefore = feed.ticks; hudAt = now;
  const mean = frames.reduce((a, b) => a + b, 0) / (frames.length || 1);
  const heap = performance.memory?.usedJSHeapSize;
  const up = Math.floor((now - startedAt) / SECOND);
  const values = [
    (1000 / mean).toFixed(0),
    pct(frames, 0.95).toFixed(1) + ' ms',
    fmt(Math.round(rate / 100) * 100),
    fmt(chart.getData().length),
    heap ? (heap / 2 ** 20).toFixed(0) + ' MB' : 'n/a',
    fmt(document.getElementsByTagName('*').length),
    `${Math.floor(up / 60)}:${String(up % 60).padStart(2, '0')}`,
  ];
  values.forEach((v, i) => { if (cells[i].textContent !== v) cells[i].textContent = v; });
}, HUD_INTERVAL_MS);

window.__soak = {
  ready: true,
  renderer: () => chart.getRenderer(),
  /** Counters since the start; the runner takes differences between reads. */
  stats: () => ({
    ticks: feed.ticks,
    frames: frameCount,
    frameP50: pct(frames, 0.5),
    frameP95: pct(frames, 0.95),
    longTasks,
    longTaskMs,
    bars: chart.getData().length,
    domNodes: document.getElementsByTagName('*').length,
  }),
};
