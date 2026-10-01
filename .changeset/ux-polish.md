---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

**Replay follows the newest bar again.** Since free panning, replayed bars
marched off the right edge while the view stayed put. Replay now behaves like
live data: the first step and every seek (back or forward) show the replay
position, and each new bar keeps the view at the latest bar while it rests
there (and `autoScroll` is on); panning back into history stops the follow
until the view returns to the end.

**Loading state redesign.** The `ChartWidget` loader is a short run of candles
lit one after another over a sweeping accent line, in the theme's up/down
colours; the "Loading chart…" text is no longer shown (it stays available to
screen readers), and a failure still shows its message. Motion is
transform/opacity only; under `prefers-reduced-motion` the candles stand still
and the text is shown.

**Crosshair tooltip redesign.** The floating OHLCV card has a header with the
bar's time and a change pill (measured from the previous close, like the
legend), an aligned O/H/L/C grid with only the close coloured, and the volume.
Prices use the chart's precision — a market's `pricePrecision` or the decimals
the visible range needs — so sub-cent prices no longer round to `0.00`;
numbers follow the chart's locale and the time its timezone and bar spacing
(daily bars show the date with the year, sub-minute bars add seconds, a
midnight bar of an intraday series keeps its `00:00`). The card stays inside
the plot and flips before the price axis. New `CrosshairTooltip` setters
`setLocale`, `setPricePrecision`, `setTimezoneOffset`, an optional
`CrosshairTooltipContext` argument to `show()`, and `formatTooltipTime`.
