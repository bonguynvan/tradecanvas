// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const bars = Array.from({ length: 60 }, (_, i) => ({ time: 60_000 * i, open: 10 + i, high: 12 + i, low: 9 + i, close: 11 + i, volume: 100 + i }));

/** What was drawn on one canvas. */
interface Drawn {
  texts: string[];
  rects: { at: number[]; style: string }[];
  transforms: number[][];
  cleared: number;
  images: unknown[];
}

const drawings = new Map<HTMLCanvasElement, Drawn>();
const contexts = new Map<HTMLCanvasElement, CanvasRenderingContext2D>();

/** A 2D context that keeps what is drawn with it, the same one for a canvas each time it is asked for. */
function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const drawn: Drawn = { texts: [], rects: [], transforms: [], cleared: 0, images: [] };
  drawings.set(canvas, drawn);
  const state: Record<string | symbol, unknown> = { canvas };
  return new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'fillText') return (t: string) => { drawn.texts.push(String(t)); };
      if (prop === 'fillRect') return (...at: number[]) => { drawn.rects.push({ at, style: String(target.fillStyle) }); };
      if (prop === 'setTransform') return (...m: number[]) => { drawn.transforms.push(m); };
      if (prop === 'clearRect') return () => { drawn.cleared++; };
      if (prop === 'drawImage') return (...args: unknown[]) => { drawn.images.push(args); };
      if (prop === 'getImageData') return () => {
        if (drawn.images.some((args) => (args as [HTMLCanvasElement])[0]?.dataset?.fromElsewhere)) throw new DOMException('The canvas has been tainted by cross-origin data.', 'SecurityError');
        return { data: new Uint8ClampedArray(canvas.width * canvas.height * 4).fill(255) };
      };
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop: () => {} });
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const W = 800;
const H = 400;
let host: HTMLDivElement;
let chart: Chart;

beforeEach(() => {
  installChartStubs();
  drawings.clear();
  contexts.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!contexts.has(this)) contexts.set(this, contextOf(this));
    return contexts.get(this) as never;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement, type?: string, quality?: number) {
    return `data:${type ?? 'image/png'};size=${this.width}x${this.height}${quality === undefined ? '' : `;q=${quality}`}`;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback, type?: string) {
    done(new Blob([`${this.width}x${this.height}`], { type: type ?? 'image/png' }));
  });
  host = sizedHost(W, H);
  chart = new Chart(host, {});
  chart.setData(bars);
});

