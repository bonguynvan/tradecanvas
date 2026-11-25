// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChartImageOptions } from '@tradecanvas/commons';
import { chartsToPdf } from '../chartsToPdf.js';

/** A canvas of a size whose pixels are all white: what a chart hands over for a page. */
function page(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext = (() => ({ getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4).fill(255) }) })) as never;
  return canvas;
}

/** A chart that says what it was asked for, and gives a canvas of `width` × `height` (none when 0). */
function chart(width: number, height: number) {
  const asked: ChartImageOptions[] = [];
  return { asked, toCanvas: (options?: ChartImageOptions) => { asked.push(options ?? {}); return width > 0 ? page(width, height) : null; } };
}

async function text(pdf: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new TextDecoder('latin1').decode(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(pdf);
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('several charts as one PDF', () => {
  it('has a page for each chart, in the order given', async () => {
    const pdf = await chartsToPdf([chart(40, 20), chart(30, 30), page(20, 60)], { title: 'Monthly report' });
    expect(pdf?.type).toBe('application/pdf');
    const file = await text(pdf!);
    expect(file).toContain('/Count 3');
    expect(file).toContain('/Title (Monthly report)');
    const widths = [...file.matchAll(/\/Width (\d+) \/Height (\d+)/g)].map((m) => `${m[1]}x${m[2]}`);
    expect(widths).toEqual(['40x20', '30x30', '20x60']);
  });

  it('asks each chart for a picture for paper: light and at twice the pixels, unless told otherwise', async () => {
    const one = chart(40, 20);
    await chartsToPdf([one]);
    expect(one.asked).toEqual([{ theme: 'light', pixelRatio: 2 }]);
    const two = chart(40, 20);
    await chartsToPdf([two], { theme: 'dark', pixelRatio: 3, pageSize: 'letter', margin: 5, title: 'x', orientation: 'portrait' });
    // What is the page's is not the picture's.
    expect(two.asked).toEqual([{ theme: 'dark', pixelRatio: 3 }]);
  });

  it('leaves out a chart with no picture to give, and is nothing when none has one', async () => {
    const pdf = await chartsToPdf([chart(0, 0), chart(40, 20)]);
    expect(await text(pdf!)).toContain('/Count 1');
    expect(await chartsToPdf([chart(0, 0)])).toBeNull();
    expect(await chartsToPdf([])).toBeNull();
  });
});
