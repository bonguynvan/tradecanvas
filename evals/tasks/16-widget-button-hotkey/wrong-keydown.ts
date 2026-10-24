// Wrong: a key listener of its own on the window, which the shortcut sheet doesn't know.
import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

export function mount(host: HTMLElement, bars: OHLCBar[], onShot: () => void): ChartWidget {
  const widget = new ChartWidget(host, {});
  widget.setData(bars);
  widget.addToolbarButton({ id: 'screenshot', label: 'Screenshot', icon: 'camera', onClick: () => onShot() });
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyS') onShot();
  });
  return widget;
}
