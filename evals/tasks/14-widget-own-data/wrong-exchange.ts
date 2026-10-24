// Wrong: connects to an exchange, and leaves the interface in English.
import { BinanceAdapter, type OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, { symbol: 'ACME', timeframe: '1h', theme: 'dark', adapter: new BinanceAdapter() });
  widget.setData(bars);
  return widget;
}
