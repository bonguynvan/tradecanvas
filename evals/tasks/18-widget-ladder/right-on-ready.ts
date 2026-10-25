// Right, another way: an agent's answer in the 2026-10-24 baseline, which threw, with its second openPanel taken out: the ladder opened from onReady alone, by the widget's own name.
import { ChartWidget } from '@tradecanvas/chart/widget';

interface Level {
  price: number;
  volume: number;
}
interface Book {
  bids: Level[];
  asks: Level[];
}
interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function mount(host: HTMLElement, bars: Bar[], book: Book) {
  const widget = new ChartWidget(host, {
    theme: 'dark',
    trading: true,
    depthLadder: true,
    onReady: () => {
      if (widget.getOpenPanel() !== 'depthLadder') widget.openPanel('depthLadder');
    },
  });
  widget.setData(bars);
  widget.setDepth(book);

  const onBook = (next: Book): void => {
    widget.setDepth(next);
  };
  return { widget, onBook };
}
