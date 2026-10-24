// Wrong: takes a level left out of the change as removed, so moving the target loses the stop.
import { Chart, type OHLCBar } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], save: (stopLoss: number | null, takeProfit: number | null) => void): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
  chart.setData(bars);
  chart.setPositions([{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, stopLoss: 95, takeProfit: 110 }]);
  chart.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 112, quantity: 1 }]);
  chart.on('positionModify', ({ payload }) => {
    const stopLoss = payload.stopLoss ?? null;
    const takeProfit = payload.takeProfit ?? null;
    chart.setPositions([{ id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, stopLoss: stopLoss ?? undefined, takeProfit: takeProfit ?? undefined }]);
    save(stopLoss, takeProfit);
  });
  return chart;
}
