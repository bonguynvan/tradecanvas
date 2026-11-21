// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DARK_THEME, LIGHT_THEME } from '@tradecanvas/commons';
import { BarChart } from '../BarChart.js';
import { DepthChart } from '../DepthChart.js';
import { EquityCurveChart } from '../EquityCurveChart.js';
import { WaterfallChart } from '../WaterfallChart.js';
import { HeatmapChart } from '../HeatmapChart.js';
import { GaugeChart } from '../GaugeChart.js';
import { SparklineChart } from '../SparklineChart.js';
import { SunburstChart } from '../SunburstChart.js';
import { SurfaceChart } from '../SurfaceChart.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

/** What was drawn on one canvas. */
interface Drawn {
  texts: string[];
  /** How many shapes were filled. */
  fills: number;
  /** Each rectangle filled, and the colour it was filled in. */
  rects: { at: number[]; style: string }[];
  transforms: number[][];
}

let host: HTMLDivElement;
const drawings = new Map<HTMLCanvasElement, Drawn>();

/** A 2D context that keeps what is drawn with it, the same one for a canvas each time it is asked for. */
function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const drawn: Drawn = { texts: [], fills: 0, rects: [], transforms: [] };
  drawings.set(canvas, drawn);
  const state: Record<string | symbol, unknown> = { canvas };
  return new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'fillText') return (t: string) => { drawn.texts.push(String(t)); };
      if (prop === 'fill') return () => { drawn.fills++; };
      if (prop === 'fillRect') return (...at: number[]) => { drawn.rects.push({ at, style: String(target.fillStyle) }); };
      if (prop === 'setTransform') return (...m: number[]) => { drawn.transforms.push(m); };
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop: () => {} });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(canvas.width * canvas.height * 4).fill(255) });
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const W = 400;
const H = 300;
const contexts = new Map<HTMLCanvasElement, CanvasRenderingContext2D>();

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  drawings.clear();
  contexts.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    if (!contexts.has(this)) contexts.set(this, contextOf(this));
    return contexts.get(this) as never;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement, type?: string) {
    return `data:${type ?? 'image/png'};size=${this.width}x${this.height}`;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback, type?: string) {
    done(new Blob([`${this.width}x${this.height}`], { type: type ?? 'image/png' }));
  });
  host = sizedHost(W, H);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const canvas = () => host.querySelector('canvas')!;
/** Draws the next frame of the chart on the page and says what was written in it. */
function frame(): string[] {
  const drawn = drawings.get(canvas())!;
  drawn.texts.length = 0;
  drawn.rects.length = 0;
  vi.advanceTimersByTime(20);
  return [...drawn.texts];
}
const point = (x: number, y: number) => canvas().dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));

const BARS = { categories: ['Mon', 'Tue', 'Wed'], series: [{ name: 'Net', values: [120, 80, 45] }] };

