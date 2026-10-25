# Changelog

## Unreleased

### What a downstream app found

- **`maxDrawdownPct` is the deepest fall from a running peak** (`@tradecanvas/analytics`). It was the percent of the largest fall in money, which on a growing account can be a later, shallower fall: 100, 50, 100, 400, 1000, 800, 1200 gave 20% instead of 50%. It only ever gets larger, and `calmar`, which divides by it, falls with it. `maxDrawdown` is still the largest fall in money, so the two can come from different falls; the `RiskMetrics` fields now say their units (the percentages are fractions). `PerformanceDashboard` shows a `Backtester` result's total return and max drawdown in percent, where they read 100 times too small, and the Max Drawdown card reads as a fall (`-50.00%`), as the Drawdown panel plots it.
- **Session breaks are lines only** (`@tradecanvas/core`, `@tradecanvas/chart`). Their dates no longer print along the top of the plot, where they repeated the time axis and ran under the legend: zoomed out on intraday bars (the All range on daily bars, then 4h) they made a row of Mondays and months, and at the usual zoom a Monday near the left edge still sat under the OHLC line. The time axis names the days, months and years at every zoom. `SessionBreaks.renderLabels` and `SessionBreaks.setLocale` are deprecated and do nothing; they go in 2.0.
- **Your toolbar buttons on the left fold under “more”** (`@tradecanvas/chart`). Those added with `side: 'left'` never folded, so on a phone they pushed “more”, and everything under it, off the screen. They now fold like the widget's own, after everything on the right, and come back first; a narrow widget (under 641 px) puts them all under “more”, listed first, where they used to stay on the bar. A menu of yours picked from “more” opens under it instead of at the widget's top-left corner, `handle.setText` refits the toolbar so a growing count doesn't push “more” out, and “more” names a button with its count (“News: 3”). An `onClick` picked from “more” gets its button folded, with no size: a popover placed from it lands at the corner.
- **The widget draws its faces as they are** (`@tradecanvas/core`, `@tradecanvas/chart`). It turned on Inter's OpenType features (`'cv11', 'ss01', 'ss03'`) for every face, and in IBM Plex, the Terminal look's face, they gave a one-storey a and slashed zeros. `--tcw-font-features`, set on `.tcw-root` from your CSS, turns on your face's own; the chart's canvases take none from the page. The price axis is measured on the chart's own canvas, as it is drawn, so in the airy look it no longer cuts off the end of the crosshair's price, and a `chartOptions.font` with sizes only keeps the airy look's face. The docs no longer say `chartOptions.font` sizes the legend: in the widget the legend's face and size come from `ui.font`.
- **The status bar fits its width and keeps the clock whole** (`@tradecanvas/chart`). On a phone or in a narrow cell the clock was cut off at the edge, the presets past the room hid in a scroller with no scrollbar, and your status bar items on the left and the right ran into each other. The right group now keeps its width; the range presets fold under “more”, the longest first, then go to date, and “more” opens a menu of what is folded. Only with all of that folded, or switched off (`rangeBar: false`), does the market's status shorten to a word (“Closed”), its full words left to the tooltip and screen readers. The keyboard on a preset that folds moves to “more”, and the menu closes when what is folded changes. Your items on the left keep a gap before the right group; right to left, the range bar no longer overlaps it; the presets close up by the widget's width (under 641 px), not the window's.
- **The symbol search opens with names, and lines them up** (`@tradecanvas/commons`, `@tradecanvas/chart`). `symbols` and `setSymbols` take `SymbolInfo` as well as tickers, so the list before typing shows each symbol's name, kind and exchange, where it showed bare tickers until a search named them; `SymbolInfo.logo` puts a logo at the start of the row, and a symbol without one gets its ticker's first letter in its kind's colour (`--tcw-kind-1` … `--tcw-kind-5`). A logo loads as an image only, with no referrer, from `https:`, `http:`, a path on your site, `blob:` or `data:image/…`. The rows are one grid under heads that stay put: symbol, name, kind and exchange line up in every row, in the compare dialog too. The kind tabs show for one kind and stay while you type; rows from two or more exchanges can be kept to one; both narrow the feed's 50 results, and keep the symbols you gave that say nothing of their kind or exchange. Without a search, names match too, with or without Vietnamese marks. The toolbar's symbol and the symbol info panel take a name from your `symbols` when the chart knows none, and no longer show the previous symbol's; the chart's info told since the symbol changed counts in any spelling (`BTC-USD` for `BTCUSD`). A feed's words win on the list the search opens with too, and a `null` or a number where a word goes neither shows nor erases yours. On a phone the tabs fade where more are past the edge, and a venue before a colon (`BINANCE:`) is dimmed and shortened first, keeping the ticker whole. Objects in `symbols` from plain JavaScript, and words that aren't text there or in a feed's results, no longer break the watchlist or the search.

## 1.50.0 (2026-10-25)

React, Vue and Svelte components: 1.3.33.

### An airy look

The look 2.0 will open with, to choose now: more bars on screen, with air between them, and lighter figures.

- **`barLayout: 'golden'`** (or `chart.setBarLayout('golden')`): a candle's body is the slot × φ⁻¹ (62%) at every zoom, the rest a gap, and the chart opens at φ⁴ ≈ 6.85 px a slot. A full-HD chart opens on about 240 bars where it showed 170. `'classic'`, a 2 px gap and 10 px a slot to open, stays the default until 2.0. Over bars on screen, a new layout keeps the zoom and splits each slot again.
- **The chart's own text over any theme**: the `font` option and `chart.setFont({ family, sizeSmall, … })` set the face and sizes of the axes, the legend and the tags, and stay through theme changes; `chart.setFont(null)` goes back to the theme's. `SANS_FONT_FAMILY` is a sans face every system has.
- **The widget's `ui: { density: 'airy' }`** turns it all on: spacious controls, the figures in the look's sans face, golden bars. `chartOptions.barLayout` and `chartOptions.font` win over it. The Feature Lab's look picker has it.

## 1.49.1 (2026-10-25)

React, Vue and Svelte components: 1.3.32.

### One way in for the bars

Every way bars reach the chart (`setData`, `appendBar`, `appendBars`, `updateLastBar`, `updateLastBarFromTick`, `prependBars`, a stream, a replay, the extended hours hidden or shown) now goes through one place, the series store. A seeded test runs each of them, mixed, against a chart given the same bars with `setData`, its bars and indicators alike. It found three faults:

- **A trade keeps the forming bar at its own time.** `updateLastBarFromTick` moved the bar's time to the trade's: `getData()` showed the bar off its interval, a stream's next update for that bar was taken as an older bar and left out, and with the extended hours hidden the trade was lost when they were shown again. `mergeBar` keeps the bar's time the same way.
- **A stream's bars during a replay are placed by their time**, as they are outside one. A new forming bar replaced the last bar, and a bar's close added it a second time, so `replayStop()` brought back a series the feed never sent.
- **A stream in milliseconds on a series in seconds**, with the extended hours hidden, left its bars in milliseconds among the hidden ones: shown again, the series mixed the two units.

The docs say what agents still read the compiled code for: `getIndicatorOutput` (`series[i]` is the value at bar `i`, keyed by the indicator's lines) and `replayStart` (`startIndex` is the first bar it reveals; one bar every `interval / speed` ms).

## 1.49.0 (2026-10-25)

React, Vue and Svelte components: 1.3.31.

### What the types say

What coding agents still read the compiled code for, in the evals after the last fixes.

- **The built-in indicators are in the types.** `BuiltInIndicators` lists the 134 by id: each one's inputs, with their defaults and ranges in their notes, and the keys of the lines it draws (as `getIndicatorOutput` and `indicatorSource` name them). `addIndicator('rsi', { period: 14 })` offers the ids and the inputs as you type, and a misspelt input fails the type check (`{ stddev: 2 }` for the bands' `stdDev`). Any id still takes any inputs, for the indicators a plugin registers (`IndicatorId`, `IndicatorParamsFor<Id>`). The components' `indicators` prop takes the same ids. The file is generated from the registry with the other docs.
  - For TypeScript code: an object literal with an input the built-in doesn't have no longer compiles (it was ignored), and neither does `true` or `false` for a number. Values are otherwise as loose as they were: text for a number (a form field's value), any text for a kind. A function generic over the id types its inputs `IndicatorParamsFor<Id>`.
