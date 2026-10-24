// Wrong: loads the history once and never refreshes it.
import { Chart } from '@tradecanvas/chart';

type Row = [number, string, string, string, string, string];

export async function mount(host: HTMLElement): Promise<Chart> {
  const chart = new Chart(host, { chartType: 'candlestick' });
  const res = await fetch('https://api.example.com/klines?symbol=ACME&interval=1h&limit=300');
  const rows: Row[] = await res.json();
  chart.setData(rows.map(([time, o, h, l, c, v]) => ({ time, open: +o, high: +h, low: +l, close: +c, volume: +v })));
  return chart;
}
