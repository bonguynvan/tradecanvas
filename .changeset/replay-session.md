---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Bar replay reworked.**

- **Live data stays out of the replay.** While a replay runs, stream ticks and
  `appendBar` / `appendBars` / `updateLastBar` / `updateLastBarFromTick` /
  `setCurrentPrice` calls are kept aside instead of landing in the replayed
  slice (orders and price alerts keep tracking the live price). The price
  line and its tag show the replayed close, auto-scale is switched on when the
  replay starts so every step refits, and `replayStop()` now brings back the
  live series with everything that arrived meanwhile (it used to leave the
  replayed slice). `setData()` ends the replay; `connect()` first returns to
  the live series. New `chart.isReplayActive()` and `chart.getPlotRect()`.
- **The replay ends on its last bar**, paused, instead of jumping back to the
  first bar; `getReplayProgress().current` is the bar on screen (`percent`
  counts it), so stepping
  moves exactly one bar. Calling play while playing no longer starts a second
  clock. New `ReplayConfig.paused`: show the start bar at once and wait.
- **ChartWidget**: opening replay asks for a start bar — the bars right of the
  pointer are shaded and a click cuts the chart there, paused; "Random bar"
  picks one, Play starts 100 bars back. The bar shows speeds in bars per
  second (1–50), "Back to realtime" (highlighted at the end), Shift+← / Shift+→
  step one bar and Escape cancels picking a start bar; the bar closes itself if a symbol or
  timeframe switch ends the session. New `widget.replayFrom(index, play?)`.
  English and Vietnamese labels.
