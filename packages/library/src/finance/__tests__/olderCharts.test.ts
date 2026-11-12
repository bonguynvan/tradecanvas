// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LIGHT_THEME } from '@tradecanvas/commons';
import { DepthChart } from '../DepthChart.js';
import { EquityCurveChart } from '../EquityCurveChart.js';
import { WaterfallChart } from '../WaterfallChart.js';
import { SparklineChart } from '../SparklineChart.js';
import { GaugeChart } from '../GaugeChart.js';
import { HeatmapChart } from '../HeatmapChart.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

let host: HTMLDivElement;
/** Every fill the charts set and every text they drew, newest last. */
let fills: unknown[];
let texts: string[];

/** A 2D context that keeps the fills set on it and the text drawn with it. */
function recordingContext(): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (prop === 'measureText') return (t: string) => ({ width: String(t).length * 6 });
      if (prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      if (prop === 'fillText') return (t: string) => { texts.push(String(t)); };
      return () => {};
    },
    set: (target, prop, value) => {
      target[prop] = value;
      if (prop === 'fillStyle') fills.push(value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  fills = [];
  texts = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext() as never);
  host = sizedHost(400, 300);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
});

afterEach(() => {
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const book = { bids: [{ price: 99, volume: 1 }, { price: 98, volume: 2 }], asks: [{ price: 101, volume: 1 }, { price: 102, volume: 2 }] };
const curve = [{ time: 0, value: 1 }, { time: 1000, value: 3 }, { time: 2000, value: 2 }];
const steps = [{ label: 'A', value: 10 }, { label: 'B', value: -4 }];

/** Draws the next frame and says what was filled and written in it. */
function frame(): { fills: unknown[]; texts: string[] } {
  fills.length = 0;
  texts.length = 0;
  vi.advanceTimersByTime(20);
  return { fills: [...fills], texts: [...texts] };
}

const point = (canvas: HTMLCanvasElement, x: number, y: number) =>
  canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));

describe('the older finance charts take options after they are made', () => {
  const makers = {
    depth: () => new DepthChart(host, { data: book }),
    equity: () => new EquityCurveChart(host, { data: curve }),
    waterfall: () => new WaterfallChart(host, { data: steps }),
    heatmap: () => new HeatmapChart(host, { data: [{ id: 'a', label: 'A', value: 1 }] }),
  };

  for (const [name, make] of Object.entries(makers)) {
    it(`a theme, on a ${name} chart`, () => {
      const chart = make();
      frame();
      chart.setOptions({ theme: 'light' });
      // The heatmap fills no background; its labels are in the theme's ink all the same.
      const drawn = frame();
      if (name === 'heatmap') expect((chart as unknown as { theme: unknown }).theme).toBe(LIGHT_THEME);
      else expect(drawn.fills).toContain(LIGHT_THEME.background);
      chart.destroy();
    });
  }

  it('a theme, on a sparkline and a gauge', () => {
    const spark = new SparklineChart(host, { data: [1, 2, 3] });
    spark.setOptions({ theme: 'light' });
    expect((spark as unknown as { theme: unknown }).theme).toBe(LIGHT_THEME);
    spark.destroy();
    const gauge = new GaugeChart(host, { value: 40, animate: false });
    gauge.setOptions({ theme: 'light' });
    expect((gauge as unknown as { theme: unknown }).theme).toBe(LIGHT_THEME);
    gauge.setOptions({ theme: 'light', value: 60 });
    expect((gauge as unknown as { theme: unknown }).theme).toBe(LIGHT_THEME);
    gauge.destroy();
  });

  it('the pointer’s readout switched on and off, on a depth chart', () => {
    const chart = new DepthChart(host, { data: book, crosshair: false });
    const canvas = host.querySelector('canvas')!;
    point(canvas, 200, 150);
    expect(frame().texts.some((t) => t.startsWith('Price:'))).toBe(false);
    chart.setOptions({ crosshair: true });
    point(canvas, 200, 150);
    expect(frame().texts.some((t) => t.startsWith('Price:'))).toBe(true);
    chart.setOptions({ crosshair: false });
    expect(frame().texts.some((t) => t.startsWith('Price:'))).toBe(false);
    // Off, a move of the pointer draws no frame at all.
    point(canvas, 210, 150);
    expect(frame().fills).toEqual([]);
    chart.destroy();
  });

  it('the readout switched on, on an equity curve and a waterfall', () => {
    const equity = new EquityCurveChart(host, { data: curve, crosshair: false });
    equity.setOptions({ crosshair: true });
    point(host.querySelector('canvas')!, 200, 150);
    expect(frame().texts.some((t) => t.startsWith('Value:'))).toBe(true);
    equity.destroy();
    const waterfall = new WaterfallChart(host, { data: steps, crosshair: false });
    waterfall.setOptions({ crosshair: true });
    point(host.querySelector('canvas')!, 200, 150);
    expect(frame().texts.some((t) => t.startsWith('Total:'))).toBe(true);
    waterfall.destroy();
  });

  it('a click callback, on a heatmap made without one', () => {
    const chart = new HeatmapChart(host, { data: [{ id: 'a', label: 'A', value: 1 }] });
    frame();
    const onCellClick = vi.fn();
    chart.setOptions({ onCellClick });
    host.querySelector('canvas')!.dispatchEvent(new MouseEvent('click', { clientX: 200, clientY: 150, bubbles: true }));
    expect(onCellClick).toHaveBeenCalledWith({ id: 'a', label: 'A', value: 1 });
    chart.destroy();
  });

  it('a label for screen readers, given at the start or later', () => {
    const chart = new DepthChart(host, { data: book, ariaLabel: 'Order book depth' });
    const canvas = host.querySelector('canvas')!;
    expect(canvas.getAttribute('aria-label')).toBe('Order book depth');
    chart.setOptions({ ariaLabel: 'Depth of VN30F1M' });
    expect(canvas.getAttribute('aria-label')).toBe('Depth of VN30F1M');
    chart.destroy();
    const gauge = new GaugeChart(host, { value: 40, ariaLabel: 'Fear and greed' });
    expect(host.querySelector('canvas')!.getAttribute('aria-label')).toBe('Fear and greed');
    gauge.destroy();
  });
});