afterEach(() => {
  chart.destroy();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The canvases the chart has on the page. */
const own = () => [...host.querySelectorAll('canvas')];

describe('the chart as a picture drawn again', () => {
  it('is a canvas of its own, the chart’s size by the pixel ratio asked for, on the theme’s ground', () => {
    const picture = chart.toCanvas({ pixelRatio: 3 })!;
    expect(own()).not.toContain(picture);
    expect([picture.width, picture.height]).toEqual([W * 3, H * 3]);
    const drawn = drawings.get(picture)!;
    expect(drawn.transforms[0]).toEqual([3, 0, 0, 3, 0, 0]);
    expect(drawn.rects[0]).toEqual({ at: [0, 0, W, H], style: DARK_THEME.background });
    // The axes' texts are on it: the frame was drawn there.
    expect(drawn.texts.length).toBeGreaterThan(4);
  });

  it('is at the screen’s own ratio when none is asked for, and held to what a browser can draw', () => {
    const plain = chart.toCanvas()!;
    expect([plain.width, plain.height]).toEqual([W, H]);
    const huge = chart.toCanvas({ pixelRatio: 1000 })!;
    expect(Math.max(huge.width, huge.height)).toBeLessThanOrEqual(16_384);
    expect(huge.width * huge.height).toBeLessThanOrEqual(16_777_216 + huge.width + huge.height);
  });

  it('leaves the chart on the page as it is: its canvases are neither cleared nor sized again', () => {
    const before = own().map((c) => [c.width, c.height, drawings.get(c)?.cleared ?? 0]);
    chart.toCanvas({ pixelRatio: 2 });
    expect(own().map((c) => [c.width, c.height, drawings.get(c)?.cleared ?? 0])).toEqual(before);
  });

  it('is drawn in the theme asked for, and the chart keeps its own without a word of it', () => {
    const changes: unknown[] = [];
    chart.on('themeChange', (e) => changes.push(e));
    const ground = host.style.backgroundColor;
    const light = drawings.get(chart.toCanvas({ theme: 'light' })!)!;
    expect(light.rects[0].style).toBe(LIGHT_THEME.background);
    expect(chart.getTheme().name).toBe('dark');
    expect(host.style.backgroundColor).toBe(ground);
    expect(changes).toEqual([]);
    // The next picture, and the next frame, are dark again.
    expect(drawings.get(chart.toCanvas()!)!.rects[0].style).toBe(DARK_THEME.background);
  });

  it('keeps the font set over the theme in a picture of another theme', () => {
    chart.setFont({ family: 'Menlo' });
    const fonts: string[] = [];
    const picture = document.createElement('canvas');
    const base = contextOf(picture);
    contexts.set(picture, new Proxy(base, {
      set: (target, prop, value) => {
        if (prop === 'font') fonts.push(String(value));
        return Reflect.set(target, prop, value);
      },
    }));
    vi.spyOn(document, 'createElement').mockImplementationOnce(() => picture);
    chart.toCanvas({ theme: 'light' });
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((font) => font.includes('Menlo'))).toBe(true);
  });

  it('has on it a canvas the host laid over the chart, where that canvas is', () => {
    const layer = document.createElement('canvas');
    layer.width = 200;
    layer.height = 100;
    host.appendChild(layer);
    vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 110, top: 70, width: 200, height: 100, right: 310, bottom: 170, x: 110, y: 70, toJSON: () => ({}) });
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: W, height: H, right: W + 10, bottom: H + 20, x: 10, y: 20, toJSON: () => ({}) });
    const drawn = drawings.get(chart.toCanvas({ pixelRatio: 2 })!)!;
    expect(drawn.images).toEqual([[layer, 100, 50, 200, 100]]);
  });

  it('leaves out a canvas the page may not read, and one that is not shown: with either the picture would be no good', () => {
    const at = (left: number) => ({ left, top: 0, width: 100, height: 50, right: left + 100, bottom: 50, x: left, y: 0, toJSON: () => ({}) });
    const guest = (left: number): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      host.appendChild(canvas);
      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(at(left));
      return canvas;
    };
    const readable = guest(0);
    // It holds a picture from another site: the browser lets no one read a canvas it is drawn on.
    const fromElsewhere = guest(100);
    fromElsewhere.dataset.fromElsewhere = 'yes';
    const hidden = guest(200);
    hidden.style.visibility = 'hidden';
    vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
    const picture = chart.toCanvas({ pixelRatio: 2 })!;
    expect(drawings.get(picture)!.images.map((args) => (args as [HTMLCanvasElement])[0])).toEqual([readable]);
    // So the picture can still be read.
    expect(() => picture.getContext('2d')!.getImageData(0, 0, 1, 1)).not.toThrow();
  });

  it('takes in what a paused chart has not drawn yet, without a word to the page or a frame of its own', async () => {
    // Its first frame drawn: a legend drawn for the first time says how tall it is, which asks for a frame.
    await new Promise((resolve) => setTimeout(resolve, 40));
    const told: string[] = [];
    chart.on('visibleRangeChange', () => told.push('visibleRange'));
    chart.on('priceRangeChange', () => told.push('priceRange'));
    chart.suspend();
    // Something changed while it was paused: a frame is owed.
    chart.requestRender();
    const engine = (chart as unknown as { engine: { requestRender(): void } }).engine;
    const asked = vi.spyOn(engine, 'requestRender');
    told.length = 0;
    expect(chart.toCanvas({ pixelRatio: 2 })).not.toBeNull();
    expect(told).toEqual([]);
    expect(asked).not.toHaveBeenCalled();
    // The frame it owes the page is still owed: resuming draws it.
    chart.resume();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(asked).toHaveBeenCalled();
  });

  it('draws the chart’s own frame again after a picture in another theme, and not after one in its own', async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const engine = (chart as unknown as { engine: { requestRender(): void; renderNow(): void } }).engine;
    const asked = vi.spyOn(engine, 'requestRender');
    const drawn = vi.spyOn(engine, 'renderNow');
    chart.toCanvas({ pixelRatio: 2 });
    expect(asked).not.toHaveBeenCalled();
    expect(drawn).not.toHaveBeenCalled();
    // What a frame notes of where its labels are was noted for the other theme's font: the
    // page's own frame is drawn again at once, before anything on it can be pressed.
    chart.toCanvas({ theme: 'light' });
    expect(drawn).toHaveBeenCalledTimes(1);
  });

  it('is nothing with screenshots switched off, or for a chart with no size', () => {
    const off = new Chart(sizedHost(W, H), { features: { screenshot: false } });
    expect(off.toCanvas()).toBeNull();
    expect(off.screenshotDataURL({ pixelRatio: 2 })).toBeNull();
    off.print();
    expect(document.querySelector('iframe')).toBeNull();
    off.destroy();
    const empty = new Chart(sizedHost(0, 0), {});
    expect(empty.toCanvas()).toBeNull();
    empty.destroy();
  });
});

