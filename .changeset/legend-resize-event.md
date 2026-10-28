---
'@tradecanvas/commons': minor
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

ChartWidget's indicator rows move with the OHLCV legend when it gets taller or shorter. A switch that wrapped the legend onto another line (a timeframe or a status text on a phone) left the rows where they were, over the legend's last line, until something else redrew them; with auto-scale off nothing did. The chart now emits `legendResize` with `{ bottom }`, the new `getLegendBottom()`, after a draw that changed the legend's height, and the widget places the rows again. Labels of your own stacked under the legend can follow it the same way. The API docs in all six languages and the skill list the event.
