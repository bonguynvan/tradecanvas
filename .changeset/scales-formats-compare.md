---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Scales, formats and comparisons.**

- **Price and time formats**: `ChartOptions.priceFormat` (a function, or
  `{ denominator, subDenominator }` fractions: `formatFraction`,
  `fractionTick`, `priceFormatterFor`), `setPriceFormat`,
  `getPriceFormatter`; `timeFormatter` / `setTimeFormatter` (told whether a
  label is a date, a new day, a time or the crosshair's). The format rides
  on `ViewportState.formatPrice` / `priceUnit` to every price label of the
  price scale; indicator panes keep their own numbers. The crosshair pill
  reads in percent on a percent scale.
- **Chart types**: `'hiLo'`; `ChartTypeOptions` (`chartTypeOptions`,
  `setChartTypeOptions`, `getChartTypeOptions`, `readChartTypeOptions`),
  kept in saved states; Renko's ATR measures the latest bars; `toKagi` takes
  a price reversal. `setMainSeriesVisible`, `setHighLowLines` /
  `highLowLines`, `setBidAsk` (and `RawTick.bid` / `ask` through
  StreamManager's `quote`). ChartWidget offers all 18 types and their
  settings.
- **Compare**: `compareSymbol` and `spread` indicators on other symbols'
  bars (`SymbolSeriesStore`), `setSymbolSeries`, `getSymbolSeries`,
  `getRequiredSymbols`, the `symbolSeriesRequest` event; compare overlays
  line up by time and count in the auto scale (`CompareRenderer.getPriceRange`);
  `setPaneScale(id, { percent })`. ChartWidget asks how to compare (percent,
  own scale, own pane, spread, ratio) and fetches the bars.
- **Extended hours**: `setExtendedHours`, `isExtendedHoursVisible`,
  `ChartOptions.extendedHours` (from `SymbolInfo.sessions`).
- **Export**: `getExportData`, `getExportText`; `exportAllData` /
  `exportVisibleData` take `{ indicators }`; `DataExporter` columns
  (`ExportColumn`), CSV cells safe from formulas.
- **Replay**: `replayStep` and `replayState` events, `replaySeekToTime`;
  `ChartWidgetGrid` sync `replay`.
