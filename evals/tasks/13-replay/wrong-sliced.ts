// Wrong: shows the first 61 bars and adds one every 250 ms by hand: no replay the chart knows (no state, no controls).
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars.slice(0, 61));
  let next = 61;
  const timer = setInterval(() => {
    if (next >= bars.length) return clearInterval(timer);
    chart.appendBar(bars[next++]);
  }, 250);
  return chart;
}
