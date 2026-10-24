import { Chart, type OHLCBar } from '@tradecanvas/chart';
import { Backtester, smaCrossStrategy } from '@tradecanvas/analytics';

const CASH = 10_000;

export function mount(host: HTMLElement, bars: OHLCBar[]) {
  const result = new Backtester({ initialCash: CASH, allowShort: false }).run(bars, smaCrossStrategy({ fastPeriod: 10, slowPeriod: 30, size: 10 }));
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  chart.setTradeZones(result.trades.map((t, i) => ({
    id: `trade-${i}`, direction: 'long' as const, entryTime: t.entryTime, entryPrice: t.entryPrice, exitTime: t.exitTime, exitPrice: t.exitPrice,
  })));
  const profit = result.trades.reduce((sum, t) => sum + t.pnl, 0);
  return { chart, report: { trades: result.trades.length, returnPct: (profit / CASH) * 100 } };
}
