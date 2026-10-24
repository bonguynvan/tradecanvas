// Right, another way: the axis in the market's own zone, through 'exchange'.
import { Chart, MARKET_HOSE, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], reference: number): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', numberLocale: 'vi-VN' });
  chart.setMarket(MARKET_HOSE);
  chart.setTimezone('exchange');
  chart.setData(bars);
  chart.setPriceLimits(reference);
  return chart;
}
