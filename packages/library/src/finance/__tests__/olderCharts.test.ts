// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_FONT_FAMILY, LIGHT_THEME, SANS_FONT_FAMILY } from '@tradecanvas/commons';
import { BarChart } from '../BarChart.js';
import { PerformanceDashboard } from '../PerformanceDashboard.js';
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
      if (name === 'heatmap') expect((chart as unknown as { theme: { background: string } }).theme.background).toBe(LIGHT_THEME.background);
      else expect(drawn.fills).toContain(LIGHT_THEME.background);
      chart.destroy();
    });
  }

  it('a theme, on a sparkline and a gauge', () => {
    const spark = new SparklineChart(host, { data: [1, 2, 3] });
    spark.setOptions({ theme: 'light' });
    expect((spark as unknown as { theme: { background: string } }).theme.background).toBe(LIGHT_THEME.background);
    spark.destroy();
    const gauge = new GaugeChart(host, { value: 40, animate: false });
    gauge.setOptions({ theme: 'light' });
    expect((gauge as unknown as { theme: { background: string } }).theme.background).toBe(LIGHT_THEME.background);
    gauge.setOptions({ theme: 'light', value: 60 });
    expect((gauge as unknown as { theme: { background: string } }).theme.background).toBe(LIGHT_THEME.background);
    gauge.destroy();
  });

  it('the pointer’s readout switched on and off, on a depth chart', () => {
    const chart = new DepthChart(host, { data: book, crosshair: false });
    const canvas = host.querySelector('canvas')!;
    // The readout writes a price and a volume more than the chart alone does.
    const alone = frame().texts.length;
    point(canvas, 100, 150);
    expect(frame().texts.length).toBe(0);
    chart.setOptions({ crosshair: true });
    point(canvas, 100, 150);
    expect(frame().texts.length).toBe(alone + 2);
    chart.setOptions({ crosshair: false });
    expect(frame().texts.length).toBe(alone);
    // Off, a move of the pointer draws no frame at all.
    point(canvas, 210, 150);
    expect(frame().fills).toEqual([]);
    chart.destroy();
  });

  it('the readout switched on, on an equity curve and a waterfall', () => {
    const equity = new EquityCurveChart(host, { data: curve, crosshair: false });
    const curveAlone = frame().texts.length;
    equity.setOptions({ crosshair: true });
    point(host.querySelector('canvas')!, 200, 150);
    expect(frame().texts.length).toBe(curveAlone + 2);
    equity.destroy();
    const waterfall = new WaterfallChart(host, { data: steps, crosshair: false });
    waterfall.setOptions({ crosshair: true });
    point(host.querySelector('canvas')!, 300, 150);
    expect(frame().texts).toContain('= 6');
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

describe('every finance chart', () => {
  const touch = (target: EventTarget, type: string, x: number, y: number) => {
    const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
    Object.defineProperty(event, 'pointerType', { value: 'touch' });
    target.dispatchEvent(event);
  };

  it('reads out what a finger taps, and keeps it until a touch elsewhere', () => {
    const chart = new WaterfallChart(host, { data: steps });
    const canvas = host.querySelector('canvas')!;
    frame();
    touch(canvas, 'pointerdown', 300, 150);
    expect(frame().texts).toContain('= 6');
    // The finger lifts: the readout stays, where a mouse leaving takes it along.
    touch(canvas, 'pointerleave', 300, 150);
    chart.setOptions({});
    expect(frame().texts).toContain('= 6');
    touch(document.body, 'pointerdown', 5, 5);
    expect(frame().texts).not.toContain('= 6');
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 150, bubbles: true }));
    expect(frame().texts).toContain('= 6');
    canvas.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true }));
    expect(frame().texts).not.toContain('= 6');
    // A touch the browser takes for a scroll of the page leaves nothing read out.
    touch(canvas, 'pointerdown', 300, 150);
    touch(canvas, 'pointercancel', 300, 150);
    touch(canvas, 'pointerleave', 300, 150);
    expect(frame().texts).not.toContain('= 6');
    chart.destroy();
    // Destroyed, it listens to the page no more.
    expect(() => touch(document.body, 'pointerdown', 5, 5)).not.toThrow();
  });

  it('sizes its canvas in device pixels', () => {
    vi.stubGlobal('devicePixelRatio', 1.5);
    const chart = new SparklineChart(host, { data: [1, 2, 3] });
    const canvas = host.querySelector('canvas')!;
    expect([canvas.width, canvas.height]).toEqual([600, 450]);
    // It fills its container whatever that becomes: no width of its own to hold the container open.
    expect([canvas.style.width, canvas.style.height]).toEqual(['100%', '100%']);
    chart.destroy();
  });
});

