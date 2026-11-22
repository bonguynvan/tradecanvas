import { describe, it, expect, vi } from 'vitest';
import { DARK_THEME } from '@tradecanvas/commons';
import type { HeatmapCell, HeatmapOptions } from '@tradecanvas/commons';
import { renderHeatmap, type CellImage } from '../HeatmapRenderer.js';
import type { LayoutRect } from '../HeatmapLayout.js';

interface Call { name: string; args: unknown[]; fillStyle: unknown; font: unknown; baseline: unknown }

/** A canvas stand-in that keeps every call, with the fill and the font it was made with. */
function recorder(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const state: Record<string | symbol, unknown> = { font: '10px sans-serif' };
  const ctx = new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      return (...args: unknown[]) => {
        calls.push({ name: String(prop), args, fillStyle: target.fillStyle, font: target.font, baseline: target.textBaseline });
      };
    },
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const picture = (width = 64, height = 64): CellImage => ({ source: { tag: 'logo' } as unknown as CanvasImageSource, width, height });
const cell: HeatmapCell = { id: 'a', label: 'AAPL', value: 1.2, logo: 'https://cdn.example/aapl.png' };
const one = (width: number, height: number): LayoutRect[] => [{ id: 'a', rect: { x: 0, y: 0, width, height } }];

/** Draws one cell of a size, and says what was drawn. */
function draw(width: number, height: number, logoOf?: (cell: HeatmapCell) => CellImage | null, options: Partial<HeatmapOptions> = {}, data: HeatmapCell = cell) {
  const { ctx, calls } = recorder();
  renderHeatmap(ctx, width, height, [data], one(width, height), { data: [data], ...options }, DARK_THEME, null, [], logoOf);
  const images = calls.filter((c) => c.name === 'drawImage').map((c) => {
    const [, x, y, w, h] = c.args as [unknown, number, number, number, number];
    return { x, y, w, h };
  });
  const texts = calls.filter((c) => c.name === 'fillText').map((c) => ({
    text: String(c.args[0]),
    x: c.args[1] as number,
    y: c.args[2] as number,
    size: parseFloat(String(c.font).replace('bold ', '')),
    baseline: c.baseline,
    most: c.args[3],
  }));
  return { calls, images, texts };
}

