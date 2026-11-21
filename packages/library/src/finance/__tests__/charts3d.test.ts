// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DARK_THEME, type Bar3DChartOptions, type BarHit, type SurfaceChartOptions, type SurfacePoint, type View3D } from '@tradecanvas/commons';
import { computeBar3DLayout, computeSurfaceLayout } from '@tradecanvas/core';
import { SurfaceChart } from '../SurfaceChart.js';
import { Bar3DChart } from '../Bar3DChart.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

let host: HTMLDivElement;
/** Every text the charts drew, newest last. */
let texts: string[];

/** A 2D context that keeps the text drawn with it. */
function recordingContext(): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'fillText') return (t: string) => { texts.push(String(t)); };
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
/** As the stand-in context measures: 6 px a character. */
const measure = (text: string) => text.length * 6;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  texts = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext() as never);
  host = sizedHost(W, H);
  // jsdom has no layout: the canvas sits at the page's top left.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
});

afterEach(() => {
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Draws the next frame and says what was written in it. */
function frame(): string[] {
  texts.length = 0;
  vi.advanceTimersByTime(20);
  return [...texts];
}

const canvas = () => host.querySelector('canvas')!;
/** A pointer event as jsdom can make one: a mouse event under the pointer's name, a finger's when `touch`. */
function pointer(type: string, x: number, y: number, touch = false): void {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, buttons: type === 'pointerup' ? 0 : 1 });
  if (touch) Object.defineProperty(event, 'pointerType', { value: 'touch' });
  canvas().dispatchEvent(event);
}
const click = (x: number, y: number) => canvas().dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
const plain = (v: number) => String(Number(v.toFixed(4)));

const SMILE: SurfaceChartOptions = {
  x: [90, 100, 110],
  y: [30, 60, 90],
  values: [
    [0.3, 0.2, 0.26],
    [0.28, 0.21, 0.25],
    [0.27, 0.22, 0.24],
  ],
  valueFormat: plain,
};
const BARS: Bar3DChartOptions = {
  categories: ['Q1', 'Q2', 'Q3'],
  series: [
    { name: 'Stocks', values: [4, 6, 5] },
    { name: 'Bonds', values: [2, 3, 1] },
  ],
  valueFormat: plain,
};

/** The surface from straight above: no cell is behind another, and a value that changes moves no point on the screen. */
const FLAT: SurfaceChartOptions = { ...SMILE, view: { yaw: -35, pitch: 90 } };

/** A place on the surface by its middle point, as the chart lays it out. */
function middleOf(options: SurfaceChartOptions): { x: number; y: number } {
  const layout = computeSurfaceLayout(options, W, H, DARK_THEME, measure);
  const k = layout.columns.length + 1;
  return { x: layout.sx[k] + 2, y: layout.sy[k] - 2 };
}

