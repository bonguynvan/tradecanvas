import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, { symbol: 'ACME', timeframe: '1h', theme: 'dark', locale: 'vi' });
  widget.setData(bars);
  return widget;
}
