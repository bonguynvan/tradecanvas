import { Chart, type OHLCBar } from '@tradecanvas/chart';

type Row = [number, number, number, number, number, number];

export function mount(host: HTMLElement, rows: Row[]): Chart {
  const bars: OHLCBar[] = rows
    .map(([time, open, high, low, close, volume]) => ({ time: time * 1000, open, high, low, close, volume }))
    .sort((a, b) => a.time - b.time);
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  return chart;
}