describe('the chart’s picture, saved, printed, made a PDF', () => {
  it('is read off the screen as before when only a format is asked for', () => {
    expect(chart.screenshotDataURL()).toBe(`data:image/png;size=${W}x${H}`);
    expect(chart.screenshotDataURL({ type: 'jpeg', quality: 0.8 })).toBe(`data:image/jpeg;size=${W}x${H};q=0.8`);
    // Read off the screen: no canvas was drawn on for it.
    expect([...drawings.values()].every((drawn) => drawn.transforms.every((m) => m[0] === 1))).toBe(true);
  });

  it('is drawn again for more pixels or another theme', async () => {
    expect(chart.screenshotDataURL({ pixelRatio: 2 })).toBe(`data:image/png;size=${W * 2}x${H * 2}`);
    expect(chart.screenshotDataURL({ theme: 'light', type: 'webp' })).toBe(`data:image/webp;size=${W}x${H};q=0.92`);
    const blob = await chart.screenshotBlob({ pixelRatio: 2, type: 'jpeg' });
    expect(blob?.type).toBe('image/jpeg');
    expect(await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob!);
    })).toBe(`${W * 2}x${H * 2}`);
  });

  it('is saved under the name given, ending as its format does', () => {
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(`${this.download} <- ${this.href}`);
    });
    chart.screenshot();
    chart.screenshot('btc', { type: 'webp', pixelRatio: 2 });
    chart.screenshot('btc.png');
    expect(saved).toEqual([
      `chart.png <- data:image/png;size=${W}x${H}`,
      `btc.webp <- data:image/webp;size=${W * 2}x${H * 2};q=0.92`,
      `btc.png <- data:image/png;size=${W}x${H}`,
    ]);
  });

  it('is printed on its own, light and at twice the pixels unless told otherwise', () => {
    chart.print({ title: 'BTCUSDT, 1h' });
    const frame = document.querySelector('iframe')!;
    expect(frame.contentDocument!.title).toBe('BTCUSDT, 1h');
    expect(frame.contentDocument!.querySelector('img')!.getAttribute('src')).toBe(`data:image/png;size=${W * 2}x${H * 2}`);
    const printed = [...drawings.entries()].find(([c]) => c.width === W * 2)![1];
    expect(printed.rects[0].style).toBe(LIGHT_THEME.background);
    expect(chart.getTheme().name).toBe('dark');
    frame.remove();
    chart.print({ theme: 'dark', pixelRatio: 1 });
    const dark = [...drawings.entries()].filter(([c]) => !own().includes(c) && c.width === W).at(-1)![1];
    expect(dark.rects[0].style).toBe(DARK_THEME.background);
  });

  it('says whether the print dialog was asked for', () => {
    expect(chart.print()).toBe(true);
    document.querySelector('iframe')!.remove();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => { throw new DOMException('Tainted canvases may not be exported.', 'SecurityError'); });
    expect(chart.print()).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('is a PDF of one page', async () => {
    const pdf = await chart.toPdf({ title: 'BTCUSDT', orientation: 'portrait' });
    expect(pdf?.type).toBe('application/pdf');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new TextDecoder('latin1').decode(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(pdf!);
    });
    expect(text).toContain('/Count 1');
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(text).toContain('/Title (BTCUSDT)');
    expect(text).toContain(`/Width ${W * 2} /Height ${H * 2}`);
  });

  it('copies a picture drawn again when more pixels are asked for', async () => {
    const written: { parts: Record<string, Promise<Blob>> }[] = [];
    vi.stubGlobal('ClipboardItem', class { constructor(public parts: Record<string, Promise<Blob>>) {} });
    vi.stubGlobal('navigator', { clipboard: { write: async (items: typeof written) => { written.push(...items); } } });
    expect(await chart.copyScreenshot({ pixelRatio: 2 })).toBe(true);
    const blob = await written[0].parts['image/png'];
    expect(await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    })).toBe(`${W * 2}x${H * 2}`);
  });
});
