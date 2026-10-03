// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ChartOptions } from '@tradecanvas/commons';

class FakeChart {
  constructor(_host: HTMLElement, public options: ChartOptions) {
    return new Proxy(this, { get: (t, k, r) => (k in t ? Reflect.get(t, k, r) : () => undefined) });
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
  getSymbolInfo(): null { return null; }
  getTheme() { return {}; }
  formatPrice(v: number): string { return v.toFixed(2); }
}

vi.mock('../../Chart.js', () => ({ Chart: FakeChart }));

const { ChartWidget } = await import('../ChartWidget.js');
const { WidgetDropdown } = await import('../WidgetDropdown.js');

let host: HTMLDivElement;
let widget: InstanceType<typeof ChartWidget>;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  widget?.destroy();
  host.remove();
});

const root = () => host.querySelector<HTMLElement>('.tcw-root')!;

describe('right-to-left widgets', () => {
  it('turns right to left for Arabic and Hebrew, the chart itself left to right', () => {
    for (const locale of ['ar', 'he-IL']) {
      widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], locale, messages: {} });
      expect(root().dir, locale).toBe('rtl');
      expect(host.querySelector<HTMLElement>('.tcw-chart-container')!.dir).toBe('ltr');
      expect((widget as unknown as { portal: HTMLElement }).portal.dir).toBe('rtl');
      widget.destroy();
    }
  });

  it('stays left to right for other languages, and takes a direction it is given', () => {
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], locale: 'vi', messages: {} });
    expect(root().dir).toBe('ltr');
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], dir: 'rtl' });
    expect(root().dir).toBe('rtl');
    widget.destroy();
    widget = new ChartWidget(host, { symbol: 'AAA', symbols: ['AAA'], locale: 'ar', messages: {}, dir: 'ltr' });
    expect(root().dir).toBe('ltr');
  });

  it('opens menus from the start edge, whichever side that is', () => {
    const trigger = document.createElement('div');
    const dropdown = new WidgetDropdown(trigger);
    const panel = trigger.querySelector<HTMLElement>('.tcw-dropdown')!;
    expect(panel.style.insetInlineStart).toBe('0px');
    expect(panel.style.left).toBe('');
    dropdown.destroy();
    const end = new WidgetDropdown(trigger, { align: 'right' });
    expect(trigger.querySelector<HTMLElement>('.tcw-dropdown')!.style.insetInlineEnd).toBe('0px');
    end.destroy();
  });
});
