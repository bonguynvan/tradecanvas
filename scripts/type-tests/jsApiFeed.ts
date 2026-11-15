// A datafeed written for the JS API, typed with that API's own narrower types,
// fits feedFromJsApi as it is: compiled with the skill's examples
// (`pnpm docs:check`). A `@ts-expect-error` line must fail to compile.
import { feedFromJsApi, udfFeed, resolutionToTimeframe, type DataFeed, type TimeFrame } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

type ResolutionString = string & { readonly __resolution: unique symbol };

interface LibrarySymbolInfo {
  name: string;
  ticker?: string;
  pricescale: number;
  minmov: number;
  session: string;
  timezone: 'Etc/UTC' | 'America/New_York';
  has_intraday?: boolean;
}

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PeriodParams {
  from: number;
  to: number;
  countBack: number;
  firstDataRequest: boolean;
}

declare const datafeed: {
  onReady(callback: (config: { supported_resolutions: ResolutionString[] }) => void): void;
  searchSymbols(userInput: string, exchange: string, symbolType: string, onResult: (items: { symbol: string; description: string; exchange: string; ticker?: string; type: string }[]) => void): void;
  resolveSymbol(symbolName: string, onResolve: (info: LibrarySymbolInfo) => void, onError: (reason: string) => void, extension?: { currencyCode?: string }): void;
  getBars(info: LibrarySymbolInfo, resolution: ResolutionString, params: PeriodParams, onResult: (bars: Bar[], meta?: { noData?: boolean; nextTime?: number | null }) => void, onError: (reason: string) => void): void;
  subscribeBars(info: LibrarySymbolInfo, resolution: ResolutionString, onTick: (bar: Bar) => void, listenerGuid: string, onReset: () => void): void;
  unsubscribeBars(listenerGuid: string): void;
};

const feed: DataFeed = feedFromJsApi(datafeed, { supportedTimeframes: ['1m', '1h', '1d'] });
const served: readonly TimeFrame[] | undefined = await feedFromJsApi(datafeed).ready();
export { served };
new ChartWidget(document.body, { feed, symbol: 'AAPL', timeframe: resolutionToTimeframe('60') ?? '1h' });
new ChartWidget(document.body, { feed: udfFeed({ url: 'https://example.com/udf', updateFrequency: 5000 }), symbol: 'AAPL', timeframe: '1d' });

// @ts-expect-error A datafeed needs getBars.
feedFromJsApi({ onReady() {}, resolveSymbol() {}, subscribeBars() {}, unsubscribeBars() {} });
// @ts-expect-error A UDF feed needs the server's address.
udfFeed({ updateFrequency: 5000 });
