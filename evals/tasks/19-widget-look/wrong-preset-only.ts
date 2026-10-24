// Wrong: the preset alone; the toolbar and the chosen buttons stay the preset's.
import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, { theme: 'light', ui: 'terminal' });
  widget.setData(bars);
  return widget;
}
