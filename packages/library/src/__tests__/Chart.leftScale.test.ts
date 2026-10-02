// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IndicatorPlugin, IndicatorValue, OHLCBar } from '@tradecanvas/commons';
import type { ViewportState } from '@tradecanvas/commons';
import { Chart } from '../Chart.js';
import { installChartStubs, sizedHost } from './chartTestEnv.js';

const HOUR = 3_600_000;
const T0 = Date.UTC(2025, 0, 1);
const hourly = (n: number): OHLCBar[] =>
  Array.from({ length: n }, (_, i) => ({ time: T0 + i * HOUR, open: 100, high: 101, low: 99, close: 100, volume: 5_000_000 + i * 1000 }));

/** An overlay that follows volume: thousands, far from the price. */
const volumeLine: IndicatorPlugin = {
  descriptor: {
    id: 'volLine', name: 'Volume line', placement: 'overlay', defaultConfig: {},
    plots: [{ key: 'value', title: 'Vol', color: 0 }],
  },
  calculate(data) {
    const values = new Map<number, IndicatorValue>();
    const series = data.map((bar) => {
      const v = { value: bar.volume };
      values.set(bar.time, v);
      return v;
    });
    return { values, series };
  },
  render() {},
};

let host: HTMLDivElement;
let chart: Chart;
const plotX = () => chart.getPlotRect().x;
const internals = () => chart as unknown as {
  viewport: { getState(): ViewportState; scrollBy(dx: number): void };
  engine: { setRenderContext(ctx: unknown): void };
  leftPriceAxis: { locale: string };
};
const priceMax = () => (chart as unknown as { viewport: { getState(): { priceRange: { max: number } } } }).viewport.getState().priceRange.max;

beforeEach(() => {
  installChartStubs();
  host = sizedHost();
  chart = new Chart(host, { chartType: 'candlestick' });
  chart.registerIndicator(volumeLine);
  chart.setData(hourly(300));
});

