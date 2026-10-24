// Wrong: horizontal lines and a hand-made check, not alerts the chart knows.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], above: number, below: number, notify: (message: string) => void) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  const t = bars[bars.length - 1].time;
  chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: above }] });
  chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: t, price: below }] });
  let prev = bars[bars.length - 1].close;

  function onPrice(price: number): void {
    const data = chart.getData();
    const last = data[data.length - 1];
    chart.updateLastBar({ ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) });
    if (prev <= above && price > above) notify(`above ${above}`);
    if (prev >= below && price < below) notify(`below ${below}`);
    prev = price;
  }

  return { chart, onPrice };
}
