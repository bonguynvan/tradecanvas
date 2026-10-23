// One scene of the README clips, picked by `?scene=`. The market is made up
// from a fixed seed, so a clip recorded again looks the same. The recorder
// (scripts/record-clips.mjs) drives the mouse and calls `window.stage`.
import { MockAdapter, PaperExecutionAdapter } from '@tradecanvas/chart';
import { ChartWidget, ChartWidgetGrid } from '@tradecanvas/chart/widget';
import { barIndexToX, priceToY } from '@tradecanvas/core';

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
Math.random = seeded(20261023);

const PRICES = { BTCUSDT: 64200, ETHUSDT: 3150, SOLUSDT: 148, BNBUSDT: 585 };
/** Ticks a few times a second, so a few seconds of video show the market moving. */
const TICK_MS = 180;

const market = (symbol = 'BTCUSDT') => new MockAdapter({ basePrice: PRICES[symbol] ?? 100, volatility: 0.9, tickInterval: TICK_MS, historySize: 400 });

const host = document.getElementById('host');
const params = new URLSearchParams(location.search);
const scene = params.get('scene') ?? 'hero';

const stage = { scene, ready: false };
window.stage = stage;

/** Page position of bar `index` and a price on a chart (its container is the origin of both). */
function pointer(chart) {
  return (index, price) => {
    const state = chart.viewport.getState();
    const box = chart.container.getBoundingClientRect();
    return { x: box.left + barIndexToX(index, state), y: box.top + priceToY(price, state) };
  };
}

const loaded = (chart) => new Promise((resolve) => {
  const check = () => (chart.getData().length > 50 ? resolve() : setTimeout(check, 50));
  check();
});

function widget(options = {}) {
  const symbol = options.symbol ?? 'BTCUSDT';
  return new ChartWidget(host, { symbol, timeframe: '5m', theme: 'dark', adapter: market(symbol), historyLimit: 400, ...options });
}

async function hero() {
  const w = widget();
  const chart = w.getChart();
  await loaded(chart);
  chart.addIndicator('ema', { period: 21 });
  chart.addIndicator('ema', { period: 55 });
  chart.addIndicator('rsi');
  return { widget: w, chart };
}

async function trading() {
  const w = widget({ trading: true });
  const chart = w.getChart();
  await loaded(chart);
  const bars = chart.getData();
  const last = bars[bars.length - 1].close;
  const broker = new PaperExecutionAdapter({ markPrice: last });
  chart.connectExecution(broker);
  setInterval(() => {
    const now = chart.getData();
    broker.setMarkPrice(now[now.length - 1].close);
  }, 250);
  await broker.placeOrder({ side: 'buy', type: 'market', price: last, quantity: 2 });
  const long = broker.getPositions()[0];
  await broker.modifyPosition({ positionId: long.id, stopLoss: last * 0.994, takeProfit: last * 1.006 });
  chart.placeOrderIntent({ side: 'sell', type: 'limit', price: last * 1.009, quantity: 1 });
  return { widget: w, chart, broker, entry: last };
}

async function replay() {
  const w = widget();
  const chart = w.getChart();
  await loaded(chart);
  chart.addIndicator('bb');
  return { widget: w, chart };
}

async function grid() {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
  const g = new ChartWidgetGrid(host, {
    layout: '2x2',
    sync: { crosshair: true, interval: false, symbol: false },
    adapter: (cell) => market(symbols[cell] ?? 'BTCUSDT'),
    widget: { theme: 'dark', historyLimit: 400 },
    cells: symbols.map((symbol, i) => ({ symbol, timeframe: ['5m', '15m', '1h', '5m'][i] })),
  });
  await new Promise((r) => setTimeout(r, 300));
  const first = g.getWidget(0).getChart();
  await loaded(first);
  return { grid: g, chart: first };
}

async function looks() {
  const w = widget({ symbol: 'ETHUSDT' });
  const chart = w.getChart();
  await loaded(chart);
  chart.addIndicator('ema', { period: 21 });
  chart.addIndicator('macd');
  return { widget: w, chart };
}

const SCENES = { hero, trading, replay, grid, looks, phone: hero };

Object.assign(stage, await SCENES[scene]());
stage.at = pointer(stage.chart);
// The cursor shows once the recorder first moves the mouse.
const cursor = document.getElementById('cursor');
addEventListener('mousemove', (e) => {
  cursor.classList.remove('hidden');
  cursor.style.left = `${e.clientX}px`;
  cursor.style.top = `${e.clientY}px`;
}, true);
addEventListener('mousedown', () => cursor.classList.add('down'), true);
addEventListener('mouseup', () => cursor.classList.remove('down'), true);
// A touch shows the fingertip for as long as it lasts.
const finger = document.getElementById('finger');
const follow = (e) => {
  const t = e.touches[0];
  if (!t) return;
  finger.classList.remove('hidden');
  finger.style.left = `${t.clientX}px`;
  finger.style.top = `${t.clientY}px`;
};
addEventListener('touchstart', follow, true);
addEventListener('touchmove', follow, true);
addEventListener('touchend', () => finger.classList.add('hidden'), true);
stage.ready = true;
