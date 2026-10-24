// Wrong: rebuilds the series and calls setData on every trade.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

const MINUTE = 60_000;

export function mount(host: HTMLElement, history: OHLCBar[]) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  let bars = [...history];
  chart.setData(bars);

  function onTrade({ time, price, size }: { time: number; price: number; size: number }): void {
    const last = bars[bars.length - 1];
    const minute = Math.floor(time / MINUTE) * MINUTE;
    bars = minute === last.time
      ? [...bars.slice(0, -1), { ...last, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price, volume: last.volume + size }]
      : [...bars, { time: minute, open: price, high: price, low: price, close: price, volume: size }];
    chart.setData(bars);
  }

  return { chart, onTrade };
}
