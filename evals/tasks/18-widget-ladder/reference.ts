import type { DepthData, OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[], book: DepthData) {
  const widget = new ChartWidget(host, { trading: true, depthLadder: true });
  widget.setData(bars);
  widget.setDepth(book);
  widget.openPanel('depthLadder');
  return { widget, onBook: (next: DepthData) => widget.setDepth(next) };
}
