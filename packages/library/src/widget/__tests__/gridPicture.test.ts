// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartImageOptions } from '@tradecanvas/commons';
import { MAX_IMAGE_PIXELS } from '@tradecanvas/core';
import { gridPicture, type GridPiece } from '../gridPicture.js';

interface Drawn {
  fills: { at: number[]; style: string }[];
  images: { source: HTMLCanvasElement; at: number[] }[];
}

const drawn = new Map<HTMLCanvasElement, Drawn>();

/** A chart that gives a canvas of the size it is asked for, and keeps what it was asked. */
function fakeChart(gives: 'picture' | 'none' = 'picture') {
  const asked: ChartImageOptions[] = [];
  return {
    asked,
    toCanvas(options: ChartImageOptions = {}): HTMLCanvasElement | null {
      asked.push(options);
      if (gives === 'none') return null;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((options.width ?? 0) * (options.pixelRatio ?? 1));
      canvas.height = Math.round((options.height ?? 0) * (options.pixelRatio ?? 1));
      return canvas;
    },
  };
}

/** Two charts side by side over one as wide as both, a pixel between them. */
function threeCharts() {
  const charts = [fakeChart(), fakeChart(), fakeChart()];
  const pieces: GridPiece[] = [
    { chart: charts[0], box: { x: 0, y: 0, width: 400, height: 300 } },
    { chart: charts[1], box: { x: 401, y: 0, width: 400, height: 300 } },
    { chart: charts[2], box: { x: 0, y: 301, width: 801, height: 300 } },
  ];
  return { charts, pieces, size: { width: 801, height: 601 } };
}

describe('the charts of a grid as one picture', () => {
  beforeEach(() => {
    drawn.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const record: Drawn = drawn.get(this) ?? { fills: [], images: [] };
      drawn.set(this, record);
      const state: Record<string | symbol, unknown> = {};
      return new Proxy(state, {
        get: (target, prop) => {
          if (prop === 'fillRect') return (...at: number[]) => void record.fills.push({ at, style: String(target.fillStyle) });
          if (prop === 'drawImage') return (source: HTMLCanvasElement, ...at: number[]) => void record.images.push({ source, at });
          return prop in target ? target[prop] : () => undefined;
        },
        set: (target, prop, value) => {
          target[prop] = value;
          return true;
        },
      }) as never;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('has each chart where it is in the grid, on the ground between them', () => {
    const { charts, pieces, size } = threeCharts();
    const picture = gridPicture(pieces, size, { pixelRatio: 2 }, '#334455', 1);
    expect(picture).not.toBeNull();
    expect([picture!.width, picture!.height]).toEqual([1602, 1202]);
    const { fills, images } = drawn.get(picture!)!;
    // The ground first, over all of it: it shows between the charts.
    expect(fills[0]).toEqual({ at: [0, 0, 1602, 1202], style: '#334455' });
    expect(images.map((image) => image.at)).toEqual([
      [0, 0, 800, 600],
      [802, 0, 800, 600],
      [0, 602, 1602, 600],
    ]);
    // Each chart is asked for a picture of its cell, at the grid's pixels.
    expect(charts[0].asked).toEqual([{ width: 400, height: 300, pixelRatio: 2 }]);
    expect(charts[2].asked).toEqual([{ width: 801, height: 300, pixelRatio: 2 }]);
  });

  it('is at the size asked for, every chart at its share of it, in the theme asked for', () => {
    const { charts, pieces, size } = threeCharts();
    const picture = gridPicture(pieces, size, { width: 1602, height: 601, pixelRatio: 1, theme: 'light' }, '#fff', 2);
    expect([picture!.width, picture!.height]).toEqual([1602, 601]);
    // Twice as wide, as tall as it was: so is each chart.
    expect(charts[0].asked).toEqual([{ width: 800, height: 300, pixelRatio: 1, theme: 'light' }]);
    expect(drawn.get(picture!)!.images.map((image) => image.at)).toEqual([
      [0, 0, 800, 300],
      [802, 0, 800, 300],
      [0, 301, 1602, 300],
    ]);
  });

  it('is at the screen’s pixels with none asked for, and held to what a canvas can be', () => {
    const { pieces, size } = threeCharts();
    const onScreen = gridPicture(pieces, size, {}, '#000', 1.5);
    expect([onScreen!.width, onScreen!.height]).toEqual([1202, 902]);
    const vast = gridPicture(pieces, size, { width: 12_000, height: 9000, pixelRatio: 4 }, '#000', 1);
    expect(vast!.width * vast!.height).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
  });

  it('asks each chart for the very pixels its cell has, at a screen of a pixel and a half', () => {
    // Cells that do not fall on whole pixels: a third of 1000 each, a pixel between.
    const charts = [fakeChart(), fakeChart(), fakeChart()];
    const pieces: GridPiece[] = charts.map((chart, i) => ({ chart, box: { x: i * 333.67, y: 0, width: 332.67, height: 250.4 } }));
    const picture = gridPicture(pieces, { width: 1000, height: 250.4 }, {}, '#000', 1.5);
    const { images } = drawn.get(picture!)!;
    for (const image of images) {
      // Drawn as it is: a picture of another size than its place would be blurred into it.
      expect([image.source.width, image.source.height]).toEqual([image.at[2], image.at[3]]);
    }
    // Neighbours neither meet nor part by more than the line between them.
    expect(images[1].at[0] - (images[0].at[0] + images[0].at[2])).toBeGreaterThanOrEqual(1);
    expect(images[1].at[0] - (images[0].at[0] + images[0].at[2])).toBeLessThanOrEqual(2);
  });

  it('leaves out a chart with no place or no picture, and is no picture when none has one', () => {
    const shown = fakeChart();
    const hidden = fakeChart();
    const off = fakeChart('none');
    const pieces: GridPiece[] = [
      { chart: shown, box: { x: 0, y: 0, width: 400, height: 300 } },
      { chart: hidden, box: { x: 0, y: 0, width: 0, height: 0 } },
      { chart: off, box: { x: 401, y: 0, width: 400, height: 300 } },
    ];
    const picture = gridPicture(pieces, { width: 801, height: 300 }, { pixelRatio: 1 }, '#000', 1);
    expect(drawn.get(picture!)!.images).toHaveLength(1);
    expect(hidden.asked).toEqual([]);
    expect(gridPicture([pieces[1], pieces[2]], { width: 801, height: 300 }, {}, '#000', 1)).toBeNull();
    expect(gridPicture(pieces, { width: 0, height: 300 }, {}, '#000', 1)).toBeNull();
    expect(gridPicture([], { width: 801, height: 300 }, {}, '#000', 1)).toBeNull();
  });
});
