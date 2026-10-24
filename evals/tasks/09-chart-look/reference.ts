import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]): Chart {
  const chart = new Chart(host, {
    chartType: 'candlestick',
    theme: 'light',
    numberLocale: 'de-DE',
    overrides: {
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
