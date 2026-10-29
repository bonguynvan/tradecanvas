# @tradecanvas/commons

## 1.54.1

### Patch Changes

- 656f663: A grid's other charts show the bar the linked crosshair is on: their OHLC legend, indicator rows and data window read it, and go back to the latest bar when the pointer leaves. The new `crosshairSync` event (`{ barIndex, bar, time, prevClose }`, `barIndex: null` when it goes) says which bar `setCrosshairTime` put the line on; it never fires as `crosshairMove`.

## 1.54.0

### Minor Changes

- 4363ad6: The crosshair's tooltip dates a Renko brick, a Kagi line or a point & figure column as the time axis does. It showed the brick's own time, which only counts bricks from the first bar's, so a brick of 2026 read 4 Jan 2016 with seconds while the axis under it read 2026. The `crosshairMove` payload gains `time`, that same date (a candle's own time), and `prevClose`, the close of the bar drawn before it (the brick before, on Renko).
- b355fb9: Ichimoku Cloud draws its lagging span. Each bar's close is plotted the displacement back (the `displacement` input, 26 by default), as the standard definition has it, so the last 26 bars have none yet. It is the line `chikou` ("Lagging Span") in the indicator's fifth colour: it has a value in the legend, a column in the CSV and JSON export (`Ichimoku 9 26 52 Lagging Span`), a style of its own in the indicator settings, and `indicatorSource(id, 'chikou')` reads it. Hide it with `plots: { chikou: { visible: false } }`. With only four colours of your own it takes the series palette's fifth, not the conversion line's. The cloud is unchanged: its two lead lines are still drawn on the bar they are worked out for, not the displacement ahead. `getIndicatorOutput` already held a `chikou` field, which was the bar's own close; it is now the close the displacement on, and the `displacement` input, which did nothing before, sets it.
- 4363ad6: Indicators on Renko, Kagi, line break, point & figure and range bars are worked out on the bricks, lines or columns drawn. They were worked out on the bars under them and drawn at the bricks' places, so an EMA stayed near 92,000 while the bricks climbed to 98,900, an RSI line had nothing to do with the value its legend gave, and the lines started a third of the way across the plot. Now a line sits on the bricks and reads their closes; `getIndicatorOutput(id).series` holds a point per brick, the legend and ChartWidget's data window read it at the brick under the pointer (the latest brick with none), an alert on an indicator line reads its last brick, and an export writes the bricks beside their values, dated as the axis dates them. The indicators that count days, VWAP, Session VWAP and the multi-timeframe moving average, are left off these types as the ones that read another symbol are (`offChartType: true`), and `getActiveIndicators()` now gives `scale: 'left'` for an overlay on a scale of its own. Back on candles everything is worked out on the bars again.
- 243d105: ChartWidget's indicator rows move with the OHLCV legend when it gets taller or shorter. A switch that wrapped the legend onto another line (a timeframe or a status text on a phone) left the rows where they were, over the legend's last line, until something else redrew them; with auto-scale off nothing did. The chart now emits `legendResize` with `{ bottom }`, the new `getLegendBottom()`, after a draw that changed the legend's height, and the widget places the rows again. Labels of your own stacked under the legend can follow it the same way. The API docs in all six languages and the skill list the event. It also comes when the legend is hidden or shown again, by `setLegend({ visible })` or `setFeatures({ legend })`.
- 58aa1c8: The price limits read on the light theme. With `MARKET_HOSE` or another Vietnamese preset, the REF and FL names were yellow and cyan on the cream background (under 2.5:1), and CE was magenta at 3.3:1. A limit's colour that doesn't read at 4.5:1 on the theme's background is now shaded toward the theme's text until it does, for its line, its name and its axis tag, and the tag's price is written in the background's colour or the text's, whichever reads on it. On the dark theme the colours already read and stay as they were. Themes gain an optional `priceLimits` (`{ ceiling, floor, reference }`), the colours used when the market's colour scheme gives none: the dark theme's are the magenta, cyan and gold the chart drew before, the light theme's deeper shades of them (`DARK_PRICE_LIMITS`, `LIGHT_PRICE_LIMITS`). `contrastRatio`, `readableOn` and `inkOn` are new colour helpers. A theme of your own that sets no `priceLimits` takes the light ones on a light background and the dark ones on a dark one.

### Patch Changes

- 2f662ea: A compare added in a pane of its own gets one. In ChartWidget, Compare's "Price, in a pane of its own" drew the other symbol's price on the main pane, as "on its own scale" without the scale: the line was an overlay, and an overlay can't open a pane. It now adds the new `compareSymbolPane` indicator, which reads the symbol as `compareSymbol` does and draws its close in a pane of its own, on that pane's scale; taking the comparison off takes the pane away. On a `Chart`, `chart.addIndicator('compareSymbolPane', { symbol: 'ETHUSDT' })` does the same; `compareSymbol` stays on the price pane (on the price scale, or `{ scale: 'left' }` for a scale of its own). A layout or template saved before this holds such a compare as `compareSymbol` and opens it as a line on the price pane, as it was drawn: take it off and add it again in its own pane. The chart can't tell it from a `compareSymbol` you put on the price scale on purpose, so it is not moved for you.
- 4c475f7: A point & figure chart fills the view. Its automatic box was 1% of the average close, which on a stock that moved 7% made a single column of a few X's at the right edge. It is now a fiftieth of the range from the lowest low to the highest high (the bar still forming left out), rounded to 1, 2 or 5, so the columns span the scale. A chart with fewer columns than the view holds is fitted to it when the type, the box or the series changes. Boxes a few pixels high or less, from a box set small for the prices, are drawn as solid columns in the colour of their way instead of X's and O's too small to see.

## 1.53.1

## 1.53.0

### Minor Changes

