---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

Range bars draw on intraday data. The automatic range was 0.5% of the average close, about $500 for a symbol at 100,000, more than a one-second or one-minute chart moves in hours, so no bar closed and the chart stayed blank ("Chart, no data." to a screen reader). `'auto'` now follows the bars' true range: the mean true range of the last 100 closed bars, rounded to a 1, 2 or 5 and to a whole number of the symbol's price step (`minTick`, or the market's step), so the range holds still as bars close and bars close on prices the market can trade. A daily chart on `'auto'` gets fewer, larger bars than before. A range you set is used as it is.

The bar still forming is drawn as the last bar, so the chart ends at the last price and always has a bar. Bars have wicks: a bar closes at its low plus the range on the way up, or its high minus the range on the way down, where it used to close at its open plus or minus the range, a price that may never have traded. A jump of several ranges, a gap between bars too, makes one bar for each range, where the rest of the move was dropped, and its volume is shared over them.

`toRangeBars` makes these bars too, and takes `includeForming: true` to add the bar still forming. `chart.setChartTypeOptions()` now tells a screen reader the new summary.
