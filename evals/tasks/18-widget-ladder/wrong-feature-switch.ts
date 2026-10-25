// Wrong: an agent's answer in the 2026-10-25 Haiku run, as it was. It asks for the ladder through its switch, which is on already and only hides one; the ladder is the depthLadder option, so none shows.
import { ChartWidget } from '@tradecanvas/chart/widget';

type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Level = { price: number; volume: number };
type Book = { bids: Level[]; asks: Level[] };

// The widget's ladder reads the book as DepthData: the same shape as Book.
export function mount(host: HTMLElement, bars: Bar[], book: Book) {
  const widget = new ChartWidget(host, {
    symbol: 'BTCUSDT',
    timeframe: '5m',
    theme: 'dark',
    trading: true,
    features: { depthLadder: true },
    // Open from the start: the dock's ladder page shows as the widget builds.
    onReady: () => {
      widget.openPanel('depthLadder');
    },
  });

  // No adapter: the widget shows the bars it is given.
  widget.setData(bars);
  widget.setDepth(book);

  return {
    widget,
    onBook(next: Book) {
      widget.setDepth(next);
    },
  };
}
