// Right, another way: the price given to setCurrentPrice as well as to the forming bar; each alert still fires once.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], above: number, below: number, notify: (message: string) => void) {
  const chart = new Chart(host, { chartType: 'candlestick' });
  chart.setData(bars);
  chart.addAlert(above, 'crossingUp', `Price crossed above ${above}`);
  chart.addAlert(below, 'crossingDown', `Price crossed below ${below}`);
  chart.on('alertTriggered', (e) => notify(e.payload.message ?? `Alert at ${e.payload.price}`));

  function onPrice(price: number): void {
    const data = chart.getData();
    const last = data[data.length - 1];
    chart.updateLastBar({ ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) });
    chart.setCurrentPrice(price);
  }

  return { chart, onPrice };
}
