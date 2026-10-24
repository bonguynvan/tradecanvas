// Wrong: hides the parts with CSS; the widget still has them (keys, menus, the command palette).
import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[]): ChartWidget {
  const widget = new ChartWidget(host, { timeframe: '1m', timeframes: ['1m', '5m', '15m', '1h'] });
  const style = document.createElement('style');
  style.textContent = '.tcw-sidebar, [data-role="replay"], [data-role="compare"] { display: none !important; }';
  document.head.appendChild(style);
  widget.setData(bars);
  return widget;
}
