// Right, the zone spelled as the option is throughout: the symbol names it, the axis follows.
import { Chart, MARKET_HOSE, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], reference: number): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', numberLocale: 'vi-VN' });
  chart.setMarket(MARKET_HOSE);
  chart.setSymbolInfo({ symbol: 'VNM', exchange: 'HOSE', timeZone: 'Asia/Ho_Chi_Minh' });
  chart.setTimeZone('exchange');
  chart.setData(bars);
  chart.setPriceLimits(reference);
  return chart;
}
