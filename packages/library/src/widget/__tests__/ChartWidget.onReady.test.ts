// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: any method it lacks does nothing. */
class FakeChart {
  constructor(_host: HTMLElement, public options: ChartOptions) {
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }
  on(): void {}
  getData(): unknown[] { return []; }
  getDrawings(): unknown[] { return []; }
  getIndicatorPanes(): unknown[] { return []; }
  getActiveIndicators(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  isTimeframeAllowed(): boolean { return true; }
  isAutoScale(): boolean { return true; }
  isInvertScale(): boolean { return false; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
  getFills(): unknown[] { return []; }
  getRequiredSymbols(): string[] { return []; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');
type Widget = InstanceType<typeof ChartWidget>;

let host: HTMLDivElement;
let widget: Widget | undefined;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  widget = undefined;
  host.remove();
});

describe('onReady', () => {
  it('runs once the widget is built, so the widget it was given to is there', async () => {
    const seen: unknown[] = [];
    const built = new ChartWidget(host, {
      symbol: 'BTCUSDT',
      // The widget's own name, as a host writes it: built before onReady runs.
      onReady: () => seen.push(built.getChart()),
    });
    widget = built;
    expect(seen).toEqual([]);
    await Promise.resolve();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(built.getChart());
  });

  it('gets the chart and the widget', async () => {
    const onReady = vi.fn();
    widget = new ChartWidget(host, { symbol: 'BTCUSDT', onReady });
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledOnce();
    const [chart, given] = onReady.mock.calls[0];
    expect(chart).toBe(widget.getChart());
    expect(given).toBe(widget);
  });

  it('runs before a view shared in the URL is put back, so the shared view is what shows', async () => {
    const order: string[] = [];
    const restore = vi.spyOn(ChartWidget.prototype, 'importState').mockImplementation(async () => {
      order.push('shared view');
      return true;
    });
    location.hash = '#tcw=abc';
    try {
      widget = new ChartWidget(host, { symbol: 'BTCUSDT', shareUrl: true, onReady: () => order.push('onReady') });
      await Promise.resolve();
      expect(order).toEqual(['onReady', 'shared view']);
    } finally {
      location.hash = '';
      restore.mockRestore();
    }
  });

  it('does not run for a widget destroyed before it could', async () => {
    const onReady = vi.fn();
    new ChartWidget(host, { symbol: 'BTCUSDT', onReady }).destroy();
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
  });
});
