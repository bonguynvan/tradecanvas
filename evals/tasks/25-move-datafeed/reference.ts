import { feedFromJsApi } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';
import { datafeed } from './datafeed';

export async function mount(host: HTMLElement): Promise<ChartWidget> {
  const feed = feedFromJsApi(datafeed);
  // The timeframes the datafeed serves, so the chart builds 4h from 1h.
  await feed.ready();
  const widget = new ChartWidget(host, { feed, symbol: 'ACME', timeframe: '1h' });
  await new Promise<void>((resolve) => {
    const check = (): void => (widget.getChart().getData().length > 0 ? resolve() : void setTimeout(check, 50));
    check();
  });
  return widget;
}
