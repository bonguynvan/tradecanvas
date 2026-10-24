// Wrong: loads the first symbol's bars and never the next one's.
import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, load: (symbol: string) => OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, { symbol: 'BTCUSDT', symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'], watchlist: true });
  widget.setData(load('BTCUSDT'));
  widget.openPanel('watchlist');
  return widget;
}