- 0d4c66b: A replay goes on when the bars under it change. Started while another timeframe's history loaded, it replayed the old bars and kept the new ones out of sight until it stopped; a symbol or timeframe switch during a replay did the same, `setData` ended it, and older bars were dropped. Now the replay is a time over the live series: a new symbol or timeframe (`connect`, `switchStream`), `setData`, older bars (`prependBars` returns their count, and history pages in during a replay), the extended hours and a corrected bar carry it over to the same time, showing only bars that closed by then. While a new series loads it waits, playing or paused as it was, and says nothing on `replayState`; a `duration` keeps the time it had left. A replay a paper account trades ends when the symbol changes. `replaySeekToTime` no longer shows a coarser bar whole before it closes, so a grid's synced replay doesn't give the coming hours away. `replayStep` gains `cause` (`'play'`, `'seek'` or `'series'`), `getReplayProgress()` gains `time` and `until`, and a page of history dropped by a new series is reported as `loaded` with no bars. Indices (`barIndex`, `total`, `replaySeekToBar`) are of the bars replayed now; keep a position by time. To end a replay on a new series as before, call `replayStop()` first. In ChartWidget the replay bar stays open across a switch, says Loading chart and waits while the bars load, then follows their total and the new interval's steps. `loadMoreHistory()` called while a page is on its way resolves to that page's count, where it gave 0, so a replay paging back no longer stops at the newest page.
- 4e44074: Bars form as a replay plays. With `animate: true` (`replayStart`, `ReplayConfig`) each bar grows over its time as a live one does, from its open to the extreme its direction says came first, the other one, then its close, and ends as the bar is in the series; a pause holds it half drawn, a seek or a step shows whole bars, and a paper account fills as the drawn price reaches an order. `step: 'auto'` (or an interval such as `'1m'`) shapes each bar with finer bars the chart fetches through the connected feed's `fetchHistoryBefore` for the bars it is about to play, only while it plays, one request at a time; `'auto'` is the finest the feed serves with at most 60 to a bar, and the new `replayStepsLoad` event says how the fetching goes. Finer `steps` you pass shape the bars the same way with `animate`; without it they stay steps of their own, as before, now keeping only the hours shown, and a bar's last step shows the bar as the series has it. Indices, `speed` and `duration` count the chart's bars, and `getReplayBarIndex()` is the bar forming. Bars shorter than three frames come whole; under reduced motion a bar steps between its prices. `ReplayManager` gains a `phase` event, `getFraction()` and `getStepMs()`. ChartWidget replays this way by default: the Step menu starts on Auto, the new `replayStep` and `replayAnimate` options set it, step forward completes a half-drawn bar first, and the widget no longer fetches the newest finer bars, which were not the ones replayed, when the feed has `fetchHistoryBefore`; with `replayAnimate: false`, Auto replays whole bars as before; on a feed without it the widget fetches them in one request as before and the bars form along them.
- 9c18140: ChartWidget's replay bar is redesigned. It is a compact bar on the foot of the main pane, centred on its plot, so bottom panes stay readable; toasts and the phone's drawing button move above it. It shows the date and time of the step on screen (in the display timezone, the year only when it isn't this one) and fills the played part of its track. Speeds are multipliers from 0.1× to 50×, where 1× plays one bar of the chart a second whatever the step, and the default is now 1× (it was 5 bars a second); with `replayAnimate: false` and finer steps a speed now means chart bars, not steps, a second. **Select bar** pauses and picks another start among the bars shown without showing the bars to come, and Cancel or Esc goes back to the same place. Space on the chart or the track plays or pauses during a replay (outside one it still fits the chart), and Shift+←/→ now step only the widget used last, never the replay behind an open dialog, after a shortcut you added with `addHotkey` on the same keys. The toolbar's Bar replay button shows as pressed while the replay is open, focus goes back to it when the bar closes, the keyboard-shortcut sheet lists the replay's keys (and Space, not F, for fitting the chart), and the bar opens without jumping sideways. On a phone or a narrow chart it takes two rows. In a right-to-left widget the bar runs left to right with time, its words read right to left, and a select's chevron no longer sits over its value. `replayStep` gains `stepTime`, when the step shown opened (a required field: code that builds a `ReplayStepPayload` itself, a test fake say, adds it), and the icon set gains `replayPick`. Nine new strings in all 30 languages (`replay.selectBar`, `replay.rate`, `replay.rateHint`, `replay.playingAt`, `replay.pausedAt`, `replay.endedAt`, `hotkeys.replayStep`, `hotkeys.replayPlay`, `hotkeys.replayCancel`); `replay.barsPerSecond` is no longer used. Hosts that styled `.tcw-replay-progress` lose it: the bar shows the date instead.

### Patch Changes

- 5d0aa7c: The chart's `resize` event now also comes when its element changes size (a window resize, a phone rotation, a dock panel opening), not only from `chart.resize()`, so ChartWidget's replay bar fits and places itself again after one.

## 1.52.0

### Minor Changes

- eb38de1: **A bar already on the chart can be corrected.** `chart.updateBar(bar)` replaces the loaded bar with the same `time`, wherever it is in the series, and returns `true`. The indicators are computed again from that bar on, Heikin-Ashi, Renko and the other types built from the bars follow, and the view stays where it is, so a feed that learns a closed bar was off no longer needs `setData`, which scrolled to the newest bar, ended a replay and computed everything again. Several corrections before the next frame are computed once, from the earliest. It returns `false`, and changes nothing, when no loaded bar has that time (a new bar is still `appendBar`'s, older ones `prependBars`') or the chart can't take the bar. A correction is no live price: orders and alerts don't follow it and no alert fires on it; alerts on indicator lines aren't checked against the corrected values. A corrected last bar moves the price line, measured from the bar before it, and is where the next price's alert crossing counts from, as after `setData`. During a replay it corrects the live series, shown when the replay ends; a bar in the extended hours while they are hidden shows when they are shown. The bar loaded sent again computes nothing, also without volume or with a high under its close, so a feed that sends its last closed bars on every poll costs nothing for those that didn't change; a missing volume is 0, as with `setData`. The shown array is changed in place, as `updateLastBar` does, so an array you kept from `getData()` sees the new bar. With the WebGL renderer the corrected candle is drawn too.

  `dataUpdate` has a new kind, `{ kind: 'correction', time, index }`, sent after the indicators have the corrected bar (none for a hidden bar, during a replay, or for a bar sent again unchanged). In TypeScript, an exhaustive `switch` over `DataUpdatePayload` needs a `'correction'` case. The legend, the crosshair tooltip, the pinned tooltip, the widget's data window and your `crosshairMove` listeners show the corrected values while the pointer rests on that bar or the one after it. In ChartWidget, `widget.getChart().updateBar(bar)` corrects a connected feed's bars; bars given to the widget with `setData` are a copy it builds its timeframes from, so a correction to them lasts until the next timeframe switch (a widget method for these is to come).

  **A connected feed corrects a bar by sending it again, closed.** A closed bar (`{ bar, closed: true }`) older than the newest the stream has seen is now the feed's last word on that bar, a venue's final that came after the next bar's first frame or a revision, and goes in as `updateBar`; until now it was dropped. A feed that re-sends outdated closed bars would now apply them. A forming frame older than the newest is still left out, and no longer moves the price line, the orders' P&L or the alerts: a stale frame closing at 90 fired an alert at 95 while every bar stayed at 100. The built-in adapters made a tick from every bar frame's close, a late final's and a stale frame's too, so those moved the price as a live price would: `BinanceAdapter` and `WebSocketAdapter` (`BybitAdapter`, `KrakenAdapter` and your adapters built on it) now make one only from a frame of the newest bar, of those they have sent on the connection and the last of the history they served for its symbol and timeframe (a feed that sends its last closed bar again on subscribing made a tick from it after every reconnect), and none from that last bar sent closed at the close it was served at, until a frame of it comes forming, while its final at another close, the bar having been served still forming, makes one; `PollingAdapter` (`CoinbaseAdapter`) leaves out an answer older than one it already sent or than the last bar of the history it served, a slow request overtaken by the next or a cached page, and sends that last bar closed, with its final values, when the next bar started before the first poll. A `DataAdapter` of your own that makes ticks from its bars should leave older bars out too. On a timeframe built from a finer one, a corrected base bar builds its bar again for the last two built bars before the forming one (`KEPT_BUCKETS`); a correction further back, or to a bar whose base bars were never seen, is left out.

  With `aggregateTicks`, the history's last bar is now the one the trades build on: the first trade after connecting kept only itself, so the forming bar lost its open, high, low and volume. A reconnect (the page coming back, a retry, a heartbeat timeout) whose history ends on the bar before the forming one keeps the forming bar's trades; one whose history holds the forming bar takes the history's, which has the trades missed while away. Such a reconnect also set the price line, the orders' P&L and the alerts back to the history's last close, and the chart left out the forming bar until the next trade: with trades at 96 and the history ending at 100, an alert at 98 fired, and the next trade's crossing back over 98 didn't. The forming bar now stays on the chart and the price on its close, for a feed's own bars without `aggregateTicks` too. Its price tag keeps its colour: it showed a fall as a rise until the next trade, as it did whenever a feed sent a frame at an unchanged price (`CurrentPriceLine.setPrice` given no close to measure from keeps the one it has when the price is the same), and a bar you add with `appendBar` or `appendBars` is measured from the close before it, as a stream's new bar is, so one opening at the last close is level. A trade for a bar already past, delivered late, is left out, where it closed the forming bar early and started it again, and a closed bar for the bar before the forming one corrects it, the forming bar keeping its trades. A trade from after the newest bar starts goes in that bar even when the buckets start it earlier, as for a daily history stamped at another hour than the buckets' midnight (05:00 UTC, a browser's midnight five hours west) or a symbol whose zone comes after the first trade, so the price, the orders and the alerts follow every trade.

  `TickAggregator` and `StreamManager`, exported from `@tradecanvas/core` and `@tradecanvas/chart`, change with this. `TickAggregator` keeps the newest bar time it has seen: `processBar` sends a closed bar older than it as the new `correction` event (not `barClose`) and leaves out a forming one, and `processTick` leaves out a trade from before that bar starts and puts a later one whose bucket starts before it in that bar. `seed(time)` starts it from a history's last bar and doesn't move the newest back, unless the trades built the newer bar on buckets they no longer start on (the exchange's zone came after them, or a reconnect's history starts its 4h bars at the zone's midnight where the first connect had none), a bar it then lets go so that the next trades aren't left out as late until the next bucket; `resume(bar)` makes the history's last bar, still forming, the one the next trades build on unless it is older than the newest, and `reset()` and `setTimeframe()` forget the newest. `StreamManager` seeds it on every connect and switch, puts the bar it was building on top of a reconnect's `snapshot` whose history ends before that bar, with no `priceChange` for the history's last close, sends a correction as the new `barCorrection` event with no `priceChange`, and moves the previous close a price's change is measured from when the corrected bar is the last closed one. It sends `priceChange` at an unchanged price too when that previous close moved, as when a new bar opens at the last close, which is level with it. `GpuFrame` has an optional `seriesRevision`, which moves when a bar of the same array was replaced in place; a GPU renderer of your own that keeps the bars should write them all again then. The Anchored VWAP drawing kept its line by the array, its length and the last bar, so it drew the old line after a correction further back; it now follows the corrected bar. `DrawingPlugin.setDataGetter(getter, revision?)` hands a drawing tool of your own the same revision beside the bars, for what it keeps computed from them.

  The React, Vue and Svelte components take a change to one of the last three bars before the forming one (`CORRECTABLE_BARS`), its time the same, as a correction (`updateBar`), not a new series: the view stays. In Vue and Svelte that holds for a bar changed in place too, which the components didn't see before. A change further back is still a new series. `BarFeedHost` has an optional `updateBar`; without it, or when the chart refuses a correction, the bars are given as a new series, once.

- 84a263b: **Bars the library builds start at the exchange's midnight, not UTC's.** This changes where some bars start. When the chart knows the symbol's zone (for the timeframes a feed lacks, only `SymbolInfo.timeZone` from your adapter's `resolveSymbol`; for bars given to `ChartWidget.setData`, the symbol's zone, else the market's from `setMarket`), the days, weeks, months and the hour frames that divide a day (2h, 3h, 4h, 6h, 8h, 12h) it builds from shorter bars start at that zone's midnight. They used to start at UTC's, so a Ho Chi Minh City 1D bar opened at 07:00 there and a 4H bar split the morning session at 11:00; it now opens at 00:00 there (17:00 UTC the day before), and 4H bars run 08:00–12:00 and 12:00–16:00. Where a session crosses UTC midnight (Sydney, New York's evening hours in winter), the days' open, high, low, close and volume change too. A day the clocks change is 23 or 25 hours long. 1h and shorter bars keep their floor on the epoch, so the hour a fall-back night repeats stays two bars. Nothing changes without a zone, or with UTC: Binance, Bybit, Coinbase and Kraken build exactly what they built before.

  Daily bars stamped at 00:00 UTC (as feeds and CSV files usually stamp them) are read as the dates they name: weeks and months built from them keep the Monday in its own week and their 00:00 UTC stamps, in any zone.

  For a feed with `supportedTimeframes`, the wrapper that builds its missing timeframes asks `resolveSymbol` for the zone once per symbol, as it fetches the first history of such a timeframe (the chart's own question about the symbol is the same request), builds that history once the answer comes, and keeps the zone, so history, older pages and live bars agree. A zone whose days need a finer timeframe than UTC's (Ho Chi Minh City's on a feed of 4h bars) has the history fetched again at that one. It waits at most 5 s; 1h and shorter timeframes never wait. A feed without `resolveSymbol`, one that names no zone, fails to answer or answers after 5 s, or one whose timeframes can't line up with that midnight (only 4h bars for a zone 7 hours from UTC) builds UTC days as before, and keeps the timeframe; once a symbol's days are built in UTC they stay so, so older pages and the history after a reconnect never hold a day twice. After a failed or late answer they stay so only until the chart loads the symbol afresh (connects to it, or switches to it from another symbol or timeframe): that load builds them in the zone the feed has named since, or asks it again, without waiting a second time for an answer still on its way (`ResamplingAdapter.renewZone(symbol)`, which `StreamManager` calls on such a load). When a chart comes back to a symbol before the history of the one it left lands, and that load builds the symbol's days in a zone the feed has named since, the new history replaces the bars on screen instead of being merged with them; with the days in the same zone it is merged as before when older bars were paged in, keeping them and the view. `setMarket`'s zone doesn't move a feed's built bars. A zone the feed sends later in a `symbolInfo` event changes the times shown, not where built days start. The widget builds the days, weeks, months and 2h to 12h bars it made from bars it was given again when the symbol's zone or the market's arrives after them, a view scrolled back staying on the times it showed, at its zoom, and one at the newest bars staying there to follow the next (on Renko and the other types that redraw the bars, at the newest bars); the shorter ones it made (15m or 1h from minutes) start where they did in any zone and stay as they are, the indicators computed once.

  Daily bars show the date they stand for in any zone shown, on the time axis, the crosshair's label and its card, the tooltip Alt-click pins (which now writes a daily bar's date with its year, `10/23/2026`, where it wrote `10/22 17:00`) and the bar times a screen reader reads (the date alone): a bar stamped at 00:00 UTC its UTC date (a New York viewer saw the day before), a bar stamped at the exchange's midnight the exchange's date, any other bar the date in the zone shown (a bar stamped at the browser's midnight keeps its date).

  New: `timeframeBucketStart(time, timeframe, { timeZone, weekStartsOn, dates })` and its `BucketOptions` type are exported from `@tradecanvas/chart`, to build your own bars where the chart's start (the third argument may still be the day weeks start on). `resampleBars` takes the same options, and `pickBaseTimeframe` a `{ timeZone }`. `chart.setMarket` sends a `marketChange` event. `TickAggregator` starts weeks on Monday and months on the 1st (it counted 7 and 30 days from 1970) and takes `setTimeZone(zone, dateStamps?)`; `StreamManager.setTimeZone(zone)` passes the chart's zone to it for `aggregateTicks` (and throws a RangeError for a zone the browser doesn't know, as `chart.setTimeZone` does, keeping the zone it has), and the bars it builds from ticks land on the history's: days are stamped at 00:00 UTC when the history's are, and 2h to 12h bars start at the exchange's midnight only when the history's do, so a feed's own 4h bars (00:00, 04:00… UTC) keep their times. On a timeframe built from a shorter one of the feed's they start where the built bars start. Built from hours, they start at the midnight of the zone the feed named for the symbol, else UTC's, whatever zone the chart has: a trade on a Friday evening in New York no longer lands in a day older than the history's last when the feed named no zone. Built from the feed's days stamped at 00:00 UTC, weeks and months keep the feed's dates, and a trade is dated in the zone the feed named, else the chart's, as on the feed's own days: a Monday morning trade in Sydney opens the new week. `ResamplingAdapter.bucketFor(symbol, timeframe)` says how a timeframe it builds is bucketed.

  `@tradecanvas/commons` also exports the helpers these use: `timeframeFollowsDays(tf)` (whether a frame's buckets start at a midnight: days, weeks, months, 2h to 12h), `timeframeSpansDays(tf)` (bars a day long or more), `isUtcTimeZone(tz)`, and `barDateZone(time, tz, exchangeZone)` / `barDateParts(time, tz, exchangeZone)`, the zone and the calendar parts a daily bar is dated in.

- 41bbc39: **A symbol compared in percent reads as a percent, not as a price.** `widget.addCompareSymbol(symbol)` drew the other symbol's percent line on your price axis, so a 0.10 coin compared with a 3,000 coin seemed to trade at about 3,000, and no legend said otherwise. The widget now puts the price scale in percent while a symbol is compared in percent, and back to your scale when the last one goes; a logarithmic, percentage or indexed-to-100 scale is left alone, and a scale you pick while comparing (the status bar, the chart's menu, the settings) is kept. The percent scale is never saved in a layout or a shared link, and the chart's menu and the settings show the scale on screen. The legend lists each symbol compared in percent above the indicators, marked with a stroke of its line's colour, with its own price and its change at the bar under the cursor in the legend's text colour (no one colour reads as text on both the dark and the light theme), an eye to hide it and a button to take it off; it follows a pan, since the change is counted from the first bar on screen. A compare line you put on the chart yourself (`widget.getChart().addCompareSymbol`) gets a row too, and its eye and remove button work on that line. Each line's label is at its end, where the lines part, not at their shared start, its name in the text colour after a stroke of its line's colour, with a halo of the chart's ground around its letters (no box over the newest candles), and keeps clear of a price alert's label at the plot's right edge and of the other lines' labels, going below its line's end when above is taken, and never further out to a spot nearer another line's end, where it would read as that line's name, while it has another (`CompareRenderer.setReservedLevels` gives it the prices to keep clear of).

  Every percent line now starts at the chart's close on the first bar on screen, the price a percent scale reads 0% at, so a symbol whose bars begin later reads its own change rather than the chart's move plus its own; on a regular scale such a line now starts level with the first bar on screen. The widget fetches the other symbol's bars as deep as the chart's and, when the chart loads older bars, only the stretch those add (through the adapter's `fetchHistoryBefore`, one round at a time; without it, each line short of the chart's first bar again, as deep as the chart's, and no more once the feed gave fewer bars than asked or none older), at the interval the line's bars are at: older bars that load while a new interval's bars are on their way are fetched once those have come, so a line never holds bars of two intervals. Overlay indicator tags on the price axis (an EMA's) read in percent on a percent or indexed scale, as the scale does.

  Renko, Kagi, line break, point & figure and range bars now draw no compare lines. Their bars have no time of their own to line another symbol up by, so its line read it at the wrong bars: flat at its first close on Renko and range bars, missing on Kagi, line break and point & figure. On those types the lines stay out of the auto scale, the widget leaves your scale as it is and dims each compare's legend row, whose tooltip says why, and `getCompareValues()` gives each compare's close at the latest data bar, with no change; on a chart type that draws the lines the percent scale comes back. One new string in all 30 languages, `legend.offChartType`.

  New on `Chart`: `getCompareValues(barIndex?)` gives each compare line's close at a bar and its change in percent as its line reads, with its last close and `stale: true` past its last bar; `setCompareVisible(id, visible)` hides a line and leaves it out of the auto scale. The new `compareChange` event (`{ id, change: 'add' | 'remove' | 'data' | 'visible' }`) says when a compare line is added, taken off (`clearCompareSymbols` tells each one), given new bars, shown or hidden, so the widget lists a line you add with `getChart().addCompareSymbol` in its legend at once, where its row came only once the pointer moved. `CompareRenderer.valuesAt` (with no viewport, no change) and the `CompareValue` type are what they read.

  Compare lines take colours that keep 3:1 on both the dark and the light theme, as the indicators' do, and the first is no longer the blue of a first EMA, a drawing and an alert.

- d9920d2: Prices away from the axis now read as the axis writes them. With a symbol's or a market's decimals set (`SymbolInfo.pricePrecision`, `setMarket({ pricePrecision })`), a BTC chart at one decimal showed '100,018.7' on the axis but 'Crossing 100,018.70' in the widget's alerts list, '23.6% (99125.18)' on a Fibonacci retracement and 'REF 98937.00' on the day's price limits. Drawing labels (Fibonacci levels, horizontal lines and rays, price labels, a trend line's stats, the long and short position, price ranges, the measure tools, forecasts, info lines, anchored VWAP and volume profile ranges), pivot labels, the shift-drag measure, the market profile's POC, VAH and VAL, the day's price limits and the pinned tooltip now take those decimals, and the widget's data window, alerts list, order ticket, account panel, depth ladder, symbol info and toasts write prices with `chart.formatPrice`. The lists and the data window are written again when the symbol's details arrive after them.

  All of these now group thousands and follow the chart's number locale ('99,125.18', '98.937,0' in `de-DE`), on every chart, also where no decimals are set; there each label keeps the decimals it had, except the day's price limits, which take the axis's decimals for the range on view (an FX limit on a 1.05 to 1.15 view reads 1.085, where it read 1.08). The long and short position's reward, risk and quantity and a trade zone's P&L stay at their decimals, grouped too. The figures beside the prices follow the locale as well: a Fibonacci level's percentage ('61,8% (99.726,1)' in `de-DE`), the pinned tooltip's move, the data window's and the symbol info's change, the long and short position's percentages and its R:R. A `pricePrecision` of `null`, as a feed's JSON may send, counts as none set in the widget, as it does on the chart. If your tests compare these labels' text, they may need updating.

  A price limit's tag on the axis now hides the scale's label under it, as the last price's tag does.

  The percent scale writes its labels in the number locale too, grouped ('+8,46%' and '+1.234,50%' in `de-DE`, where it wrote '+8.46%' and '+1234.50%' beside a legend reading '-0,23%'), and so do the crosshair's label and the indicators' tags on it; `formatPriceScaleLabel` does the same, and a change that reads as nothing has no sign ('0.00%', not '-0.00%').

  For plugins: `ViewportState.pricePrecision` carries the market's or the symbol's decimals (unset on indicator panes and the left scale), `priceTagText(price, viewport)` reads it, and `Viewport.setPricePrecision` sets it.

- f7ac032: **The built-in VWAP starts again each trading day.** This changes the line you see. Until now `vwap` ran over every bar loaded and never reset, so its value depended on how much history was on the chart and moved when older bars were paged in. It now has an `anchor` input: `'session'`, the default, starts again each trading day, from midnight in the exchange's time zone (the symbol's `timeZone`, else the market's from `setMarket`, else UTC); `'week'` each Monday; `'month'` on the 1st; `'all'` over every bar loaded, as it was. An anchor it does not know is read as `'session'`. Every value after the first loaded day changes, and the line breaks at each new day. Daily charts change most: there a session's VWAP is each bar's typical price, drawn as one line, so choose `'week'` or `'month'` on daily or weekly charts. Weeks start on Monday at midnight, so the Sunday-evening open of FX and futures counts in the week before, and a session that runs past midnight (futures open 17:00 to 16:00) is split there.

  A VWAP saved by 1.51 or earlier in a layout, a template or a saved default comes back with the session anchor; `chart.updateIndicator(id, { anchor: 'all' })` keeps the old line. A layout saved by 1.51 or earlier applied to a chart that already shows that VWAP keeps the anchor it has. Alerts on a VWAP line see it jump at each reset, so a "price crosses VWAP" alert can fire at a session's open. In TypeScript, `addIndicator('vwap', ...)` now takes only `anchor`; any other key stops compiling. The CSV column is still named `VWAP`, and so are the chip and the legend at the session anchor; in ChartWidget a VWAP at another anchor is named by it ('VWAP Week') in the legend, the chips, the Objects panel and another indicator's Source list, so two read apart, to a screen reader too, and the settings name the anchor and its choices in the widget's language (new `indicatorInput.*` messages), where they read 'Anchor | session' in every language.

  A live tick or a new bar is added to the sums kept for the bar before it, so no bar of the period is read again: on 100,000 minute bars a tick took about 2 µs with `'session'`, `'week'` or `'month'`, where a full computation takes 4 to 5 ms, as `vwap` did on every frame. `'all'` still computes in full.

  Indicators get the exchange's zone as `config.exchangeTimeZone`, set by the chart from `setSymbolInfo` and `setMarket` (`IndicatorEngine.setExchangeTimeZone(zone)` for an engine of your own, which with the bars as a second argument computes them again itself), never saved in a layout; a new zone computes again only the indicators that read it and those that read their lines, which the new `IndicatorDescriptor.readsExchangeTimeZone` says (`vwap`, `svwap` and `mtfma` set it; a plugin of yours that leaves it unset is computed again too, and one that sets it to `false` is not), where every indicator was computed again, some 80 ms on 100,000 bars with ten of them; the zone the chart shows (`setTimeZone`) does not move any values. A symbol whose info brings a new zone computes its indicators once, and a symbol in UTC, as every crypto feed names it, sets no zone, so a switch between two of them computes nothing again. While a connected chart asks its feed about the symbol it switches to, the indicators keep the last symbol's zone: a symbol on the same exchange then computes them once, when its bars come, one elsewhere again when its info comes, and a feed that has nothing to say about it, or says nothing within 5 s (as long as the days a feed's wrapper builds wait for it, `SYMBOL_ZONE_WAIT_MS` in `@tradecanvas/core`), brings back the market's zone, else UTC. A switch made of `disconnectStream()` and a `connect()` right after it, as ChartWidget's symbol and interval switches are, holds the zone the same way. The bars the chart builds from trades (`aggregateTicks`) keep it as long, so on the same exchange the next symbol's trades go on building the day its history ends on. `setSymbolInfo(null)` drops the zone at once. Session VWAP (`svwap`), the MTF moving average (`mtfma`), the prior-day lines (`setPeriodLevelsVisible`) and the market profile's sessions now count their days in that zone too, so the chart has one definition of the day, and all of them read bar times given in seconds (before, `svwap`, `mtfma`, the prior-day lines and the market profile's split into days never started a new day on such bars). `mtfma`'s 2h to 12h frames (`timeframe: '4h'`…) start at the exchange's midnight too: in Ho Chi Minh City a 4h frame steps at 01:00, 05:00… UTC. A feed's own 4h bars stay on UTC's grid (00:00, 04:00…), so in a zone whose midnight falls between UTC's 4-hour marks (Ho Chi Minh City, Tokyo, New York in winter) a 4h MTF line steps at other hours than such a feed's 4h candles. They stay the same for UTC symbols, Vietnamese intraday hours and US regular hours, and change where a session crosses UTC midnight: the ASX and the NZX, US post-market bars between 19:00 and 20:00 in New York in winter, and overnight futures. A piece of an indicator's line one bar long, as a VWAP's is on the first bar of a session (just after the exchange's midnight its legend reads the value and nothing was drawn), is drawn as a short level stroke through its value. On daily bars `svwap` now draws its line through each bar's typical price, where it drew nothing; its bands, which a session of one bar holds on that line, are left out, and so are their values: on daily bars its legend and the data window show the line alone, and the export leaves the band columns empty. Counting days in a zone costs a comparison a bar, not a look-up of the zone's offset. `computePeriodLevels` and `computeSessionProfiles` take the zone as a last argument and read one the browser does not know as UTC, and a session's `startTime` is its date on the exchange's clock, at 00:00 UTC.

  Anchored VWAP (`avwap`) finds its anchor bar when the bars are timed in seconds: an `anchorTime` in milliseconds matched no bar and the line was empty. `anchorTime` may be in seconds too.

### Patch Changes

- 26f9fc2: Range bars draw on intraday data. The automatic range was 0.5% of the average close, about $500 for a symbol at 100,000, more than a one-second or one-minute chart moves in hours, so no bar closed and the chart stayed blank ("Chart, no data." to a screen reader). `'auto'` now follows the bars' true range: the mean true range of the last 100 closed bars, rounded to a 1, 2 or 5 and to a whole number of the symbol's price step (`minTick`, or the market's step; on a market whose step depends on the price, the largest step those bars traded at), so bars close on prices the market can trade. The bar still forming is left out, so a tick changes only the range bars built from it and the ones before stay as they are; when a bar closes and moves the mean to the next 1-2-5 number, every bar is built again on the new range. A daily chart on `'auto'` gets fewer, larger bars than before. A range you set is used as it is, unless it is far too small for the move (below).

  The bar still forming is drawn as the last bar, so the chart ends at the last price and always has a bar. Bars have wicks: a bar closes at its low plus the range on the way up, or its high minus the range on the way down, where it used to close at its open plus or minus the range, a price that may never have traded. Closes are kept to 15 significant digits, and a price those digits read as a close reaches it: a feed that writes its prices as whole ticks times the tick size (`100209.40000000001` for `100209.4`) gets the bars its decimals make, and a range under half the last of those digits closes no bar, however the prices are written. A jump of several ranges, a gap between bars too, makes one bar for each range, where the rest of the move was dropped, and its volume is shared over them; the bars that fill a gap stand at prices the gap skipped, which never traded. A range, set or automatic, is raised to 2, 5, 10, 20… times itself, the first that makes no more, when the closed bars would make more than 100,000 range bars, or the bar still forming more than 100,000 on its own, so a range typed far too small for the symbol can't fill the page's memory; every bar is then built again on the raised range.

  `toRangeBars` makes these bars too, and takes `includeForming: true` to add the bar still forming. `chart.setChartTypeOptions()` now tells a screen reader the new summary.

## 1.51.0

### Minor Changes

- d4ca85b: The widget's symbol search opens with names. `symbols` (the option and `setSymbols`) now takes `SymbolInfo` as well as tickers, and the list the search opens with shows each one's name, kind and exchange before anything is typed; it used to show bare tickers until a search had named them, so the description column stood empty. `SymbolInfo` has a new `logo` field, shown as a badge at the start of the row; a symbol without one gets the first letter of its ticker on a tint of its kind's colour (new `--tcw-kind-1` … `--tcw-kind-5` tokens, for both themes). A logo is only ever loaded as an image, with no referrer, and only from an `https:`/`http:` address, a path on your site, a `blob:` URL or a `data:image/…` one; anything else shows the letter. The toolbar's symbol and the symbol info panel take a name and an exchange from what you gave when the chart knows none, and no longer show the previous symbol's name when nothing replaced it; the chart's own info still comes first, and counts as the symbol's when it names it or was set since the symbol changed, so a feed's own spelling (`BTC-USD` for `BTCUSD`) still names it; a blank name or a numeric exchange code in it doesn't hide yours. In the search, the chart's info gives only a name or a logo your list lacks, so its own words for a kind or an exchange (`stock` where your list says `Cổ phiếu`, a broker's name) add no tab and no exchange to pick. A feed's search results win over your words, on the list the search opens with too once a search has told of a symbol, and keep your logo; a `null`, a number or a blank where a word goes (as a JSON feed may send) counts as not given, so it neither shows nor erases yours. Price steps and hours given in `symbols` are not applied to the chart.

  The search looks different too: one grid, so the symbol, name, kind and exchange line up in every row under heads that stay at the top as the list scrolls, and the compare dialog's rows follow it. The kind tabs show as soon as the rows carry a kind, stay put while you type (a kind picked stays picked, and kinds that differ only in case are one), and when the rows come from two or more exchanges a list beside them keeps to one. These filters narrow the rows on hand (an adapter's search is asked for 50; a `searchSymbols` of yours gives what it gives); they do not search again. On the list before typing, a symbol you gave with no kind or exchange stays under a filter. With no search function, typing finds your symbols by name as well as ticker, with or without Vietnamese marks. With more kinds than one line holds, the tabs wrap and the exchange list stays on their first line. On a phone the kind column gives way to the badge's colour, the tabs scroll in one line and fade at an end with more past it, and the ticker is the row's key: its column is as wide as the widest ticker (up to 144 px, or 38.2% of the row), so `OKX:BTC-USDT-SWAP` shows `BTC-USDT-SWAP` whole and the name gives way first. A venue before a colon (`BINANCE:BTCUSDT`) is dimmed and shows in the room its ticker leaves, a small gap keeping its ellipsis off the ticker, and the exchange column takes 55 px at most, a longer exchange cut in its own row rather than widening the column for all. A perpetual takes crypto's colour, apart from an exchange's futures, and the five colours are far enough apart to tell at a badge's size, from each other and from the accent and the up and down colours. The usual Vietnamese, Japanese, Chinese and Korean words for the kinds take the same colours as the English ones (`Cổ phiếu`, `株式`, `股票`, `주식` are all a stock's); a warrant takes the futures' colour, a fund or an ETF the index's, and a bond the forex's.

  The list shows the best 200 rows, with a line under them saying how many more typing would narrow (the new `symbolSearch.more` message): every row shares its columns with the rest, so a list of a few thousand symbols took a tenth of a second or more on each keystroke. A logo that fails to load is not asked for again on the next keystroke. The exchange list keeps the keyboard as its arrows change it, where the search took it after the first. A kind or an exchange in Turkish capitals ("HİSSE") is one with its lower case ("Hisse"), and a kind named like a built-in of every object (`constructor`) gets a colour like any other. Right to left, a feed's kinds and exchanges read in their own direction on the tabs and in the exchange list ("Stock." no longer shows as ".Stock"). In the compare dialog, a kind or an exchange that only the chart's own symbol is of, which it never lists, gets no tab.

  Passing objects in `symbols` from plain JavaScript no longer breaks the widget (the chart's symbol became an object, the watchlist came out empty, and typing a letter threw), nor does a name, kind or exchange that isn't text, in `symbols` or in a feed's results, nor a `"__proto__"` key in them, which is dropped. `symbols` entries are cleaned as a watchlist cleans them: trimmed, a repeat listed once, anything that isn't a ticker or a `SymbolInfo` with one dropped. `setSymbols` also replaces a watchlist made from `symbols` (no `lists`, nothing kept), as before; give the watchlist `lists` of its own when the symbols come from your server.

### Patch Changes

- 9193d11: Fixes from a check of every dialog, menu and panel of the widget in a browser. A new name on the layouts button (a layout saved, renamed or opened) refits the toolbar: a longer name pushed "more" past the widget's edge, and pressing it slid the whole widget aside until the window was resized. The toolbar also fits to the pixel, its end padding clear: "more" ran a pixel past the edge (the Studio look, 1365 px wide) and sat on the edge, in the padding the bar keeps everywhere else. When everything that folds is folded and there is still no room, the symbol gives way: a long one (`HYPERLIQUID:xyz:GOLD`) on a 390 px phone pushed "more" partly off the screen, where a tap on it missed. Its venue is cut short first, to a letter and an ellipsis, before anything else shrinks; then the venue goes and the ticker stays whole; only then is the ticker cut. With room, the symbol shows as before. The widget's box also clips what is past its edges (`overflow: clip`, `hidden` where a browser lacks it), so the keyboard landing past an edge never scrolls it. The watchlist scrolls in the dock, by wheel, touch and keyboard, where 34 symbols in a 768 px window stopped at the panel's foot, and a row the arrow keys reach comes in below the panel's header and the rule under it, where it stopped a pixel or so under them. Every group of the shortcut sheet scrolls into view: the groups past its height were laid in columns to the side, out of reach, on a phone too. A menu taller than the window (the clock's time zones, 600 px high) fits inside it with its padding and border, where it ran past the bottom by them. A menu that opens under a still pointer no longer opens the submenu it lands on: on a phone a right-click on the time axis opened its menu as a sheet under the pointer, on Timezone, and the time zones opened over it too, two menus at once. A submenu opens when the pointer moves onto its entry and rests there.

  Right to left, the "more" menu, the Trade and Layouts menus and your menus from `addToolbarDropdown` line up under their buttons as the toolbar's own menus do: "more" opened beside its button, toward the toolbar's middle, and the others hung off their buttons' left edge. Left to right, the Trade and Layouts menus, with no room after their start (picked from "more", say), end where their button ends rather than to its left. The right-click and "more" menus are frosted like the other menus when `ui.blur` is above 0 (the Capsule look). The timeframe menu no longer scrolls 3 px either way, the drawing tools no longer scroll by 2 px in a 768 px window in the Print look, and where a narrow chart cuts an indicator's values, those before the cut stay whole and the one it falls in ends in an ellipsis; with no room for even a digit and an ellipsis (Bollinger's on a 320 px phone, beside the row's buttons), the values hide and the name reads alone, where they showed a sliver, and they come back with the room.

  `lerpColor` mixes `rgb()` and `rgba()` colours as well as hex, and an alpha as `color-mix` does, so a fade toward a see-through colour keeps the other's hue; a colour it can't read comes back as the end it is nearer, never `rgb(NaN,…)`. `PerformanceDashboard`'s monthly returns fade to its panel's see-through surface at zero, so the months between -5% and +5% took the colour of a month before them (green, the falls too, in a rising year): the falls are red now, fainter toward zero. A `HeatmapChart` labels each cell in white or in dark ink, whichever reads better on it as drawn, so every label reads at 4.5:1 where either ink can: white stayed on cells down to 3:1 (a light theme's month at -3.4% read at 3.1:1, and one near zero barely at all). The dark theme's brightest reds and greens take the dark ink too.

## 1.50.0

### Minor Changes

- 0c72b8d: An airy look, ahead of 2.0 opening with it. The chart's `barLayout: 'golden'` (or `chart.setBarLayout`) makes a candle's body the slot × φ⁻¹ at every zoom, the rest a gap, and opens the chart at φ⁴ ≈ 6.85 px a slot: more bars on screen, with air between them. `'classic'`, a 2 px gap and 10 px a slot to open, stays the default. Over bars on screen a new layout keeps the zoom. The chart's own text (axes, legend, tags) takes a font over any theme with `font` or `chart.setFont({ family, sizeSmall, … })`, kept through theme changes (`null` goes back to the theme's); `SANS_FONT_FAMILY` is a sans face every system has. In the widget, `ui: { density: 'airy' }` turns it all on: spacious controls, the figures in the look's sans face, golden bars. `chartOptions.barLayout` and `chartOptions.font` win over it.

## 1.49.1

### Patch Changes

- 9764d44: A trade fed with `updateLastBarFromTick` keeps the forming bar at its own time. The bar's time moved to the trade's, so `getData()` showed it off its interval, a stream's next update for that bar was taken as an older bar and left out, and with the extended hours hidden the trade was lost when they were shown again. `mergeBar` keeps the bar's time the same way. A stream's bars that arrive during a replay are placed by their time, as they are outside one: a new forming bar no longer replaces the last bar, and a bar's close no longer adds it a second time, so `replayStop()` brings back the series as the feed sent it. With the extended hours hidden, a stream in milliseconds on a series in seconds no longer leaves its bars in milliseconds among the hidden ones, which mixed the two units once the hours were shown. `getIndicatorOutput` and `replayStart` say what they return and take (`series[i]` and its keys; `startIndex`, `interval`, `speed`).

## 1.49.0

### Minor Changes

- b890f07: The types say what agents read the compiled code for. `BuiltInIndicators` lists the 134 built-in indicators by id, with each one's inputs (their defaults and ranges in their notes) and the keys of the lines it draws. `addIndicator('rsi', { period: 14 })` offers the ids and inputs as you type, and a misspelt input fails the type check (`{ stddev: 2 }` for the bands' `stdDev`): in TypeScript, an object literal with an input the built-in doesn't have no longer compiles; it was ignored. Values stay as loose as they were (text for a number, any text for a kind), but `true` or `false` for a number fails. Any id still takes any inputs, for indicators a plugin registers (`IndicatorId`, `IndicatorParamsFor<Id>`); a function generic over the id should type its inputs `IndicatorParamsFor<Id>`. The components' `indicators` prop takes the same ids. Notes on fields that the published types left out are in them: a replay's `interval` and `speed` (one bar every `interval / speed` ms), the stream's reconnecting (`StreamConfig.reconnect`) and the `DataAdapterConfig` fields it doesn't pass, a market's lot, price step, limits and session times, the trading adapter's events. `applyOverrides`, the `overrides` option and `CHART_STYLE_KEYS` say that `series.candlestick.upColor` / `downColor` colour the wicks too and that `wickUpColor` / `wickDownColor` part them. The widget's `features` and `depthLadder` say a switch never adds a part: `features: { depthLadder: true }` alone makes no ladder.

## 1.48.0

## 1.47.0

### Minor Changes

- 5f9b252: The chart's methods and types spell the time zone `timeZone`, as the `timeZone` option and `Intl.DateTimeFormat` do: `chart.setTimeZone`, `getTimeZone`, `getEffectiveTimeZone`, `getExchangeTimeZone`, `EXCHANGE_TIME_ZONE`, and `SymbolInfo.timeZone` for the zone a symbol keeps its hours in. The older names still work and are marked deprecated: `setTimezone`, `getTimezone`, `getEffectiveTimezone`, `getExchangeTimezone`, `setTimezoneOffset` (an offset is `setTimeZone(minutes)`), `EXCHANGE_TIMEZONE` and `SymbolInfo.timezone`. A symbol's zone, given either way, reads back both ways from `getSymbolInfo()`, and `timeZone` comes first when both are given (`{ ...chart.getSymbolInfo(), timezone }` still changes it). `marketStatus`, a feed's update and the new `symbolTimeZone(info)` read either; `BinanceAdapter`'s symbols carry both.

## 1.46.0

## 1.45.0

## 1.44.0

## 1.43.0

## 1.42.0

### Minor Changes

- b1b49f5: Orders and positions on the chart in the Print look. Each line has a tag at its right end, by the price axis, where it no longer covers the legend: an order's quantity and kind ("0.25 Sell limit") and ×; a position's open quantity, side and open profit, then ⇅ and ×; a stop's or a target's "SL"/"TP" and what it would make or lose there, and ×. Tags that would cover each other stand side by side. A press on an order's, a stop's or a target's tag drags that line, whatever line is nearer, and a stop or a target being dragged shows where it is going (its line, what it would make, its price on the axis). Stops and targets have their prices on the axis too, and the axis's trading badges move apart when they would overlap. An order to open with a stop and a target shows them as dotted lines. A bracket being placed has the same tags (its reward to risk on the entry, the distance in percent on the stop and target) and no knobs; its bar sits at the foot of the chart (at the top while the replay bar shows), centred (it started at the middle and ran off a phone's screen), in the widget's direction. `positionLabel` now fills the tag after the quantity. A press between two buttons in a column takes the one it is on. New icon: `arrowUpDown`.

  ChartWidget no longer opens the watchlist by itself on a wide widget: every panel starts shut, on the rail, until it is opened (`widget.openPanel('watchlist')`).

  `MockAdapter`'s history ends on the timeframe's grid, so its ticks build the newest bar from the start (for up to a bar's length they were dropped, and the price line moved while the bars stood still), and the forming bar keeps its open and grows its range.

## 1.41.0

## 1.40.0

### Minor Changes

- ce7bc71: The panels beside the chart. The watchlist, alerts, the object tree, the data window and the symbol info are panels of one dock beside the chart, opened one at a time from a rail at its outer edge (on the left right to left), each with one header and a close button; the watchlist opens to start with. The panel is 296 px wide to start, 233 to 377 and never more than 38.2% of its row, resized from its edge by pointer or keyboard and kept in this browser; the watchlist opens by itself on a widget 987 px wide or more. On a phone, or a widget narrower than 641 px, there is no rail and a panel rises from the bottom, shut to start. New `widget.openPanel(panel)`, `closePanel()`, `getOpenPanel()` and the `WidgetPanel` type; new switches `dock` and `dock.watchlist`, `dock.alerts`, `dock.objectTree`, `dock.dataWindow`, `dock.symbolInfo`. The charts of a `ChartWidgetGrid` have no rail unless asked. The icon set has `list` and `table`.

## 1.39.0

## 1.38.0

### Minor Changes

- 126328a: A drawing's settings, rebuilt. The dialog is 480 wide with its tabs along the top: Style (the line in one row, its ends, the fill, the tool's switches as ticked rows, its levels in two columns), Text for the tools that write, Coordinates (a row per point: price, date, time) and Visibility (the intervals it shows on). Template, Cancel and OK sit at its foot: the Template menu applies and deletes the saved templates, saves the drawing's look under a name it asks for, keeps the options as the tool's default and resets them. The Properties tab, the template list under the style and the Add alert link are gone. Drawings can be kept to some intervals: `DrawingState.intervals` (the rules of `IndicatorIntervals`), kept in saved layouts, set with `chart.updateDrawing(id, { intervals })` or `chart.addDrawing({ …, intervals })`; `chart.isDrawingShown(id)` says whether one is on the chart now (`DrawingManager.setTimeframe()` and `isShown()` in core). Trend lines, rays and extended lines take a middle point and stats (price change, bars, time, angle) while selected or always, by the line's right end, middle or left end (`showMiddlePoint`, `showPriceRange`, `showBarsRange`, `showDateRange`, `showAngle`, `alwaysShowStats`, `statsPosition`); a trend line's ends can be arrows (`leftEnd`, `rightEnd`). All off by default.

## 1.37.0

## 1.36.0

## 1.35.0

## 1.34.0

### Minor Changes

- 9a3f221: A calmer chart. The candles keep clear of the volume band (φ^-4.5 of the plot, with a gap of φ^-7), and the scale leaves φ^-5 above and below the prices. Tick labels show only the decimals their step needs (73,500). Order, position and alert prices are written as the axis writes them, grouped in the number locale, with an order's quantity on its line rather than its axis tag. Indicator value tags are off by default. The bar countdown hangs under the last-price tag. The crosshair's pills clear the axis labels they would half cover. The legend opens with a title line (symbol · interval · exchange) that carries the prices and wraps on a narrow plot. The zoom and scroll buttons show only near the plot's bottom. New in commons: `fitPriceRange` and `priceTagText`.

## 1.33.0

### Minor Changes

- 08724a2: A new default look, Print: paper and ink, kept to the golden ratio. The chart's dark and light themes are warm ink on an off-black and on an off-white paper, with deeper candles, the line chart in ink, volume in one neutral ink and every figure in a monospaced face; the crosshair and the last-price line are solid hairlines. The widget's new `print` preset is the default (`ui: 'studio'` brings back the old one): hairlines, small corners, capital labels, a chosen button in solid ink and an ink-blue accent. Its sizes climb in half steps of φ (16, 20, 26, 33, 42), spacing and corners are Fibonacci numbers, a menu row's corner nests inside its menu's, and type climbs a third of φ at a time (10, 11, 13, 15, 18, 21) in every look. `PHI`, `FIBONACCI` and `phiStep` come from `@tradecanvas/commons`.

## 1.32.0

## 1.31.0

## 1.30.0

## 1.29.0

### Minor Changes

- 951d365: Everything by finger: with a drawing tool, tap its points or press, drag and lift to draw a line; drawings are selected, moved and reshaped by touch, and a long press opens a drawing's menu. A tap is a click, a double tap a double-click (axis reset, drawing settings). Alert, order and bracket lines and pane dividers drag by finger, and a finger reaches further than a mouse (`TOUCH_REACH`). `pageScroll` (option and `setPageScroll`) leaves vertical swipes and the plain wheel to the page; the chart pans sideways and zooms with two fingers or Ctrl + wheel. A chart that neither pans nor zooms leaves the page's scrolling alone; `touchcancel` ends a gesture without a click.

## 1.28.0

### Minor Changes

- 29acbdb: Lighter on phones: the chart draws at a pixel ratio of 2 at most (`maxPixelRatio`, `setMaxPixelRatio`) and follows a ratio change with the size unchanged; it stops drawing, and refitting on live ticks, off screen and on a hidden page (`pauseWhenHidden`, `suspend()` / `resume()` / `isSuspended()`), and draws before a screenshot; a live feed recalculates indicators once before the next read instead of on every tick (`IndicatorEngine.deferRecalculateFrom`); a stream silent too long reconnects when the page or the network comes back (`StreamManager.wake`), and a dropped connection schedules one retry, not two; destroyed charts give their canvas memory back at once; momentum keeps time on 120 Hz screens and stops for reduced motion. The widget skips its timers on a hidden page, keeps sheets above the on-screen keyboard, uses 16 px inputs on touch screens and dynamic viewport units. React no longer adds a crosshair listener on every render. Vue and Svelte feed a bar pushed onto the same array, or a change to its last bar, as a live tick instead of reloading the series (the view stays put); Vue no longer walks every bar, Svelte sees bars pushed onto `$state` data, and both pass plain bars.

## 1.27.0

### Minor Changes

- 49d0da6: No more emoji or symbol characters as icons: the alert line's bell, the alert notice, the pinned tooltip, trade zones' direction, the drawing favourites' star, the palette's search, checks, keys and close buttons, and the replay controls all come from the TradeCanvas icon set, which moves to commons (`UI_ICONS`, `iconSvg`) so the chart's canvas draws it too (`drawIcon` in core). New icons: pin, search, enter, step back, step forward. `widget.toast(message, kind, icon)` takes an icon's name.
- e429018: Long ranges show all of their span: in the widget a range on the range bar that the bars can't fit switches to the timeframe that can (5Y of days to weeks, All to months, 2 px a bar or more) and a short one goes back to the timeframe the user picked; `features['statusBar.rangeTimeframe']` turns it off. On a bare chart, `minBarUnit` (an option, or `setMinBarUnit`) lets bar slots go from 0.25 px down to 0.02 px so `fitContent` and the 'All' range fit a long series.

## 1.26.0

### Minor Changes

- 05c304f: The time axis labels the bars that start the largest calendar steps (a year in bold, a month, a day, a round hour) at least 80 px apart, as `2024`, `Mar`, `15`, `13:00`; the labels stay on their bars through pans and history loads, month names follow the number locale, and the grid's lines follow the labels. The price scale fits its labels to its height (30 px apart at least), labels a log scale from top to bottom, ticks percent and indexed scales in round percents and index points, and keeps a log scale above zero when it pads the range (`padPriceRange`). `TimeFormatContext.kind` adds `'year'` and `'month'`. Session break lines and labels thin out instead of piling up when zoomed far out.

## 1.25.0

### Minor Changes

- f7357c1: Dates stay right when scrolling back through history: a series' time unit (milliseconds or seconds) is decided once from its newest bar (`barTimeUnit`), so millisecond bars before September 2001 are no longer read as seconds and dated around the year 32,000 (time axis, crosshair, tooltips, measure, session breaks, export, CSV import); a bar or tick in the other unit is stored in the series' unit. The time axis leaves the space before the oldest bar unlabelled and shows the date wherever the date changes; times before the oldest bar follow the spacing of the first bars, weekends included. `setVisibleRange` and `fitContent` work on Renko, Kagi, Point & Figure and Line Break bricks, the crosshair reads the brick under it (`crosshairMove` gives the brick and its index in the series drawn on those types), and the legend's change on hover is from the bar before the hovered one.

## 1.24.0

## 1.23.0

### Minor Changes

- f020b7a: Candlestick pattern recognition: `detectCandlePatterns` finds 64 patterns of one to five bars (reversals only after the trend they reverse), `CANDLE_PATTERNS` lists them, and the `candlepatterns` indicator marks them on the chart with arrows and short names.

## 1.22.0

### Minor Changes

- e0886bf: 22 indicators, 133 in all: Psychological Line and New Psychological Line, Volume Ratio, AB Ratio, Sonar, Sigma, Binary Wave, Smoothed ROC, Vertical Horizontal Filter, R-Squared, Random Walk Index, True Range, Intraday Intensity, Volume vs Average, Volume Change, Trade Value, Negative and Positive Volume Index, Time Series Forecast, Weighted Close, the DeMark projected range and a moving-average Rainbow. A `CounterClockChart` plots average price against average volume and names the cycle's phase (`getPhase`, `counterClockPhase`, `counterClockPoints`).

## 1.21.0

### Minor Changes

- 9e03ead: Four charts for dashboards beside the candle chart: `BarChart` (grouped or stacked, upright or sideways, up and down from zero, coloured by sign), `DonutChart` (or a pie, with a centre caption), `ScatterChart` (bubbles sized by area) and `HistogramChart` (bins by count, width or Sturges' rule, with marker lines). Each follows the pointer with a tooltip, answers clicks with what was under them, describes itself to screen readers (`ariaLabel` in your words), and draws in the dark or light theme. `histogramBins` and `niceScale` are exported. The finance charts' canvases now have an image role and `setLabel`.

  Three more: `CalendarChart` (a value a day in week columns, a calendar year to a band, Monday to Friday with `weekdays: 5`), `MatrixChart` (a coloured value per row and column, half a square matrix with `triangle`, and `correlationMatrix` for Pearson correlations of returns), and `HeatmapChart`'s `grouped` option (a market map by sector, each group under its name and weighted change). `ColorScale` colours can be left out to keep the chart's own.

## 1.20.0

### Minor Changes

- db15f5e: Exchange rules for Vietnamese markets, checked against the exchanges' rules of May 2025.

  - `MarketConfig.priceSteps`: price steps by price band (HOSE: 10, 50 or 100 dong), with `priceStepAt`, `roundToPriceStep` and `scaleMarketPrices` (presets are in thousands of dong; `scaleMarketPrices(preset, 1000)` reads dong).
  - `computePriceLimits` rounds the ceiling down and the floor up to a valid price, and moves them a step off the reference when they would land on it.
  - Presets: HOSE with its price bands and lots of 100, `MARKET_HOSE_ETF` (10-dong steps), HNX with its post-close session, UPCoM with its own sessions, and `MARKET_VN30F` for VN30 index futures (0.1 a point, ±7%, from 8:45), each with `timeZone: 'Asia/Ho_Chi_Minh'`.
  - `vn30fLastTradingDay` and `vn30fContracts`: the third-Thursday expiry, holidays included, and the four listed contracts.
  - `getCurrentSession(sessions, now, timeZone)` reads the exchange's clock (the time of day only).
  - `chart.getPriceLimits()`; `chart.roundPrice` and `chart.getPriceStep(price?)` follow the market's band; `setPriceLimits` no longer changes the preset it was given.
  - The widget's order ticket keeps prices on the market's step and the order's price within the day's ceiling and floor, starts at one lot, and takes whole lots above one.
  - Looks different: `VN_COLORS` are the price board's (green up, red down) instead of red up and blue down.

## 1.19.1

## 1.19.0

## 1.18.1

## 1.18.0

## 1.17.0

### Minor Changes

- 5fc5782: The price scale writes its labels in the symbol's or market's price precision, as the legend and price tags already did, with its ticks on whole price steps (`minTick`). An adapter can send a `symbolInfo` event when it learns the symbol's details after the chart asked `resolveSymbol`; the chart applies them. `PollingAdapter`'s `emitEvent` is protected, for subclasses.

## 1.16.1

## 1.16.0

## 1.15.0

### Minor Changes

- ccc6b17: More of the look by key: `trading.buyColor`, `.sellColor`, `.profitColor`, `.lossColor`, `.entryColor` (orders and positions), `markers.longColor`, `.shortColor`, `.neutralColor` (signal markers), `tradeZones.profitColor`, `.lossColor`, `.activeColor` and `drawings.handleColor`: 101 keys in all. The widget's Settings change the grid each way, the crosshair, the scales, the last price's line, the panes' separator and the legend's text, on the user's layer. `widget.addHotkey({ keys, label, onPress })` adds a shortcut of your own (by the letter the keyboard layout types, not while typing or composing text), replacing a widget shortcut on the same keys and listed in the shortcut sheet, which now leaves out the keys that do nothing. The widget's CSS hooks (`--tcw-*`, `data-tcw-part`, `data-tcw-off`, `data-host-button`, `data-host-item`) are stable through 1.x.

## 1.14.0

### Minor Changes

- becff24: Replay for apps. During `chart.replayStart()` signal markers and trade zones show as the replay reaches them (a trade drawn open until its exit; `revealMarks: false` shows them all). `startTime` starts at a time, `hideHistory` leaves the bars before the start out until `replayStop()`, and `duration` plays to the end in about that long however many bars: a replay quicker than a bar a frame runs on animation frames, several bars a frame, and a late frame slows it rather than skip ahead. New `replayComplete` event; `replayStep` gives the `total`. The widget's replay reveals them too (`replayRevealMarks: false` shows them all). The React, Vue and Svelte components take `indicators` as `{ id, params, position }` too (`syncIndicators` is exported), open no stream with `data` at mount or `stream={false}`, and follow `features` after mount.

## 1.13.0

### Minor Changes

- 23c001e: Style overrides: any part of the chart's look by key, apart from the theme. `chart.applyOverrides({ 'grid.vertical.visible': false, 'series.candlestick.upColor': '#26a69a' })` styles the grid's lines each way, the crosshair, the axes, the panes, the legend, the last price, the volume, the session breaks and the main series as each of the 18 chart types draws it — 89 keys, listed in `CHART_STYLE_KEYS` and checked by TypeScript. Also `setOverrides`, `resetOverrides`, `getOverrides`, `getStyle`, `getStyleValue`, the `overrides` option and the `styleChange` event. Overrides come in two layers: the host's (kept through theme switches, never saved) and the user's (kept with the theme they were made on, saved with `saveState`, snapshot version 3). The widget's Settings write the user's layer. `ChartWidgetGrid.applyOverrides` styles every chart; the React, Vue and Svelte components take an `overrides` prop. Indicators: each plot's dash and visibility (`updateIndicatorStyle(id, { plots })`; a hidden plot stretches no scale), `setIndicatorDefaults(id, style)`, and a pane's own background and separator (`setPaneStyle`), saved with its indicator. The grid and crosshair options (`grid.hLineColor`, `crosshair.vLine.style`…) now work: they are shorthand for their keys. `getTheme()` returns the theme as set. Fixes: the widget's theme toggle brings back the host's own theme instead of a built-in one; the Settings' Reset puts back the current theme's colours instead of the dark theme's; a baseline chart's fills work with `rgb()` colours; a save naming a theme of its own no longer breaks the theme when loaded.

## 1.12.0

### Minor Changes

- f914d01: WebGL renderer: a chart whose WebGL context is lost draws with it again once the browser hands it back (`rendererChange` with `reason: 'contextRestored'`). At most 8 charts on a page draw with WebGL at once, as Chrome and Safari drop the oldest context past about 16; a chart past the limit draws with Canvas 2D (`reason: 'limit'`) and takes WebGL as soon as another lets go, and `setMaxWebGLCharts(n)` sets the limit. Checked in Chrome, Firefox and WebKit; Firefox no longer warns about the deprecated `WEBGL_debug_renderer_info`. Baseline, Kagi and point & figure charts draw on the GPU too: baseline and Kagi lines are drawn whole, round where they bend, instead of in pieces with notches at each bend, and an X's two strokes are drawn apart. Point & figure columns are drawn in boxes of the size they were built with (they were drawn in boxes of 1, a smear of specks at prices far from 1).

## 1.11.0

## 1.10.0

## 1.9.0

### Minor Changes

- bdab23b: WebGL renderer (preview): `renderer: 'webgl'` (or `'auto'`, WebGL on a hardware GPU only) draws the grid, session shading and break lines, candles and volume with WebGL 2, on a canvas under the 2D scene. `chart.setRenderer(mode)` switches at runtime, `chart.getRenderer()` says what draws, and the `rendererChange` event reports each change and why (`'unsupported'`, `'contextLost'`). Canvas 2D stays the default and takes over wherever WebGL 2 is missing or its context is lost (a failure to load or compile is logged as a warning). The WebGL code loads on first use, as a chunk of its own, and a chart hands its GPU context back when destroyed. Session break labels now draw over the bars instead of under them, inside the plot; `SessionBreaks.renderLines()` draws the lines alone.

## 1.8.0

### Minor Changes

- 6fceef2: Sharper, calmer charts.

  - **Sharp at any screen scale**: candles, bars, volume and the drawings' horizontal and vertical lines land on whole device pixels. A one-pixel wick is one sharp pixel at 100%, 125% or 200% scaling; it used to spread over two at half strength.
  - **Volume as a backdrop**: the bars keep to the bottom 15% of the chart (20% before) in the theme's own `volumeUp` / `volumeDown`, which were ignored. A theme that only changes the candle colours (or the widget's settings) gets volume in those colours. `volumeColor(candleColor)` gives the matching shade.
  - **A calmer dark palette**: softer up and down colours and quieter axis labels.
  - **Drawings**:
    - Fibonacci levels each come in their own colour with soft bands between them, and their labels sit above the lines. The drawing's colour goes to its trend line; each level's is set in its levels.
    - Drawing text uses the theme's font, on a halo of the background so it reads over bars.
    - Lines turn corners round.
    - Long/Short labels are tags just outside their zones that never overlap.
  - **Price axis**: indicator value tags step around the last-price, high/low and order tags, and scale labels under any tag are hidden instead of showing half-covered.
  - **Dates**: on an intraday chart a bar at midnight is labelled with its day on the time axis and the crosshair, not with its year as if it were a daily bar. `barsAreDaily(bars)` tells which a series is.
  - **Lines on the pixel**: the crosshair, vertical lines and wicks share one device-pixel column, so a line drawn on a bar runs through its wick.
  - **Widget**: the drawing tools sit in sections with a divider between them: lines; Fibonacci, Gann and cycles; patterns and Elliott waves; forecasting and measuring; shapes, brushes and notes. The tools below are grouped too: modes, undo and redo, clear all.

  Looks different after the update: the dark theme's colours, the volume's height, new Fibonacci drawings' colours and the order of the drawing tool groups change without any change of yours. Set `candleUp` / `candleDown` on the theme to keep the old candle colours.

## 1.7.0

### Minor Changes

- da9cb37: **Alerts, replay in finer steps, markers and pane scales.**

  - **Alerts** take `AlertOptions` (`addAlert(…, options)`): `target` compares
    with another channel (the price crossing a moving average, one indicator
    line crossing another); `movesUp` / `movesDown` with `percent` and `bars`;
    `onBarClose` looks only at closed bars; `expiresAt` ends it (`expired`, the
    `alertExpired` event). Saved layouts and stored alerts keep them. The
    widget's alerts panel offers all of it. Alerts now also check on a
    connected feed's prices, take the lines they watch at the same moment
    (`AlertManager.checkChannels`), and keep watching the live market during
    a replay (alerts on indicator lines wait for it to end). Alert events say
    what an alert watches (`channel`, `label`, `target`, `drawingId`,
    `percent`, `bars`).
  - **Replay in finer steps**: `replayStart({ steps })` grows the forming bar
    from finer bars; `replaySeekToBar`, `getReplayBarIndex`. ChartWidget's
    replay bar has a Step menu (finer intervals from the feed or the bars
    loaded).
  - **Paper trading in a replay**: `ExecutionAdapter.setMarkPrice?(price,
time)`; the chart feeds it the replayed prices (each step's low, high
    and close, every step a jump passes) and times, and
    `PaperExecutionAdapter` stamps fills with them. It only goes forward
    (after a seek back it waits until the replay is past where it was), and
    goes back to the live price when the replay ends; a mark with no time
    stamps fills now.
  - **Signal markers** react to the pointer: `signalMarkerHover`,
    `signalMarkerClick`, `SignalMarkerManager.markerAt`; ChartWidget shows a
    note by the marker.
  - **Pane scales**: `setPaneScale(id, { log, invert })`, `getPaneScale` (log
    works for volume-like panes too: `paneLogRange`, `getPaneValueRange(…, log)`); kept
    in saved layouts; `chartContextMenu` says which pane (`pane`); ChartWidget's
    pane menu has the switches.

- c063f30: **Drawing toolkit.**

  - **Each tool has its own settings.**
    - A tool's descriptor can list settings (`DrawingDescriptor.options`):
      switches, numbers, choices, text and level lists. A drawing keeps its
      values in `DrawingState.options`; saved layouts and pasted drawings keep
      them, cleaned by `sanitizeDrawingOptions` (at most 48 levels, numbers kept
      within their range).
    - Fibonacci retracement and extension: edit, hide or add levels, show
      prices and percentages, labels left or right, reverse, extend left or
      right, background. Fib channel, speed-resistance fan and time zones edit
      their levels too.
    - Trend lines and parallel channels extend left, right or both; a channel
      can hide its middle line.
    - New `chart.getDrawingOptions(id)`, `setDrawingOptions(id, options)`,
      `getDrawingOptionDefs(type)` and `getDrawingToolDescriptor(type)`;
      `addDrawing` takes `options`.
    - Each tool's starting settings: `setDrawingToolDefaults(type, options)` /
      `getDrawingToolDefaults(type)`.
    - `updateDrawing(id, { style, options, anchors })` changes a drawing in one
      undo step. `beginDrawingEdit(id)` / `endDrawingEdit(id, { cancel })`
      gather a dialog's changes into one undo step, or put the drawing back.
    - New events: `drawingUpdate`, `drawingDoubleClick`, `drawingContextMenu`.
  - **Long/Short position works out the size.** It takes an account size and
    the risk, as a percent of the account or an amount, and shows the
    quantity, the reward:risk ratio and each line's price, distance and P&L.
    The target handle sits on the target line and sets the ratio.
    A plugin can move handles that are not anchors (`DrawingPlugin.moveHandle`).
  - **Alerts on drawings.** `chart.addDrawingAlert(id, { condition, message,
repeating, label })` fires when the price crosses a trend line, ray,
    extended or horizontal line, or a channel's lines, wherever the line is by
    then, as drawn: straight across bars and, on a log scale, in log price.
    `canAddDrawingAlert(id)` tells which drawings take one now
    (`DrawingPlugin.priceAt(state, time, viewport?)`); a trend line that ends
    before the last bar takes none. The alert goes with its drawing, comes
    back with it on undo, and is kept in saved layouts; alerts left without
    their drawing are dropped.
  - **Checked input.** Layouts and templates have every style field checked
    (new `sanitizeDrawingStyle`), group names are capped, and level values and
    money amounts are kept within range.
  - **Order and groups.**
    - `moveDrawing(id, 'front' | 'forward' | 'backward' | 'back')`; undo puts a
      deleted drawing back where it was. Ctrl+] / Ctrl+[ move the selected
      drawing a step, with Shift to the top or bottom.
    - `groupDrawings(ids, name?)`, `ungroupDrawings`, `renameDrawingGroup`,
      `setDrawingGroupVisible`, `setDrawingGroupLocked`, `getDrawingGroups`.
      Clicking one drawing of a group selects the group. Ctrl+G groups the
      selection, Ctrl+Shift+G ungroups it.
    - `removeDrawings(ids)`, `setDrawingsVisible(ids, visible)` and
      `setDrawingsLocked(ids, locked)` change several drawings as one undo
      step; `getSelectedDrawingIds()` lists the selection.
    - Hiding and locking are undoable now, and a hidden drawing leaves the
      selection. New drawings and groups never reuse an id from a loaded
      layout.
  - **Undo, redo and events.** Undo and redo report drawings that come and go
    (`drawingCreate`, `drawingRemove`) and change (`drawingUpdate`), so
    listeners and alerts follow them. `drawingCreate` always carries `id` and
    `type`. Ctrl+Shift+Z redoes, as the hotkey sheet says; it used to undo.
    Drawing shortcuts no longer fire while a dialog or menu has focus.
  - **29 new drawing tools** (69 in all):
    - Notes and marks: Note (a pin with its text), Callout, Flag Mark, Arrow
      Mark (up, down, left, right, with a label) and Icon (star, heart, tick,
      cross, circle, triangles, bolt).
    - Brush and Highlighter, drawn freehand; Path (with an arrow at the end)
      and Polyline, a point per click until a double-click or Enter; Curve and
      Arc through three points.
    - Fib Circles, Fib Spiral, Fib Speed Resistance Arcs, Fib Wedge, Pitchfan
      and Gann Square, each with editable levels.
    - Elliott Impulse, Correction, Triangle, Double Combo and Triple Combo
      waves, with the wave degree's label style (①, (1), 1, i); the Elliott
      Wave tool takes the degree too.
    - Three Drives and Cypher patterns with their ratios; Time Cycles and Sine
      Line.
    - Forecast (green once the price reaches the target, red when its time
      runs out first), Projection (a move carried over from a third point) and
      Bars Pattern (a copy of some bars, as bars, a line or high-low, mirrored
      or flipped).
    - A tool says how it is drawn (`DrawingDescriptor.creation`: 'clicks',
      'freehand' or 'path', with `maxAnchors`); a tool drawn from the bars gets
      them through `DrawingPlugin.setDataGetter`. This also fixes Anchored
      VWAP and Fixed Range Volume Profile, which were never handed the bars
      and drew nothing.
  - **Eraser, zoom area and a strong magnet.** `chart.setEraserMode(true)`:
    each click on a drawing removes it, until Escape or a tool is picked.
    `chart.setZoomAreaMode(true)`: the next drag zooms to the bars in its box.
    Both report `toolModeChange`. `setDrawingMagnetMode('off' | 'weak' |
'strong')`: the strong magnet always snaps to the bar's open, high, low or
    close.
  - **ChartWidget.**
    - Double-clicking a drawing (or its settings button in the object tree)
      opens its settings: Style, the tool's own settings, and Coordinates in
      the chart's time zone. Changes show as you make them; Cancel or Escape
      takes them back. "Save as default" keeps a tool's settings for the next
      drawing; templates keep settings as well as style.
    - Right-clicking a drawing opens its menu: settings, add an alert, order,
      group or ungroup, lock, hide, duplicate and delete. It works from the
      keyboard and stays on screen.
    - The object tree lists each group with its drawings under it, and can
      hide, lock, rename or ungroup it.
    - The sidebar has the new tools in their groups (new Brushes, Cycles and
      Elliott Waves groups), an eraser and a zoom button, and a magnet button
      that goes off, weak, strong. On a short screen the sidebar scrolls and
      its menus open beside it.
    - The alerts panel lists alerts on drawings; the hotkey sheet lists the new
      shortcuts. All of it is in the widget's 14 languages.

- e2516f1: **Panes, indicator templates and undo.**

  - **Move indicators between panes**: `chart.moveIndicatorToPane(id, target)`
    into another indicator's pane, a pane of its own (`'new'`) or the price
    pane (`'price'`); `canMoveIndicatorToPane`. A pane's other indicators stay
    (one takes the pane over) or follow when they read its lines. ChartWidget:
    a ⋯ button on each legend row.
  - **Fold, maximise and reorder panes**: `setPaneCollapsed`, `setMaximizedPane`,
    `movePane`, the `paneChange` event; ChartWidget puts buttons at each pane's
    top right. Saved layouts keep each pane's size, order, fold and maximise
    (`SnapshotIndicator.paneSize`, `paneOrder`, `paneCollapsed`, `paneMaximized`).
  - **Undo for indicators**: adding, removing, editing and moving indicators are
    steps in the drawings' history; an undone indicator comes back under its own
    id; a burst of edits to one indicator is one step; a loaded layout starts a
    fresh history. `UndoableAction` has an `'indicators'` type.
  - **Indicator templates** in ChartWidget (`indicatorTemplates`, on by default),
    built on `chart.getIndicatorSetup()` / `applyIndicatorSetup()`.
  - **Type an interval**: a number typed on the chart opens a field (`5`, `15m`,
    `1h`, `1D`, Enter) — `intervalTyping`, on by default. **Alt+T / H / J / V /
    C / F** pick the trend line, horizontal line and ray, vertical line, cross
    line and Fibonacci retracement.
  - `chart.roundPrice(price)` puts a price on the market's grid (`minTick`);
    ChartWidget's menus and order ticket use it.

- 6b9a936: **Scales, formats and comparisons.**

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

- e4fa579: **Trading and workspace.**

  - **Act on orders and positions from the chart.**
    - Order and position lines carry buttons: × cancels an order or closes a
      position, ⇅ reverses a position, × on a stop-loss or take-profit removes
      it (`TradingConfig.lineButtons`).
    - New `positionReverse` intent and `ExecutionAdapter.reversePosition`;
      without it the chart closes and sends a market order the other way.
      `chart.cancelOrderIntent`, `closePositionIntent`, `reversePositionIntent`,
      `modifyPositionIntent` (a `null` stop removes it).
    - **Adapters:** `PositionModifyIntent.stopLoss` / `takeProfit` may now be
      `null`, meaning remove it; a missing field still means keep it. An
      adapter written as `intent.stopLoss ?? position.stopLoss` would keep a
      stop the user removed.
    - Orders take `stopLoss`, `takeProfit` and `timeInForce` (`'gtc'` |
      `'day'`), carried to the position they open. `PaperExecutionAdapter`
      fills stops and targets and reverses.
  - **Fills on the chart**: a mark per fill on its bar (solid opening, hollow
    closing; `TradingConfig.fillMarks`). `FillEvent` has `reason`
    (`order`, `close`, `reverse`, `stopLoss`, `takeProfit`), `pnl` and
    `positionId`; the chart emits `executionFill` and keeps the latest 1000
    (`getFills`, `addFill`, `clearFills`; `getRealisedPnl` sums them all).
  - The buttons on the lines act on release over them; a press that slides off
    does nothing.
  - **Right-click areas and a "+" by the price axis**: `chartContextMenu`
    says which part was clicked (plot, pane, price axis, time axis) with the
    price and time there; `features.priceAxisAddButton` shows a "+" level with
    the crosshair that emits `priceAxisAdd`.
  - **Events**: `ordersChange`, `positionsChange`, and `stateChange` when
    something a saved layout holds may have changed. `setChartType` and
    `setTheme` now schedule an auto-save too.
  - **ChartWidget menus**: the plot offers an alert, a buy and a sell at the
    price (a limit where it would wait, else a stop), an order ticket, a
    horizontal line, reset view and the drawings; the price axis its scale
    switches; the time axis reset view and go to date. `chartMenuItems` adds
    the host's own entries.
  - **Order ticket and account panel** (`accountPanel`, on with trading):
    positions with their P&L, working orders and fills with close, reverse and
    cancel; a ticket with side, type, quantity, price, stop-loss, take-profit
    and time in force, checked as it is filled in, with the reward:risk.
  - **Named layouts** (`layouts`, on by default): save the chart under a name,
    open, rename and delete, auto-save the one open, Ctrl/Cmd+S. Storage is
    pluggable (`LayoutStorage`: `localStorageLayouts`, `memoryLayouts`, or the
    host's server); `LayoutSession` runs it. `widget.getLayoutContent()` /
    `applyLayoutContent()` give the content alone.
  - **ChartWidgetGrid**: up to six chart widgets side by side with a bar to pick
    the arrangement, link symbol, interval, crosshair, time and drawings, and
    save the whole grid as a named layout. `adapter: () => …` gives each chart
    its own feed, `onChartAdd` sees each chart made, and charts the grid shrinks
    from come back as they were.
  - **`ChartGrid.connectAll`** takes a function that makes an adapter per chart:
    an adapter keeps one stream, so one adapter object shared by every chart
    sent each of them the last symbol's bars.
  - Layouts record their `kind` (`'chart'` or `'grid'`), so both can share one
    storage; saving, opening and auto-saving run one at a time.
  - `widget.toggleAccountPanel()`, `getSymbol()`, `getTimeframe()`.
  - **`widget.addToolbarButton()`** for the host's own toolbar buttons (icon or
    element, text, a switch).
  - With several widgets on a page, Ctrl/Cmd+K and +P go to the one used last.

- b92e2fc: **A built-in UI system for the widget.**

  - `ChartWidgetOptions.ui`, `ChartWidget.setUI` / `getUI` and
    `ChartWidgetGrid.setUI`: the widget's look as tokens — a corner scale and
    each kind of part's corners, sizes and density, type, borders and
    separators, shadows, frosted surfaces, how a chosen button shows (`tint`,
    `solid`, `underline`), a docked or floating toolbar and drawing sidebar,
    and plain or segmented interval buttons. Three presets: `studio` (the
    default), `terminal` and `capsule`; a theme of yours lays over one.
    `resolveWidgetUI`, `widgetUIVariables`, `applyWidgetUI` and
    `WIDGET_UI_PRESETS` are exported with their types.
  - The stylesheet reads the look's CSS variables everywhere (new:
    `--tcw-control-radius`, `--tcw-menu-radius`, `--tcw-dialog-radius`,
    `--tcw-toolbar-h`, `--tcw-control-h`, `--tcw-font`, `--tcw-font-size`,
    `--tcw-weight`, `--tcw-sep-w`, `--tcw-menu-shadow`, … ), with Studio's
    values as its defaults; the existing variables stay. Without `ui` they
    are left to the stylesheet, so host CSS can still set them.
  - The chart's tags take a shape: `Theme.shape.tagRadius`,
    `ChartOptions.shapes`, `chart.setShapes` / `getShapes`, and `fillTag` in
    core. Price tags, axis pills, the crosshair's pills, order, position and
    bracket tags and period-level tags are square, rounded or pills. A shape
    in `chartOptions.shapes` stays until `setUI` is called.
  - `ChartWidgetGrid.getUI`. Panels sit below the toolbar and beside the
    drawing tools as the look sizes them; on phones the look keeps 40 px tap
    targets.
  - The widget's stylesheet now goes first in `<head>`, so the page's own CSS
    wins a tie of specificity.
  - Dropdowns grow to fit their labels instead of wrapping them.

  **The default look changes.** Studio is the new default, so an existing
  widget looks different without any change of yours: corners 5/7/11/16 px
  (were 4/6/10/14), a 46 px toolbar and 48 px drawing tools (were 44 and 40),
  30 px controls (were 32), interval buttons in a segmented track, no rules
  between toolbar groups, small labels as written (were capitals), dialog tabs
  as chips, the replay bar, toasts and badges rounded rather than pills, and
  price tags on the chart rounded 4 px. `ui: 'terminal'` is the closest to a
  square, ruled look; any token can be set with `setUI` or in CSS.

- 6d844ad: **Workspace, markets and access.**

  - **Quotes**: `Quote`, `QuoteSource`, `readQuote`; `DataAdapter.subscribeQuotes`
    (BinanceAdapter: a 24 h snapshot, then the mini-ticker stream; MockAdapter
    made-up quotes).
  - **Watchlists**: `watchlist` takes `{ lists, activeList, persist, storageKey,
quotes, onChange }`; lists to switch, create, rename and delete; symbols
    added from the symbol search, removed and reordered (drag, Alt+↑/↓).
    `getWatchlists`, `setWatchlists`, `setActiveWatchlist`, `addToWatchlist`,
    `removeFromWatchlist`, `setQuotes`, `getQuote`; `readWatchlists`.
  - **Symbol info**: a panel with price and move, the market's status, the
    day's numbers, hours and news (`symbolInfo`, `news`, `toggleSymbolInfo`);
    `marketStatus`, `SymbolSession.days`, `NewsItem`, `readNews`,
    `DataAdapter.fetchNews`. The status bar shows the market's status.
  - **Undo**: `Chart.recordUndo` for changes of your own; the widget's settings
    and chart type are undone with drawings and indicators.
  - **Events**: `chartTypeChange`, `symbolChange`, `timeframeChange`,
    `historyChange`, `drawingSelect`; `Chart.selectDrawing`, `Chart.scrollBars`.
  - **Navigation** buttons over the chart (`navigation`).
  - **Accessibility**: charts are announced with a summary, the view after a
    key moves it, and the bars one at a time (comma and period);
    `ChartOptions.a11y`.
  - **Right to left**: `dir` (auto for Arabic, Hebrew, Persian, Urdu); logical
    CSS; Arabic and Hebrew widget strings (16 languages).
  - **Tick charts**: `'100T'` timeframes from a feed's trades (`Trade`,
    `DataAdapter.fetchTrades` / `subscribeTrades`, `tickBarCount`,
    `TickBarBuilder`, `TickBarAdapter`, `withTickBars`); Binance aggregate
    trades.
  - **Stream bars land by their time**: a bar again replaces the last one, a
    later one is added, an older one is left out — so a closed bar keeps its
    final values (it used to keep the ones before its last update).
  - **Indicators**: SMI, Relative Volatility Index, Trend Strength Index,
    Linear Regression Slope, Standard Error, Standard Error Bands, GMMA, MA
    Ribbon, Average Day Range, Net Volume (95 in all).

## 1.6.0

### Minor Changes

- f7a5202: **Data and time.**

  - **Zoom out until every loaded bar fits.** Below the old 2px bar + 2px gap
    floor the slot keeps shrinking, bar and gap together, down to
    `MIN_BAR_UNIT` (0.25px), as long as the loaded bars do not fit yet. A short
    series still stops at the old floor. Below a pixel per bar, candles, OHLC
    bars, volume candles and volume draw one column per pixel
    (`forEachPixelColumn`, `renderDenseBars`). The 1Y, 5Y and All presets are no
    longer capped at about 200 bars.
  - **Older bars load as you scroll back.** - New optional `DataAdapter.fetchHistoryBefore(symbol, timeframe, before,
limit)`. Binance, Bybit and Mock implement it; `WebSocketAdapter` and
    `PollingAdapter` take it as an option. - A connected chart loads a page (`StreamConfig.historyPageSize`, default 500) when less than a screen of bars is left of the view. - It runs one request at a time and keeps the same bars on screen. - It stops at the start of the history. - After a failed request it waits 5 s before asking again, doubling each
    time; after 5 failures in a row only `loadMore()` retries. - Chart types that reshape the bars (Renko, Kagi…) only page on
    `loadMore()`. - A loader set with `setHistoryLoader` wins over the stream's. - A reconnect keeps the paged-in bars and the view when its bars reach
    back over them. After a longer outage the chart starts over instead of
    joining the two across a gap; a host's `setData` also ends the merging. - New `chart.prependBars()`, `setHistoryLoader()`, `loadMoreHistory()`,
    `hasMoreHistory()`, `isLoadingHistory()` and the `historyLoad` event. - ChartWidget shows a small pill while older bars load (`historyPageSize`
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
      daylight-saving changes. `DEFAULT_SESSION_HOURS` now uses
      `'America/New_York'`, and `SessionHoursConfig.tzOffsetMinutes` is
      optional. A `tzOffsetMinutes` given without `timeZone` replaces a zone set
      before (new `mergeSessionHours`).
    - The Alt-click pinned tooltip shows the time in the chart's zone too.
    - Zone offsets are cached per week, so a zone costs about what the browser's
      own zone does, and UTC costs nothing. A bar whose time is not a finite
      number is dropped.
    - New commons helpers: `TimeZoneSetting`, `isValidTimeZone`,
      `zoneOffsetMinutes`, `offsetAt`, `wallToUtc`, `zonedDateFormatter`.
      `timeParts` and `tzLabel` accept a zone.
    - ChartWidget's timezone setting lists 28 zones by city, each with the offset
      in force (older fixed-offset settings still apply).
    - YTD now starts on the bar at 1 January 00:00 instead of the one after it.
  - **A left price scale.**
    - `addIndicator(id, params, position, { scale: 'left' })` or
      `chart.setIndicatorScale(id, 'left')` put an overlay on a scale of its own
      on the left, fit to its values over the visible bars. A volume-like line
      over price no longer squashes the candles.
    - The scale shows by itself while an overlay is on it.
      `setLeftPriceScaleVisible(true)` (or `ChartOptions.leftPriceScale`)
      shows it anyway, mirroring the price scale.
    - New `isLeftPriceScaleShown()`, `getLeftPriceRange()` and
      `getIndicatorScale()`; `indicatorChange` reports `'scale'`.
    - The scale is kept in saved layouts. Its overlays get value tags on it.
    - Its strip never starts a drawing or a pan. While it mirrors the price
      scale, dragging it scales prices and a double-click resets them.
    - ChartWidget: a "Left price scale" switch in the settings, and a price
      scale choice in an overlay's Style tab.
  - **Symbol search and symbol info.**
    - New optional `DataAdapter.searchSymbols(query, { limit, signal })` and
      `resolveSymbol(symbol)` that return `SymbolInfo`: description, exchange,
      type, price precision and step, exchange time zone, trading sessions and
      currency.
    - Binance implements both. Its symbol list loads once, on the first search,
      and loads again after a failure. Mock (a `symbols` option) and the
      WebSocket/Polling adapters (options) implement them too.
    - A connected chart asks `resolveSymbol` about its symbol and drops a late
      answer about a symbol it left. A failed lookup is logged with
      `console.warn` and is not a feed error; no answer keeps what the host set.
    - New `chart.setSymbolInfo` / `getSymbolInfo` and the `symbolInfoChange`
      event. The symbol's precision applies unless `setMarket` set one, and its
      sessions feed the session shading. A symbol without sessions goes back to
      the host's hours, and `setSessionShadingConfig` wins until the next
      symbol brings its own.
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
  - Pinch-zoom follows the fingers (new `ZoomHandler.onPinch`): spreading them
    twice as far apart doubles the bar width. It used to move about a twentieth
    of that. The chart's surface gets `touch-action: none` while attached.
  - Dragging inside an indicator pane pans the chart. It used to zoom time as if
    the time axis had been dragged (the time strip started at the bottom of the
    price pane, not below the panes). The axis strip beside a pane takes no
    drawing or pan.

## 1.5.0

### Minor Changes

- ad695c2: **Indicators in depth.**

  - **One scale per pane.** A pane's lines, levels, axis labels and crosshair now
    share one value scale. Before, most pane indicators drew on a scale of their
    own, so the axis and crosshair could disagree with the lines (RSI's 30 line
    read as 38). The price scale no longer stretches to fit fields that are not
    drawn, such as PSAR's trend flag or Session VWAP's session key.
  - **Declared plots.** Indicator descriptors can declare what they draw
    (`plots`: field, title, colour, line/histogram/dots/step, up/down tone), their
    pane `scale`, default `levels` and how `inputs` are edited. All built-ins do,
    and a contract test checks every one. `IndicatorBase.render` draws the
    declared plots, so a custom indicator needs no rendering code.
  - **Sources.** 38 indicators that read the close take a `source`: a price
    (`close`, `open`, `high`, `low`, `hl2`, `hlc3`, `ohlc4`, `hlcc4`) or another
    indicator's line (`indicatorSource(instanceId, key)`). An indicator on a pane
    indicator (an SMA of RSI) is drawn in its pane, recomputed when it changes
    and removed with it.
  - **Shared panes**: `addIndicator(id, params, position, { pane })`;
    `getIndicatorPanes()` lists each pane's `instanceIds`.
  - **Levels** are drawn by the chart and editable per instance:
    `getIndicatorLevels`, `setIndicatorLevels`. They are kept in saved layouts,
    along with sources and shared panes.
  - **Value tags.** Each line's latest value is tagged on its axis in its colour
    (`features.indicatorValueLabels`, `setIndicatorValueLabelsVisible`).
  - **15 new indicators** (85 in all): DEMA, SMMA, ALMA, KAMA, LSMA, McGinley
    Dynamic, MA Cross, Williams Fractals, Chande Kroll Stop, Bollinger %B,
    Bollinger BandWidth, Momentum, Historical Volatility, Volume Oscillator, Ulcer
    Index.
  - **New `indicatorChange` event** (`visible`, `style`, `levels`, `params`,
    `pane`); the widget's legend and object tree follow it.
  - **`ChartOptions.chartType` is optional** and defaults to `'candlestick'`.
  - **Widget changes.**
    - The indicator settings dialog has Inputs (with sources), Style (a colour
      per line, line width) and Levels tabs.
    - The legend colours every value as its line and uses short names.
    - Pane rows no longer cover the divider's grab zone.
    - New lines take a colour that no line in their pane already has.
    - The OHLC legend and bar-countdown toggles in Settings now take effect.
  - **Fixes.** Volume Profile is drawn over the price pane; it never showed as a
    pane. AC uses the style's up and down colours.
  - **Exports.** `PRICE_SOURCES`, `sourcePrice`, `indicatorSource`,
    `parseIndicatorSource` and the plot, scale and input types are exported from
    `@tradecanvas/chart`.
  - **Faster live updates.** The new indicators and indicators read from another
    indicator's line follow live ticks incrementally.
  - **Behaviour changes to note.**
    - Value tags are on by default; turn them off with
      `features.indicatorValueLabels: false`.
    - Built-in pane indicators draw with the viewport's value scale
      (`viewport.priceRange`) and no longer fit their own. Code that calls a
      plugin's `render` directly must pass the pane's viewport with its range
      (`getPaneValueRange`).
    - `new Chart(container, options)` keeps a copy of `options`; changing that
      object afterwards does not affect the chart.
    - A source that would make an indicator read from itself is ignored.

## 1.4.0

### Minor Changes

- 0149807: **Layouts that come back whole, ranges and dates, scale options, faster drawing.**

  - **Saved layouts restore indicators and alerts.** `saveState` / `loadState`
    (and `downloadState`, `setAutoSave`) now keep every indicator's inputs, pane,
    colours and visibility, and alerts keep their channel, repeat and label —
    alerts on indicator lines follow the indicator to its new id. Indicator
    changes trigger the auto-save. Snapshots are version 2; loading a version-1
    save (or one without an indicator list) leaves the chart's current
    indicators alone. An indicator the chart cannot add — say, from a plugin not
    registered yet — is skipped with a warning and kept in the layout when it is
    saved again; one-shot alerts that already fired stay fired.
  - **Several instances of one indicator in ChartWidget**: picking EMA twice
    gives two EMAs, each with its own chip ("EMA 20", "EMA 50"); the chips
    follow indicators added or removed through the chart API too.
  - **ChartGrid links the crosshair by time**, so charts on different symbols or
    timeframes show a vertical line on the matching bar, and it clears when the
    pointer leaves. Cells added by `setLayout` are linked too. New
    `chart.setCrosshairTime(time | null)` and a `crosshairLeave` event;
    `setCrosshairPosition(null)` now clears the crosshair.
  - **Feature flags that did nothing now apply**: `drawingMagnet`,
    `barCountdown`, `compareSymbols`, `dataExport`, `logScale` and `timeframes`
    (a whitelist for `setTimeframe`; `chart.isTimeframeAllowed`).
    ChartWidget leaves out the controls of switched-off features.
  - **Timeframe favourites in ChartWidget**: the toolbar shows pinned timeframes
    (plus the current one); a menu lists them all with a star to pin or unpin,
    remembered across visits. `features.defaultTimeframeFavorites` sets the
    starting set; the menu offers 1m–1M unless `timeframes` narrows it.
  - **Ranges and dates**: `chart.setVisibleRangePreset('1D' | '5D' | '1M' | '3M'
| '6M' | 'YTD' | '1Y' | '5Y' | 'All')` and `chart.goToTime(time)`. ChartWidget
    shows the presets under the chart with a "go to date" button (Alt+G);
    `rangeBar: false` hides them.
  - **Inverted price scale**: `chart.setInvertScale(true)`, in the widget's
    settings or Alt+I. Everything on the price pane follows it — candles, lines,
    axis, grid, profiles, drawings, alerts, orders; indicator panes stay upright.
    Indicator panes no longer pick up the log scale either.
  - **Log scale fix**: candles, bars, lines, areas, the price axis and grid were
    still drawn on a linear scale with the log scale on, while drawings and
    indicators used the log one. They now share one mapping.
  - **Drawing**: stay-in-drawing mode keeps the tool after each drawing
    (`chart.setStayInDrawingMode`, a sidebar toggle in the widget; Esc ends it),
    and Ctrl/⌘+C / Ctrl/⌘+V copy and paste the selected drawings, also into
    another chart on the page (`chart.copyDrawings()` / `chart.pasteDrawings()`).
    New `drawingToolChange` event. With several charts on a page, drawing
    shortcuts (copy/paste, undo/redo, delete) act on the chart used last, and
    never while typing in a text field; undo/redo keeps a picked tool ready.
  - **Fullscreen button** in the widget toolbar (`fullscreen: false` hides it).
  - **Widget dialogs** (settings, symbol search, command palette, shortcuts) now
    carry the widget's theme — the settings panel had lost its background — and
    open inside the widget while it is fullscreen.

- debf905: **Indicators listed on the chart, not in the toolbar.**

  - ChartWidget shows each indicator on the chart: price-pane ones stacked under
    the OHLCV legend, pane ones (RSI, MACD…) at the top of their pane. A row
    reads "EMA 50 135.29": the value at the hovered bar, also over a pane (the
    latest one off the chart, and always on Renko, Kagi, point & figure, line
    break and range bars), in the colour its line is drawn in there (several
    lines share a neutral colour). On hover or focus it offers show/hide,
    settings and remove; clicking the name opens the settings. Values follow
    live ticks and replay. A stack of two or more can be collapsed; it opens
    again when an indicator joins it. The toolbar keeps only the Indicators
    button with its count, so it no longer overflows. `indicatorLegend: false`
    turns the list off.
  - Breaking for custom CSS: the toolbar chip classes `.tcw-indicator-chips`,
    `.tcw-indicator-chip` and `.tcw-chip-remove` are gone; the rows use
    `.tcw-ind-legend*`.
  - Each further instance of an indicator takes a palette colour no other
    instance of it uses, so a second EMA no longer looks like the first.
  - `crosshairMove` now also fires over indicator panes above and below the
    price pane (with the bar under the pointer); the crosshair and the OHLC
    tooltip stay on the price pane. Mouse moves and taps on HTML controls
    inside the chart no longer move the crosshair.
  - New Chart API for labels of your own: `getLegendBottom()`,
    `getIndicatorPanes()`, `getIndicatorStyle(id)`, `formatPrice(price)`,
    `isTimeAligned()`, `setPaneTitlesVisible(false)` (the pane's own name and
    hovered values), and the `paneResize` and `indicatorUpdate` events.

## 1.3.0

### Minor Changes

- 03c0581: Drag/pan audit — the chart no longer feels stuck while dragging — plus free
  panning into the future, context cursors, Ctrl/⌘-drag multi-selection and a
  lighter two-canvas renderer.

  **Why dragging felt stuck (fixed):**

  - **Pressing on a drawing swallowed the drag.** The first press on an
    unselected drawing only selected it — the chart neither panned nor moved
    the drawing until a second drag. Now the press that selects a drawing also
    grabs it; a locked drawing is selected and the press pans the chart.
    Clicks that only select (or wobble a pixel or two) no longer move the
    drawing or add an undo step.
  - **A sloppy horizontal drag switched auto-scale off.** 6 px of net vertical
    drift was enough, after which the price scale stopped following the bars
    and wobbled with the hand. Vertical panning now needs a deliberate move
    (more than 24 px, and at least half the horizontal travel); with auto-scale
    already off the price scale still pans freely.
  - **Leaving the chart ended the drag.** Moving past the edge (a fast flick,
    over the toolbar or a side panel) dropped the gesture, and coming back did
    nothing. Drags are now followed on the document until the button is
    released — also for drawings, axis scaling, pane resizing and trading
    lines — and a release outside the window is detected. Price-based drags
    (order / SL / TP lines, alerts, brackets) are pinned to the plot's edge
    instead of taking an off-scale price; page text is no longer selected.
  - **Momentum fired after the pointer had stopped.** Release velocity came from
    the last sample alone, so holding still and letting go flung the chart.
    It is now measured over the last 100 ms, ignored if the pointer rested
    before release, capped, and stopped by any new gesture.
  - **The newest bar was a wall** — see free panning.
  - Right-button presses no longer start a pan under the context menu, and
    presses on HTML controls inside the chart (e.g. the replay scrubber) no
    longer start chart gestures.

  **Free panning.** Drag past the newest bar into empty future space, or past
  the oldest bar, until `panLimits.minVisibleBars` (3) bars remain. The time
  axis and grid continue into the future, the crosshair shows future times, and
  drawings can be placed there — magnet included (times beyond the data are
  extrapolated: `barTimeStep`, `barIndexToTime`; `timestampToBarIndex` and
  `xToTime` no longer clamp to the data). A new bar only scrolls the view when
  it rests at the end; zooming at the live edge keeps the newest bar pinned;
  `fitContent()` rests at the live edge with the usual right margin. New
  `ChartOptions.freePan` (default `true`; `false` restores the old clamp),
  `ChartOptions.panLimits`, `chart.setPanLimits()`, `Viewport.zoomToBarRange()`.
  `setVisibleRange()` now puts the requested range edge to edge (it used to
  only change the bar width around the centre). Trade zones and signal markers
  in the forming bar or beyond are no longer culled.

  **Cursors.** Crosshair over the chart (default cursor when the crosshair is
  hidden), a grabbing hand while panning or moving a drawing, a hand over
  drawings, a move cursor over the selected drawing's handles, resize arrows
  over axes, pane dividers, alert/order/SL/TP lines.

  **Multi-selection.** Ctrl/⌘-drag draws a selection box and selects every
  drawing with an anchor inside it; Ctrl/⌘-click adds or removes one. Dragging
  any selected drawing moves the whole group, Delete removes it, restyling
  applies to all of them — each as a single undo step (new `drawingBatch`
  undo action). `DrawingManager.getSelectedDrawingIds()`, `selectInRect()`,
  `toggleSelectionAt()`.

  **Right-click order menu is now off by default** (`ChartWidget` and `Chart`).
  Opt in with `features.tradingContextMenu: true`.

  **Two canvases instead of four.** The chart used to stack four full-size
  canvases (background, series, overlay, UI); moving the mouse repainted two of
  them, including every drawing, order line and axis. It now paints a scene
  canvas (grid, series, indicators, panes, chart objects, axes) and a thin top
  canvas for what follows the pointer (crosshair and its axis pills, legend,
  bar countdown, measure ruler, selection box). A hover repaints only the top
  canvas, and the browser composites two surfaces instead of four — less GPU
  memory and work, most noticeable on large high-DPI screens. New
  `LayerType.Hover` for `requestRender()`; every other `LayerType` repaints the
  scene, and `LayerManager.getLayer()` returns the scene canvas for every type
  but `Hover`. Overlay plugins behave as before: `main` draws with the series,
  `overlay` and `ui` above the crosshair, repainting as the pointer moves. The
  measure ruler's box stays inside the plot (its info pill may overhang). Also
  fixed: after the page or a scrolling container scrolled, the crosshair
  followed the pointer at an offset until the next click.

  **Price axis:** the tick label the last-price tag would cover is hidden instead
  of showing half-hidden behind it. Anchored VWAP drawings cache their series, so
  hovering over the chart no longer recomputes it on every mouse move.

- a8b6e4f: **TradeCanvas look by default.** `DARK_THEME` and `LIGHT_THEME` use the
  TradeCanvas palette: an ink ground with mint/coral candles and an amber
  series line in dark, crisp white with deeper greens/reds and a deep amber
  line in light. Indicators, orders, signal markers, drawing tools and the
  `ChartWidget` chrome (accent, surfaces, focus ring, settings defaults) follow
  the same palette. Auto-coloured indicators cycle through `TC_SERIES_COLORS`;
  comparison lines no longer start with an orange that blended into the amber
  main line; armed price alerts are blue and triggered ones amber (they were
  gold vs orange). The palette is exported as `TC_PALETTE` for building
  matching custom themes. Tests keep every theme-neutral colour at 3:1 on both
  the dark and the light background, and the widget's accent, green, red and
  muted text at 4.5:1. Charts that pass their own `Theme` are unaffected.

  **Gauge redesign.** `GaugeChart` now draws a thin ring with rounded ends:
  zones are separated by small gaps, bright up to the value and dimmed beyond
  it, and the track shows wherever no zone reaches. A knob on the ring marks
  the value, so the number in the centre is never crossed by a needle; the
  current zone's label shows above the number, with fine ticks inside the
  ring. Text shrinks to fit (or is left out) on small dials. The dial fits its
  container for any start/end angle; odd input is normalised (an end before the
  start wraps once, more than a full turn is a full turn, sweeps narrower than
  90° are widened), a collapsed `min`/`max` range and a missing value (shown as
  "—") no longer produce NaN. Changed defaults: a 240° sweep (`startAngle` 150,
  `endAngle` 390); `thickness` is relative to the ring's centre line and
  defaults to 0.14 (was 0.25 of the outer radius); `showZoneLabels` places
  labels outside the ring, with room reserved for them. The classic needle is
  available with `pointer: 'needle'` (the number moves below the hub).
  `renderGauge` restores the canvas state it changes.

## 1.2.0

### Minor Changes

- Sub-cent prices (e.g. PEPE at 0.0000043) no longer read "0.00". The OHLC
  legend, the crosshair price pill and the last-price tag now use the
  market's `pricePrecision` when `setMarket()` sets one, and otherwise the
  price axis's own precision (new `autoPricePrecision()` in commons), always
  in the configured `numberLocale`. The last-price tag is now the chart's own
  — locale-aware, and set by `setMarket()` even without a stream adapter.
  The price axis widens to fit its longest label (tick labels, last-price
  tag, crosshair pill) like an auto-sized price scale, instead of
  clipping at a fixed 70px; it shrinks back with some slack so panning
  doesn't make it twitch. `ViewportState.priceAxisWidth` exposes the width to
  renderers and plugins.

- 14 new drawing tools (26 → 40):

  - **Lines:** `infoLine` (trend line with a stats box: price change and %,
    bars and time spanned, angle), `trendAngle` (shows its angle in degrees),
    `crossLine` (horizontal + vertical line through one point, single click).
  - **Fibonacci:** `fibChannel` (A→B base, C sets the width; parallels at
    Fibonacci fractions), `fibSpeedResistanceFan` (rays through Fibonacci
    fractions of the move in both price and time).
  - **Pitchforks:** `schiffPitchfork` and `modifiedSchiffPitchfork` alongside
    Andrews' `pitchfork` (which gains a protected `origin()` hook the variants
    override).
  - **Patterns:** `xabcdPattern` (harmonic XABCD with XB / AC / BD / XD ratios),
    `abcdPattern` (BC/AB, CD/BC ratios), `headAndShoulders` (seven pivots with
    the neckline through both neck points).
  - **Shapes / measuring / cycles / annotation:** `circle`,
    `dateAndPriceRange` (price change, bars, time and volume traded in one box),
    `cyclicLines` (vertical lines repeating at the A→B interval), `priceLabel`
    (callout showing a point's price, or `style.text`).

  Measuring labels format prices at the precision of the instrument's price
  level (2 decimals for most, 4 for FX-range prices, significant digits for
  prices under 1) instead of a fixed 2 decimals.

  `ChartWidget` (and the demo) drawing toolbar is regrouped by tool family
  into Lines, Horizontal/Vertical, Channels, Fibonacci, Shapes,
  Gann & Pitchforks, Patterns (new), Measure, Annotation and Forecasting — which
  also exposes three tools that were registered but missing from the toolbar:
  Fib Time Zones, Anchored VWAP and Fixed Range Volume Profile.

  `ChartWidget`'s status bar no longer reads "Connecting..." forever when it
  shows static data without an adapter.

- 43b4ff5: Performance audit, round 2 — measured in a live browser profiler before and
  after each change.

  **Incremental indicators on live ticks (new API).** A live tick only changes
  the forming bar, but every tick re-ran every indicator over the whole
  history: ~30 ms per tick at 20k bars, ~150 ms at 100k, plus megabytes of
  garbage — a main-thread freeze on every websocket update. New optional
  `IndicatorPlugin.update(data, config, prev, from)` recomputes only bars from
  `from` onward; `IndicatorEngine.recalculateFrom(data, from)` uses it and
  falls back to `calculate()` when a plugin doesn't implement it or declines.
  Implemented for SMA, EMA, WMA, VWMA, Bollinger Bands, Envelope, RSI, MACD,
  ATR, OBV and Stochastic, each verified equal to a full recalculation across
  ticks, bar closes and multi-bar appends. Ticks, `appendBar(s)`, stream bar
  closes and replay steps now use it: a tick with 4 indicators at 100k bars
  went from ~96 ms to ~0.001 ms (`pnpm bench`). Note: outputs returned by
  `getIndicatorOutput()` are now updated in place on ticks rather than
  replaced. `IndicatorBase` gains `canResume()` / `writePoint()` helpers.

  **Price scale no longer jumps while live data streams in.** The live-tick
  render path fit the price range to candles only, while the pan/zoom path
  also included overlay indicators (Bollinger, Keltner, Ichimoku…) — so the
  scale snapped back and forth by several percent every second. Both now share
  one auto-scale routine.

  **Switching symbol/timeframe while scrolled into history fits the new data.**
  Auto-scale was computed before scrolling to the end, i.e. over the old
  window, leaving every bar of the new series off-screen.

  **New bars no longer yank you out of history.** `appendBar` and stream bar
  closes now follow the live edge only if the view is already there (as
  `appendBars` already did), and scroll after the viewport knows the new
  length.

  **Cheaper per-frame text.** `formatPrice` (axes, legend, crosshair pills,
  current-price tag, panel axes) and session-break date labels used
  `toLocaleString`/`toLocaleDateString`, which build a new `Intl` formatter on
  every call (~20–40 µs each). Formatters are now cached per locale/precision
  (~0.4 µs). Hover frames dropped from ~0.64 ms to ~0.23 ms.

  **Other fixes found along the way:** `SessionBreaks` rescanned every bar on
  every frame for series with no day boundary; `ATR` threw on series shorter
  than its period; stream bar closes didn't invalidate the display cache (so
  Heikin-Ashi etc. missed the new bar); `replayStart()` rendered the stale
  pre-replay series and stacked a new step listener on every restart.

## 1.1.1

## 1.1.0

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- 96946ac: TradeCanvas 1.0 — first stable release. The public API is now semver-stable.

  Everything an open-source trading chart needs, batteries-included and zero-dependency:

  - **Charting** — 17 chart types, 60+ technical indicators, 24 drawing tools, multi-chart grid, and finance charts (sparkline, depth, equity, heatmap, waterfall, gauge).
  - **Data** — built-in Binance, Coinbase, Bybit, and Kraken adapters, plus generic `WebSocketAdapter` / `PollingAdapter` bases so any feed plugs in with ~20 lines.
  - **Trading** — a real execution surface: connect an `ExecutionAdapter` to route the chart's order/position intents to a broker/OMS and render the fills it reports; drag on the chart to create orders; ships a `PaperExecutionAdapter` sandbox.
  - **Extensibility** — a stable Plugin SDK for custom indicators, drawing tools, chart types, and overlays, registered globally or per-chart.
  - **Layout** — resizable indicator panes with independent price scales.
  - **Performance** — LTTB downsampling keeps 100k+ bar line charts smooth.

  **Frozen 1.0 contracts** (semver-stable for the 1.x line): `DataAdapter`, `ExecutionAdapter`, the Plugin SDK (`IndicatorPlugin` / `DrawingPlugin` / `ChartTypePlugin` / `OverlayPlugin`), and the chart event names + payloads.

  **Breaking from 0.x:** `chart.replay()` is renamed to `chart.replayStart()`, for consistency with `replayPause` / `replayResume` / `replayStop` / `replaySeek`.

## 0.15.0

### Minor Changes

- b06c803: Add `chart.connectExecution(adapter)` — wire an `ExecutionAdapter` into the chart to make the trading overlay live. The chart routes its emitted order/position intents (`orderPlace`, `orderModify`, `orderCancel`, `positionModify`, `positionClose`) into the adapter's commands, and renders the authoritative `orders` / `positions` the adapter emits back. The adapter is the single source of truth. `disconnectExecution()` and `getExecutionAdapter()` round out the API.

  - Failures — adapter-reported or a failed command — surface on a single new `executionError` chart event: `chart.on('executionError', (e) => …)`.
  - Fully backward-compatible: with no execution adapter connected, the intents remain plain events as before.
  - `OrderModifyIntent.previousPrice` is now optional, so the chart's `orderModify` event payload routes straight into an adapter.

  Pair with `PaperExecutionAdapter` for a zero-setup live trading sandbox.

- b06c803: Add the v1 extension contracts — the frozen foundation for a real trading surface and a plugin ecosystem.

  - **`ExecutionAdapter`** — a strategy interface (mirroring `DataAdapter`) that turns the display-only trading overlay into a trading surface. The chart routes its emitted order/position intents into the adapter; the adapter is the single source of truth and emits authoritative `orders` / `positions` back for the chart to render. Fully backward-compatible: with no adapter connected, intents remain plain events.
  - **`PaperExecutionAdapter`** — reference in-memory implementation: virtual fills, hedging-style positions, pending limit/stop triggering via `setMarkPrice`, and SL/TP auto-close. The safe sandbox for demos and tests.
  - **Plugin SDK** — `PluginManager` is now a real registry over four plugin kinds (`IndicatorPlugin`, `DrawingPlugin`, plus new `ChartTypePlugin` and `OverlayPlugin`), unified by a `ChartPlugin` union. Adds a global `registerPlugin()` (inherited by every chart created afterward), a constructor `plugins: []` option, and `chart.plugins.register/unregister/list`. The legacy `registerIndicator` still works.

  Also fixes `Chart.version`, which was hardcoded to a stale `0.7.0`; it is now injected from `package.json` at build time so it can never drift again.

### Patch Changes

- c79be24: Fix widget popups that could not be closed (Price Alerts panel, bracket bar). Their `display: flex` rule silently overrode the `hidden` attribute's `display: none`, so calling `el.hidden = true` left them on screen. Added a namespaced normalize rule that forces `hidden` to win for every `tcw-`-prefixed widget element, fixing the current cases and future-proofing the rest.

  Also fix the Price Alerts form overflowing the panel: its grid inputs/selects now get `width: 100%; min-width: 0; box-sizing: border-box` so they shrink to their column instead of spilling past the panel edge.

## 0.14.0

### Minor Changes

- 794b707: Indicator-depth release: 12 new panel indicators across four batches, bringing the built-in library to 66.

  - Volume flow: Ease of Movement (`emv`), Price Volume Trend (`pvt`), Williams A/D (`wad`)
  - Volatility & momentum: Chaikin Volatility (`chaikinvol`), Relative Vigor Index (`rvi`), Stochastic RSI (`stochrsi`)
  - Oscillators: Percentage Price Oscillator (`ppo`), Accelerator Oscillator (`ac`), Relative Momentum Index (`rmi`)
  - Deviation & sentiment: Disparity Index (`disparity`), Qstick (`qstick`), Pretty Good Oscillator (`pgo`)

  Also fixes an unused import in the Accelerator Oscillator that broke the type-declaration build.

### Patch Changes

- 69b45d8: Add three more panel indicators: Chaikin Volatility (`chaikinvol`), Relative Vigor Index (`rvi`), and Stochastic RSI (`stochrsi`).
- 54cf6fd: Add three more panel indicators: Percentage Price Oscillator (`ppo`), Accelerator Oscillator (`ac`), and Relative Momentum Index (`rmi`).

## 0.13.0

### Minor Changes

- d904d59: feat: Fisher Transform, Detrended Price Oscillator, and Balance of Power indicators

  - `fisher` — Fisher Transform (John Ehlers): Gaussian-normalizes price so
    turning points appear as sharp peaks, plotted with a one-bar lagged trigger
    line (the log singularity is clamped). Zero-centered.
  - `dpo` — Detrended Price Oscillator: removes the longer trend
    (`close[i − period/2 − 1] − SMA(close, period)`) to expose price cycles.
  - `bop` — Balance of Power: per-bar buyer/seller strength
    `(close − open)/(high − low)`, SMA-smoothed, bounded to [−1, 1].

  All three registered in the indicator menu and unit-tested.

## 0.12.0

### Minor Changes

- f3072ed: feat: more indicators — Know Sure Thing, Elder Ray, Schaff Trend Cycle, Klinger Oscillator, Williams Alligator

  Know Sure Thing (KST)

  - New `kst` panel indicator (Martin Pring) — a momentum oscillator from four
    smoothed rates of change weighted 1:2:3:4 toward the longer cycles, plus an
    SMA signal line. KST crossing its signal (and the zero line) flags momentum
    shifts. Zero-centered, auto-scaled, fully configurable ROC/SMA/signal periods.
    Registered in the indicator menu; tested.

## 0.11.0

### Minor Changes

- a2279b6: feat: indicator expansion — Vortex, Choppiness, Ultimate Oscillator, Force Index, Connors RSI, Coppock, Chandelier Exit, Session VWAP bands

  Vortex Indicator (VI+ / VI−)

  - New `vortex` panel indicator plots VI+ and VI− from consecutive highs/lows
    normalised by true range (configurable `period`, default 14). VI+ crossing
    above VI− signals an up-trend (and vice-versa); a 1.0 reference line marks the
    pivot. Auto-scales to the visible range. Registered in the indicator menu;
    tested.

## 0.10.0

### Minor Changes

- d7d777f: feat: draggable bracket order entry

  - **Place an entry + stop-loss + take-profit bracket by dragging.**
    `chart.startBracket('buy' | 'sell', entry?)` opens a live preview — an entry
    line plus shaded red (risk) and green (reward) zones with price and R:R
    labels. Drag any of the three lines to retune (entry translates the whole
    bracket; SL/TP clamp to the correct side). Confirm with <kbd>Enter</kbd> /
    `confirmBracket()`, cancel with <kbd>Esc</kbd> / `cancelBracket()`.
  - Emits a single typed **`bracketPlace`** event
    (`{ side, entry, stopLoss, takeProfit, riskReward }`) — the chart never places
    orders itself, matching the host-owned trading model.
  - Widget: green/red **Long/Short toolbar buttons** start a bracket at the
    latest price; a floating **Place / Cancel** bar appears while placing.
  - Core: new `BracketTool` with pure, tested helpers (`computeBracketDefaults`,
    `bracketRiskReward`) housed in the `TradingManager` pointer/render pipeline;
    `InteractionManager` gains an Enter-to-confirm hook.

### Patch Changes

- 6646fa0: feat: price alerts UI panel

  - **Bell button + floating alerts panel** in `ChartWidget` — add, list, and
    delete price alerts from the toolbar without touching the API. The add form
    prefills the current price and offers all five conditions (crossing,
    crossing up/down, greater/less than) plus an optional note. Triggered alerts
    surface a toast and are flagged in the list. Default on; opt out with
    `alerts: false`. Bottom-sheet on phones (< 640 px).
  - **Proper alert events** — the chart now emits typed `alertAdd`,
    `alertRemove`, and `alertTriggered` events (with an `AlertPayload`) instead
    of only piggybacking on `dataUpdate`. Subscribe via
    `chart.on('alertTriggered', e => …)`. The legacy `dataUpdate` alert signal is
    still emitted for back-compat.

- 053ef97: feat: draggable price-alert lines

  - Grab an alert line on the chart and drag it to a new price — the cursor
    switches to a resize affordance on hover, and moving an alert re-arms a
    triggered one. Scale-aware (works in log / percentage / indexed modes).
  - New `AlertDragHandler` (core) wired into `InteractionManager`; hit-tested
    after trading/drawing so it only claims the gesture right on a line.
  - `AlertManager.getAlertAtPoint()` / `updateAlertPrice()` added; the chart
    emits a typed `alertUpdate` event on drag, and the alerts panel refreshes.

- a160c43: feat: mobile / touch pass

  - **Long-press tooltip pin** — press-and-hold (~500 ms with < 8px movement) on
    the chart pins an OHLC tooltip at the bar under your finger, the mobile
    equivalent of Alt+click on desktop. Cancelled by movement, by a second
    finger landing, or by `Esc`.
  - **Touch axis-drag scaling** — single-finger drag inside the price-axis
    strip (right) or time-axis strip (bottom) scales that axis exactly like
    the desktop mouse-drag gesture. No more "I can only zoom with pinch."
  - **Bottom-sheet modals** — under 640 px viewports, settings / hotkey sheet /
    command palette / symbol search slide up from the bottom with a grab handle
    and `env(safe-area-inset-bottom)` padding for the iPhone home indicator.
    Hotkey sheet collapses to a single column. Sheet width is full-viewport,
    border-radius only on the top corners.
  - **Bigger touch targets** under 768 px — toolbar height 40→44 px, buttons
    pad up to 40 px square. Apple HIG-compliant.
  - **Hotkey sheet** now documents the touch gestures alongside keyboard
    shortcuts.

- bf54565: feat: price scale modes (regular / log / percentage / indexed-to-100)

  - **`chart.setScaleMode(mode)` / `getScaleMode()`** — switch the price axis
    between `regular`, `logarithmic`, `percentage`, and `indexedTo100`. Regular,
    percentage, and indexed share linear geometry; percentage labels show the %
    change from the first visible bar, indexed rebases that bar to 100. Logarithmic
    keeps the existing log geometry.
  - **Settings panel** now offers a "Price Scale" selector (replacing the Log
    Scale toggle); the legacy `logScale` flag stays mirrored for persisted
    layouts, and `setLogScale()` / `isLogScale()` keep working.
  - **`formatPriceScaleLabel()`** exported from `@tradecanvas/commons`, plus
    `PriceScaleMode` and `ViewportState.scaleMode` / `scaleBaseline`. The chart
    sets the baseline (first visible bar's close) each frame.

- 226e12c: fix: review-pass hardening of click, alert, and bracket code

  - **Spurious clicks**: resetting click-tracking state in `onMouseLeave` so a
    press that drifts out of the canvas and releases outside no longer fires a
    ghost `click` / `barClick` (and stray replay-seek).
  - **Bar mapping**: the new click handler now uses the canonical `xToBarIndex`
    (accounts for chart-rect offset and bar centering) so the clicked bar matches
    the crosshair and drawings.
  - **Bracket on touch**: touch events route to the trading manager, so the
    bracket handles (and order/position lines) are draggable on mobile.
  - **Alert level conditions**: `greaterThan` / `lessThan` are now edge-triggered
    — they fire once on entering the condition (immediate fire preserved if
    already past the level) instead of every tick; repeating alerts re-arm once
    the value leaves the level.
  - **Alert context switches**: `AlertManager.clearLastValues()` is called on
    `setData` so indicator-channel alerts don't cross against a stale previous
    value after a symbol/timeframe change.
  - **Alert persistence**: `repeating` is now saved/restored, and price-0 alerts
    (e.g. oscillator `> 0`) are no longer dropped on load.
  - **Bracket defaults**: stop distance is floored so a zero entry price can't
    collapse SL/TP onto entry.
  - **Alert sources**: multi-output indicator lines (MACD, Stochastic) are
    discovered from the latest series point so all lines are offered.

- a160c43: feat: client-side timeframe resampling

  - **`resampleOHLCV(bars, target)`** — aggregate a finer OHLCV series into any
    coarser timeframe (1m → 5m / 15m / 1h / 4h / 1D / 1W / 1M …). Open = first,
    high/low = extremes, close = last, volume = sum. Calendar-aware bucketing:
    intraday and daily frames anchor to UTC epoch boundaries, weeks to Monday
    (configurable via `weekStartsOn`), months/quarters/years to calendar
    boundaries. Input bars are never mutated.
  - **`inferTimeframeMs(bars)`** — detect the source bar spacing from the median
    gap, robust to weekend/halt gaps.
  - **`canResample(sourceMs, target)`** — guard against accidental upsampling.
  - **`timeframeBucketStart(time, tf, weekStartsOn?)`** exported from
    `@tradecanvas/commons` — the calendar-aware bucket anchor used by resampling.
  - **Widget integration** — `ChartWidget` now resamples locally when the
    timeframe buttons are clicked and no live adapter is attached: one loaded
    dataset drives every resolution, no refetch. New `widget.setData(bars)`
    registers the finest-resolution base series; opt out with
    `resampleTimeframes: false`. New `weekStartsOn` widget option.

- 8f69419: feat: timezone-aware time axis + crosshair

  - Time-axis labels, the timezone badge, and the crosshair time pill can now
    render in a fixed UTC offset instead of only the browser-local zone — handy
    for trading a market in its exchange time. `chart.setTimezoneOffset(minutes |
null)` (e.g. -300 for EST, 330 for IST, null for local), with a Timezone
    selector in the settings sheet.
  - Pure, tested `timeParts(timeMs, tzOffsetMinutes)` and `tzLabel()` helpers in
    `@tradecanvas/commons` (handles negative offsets that wrap the day and
    fractional offsets like +5:30).

## 0.9.0

### Minor Changes

- feat: axis-drag scaling, measure tool, symbol search + premium CSS

  - **Axis-drag scaling**: drag the price axis vertically to compress/expand the
    price scale (disables auto-scale); drag the time axis horizontally to zoom.
    Double-click the price axis to re-enable auto-scale; double-click the time
    axis to fit all data. Cursor changes to `ns-resize` / `ew-resize` over the
    respective strips.
  - **In-canvas axis polish**: price + time axes now render with subtle dividers,
    thin tick notches, and refined typography weight — drops the heavy per-label
    background rectangles for a cleaner feel.
  - **Widget CSS refresh**: new design tokens (typography, motion, elevation,
    shape), Inter + JetBrains Mono stacks, smooth cubic-bezier transitions,
    refined hover/active/focus states, subtle gradient toolbar/sidebar surfaces,
    larger radii on modals/command palette, animated `connected` status pulse,
    refined scrollbars, reduced-motion support.
  - New `Viewport.scalePriceRange(factor)` and `AxisDragHandler` exports for
    consumers building custom axis interactions.
  - **Measure tool**: hold <kbd>Shift</kbd> and drag on the chart to draw a
    transient ruler showing bar count, time span, price Δ, and %. Exported as
    `MeasureOverlay` from `@tradecanvas/core` (lives next to the existing
    click-anchored `MeasureTool` drawing — they coexist).
  - **Symbol search modal**: clicking the toolbar symbol (or pressing
    <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>P</kbd>) opens a fuzzy-search picker over
    the configured `symbols[]`. Replaces the previous click-to-cycle behavior,
    which broke down past 3-4 symbols. New `widget.setSymbols(string[])` API
    updates the catalog at runtime.
  - **Strategy library**: four reference strategies under
    `@tradecanvas/analytics` — `smaCrossStrategy`, `rsiReversionStrategy`,
    `donchianBreakoutStrategy`, `bollingerReversionStrategy`. All return a
    `StrategyFn` ready to feed `Backtester.run()`.
  - **Hotkey sheet**: press <kbd>?</kbd> in the widget to open a categorized
    keyboard-shortcut reference (search, chart manipulation, drawing, keyboard
    navigation).
  - **Replay scrubber UI**: toolbar play button toggles a floating bottom
    scrubber bar with play/pause, step-back/step-forward, draggable progress
    scrubber, and a speed select (0.5×–100× bars/sec). Drives the existing
    `chart.replay*()` API and restores the original data series on exit.
    `ReplayManager.seekTo` now emits a synchronous `bar` event so seeking while
    paused immediately repaints the chart slice.
  - **Monte Carlo simulation** (`runMonteCarlo`): shuffles realised trade order
    N times to expose path-dependence. Returns per-step P5/P25/P50/P75/P95
    equity bands, final-equity percentiles, probability-of-profit, and
    worst-case max drawdown across the runs. Deterministic with a seed.
  - **Saved layouts**: opt-in widget option `persistLayouts: true` snapshots
    per-symbol chart type + indicators + drawings + alerts into localStorage
    and re-applies them when the user switches back. `widget.clearSavedLayout()`
    resets a saved entry. Default key prefix `tcw:layout:{symbol}`.
  - **Pinned tooltip**: Alt/Option-click the chart to anchor an OHLC tooltip
    at the hovered bar. The live crosshair tooltip then shows the price / %
    / bar-count delta to the pinned bar. Esc unpins. New `PinnedTooltip`
    export from `@tradecanvas/core`.
  - **Hover axis labels**: Pill badges follow the crosshair
    on the right axis (current price under cursor) and the bottom axis
    (current time). Rendered with inverted theme colors + a triangular notch
    pointing at the crosshair line. Painted on the UI layer so they always
    sit on top of the static axis labels.
  - **Bar hover highlight**: a subtle translucent column behind the crosshair
    marks which bar the cursor is on — much easier to read in dense candle
    charts.
  - **Volume Profile**: optional horizontal histogram of traded volume
    bucketed by price over the visible range, with point-of-control
    highlighting. Toggleable via the new `chart.setVolumeProfileVisible()`
    API and the widget settings sheet (off by default).
  - **CSV / JSON drag-and-drop**: drop an OHLCV file onto the chart and it
    loads instantly. Parser auto-detects delimiter (`,` `;` tab `|`), header
    vs. headerless, ISO timestamps vs. unix s/ms, object-of-rows vs.
    array-of-arrays JSON, sorts ascending, and de-dups same-timestamp rows.
    Exported as `parseOHLCV` + `DragDropImporter` from `@tradecanvas/chart`.
    Enabled by default in the widget — opt out with `dragDropImport: false`.
  - **Watchlist sidebar**: opt-in right-side panel listing the widget's
    symbols with last price, % change, and a mini sparkline. Click a row to
    switch symbol. Active symbol updates from the live stream; other rows
    can be fed from your own WebSocket via `widget.setWatchlistEntry()`.
    Enable with `watchlist: true`.
  - **Day-separator dividers**: time-axis-area faint vertical lines at day
    boundaries, heavier at week/month/year boundaries with inline date
    labels. Auto-suppressed on daily-or-coarser timeframes so weekly charts
    don't paint a wall of lines.
  - **Toasts**: widget now has a `toast(msg, kind?)` helper for transient
    feedback (used by the drag-drop importer; available to apps).

## 0.8.2

## 0.8.1

## 0.8.0

### Minor Changes

- 1a9fce1: Strategy & pro charting release.

  **New package**: `@tradecanvas/analytics` (private, source-only for now) — `Backtester`, `Portfolio`, `computeRiskMetrics`, plus configurable `Commission` and `Slippage` models. Bar-by-bar execution model where strategies place orders on bar N that fill on bar N+1; emits a typed `BacktestResult` with fills, closed trades, an equity curve, and summary metrics (Sharpe, Sortino, Calmar, CAGR, max drawdown, win rate, profit factor, expectancy).

  **Replay mode**: new `ReplayController` in `@tradecanvas/core` plays a historical `DataSeries` forward at controlled speed with start / pause / resume / step / seek / setSpeed. Decoupled from `Chart` so it can drive both UI replay and headless backtests.

  **Pro charting**:

  - New `equivolume` chart type (full-range boxes with width proportional to volume share, colored by close vs prior close).
  - New `fibTimeZones` drawing tool (vertical Fibonacci interval projections from a two-anchor time span).

  **API additions**:

  - `ReplayController(opts)` with `ReplayEventMap` (`bar`, `finished`, `stateChange`)
  - `EquivolumeRenderer` exported from `@tradecanvas/core`
  - `FibTimeZonesTool` exported and registered by `registerBuiltInDrawingTools`
  - `'equivolume'` added to `ChartType`; `'fibTimeZones'` added to `DrawingToolType`
  - Widget catalog (`CHART_TYPES`) lists Equivolume

## 0.7.1

### Patch Changes

- Fix: drawings drift after timeframe / symbol switch

  Drawings now store anchors as real timestamps instead of fragile bar indices,
  so they keep pointing at the same wall-clock time when the bar series changes
  (timeframe switch, symbol switch, etc.) — the behaviour traders expect.

  **Implementation**

  - `ViewportState` gained an optional `data?: ReadonlyArray<{ time: number }>`
    field. When set, `anchor.time` is interpreted as a real timestamp; otherwise
    it falls back to bar-index semantics for backward compatibility with custom
    callers / plugins that don't inject data.
  - New helpers in `@tradecanvas/core`: `timeToX`, `xToTime`, `resolveBarIndex`.
    Drawing base + tools use these instead of the raw `barIndexToX` / `xToBarIndex`.
  - `Chart` injects `data` into the viewport for both render and interaction
    paths (drawing creation, drag, resize, hit-test), so all flows agree on the
    same anchor format.
  - `DrawingManager.setDrawings()` auto-migrates legacy bar-index anchors to
    timestamps on load (heuristic: `time < 1e9` → bar index, upgraded via
    `data[idx].time`). Existing persisted drawings keep working.
  - `duplicateDrawing()` offsets by 3 × median bar interval (in time units)
    instead of `+3` literal — copies remain visually distinct on any timeframe.
  - `Measure` and `DateRange` tools compute the "X bars" label via resolved
    bar indices so the count reflects the active timeframe.

  **No public API breaks** — the change is additive (new optional field, new
  helpers). Custom drawing plugins that read `state.anchors[i].time` directly
  should call `resolveBarIndex(time, viewport)` to convert to a bar index.

## 0.6.0

### Minor Changes

- 1333b7d: Expand indicators, chart types, trading overlay customization, and harden type safety.

  **New indicators (7)**

  - `HullMAIndicator` (overlay) — low-lag WMA-of-WMA-diff
  - `PivotPointsIndicator` (overlay) — Classic S3/S2/S1/PP/R1/R2/R3, configurable lookback
  - `AnchoredVWAPIndicator` (overlay) — VWAP that resets at a chosen `anchorTime`
  - `ZigZagIndicator` (overlay) — swing-pivot connector with deviation threshold
  - `LinearRegressionChannelIndicator` (overlay) — least-squares fit + std-dev bands
  - `AwesomeOscillatorIndicator` (panel) — momentum histogram with up/down coloring
  - `ChaikinOscillatorIndicator` (panel) — EMA(ADL, fast) − EMA(ADL, slow), exposes ADL

  **New chart type**

  - `'rangeBars'` and `toRangeBars` transform — fixed price-range bars (each bar's high − low equals a configured range)

  **Trading overlay customization (additive, no breaking changes)**

  - `TradingPosition.closedQuantity` — partial-close visualization on the position zone
  - `TradingConfig.pnlThresholds: PnLThreshold[]` — multi-stop color gradient driven by live P&L
  - `TradingConfig.positionLabel: string | (ctx) => string` — token templating (`{side}`, `{qty}`, `{openQty}`, `{closedQty}`, `{entry}`, `{price}`, `{pnl}`, `{pnlPct}`, `{pnlSign}`)

  **Web Worker indicator pipeline**

  - New `IndicatorWorkerHost` (main-thread façade) + bundled `indicator.worker.js` entry that registers all 33 built-in indicators
  - Promise-based `host.calculate(indicatorId, config, data)` offloads heavy compute off the render loop
  - Pass `null` instead of a worker for the synchronous fallback path (SSR, tests, safety net)
  - Per-request timeout, `ping()` health check, `terminate()` rejects pending requests cleanly

  **Type safety**

  - New `getNumberParam` / `getIntParam` helpers exported from `@tradecanvas/core`
  - All 25 existing indicators migrated to the helpers — invalid params (NaN, Infinity, missing keys, non-numeric strings) now fall back to documented defaults instead of silently propagating to calculations
  - `BinanceAdapter` REST and WS payloads now flow through typed `parseRestKline` / `parseWsKline` validators; `any[]` and `any` casts are gone
  - `TextAnnotationTool` text resolution moved to a pure `resolveAnnotationText` helper (no more `as string` cast)
  - `ChartStateManager.deserialize` validates the parsed shape — malformed drawings/orders/positions/indicators are filtered, missing or wrong-typed viewport fields fall back to defaults

  **Internal refactor**

  - `WidgetStyles.ts` (764 LOC of CSS-in-string) extracted into a sibling `WidgetStyles.css` file, imported via Vite's `?raw` query and inlined at build time. The TS shim is now 31 LOC; CSS is editable as CSS (syntax highlighting, linting). Public API (`injectWidgetStyles` / `removeWidgetStyles`) unchanged.
  - Chart-type dispatch (`createChartRenderer` and `getDisplayData`) extracted from `Chart.ts` into a new `ChartTypeStrategy` module with `createRendererFor`, `transformDisplayData`, and `isTransformedChartType` helpers. `Chart.ts` shrinks by ~60 LOC; adding a new chart type now means editing one focused module.
  - Removed duplicate `timeframeToMs` private method from `Chart.ts`; uses the shared helper from `@tradecanvas/commons`.

  **Test coverage**

  - 141 tests across 21 files (Vitest scaffolded in `@tradecanvas/core`)
  - New coverage for: 9 indicators, range-bar transform, trading position formatting, drawing-tool hit-test geometry, `DrawingManager` CRUD, Binance kline parsers, `ReconnectManager` backoff/cap/give-up, `TickAggregator` (tick + pre-formed-bar paths, ring buffer), `ChartState` JSON + localStorage round-trip
  - CI workflow added under `.github/workflows/test.yml` (Node 20.19, pnpm 9.15, builds commons, runs `pnpm test`)

## 0.5.0

### Minor Changes

- Broker integration API improvements — typed events, timestamp normalization, setTimeframe, DARK_TERMINAL theme.

  ## Features

  **Typed event payloads** — `chart.on('orderModify', e => e.payload.orderId)` now infers the correct payload type via `ChartEventMap`. No more runtime guards or `as any` casts.

  **Timestamp normalization** — `normalizeBar()` converts wire format `{ t, o, h, l, c, v }` to `OHLCBar`. `normalizeBarTime()` auto-detects seconds vs milliseconds (`time > 1e12`).

  **`chart.setTimeframe(tf)`** — switch timeframes on an active stream without destroy/rebuild. Internally delegates to `switchStream()` with the stored symbol.

  **`chart.appendBars(bars)`** — bulk-append for reconnect catch-up. Recalculates indicators once instead of per-bar.

  **`chart.setStatusText("LIVE · 8ms")`** — display custom status in the chart legend area.

  **`chart.setCurrentPrice(price, pulseColor?)`** — optional pulse color parameter.

  **`DARK_TERMINAL` theme** — fintech terminal palette (#0E0E0E bg, #00FF87 bull, #FF3B4D bear, monospace font).

  **`DataAdapterEventType` exported** — adapters can now `implements DataAdapter` against the real contract.

  ## Documentation

  - JSDoc on `DataAdapter` interface clarifying observer pattern
  - `OHLCBar.time` documented as milliseconds

## 0.4.0

### Minor Changes

- Locale-aware number formatting + 4 critical bug fixes + 2 performance optimizations.

  ## Features

  **Locale-aware number formatting** — new `numberLocale` option on Chart (BCP 47 format):

  ```typescript
  const chart = new Chart(el, {
    chartType: "candlestick",
    numberLocale: "de-DE", // 65.234,00 instead of 65,234.00
  });

  // Change at runtime
  chart.setNumberLocale("vi-VN");
  ```

  Affects price axis, crosshair tooltip, indicator legend, and trading overlay values. Supports any valid BCP 47 locale (`en-US`, `de-DE`, `fr-FR`, `vi-VN`, `en-IN`, `ja-JP`, etc.).

  ## Bug Fixes

  - **Keyboard shortcuts were broken** — `KeyboardHandler` was constructed then discarded, so arrow keys, +/-, Home/End, and Space did nothing. Now properly wired to `window` with focus-aware handling (ignores input/textarea/contentEditable elements).
  - **Streaming indicators froze until bar close** — Moving averages, Bollinger Bands, RSI, etc. now update in real-time on every tick instead of only at bar close.
  - **StreamManager listener leak** — Adapter listeners accumulated across connect/disconnect cycles because unsubscribers weren't tracked. Now properly cleaned up.
  - **Price formatting lacked thousand separators** — `formatPrice()` now uses `toLocaleString` for readability (`65,234.00` vs `65234.00`).

  ## Performance

  - **Cached `getBoundingClientRect`** in `InteractionManager` — was called on every mousemove event. Now invalidated only on pointerdown, resize, and scroll. Significant reduction in layout flushes during pan and crosshair movement.
  - **Replaced `structuredClone`** in drag/resize hot paths with hand-rolled shallow clone (5-10x faster for the `DrawingState` shape).

## 0.3.0

### Minor Changes

- Add WaterfallChart and GaugeChart — two new finance-specific chart components.

  **WaterfallChart** — Visualize running totals with positive/negative contributions. Perfect for P&L attribution, revenue bridges, and cash flow analysis.

  ```typescript
  import { WaterfallChart } from "@tradecanvas/chart";

  new WaterfallChart(container, {
    data: [
      { label: "Start", value: 10000, type: "total" },
      { label: "Gain", value: 1850 },
      { label: "Loss", value: -620 },
      { label: "End", value: 11230, type: "total" },
    ],
    showValues: true,
    crosshair: true,
  });
  ```

  **GaugeChart** — Speedometer-style gauge for KPIs, risk scores, and sentiment indicators with colored zones and smooth value animation.

  ```typescript
  import { GaugeChart } from "@tradecanvas/chart";

  const gauge = new GaugeChart(container, {
    value: 72,
    min: 0,
    max: 100,
    label: "Fear & Greed",
    zones: [
      { from: 0, to: 25, color: "#ef4444" },
      { from: 75, to: 100, color: "#10b981" },
    ],
    animate: true,
  });

  gauge.setValue(85); // smooth animation to new value
  ```

  Both charts share the performant `BaseFinanceChart` infrastructure: DPR-aware canvas, auto-resize, theme switching, and batched path operations for efficient rendering.

## 0.2.0

### Minor Changes

- Add 4 finance chart components (SparklineChart, DepthChart, EquityCurveChart, HeatmapChart), client-side order matching engine with trade history, and comprehensive developer documentation.

  Features:

  - SparklineChart: tiny inline line/area chart for dashboards
  - DepthChart: bid/ask order book visualization with crosshair
  - EquityCurveChart: portfolio equity with drawdown shading and benchmark
  - HeatmapChart: colored cell grid with treemap layout
  - Order matching engine: auto-fills limit/stop orders with spread and commission
  - Trade history with win rate and PnL stats
  - Toast notifications for order fills and SL/TP triggers
  - Trade-on-chart via built-in right-click context menu
  - TC prefix on all generated IDs
  - Auto-scale includes overlay indicator values
  - StackBlitz interactive sandboxes (Vanilla JS, React, Svelte, Vue)
  - Panel indicators now render immediately (no interaction needed)

  Bug fixes:

  - Stop orders show correct STOP label
  - Fix workspace:\* deps in published packages