describe('a finance chart as a picture', () => {
  it('is a canvas of its own, the chart’s size by the screen’s pixel ratio, or by the one asked for', () => {
    const chart = new BarChart(host, BARS);
    frame();
    const plain = chart.toCanvas()!;
    expect(plain).not.toBe(canvas());
    expect([plain.width, plain.height]).toEqual([W, H]);
    expect(document.body.contains(plain)).toBe(false);
    const sharp = chart.toCanvas({ pixelRatio: 3 })!;
    expect([sharp.width, sharp.height]).toEqual([W * 3, H * 3]);
    // Drawn in the chart's own units, scaled to the picture's pixels.
    expect(drawings.get(sharp)!.transforms.at(-1)).toEqual([3, 0, 0, 3, 0, 0]);
    expect(drawings.get(sharp)!.texts).toEqual(expect.arrayContaining(['Mon', 'Tue', 'Wed']));
    chart.destroy();
  });

  it('is laid out again for a size of its own, and leaves the chart on the page as it was', () => {
    const clicked: string[] = [];
    const chart = new SunburstChart(host, { data: [{ label: 'A', value: 1 }, { label: 'B', value: 1 }], onNodeClick: (node) => clicked.push(node.label) });
    frame();
    const wide = chart.toCanvas({ width: 900, height: 600, pixelRatio: 2 })!;
    expect([wide.width, wide.height]).toEqual([1800, 1200]);
    expect(drawings.get(wide)!.rects[0].at).toEqual([0, 0, 900, 600]);
    // A click on the page still finds what is drawn there, not what the picture had there.
    canvas().dispatchEvent(new MouseEvent('click', { clientX: W / 2 + 80, clientY: H / 2, bubbles: true }));
    expect(clicked).toHaveLength(1);
    // The chart on the page was not drawn again for it.
    expect(drawings.get(canvas())!.rects.every((rect) => rect.at[2] === W)).toBe(true);
    chart.destroy();
  });

  it('holds its pixels to what a browser can draw', () => {
    const chart = new BarChart(host, BARS);
    const huge = chart.toCanvas({ pixelRatio: 500 })!;
    expect(Math.max(huge.width, huge.height)).toBeLessThanOrEqual(16_384);
    expect(huge.width * huge.height).toBeLessThanOrEqual(16_777_216 + huge.width + huge.height);
    expect(huge.width / huge.height).toBeCloseTo(W / H, 2);
    chart.destroy();
  });

  it('shows nothing that follows the pointer', () => {
    const made = [
      () => new BarChart(host, BARS),
      () => new DepthChart(host, { data: { bids: [{ price: 99, volume: 5 }, { price: 98, volume: 8 }], asks: [{ price: 101, volume: 4 }, { price: 102, volume: 9 }] } }),
      () => new EquityCurveChart(host, { data: Array.from({ length: 30 }, (_, i) => ({ time: Date.UTC(2026, 0, 1 + i), value: 100 + i })) }),
      () => new WaterfallChart(host, { data: [{ label: 'Revenue', value: 120 }, { label: 'Costs', value: -45 }, { label: 'Net', value: 75, type: 'total' }] }),
      () => new HeatmapChart(host, { data: [{ id: 'a', label: 'AAA', value: 3 }, { id: 'b', label: 'BBB', value: -2 }] }),
      () => new SurfaceChart(host, { x: [1, 2, 3], y: [1, 2, 3], values: [[1, 2, 3], [2, 3, 4], [3, 4, 5]], view: { yaw: -35, pitch: 90 } }),
    ];
    for (const make of made) {
      const chart = make();
      const quiet = frame();
      // Somewhere over the chart's middle, a few places tried: a readout shows as more text.
      let pointed = quiet;
      for (const [x, y] of [[W / 2, H / 2], [W / 3, H / 2], [W / 2, H / 3], [W * 0.3, H * 0.6]]) {
        point(x, y);
        pointed = frame();
        if (pointed.length > quiet.length) break;
      }
      expect(pointed.length, chart.constructor.name).toBeGreaterThan(quiet.length);
      expect(drawings.get(chart.toCanvas()!)!.texts, chart.constructor.name).toEqual(quiet);
      chart.destroy();
      drawings.clear();
      contexts.clear();
    }
  });

  it('is drawn in the theme asked for, on that theme’s ground, and the chart keeps its own', () => {
    const chart = new BarChart(host, BARS);
    frame();
    const own = drawings.get(chart.toCanvas()!)!;
    expect(own.rects[0]).toEqual({ at: [0, 0, W, H], style: DARK_THEME.background });
    const light = drawings.get(chart.toCanvas({ theme: 'light' })!)!;
    expect(light.rects[0]).toEqual({ at: [0, 0, W, H], style: LIGHT_THEME.background });
    chart.setOptions({ categories: ['Thu'] });
    frame();
    expect(drawings.get(canvas())!.rects[0].style).toBe(DARK_THEME.background);
    chart.destroy();
  });

  it('has a ground of its own even where the chart has none: a sparkline', () => {
    const chart = new SparklineChart(host, { data: [3, 5, 4, 8], theme: 'light' });
    expect(drawings.get(chart.toCanvas()!)!.rects[0]).toEqual({ at: [0, 0, W, H], style: LIGHT_THEME.background });
    chart.destroy();
  });

  it('shows a gauge at the value it is going to, not where its needle is on the way', () => {
    const chart = new GaugeChart(host, { value: 10, valueFormat: (v) => `at ${Math.round(v)}` });
    frame();
    chart.setValue(90);
    vi.advanceTimersByTime(40);
    expect(drawings.get(chart.toCanvas()!)!.texts).toContain('at 90');
    chart.destroy();
  });

  it('shows a large surface whole, though it is being turned and the page draws it with fewer cells', () => {
    const axis = Array.from({ length: 150 }, (_, i) => i);
    const chart = new SurfaceChart(host, { x: axis, y: axis, values: axis.map((r) => axis.map((c) => Math.sin(c / 20) + Math.cos(r / 25))), legend: false });
    frame();
    const whole = drawings.get(chart.toCanvas()!)!.fills;
    expect(whole).toBeGreaterThan(14_000);
    const press = (type: string, x: number) => canvas().dispatchEvent(new MouseEvent(type, { clientX: x, clientY: 150, bubbles: true, buttons: 1 }));
    press('pointerdown', 200);
    press('pointermove', 240);
    // The page's own frame, in the middle of the drag, has a quarter of the cells.
    const onPage = drawings.get(canvas())!;
    onPage.fills = 0;
    vi.advanceTimersByTime(20);
    expect(onPage.fills).toBeLessThan(whole / 3);
    expect(drawings.get(chart.toCanvas()!)!.fills).toBe(whole);
    chart.destroy();
  });

  it('is nothing for a chart with no size', () => {
    const empty = sizedHost(0, 0);
    const chart = new BarChart(empty, BARS);
    expect(chart.toCanvas()).toBeNull();
    expect(chart.screenshotDataURL()).toBeNull();
    chart.destroy();
    empty.remove();
  });
});

