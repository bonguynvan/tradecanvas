import { Chart } from '@tradecanvas/chart';

/** A day as our API sends it: newest day first. */
export interface DayRow {
  date: string; // '2026-01-05'
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export function mount(host: HTMLElement, rows: DayRow[]): Chart {
  const chart = new Chart(host, { theme: 'dark' });
  // setData doesn't sort: the API's newest-first rows go in oldest first.
  const bars = rows
    .map((r) => ({ time: Date.parse(r.date), open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v }))
    .sort((a, b) => a.time - b.time);
  chart.setData(bars);
  chart.addIndicator('bb', { period: 20, stdDev: 2 });
  return chart;
}
