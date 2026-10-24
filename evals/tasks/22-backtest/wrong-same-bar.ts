// Wrong: fills at the crossing bar's close (looking ahead), not the next bar's open.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[]) {
  const closes = bars.map((b) => b.close);
  const sma = (end: number, p: number) => closes.slice(end - p + 1, end + 1).reduce((a, b) => a + b, 0) / p;
  const trades: { entry: OHLCBar; exit: OHLCBar }[] = [];
  let entry: OHLCBar | null = null;
  for (let i = 30; i < bars.length; i++) {
    const up = sma(i - 1, 10) <= sma(i - 1, 30) && sma(i, 10) > sma(i, 30);
    const down = sma(i - 1, 10) >= sma(i - 1, 30) && sma(i, 10) < sma(i, 30);
    if (up && !entry) entry = bars[i];
    else if (down && entry) {
      trades.push({ entry, exit: bars[i] });
      entry = null;
    }
  }
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  chart.setTradeZones(trades.map((t, i) => ({ id: `t${i}`, direction: 'long' as const, entryTime: t.entry.time, entryPrice: t.entry.close, exitTime: t.exit.time, exitPrice: t.exit.close })));
  const profit = trades.reduce((s, t) => s + (t.exit.close - t.entry.close) * 10, 0);
  return { chart, report: { trades: trades.length, returnPct: (profit / 10_000) * 100 } };
}