- **Notes the published types dropped are in them.** Fields and union members explained by a comment at the end of their line lost it in the `.d.ts` files. They are doc comments now, and a test keeps new ones so: a replay's `interval` and `speed` (one bar every `interval / speed` ms, 500 and 1 by default), the stream's reconnecting (`StreamConfig.reconnect`, and the `DataAdapterConfig` fields it doesn't pass to an adapter), a market's lot, price step, limits and session times, a Renko brick, what each trading adapter event carries.
- **Which keys colour the wicks.** `applyOverrides`, the `overrides` option and `CHART_STYLE_KEYS` say that `series.candlestick.upColor` / `downColor` colour the wicks with the bodies, and that `wickUpColor` / `wickDownColor` give the wicks colours of their own. The skill has every key with its kind (`references/style-keys.md`, generated).
- **A widget switch never adds a part**, and its `features` and `depthLadder` options now say so: the depth ladder and the watchlist come from their options, and `features: { depthLadder: true }` alone makes no ladder. The comment over the on/off options said each one stands for its switch, which read the other way.

## 1.48.0 (2026-10-25)

React, Vue and Svelte components: 1.3.30.

### Live bars through the components' `data`

- **React's `data` takes bars that go on from the last as live ticks.** A new array with its last bar changed, or bars added after it (`setBars((bars) => [...bars, next])`, several at once in a batched render), goes in through `updateLastBar` / `appendBar` / `appendBars`, as a stream's bars do: the view isn't reset, only the end is computed again, and alerts and orders follow the price. Each new array was a new series, the view back to the newest bar and every indicator computed again, and 1.46.0's docs said to feed a live chart through the ref instead; the ref still works.
- **Vue and Svelte take a new array the same way.** A push onto the same array, or its last bar changed in place, went in as ticks already, one bar at a time; several pushed between two renders now go in together, and the bar before a new one is no longer sent again when it is as it was.
- **Any other bars are a new series**, in all three: an older bar changed (as a new bar object), bars taken away, a bar the chart can't take, a window that drops its oldest bars. So are the next bars after a stream, or code through the chart itself, gave the chart bars of its own, and after `data` was taken away. The chart gets plain copies of the bars' six fields, so frozen state is left as it is.
- Ticks go on as a stream's do: a replay running goes on, a price range the user dragged stays, and bars added together go in as `appendBars` takes them (the alerts check their last close).
- `feedBars(chart, bars, prev)`, the rule the three share, is exported from `@tradecanvas/chart` beside `syncIndicators`.
- **`appendBars` keeps a view that `setAutoScroll(false)` stopped from following new bars**, as `appendBar` does; it scrolled to them.

## 1.47.0 (2026-10-25)

React, Vue and Svelte components: 1.3.29.

### One spelling for the time zone

What coding agents ran into in the evals: the option is `timeZone`, the methods were `setTimezone`, and an option written from the methods' name failed the type check.

- **`timeZone` in the chart's methods and types**, as `Intl.DateTimeFormat` spells it: `setTimeZone`, `getTimeZone`, `getEffectiveTimeZone`, `getExchangeTimeZone`, `EXCHANGE_TIME_ZONE`, and `SymbolInfo.timeZone` for the zone a symbol keeps its hours in (`MarketConfig` and the session shading spelled it so already).
- **The older names still work**, marked deprecated: `setTimezone`, `getTimezone`, `getEffectiveTimezone`, `getExchangeTimezone`, `setTimezoneOffset` (an offset is `setTimeZone(minutes)`), `EXCHANGE_TIMEZONE` and `SymbolInfo.timezone`. A symbol's zone reads back both ways from `getSymbolInfo()`, and `timeZone` comes first when both are given (`{ ...chart.getSymbolInfo(), timezone }` still changes it). `marketStatus`, a feed's update and the new `symbolTimeZone(info)` read either; Binance's symbols carry both. The widget's own names, such as the switch `menu.chart.timezone`, stay as they are.
- The docs' time zone section showed only fixed offsets, through `setTimezoneOffset`. It now shows the option, IANA zones, `'exchange'` and what each getter answers.

## 1.46.0 (2026-10-25)

React, Vue and Svelte components: 1.3.28.

### The widget, as agents found it

What coding agents ran into in the evals, on the widget.

- **`onReady` runs once the widget is built**, in a microtask after `new ChartWidget()` returns, and gets the widget as well as its chart. `onReady: () => widget.openPanel('watchlist')` threw, the widget's name not yet set, though it type-checked. It no longer runs for a widget destroyed first, nor for one whose making failed.
  - For code written to the old order: the statements right after the constructor now run before it (a `setData` there comes first, and a variable `onReady` sets is not set yet: use `widget.getChart()`). A view shared in the URL (`shareUrl`) is still put back after it. An error it throws is reported as uncaught, no longer by the constructor.
- **A shared link cut short** (`#tcw=` that isn't a URI component) is left alone; it made the widget's constructor throw.
- **The docs say what agents read the compiled code for:**
  - the `watchlist` option is a panel of the dock, shut to start with like every panel: `widget.openPanel('watchlist')` opens it;
  - a widget without `adapter` connects nowhere and shows the bars you give `setData` (a coarser interval is made from them, a symbol or a finer interval comes to `onSymbolChange` / `onTimeframeChange`);
  - `isFeatureOn` answers for one switch as set: with `replay: false` the replay button is gone, and `isFeatureOn('toolbar.replay')` is still `true` (a part shows while its capability, its place and its bar are all on);
  - `saveState`, `setAutoSave` and `loadStateFromStorage` say what a layout holds (not the bars) and when it is written;
  - the React component says which props follow their changes and which are read at mount, that a new `data` array is a new series (for a live feed, update the chart through the ref), and that unmounting closes the stream and destroys the chart.

## 1.45.0 (2026-10-25)

React, Vue and Svelte components: 1.3.27.

### Live prices from your own feed

What coding agents ran into in the evals, on the chart.

- **A price fed by hand is the live price.** `updateLastBar`, `updateLastBarFromTick`, `appendBar` and `appendBars` move the price line, the alerts and the orders' P&L, as a connected stream and `setCurrentPrice` do. Alerts on a chart fed by your own code never went off, and nothing said why. The same price sent both ways fires an alert once. A bar the chart can't take (a price that isn't a number or is below zero, a high under its low) is left out, price and all: it no longer sets off an alert the chart never shows.
- **The first live price after the bars counts.** An alert crosses from the series' last close, so a first tick past the level fires it; that tick only set the starting point. A stream's bar close is a live price too, as its forming prices were.
- **`dataUpdate` says what changed**, by `kind`: `'bars'` (`{ length }`) for `setData`, a reconnect's bars and each new bar, by hand or by the stream (most feeds send a new bar forming first, which sent nothing); `'alert'`, `'bracket'`, `'connection'` and `'error'` for the rest. A tick on the forming bar sends none (`indicatorUpdate` follows those). New bars go out before the alerts they set off. Its payload is typed as it is, `DataUpdatePayload`, exported: it was typed as a series it never carried, so code that read `e.payload.length` checks `e.payload.kind === 'bars'` first.
- **`getChartType()`** reads the chart type back; it was only in `saveState()`.
- **`setTimezone('exchange')` shows the market's zone** when the symbol names none: `setMarket(MARKET_HOSE)` then `'exchange'` is Vietnam's time. A market set later moves it too; a zone chosen otherwise stays. `getExchangeTimezone()` says which zone `'exchange'` stands for, and the widget offers it in its zone lists for a market as well as for a feed that names the symbol's.
- The market presets (`MARKET_HOSE`, `MARKET_HNX`, `MARKET_UPCOM`, `MARKET_VN30F`, `MARKET_CRYPTO`, `MARKET_NYSE`) say what they hold, and `setMarket` what it applies and what it leaves (the axis's zone, the number locale).

## 1.44.0 (2026-10-24)

React, Vue and Svelte components: 1.3.26.

### The account panel and the depth ladder

The last part of the trading round, in the Print look.

- **The account panel** keeps the open P&L and the P&L realised in its head on every tab (it showed the realised only under the history). Each tab's count is a figure in a soft pill.
- Its figures (quantities, prices, P&L, stops) are set right in the chart's mono type. Money is written to the price step's decimals in the number locale, with the percent beside it (`+119.36 · +0.08%`), and signed figures read left to right in a right-to-left widget.
- Its headings are in the label case. In a narrow widget (a phone, a narrow column) each row is a card of named figures (columns were cut off), the headings kept for a screen reader, and the totals go under the tabs. Each tab is named with its count ("Positions (1)"). The realised P&L shows once there are fills or a figure. Reverse uses the `arrowUpDown` icon, as on the chart.
- **The depth ladder** is a page of the dock beside the chart, not a floating box over it and the watchlist: open it from the Trade menu, its rail button or `widget.openPanel('depthLadder')`. A new switch, `dock.depthLadder`, takes its rail button away.
- The ladder's rows are 21 tall in the mono figures (26 in a narrow widget, for a finger): asks over bids with the spread between them on a dashed rule, each size on a bar grown from the price, its columns lined up row to row. The rows where your working orders wait carry their quantity, stamped in the side's colour and named by their side (a buy before the price, a sell after it); an order marks a row within half the market's price step of it.
- Its cells say their size and what a press does to a screen reader ("2, Sell @ 76,336.03"), and sizes are written short (`1.5k`, `0.5`). It draws only while open, keeps its buttons while only the sizes change (a press or the focus is never lost to a feed's update), and brings the spread to the middle of its own page without scrolling the page around the widget.
- Two new strings in all 30 languages (the open P&L, the spread).

### Fixed

- The order ticket and the account panel lost a figure's sign in a locale that writes other digits (Persian, Arabic): a loss read as a gain. A figure goes unsigned only when it reads as zero does, and is coloured by the sign it shows (a loss too small to show is "0.00", not a red one).

## 1.43.0 (2026-10-24)

React, Vue and Svelte components: 1.3.25.

### The order ticket

The order ticket and the Trade menu in the Print look, the second part of the trading round.

- **The ticket** is a dialog 480 wide that names the symbol beside its title. Buy and Sell are two large buttons, the chosen one filled with its colour. The type (market, limit, stop) and the time in force are choices in a row, moved through with the arrow keys, not selects.
- **− and +** beside the quantity and the prices (and the arrow keys in them) move them on a grid: a price by the market's step (the chart's `getPriceStep`; going down from a band's edge, by the band below), a quantity by a lot, or else by its own last digit (0.5 by 0.1). A value between steps lands on the next one; − stops at one step. A price from the chart starts rounded to that step and is written to its decimals: a click on the chart filled the price with a raw float (`75997.2844890925`). What is typed stays as typed, and is what Place sends.
- A **stop-loss or take-profit**, switched on, starts 1% or 2% from the entry as it is then, rounded as the chart rounds, and says under its name how far it is in percent and what it would make or lose for the quantity.
- **A receipt** under them sums the order up: its value, its risk, its reward and reward to risk, in the chart's mono type, money to the decimals of the price step (two at most) in the number locale, a futures contract's points times its multiplier (`contractMultiplier`). A stop or a target on the wrong side of the entry sums to nothing.
- Switching between buy and sell keeps a waiting order where it was put: a buy stop over the market becomes a sell limit (it showed an error). Place takes the side's colour; a market order's price row shows the market's price now. On a phone the ticket is a sheet above the keyboard.
- **The Trade menu** sets the panels (depth ladder, account) apart from the orders and brackets with a rule.
- On a phone the layouts dialog takes the sheet's whole width (it kept 480 px between 481 and 640 px).
- Six new strings in all 30 languages (the receipt's four, the −/+ buttons' names); `ticket.riskReward` is gone.

## 1.42.0 (2026-10-24)

React, Vue and Svelte components: 1.3.24.

### Orders and positions on the chart

The trading lines in the Print look, the first part of the trading round.

- **Tags at the right end of each line**, by the price axis: they no longer sit over the legend at the plot's left edge. Each is a small paper tag bordered in its line's colour, its first cell stamped in that colour:
  - an order: its quantity, its side and kind (`0.25` `Sell limit`), and × to cancel it;
  - a position: what is still open of it, its side and its open profit or loss, then ⇅ and ×;
  - a stop or a target: `SL` or `TP` and what the position would make or lose there, and × to remove it.
- Tags that would cover each other stand side by side, what is being placed nearest the axis, then positions, then orders; one that can't fit has no buttons, as it may lie under another.
- A press on an order's, a stop's or a target's tag drags that line, whatever line is nearer, and keeps it on the plot. A stop or a target being dragged shows where it is going: its line, what it would make, its price on the axis, a faint line where it was.
- A press between two buttons in a column (a finger's reach) takes the one it is on, not the neighbour drawn after it.
- **Prices on the axis** for stops and targets as well as entries and orders; the trading badges move apart when they would overlap (an order beside a stop hid its price), and the scale keeps clear of where they end up.
- An order to open with a stop and a target (`stopLoss`, `takeProfit`) shows them as dotted lines with what they would make.
- **Bracket placement** has the same tags: its side and reward to risk on the entry, the distance in percent on the stop and the target, their prices on the axis, and no knobs at the edge. Its bar sits at the foot of the chart (at the top while the replay bar shows), centred: its entrance animation undid its centring, so it started at the middle and ran off a phone's screen. It reads in the widget's direction, and its name gives way before Place does.
- `positionLabel` fills the position's tag after its quantity. Lines' buttons are icons of the set (new: `arrowUpDown`). A profit that rounds to nothing is "0.00", not "+-0.00".
- The trading page's examples call the real API (`setPositions`, `setOrders`, `modifyPositionIntent({ positionId })`, `setTradingConfig({ positionLabel, pnlThresholds })` with `pnl` stops), in six languages.

### Also

- **The watchlist opens when asked**: ChartWidget no longer opens it by itself on a widget 987 px wide or more. Every panel starts shut, on the rail; `widget.openPanel('watchlist')` opens one from code.
- **`MockAdapter`** ends its history on the timeframe's grid, so its ticks build the newest bar from the start: for up to a bar's length they were dropped, the price line moving while the bars stood still (and a host reading `getData()` saw a stale close). The forming bar keeps its open and grows its range.

## 1.41.0 (2026-10-24)

React, Vue and Svelte components: 1.3.23.

### The shortcut sheet, the command palette and layouts

The last of the widget's dialogs in the Print look.

- **The shortcut sheet** (`?`) is a dialog 610 wide with a search: find a shortcut by what it does or by its keys ("alt+g"). Each row says what it does, then its keys; a gesture (drag, double-click, pinch) is written as words, not drawn as a key. Groups keep together in two columns (one on a phone). The "Got it" button is gone: its foot says how to open it again. It gives the keyboard back to what opened it, and keeps its keys from the chart.
- **The command palette** (Ctrl/⌘+K) is a dialog like the symbol search: the widget's own commands first, then the drawing tools, chart types, intervals and indicators, each with its keys at the end of its row (`Alt+T`, `Alt+G`). The commands used last come first until something is typed, kept in this browser. Searching ranks the matches, the group with the best one first. New commands: symbol search, compare, go to, reset the view, invert the price scale, save the layout, the watchlist, alerts and objects panels, and the shortcut sheet; each is left out with its switch (or without a feed, layouts or a watchlist). A row shows only keys that work: none while its key switch is off, none once a shortcut you added with `addHotkey` takes them. Ctrl/⌘+K closes it again, and a search finds keys typed with a space or a plus ("alt g"). The keys stay in its search; an input method's Enter and Escape are its own.
- **Layouts**: the dialog is 480 wide with the dialogs' search row; the layout open is marked with a check and its name in ink (no "Open" tag), rename and delete show on the row in hand. The menu says Save's keys (Ctrl/⌘+S) while `hotkeys.save` is on.
- On a phone the palette and the layouts dialog are sheets that stop above the on-screen keyboard. In the palette and the symbol search, a row the arrows reach scrolls in below its group's heading, and "no results" is said to a screen reader.
- Three new strings in all 30 languages; `hotkeys.gotIt`, `common.navigate` and `common.select` (not used) are gone. The old palette's styles (`.tcw-cmd-*`) are gone.

## 1.40.0 (2026-10-24)

React, Vue and Svelte components: 1.3.22.

### The dock: the panels beside the chart

The watchlist, alerts, the object tree, the data window and the symbol info are panels of one dock beside the chart, in the Print look, no longer cards floating over it (the watchlist no longer a bar of its own).

- **A rail** at the outer edge has a button for each panel: it opens its panel in place of the one open, or shuts it when it is the one open. Each panel's close button shuts it too. The arrow keys, Home and End move along the rail, which always keeps a Tab stop on a button that shows. In a right-to-left widget the dock sits on the left.
- **The watchlist opens by itself** on a widget 987 px wide or more (610 for the chart, 377 for the panel), until a panel is opened or shut by hand.
- **The panel** is 296 px wide to start, from 233 to 377: drag its edge, or use the arrow keys, Home and End on it. The width is kept in this browser. It never takes more than 38.2% of its row: the chart keeps the rest.
- **Every panel has one header**: its title, its own buttons and a close button. The watchlist's title is its list's name and menu; its + is an icon now.
- **On a phone**, or a widget narrower than 641 px, there is no rail: a panel rises from the bottom over the chart, 61.8% of its height, above the on-screen keyboard and under the toasts; it starts shut and shuts on Escape, and a panel open as the widget turns narrow (a tablet turned) shuts. Alerts and the object tree open from the toolbar there; while the rail shows, the toolbar hides its buttons for them, its "more" menu too. When a panel shuts, the keyboard goes back to its rail button, or to its toolbar button, or to "more".
- The watchlist's sparklines are drawn again as its panel shows.
- **The charts of a `ChartWidgetGrid`** have no rail each, unless `widget.features` turns `dock` on.
- `widget.openPanel(panel)`, `widget.closePanel()` and `widget.getOpenPanel()`, with the type `WidgetPanel` (`'watchlist' | 'alerts' | 'objectTree' | 'dataWindow' | 'symbolInfo'`). `toggleSymbolInfo` opens and shuts it in the dock.
- New switches: `dock` (the rail) and `dock.watchlist`, `dock.alerts`, `dock.objectTree`, `dock.dataWindow`, `dock.symbolInfo` (its buttons); 132 in all. A panel whose switch goes off shuts.
- The icon set has `list` and `table`. The small buttons in the object tree's and the alerts' rows show their icons at their size (the browser's padding had squeezed them to 8 px).
- Two new strings in all 30 languages.

## 1.39.0 (2026-10-24)

React, Vue and Svelte components: 1.3.21.

### Symbol search, Compare and Go to

The three dialogs that find a place on the chart are rebuilt in the Print look, as the indicators dialog is.

- **Symbol search** is a dialog with a title, the search, and the results in columns: the symbol (left to right in any widget), its name, then its kind and exchange; the chart's own symbol is marked, for a screen reader too. It lists your `symbols` until something is typed, then asks the feed's search once typing pauses, as before; the rows stay on screen while the next search runs, and rows of the feed without a symbol are skipped. Results of more than one kind (stocks and crypto, say) can be narrowed to one with the chips over the list. The names a search told of are kept for the list the dialog opens with next time. The keys stay in the search field: up and down move through the list, Enter picks; while an input method composes, Enter, Escape and the arrows are its own. "Searching…" and "No symbols match" are said to a screen reader.
- **A letter typed on the chart** opens the symbol search with that letter in it, as a digit opens the interval field; on another script's keyboard, the Latin letter of the key's place. The dialog says so at its foot (not on a touch screen). `features: { symbolTyping: false }` leaves letters alone; a shortcut of yours on a plain letter (`addHotkey`) still comes first, and a key an input method is composing, or one typed with Alt Gr, is left alone.
- **A press elsewhere on the page** now leaves the keyboard to the page: the widget's keys (letters, digits, Alt+T and the rest) go to it again once it is pressed or holds focus. A press in one of its dialogs or menus counts as a press in the widget.
- **Compare** opens the same dialog, titled Compare symbol, with **Add as** under the search: percent change on this scale, the price on its own scale or in a pane of its own, the spread, the ratio, or the correlation of prices or of returns. A pick adds the symbol that way and the dialog stays open for the next (a held Enter adds once; a symbol picked again while its bars load is added once). What is compared already (overlays and the indicators that read another symbol) is listed first, under its own heading, each with its colour, its way and a button to take it off. The dialog opens next time on the way used last, and closes when `compare` is switched off. The menu of ways that followed a pick is gone.
- **Go to** is a dialog in the middle of the widget, no longer a popover over the status bar. **Date** centres the bar of a day and a time; **Custom range** shows the bars between two of them edge to edge (`chart.setVisibleRange`), starting from those on screen (on a Renko chart, its bricks). The month under the fields fills the date field in hand; after a range's start it moves on to its end. Daily bars and longer have no time to give, and days after today can't be picked; today is today in the chart's time zone. A date missing, or after today, is marked and the keyboard put on it.
- `chart.getVisibleTimeRange()`: the times of the first and last bars on screen (of the series drawn), or null without data.
- **On a phone** a dialog's sheet keeps its top on the screen when the keyboard opens: the symbol search, the indicators dialog, the chart settings and the rest.
- The month in a date field's calendar and the one in Go to are one piece, `MonthView`; a date field marked `data-tcw-calendar="inline"` keeps the widget's calendar popup shut.
- A dialog's tabs keep the case their words have (“Custom range”, not “Custom Range”).
- Twenty-one new strings in all 30 languages; the hotkey sheet lists A–Z. `compare.spread`, `compare.ratio`, `compare.correlation` and `compare.correlationLog` are gone (the menu that used them is).

## 1.38.0 (2026-10-24)

React, Vue and Svelte components: 1.3.20.

### A drawing's settings

A drawing's settings dialog is laid out as the indicator settings are, in the Print look: 480 wide, its tabs along the top, **Template**, **Cancel** and **OK** at the foot.

- **Style** has the line in one row (colour, width, dash), its ends, the fill and its opacity, then the tool's own switches as ticked rows and its choices, and the levels last, in two columns on a desktop. The **Properties** tab is gone: what it held is here.
- **Text**, for the tools that write: the text, across the dialog, and its size.
- **Coordinates**: a row per point, its price, date and time; on a phone the price above the date and time.
- **Visibility**: the intervals the drawing shows on, as an indicator's. A drawing kept to some intervals is not drawn, hit or selected on the others (nor along with its group), and a selected one leaves the selection when the interval changes to one it is not on. It is copied and pasted with its intervals. The object tree steps it back while it is off the chart's interval, and says why.
- **The Template menu** lists the templates saved for the tool and the plain ones (each with its delete button), saves the drawing's look as a template under a name it asks for, keeps the options as the tool's default, and resets them. The template list and the name field under the style are gone, and so is the dialog's Add alert link (the drawing's toolbar and its right-click menu have it).
- **Trend lines, rays and extended lines** have a middle point and stats when asked: the price's change and its percentage, the bars and the time between the two points, the angle. They show while the line is selected, or all the time, by its right end, its middle or its left end. A trend line's ends can be arrows.
- `DrawingState.intervals` (the same rules as `IndicatorIntervals`), kept in saved layouts; `chart.updateDrawing(id, { intervals })` sets them (null: every interval), `chart.addDrawing({ …, intervals })` starts with them, and `chart.isDrawingShown(id)` says whether a drawing is on the chart now. `DrawingManager.setTimeframe()` and `isShown()` in `@tradecanvas/core`.
- New options on `trendLine`: `leftEnd`, `rightEnd` (`'normal'` or `'arrow'`); on `trendLine`, `ray` and `extendedLine`: `showMiddlePoint`, `showPriceRange`, `showBarsRange`, `showDateRange`, `showAngle`, `alwaysShowStats`, `statsPosition` (`'left'`, `'center'`, `'right'`). All off by default: lines look as before.
- The line's colour carries to the levels and the fill that have none of their own as it is picked. Adding or removing a level keeps the keyboard there. In a right-to-left widget the arrow keys move the other way along the tabs of a drawing's and an indicator's settings.
- Nineteen new strings in all 30 languages; `drawingSettings.tab.options` is gone.

## 1.37.0 (2026-10-23)

React, Vue and Svelte components: 1.3.19.

### The chart's right-click menus

The menus on the plot, the price axis and the time axis are rebuilt in the Print look, grouped as a trader looks for them, with submenus and the widget's shortcuts.

- **The plot's menu** adds **Paste**, for the drawings copied here or on another chart of the page, and **Remove indicators** (a comparison with another symbol stays: it has its own dialog). Its entries come in groups: what to do at the price, the view, the drawings and indicators, then export and the settings.
- **The price axis's menu**: reset the price scale, auto scale, invert, the scale on the left; the four modes (regular, logarithmic, percentage, indexed to 100) as one choice, where log and percentage were switches back to regular; **Labels** (indicator values, the bar countdown) and **Lines** (high and low, the last price line) in submenus; an alert at the price; and the settings, open on their Scales tab.
- **The time axis's menu** adds the **time zone**, a submenu that opens at the zone in use.
- **Shortcuts in the menus.** An entry names the widget's key for it while that key is on: Alt+R reset view, Alt+I invert, Alt+G go to date. **Alt+R** is new: every bar in sight and the price scale fitted to them; the shortcuts sheet lists it.
- **Context menus** take radio entries, a shortcut written at the row's end, and submenus: a click, Enter, the right arrow or a pointer resting on the entry opens one beside it (on the other side when there is no room), the left arrow or Escape closes it, Tab closes every menu. In a right-to-left widget they open to the left, and the arrows swap. On a phone, where menus open from the bottom, a submenu's first row leads back. The wheel scrolls a long menu instead of closing it.
- New switches: `menu.chart.indicators`, `menu.chart.timezone`, `hotkeys.resetView` (125 in all).
- `chart.canPasteDrawings()` says whether `pasteDrawings()` would paste; `DrawingManager.canPaste()` in `@tradecanvas/core`.
- `chart.removeIndicators(ids)` removes several indicators as one undo step.

## 1.36.0 (2026-10-23)

React, Vue and Svelte components: 1.3.18.

### The chart settings, rewritten

The widget's settings dialog is laid out as the indicators dialog is, in the Print look: 776 by 610, half a step of φ wider than the indicators dialog, its tabs 233 wide down the side.

- **Tabs down the side**, each with its icon: **Symbol** (the chart type's own settings and colours, the main series, extended hours, the last price, the volume, the high and low), **Status line** (the legend and its colours), **Scales** (the scale mode, auto, invert, the left scale, value labels, the countdown, the time zone, the number format, the axes' colours), **Appearance** (background, panes, grid, crosshair, session breaks, handles), **Layers** (volume and market profiles, the depth heatmap, swings, session shading, prior levels) and **Trading** (orders, positions, signal markers, trade zones).
- **Cancel and OK.** Every change still shows at once. **Cancel**, Esc, the close button or a click outside put them all back; **OK** keeps them as one undo step, where each change was a step before. Only what the session changed goes back: a scale dragged by hand meanwhile stays.
- **The Template menu** saves the chart's look under a name (its switches and the colours that are set; not the time zone, the number format or auto-scale), applies or deletes a saved one, and resets to the defaults. Templates are kept in this browser.
- A context menu's entries can now be removable: a remove button on the row, and the Delete key. A context menu taller than the room scrolls.
- **Fixed:** a drag that began in a dialog and ended outside it (a slider, a text selection) closed the indicator settings, which now cancels; it doesn't any more. A toast raised over an open dialog shows above it.

## 1.35.0 (2026-10-23)

React, Vue and Svelte components: 1.3.17. 1.33.0 and 1.34.0 were not published on their own: their changes, "A new default look" and "A calmer chart" below, came out in 1.35.0.

### The Indicators dialog and the indicator settings

The toolbar's Indicators opens a dialog in place of the dropdown, and an indicator's settings are rewritten, in the Print look.

- **The Indicators dialog** searches every indicator by its name or short name as you type (Enter adds the best match), or lists a group picked down the side: **Favourites**, **Templates**, **All**, then each kind (moving averages, trend, oscillators, volatility, volume, bands and channels, price and patterns). A row adds its indicator and the dialog stays open for the next, with a count of how many are on the chart; the star beside it keeps it in the favourites (in this browser). The templates moved here from the old menu. On a phone the groups are a row of chips. The old menu's "Popular" list is gone.
- **Indicator categories** (`@tradecanvas/core`): `indicatorCategory(descriptor)` and `INDICATOR_CATEGORIES`; the 134 built-ins each have one, and a custom indicator can declare its own `category` (`IndicatorCategory` in `@tradecanvas/commons`).
- **An indicator's settings** have three tabs. **Inputs** as before. **Style**: a row per line, ticked where it is drawn, with its colours (up and down for two-tone ones) and its dash; the line width; an overlay's price scale; and the levels, which had a tab of their own. **Visibility**: the intervals it shows on.
- **Cancel, OK and Defaults.** Every edit still shows at once; **Cancel** (or Esc, the close button, a click outside) puts back everything changed since the dialog opened, and **OK** keeps it. The whole edit is one undo step, and a Cancel leaves none (`chart.beginIndicatorEdit(id)` and `endIndicatorEdit()` do this for your own dialogs). **Defaults** resets the inputs, the lines, the levels and the intervals, or saves the default for new indicators of the kind, in this browser: the inputs changed from the indicator's own (not a line of another indicator) and what was picked of the look; colours the chart gave stay its to give, so a second one still gets a colour of its own.
- **On some intervals only.** `chart.setIndicatorIntervals(id, { minutes: false, hours: [1, 4] })` keeps an indicator to some intervals of the connected stream (`null`: all); `getIndicatorIntervals` reads them back. For bars given with `setData`, `chart.setDataTimeframe('1h')` gives the chart their interval (the legend's title line names it too); ChartWidget does this itself. A range up to its unit's top (59 minutes, 24 hours…) runs on past it, so `minutes: [5, 59]` shows on 90m too. They are saved with the layout and undone like other edits, and `indicatorChange` reports them as `'intervals'`. `getActiveIndicators()` now says whether each is `shown`; the widget's legend greys out a row while its indicator isn't drawn on the interval.
- **Fixed:** on a phone, a dialog's tabs cut off the text of the tab picked; they are taller now instead of padded.
- **Fixed:** Tab left a dialog from a control Tab skips over (a row's star); it wraps to the dialog's first control now.
- `chart.isIndicatorAllowed(id)` says whether `addIndicator(id)` may add one (`features.indicators`, `features.indicatorIds`); the Indicators dialog lists only those, and the command palette now lists the chart's indicators, your own included.
- Compare's own indicators (`compareSymbol`, `spread`, the correlations), which need a second symbol, stay out of the Indicators dialog; `SYMBOL_INDICATOR_IDS` (`@tradecanvas/core`) names them.

### The widget's bars, rearranged

The toolbar, the drawing tools, the status bar and the toolbar over a selected drawing are laid out as a trader expects to find them, in the Print look.

- **The interval menu** lists each unit under its heading (ticks, seconds, minutes, hours, days, weeks, months); the pinned intervals stay as buttons, and the star on each row still pins.
- **The chart type** shows as its icon, its name in the tooltip.
- **Compare** sits beside Indicators where the widget has a data adapter to ask for the other symbol: it asks for a symbol, then how to compare it.
- **Undo and redo** move from the drawing tools to the toolbar, each off while there is nothing for it. `sidebar.undo` and `sidebar.redo` still switch them off. They now show where the drawing tools are off too; `toolbar.undo` and `toolbar.redo` take them away there.
- **One Trade menu** gathers a new order, the long and short brackets, the depth ladder and the account panel, the open panels ticked; each entry keeps its own switches, and the menu goes when nothing is left in it. The ladder now says when its own × closes it.
- **The drawing tools' menus** name each tool's shortcut (Alt+T) and have a star on each row to pin it, in place of the right-click hint (right-click and the menu key still pin). **Lock all** and **hide all** join clear all, each showing whether every drawing is and undoing it next.
- **The status bar** has a clock in the display time zone that opens the zones to pick from (the one in use ticked), and **%**, **log** and **auto** switches for the price scale, which go through the settings and follow a drag on the axis. It no longer repeats the symbol and interval: the legend's title line names them.
- **The toolbar over a selected drawing** has a grip: dragged, it stays where it is dropped for the next drawing; a double-click on the grip puts it back.
- New switches: `toolbar.compare`, `toolbar.undo`, `toolbar.redo`, `toolbar.trade`, `sidebar.lockAll`, `sidebar.hideAll`, `statusBar.clock`, `statusBar.scale` (122 in all). `statusBar.symbol` has nothing left to switch.

### A calmer chart: room for volume, tidy figures, fewer tags

The chart keeps out of its own way: the candles stay clear of the volume, the axis writes no more digits than it needs, and the tags that used to pile up on the price axis are off or out of the way.

- **The volume band.** Volume keeps to a band along the bottom of the plot, φ^-4.5 (about 11.5%) of its height, and the fitted price scale keeps the candles above it, with a gap of φ^-7; above the highest high it leaves φ^-5 (9%). With no volume on view, turned off (`features.volume: false` too) or none in the bars, the candles take the band back; on an upside-down scale the band stays at the screen's bottom. The scale fits the bars, the overlay indicators and the compare lines in one pass. `fitPriceRange` in commons; `Viewport.setScaleMargins` and `fitToPrices` in core.
- **Tick labels in the decimals their step needs**: ticks on a 500 step read 73,500 rather than 73,500.00, and one column of ticks shares one count of decimals. The last price, the crosshair and the tags beside the axis keep every decimal.
- **Order, position and alert prices are written as the axis writes them**: grouped in the chart's number locale (72,202.13 where they read 72202.13), at the market's or symbol's precision, else the axis's own, so a sub-cent coin's tags read 0.00000435, not 0.00 (`priceTagText` in commons; `DEFAULT_TRADING_CONFIG` no longer sets `pricePrecision: 2`). Trade zones' entry prices too. An order's axis tag carries the price alone, so it no longer runs off the axis; its line label names the kind and quantity (`LIMIT 3`). P&L in the position label is grouped too.
- **Indicator value tags are off by default** (`features.indicatorValueLabels: true` or the widget's settings turn them on): the legend shows the values.
- **The bar countdown hangs under the last-price tag**, in its colour, where it used to sit at the bottom of the plot; the scale's labels and the value tags keep clear of it, and the crosshair's pill draws over it. It shows with the tag (`BarCountdown.render` takes the tag as a last argument). Tag text takes a dark or light ink to suit the tag's colour.
- **The crosshair's price and time pills clear the axis labels they would half cover**, so a pill reads alone instead of over a cut-off number.
- **A title line in the legend**: the symbol, interval and exchange (from the stream and the symbol's details; `setSymbolName` still names it yourself) open the line that carries O, H, L, C and the change. On a narrow plot, as on a phone, the line wraps instead of running off the chart, and without a title it leaves no blank line.
- **The zoom and scroll buttons show only near the plot's bottom edge** (or while one has the keyboard's focus), out of the way of the data; a held scroll keeps going if the pointer drifts.
- The symbol info panel's view and its news loading moved out of `ChartWidget.ts` into a module of their own; every news load is now the latest one.

### A new default look: Print, kept to the golden ratio

The chart and the widget start in a new look, Print: paper and ink, a quiet ground with colour only where it means something, and proportions taken from the golden ratio.

- **The chart's themes.** Dark is warm ink on an off-black (`#131416`), light is ink on an off-white paper (`#fbfaf6`); neither is pure black or white, so text doesn't glare. Candles are a deeper green and red, and the line and area charts are drawn in ink.
- **Volume in one neutral ink**, lighter under falling bars, since the candles above already show the direction. It stays neutral when you, the widget's settings or a market's colours change the candles: `setMarket({ colorScheme })` and `createVNTheme` now recolour only the candles. `resolveVolumeColors` follows the candles only for a preset that colours its volume (Terminal). `volumeColor(candle)` still gives candle-coloured bars.
- **Figures in a monospaced face** (Cascadia Mono, SF Mono, Menlo or Consolas, nothing to load): the axes, the price legend, the tags and the indicator rows line up in columns, and drawing labels take it too. The chart's type is 11, 13 and 15 px.
- **The crosshair is an opaque grey**, 3:1 on the ground, so the bar tint and the Market Profile's POC line drawn in it keep their strength; the POC figure is in the text colour. Axis pills and the finance charts' tooltips sit a step off the ground (`axisLabelBackground`).
- **Solid hairlines**: the crosshair and the last-price line are solid by default (they were dashed); `crosshair.*.style` and `lastPrice.style` still take `dashed`.
- **The widget's `print` preset**, now the default (`ui: 'studio'` brings back the earlier look): hairlines, 3 px controls, 5 px menus, 8 px dialogs, capital labels, rules between the toolbar's groups, flat bars, a chosen button in solid ink and a chosen tool in ink blue. The accent is ink blue in both themes; fields are white boxes on the paper.
- **The golden ratio.** Print's sizes climb in half steps of φ from the icon (16, 20, 26, 33, 42 px). Spacing and corners are Fibonacci numbers (`--tcw-space-1` to `--tcw-space-7`: 2 to 34 px), and a menu's rows have the menu's corner less its padding (`--tcw-menu-pad`, `--tcw-menu-item-radius`), so the curves run parallel. Type climbs a third of φ at a time, so a dialog's title is φ times its text (10, 11, 13, 15, 18, 21 px; never under 10). `PHI`, `FIBONACCI` and `phiStep` come from `@tradecanvas/commons`.
- **Type sizes in every look follow that scale**: `--tcw-font-size-sm` and `-xs` are a third and two thirds of φ under the body (11 and 10 px at 13), where they were 1 and 2 px under; `--tcw-font-size-xl` and `--tcw-font-size-display` are new. Menus, buttons and tabs are set at the body size, tooltips at the small one.
- `density: 'compact'` and `'spacious'` move Print's sizes half a step of φ down and up; Studio, Terminal and Capsule keep their earlier compact and spacious sizes.
- **The base parts change in every look**: flat toolbar and drawing tools (no gradient or shadow), menus with 3 px of padding and rows whose corners nest inside the menu's, Fibonacci spacing in menus, dialogs and tooltips, and menus, buttons and tabs at the body size. Pass `ui: 'studio'` for the earlier look's corners, sizes and type.
- The price legend and the indicator rows take the look's figures face, at one size.
- A dialog's backdrop is blurred only in a look that blurs (`ui.blur`).
- `TC_PALETTE` `up`, `blue`, `ochre` and `violet` are a little deeper, to keep 3:1 on the paper.

## 1.32.0 (2026-10-23)

### An MCP server for coding agents

- **`@tradecanvas/mcp`**, a new package: an MCP server that a coding agent (Claude Code, Cursor, Claude Desktop and others) starts with `npx -y @tradecanvas/mcp`, so it looks TradeCanvas names up instead of guessing them. Seven read-only tools answer from a catalog generated from the library's own code: the indicators with their params and line keys, the drawing tools with the points each takes, the options of `ChartWidget`, `Chart` and `ChartWidgetGrid`, the feature switches and the style keys.
- **`validate_options`** checks an options object before it is used: unknown names with the one likely meant (and where an option of another entry point goes), values outside the allowed ones, numbers given as strings, intervals, feature switches, style overrides and languages, nested options included. Intervals and style overrides are read by the library's own readers.
- The Getting started docs have a section on working with a coding agent: the skill, the MCP server and the llms files.
- The docs counted 112 feature switches; the widget has 114.

## 1.31.0 (2026-10-23)

### Form controls, one quiet look

The widget's fields, lists and pickers were the browser's own: heavy boxes, a thick ring on focus, a plain grey list under every select and the system calendar under every date. They now share one look, drawn from tokens.

- **Fields** (alerts, settings, the order ticket, go to date, an indicator's inputs) have a faint fill and a hairline, a firmer line on hover, and on focus the line takes the accent, with no ring around it. A wrong value stays red under the pointer and in focus. Number steppers show only on a field in use.
- **Selects open the widget's own list**, in its overlay layer above any dialog: a check on the chosen row, groups as headings, disabled rows greyed, the arrow keys, Home, End, Enter, Escape and typing a few letters (spaces too). The select stays the browser's `<select>`, so values, events and forms work as before.
- **Date fields open the widget's own calendar**: a month with arrows, weeks from the day the language starts them, today underlined, days outside a field's `min` and `max` greyed and out of the keys' reach, and a Today button. Typing the date stays. Firefox keeps its own calendar.
- **Checkboxes, radios, sliders and switches** are drawn to match, and **scrollbars** are thin and rounded, a thumb on no track, in both themes.
- **On a touch screen** the phone's own wheel and calendar open, which suit a thumb better.
- The look comes from `--tcw-field-*`, `--tcw-check-line` and `--tcw-scroll-*` variables, set for the dark and the light theme (Styling docs).
- A list that opens above its button (one near the bottom of the window) no longer lands off screen.
- A new price alert starts at the price as the chart shows it, not every digit of the last close.

## 1.30.0 (2026-10-21)

React, Vue and Svelte components: 1.3.12.

### The widget on a phone

On a phone the widget's toolbar ran off the screen: past the intervals, the chart type, indicators, alerts, settings, replay and the order buttons could not be reached, and their menus opened off the side. Now the widget lays itself out for its own width.

- **A narrow widget** (below 641 px wide: a phone, or a narrow column of a wide page) keeps the symbol, the interval, the chart type and the indicators in its toolbar, as icons, the interval as one button naming it. Everything else goes under a **"more"** button, in order, with what is switched off left out.
- **A toolbar that doesn't fit** at any width (a tablet, a window pulled narrower) folds its right-hand buttons under "more" one at a time, from the right, only as many as it must; when even that isn't enough, the menus show their icons and the interval buttons give way to the interval menu. It fits itself again as the width changes, and "more" lists just what is folded. A host's own buttons on the right fold with them.
- **The toolbar's menus open over the page.** The interval, chart type and indicator menus used to open inside the widget, so a short widget cut them at its bottom edge and its own panels (replay, alerts, the ladder) could cover them. They now open in the widget's overlay layer, below their button or above it when there is more room, and close when the page scrolls.
- **The drawing tools** wait behind a round button over the chart, which shows the tool picked. It opens the sidebar over the chart; a tap on a group opens its tools, and picking one (or the eraser, the zoom tool, the style panel) closes the sidebar for the chart.
- **Menus open as sheets from the bottom** on a phone screen (a window under 641 px wide): the toolbar's menus, the "more" menu, a drawing's or the chart's menu (a long press), in reach of a thumb, never off screen, above the on-screen keyboard, with 44 px rows.
- **A grid** shows one chart at a time when narrow, with a tab for each naming its symbol and interval.
- Menus now close on a tap on the chart, which makes no mouse events.
- A chart with no size (a grid's tab not shown, a collapsed panel) no longer pages back through the whole history of its feed.
- **Docs: in a phone app.** The viewport, the app's lifecycle (React Native, Capacitor), `pageScroll`, Tauri's content security policy and the chart's memory.

## 1.29.0 (2026-10-21)

React, Vue and Svelte components: 1.3.11. 1.28.0 was not published on its own: its changes, "Lighter on phones" below, came out in 1.29.0.

### Everything by finger

A finger now does on the chart what the mouse does, and a chart on a scrolling page can leave the scroll to the page.

- **Drawings by touch.** With a tool picked, tap its points, or press, drag and lift to draw a two-point line in one go. A drawing is selected, moved and reshaped by its handles with a finger, and a long press on one opens its menu, as a right-click does. The eraser takes drawings by touch too.
- **Taps and double taps.** A tap is a click (`click`, `barClick`, signal markers); a double tap is a double-click: it resets an axis, or opens a drawing's settings.
- **Lines by touch:** price alerts, order and position lines, a bracket's or an order draft's handles, and pane dividers drag with a finger.
- **A finger reaches further** than a mouse: about 16 px to a line and 22 px to a handle, against 8 (`TOUCH_REACH`).
- **`pageScroll`** (option and `setPageScroll`): a one-finger vertical swipe and the plain mouse wheel scroll the page; the chart pans with a sideways swipe and zooms with two fingers or Ctrl + wheel (a trackpad pinch). Presses on drawings, lines and axes stay the chart's.
- A chart that neither pans nor zooms leaves page scrolling and zooming alone, and the wheel too.
- A touch the browser takes back (`touchcancel`), or a second finger landing for a pinch, calls the press off: no click, no coast, a dragged order or bracket line goes back where it was without an `orderModify`, and a drawing's point the press just placed is taken back. The browser's own long-press menu stays shut over the chart.

### Lighter on phones

Measured with the new phone run of the render benchmark (`node scripts/bench-render.mjs --mobile`: 390 × 844 at 3x, the CPU slowed 4x, an integrated GPU), one chart with four indicators: drawing the scene 34 → 25 ms, a live feed at two ticks a frame 18.5 → 11–13 ms, canvas memory 17.1 → 7.6 MB.

- **A pixel ratio of 2 at most** (`maxPixelRatio`, `setMaxPixelRatio`, `getMaxPixelRatio`; `Infinity` for the screen's own): a 3x phone screen has 56% fewer pixels to draw, for lines barely softer. A change of ratio with the size the same (a window moved to another screen, the page zoomed) now resizes the canvases too. The finance charts take the same cap.
- **No frames no one sees.** The chart stops drawing while it is off screen or the page is hidden, and its live ticks stop refitting the scales; it draws once what changed when it comes back, and a screenshot taken meanwhile draws first. Data, indicators and alerts keep up (`pauseWhenHidden`, on by default). An app embedding it in a WebView pauses it with `suspend()` and `resume()`; `isSuspended()` says whether it draws.
- **Indicators once a frame on a busy feed.** A live tick recalculates the indicators before the next read of a value (the frame, an alert, the legend) rather than at once, so two ticks a frame cost one recalculation (`IndicatorEngine.deferRecalculateFrom`, `flush`).
- **Back from sleep.** When the page comes back into view or the network comes back, a stream silent for more than 20 seconds reconnects at once instead of waiting up to a minute and a half for its heartbeat; a retry waiting out its backoff goes now, and one that gave up gets a fresh round (`StreamManager.wake`). A connection that drops schedules one retry, where the adapter's own disconnect and the heartbeat could each start one.
- A destroyed chart gives its canvas memory back at once, which keeps charts mounted and unmounted in an app from adding up on iOS.
- Momentum after a flick keeps time, so it coasts as far and as long on a 120 Hz screen as on a 60 Hz one, and stops where the finger left for someone who asked for less motion.
- **The widget on a phone:** its watchlist and market timers skip a hidden page; bottom sheets sit above the on-screen keyboard (and stay at the bottom of a pinch-zoomed page); inputs are 16 px on touch screens, so iOS doesn't zoom the page; heights use dynamic viewport units; taps lose the grey flash; phone sheets fit the screen's width, borders included (they ran 2 px over); the connected dot pulses three times, not for ever.
- **React, Vue and Svelte:** React swaps its crosshair listener instead of adding one on every render; Vue and Svelte feed a bar pushed onto the same array, or a change to its last bar, as a live tick (`appendBar`, `updateLastBar`) rather than reloading the series, so the view stays where the user left it and only the end is recalculated; a new array is still a new series. Vue no longer walks every bar on each change, Svelte now sees bars pushed onto `$state` data, and both pass plain bars rather than their proxies.

## 1.27.0 (2026-10-21)

React, Vue and Svelte components: 1.3.9.

### One icon set, no emoji

- **Icons, not emoji.** The alert line's label and the alert notice drew a bell emoji, the pinned tooltip a pushpin, trade zones ▲ and ▼, a favourite drawing tool ★, the palettes ⌕, ✓ and ⏎, close buttons ×, and the replay bar its own filled glyphs (now outlined, as the rest of the set). Emoji and symbol characters look different on every system and font; all of these now come from the TradeCanvas icon set, drawn the same everywhere at 1.75 px strokes on its 24 px grid.
- **The icon set moves to commons** (`UI_ICONS`, `DRAWING_TOOL_ICONS`, `CHART_TYPE_ICONS`, `iconSvg`), so the chart's own canvas draws it too: `drawIcon(ctx, icon, x, y, size, color)` in core. New icons: pin, search, enter, step back and step forward.
- **`widget.toast(message, kind, icon)`** takes an icon's name, shown before the text.
- A test keeps emoji and symbol characters out of the sources.

### Long ranges

- **The range bar shows all of a long range.** A bar slot is never narrower than 0.25 px, so 5Y of daily bars, or All on decades of them, showed only the newest part. In the widget, a range the bars can't fit at 2 px each now switches to the timeframe they can: 5Y of days to weeks, All to months, a year of hourly bars to days. A short range goes back to the timeframe the user picked, and never finer. It only switches to timeframes the feed serves, or the bars on hand resample to; `features: { 'statusBar.rangeTimeframe': false }` keeps the timeframe.
- **`minBarUnit`** (a chart option, or `setMinBarUnit` / `getMinBarUnit`) lets bar slots go from 0.25 px down to 0.02 px, so on a bare chart `fitContent`, zooming out and the 'All' range fit a long series, drawn a pixel column at a time. `MIN_BAR_UNIT_LIMIT` is exported.
- The Vietnamese price limits are checked against integer arithmetic for every reference price from 1,000 to 300,000 dong on HOSE, HNX and UPCOM, and the VN30 futures, so a limit that falls exactly on a price step can't be rounded a step off.

## 1.26.0 (2026-10-21)

React, Vue and Svelte components: 1.3.8.

### Axes that read at every zoom

- **Time axis labels by the calendar.** The axis labels the bars that start the largest calendar steps: a new year (in bold), a quarter or month, a day, a round hour or minute, at least 80 px apart, as `2024`, `Mar`, `15`, `13:00`. At 5Y it reads `2022 · Jul · 2023 · Jul`; on hourly bars over years it still shows the years, which it never did. The labels belong to bars, not to the screen: they move with their bars when panning and stay where they were when history is loaded in front, where they used to jump. Month names follow `setNumberLocale`; bars within a minute show their seconds (`13:05:30`), and labels wider than the spacing (a long month name, a formatter's own text) give way instead of running together. A time formatter now hears `kind: 'year' | 'month' | 'day' | 'time'`; `'date'` is no longer given by the axis (deprecated): a daily bar's label is `'day'`, `'month'` or `'year'` by the step it starts.
- **The grid follows the labels.** Its vertical lines are at the time axis's labels and its horizontal lines at the price scale's, on the 2D grid and the GPU's alike; they could fall between them before.
- **Price labels fit the height.** The price scale and the indicator panes fit as many labels as their height does, at least 30 px apart: a short pane no longer stacks eleven labels, a tall chart no longer shows eight.
- **Log scale.** Its labels step with the price, so the lower part of the scale is labelled as well as the top (from 100 to 120,000 only the top quarter was, with labels overlapping). Autoscale pads a log scale by ratio (`padPriceRange`), so a series that rose more than about 13 times no longer drops to a linear scale when the padding went below zero.
- **Percent and indexed scales** label round percents (`-5.00%`, `0.00%`, `+5.00%`) and round index points from the baseline, not prices turned into odd percents.
- **Session breaks zoomed out.** Their lines keep 6 px apart, the less significant giving way, and their labels (years, then months, then weeks) no longer pile up into a smear.

## 1.25.0 (2026-10-21)

React, Vue and Svelte components: 1.3.7.

### Dates on the time axis

- **Right dates far back in history.** A series' time unit, milliseconds or seconds, is now decided once from its newest bar (`barTimeUnit(data)`) instead of guessed for each time. Millisecond bars before September 2001 are below 1e12 and were read as seconds, so after a 5Y view a scroll back dated them around the year 32,000: on the time axis, the crosshair, the tooltips, the measure tool, session breaks, data export and CSV import. `barTimeUnit` and `MS_TIME_THRESHOLD` are exported, and `normalizeBarTime(time, unit)` takes the series' unit.
- **The time axis** leaves the space before the oldest bar unlabelled (the bars there are not loaded yet), and shows the date wherever the date changes: a label a month later on the same day of the month showed only a time.
- **Times before the oldest bar** (the crosshair, drawings placed there) follow the average spacing of the first bars, weekends and nights included, so 50 daily bars back is about ten weeks, not 50 days.
- **Renko, Kagi, Point & Figure and Line Break**: `setVisibleRange`, the zoom area and `fitContent` work on the bricks shown, not on the bars under them, and the crosshair reads the brick under it: on these types `crosshairMove` now gives the brick and its index in the series drawn (it gave the data bar at that index, which was another bar). Heikin-Ashi and the other one-bar-per-bar types still give the data bar.
- **The legend's change on hover** is from the bar before the hovered one; it was from the series' last bars.
- Drawings saved in seconds before 2001 no longer pass for old bar-index anchors.
- A bar or tick in the other unit than its series (a stream in milliseconds on bars in seconds) is stored in the series' unit, so it can't make the series read as that unit.

## 1.24.0 (2026-10-21)

React, Vue and Svelte components: 1.3.6.

### Drawings and the legend

- **A toolbar over the selected drawing.** Clicking a drawing in the widget shows a small toolbar right over it: colour, line width and line style, then settings, an alert on its line, lock, the full drawing menu and delete. Nothing hides behind a right-click any more. With several drawings selected it sits over all of them and changes each. It follows the drawing while it is moved, panned, zoomed or rescaled, steps aside while a drawing tool, the eraser or the zoom area is on, goes when nothing is selected, and works with the keyboard (one tab stop, arrow keys along it and through the pickers, Escape back to it). Colours, widths and line styles from saved layouts are checked before they are shown. `features: { selectionToolbar: false }` turns it off.
- **`chart.getDrawingRect(id)`** gives the box a drawing covers on screen, cut to the plot (lines across the whole plot span it), or null when it is hidden or off screen: for hosts that put their own controls or notes over a drawing.
- **The OHLCV legend** takes a `fontFamily` (`chart.setLegend({ fontFamily })`, the theme's font by default). Its volume and indicator rows are drawn at the OHLC size, and each value keeps its place while its digits change width, so the row no longer jitters on live ticks. In the widget the legend follows the look's font, at the size of the indicator rows listed under it.

## 1.23.0 (2026-10-21)

React, Vue and Svelte components: 1.3.5.

### Candlestick patterns

- **`detectCandlePatterns(bars, options)`** finds 64 patterns of one to five bars, each on the bar it ends on: dojis, hammers, shooting stars, marubozu and belt holds; engulfing, harami, piercing line and dark cloud cover, tweezers, kicking, counterattack, necks and separating lines; morning and evening stars, abandoned babies, three white soldiers and black crows, three inside and outside, two crows, tri-stars, tasuki gaps, stick sandwich, advance block; three-line strikes, rising and falling three methods, mat hold, breakaways, concealing baby swallow, ladder bottom. Reversals count only after the trend they reverse; bodies are long or short against the average body before. `CANDLE_PATTERNS` lists them with names, short labels, direction and kind.
- **The `candlepatterns` indicator** (134 indicators in all) draws an arrow under each bullish pattern and over each bearish one, with its short name once the bars are wide enough; a live bar recomputes only the last bars. Reversals, continuations and indecision can be turned on and off.
- Docs: the Indicators page in six languages; a Feature Lab scene on Vietnamese stocks with the patterns, the Psychological Line and Volume Ratio.

## 1.22.0 (2026-10-21)

React, Vue and Svelte components: 1.3.4.

### Indicators from Asian price boards

22 more indicators, 133 in all, in the widget's indicator list too:

- **Sentiment and volume**: Psychological Line (`psy`, with 25 and 75 marked) and New Psychological Line (`newpsy`), Volume Ratio (`vr`), AB Ratio (`abratio`, A and B lines), Intraday Intensity in percent (`iii`), Volume vs Average (`volpct`), Volume Change (`volchange`, each bar coloured against the one before), Trade Value (`tradevalue`, close × volume as an estimate of the value traded), Negative and Positive Volume Index (`nvi`, `pvi`, with an EMA signal).
- **Trend and momentum**: Sonar with its signal (`sonar`), Sigma, the close in standard deviations from its average (`sigma`), Binary Wave, four trend votes from −4 to 4 (`binarywave`), Smoothed Rate of Change (`sroc`), Vertical Horizontal Filter (`vhf`), R-Squared (`rsquared`), Random Walk Index (`rwi`), True Range (`tr`).
- **On the price pane**: Time Series Forecast (`tsf`), Weighted Close (`wclose`), the DeMark projected high and low for each bar (`demark`), and a moving-average Rainbow of up to 20 lines from a first period by a step (`rainbow`).

### Counter-clock chart

- **`CounterClockChart`**: average price against average volume, bar by bar, joined in time order and fading with age, with no time axis. `getPhase()` and `counterClockPhase(points)` name the last move's direction in eight phases, counter-clockwise from volume rising; `counterClockPoints(bars, period)` gives the points. Tooltip, `onPointClick`, a screen-reader label, dark and light themes.
- Docs: the Finance charts page and the Indicators page in six languages; the site's finance section shows the chart.

## 1.21.0 (2026-10-21)

React, Vue and Svelte components: 1.3.3.

### Charts for dashboards

- **`BarChart`**: values by category, series side by side (`mode: 'grouped'`) or stacked with positives up and negatives down from zero, upright or sideways (`orientation: 'horizontal'`), coloured by sign for net flows (`colorBySign`), values on the bars (`showValues`). Hovering a category shows each series' value; `onBarClick` gets the category, series, value and index. Labels that don't fit along the bottom show every few categories.
- **`DonutChart`**: parts of a whole clockwise from twelve o'clock, a pie with `innerRadius: 0`, a caption and figure in the hole, each slice's share where it has room, a legend beside or under the ring; `onSliceClick`.
- **`ScatterChart`**: points on two value axes, bubbles whose area follows `size`, axis titles, labels, lines at zero; the axes leave room for the largest bubble; `onPointClick`.
- **`HistogramChart`**: values counted into bins (`bins`, `binWidth` on a grid from 0, or Sturges' rule), coloured by sign, with labelled marker lines (a mean, a VaR) that move a row down when they would overlap. `histogramBins(values, options)` is exported, and `niceScale(min, max)` for axes of your own.
- All four follow the pointer with a tooltip, describe themselves to screen readers (an image role and a label, `ariaLabel` in your words) and draw in the dark or light theme; `setOptions`, `update`, `setTheme`, `destroy`. The other finance charts' canvases get the image role and `setLabel` too.
- **`CalendarChart`**: a value a day, `YYYY-MM-DD`, in week columns and weekday rows, a calendar year to a band and ten years at most (the oldest give way on a short chart); Monday to Friday with `weekdays: 5`, weeks from Sunday with `weekStart: 0`, month and day names in `locale`, a colour bar under it; `onDayClick`.
- **`MatrixChart`**: a coloured value for each row and column, square cells with the value printed where it fits, column names turned when they don't fit, half of a square matrix with `triangle: 'lower' | 'upper'`; `onCellClick`. `correlationMatrix(series)` gives Pearson correlations, pairing the positions both series have.
- **Market map by sector**: `HeatmapChart`'s `grouped: true` gathers cells by `group`, each group in a tile sized by its weights under its name and weighted change. The heatmap now describes itself to screen readers too (`ariaLabel` in your words).
- `ColorScale` is a type of its own, shared by the heatmap, calendar and matrix; a colour left out keeps the chart's default (the theme's up and down colours on the newer charts).
- Docs: the Finance charts page rewritten in six languages with the classes as they are (it showed renderer classes that don't exist), with the calendar, the matrix and the sector map; the site's finance section shows all seven new charts.

## 1.20.0 (2026-10-21)

React, Vue and Svelte components: 1.3.2.

### Vietnamese markets

Checked against the exchanges' rules of May 2025: the HOSE trading rules of 26 April 2025 and the HNX, UPCoM and VN30 futures rules.

- **Price steps by price band**: `MarketConfig.priceSteps: [{ from, step }]`. HOSE shares step 10 dong below 10,000, 50 dong to 49,950 and 100 dong from 50,000; `priceStepAt(price, market)` and `roundToPriceStep(price, market, 'nearest' | 'down' | 'up')` read them.
- **Ceiling and floor as the exchanges set them**: `computePriceLimits` rounds the ceiling down and the floor up to a valid price; a limit that would land on the reference moves one step off it, and a reference of one step keeps the floor there. `chart.getPriceLimits()` gives the day's prices.
- **Presets**: `MARKET_HOSE` (±7%, lots of 100, sessions from the 9:00 opening auction to the 14:30 closing one), `MARKET_HOSE_ETF` (ETFs and covered warrants, 10 dong at every price), `MARKET_HNX` (±10%, a closing auction and a post-close session to 15:00), `MARKET_UPCOM` (±15%, continuous trading 9:15–11:30 and 13:00–14:30) and `MARKET_VN30F` (VN30 index futures: 0.1 a point, ±7%, 100,000 dong a point, from the 8:45 opening auction). Each names `timeZone: 'Asia/Ho_Chi_Minh'`. Prices are in thousands of dong, as price boards show them; `scaleMarketPrices(MARKET_HOSE, 1000)` reads them in dong.
- **VN30 futures**: `vn30fLastTradingDay(year, month, isHoliday?)` (the third Thursday, earlier when that is a holiday) and `vn30fContracts(now)` (this month's, the next, and the last months of the two quarters after: `VN30F2611`…).
- **Sessions on the exchange's clock**: `getCurrentSession(sessions, now, timeZone)`, by the time of day (weekends and holidays are the caller's); without a zone it reads this computer's clock, as before, and a zone it doesn't know gives null. Sessions can be `postClose`, and markets `futures`. The chart's session shading still comes from `setSymbolInfo`.
- **The chart follows the band**: with a market set, `chart.roundPrice` and `chart.getPriceStep(price?)` use the step of the price's band (at the last close without a price), so prices from the chart's menus and the "+" by the price axis are valid ones. A symbol's `minTick` still comes first.
- **Order ticket**: with a market set, the widget's ticket keeps the price, stop-loss and take-profit on the market's step and the order's price between the day's floor and ceiling, starts at one lot, and above one lot takes whole lots (fewer shares are an odd-lot order of their own). The three messages are in the widget's 30 languages.
- Docs: the API page's Markets section and the Trading page, six languages; a Feature Lab scene with HPG, FPT and a VN30F contract.

### Looks different after the update

- `VN_COLORS` and `createVNTheme` use the price board's colours: green up, red down, purple ceiling, cyan floor, yellow reference. They were red up and blue down.
- `MARKET_HOSE` trades in lots of 100 (it said 10), HNX and UPCoM start continuous trading at 9:15, and UPCoM has no closing auction.
- `MARKET_NYSE`'s after-hours session is `postClose` (it was `preClose`), and the preset names `timeZone: 'America/New_York'`.

### Fixes

- `chart.setPriceLimits` changed the market object it was given, so every chart sharing a preset got the same reference price. It now keeps its own copy.

### Project

- **npm provenance**: releases are published with provenance, so npm shows the workflow run that built each version.
- SECURITY.md names the supported releases as the latest 1.x of each package, instead of version numbers that went stale.

## 1.19.1 (2026-10-20)

React, Vue and Svelte components: 1.3.1.

- **Preview builds**: every pull request and every commit on `main` is published to [pkg.pr.new](https://pkg.pr.new) (`npm install https://pkg.pr.new/@tradecanvas/chart@<pull request or commit>`), so a change can be tried before it is released.
- **Shorter READMEs**, in all six languages: what the library does, install, a quick start, frameworks, and links into the docs, which keep the API in detail. The npm page follows.

## 1.19.0 (2026-10-20)

React, Vue and Svelte components: 1.3.0.

### A frame on request, and overlays switched off

- **`chart.requestRender()`** draws a frame soon, though nothing the chart knows of changed: after a plugin's own setting changed (an overlay's display mode, say), in a quiet market with no ticks to redraw it. The frame refits the scales to the data as a tick's would; requests before it make one frame, and a destroyed chart ignores them.
- **`enabled: false` on an overlay plugin** leaves it registered but undrawn; it is read every frame, so switching it and calling `requestRender()` shows the change at once.
- **`options` on the React, Vue and Svelte components**: chart options the props don't cover (`maxBarSpacing`, `rightMargin`, `renderer`…), merged over the component's defaults at mount; `chartType`, `theme` and `autoScale` still come from their props. A footprint chart's wide bars need a larger `maxBarSpacing` than the default 30.
- Docs: the Plugins and Frameworks pages, six languages; the agent skill's overlay recipe.

## 1.18.1 (2026-10-20)

React, Vue and Svelte components: 1.2.6.

### Fixes

- **No made-up times beside tick bars**: on a tick timeframe (`'100T'`) with a few bars, the empty space left of the first bar was labelled with times extrapolated from the bars' spacing ("01:44, 03:02…" before a market that opens at 9:00), and the crosshair showed one there too. Tick bars are not evenly spaced in time, so the time axis and the crosshair now give times to the bars only. The same holds on Renko, Kagi, point & figure, line break and range-bar charts. Time timeframes still label the empty future right of the newest bar. The Realtime page says so, in six languages.

## 1.18.0 (2026-10-20)

React, Vue and Svelte components: 1.2.5.

### Prices on the market's grid, and a scale for plugins

- **The drawing settings' Coordinates tab shows prices on the market's grid**: a point dragged to 534.86074226 reads 534.75 with a step of 0.25, or 22,000 on a stock that moves in 10 dong, and an edited price lands on the grid. A point you don't edit keeps its exact place. The field's arrows move by the price step.
- **`chart.getPriceStep()`**: the smallest step prices move in, the one `roundPrice` rounds to: the symbol's `minTick`, a fraction's unit (`priceFormat: { denominator: 32 }`), else one unit of the decimals prices show.
- **`overlayScale(context)` for overlay plugins**: in `render(ctx, context)`, it places things where the chart draws them: `timeToX` / `xToTime` by bar time (between bars and past the newest in proportion), `indexToX` / `xToIndex`, `priceToY` / `yToPrice` on a log or inverted scale too, `barWidth`, and `visible`, the bars on screen (type `FrameScale`). Its bars are those of `context.data`, the series on screen: a Renko or Kagi chart's bricks, not the feed's bars. The plugin contracts don't change.
- **The scale functions are exported** from `@tradecanvas/chart` for renderers that get the viewport alone (an indicator's own `render`, a chart type's renderer): `priceToY`, `priceToYMapper`, `yToPrice`, `barIndexToX`, `xToBarIndex`, `timeToX`, `xToTime`, `timestampToBarIndex`.
- Docs: the Plugins page shows an overlay drawn with `overlayScale`, and the API page `getPriceStep`, six languages; a recipe in the agent skill.

## 1.17.0 (2026-10-07)

React, Vue and Svelte components: 1.2.4.

### The price scale in the symbol's decimals, and symbol details learned later

- **The price scale follows the symbol's precision**: its labels took the decimals of the visible range ("22,000.00") while the legend, price tags and crosshair took the symbol's `pricePrecision` or the market's ("22,000"). They all agree now, and the axis width is measured in those decimals. With a `minTick`, the scale's ticks stay on whole price steps: a stock that moves in 10 dong never shows 21,705.
- **Symbol details the feed learns later**: a chart asks `resolveSymbol` once when it connects. An adapter that learns the symbol's details afterwards (on its first message, say) sends a `symbolInfo` event with the `SymbolInfo`, and the chart applies it: decimals, price step, hours. No need to remount a framework component to pass them. `PollingAdapter` subclasses can send it with `emitEvent`, as `WebSocketAdapter` ones already could.
- Docs: the event on the Realtime page, six languages; the agent skill's recipe.

## 1.16.1 (2026-10-06)

React, Vue and Svelte components: 1.2.3.

### Fixes

- **The Settings' tabs keep their height** (broken in 1.16.0): with the Style tab's longer list, the tab bar was squashed to half its height. A dialog's tab bar now keeps its height and wraps on a narrow screen rather than scroll; the indicator and drawing settings, which share it, too.
- **Dialogs span a phone screen**: the indicator settings, drawing settings, order ticket, layouts and name dialogs were held to 360px wide on a phone, short of the screen; they are sheets across it like the other dialogs.
- Checked by opening every dialog, panel and menu of the widget at 1366×768, 1280×600 and 390×844, in the Studio, Terminal and Capsule looks. The demo's embed page takes `?ui=terminal` or `?ui=capsule` for such checks.

## 1.16.0 (2026-10-06)

React, Vue and Svelte components: 1.2.2. 1.15.0 was versioned but never published on its own; its changes (the second section below) ship in 1.16.0.

### Every key of the look in the widget's Settings

- **The Style tab sets every key**, on the user's layer: the chart type on view gets a section of its own with its colours and widths (Heikin-Ashi's bodies and wicks, Kagi's up and down, a line's colour and width, an area's fills, Baseline's above and below), next to its settings (Renko's box, Kagi's reversal…). Then the background, panes and legend, the watermark, the grid and crosshair each way with their widths, the crosshair's labels, the scales, the last price's colours and width, the volume, the session breaks and the high and low lines.
- **A Trading tab** for the colours of orders and positions (buy, sell, profit, loss, entry), signal markers and trade zones, and a selected drawing's handles on the Style tab. They keep their own colours until one is picked: the row shows Auto, its picker starts from the colour drawn, and Auto takes it back. The orders' colours are left out on a chart without trading.
- Undo, Reset and the theme switch cover every key, every chart type's included: Reset takes them all back to the theme's, and widths and dashes go with the user to the other theme as the rest of the look that isn't a colour. An undo puts back only the keys its change touched, so overrides set since on the user's layer stay. Rows a change moves (a wick with its body) show it at once, the Style tab follows the chart type, the tabs scroll on a narrow screen and read as tabs, and a colour in `hsl()`, `oklch()`, a name or with transparency shows in its swatch.
- Docs: the Settings' tabs on the Styling page, six languages; 21 new widget strings in 30 languages. The agent skill now covers WebGL, the 30 languages, signals, trade zones and replay, the Settings' tabs, and the `styleChange` and `rendererChange` events.

### More of the look by key, the Settings to change it, and your own shortcuts

- **Orders, positions, signal markers, trade zones and drawing handles by key**: 12 more style keys, 101 in all. `trading.buyColor`, `.sellColor`, `.profitColor`, `.lossColor` and `.entryColor` colour the orders and positions on the chart and their tags on the price axis, over the trading config's colours. `markers.longColor`, `.shortColor` and `.neutralColor` colour the signal markers, and `tradeZones.profitColor`, `.lossColor` and `.activeColor` the trade zones, over their own styles. `drawings.handleColor` fills a selected drawing's handles, white without it. The order ticket's and the bracket tool's previews take the trading colours too. Like the rest, they come on the host's layer or the user's, and read back with `getStyleValue`.
- **The widget's Settings change more of the look**, on the user's layer and kept with the theme: the grid each way (shown or not, colour, solid, dashed or dotted), the crosshair's colour and dash, the scales' text and lines, the last price's line (shown or not, its dash), the panes' separator and the legend's text. Undo and Reset take them back as they do the colours. What isn't a colour (a grid hidden, a dash) goes with the user to the other theme; the colours stay with the theme they were picked on. The controls carry their names for screen readers, and the switches read as switches.
- **Shortcuts of your own**: `widget.addHotkey({ keys: 'Alt+N', label: 'New note', onPress })`. A shortcut runs while the widget was used last, not while typing in a field, composing text (an IME) or in a dialog; one without Ctrl or Alt only while focus is on the widget or nowhere. A letter is the one the keyboard layout types (Ctrl+Y is the Y key on a German keyboard too), by its place with Alt. It replaces a widget shortcut on the same keys; the chart's own keys (arrows, Delete, Ctrl+Z) still run, and `addHotkey` warns of those. It goes with the `hotkeys` switch and is listed in the shortcut sheet (`?`), which now leaves out the keys that do nothing (switched off, or a dialog the widget hasn't got) and the ones you replaced.
- **Your own CSS, on stable hooks**: `--tcw-*` variables, `[data-tcw-part]` (a part's switch names), `[data-tcw-off]` on the root, and `[data-host-button]` / `[data-host-item]` stay as they are through 1.x.
- Docs: the new keys on the Styling page; shortcuts and CSS on the Customization page; six languages. The Feature Lab's parts scene adds a shortcut (Alt+X).

## 1.14.0 (2026-10-06)

React, Vue and Svelte components: 1.2.0.

### Replay for apps, and components that wait for your bars

- **Marks as the replay reaches them**: during `chart.replayStart()`, signal markers show once their bar is shown and trade zones once entered, each drawn open (no exit, no result) until its exit is reached. They all come back with `replayStop()`. `revealMarks: false` shows them all through the replay. The widget's replay does the same.
- **Where a replay starts**: `startTime` starts at the first bar at or after a time; `hideHistory` leaves the bars before the start out while the replay runs, so the chart shows only what it replays, and puts them back on `replayStop()`.
- **As quick as you like**: `duration` plays from where the replay is to the end in about that long, however many bars (30 days of 5-minute bars take as long as a day of them). A replay quicker than a bar a frame now runs on animation frames, several bars a frame, instead of a timer the browser holds to a few milliseconds a tick; a frame that comes late slows it rather than skip ahead.
- **Events**: `replayComplete` (`{ barIndex, time }`) when the replay reaches its last bar, and `replayStep` now says how many bars the replay goes through (`total`).
- **React, Vue and Svelte components**:
  - `indicators` takes `{ id, params, position }` as well as ids; one whose inputs change is put back with them (`syncIndicators`, exported for your own components);
  - with `data` at mount a component opens no stream; `stream={false}` never opens one (and closes one it had), so a chart mounted before its bars arrive doesn't start the default Binance feed;
  - `features` follows its changes after mount.
- **The widget's replay** shows the marks as it reaches them too: markers and trade zones you put on the chart wait for the replay. `replayRevealMarks: false` shows them all, as before.
- With `hideHistory`, the replay's indices (`replayStep`, `getReplayBarIndex`, a restart's `startIndex`) count from its start, a restart keeps the window, and indicators begin at the window's first bar.
- Docs: a replay for your own app, and the components' props, in six languages; the Feature Lab's replay shows buys, sells and a trade appearing as it goes.

## 1.13.0 (2026-10-06)

### The widget, part by part: switches and your own parts

- **112 feature switches**, every one on until turned off and changeable while the widget runs: `new ChartWidget(el, { features: { 'toolbar.replay': false, hotkeys: false } })`, then `widget.setFeatures({ sidebar: false })`, `getFeatures()`, `isFeatureOn(name)`. The names are listed in `WIDGET_FEATURES` and checked by TypeScript:
  - a name without a dot is a whole capability, off wherever it shows: its button, its menu entries, its command in the command palette, its keys (`alerts`, `settings`, `replay`, `symbolSearch`, `hotkeys`, `toasts`…);
  - a dotted name is one place: a toolbar button (`toolbar.screenshot`), a section of drawing tools (`sidebar.fibonacci`), a status bar item (`statusBar.market`), a button on an indicator's row or a pane (`indicatorLegend.remove`, `pane.maximize`), a menu entry (`menu.chart.order`, `menu.drawing.lock`), a key (`hotkeys.tools`).
- **The older options are the same switches**: `toolbar: false`, `drawingTools: false`, `statusBar: false`, `rangeBar: false`, `alerts: false` and the rest work as before. The parts they leave out are now built and hidden, so they can be switched on later, and `addToolbarButton` puts a button on a toolbar switched off, to show with it (it used to return `null` with `toolbar: false`). `drawingTools: false` also switches the drawing settings off, and `accountPanel: false` the order ticket, as before. `trading`, `watchlist`, `depthLadder` and `layouts` stay options, as they bring data or storage; switches hide their buttons.
- **Your own parts in the widget's bars**: `addToolbarDropdown` (a menu button, its entries asked for each time it opens), `addSidebarButton`, `addStatusBarItem` (text, or a button), and `getSlot(name)` for anything else: beside the toolbar's chart controls or its panel buttons, under the drawing sidebar's switches, on either end of the status bar, or over the chart. They follow the widget's theme and look.
- **Your entries in more menus**: `drawingMenuItems` and `indicatorMenuItems` add entries at the end of a drawing's right-click menu and of an indicator's "more" menu, beside `chartMenuItems`.
- **Every chart of a grid**: `ChartWidgetGrid.setFeatures(patch)`, for the charts it adds later too.
- A switch turned off while its part is in use closes it: a replay ends, a panel, dialog or menu closes; the public toggles open nothing switched off. Separators left with nothing to separate hide with the buttons around them, and the chart takes the room of a bar switched off at once. With `toasts` off the widget's errors still show.
- **Docs**: a Customization page gathers every way to customise (colours, looks, style overrides, switches, your parts, words, plugins), in six languages; a Feature Lab scene switches parts on a live widget.

### Style overrides: the chart's look by key

- **Any part of the look, apart from the theme**: `chart.applyOverrides({ 'grid.vertical.visible': false, 'series.candlestick.upColor': '#26a69a' })`. 89 keys, listed in `CHART_STYLE_KEYS` and checked by TypeScript:
  - the grid's lines each way and the crosshair's: shown or not, colour, solid / dashed / dotted, width;
  - the crosshair's labels, each axis's line and labels, the panes' background, separator and name;
  - the legend, the last price (shown, colours, dash, width), the volume, the session breaks, the high and low lines, the watermark;
  - the main series as each of the 18 chart types draws it: up and down colours, wicks, line colour and width, area fills. Up and down colours fall back to the candles', lines to the line chart's, fills to the area's, then to the theme.
- **Two layers**: your app's (`layer: 'host'`) stay through theme switches and are never saved; the user's (`layer: 'user'`) win over them, are kept with the theme they were made on, and are saved with `saveState()` (snapshot version 3; version 2 saves still load). `setOverrides` puts a whole layer in place, `resetOverrides` takes keys away, `getStyleValue(key)` tells what a key resolves to, `getStyle()` gives the resolved looks, and `styleChange` says when they changed. `getTheme()` returns the theme as set, so `setTheme(getTheme())` never bakes the overrides in.
- **Everywhere a chart is**: the `overrides` option, `ChartWidgetGrid.applyOverrides` (every chart, and the charts it adds later), and an `overrides` prop on the React, Vue and Svelte components. The grid and crosshair options (`grid.hLineColor`, `crosshair.vLine.style`…), which were typed but did nothing, are now shorthand for their keys.
- **Indicator plots and panes**: each plot's dash and visibility by its key (`updateIndicatorStyle(id, { plots: { signal: { lineStyle: 'dashed' } } })`); a hidden plot shows no value tag and no legend value, and stretches no scale. `setIndicatorDefaults(id, style)` sets what every indicator of a kind starts with. `setPaneStyle(instanceId, { background, separator })` gives a pane its own look, saved with its indicator and undone with it.
- **On the GPU too**: the WebGL renderer draws the grid each way as it is styled, and hands it to Canvas 2D when it is dashed, wider than a pixel or two colours.
- **The widget's Settings** write the user's layer: the colours picked stay with their theme. Reset puts back the current theme's colours; it used to put the dark theme's on any theme.
- **Fixes**:
  - the widget's theme toggle brings back the host's own theme when toggled back to its mode; it used to swap it for a built-in one for good;
  - a baseline chart's fills work with `rgb()` and named colours (they appended a hex alpha to the colour);
  - loading a save that names a theme of its own leaves the chart's theme as it is; it used to break it;
  - a pane's crosshair value pill takes the crosshair label colours, as the price axis's does.
- **Feature Lab**: a style overrides scene; the Styling docs explain every key, in six languages.
- The README and `llms.txt` say the charts draw with Canvas 2D or WebGL.

## 1.12.0 (2026-10-05)

### Indicators and languages: 111 indicators, 30 languages

- **16 more indicators, 111 in all**: Average Price, Median Price and Typical Price; Moving Average Channel, Hamming, Double and Triple; Volatility Index (Wilder's stop and reverse on the average true range); Accumulative Swing Index, Advance/Decline, Majority Rule, Chop Zone, SMI Ergodic and Price Oscillator; Volatility O-H-L-C and Zero Trend Close-to-Close.
- **Correlation with another symbol**: Correlation Coefficient and Correlation Log (of returns), beside Compare and Spread/Ratio among the indicators that read a second symbol; the widget offers them when you compare with one.
- **Pivot Points in six kinds**: traditional (as before), Fibonacci, Woodie, classic, Camarilla and DeMark (`type`). Its name loses "(Classic)": its levels were the traditional ones all along.
- **MA Cross** takes a simple average against an exponential one (`type: 'sma-ema'`).
- **ChartWidget in 30 languages**: Italian, Dutch, Polish, Czech, Slovak, Hungarian, Romanian, Greek, Swedish, Danish, Norwegian Bokmål (also for `no` and `nn`), Estonian, Malay and Persian join the 16, Persian right to left.

### WebGL: back after a lost context, many charts, every browser

- **Back after a lost context**: when the browser hands a lost WebGL context back (after a GPU reset, say), the chart draws with WebGL again and says so: `rendererChange` with `{ renderer: 'webgl', reason: 'contextRestored' }`. Before, it stayed on Canvas 2D for good.
- **Many charts on a page**: Chrome and Safari keep about 16 WebGL contexts a page and drop the oldest past that, a live chart's or a map's, never to hand it back. At most 8 charts now draw with WebGL at once; one past that draws with Canvas 2D (`rendererChange` with `reason: 'limit'`) and takes WebGL as soon as another chart lets go of its context, as a chart whose context was lost does. `setMaxWebGLCharts(n)`, from the package, sets the limit (`Infinity` for none).
- **Every browser**: checked in Chrome, Firefox and WebKit (the engine of Safari): WebGL draws, loses and gets back its context, and keeps to the limit in all three, with the same pixels against Canvas 2D. Firefox no longer warns about the deprecated `WEBGL_debug_renderer_info`: the GPU's name comes from `RENDERER` where that gives one.
- **Baseline, Kagi and point & figure on the GPU** too. Their lines are drawn whole and round where they bend (baseline, Kagi) where they were drawn in pieces that left notches at each bend, and the two strokes of an X are drawn apart. Zoomed out on 200,000 bars at a pixel ratio of 2, a baseline chart takes 23.2 ms a frame instead of 27.6.
- **Point & figure boxes**: the chart drew every column in boxes of 1, whatever the box its columns were built with (1% of the average close unless set), so at a price of 30,000 a column was thousands of overlapping specks instead of a stack of Xs or Os. It draws them the size of the box now.

## 1.11.0 (2026-10-05)

### WebGL: the heatmap and profiles on the GPU

- **Under the bars, on the GPU**: with `renderer: 'webgl'`, the depth heatmap, the volume profile and the market profile draw with WebGL too, under the bars, with volume under a profile as in Canvas 2D. A market profile showing its stats readout or TPO letters stays with Canvas 2D: text can't go between the GPU's background and its bars. The 2D canvas under the GPU's is now only there for that, a watermark, or what the GPU can't take.
- **Faster**: panning on integrated graphics at a pixel ratio of 2, a depth heatmap of 240 snapshots by 80 levels takes 16.8 ms a frame instead of 25.5 (60 fps), and zoomed out on 1,000,000 bars with four indicators 16.7 instead of 34.5. Rectangles filled one by one, as heatmap cells are, are recorded straight to the GPU and drawn together.
- **Same pixels**: candles and volume land on the same device pixels with Canvas 2D and WebGL at any scaling. Bars exactly on half a device pixel (a round bar step such as 5.1 px at 200%) could land one pixel apart; rounding now turns up from a hair under the half on both.
- **Sharp volume candles**: wicks and bodies on whole device pixels, as candles are, the wick in the middle of a body as wide as the bar's volume.
- **Order books for older bars**: `chart.pushDepthSnapshot(book, time)` stamps a heatmap snapshot at `time`, to fill in books recorded earlier, oldest first; without `time` it takes the latest bar's, as before.
- **Feature Lab**: a liquidity heatmap scene, 240 order books of 80 levels each, with the Canvas 2D / WebGL switch.
- `pnpm bench:render` has two more scenes: zoomed out on 1,000,000 bars with four indicators, and a depth heatmap.

## 1.10.0 (2026-10-05)

Everything since 1.7.0 in one release (1.8.0 and 1.9.0 weren't published on their own).

### WebGL renderer (preview)

- **`renderer: 'webgl'`** draws the plot and indicator panes with WebGL 2, on a canvas under the 2D scene: the grid, session shading and break lines, candles and volume directly, and indicators, indicator panes, compare lines and most other chart types (line, area, bars, Heikin-Ashi, hollow candles, Renko, line break, range bars, HLC area, step line, line with markers, equivolume, high-low) through their Canvas 2D drawing, recorded as GPU strokes, fills and rectangles, antialiased at their edges as Canvas 2D is. Text, drawings, orders, axes and the crosshair stay on Canvas 2D. `'auto'` takes WebGL only on a hardware GPU; Canvas 2D stays the default.
- **Same look**: the GPU follows the 2D rules for whole device pixels and antialiased edges, so candles match Canvas 2D to within 2/255 at 100%, 125%, 150% and 200% scaling, and lines and fills differ only on a few edge pixels. Anything the GPU wouldn't draw the same (images, patterns, rotated or non-rectangular clips, sharp mitered corners, overlapping pieces of one path, shapes other than bands and areas) is left to Canvas 2D, in order, so the stacking doesn't change. Baseline, Kagi and point & figure charts stay on Canvas 2D for now.
- **Faster where it counts**: panning on integrated graphics at a pixel ratio of 2, 2,000 candles on a 1600×900 chart take 17.6 ms a frame instead of 23.3 (60 fps), 500 candles with four indicators 19.6 instead of 27.4, zoomed out on 200,000 bars with four indicators 20.2 instead of 34.5, six charts side by side 17.2 instead of 23.5, and a 2560×1400 chart with four indicators 29.1 instead of 114.5. At 150% scaling that chart pans at 60 fps (70.8 → 17.6 ms).
- **Safe to try**: `chart.setRenderer(mode)` switches at runtime and resolves to what draws, `chart.getRenderer()` says which, and `rendererChange` reports each change and why (`'unsupported'`, `'contextLost'`). Where WebGL 2 is missing, or its context is lost, the chart carries on with Canvas 2D; a failure to load or compile is logged as a warning. The WebGL code is a chunk of its own (about 17 KB gzipped), loaded on first use, and a destroyed chart hands its GPU context back at once. Screenshots include what the GPU drew.
- **Custom indicators come along**: a plugin's `render` draws on the recording context like on any other, and falls back to Canvas 2D by itself where it needs to. Its `render` may then run twice in a frame, so it should draw without side effects. Text it draws goes on the 2D canvas, over the lines of the indicators drawn with it.
- **Session break labels** now draw over the bars and indicators instead of under them, inside the plot, with Canvas 2D or WebGL. `SessionBreaks.render()` still draws lines and labels; `renderLines()` draws the lines alone.
- **Feature Lab**: the 200,000-bar scene has a Canvas 2D / WebGL switch, and times a short pan on each switch.
- `pnpm bench:render --renderer=webgl` (or `--renderer=auto`) measures the WebGL path.

### Faster when zoomed out

- **Faster when zoomed out**: once each bar takes less than a pixel, indicator lines, bands (Bollinger and the like) and histograms draw one span per pixel column instead of a stroke through thousands of points. Much the same look for a fraction of the raster work: zoomed out on 200,000 bars with Bollinger Bands, EMA, RSI and MACD, a frame went from about 54 ms to about 21 ms on integrated graphics (85 → 38 ms at 2x). Supertrend draws one line per colour instead of one stroke per bar.
- `pnpm bench:render` measures frames in headless Chrome on your own GPU, scene by scene.

### Sharper, calmer charts

- **Sharp at any screen scale**: candles, bars, volume and the drawings' horizontal and vertical lines land on whole device pixels. A one-pixel wick is one sharp pixel at 100%, 125% or 200% scaling; it used to spread over two at half strength.
- **Volume as a backdrop**: the bars keep to the bottom 15% of the chart (20% before) in the theme's own `volumeUp` / `volumeDown`, which were ignored. A theme that only changes the candle colours (or the widget's settings) gets volume in those colours. `volumeColor(candleColor)` gives the matching shade.
- **A calmer dark palette**: softer up and down colours and quieter axis labels.
- **Drawings**:
  - Fibonacci levels each come in their own colour with soft bands between them, and their labels sit above the lines. The drawing's colour goes to its trend line; each level's is set in its levels.
  - Drawing text uses the theme's font, on a halo of the background so it reads over bars.
  - Lines turn corners round.
  - Long/Short labels are tags just outside their zones that never overlap.
- **Price axis**: indicator value tags step around the last-price, high/low and order tags, and scale labels under any tag are hidden instead of showing half-covered.
- **Dates**: on an intraday chart a bar at midnight is labelled with its day on the time axis and the crosshair, not with its year as if it were a daily bar.
- **Lines on the pixel**: the crosshair, vertical lines and wicks share one device-pixel column, so a line drawn on a bar runs through its wick.
- **Widget**: the drawing tools sit in sections with a divider between them: lines; Fibonacci, Gann and cycles; patterns and Elliott waves; forecasting and measuring; shapes, brushes and notes. The tools below are grouped too: modes, undo and redo, clear all.
- **Looks different after the update**: the dark theme's colours, the volume's height, new Fibonacci drawings' colours and the order of the drawing tool groups change without any change of yours. Set `candleUp` / `candleDown` on the theme to keep the old candle colours.

### Fixes

- A position's stop-loss or take-profit priced outside the visible range no longer draws over the time axis or the panes below the chart, and can't be grabbed there by accident (nor can an order line off the plot); an entry scrolled out of view no longer leaves its price tag on the axis.
- The npm page shows the full README again (it had fallen behind the repository's), with screenshots; the demo's link previews now carry an image on every network.
- Panning by dragging no longer stops halfway with a "no drop" cursor: quick presses could leave text on the chart selected, and the next press then started the browser's own drag of it. The chart's text can't be selected now, and such drags are cancelled.

## 1.7.0 (2026-10-03)

Everything since 1.4.0 in one release (1.5.0 and 1.6.0 were never published): the drawing toolkit, trading and workspace, panes and undo, alerts and replay, scales and comparisons, the widget's look, and watchlists, symbol info, tick charts and access. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.10 pick up the new core.

The widget looks different after the update: Studio is the new default look (see *The widget's look* below); `ui: 'terminal'` is the closest to a square, ruled look.

### Workspace, markets and access

- **Watchlists**: several lists of symbols to switch between, create, rename and delete; add symbols from the search, remove them, drag them into order. Rows fill with live quotes from the feed (Binance sends them), from a quote source of yours, or from what you push.
- **Symbol info**: a panel with the symbol's price and move, whether its market is open and when that changes, the day's open, range and volume, its trading hours and news. The status bar shows when the market is closed.
- **Tick charts**: type `100T` for a bar per 100 trades, built from the feed's trades (Binance streams them).
- **Undo for settings**: Ctrl/Cmd+Z takes back settings and chart type changes too, with drawings and indicators; `recordUndo` adds changes of your own.
- **Zoom and scroll buttons** over the chart, shown while the mouse is on it.
- **For screen readers**: the chart says what it shows, what is on screen after the keys move it, and reads the bars one at a time (comma and period).
- **Arabic and Hebrew**, right to left: the widget in 16 languages.
- **Ten more indicators** (95 in all): Stochastic Momentum Index, Relative Volatility Index, Trend Strength Index, Linear Regression Slope, Standard Error and its bands, Guppy Multiple Moving Average, Moving Average Ribbon, Average Day Range and Net Volume.
- New events: the chart type, symbol or timeframe changed, the undo history changed, drawings were selected.
- A live bar that closes keeps its final values (it used to keep the ones before its last update).

### The widget's look

- **Three looks, and yours**: the widget's corners, sizes, type, borders, shadows and bars are a look apart from its colours. **Studio** is the new default (rounded controls, spaced groups, the interval buttons in a segmented track), **Terminal** is dense and square with capital labels, **Capsule** is all pills with the toolbar and drawing tools floating as islands. Start from one and change what you like with the `ui` option or `setUI`, on one chart or a whole grid.
- **The chart's price tags take the same corners**: square, rounded or pills, along with the axis and crosshair pills and the order badges (`chart.setShapes`).
- Every part of the widget follows the look's CSS variables; without `ui` they stay yours to set in CSS (the widget's stylesheet now goes first in the page, so your rules win a tie). Menus grow to fit their labels instead of wrapping them.
- **Looks different after the update**: Studio is the new default, so an existing widget changes look without any change of yours — slightly rounder corners, a taller toolbar, wider drawing tools, the interval buttons in a track, no rules between toolbar groups, labels as written rather than in capitals, rounded price tags. Use `ui: 'terminal'` for a square, ruled look, or set any token yourself.

### Scales, formats and comparisons

- **Price formats**: prices in your own format, or in fractions of a point (a bond in 32nds: `110'165`), on every label of the price scale — axis, crosshair, legend, tooltips, orders, alerts, drawings (`priceFormat`). Times your way too (`timeFormatter`).
- **Compare, spread and ratio**: another symbol on a price scale or pane of its own, or the spread or ratio to it, lined up with the chart by time; compare lines count in the auto scale and line up by time as well.
- **Percent panes**: a pane can read in percent of its first value on screen.
- **High-Low bars**, settings for Renko, Line Break, Kagi, Point & Figure and range bars, a hidden main series, lines at the visible high and low, and bid/ask lines.
- **Extended hours** on or off: bars outside a symbol's regular hours are kept aside while hidden.
- **Data export** with every indicator line in a column of its own (CSV or JSON); bars timed in seconds no longer export as 1970.
- **Replay across a grid**: replaying one chart takes the others along to the same time.

### Alerts, replay and panes

- **More kinds of alert**: a line crossing another line (the price and a moving average, MACD and its signal), a move of some percent within some bars, only on closed bars (no firing on a wick that comes back), and an expiry. All in the alerts panel and in `addAlert`'s options.
- **Replay in finer steps**: pick 5m under an hourly chart and watch each bar form, step by step (`replayStart({ steps })`).
- **Paper trading in a replay**: a paper account fills on the replayed prices (each step's high and low too), and its fills land on the replayed bars.
- **Alerts on a connected feed**: price alerts now check on every price a `connect()`ed feed sends, not only on `setCurrentPrice`.
- **Signal markers** say what they are when the pointer is on them, and report clicks (`signalMarkerHover`, `signalMarkerClick`).
- **Each pane can have its own logarithmic or inverted scale** (right-click the pane, or `setPaneScale`).

### Panes, templates and undo

- **Move an indicator to another pane** — into the pane above or below, a pane of its own, or back to the price pane — from the ⋯ button on its legend row, or `chart.moveIndicatorToPane`. The pane's other indicators stay, and those reading its lines follow it.
- **Fold, maximise and reorder panes** with buttons at each pane's top right (`setPaneCollapsed`, `setMaximizedPane`, `movePane`). Saved layouts keep each pane's size, order, fold and maximise.
- **Undo for indicators**: Ctrl/Cmd+Z takes back adding, removing, editing and moving indicators, in the same history as drawings. An indicator comes back under its own id, so alerts on its lines still match.
- **Indicator templates**: save the chart's indicators (inputs, style, levels, panes) under a name from the indicators menu and apply them in one go.
- **Type a number to change the interval** (`5`, `15m`, `1h`, `1D`, Enter), and **Alt+T / H / J / V / C / F** for the trend line, horizontal line and ray, vertical line, cross line and Fibonacci retracement.
- Prices offered by the chart's menus and the order ticket sit on the market's price grid (`chart.roundPrice`).

### Trading and workspace

- **Act on orders and positions from the chart**: × on an order line cancels it, × on a position closes it, ⇅ reverses it, × on a stop-loss or take-profit removes it. They raise the usual intents (a new `positionReverse` among them), so a connected adapter acts on them; an adapter without `reversePosition` gets a close and a market order the other way. Orders take a stop-loss, a take-profit and a time in force that carry over to the position. Adapter authors: `PositionModifyIntent.stopLoss` / `takeProfit` can now be `null`, meaning remove it (a missing field still means keep it).
- **Fills on the chart**: a mark on the bar of each fill, solid where it opened a position and hollow where it closed one. `executionFill` says why (order, close, reverse, stop-loss, take-profit) and the P&L realised.
- **Right-click menus that know where you clicked**: the plot, a pane, the price axis or the time axis, with the price and time there. A "+" by the price axis follows the crosshair. ChartWidget offers an alert, a buy and a sell at the price (a limit where it would wait, else a stop), an order ticket and a horizontal line on the plot, the scale switches on the price axis, and go to date on the time axis.
- **Order ticket and account panel** in ChartWidget: open positions with their P&L, working orders and the fills so far, each with close, reverse or cancel; an order ticket that checks the order as you fill it in and shows the reward:risk.
- **Named layouts**: save the chart under a name (symbol, interval, scale, chart type, indicators, drawings, alerts), open, rename, delete, auto-save the open one, Ctrl/Cmd+S. Kept in the browser, or on your server through a four-call `LayoutStorage`.
- **ChartWidgetGrid**: up to six charts side by side, linked by symbol, interval, crosshair, time or drawings as you choose, saved together as one layout.
- **Your own toolbar buttons and menu entries**: `widget.addToolbarButton()` and `chartMenuItems`.
- Fixed: `ChartGrid.connectAll` with one adapter object sent every chart the last symbol's bars (an adapter keeps one stream). It now takes a function that makes one per chart, as does `ChartWidgetGrid`'s `adapter` option.
- New events `ordersChange`, `positionsChange` and `stateChange`. With several widgets on a page, Ctrl/Cmd+K and +P now go to the one used last instead of all of them.

### Drawing toolkit

- **Each tool has its own settings**: Fibonacci levels (edit, hide, add, colour), prices and percentages, labels left or right, extending lines either way, backgrounds, a wave degree, an icon. Double-clicking a drawing in ChartWidget opens its settings (style, the tool's settings, its points in the chart's time zone); changes show as you make them and Cancel takes them back. "Save as default" keeps a tool's settings for the next drawing, and templates keep settings as well as style. API: `getDrawingOptions` / `setDrawingOptions`, `updateDrawing`, `beginDrawingEdit` / `endDrawingEdit`, `setDrawingToolDefaults`.
- **Long/Short Position works out the size** from the account and the risk (a percent or an amount): quantity, reward:risk, and each line's price, distance and profit or loss. The target's handle sets the ratio.
- **Alerts on drawings**: `addDrawingAlert(id, …)` fires when the price crosses a trend line, ray, horizontal line or a channel's lines where they are by then, as drawn on the chart (log scale included). The alert goes with its drawing and comes back with it on undo.
- **Order, groups and a right-click menu**: bring forward or send back (Ctrl+] / [), group drawings to select, hide and lock them together (Ctrl+G), and a menu on each drawing with settings, an alert, order, group, lock, hide, duplicate and delete. The object tree lists groups with their drawings.
- **29 new tools (69 in all)**: note, callout, flag, arrow mark and icons; brush, highlighter, path and polyline (a point per click, a double-click or Enter ends them), curve and arc; Fibonacci circles, spiral, speed resistance arcs and wedge, pitchfan, Gann square; Elliott impulse, correction, triangle and combination waves; three drives and cypher patterns; time cycles and sine line; forecast, projection and bars pattern.
- **An eraser, a zoom tool and a strong magnet**, in the API and the widget's sidebar. On a short screen the sidebar scrolls, and its menus open beside it and work from the keyboard.
- Fixed on the way: Anchored VWAP and Fixed Range Volume Profile drew nothing (they were never handed the bars); Ctrl+Shift+Z undid instead of redoing; dragging a drawing on a log scale bent it; drawing shortcuts fired inside dialogs.

### Data and time

- **Zoom out until every loaded bar fits.** Below the old 2 px bar + 2 px gap floor, the bar and its gap keep shrinking (down to a quarter pixel) as long as the loaded bars don't fit yet; a short series still stops at the old floor. Below a pixel per bar, candles, OHLC bars and volume merge per pixel column, so thousands of bars stay readable and cheap to draw. "All" and the 1Y / 5Y presets are no longer capped at about 200 bars.
- **Older bars load as you scroll back.** Adapters can implement `fetchHistoryBefore(symbol, timeframe, before, limit)`; Binance, Bybit and Mock do, and `WebSocketAdapter` / `PollingAdapter` take it as an option. A connected chart loads a page when less than a screen of bars is left of the view, one request at a time, keeping the same bars on screen; it backs off after failures, and a reconnect keeps the paged-in history. New `chart.prependBars()`, `setHistoryLoader()`, `loadMoreHistory()`, `hasMoreHistory()`, `isLoadingHistory()`, the `historyLoad` event and `StreamConfig.historyPageSize`. ChartWidget shows a small pill while older bars load.
- **Any interval.** `TimeFrame` takes any whole count of a unit (`'7m'`, `'90m'`, `'2d'`); `parseTimeframe` / `isTimeFrame` check one. Adapters list the timeframes their feed serves (`supportedTimeframes`), and the chart builds the others from the coarsest one that divides them: history, live bars and older pages alike (`ResamplingAdapter`, `withResampling`, `resampleBars`, `pickBaseTimeframe`). This also fixes Binance's 45m, 2d, 3M and other intervals it lacks, which used to fall back to 15m bars; a timeframe the feed cannot build is refused instead. `TimeFrame` now accepts any `${number}${unit}`: exhaustive switches over it should use `KnownTimeFrame`. ChartWidget's timeframe menu takes a typed interval (`7`, `90`, `2h`, `3D`), keeps it with a star and an × to remove it, and lists it in the command palette.
- **Time zones with daylight saving time**: `chart.setTimezone('America/New_York')` (or a fixed offset, or null for the browser's) and `ChartOptions.timeZone` set the zone for the time axis, crosshair, tooltip, day breaks, range presets and go-to-date. Day breaks used to follow the browser's zone whatever the chart showed. Session hours take a `timeZone` too. ChartWidget's settings list 28 zones by city with the offset in force. YTD now starts on the 1 January bar.
- **A left price scale**: an overlay can go on a scale of its own on the left (`addIndicator(…, { scale: 'left' })`, `setIndicatorScale`), fit to its values, so a volume-like line no longer squashes the candles; `setLeftPriceScaleVisible(true)` mirrors the price scale on both sides. ChartWidget has a switch in its settings and a choice in each overlay's Style tab.
- **Symbol search and symbol info**:
  - Adapters can implement `searchSymbols` and `resolveSymbol`. They return a symbol's name, exchange, price precision and step, exchange time zone and trading hours. Binance does.
  - A connected chart resolves its symbol by itself: prices take its precision, `setTimezone('exchange')` follows its exchange, and its hours feed the session shading.
  - ChartWidget's symbol search asks the feed as you type, with names and exchanges.
- **ChartWidget in 14 languages**: English, Vietnamese, Simplified and Traditional Chinese, Japanese, Korean, Spanish, Portuguese, French, German, Russian, Turkish, Indonesian and Thai. Every string the widget shows now goes through its translations; settings, drawing tools, alerts, dialogs and toasts used to stay English. Translations live in `@tradecanvas/chart/widget/locales` so a page loads only what it imports. Number formats for each language are in the settings.
- The replay bar sits above the time axis, so its dates stay readable.
- Pinch-zoom on touch screens follows the fingers: spreading them twice as far apart doubles the bar width. A pinch used to move the zoom by about a twentieth of that, so it seemed not to work. The chart also sets `touch-action: none` on its surface, so the page doesn't zoom instead.
- Dragging inside an indicator pane pans the chart. It used to zoom time as if the time axis had been dragged, and the whole pane showed the time-axis cursor.

### Indicators in depth

- **One scale per pane**: a pane's lines, levels, axis labels and crosshair share one value scale (RSI's 30 line used to read as 38). The price scale no longer stretches to fields that are not drawn.
- **Declared plots**: descriptors declare what they draw (`plots`), their pane `scale`, default `levels` and how `inputs` are edited; a custom indicator needs no rendering code.
- **Sources and indicators on indicators**: 38 indicators take a price source or another indicator's line (`indicatorSource(instanceId, key)`), e.g. an SMA of RSI in RSI's pane.
- **Shared panes**, **editable levels** and **value tags** on the axis, all kept in saved layouts.
- **15 new indicators (85 in all)**: DEMA, SMMA, ALMA, KAMA, LSMA, McGinley Dynamic, MA Cross, Williams Fractals, Chande Kroll Stop, Bollinger %B, Bollinger BandWidth, Momentum, Historical Volatility, Volume Oscillator, Ulcer Index.
- ChartWidget: an indicator settings dialog with Inputs, Style and Levels tabs; the legend colours each value as its line.

### Site and docs

- The site speaks 14 languages: the home page, menus and the Feature Lab, whose live charts switch to the same language. The docs and the README are in English, Vietnamese, Simplified Chinese, Japanese, Korean and Spanish; the other languages show the English docs with a note.
- Each language has its own address (`/ja/docs/api/`), with `hreflang` links and a sitemap covering every language.

### For AI coding tools

- `skills/tradecanvas`: an agent skill with entry points, rules, recipes and a generated indicator reference.
- `llms.txt` and `llms-full.txt` on the site; the indicator catalog on the docs site is generated from the registry, and CI checks that the generated files are current and that the skill's examples type-check.

## 1.4.0 (2026-10-02)

Layouts that come back whole, ranges and dates, scale options, indicators listed on the chart, an icon set and reworked bar replay. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.7 pick up the new core.

### Layouts, ranges and scales

- **Saved layouts restore indicators and alerts**: inputs, panes, colours, visibility; alerts keep their channel, repeat and label. Indicator changes trigger the auto-save.
- **Ranges and dates**: `setVisibleRangePreset('1D' … 'All')` and `goToTime()`; ChartWidget shows the presets under the chart with a go-to-date button (Alt+G).
- **Inverted price scale** (`setInvertScale`, Alt+I), and the log scale now applies to candles, axis and grid as well as drawings and indicators.
- **Timeframe favourites** in ChartWidget, and feature flags that used to do nothing now apply (`drawingMagnet`, `barCountdown`, `compareSymbols`, `dataExport`, `logScale`, `timeframes`).
- **Drawing**: stay-in-drawing mode, and Ctrl/⌘+C / Ctrl/⌘+V copy drawings, also between charts. ChartGrid links the crosshair by time.

### Indicators on the chart

- ChartWidget lists each indicator on the chart, under the OHLCV legend or at the top of its pane, with its value at the hovered bar and show/hide, settings and remove actions. Several instances of one indicator each get their own colour.

### Icons and tooltips

- Every drawing tool and chart type has its own icon; the interface icons share one grid. `createIcon`, `createToolIcon`, `createChartTypeIcon` and the icon maps are exported.
- Tooltips on the widget's controls replace the browser's.

### Replay

- Live data stays out of the replay and comes back with `replayStop()`; the replay ends paused on its last bar. ChartWidget asks for a start bar, offers a random bar, speeds in bars per second and "Back to realtime".

## 1.3.0 (2026-10-02)

Dragging that never sticks, a lighter two-canvas renderer, the TradeCanvas look by default, a redesigned gauge, crosshair tooltip and loader, and replay that follows its newest bar. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.6 pick up the new core.

### Dragging and panning

- **The press that selects a drawing also grabs it**: no second drag needed; locked drawings let the press pan the chart. Clicks that only select no longer move the drawing or add an undo step.
- **Drags are followed outside the chart** until the button is released (also axis scaling, pane resizing, drawings and trading lines); price drags are pinned to the plot's edge; a release outside the window is detected.
- **A sloppy horizontal drag keeps auto-scale on**: vertical panning needs a deliberate move (> 24 px and at least half the horizontal travel).
- **Momentum** is measured over the last 100 ms, ignored after a rest, capped and stopped by any new gesture.
- **Free panning** past the newest bar into empty future space, or past the oldest bar, down to `panLimits.minVisibleBars`; the time axis, grid, crosshair and drawings (magnet included) extend into the future. `freePan: false` keeps the old clamp. `setVisibleRange()` / `fitContent()` show exactly the requested range.
- **Context cursors**: crosshair, grabbing hand, hand over drawings, move over handles, resize arrows over axes, pane dividers and draggable lines.
- **Ctrl/⌘-drag selects drawings** in a box, Ctrl/⌘-click toggles one; the group moves, restyles and deletes together as one undo step.
- The right-click order menu is off by default (`features.tradingContextMenu: true` to opt in).

### Rendering

- **Two canvases instead of four**: a scene canvas and a thin top canvas for pointer-tied visuals. A hover repaints only the top canvas and the browser composites two surfaces instead of four. New `LayerType.Hover`.
- After the page or a scrolling container scrolls, the crosshair follows the pointer exactly (it used to stay offset until the next click).
- The price-axis tick label under the last-price tag is hidden instead of half-covered; Anchored VWAP caches its series.

### TradeCanvas look

- **Default palette**: `DARK_THEME` / `LIGHT_THEME`, indicators, orders, signal markers, drawing tools and the `ChartWidget` chrome share one palette — ink ground, mint/coral candles, amber accent. New `TC_PALETTE` and `TC_SERIES_COLORS`. Tests keep theme-neutral colours at 3:1 on both backgrounds and widget text at 4.5:1.
- Armed price alerts are blue, triggered ones amber; comparison lines no longer start with an orange that blends into the main line.
- **Gauge redesign**: a thin ring with rounded ends and zone gaps, bright up to the value and dimmed beyond it; a knob marks the value so the number is never crossed by a needle; the current zone's label shows above it; text fits small dials. `pointer: 'needle'` keeps the classic needle. New defaults: 240° sweep, `thickness` 0.14.

- **Crosshair tooltip redesign**: bar time and a change pill (vs the previous close), an aligned O/H/L/C grid with only the close coloured, and volume; the chart's precision (sub-cent prices no longer show `0.00`), locale, timezone and bar spacing; stays inside the plot. New `setLocale`, `setPricePrecision`, `setTimezoneOffset`, `CrosshairTooltipContext` and `formatTooltipTime`.
- **Loader redesign** (`ChartWidget`): a run of candles lit one after another over a sweeping accent line; the "Loading chart…" text is for screen readers only (shown under reduced motion and on failure).

### Replay

- **Replay follows the newest bar again**: the first step and every seek show the replay position; each new bar keeps the view at the latest bar while it rests there, and panning back into history pauses the follow.

## 1.2.0 (2026-10-01)

More indicators and drawing tools, and a performance pass measured in a live browser profiler. Wrappers (`@tradecanvas/react` / `vue` / `svelte`) 1.0.5 pick up the new core.

### Drawing tools — 26 → 40

- **New:** Info Line, Trend Angle, Cross Line, Fib Channel, Fib Speed Resistance Fan, Schiff and Modified Schiff Pitchforks, XABCD and ABCD patterns, Head and Shoulders, Circle, Date and Price Range (with volume traded), Cyclic Lines, Price Label. Earlier in this release: Horizontal Ray and Long/Short Position.
- **Widget toolbar regrouped by tool family** (Lines, Horizontal/Vertical, Channels, Fibonacci, Shapes, Gann & Pitchforks, Patterns, Measure, Annotation, Forecasting) — also surfaces Fib Time Zones, Anchored VWAP and Fixed Range Volume Profile, which were registered but missing from the toolbar.
- Measuring labels use a precision that fits the price level instead of a fixed 2 decimals.

### Indicators — 70

- **New:** VWMA, Envelope, TEMA, Weighted MA.
- **Incremental updates on live ticks** — new optional `IndicatorPlugin.update()`; built-ins recompute only the forming bar (a tick with 4 indicators at 100k bars: ~96 ms → ~0.001 ms).
- **`IndicatorValueMap`** — array-backed drop-in `Map` for indicator values; full recalculation on a symbol/timeframe switch is ~2.5–3.5× faster.

### Performance

- `Viewport.getState()` snapshots are cached instead of deep-cloned 8–10× per frame; indicator auto-scale scans only the visible range; `Intl` number/date formatters are cached (hover frames ~0.64 → ~0.23 ms).
- The price scale no longer jumps while live data streams in; new bars don't yank you out of history.

### Sub-cent prices

- Legend, crosshair pill and last-price tag follow the market's `pricePrecision` (or the axis's precision) in the configured `numberLocale` — PEPE-class prices no longer show "0.00".
- The price axis auto-widens to fit long labels instead of clipping them; ordinary prices keep the 70px default.

### Symbol / timeframe switching

- **Smooth loading** — fast switches swap in place with no flash; slow ones veil the previous chart with a loading card after 200 ms; failures say so and recover on retry.
- **Race-free** — superseded history responses are dropped (`StreamManager`, `ChartWidget`, `Chart.connect`); adapters detach every socket handler on disconnect.
- `setData` resets auto-scale so each switch fits the new data.

### Widget

- `locale` / `messages` i18n with built-in Vietnamese; `numberLocale` fixes; watchlist `refPrice` precedence.
- `widget.toggleReplay()` opens bar replay from code.
- The cursor-following OHLCV popup is off by default (the legend shows the same data); `chartOptions.features` no longer wipes the other feature defaults.

## 1.0.1 (2026-08-28)

Patch release for the core packages, plus the first public release of the framework wrappers.

### Fixes

- **`visibleRangeChange` now fires** — along with the sibling `priceRangeChange` and `zoomChange` events. All three were typed and documented but never emitted anywhere in `Chart`; they now fire on every pan, zoom, resize, and data update, but only when that slice of viewport state actually changed. `visibleRangeChange` payload is `{ from, to }` bar indices, `priceRangeChange` is `{ min, max }`, `zoomChange` is `{ barWidth }` CSS pixels per bar.
- **Sparse-series panning** — a chart whose loaded bars don't fill the pane (e.g. a Year view with a handful of candles) could not be panned at all; the offset was welded to a single value. The view still rests at the same right-aligned position by default, it's just no longer locked there. Dense series are unaffected.

### Framework wrappers

- **`@tradecanvas/react`, `@tradecanvas/vue`, and `@tradecanvas/svelte` are now public** (1.0.0) — thin reactive `<TradeCanvas>` components around `@tradecanvas/chart` with props for symbol / timeframe / theme / chart type / indicators / data / adapter / signal markers / trade zones, lifecycle cleanup, and access to the underlying `Chart` via `onReady` / ref / `bind:chart`. Pinned to `@tradecanvas/chart@^1`.

## 1.0.0 (2026-07-01)

First stable release — everything an open-source trading chart needs, batteries-included and zero-dependency. The public API is now semver-stable for the 1.x line. Cumulative since 0.9.0 (0.10–0.14 added 30+ indicators and several chart types); the headline additions:

### Data

- **Coinbase, Bybit, and Kraken adapters** (free, no API key) join the built-in Binance adapter.
- **Generic adapter bases** — `WebSocketAdapter` (live + REST history) and `PollingAdapter` (REST-only feeds) let any source plug in with ~20 lines: a URL and a parse function. The base handles the connection lifecycle, reconnect, decoding, and event emission.

### Trading

- **Live execution** — `chart.connectExecution(adapter)` turns the display-only trading overlay into a real trading surface. The chart routes its order/position intents into an `ExecutionAdapter` and renders the authoritative orders/positions it reports back (the adapter is the single source of truth). Ships a `PaperExecutionAdapter` sandbox; failures surface on a single `executionError` event.
- **Drag-to-create orders** — `chart.startOrderDraft(side)` drops a draggable order line; drag it to a level and `confirmOrderDraft()` places it (limit vs stop inferred from the level relative to the current price).

### Extensibility

- **Plugin SDK** — register custom **indicators**, **drawing tools**, **chart types**, and **overlays**: globally via `registerPlugin`, per-chart via `new Chart(el, { plugins })`, or imperatively via `chart.plugins.register`. Custom chart types and overlays render through the engine.

### Layout

- **Resizable panes** — drag the divider between the main chart and an indicator pane (or between panes) to resize it, with mouse or touch; each pane keeps an independent price scale.

### Performance

- **LTTB downsampling** — line and area charts downsample the visible range to ~2 points per pixel (Largest-Triangle-Three-Buckets) when the bar count far exceeds the pixel width, keeping 100k+ bar charts smooth. Visually identical, and a no-op at normal zoom.
- **Benchmark harness** — a new `pnpm bench` (vitest bench). Downsampling 100k points to 1,600 runs in ~0.32 ms.

### Frozen contracts

The `DataAdapter`, `ExecutionAdapter`, and Plugin SDK interfaces (`IndicatorPlugin` / `DrawingPlugin` / `ChartTypePlugin` / `OverlayPlugin`), plus the chart event names and payloads, are now semver-stable for the 1.x line.

### Breaking changes

- `chart.replay()` is renamed to `chart.replayStart()`, for consistency with `replayPause` / `replayResume` / `replayStop` / `replaySeek`.

### Notes

- The React / Vue / Svelte wrapper packages remain private and are deferred to 1.1.

## 0.9.0 (2026-06-02)

Major UX upgrade — pro-grade interaction across the board, with new
analytics depth and workflow features.

### Chart interaction

- **Axis-drag scaling**: drag the price axis vertically to compress / expand the price scale; drag the time axis to zoom. Double-click either axis to reset (auto-scale / fit-content).
- **Shift+drag measure ruler**: transient overlay showing bars × time × price Δ × % between two points. Tracks data through pan/zoom.
- **Alt+click pinned tooltip**: anchor an OHLC tooltip at a bar; the live crosshair tooltip then shows the price / % / bar-count delta to the pinned bar. `Esc` unpins.
- **Hover axis pills**: Price (right) + time (bottom) pill badges follow the crosshair with a triangular notch pointing at the line. Inverted theme colors so they always pop.
- **Bar hover highlight**: subtle translucent column behind the crosshair marks which bar the cursor is on — disambiguates dense candle charts.
- **Cursor hints**: `ns-resize` over the price axis strip, `ew-resize` over the time axis strip.

### Widget

- **Symbol search modal**: clicking the toolbar symbol (or pressing `Ctrl/⌘+P`) opens a fuzzy-search picker over the configured `symbols[]`. Replaces the previous click-to-cycle behaviour.
- **Hotkey sheet** (`?`): categorized keyboard-shortcut reference.
- **Replay scrubber UI**: toolbar play button toggles a floating bottom scrubber bar — play/pause, step-back/step-forward, draggable progress, speed select (0.5×–100× bars/sec). Drives the existing `chart.replay*()` API.
- **Watchlist sidebar** (`watchlist: true`): right-side panel listing the widget's symbols with last price, % change, and a mini sparkline. Click a row to switch chart.
- **Saved layouts** (`persistLayouts: true`): per-symbol indicator stack, drawings, alerts, and chart type persist to localStorage. Switch symbol → state is auto-saved; switch back → state is restored. `widget.clearSavedLayout(symbol?)` resets.
- **Drag-and-drop CSV / JSON** (`dragDropImport: true`, default): drop an OHLCV file onto the chart and it loads instantly. Toast feedback for success / failure. New `parseOHLCV` exported for programmatic use.
- **Toast helper**: `widget.toast(msg, kind?)` for transient feedback.
- **Premium CSS refresh**: new design tokens (motion, elevation, shape), Inter + JetBrains Mono stacks, smoother cubic-bezier transitions, refined hover/active/focus states, gradient toolbar/sidebar surfaces, larger radii on modals/palette, animated `connected` status pulse, refined scrollbars, reduced-motion support.

### Chart visuals

- **Volume Profile**: optional horizontal histogram of traded volume bucketed by price over the visible range, with point-of-control highlighting. `chart.setVolumeProfileVisible(true)`.
- **Day-separator dividers**: faint vertical lines at day boundaries on intraday data, heavier at week/month/year with inline date labels (`Mar 4`, `Apr '26`, `2027`). Auto-suppressed on daily-or-coarser timeframes.
- **In-canvas axis polish**: price + time axes now render with subtle dividers, thin tick notches, and refined typography weight (dropped the heavy per-label background rectangles for a cleaner feel).

### Analytics

- **Strategy library**: four reference strategies under `@tradecanvas/analytics` — `smaCrossStrategy`, `rsiReversionStrategy`, `donchianBreakoutStrategy`, `bollingerReversionStrategy`. All return a `StrategyFn` ready to feed `Backtester.run()`.
- **Monte Carlo simulation**: `runMonteCarlo(initialCash, trades, opts)` shuffles realised trade order N times to expose path-dependence. Returns per-step P5/P25/P50/P75/P95 equity bands, final-equity percentiles, probability-of-profit, and worst-case max drawdown. Deterministic with a seed.

### Internals & exports

- New `Viewport.scalePriceRange(factor)` and `AxisDragHandler` for custom axis interactions.
- New `MeasureOverlay` and `PinnedTooltip` exports from `@tradecanvas/core`.
- New `VolumeProfileRenderer` export from `@tradecanvas/core`.
- New `parseOHLCV`, `DragDropImporter` exports from `@tradecanvas/chart`.
- `ReplayManager.seekTo` now emits a synchronous `bar` event so seeking while paused immediately repaints the chart slice.

### Behavioural notes

- Toolbar symbol-click now opens the search modal (was: cycle through symbols). Hold the same prop name in your code; behaviour upgrades.
- `dragDropImport` is enabled by default in the widget — pass `false` if a parent surface already handles drops.
- `SessionBreaks` auto-suppresses its lines on daily-or-coarser timeframes so weekly charts don't paint a wall of separators.

## 0.8.1 (2026-05-26)

### Bug fixes

- **`features.tradingContextMenu` flag is now wired through to the right-click handler.** Previously the flag existed in `FeaturesConfig` but `InteractionManager` always called `preventDefault()` and routed to the trading manager regardless of whether the custom menu would render. The result: projects setting `tradingContextMenu: false` (or any config that kept trading on but the menu off) suppressed the native browser context menu without showing a replacement, leaving users with no right-click affordance at all
- `Chart.ts` now passes `features.tradingContextMenu` into the `TradingManager` config (`contextMenu.enabled`)
- `InteractionManager.onContextMenu` only calls `preventDefault()` when the trading context menu actually opens

### Usage

Projects that don't use trading can now opt out cleanly:

```ts
new Chart(host, { features: { trading: false } })            // no trading at all
new Chart(host, { features: { tradingContextMenu: false } }) // keep orders/positions, drop the menu
```

In both cases, native browser right-click works on the chart as expected.

## 0.8.0 (2026-05-26)

### Features

- **Strategy backtester** — new `@tradecanvas/analytics` package with a bar-by-bar `Backtester`. Strategy fn runs at close of each bar; orders placed on bar N fill on bar N+1 (market → next-bar open, limit/stop → when the next bar trades through the trigger). Returns fills, closed trades, equity curve, and summary metrics
- **Portfolio tracking** — `Portfolio` class tracks cash, one net position, realized P&L, and the equity curve. Supports partial closes and position flips with correct realized-PnL accounting
- **Risk metrics** — `computeRiskMetrics()` returns Sharpe, Sortino, Calmar, CAGR, max drawdown, win rate, profit factor, expectancy, average win/loss. Periods per year auto-detected from equity-curve timestamps; configurable risk-free rate
- **Commission & slippage models** — `FixedCommission`, `PercentCommission`, `PerShareCommission`, `NO_SLIPPAGE`, `PercentSlippage`, `RangeBasedSlippage`. Pluggable via `Backtester` constructor
- **Replay mode** — new `ReplayController` in `@tradecanvas/core`. Decoupled from `Chart` so it can drive both UI playback and headless backtests. Supports `start` / `pause` / `resume` / `step(n)` / `seek(index)` / `setSpeed(barsPerSecond)` with typed `bar` / `finished` / `stateChange` events
- **Equivolume chart type** — full-range boxes with width proportional to volume share; color tracks close vs prior close (Richard Arms style). Switch via `chart.setChartType('equivolume')`
- **Fibonacci Time Zones drawing** — `fibTimeZones` tool draws vertical Fibonacci-interval lines (1, 2, 3, 5, 8, 13, 21, 34, 55) projected from a two-anchor time span. Useful for forecasting future swing points based on prior cycle duration
- **Multi-page SvelteKit docs site** — replaced single-page demo with 18 prerendered routes (`/`, `/docs/*`, `/examples`, `/playground`, `/changelog`, `/embed`) using `@sveltejs/adapter-static`. SEO-friendly per-page metadata, sitemap, robots.txt
- **Live backtest demo** — `/docs/analytics` includes a runnable backtest panel (SMA(10/30) cross on 365 days of deterministic synthetic data) with equity-curve canvas, drawdown shading, play/pause/scrub controls, and 8 live metric tiles

### API additions

- New package `@tradecanvas/analytics` exporting `Backtester`, `Portfolio`, `computeRiskMetrics`, `FixedCommission`, `PercentCommission`, `PerShareCommission`, `ZERO_COMMISSION`, `NO_SLIPPAGE`, `PercentSlippage`, `RangeBasedSlippage`, plus `StrategyContext`, `StrategyFn`, `BacktestResult`, `RiskMetrics`, `Fill`, `ClosedTrade`, `PortfolioPosition`, `EquityPoint`, `Side`, `OrderType`, `OrderStatus`, `TimeInForce`
- `ReplayController` exported from `@tradecanvas/core` and `@tradecanvas/chart` along with `ReplayBarEvent`, `ReplayEventMap`, `ReplayOptions`, `ReplayStateChangeEvent`, `ReplayStatus`
- `EquivolumeRenderer` exported from `@tradecanvas/core`
- `FibTimeZonesTool` exported and auto-registered by `registerBuiltInDrawingTools`
- `'equivolume'` added to `ChartType`; `'fibTimeZones'` added to `DrawingToolType`
- Widget catalog (`CHART_TYPES`) lists Equivolume

### Test coverage

- New `@tradecanvas/analytics` package ships with 22 unit tests across `Backtester`, `Portfolio`, and `RiskMetrics`
- New `ReplayController` test suite (8 tests) covering step, seek, start/pause/resume, fake-timer playback, and startIndex
- Total project tests: 273 passing across 41 test files

## 0.7.1 (2026-05-20)

### Bug fixes

- **Drawings persist correctly across timeframe / symbol switch** — drawing manager state was being cleared when the live stream reconnected. Drawings now survive timeframe and symbol changes when `persistDrawings` is enabled

## 0.7.0 (2026-05-14)

### Features

- **Multi-Chart Grid** — new `ChartGrid` class for 2/4/6 synchronized charts with linked crosshairs and shared time axis. Layouts: `'1x2'`, `'2x2'`, `'2x3'` and more. `connectAll()` for bulk data source binding
- **4 new chart types** — Volume Candles (width proportional to volume), HLC Area (high-low-close band), Step Line (staircase pattern), Line with Markers (dots at data points). Total: 16 chart types
- **Command Palette** — `Ctrl+K` / `Cmd+K` quick search inside ChartWidget for indicators, chart types, drawing tools, timeframes, and actions (screenshot, theme toggle, settings). Keyboard navigation with arrow keys and Enter
- **Visual Price Alerts** — `AlertManager.render()` now wired into the overlay layer. Alert lines show bell icon, price label, and triggered/pending color states on the live chart
- **Signal Markers API** — `chart.addSignalMarker()` renders directional arrows on the overlay with confidence-based sizing, per-source color coding, and labels. Designed for bot/signal trading integrations
- **Trade Zones** — `chart.addTradeZone()` visualizes entry→exit rectangles with P&L coloring, direction badges, and exit labels. Supports active (open) and closed trades with `updateTradeZone()`

### API additions

- `chart.getData()` — public access to raw OHLC data series
- `chart.setCrosshairPosition(point)` — programmatic crosshair placement for cross-chart sync
- `ChartGrid.connectAll(adapter, symbols, timeframe)` — bulk connect all grid cells to live data
- `ChartGrid.setLayout(layout)` — dynamically switch grid layout, adding/removing charts as needed
- `chart.addSignalMarker(marker)` / `setSignalMarkers()` / `clearSignalMarkers()` / `setSignalMarkerStyle()`
- `chart.addTradeZone(zone)` / `updateTradeZone()` / `setTradeZones()` / `clearTradeZones()` / `setTradeZoneStyle()`
- New event types: `signalMarkerAdd`, `signalMarkerRemove`, `tradeZoneAdd`, `tradeZoneRemove`
- New types: `SignalMarker`, `SignalDirection`, `SignalMarkerStyle`, `TradeZone`, `TradeZoneDirection`, `TradeZoneStyle`

## 0.6.0 (2026-04-28)

### Features

- **7 new indicators**
  - **Hull MA** (overlay) — low-lag WMA-of-WMA-diff smoothing
  - **Pivot Points (Classic)** (overlay) — S3/S2/S1/PP/R1/R2/R3 with configurable lookback window
  - **Anchored VWAP** (overlay) — VWAP that resets at a chosen `anchorTime`
  - **ZigZag** (overlay) — swing-pivot connector with percentage-deviation threshold
  - **Linear Regression Channel** (overlay) — least-squares fit + std-dev bands
  - **Awesome Oscillator** (panel) — fast/slow median histogram with up/down coloring
  - **Chaikin Oscillator** (panel) — EMA(ADL, fast) − EMA(ADL, slow), exposes cumulative ADL
- **Range Bars chart type** (`'rangeBars'`) — fixed price-range bars (each bar's high − low equals a configured range), with `toRangeBars` transform
- **Trading overlay customization** (additive, no breaking changes)
  - `TradingPosition.closedQuantity` — partial-close visualization as a left-edge dim band proportional to closed fraction
  - `TradingConfig.pnlThresholds: PnLThreshold[]` — multi-stop color gradient driven by live P&L
  - `TradingConfig.positionLabel: string | (ctx) => string` — token templating (`{side}`, `{qty}`, `{openQty}`, `{closedQty}`, `{entry}`, `{price}`, `{pnl}`, `{pnlPct}`, `{pnlSign}`)
- **Web Worker indicator pipeline** — new `IndicatorWorkerHost` and bundled `indicator.worker.js` register all 33 built-in indicators. Promise-based `host.calculate(...)` offloads heavy compute off the render loop. Pass `null` for the worker to use the synchronous fallback (SSR, tests, safety net). Per-request timeout, `ping()` health check, `terminate()` cleans up pending work

### Type safety

- New `getNumberParam` / `getIntParam` helpers exported from `@tradecanvas/core`
- All 25 existing indicators migrated to the helpers — invalid params (NaN, Infinity, missing keys, non-numeric strings) now fall back to documented defaults instead of silently propagating to calculations
- `BinanceAdapter` REST and WS payloads now flow through typed `parseRestKline` / `parseWsKline` validators; `any[]` and `any` casts are gone
- `TextAnnotationTool` text resolution moved to a pure `resolveAnnotationText` helper (no more `as string` cast)
- `ChartStateManager.deserialize` validates the parsed shape — malformed drawings/orders/positions/indicators are filtered, missing or wrong-typed viewport fields fall back to defaults

### Internal refactor

- `WidgetStyles.ts` (764 LOC of CSS-in-string) extracted into a sibling `WidgetStyles.css` file, imported via Vite's `?raw` query and inlined at build time. The TS shim is now 31 LOC; CSS is editable as CSS (syntax highlighting, linting). Public API (`injectWidgetStyles` / `removeWidgetStyles`) unchanged.
- Chart-type dispatch (`createChartRenderer` and `getDisplayData`) extracted from `Chart.ts` into a new `ChartTypeStrategy` module with `createRendererFor`, `transformDisplayData`, and `isTransformedChartType` helpers
- Auto-save debounce extracted into `AutoSaveScheduler` (testable state machine, owner injects the save callback)
- Indicator panel scaling math extracted into `computeIndicatorPriceRange` (now correctly skips NaN/Infinity values)
- Removed duplicate `timeframeToMs` private method from `Chart.ts`; uses the shared helper from `@tradecanvas/commons`
- `Chart.ts`: 1632 → 1536 LOC

### Test coverage

- 267 tests across 40 files (Vitest scaffolded in `@tradecanvas/core` and `@tradecanvas/chart`)
- 25/33 indicators with direct test coverage
- New tests for: indicator math (Hull MA, Pivot Points, Anchored VWAP, ZigZag, LRC, Awesome / Chaikin Oscillator, BB, ATR, Stochastic, OBV, VWAP, Ichimoku, Supertrend, Keltner, Donchian, ADX, CCI, MFI, Williams %R, Parabolic SAR), range-bar transform, trading position formatting, drawing-tool hit-test geometry, `DrawingManager` CRUD, Binance kline parsers, `ReconnectManager` backoff/cap/give-up, `TickAggregator` (tick + pre-formed-bar paths, ring buffer eviction), `ChartState` JSON + localStorage round-trip + validator, `IndicatorWorkerHost` (worker + fallback), `ChartTypeStrategy`, `AutoSaveScheduler`, `IndicatorPriceRange`
- GitHub Actions CI workflow added under `.github/workflows/test.yml` (Node 20.19, pnpm 9.15, builds commons, runs `pnpm test`)
- Root `pnpm test` runs both packages

### Demo

- Chart-types dropdown extended with Renko, Kagi, Line Break, Point & Figure, **Range Bars**
- Indicator picker extended with Hull MA, Anchored VWAP, Pivot Points, ZigZag, Linear Regression Channel, Awesome Oscillator, Chaikin Oscillator (all 33 indicators selectable)

## 0.5.0 (2026-04-16)

### Features

- **ChartWidget — built-in trading UI** — new `@tradecanvas/chart/widget` subpath export. One-line embed with complete toolbar, drawing sidebar, settings modal, and status bar. Zero framework dependencies, CSS scoped with `tcw-` prefix
- **Typed event payloads** — `chart.on('orderModify', e => e.payload.orderId)` infers payload type via `ChartEventMap`. Includes `OrderModifyPayload`, `PositionModifyPayload`, `OrderPlacePayload`, and 10 more typed payloads
- **Timestamp normalization** — `normalizeBar({ t, o, h, l, c, v })` converts wire format to OHLCBar. `normalizeBarTime()` auto-detects seconds vs milliseconds
- **`chart.setTimeframe(tf)`** — switch timeframes on active stream without destroy/rebuild
- **`chart.appendBars(bars)`** — bulk append for reconnect catch-up (single indicator recalculate)
- **`chart.setStatusText(text)`** — display status in chart legend area (e.g. "LIVE · 8ms")
- **`chart.setCurrentPrice(price, pulseColor?)`** — optional pulse color
- **`DARK_TERMINAL` theme** — fintech terminal palette (#0E0E0E bg, #00FF87/#FF3B4D candles, monospace font)
- **`DataAdapterEventType` exported** — adapters can `implements DataAdapter` with full type safety

### Documentation

- JSDoc on `DataAdapter` interface clarifying observer pattern (reconnect to switch)
- `OHLCBar.time` documented as milliseconds
- All event payload types exported from main index

## 0.4.0 (2026-04-16)

### Features

- **Locale-aware number formatting** — new `numberLocale` option on Chart (BCP 47 format like `'en-US'`, `'de-DE'`, `'vi-VN'`)
  - `'en-US'` → `65,234.00`
  - `'de-DE'` → `65.234,00`
  - `'vi-VN'` → `65.234,00`
  - Runtime change: `chart.setNumberLocale('de-DE')`
  - Affects price axis, crosshair tooltip, indicator legend, trading overlay

### Bug Fixes

- **Keyboard shortcuts were broken** — `KeyboardHandler` was constructed then discarded with `void new`. Arrow keys, +/-, Home/End, and Space did nothing. Now properly wired to window with focus-aware handling (ignores keystrokes in inputs/textareas)
- **Streaming indicators froze until bar close** — `updateLastBar()` and `updateLastBarFromTick()` now recalculate indicators on every tick. Moving averages, Bollinger Bands, RSI, etc. now update in real-time
- **StreamManager listener leak** — adapter listeners accumulated on reconnect because unsubscribers weren't tracked. Now properly cleaned up across connect/disconnect cycles
- **Price formatting without thousand separators** — `formatPrice()` now uses `toLocaleString` for readability (`65,234.00` vs `65234.00`)

### Performance

- **`getBoundingClientRect` cached** in InteractionManager — was called on every mousemove. Now invalidated only on pointerdown, resize, and scroll. Major reduction in layout flushes during pan/crosshair
- **`structuredClone` replaced** in drag/resize hot paths with hand-rolled shallow clone (5-10x faster for `DrawingState` shape)

## 0.3.0 (2026-04-16)

### Features

- **WaterfallChart** — Running cumulative visualization with positive/negative/total bar types. Perfect for P&L attribution, revenue bridges, cash flow analysis
  - Auto-detects bar type from value sign (explicit `type` always wins)
  - Dashed/solid/none connector lines between bars
  - Value labels, category labels, crosshair tooltip with cumulative total
- **GaugeChart** — Speedometer-style gauge for KPIs, risk scores, sentiment
  - Colored zones for value ranges
  - Smooth `setValue()` animation with easeOutCubic
  - Configurable arc angles and thickness
  - Center value label + optional subtitle

### Performance

- Batched path operations grouped by color (single fill per color group)
- Integer pixel rounding for crisp 1px lines
- Cached trig calculations in gauge rendering
- rAF-coalesced animation (safe on rapid `setValue` calls)
- No per-element `beginPath+stroke` loops

## 0.2.0 (2026-04-16)

### Features

- **Finance Chart Components** — 4 new standalone chart types:
  - `SparklineChart` — tiny inline line/area chart for dashboards and KPI cards
  - `DepthChart` — bid/ask order book visualization with cumulative volume areas
  - `EquityCurveChart` — portfolio equity with drawdown shading and benchmark comparison
  - `HeatmapChart` — colored cell grid with treemap layout (weighted by market cap)
- **Client-side order matching engine** — auto-fills limit/stop orders with configurable spread and commission
- **Trade history** — tracks fills, SL/TP triggers, manual closes with win rate and PnL stats
- **Toast notifications** — animated alerts for order fills and SL/TP triggers
- **StackBlitz sandboxes** — "Open in StackBlitz" for Vanilla JS, React, Svelte, Vue
- **Finance charts demo section** — live sparklines, equity curve, depth chart, heatmap on demo page

### Bug Fixes

- Sparkline container bindings in Svelte 5 — use plain array for `bind:this` in `{#each}`
- BaseFinanceChart re-measures dimensions if 0 on first render (initial mount race)
- Rename `version` and `release` scripts (npm reserved lifecycle names)

## 0.1.3 (2026-04-15)

### Bug Fixes

- **Panel indicators not rendering until chart interaction** — `addIndicator()` now calls `updateViewportAndRender()` for panel indicators so they appear immediately
- **Stop orders showing LIMIT label** — context menu orders now preserve the correct type (LIMIT, STOP, STOP LIMIT)
- **npm publish with workspace:\* deps** — previous versions were published via `npm publish` which doesn't convert `workspace:*`. Now using `pnpm publish` for proper version resolution

### Features

- **Auto-scale includes overlay indicator values** — main chart Y-axis expands to fit Bollinger Bands, Ichimoku, Keltner, etc. instead of clipping them
- **TC prefix on all generated IDs** — indicator instances (`tc_sma_1`), drawings (`tc_drawing_1`), alerts (`tc_alert_1`) to prevent collisions
- **Trade-on-chart via built-in context menu** — right-click to place Buy Limit, Sell Limit, Buy Stop, Sell Stop at clicked price
- **`Viewport.setPriceRange()`** — new public method for direct price range control
- **`IndicatorEngine.getOverlayPriceRange()`** — compute min/max of visible overlay indicator values

## 0.1.2 (2026-04-15)

### Features

- **Demo site** — Svelte 5 demo with a full trading UI (live chart, drawing sidebar, dropdowns, settings modal)
- **Developer documentation** — 11 guide sections: Getting Started, Data, Adapter, Themes, Indicators, Drawings, Trading, Features, Events, State, API Reference
- **StackBlitz sandboxes** — interactive "Open in StackBlitz" for Vanilla JS, React, Svelte, Vue
- **Paper trading panel** — fake buy/sell with balance, PnL, localStorage persistence
- **Replay button** — play/pause/stop in toolbar header
- **Package manager switcher** — npm/pnpm/yarn tabs on install command

### Examples

- Updated examples/basic and examples/vanilla-static with modern UI
- Added examples/svelte (Svelte 5 + Vite)
- Added examples/vue (Vue 3 + Composition API)
- Updated examples/react with toggle buttons and chart type dropdown

### Documentation

- README with Svelte and Vue framework integration examples
- Per-package READMEs for npm pages (@tradecanvas/commons, @tradecanvas/core, @tradecanvas/chart)

## 0.1.1 (2026-04-15)

### Bug Fixes

- Fix repository URLs pointing to wrong GitHub repo
- Fix all TypeScript declaration errors (unused imports, missing index signatures, missing TimeFrame entries)
- Fix volume type mismatch in DataManager sanitizeBar
- Add `publishConfig.access: "public"` for scoped packages
- Add `prepublishOnly` build scripts

## 0.1.0 (2026-04-09)

- Initial release of `@tradecanvas/chart`, `@tradecanvas/core`, and `@tradecanvas/commons`.
