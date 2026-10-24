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
  chart.setData(rows.map((r) => ({ time: Date.parse(r.date), open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v })));
  chart.addIndicator('bollinger', { length: 20, mult: 2 });
  return chart;
}