describe('what every finance chart takes', () => {
  const themeOf = (chart: unknown) => (chart as { theme: { font: { family: string }; background: string } }).theme;

  it('a face for its text, at the start or later, kept through a change of theme', () => {
    const made = [
      new DepthChart(host, { data: book }),
      new GaugeChart(host, { value: 4, animate: false }),
      new HeatmapChart(host, { data: [{ id: 'a', label: 'A', value: 1 }] }),
      new BarChart(host, { categories: ['A'], series: [{ name: 'S', values: [1] }] }),
    ];
    for (const chart of made) {
      expect(themeOf(chart).font.family).toBe(SANS_FONT_FAMILY);
      chart.setOptions({ font: { family: 'Tahoma' } });
      expect(themeOf(chart).font.family).toBe('Tahoma');
      chart.setOptions({ theme: 'light' });
      expect(themeOf(chart).font.family).toBe('Tahoma');
      expect(themeOf(chart).background).toBe(LIGHT_THEME.background);
      chart.destroy();
    }
    const first = new WaterfallChart(host, { data: steps, font: { family: 'Georgia' } });
    expect(themeOf(first).font.family).toBe('Georgia');
    first.destroy();
  });

  it('a description for screen readers of its own, which follows the data', () => {
    const label = () => host.querySelector('canvas')!.getAttribute('aria-label');
    const depth = new DepthChart(host, { data: book });
    expect(label()).toBe('Depth chart of 2 bids and 2 asks');
    depth.update({ bids: [], asks: book.asks });
    expect(label()).toBe('Depth chart of 0 bids and 2 asks');
    depth.setOptions({ ariaLabel: 'Sổ lệnh' });
    expect(label()).toBe('Sổ lệnh');
    depth.destroy();
    const equity = new EquityCurveChart(host, { data: curve });
    expect(label()).toBe('Equity curve of 3 points');
    equity.destroy();
    const waterfall = new WaterfallChart(host, { data: steps });
    expect(label()).toBe('Waterfall chart of 2 steps');
    waterfall.destroy();
    const spark = new SparklineChart(host, { data: [1, 2, 3, 4] });
    expect(label()).toBe('Sparkline of 4 points');
    spark.destroy();
    const gauge = new GaugeChart(host, { value: 40, animate: false });
    expect(label()).toBe('Gauge at 40');
    gauge.setValue(55);
    expect(label()).toBe('Gauge at 55');
    gauge.setOptions({ value: 60 });
    expect(label()).toBe('Gauge at 60');
    gauge.destroy();
  });

  it('a dashboard in your words and your language', () => {
    const day = 86_400_000;
    const equityCurve = Array.from({ length: 70 }, (_, i) => ({ time: Date.UTC(2026, 0, 1) + i * day, equity: 100 + i }));
    const metrics = { totalReturnPct: 0.1, cagr: 0.2, sharpe: 1, sortino: 1, maxDrawdownPct: 0.05, winRate: 0.5, profitFactor: 1.5, trades: 12 };
    const dash = new PerformanceDashboard(host, { result: { equityCurve, metrics } as never, locale: 'vi', labels: { equityCurve: 'Đường vốn', totalReturn: 'Tổng lợi nhuận' } });
    const text = host.textContent ?? '';
    expect(text).toContain('Đường vốn');
    expect(text).toContain('Tổng lợi nhuận');
    // What was not given stays in English.
    expect(text).toContain('Drawdown');
    expect((host.firstElementChild as HTMLElement).style.fontFamily).toContain('Segoe UI');
    expect(host.querySelectorAll('canvas')[0].getAttribute('aria-label')).toBe('Đường vốn');
    dash.destroy();

    // A face given to the dashboard is its charts' too, the monospaced one included, and stays through a change of theme.
    const mono = new PerformanceDashboard(host, { result: { equityCurve, metrics } as never, font: { family: DEFAULT_FONT_FAMILY }, labels: { drawdown: undefined } });
    const charts = () => [(mono as unknown as { equityChart: unknown }).equityChart, (mono as unknown as { heatmap: unknown }).heatmap];
    for (const chart of charts()) expect(themeOf(chart).font.family).toBe(DEFAULT_FONT_FAMILY);
    mono.setTheme('light');
    for (const chart of charts()) expect(themeOf(chart).font.family).toBe(DEFAULT_FONT_FAMILY);
    // A word given as undefined is a word not given.
    expect(host.textContent).toContain('Drawdown');
    mono.destroy();
  });
});
