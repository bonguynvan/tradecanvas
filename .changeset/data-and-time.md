---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Data and time.**

- **Zoom out until every loaded bar fits.** Below the old 2px bar + 2px gap
  floor the slot keeps shrinking, bar and gap together, down to
  `MIN_BAR_UNIT` (0.25px), as long as the loaded bars do not fit yet. A short
  series still stops at the old floor. Below a pixel per bar, candles, OHLC
  bars, volume candles and volume draw one column per pixel
  (`forEachPixelColumn`, `renderDenseBars`). The 1Y, 5Y and All presets are no
  longer capped at about 200 bars.
- **Older bars load as you scroll back.**
  - New optional `DataAdapter.fetchHistoryBefore(symbol, timeframe, before,
    limit)`. Binance, Bybit and Mock implement it; `WebSocketAdapter` and
    `PollingAdapter` take it as an option.
  - A connected chart loads a page (`StreamConfig.historyPageSize`, default
    500) when less than a screen of bars is left of the view. It runs one
    request at a time and keeps the same bars on screen. It stops at the start
    of the history and waits 5 seconds after a failed request.
  - New `chart.prependBars()`, `setHistoryLoader()`, `loadMoreHistory()`,
    `hasMoreHistory()`, `isLoadingHistory()` and the `historyLoad` event.
  - ChartWidget shows a small pill while older bars load (`historyPageSize`
    widget option).
- **Any interval.**
  - `TimeFrame` accepts any whole count of a unit (`'7m'`, `'90m'`, `'2d'`,
    `'5w'`) besides the listed ones; `parseTimeframe` and `isTimeFrame` check a
    string. `timeframeToMs` and `timeframeBucketStart` handle them all.
  - New optional `DataAdapter.supportedTimeframes`. Binance, Bybit, Kraken and
    Coinbase list theirs; `WebSocketAdapter` and `PollingAdapter` take them as
    an option.
  - The stream builds a timeframe the feed lacks from the coarsest one it has
    that divides it (7m from 1m, 90m from 30m, a quarter from months). This
    covers history (paging back when one request holds too few bars), live
    bars and older pages: `ResamplingAdapter`, `withResampling`,
    `resampleBars`, `pickBaseTimeframe`.
  - Before, Binance quietly sent 15m bars for intervals it lacks (45m, 2d, 3M…).
  - ChartWidget: the timeframe menu takes a typed interval (`7`, `90`, `2h`,
    `3D`, `1W`, `2M`). It is added, pinned, remembered and removable with an
    ×; `customTimeframes: false` hides the field. New `parseTimeframeInput`.
- The widget's replay bar sits above the time axis.
