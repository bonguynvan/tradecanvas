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
   *Fixed in 1.47.0:* one spelling, `timeZone`, as `Intl.DateTimeFormat`
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
     say. A new `data` array still replaced the series, a bar pushed
     included, where Vue and Svelte took it as a tick. *Fixed in 1.48.0:*
     bars that go on from the last go in as ticks, in all three.
9. **`isFeatureOn` reports a switch, not what shows.** With
   `features: { replay: false }` the replay button is gone, yet
   `isFeatureOn('toolbar.replay')` is `true`. The task 15 grader read it so
   and failed three right answers; a host keeping its own menu in step with
   the widget would be wrong the same way. *Fixed in 1.46.0:* its doc,
   the skill and the Customization page say so (the grader took either
   switch already).

## From the runs after the fixes (2026-10-25, Sonnet and Haiku)

[Sonnet](baselines/2026-10-25-sonnet.md) passed 96 of 96 and, with the
skill, read the compiled code in 2 runs (12 before).
[Haiku](baselines/2026-10-25-haiku.md), the first run with a smaller model,
passed 95 of 96 for a tenth of the cost. Without the skill, 22 (Sonnet) and
27 (Haiku) runs of 48 still went to the compiled code; what for is below.

10. **`features: { depthLadder: true }` makes no ladder.** The ladder is
    the `depthLadder` option, off by default; `depthLadder` is also a
    switch, on by default, that only hides it. The comment over the
    widget's on/off options says each "stands for a switch: `toolbar:
    false` is `features: { toolbar: false }`", so turning the switch on
    reads as turning the option on. It type-checks, and nothing shows.
    (Task 18, Haiku with the skill, one run.)
    *Fixed (Unreleased), in the docs:* the `features` and `depthLadder`
    options, the switch list and the skill say a switch never adds a part.
    Letting the switch make the ladder would give one to every widget whose
    switches come back from `getFeatures()`, where all are on. Task 18's
    `wrong-feature-switch.ts` is the failed answer as it was; the checks
    fail it.
11. **Field notes the types drop.** 33 fields of the packages' types (not
    counting Binance's own message types) are
    explained by a `//` comment at the end of their line, which the
    `.d.ts` files leave out: `ReplayConfig`'s `speed` and `interval`
    (one bar every `interval / speed` ms), a stream's reconnect options and
    their defaults, `MarketConfig`'s lot, step and limits. On task 13 both
    models searched the compiled replay code for what `interval` and
    `speed` mean: every run without the skill, and one of Haiku's with it.
    *Fixed (Unreleased):* they are doc comments, Binance's and the union
    members' too, and `fieldDocs.test.ts` fails on a `//` note after a
    field or a member. Writing them showed that the stream passes none of
    `DataAdapterConfig`'s reconnect fields and reads no
    `showCurrentPriceLine`; their notes say so.
12. **No indicator is named in the types.** `addIndicator(id: string,
    params: Record<string, …>)`: the types list no indicator, no input and
    no output line, and the package README gives only their number. Without
    the skill the agents searched the compiled code for `id: 'rsi'`,
    `'macd'`, `'bb'` and their defaults: tasks 03, 04, 21, 23 and 24, in
    19 of those 20 runs, both models. Haiku with the skill did once (task
    23, the bands' `stdDev`). The skill has the generated list
    (`references/indicators.md`); the package had nothing like it.
    *Fixed (Unreleased):* `BuiltInIndicators`, generated from the registry,
    lists each one's inputs with their defaults and the keys of its lines;
    `addIndicator` takes an id from it (or any other), and a misspelt input
    of a built-in fails the type check. The values stay as loose as they
    were, so code that compiled still does but for unknown inputs.
    `scripts/type-tests/indicators.ts` pins what the types accept.
13. **Style keys: where they are, and the wicks'.** The skill names
    `CHART_STYLE_KEYS` and two of its keys. The object is in
    `@tradecanvas/commons`, re-exported by `@tradecanvas/chart`, and the
    agents searched `chart/dist` for `series.candlestick.*` before finding
    it; neither says which keys colour the wicks
    (`series.candlestick.wickUpColor`, `wickDownColor`). Both Sonnet runs
    with the skill (task 09: 16 turns, 11 in the baseline).
    *Fixed (Unreleased):* `applyOverrides`, the `overrides` option and
    `CHART_STYLE_KEYS` say that the body colours colour the wicks too and
    which keys part them; the skill has every key with its kind
    (`references/style-keys.md`, generated).
14. **Smaller gaps, a task each**, where agents read the compiled code:
    - drawing a custom indicator: what `valuesToPoints` and a descriptor's
      `plots` do (05, without the skill, both models);
    - a toolbar button's `icon`: the type says "a built-in icon's name (see
      the docs' icon list)", and the list isn't in the package (16);
    - what a look preset sets (`'terminal'`'s `active` and `toolbar`), to
      change one part of it (19, Haiku, both arms);
    - the order ticket's `onSubmit` and when it is called (17);
    - what `widget.setSymbol` does without an adapter (20);
    - the tick `updateLastBarFromTick` takes (02);
    - `smaCross`'s inputs (22).
