// Wrong: fixes the bands, but the rows still go in newest first.
import { Chart } from '@tradecanvas/chart';

export interface DayRow { date: string; o: number; h: number; l: number; c: number; v: number }

export function mount(host: HTMLElement, rows: DayRow[]): Chart {
  const chart = new Chart(host, { theme: 'dark' });
  chart.setData(rows.map((r) => ({ time: Date.parse(r.date), open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v })));
  chart.addIndicator('bb', { period: 20, stdDev: 2 });
  return chart;
}
