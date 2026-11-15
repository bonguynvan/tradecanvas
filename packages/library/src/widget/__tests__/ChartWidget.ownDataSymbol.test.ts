// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DataAdapter, OHLCBar } from '@tradecanvas/commons';

/** Stand-in for the canvas-backed Chart: it records the names the legend is given. */
class FakeChart {
  static last: FakeChart;
  data: OHLCBar[] = [];
  legendNames: string[] = [];

  constructor() {
    FakeChart.last = this;
    // Any method the widget calls that this fake doesn't model is a no-op.
    return new Proxy(this, {
      get: (target, key, receiver) => (key in target ? Reflect.get(target, key, receiver) : () => undefined),
    });
  }

  on(): () => void {
    return () => {};
  }

  setSymbolName(name: string): void {
    this.legendNames.push(name);
  }

  getData(): OHLCBar[] {
    return this.data;
  }

  setData(data: OHLCBar[]): void {
    this.data = data;
  }

  getSymbolInfo(): null {
    return null;
  }

  connect(): Promise<OHLCBar[]> {
    return new Promise(() => {});
  }

  getFills(): unknown[] {
    return [];
  }

  isTimeframeAllowed(): boolean { return true; }
  getIndicatorPanes(): unknown[] { return []; }
  getPlotRect() { return { x: 0, y: 0, width: 600, height: 300 }; }
  getLegendBottom(): number { return 40; }
  isTimeAligned(): boolean { return true; }
  getIndicatorStyle() { return { colors: ['#4c8dff'], lineWidths: [1.5], opacity: 1 }; }
  formatPrice(v: number): string { return v.toFixed(2); }
  getActiveIndicators(): unknown[] { return []; }
  getIndicatorOutput(): null { return null; }
  getIndicators(): unknown[] { return []; }
  getDrawings(): unknown[] { return []; }
  getAlerts(): unknown[] { return []; }
  getOrders(): unknown[] { return []; }
  getPositions(): unknown[] { return []; }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
});

describe('the legend of a widget fed its own bars', () => {
  it('names the symbol the widget was made with', () => {
    widget = new ChartWidget(host, { symbol: 'DEMO', timeframe: '1d', watchlist: false });
    expect(FakeChart.last.legendNames.at(-1)).toBe('DEMO');
  });

  it('names no symbol the host did not give: the fallback may not be its bars', () => {
    widget = new ChartWidget(host, { timeframe: '1d', watchlist: false });
    expect(FakeChart.last.legendNames).toEqual([]);
  });

  it('names a symbol set later', async () => {
    widget = new ChartWidget(host, { symbol: 'DEMO', timeframe: '1d', watchlist: false });
    await widget.setSymbol('ACME');
    expect(FakeChart.last.legendNames.at(-1)).toBe('ACME');
  });

  it('leaves the name to the stream when there is one', () => {
    widget = new ChartWidget(host, { adapter: { name: 'fake' } as unknown as DataAdapter, symbol: 'DEMO', timeframe: '1d', watchlist: false });
    expect(FakeChart.last.legendNames).toEqual([]);
  });
});
