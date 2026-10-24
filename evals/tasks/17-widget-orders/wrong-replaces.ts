// Wrong: each new order replaces the ones on the chart.
import type { OHLCBar } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

type Order = { side: 'buy' | 'sell'; type: string; price: number; quantity: number };

export function mount(host: HTMLElement, bars: OHLCBar[], submit: (order: Order) => Promise<string>): ChartWidget {
  const widget = new ChartWidget(host, { trading: true });
  widget.setData(bars);
  const chart = widget.getChart();
  chart.on('orderPlace', async ({ payload }) => {
    const quantity = payload.quantity ?? 1;
    const id = await submit({ side: payload.side, type: payload.type, price: payload.price, quantity });
    chart.setOrders([{ id, side: payload.side, type: payload.type, price: payload.price, quantity }]);
  });
  return widget;
}
