import type { Source } from './tables.js';

/** What to search an app's code for, and which tool turns what it finds into TradeCanvas. */
export interface SearchPattern {
  /** A regular expression for ripgrep or an editor's search. */
  pattern: string;
  what: string;
  /** The tool and kind that map what it finds. */
  then: string;
}

export interface MigrationPlan {
  source: Source;
  steps: string[];
  search: SearchPattern[];
  /** What to check before calling it done. */
  checks: string[];
}

const TRADINGVIEW: MigrationPlan = {
  source: 'tradingview',
  steps: [
    "Install @tradecanvas/chart (and @tradecanvas/react, vue or svelte if the app uses one). It has no dependencies and needs no library_path or static folder.",
    'Search the code with the patterns below and list every place: the widget\'s options, the datafeed, the calls on the widget and its charts, saving and loading, trading, custom indicators.',
    "Options: give the object passed to new TradingView.widget({...}) to convert_widget_options, as JSON with code written as strings. It returns ChartWidget options, the calls to make once the widget exists, and what has no place, each with what to do.",
    "Datafeed: keep it. const feed = feedFromJsApi(datafeed) (import { feedFromJsApi } from '@tradecanvas/chart'), or udfFeed({ url }) for a UDF server; await feed.ready() before making the widget, so the chart knows the timeframes it serves and builds the others. Bars keep their times in milliseconds.",
    "Make the widget: new ChartWidget(element, options). It takes the element, not its id. Code that waited for onChartReady goes in the onReady option or runs after the constructor.",
    "Calls: for each widget or activeChart() call, migration_lookup with kind 'method'. Studies: kind 'study' gives the indicator id, then get_indicator gives its params and line keys. Shapes: kind 'drawing' gives the type, list_drawing_tools its anchors. TradingView points take time in seconds; TradeCanvas anchors take milliseconds.",
    "Saving: save_load_adapter and charts_storage_url become the layouts option, layouts: { storage }, with a LayoutStorage of your own (list, load, save, remove). Charts saved in TradingView's format do not load: users start new layouts.",
    "Trading: a broker becomes an ExecutionAdapter; order, position and execution lines become chart.setOrders / setPositions and the orderPlace, orderModify, orderCancel and positionClose events. migration_lookup kind 'broker' maps each member.",
    'Custom indicators (custom_indicators_getter): rewrite each as an IndicatorPlugin, or use the built-in one migration_lookup finds.',
    'Run validate_options on the final options, start the app, and compare the chart with the old one: symbol, timeframe, colours, studies, drawings, trading lines.',
  ],
  search: [
    { pattern: 'TradingView\\.widget|charting_library|library_path', what: 'where the widget is made and loaded', then: "convert_widget_options on its options" },
    { pattern: 'disabled_features|enabled_features', what: 'featuresets', then: "convert_widget_options, or migration_lookup kind 'featureset'" },
    { pattern: 'overrides|applyOverrides|studies_overrides', what: 'colours and styles', then: "convert_widget_options, or migration_lookup kind 'override'" },
    { pattern: 'onReady|resolveSymbol|getBars|subscribeBars|searchSymbols', what: 'the datafeed', then: "feedFromJsApi(datafeed); migration_lookup kind 'datafeed'" },
    { pattern: 'onChartReady|headerReady|activeChart\\(|\\.chart\\(|setSymbol|setResolution|subscribe\\(', what: 'calls on the widget and its charts', then: "migration_lookup kind 'method'" },
    { pattern: 'createStudy|removeEntity|getAllStudies', what: 'studies (indicators)', then: "migration_lookup kind 'study', then get_indicator" },
    { pattern: 'createShape|createMultipointShape|getAllShapes|removeAllShapes', what: 'drawings', then: "migration_lookup kind 'drawing', then list_drawing_tools" },
    { pattern: 'createOrderLine|createPositionLine|createExecutionShape|broker_factory|broker_config', what: 'trading', then: "migration_lookup kind 'broker' or 'method'" },
    { pattern: 'save_load_adapter|charts_storage_url|saved_data|load_last_chart|\\.save\\(|\\.load\\(', what: 'saving and loading charts', then: "migration_lookup kind 'option' / 'method'" },
    { pattern: 'custom_indicators_getter|PineJS', what: 'custom indicators', then: 'IndicatorPlugin, or the built-in one migration_lookup finds' },
  ],
  checks: [
    'No import or global of the old library is left (search the patterns again).',
    'validate_options reports no problems.',
    'The chart loads history, scrolls back for more, and updates live.',
    'Drawings and studies the app adds by code show where they did before (times in ms).',
    'Trading lines move and cancel through the app\'s own order code.',
  ],
};

const LIGHTWEIGHT: MigrationPlan = {
  source: 'lightweight-charts',
  steps: [
    'Install @tradecanvas/chart (and @tradecanvas/react, vue or svelte if the app uses one).',
    'Search the code with the patterns below.',
    "createChart(element, options) becomes new Chart(element, options): give its options to convert_widget_options with source 'lightweight-charts'. For a full trading UI with toolbars, use ChartWidget instead.",
    "The main series: the add…Series call sets the chart type (migration_lookup kind 'method'), its setData becomes chart.setData(bars) and its update(bar) becomes chart.updateLastBar(bar) or chart.appendBar(bar).",
    "Times: Lightweight Charts takes seconds or 'YYYY-MM-DD'; TradeCanvas takes milliseconds: time * 1000, or Date.UTC(y, m - 1, d) for a date. Bars need open, high, low, close and volume.",
    "Every other series, price line and marker: migration_lookup kind 'method' says what it becomes (an indicator, a compare, a price line, a mark).",
    'Run validate_options on the options, start the app and compare the chart with the old one.',
  ],
  search: [
    { pattern: 'lightweight-charts|createChart\\(', what: 'where the chart is made', then: "convert_widget_options with source 'lightweight-charts'" },
    { pattern: 'add(Candlestick|Bar|Line|Area|Histogram|Baseline)?Series', what: 'series', then: "migration_lookup kind 'method'" },
    { pattern: '\\.setData\\(|\\.update\\(', what: 'data, with times in seconds', then: 'chart.setData / updateLastBar / appendBar, times × 1000' },
    { pattern: 'applyOptions|createPriceLine|setMarkers|createSeriesMarkers', what: 'options, price lines and markers', then: "migration_lookup kind 'method' or 'option'" },
    { pattern: 'timeScale\\(\\)|priceScale\\(|subscribeCrosshairMove|subscribeClick', what: 'scales and events', then: "migration_lookup kind 'method'" },
  ],
  checks: [
    'No import of lightweight-charts is left.',
    'Every time handed to the chart is in milliseconds.',
    'validate_options reports no problems.',
  ],
};

export const PLANS: Record<Source, MigrationPlan> = { tradingview: TRADINGVIEW, 'lightweight-charts': LIGHTWEIGHT };
