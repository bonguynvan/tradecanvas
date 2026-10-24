// Right, another way: times left in seconds (the chart reads values under 1e12 as seconds), sorted, and a resize Event sent after.
import { Chart } from '@tradecanvas/chart';

type Row = [number, number, number, number, number, number];

export function mount(host: HTMLElement, rows: Row[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  const bars = [...rows].reverse().map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
  chart.setData(bars);
  window.dispatchEvent(new Event('resize'));
  return chart;
}
