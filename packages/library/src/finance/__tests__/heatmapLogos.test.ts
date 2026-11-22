// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeatmapChart } from '../HeatmapChart.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

/** A stand-in for the browser's Image: it comes when told to. */
class FakeImage {
  static made: FakeImage[] = [];
  src = '';
  crossOrigin: string | null = null;
  referrerPolicy = '';
  decoding = '';
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeImage.made.push(this);
  }
  come(): void {
    this.naturalWidth = 64;
    this.naturalHeight = 64;
    this.onload?.();
  }
}

let host: HTMLDivElement;
/** The pictures drawn and the text written, newest last. */
let images: unknown[];
let texts: string[];

function recordingContext(): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      if (prop === 'fillText') return (t: string) => { texts.push(String(t)); };
      if (prop === 'drawImage') return (source: unknown) => { images.push(source); };
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

/** Draws the next frame and says what pictures were drawn in it; null when no frame was drawn. */
function frame(): unknown[] | null {
  images.length = 0;
  texts.length = 0;
  vi.advanceTimersByTime(20);
  return texts.length > 0 ? [...images] : null;
}

const cells = [
  { id: 'a', label: 'AAPL', value: 1.2, logo: 'https://cdn.example/aapl.png' },
  { id: 'b', label: 'MSFT', value: -0.4 },
];

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  FakeImage.made = [];
  vi.stubGlobal('Image', FakeImage);
  images = [];
  texts = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext() as never);
  host = sizedHost(600, 300);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 300, right: 600, bottom: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
});

afterEach(() => {
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('a heatmap whose cells have logos', () => {
  it('asks for a cell’s logo when it draws it, and draws again with the logo once it has come', () => {
    const chart = new HeatmapChart(host, { data: cells });
    expect(frame()).toEqual([]);
    expect(FakeImage.made.map((image) => image.src)).toEqual(['https://cdn.example/aapl.png']);
    // Nothing changed: no frame until the picture is here.
    expect(frame()).toBeNull();
    FakeImage.made[0].come();
    expect(frame()).toEqual([FakeImage.made[0]]);
    chart.destroy();
  });

  it('asks for no logo with logos switched off, and draws them when they are switched on', () => {
    const chart = new HeatmapChart(host, { data: cells, showLogos: false });
    frame();
    expect(FakeImage.made).toEqual([]);
    chart.setOptions({ showLogos: true });
    frame();
    FakeImage.made[0].come();
    expect(frame()).toEqual([FakeImage.made[0]]);
    chart.destroy();
  });

  it('has the logos that have come in its picture', () => {
    const chart = new HeatmapChart(host, { data: cells });
    frame();
    FakeImage.made[0].come();
    frame();
    images.length = 0;
    chart.toCanvas({ pixelRatio: 2 });
    expect(images).toEqual([FakeImage.made[0]]);
    chart.destroy();
  });

  it('has them in a picture of another size and another theme too', () => {
    const chart = new HeatmapChart(host, { data: cells });
    frame();
    FakeImage.made[0].come();
    frame();
    images.length = 0;
    chart.toCanvas({ width: 900, height: 500, theme: 'light' });
    expect(images).toEqual([FakeImage.made[0]]);
    chart.destroy();
  });

  it('lets go of the logos no cell has when its data changes, and asks for the new ones', () => {
    const chart = new HeatmapChart(host, { data: cells });
    frame();
    const old = FakeImage.made[0];
    chart.update([{ id: 'c', label: 'GOOG', value: 0.5, logo: 'https://cdn.example/goog.png' }]);
    // The picture still on its way is no longer waited for.
    expect(old.onload).toBeNull();
    frame();
    expect(FakeImage.made.map((image) => image.src)).toEqual(['https://cdn.example/aapl.png', 'https://cdn.example/goog.png']);
    chart.setOptions({ data: cells });
    expect(FakeImage.made[1].onload).toBeNull();
    chart.destroy();
  });

  it('waits for no logo once it is destroyed', () => {
    const chart = new HeatmapChart(host, { data: cells });
    frame();
    chart.destroy();
    expect(FakeImage.made[0].onload).toBeNull();
    FakeImage.made[0].come();
    expect(frame()).toBeNull();
  });
});
