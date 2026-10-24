// Right, another way: replay and compare off as whole capabilities (their buttons, commands and keys), not only their toolbar buttons.
import { ChartWidget } from '@tradecanvas/chart/widget';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function mount(host: HTMLElement, bars: Bar[]): ChartWidget {
  const widget = new ChartWidget(host, {
    timeframe: '1m',
    timeframes: ['1m', '5m', '15m', '1h'],
    customTimeframes: false,
    intervalTyping: false,
    features: { sidebar: false, replay: false, compare: false },
  });
  widget.setData(bars);
  return widget;
}
