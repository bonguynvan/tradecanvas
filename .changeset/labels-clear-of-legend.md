---
'@tradecanvas/core': minor
'@tradecanvas/chart': minor
---

A horizontal line's and a horizontal ray's price label keeps clear of the legend. Drawn at the line's start, it lay under the OHLCV rows and, in ChartWidget, under the indicator rows and their collapse button whenever the line ran near the top of the chart. It now moves to the line's right end when the legend covers its start, below the line when both ends are covered, and under the legend's foot when the legend spans the plot, as on a phone. The new `chart.setLegendStack({ width, height })` gives the size of rows you lay under the legend yourself (from the plot's left edge and `getLegendBottom()`, `null` for none) so drawing labels keep clear of them too; ChartWidget gives its indicator rows. The API docs in all six languages and the skill say so.
