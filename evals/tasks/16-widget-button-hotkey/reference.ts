import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[], onShot: () => void): ChartWidget {
  const widget = new ChartWidget(host, {});
  widget.setData(bars);
  widget.addToolbarButton({ id: 'screenshot', label: 'Screenshot', icon: 'camera', onClick: () => onShot() });
  widget.addHotkey({ keys: 'Alt+S', label: 'Screenshot', onPress: () => onShot() });
  return widget;
}
