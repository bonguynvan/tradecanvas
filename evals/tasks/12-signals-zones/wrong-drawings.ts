// Wrong: rectangles and arrows drawn as drawings, which the user can move and delete, in place of signals and zones.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

interface Trade { id: string; side: 'long' | 'short'; entryTime: number; entryPrice: number; exitTime: number; exitPrice: number }

export function mount(host: HTMLElement, bars: OHLCBar[], trades: Trade[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  for (const t of trades) {
    chart.addDrawing({ type: 'rectangle', anchors: [{ time: t.entryTime, price: t.entryPrice }, { time: t.exitTime, price: t.exitPrice }] });
  }
  return chart;
}
