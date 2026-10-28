---
'@tradecanvas/core': patch
'@tradecanvas/chart': patch
---

A long or short position's tags keep clear of the legend. On a phone the OHLCV rows span the plot, so a target near the top had its tag drawn under them (the legend's values over "Target 99,089.22 (+1.04%)"). A tag the legend or ChartWidget's indicator rows would cover now goes under them, one under the other when several do.