describe('a logo in a heatmap’s cell', () => {
  it('is drawn over the cell’s name, in a square in the middle across', () => {
    const { images, texts } = draw(200, 120, () => picture());
    expect(images).toHaveLength(1);
    const [logo] = images;
    expect(logo.w).toBe(logo.h);
    expect(logo.w).toBeGreaterThanOrEqual(14);
    expect(logo.x + logo.w / 2).toBeCloseTo(100, 5);
    const name = texts.find((t) => t.text === 'AAPL')!;
    const value = texts.find((t) => t.text === '+1.20%')!;
    // The name is written from its bottom up, the value from its top down: the logo ends over the name's top.
    expect(logo.y + logo.h).toBeLessThanOrEqual(name.y - name.size);
    expect(value.y).toBeGreaterThan(name.y);
    // All three inside the cell.
    expect(logo.y).toBeGreaterThanOrEqual(4);
    expect(value.y + value.size).toBeLessThanOrEqual(120 - 4);
  });

  it('stands with the name and the value in the middle of the cell, as much room over the logo as under the value', () => {
    const { images, texts } = draw(200, 120, () => picture());
    const value = texts.find((t) => t.text === '+1.20%')!;
    const over = images[0].y;
    const under = 120 - (value.y + value.size);
    expect(Math.abs(over - under)).toBeLessThanOrEqual(1);
  });

  it('leaves the text where it was for a cell with no logo, and for one whose picture has not come', () => {
    const plain = draw(200, 120).texts;
    expect(draw(200, 120, () => null).texts).toEqual(plain);
    expect(draw(200, 120, () => picture(), {}, { id: 'a', label: 'AAPL', value: 1.2 }).texts).toEqual(plain);
  });

  it('writes a cell with no logo as it always has: its name ending a hair over the middle, its value starting a hair under', () => {
    // The numbers the chart drew before it knew of logos, for a cell 200 by 120 in the dark theme.
    expect(draw(200, 120).texts).toEqual([
      { text: 'AAPL', x: 100, y: 59, size: 13, baseline: 'bottom', most: 192 },
      { text: '+1.20%', x: 100, y: 61, size: 11, baseline: 'top', most: 192 },
    ]);
    expect(draw(200, 120, undefined, { showValues: false }).texts).toEqual([{ text: 'AAPL', x: 100, y: 60, size: 13, baseline: 'middle', most: 192 }]);
    expect(draw(200, 120, undefined, { showLabels: false }).texts).toEqual([{ text: '+1.20%', x: 100, y: 60, size: 11, baseline: 'middle', most: 192 }]);
    // A cell with no number writes its name over a value of nothing.
    expect(draw(200, 120, undefined, {}, { id: 'a', label: 'AAPL', value: NaN }).texts).toEqual([
      { text: 'AAPL', x: 100, y: 59, size: 13, baseline: 'bottom', most: 192 },
      { text: '', x: 100, y: 61, size: 11, baseline: 'top', most: 192 },
    ]);
  });

  it('gives a line with nothing in it no room beside a logo: a cell with no number has its logo and its name in the middle', () => {
    const { images, texts } = draw(200, 120, () => picture(), {}, { ...cell, value: NaN });
    expect(texts.map((t) => t.text)).toEqual(['AAPL']);
    const [name] = texts;
    expect(name.baseline).toBe('middle');
    const over = images[0].y;
    const under = 120 - (name.y + name.size / 2);
    expect(Math.abs(over - under)).toBeLessThanOrEqual(1);
  });

  it('keeps a long name and its logo inside the cell', () => {
    const long = { ...cell, label: 'A very long name of a company indeed' };
    const { images, texts } = draw(200, 120, () => picture(), {}, long);
    expect(images).toHaveLength(1);
    const value = texts.find((t) => t.text === '+1.20%')!;
    expect(images[0].y).toBeGreaterThanOrEqual(4);
    expect(value.y + value.size).toBeLessThanOrEqual(116);
    expect(texts[0].most).toBe(192);
  });

  it('has a logo in a narrow cell from forty-one across, and none in a wide cell too short for it', () => {
    expect(draw(40, 200, () => picture()).images).toEqual([]);
    const narrow = draw(42, 200, () => picture()).images;
    expect(narrow).toHaveLength(1);
    expect(narrow[0].w).toBe(14);
    expect(narrow[0].x).toBeGreaterThanOrEqual(4);
    expect(narrow[0].x + narrow[0].w).toBeLessThanOrEqual(38);
    const short = draw(300, 50, () => picture());
    expect(short.images).toEqual([]);
    expect(short.texts).toEqual(draw(300, 50).texts);
  });

  it('draws nothing of a picture that has no size, and leaves the text where it is', () => {
    const none = draw(200, 120, () => picture(0, 64));
    expect(none.images).toEqual([]);
    expect(none.texts).toEqual(draw(200, 120).texts);
  });

  it('goes before the text does: a cell with no room for it keeps its name and its value', () => {
    const { images, texts } = draw(70, 44, () => picture());
    expect(images).toEqual([]);
    expect(texts.map((t) => t.text)).toEqual(['AAPL', '+1.20%']);
  });

  it('is asked for only where it will be drawn: not for a cell with none, nor one with no room, nor with logos switched off', () => {
    const logoOf = vi.fn(() => picture());
    draw(200, 120, logoOf, {}, { id: 'a', label: 'AAPL', value: 1.2 });
    draw(70, 44, logoOf);
    draw(30, 20, logoOf);
    draw(200, 120, logoOf, { showLogos: false });
    expect(logoOf).not.toHaveBeenCalled();
    draw(200, 120, logoOf);
    expect(logoOf).toHaveBeenCalledTimes(1);
    expect(logoOf).toHaveBeenCalledWith(cell);
  });

  it('is not drawn with logos switched off, and the text stays where it is without one', () => {
    const off = draw(200, 120, () => picture(), { showLogos: false });
    expect(off.images).toEqual([]);
    expect(off.texts).toEqual(draw(200, 120).texts);
  });

  it('is whole inside its square whatever its shape: a wide picture across it, a tall one down it', () => {
    const [square] = draw(200, 120, () => picture(64, 64)).images;
    const [wide] = draw(200, 120, () => picture(120, 60)).images;
    const [tall] = draw(200, 120, () => picture(30, 90)).images;
    expect(wide.w).toBeCloseTo(square.w, 5);
    expect(wide.h).toBeCloseTo(square.w / 2, 5);
    expect(wide.y).toBeCloseTo(square.y + square.w / 4, 5);
    expect(tall.h).toBeCloseTo(square.h, 5);
    expect(tall.w).toBeCloseTo(square.h / 3, 5);
    expect(tall.x + tall.w / 2).toBeCloseTo(100, 5);
  });

  it('is cut to a white plate with round corners, and the cut is undone after it', () => {
    const { calls } = draw(200, 120, () => picture());
    const at = calls.findIndex((c) => c.name === 'drawImage');
    const before = calls.slice(0, at);
    const clip = before.map((c) => c.name).lastIndexOf('clip');
    const plate = before.map((c) => c.name).lastIndexOf('fill');
    const save = before.map((c) => c.name).lastIndexOf('save');
    expect(save).toBeGreaterThanOrEqual(0);
    expect(plate).toBeGreaterThan(save);
    expect(before[plate].fillStyle).toBe('#FFFFFF');
    expect(clip).toBeGreaterThan(plate);
    expect(calls[at + 1].name).toBe('restore');
  });

  it('stands alone in the middle of a cell that writes neither its name nor its value', () => {
    const { images, texts } = draw(200, 120, () => picture(), { showLabels: false, showValues: false });
    expect(texts).toEqual([]);
    expect(images[0].y + images[0].h / 2).toBeCloseTo(60, 5);
  });

  it('is as large as a third of the cell’s shorter side, and no larger than forty', () => {
    expect(draw(200, 120, () => picture()).images[0].w).toBe(40);
    expect(draw(600, 400, () => picture()).images[0].w).toBe(40);
    expect(draw(120, 90, () => picture()).images[0].w).toBeLessThan(40);
  });
});
