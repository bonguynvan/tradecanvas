// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { OptionLeg, SunburstNode } from '@tradecanvas/commons';
import { PayoffChart } from '../PayoffChart.js';
import { CurveChart } from '../CurveChart.js';
import { BoxPlotChart } from '../BoxPlotChart.js';
import { RadarChart } from '../RadarChart.js';
import { SunburstChart } from '../SunburstChart.js';
import { StackedAreaChart } from '../StackedAreaChart.js';
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

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
  texts = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recordingContext() as never);
  host = sizedHost(400, 300);
  // jsdom has no layout: the canvas sits at the page's top left.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
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
const point = (x: number, y: number) => canvas().dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
const plain = (v: number) => String(Number(v.toFixed(4)));

const call: OptionLeg = { type: 'call', side: 'long', strike: 100, premium: 5 };
const parts: SunburstNode[] = [{ label: 'A', children: [{ label: 'A1', value: 1 }] }, { label: 'B', value: 1 }];

describe('the charts for options and portfolios', () => {
  it('say what they show to screen readers, in the words given when there are some', () => {
    const made = [
      new PayoffChart(host, { legs: [call, { ...call, side: 'short', strike: 110 }] }),
      new CurveChart(host, { series: [{ name: '1M', points: [{ x: 90, y: 30 }] }, { name: '3M', points: [{ x: 90, y: 28 }] }] }),
      new BoxPlotChart(host, { data: [{ label: 'Mon', values: [1, 2, 3] }] }),
      new RadarChart(host, { axes: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], series: [{ name: 's', values: [1, 2, 3] }] }),
      new SunburstChart(host, { data: parts }),
      new StackedAreaChart(host, { categories: ['Jan', 'Feb'], series: [{ name: 's', values: [1, 2] }] }),
    ];
    const labels = [...host.querySelectorAll('canvas')].map((c) => c.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Payoff at expiry of 2 legs',
      'Curve chart: 1M, 3M',
      'Box plot of 1 group',
      'Radar chart of 1 series on 3 axes',
      'Sunburst chart of 2 parts',
      'Stacked area chart of 1 series over 2 points',
    ]);
    expect([...host.querySelectorAll('canvas')].every((c) => c.getAttribute('role') === 'img')).toBe(true);
    const named = new PayoffChart(host, { legs: [call], ariaLabel: 'A call bought' });
    expect(host.querySelectorAll('canvas')[6].getAttribute('aria-label')).toBe('A call bought');
    for (const chart of [...made, named]) chart.destroy();
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('show a payoff’s profit at the pointer, and draw new legs', () => {
    const chart = new PayoffChart(host, { legs: [call], range: { min: 50, max: 150 }, valueFormat: plain, priceFormat: plain });
    const quiet = frame();
    point(200, 150);
    const pointed = frame();
    // The readout's two lines over what was there: the price and what it makes.
    expect(pointed).toHaveLength(quiet.length + 2);
    chart.update([{ ...call, strike: 60, premium: 1 }]);
    expect(frame().slice(-2)).not.toEqual(pointed.slice(-2));
    chart.destroy();
  });

  it('show each curve’s value at the pointer, and none with the readout off', () => {
    const series = [{ name: 'Smile', points: [{ x: 90, y: 30 }, { x: 100, y: 20 }, { x: 110, y: 24 }] }];
    const chart = new CurveChart(host, { series, valueFormat: plain });
    frame();
    point(200, 150);
    expect(frame().some((t) => t.startsWith('Smile: '))).toBe(true);
    chart.setOptions({ crosshair: false });
    expect(frame().some((t) => t.startsWith('Smile: '))).toBe(false);
    chart.setOptions({ crosshair: true });
    chart.update([{ name: 'Other', points: series[0].points }]);
    expect(frame().some((t) => t.startsWith('Other: '))).toBe(true);
    chart.destroy();
  });

  it('show a box’s numbers, a spoke’s values and a point’s values at the pointer', () => {
    const box = new BoxPlotChart(host, { data: [{ label: 'Mon', values: [1, 2, 3, 4, 5] }], valueFormat: plain });
    frame();
    point(200, 100);
    expect(frame()).toContain('Median 3');
    box.update([{ label: 'Tue', values: [10, 20, 30] }]);
    expect(frame()).toContain('Median 20');
    box.destroy();

    const radar = new RadarChart(host, { axes: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], series: [{ name: 'Fund', values: [1, 2, 3] }], valueFormat: plain });
    frame();
    point(202, 100);
    expect(frame()).toContain('Fund: 1');
    radar.update([{ name: 'Fund', values: [7, 2, 3] }]);
    expect(frame()).toContain('Fund: 7');
    radar.destroy();

    const area = new StackedAreaChart(host, { categories: ['Jan', 'Feb'], series: [{ name: 'Cash', values: [1, 2] }], valueFormat: plain });
    frame();
    point(370, 150);
    expect(frame()).toContain('Cash: 2');
    area.update([{ name: 'Cash', values: [1, 9] }], ['Jan', 'Mar']);
    expect(frame()).toEqual(expect.arrayContaining(['Mar', 'Cash: 9']));
    area.destroy();
  });

  it('tell a sunburst’s click which part it was and the way down to it', () => {
    const clicked: [string, string[]][] = [];
    const chart = new SunburstChart(host, { data: parts, onNodeClick: (node, path) => clicked.push([node.label, path]) });
    frame();
    // The chart is 400 × 300: its centre at (200, 150), the first ring's middle about 66 px out, the second's about 114.
    const at = (r: number) => ({ clientX: 200 + Math.cos(-Math.PI / 4) * r, clientY: 150 + Math.sin(-Math.PI / 4) * r, bubbles: true });
    canvas().dispatchEvent(new MouseEvent('click', at(66)));
    canvas().dispatchEvent(new MouseEvent('click', at(114)));
    canvas().dispatchEvent(new MouseEvent('click', { clientX: 200, clientY: 150, bubbles: true }));
    expect(clicked).toEqual([['A', ['A']], ['A1', ['A', 'A1']]]);
    canvas().dispatchEvent(new MouseEvent('pointermove', at(66)));
    expect(canvas().style.cursor).toBe('pointer');
    canvas().dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 150, bubbles: true }));
    expect(canvas().style.cursor).toBe('');
    chart.update([{ label: 'C', value: 1 }]);
    // A click reads what was last drawn.
    frame();
    canvas().dispatchEvent(new MouseEvent('click', at(90)));
    expect(clicked.at(-1)).toEqual(['C', ['C']]);
    chart.destroy();
  });
});
