# Moving an app from TradingView to TradeCanvas

For an app that uses TradingView's charting library (Advanced Charts or
Trading Platform) or Lightweight Charts. The TradeCanvas MCP server has three
tools for it; use them rather than guessing names:

- `migration_plan`: the steps in order, what to search the app's code for,
  and which tool maps what each search finds. Call it first.
- `migration_lookup`: what one name becomes: a widget option, featureset,
  override key, study, drawing shape, widget or chart method, datafeed or
  broker member, or a resolution. It says plainly when TradeCanvas has
  nothing like it, and what to do instead.
- `convert_widget_options`: the whole options object of
  `new TradingView.widget({...})` (featuresets and overrides included), or of
  Lightweight Charts' `createChart`, as ChartWidget or Chart options, the
  calls to make afterwards, and what has no place.

Pass `source: 'lightweight-charts'` for Lightweight Charts; the default is
TradingView's charting library.

## The datafeed stays as it is

A datafeed written for the JS API (`onReady`, `resolveSymbol`, `getBars`,
`subscribeBars`…) works through `feedFromJsApi`. It resolves each symbol
once, turns timeframes into resolutions (`'1h'` → `'60'`), callbacks into
promises, and a datafeed's `onResetCacheNeeded` into a reload.

```ts
import { feedFromJsApi, type JsApiDatafeed } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

declare const datafeed: JsApiDatafeed; // the app's datafeed, unchanged

const feed = feedFromJsApi(datafeed);
await feed.ready(); // onReady has answered: the chart knows which timeframes to build

const widget = new ChartWidget(document.getElementById('chart')!, { feed, symbol: 'AAPL', timeframe: '1d' });
```

The chart reads the timeframes a feed serves when it connects and builds
the others from them, so await `feed.ready()` before making the widget, or
give them: `feedFromJsApi(datafeed, { supportedTimeframes: ['1m', '1h', '1d'] })`.
A UDF server needs no datafeed code:

```ts
import { udfFeed } from '@tradecanvas/chart';
import { ChartWidget } from '@tradecanvas/chart/widget';

const feed = udfFeed({ url: 'https://data.example.com/udf', updateFrequency: 10_000 });
await feed.ready(); // the timeframes of its /config

new ChartWidget(document.getElementById('chart')!, { feed, symbol: 'AAPL', timeframe: '1d' });
```

UDF has no push, so `udfFeed` asks `/history` and `/quotes` again every
`updateFrequency` ms for live bars and quotes.

## What differs

- **Times.** Bars are in milliseconds on both sides. TradingView's points
  (`createShape({ time })`) and Lightweight Charts' bars take **seconds**;
  TradeCanvas anchors and bars take milliseconds.
- **Resolutions** are timeframes: `'60'` → `'1h'`, `'1D'` → `'1d'`, `'W'` →
  `'1w'`. `resolutionToTimeframe` and `timeframeToResolution` convert them.
- **No `activeChart()`.** Widget calls go to the widget; chart calls to
  `widget.getChart()`.
- **The widget takes an element**, not an id; there is no `library_path`.
  Code that waited for `onChartReady` goes in the `onReady` option.
- **Saved charts** in TradingView's format do not load. `save_load_adapter`
  becomes `layouts: { storage }` with a `LayoutStorage` of your own.
- **Studies** are built-in indicators with short ids (`'rsi'`, `'bb'`);
  `migration_lookup` with `kind: 'study'` gives the id, `get_indicator` its
  params. A custom indicator becomes an `IndicatorPlugin`.

```ts
import { resolutionToTimeframe, timeframeToResolution, type Chart } from '@tradecanvas/chart';

declare const chart: Chart;

resolutionToTimeframe('240'); // '4h'
timeframeToResolution('1w'); // '1W'

// createShape({ time: 1700000000, price: 101 }, { shape: 'horizontal_line' }) becomes:
chart.addDrawing({ type: 'horizontalLine', anchors: [{ time: 1700000000 * 1000, price: 101 }] });
```
