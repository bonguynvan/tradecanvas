import { Chart, type OHLCBar } from '@tradecanvas/chart';

const KEY = 'my-layout';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  const saved = localStorage.getItem(KEY);
  if (saved) {
    chart.loadState(saved);
  } else {
    const low = bars.reduce((a, b) => (b.low < a.low ? b : a));
    const high = bars.reduce((a, b) => (b.high > a.high ? b : a));
    chart.addDrawing({ type: 'trendLine', anchors: [{ time: low.time, price: low.low }, { time: high.time, price: high.high }] });
    chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: bars[bars.length - 1].time, price: bars[bars.length - 1].close }] });
  }
  chart.setAutoSave(KEY, 500);
  return chart;
}
