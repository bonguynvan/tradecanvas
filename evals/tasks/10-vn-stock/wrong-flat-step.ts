// Wrong: one step of 0.01 for every price, limits worked out by hand and drawn as lines.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], reference: number): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', numberLocale: 'vi-VN', timeZone: 'Asia/Ho_Chi_Minh' });
  chart.setData(bars);
  const t = bars[bars.length - 1].time;
  chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: Math.round(reference * 1.07 * 100) / 100 }] });
  chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: Math.round(reference * 0.93 * 100) / 100 }] });
  return chart;
}
