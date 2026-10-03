---
"@tradecanvas/commons": minor
"@tradecanvas/core": minor
"@tradecanvas/chart": minor
---

Sharper, calmer charts.

- **Sharp at any screen scale**: candles, bars, volume and the drawings' horizontal and vertical lines land on whole device pixels. A one-pixel wick is one sharp pixel at 100%, 125% or 200% scaling; it used to spread over two at half strength.
- **Volume as a backdrop**: the bars keep to the bottom 15% of the chart (20% before) in the theme's own `volumeUp` / `volumeDown`, which were ignored. Changing the candle colours in the widget's settings recolours the volume to match. `volumeColor(candleColor)` gives the matching shade for themes of your own.
- **A calmer dark palette**: softer up and down colours and quieter axis labels.
- **Drawings**:
  - Fibonacci levels each come in their own colour with soft bands between them, and their labels sit above the lines.
  - Drawing text uses the chart's font, on a halo of the background so it reads over bars.
  - Solid lines have round ends.
  - Long/Short labels are tags just outside their zones that never overlap.
- **Price axis**: indicator value tags step around the last-price, high/low and order tags, and scale labels under any tag are hidden instead of showing half-covered.
- **Dates**: on an intraday chart a bar at midnight is labelled with its day on the time axis and the crosshair, not with its year as if it were a daily bar. `barsAreDaily(bars)` tells which a series is.
- **Widget**: the drawing tools sit in sections with a divider between them: lines; Fibonacci, Gann and cycles; patterns and Elliott waves; forecasting and measuring; shapes, brushes and notes. The tools below are grouped too: modes, undo and redo, clear all.

Looks different after the update: the dark theme's colours, the volume's height, Fibonacci colours and the order of the drawing tool groups all change without any change of yours. Set `candleUp` / `candleDown` / `volumeUp` / `volumeDown` on the theme to keep the old colours.
