---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Faster, race-free symbol/timeframe switching with a TradingView-style
loading state — measured in the live demo before and after.

**Loading only when it's slow.** `ChartWidget` used to blank the chart with
its loading overlay on every switch, so a normal ~130 ms request flashed.
Now the previous chart stays on screen and is veiled (dimmed, with a
"Loading chart..." card) only if the switch outlasts 200 ms; fast switches
just swap. The first load still shows the opaque skeleton immediately. Local
timeframe switches over static data (resampling) that are slow — 50k+ bars,
or the last one took 48 ms+ — veil the chart and let it paint *before* the
main thread gets busy, instead of looking frozen. A failed history request
shows "Connection failed" on the veil and the status bar, and clears itself
when the stream's automatic retry succeeds. Outside a load, the status bar
now follows the stream's connection state (reconnecting / error / live)
instead of claiming "Live" no matter what — while a single transient error
on a healthy connection (one failed poll) no longer sticks.

**Fixed: the widget's loading overlay never went away without an adapter.**
It was tied to the connection state, which stays `connecting` when the host
feeds static data via `widget.setData()` / `getChart().setData()`. Any new
bars now end the loading state.

**Fixed: stale responses during fast switching.**
- `StreamManager`: a history request that a newer `connect()`,
  `switchTo()` or `disconnect()` superseded is dropped instead of
  overwriting the newer data (with `switchTo`, a slow earlier timeframe
  could land last and win), and its failure is no longer reported or
  retried. `switchTo()` also no longer lets the adapter's own
  `'disconnected'` (e.g. `PollingAdapter`) schedule a reconnect that
  superseded the switch when its request took longer than the retry delay.
- `ChartWidget`: a superseded connect no longer marks the widget connected
  or hides the loading state while the newer one is still loading.
- `BinanceAdapter` / `WebSocketAdapter` (Bybit, Coinbase, Kraken):
  `disconnect()` now detaches all socket handlers, not just `onclose` —
  closing a socket that was still connecting fired `error` into the next
  connection's listeners on the reused adapter.
- `Chart.connect()` superseded by a newer one no longer resets the bar
  countdown to the old timeframe; `Chart.switchStream()` / `setTimeframe()`
  now update the countdown at all.

**Cheaper full loads.** A switch recomputes every indicator over the whole
history; most of that time went into building each indicator's `values`
`Map` keyed by timestamps. New `IndicatorValueMap` (exported) is a drop-in
`Map<number, IndicatorValue>` that keeps entries in arrays while keys arrive
in ascending order and binary-searches lookups, falling back to a real Map
otherwise; all built-in indicators use it (the indicator Web Worker posts
results as plain Maps, since structured clone can't see its array-held
entries). `setData` also reuses
already-valid bars instead of copying each one. BB + EMA + RSI + MACD full
recalculation: 20k bars ~13 → ~5 ms, 100k bars ~96 → ~27 ms (`pnpm bench`).

Demo: `/embed?latency=1500` simulates a slow network (shows the veil on
switches); `/embed?bars=200000&timeframe=1m` loads a large static series
whose timeframe switches resample locally.
