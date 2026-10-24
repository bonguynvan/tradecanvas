import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, { theme: 'light', ui: { preset: 'terminal', toolbar: 'floating', active: 'solid' } });
  widget.setData(bars);
  return widget;
}
