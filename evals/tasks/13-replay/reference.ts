import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  // One bar every interval / speed ms: 250 ms is four a second.
  chart.replayStart({ startIndex: 60, interval: 250, speed: 1 });
  return chart;
}
