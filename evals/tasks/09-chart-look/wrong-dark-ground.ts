// Wrong: the colours, wicks, grid and number format right, on a dark ground (#0d1117).
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, {
    chartType: 'candlestick',
    theme: 'dark',
    numberLocale: 'de-DE',
    overrides: {
      'background.color': '#0d1117',
      'series.candlestick.upColor': '#0a8f5a',
      'series.candlestick.wickUpColor': '#0a8f5a',
      'series.candlestick.downColor': '#d43c3c',
      'series.candlestick.wickDownColor': '#d43c3c',
      'grid.vertical.visible': false,
    },
  });
  chart.setData(bars);
  return chart;
}
