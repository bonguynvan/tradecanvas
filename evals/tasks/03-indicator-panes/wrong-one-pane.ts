// Wrong: MACD shares the RSI's pane.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  chart.addIndicator('ema', { period: 21 });
  chart.addIndicator('ema', { period: 50 });
  const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom')!;
  chart.addIndicator('macd', { fast: 12, slow: 26, signal: 9 }, 'bottom', { pane: rsi });
  return chart;
}
