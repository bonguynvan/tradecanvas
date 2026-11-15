import { feedFromJsApi } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';
import { datafeed } from './datafeed';

// Connects before the datafeed said what it serves: 4h is asked of the backend.
export async function mount(host: HTMLElement): Promise<ChartWidget> {
  const widget = new ChartWidget(host, { feed: feedFromJsApi(datafeed), symbol: 'ACME', timeframe: '1h' });
  await new Promise<void>((resolve) => {
    const check = (): void => (widget.getChart().getData().length > 0 ? resolve() : void setTimeout(check, 50));
    check();
  });
  return widget;
}
