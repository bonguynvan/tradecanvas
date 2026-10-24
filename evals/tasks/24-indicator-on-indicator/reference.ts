import { Chart, indicatorSource, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom');
  if (rsi) chart.addIndicator('sma', { period: 9, source: indicatorSource(rsi, 'value') });
  return chart;
}
