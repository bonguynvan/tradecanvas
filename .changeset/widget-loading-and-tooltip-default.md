---
'@tradecanvas/chart': patch
---

- `ChartWidget` now defaults `features.crosshairTooltip` to `false` — the
  floating OHLCV popup that follows the cursor isn't something TradingView
  has either; the widget already shows the same data in its OHLCV legend.
  (The headless `Chart` class's own default is unchanged — still `true`.)
  Opt back in with `chartOptions: { features: { crosshairTooltip: true } }`.
- Fixed a real bug found while wiring that default in: `ChartWidget` spread
  `...options.chartOptions` *after* its own `features` object, so any host
  passing `chartOptions.features` silently wiped every other feature
  default (drawings, indicators, trading, …). `features` is now merged
  per-key, with host overrides winning.
- New TradingView-style loading overlay — animated skeleton bars + a
  localized "Loading chart..." label, cross-fading out once the first
  snapshot of bars lands. Shows on every connect (initial load and
  symbol/timeframe switches), not just the first one.
