import type { OHLCBar, TradingOrder } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

interface Order {
  side: 'buy' | 'sell';
  type: string;
  price: number;
  quantity: number;
}

export function mount(host: HTMLElement, bars: OHLCBar[], submit: (order: Order) => Promise<string>): ChartWidget {
  const widget = new ChartWidget(host, { trading: true });
  widget.setData(bars);
  const chart = widget.getChart();
  chart.on('orderPlace', async ({ payload }) => {
    const order: Order = { side: payload.side, type: payload.type, price: payload.price, quantity: payload.quantity ?? 1 };
    const id = await submit(order);
    const working: TradingOrder = { id, side: order.side, type: payload.type, price: order.price, quantity: order.quantity };
    chart.setOrders([...chart.getOrders(), working]);
  });
  return widget;
}
