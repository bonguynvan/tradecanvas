import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, {
    timeframe: '1m',
    timeframes: ['1m', '5m', '15m', '1h'],
    features: { sidebar: false, 'toolbar.replay': false, 'toolbar.compare': false },
  });
  widget.setData(bars);
  return widget;
}
