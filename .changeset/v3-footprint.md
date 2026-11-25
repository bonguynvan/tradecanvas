---
'@tradecanvas/chart': minor
'@tradecanvas/core': minor
'@tradecanvas/commons': minor
---

A footprint chart. `chartType: 'footprint'` draws, by each bar, what traded at every price inside it: what the sellers took at the bid on the left and what the buyers took at the ask on the right, or their difference, or their sum (`chartTypeOptions.footprint.cells`). A row where one side outdid the other is marked, the row most traded at is outlined. A chart connected to a feed with trades asks for them itself while it shows a footprint; a host gives its own with `chart.addTrades(trades)` or `chart.setFootprint(bars)`, and reads them with `chart.getFootprint(time?)`. Zoomed out, the numbers give way to a bar for each side, then to candles. It is in the widget's chart type menu, with its settings in Chart Settings, and `renderPriceChart` draws it from `footprint`. `MockAdapter`'s trades are now its bars' own.
