/** The same numbers every run: a seeded generator (mulberry32). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value, decimals) => Number(value.toFixed(decimals));

export const DAY = 86_400_000;
export const HOUR = 3_600_000;
export const MINUTE = 60_000;
/** 2026-01-05, a Monday, 00:00 UTC. */
export const START = Date.UTC(2026, 0, 5);

/**
 * Bars on a random walk, ascending, `time` in milliseconds:
 * `{ time, open, high, low, close, volume }`.
 */
export function bars({ count = 120, start = START, step = DAY, base = 100, seed = 7, decimals = 2, volatility = 0.02 } = {}) {
  const next = random(seed);
  const out = [];
  let close = base;
  for (let i = 0; i < count; i++) {
    const open = close;
    close = round(open * (1 + (next() - 0.5) * 2 * volatility), decimals);
    const high = round(Math.max(open, close) * (1 + next() * volatility / 2), decimals);
    const low = round(Math.min(open, close) * (1 - next() * volatility / 2), decimals);
    out.push({ time: start + i * step, open, high, low, close, volume: Math.round(1000 + next() * 9000) });
  }
  return out;
}

/** An order book around `mid`: `levels` asks above and bids below, `{ price, volume }`. */
export function book({ mid = 100, tick = 0.5, levels = 8, seed = 3 } = {}) {
  const next = random(seed);
  const side = (dir) => Array.from({ length: levels }, (_, i) => ({ price: round(mid + dir * (i + 1) * tick, 2), volume: round(1 + next() * 20, 2) }));
  return { asks: side(1), bids: side(-1) };
}

/** Wilder's RSI of `closes` at the last bar: an answer that computes its own must agree with it. */
export function wilderRsi(closes, period = 14) {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(change, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-change, 0)) / period;
  }
  return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
}

/**
 * How light a colour is, 0–1, from `#rgb`, `#rrggbb` (with or without alpha)
 * or `rgb()`: a light chart's ground is above a half.
 */
export function lightness(color) {
  const text = String(color).trim();
  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})(?:[0-9a-f]{2}|[0-9a-f])?$/i.exec(text);
  let rgb;
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    rgb = (/rgba?\(([^)]+)\)/.exec(text)?.[1] ?? '').split(/[\s,/]+/).slice(0, 3).map(Number);
  }
  if (rgb.length < 3 || rgb.some((v) => !Number.isFinite(v))) throw new Error(`not a colour: ${color}`);
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}

/** Wait for timers, frames and promises to settle. */
export const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));