describe('the 3D charts', () => {
  it('say what they show to screen readers, in the words given when there are some', () => {
    const made = [new SurfaceChart(host, SMILE), new Bar3DChart(host, BARS), new SurfaceChart(host, { ...SMILE, ariaLabel: 'Implied volatility by strike and expiry' })];
    const labels = [...host.querySelectorAll('canvas')].map((c) => c.getAttribute('aria-label'));
    expect(labels).toEqual(['3D surface of 3 by 3 points', '3D bar chart of 2 series over 3 categories', 'Implied volatility by strike and expiry']);
    expect([...host.querySelectorAll('canvas')].every((c) => c.getAttribute('role') === 'img')).toBe(true);
    for (const chart of made) chart.destroy();
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('show the surface’s point at the pointer, none with the readout off, and draw new values', () => {
    const chart = new SurfaceChart(host, FLAT);
    const quiet = frame();
    const at = middleOf(FLAT);
    pointer('pointermove', at.x, at.y);
    expect(frame().slice(quiet.length)).toEqual(['0.21', 'x: 100', 'y: 60']);
    chart.setOptions({ crosshair: false });
    expect(frame()).toEqual(quiet);
    chart.setOptions({ crosshair: true });
    const values = SMILE.values.map((row) => [...row]);
    values[1][1] = 0.215;
    chart.update(values);
    expect(frame()).toContain('0.215');
    chart.update(values, { x: [95, 100, 105] });
    expect(frame()).toEqual(expect.arrayContaining(['95', '105']));
    chart.destroy();
  });

  it('show a column’s value at the pointer, and draw new series', () => {
    const chart = new Bar3DChart(host, BARS);
    const quiet = frame();
    const front = computeBar3DLayout(BARS, W, H, DARK_THEME, measure).bars.at(-1)!;
    pointer('pointermove', front.top.x, front.top.y);
    expect(frame().slice(quiet.length)).toEqual(['Q1', 'Stocks: 4']);
    chart.update([{ name: 'Stocks', values: [9, 6, 5] }, BARS.series[1]]);
    expect(frame().slice(-1)).toEqual(['Stocks: 9']);
    chart.update(BARS.series, ['Jan', 'Feb', 'Mar']);
    expect(frame()).toContain('Feb');
    chart.destroy();
  });

  it('turn and tilt as a mouse drags them, and say where they are seen from', () => {
    const seen: Required<View3D>[] = [];
    const chart = new SurfaceChart(host, { ...SMILE, onViewChange: (view) => seen.push(view) });
    frame();
    expect(chart.getView()).toEqual({ yaw: -35, pitch: 28 });
    pointer('pointerdown', 200, 150);
    pointer('pointermove', 250, 170);
    const turned = chart.getView();
    // Dragged right, the near side goes right; dragged down, the eye rises.
    expect(turned.yaw).toBeLessThan(-35);
    expect(turned.pitch).toBeGreaterThan(28);
    expect(seen.at(-1)).toEqual(turned);
    pointer('pointermove', 150, 130);
    expect(chart.getView().yaw).toBeGreaterThan(-35);
    expect(chart.getView().pitch).toBeLessThan(28);
    pointer('pointerup', 150, 130);
    // The pointer is free again: a move turns nothing.
    const left = chart.getView();
    pointer('pointermove', 300, 200);
    expect(chart.getView()).toEqual(left);
    chart.destroy();
  });

  it('keep the tilt between the floor and straight above, however far they are dragged', () => {
    const chart = new Bar3DChart(host, BARS);
    frame();
    pointer('pointerdown', 200, 150);
    pointer('pointermove', 200, 2000);
    expect(chart.getView().pitch).toBe(90);
    pointer('pointermove', 200, -2000);
    expect(chart.getView().pitch).toBe(0);
    pointer('pointerup', 200, -2000);
    chart.destroy();
  });

  it('turn under a finger and leave the tilt alone, so that a page scrolls under it', () => {
    const chart = new SurfaceChart(host, SMILE);
    frame();
    expect(canvas().style.touchAction).toBe('pan-y');
    pointer('pointerdown', 200, 150, true);
    pointer('pointermove', 260, 220, true);
    expect(chart.getView().yaw).toBeLessThan(-35);
    expect(chart.getView().pitch).toBe(28);
    // The browser took the touch for a scroll: the turn ends there.
    canvas().dispatchEvent(new MouseEvent('pointercancel', { bubbles: true }));
    const left = chart.getView();
    pointer('pointermove', 300, 220, true);
    expect(chart.getView()).toEqual(left);
    chart.destroy();
  });

  it('go back to the view they were given on a double click', () => {
    const chart = new SurfaceChart(host, { ...SMILE, view: { yaw: 20, pitch: 40 } });
    frame();
    pointer('pointerdown', 200, 150);
    pointer('pointermove', 260, 190);
    pointer('pointerup', 260, 190);
    expect(chart.getView()).not.toEqual({ yaw: 20, pitch: 40 });
    canvas().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(chart.getView()).toEqual({ yaw: 20, pitch: 40 });
    // A view set later is the one to go back to.
    chart.setView({ yaw: 60 });
    expect(chart.getView()).toEqual({ yaw: 60, pitch: 28 });
    pointer('pointerdown', 200, 150);
    pointer('pointermove', 100, 150);
    pointer('pointerup', 100, 150);
    canvas().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(chart.getView()).toEqual({ yaw: 60, pitch: 28 });
    chart.destroy();
  });

  it('do not turn with `rotate` off, and let a finger scroll the page any way', () => {
    const chart = new SurfaceChart(host, { ...SMILE, rotate: false });
    frame();
    expect(canvas().style.touchAction).toBe('');
    expect(canvas().style.cursor).toBe('');
    pointer('pointerdown', 200, 150);
    pointer('pointermove', 260, 190);
    pointer('pointerup', 260, 190);
    expect(chart.getView()).toEqual({ yaw: -35, pitch: 28 });
    chart.setOptions({ rotate: true });
    expect(canvas().style.touchAction).toBe('pan-y');
    expect(canvas().style.cursor).toBe('grab');
    chart.destroy();
  });

  it('hide the readout while they are turned, and show it again after', () => {
    const chart = new SurfaceChart(host, FLAT);
    const quiet = frame();
    const at = middleOf(FLAT);
    pointer('pointermove', at.x, at.y);
    expect(frame().length).toBe(quiet.length + 3);
    pointer('pointerdown', at.x, at.y);
    pointer('pointermove', at.x + 30, at.y);
    expect(frame().some((t) => t.startsWith('x: '))).toBe(false);
    expect(canvas().style.cursor).toBe('grabbing');
    pointer('pointerup', at.x + 30, at.y);
    expect(canvas().style.cursor).toBe('grab');
    chart.destroy();
  });

  it('tell a click which point or column it was on, and take a drag for no click', () => {
    const points: SurfacePoint[] = [];
    const surface = new SurfaceChart(host, { ...FLAT, onPointClick: (point) => points.push(point) });
    frame();
    const at = middleOf(FLAT);
    click(at.x, at.y);
    expect(points).toEqual([{ x: 100, y: 60, value: 0.21, xIndex: 1, yIndex: 1 }]);
    pointer('pointermove', at.x, at.y);
    expect(canvas().style.cursor).toBe('pointer');
    pointer('pointermove', 2, 2);
    expect(canvas().style.cursor).toBe('grab');
    // A press that stays where it is, or moves by a hair, is a click.
    pointer('pointerdown', at.x, at.y);
    pointer('pointermove', at.x + 1, at.y);
    pointer('pointerup', at.x + 1, at.y);
    click(at.x + 1, at.y);
    expect(points).toHaveLength(2);
    expect(surface.getView()).toEqual({ yaw: -35, pitch: 90 });
    // A press that turns the chart ends in a click the browser sends anyway: it is not one.
    pointer('pointerdown', at.x, at.y);
    pointer('pointermove', at.x + 40, at.y);
    pointer('pointerup', at.x + 40, at.y);
    click(at.x, at.y);
    expect(points).toHaveLength(2);
    // The next click is one again.
    surface.setView({ yaw: -35, pitch: 90 });
    frame();
    click(at.x, at.y);
    expect(points).toHaveLength(3);
    surface.destroy();

    const hits: BarHit[] = [];
    const bars = new Bar3DChart(host, { ...BARS, onBarClick: (hit) => hits.push(hit) });
    frame();
    const front = computeBar3DLayout(BARS, W, H, DARK_THEME, measure).bars.at(-1)!;
    click(front.top.x, front.top.y);
    click(1, 1);
    expect(hits).toEqual([{ category: 'Q1', series: 'Stocks', value: 4, index: 0 }]);
    bars.destroy();
  });

  it('listen to nothing once destroyed', () => {
    const seen: Required<View3D>[] = [];
    const chart = new SurfaceChart(host, { ...SMILE, onViewChange: (view) => seen.push(view) });
    frame();
    const node = canvas();
    chart.destroy();
    node.dispatchEvent(new MouseEvent('pointerdown', { clientX: 200, clientY: 150, buttons: 1 }));
    node.dispatchEvent(new MouseEvent('pointermove', { clientX: 260, clientY: 150, buttons: 1 }));
    node.dispatchEvent(new MouseEvent('dblclick'));
    expect(seen).toEqual([]);
  });
});