describe('a finance chart’s picture, saved, copied, printed', () => {
  it('is a data URL or a file’s bytes in the format asked for', async () => {
    const chart = new BarChart(host, BARS);
    expect(chart.screenshotDataURL()).toBe(`data:image/png;size=${W}x${H}`);
    expect(chart.screenshotDataURL({ type: 'jpeg', pixelRatio: 2 })).toBe(`data:image/jpeg;size=${W * 2}x${H * 2}`);
    const blob = await chart.screenshotBlob({ type: 'webp', pixelRatio: 2 });
    expect(blob?.type).toBe('image/webp');
    chart.destroy();
  });

  it('is saved under the name given, ending as its format does', () => {
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(`${this.download} <- ${this.href}`);
    });
    const chart = new BarChart(host, BARS);
    chart.screenshot();
    chart.screenshot('flows', { type: 'jpeg' });
    expect(saved).toEqual([`chart.png <- data:image/png;size=${W}x${H}`, `flows.jpg <- data:image/jpeg;size=${W}x${H}`]);
    chart.destroy();
  });

  it('is put on the clipboard as a PNG', async () => {
    const written: { parts: Record<string, Promise<Blob>> }[] = [];
    vi.stubGlobal('ClipboardItem', class { constructor(public parts: Record<string, Promise<Blob>>) {} });
    vi.stubGlobal('navigator', { clipboard: { write: async (items: typeof written) => { written.push(...items); } } });
    const chart = new BarChart(host, BARS);
    expect(await chart.copyScreenshot({ pixelRatio: 2 })).toBe(true);
    expect((await written[0].parts['image/png']).type).toBe('image/png');
    chart.destroy();
  });

  it('is printed on its own, in the light theme and at twice the pixels unless told otherwise', () => {
    const chart = new BarChart(host, BARS);
    chart.print({ title: 'Net flows' });
    const frameEl = document.querySelector('iframe')!;
    expect(frameEl.contentDocument!.title).toBe('Net flows');
    expect(frameEl.contentDocument!.querySelector('img')!.getAttribute('src')).toBe(`data:image/png;size=${W * 2}x${H * 2}`);
    const printed = [...drawings.entries()].find(([c]) => c.width === W * 2)![1];
    expect(printed.rects[0].style).toBe(LIGHT_THEME.background);
    frameEl.remove();
    chart.print({ theme: 'dark', pixelRatio: 3 });
    expect(document.querySelector('iframe')!.contentDocument!.querySelector('img')!.getAttribute('src')).toBe(`data:image/png;size=${W * 3}x${H * 3}`);
    const dark = [...drawings.entries()].find(([c]) => c.width === W * 3)![1];
    expect(dark.rects[0].style).toBe(DARK_THEME.background);
    chart.destroy();
  });

  it('says whether the print dialog was asked for', () => {
    const chart = new BarChart(host, BARS);
    expect(chart.print()).toBe(true);
    document.querySelector('iframe')!.remove();
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => { throw new DOMException('Tainted canvases may not be exported.', 'SecurityError'); });
    expect(chart.print()).toBe(false);
    expect(document.querySelector('iframe')).toBeNull();
    chart.destroy();
  });

  it('is a PDF of one page, in the light theme', async () => {
    vi.useRealTimers();
    const chart = new BarChart(host, BARS);
    const pdf = await chart.toPdf({ title: 'Net flows', pageSize: 'letter' });
    expect(pdf?.type).toBe('application/pdf');
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(pdf!);
    });
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text).toContain('/Count 1');
    expect(text).toContain('/MediaBox [0 0 792 612]');
    expect(text).toContain('/Title (Net flows)');
    expect(text).toContain(`/Width ${W * 2} /Height ${H * 2}`);
    const paper = [...drawings.entries()].find(([c]) => c.width === W * 2)![1];
    expect(paper.rects[0].style).toBe(LIGHT_THEME.background);
    chart.destroy();
  });
});
