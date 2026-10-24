// Wrong: the rows go in newest first; setData doesn't sort them.
import { Chart } from '@tradecanvas/chart';

type Row = [number, number, number, number, number, number];

export function mount(host: HTMLElement, rows: Row[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(rows.map(([time, open, high, low, close, volume]) => ({ time: time * 1000, open, high, low, close, volume })));
  return chart;
}
