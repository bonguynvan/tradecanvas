// Right, another way: trades fold into a pending candle, drawn once a frame.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

const MINUTE = 60_000;

export function mount(host: HTMLElement, history: OHLCBar[]) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(history);
  let forming: OHLCBar = { ...history[history.length - 1] };
  let isNew = false;
  let frame = 0;

  const flush = () => {
    frame = 0;
    if (isNew) chart.appendBar(forming);
    else chart.updateLastBar(forming);
    isNew = false;
  };

  function onTrade({ time, price, size }: { time: number; price: number; size: number }): void {
    const minute = Math.floor(time / MINUTE) * MINUTE;
    if (minute !== forming.time) {
      if (frame) flush();
      forming = { time: minute, open: price, high: price, low: price, close: price, volume: size };
      isNew = true;
    } else {
      forming = { ...forming, high: Math.max(forming.high, price), low: Math.min(forming.low, price), close: price, volume: forming.volume + size };
    }
    if (!frame) frame = requestAnimationFrame(flush);
  }

  return { chart, onTrade };
}
