import { Chart, type OHLCBar, type TradingPosition } from '@tradecanvas/chart';

export function mount(host: HTMLElement, bars: OHLCBar[], save: (stopLoss: number | null, takeProfit: number | null) => void): Chart {
  const chart = new Chart(host, { chartType: 'candlestick', features: { trading: true } });
  chart.setData(bars);
  let position: TradingPosition = { id: 'p1', side: 'buy', entryPrice: 100, quantity: 2, stopLoss: 95, takeProfit: 110 };
  chart.setPositions([position]);
  chart.setOrders([{ id: 'o1', side: 'sell', type: 'limit', price: 112, quantity: 1 }]);
  chart.on('positionModify', ({ payload }) => {
    if (payload.positionId !== position.id) return;
    // Left out keeps a level; null takes it away.
    const stopLoss = payload.stopLoss === undefined ? position.stopLoss ?? null : payload.stopLoss;
    const takeProfit = payload.takeProfit === undefined ? position.takeProfit ?? null : payload.takeProfit;
    position = { ...position, stopLoss: stopLoss ?? undefined, takeProfit: takeProfit ?? undefined };
    chart.setPositions([position]);
    save(stopLoss, takeProfit);
  });
  return chart;
}
