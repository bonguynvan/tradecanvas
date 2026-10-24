import { Chart, type OHLCBar } from '@tradecanvas/chart';

interface Trade {
  time: number;
  price: number;
  size: number;
}

const MINUTE = 60_000;

export function mount(host: HTMLElement, history: OHLCBar[]) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(history);

  function onTrade({ time, price, size }: Trade): void {
    const data = chart.getData();
    const last = data[data.length - 1];
    const minute = Math.floor(time / MINUTE) * MINUTE;
    if (last && minute === last.time) {
      chart.updateLastBar({
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
        volume: last.volume + size,
      });
    } else {
      chart.appendBar({ time: minute, open: price, high: price, low: price, close: price, volume: size });
    }
  }

  return { chart, onTrade };
}
