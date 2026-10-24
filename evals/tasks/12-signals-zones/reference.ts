import { Chart, type OHLCBar } from '@tradecanvas/chart';

interface Trade {
  id: string;
  side: 'long' | 'short';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
}

export function mount(host: HTMLElement, bars: OHLCBar[], trades: Trade[]): Chart {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  chart.setSignalMarkers(trades.map((t) => ({ id: t.id, time: t.entryTime, price: t.entryPrice, direction: t.side, confidence: 1, source: 'strategy' })));
  chart.setTradeZones(trades.map((t) => ({ id: t.id, direction: t.side, entryTime: t.entryTime, entryPrice: t.entryPrice, exitTime: t.exitTime, exitPrice: t.exitPrice })));
  return chart;
}
