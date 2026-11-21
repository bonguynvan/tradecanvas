// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DARK_THEME, type BoxPlotOptions, type RadarChartOptions, type SurfaceChartOptions, type View3D } from '@tradecanvas/commons';
import { computeBoxPlotLayout, computeRadarLayout } from '@tradecanvas/core';
import { BoxPlotChart } from '../BoxPlotChart.js';
import { PayoffChart } from '../PayoffChart.js';
import { RadarChart } from '../RadarChart.js';
import { SurfaceChart } from '../SurfaceChart.js';
import { Bar3DChart } from '../Bar3DChart.js';
import { installChartStubs, sizedHost } from '../../__tests__/chartTestEnv.js';

const W = 400;
const H = 300;
/** As the stand-in context measures: 6 px a character. */
const measure = (text: string) => text.length * 6;
let host: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  installChartStubs();
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

const canvasOf = (): HTMLCanvasElement => host.querySelector('canvas')!;
const click = (x: number, y: number): void => void canvasOf().dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
const move = (x: number, y: number): void => void canvasOf().dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
/** Presses a key on the chart; whether the chart took it (the page then does not scroll). */
const press = (key: string, shiftKey = false): boolean => {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  canvasOf().dispatchEvent(event);
  return event.defaultPrevented;
};

describe('a box plot that answers a click', () => {
  const options: BoxPlotOptions = {
    data: [
      { label: 'Mon', values: [-2, -1, 0, 1, 2, 3, 9] },
      { label: 'Tue', values: [1, 2, 3, 4, 5] },
    ],
  };

  it('says which group was clicked, with its quartiles, and nothing for a click on no box', () => {
    const picked = vi.fn();
    const chart = new BoxPlotChart(host, { ...options, onBoxClick: picked });
    vi.advanceTimersByTime(20);
    const layout = computeBoxPlotLayout(options, W, H, DARK_THEME, measure);
    const box = layout.boxes[1];
    click(box.x + box.width / 2, (box.yQ1 + box.yQ3) / 2);
    expect(picked).toHaveBeenCalledTimes(1);
    expect(picked.mock.calls[0][0]).toMatchObject({ label: 'Tue' });
    expect(picked.mock.calls[0][1]).toMatchObject({ median: 3, q1: 2, q3: 4 });
    click(2, 2);
    expect(picked).toHaveBeenCalledTimes(1);
    // A hand over what can be clicked.
    move(box.x + box.width / 2, (box.yQ1 + box.yQ3) / 2);
    expect(canvasOf().style.cursor).toBe('pointer');
    move(2, 2);
    expect(canvasOf().style.cursor).toBe('');
    chart.destroy();
  });

  it('shows no hand and calls nothing with no callback', () => {
    const chart = new BoxPlotChart(host, options);
    vi.advanceTimersByTime(20);
    const box = computeBoxPlotLayout(options, W, H, DARK_THEME, measure).boxes[0];
    move(box.x + box.width / 2, (box.yQ1 + box.yQ3) / 2);
    expect(canvasOf().style.cursor).toBe('');
    expect(() => click(box.x + box.width / 2, (box.yQ1 + box.yQ3) / 2)).not.toThrow();
    chart.destroy();
  });
});

describe('a radar that answers a click', () => {
  const options: RadarChartOptions = {
    axes: [{ label: 'Sharpe', max: 3 }, { label: 'Sortino', max: 3 }, { label: 'Calmar', max: 3 }, { label: 'Alpha', max: 3 }],
    series: [{ name: 'Strategy', values: [1.8, 2.4, 1.5, 1.1] }, { name: 'Benchmark', values: [1, 1.3, 0.7, 0.4] }],
  };

  it('says which measure was clicked, with each series’ value on it', () => {
    const picked = vi.fn();
    const chart = new RadarChart(host, { ...options, onAxisClick: picked });
    vi.advanceTimersByTime(20);
    const layout = computeRadarLayout(options, W, H, DARK_THEME, measure);
    const spoke = layout.spokes[1];
    // Half way out along the second spoke.
    click((layout.cx + spoke.x) / 2, (layout.cy + spoke.y) / 2);
    expect(picked).toHaveBeenCalledTimes(1);
    expect(picked.mock.calls[0][0]).toEqual({ axis: 'Sortino', index: 1, values: [{ series: 'Strategy', value: 2.4 }, { series: 'Benchmark', value: 1.3 }] });
    // Far off the chart: no measure is near.
    click(1, 1);
    expect(picked).toHaveBeenCalledTimes(1);
    move((layout.cx + spoke.x) / 2, (layout.cy + spoke.y) / 2);
    expect(canvasOf().style.cursor).toBe('pointer');
    chart.destroy();
  });
});

