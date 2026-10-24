import { Chart, MARKET_HOSE, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], reference: number): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', numberLocale: 'vi-VN', timeZone: 'Asia/Ho_Chi_Minh' });
  chart.setMarket(MARKET_HOSE);
  chart.setData(bars);
  chart.setPriceLimits(reference);
  return chart;
}
