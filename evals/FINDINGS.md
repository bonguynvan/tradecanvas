# Findings

What writing and running the evals turned up about the library, for the
fixes that follow. Each says where it showed and what an agent (or a person)
runs into, and, once fixed, what changed (the eval tasks then gain a right
answer that only the fix lets pass).

## From writing the graders

1. **No `getChartType()`.** `setChartType` has no getter; the chart's type reads
   back only from `saveState()`. An agent checking its work, or a host keeping
   a toolbar in step, has to guess. (Task 01.)
   *Fixed in 1.45.0:* `getChartType()`.
2. **A live price from `updateLastBar` or `appendBar` fires no alert.** Alerts
   and the orders' current price follow `setCurrentPrice` and a connected
   stream only. The skill teaches `updateLastBar` for live feeds, so alerts
   set on a chart fed by hand never go off, and nothing says why. (Task 07:
   its reference calls `setCurrentPrice` beside `updateLastBar`.)
   *Fixed in 1.45.0:* `updateLastBar`, `updateLastBarFromTick`,
   `appendBar` and `appendBars` are the live price; task 07's reference
   feeds the bar alone.
3. **`dataUpdate` is not what the docs say.** The event table gives its payload
   as "the series"; it carries `{ length }`, `{ alert, … }`, `{ connection }`
   or `{ error }` depending on who sent it, and `updateLastBar` / `appendBar`
   don't send it at all. An agent listening for new bars hears nothing.
   *Fixed in 1.45.0:* each payload has a `kind`, the type says so
   (`DataUpdatePayload`), and a new bar sends `{ kind: 'bars', length }`, by
   hand or by the stream.
4. **Time zone, four spellings.** The option is `timeZone`, the methods
   `setTimezone` / `getTimezone` / `getEffectiveTimezone`, `SymbolInfo` has
   `timezone`, `MarketConfig` has `timeZone`. Writing the reference, the
   option went in as `timezone` (from the methods' name) and failed the type
   check. (Task 10.)
   *Fixed (Unreleased):* one spelling, `timeZone`, as `Intl.DateTimeFormat`
   has it: `setTimeZone`, `getTimeZone`, `getEffectiveTimeZone`,
   `getExchangeTimeZone`, `EXCHANGE_TIME_ZONE` and `SymbolInfo.timeZone`.
   The older names still work, marked deprecated. Task 10 has a right answer
   in the new spelling, and keeps the one in the old.
5. **A market's zone isn't the chart's.** `MARKET_HOSE` carries
   `timeZone: 'Asia/Ho_Chi_Minh'`, but `setMarket(MARKET_HOSE)` leaves the
   axis in the browser's zone; the zone has to be set again. (Task 10.)
   *Fixed in 1.45.0:* `setTimezone('exchange')` shows the market's zone
   when the symbol names none, and `setMarket` says so; the axis still keeps
   a zone chosen otherwise. Task 10 has a right answer that uses it.

## From the baseline (2026-10-24, Sonnet)

[The baseline](baselines/2026-10-24-sonnet.md): 96 runs, two failures, and
where the agents had to read the compiled code to get on.

6. **`onReady` runs inside the constructor.** The widget calls it before
   `new ChartWidget(…)` returns, so `const widget = new ChartWidget(host, {
   onReady: () => widget.openPanel('depthLadder') })` type-checks and throws
   (`Cannot access 'widget' before initialization`). It has no doc comment
   saying when it runs or that it gets only the chart. (Task 18, one run.)
   *Fixed in 1.46.0:* `onReady` runs in a microtask after the constructor
   returns, with the chart and the widget. Task 18's `right-on-ready.ts` is
   the failed answer opening the ladder from `onReady` alone; it passes
   only with the fix.
7. **The watchlist starts shut; not every word says so.** No panel of the
   dock opens by itself, so a watchlist made and never opened is there and
   unseen. The recipe's prose says the panels are "all shut to start with",
   but its own code comment says "on a phone it starts shut", as if not
   elsewhere; the `watchlist` option reads "A watchlist sidebar on the right"
   and says nothing of opening it; the code's comment on the dock still says
   the watchlist is "open to start with". (Task 20, one run.)
   *Fixed in 1.46.0:* the option, the recipe and the code say it starts
   shut and how to open it; task 20 has an answer that opens it in
   `onReady`.
8. **What the docs leave out, agents read in the compiled code**: 25 of 48
   runs without the skill, 12 of 48 with it. Where the runs with the skill
   did it too (both of them, but for task 06):
   - alerts on a price fed by hand: that `updateLastBar` doesn't check them
     (finding 2; task 07). *Fixed in 1.45.0*, and the skill says so;
   - a market preset's rules: `MARKET_HOSE`'s steps, limits and zone are
     only in the JS, its type is `MarketConfig` (task 10). *Fixed in
     1.45.0:* each preset's doc says what it holds;
   - saving drawings: when `saveState` and the auto-save write, and under
     which key (task 06). *Fixed in 1.46.0:* their docs say;
   - a widget with no feed: whether it connects to an exchange by itself
     when `adapter` is left out (task 14). *Fixed in 1.46.0:* the option
     says it doesn't;
   - the React component: what a changed prop does (the data, the options)
     and what unmounting does (task 21). *Fixed in 1.46.0:* its props
     say. A new `data` array still replaces the series, a bar pushed
     included, where Vue and Svelte take it as a tick: a change for its own
     pull request.
9. **`isFeatureOn` reports a switch, not what shows.** With
   `features: { replay: false }` the replay button is gone, yet
   `isFeatureOn('toolbar.replay')` is `true`. The task 15 grader read it so
   and failed three right answers; a host keeping its own menu in step with
   the widget would be wrong the same way. *Fixed in 1.46.0:* its doc,
   the skill and the Customization page say so (the grader took either
   switch already).
