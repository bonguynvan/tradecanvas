import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  const rsi = chart.addIndicator('rsi', { period: 14 }, 'bottom');

  function latestRsi(): number | null {
    if (!rsi) return null;
    const series = chart.getIndicatorOutput(rsi)?.series ?? [];
    const value = series[series.length - 1]?.value;
    return typeof value === 'number' ? value : null;
  }

  return { chart, latestRsi };
}