describe('a chart in three dimensions turned from the keyboard', () => {
  const surface: SurfaceChartOptions = { x: [90, 100, 110], y: [30, 60], values: [[0.3, 0.2, 0.26], [0.28, 0.21, 0.25]], view: { yaw: -30, pitch: 25 } };

  it('can be reached with Tab, and says to a screen reader that it takes keys, and which', () => {
    const chart = new SurfaceChart(host, surface);
    expect(canvasOf().tabIndex).toBe(0);
    expect(canvasOf().getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight ArrowUp ArrowDown Home');
    // A picture takes no keys, and a screen reader keeps the arrows over one: a chart that turns is told as a thing the keys go to, still by its own name.
    expect(canvasOf().getAttribute('role')).toBe('application');
    expect(canvasOf().getAttribute('aria-label')).toBe('3D surface of 3 by 2 points');
    chart.destroy();
  });

  it('says where it is seen from after a key, in the caller’s words where they give them', () => {
    const chart = new SurfaceChart(host, surface);
    const said = (): string => host.querySelector('[aria-live="polite"]')?.textContent ?? '';
    expect(said()).toBe('');
    press('ArrowRight');
    expect(said()).toBe('Turned to -35°, tilted to 25°');
    chart.setOptions({ describeView: (view) => `xoay ${view.yaw}, nghiêng ${view.pitch}` });
    press('ArrowDown');
    expect(said()).toBe('xoay -35, nghiêng 30');
    // Hidden from the eye, and gone with the chart.
    const region = host.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.style.position).toBe('absolute');
    chart.destroy();
    expect(host.querySelector('[aria-live="polite"]')).toBeNull();
  });

  it('says nothing, and calls nothing, for a key that turns it nowhere', () => {
    const turned = vi.fn();
    const chart = new SurfaceChart(host, { ...surface, onViewChange: turned });
    expect(press('Home')).toBe(true);
    expect(turned).not.toHaveBeenCalled();
    chart.setView({ yaw: 0, pitch: 90 });
    press('ArrowDown');
    expect(turned).not.toHaveBeenCalled();
    chart.destroy();
  });

  it('goes on from where a key left it when a drag is under way', () => {
    const views: Required<View3D>[] = [];
    const chart = new SurfaceChart(host, { ...surface, onViewChange: (view) => void views.push(view) });
    const canvas = canvasOf();
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 100, buttons: 1, bubbles: true }));
    const dragged = views.at(-1)!.yaw;
    press('ArrowLeft', true);
    expect(views.at(-1)!.yaw).toBe(dragged + 15);
    // The next move of the pointer turns from there, not from where the drag began.
    canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 160, clientY: 100, buttons: 1, bubbles: true }));
    expect(views.at(-1)!.yaw).toBeCloseTo(dragged + 15 - 4, 6);
    chart.destroy();
  });

  it('turns with the arrows as a drag does, further with Shift, and goes back with Home', () => {
    const views: Required<View3D>[] = [];
    const chart = new SurfaceChart(host, { ...surface, onViewChange: (view) => void views.push(view) });
    expect(press('ArrowRight')).toBe(true);
    expect(views.at(-1)).toMatchObject({ yaw: -35, pitch: 25 });
    press('ArrowLeft');
    press('ArrowLeft');
    expect(views.at(-1)).toMatchObject({ yaw: -25, pitch: 25 });
    press('ArrowDown');
    expect(views.at(-1)).toMatchObject({ yaw: -25, pitch: 30 });
    press('ArrowUp', true);
    expect(views.at(-1)).toMatchObject({ yaw: -25, pitch: 15 });
    expect(chart.getView()).toMatchObject({ yaw: -25, pitch: 15 });
    expect(press('Home')).toBe(true);
    expect(views.at(-1)).toMatchObject({ yaw: -30, pitch: 25 });
    // Any other key is the page's.
    const before = views.length;
    expect(press('a')).toBe(false);
    expect(press('PageDown')).toBe(false);
    expect(views.length).toBe(before);
    chart.destroy();
  });

  it('keeps within what the chart can be seen from, as a drag does', () => {
    const chart = new Bar3DChart(host, { categories: ['Q1', 'Q2'], series: [{ name: 'A', values: [1, 2] }], view: { yaw: 0, pitch: 85 } });
    for (let i = 0; i < 6; i++) press('ArrowDown', true);
    expect(chart.getView().pitch).toBeLessThanOrEqual(90);
    chart.destroy();
  });

  it('leaves the keys to the page where turning is switched off', () => {
    const turned = vi.fn();
    const chart = new SurfaceChart(host, { ...surface, rotate: false, onViewChange: turned });
    // As a chart that never turned: no stop for Tab, none for a click, a picture to a screen reader.
    expect(canvasOf().hasAttribute('tabindex')).toBe(false);
    expect(canvasOf().getAttribute('role')).toBe('img');
    expect(canvasOf().hasAttribute('aria-keyshortcuts')).toBe(false);
    expect(host.querySelector('[aria-live]')).toBeNull();
    expect(press('ArrowRight')).toBe(false);
    expect(turned).not.toHaveBeenCalled();
    // Switched on again, it takes them again.
    chart.setOptions({ rotate: true });
    expect(canvasOf().tabIndex).toBe(0);
    expect(canvasOf().getAttribute('role')).toBe('application');
    expect(press('ArrowRight')).toBe(true);
    chart.destroy();
  });

  it('leaves a key held with Ctrl, Alt or the command key to the browser', () => {
    const turned = vi.fn();
    const chart = new SurfaceChart(host, { ...surface, onViewChange: turned });
    for (const held of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true, ...held });
      canvasOf().dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(turned).not.toHaveBeenCalled();
    chart.destroy();
  });
});

describe('the payoff chart told to a screen reader', () => {
  it('names the line before expiry too, where there is one', () => {
    const legs = [{ type: 'call' as const, side: 'long' as const, strike: 100, premium: 5 }];
    const plain = new PayoffChart(host, { legs });
    expect(canvasOf().getAttribute('aria-label')).toBe('Payoff at expiry of 1 leg');
    plain.setOptions({ model: { daysToExpiry: 30, volatility: 0.3 } });
    expect(canvasOf().getAttribute('aria-label')).toBe('Payoff at expiry of 1 leg, and its value 30 days before');
    plain.setOptions({ model: { daysToExpiry: 1, volatility: 0.3 } });
    expect(canvasOf().getAttribute('aria-label')).toBe('Payoff at expiry of 1 leg, and its value 1 day before');
    plain.destroy();
  });
});
