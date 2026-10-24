// Wrong: the colours on a dark chart, the wicks left at the theme's, and prices in English.
import { Chart, DARK_THEME, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', theme: { ...DARK_THEME, candleUp: '#0a8f5a', candleDown: '#d43c3c' } });
  chart.setData(bars);
  return chart;
}
