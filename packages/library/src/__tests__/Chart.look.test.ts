// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PHI, type OHLCBar } from '@tradecanvas/commons';
import { Chart, SANS_FONT_FAMILY } from '../index.js';
import { fakeContext, installChartStubs, sizedHost } from './chartTestEnv.js';

type Inside = { viewport: { getState(): { barWidth: number; barSpacing: number } } };
const slot = (chart: Chart) => {
  const { barWidth, barSpacing } = (chart as unknown as Inside).viewport.getState();
  return { barWidth, barSpacing, unit: barWidth + barSpacing };
};
const bars = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: Date.UTC(2026, 0, 1) + i * 60_000, open: 10, high: 11, low: 9, close: 10, volume: 1 }));

describe('Chart: bar layout and figures font', () => {
  const charts: Chart[] = [];
  const make = (options: ConstructorParameters<typeof Chart>[1] = {}) => {
    installChartStubs();
    const chart = new Chart(sizedHost(), options);
    charts.push(chart);
    return chart;
  };
  afterEach(() => {
    for (const chart of charts.splice(0)) chart.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens golden at φ⁴ px a slot when asked, classic otherwise', () => {
    const golden = make({ barLayout: 'golden' });
    golden.setData(bars(300));
    expect(golden.getBarLayout()).toBe('golden');
    expect(slot(golden).unit).toBeCloseTo(PHI ** 4, 9);
    expect(slot(golden).barWidth / slot(golden).unit).toBeCloseTo(1 / PHI, 9);
    const classic = make();
    classic.setData(bars(300));
    expect(classic.getBarLayout()).toBe('classic');
    expect(slot(classic)).toMatchObject({ barWidth: 8, barSpacing: 2 });
  });

  it('changes the layout over the bars on screen, keeping their zoom', () => {
    const chart = make();
    chart.setData(bars(300));
    const before = slot(chart).unit;
    chart.setBarLayout('golden');
    expect(chart.getBarLayout()).toBe('golden');
    expect(slot(chart).unit).toBeCloseTo(before, 9);
    expect(slot(chart).barWidth / slot(chart).unit).toBeCloseTo(1 / PHI, 9);
  });

  it('takes a font for its figures that stays through a change of theme', () => {
    const chart = make({ theme: 'dark', font: { family: SANS_FONT_FAMILY } });
    expect(chart.getFont().family).toBe(SANS_FONT_FAMILY);
    chart.setTheme('light');
    expect(chart.getTheme().font.family).toBe(SANS_FONT_FAMILY);
    chart.setFont({ sizeSmall: 12 });
    expect(chart.getFont()).toMatchObject({ family: SANS_FONT_FAMILY, sizeSmall: 12 });
  });

  it('goes back to the theme’s font when its own is taken away', () => {
    const chart = make({ theme: 'dark' });
    const themes = chart.getFont().family;
    chart.setFont({ family: SANS_FONT_FAMILY });
    chart.setFont(null);
    expect(chart.getFont().family).toBe(themes);
  });

  it('runs nothing for a layout it has already, so a host still hears the first zoom', () => {
    const chart = make();
    const zooms: unknown[] = [];
    chart.on('zoomChange', (e) => zooms.push(e.payload));
    chart.setBarLayout('classic');
    expect(zooms).toEqual([]);
    chart.setData(bars(300));
    expect(zooms.length).toBe(1);
  });

  it('reads a layout it doesn’t know as classic', () => {
    const chart = make({ barLayout: 'wide' as never });
    expect(chart.getBarLayout()).toBe('classic');
  });

  it('gives the theme’s own font back after a market recoloured the theme', async () => {
    const { MARKET_HOSE } = await import('@tradecanvas/commons');
    const chart = make({ theme: 'dark' });
    const themes = chart.getFont().family;
    chart.setFont({ family: SANS_FONT_FAMILY });
    chart.setMarket(MARKET_HOSE);
    chart.setFont(null);
    expect(chart.getFont().family).toBe(themes);
  });

  it('gives the theme’s own font back after a theme made from the one drawn', () => {
    const chart = make({ theme: 'dark' });
    const themes = chart.getFont().family;
    chart.setFont({ family: SANS_FONT_FAMILY });
    chart.setTheme({ ...chart.getTheme(), candleUp: '#0a8f5a' });
    chart.setFont(null);
    expect(chart.getFont().family).toBe(themes);
  });

  it('measures its figures on its own canvas, the one it draws them on, and leaves that canvas’s font as it was', () => {
    // A canvas in the page draws its text with what the page passes down to it (in Chromium the
    // widget's tabular figures, wider in a proportional face); here it measures wider than one out of the page.
    const measured: boolean[] = [];
    const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
    installChartStubs();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const canvas = this;
      let ctx = contexts.get(canvas);
      if (!ctx) {
        ctx = fakeContext(canvas);
        ctx.measureText = ((text: string) => {
          measured.push(canvas.isConnected);
          return { width: text.length * (canvas.isConnected ? 9 : 6) };
        }) as never;
        contexts.set(canvas, ctx);
      }
      return ctx as never;
    });
    const host = sizedHost();
    const chart = new Chart(host, {});
    charts.push(chart);
    chart.setData(bars(300));
    const scene = host.querySelector('canvas')!.getContext('2d')!;
    scene.font = '7px Drawing';
    measured.length = 0;
    chart.setFont({ sizeSmall: 14 });
    expect(measured.length).toBeGreaterThan(0);
    expect(measured.every((inPage) => inPage)).toBe(true);
    expect(scene.font).toBe('7px Drawing');
  });

  it('leaves out a font that is no font', () => {
    const chart = make();
    const before = chart.getFont();
    chart.setFont({ family: '', sizeSmall: Number.NaN });
    expect(chart.getFont()).toEqual(before);
  });
});
