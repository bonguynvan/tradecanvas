// Wrong: reads the RSI once at mount, so it is stale after the last bar changes.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom');
  const series = rsi ? chart.getIndicatorOutput(rsi)?.series ?? [] : [];
  const value = series[series.length - 1]?.value;
  const snapshot = typeof value === 'number' ? value : null;
  return { chart, latestRsi: () => snapshot };
}
