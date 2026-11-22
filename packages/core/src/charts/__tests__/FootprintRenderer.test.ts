import { describe, it, expect, vi, afterEach } from 'vitest';
import type { DataSeries, FootprintLevel, OHLCBar, ViewportState } from '@tradecanvas/commons';
import { DARK_THEME } from '@tradecanvas/commons';
import { CandlestickRenderer } from '../CandlestickRenderer.js';
import { FootprintRenderer } from '../FootprintRenderer.js';
import { FootprintStore } from '../footprint.js';

const MIN = 60_000;
const T0 = Date.UTC(2025, 0, 6);
const bar = (i: number, low: number, high: number, open = low, close = high): OHLCBar =>
  ({ time: T0 + i * MIN, open, high, low, close, volume: 1 });
const level = (price: number, buy: number, sell: number): FootprintLevel => ({ price, buy, sell });

interface Text { text: string; x: number; y: number; font: string; align: string }
interface Box { x: number; y: number; w: number; h: number; fill: string; alpha: number }

/** Records the rects filled and outlined and the texts written, each with the state it was drawn in. */
function recorder() {
  const rects: Box[] = [];
  const outlines: Box[] = [];
  const texts: Text[] = [];
  const state: Record<string, unknown> = { fillStyle: '', strokeStyle: '', font: '', textAlign: 'start', globalAlpha: 1 };
  const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h, fill: String(state.fillStyle), alpha: Number(state.globalAlpha) });
  const ctx = new Proxy(state, {
    get: (t, key) => {
      if (key === 'fillRect') return (x: number, y: number, w: number, h: number) => rects.push(box(x, y, w, h));
      if (key === 'strokeRect') return (x: number, y: number, w: number, h: number) => outlines.push(box(x, y, w, h));
      if (key === 'fillText') return (text: string, x: number, y: number) => texts.push({ text, x, y, font: String(state.font), align: String(state.textAlign) });
      if (key === 'measureText') return (text: string) => ({ width: text.length * 6 });
      if (key in t) return t[key as string];
      return vi.fn();
    },
    set: (t, key, v) => { t[key as string] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, rects, outlines, texts };
}

// 100 px per price unit (0…10 over 1000 px); the bars' boxes start at 0, 104, 208…
const viewport = (barWidth: number): ViewportState => ({
  visibleRange: { from: 0, to: 1 },
  priceRange: { min: 0, max: 10 },
  barWidth,
  barSpacing: 4,
  offset: 0,
  chartRect: { x: 0, y: 0, width: 400, height: 1000 },
});

const data: DataSeries = [bar(0, 2, 3.5), bar(1, 3, 5, 5, 3)];

function setup(rowSize = 0.5) {
  const store = new FootprintStore();
  store.setRowSize(rowSize);
  const renderer = new FootprintRenderer();
  renderer.setStore(store);
  return { store, renderer };
}

afterEach(() => vi.restoreAllMocks());

describe('FootprintRenderer', () => {
  it('writes what the sellers and the buyers took in each row of a wide bar, sellers on the left', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6), level(2.5, 8, 2), level(3, 3, 4)] });
    const { ctx, texts } = recorder();
    renderer.render(ctx, data, viewport(100), DARK_THEME);
    expect(texts.map((t) => t.text).sort()).toEqual(['1', '2', '3', '4', '6', '8']);
    // The row at 2: from 2.5 (y 750) down to 2 (y 800); its numbers sit in it, sold left of bought.
    const sold = texts.find((t) => t.text === '6')!;
    const bought = texts.find((t) => t.text === '1')!;
    expect(sold.y).toBeGreaterThan(750);
    expect(sold.y).toBeLessThan(800);
    expect(bought.y).toBe(sold.y);
    expect(sold.x).toBeLessThan(bought.x);
    // Inside the first bar's box.
    for (const t of texts) {
      expect(t.x).toBeGreaterThan(0);
      expect(t.x).toBeLessThan(100);
    }
  });

  it('draws rows too thin to read several to one, on round prices', () => {
    // Rows of 0.05 are 5 px tall: five to one makes 25.
    const { store, renderer } = setup(0.05);
    store.set({ time: T0, levels: [level(2, 1, 1), level(2.05, 2, 0), level(2.3, 4, 7)] });
    const { ctx, texts } = recorder();
    renderer.render(ctx, data, viewport(100), DARK_THEME);
    expect(texts.map((t) => t.text).sort()).toEqual(['1', '3', '4', '7']);
  });

  it('draws bars for the two sides, and no numbers, where the bar is too narrow for them', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6), level(2.5, 8, 2), level(3, 3, 4)] });
    const { ctx, texts, rects } = recorder();
    renderer.render(ctx, data, viewport(40), DARK_THEME);
    expect(texts).toEqual([]);
    // The largest cell (8 bought at 2.5) reaches the bar's right edge; a smaller one stops short.
    const inRow = (top: number, bottom: number) => rects.filter((r) => r.y >= top && r.y + r.h <= bottom && r.h > 1 && r.fill !== '');
    const right = (boxes: Box[]) => Math.max(...boxes.map((r) => r.x + r.w));
    expect(right(inRow(700, 750))).toBeCloseTo(40, 0);
    expect(right(inRow(750, 800))).toBeLessThan(30);
    // Up and down colours both.
    const fills = new Set(rects.map((r) => r.fill));
    expect(fills.has(DARK_THEME.candleUp)).toBe(true);
    expect(fills.has(DARK_THEME.candleDown)).toBe(true);
  });

  it('leaves the bars to the candles when they are too narrow for a footprint', () => {
    const candles = vi.spyOn(CandlestickRenderer.prototype, 'render').mockImplementation(() => {});
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6)] });
    const { ctx, texts, rects } = recorder();
    renderer.render(ctx, data, viewport(8), DARK_THEME);
    expect(candles).toHaveBeenCalledTimes(1);
    expect(texts).toEqual([]);
    expect(rects).toEqual([]);
  });

  it('draws a slim candle by every wide bar, with a footprint or none', () => {
    const candles = vi.spyOn(CandlestickRenderer.prototype, 'render').mockImplementation(() => {});
    const { renderer } = setup();
    const { ctx, rects } = recorder();
    renderer.render(ctx, data, viewport(100), DARK_THEME);
    expect(candles).not.toHaveBeenCalled();
    // A wick and a body each, at the left of its box: the first bar's from its low (y 800) to its high (y 650).
    const first = rects.filter((r) => r.x < 12);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...first.map((r) => r.y))).toBeCloseTo(650, 0);
    expect(Math.max(...first.map((r) => r.y + r.h))).toBeCloseTo(800, 0);
    const second = rects.filter((r) => r.x >= 104 && r.x < 116);
    expect(second.length).toBeGreaterThanOrEqual(2);
    expect(second.every((r) => r.fill === DARK_THEME.candleDown || r.fill === DARK_THEME.candleDownWick)).toBe(true);
  });

  it('writes bought less sold in each row when asked for the delta, and both together for the volume', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6), level(2.5, 8, 2)] });
    renderer.setCells('delta');
    const delta = recorder();
    renderer.render(delta.ctx, data, viewport(100), DARK_THEME);
    expect(delta.texts.map((t) => t.text).sort()).toEqual(['-5', '6']);
    renderer.setCells('volume');
    const volume = recorder();
    renderer.render(volume.ctx, data, viewport(100), DARK_THEME);
    expect(volume.texts.map((t) => t.text).sort()).toEqual(['10', '7']);
  });

  it('marks where one side outdid the other in bold, and outlines the row most traded at', () => {
    const { store, renderer } = setup();
    // Bought 9 at 2.5 against 2 sold at 2: an imbalance of the buyers. The row at 2.5 is the most traded at.
    store.set({ time: T0, levels: [level(2, 3, 2), level(2.5, 9, 6), level(3, 5, 4)] });
    const { ctx, texts, outlines } = recorder();
    renderer.render(ctx, data, viewport(100), DARK_THEME);
    const bold = texts.filter((t) => t.font.includes('bold')).map((t) => t.text);
    expect(bold).toEqual(['9']);
    expect(outlines).toHaveLength(1);
    expect(outlines[0].y).toBeGreaterThanOrEqual(700);
    expect(outlines[0].y + outlines[0].h).toBeLessThanOrEqual(750);
    // With the marking off, none is bold.
    renderer.setImbalance(0);
    const plain = recorder();
    renderer.render(plain.ctx, data, viewport(100), DARK_THEME);
    expect(plain.texts.some((t) => t.font.includes('bold'))).toBe(false);
  });

  it('tints a cell of one number by the number, not by its mark: a small difference stays faint', () => {
    const { store, renderer } = setup();
    // At 2.5 the buyers took 4 against 1 sold a row below: marked, though the sides are almost level there.
    store.set({ time: T0, levels: [level(2, 9, 1), level(2.5, 4, 3.9)] });
    renderer.setCells('delta');
    const { ctx, rects, texts } = recorder();
    renderer.render(ctx, data, viewport(100), DARK_THEME);
    const cellAt = (top: number, bottom: number) => rects.find((r) => r.y >= top && r.y + r.h <= bottom && r.w > 40)!;
    const large = cellAt(750, 800);
    const small = cellAt(700, 750);
    expect(small.alpha).toBeLessThan(large.alpha);
    // The mark is still told: its number is bold.
    expect(texts.find((t) => t.text === '0.1')!.font).toContain('bold');
    expect(texts.find((t) => t.text === '8')!.font).not.toContain('bold');
  });

  it('writes smaller in halves too narrow for the usual size, so a number stays in its half', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 12_340, 99_900)] });
    const size = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);
    const wide = recorder();
    renderer.render(wide.ctx, data, viewport(120), DARK_THEME);
    const narrow = recorder();
    renderer.render(narrow.ctx, data, viewport(76), DARK_THEME);
    expect(narrow.texts.map((t) => t.text).sort()).toEqual(['12.3K', '99.9K']);
    expect(size(narrow.texts[0].font)).toBeLessThan(size(wide.texts[0].font));
    // Five characters and their padding fit the half: its width is the bar's cells halved.
    const half = (76 - 5 - 3) / 2;
    expect(size(narrow.texts[0].font) * 3 + 4).toBeLessThanOrEqual(half);
  });

  it('draws no cells for the bars a replay has not shown yet', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6)] });
    store.set({ time: T0 + MIN, levels: [level(3, 7, 9)] });
    renderer.setShownUntil(T0 + MIN);
    const { ctx, texts } = recorder();
    renderer.render(ctx, data, viewport(100), DARK_THEME);
    expect(texts.map((t) => t.text).sort()).toEqual(['1', '6']);
    renderer.setShownUntil(null);
    const all = recorder();
    renderer.render(all.ctx, data, viewport(100), DARK_THEME);
    expect(all.texts).toHaveLength(4);
  });

  it('finds the footprint of bars whose times are in seconds', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6)] });
    const inSeconds = data.map((b) => ({ ...b, time: b.time / 1000 }));
    const { ctx, texts } = recorder();
    renderer.render(ctx, inSeconds, viewport(100), DARK_THEME);
    expect(texts.map((t) => t.text).sort()).toEqual(['1', '6']);
  });

  it('draws only the rows and the bars in view', () => {
    const { store, renderer } = setup();
    store.set({ time: T0, levels: [level(2, 1, 6), level(40, 5, 5)] });
    store.set({ time: T0 + MIN, levels: [level(3, 7, 9)] });
    const { ctx, texts } = recorder();
    renderer.render(ctx, data, { ...viewport(100), visibleRange: { from: 0, to: 0 } }, DARK_THEME);
    // The row at 40 is far above the scale; the second bar is out of the range drawn.
    expect(texts.map((t) => t.text).sort()).toEqual(['1', '6']);
  });
});