afterEach(() => {
  chart.destroy();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Chart left price scale', () => {
  it('is hidden until an overlay goes on it, then makes room on the left', () => {
    expect(chart.isLeftPriceScaleShown()).toBe(false);
    expect(plotX()).toBe(0);
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    expect(chart.isLeftPriceScaleShown()).toBe(true);
    expect(plotX()).toBeGreaterThan(0);
  });

  it('fits the left scale to its overlays and leaves the price scale alone', () => {
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    expect(priceMax()).toBeLessThan(200);
    const left = chart.getLeftPriceRange();
    expect(left!.min).toBeGreaterThan(4000);
    expect(left!.max).toBeGreaterThan(5000);
  });

  it('moves an overlay between scales', () => {
    const id = chart.addIndicator('volLine', {})!;
    expect(priceMax()).toBeGreaterThan(5000); // on the price scale, it stretches it
    const changes: string[] = [];
    chart.on('indicatorChange', (e) => changes.push((e.payload as { change: string }).change));
    expect(chart.setIndicatorScale(id, 'left')).toBe(true);
    expect(priceMax()).toBeLessThan(200);
    expect(chart.getIndicatorScale(id)).toBe('left');
    expect(changes).toEqual(['scale']);
    chart.setIndicatorScale(id, 'right');
    expect(chart.isLeftPriceScaleShown()).toBe(false);
  });

  it('mirrors the price scale on the left when asked to show it', () => {
    chart.setLeftPriceScaleVisible(true);
    expect(chart.isLeftPriceScaleShown()).toBe(true);
    expect(plotX()).toBeGreaterThan(0);
    expect(chart.getLeftPriceRange()).toEqual((chart as unknown as { viewport: { getState(): { priceRange: unknown } } }).viewport.getState().priceRange);
    chart.setLeftPriceScaleVisible(false);
    expect(plotX()).toBe(0);
  });

  it('keeps the scale in a saved layout', () => {
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    const saved = chart.saveState()!;
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick' });
    chart.registerIndicator(volumeLine);
    chart.setData(hourly(300));
    chart.loadState(saved);
    const [restored] = chart.getActiveIndicators();
    expect(chart.getIndicatorScale(restored.instanceId)).toBe('left');
    expect(chart.isLeftPriceScaleShown()).toBe(true);
  });

  it('starts with ChartOptions.leftPriceScale', () => {
    const other = new Chart(sizedHost(), { leftPriceScale: true });
    expect(other.isLeftPriceScaleShown()).toBe(true);
    other.destroy();
  });

  it('lines panes up with the plot when the left scale widens', () => {
    let last: { viewport: ViewportState; panels: { rect: { x: number; width: number } }[] } | null = null;
    const engine = internals().engine;
    const original = engine.setRenderContext.bind(engine);
    engine.setRenderContext = (ctx) => {
      last = ctx as typeof last;
      original(ctx);
    };
    chart.addIndicator('rsi', {}, 'bottom');
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    const plot = chart.getPlotRect();
    expect(plot.x).toBeGreaterThan(70); // millions need more than the default width
    expect(last!.viewport.chartRect.x).toBe(plot.x);
    expect(last!.panels[0].rect.x).toBe(plot.x);
    expect(last!.panels[0].rect.width).toBe(plot.width);
  });

  it('zooms the wheel around the bar under the pointer', async () => {
    chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
    internals().viewport.scrollBy(-200); // off the live edge, which zooms pinned to the end
    const before = internals().viewport.getState();
    const unit = (s: ViewportState) => s.barWidth + s.barSpacing;
    const X = 400;
    const index = (X - before.chartRect.x + before.offset) / unit(before);
    host.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: X, clientY: 100, cancelable: true }));
    await new Promise((r) => setTimeout(r, 40));
    const after = internals().viewport.getState();
    expect(unit(after)).not.toBe(unit(before));
    const xAfter = index * unit(after) - after.offset + after.chartRect.x;
    expect(Math.abs(xAfter - X)).toBeLessThan(1);
  });

  it('formats the left scale in the chart number locale', () => {
    chart.destroy();
    chart = new Chart(host, { chartType: 'candlestick', numberLocale: 'de-DE' });
    expect(internals().leftPriceAxis.locale).toBe('de-DE');
    chart.setNumberLocale('fr-FR');
    expect(internals().leftPriceAxis.locale).toBe('fr-FR');
  });

  describe('left axis strip', () => {
    const press = (type: string, x: number, y: number) =>
      host.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'mouseup' ? 0 : 1, bubbles: true }));

    it('never places a drawing in the left gutter', () => {
      chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
      chart.setDrawingTool('horizontalLine');
      const x = chart.getPlotRect().x - 10;
      press('mousedown', x, 100);
      press('mouseup', x, 100);
      expect(chart.getDrawings()).toEqual([]);
    });

    it('scales the price range when it mirrors the price scale', () => {
      chart.setLeftPriceScaleVisible(true);
      const span = () => {
        const { min, max } = internals().viewport.getState().priceRange;
        return max - min;
      };
      const before = span();
      const x = chart.getPlotRect().x - 10;
      press('mousedown', x, 100);
      press('mousemove', x, 160);
      press('mouseup', x, 160);
      expect(chart.isAutoScale()).toBe(false);
      expect(span()).toBeGreaterThan(before);
      host.dispatchEvent(new MouseEvent('dblclick', { clientX: x, clientY: 100, bubbles: true }));
      expect(chart.isAutoScale()).toBe(true);
    });

    it('leaves the pan alone when it carries overlays', () => {
      chart.addIndicator('volLine', {}, 'bottom', { scale: 'left' });
      const before = internals().viewport.getState().offset;
      const x = chart.getPlotRect().x - 10;
      press('mousedown', x, 100);
      press('mousemove', x - 40, 100);
      press('mouseup', x - 40, 100);
      expect(internals().viewport.getState().offset).toBe(before);
      expect(chart.isAutoScale()).toBe(true);
    });
  });
});
