---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

Performance audit, round 2 — measured in a live browser profiler before and
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
