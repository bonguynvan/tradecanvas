import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, load: (symbol: string) => OHLCBar[]): ChartWidget {
  const widget: ChartWidget = new ChartWidget(host, {
    symbol: 'BTCUSDT',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
    watchlist: true,
    onSymbolChange: (symbol) => widget.setData(load(symbol)),
  });
  widget.setData(load('BTCUSDT'));
  widget.openPanel('watchlist');
  return widget;
}
