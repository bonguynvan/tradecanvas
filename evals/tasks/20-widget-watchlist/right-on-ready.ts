// Right, another way: an agent's answer in the 2026-10-24 baseline, which never opened the watchlist, with it opened from onReady, by the widget's own name.
import { ChartWidget } from '@tradecanvas/chart/widget';

type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

export function mount(host: HTMLElement, load: (symbol: string) => Bar[]): ChartWidget {
  const widget: ChartWidget = new ChartWidget(host, {
    symbol: SYMBOLS[0],
    symbols: SYMBOLS,
    theme: 'dark',
    watchlist: { quotes: false },
    onSymbolChange: (symbol) => widget.setData(load(symbol)),
    onReady: () => widget.openPanel('watchlist'),
  });
  widget.setData(load(SYMBOLS[0]!));
  return widget;
}
