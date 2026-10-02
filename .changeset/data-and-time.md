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
    500) when less than a screen of bars is left of the view.
    - It runs one request at a time and keeps the same bars on screen.
    - It stops at the start of the history.
    - After a failed request it waits 5 s before asking again, doubling each
      time; after 5 failures in a row only `loadMore()` retries.
    - Chart types that reshape the bars (Renko, Kagi…) only page on
      `loadMore()`.
    - A loader set with `setHistoryLoader` wins over the stream's.
    - A reconnect keeps the paged-in bars and the view.
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
  - A timeframe the feed cannot build (30s from minutes, or more than 1440 of
    its bars per bar) is refused: `connect` and `setTimeframe` throw a
    RangeError, and the widget rejects it in the menu. New `servesTimeframe`.
  - One history call makes at most 10 requests to the feed, and stops when the
    adapter disconnects.
  - Live bars of a built timeframe hold up when a feed never flags a bar
    closed or repeats a frame. The forming bar starts from the bars history
    served, so a reconnect no longer leaves a partial candle.
  - **Type change.** `TimeFrame` now also accepts any `` `${number}${unit}` ``.
    Code that switches exhaustively over `TimeFrame`, or reads a
    `Record<TimeFrame, X>` as if every key were present, should use
    `KnownTimeFrame` or a fallback.
  - ChartWidget: the timeframe menu takes a typed interval (`7`, `90`, `2h`,
    `3D`, `1W`, `2M`). It is added, pinned, remembered and removable with an
    ×; `customTimeframes: false` hides the field. New `parseTimeframeInput`.
- **Time zones with daylight saving time.**
  - New `chart.setTimezone(tz)` / `getTimezone()` and `ChartOptions.timeZone`.
    `tz` is an IANA zone (`'America/New_York'`), a fixed offset in minutes,
    or null for the browser's zone. An unknown zone throws a RangeError.
    `setTimezoneOffset` still works.
  - The zone applies to the time axis and its `UTC-4` tag, the crosshair pill,
    the tooltip, day/week/month breaks, the range presets and go-to-date.
    Before, day breaks always followed the browser's zone.
  - Session hours take `timeZone`, so NYSE's 09:30–16:00 holds through
    daylight-saving changes.
  - New commons helpers: `TimeZoneSetting`, `isValidTimeZone`,
    `zoneOffsetMinutes`, `offsetAt`, `wallToUtc`, `zonedDateFormatter`.
    `timeParts` and `tzLabel` accept a zone.
  - ChartWidget's timezone setting lists 28 zones by city, each with the offset
    in force (older fixed-offset settings still apply).
  - YTD now starts on the bar at 1 January 00:00 instead of the one after it.
- **Symbol search and symbol info.**
  - New optional `DataAdapter.searchSymbols(query, { limit, signal })` and
    `resolveSymbol(symbol)` that return `SymbolInfo`: description, exchange,
    type, price precision and step, exchange time zone, trading sessions and
    currency.
  - Binance implements both. Its symbol list loads once, on the first search,
    and loads again after a failure. Mock (a `symbols` option) and the
    WebSocket/Polling adapters (options) implement them too.
  - A connected chart asks `resolveSymbol` about its symbol and drops a late
    answer about a symbol it left.
  - New `chart.setSymbolInfo` / `getSymbolInfo` and the `symbolInfoChange`
    event. The symbol's precision applies unless `setMarket` set one, and its
    sessions feed the session shading.
  - `setTimezone('exchange')` (`EXCHANGE_TIMEZONE`) follows the symbol's zone;
    `getEffectiveTimezone()` returns the resolved zone.
  - ChartWidget's symbol search asks the feed (or a `searchSymbols` option) as
    you type. It debounces, cancels a superseded query, and shows names and
    exchanges.
  - The symbol button shows the name; the settings offer the exchange's zone.
  - New `rankSymbols` and `stepDecimals`.
- **ChartWidget in 14 languages.**
  - Languages: English, Vietnamese, Simplified and Traditional Chinese,
    Japanese, Korean, Spanish, Portuguese, French, German, Russian, Turkish,
    Indonesian and Thai.
  - Every string the widget shows now goes through its translations: settings,
    drawing tools and their groups, alerts, the object tree, the data window,
    the depth ladder, the symbol search, the command palette, the hotkey sheet,
    the replay bar and toasts. Several of these were English in Vietnamese
    too.
  - The new entry `@tradecanvas/chart/widget/locales` holds the translations,
    so a page loads only what it imports: pass one as `messages`, or call
    `registerWidgetLocales()`. English and Vietnamese stay built in.
  - A locale falls back to its language (`ja-JP` → `ja`); Chinese regions fall
    back to their script (`zh-TW` → `zh-Hant`).
  - New `registerWidgetLocale`, `findWidgetLocale`, `WIDGET_LANGUAGES`, and the
    `MessageKey` / `WidgetMessages` types.
  - The settings offer number formats for these languages.
- The widget's replay bar sits above the time axis.
